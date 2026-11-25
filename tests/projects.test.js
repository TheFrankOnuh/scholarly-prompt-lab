// Checks that research projects keep work apart and never lose it.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.self = global.self || {};
require(path.join("..", "projects.js"));
const { make, KEYS, FORMAT } = global.self.LAB_PROJECTS;

// a stand-in for the browser's storage, with an optional size limit like a real browser's
function fakeStorage(limit) {
  const m = new Map();
  const size = () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      v = String(v);
      const next = size() - (m.has(k) ? k.length + m.get(k).length : 0) + k.length + v.length;
      if (limit && next > limit) throw new Error("QuotaExceededError");
      m.set(k, v);
    },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m),
    size
  };
}
const draft = (q, src) => JSON.stringify({ question: q, sourceText: src || "" });

test("work saved before projects existed becomes the first project, untouched", () => {
  const s = fakeStorage();
  s.setItem("spl.draft.v1", draft("Old question", "[DOC-01: a.txt]\ntext"));
  s.setItem("spl.log.v1", JSON.stringify([{ id: "x" }, { id: "y" }]));
  const P = make(s);
  const list = P.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "My first project");
  assert.equal(list[0].current, true);
  assert.equal(list[0].question, "Old question");
  assert.equal(list[0].sources, 1);
  assert.equal(list[0].runs, 2);
  assert.equal(s.getItem("spl.draft.v1"), draft("Old question", "[DOC-01: a.txt]\ntext"));
});

test("switching keeps each project's work apart and brings it back exactly", () => {
  const s = fakeStorage();
  s.setItem("spl.draft.v1", draft("Question A"));
  s.setItem("spl.report.v1", JSON.stringify({ title: "Report A" }));
  const P = make(s);
  const a = P.current();
  const b = P.create("Second study").id;
  assert.deepEqual(P.switchTo(b), { ok: true });
  assert.equal(s.getItem("spl.draft.v1"), null, "a new project starts empty");
  assert.equal(s.getItem("spl.report.v1"), null);
  s.setItem("spl.draft.v1", draft("Question B"));
  assert.deepEqual(P.switchTo(a), { ok: true });
  assert.equal(s.getItem("spl.draft.v1"), draft("Question A"));
  assert.equal(s.getItem("spl.report.v1"), JSON.stringify({ title: "Report A" }));
  assert.deepEqual(P.switchTo(b), { ok: true });
  assert.equal(s.getItem("spl.draft.v1"), draft("Question B"));
  const names = P.list().map((p) => p.name + ":" + p.question);
  assert.deepEqual(names, ["My first project:Question A", "Second study:Question B"]);
});

test("theories and disciplines the researcher added are shared, not parked", () => {
  const s = fakeStorage();
  s.setItem("spl.mytheories.v1", "[1]");
  s.setItem("spl.mydisciplines.v1", "[2]");
  const P = make(s);
  P.switchTo(P.create("Other").id);
  assert.equal(s.getItem("spl.mytheories.v1"), "[1]");
  assert.equal(s.getItem("spl.mydisciplines.v1"), "[2]");
});

test("when storage is too full to switch, everything is put back as it was", () => {
  const s = fakeStorage();
  const big = "x".repeat(4000);
  s.setItem("spl.draft.v1", draft("Big project", big));
  const P = make(s);
  const first = P.current();
  const other = P.create("Small").id;
  const before = s.dump();
  const tight = fakeStorage(s.size() + 500);          // room for the index, not for a second copy of the big project
  Object.entries(before).forEach(([k, v]) => tight.setItem(k, v));
  const Q = make(tight);
  const r = Q.switchTo(other);
  assert.deepEqual(r, { ok: false, reason: "full" });
  assert.deepEqual(tight.dump(), before, "a failed switch must change nothing");
  assert.equal(Q.current(), first);
});

test("a project that fails to be created leaves nothing behind", () => {
  const s = fakeStorage();
  const P = make(s);
  P.ensure();
  const tight = fakeStorage(s.size() + 20);
  Object.entries(s.dump()).forEach(([k, v]) => tight.setItem(k, v));
  const before = tight.dump();
  const r = make(tight).create("No room", { "spl.draft.v1": draft("q", "y".repeat(500)) });
  assert.deepEqual(r, { ok: false, reason: "full" });
  assert.deepEqual(tight.dump(), before);
});

test("duplicate copies the work, and the copy is independent", () => {
  const s = fakeStorage();
  s.setItem("spl.draft.v1", draft("Original"));
  const P = make(s);
  const a = P.current();
  const c = P.duplicate(a).id;
  P.switchTo(c);
  assert.equal(s.getItem("spl.draft.v1"), draft("Original"));
  s.setItem("spl.draft.v1", draft("Changed in the copy"));
  P.switchTo(a);
  assert.equal(s.getItem("spl.draft.v1"), draft("Original"));
  assert.equal(P.list()[1].name, "My first project (copy)");
});

test("the only project cannot be deleted, and deleting the open one opens another", () => {
  const s = fakeStorage();
  s.setItem("spl.draft.v1", draft("A"));
  const P = make(s);
  const a = P.current();
  assert.deepEqual(P.remove(a), { ok: false, reason: "last" });
  const b = P.create("B", { "spl.draft.v1": draft("B question") }).id;
  assert.deepEqual(P.remove(a), { ok: true });
  assert.equal(P.current(), b);
  assert.equal(s.getItem("spl.draft.v1"), draft("B question"));
  assert.equal(P.list().length, 1);
  assert.ok(!Object.keys(s.dump()).some((k) => k.startsWith("spl.project.")), "no parked record is left behind");
});

test("a backup file restores a whole project", () => {
  const s = fakeStorage();
  s.setItem("spl.draft.v1", draft("Backed up", "[DOC-01: a]\n[DOC-02: b]"));
  s.setItem("spl.log.v1", JSON.stringify([{ id: 1 }]));
  const P = make(s);
  P.rename(P.current(), "  Presidential   discourse  ");
  const file = JSON.parse(JSON.stringify(P.exportProject(P.current(), "1.0.0")));
  assert.equal(file.format, FORMAT);
  assert.equal(file.name, "Presidential discourse");
  const other = fakeStorage();
  const Q = make(other);
  const r = Q.importProject(file);
  assert.equal(r.ok, true);
  const got = Q.list().find((p) => p.id === r.id);
  assert.equal(got.name, "Presidential discourse");
  assert.equal(got.sources, 2);
  assert.equal(got.runs, 1);
  assert.equal(got.current, false, "restoring does not replace the project that is open");
});

test("files that are not project backups are refused and store nothing", () => {
  const s = fakeStorage();
  const P = make(s);
  P.ensure();
  const before = s.dump();
  const bad = [null, 5, "text", [], {}, { format: "something-else", data: {} }, { format: FORMAT }, { format: FORMAT, data: [] },
    { format: FORMAT, data: { "spl.draft.v1": { question: "not a string" } } },
    { format: FORMAT, data: { "spl.log.v1": "{not json" } }];
  for (const b of bad) assert.deepEqual(P.importProject(b), { ok: false, reason: "format" });
  assert.deepEqual(s.dump(), before);
});

test("a backup file cannot write outside a project's own records", () => {
  const s = fakeStorage();
  const P = make(s);
  const r = P.importProject({ format: FORMAT, name: "x", data: { "spl.mytheories.v1": "[]", "spl.projects.v1": "{}", "anything": "1", "spl.draft.v1": draft("ok") } });
  assert.equal(r.ok, true);
  P.switchTo(r.id);
  assert.equal(s.getItem("spl.draft.v1"), draft("ok"));
  assert.equal(s.getItem("spl.mytheories.v1"), null);
  assert.equal(s.getItem("anything"), null);
  for (const k of Object.keys(s.dump())) assert.ok(KEYS.includes(k) || k === "spl.projects.v1" || k.startsWith("spl.project."), "unexpected key " + k);
});

test("names are tidied and never empty", () => {
  const P = make(fakeStorage());
  const id = P.create("   ").id;
  assert.equal(P.list().find((p) => p.id === id).name, "Untitled project");
  P.rename(id, "n".repeat(200));
  assert.equal(P.list().find((p) => p.id === id).name.length, 80);
});

test("a damaged project list is rebuilt without touching the open work", () => {
  const s = fakeStorage();
  s.setItem("spl.projects.v1", "{broken");
  s.setItem("spl.draft.v1", draft("Still here"));
  const P = make(s);
  assert.equal(P.list().length, 1);
  assert.equal(s.getItem("spl.draft.v1"), draft("Still here"));
});
