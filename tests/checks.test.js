// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../checks.js");

const SRC = `[DOC-01: speech.txt]
Fellow Nigerians, today we celebrate our independence. Now, our purpose is simple: shared and widespread prosperity.
Nigeria was like a sick patient who receives the terrible news that he has cancer. We chose to excise the cancer.
Our reforms did not create the weaknesses in our economy. They confronted them. Inflation fell from 34 percent to 18 percent.
The elders say: Onye ajụjụ anaghị efu ụzọ.
Ẹ̀kọ́ ni ọ̀nà sí ọrọ̀. Bí ọmọdé bá mọ ọwọ́ wẹ̀, á bá àgbà jẹun.
Wetin we dey find na better life for everybody. Na so we go take build am.
She said "we shall overcome" and the crowd answered.

[DOC-02: interview.txt]
[p. 1]
The market women refused to pay the tax. They sat on the warrant chief until he fled.
[p. 2]
It was not a riot. It was a war, Ogu Umunwanyi.`;

const status = (out, i = 0) => C.analyse(out, SRC, "").quotations[i].status;

test("exact quotation in a blockquote with curly quotes", () => {
  assert.equal(status("> “Now, our purpose is simple: shared and widespread prosperity.”"), "exact");
});

test("exact quotation inline with straight quotes", () => {
  assert.equal(status('The speech says "We chose to excise the cancer" plainly.'), "exact");
});

test("punctuation and case differences still count as exact", () => {
  assert.equal(status("> “now our purpose is simple, shared and widespread prosperity”"), "exact");
});

test("altered wording is flagged as near, with the source wording", () => {
  const r = C.analyse("> “Nigeria was like a sick patient who received terrible news that he had cancer.”", SRC, "");
  assert.equal(r.quotations[0].status, "near");
  assert.match(r.quotations[0].source, /receives the terrible news/);
  assert.equal(r.quotations[0].doc, "DOC-01");
});

test("invented quotation is not found", () => {
  assert.equal(status("> “We will never again borrow money from foreign lenders under any circumstances.”"), "missing");
});

test("Igbo quotation with dropped diacritics is flagged, not passed", () => {
  const r = C.analyse("The proverb “Onye ajuju anaghi efu uzo” is cited.", SRC, "");
  assert.equal(r.quotations[0].status, "near");
  assert.match(r.quotations[0].note, /diacritics/i);
  assert.match(r.quotations[0].source, /ajụjụ/);
});

test("Igbo quotation with correct diacritics is exact", () => {
  assert.equal(status("The proverb “Onye ajụjụ anaghị efu ụzọ” is cited."), "exact");
});

test("Yoruba with tone marks: exact when faithful, flagged when stripped", () => {
  assert.equal(status("> “Bí ọmọdé bá mọ ọwọ́ wẹ̀, á bá àgbà jẹun.”"), "exact");
  assert.equal(status("> “Bi omode ba mo owo we, a ba agba jeun.”"), "near");
});

test("Yoruba in decomposed Unicode (NFD) still matches the source", () => {
  assert.equal(status("> “" + "Ẹ̀kọ́ ni ọ̀nà sí ọrọ̀".normalize("NFD") + "”"), "exact");
});

test("Nigerian Pidgin quotation is matched", () => {
  assert.equal(status("> “Wetin we dey find na better life for everybody.”"), "exact");
});

test("quotation with an ellipsis: both parts must appear in order", () => {
  const r = C.analyse("> “Our reforms did not create the weaknesses in our economy ... Inflation fell from 34 percent to 18 percent.”", SRC, "");
  assert.equal(r.quotations[0].status, "exact");
  assert.match(r.quotations[0].note, /omissions/);
});

test("quotation with parts in the wrong order is not exact", () => {
  assert.notEqual(status("> “They confronted them ... Our reforms did not create the weaknesses in our economy.”"), "exact");
});

test("editorial square brackets are tolerated", () => {
  assert.equal(status("> “[T]hey sat on the warrant chief until he fled.”").replace("near", "exact"), "exact");
});

test("quotation inside a markdown table cell is checked", () => {
  const r = C.analyse("| Claim | Evidence |\n|---|---|\n| Tax refusal | “The market women refused to pay the tax.” |", SRC, "");
  assert.equal(r.quotations.length, 1);
  assert.equal(r.quotations[0].status, "exact");
  assert.equal(r.quotations[0].doc, "DOC-02");
});

test("nested quotation marks do not break extraction", () => {
  const r = C.analyse("> “She said \"we shall overcome\" and the crowd answered.”", SRC, "");
  assert.ok(r.quotations.some((q) => q.status === "exact"));
});

test("bold or italic markdown around a quotation is ignored", () => {
  assert.equal(status("> **“It was not a riot. It was a war, Ogu Umunwanyi.”**"), "exact");
  assert.equal(status("> *“It was not a riot. It was a war, Ogu Umunwanyi.”*"), "exact");
});

test("a multi-line blockquote is treated as one quotation", () => {
  const r = C.analyse("> “The market women refused to pay the tax.\n> They sat on the warrant chief until he fled.”", SRC, "");
  assert.equal(r.quotations.length, 1);
  assert.equal(r.quotations[0].status, "exact");
});

test("short quoted terms are tracked separately from quotations", () => {
  const r = C.analyse("It uses “siren song” and “warrant chief”.", SRC, "");
  assert.equal(r.quotations.length, 0);
  assert.equal(r.terms.find((t) => t.text === "warrant chief").status, "exact");
  assert.equal(r.terms.find((t) => t.text === "siren song").status, "missing");
});

test("scare-quoted analytical labels do not count as failed quotations", () => {
  const r = C.analyse("This is a kind of “legitimation” through “authorisation”.", SRC, "");
  assert.equal(r.missing, 0);
});

test("the same quotation repeated is counted once", () => {
  const r = C.analyse("> “We chose to excise the cancer.”\n\nAgain: “We chose to excise the cancer.”", SRC, "");
  assert.equal(r.quotations.length, 1);
});

test("cited documents and pages that are not loaded are flagged", () => {
  const r = C.analyse("Source: DOC-01 and DOC-07, p. 9.", SRC, "");
  assert.deepEqual(r.missingDocs, ["DOC-07"]);
  assert.deepEqual(r.missingPages, ["9"]);
});

test("outside facts: flags numbers and names absent from source, not those present", () => {
  const r = C.analyse("In 2023 the IMF praised the reforms, according to Ngozi Okonjo-Iweala. Inflation fell to 18 percent in Nigeria.", SRC, "");
  const facts = r.outsideFacts.map((f) => f.text);
  assert.ok(facts.includes("2023"));
  assert.ok(facts.some((f) => /Okonjo/.test(f)));
  assert.ok(!facts.some((f) => /^18/.test(f)), "18 percent is in the source");
  assert.ok(!facts.includes("Nigeria"));
});

test("outside facts: ordinary sentence openers and headings are not flagged", () => {
  const r = C.analyse("## Finding 1: Prosperity\n\nHowever, the speaker continues. Therefore the reforms matter. Finding 2 follows.\n\n1. First point\n2. Second point", SRC, "");
  assert.deepEqual(r.outsideFacts.map((f) => f.text), []);
});

test("outside facts: words from the researcher's own prompt are not flagged", () => {
  const r = C.analyse("The address by Tinubu draws on Fairclough.", SRC, "Analyse the speech by President Tinubu using Fairclough");
  assert.deepEqual(r.outsideFacts.map((f) => f.text), []);
});

test("copy-paste debris is detected", () => {
  const r = C.analyse("Source: DOC-01&#x20;\n\nPasted markdown(20261125-050340).md\n", SRC, "");
  assert.ok(r.debris.some((d) => /Pasted markdown/.test(d)));
  assert.ok(r.debris.includes("&#x20;"));
});

test("no source loaded: reports it instead of guessing", () => {
  const r = C.analyse("> “Anything at all here in quotes.”", "", "");
  assert.equal(r.hasSource, false);
  assert.equal(r.quotations.length, 0);
  assert.equal(C.suggestScores(r).trace.score, null);
  assert.match(C.errorsText(r), /No source text loaded/);
});

test("empty output does not throw", () => {
  const r = C.analyse("", SRC, "");
  assert.equal(r.quotations.length, 0);
  assert.equal(typeof C.errorsText(r), "string");
});

test("non-Latin scripts do not crash the checker", () => {
  const src = "[DOC-01] الحقيقة لا تخاف من السؤال. 真理不怕提问。";
  const r = C.analyse("> “الحقيقة لا تخاف من السؤال”", src, "");
  assert.equal(r.quotations[0].status, "exact");
});

test("large inputs finish quickly", () => {
  const big = "[DOC-01]\n" + Array.from({ length: 20000 }, (_, i) => "word" + (i % 977) + " alpha beta gamma delta").join(" ");
  const out = Array.from({ length: 60 }, (_, i) => "> “word" + i + " alpha beta gamma delta word" + (i + 1) + " alpha beta changed delta”").join("\n\n");
  const t0 = Date.now();
  const r = C.analyse(out, big, "");
  assert.ok(Date.now() - t0 < 4000, "took " + (Date.now() - t0) + " ms");
  assert.equal(r.quotations.length, 60);
});

test("suggested scores: perfect quotations give 5, invented ones lower it", () => {
  const good = C.analyse("> “We chose to excise the cancer.”\n\n> “They confronted them. Inflation fell from 34 percent to 18 percent.”", SRC, "");
  assert.equal(C.suggestScores(good).trace.score, 5);
  const bad = C.analyse("> “We chose to excise the cancer.”\n\n> “A wholly invented sentence that appears nowhere at all.”", SRC, "");
  assert.ok(C.suggestScores(bad).trace.score <= 3);
});

test("suggested scores never exceed 4 for plurality and calibration, and leave judgement criteria empty", () => {
  const out = "## Finding 1\n**Interpretation:** x\n**Alternative interpretation:** y\n## Limitations\nThis cannot be determined. It is uncertain. Not verified. Unknown reception. Insufficient evidence.";
  const s = C.suggestScores(C.analyse(out, SRC, ""));
  assert.ok(s.plural.score <= 4);
  assert.ok(s.calib.score <= 4);
  for (const k of ["accuracy", "fidelity", "misrep"]) assert.equal(s[k].score, null);
});

const CRIT = [{ id: "accuracy", label: "Factual accuracy" }, { id: "fidelity", label: "Contextual fidelity" }, { id: "trace", label: "Evidence traceability" }];

test("evaluator reply: parses JSON inside code fences with surrounding chatter and a trailing comma", () => {
  const ev = C.parseEvaluatorReply('Sure! Here is my evaluation:\n```json\n{"evaluator_model":"X","scores":{"accuracy":{"score":3,"reason":"r"},"Contextual fidelity":{"score":"2","reason":"c"},"trace":{"score":null,"reason":"n"}},"errors":[{"type":"misquotation","excerpt":"e","explanation":"x"}],"adopted_prompt_framing":true,}\n```\nHope that helps.', CRIT);
  assert.equal(ev.ok, true);
  assert.equal(ev.scores.accuracy.score, 3);
  assert.equal(ev.scores.fidelity.score, 2);
  assert.equal(ev.scores.trace.score, null);
  assert.equal(ev.framing, true);
  assert.equal(ev.errors.length, 1);
});

test("evaluator reply: out-of-range scores are dropped, bare numbers accepted", () => {
  const ev = C.parseEvaluatorReply('{"scores":{"accuracy":9,"fidelity":4}}', CRIT);
  assert.equal(ev.scores.accuracy.score, null);
  assert.equal(ev.scores.fidelity.score, 4);
});

test("evaluator reply: rubbish is rejected with a message, never thrown", () => {
  for (const bad of ["", "no json here", "{broken", '{"scores":{}}', '{"scores":{"unknown":3}}', "[1,2,3]"]) {
    const ev = C.parseEvaluatorReply(bad, CRIT);
    assert.equal(ev.ok, false);
    assert.equal(typeof ev.error, "string");
  }
});

test("evaluator reply: hostile content is treated as plain text", () => {
  const ev = C.parseEvaluatorReply('{"scores":{"accuracy":{"score":4,"reason":"<img src=x onerror=alert(1)>"}},"errors":[{"type":{"a":1},"excerpt":["x"],"explanation":null}]}', CRIT);
  assert.equal(ev.ok, true);
  assert.equal(typeof ev.scores.accuracy.reason, "string");
  assert.equal(typeof ev.errors[0].type, "string");
});

test("evaluator prompt contains the criteria, the output and the source, clearly delimited", () => {
  const p = C.evaluatorPrompt({ prompt: "P", source: "S", output: "O", criteria: [{ id: "accuracy", label: "Factual accuracy", help: "h", rubric: ["a", "b", "c"] }] });
  for (const part of ["<<<BEGIN ANALYSIS>>>", "<<<BEGIN SOURCE>>>", "<<<BEGIN PROMPT>>>", '"accuracy"', "RETURN ONLY this JSON"]) assert.ok(p.includes(part), part);
});

test("a misquotation that also drops diacritics is reported as differing wording, with the source shown", () => {
  const r = C.analyse("> “The elders say: Onye ajuju anaghi efu uzo always.”", SRC, "");
  assert.equal(r.quotations[0].status, "near");
  assert.match(r.quotations[0].note, /diacritics/);
  assert.match(r.quotations[0].source, /ajụjụ/);
});

test("quotations in right-to-left scripts are checked like any other", () => {
  const src = "[DOC-01] قال الشيخ في خطبته إن العلم نور والجهل ظلام، وإن الأمة تنهض بالمعرفة والعمل الصالح.\n[DOC-02] שלום עליכם וברוכים הבאים לכנס השנתי של החוקרים";
  const out = "\"العلم نور والجهل ظلام\" [DOC-01]. \"الأمة تنهض بالمال والعمل الصالح\" [DOC-01]. \"וברוכים הבאים לכנס השנתי\" [DOC-02].";
  const st = C.analyse(out, src).quotations.map((q) => q.status);
  assert.deepEqual(st, ["exact", "near", "exact"]);
});
