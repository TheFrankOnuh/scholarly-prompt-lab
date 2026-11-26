// Checks the methods report's record of how AI was used, and which logged outputs belong to a study.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global.window || {};
require(path.join("..", "report.js"));
const R = global.window.LAB_REPORT_DATA;
const gap = (t) => "[To complete: " + t + "]";
const plural = (n, one) => n + " " + (n === 1 ? one : one + "s");
const say = (roles) => R.useSentences(roles, gap);

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

test("each category appears in the disclosure, attributed to the researcher", () => {
  for (const x of R.ROLES.filter((r) => r.phrase && !r.parent)) {
    const s = say([x.id]);
    assert.ok(s.includes(x.phrase), x.id);
    assert.ok(s.startsWith("The researcher reports"), x.id);
    assert.ok(!s.includes("[To complete"), x.id);
  }
  const nine = R.ROLES.filter((r) => r.phrase && !r.parent).map((r) => r.id);
  assert.equal(nine.length, 9);
  assert.match(say(nine), /for the following purposes: .*; and comparative analysis/);
});

test("selecting a category never claims that checking or verification took place", () => {
  const all = R.ROLES.map((r) => r.id);
  const s = say(all);
  for (const claim of [/checked against the original/i, /verified (independently )?by the researcher/i, /was checked by/i, /which the researcher checked/i, /not treated as a finding/i]) assert.doesNotMatch(s, claim);
  // translation: the category is assistance only, so nothing is said about checking the translation
  assert.equal(say(["translate"]), "The researcher reports using generative AI in this study for translation or transcription (assistance with language translation or transcription).");
});

test("the writing subcategories are recorded separately and each is stated", () => {
  const all = say(["writing", "writing_lang", "writing_struct", "writing_draft"]);
  for (const x of R.ROLES.filter((r) => r.parent)) assert.ok(all.includes(x.phrase), x.id);
  const lang = say(["writing", "writing_lang"]);
  assert.ok(lang.includes("language and copyediting"));
  assert.ok(!lang.includes("content generation"), "only what was ticked is disclosed");
  assert.ok(say(["writing_draft"]).includes("content generation and drafting"), "a subcategory alone implies its category");
  assert.ok(say(["writing"]).includes("[To complete: type of writing assistance"), "the kind of writing help must be stated");
});

test("object of study and no selection are handled", () => {
  assert.match(say(["object"]), /^The researcher reports that generative AI is the object of study/);
  assert.match(say(["prelim", "object"]), /also reports that generative AI is an object of study/);
  assert.equal(say([]), "[To complete: study-level AI use]");
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

// ---------- CONTEXT assessment ----------
const base = { question: "", theories: [], theoryNotes: "", procedureSteps: 0, context: "", terms: "", safeguards: [], sourceText: "", planCross: false, planLog: false,
  prompts: [], outputs: 0, checked: 0, confirmed: 0, complete: 0, systems: 0, conditions: 0, repeats: 0, na: {} };
const status = (over) => Object.fromEntries(R.contextAssessment(Object.assign({}, base, over)).map((d) => [d.key, d.status]));

test("with nothing recorded every dimension is not addressed, labelled in the standard format", () => {
  const a = R.contextAssessment(base);
  assert.deepEqual(a.map((d) => d.status), Array(7).fill("Not addressed"));
  assert.equal(a[0].label, "CONTEXT dimension C: Conceptual grounding");
  assert.equal(a[6].label, "CONTEXT dimension T: Transparency");
});

test("a design specifies, a documented run documents", () => {
  const design = { question: "Q?", theories: ["cda"], procedureSteps: 3, context: "Lagos, 1929", safeguards: ["quote", "alt", "uncert"], sourceText: "x", planCross: true, planLog: true };
  assert.deepEqual(status(design), { c: "Specified", o: "Specified", n: "Specified", t1: "Specified", e: "Specified", x: "Specified", t2: "Specified" });
  const prompt = ["RESEARCH QUESTION: Q?", "", "THEORETICAL ORIENTATION: x", "", "PROCEDURE:", "1. a", "", "CULTURAL, LINGUISTIC AND HISTORICAL CONTEXT: y"].join("\n");
  const run = Object.assign({}, design, { prompts: [prompt], outputs: 1, checked: 1, confirmed: 1, complete: 1, systems: 1, conditions: 1, repeats: 1 });
  assert.deepEqual(status(run), { c: "Documented", o: "Documented", n: "Documented", t1: "Documented", e: "Documented", x: "Specified", t2: "Documented" });
});

test("a commitment to cross-model examination differs from a documented one", () => {
  assert.equal(status({ planCross: true }).x, "Specified");
  assert.equal(status({ planCross: true, outputs: 3, repeats: 3, systems: 1, conditions: 1 }).x, "Specified", "repeated runs alone are not a comparison across systems or prompts");
  assert.equal(status({ outputs: 2, systems: 2, conditions: 1 }).x, "Documented");
  assert.equal(status({ outputs: 2, systems: 1, conditions: 2 }).x, "Documented");
});

test("suggested scores and incomplete records are not documentation", () => {
  assert.equal(status({ outputs: 2, confirmed: 0, safeguards: ["alt", "uncert"] }).e, "Specified");
  assert.equal(status({ outputs: 2, complete: 1 }).t2, "Specified");
});

test("a justification marks a dimension not applicable, and only then", () => {
  const a = R.contextAssessment(Object.assign({}, base, { na: { x: "Single-system case study of one model's representation of Igbo proverbs." } }));
  assert.equal(a[5].status, "Not applicable");
  assert.match(a[5].basis, /Single-system case study/);
  assert.equal(R.contextAssessment(Object.assign({}, base, { na: { x: "   " } }))[5].status, "Not addressed");
});

test("the assessment never claims certification or validity", () => {
  const all = R.contextAssessment(Object.assign({}, base, { question: "Q", theories: ["x"], outputs: 1, checked: 1, confirmed: 1, complete: 1, systems: 2, conditions: 2, prompts: ["THEORETICAL ORIENTATION: x"] }));
  for (const d of all) assert.doesNotMatch(d.basis, /valid(ated)?|certif|verified that|accurate/i, d.key);
});

// ---------- software citation ----------
test("the citation uses the version DOI from release metadata, otherwise the all-versions DOI, never a built one", () => {
  const v = R.labCitation({ version: "1.2.0", versionDoi: "10.5281/zenodo.24569839", conceptDoi: "10.5281/zenodo.24521711", released: "2026-11-26" });
  assert.equal(v.doi, "10.5281/zenodo.24569839"); assert.equal(v.versionSpecific, true); assert.equal(v.year, "2026");
  assert.match(v.text, /\(Version 1\.2\.0\) \[Computer software\]\. Zenodo\. https:\/\/doi\.org\/10\.5281\/zenodo\.24569839$/);
  const c = R.labCitation({ version: "1.2.4", versionDoi: "", conceptDoi: "10.5281/zenodo.24521711", released: "" });
  assert.equal(c.doi, "10.5281/zenodo.24521711"); assert.equal(c.versionSpecific, false); assert.equal(c.year, "n.d.");
});
