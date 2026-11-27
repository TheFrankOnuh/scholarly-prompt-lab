// Checks the conversational research functions added in 1.8.0: branches, provider exports, records within records, gaps filled by
// later records, metadata conflicts and their resolution, Claim History, follow-up design, redaction, comparison and the teaching case.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
global.self = global.self || {};
require(path.join(root, "protocol.js"));
require(path.join(root, "teaching-uc003.js"));
const P = global.self.LAB_PROTOCOL;
const S = "SPL-S-20261127-7F3K";
const turns = (spec) => spec.map(([role, text], i) => ({ role, text, n: i + 1 }));

/* ---------- reading records ---------- */
test("example markers inside a reproduced checkpoint command are kept as text, not read as structure", () => {
  const cmd = P.commandText("checkpoint", S);
  assert.match(cmd, /<<<SPL-GAP after=6/);
  const rec = "SPL-HEADER\n{\"format\":\"spl-rsr-transfer/0.2\",\"session\":\"" + S + "\"}\n" +
    "<<<SPL-TURN 1 role=researcher>>>\nQ\n<<<SPL-END 1>>>\n<<<SPL-TURN 2 role=ai>>>\nA\n<<<SPL-END 2>>>\n" +
    "<<<SPL-TURN 3 role=researcher kind=admin>>>\n" + cmd + "\n<<<SPL-END 3>>>\nSPL-NOTES\nnone";
  const r = P.parseTransfer(rec, S);
  assert.deepEqual(r.errors, []);
  assert.equal(r.turns.length, 3);
  assert.equal(r.turns[2].text, cmd, "the command is reproduced exactly, example markers included");
  assert.equal(r.gaps.length, 0, "the example GAP block in the command is not a gap");
  assert.equal(r.headers.length, 1, "the SPL-HEADER named in the command is not a header");
});

test("a completed record that reproduces an earlier checkpoint inside a turn is read correctly", () => {
  const inner = "SPL-HEADER\n{\"format\":\"spl-rsr-transfer/0.2\",\"session\":\"" + S + "\",\"record_type\":\"checkpoint\",\"gaps\":[{\"after_turn\":1,\"missing\":\"ai_response\",\"reason\":\"inner\"}]}\n<<<SPL-TURN 1 role=researcher>>>\nQ\n<<<SPL-END 1>>>\n<<<SPL-GAP after=1 missing=ai_response>>>\ninner gap\n<<<SPL-END GAP>>>";
  const rec = "SPL-HEADER\n{\"format\":\"spl-rsr-transfer/0.2\",\"session\":\"" + S + "\",\"record_type\":\"completed_session\"}\n" +
    "<<<SPL-TURN 1 role=researcher>>>\nQ\n<<<SPL-END 1>>>\n<<<SPL-TURN 2 role=ai>>>\n" + inner + "\n<<<SPL-END 2>>>\n<<<SPL-TURN 3 role=researcher>>>\nDone\n<<<SPL-END 3>>>";
  const r = P.parseTransfer(rec, S);
  assert.deepEqual(r.turns.map((t) => t.n), [1, 2, 3]);
  assert.equal(r.turns[1].text, inner);
  assert.equal(r.header.record_type, "completed_session");
  assert.equal(r.headers.length, 1);
  assert.equal(r.gaps.length, 0, "gaps inside the reproduced checkpoint are not this record's gaps");
});

test("a record in several parts: each part's header is read, and a missing part is reported", () => {
  const h = (part, covers) => "SPL-HEADER\n" + JSON.stringify({ format: "spl-rsr-transfer/0.2", session: S, record_type: "completed_session", part, parts_total: 3, covers }) + "\n";
  const t = (n, role) => "<<<SPL-TURN " + n + " role=" + role + ">>>\nturn " + n + "\n<<<SPL-END " + n + ">>>\n";
  const rec = h(1, [1, 2]) + t(1, "researcher") + t(2, "ai") + "Continue with: SPL: END RESEARCH SESSION part 2\n" + h(3, [5, 6]) + t(5, "researcher") + t(6, "ai");
  const r = P.parseTransfer(rec, S);
  assert.deepEqual(r.parts.map((p) => p.part), [1, 3]);
  assert.ok(r.warnings.some((w) => /Part 2 of 3 is not included/.test(w)));
  assert.ok(r.gaps.some((g) => g.reported_by === "lab_alignment"), "turns 3 and 4 are missing until part 2 arrives");
  const conv = P.newConversation({ sessionId: S });
  const m1 = P.mergeImport(conv, { turns: r.turns, gaps: r.gaps, original: false, artefact: "P13" });
  assert.equal(m1.added, 4);
  const p2 = P.parseTransfer(h(2, [3, 4]) + t(3, "researcher") + t(4, "ai"), S);
  // a later part on its own: its turns are placed by alignment with their neighbours when the full record arrives
  const all = P.parseTransfer(h(1, [1, 6]) + [1, 2, 3, 4, 5, 6].map((n) => t(n, n % 2 ? "researcher" : "ai")).join(""), S);
  P.mergeImport(conv, { turns: all.turns, gaps: all.gaps, original: false, artefact: "FULL" });
  assert.equal(P.activePath(conv).length, 6);
  assert.ok(conv.gaps.every((g) => g.resolved), "the gap is filled by the later record");
  assert.ok(p2.turns.length === 2);
});

test("turn attributes: exact=no marks a reconstruction, purpose= arrives as a suggestion, model= records a model change", () => {
  const rec = "SPL-HEADER\n{}\n<<<SPL-TURN 1 role=researcher purpose=counter_evidence,clarification,not_a_category>>>\nQ\n<<<SPL-END 1>>>\n<<<SPL-TURN 2 role=ai exact=no model=\"Model B\">>>\nA\n<<<SPL-END 2>>>";
  const r = P.parseTransfer(rec);
  assert.deepEqual(r.turns[0].purposes, ["counter_evidence", "clarification"]);
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: r.turns, original: false, artefact: "R" });
  const [t1, t2] = P.activePath(conv);
  assert.deepEqual(t1.classification.map((c) => c.status), ["suggested", "suggested"]);
  assert.equal(t2.text_status, "reconstructed");
  assert.equal(t2.model.value, "Model B");
});

test("a reworded prompt is one turn with different wording, not one missing and one added", () => {
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: turns([["researcher", "Q1"], ["ai", "A1"], ["researcher", "Give the exact quotations from both documents."], ["ai", "A2"]]), original: false, artefact: "AI" });
  const m = P.mergeImport(conv, { turns: turns([["researcher", "Q1"], ["ai", "A1"], ["researcher", "Quote the exact words in DOC-01 and DOC-02 on which your finding rests."], ["ai", "A2"]]), original: true, artefact: "ORIG" });
  assert.equal(P.activePath(conv).length, 4);
  assert.equal(m.discrepancies.length, 1);
  assert.equal(m.discrepancies[0].status, "ai_differs");
  assert.match(P.activePath(conv)[2].text, /^Quote the exact words/);
});

test("an omission the AI did not declare is recorded as an omission; one it declared is a gap", () => {
  const orig = turns([["researcher", "Q1"], ["ai", "A1"], ["researcher", "Q2"], ["ai", "A2"], ["researcher", "Q3"], ["ai", "A3"]]);
  const silent = P.newConversation({});
  P.mergeImport(silent, { turns: [orig[0], orig[1], orig[3], orig[4], orig[5]].map((t, i) => Object.assign({}, t, { n: i + 1 })), original: false, artefact: "AI" });
  const m = P.mergeImport(silent, { turns: orig, original: true, artefact: "T" });
  assert.ok(m.discrepancies.some((d) => d.status === "ai_omitted"));
  const declared = P.newConversation({});
  P.mergeImport(declared, { turns: [orig[0], orig[1], orig[3], orig[4], orig[5]].map((t, i) => Object.assign({}, t, { n: i < 2 ? i + 1 : i + 2 })), gaps: [{ after: 2, missing: "researcher_prompt", reason: "not visible", reported_by: "ai" }], original: false, artefact: "AI" });
  const m2 = P.mergeImport(declared, { turns: orig, original: true, artefact: "T" });
  assert.ok(!m2.discrepancies.some((d) => d.status === "ai_omitted"));
  assert.ok(declared.gaps.every((g) => g.resolved));
});

test("text the researcher has corrected is never overwritten by a later record", () => {
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: turns([["researcher", "Q1 as pasted"], ["ai", "A1"]]), original: true, artefact: "T" });
  const t = P.activePath(conv)[0];
  t.corrections.push({ old: t.text, new: "Q1 as corrected", reason: "typo", at: "x" });
  t.text = "Q1 as corrected"; t.text_status = "researcher_corrected";
  const m = P.mergeImport(conv, { turns: turns([["researcher", "Q1 as pasted again, differently"], ["ai", "A1"]]), original: false, artefact: "AI" });
  assert.equal(P.activePath(conv)[0].text, "Q1 as corrected");
  assert.equal(m.discrepancies[0].status, "ai_differs");
});

/* ---------- branches ---------- */
test("regenerated responses and edited prompts are siblings; switching shows the whole continuation", () => {
  const conv = P.newConversation({});
  const q1 = P.addTurn(conv, { role: "researcher", text: "Q1" });
  const a1 = P.addTurn(conv, { role: "ai", text: "A1" });
  const q2 = P.addTurn(conv, { role: "researcher", text: "Q2" });
  P.addTurn(conv, { role: "ai", text: "A2" });
  const a1b = P.addTurn(conv, { role: "ai", text: "A1, regenerated" }, null, { siblingOf: a1.turn_id });
  assert.equal(a1b.parent_id, q1.turn_id);
  assert.equal(a1b.regenerated_from, a1.turn_id);
  assert.deepEqual(P.activePath(conv).map((t) => t.text), ["Q1", "A1, regenerated"]);
  const q2b = P.addTurn(conv, { role: "researcher", text: "Q2 after the regenerated answer" });
  assert.equal(q2b.parent_id, a1b.turn_id);
  assert.equal(P.counts(conv).branches, 2);
  assert.deepEqual(P.siblingsOf(conv, a1).map((t) => t.turn_id), [a1.turn_id, a1b.turn_id]);
  conv.activeLeaf = P.deepestLeaf(conv, a1.turn_id);
  assert.deepEqual(P.activePath(conv).map((t) => t.text), ["Q1", "A1", "Q2", "A2"]);
  const q2e = P.addTurn(conv, { role: "researcher", text: "Q2, edited" }, null, { siblingOf: q2.turn_id });
  assert.equal(q2e.edited_from, q2.turn_id);
  const rec = P.buildRecord(conv);
  assert.deepEqual(P.validateRecord(rec), []);
  assert.equal(rec.turns.filter((t) => t.on_active_path).length, P.activePath(conv).length);
  assert.ok(rec.turns.every((t) => !t.parent_id || rec.turns.some((x) => x.turn_id === t.parent_id)));
  const md = P.toMarkdown(conv);
  assert.match(md, /# Other branches/);
  assert.match(md, /Regenerated response \(other version: T002\)/);
});

test("inserting a turn between two turns keeps the path in order and leaves identifiers unchanged", () => {
  const conv = P.newConversation({});
  const a = P.addTurn(conv, { role: "researcher", text: "Q1" });
  const b = P.addTurn(conv, { role: "ai", text: "A1" });
  const c = P.addTurn(conv, { role: "ai", text: "A2" });
  const ins = P.addTurn(conv, { role: "researcher", text: "Q2, restored" }, null, { after: b.turn_id });
  assert.deepEqual(P.activePath(conv).map((t) => t.turn_id), [a.turn_id, b.turn_id, ins.turn_id, c.turn_id]);
  assert.equal(ins.turn_id, "T004");
});

test("the validator rejects a parent that does not exist and a loop of parents", () => {
  const conv = P.newConversation({});
  P.addTurn(conv, { role: "researcher", text: "Q" }); P.addTurn(conv, { role: "ai", text: "A" });
  const rec = P.buildRecord(conv);
  const bad = JSON.parse(JSON.stringify(rec)); bad.turns[0].parent_id = "T999";
  assert.ok(P.validateRecord(bad).some((e) => /names a turn that is not in the record/.test(e)));
  const loop = JSON.parse(JSON.stringify(rec)); loop.turns[0].parent_id = loop.turns[1].turn_id;
  assert.ok(P.validateRecord(loop).some((e) => /loop of parents/.test(e)));
});

/* ---------- provider exports ---------- */
const now = 1764237600;
const chatgpt = { title: "Causeways", create_time: now, update_time: now + 60, conversation_id: "c-1", current_node: "a2",
  mapping: { root: { id: "root", message: null, parent: null, children: ["sys"] },
    sys: { id: "sys", message: { author: { role: "system" }, content: { content_type: "text", parts: [""] }, metadata: { is_visually_hidden_from_conversation: true } }, parent: "root", children: ["u1"] },
    u1: { id: "u1", message: { author: { role: "user" }, create_time: now + 1, content: { content_type: "text", parts: ["Q1"] }, metadata: {} }, parent: "sys", children: ["a1", "a1b"] },
    a1: { id: "a1", message: { author: { role: "assistant" }, create_time: now + 2, content: { content_type: "text", parts: ["A1"] }, metadata: { model_slug: "m-1" } }, parent: "u1", children: ["u2"] },
    a1b: { id: "a1b", message: { author: { role: "assistant" }, create_time: now + 3, content: { content_type: "text", parts: ["A1 again"] }, metadata: { model_slug: "m-1" } }, parent: "u1", children: [] },
    u2: { id: "u2", message: { author: { role: "user" }, create_time: now + 4, content: { content_type: "multimodal_text", parts: [{ content_type: "image_asset_pointer" }, "Q2"] }, metadata: {} }, parent: "a1", children: ["tool"] },
    tool: { id: "tool", message: { author: { role: "tool" }, create_time: now + 5, content: { content_type: "text", parts: ["search results"] }, metadata: {} }, parent: "u2", children: ["a2"] },
    a2: { id: "a2", message: { author: { role: "assistant" }, create_time: now + 6, content: { content_type: "text", parts: ["A2"] }, metadata: { model_slug: "m-2" } }, parent: "tool", children: [] } } };

test("a ChatGPT data export: the current path, the branches, the times and the model of each message are kept", () => {
  const ex = P.readProviderExport([chatgpt]);
  assert.equal(ex.conversations.length, 1);
  const pc = ex.conversations[0];
  assert.equal(pc.provider, "ChatGPT data export");
  assert.deepEqual(P.providerPath(pc).map((n) => n.text), ["Q1", "A1", "[non-text content: image_asset_pointer]\nQ2", "A2"]);
  assert.deepEqual(pc.skipped, { system: 1, tool: 1, hidden: 0, empty: 0 });
  const conv = P.newConversation({});
  const res = P.mergeProvider(conv, pc, "EXP", "2026-11-27T12:00:00.000Z");
  assert.equal(res.branchAdded, 1);
  const path = P.activePath(conv);
  assert.deepEqual(path.map((t) => t.text_status), ["original", "original", "original", "original"]);
  assert.equal(path[0].provenance.origin, "provider_recorded");
  assert.equal(path[0].timestamp, new Date((now + 1) * 1000).toISOString());
  assert.equal(path[3].model.value, "m-2");
  assert.equal(path[3].parent_id, path[2].turn_id, "the tool message is skipped and the response follows the prompt");
  const regen = conv.turns.find((t) => t.text === "A1 again");
  assert.equal(regen.parent_id, path[0].turn_id);
  assert.equal(regen.regenerated_from, path[1].turn_id);
  assert.equal(P.currentAssertion(conv.metadata.model_changes).provenance.origin, "provider_recorded");
  conv.completeConfirmed = true;
  assert.deepEqual([P.coverage(conv).status, P.coverage(conv).basis], ["complete", "provider_export"]);
});

test("a Claude data export: messages in order, with parents where the export records them", () => {
  const claude = [{ uuid: "k-1", name: "Proverbs", created_at: "2026-11-27T09:00:00Z", chat_messages: [
    { uuid: "m1", sender: "human", text: "Q1", created_at: "2026-11-27T09:00:01Z" },
    { uuid: "m2", sender: "assistant", text: "", content: [{ type: "text", text: "A1" }], created_at: "2026-11-27T09:00:02Z" },
    { uuid: "m3", sender: "human", text: "Q2", created_at: "2026-11-27T09:00:03Z" }] }];
  const pc = P.readProviderExport(claude).conversations[0];
  assert.equal(pc.provider, "Claude data export");
  assert.ok(pc.linearAssumed);
  assert.deepEqual(P.providerPath(pc).map((n) => [n.role, n.text]), [["researcher", "Q1"], ["ai", "A1"], ["researcher", "Q2"]]);
  assert.ok(P.readProviderExport({ hello: 1 }).error);
});

test("an export imported after an AI record: the provider's wording wins and the AI's differences are kept", () => {
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: turns([["researcher", "Q1"], ["ai", "A1 as the AI recalled it, in other words entirely"], ["researcher", "[non-text content: image_asset_pointer]\nQ2"], ["ai", "A2"]]), original: false, artefact: "AI" });
  P.mergeProvider(conv, P.readProviderExport([chatgpt]).conversations[0], "EXP");
  const path = P.activePath(conv);
  assert.equal(path[1].text, "A1");
  assert.ok(conv.discrepancies.some((d) => d.status === "ai_differs" && /recalled/.test(d.text)));
});

/* ---------- metadata ---------- */
test("metadata from protocol 0.1 records is read under the new field names", () => {
  const a = P.assertionsFromHeader({ ai_system: { value: "App" }, tools: { value: "search" } }, "t");
  assert.ok(a.ai_product && a.tools_available);
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: [], original: false, metadata: { ai_system: { value: "App", status: "confirmation_required", provenance: { origin: "ai_reported", verification: "unreviewed" } } } });
  assert.ok(conv.metadata.ai_product);
});

test("the mandatory fields of the specification are all present, with guidance for each environment", () => {
  const ids = P.FIELD_IDS;
  for (const k of ["ai_provider", "ai_product", "model_name", "model_version", "session_start", "session_end", "message_timestamps", "time_zone", "knowledge_cutoff", "reasoning_mode", "temperature", "top_p", "max_output", "other_settings",
    "tools_available", "tools_used", "web_browsing", "retrieval", "uploaded_files", "memory", "custom_instructions", "access_method", "model_changes"]) assert.ok(ids.includes(k), k);
  assert.deepEqual(P.FIELDS.filter((f) => f.required === "yes").map((f) => f.id), ["ai_provider", "ai_product", "model_name", "model_version", "session_start"]);
  assert.equal(P.FIELDS.find((f) => f.id === "session_end").required, "closure");
  for (const f of P.FIELDS) { assert.ok(f.why && f.where && f.where.general, f.id + " has guidance"); assert.ok(!/menu|tab|button|click/i.test(JSON.stringify(f.where)), f.id + ": guidance names no interface elements"); }
  const api = { access_method: { assertions: [{ value: "API", status: "known", provenance: { origin: "researcher_reported", verification: "researcher_confirmed" } }] } };
  assert.equal(P.environmentOf(api), "api");
  assert.match(P.guidanceFor(P.FIELDS.find((f) => f.id === "temperature"), api)[0], /API request/);
  const open = P.newConversation({}); open.sessionStatus = "open";
  assert.ok(!P.outstandingFields({}, open).some((f) => f.id === "session_end"), "the end date is not asked for while the session is open");
  open.sessionStatus = "ended";
  assert.ok(P.outstandingFields({}, open).some((f) => f.id === "session_end"));
  const rec = P.buildRecord(P.newConversation({}));
  for (const f of P.FIELDS.filter((x) => x.required)) assert.ok(rec.metadata[f.id], "the record always carries " + f.id);
  assert.ok(rec.metadata.schema_version && rec.model_identification && Array.isArray(rec.metadata_unresolved));
});

test("conflicting sources are kept and flagged until the researcher resolves them", () => {
  const f = { assertions: [
    { value: "Model A", status: "confirmation_required", provenance: { origin: "ai_reported", verification: "unreviewed" } },
    { value: "Model B", status: "known", provenance: { origin: "provider_recorded", verification: "unreviewed" } }] };
  assert.ok(P.fieldConflict(f));
  assert.ok(!P.fieldDone(f));
  f.resolution = { chosen: 1, reason: "the export records it", at: "t" };
  assert.ok(!P.fieldConflict(f));
  assert.equal(P.currentAssertion(f).value, "Model B");
  assert.equal(f.assertions.length, 2, "nothing is deleted");
});

test("the model identification statement says only what the assertions support", () => {
  const meta = { model_name: { assertions: [{ value: "X", status: "known", provenance: { origin: "ai_reported", verification: "researcher_confirmed" } }] }, model_version: { assertions: [{ value: null, status: "not_exposed", provenance: { origin: "researcher_reported", verification: "researcher_confirmed" } }] } };
  assert.equal(P.modelIdentification(meta), "The AI system identified its model through self-reported metadata. The researcher confirmed the displayed model name. The exact backend release identifier was not exposed by the provider.");
  meta.model_name.assertions[0].provenance.verification = "unreviewed";
  assert.match(P.modelIdentification(meta), /has not confirmed it/);
  assert.equal(P.modelIdentification({}), "The model was not identified in the records.");
});

/* ---------- analysis ---------- */
test("claims suggested by an AI record arrive as unverified suggestions, mapped to the Lab's turns", () => {
  const rec = "SPL-HEADER\n" + JSON.stringify({ format: "spl-rsr-transfer/0.2", claims: [{ id: "CL-001", text: "A claim", first_turn: 2, developments: [{ turn: 4, type: "qualified", note: "n" }, { turn: 9, type: "retracted" }] }], decisions: [{ turn: 3, text: "Use it", explicit: true }] }) + "\n" +
    [1, 2, 3, 4].map((n) => "<<<SPL-TURN " + n + " role=" + (n % 2 ? "researcher" : "ai") + ">>>\nt" + n + "\n<<<SPL-END " + n + ">>>").join("\n");
  const r = P.parseTransfer(rec);
  const conv = P.newConversation({});
  const m = P.mergeImport(conv, { turns: r.turns, original: false, artefact: "R" });
  const cl = P.claimsFromRecord(r.claims, m.byN, []);
  assert.equal(cl[0].id, "CL-001");
  assert.equal(cl[0].status, "suggested");
  assert.equal(cl[0].turn_id, m.byN[2]);
  assert.deepEqual(cl[0].events.map((e) => [e.type, e.turn_id, e.origin]), [["qualified", m.byN[4], "ai_reported"]], "an event at a turn that does not exist is dropped");
  assert.equal(r.decisions[0].explicit, true);
});

test("developments and persistent errors come from what the researcher recorded", () => {
  const conv = P.newConversation({});
  const a = P.addTurn(conv, { role: "ai", text: "wrong date" });
  const q = P.addTurn(conv, { role: "researcher", text: "check the date" });
  const b = P.addTurn(conv, { role: "ai", text: "wrong date again" });
  a.flags = { error: { on: true, note: "date" } };
  q.flags = { correction: { on: true, note: "" } };
  b.flags = { error: { on: true, note: "same date", ref: a.turn_id } };
  assert.deepEqual(P.developments(conv).map((d) => d.type), ["error", "correction", "error"]);
  assert.deepEqual(P.persistentErrors(conv).map((p) => [p.turn_id, p.first]), [[b.turn_id, a.turn_id]]);
  assert.equal(P.nextCode([{ id: "OB-001" }, { id: "OB-007" }], "OB"), "OB-008");
});

test("the follow-up builder fills a template the researcher can edit, and never decides for them", () => {
  const t = P.buildFollowUp({ purpose: "counter_evidence", turnLabel: "your response T004", claim: "all men", material: "DOC-03 P1", requirements: ["quote", "revision"] });
  assert.match(t, /challenges your interpretation in your response T004: “all men”/);
  assert.match(t, /DOC-03 P1/);
  assert.match(t, /In your answer:\n- Quote the exact words/);
  assert.match(P.buildFollowUp({ purpose: "researcher_influence", material: "My reading" }), /Do not adopt it because I have stated it/);
  for (const k of P.TAXONOMY.map((x) => x.id)) assert.ok(P.FOLLOWUP_TEMPLATES[k], "a template for " + k);
});

test("redaction changes only the exported copy, marks every withheld passage, and labels the copy", () => {
  const conv = P.newConversation({ title: "R" });
  P.addTurn(conv, { role: "researcher", text: "Write to ada@example.org or +44 20 7946 0000 about Ada." });
  const t2 = P.addTurn(conv, { role: "ai", text: "Private answer" });
  const rules = { terms: [{ text: "Ada", reason: "name", wholeWord: true }], turns: { [t2.turn_id]: "withheld by the researcher" } };
  const sugg = P.suggestRedactions(conv).map((x) => x.text);
  assert.ok(sugg.includes("ada@example.org") && sugg.some((x) => /7946/.test(x)));
  rules.terms.push({ text: "ada@example.org", reason: "e-mail address" });
  const md = P.toMarkdown(conv, { redaction: rules });
  assert.match(md, /This copy is redacted/);
  assert.match(md, /about \[withheld: name\]\./);
  assert.match(md, /\[withheld: withheld by the researcher\]/);
  assert.ok(!md.includes("Private answer"));
  assert.ok(conv.turns[0].text.includes("Ada"), "the original is unchanged");
  assert.ok(P.toCsv(conv, [], { redaction: rules }).includes("text_redacted"));
  assert.ok(!P.toMarkdown(conv).includes("redacted"));
});

test("comparison: prompts aligned by position, conditions that differ are named, and mixed designs are flagged", () => {
  const mk = (title, design, model, texts) => { const c = P.newConversation({ title }); c.sequenceDesign = design; c.metadata.model_name = { assertions: [{ value: model, status: "known", provenance: { origin: "researcher_reported", verification: "researcher_confirmed" } }] }; texts.forEach((t, i) => P.addTurn(c, { role: i % 2 ? "ai" : "researcher", text: t })); return c; };
  const a = mk("A", "standardised", "Model A", ["Q1", "A1", "Q2", "A2"]);
  const b = mk("B", "adaptive", "Model B", ["Q1", "B1", "Different Q2", "B2"]);
  b.claims = [{ id: "CL-001", key: "k", text: "x", events: [] }];
  const cmp = P.compareConversations([a, b], [{ id: "accuracy" }]);
  assert.equal(cmp.rows.length, 2);
  assert.deepEqual(cmp.identical, [true, false]);
  assert.ok(cmp.meta.find((m) => m.field === "model_name").differs);
  assert.ok(cmp.warnings.some((w) => /Standardised and adaptive/.test(w)));
  assert.ok(cmp.conditions.find((c) => c.label === "Follow-up sequence").differs);
  assert.ok(cmp.claimKeys.k);
  assert.deepEqual(P.promptSequence(a), ["Q1", "Q2"]);
});

test("the timeline marks scores, inapplicable criteria and missing scores separately, turn by turn", () => {
  const c = P.newConversation({});
  P.addTurn(c, { role: "researcher", text: "Q" });
  const a = P.addTurn(c, { role: "ai", text: "A" });
  a.evaluation = { scores: { accuracy: "4" }, na: { trace: "no claims" }, evaluator: "", notes: "", at: "" };
  const cols = P.timeline(c, [{ id: "accuracy" }, { id: "trace" }, { id: "plural" }]);
  assert.equal(cols.length, 2);
  assert.equal(cols[0].scores, null, "a prompt has no scores");
  assert.deepEqual(cols[1].scores, [{ value: 4 }, { na: true, reason: "no claims" }, { missing: true }]);
});

/* ---------- exports ---------- */
test("every agreed export exists, keeps turn identifiers, and escapes what it must", () => {
  const conv = P.newConversation({ title: "<b>T</b>", sessionId: S });
  P.addTurn(conv, { role: "researcher", text: "<script>alert(1)</script>" });
  const a = P.addTurn(conv, { role: "ai", text: "=SUM(A1)" });
  a.evaluation = { scores: { accuracy: "3" }, na: {}, evaluator: "FO", notes: "", at: "t" };
  conv.claims.push({ id: "CL-001", text: "c", turn_id: a.turn_id, events: [{ type: "qualified", turn_id: a.turn_id, note: "n" }], status: "confirmed" });
  conv.observations.push({ id: "OB-001", category: "context_retention", text: "o", turns: [a.turn_id], confidence: "low" });
  const html = P.toHtml(conv);
  assert.ok(!/<script>/.test(html) && html.includes("&lt;script&gt;") && html.includes("&lt;b&gt;T&lt;/b&gt;"));
  for (const out of [P.toCsv(conv, [{ id: "accuracy" }]), P.interventionsCsv(conv), P.evaluationsCsv(conv, [{ id: "accuracy" }]), P.claimsCsv(conv), P.metadataCsv(conv), P.observationsCsv(conv)]) {
    assert.ok(out.startsWith("﻿"));
    assert.ok(!/(^|,)=SUM/.test(out), "no cell begins with a formula");
  }
  assert.ok(P.evaluationsCsv(conv, [{ id: "accuracy" }]).includes("T001"), "each evaluation names the prompt it answers");
  assert.match(P.analysisMarkdown(conv), /CL-001[\s\S]*Qualified/);
  assert.match(P.toMarkdown(conv, { responsesOnly: true }), /AI response/);
  assert.ok(!/## T001/.test(P.toMarkdown(conv, { responsesOnly: true })), "the response history leaves out the prompts");
  const ck = JSON.parse(P.checkpointsJson(Object.assign(conv, { checkpoints: [{ id: "CK-001", artefact: "AR-1" }] }), [{ id: "AR-1", text: "raw", sha256: "x" }]));
  assert.equal(ck.checkpoints[0].original_text, "raw");
});

/* ---------- the teaching case ---------- */
test("teaching case SPL-UC-003 is a valid record that demonstrates every element the specification lists", () => {
  const T = global.self.LAB_TEACHING_CASES["SPL-UC-003"];
  assert.deepEqual(P.validateRecord(T.record), []);
  const r = T.record, txt = r.turns.map((t) => t.text).join("\n");
  assert.match(r.notes, /Constructed teaching specimen/);
  assert.equal(r.coverage.status, "complete");
  assert.equal(r.coverage.basis, "compared_with_original");
  for (const re of [/SPL Research Session — Initial Record/, /SPL: CONFIRM RESEARCH METADATA/, /SPL Research Session — Checkpoint reminder/, /SPL: SAVE RESEARCH CHECKPOINT/, /SPL Research Session — Final Record/, /SPL: END RESEARCH SESSION/, /\[DOC-03/])
    assert.match(txt, re);
  assert.deepEqual(r.reviews.map((x) => x.type), ["opening", "intermediate", "closing"]);
  const cls = new Set(r.turns.flatMap((t) => t.classification.map((c) => c.category)));
  for (const k of ["contextual_correction", "evidence_examination", "interpretive_challenge", "counter_evidence"]) assert.ok(cls.has(k), k);
  assert.ok(r.discrepancies.some((d) => d.status === "ai_differs"), "the AI record misreproduced a prompt, and the transcript shows it");
  assert.ok(r.gaps.some((g) => g.resolved && g.reported_by === "lab_alignment"), "the checkpoint left out a prompt, and a later record filled the gap");
  assert.equal(r.metadata.model_version.assertions.slice(-1)[0].status, "not_exposed");
  assert.equal(r.claims[0].id, "CL-001");
  assert.ok(r.claims[0].events.length >= 5);
  assert.ok(r.observations.length >= 3 && r.decisions.length >= 1);
  assert.ok(r.turns.some((t) => t.evaluation && Object.keys(t.evaluation.not_applicable).length), "an inapplicable criterion with its reason");
  assert.equal(T.artefacts.length, 3);
  assert.match(fs.readFileSync(path.join(root, "docs", "teaching", "spl-uc-003-transcript.md"), "utf8"), /Constructed teaching specimen/);
});

test("the teaching case is offered in the menu and kept for offline use, and is loaded only when chosen", () => {
  const data = fs.readFileSync(path.join(root, "data.js"), "utf8"), html = fs.readFileSync(path.join(root, "index.html"), "utf8"), sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(data, /teachingCase: "SPL-UC-003"/);
  assert.ok(!html.includes("teaching-uc003.js"), "not loaded with every page");
  assert.ok(sw.includes('"teaching-uc003.js"'), "in the offline copy");
});

/* ---------- the page ---------- */
test("the product name is a home link that keeps the approved wordmark, and the header keeps the approved hierarchy", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8"), css = fs.readFileSync(path.join(root, "styles.css"), "utf8"), app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(html, /<h1 class="brand"><a class="brand-link" href="#build" id="brandHome"[^>]*><picture>/);
  assert.match(html, /<p class="tagline">The prompt as method\.<\/p>/);
  assert.match(html, /<p class="tagline-desc">Design, document and examine how scholarly knowledge develops through human–AI interaction\.<\/p>/);
  assert.match(html, /<p class="tagline-2">Free and open-source research software for the humanities and social sciences\.<\/p>/);
  assert.ok(!/\.headline\b/.test(css), "no oversized headline style");
  assert.match(css, /h1\.brand img \{ display: block; height: 36px;/, "the wordmark keeps its approved size");
  assert.ok(/\.brand-link \{[^}]*text-decoration: none/.test(css), "no underline on the wordmark");
  assert.ok(/brandHome[\s\S]{0,400}preventDefault[\s\S]{0,200}flush\(\)/.test(app), "no reload: typed work is saved and the page stays");
});

/* ---------- further fixtures from the specification ---------- */
test("a large transcript (400 turns, about 1.6 million characters) is read, aligned and exported intact, quickly", () => {
  const big = Array.from({ length: 400 }, (_, i) => (i % 2 ? "Assistant:\n" : "You said:\n") + "Turn " + (i + 1) + " " + "lorem ipsum dolor sit amet ".repeat(150)).join("\n\n");
  const t0 = Date.now();
  const tr = P.parseTranscript(big);
  assert.equal(tr.turns.length, 400);
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: tr.turns, original: true, artefact: "T" });
  const again = P.mergeImport(conv, { turns: tr.turns, original: true, artefact: "T2" });
  assert.equal(again.added, 0, "a second import of the same transcript adds nothing");
  const rec = P.buildRecord(conv);
  assert.deepEqual(P.validateRecord(rec), []);
  assert.equal(rec.turns.map((t) => t.text).join(""), tr.turns.map((t) => t.text).join(""));
  assert.ok(Date.now() - t0 < 15000, "took " + (Date.now() - t0) + " ms");
});

test("incorrect speaker attribution and turn order in an AI record are flagged, and the original corrects them", () => {
  const rec = "SPL-HEADER\n{}\n<<<SPL-TURN 1 role=researcher>>>\nQ1\n<<<SPL-END 1>>>\n<<<SPL-TURN 2 role=researcher>>>\nA1 that the AI attributed to the researcher\n<<<SPL-END 2>>>\n<<<SPL-TURN 3 role=researcher>>>\nQ2\n<<<SPL-END 3>>>";
  const r = P.parseTransfer(rec);
  assert.ok(r.warnings.some((w) => /both by the researcher/.test(w)));
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: r.turns, original: false, artefact: "AI" });
  P.mergeImport(conv, { turns: turns([["researcher", "Q1"], ["ai", "A1 that the AI attributed to the researcher"], ["researcher", "Q2"]]), original: true, artefact: "T" });
  assert.deepEqual(P.activePath(conv).map((t) => t.role), ["researcher", "ai", "researcher"], "the original's speakers are kept");
  const swapped = P.align(turns([["researcher", "Q1"], ["ai", "A1"], ["researcher", "Q2"], ["ai", "A2"]]), turns([["researcher", "Q2"], ["ai", "A2"], ["researcher", "Q1"], ["ai", "A1"]]));
  assert.ok(swapped.some((x) => x.status === "missing_from_import") && swapped.some((x) => x.status === "only_in_import"), "out-of-order turns are not silently matched");
});

test("conflicting checkpoints keep both wordings, and the earlier one stays until an original settles it", () => {
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: turns([["researcher", "Q1"], ["ai", "The answer, first version."]]), original: false, artefact: "CK1" });
  const m = P.mergeImport(conv, { turns: turns([["researcher", "Q1"], ["ai", "The answer, second version."]]), original: false, artefact: "CK2" });
  assert.equal(m.discrepancies[0].status, "conflict");
  assert.equal(P.activePath(conv)[1].text, "The answer, first version.");
  const dup = P.mergeImport(conv, { turns: turns([["researcher", "Q1"], ["ai", "The answer, first version."]]), original: false, artefact: "CK3" });
  assert.equal(dup.added, 0, "a duplicate checkpoint adds nothing");
});

test("simulated context loss: an AI record that can no longer see the start reports a gap, and coverage stays partial", () => {
  const rec = "SPL-HEADER\n" + JSON.stringify({ format: "spl-rsr-transfer/0.2", covers: [1, 6], access_to_beginning: false, coverage: "partial", gaps: [{ after_turn: null, missing: "both", reason: "The start of the conversation is no longer available to me." }] }) + "\n" +
    [5, 6].map((n) => "<<<SPL-TURN " + n + " role=" + (n % 2 ? "researcher" : "ai") + ">>>\nt" + n + "\n<<<SPL-END " + n + ">>>").join("\n");
  const r = P.parseTransfer(rec);
  assert.equal(r.header.access_to_beginning, false);
  const conv = P.newConversation({});
  P.mergeImport(conv, { turns: r.turns, gaps: r.gaps, original: false, artefact: "R" });
  assert.equal(P.coverage(conv).status, "partial");
  assert.equal(P.coverage(conv).prompts_missing, 1);
});

test("suggestions from the checks and a second model are kept apart from the researcher's scores in the record", () => {
  const conv = P.newConversation({});
  P.addTurn(conv, { role: "researcher", text: "Q" });
  const a = P.addTurn(conv, { role: "ai", text: "A" });
  a.evaluation = { scores: {}, na: {}, evaluator: "", notes: "", at: "", checks: { summary: "2 quotations", scores: { trace: { score: 5, reason: "" } } }, second: { model: "M", scores: { accuracy: { score: 2, reason: "r" } }, overall: "o" } };
  const rec = P.buildRecord(conv);
  const ev = rec.turns[1].evaluation;
  assert.deepEqual(ev.scores, {}, "no suggestion becomes a score");
  assert.equal(ev.suggestions.checks.status, "suggested");
  assert.equal(ev.suggestions.second_model.provenance.origin, "ai_reported");
  assert.deepEqual(P.validateRecord(rec), []);
  assert.equal(P.counts(conv).scored, 0);
});

test("the schema lists every claim development and observation category the Lab uses", () => {
  const sc = JSON.parse(fs.readFileSync(path.join(root, "schemas", "spl-research-session-record.schema.json"), "utf8"));
  assert.deepEqual(sc.$defs.claim.properties.events.items.properties.type.enum.slice().sort(), Object.keys(P.CLAIM_EVENTS).sort());
  assert.deepEqual(sc.properties.observations.items.properties.category.enum.slice().sort(), P.OBSERVATION_CATEGORIES.map((c) => c.id).sort());
  assert.deepEqual(sc.properties.decisions.items.properties.status.enum.slice().sort(), Object.keys(P.DECISION_STATUSES).sort());
  assert.deepEqual(sc.$defs.turn.properties.developments.items.properties.type.enum.slice().sort(), Object.keys(P.FLAG_LABELS).sort());
});

/* ---------- 1.9.0: Log and evaluate, and the research conversation empty state ---------- */
test("Log and evaluate uses the approved wording, a record-type switch, and an empty state with two actions", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const s of ["<h2>Log and evaluate</h2>", "Document AI-generated outputs and research conversations, verify supporting evidence and evaluate the results. Saved records inform your Sensitivity study and Methods report.",
    ">Record type<", ">Single output<", ">Research conversation<", "<h2 id=\"convTitle\">Research conversations</h2>",
    "Document your interactions with AI, including the initial prompt, subsequent researcher prompts, corresponding responses and available system metadata.",
    "Compare AI-generated session records with the original conversation. Any discrepancies are retained for scholarly examination.",
    "No conversations recorded yet", "Start a research session or import an existing conversation.",
    "<span class=\"ac-title\">New conversation</span><span class=\"ac-desc\">Design a research prompt and initialise a research session.</span>",
    "<span class=\"ac-title\">Import conversation</span><span class=\"ac-desc\">Add a transcript or an SPL Research Session Record.</span>",
    "Starting a new research conversation?", "Documenting an existing conversation?", "Recording and verification guide",
    "Your research records are stored locally in your browser. Export a project backup regularly to protect against data loss.", ">Back up project<", "Estimated storage quota", "Document this as a research conversation."])
    assert.ok(html.includes(s), "missing: " + s);
  assert.match(html, /<button type="button" class="action-card" id="cardNew">/);
  assert.match(html, /<button type="button" class="action-card" id="cardImport">/);
  assert.ok(!/No conversation open/.test(html + fs.readFileSync(path.join(root, "conversations.js"), "utf8")));
});

test("no interface text or documentation calls the original the \"record of truth\", or sends researchers to numbered steps", () => {
  const files = ["index.html", "app.js", "conversations.js", "report.js", "protocol.js", "README.md"].concat(fs.readdirSync(path.join(root, "docs")).filter((f) => f.endsWith(".md")).map((f) => "docs/" + f));
  for (const f of files) {
    const s = fs.readFileSync(path.join(root, f), "utf8");
    assert.ok(!/record of truth/i.test(s), f + " uses \"record of truth\"");
    assert.ok(!/\bstep 7\b/i.test(s), f + " refers to step 7");
  }
});

test("the empty state gives way to the workspace once a conversation exists, and import can create the conversation", () => {
  const conv = fs.readFileSync(path.join(root, "conversations.js"), "utf8");
  assert.match(conv, /\$\("convEmpty"\)\.hidden = !empty; \$\("convGrid"\)\.hidden = empty;/);
  assert.match(conv, /\$\("cardImport"\)\.addEventListener\("click", \(\) => openImport\(null\)\)/);
  assert.match(conv, /function importTarget\(c, o\)/);
  assert.match(fs.readFileSync(path.join(root, "projects.js"), "utf8"), /root\.LAB_PROJECTS\.backupCurrent = /);
});
