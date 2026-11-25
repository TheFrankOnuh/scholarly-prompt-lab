// Checks that the Lab's reference data is internally consistent.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = {};
for (const f of ["theories.js", "theory-links.js", "disciplines.js", "data.js"]) require(path.join("..", f));
const W = global.window;
const ids = new Set(W.LAB_THEORIES.map((t) => t.id));
const fields = new Set(W.LAB_THEORY_FIELDS.map((f) => f.id));
const TYPES = new Set(["theory", "framework", "approach", "method", "concept", "school", "movement", "critique"]);

test("theory ids are unique and kebab-case", () => {
  assert.equal(ids.size, W.LAB_THEORIES.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
});

test("every theory has a valid field, a name and a focus", () => {
  for (const t of W.LAB_THEORIES) {
    assert.ok(fields.has(t.f), t.id + " field " + t.f);
    assert.ok(t.n && t.n.trim(), t.id + " name");
    assert.ok(t.a && t.a.trim().length > 20, t.id + " focus");
    assert.ok(!/[.]$/.test(t.a.trim()), t.id + " focus should not end with a full stop");
    assert.ok(!/—/.test(t.a), t.id + " focus contains an em dash");
  }
});

test("sourced theories have a type, at least one complete key work, and concepts", () => {
  for (const t of W.LAB_THEORIES.filter((x) => x.works)) {
    assert.ok(TYPES.has(t.type), t.id + " type " + t.type);
    assert.ok(t.works.length >= 1 && t.works.length <= 3, t.id + " works count");
    assert.ok(Array.isArray(t.concepts) && t.concepts.length >= 2, t.id + " concepts");
    for (const w of t.works.concat(t.debates || [])) {
      assert.ok(w.authors && w.title && Number.isInteger(w.year), t.id + " citation needs authors, title, year");
      assert.ok(w.year >= 1500 && w.year <= 2026, t.id + " year " + w.year);
      if (w.kind === "article") assert.ok(w.container, t.id + " article needs a journal: " + w.title);
      if (w.kind === "chapter") assert.ok(w.container, t.id + " chapter needs a book: " + w.title);
      if (w.kind === "book") assert.ok(w.publisher, t.id + " book needs a publisher: " + w.title);
    }
    for (const d of t.debates || []) assert.ok(d.note && d.note.trim(), t.id + " debate needs a note");
  }
});

test("recommendation pairs and cues refer only to existing theories", () => {
  for (const [a, b] of W.LAB_THEORY_PAIRS) {
    assert.ok(ids.has(a), "pair id " + a);
    assert.ok(ids.has(b), "pair id " + b);
    assert.notEqual(a, b);
  }
  for (const k of Object.keys(W.LAB_THEORY_CUES)) assert.ok(ids.has(k), "cue id " + k);
});

test("worked examples refer only to existing theories, techniques and safeguards", () => {
  const safeguards = new Set(W.LAB.safeguards.map((s) => s.id));
  for (const ex of W.LAB.examples) {
    for (const id of ex.theories || []) assert.ok(ids.has(id), ex.id + " theory " + id);
    assert.ok(W.LAB.techniques[ex.technique], ex.id + " technique");
    for (const s of ex.safeguards || []) assert.ok(safeguards.has(s), ex.id + " safeguard " + s);
  }
});

test("disciplines are unique", () => {
  const all = W.LAB_DISCIPLINES.flatMap((g) => g.items);
  assert.equal(new Set(all.map((d) => d.toLowerCase())).size, all.length);
  assert.ok(all.length >= 60);
});

test("evaluation criteria all have three rubric anchors", () => {
  for (const c of W.LAB.criteria) assert.equal(c.rubric.length, 3, c.id);
});

test("every script the page loads exists, and the offline list matches", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 5);
  for (const s of scripts) assert.ok(fs.existsSync(path.join(root, s)), "missing " + s);
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  for (const s of scripts) assert.ok(sw.includes('"' + s + '"'), "sw.js does not save " + s + " for offline use");
  const core = [...sw.matchAll(/"((?:vendor|icons)\/[^"]+|[a-z-]+\.(?:js|css|html|webmanifest))"/g)].map((m) => m[1]);
  for (const f of core) assert.ok(fs.existsSync(path.join(root, f)), "sw.js lists a missing file: " + f);
});

test("all asset version tags in index.html agree", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const versions = new Set([...html.matchAll(/\?v=([0-9.]+)"/g)].map((m) => m[1]));
  assert.equal(versions.size, 1, "mixed versions: " + [...versions].join(", "));
});

test("discipline conventions refer only to listed disciplines, and none is claimed twice", () => {
  require("../procedures.js");
  const all = new Set(W.LAB_DISCIPLINES.flatMap((g) => g.items).map((d) => d.toLowerCase()));
  const seen = new Set();
  for (const c of W.LAB_DISCIPLINE_CONVENTIONS) {
    assert.ok(c.steps.length >= 1 && c.label, c.id);
    for (const m of c.match) { assert.ok(all.has(m), c.id + " lists unknown discipline: " + m); assert.ok(!seen.has(m), m + " appears twice"); seen.add(m); }
  }
});

test("framework procedures are well formed", () => {
  require("../procedures.js");
  for (const [id, steps] of Object.entries(W.LAB_THEORY_STEPS)) {
    assert.ok(Array.isArray(steps) && steps.length >= 2 && steps.length <= 7, id);
    for (const s of steps) { assert.ok(/[.?]$/.test(s.trim()), id + " step should end with a full stop: " + s.slice(0, 40)); assert.ok(!/—/.test(s), id + " has an em dash"); }
  }
});

test("every safeguard belongs to a known group, and techniques say where their evidence comes from", () => {
  for (const g of W.LAB.safeguards) assert.ok(W.LAB.safeguardGroups.includes(g.group), g.id);
  for (const [k, t] of Object.entries(W.LAB.techniques)) assert.ok(["none", "optional", "required"].includes(t.sources), k);
});

test("approved community entries are well formed and do not clash with the library", () => {
  require("../community.js");
  const com = W.LAB_COMMUNITY;
  assert.ok(Array.isArray(com.theories) && Array.isArray(com.disciplines));
  const groups = new Set(W.LAB_DISCIPLINES.map((g) => g.group));
  for (const t of com.theories) {
    assert.match(t.id, /^c-[a-z0-9-]+$/, "community id");
    assert.ok(!ids.has(t.id), "id clash " + t.id);
    assert.ok(fields.has(t.f) && TYPES.has(t.type) && t.n && t.a && t.works && t.works.length === 1, t.id);
    for (const v of [t.n, t.a, t.t || "", t.contributor || ""]) assert.ok(!/[<>`]/.test(v), t.id + " contains markup");
  }
  for (const d of com.disciplines) { assert.ok(groups.has(d.group), d.name); assert.ok(!/[<>`]/.test(d.name)); }
});
