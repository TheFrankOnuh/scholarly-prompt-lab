// Checks the SPL Research Session Protocol, the record format, and the rule that the original conversation is the record of truth.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
global.self = global.self || {};
require(path.join(root, "protocol.js"));
const P = global.self.LAB_PROTOCOL;
const S = "SPL-S-20261127-7F3K";
const CHECKPOINT = read("schemas/examples/checkpoint-transfer.txt");
const TRANSCRIPT = read("schemas/examples/transcript.txt");

test("session identifiers are made by the Lab in one fixed form", () => {
  const id = P.newSessionId(new Date(2026, 10, 27), () => 0.99);
  assert.match(id, /^SPL-S-20261127-[A-Z2-9]{4}$/);
  assert.ok(P.isSessionId(id) && P.isSessionId(S));
  assert.ok(!P.isSessionId("SPL-S-2026-ABCD") && !P.isSessionId(""));
});

test("the core protocol names its version and session, and asks for nothing secret", () => {
  const t = P.coreProtocol({ session: S });
  assert.match(t, /^SPL RESEARCH SESSION PROTOCOL · version 0\.2 · session SPL-S-20261127-7F3K\n/);
  assert.match(t, /Never ask for passwords, keys, tokens or private system instructions/);
  assert.match(t, /Never invent quotations, source identifiers, dates, model details/);
  assert.match(t, /About every 10 substantive researcher messages/);
  assert.match(t, /SPL Research Session — Initial Record/);
  const n = (t.match(/^\d+\. /gm) || []).map((x) => parseInt(x, 10));
  assert.deepEqual(n, n.map((_, i) => i + 1), "rules are numbered in order");
});

test("reminders and the initial record can be switched off, and the rules renumber", () => {
  const t = P.coreProtocol({ session: S, reminders: "off", initialRecord: false });
  assert.ok(!/About every/.test(t) && !/Initial Record/.test(t));
  assert.match(t, /Do not add reminders about documentation/);
  assert.match(t, /\n8\. Never ask for passwords/);
  assert.match(P.coreProtocol({ session: S, reminders: "5" }), /About every 5 substantive/);
});

test("the protocol sits above the research prompt and leaves the prompt itself unchanged", () => {
  const prompt = "RESEARCH QUESTION: x\n\nOUTPUT: a table.\n\nSOURCE TEXT: ...\n<<<BEGIN SOURCE>>>\n[DOC-01] Ọ̀rọ̀\n<<<END SOURCE>>>";
  const full = P.withProtocol(prompt, { session: S });
  assert.ok(full.endsWith("\n\n" + P.PROMPT_DIVIDER + "\n\n" + prompt));
  assert.ok(full.startsWith(P.coreProtocol({ session: S })));
});

test("every command is self-contained: it names itself, the protocol version and the session", () => {
  assert.equal(P.COMMANDS.length, 7);
  for (const c of P.COMMANDS) {
    const t = P.commandText(c.id, S);
    assert.ok(t.startsWith("SPL: " + c.name + " · protocol 0.2 · session " + S + "\n"), c.id);
    assert.ok(P.isCommand(t), c.id + " is recognised as a command");
  }
  for (const id of ["checkpoint", "end"]) {
    const t = P.commandText(id, S);
    assert.match(t, /verbatim/); assert.match(t, /SPL-HEADER/); assert.match(t, /<<<SPL-GAP after=6/); assert.match(t, /do not reconstruct it/);
    assert.match(t, new RegExp('"session": "' + S + '"'));
  }
  assert.match(P.commandText("end", S), /SPL Research Session — Final Record/);
  assert.match(P.commandText("start", S), /established so far in this conversation/);
});

test("a checkpoint is read: turns, roles, administrative turns, declared gaps and notes", () => {
  const r = P.parseTransfer(CHECKPOINT, S);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.header.session, S);
  assert.deepEqual(r.turns.map((t) => t.n), [1, 2, 3, 4, 5, 6, 7, 8, 10]);
  assert.deepEqual(r.turns.map((t) => t.role).join(","), "researcher,ai,researcher,ai,researcher,ai,researcher,ai,ai");
  assert.equal(r.turns[2].kind, "administrative");
  assert.equal(r.turns[3].kind, "administrative");
  assert.equal(r.gaps.length, 1);
  assert.deepEqual([r.gaps[0].after, r.gaps[0].missing, r.gaps[0].reported_by], [8, "researcher_prompt", "ai"]);
  assert.match(r.notes, /CL-001 qualified/);
});

test("a cut-off record, a broken header, a repeated turn and a numbering jump are each reported", () => {
  const cut = "SPL-HEADER\n{\"format\":\"spl-rsr-transfer/0.1\",\"session\":\"" + S + "\"}\n<<<SPL-TURN 1 role=researcher>>>\nQ\n<<<SPL-END 1>>>\n<<<SPL-TURN 2 role=ai>>>\nThe answer was cut o";
  const a = P.parseTransfer(cut, S);
  assert.equal(a.turns.length, 1);
  assert.ok(a.errors.some((e) => /Turn 2 starts but has no end marker/.test(e)));
  const broken = P.parseTransfer("SPL-HEADER\n{\"format\": \"spl-rsr-transfer/0.1\", oops}\n<<<SPL-TURN 1 role=researcher>>>\nQ\n<<<SPL-END 1>>>", S);
  assert.ok(broken.errors.some((e) => /not valid JSON/.test(e)));
  assert.equal(broken.turns.length, 1, "the turns are still read");
  const twice = P.parseTransfer("SPL-HEADER\n{}\n<<<SPL-TURN 1 role=researcher>>>\nA\n<<<SPL-END 1>>>\n<<<SPL-TURN 1 role=researcher>>>\nB\n<<<SPL-END 1>>>\n<<<SPL-TURN 4 role=ai>>>\nC\n<<<SPL-END 4>>>");
  assert.ok(twice.warnings.some((w) => /appears twice/.test(w)));
  assert.equal(twice.turns[0].text, "A");
  assert.ok(twice.gaps.some((g) => g.reported_by === "lab_alignment" && g.after === 1));
  const other = P.parseTransfer("SPL-HEADER\n{\"format\":\"spl-rsr-transfer/0.1\",\"session\":\"SPL-S-20200101-AAAA\"}\n<<<SPL-TURN 1 role=researcher>>>\nQ\n<<<SPL-END 1>>>", S);
  assert.ok(other.warnings.some((w) => /not SPL-S-20261127-7F3K/.test(w)));
  assert.ok(P.parseTransfer("Just a chat", S).errors.some((e) => /no SPL-HEADER/.test(e)));
});

test("a transcript is split into turns from common speaker labels, and unlabelled text stays one turn", () => {
  const t = P.parseTranscript(TRANSCRIPT);
  assert.equal(t.turns.length, 10);
  assert.equal(t.turns.map((x) => x.role).join(","), Array(5).fill("researcher,ai").join(","));
  assert.match(t.turns[4].text, /^In 1848, did "men"/);
  const inline = P.parseTranscript("User: What is X?\nAssistant: X is Y.\nIt has two lines.\nUser: Why?");
  assert.deepEqual(inline.turns, [{ role: "researcher", text: "What is X?" }, { role: "ai", text: "X is Y.\nIt has two lines." }, { role: "researcher", text: "Why?" }]);
  const md = P.parseTranscript("## You\n\nQ one\n\n## Claude\n\nA one");
  assert.deepEqual(md.turns.map((x) => x.role), ["researcher", "ai"]);
  const none = P.parseTranscript("Some notes\nwith no labels");
  assert.equal(none.turns.length, 1);
  assert.ok(none.warnings.length);
});

test("SPL commands and the AI system's replies to them are administrative", () => {
  const turns = P.markAdministrative([{ role: "researcher", text: "Q" }, { role: "ai", text: "A" }, { role: "researcher", text: "SPL: CONFIRM RESEARCH METADATA · protocol 0.1" }, { role: "ai", text: "Recorded." }, { role: "researcher", text: "Next" }, { role: "ai", text: "Answer" }]);
  assert.deepEqual(turns.map((t) => t.kind), ["substantive", "substantive", "administrative", "administrative", "substantive", "substantive"]);
  const mine = P.markAdministrative([{ role: "researcher", text: "SPL: X", kind: "substantive" }]);
  assert.equal(mine[0].kind, "substantive", "a kind already chosen is never overridden");
});

function checkpointThenTranscript() {
  const conv = P.newConversation({ sessionId: S, prompt: "RESEARCH QUESTION: How does the Declaration of Sentiments (1848) rework the language of the Declaration of Independence (1776)?" });
  const r = P.parseTransfer(CHECKPOINT, S);
  const m1 = P.mergeImport(conv, { turns: r.turns, gaps: r.gaps, original: false, origin: "ai_reported", artefact: "AR-1", metadata: P.assertionsFromHeader(r.header.metadata, "t", "AR-1") });
  const t = P.parseTranscript(TRANSCRIPT);
  const m2 = P.mergeImport(conv, { turns: P.markAdministrative(t.turns), original: true, origin: "researcher_reported", artefact: "AR-2" });
  return { conv, m1, m2 };
}

test("an AI record alone is labelled as AI-reproduced, and its coverage is never complete on its word", () => {
  const conv = P.newConversation({ sessionId: S });
  const r = P.parseTransfer(CHECKPOINT, S);
  P.mergeImport(conv, { turns: r.turns, gaps: r.gaps, original: false, artefact: "AR-1" });
  assert.equal(conv.turns.length, 9);
  assert.ok(conv.turns.every((t) => t.text_status === "ai_reproduced"));
  assert.equal(P.coverage(conv).status, "partial", "a declared gap makes it partial");
  conv.gaps.forEach((g) => (g.resolved = true));
  assert.deepEqual([P.coverage(conv).status, P.coverage(conv).basis], ["unknown", "ai_reported"]);
});

test("the original transcript wins: its wording is kept, and the AI's differing wording is recorded", () => {
  const { conv, m2 } = checkpointThenTranscript();
  assert.equal(conv.turns.length, 10, "the transcript adds the turn the AI could no longer see");
  assert.ok(conv.turns.every((t) => t.text_status === "original"));
  const t7 = conv.turns.find((t) => t.turn_id === "T007");
  assert.match(t7.text, /elective franchise/);
  const d = conv.discrepancies.find((x) => x.turn_id === "T007");
  assert.equal(d.status, "ai_differs");
  assert.match(d.text, /right to vote/, "the AI's wording is kept as evidence");
  assert.ok(!conv.discrepancies.some((x) => x.status === "ai_omitted"), "a gap the AI declared is a gap, not an omission");
  assert.ok(conv.gaps.every((g) => g.resolved), "the transcript fills the declared gap");
  assert.equal(m2.summary.differs, 1);
  assert.equal(conv.turns[0].provenance.verification, "compared_with_original");
  assert.ok(conv.turns[0].matchesCopiedPrompt, "the first message matches the prompt copied from the Lab");
});

test("completeness needs the researcher's confirmation, and never coexists with an open gap", () => {
  const { conv } = checkpointThenTranscript();
  assert.equal(P.coverage(conv).status, "unknown");
  conv.completeConfirmed = true;
  assert.deepEqual([P.coverage(conv).status, P.coverage(conv).basis], ["complete", "compared_with_original"]);
  conv.gaps.push({ after_turn: "T002", missing: "ai_response", reason: "", reported_by: "researcher", resolved: false });
  assert.equal(P.coverage(conv).status, "partial");
  assert.equal(P.coverage(conv).responses_missing, 1);
});

test("an AI record checked against an original: omitted turns are recorded and extra turns are not added", () => {
  const conv = P.newConversation({});
  const orig = [["researcher", "Q1"], ["ai", "A1 about the franchise"], ["researcher", "Q2 keep to the excerpts"], ["ai", "A2 understood"], ["researcher", "Q3 summarise"], ["ai", "A3 summary"]];
  P.mergeImport(conv, { turns: orig.map(([role, text]) => ({ role, text })), original: true, artefact: "T" });
  const ai = [["researcher", "Q1"], ["ai", "A1 about the franchise"], ["ai", "An answer nobody gave"], ["researcher", "Q3 summarise"], ["ai", "A3 summary"]];
  const m = P.mergeImport(conv, { turns: ai.map(([role, text], i) => ({ role, text, n: i + 1 })), original: false, artefact: "R" });
  assert.equal(conv.turns.length, 6, "nothing only the AI record contains is added");
  assert.ok(conv.turns.every((t) => t.text_status === "original"));
  const kinds = m.discrepancies.map((d) => d.status).sort();
  assert.deepEqual(kinds, ["ai_omitted", "ai_omitted", "ai_only"]);
  assert.equal(m.discrepancies.find((d) => d.status === "ai_only").text, "An answer nobody gave");
});

test("sequential checkpoints assemble one conversation without duplicating turns", () => {
  const conv = P.newConversation({ sessionId: S });
  const turns = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? "ai" : "researcher", text: (i % 2 ? "Answer " : "Question ") + (i + 1), n: i + 1 }));
  P.mergeImport(conv, { turns: turns(4), original: false, artefact: "C1" });
  const m = P.mergeImport(conv, { turns: turns(8), original: false, artefact: "C2" });
  assert.equal(conv.turns.length, 8);
  assert.equal(m.added, 4);
  assert.equal(m.summary.identical, 4);
  assert.deepEqual(conv.turns.map((t) => t.turn_id), ["T001", "T002", "T003", "T004", "T005", "T006", "T007", "T008"]);
  assert.deepEqual(conv.turns[0].attested_by, ["C1", "C2"]);
  assert.equal(conv.discrepancies.length, 0);
});

test("text survives reading, merging, the canonical record and JSON exactly, in any script", () => {
  const texts = [
    "Ọ̀rọ̀ àti ìtàn: \"quoted\" and ‘curly’ — with an en dash – and tabs\tinside",
    "العربية: «النص» مع أرقام ١٢٣ and English mixed",
    "עברית עם \"מירכאות\" ו־מקף",
    "```js\nconst x = \"<script>alert(1)</script>\";\n```\n| a | b |\n|---|---|\n| 1 | 2 |",
    "Line one\n\n\n  indented line\nlast line with trailing spaces   "
  ];
  const rec = "SPL-HEADER\n{\"format\":\"spl-rsr-transfer/0.1\",\"session\":\"" + S + "\"}\n" + texts.map((t, i) => "<<<SPL-TURN " + (i + 1) + " role=" + (i % 2 ? "ai" : "researcher") + ">>>\n" + t + "\n<<<SPL-END " + (i + 1) + ">>>").join("\n");
  const r = P.parseTransfer(rec, S);
  assert.deepEqual(r.turns.map((t) => t.text), texts);
  const conv = P.newConversation({ sessionId: S });
  P.mergeImport(conv, { turns: r.turns, original: false, artefact: "A" });
  const back = JSON.parse(JSON.stringify(P.buildRecord(conv)));
  assert.deepEqual(back.turns.map((t) => t.text), texts);
  const md = P.toMarkdown(conv);
  assert.ok(md.includes("````text\n" + texts[3] + "\n````"), "a turn that contains a code fence gets a longer fence");
});

test("the canonical record validates, and the rules on completeness are enforced", () => {
  const { conv } = checkpointThenTranscript();
  conv.completeConfirmed = true;
  const rec = P.buildRecord(conv, { labVersion: "1.7.0" });
  assert.deepEqual(P.validateRecord(rec), []);
  assert.equal(rec.counts.researcher_prompts, 4);
  assert.equal(rec.counts.ai_responses, 4);
  assert.equal(rec.counts.administrative, 2);
  assert.equal(rec.metadata.model_name.assertions[0].provenance.origin, "ai_reported");
  assert.equal(rec.metadata.session_id.assertions[0].provenance.origin, "system_recorded");
  const bad = JSON.parse(JSON.stringify(rec));
  bad.gaps.push({ after_turn: "T001", missing: "ai_response", resolved: false });
  assert.ok(P.validateRecord(bad).some((e) => /cannot be complete while a gap/.test(e)));
  const bad2 = JSON.parse(JSON.stringify(rec)); bad2.coverage.basis = "ai_reported";
  assert.ok(P.validateRecord(bad2).some((e) => /AI system's word alone/.test(e)));
  const bad3 = JSON.parse(JSON.stringify(rec)); bad3.turns[0].role = "assistant"; bad3.turns[1].turn_id = bad3.turns[0].turn_id;
  const e3 = P.validateRecord(bad3);
  assert.ok(e3.some((e) => /role/.test(e)) && e3.some((e) => /duplicate turn_id/.test(e)));
  assert.ok(P.validateRecord(null).length && P.validateRecord([]).length);
});

test("the JSON Schema and the built-in validator agree on every vocabulary", () => {
  const sc = JSON.parse(read("schemas/spl-research-session-record.schema.json"));
  const d = sc.$defs;
  assert.equal(sc.properties.format.const, P.RECORD_FORMAT);
  assert.deepEqual(d.provenance.properties.origin.enum.sort(), Object.keys(P.ORIGINS).sort());
  assert.deepEqual(d.provenance.properties.verification.enum.sort(), Object.keys(P.VERIFICATIONS).sort());
  assert.deepEqual(d.assertion.properties.status.enum.sort(), Object.keys(P.STATUSES).sort());
  assert.deepEqual(d.turn.properties.text_status.enum.sort(), Object.keys(P.TEXT_STATUSES).sort());
  assert.deepEqual(sc.properties.discrepancies.items.properties.status.enum.sort(), Object.keys(P.DISCREPANCY_LABELS).sort());
  for (const k of sc.required) assert.ok(k in P.buildRecord(P.newConversation({})), "the record always has " + k);
});

test("what an AI system says about itself is stored as AI-reported and unreviewed, whatever basis it claims", () => {
  const a = P.assertionsFromHeader({ model_name: { value: "X", origin: "supplied by researcher" }, model_version: { value: "not exposed by provider" }, temperature: "unknown", made_up_field: { value: 1 } }, "t", "AR");
  assert.equal(a.model_name.provenance.origin, "ai_reported");
  assert.equal(a.model_name.provenance.verification, "unreviewed");
  assert.equal(a.model_name.status, "confirmation_required");
  assert.match(a.model_name.reason, /supplied by researcher/);
  assert.equal(a.model_version.status, "not_exposed");
  assert.equal(a.temperature.status, "unknown");
  assert.ok(!("made_up_field" in a));
  const meta = { model_name: { assertions: [a.model_name] } };
  assert.ok(P.outstandingFields(meta).some((f) => f.id === "model_name"), "an unconfirmed AI report is still outstanding");
  meta.model_name.assertions[0].provenance.verification = "researcher_confirmed";
  assert.ok(!P.outstandingFields(meta).some((f) => f.id === "model_name"));
  assert.ok(P.fieldDone({ assertions: [{ status: "not_exposed", provenance: { origin: "researcher_reported" } }] }), "not exposed by provider is complete documentation");
});

test("a repeated checkpoint does not repeat metadata that says nothing new", () => {
  const conv = P.newConversation({});
  const r = P.parseTransfer(CHECKPOINT, S);
  P.mergeImport(conv, { turns: r.turns, original: false, metadata: P.assertionsFromHeader(r.header.metadata, "t1") });
  P.mergeImport(conv, { turns: r.turns, original: false, metadata: P.assertionsFromHeader(r.header.metadata, "t2") });
  assert.equal(conv.metadata.model_name.assertions.length, 1);
});

test("exports: spreadsheets cannot read text as a formula, and the prompt history holds prompts only", () => {
  const conv = P.newConversation({ sessionId: S });
  P.addTurn(conv, { role: "researcher", text: "=HYPERLINK(\"x\")" });
  P.addTurn(conv, { role: "ai", text: "answer, with a comma" });
  const csv = P.toCsv(conv, [{ id: "accuracy" }]);
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"x\"\")\""));
  const prompts = P.toCsv(conv, [], { promptsOnly: true });
  assert.ok(!prompts.includes("answer, with a comma"));
  assert.ok(!P.toMarkdown(conv, { promptsOnly: true }).includes("answer, with a comma"));
});

test("word differences rebuild both texts exactly", () => {
  const a = "lists grievances about the elective franchise. Does it change", b = "lists grievances about the right to vote. Does it change";
  const d = P.diffWords(a, b);
  assert.equal(d.filter((x) => x.t !== "ins").map((x) => x.s).join(""), a);
  assert.equal(d.filter((x) => x.t !== "del").map((x) => x.s).join(""), b);
  const big = "word ".repeat(3000);
  const d2 = P.diffWords(big, big + "end");
  assert.equal(d2.filter((x) => x.t !== "del").map((x) => x.s).join(""), big + "end");
});

test("the documentation states the protocol exactly as the code gives it", () => {
  execFileSync(process.execPath, [path.join(root, "tools", "protocol-docs.mjs"), "--check"], { stdio: "pipe" });
  const spec = read("docs/research-session-protocol.md");
  assert.ok(spec.includes(P.coreProtocol({ session: S })));
  for (const f of ["research-session-commands.md", "research-metadata.md", "conversational-research.md", "follow-up-taxonomy.md", "conversational-evaluation.md", "claim-history.md"])
    assert.ok(fs.existsSync(path.join(root, "docs", f)), f);
});

test("the page loads the protocol before the app, and the conversations after projects", () => {
  const html = read("index.html");
  const order = [...html.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1]);
  assert.ok(order.indexOf("protocol.js") !== -1 && order.indexOf("protocol.js") < order.indexOf("app.js"));
  assert.ok(order.indexOf("conversations.js") > order.indexOf("projects.js"));
  assert.ok(order.indexOf("conversations.js") > order.indexOf("report.js"));
  const conv = read("conversations.js");
  assert.ok(!/innerHTML/.test(conv), "imported conversation text is never written into the page as HTML");
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(conv + read("protocol.js")), "conversations never leave the device");
});
