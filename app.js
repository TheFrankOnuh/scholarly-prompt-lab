/* Scholarly Prompt Lab: application logic. No dependencies, no network calls. */
(function () {
  "use strict";

  const L = window.LAB;
  const VERSION = "0.3.1";
  const KEY_DRAFT = "spl.draft.v1";
  const KEY_LOG = "spl.log.v1";
  const $ = (id) => document.getElementById(id);

  const CONDITIONS = [
    { n: 1, id: "baseline", name: "Baseline", adds: "The research question and the output specification only." },
    { n: 2, id: "theory", name: "Theory-grounded", adds: "Adds discipline and theoretical orientation." },
    { n: 3, id: "context", name: "Context-grounded", adds: "Adds source material, cultural and historical context, and terminology." },
    { n: 4, id: "evidence", name: "Evidence-constrained", adds: "Adds the analytical procedure and every safeguard." }
  ];

  /* ---------- storage (never required for the page to work) ---------- */
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ---------- helpers ---------- */
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach((c) => n.append(c));
    return n;
  }
  function option(value, label) { return el("option", { value, text: label }); }
  function lines(s) { return (s || "").split("\n").map((x) => x.trim()).filter(Boolean); }
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function flash(id, msg) { const s = $(id); s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(() => (s.textContent = ""), 2600); }
  async function copy(text, statusId) {
    try { await navigator.clipboard.writeText(text); flash(statusId, "Copied."); }
    catch (e) {
      const t = el("textarea"); t.value = text; document.body.append(t); t.select();
      try { document.execCommand("copy"); flash(statusId, "Copied."); } catch (e2) { flash(statusId, "Copy failed. Select the text and copy it manually."); }
      t.remove();
    }
  }
  function slug(s) { return (s || "research-design").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "research-design"; }

  /* ---------- populate controls ---------- */
  L.disciplines.forEach((d) => $("discipline").append(option(d, d)));
  L.theories.forEach((t) => $("theoryPreset").append(option(t.value, t.label)));
  Object.keys(L.techniques).forEach((k) => $("technique").append(option(k, L.techniques[k].label)));
  $("example").append(option("", "Choose an example…"));
  L.examples.forEach((x) => $("example").append(option(x.id, x.title)));
  L.safeguards.forEach((g) => {
    $("safeguards").append(el("label", { class: "check" }, [
      el("input", { type: "checkbox", value: g.id, "data-ctx": g.ctx }), g.label
    ]));
  });
  CONDITIONS.forEach((c) => $("lgCondition").append(option(c.id, c.n + ". " + c.name)));
  $("lgCondition").append(option("custom", "Custom / single prompt"));
  L.criteria.forEach((c) => {
    const sel = el("select", { id: "sc_" + c.id, "aria-label": c.label });
    sel.append(option("", "–"));
    for (let i = 1; i <= 5; i++) sel.append(option(String(i), String(i)));
    $("criteria").append(el("div", { class: "criterion" }, [
      el("span", {}, [c.label, el("small", { text: c.help })]), sel
    ]));
  });
  L.framework.forEach((f) => {
    $("frameworkList").append(el("div", {}, [
      el("span", { class: "letter", text: f.l }),
      el("div", {}, [el("strong", { text: f.name }), el("p", { text: f.d }), el("p", { class: "q", text: f.q })])
    ]));
  });
  $("lgDate").value = today();

  /* ---------- state ---------- */
  const FIELDS = ["discipline", "question", "theory", "technique", "procedure", "fewshot", "sourceDesc", "sourceText", "context", "terms", "output", "fields"];

  function readState() {
    const s = {};
    FIELDS.forEach((f) => (s[f] = $(f).value));
    s.safeguards = [...document.querySelectorAll("#safeguards input:checked")].map((i) => i.value);
    s.planCross = $("planCross").checked;
    s.planLog = $("planLog").checked;
    s.runs = $("runs").value;
    s.models = $("models").value;
    return s;
  }

  function writeState(s) {
    FIELDS.forEach((f) => { if (s[f] !== undefined) $(f).value = s[f]; });
    if (!s.procedure) $("procedure").value = L.techniques[$("technique").value].steps.join("\n");
    document.querySelectorAll("#safeguards input").forEach((i) => (i.checked = (s.safeguards || []).includes(i.value)));
    $("planCross").checked = !!s.planCross;
    $("planLog").checked = !!s.planLog;
    if (s.runs) $("runs").value = s.runs;
    if (s.models !== undefined) $("models").value = s.models;
    $("theoryPreset").value = L.theories.some((t) => t.value === s.theory) ? s.theory : "";
  }

  const BLANK = { discipline: "History", question: "", theory: "", technique: "evidence-constrained", procedure: "", fewshot: "",
    sourceDesc: "", sourceText: "", context: "", terms: "", output: "table", fields: "", safeguards: ["quote", "nofab", "obs", "uncert", "alt"],
    planCross: false, planLog: false };

  /* ---------- prompt construction ---------- */
  function outputSpec(s) {
    const f = (s.fields || "").trim() || "finding, source identifier, textual evidence, interpretation, alternative interpretation, confidence";
    switch (s.output) {
      case "json": return "Return a JSON array of objects with these keys: " + f + ". Use null where the evidence does not say. Return only the JSON.";
      case "csv": return "Return CSV with this header row: " + f + ". Quote any field containing a comma.";
      case "prose": return "Write structured prose organised by finding. For each finding give: " + f + ".";
      default: return "Return a table with these columns: " + f + ".";
    }
  }

  // level: 1 baseline, 2 theory, 3 context, 4 full
  function buildPrompt(s, level) {
    level = level || 4;
    const out = [];
    const q = s.question.trim() || "[State your research question]";
    if (level >= 2) {
      out.push("ROLE: You are assisting a researcher in " + (s.discipline || "the humanities") + ". Treat your answer as material for scholarly checking, not as an authoritative account: it will be compared with independent evidence and expert judgement.");
    }
    out.push("RESEARCH QUESTION: " + q);
    if (level >= 2 && s.theory.trim()) out.push("THEORETICAL ORIENTATION: " + s.theory.trim());
    if (level >= 3) {
      if (s.sourceDesc.trim()) out.push("SOURCE MATERIAL: " + s.sourceDesc.trim() + (s.sourceText.trim() ? " (supplied below)." : ""));
      if (s.context.trim()) out.push("CULTURAL, LINGUISTIC AND HISTORICAL CONTEXT: " + s.context.trim());
      if (s.terms.trim()) out.push("CONTESTED TERMINOLOGY: " + s.terms.trim());
    }
    if (level >= 4) {
      if (s.technique === "few-shot" && s.fewshot.trim()) out.push("CODED EXAMPLES:\n" + s.fewshot.trim());
      const steps = lines(s.procedure);
      if (steps.length) out.push("PROCEDURE:\n" + steps.map((x, i) => (i + 1) + ". " + x).join("\n"));
      const g = L.safeguards.filter((x) => s.safeguards.includes(x.id)).map((x) => "- " + x.text);
      if (g.length) out.push("SAFEGUARDS:\n" + g.join("\n"));
    }
    out.push("OUTPUT: " + outputSpec(s));
    if (level >= 3 && s.sourceText.trim()) {
      out.push("SOURCE TEXT:\n<<<BEGIN SOURCE>>>\n" + s.sourceText.trim() + "\n<<<END SOURCE>>>");
    }
    return out.join("\n\n");
  }

  function coverage(s) {
    const has = (id) => s.safeguards.includes(id);
    return [
      { l: "C", name: "Conceptual", on: !!(s.question.trim() && s.theory.trim()), need: "a research question and a theoretical orientation" },
      { l: "O", name: "Operational", on: lines(s.procedure).length >= 2, need: "at least two procedure steps" },
      { l: "N", name: "Situated", on: !!(s.context.trim() || s.terms.trim() || has("lang")), need: "cultural, linguistic or historical context" },
      { l: "T", name: "Traceable", on: has("quote") || (has("nofab") && !!s.sourceText.trim()), need: "a traceable-evidence safeguard" },
      { l: "E", name: "Evaluated", on: ["uncert", "alt", "review", "syco", "obs"].filter(has).length >= 2, need: "at least two evaluation safeguards" },
      { l: "X", name: "Cross-model", on: s.planCross, need: "a plan to compare models or prompt conditions" },
      { l: "T", name: "Transparent", on: s.planLog, need: "a plan to log model, version, date and settings" }
    ];
  }

  /* ---------- render: build ---------- */
  function renderBuild() {
    const s = readState();
    $("prompt").textContent = buildPrompt(s, 4);
    $("techniqueHint").textContent = L.techniques[s.technique].hint;
    $("fewshotWrap").hidden = s.technique !== "few-shot";
    const cov = coverage(s);
    const meter = $("meter"); meter.replaceChildren();
    cov.forEach((c) => meter.append(el("div", { class: c.on ? "on" : "", title: c.name + (c.on ? ": covered" : ": add " + c.need) }, [c.l, el("small", { text: c.name })])));
    const missing = cov.filter((c) => !c.on);
    $("meterNote").textContent = missing.length
      ? "CONTEXT coverage " + (7 - missing.length) + "/7. Still to add: " + missing.map((c) => c.need).join("; ") + "."
      : "CONTEXT coverage 7/7. The design is fully specified; the outputs still need checking.";
    store.set(KEY_DRAFT, s);
    updateSourceInfo();
    renderStudy(s);
  }

  /* ---------- render: study ---------- */
  function modelList(s) { return (s.models || "").split(",").map((m) => m.trim()).filter(Boolean); }

  function renderStudy(s) {
    s = s || readState();
    const wrap = $("conditions"); wrap.replaceChildren();
    CONDITIONS.forEach((c) => {
      const text = buildPrompt(s, c.n);
      const status = el("p", { class: "status", id: "st_" + c.id, role: "status" });
      const btn = el("button", { type: "button", text: "Copy condition " + c.n });
      btn.addEventListener("click", () => copy(text, "st_" + c.id));
      wrap.append(el("div", { class: "card" }, [
        el("h3", { text: c.n + ". " + c.name }),
        el("p", { class: "muted", text: c.adds }),
        el("pre", { class: "prompt", text: text, tabindex: "0" }),
        el("div", { class: "actions" }, [btn]), status
      ]));
    });
    const runs = Math.max(1, parseInt(s.runs, 10) || 1);
    const m = Math.max(1, modelList(s).length);
    $("studySize").textContent = "4 conditions × " + runs + " runs × " + m + " model" + (m > 1 ? "s" : "") + " = " + (4 * runs * m) + " outputs per research item";
  }

  function studyProtocol(s) {
    const models = modelList(s);
    const runs = Math.max(1, parseInt(s.runs, 10) || 1);
    let md = "# Prompt-sensitivity study protocol\n\n";
    md += "- Generated: " + today() + " with Scholarly Prompt Lab v" + VERSION + "\n";
    md += "- Discipline: " + s.discipline + "\n- Research question: " + (s.question || "—") + "\n";
    md += "- Models: " + (models.join(", ") || "to be specified") + "\n- Runs per condition: " + runs + "\n";
    md += "- Planned outputs: " + 4 * runs * Math.max(1, models.length) + "\n\n";
    md += "## Procedure\n\n1. Record each model's exact name, version and settings before running.\n2. Start a fresh conversation for every run so earlier runs do not influence later ones.\n3. Paste the condition prompt exactly as written. Do not edit between runs.\n4. Save each output in full with the date, then score it against the six criteria.\n5. Where possible, have a subject specialist score independently. Keep disagreements; do not average them away.\n\n";
    md += "## Evaluation criteria\n\n" + L.criteria.map((c) => "- **" + c.label + "**: " + c.help).join("\n") + "\n\n";
    CONDITIONS.forEach((c) => {
      md += "## Condition " + c.n + ": " + c.name + "\n\n" + c.adds + "\n\n```text\n" + buildPrompt(s, c.n) + "\n```\n\n";
    });
    return md;
  }

  function designRecord(s) {
    const cov = coverage(s);
    let md = "# Research design: " + (s.question || "untitled") + "\n\n";
    md += "Generated " + today() + " with Scholarly Prompt Lab v" + VERSION + ".\n\n";
    md += "| Field | Value |\n|---|---|\n";
    const row = (k, v) => "| " + k + " | " + String(v || "—").replace(/\|/g, "\\|").replace(/\n/g, "<br>") + " |\n";
    md += row("Discipline", s.discipline) + row("Theoretical orientation", s.theory) + row("Technique", L.techniques[s.technique].label);
    md += row("Source material", s.sourceDesc) + row("Context", s.context) + row("Contested terminology", s.terms) + row("Output", s.output + ": " + (s.fields || "default fields")) + "\n";
    md += "## CONTEXT checklist\n\n" + cov.map((c) => "- [" + (c.on ? "x" : " ") + "] **" + c.l + " · " + c.name + "**" + (c.on ? "" : " (needs " + c.need + ")")).join("\n") + "\n\n";
    md += "## Prompt\n\n```text\n" + buildPrompt(s, 4) + "\n```\n\n";
    md += "## Disclosure statement (draft)\n\nThis study used generative AI as part of its method. Prompts, model names and versions, run dates and settings are recorded in the accompanying log. All AI outputs were reviewed by the researcher" + (s.safeguards.includes("review") ? ", and culturally sensitive classifications were referred to subject specialists" : "") + ". AI outputs are treated as data for analysis, not as evidence about the past.\n";
    return md;
  }

  /* ---------- log ---------- */
  let log = store.get(KEY_LOG, []);
  if (!Array.isArray(log)) log = [];

  function condName(id) { const c = CONDITIONS.find((x) => x.id === id); return c ? c.n + ". " + c.name : "Custom"; }
  function mean(arr) { return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null; }

  function renderLog() {
    store.set(KEY_LOG, log);
    $("entryCount").textContent = "(" + log.length + ")";
    const t = $("entries"); t.replaceChildren();
    if (!log.length) {
      t.append(el("tr", {}, [el("td", { class: "muted", text: "No entries yet. Run a prompt, paste the output on the left, and score it." })]));
    } else {
      t.append(el("thead", {}, [el("tr", {}, ["Date", "Model", "Condition", "Run", "Scores", "Flags", "Output", ""].map((h) => el("th", { text: h })))]));
      const body = el("tbody");
      log.slice().reverse().forEach((e) => {
        const scores = L.criteria.map((c) => c.label.split(" ")[0].slice(0, 4) + " " + (e.scores[c.id] || "–")).join(" · ");
        const del = el("button", { type: "button", class: "ghost", text: "Delete" });
        del.addEventListener("click", () => {
          if (confirm("Delete this entry? This cannot be undone unless you exported it.")) { log = log.filter((x) => x.id !== e.id); renderLog(); }
        });
        const flags = el("td");
        if (e.sycophancy) flags.append(el("span", { class: "flag", text: "adopted framing" }));
        body.append(el("tr", {}, [
          el("td", { text: e.date }), el("td", { text: e.model }), el("td", { text: condName(e.condition) }),
          el("td", { text: String(e.run) }), el("td", { text: scores }), flags,
          el("td", { class: "out" }, [el("div", { text: e.output })]), el("td", {}, [del])
        ]));
      });
      t.append(body);
    }
    // summary
    const sum = $("summary"); sum.replaceChildren();
    const groups = {};
    log.forEach((e) => (groups[e.condition] = groups[e.condition] || []).push(e));
    const keys = Object.keys(groups);
    if (!keys.length) { sum.append(el("p", { class: "muted", text: "Averages per condition appear here once you log scored outputs." })); return; }
    const tbl = el("table");
    tbl.append(el("tr", {}, ["Condition", "n"].concat(L.criteria.map((c) => c.label), ["Adopted framing"]).map((h) => el("th", { text: h }))));
    keys.sort().forEach((k) => {
      const g = groups[k];
      const cells = [condName(k), String(g.length)];
      L.criteria.forEach((c) => {
        const v = g.map((e) => parseInt(e.scores[c.id], 10)).filter((x) => !isNaN(x));
        const m = mean(v);
        cells.push(m === null ? "–" : m.toFixed(1) + (v.length < g.length ? " (" + v.length + ")" : ""));
      });
      cells.push(g.filter((e) => e.sycophancy).length + "/" + g.length);
      tbl.append(el("tr", {}, cells.map((x) => el("td", { text: x }))));
    });
    sum.append(el("div", { class: "table-wrap" }, [tbl]));
    sum.append(el("p", { class: "muted", text: "Means on a 1–5 scale. A number in brackets is how many entries were scored on that criterion. With few runs, read these as descriptive only." }));
  }

  $("logForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const s = readState();
    const cond = $("lgCondition").value;
    const c = CONDITIONS.find((x) => x.id === cond);
    const scores = {};
    L.criteria.forEach((cr) => { const v = $("sc_" + cr.id).value; if (v) scores[cr.id] = v; });
    log.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      condition: cond, run: parseInt($("lgRun").value, 10) || 1,
      model: $("lgModel").value.trim(), date: $("lgDate").value, settings: $("lgSettings").value.trim(),
      output: $("lgOutput").value, scores, evaluator: $("lgEvaluator").value.trim(),
      sycophancy: $("lgSyco").checked, notes: $("lgNotes").value.trim(),
      question: s.question, prompt: buildPrompt(s, c ? c.n : 4), loggedAt: new Date().toISOString()
    });
    renderLog();
    $("lgOutput").value = ""; $("lgNotes").value = ""; $("lgSyco").checked = false;
    L.criteria.forEach((cr) => ($("sc_" + cr.id).value = ""));
    $("lgRun").value = (parseInt($("lgRun").value, 10) || 1) + 1;
    flash("logStatus", "Saved. The exact prompt for this condition was stored with the entry.");
  });

  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  $("expJson").addEventListener("click", () => {
    download("prompt-lab-log-" + today() + ".json", JSON.stringify({ tool: "Scholarly Prompt Lab", version: VERSION, exportedAt: new Date().toISOString(), design: readState(), entries: log }, null, 2), "application/json");
  });
  $("expCsv").addEventListener("click", () => {
    const head = ["id", "date", "model", "settings", "condition", "run", "evaluator"].concat(L.criteria.map((c) => c.id), ["adopted_framing", "notes", "question", "prompt", "output"]);
    const rows = log.map((e) => [e.id, e.date, e.model, e.settings, e.condition, e.run, e.evaluator].concat(L.criteria.map((c) => e.scores[c.id] || ""), [e.sycophancy ? 1 : 0, e.notes, e.question, e.prompt, e.output]));
    download("prompt-lab-log-" + today() + ".csv", "﻿" + [head].concat(rows).map((r) => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  });
  $("expMd").addEventListener("click", () => {
    let md = "# AI-assisted research log\n\nExported " + today() + " from Scholarly Prompt Lab v" + VERSION + ". " + log.length + " entries.\n\n";
    md += "## Summary by condition\n\n";
    const sumTbl = $("summary").querySelector("table");
    if (sumTbl) {
      const rows = [...sumTbl.querySelectorAll("tr")].map((tr) => [...tr.children].map((td) => td.textContent));
      md += rows.map((r, i) => "| " + r.join(" | ") + " |" + (i === 0 ? "\n|" + r.map(() => "---").join("|") + "|" : "")).join("\n") + "\n\n";
    }
    md += "## Entries\n\n";
    log.forEach((e, i) => {
      md += "### " + (i + 1) + ". " + condName(e.condition) + ", run " + e.run + " (" + e.model + ", " + e.date + ")\n\n";
      md += "- Settings: " + (e.settings || "—") + "\n- Evaluator: " + (e.evaluator || "—") + "\n";
      md += "- Scores: " + L.criteria.map((c) => c.label + " " + (e.scores[c.id] || "–")).join("; ") + "\n";
      md += "- Adopted the prompt's framing without testing it: " + (e.sycophancy ? "yes" : "no") + "\n";
      if (e.notes) md += "- Notes: " + e.notes + "\n";
      md += "\n**Prompt**\n\n```text\n" + e.prompt + "\n```\n\n**Output**\n\n```text\n" + e.output + "\n```\n\n";
    });
    download("prompt-lab-report-" + today() + ".md", md, "text/markdown;charset=utf-8");
  });
  $("impJson").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const entries = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(entries)) throw new Error("no entries");
      const ids = new Set(log.map((e) => e.id));
      let added = 0;
      entries.forEach((e) => {
        if (e && typeof e === "object" && e.id && !ids.has(e.id)) {
          log.push(Object.assign({ scores: {}, output: "", model: "", date: "", condition: "custom", run: 1 }, e)); added++;
        }
      });
      if (data.design && confirm("This file also contains a research design. Load it into the Build tab? (Your current design will be replaced.)")) {
        writeState(data.design); renderBuild();
      }
      renderLog();
      flash("logStatus", "Imported " + added + " new entr" + (added === 1 ? "y" : "ies") + ".");
    } catch (e) { flash("logStatus", "That file is not a Prompt Lab export."); }
    ev.target.value = "";
  });

  /* ---------- user's own source files (read locally, never uploaded) ---------- */
  const SOURCE_HINT = $("sourceInfo").textContent;
  function nextDocNumber(text) {
    let max = 0;
    (text.match(/\[DOC-(\d+)/g) || []).forEach((m) => { max = Math.max(max, parseInt(m.slice(5), 10)); });
    return max + 1;
  }
  function updateSourceInfo() {
    const t = $("sourceText").value;
    const info = $("sourceInfo");
    if (!t.trim()) { info.textContent = SOURCE_HINT; info.classList.remove("warn"); return; }
    const words = t.trim().split(/\s+/).length;
    const docs = (t.match(/\[DOC-\d+/g) || []).length;
    let msg = words.toLocaleString() + " words" + (docs ? " in " + docs + " document" + (docs > 1 ? "s" : "") : "") + ".";
    const big = words > 60000;
    if (big) msg += " This may exceed what some AI systems accept in one prompt. Consider splitting the corpus across several runs.";
    info.textContent = msg;
    info.classList.toggle("warn", big);
  }
  /* PDF and Word reading. Libraries live in vendor/ and load only when first needed. */
  let pdfjsPromise = null, mammothPromise = null;
  function loadPdfjs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import(new URL("vendor/pdfjs/pdf.min.mjs", location.href).href).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
        return lib;
      }).catch((e) => { pdfjsPromise = null; throw e; });
    }
    return pdfjsPromise;
  }
  function loadMammoth() {
    if (!mammothPromise) {
      mammothPromise = new Promise((resolve, reject) => {
        if (window.mammoth) return resolve(window.mammoth);
        const s = el("script", { src: "vendor/mammoth/mammoth.browser.min.js" });
        s.onload = () => resolve(window.mammoth);
        s.onerror = () => { mammothPromise = null; s.remove(); reject(new Error("load failed")); };
        document.head.append(s);
      });
    }
    return mammothPromise;
  }
  function textChecks(text, warnings) {
    if (/�|[-]/.test(text)) warnings.push("Some characters did not convert cleanly (shown as � or blank boxes). Check accented letters such as ọ, ụ, ị, ẹ, ṣ against the original.");
  }
  async function extractFile(f) {
    const name = f.name;
    const ext = (name.split(".").pop() || "").toLowerCase();
    const res = { name, text: "", warnings: [], error: "" };
    try {
      if (ext === "pdf") {
        let lib;
        try { lib = await loadPdfjs(); }
        catch (e) { res.error = "PDF reading could not start. If you opened the Lab from a downloaded copy, use the online version instead, or copy and paste the text."; return res; }
        let pdf;
        try { pdf = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false, disableFontFace: true }).promise; }
        catch (e) {
          res.error = e && e.name === "PasswordException" ? "This PDF is password-protected. Remove the password and try again." : "This file could not be opened as a PDF.";
          return res;
        }
        const pages = [];
        let chars = 0;
        for (let p = 1; p <= pdf.numPages; p++) {
          const tc = await (await pdf.getPage(p)).getTextContent();
          let t = "";
          tc.items.forEach((it) => { if (typeof it.str === "string") { t += it.str; if (it.hasEOL) t += "\n"; } });
          t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
          chars += t.replace(/\s/g, "").length;
          pages.push("[p. " + p + "]\n" + t);
        }
        res.text = pages.join("\n\n").normalize("NFC");
        if (chars < 30 * pdf.numPages) {
          res.warnings.push("Very little text was found (" + pdf.numPages + " page" + (pdf.numPages > 1 ? "s" : "") + "). This looks like a scanned PDF, which needs text recognition (OCR) first. Untick it, or paste a typed transcription instead.");
        }
        res.warnings.push("Page markers [p. 1], [p. 2]… were added so claims can cite pages. Check that columns, footnotes and headers came out in the right order.");
        textChecks(res.text, res.warnings);
      } else if (ext === "docx") {
        let m;
        try { m = await loadMammoth(); }
        catch (e) { res.error = "Word reading could not start. Try again, or save the document as .txt."; return res; }
        const out = await m.extractRawText({ arrayBuffer: await f.arrayBuffer() });
        res.text = out.value.replace(/\n{3,}/g, "\n\n").trim().normalize("NFC");
        res.warnings.push("Tables and footnotes come through as plain text.");
        textChecks(res.text, res.warnings);
      } else if (ext === "doc") {
        res.error = "This is the old Word format (.doc). Open it in Word and save it as .docx, then load it again.";
      } else {
        const body = (await f.text()).replace(/\r\n/g, "\n").trim();
        if (/\u0000/.test(body.slice(0, 2000))) res.error = "This does not look like a text file. Supported: .txt, .md, .csv, transcripts, .docx and .pdf.";
        else { res.text = body.normalize("NFC"); textChecks(res.text, res.warnings); }
      }
      if (!res.error && !res.text.trim()) res.error = "No text was found in this file.";
    } catch (e) {
      res.error = "This file could not be read.";
    }
    return res;
  }

  let pending = [];
  function renderReview(loading) {
    const list = $("reviewList"); list.replaceChildren();
    if (loading) { list.append(el("p", { class: "muted", text: loading })); $("reviewAdd").disabled = true; return; }
    pending.forEach((r, i) => {
      const box = el("div", { class: "review-item" + (r.error ? " bad" : "") });
      const head = el("label", { class: "check" });
      const cb = el("input", { type: "checkbox" });
      cb.checked = !r.error && !r.warnings.some((w) => w.startsWith("Very little text"));
      cb.disabled = !!r.error;
      cb.addEventListener("change", () => { r.include = cb.checked; updateReviewButton(); });
      r.include = cb.checked;
      const words = r.text.trim() ? r.text.trim().split(/\s+/).length : 0;
      head.append(cb, el("strong", { text: r.name }), el("span", { class: "muted", text: r.error ? "" : " · " + words.toLocaleString() + " words" }));
      box.append(head);
      if (r.error) box.append(el("p", { class: "hint warn", text: r.error }));
      r.warnings.forEach((w) => box.append(el("p", { class: "hint" + (/Very little|did not convert/.test(w) ? " warn" : ""), text: w })));
      if (!r.error) {
        const ta = el("textarea", { rows: "8", "aria-label": "Extracted text of " + r.name });
        ta.value = r.text;
        ta.addEventListener("input", () => (r.text = ta.value));
        box.append(ta);
      }
      list.append(box);
    });
    updateReviewButton();
  }
  function updateReviewButton() {
    const n = pending.filter((r) => r.include).length;
    $("reviewAdd").disabled = n === 0;
    $("reviewAdd").textContent = n ? "Add " + n + " file" + (n > 1 ? "s" : "") + " to source text" : "Nothing selected";
  }
  function openDialog() { const d = $("review"); if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); }
  function closeDialog() { const d = $("review"); if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open"); }

  $("sourceFiles").addEventListener("change", async (ev) => {
    const files = [...ev.target.files];
    ev.target.value = "";
    if (!files.length) return;
    pending = [];
    openDialog();
    for (let i = 0; i < files.length; i++) {
      renderReview("Reading " + files[i].name + " (" + (i + 1) + " of " + files.length + ")…");
      pending.push(await extractFile(files[i]));
    }
    renderReview();
  });
  $("reviewCancel").addEventListener("click", () => { pending = []; closeDialog(); });
  $("reviewAdd").addEventListener("click", () => {
    const chosen = pending.filter((r) => r.include && r.text.trim());
    if (!chosen.length) return;
    if ($("example").value) {
      // Loading your own files starts your own design instead of adding to a worked example.
      $("example").value = "";
      writeState(Object.assign({}, BLANK, { planCross: $("planCross").checked, planLog: $("planLog").checked }));
    }
    let text = $("sourceText").value.replace(/\s+$/, "");
    let n = nextDocNumber(text);
    chosen.forEach((r) => {
      text += (text ? "\n\n" : "") + "[DOC-" + String(n).padStart(2, "0") + ": " + r.name + "]\n" + r.text.trim();
      n++;
    });
    $("sourceText").value = text;
    pending = [];
    closeDialog();
    renderBuild();
    showTab("tab-build");
    $("sourceText").scrollIntoView({ behavior: "smooth", block: "center" });
    $("sourceText").classList.remove("flash-target"); void $("sourceText").offsetWidth; $("sourceText").classList.add("flash-target");
  });

  /* ---------- events: build ---------- */
  $("builder").addEventListener("input", renderBuild);
  $("builder").addEventListener("change", renderBuild);
  $("runs").addEventListener("input", renderBuild);
  $("models").addEventListener("input", renderBuild);
  $("theoryPreset").addEventListener("change", () => { if ($("theoryPreset").value) $("theory").value = $("theoryPreset").value; renderBuild(); });
  let lastTechnique = null;
  $("technique").addEventListener("focus", () => (lastTechnique = $("technique").value));
  $("technique").addEventListener("change", () => {
    const prev = lastTechnique && L.techniques[lastTechnique] ? L.techniques[lastTechnique].steps.join("\n") : null;
    const cur = $("procedure").value.trim();
    if (!cur || cur === prev || Object.values(L.techniques).some((t) => t.steps.join("\n") === cur)) {
      $("procedure").value = L.techniques[$("technique").value].steps.join("\n");
    }
    lastTechnique = $("technique").value;
    renderBuild();
  });
  $("example").addEventListener("change", () => {
    const x = L.examples.find((e) => e.id === $("example").value);
    const s = Object.assign({}, BLANK, x || {}, { planCross: $("planCross").checked, planLog: $("planLog").checked });
    if (!x) s.procedure = "";
    else s.procedure = L.techniques[s.technique].steps.join("\n");
    writeState(s); renderBuild();
  });
  $("startOwn").addEventListener("click", () => {
    const s = readState();
    const dirty = !$("example").value && (s.question.trim() || s.sourceText.trim());
    if (dirty && !confirm("Start a new blank design? Your current one will be replaced. (Download it first if you want to keep it.)")) return;
    $("example").value = "";
    writeState(Object.assign({}, BLANK, { planCross: s.planCross, planLog: s.planLog }));
    renderBuild();
    $("question").scrollIntoView({ behavior: "smooth", block: "center" });
    $("question").focus({ preventScroll: true });
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("Clear the whole form?")) return;
    $("example").value = ""; writeState(Object.assign({}, BLANK)); renderBuild();
  });
  $("copyPrompt").addEventListener("click", () => copy($("prompt").textContent, "buildStatus"));
  $("dlPrompt").addEventListener("click", () => download(slug(readState().question) + "-prompt.txt", $("prompt").textContent));
  $("dlDesign").addEventListener("click", () => { const s = readState(); download(slug(s.question) + "-design.md", designRecord(s), "text/markdown;charset=utf-8"); });
  $("dlStudy").addEventListener("click", () => { const s = readState(); download(slug(s.question) + "-study-protocol.md", studyProtocol(s), "text/markdown;charset=utf-8"); });

  /* ---------- tabs ---------- */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function showTab(id) {
    tabs.forEach((t) => {
      const on = t.id === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    try { history.replaceState(null, "", "#" + id.replace("tab-", "")); } catch (e) { /* ignore */ }
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => showTab(t.id));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      showTab(n.id); n.focus();
    });
  });

  /* ---------- init ---------- */
  const draft = store.get(KEY_DRAFT, null);
  writeState(Object.assign({}, BLANK, draft || L.examples[0], draft ? {} : { procedure: L.techniques[L.examples[0].technique].steps.join("\n") }));
  if (!draft) $("example").value = L.examples[0].id;
  renderBuild();
  renderLog();
  const hash = location.hash.replace("#", "");
  if (hash && $("tab-" + hash)) showTab("tab-" + hash);
})();
