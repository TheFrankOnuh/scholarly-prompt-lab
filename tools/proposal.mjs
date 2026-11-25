// Scholarly Prompt Lab: checks and applies proposals for new theories and disciplines.
// Run by GitHub Actions. Usage: node tools/proposal.mjs check | apply
// A proposal arrives as an issue whose body contains a fenced JSON block made by the Lab's "Propose for everyone" form.
// Everything in an issue is untrusted input: it is parsed as data, validated against a strict schema, and never executed.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARK = "<!-- spl-proposal-check -->";
const TYPES = ["theory", "framework", "approach", "method", "concept", "school", "movement", "critique"];
const KINDS = ["book", "article", "chapter"];
// The Lab serves the humanities and social sciences only.
const OUT_OF_SCOPE_WORDS = /(engineering|physics|chemistr|biochem|biolog|microbiolog|zoolog|botan|genetic|medicine|medical science|surgery|nursing|pharmac|dentist|veterinar|anatomy|physiolog|mathematic|statistics|computer science|software|informatics|data science|geolog|astronom|agronom|agricultur|accounting|finance|banking|marketing|business administration|architecture(?! history)|radiograph|optometr|biotechnolog|nanotechnolog|robotic|mechatronic|metallurg|petroleum|materials science)/i;
// a humanities or social-science field that studies a science (history of medicine, mathematics education) is in scope
const IN_SCOPE_WORDS = /(history of|historical|philosophy of|sociology of|anthropology of|politics of|economics of|ethics|humanities|studies|education|communication|policy|law|literature|culture|cultural|social|heritage|extension)/i;
const OUT_OF_SCOPE = { test: (name) => OUT_OF_SCOPE_WORDS.test(name) && !IN_SCOPE_WORDS.test(name) };
const UA = { "User-Agent": "ScholarlyPromptLab-ProposalCheck/1.0" };

function loadLab() {
  const sandbox = { window: {} };
  for (const f of ["theories.js", "disciplines.js", "community.js"]) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) vm.runInNewContext(fs.readFileSync(p, "utf8"), sandbox, { timeout: 2000 });
  }
  const w = sandbox.window;
  return { theories: w.LAB_THEORIES || [], fields: w.LAB_THEORY_FIELDS || [], disciplines: w.LAB_DISCIPLINES || [],
    community: w.LAB_COMMUNITY || { theories: [], disciplines: [] } };
}

// ---------- cleaning and validation ----------
function clean(v, max) {
  if (typeof v !== "string") return "";
  return v.normalize("NFC").replace(/[\u0000-\u001f\u007f<>`]/g, " ").replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function norm(s) { return (s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(the|of|a|an|theory|theories|approach)\b/g, " ").replace(/\s+/g, " ").trim(); }
function safeMd(s) { return String(s).replace(/@/g, "@\u200b").replace(/\|/g, "\\|").replace(/[\[\]]/g, ""); }

export function extract(body) {
  const m = /```json\s*([\s\S]*?)```/.exec(body || "");
  if (!m || m[1].length > 6000) return null;
  try { const d = JSON.parse(m[1]); return d && typeof d === "object" && !Array.isArray(d) && typeof d.proposal === "string" ? d : null; } catch { return null; }
}

export function validate(d, lab) {
  const problems = [];
  if (d.proposal === "discipline") {
    const name = clean(d.name, 80);
    const groups = lab.disciplines.map((g) => g.group);
    const group = groups.includes(d.group) ? d.group : "";
    if (name.length < 3) problems.push("The discipline needs a name of at least 3 characters.");
    if (!group) problems.push("The group must be one of: " + groups.join("; ") + ".");
    if (OUT_OF_SCOPE.test(name)) problems.push("This looks like a discipline outside the humanities and social sciences. The Lab accepts only disciplines within them.");
    return { ok: !problems.length, problems, entry: { proposal: "discipline", name, group, contributor: clean(d.contributor, 80) } };
  }
  if (d.proposal !== "theory") return { ok: false, problems: ["Unknown kind of proposal."], entry: null };
  const w = d.work && typeof d.work === "object" ? d.work : {};
  const year = Number.isInteger(w.year) ? w.year : parseInt(w.year, 10);
  const entry = {
    proposal: "theory",
    n: clean(d.name, 120), type: TYPES.includes(d.type) ? d.type : "", f: lab.fields.some((f) => f.id === d.field) ? d.field : "",
    t: clean(d.thinkers, 200), a: clean(d.focus, 400).replace(/[.]+$/, ""),
    concepts: Array.isArray(d.concepts) ? d.concepts.map((c) => clean(c, 60)).filter(Boolean).slice(0, 7) : [],
    works: [{ kind: KINDS.includes(w.kind) ? w.kind : "", authors: clean(w.authors, 200), year, title: clean(w.title, 300),
      publisher: clean(w.publisher, 200), place: clean(w.place, 80), container: clean(w.container, 200), volume: clean(w.volume, 30), issue: clean(w.issue, 30), pages: clean(w.pages, 30) }],
    contributor: clean(d.contributor, 80)
  };
  const k = entry.works[0];
  if (entry.n.length < 3) problems.push("The name is missing or too short.");
  if (!entry.type) problems.push("The type must be one of: " + TYPES.join(", ") + ".");
  if (!entry.f) problems.push("The field is not one of the Lab's fields.");
  if (entry.a.length < 20) problems.push("\"What the analysis should attend to\" needs at least a short sentence.");
  if (entry.concepts.length < 2) problems.push("At least two core concepts are needed, in the framework's own terms.");
  if (!k.kind) problems.push("The key work must be a book, a journal article or a chapter.");
  if (!k.authors || !k.title) problems.push("The key work needs its author(s) and title.");
  if (!(k.year >= 1500 && k.year <= new Date().getFullYear())) problems.push("The key work needs a plausible year of publication.");
  if (k.kind === "book" && !k.publisher) problems.push("A book needs its publisher.");
  if ((k.kind === "article" || k.kind === "chapter") && !k.container) problems.push("An article needs its journal, and a chapter needs its book.");
  Object.keys(k).forEach((x) => { if (k[x] === "" || k[x] == null) delete k[x]; });
  return { ok: !problems.length, problems, entry };
}

export function duplicates(entry, lab) {
  if (entry.proposal === "discipline") {
    const all = lab.disciplines.flatMap((g) => g.items).concat((lab.community.disciplines || []).map((d) => d.name));
    return all.filter((x) => norm(x) === norm(entry.name));
  }
  const n = norm(entry.n);
  return lab.theories.concat(lab.community.theories || []).filter((t) => { const x = norm(t.n); return x === n || (x.length > 5 && n.length > 5 && (x.includes(n) || n.includes(x))); }).map((t) => t.n);
}

// ---------- citation check against public catalogues ----------
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / Math.max(A.size, B.size);
}
function surname(authors) { return norm((authors || "").split(/[,;&]| and /)[0]).split(" ").pop() || ""; }
async function getJson(url) {
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) }); if (r.ok) return await r.json(); if (r.status === 429) await new Promise((x) => setTimeout(x, 8000)); else return null; }
    catch { await new Promise((x) => setTimeout(x, 2000)); }
  }
  return null;
}
export async function checkCitation(w) {
  const sn = surname(w.authors);
  const cands = [];
  const cr = await getJson("https://api.crossref.org/works?" + new URLSearchParams({ "query.bibliographic": w.title, "query.author": sn, rows: "5" }));
  for (const it of cr?.message?.items || []) {
    const years = ["published-print", "published-online", "issued", "published"].map((k) => it[k]?.["date-parts"]?.[0]?.[0]).filter(Boolean);
    cands.push({ src: "Crossref", title: [it.title?.[0], it.subtitle?.[0]].filter(Boolean).join(": "), authors: (it.author || []).map((a) => (a.family || "") + " " + (a.given || "")), years, id: it.DOI ? "https://doi.org/" + it.DOI : "" });
  }
  const ol = await getJson("https://openlibrary.org/search.json?" + new URLSearchParams({ title: w.title, author: sn, limit: "5", fields: "title,subtitle,author_name,first_publish_year,publish_year,key" }));
  for (const it of ol?.docs || []) cands.push({ src: "Open Library", title: [it.title, it.subtitle].filter(Boolean).join(": "), authors: it.author_name || [], years: [...(it.publish_year || []), it.first_publish_year].filter(Boolean), id: "https://openlibrary.org" + (it.key || "") });
  const main = (s) => s.split(/[:?]\s/)[0];
  let mismatch = null;
  for (const c of cands) {
    const titleOk = sim(w.title, c.title) >= 0.8 || sim(main(w.title), main(c.title)) >= 0.9;
    const authorOk = !sn || c.authors.some((a) => norm(a).split(" ").includes(sn));
    if (!titleOk || !authorOk) continue;
    if (c.years.includes(w.year)) return { status: "verified", source: c.src, id: c.id };
    mismatch = mismatch || { status: "year-differs", source: c.src, id: c.id, years: [...new Set(c.years)].sort().slice(0, 8) };
  }
  return mismatch || { status: cr === null && ol === null ? "unavailable" : "not-found" };
}

// ---------- GitHub ----------
async function gh(method, url, body) {
  const r = await fetch("https://api.github.com" + url, { method, headers: { Authorization: "Bearer " + process.env.GITHUB_TOKEN, Accept: "application/vnd.github+json", "User-Agent": "spl-proposal" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok && r.status !== 404 && r.status !== 422) throw new Error("GitHub API " + method + " " + url + " -> " + r.status);
  return r.status === 204 ? null : r.json().catch(() => null);
}

function report(v, dups, cite) {
  const e = v.entry, L = [MARK, "## Automatic checks on this proposal", ""];
  const row = (ok, text) => L.push((ok === true ? "✅" : ok === null ? "ℹ️" : "⚠️") + " " + text);
  if (!e) { row(false, "This issue does not contain a readable proposal. Please create it with **Propose for everyone** in the Lab."); return { text: L.join("\n"), pass: false }; }
  row(v.ok, v.ok ? "All required information is present." : "Some required information is missing:");
  v.problems.forEach((p) => L.push("   - " + safeMd(p)));
  row(!dups.length, dups.length ? "This may already be in the library: " + dups.map((d) => "**" + safeMd(d) + "**").join(", ") + ". If it is the same thing, the proposal is not needed; if it is different, say how." : "No entry with this name is in the library yet.");
  let citeOk = true;
  if (e.proposal === "theory" && cite) {
    if (cite.status === "verified") row(true, "The key work was found in " + cite.source + " with the same author, title and year" + (cite.id ? " (" + cite.id + ")" : "") + ".");
    else if (cite.status === "year-differs") { citeOk = false; row(false, "The key work was found in " + cite.source + ", but with a different year (" + cite.years.join(", ") + "). Please check the year of first publication."); }
    else if (cite.status === "unavailable") { citeOk = false; row(null, "The library catalogues could not be reached, so the key work was not checked. Edit the issue to try again."); }
    else { citeOk = false; row(false, "The key work was not found in Crossref or Open Library. This is common for books from smaller and African publishers: please add a link to a library catalogue record or the publisher's page in a comment."); }
  }
  const pass = v.ok && !dups.length && citeOk;
  L.push("", pass ? "**Result: ready for the editor's decision.**" : "**Result: needs attention before the editor can decide.**",
    "", "The editor reviews every proposal. These checks only confirm that the information is complete and the source exists; they do not judge the scholarship.");
  return { text: L.join("\n"), pass };
}

async function main() {
  const mode = process.argv[2];
  const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const issue = ev.issue, repo = process.env.GITHUB_REPOSITORY, api = "/repos/" + repo + "/issues/" + issue.number;
  const d = extract(issue.body);
  const lab = loadLab();
  if (mode === "check") {
    if (!d) { console.log("Not a proposal: nothing to do."); return; }
    const v = validate(d, lab);
    const dups = v.entry ? duplicates(v.entry, lab) : [];
    const cite = v.entry?.proposal === "theory" && v.entry.works[0].title ? await checkCitation(v.entry.works[0]) : null;
    const rep = report(v, dups, cite);
    const comments = (await gh("GET", api + "/comments?per_page=100")) || [];
    for (const c of comments) if (c.user?.type === "Bot" && (c.body || "").includes(MARK)) await gh("DELETE", "/repos/" + repo + "/issues/comments/" + c.id);
    await gh("POST", api + "/comments", { body: rep.text });
    await gh("POST", api + "/labels", { labels: ["proposal", rep.pass ? "checks-passed" : "needs-attention"] });
    await gh("DELETE", api + "/labels/" + (rep.pass ? "needs-attention" : "checks-passed"));
    console.log(rep.pass ? "PASS" : "NEEDS ATTENTION");
    return;
  }
  if (mode === "apply") {
    if (!d) throw new Error("This issue does not contain a proposal.");
    const v = validate(d, lab);
    if (!v.ok) throw new Error("The proposal is incomplete: " + v.problems.join(" "));
    const e = v.entry, com = lab.community;
    com.theories = com.theories || []; com.disciplines = com.disciplines || [];
    const today = new Date().toISOString().slice(0, 10);
    let what;
    if (e.proposal === "discipline") {
      if (duplicates(e, lab).length) throw new Error("A discipline with this name already exists.");
      com.disciplines.push({ name: e.name, group: e.group, contributor: e.contributor, issue: issue.number, added: today });
      what = "The discipline **" + safeMd(e.name) + "** is now in the Lab under " + e.group + ".";
    } else {
      const base = "c-" + (norm(e.n).replace(/ /g, "-").slice(0, 40) || "entry");
      const ids = new Set(lab.theories.concat(com.theories).map((t) => t.id));
      let id = base, k = 2; while (ids.has(id)) id = base + "-" + k++;
      const cite = await checkCitation(e.works[0]);
      com.theories.push({ id, f: e.f, n: e.n, type: e.type, t: e.t, works: e.works, concepts: e.concepts, a: e.a, contributor: e.contributor, issue: issue.number, added: today, citationCheck: cite.status });
      what = "**" + safeMd(e.n) + "** is now in the Lab's theory library.";
    }
    fs.writeFileSync(path.join(ROOT, "community.js"),
      "/* Scholarly Prompt Lab: entries proposed by scholars and approved by the editor.\n   This file is written by tools/proposal.mjs when a proposal is approved. Do not edit it by hand. */\nwindow.LAB_COMMUNITY = " + JSON.stringify(com, null, 2) + ";\n");
    fs.writeFileSync(path.join(ROOT, ".proposal-result.md"), what + " Thank you" + (e.contributor ? ", " + safeMd(e.contributor) : "") + ". It will appear on the live site within a few minutes.\n");
    console.log("APPLIED");
    return;
  }
  throw new Error("Usage: node tools/proposal.mjs check | apply");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
