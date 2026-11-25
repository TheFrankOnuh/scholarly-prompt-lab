// Regression tests for problems found in the independent code review (November 2026).
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../checks.js");

const SRC = `[DOC-01: memo.txt]
[p. 1]
The women of Oloko refused to be counted. They said the count would lead to a tax on women. The district officer removed the war-
rant chief after the protest in 1929.
[p. 2]
The elders of the town met for three days. Okonkwo spoke first. The market was closed and 4,000 traders stayed away.

[DOC-02: letter.txt]
The soldiers arrived at dawn. The inquiry was held in Aba and heard from many witnesses.
真理不怕提问，谎言才害怕。`;
const A = (out, prompt) => C.analyse(out, SRC, prompt || "");

test("JSON output: only evidence fields are treated as quotations", () => {
  const out = JSON.stringify([
    { finding: "Refusal of the count", confidence: "moderate", textual_evidence: "The women of Oloko refused to be counted.", alternative_interpretation: "Fear of taxation alone" },
    { finding: "Removal", confidence: "high", textual_evidence: "The district officer promoted the warrant chief.", alternative_interpretation: "" }
  ], null, 2);
  const r = A(out);
  assert.equal(r.format, "json");
  assert.equal(r.quotations.length, 2);
  assert.equal(r.exact, 1);
  assert.equal(r.terms.length, 0, "keys and labels must not be read as quoted terms");
  assert.equal(r.findings, 2);
  assert.equal(r.alternatives, 1);
});

test("JSON inside a code fence is recognised", () => {
  const r = A('```json\n[{"evidence": "The soldiers arrived at dawn.", "claim": "x"}]\n```');
  assert.equal(r.format, "json");
  assert.equal(r.exact, 1);
});

test("JSON without an evidence field gives no traceability score, with an explanation", () => {
  const r = A('[{"claim": "The women refused", "interpretation": "resistance"}]');
  assert.equal(C.suggestScores(r).trace.score, null);
  assert.match(r.formatNote, /no field for quotations/);
});

test("CSV output: the evidence column is checked, other cells are not", () => {
  const out = 'document ID,finding,textual evidence,interpretation\nDOC-01,Refusal,"The women of Oloko refused to be counted.",Resistance\nDOC-02,Arrival,"The soldiers arrived at noon, fully armed.",Force';
  const r = A(out);
  assert.equal(r.format, "csv");
  assert.equal(r.quotations.length, 2);
  assert.equal(r.exact, 1);
  assert.equal(r.findings, 2);
});

test("markdown table: findings are rows, and alternatives are counted from their column", () => {
  const out = "| Finding | Evidence | Alternative interpretation |\n|---|---|---|\n| Refusal | “The women of Oloko refused to be counted.” | Fear of tax |\n| Closure | “The market was closed” | |\n| Arrival | “The soldiers arrived at dawn.” | – |";
  const r = A(out);
  assert.equal(r.findings, 3);
  assert.equal(r.alternatives, 1);
  assert.equal(C.suggestScores(r).plural.score, 2);
});

test("a table with no alternatives column gets no plurality score, not a misleading one", () => {
  const r = A("| Finding | Evidence |\n|---|---|\n| Refusal | “The women of Oloko refused to be counted.” |");
  assert.equal(C.suggestScores(r).plural.score, null);
});

test("fragments stitched with ellipses from different documents are not passed as exact", () => {
  const r = A("> “The women ... removed ... the elders of the town”");
  assert.notEqual(r.quotations[0].status, "exact");
  const r2 = A("> “The women of Oloko refused to be counted ... The soldiers arrived at dawn.”");
  assert.equal(r2.quotations[0].status, "near");
  assert.match(r2.quotations[0].note, /omissions/);
  assert.ok(C.suggestScores(r2).trace.score < 5);
});

test("one- and two-word fragments joined by ellipses are flagged", () => {
  const r = A("> “the ... was ... the soldiers”");
  assert.notEqual(r.quotations.length && r.quotations[0].status, "exact");
});

test("an honest elision within one passage is still exact", () => {
  const r = A("> “The women of Oloko refused to be counted ... the count would lead to a tax on women.”");
  assert.equal(r.quotations[0].status, "exact");
});

test("editorial capital in brackets is accepted: [T]he", () => {
  assert.equal(A("> “[T]he elders of the town met for three days.”").quotations[0].status, "exact");
});

test("a quotation followed by a citation or an attribution line is checked without them", () => {
  assert.equal(A('> "The soldiers arrived at dawn." (DOC-02)').quotations[0].status, "exact");
  assert.equal(A("> The soldiers arrived at dawn.\n> — letter to the Resident").quotations[0].status, "exact");
});

test("two straight-quoted passages in one block are separate quotations", () => {
  const r = A('> "The soldiers arrived at dawn."\n> "Okonkwo spoke first."');
  assert.equal(r.quotations.length, 2);
  assert.equal(r.exact, 2);
});

test("British single quotation marks are read, and apostrophes inside them are kept", () => {
  const r = A("The memo says ‘The elders of the town met for three days’ and nothing more. It isn’t the women’s view.");
  assert.equal(r.quotations.length, 1);
  assert.equal(r.quotations[0].status, "exact");
});

test("an inline quotation that runs over a line break is still checked", () => {
  const r = A("The letter claims “The soldiers arrived at dawn. The inquiry\nwas held in Aba and heard from many witnesses.” which matters.");
  assert.equal(r.quotations.length, 1);
  assert.equal(r.quotations[0].status, "exact");
});

test("an inch mark or stray straight quote does not swallow the text between quotations", () => {
  const r = A('The 6" file holds the memo. It says "Okonkwo spoke first." and then stops.');
  assert.equal(r.quotations.length + r.terms.length, 1);
});

test("quotations crossing a page marker or a line-end hyphen match exactly", () => {
  assert.equal(A("> “after the protest in 1929. The elders of the town met”").quotations[0].status, "exact");
  assert.equal(A("> “The district officer removed the warrant chief after the protest”").quotations[0].status, "exact");
});

test("Chinese text is matched character by character", () => {
  assert.equal(A("> “真理不怕提问”").quotations[0].status, "exact");
  assert.notEqual(A("> “真理害怕提问的人”").quotations[0].status, "exact");
});

test("outside facts: possessives of known names are not flagged; partial numbers are", () => {
  const r = A("Okonkwo’s speech mattered. There were 19 witnesses and 4000 traders. The year was 1930, then 1930 again.");
  const f = r.outsideFacts.map((x) => x.text);
  assert.ok(!f.some((x) => /Okonkwo/.test(x)), "possessive of a name in the source");
  assert.ok(f.includes("19"), "19 is not in the source just because 1929 is");
  assert.ok(!f.includes("4000"), "4000 matches 4,000 in the source");
  assert.equal(f.filter((x) => /^1930/.test(x)).length, 1, "1930 and 1930, are the same fact");
});

test("outside facts: list numbers and ordinary words are not flagged as numbers or debris", () => {
  const r = A("10. The women refused.\n11. The soldiers arrived.\n\nThis describes the image\n\nSources");
  assert.deepEqual(r.outsideFacts.map((x) => x.text), []);
  assert.deepEqual(r.debris, []);
});

test("near matches are found wherever they sit in a very large source", () => {
  const filler = (n) => Array.from({ length: n }, (_, i) => "the report of the committee number " + i + " was read and the matter was closed").join(". ");
  const target = "the governor announced that the old market would reopen after the harvest festival in the new year";
  for (const where of [0.1, 0.6, 0.9]) {
    const total = 9000;
    const src = "[DOC-01]\n" + filler(Math.floor(total * where)) + ". " + target + ". " + filler(Math.floor(total * (1 - where)));
    const r = C.analyse("> “the governor announced that the old market would reopen after the harvest festival in the next year”", src, "");
    assert.equal(r.quotations[0].status, "near", "at " + where);
  }
});

test("many long inexact quotations against a 100,000-word source finish in reasonable time", () => {
  const src = "[DOC-01]\n" + Array.from({ length: 100000 }, (_, i) => "w" + (i % 3001)).join(" ");
  const out = Array.from({ length: 40 }, (_, k) => "> “" + Array.from({ length: 60 }, (_, j) => "w" + ((k * 131 + j) % 3001)).join(" ") + " changed words here”").join("\n\n");
  const t0 = Date.now();
  const r = C.analyse(out, src, "");
  const ms = Date.now() - t0;
  assert.equal(r.quotations.length, 40);
  assert.ok(ms < 6000, "took " + ms + " ms");
  const t1 = Date.now();
  C.analyse(out + "\n\nOne more sentence typed.", src, "");
  assert.ok(Date.now() - t1 < 1500, "re-check after a small edit should reuse earlier work: " + (Date.now() - t1) + " ms");
});

test("evaluator reply: a later duplicate key cannot wipe a valid score, and odd keys are ignored", () => {
  const crit = [{ id: "trace", label: "Evidence traceability" }];
  const ev = C.parseEvaluatorReply('{"scores":{"trace":4,"Evidence Traceability":7,"constructor":3,"__proto__":2}}', crit);
  assert.equal(ev.ok, true);
  assert.equal(ev.scores.trace.score, 4);
  assert.deepEqual(Object.keys(ev.scores), ["trace"]);
});
