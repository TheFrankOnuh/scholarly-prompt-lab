// Checks the methods report's record of how AI was used, and which logged outputs belong to a study.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global.window || {};
require(path.join("..", "report.js"));
const R = global.window.LAB_REPORT_DATA;
const gap = (t) => "[To complete: " + t + "]";
const plural = (n, one) => n + " " + (n === 1 ? one : one + "s");
const say = (roles, n) => R.useSentences(roles, n == null ? 1 : n, gap, plural);

const CATEGORIES = [
  "Preliminary analysis: Initial examination of source material, followed by my review.",
  "Preliminary coding: Initial coding of research material, which I reviewed and revised.",
  "Coding and classification: Application of my established coding scheme.",
  "Information processing: Extraction, summarisation or organisation of source material.",
  "Translation or transcription: Assistance with language translation or transcription.",
  "Interpretive examination: Exploration of alternative readings and counterarguments to assess my interpretation.",
  "Object of study: Examination of the AI system and its outputs.",
  "Literature discovery and review: Identification, comparison and synthesis of relevant scholarship, with independent verification of sources.",
  "Research design and instrument development: Assistance with developing research questions, analytical frameworks, interview guides or coding schemes.",
  "Comparative analysis: Examination of patterns, differences and relationships across documents, datasets, languages or research contexts.",
  "Research writing and editing: Assistance with drafting, revising or editing scholarly texts under my supervision."
];
const WRITING = [
  "Language and copyediting: Assistance with grammar, spelling, punctuation, clarity and academic language.",
  "Structural and argumentative revision: Assistance with organising scholarly arguments, improving coherence and refining the structure of researcher-authored texts.",
  "Content generation and drafting: Generation of substantive academic text, including passages or sections subsequently reviewed and revised by me."
];

test("the eleven categories and three writing subcategories are offered word for word, in order", () => {
  const top = R.ROLES.filter((x) => !x.parent).map((x) => x.label);
  const sub = R.ROLES.filter((x) => x.parent).map((x) => x.label);
  assert.deepEqual(top, CATEGORIES);
  assert.deepEqual(sub, WRITING);
  assert.ok(R.ROLES.filter((x) => x.parent).every((x) => x.parent === "writing"));
  assert.equal(new Set(R.ROLES.map((x) => x.id)).size, R.ROLES.length);
});

test("each category used as a tool appears in the AI-use statement", () => {
  for (const x of R.ROLES.filter((r) => r.text && !r.parent)) {
    const s = say([x.id]);
    assert.ok(s.includes(x.text), x.id);
    assert.ok(!s.includes("[To complete"), x.id);
  }
  const nine = R.ROLES.filter((r) => r.text && !r.parent).map((r) => r.id);
  assert.equal(nine.length, 9);
  assert.match(say(nine), /in nine ways: /);
});

test("the writing subcategories are recorded separately and each is stated", () => {
  const all = say(["writing", "writing_lang", "writing_struct", "writing_draft"]);
  for (const x of R.ROLES.filter((r) => r.parent)) assert.ok(all.includes(x.text), x.id);
  const lang = say(["writing", "writing_lang"]);
  assert.ok(lang.includes("language and copyediting"));
  assert.ok(!lang.includes("generation of substantive academic text"), "only what was ticked is disclosed");
  const draft = say(["writing_draft"]);
  assert.ok(draft.includes("generation of substantive academic text"), "a subcategory alone implies its category");
  assert.ok(say(["writing"]).includes("[To complete: which kinds of writing assistance"), "the kind of writing help must be stated");
});

test("object of study and no selection are handled", () => {
  assert.match(say(["object"], 2), /the object of this study: the outputs of 2 AI systems/);
  assert.match(say(["prelim", "object"]), /was also the object of study/);
  assert.ok(say([]).startsWith("[To complete: how generative AI was used"));
});

test("choices saved by earlier versions are kept", () => {
  // up to version 1.2.2, "writing" meant improving the wording of one's own text
  assert.deepEqual(R.legacyRoles({ roles: ["prelim", "writing"] }), ["prelim", "writing", "writing_lang"]);
  assert.deepEqual(R.legacyRoles({ roles: ["writing"], rolesVersion: 2 }), ["writing"]);
  assert.deepEqual(R.legacyRoles({ role: "both" }), ["prelim", "object"]);
  assert.deepEqual(R.legacyRoles({}), ["prelim"]);
  assert.deepEqual(R.normaliseRoles(["unknown", "compare", "compare"]), ["compare"]);
});

test("the selected logged outputs are kept, and sensible when nothing has been chosen", () => {
  const log = [{ id: "a", question: "Q1" }, { id: "b", question: "Q2" }, { id: "c", question: "Q1" }];
  assert.deepEqual(R.pickOutputs(log, { outputs: ["c", "gone"] }, "Q1"), ["c"], "a saved choice survives, deleted outputs drop out");
  assert.deepEqual(R.pickOutputs(log, { outputs: [] }, "Q1"), [], "an empty choice stays empty");
  assert.deepEqual(R.pickOutputs(log, {}, "Q1"), ["a", "c"], "first visit: outputs for the current question");
  assert.deepEqual(R.pickOutputs(log, { scope: "all" }, "Q1"), ["a", "b", "c"], "an earlier report that used every output");
  assert.deepEqual(R.pickOutputs(log, {}, "Q3"), ["a", "b", "c"], "no match: every output");
  assert.deepEqual(R.pickOutputs([], {}, "Q1"), []);
  // outputs logged after the choice was saved are included; outputs the researcher unticked stay out
  const later = log.concat([{ id: "d", question: "Q1" }]);
  assert.deepEqual(R.pickOutputs(later, { outputs: ["a"], seen: ["a", "b", "c"] }, "Q1"), ["a", "d"]);
});
