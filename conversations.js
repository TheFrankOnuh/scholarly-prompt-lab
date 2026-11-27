/* Scholarly Prompt Lab: research conversations (Log & evaluate → Conversation, and the Sensitivity study).
   A conversation is kept with its project in the browser's IndexedDB database, apart from the rest of the Lab's data,
   because long conversations would exhaust ordinary browser storage. Imported records, transcripts and provider exports
   are kept unchanged beside the conversation. The original conversation is the record of truth; a record written by the
   AI system is compared with it and every difference is kept (protocol.js). Imported text is only ever shown as text.
   Nothing here sends anything anywhere. */
(function () {
  "use strict";
  const P = window.LAB_PROTOCOL;
  const $ = (id) => document.getElementById(id);
  if (!P || !$("convWrap")) return;
  const A = window.LAB_APP || {};
  const L = window.LAB || {};
  const CRIT = L.criteria || [];
  const MAX_IMPORT = 20 * 1024 * 1024;
  const MAX_EXPORT_FILE = 200 * 1024 * 1024;

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "text") n.textContent = v; else if (k === "class") n.className = v; else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach((c) => { if (c !== null && c !== undefined && c !== false) n.append(c); });
    return n;
  }
  const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const now = () => new Date().toISOString();
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");
  function say(msg) { const s = $("convStatus"); if (s) { s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(() => (s.textContent = ""), 7000); } $("convAnnounce").textContent = msg; }
  function niceTime(iso) { const d = new Date(iso); return isNaN(d) ? str(iso) : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  function slug(s) { return (s || "conversation").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "conversation"; }
  function projectId() { try { return window.LAB_PROJECTS && window.LAB_PROJECTS.currentId ? window.LAB_PROJECTS.currentId() : "default"; } catch (e) { return "default"; } }
  function newId(prefix) { return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function short(t, n) { t = str(t).replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function btn(label, fn, cls, attrs) { const b = el("button", Object.assign({ type: "button", class: cls === undefined ? "ghost small-btn" : cls, text: label }, attrs || {})); b.addEventListener("click", fn); return b; }
  function field(id, label, input, hint) { return el("div", { class: "cv-fieldrow" }, [el("label", { for: id, text: label }), input, hint ? el("p", { class: "hint", text: hint }) : null]); }

  /* ---------- storage ---------- */
  let dbPromise = null;
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open("spl-conversations", 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("conversations")) db.createObjectStore("conversations", { keyPath: "id" }).createIndex("projectId", "projectId");
        if (!db.objectStoreNames.contains("artefacts")) { const a = db.createObjectStore("artefacts", { keyPath: "id" }); a.createIndex("convId", "convId"); a.createIndex("projectId", "projectId"); }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("blocked"));
    });
    return dbPromise;
  }
  // One transaction: it completes as a whole or leaves nothing behind.
  function run(stores, mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode), out = {};
      t.oncomplete = () => resolve(out.value);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("aborted"));
      try { fn(t, out); } catch (e) { try { t.abort(); } catch (e2) { /* already finished */ } reject(e); }
    }));
  }
  function byIndex(store, index, key) {
    return run([store], "readonly", (t, out) => { const r = t.objectStore(store).index(index).getAll(key); r.onsuccess = () => { out.value = r.result || []; }; });
  }
  function deleteWhere(t, store, index, key) {
    const os = t.objectStore(store);
    os.index(index).openKeyCursor(IDBKeyRange.only(key)).onsuccess = (e) => { const c = e.target.result; if (c) { os.delete(c.primaryKey); c.continue(); } };
  }
  function failMessage(e) {
    return e && (e.name === "QuotaExceededError" || /quota/i.test(String(e.message)))
      ? "This browser's storage is full, so this was NOT saved. Back up the project under Manage projects, then remove material you no longer need."
      : "This browser could not save the conversation. Nothing was changed.";
  }

  /* ---------- cleaning data that comes from storage, backups or other people's files ---------- */
  function cleanProv(p) {
    p = p && typeof p === "object" ? p : {};
    const o = { origin: P.ORIGINS[p.origin] ? p.origin : "unknown", verification: P.VERIFICATIONS[p.verification] ? p.verification : "unreviewed", source_ref: str(p.source_ref), recorded_at: str(p.recorded_at) };
    if (p.confirmed_at) o.confirmed_at = str(p.confirmed_at);
    return o;
  }
  function cleanAssertion(a) {
    if (!a || typeof a !== "object") return null;
    const o = { value: a.value == null ? null : str(a.value), status: P.STATUSES[a.status] ? a.status : "unknown", provenance: cleanProv(a.provenance) };
    if (a.reason) o.reason = str(a.reason);
    if (Number.isInteger(a.supersedes)) o.supersedes = a.supersedes;
    return o;
  }
  const TAX = new Set(P.TAXONOMY.map((x) => x.id));
  const CRIT_IDS = new Set(CRIT.map((c) => c.id));
  const FLAG_KEYS = Object.keys(P.FLAG_LABELS);
  function cleanFlags(f) {
    const o = {};
    if (f && typeof f === "object") FLAG_KEYS.forEach((k) => { const x = f[k]; if (x && typeof x === "object" && x.on) o[k] = { on: true, note: str(x.note), ref: str(x.ref), sources: str(x.sources) }; });
    return o;
  }
  function cleanTurn(t) {
    if (!t || typeof t !== "object" || typeof t.text !== "string") return null;
    const ev = t.evaluation && typeof t.evaluation === "object" ? t.evaluation : null;
    const scores = {}, na = {};
    if (ev) {
      Object.keys(ev.scores || {}).forEach((k) => { if (CRIT_IDS.has(k) && /^[1-5]$/.test(String(ev.scores[k]))) scores[k] = String(ev.scores[k]); });
      const nas = ev.na || ev.not_applicable || {};
      Object.keys(nas).forEach((k) => { if (CRIT_IDS.has(k) && str(nas[k]).trim()) na[k] = str(nas[k]); });
    }
    const model = t.model && typeof t.model === "object" ? (t.model.value ? { value: str(t.model.value), origin: P.ORIGINS[t.model.origin] ? t.model.origin : "researcher_reported" } :
      Array.isArray(t.model.assertions) && t.model.assertions[0] && t.model.assertions[0].value ? { value: str(t.model.assertions[0].value), origin: (t.model.assertions[0].provenance || {}).origin || "researcher_reported" } : null) : null;
    const sugOf = (x) => { if (!x || typeof x !== "object") return null; const sc = {}; Object.keys(x.scores || x.suggested || {}).forEach((k) => { const v = (x.scores || x.suggested)[k]; if (CRIT_IDS.has(k) && v && typeof v === "object") sc[k] = { score: Number.isInteger(v.score) && v.score >= 1 && v.score <= 5 ? v.score : null, reason: str(v.reason) }; }); return { scores: sc, summary: str(x.summary), model: str(x.model), overall: str(x.overall), errors: Number.isInteger(x.errors) ? x.errors : 0, at: str(x.at) }; };
    if (ev) { ev.checksClean = ev.checks ? sugOf(ev.checks) : null; ev.secondClean = ev.second || ev.second_model ? sugOf(ev.second || ev.second_model) : null; }
    return {
      turn_id: /^T\d{3,}$/.test(str(t.turn_id)) ? t.turn_id : "", parent_id: t.parent_id ? str(t.parent_id) : null, role: t.role === "ai" ? "ai" : "researcher",
      kind: t.kind === "administrative" ? "administrative" : "substantive", text: t.text,
      text_status: P.TEXT_STATUSES[t.text_status] ? t.text_status : "original", timestamp: t.timestamp ? str(t.timestamp) : null,
      classification: Array.isArray(t.classification) ? t.classification.filter((c) => c && TAX.has(c.category)).map((c) => ({ category: c.category, status: c.status === "suggested" ? "suggested" : "researcher", note: c.note ? str(c.note) : undefined })) : [],
      attested_by: Array.isArray(t.attested_by) ? t.attested_by.map(str) : [],
      provenance: cleanProv(t.provenance),
      evaluation: ev ? Object.assign({ scores, na, evaluator: str(ev.evaluator), notes: str(ev.notes), at: str(ev.at || ev.recorded_at) }, ev.checksClean ? { checks: ev.checksClean } : {}, ev.secondClean ? { second: ev.secondClean } : {}) : null,
      corrections: Array.isArray(t.corrections) ? t.corrections.map((c) => ({ old: str(c && c.old), new: str(c && c.new), reason: str(c && c.reason), at: str(c && c.at) })) : [],
      flags: cleanFlags(t.flags || (Array.isArray(t.developments) ? Object.fromEntries(t.developments.filter((d) => d && FLAG_KEYS.includes(d.type)).map((d) => [d.type, { on: true, note: d.note, ref: d.ref, sources: d.source_ids }])) : null)),
      refs: Array.isArray(t.refs || t.references) ? (t.refs || t.references).map(str).filter((x) => /^T\d{3,}$/.test(x)) : [],
      model, regenerated_from: t.regenerated_from ? str(t.regenerated_from) : null, edited_from: t.edited_from ? str(t.edited_from) : null,
      designedId: t.designedId || t.designed_prompt ? str(t.designedId || t.designed_prompt) : "",
      sha256: /^[0-9a-f]{64}$/.test(str(t.sha256)) ? t.sha256 : undefined,
      matchesCopiedPrompt: !!t.matchesCopiedPrompt
    };
  }
  const OBS_IDS = new Set(P.OBSERVATION_CATEGORIES.map((c) => c.id));
  function normaliseConv(c, pid) {
    if (!c || typeof c !== "object" || !Array.isArray(c.turns)) return null;
    const o = {
      id: /^CV-[A-Z0-9]+$/.test(str(c.id)) ? c.id : newId("CV-"), projectId: pid, sessionId: P.isSessionId(c.sessionId) ? c.sessionId : "",
      title: str(c.title).slice(0, 200) || "Research conversation", question: str(c.question), purpose: str(c.purpose), finalInterpretation: str(c.finalInterpretation),
      createdAt: str(c.createdAt) || now(), updatedAt: str(c.updatedAt), labVersion: str(c.labVersion),
      condition: str(c.condition) || "custom", group: str(c.group), sequenceDesign: ["standardised", "adaptive"].includes(c.sequenceDesign) ? c.sequenceDesign : "",
      protocolVersion: c.protocolVersion ? str(c.protocolVersion) : null, reminders: c.reminders == null ? null : str(c.reminders),
      prompt: str(c.prompt), promptCopiedAt: str(c.promptCopiedAt), promptCompared: !!c.promptCompared,
      promptHistory: Array.isArray(c.promptHistory) ? c.promptHistory.filter((x) => x && typeof x === "object").map((x) => ({ id: str(x.id), sha256: str(x.sha256), copiedAt: str(x.copiedAt) })) : [],
      sourceSha256: /^[0-9a-f]{64}$/.test(str(c.sourceSha256)) ? c.sourceSha256 : "", sourceDesc: str(c.sourceDesc),
      includeInReport: c.includeInReport !== false, completeConfirmed: !!c.completeConfirmed, scoreAdmin: !!c.scoreAdmin, fromProviderExport: !!c.fromProviderExport,
      sessionStatus: c.sessionStatus === "ended" ? "ended" : "open", recordType: str(c.recordType) || undefined,
      accessToBeginning: c.accessToBeginning === true || c.accessToBeginning === false ? c.accessToBeginning : null, previousCheckpointsUsed: !!c.previousCheckpointsUsed,
      nextTurn: 1, activeLeaf: c.activeLeaf ? str(c.activeLeaf) : null, turns: [], gaps: [], discrepancies: [], metadata: {}, notes: str(c.notes), artefacts: Array.isArray(c.artefacts) ? c.artefacts.map(str) : [],
      checkpoints: Array.isArray(c.checkpoints) ? c.checkpoints.filter((x) => x && typeof x === "object").map((x) => ({ id: str(x.id), artefact: str(x.artefact), record_type: str(x.record_type), parts: Array.isArray(x.parts) ? x.parts : [], covers: Array.isArray(x.covers) ? x.covers : null, claimed_coverage: str(x.claimed_coverage), access_to_beginning: x.access_to_beginning, imported_at: str(x.imported_at), firstTurn: str(x.firstTurn), lastTurn: str(x.lastTurn) })) : [],
      claims: [], observations: [], decisions: [], designedPrompts: [], aiNotes: [], redaction: { terms: [], turns: {} },
      events: Array.isArray(c.events) ? c.events.filter((e) => e && typeof e === "object").map((e) => ({ type: str(e.type), at: str(e.at), detail: e.detail ? str(e.detail) : undefined, lab_version: e.lab_version ? str(e.lab_version) : undefined })) : []
    };
    let max = 0;
    c.turns.forEach((t) => {
      const x = cleanTurn(t);
      if (!x) return;
      if (!x.turn_id || o.turns.some((y) => y.turn_id === x.turn_id)) x.turn_id = "";
      o.turns.push(x);
      if (x.turn_id) max = Math.max(max, parseInt(x.turn_id.slice(1), 10));
    });
    o.nextTurn = Math.max(max + 1, parseInt(c.nextTurn, 10) || 1);
    o.turns.forEach((t) => { if (!t.turn_id) t.turn_id = "T" + String(o.nextTurn++).padStart(3, "0"); });
    const ids = new Set(o.turns.map((t) => t.turn_id));
    o.turns.forEach((t) => { if (t.parent_id && !ids.has(t.parent_id)) t.parent_id = null; if (t.regenerated_from && !ids.has(t.regenerated_from)) t.regenerated_from = null; if (t.edited_from && !ids.has(t.edited_from)) t.edited_from = null; t.refs = t.refs.filter((r) => ids.has(r)); });
    // a parent chain that loops back on itself is broken at the loop
    o.turns.forEach((t) => { const seen = new Set([t.turn_id]); let p = t.parent_id, n = 0; while (p && n++ < 100000) { if (seen.has(p)) { t.parent_id = null; break; } seen.add(p); const q = o.turns.find((x) => x.turn_id === p); p = q ? q.parent_id : null; } });
    P.linkLinear(o);
    if (o.activeLeaf && !ids.has(o.activeLeaf)) o.activeLeaf = null;
    o.gaps = (Array.isArray(c.gaps) ? c.gaps : []).filter((g) => g && typeof g === "object").map((g) => ({
      after_turn: ids.has(g.after_turn) ? g.after_turn : null, missing: ["researcher_prompt", "ai_response", "both", "unknown"].includes(g.missing) ? g.missing : "unknown",
      reason: str(g.reason), reported_by: ["ai", "researcher", "lab_alignment"].includes(g.reported_by) ? g.reported_by : "researcher", resolved: !!g.resolved, resolved_by: g.resolved_by ? str(g.resolved_by) : undefined, artefact: str(g.artefact) }));
    o.discrepancies = (Array.isArray(c.discrepancies) ? c.discrepancies : []).filter((d) => d && P.DISCREPANCY_LABELS[d.status]).map((d) => ({
      turn_id: ids.has(d.turn_id) ? d.turn_id : null, status: d.status, text: d.text == null && d.imported_text == null ? null : str(d.text != null ? d.text : d.imported_text), artefact: str(d.artefact), at: str(d.at), resolved: !!d.resolved }));
    const meta = c.metadata && typeof c.metadata === "object" ? c.metadata : {};
    Object.keys(meta).forEach((k0) => {
      const k = P.FIELD_ALIASES[k0] || k0;
      if (!P.FIELD_IDS.includes(k) || !meta[k0] || !Array.isArray(meta[k0].assertions)) return;
      const as = meta[k0].assertions.map(cleanAssertion).filter(Boolean);
      if (!as.length) return;
      const f = o.metadata[k] || (o.metadata[k] = { assertions: [] });
      f.assertions = f.assertions.concat(as);
      const r = meta[k0].resolution;
      if (r && typeof r === "object" && Number.isInteger(r.chosen) && r.chosen < f.assertions.length) f.resolution = { chosen: r.chosen, reason: str(r.reason), at: str(r.at) };
    });
    o.claims = (Array.isArray(c.claims) ? c.claims : []).filter((x) => x && typeof x.text === "string" && /^CL-\d{3,}$/.test(str(x.id))).map((x) => ({
      id: x.id, aiLabel: str(x.aiLabel), text: x.text, turn_id: ids.has(x.turn_id) ? x.turn_id : null, sources: str(x.sources), key: str(x.key), researcherReading: str(x.researcherReading), aiLater: str(x.aiLater),
      outstanding: str(x.outstanding), status: ["suggested", "confirmed"].includes(x.status) ? x.status : "confirmed",
      events: (Array.isArray(x.events) ? x.events : []).filter((e) => e && P.CLAIM_EVENTS[e.type] && ids.has(e.turn_id)).map((e) => ({ type: e.type, turn_id: e.turn_id, note: str(e.note), origin: e.origin === "ai_reported" ? "ai_reported" : "researcher_reported" })) }));
    o.observations = (Array.isArray(c.observations) ? c.observations : []).filter((x) => x && OBS_IDS.has(x.category) && typeof x.text === "string").map((x) => ({
      id: str(x.id), category: x.category, text: x.text, turns: (Array.isArray(x.turns) ? x.turns : []).map(str).filter((t) => ids.has(t)), confidence: ["low", "medium", "high"].includes(x.confidence) ? x.confidence : "", at: str(x.at) }));
    o.decisions = (Array.isArray(c.decisions) ? c.decisions : []).filter((x) => x && typeof x.text === "string").map((x) => ({
      id: str(x.id), text: x.text, status: P.DECISION_STATUSES[x.status] ? x.status : "recorded", turn_id: ids.has(x.turn_id) ? x.turn_id : null, at: str(x.at) }));
    o.designedPrompts = (Array.isArray(c.designedPrompts || c.designed_prompts) ? (c.designedPrompts || c.designed_prompts) : []).filter((x) => x && typeof x.text === "string").map((x) => ({
      id: str(x.id), purpose: str(x.purpose), target: str(x.target), claim: str(x.claim), text: x.text, at: str(x.at) }));
    o.aiNotes = (Array.isArray(c.aiNotes || c.ai_notes) ? (c.aiNotes || c.ai_notes) : []).filter((x) => x && typeof x.text === "string").map((x) => ({ text: x.text, artefact: str(x.artefact), at: str(x.at) }));
    const red = c.redaction && typeof c.redaction === "object" ? c.redaction : {};
    o.redaction = { terms: (Array.isArray(red.terms) ? red.terms : []).filter((r) => r && typeof r.text === "string" && r.text).map((r) => ({ text: r.text, reason: str(r.reason) || "redacted", wholeWord: !!r.wholeWord })), turns: {} };
    Object.keys(red.turns || {}).forEach((k) => { if (ids.has(k)) o.redaction.turns[k] = str(red.turns[k]) || "redacted"; });
    return o;
  }
  // a canonical Research Session Record (JSON) becomes a conversation of its own
  function fromRecord(r, pid) {
    const errs = P.validateRecord(r);
    if (errs.length) return { errors: errs };
    const c = normaliseConv({
      sessionId: r.session_id, title: r.title || "Imported research session record", question: r.research_question, purpose: r.purpose, finalInterpretation: r.final_interpretation,
      createdAt: r.created_at, labVersion: r.lab_version, condition: r.study && r.study.condition, group: r.study && r.study.group, sequenceDesign: r.study && r.study.sequence_design,
      protocolVersion: r.protocol_version, reminders: r.protocol && r.protocol.reminders, promptCopiedAt: r.protocol && r.protocol.initial_prompt_copied_at,
      completeConfirmed: r.coverage && r.coverage.status === "complete", recordType: r.record_type, notes: r.notes, sessionStatus: r.session_status, activeLeaf: r.active_leaf,
      fromProviderExport: r.record_type === "provider_export", sourceSha256: r.sources && r.sources.sha256, sourceDesc: r.sources && r.sources.description,
      turns: r.turns.map((t) => Object.assign({}, t, { evaluation: t.evaluation ? { scores: t.evaluation.scores, na: t.evaluation.not_applicable, evaluator: t.evaluation.evaluator, notes: t.evaluation.notes, at: t.evaluation.recorded_at } : null })),
      gaps: r.gaps, discrepancies: r.discrepancies, metadata: r.metadata, events: r.events, checkpoints: r.checkpoints,
      claims: r.claims, observations: r.observations, decisions: r.decisions, designedPrompts: r.designed_prompts, aiNotes: r.ai_notes
    }, pid);
    return { conv: c };
  }

  /* ---------- the conversations of the open project ---------- */
  let convs = [];
  let selectedId = "";
  let available = true;
  let view = "conv", showAdmin = true;
  const API = { ready: false, setMode, registerSession, exportProject, importProject, copyProject, deleteProject, addRecordToProject, noteEvent,
    forReport: () => convs.filter((c) => c.includeInReport !== false), all: () => convs.slice(), fromRecord };
  window.LAB_CONV = API;

  const loaded = openDb().then(() => byIndex("conversations", "projectId", projectId())).then((list) => {
    API.ready = true;
    convs = list.map((c) => normaliseConv(c, projectId())).filter(Boolean).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    try { selectedId = sessionStorage.getItem("spl.ui.conv") || ""; } catch (e) { /* ignore */ }
    if (!convs.some((c) => c.id === selectedId)) selectedId = convs.length ? convs[convs.length - 1].id : "";
    renderAll();
    renderStudy();
    if (window.LAB_REPORT && $("panel-report") && !$("panel-report").hidden) window.LAB_REPORT.show();
  }).catch(() => {
    available = false;
    $("convUnavailable").hidden = false;
    $("convNew").disabled = true;
    renderAll();
    renderStudy();
  });

  async function hashTurns(c) {
    if (!A.sha256) return;
    for (const t of c.turns) if (!t.sha256) { const h = await A.sha256(t.text); if (h) t.sha256 = h; }
  }
  async function save(c, artefact) {
    // turns made by an import or by hand get the same fields as stored ones
    c.turns.forEach((t) => {
      if (!Array.isArray(t.corrections)) t.corrections = [];
      if (!Array.isArray(t.classification)) t.classification = [];
      if (!Array.isArray(t.attested_by)) t.attested_by = [];
      if (!Array.isArray(t.refs)) t.refs = [];
      if (!t.flags || typeof t.flags !== "object") t.flags = {};
      if (t.evaluation === undefined) t.evaluation = null;
    });
    await hashTurns(c);
    c.updatedAt = now();
    await run(["conversations", "artefacts"], "readwrite", (t) => {
      t.objectStore("conversations").put(c);
      if (artefact) t.objectStore("artefacts").put(artefact);
    });
    const i = convs.findIndex((x) => x.id === c.id);
    if (i === -1) convs.push(c); else convs[i] = c;
    keepPersistent();
  }
  let saveTimer = null, pending = null;
  function saveSoon(c) {
    pending = c; clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { const x = pending; pending = null; save(x).then(() => { renderList(); renderStudy(); }, (e) => say(failMessage(e))); }, 400);
  }
  function flushPending() { if (pending) { clearTimeout(saveTimer); const x = pending; pending = null; return save(x); } return Promise.resolve(); }
  API.flush = flushPending;
  window.addEventListener("pagehide", () => { flushPending(); });
  function keepPersistent() {
    try {
      if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then((p) => { if (!p && navigator.storage.persist) return navigator.storage.persist(); }).then(storageLine, storageLine);
      else storageLine();
    } catch (e) { /* not supported */ }
  }
  function storageLine() {
    const box = $("convStorage");
    if (!available) { box.textContent = ""; return; }
    if (!navigator.storage || !navigator.storage.estimate) { box.textContent = "Stored in this browser only. Back up the project to keep a copy."; return; }
    Promise.all([navigator.storage.estimate(), navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)]).then(([est, persisted]) => {
      const mb = (n) => (n / 1048576 < 10 ? (n / 1048576).toFixed(1) : Math.round(n / 1048576)) + " MB";
      box.textContent = "Storage used by the Lab: " + mb(est.usage || 0) + (est.quota ? " of about " + mb(est.quota) + " available" : "") + ". " +
        (persisted ? "The browser has agreed to keep this data." : "The browser may clear this data if the device runs short of space.") + " Back up the project to keep a copy.";
    }).catch(() => { box.textContent = "Stored in this browser only. Back up the project to keep a copy."; });
  }
  function artefactsOf(convId) { return byIndex("artefacts", "convId", convId); }

  /* ---------- projects: backups, copies and deletions carry the conversations ---------- */
  function exportProject(pid) {
    return Promise.all([byIndex("conversations", "projectId", pid), byIndex("artefacts", "projectId", pid)])
      .then(([cs, as]) => ({ format: "spl-conversations", formatVersion: 1, conversations: cs, artefacts: as }));
  }
  function importProject(pid, data) {
    if (!data || !Array.isArray(data.conversations)) return Promise.resolve(0);
    const convMap = {}, artMap = {}, out = [], arts = [];
    data.conversations.forEach((raw) => {
      const c = normaliseConv(Object.assign({}, raw, { id: "" }), pid);
      if (!c) return;
      convMap[str(raw.id)] = c.id;
      out.push(c);
    });
    (Array.isArray(data.artefacts) ? data.artefacts : []).forEach((a) => {
      if (!a || typeof a.text !== "string" || !convMap[str(a.convId)]) return;
      const id = newId("AR-");
      artMap[str(a.id)] = id;
      arts.push({ id, convId: convMap[a.convId], projectId: pid, kind: str(a.kind), importedAt: str(a.importedAt), size: a.text.length, sha256: str(a.sha256), name: str(a.name), text: a.text });
    });
    out.forEach((c) => {
      const m = (x) => artMap[x] || x;
      c.artefacts = c.artefacts.map(m).filter((x) => arts.some((a) => a.id === x));
      c.turns.forEach((t) => { t.attested_by = t.attested_by.map(m); });
      c.discrepancies.forEach((d) => { d.artefact = m(d.artefact); });
      c.gaps.forEach((g) => { g.artefact = m(g.artefact); if (g.resolved_by) g.resolved_by = m(g.resolved_by); });
      c.checkpoints.forEach((k) => { k.artefact = m(k.artefact); });
      c.aiNotes.forEach((n) => { n.artefact = m(n.artefact); });
    });
    return run(["conversations", "artefacts"], "readwrite", (t) => {
      out.forEach((c) => t.objectStore("conversations").put(c));
      arts.forEach((a) => t.objectStore("artefacts").put(a));
    }).then(() => out.length);
  }
  function copyProject(from, to) { return exportProject(from).then((d) => importProject(to, d)); }
  function deleteProject(pid) {
    return run(["conversations", "artefacts"], "readwrite", (t) => { deleteWhere(t, "conversations", "projectId", pid); deleteWhere(t, "artefacts", "projectId", pid); });
  }
  // a teaching case: its specimen conversation is added to the new project before that project opens
  function addRecordToProject(pid, record, artefacts) {
    const r = fromRecord(record, pid);
    if (r.errors) return Promise.reject(new Error(r.errors.join("; ")));
    const c = r.conv;
    const arts = (artefacts || []).map((a) => ({ id: newId("AR-"), convId: c.id, projectId: pid, kind: str(a.kind), importedAt: now(), size: str(a.text).length, name: str(a.name), text: str(a.text), oldId: a.id }));
    const m = {}; arts.forEach((a) => { if (a.oldId) m[a.oldId] = a.id; delete a.oldId; });
    const map = (x) => m[x] || x;
    c.artefacts = arts.map((a) => a.id);
    c.turns.forEach((t) => { t.attested_by = t.attested_by.map(map); });
    c.discrepancies.forEach((d) => { d.artefact = map(d.artefact); });
    c.checkpoints.forEach((k) => { k.artefact = map(k.artefact); });
    c.aiNotes.forEach((n) => { n.artefact = map(n.artefact); });
    return run(["conversations", "artefacts"], "readwrite", (t) => { t.objectStore("conversations").put(c); arts.forEach((a) => t.objectStore("artefacts").put(a)); });
  }
  // Lab events that belong in each included conversation's history, such as generating a report
  function noteEvent(type, detail) {
    const list = API.forReport();
    list.forEach((c) => { c.events.push({ type, at: now(), detail: detail || "", lab_version: A.VERSION }); save(c).catch(() => { /* the event is a convenience */ }); });
  }

  /* ---------- a session started in Build ---------- */
  function titleFrom(q) { const first = str(q).split("\n").map((x) => x.trim()).filter(Boolean)[0] || "Research conversation"; return first.length > 90 ? first.slice(0, 87) + "…" : first; }
  async function registerSession(o) {
    await loaded;
    if (!available) throw new Error("unavailable");
    const sh = A.sha256 ? await A.sha256(o.prompt) : "";
    const srcSha = A.sha256 && o.sourceText ? await A.sha256(o.sourceText.trim()) : "";
    const copy = { id: "PR-" + (sh ? sh.slice(0, 10) : Date.now().toString(36)), sha256: sh, copiedAt: o.copiedAt };
    let c = convs.find((x) => x.sessionId === o.sessionId);
    if (!c) {
      c = P.newConversation({ projectId: projectId(), sessionId: o.sessionId, title: titleFrom(o.question) + (o.titleSuffix || ""), question: o.question, labVersion: A.VERSION, condition: o.condition || "custom",
        protocolVersion: P.PROTOCOL_VERSION, reminders: o.reminders, prompt: o.prompt, promptCopiedAt: o.copiedAt, at: o.copiedAt, sourceSha256: srcSha, sourceDesc: o.sourceDesc });
      c.promptHistory.push(copy);
      c.events.push({ type: "prompt_copied", at: o.copiedAt, lab_version: A.VERSION, detail: copy.id });
      await save(c);
      selectedId = c.id; renderAll(); renderStudy();
      return "Session " + o.sessionId + " is ready in Log & evaluate, under Conversation. When you have finished, import its record and the transcript there.";
    }
    if (!c.promptHistory.some((x) => x.sha256 === sh)) c.promptHistory.push(copy);
    c.events.push({ type: "prompt_copied_again", at: o.copiedAt, lab_version: A.VERSION, detail: copy.id + (c.turns.length ? "; turns already recorded: the recorded prompt is unchanged" : "") });
    if (!c.turns.length) { c.prompt = o.prompt; c.promptCopiedAt = o.copiedAt; c.reminders = o.reminders; c.sourceSha256 = srcSha || c.sourceSha256; }
    await save(c); renderAll();
    return c.turns.length ? "This session already has recorded turns, so its prompt was not changed. To begin another conversation, choose “Start a new session”."
      : "Session " + o.sessionId + " now holds the prompt you have just copied.";
  }

  /* ---------- mode: single output or conversation ---------- */
  function setMode(m) {
    const conv = m === "conv";
    $("singleWrap").hidden = conv; $("convWrap").hidden = !conv;
    document.querySelectorAll("#logMode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === (conv ? "conv" : "single"))));
    try { localStorage.setItem("spl.ui.logmode", conv ? "conv" : "single"); } catch (e) { /* ignore */ }
    if (conv) storageLine();
  }
  document.querySelectorAll("#logMode button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  try { if (localStorage.getItem("spl.ui.logmode") === "conv") setMode("conv"); } catch (e) { /* ignore */ }

  /* ---------- rendering: the list and the open conversation ---------- */
  function current() { return convs.find((c) => c.id === selectedId) || null; }
  function select(id) { selectedId = id; try { sessionStorage.setItem("spl.ui.conv", id); } catch (e) { /* ignore */ } renderAll(); }
  function renderAll() { renderList(); renderMain(); }
  function covTag(cov) { return el("span", { class: "ctag cov-" + cov.status, text: P.COVERAGE_LABELS[cov.status] }); }
  function tag(text, cls) { return el("span", { class: "ctag " + (cls || ""), text }); }
  function renderList() {
    const ul = $("convList"); ul.replaceChildren();
    if (!convs.length) ul.append(el("li", { class: "muted small", text: available ? "None yet." : "Not available in this browser." }));
    convs.forEach((c) => {
      const cnt = P.counts(c), cov = P.coverage(c);
      const b = el("button", { type: "button", class: "conv-pick", "aria-current": c.id === selectedId ? "true" : null }, [
        el("span", { class: "conv-keep conv-pick-title", text: c.title }),
        el("span", { class: "conv-pick-meta" }, [plural(cnt.researcher_prompts, "prompt") + " · " + plural(cnt.ai_responses, "response") + (cnt.branches > 1 ? " · " + cnt.branches + " branches" : "") + " · ", covTag(cov)])
      ]);
      b.addEventListener("click", () => select(c.id));
      ul.append(el("li", {}, [b]));
    });
  }

  const VIEWS = [["conv", "Conversation"], ["prompts", "Prompts"], ["claims", "Claims"], ["analysis", "Analysis"], ["timeline", "Timeline"], ["branches", "Branches"]];
  function renderMain() {
    const box = $("convMain"); box.replaceChildren();
    const c = current();
    if (!c) {
      box.append(el("h3", { class: "h-small", text: "No conversation open" }),
        el("p", { class: "hint", text: "To document a conversation you are about to have, tick “Research conversation” in Build, step 7, and copy the prompt: the session appears here. To record a conversation you have already had, choose New conversation and import its transcript or the provider's data export." }));
      return;
    }
    box.append(headerView(c), aboutView(c), coverageView(c), toolsView(c), el("p", { class: "status", id: "convStatus", role: "status" }));
    const open = c.discrepancies.filter((d) => !d.resolved);
    if (open.length) box.append(el("p", { class: "notice warn", text: plural(open.length, "difference") + " between the AI's record and the original " + (open.length === 1 ? "is" : "are") + " shown below. The original wording is kept; the AI's wording is recorded with each difference, which is itself evidence about the reliability of AI-generated records." }));
    const seg = el("div", { class: "seg cv-views", role: "group", "aria-label": "View" });
    VIEWS.forEach(([v, label]) => seg.append(btn(label, () => { view = v; renderMain(); const b = $("convMain").querySelector('.cv-views button[aria-pressed="true"]'); if (b) b.focus(); }, "", { "aria-pressed": String(view === v) })));
    const adm = el("input", { type: "checkbox", id: "cvAdmin" }); adm.checked = showAdmin;
    adm.addEventListener("change", () => { showAdmin = adm.checked; renderMain(); });
    box.append(el("div", { class: "cv-view" }, [seg, (view === "conv" || view === "prompts") ? el("label", { class: "check" }, [adm, el("span", { text: "Show administrative messages" })]) : null]));
    if (view === "prompts") box.append(promptsView(c));
    else if (view === "claims") box.append(claimsView(c));
    else if (view === "analysis") box.append(analysisView(c));
    else if (view === "timeline") box.append(timelineView(c));
    else if (view === "branches") box.append(branchesView(c));
    else box.append(conversationView(c), addTurnForm(c));
  }
  function headerView(c) {
    const title = el("input", { id: "cvTitle", class: "conv-keep", value: c.title });
    title.addEventListener("change", () => { c.title = title.value.trim() || "Research conversation"; saveSoon(c); renderList(); });
    const inc = el("input", { type: "checkbox", id: "cvInclude" }); inc.checked = c.includeInReport !== false;
    inc.addEventListener("change", () => { c.includeInReport = inc.checked; saveSoon(c); });
    return el("div", { class: "cv-head" }, [
      el("label", { for: "cvTitle", text: "Title" }), title,
      el("p", { class: "cv-meta" }, [
        c.sessionId ? el("span", {}, ["Session ", el("code", { text: c.sessionId })]) : el("span", { text: "No research session identifier" }), " · ",
        c.protocolVersion ? "Protocol SPL-RSP " + c.protocolVersion + (c.reminders ? (c.reminders === "off" ? ", no reminders" : ", reminders about every " + c.reminders + " messages") : "") : "Protocol not used",
        c.promptCopiedAt ? " · Prompt copied " + niceTime(c.promptCopiedAt) : "", " · Session " + (c.sessionStatus === "ended" ? "ended" : "open")
      ]),
      el("label", { class: "check" }, [inc, el("span", { text: "Include this conversation in the methods report" })])
    ]);
  }
  function aboutView(c) {
    const det = el("details", { class: "cv-sub cv-about" });
    det.append(el("summary", { text: "About this conversation: purpose, study condition, final interpretation and notes" }));
    const mk = (id, label, value, rows, onchange, hint) => {
      const inp = rows ? el("textarea", { id, rows: String(rows), class: "conv-keep", dir: "auto" }) : el("input", { id, class: "conv-keep", value });
      if (rows) inp.value = value;
      inp.addEventListener("change", () => { onchange(inp.value); saveSoon(c); });
      return field(id, label, inp, hint);
    };
    det.append(
      mk("cvPurpose", "Research purpose of this conversation", c.purpose, 2, (v) => { c.purpose = v; }),
      c.question ? el("p", { class: "small" }, [el("strong", { text: "Research question: " }), el("span", { class: "conv-keep", text: c.question })]) : null
    );
    const cond = el("select", { id: "cvCond" });
    cond.append(el("option", { value: "custom", text: "Prompt from the Build tab" }));
    (A.CONDITIONS || []).forEach((x) => cond.append(el("option", { value: x.id, text: "Study condition " + x.n + ": " + x.name })));
    cond.value = c.condition || "custom";
    cond.addEventListener("change", () => { c.condition = cond.value; saveSoon(c); });
    const design = el("select", { id: "cvDesign" });
    [["", "Not stated"], ["standardised", "Standardised: predetermined follow-up prompts"], ["adaptive", "Adaptive: follow-ups respond to the answers"]].forEach(([v, l]) => design.append(el("option", { value: v, text: l })));
    design.value = c.sequenceDesign || "";
    design.addEventListener("change", () => { c.sequenceDesign = design.value; saveSoon(c); });
    const status = el("select", { id: "cvStatusSel" });
    [["open", "Open: the conversation may continue"], ["ended", "Ended: documentation of this session is complete"]].forEach(([v, l]) => status.append(el("option", { value: v, text: l })));
    status.value = c.sessionStatus;
    status.addEventListener("change", () => { c.sessionStatus = status.value; c.events.push({ type: "session_" + status.value, at: now(), lab_version: A.VERSION }); save(c).then(renderMain); });
    const adm = el("input", { type: "checkbox", id: "cvScoreAdmin" }); adm.checked = c.scoreAdmin;
    adm.addEventListener("change", () => { c.scoreAdmin = adm.checked; save(c).then(renderMain); });
    det.append(
      el("div", { class: "row" }, [field("cvCond", "Study condition", cond), mk("cvGroup", "Comparison group", c.group, 0, (v) => { c.group = v.trim(); }, "Conversations with the same group are compared in the Sensitivity study.")]),
      field("cvDesign", "Follow-up sequence", design, "A standardised sequence uses the same follow-up prompts in every condition; an adaptive sequence responds to the answers. They answer different questions."),
      field("cvStatusSel", "Session", status),
      mk("cvFinal", "Final interpretation, in your own words (optional)", c.finalInterpretation, 3, (v) => { c.finalInterpretation = v; }),
      mk("cvNotes", "Methodological notes", c.notes, 3, (v) => { c.notes = v; }),
      el("label", { class: "check" }, [adm, el("span", { text: "Score administrative messages too (they are excluded by default and always kept in the record)" })])
    );
    return det;
  }
  function coverageView(c) {
    const cnt = P.counts(c), cov = P.coverage(c);
    const covText = cov.status === "complete" ? "You confirmed that this record is complete" + (cov.basis === "compared_with_original" ? ", and it has been compared with the original conversation." : cov.basis === "provider_export" ? ", from the provider's export." : ".")
      : cov.status === "partial" ? "Part of the conversation is known to be missing (see the gaps below)."
      : cnt.turns === 0 ? "Nothing is recorded yet."
      : cov.basis === "ai_reported" ? "Only a record written by the AI system is available. Import the transcript or the provider's export so the Lab can check it."
      : "Not yet confirmed. When you have checked the record against the conversation, confirm that it is complete.";
    const box = el("div", { class: "cv-cov" }, [
      el("p", {}, [el("strong", { text: "Coverage: " }), covTag(cov), " ", covText]),
      el("p", { class: "small muted", text: [plural(cnt.researcher_prompts, "researcher prompt"), plural(cnt.ai_responses, "AI response"), plural(cnt.administrative, "administrative message"), plural(cnt.gaps, "gap")].concat(cnt.branches > 1 ? [cnt.branches + " branches"] : []).join(" · ") })
    ]);
    if (cov.status !== "partial" && c.turns.length) {
      box.append(btn(c.completeConfirmed ? "Withdraw my confirmation" : "Confirm that the record is complete", () => {
        if (!c.completeConfirmed && !confirm("Confirm that every researcher prompt and every response in this conversation is recorded here? Only confirm this after checking the record against the conversation itself.")) return;
        c.completeConfirmed = !c.completeConfirmed;
        c.events.push({ type: c.completeConfirmed ? "complete_confirmed" : "complete_withdrawn", at: now(), lab_version: A.VERSION });
        save(c).then(renderAll, (e) => say(failMessage(e)));
      }));
    }
    return box;
  }
  function toolsView(c) {
    const outstanding = P.outstandingFields(c.metadata, c).length;
    const conflicts = P.FIELDS.filter((f) => P.fieldConflict(c.metadata[f.id])).length;
    const tools = el("div", { class: "actions cv-tools" });
    tools.append(btn("Import a record, transcript or export", () => openImport(c), ""),
      btn("Metadata" + (conflicts ? ": sources disagree on " + plural(conflicts, "item") : outstanding ? ": " + plural(outstanding, "required item") + " outstanding" : ": required items done"), () => openMeta(c), "ghost"),
      btn("Design a follow-up prompt", () => openBuilder(c), "ghost"),
      btn("Redacted copy", () => openRedaction(c), "ghost"),
      exportMenu(c),
      btn("Delete conversation", () => {
        if (!confirm("Delete “" + c.title + "”, with its " + plural(c.turns.length, "turn") + ", " + plural(c.artefacts.length, "imported record") + ", its evaluations and its Claim History? This cannot be undone. Back up the project first if you may need it.")) return;
        run(["conversations", "artefacts"], "readwrite", (t) => { t.objectStore("conversations").delete(c.id); deleteWhere(t, "artefacts", "convId", c.id); }).then(() => {
          convs = convs.filter((x) => x.id !== c.id); selectedId = convs.length ? convs[convs.length - 1].id : ""; renderAll(); renderStudy(); say("Conversation deleted.");
        }, (e) => say(failMessage(e)));
      }, "ghost danger"));
    return tools;
  }

  /* ---------- the conversation view: the active path, with versions where the conversation branches ---------- */
  function conversationView(c) {
    const list = el("div", { class: "cv-turns" });
    const path = P.activePath(c);
    const gapsAt = (id) => c.gaps.filter((g) => g.after_turn === id);
    gapsAt(null).forEach((g) => list.append(gapRow(c, g)));
    path.forEach((t) => {
      if (!showAdmin && t.kind === "administrative") return;
      list.append(turnView(c, t, path));
      c.discrepancies.filter((d) => d.status === "ai_only" && d.turn_id === t.turn_id).forEach((d) => list.append(aiOnlyRow(c, d)));
      gapsAt(t.turn_id).forEach((g) => list.append(gapRow(c, g)));
    });
    if (!c.turns.length) list.append(el("p", { class: "hint", text: c.prompt ? "The prompt you copied is stored with this session. Import the AI system's record, the transcript or the provider's export when you have them, or add turns one by one below." : "Import the transcript of the conversation or the provider's data export, or add turns one by one below." }));
    return list;
  }
  function positionNote(c, t, path) {
    const pos = path.indexOf(t) + 1;
    return pos && parseInt(t.turn_id.slice(1), 10) === pos ? null : el("span", { class: "muted small", text: pos ? " (turn " + pos + " in the conversation)" : "" });
  }
  function versionNav(c, t) {
    const sibs = P.siblingsOf(c, t);
    if (sibs.length < 2) return null;
    const i = sibs.indexOf(t);
    const go = (k) => { c.activeLeaf = P.deepestLeaf(c, sibs[k].turn_id); save(c).then(() => { renderMain(); const n = $("turn-" + sibs[k].turn_id); if (n) n.querySelector(".cv-tid").focus(); }); };
    return el("div", { class: "cv-versions", role: "group", "aria-label": "Versions of this " + (t.role === "ai" ? "response" : "prompt") }, [
      btn("Previous version", () => go(i - 1), "ghost small-btn", { disabled: i === 0 }),
      el("span", { class: "small", text: (t.role === "ai" ? "Response" : "Prompt") + " version " + (i + 1) + " of " + sibs.length + (t.role === "ai" ? " (regenerated)" : " (edited)") }),
      btn("Next version", () => go(i + 1), "ghost small-btn", { disabled: i === sibs.length - 1 })
    ]);
  }
  function turnView(c, t, path) {
    const isR = t.role === "researcher";
    const art = el("article", { class: "cv-turn " + (isR ? "is-r" : "is-a") + (t.kind === "administrative" ? " is-admin" : ""), id: "turn-" + t.turn_id, "aria-labelledby": "th-" + t.turn_id });
    const st = t.text_status, ver = t.provenance.verification;
    const head = el("p", { class: "cv-turn-head", id: "th-" + t.turn_id }, [
      el("strong", { class: "cv-tid", text: t.turn_id, tabindex: "-1" }), positionNote(c, t, path), " ", isR ? "Researcher prompt" : "AI response", t.kind === "administrative" ? " · administrative" : "", " ",
      tag(P.TEXT_STATUSES[st], st === "original" ? "ok" : st === "ai_reproduced" || st === "reconstructed" ? "warn" : ""), ver !== "unreviewed" ? tag(P.VERIFICATIONS[ver], "ok") : null,
      t.matchesCopiedPrompt ? tag("Matches the prompt copied from the Lab", "ok") : null, t.timestamp ? el("span", { class: "muted small", text: " " + t.timestamp }) : null,
      t.model && t.model.value ? el("span", { class: "muted small conv-keep", text: " · model " + t.model.value }) : null
    ]);
    const text = el("div", { class: "cv-text conv-keep", dir: "auto", text: t.text });
    art.append(head, versionNav(c, t), text);
    if (t.text.length > 1400) {
      text.classList.add("clamped");
      const more = btn("Show the whole text", () => { const open = text.classList.toggle("clamped"); more.setAttribute("aria-expanded", String(!open)); more.textContent = open ? "Show the whole text" : "Show less"; }, "ghost small-btn", { "aria-expanded": "false" });
      art.append(more);
    }
    c.discrepancies.filter((d) => d.turn_id === t.turn_id && d.status !== "ai_only").forEach((d) => art.append(discrepancyView(c, t, d)));
    if (t.corrections.length) art.append(el("details", { class: "cv-sub" }, [el("summary", { text: "Corrected by the researcher (" + t.corrections.length + ")" }),
      el("ol", {}, t.corrections.map((x) => el("li", {}, [el("span", { class: "muted small", text: niceTime(x.at) + (x.reason ? " · " + x.reason : "") }), el("div", { class: "cv-text conv-keep small", dir: "auto", text: "Before: " + x.old })])))]));
    if (isR && t.designedId) art.append(designedView(c, t));
    if (isR && t.kind !== "administrative") art.append(classifyView(c, t));
    if (!isR && (t.kind !== "administrative" || c.scoreAdmin)) art.append(evaluateView(c, t, path));
    const claimsHere = c.claims.filter((cl) => cl.turn_id === t.turn_id || cl.events.some((e) => e.turn_id === t.turn_id));
    if (claimsHere.length) art.append(el("p", { class: "small" }, [el("strong", { text: "Claims: " }), ...claimsHere.map((cl) => btn(cl.id + (cl.turn_id === t.turn_id ? " introduced" : " · " + (P.CLAIM_EVENTS[(cl.events.find((e) => e.turn_id === t.turn_id) || {}).type] || "").toLowerCase()), () => { view = "claims"; renderMain(); const n = $("claim-" + cl.id); if (n) { n.scrollIntoView({ block: "start" }); n.focus(); } }, "ghost small-btn"))]));
    art.append(detailsView(c, t, path), turnActions(c, t));
    return art;
  }
  function diffView(other, mine) {
    const box = el("div", { class: "cv-diff conv-keep", dir: "auto" });
    P.diffWords(other, mine).forEach((p) => box.append(p.t === "same" ? document.createTextNode(p.s) : el(p.t === "del" ? "del" : "ins", { text: p.s })));
    return box;
  }
  function discrepancyView(c, t, d) {
    const box = el("div", { class: "cv-disc" + (d.resolved ? " is-done" : "") }, [el("p", {}, [el("strong", { text: P.DISCREPANCY_LABELS[d.status] + "." }), d.resolved ? " Reviewed." : ""])]);
    if (d.text != null && d.status !== "ai_omitted") {
      const which = d.status === "differs_from_copied_prompt" ? "the prompt copied from the Lab" : d.status === "conflict" ? "the other record" : "the AI's wording";
      box.append(el("details", {}, [el("summary", { text: "Compare with " + which }),
        el("p", { class: "small muted", text: "Struck through: only in " + which + ". Underlined: only in the text recorded above." }), diffView(d.text, t.text)]));
    }
    if (!d.resolved) box.append(btn("Mark as reviewed", () => { d.resolved = true; save(c).then(renderMain, (e) => say(failMessage(e))); }));
    return box;
  }
  function aiOnlyRow(c, d) {
    const box = el("div", { class: "cv-disc cv-aionly" + (d.resolved ? " is-done" : "") }, [el("p", {}, [el("strong", { text: P.DISCREPANCY_LABELS.ai_only + "." }), " It is not in the original conversation, so it was not added."]),
      el("div", { class: "cv-text conv-keep small", dir: "auto", text: d.text || "" })]);
    if (!d.resolved) box.append(btn("Mark as reviewed", () => { d.resolved = true; save(c).then(renderMain); }));
    return box;
  }
  function gapRow(c, g) {
    const whoBy = { ai: "reported by the AI system", lab_alignment: "found by the Lab in the record's numbering", researcher: "recorded by the researcher" }[g.reported_by] || "";
    const what = { researcher_prompt: "A researcher prompt is missing", ai_response: "An AI response is missing", both: "A prompt and its response are missing", unknown: "Something is missing" }[g.missing];
    const row = el("div", { class: "cv-gap" + (g.resolved ? " is-done" : ""), role: "note" }, [el("strong", { text: g.resolved ? "Gap filled. " : "Gap. " }), what + (whoBy ? " (" + whoBy + ")" : "") + ". ", g.reason ? el("span", { class: "conv-keep", text: g.reason }) : null]);
    if (!g.resolved) {
      row.append(" ", btn("Restore the missing turn here", () => { openInsert(c, g.after_turn, g.missing === "ai_response" ? "ai" : "researcher"); }),
        " ", btn("Mark as filled", () => {
          if (!confirm("Mark this gap as filled? Do this only once the missing turn has been added to the record.")) return;
          g.resolved = true; g.resolved_by = "researcher"; save(c).then(renderAll, (e) => say(failMessage(e)));
        }));
    }
    return row;
  }
  function designedView(c, t) {
    const d = c.designedPrompts.find((x) => x.id === t.designedId);
    if (!d) return null;
    const same = P.normaliseText(d.text) === P.normaliseText(t.text);
    return el("details", { class: "cv-sub" }, [el("summary", { text: "Designed in the Lab as " + d.id + (same ? ": submitted exactly as designed" : ": the submitted prompt differs from the design") }),
      same ? null : el("p", { class: "small muted", text: "Struck through: only in the designed prompt. Underlined: only in the prompt actually submitted." }), same ? null : diffView(d.text, t.text)]);
  }
  function classifyView(c, t) {
    const det = el("details", { class: "cv-sub" });
    const sum = el("summary");
    const label = () => {
      const mine = t.classification.filter((x) => x.status !== "suggested"), sug = t.classification.filter((x) => x.status === "suggested");
      sum.textContent = "Purpose of this prompt: " + (mine.length ? mine.map((x) => P.labelOf(x.category) + (x.note ? " (" + x.note + ")" : "")).join(", ") : "not classified") + (sug.length ? " · " + plural(sug.length, "suggestion") + " from the AI record to review" : "");
    };
    label();
    const sug = t.classification.filter((x) => x.status === "suggested");
    if (sug.length) det.append(el("div", { class: "cv-sug" }, [el("p", { class: "small", text: "The AI-generated record suggests these purposes. They count only once you accept them." }),
      ...sug.map((x) => el("span", { class: "row-inline" }, [tag(P.labelOf(x.category)), btn("Accept", () => { x.status = "researcher"; save(c).then(renderMain); }), btn("Reject", () => { t.classification = t.classification.filter((y) => y !== x); save(c).then(renderMain); })]))]));
    const grid = el("div", { class: "cv-tax", role: "group", "aria-label": "Purpose of prompt " + t.turn_id });
    let note;
    P.TAXONOMY.forEach((x) => {
      const id = "tx-" + t.turn_id + "-" + x.id, cb = el("input", { type: "checkbox", id });
      cb.checked = t.classification.some((y) => y.category === x.id && y.status !== "suggested");
      cb.addEventListener("change", () => {
        t.classification = t.classification.filter((y) => y.category !== x.id);
        if (cb.checked) t.classification.push({ category: x.id, status: "researcher" });
        if (x.id === "researcher_defined") note.hidden = !cb.checked;
        label(); saveSoon(c);
      });
      grid.append(el("label", { class: "check", for: id, title: x.def }, [cb, el("span", {}, [x.label, el("small", { text: x.def })])]));
    });
    const rd = t.classification.find((y) => y.category === "researcher_defined");
    note = el("input", { "aria-label": "Your own category for prompt " + t.turn_id, placeholder: "Name your own category", value: rd && rd.note ? rd.note : "" });
    note.hidden = !rd;
    note.addEventListener("change", () => { const x = t.classification.find((y) => y.category === "researcher_defined"); if (x) { x.note = note.value.trim(); label(); saveSoon(c); } });
    det.append(sum, el("p", { class: "hint", text: "Choose every purpose that applies. The classification is kept beside the prompt and never changes its wording." }), grid, note);
    return det;
  }
  function promptBefore(path, t) {
    const i = path.indexOf(t);
    for (let k = i - 1; k >= 0; k--) if (path[k].role === "researcher") return path[k];
    return null;
  }
  function evaluateView(c, t, path) {
    const ev = t.evaluation;
    const get = () => t.evaluation || (t.evaluation = { scores: {}, na: {}, evaluator: "", notes: "", at: "" });
    const det = el("details", { class: "cv-sub" });
    const sum = el("summary");
    const label = () => {
      const e = t.evaluation, n = e ? Object.keys(e.scores).length : 0, na = e ? Object.keys(e.na).length : 0;
      sum.textContent = "Evaluation: " + (n || na ? plural(n, "criterion", "criteria") + " scored" + (na ? ", " + na + " not applicable" : "") : "not yet scored");
    };
    label();
    const rows = el("div", { class: "cv-eval" });
    CRIT.forEach((cr) => {
      const id = "ev-" + t.turn_id + "-" + cr.id;
      const sel = el("select", { id });
      [["", "–"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["na", "Not applicable"]].forEach(([v, l]) => sel.append(el("option", { value: v, text: l })));
      sel.value = ev && ev.na[cr.id] ? "na" : ev && ev.scores[cr.id] ? ev.scores[cr.id] : "";
      const reason = el("input", { "aria-label": "Why " + cr.label.toLowerCase() + " does not apply to " + t.turn_id, placeholder: "Why it does not apply (required)", value: ev && ev.na[cr.id] ? ev.na[cr.id] : "" });
      reason.hidden = sel.value !== "na";
      const apply = () => {
        const e = get();
        delete e.scores[cr.id]; delete e.na[cr.id];
        if (/^[1-5]$/.test(sel.value)) e.scores[cr.id] = sel.value;
        if (sel.value === "na") { reason.hidden = false; if (reason.value.trim()) e.na[cr.id] = reason.value.trim(); else reason.focus(); }
        else reason.hidden = true;
        e.at = now(); label(); saveSoon(c);
      };
      sel.addEventListener("change", apply); reason.addEventListener("change", apply);
      rows.append(el("div", { class: "cv-crit" }, [el("label", { for: id }, [cr.label, el("small", { text: cr.help })]), sel, reason]));
    });
    const evId = "evr-" + t.turn_id, ntId = "evn-" + t.turn_id;
    const whoIn = el("input", { id: evId, value: ev ? ev.evaluator : "", placeholder: "Initials or role" });
    const notes = el("textarea", { id: ntId, rows: "2" }); notes.value = ev ? ev.notes : "";
    whoIn.addEventListener("change", () => { get().evaluator = whoIn.value.trim(); saveSoon(c); });
    notes.addEventListener("change", () => { get().notes = notes.value; saveSoon(c); });
    const pr = promptBefore(path, t);
    const prev = pr ? promptBefore(path, pr) : null;
    det.append(sum, el("p", { class: "hint", text: "Score this response on the six criteria, 1 (poor) to 5 (strong). Your scores are researcher-confirmed. Mark a criterion not applicable only with a reason; it is not a score and is never averaged." }),
      el("details", { class: "cv-prompt-ref" }, [el("summary", { text: "The prompt this answers" + (pr ? " (" + pr.turn_id + ")" : "") }), el("div", { class: "cv-text conv-keep small", dir: "auto", text: pr ? pr.text : "No researcher prompt is recorded before this response." })]),
      prev || (pr && path.indexOf(pr) > 0) ? el("details", { class: "cv-prompt-ref" }, [el("summary", { text: "The exchange before it" }), el("div", { class: "cv-text conv-keep small", dir: "auto", text: (() => { const i = path.indexOf(pr); return path.slice(Math.max(0, i - 2), i).map((x) => x.turn_id + ": " + short(x.text, 600)).join("\n\n"); })() })]) : null,
      rows, field(evId, "Evaluator", whoIn), field(ntId, "Evaluation notes", notes), suggestionsView(c, t, pr));
    return det;
  }
  // suggestions from the automatic checks and from a second AI model: kept beside the scores, never in their place
  function suggestionsView(c, t, pr) {
    const box = el("div", { class: "cv-sugbox" });
    const get = () => t.evaluation || (t.evaluation = { scores: {}, na: {}, evaluator: "", notes: "", at: "" });
    const show = () => {
      box.replaceChildren(el("p", { class: "label-like", text: "Suggestions (not scores)" }));
      const e = t.evaluation || {};
      const line = (label, s) => s && Object.keys(s.scores || {}).length ? el("p", { class: "small" }, [el("strong", { text: label + ": " }), CRIT.filter((cr) => s.scores[cr.id] && s.scores[cr.id].score != null).map((cr) => cr.label + " " + s.scores[cr.id].score).join("; ")]) : null;
      if (e.checks) box.append(el("p", { class: "small", text: "Automatic checks: " + e.checks.summary + "." }), line("Suggested by the checks", e.checks));
      if (e.second) box.append(line("Second-model assessment" + (e.second.model ? " by " + e.second.model : ""), e.second), e.second.overall ? el("p", { class: "small conv-keep", text: "“" + e.second.overall + "”" }) : null);
      box.append(el("div", { class: "actions" }, [
        A.checkOutput ? btn("Check this response's quotations against the sources", () => { const r = A.checkOutput(t.text); get().checks = { summary: r.summary, scores: r.suggested, at: now() }; saveSoon(c); show(); say(r.summary + "."); }) : null,
        A.evalPrompt ? btn("Copy a second-model evaluation prompt", () => A.copy && A.copy(A.evalPrompt(pr ? pr.text : "", t.text), "convStatus")) : null]));
      if (A.parseEval) {
        const mId = "smm-" + t.turn_id, rId = "smr-" + t.turn_id;
        const m = el("input", { id: mId, placeholder: "The evaluating system and its version" }), r = el("textarea", { id: rId, rows: "3", placeholder: "Paste the evaluator's reply (JSON)" });
        box.append(el("details", { class: "cv-sub" }, [el("summary", { text: "Record a second-model assessment" }),
          el("p", { class: "hint", text: "Paste the prompt into a different AI system, then its reply here. Its scores are recorded as suggestions; they do not count until you choose your own scores above." }),
          field(mId, "Evaluator", m), field(rId, "Evaluator's reply", r),
          btn("Record as suggestions", () => { const v = A.parseEval(r.value); if (!v.ok) { say(v.error); return; } get().second = { scores: v.scores, model: m.value.trim() || v.model || "", overall: v.overall || "", errors: (v.errors || []).length, at: now() }; saveSoon(c); show(); say("Second-model assessment recorded as suggestions."); }, "")]));
      }
    };
    show();
    return box;
  }
  // per-turn details: developments, references, the model, provenance and the records that attest it
  function detailsView(c, t, path) {
    const det = el("details", { class: "cv-sub cv-details" });
    const on = Object.keys(t.flags || {}).filter((k) => t.flags[k] && t.flags[k].on);
    det.append(el("summary", { text: "Details" + (on.length ? ": " + on.map((k) => P.FLAG_LABELS[k].toLowerCase()).join("; ") : "") + (t.refs.length ? " · refers to " + t.refs.join(", ") : "") }));
    const keys = t.role === "ai" ? ["error", "evidence", "scope", "theory"] : ["evidence", "instruction", "scope", "theory", "correction", "decision"];
    const box = el("div", { class: "cv-flags" });
    keys.forEach((k) => {
      const f = t.flags[k] || { on: false, note: "", ref: "", sources: "" };
      const id = "fl-" + t.turn_id + "-" + k, cb = el("input", { type: "checkbox", id }); cb.checked = !!f.on;
      const noteIn = el("input", { "aria-label": P.FLAG_LABELS[k] + ": note for " + t.turn_id, placeholder: "Note", value: f.note || "", class: "conv-keep" });
      const extra = [];
      if (k === "evidence") { const s = el("input", { "aria-label": "Source identifiers introduced at " + t.turn_id, placeholder: "Source identifiers, e.g. DOC-03", value: f.sources || "" }); s.addEventListener("change", () => { (t.flags[k] = t.flags[k] || { on: true }).sources = s.value.trim(); saveSoon(c); }); extra.push(s); }
      if (k === "error") {
        const s = el("select", { "aria-label": "Same error as an earlier response" });
        s.append(el("option", { value: "", text: "A new error" }));
        path.filter((x) => x.role === "ai" && path.indexOf(x) < path.indexOf(t) && x.flags && x.flags.error && x.flags.error.on).forEach((x) => s.append(el("option", { value: x.turn_id, text: "The same error as in " + x.turn_id + " (persistent)" })));
        s.value = f.ref || "";
        s.addEventListener("change", () => { (t.flags[k] = t.flags[k] || { on: true }).ref = s.value; saveSoon(c); });
        extra.push(s);
      }
      const set = () => { if (cb.checked) t.flags[k] = Object.assign({}, t.flags[k] || {}, { on: true, note: noteIn.value.trim() }); else delete t.flags[k]; saveSoon(c); };
      cb.addEventListener("change", set); noteIn.addEventListener("change", set);
      box.append(el("div", { class: "cv-flag" }, [el("label", { class: "check", for: id }, [cb, el("span", { text: P.FLAG_LABELS[k] })]), noteIn].concat(extra)));
    });
    const refId = "rf-" + t.turn_id, refs = el("input", { id: refId, value: t.refs.join(", "), placeholder: "e.g. T003, T005" });
    refs.addEventListener("change", () => { const ids = new Set(c.turns.map((x) => x.turn_id)); t.refs = refs.value.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter((x) => ids.has(x) && x !== t.turn_id); refs.value = t.refs.join(", "); saveSoon(c); });
    const modId = "md-" + t.turn_id, model = el("input", { id: modId, class: "conv-keep", value: t.model && t.model.value ? t.model.value : "", placeholder: "Only if this turn came from a different model" });
    model.addEventListener("change", () => { t.model = model.value.trim() ? { value: model.value.trim(), origin: "researcher_reported" } : null; saveSoon(c); });
    det.append(box, field(refId, "Earlier turns this turn refers to", refs), t.role === "ai" ? field(modId, "Model that produced this response", model, t.model && t.model.origin !== "researcher_reported" ? P.ORIGINS[t.model.origin] + "." : "") : null,
      el("dl", { class: "cv-dl small" }, [
        el("dt", { text: "Origin" }), el("dd", { text: P.ORIGINS[t.provenance.origin] + (t.provenance.source_ref ? " (" + t.provenance.source_ref + ")" : "") }),
        el("dt", { text: "Verification" }), el("dd", { text: P.VERIFICATIONS[t.provenance.verification] }),
        el("dt", { text: "Recorded" }), el("dd", { text: t.provenance.recorded_at ? niceTime(t.provenance.recorded_at) : "not recorded" }),
        el("dt", { text: "Imported records" }), el("dd", { text: t.attested_by.length ? t.attested_by.join(", ") : "none (entered by hand)" }),
        el("dt", { text: "Follows" }), el("dd", { text: t.parent_id || "the start of the conversation" }),
        t.regenerated_from ? el("dt", { text: "Regenerated" }) : null, t.regenerated_from ? el("dd", { text: "another version of " + t.regenerated_from }) : null,
        t.edited_from ? el("dt", { text: "Edited prompt" }) : null, t.edited_from ? el("dd", { text: "a revised version of " + t.edited_from }) : null,
        el("dt", { text: "SHA-256" }), el("dd", { class: "mono", text: t.sha256 ? t.sha256 : "not yet computed" })
      ]),
      el("p", { class: "hint", text: "A fingerprint shows whether the stored text has changed since it was recorded. It cannot show that the text was accurate in the first place." }));
    return det;
  }
  function turnActions(c, t) {
    const bar = el("div", { class: "cv-actions" });
    bar.append(btn(t.kind === "administrative" ? "Mark as substantive" : "Mark as administrative", () => { t.kind = t.kind === "administrative" ? "substantive" : "administrative"; save(c).then(renderAll); }));
    if (t.text_status !== "original" && t.provenance.verification === "unreviewed") {
      bar.append(btn("I have checked this wording", () => {
        if (!confirm("Confirm that this wording matches the conversation itself? It stays labelled as " + P.TEXT_STATUSES[t.text_status].toLowerCase() + ", with your confirmation recorded.")) return;
        t.provenance.verification = "researcher_confirmed"; t.provenance.confirmed_at = now(); save(c).then(renderMain);
      }));
    }
    bar.append(btn("Correct the wording", () => openCorrection(c, t, bar)));
    bar.append(btn("Insert a turn after this", () => openInsert(c, t.turn_id, t.role === "ai" ? "researcher" : "ai")));
    if (t.role === "ai") bar.append(btn("Add a regenerated response", () => openInsert(c, t.turn_id, "ai", { siblingOf: t.turn_id })), btn("Record a claim from this response", () => { view = "claims"; renderMain(); const s = $("clTurn"); if (s) { s.value = t.turn_id; const w = $("clText"); const sel = String(window.getSelection ? window.getSelection() : ""); if (w && sel && t.text.includes(sel)) w.value = sel; if (w) w.focus(); } }));
    else bar.append(btn("Add an edited version of this prompt", () => openInsert(c, t.turn_id, "researcher", { siblingOf: t.turn_id })));
    bar.append(btn("Remove", () => {
      const kids = P.childrenOf(c, t.turn_id);
      if (!confirm("Remove " + t.turn_id + " from this conversation?" + (kids.length ? " The turns that follow it will follow the turn before it." : "") + " The imported records it came from are kept.")) return;
      kids.forEach((k) => { k.parent_id = t.parent_id; });
      c.turns = c.turns.filter((x) => x !== t);
      if (c.activeLeaf === t.turn_id) c.activeLeaf = t.parent_id;
      c.events.push({ type: "turn_removed", at: now(), detail: t.turn_id, lab_version: A.VERSION });
      save(c).then(renderAll, (e) => say(failMessage(e)));
    }));
    return bar;
  }
  function openCorrection(c, t, bar) {
    if (bar.querySelector("form")) return;
    const taId = "fx-" + t.turn_id, rsId = "fr-" + t.turn_id;
    const ta = el("textarea", { id: taId, rows: "6", class: "conv-keep", dir: "auto" }); ta.value = t.text;
    const rs = el("input", { id: rsId, placeholder: "e.g. the AI's record dropped a sentence; corrected from the application" });
    const f = el("form", { class: "cv-fix" }, [el("label", { for: taId, text: "Corrected wording" }), ta, el("label", { for: rsId, text: "Reason (required)" }), rs,
      el("div", { class: "actions" }, [el("button", { type: "submit", text: "Save the correction" }), btn("Cancel", () => f.remove(), "ghost")])]);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!rs.value.trim()) { rs.focus(); return; }
      if (ta.value === t.text) { f.remove(); return; }
      t.corrections.push({ old: t.text, new: ta.value, reason: rs.value.trim(), at: now() });
      t.text = ta.value; t.text_status = "researcher_corrected"; delete t.sha256;
      save(c).then(renderMain, (er) => say(failMessage(er)));
    });
    bar.append(f); ta.focus();
  }
  // add a turn by hand: at the end, after a given turn (restoring an omitted one), or as another version of a turn
  function openInsert(c, after, role, o) {
    o = o || {};
    view = "conv"; renderMain();
    const d = document.querySelector(".cv-add"); if (!d) return;
    d.open = true; d.dataset.after = after == null ? "start" : after; d.dataset.sibling = o.siblingOf || "";
    $("atRole").value = role; $("atRole").disabled = !!o.siblingOf;
    $("atWhere").textContent = o.siblingOf ? "This will be recorded as another version of " + o.siblingOf + ": " + (role === "ai" ? "a regenerated response." : "an edited prompt. Its continuation is recorded on this new branch.")
      : after ? "This will be inserted after " + after + "." : "This will be inserted at the start of the conversation.";
    d.scrollIntoView({ block: "start" }); $("atText").focus();
  }
  function addTurnForm(c) {
    const det = el("details", { class: "cv-add" });
    const path = P.activePath(c), last = path[path.length - 1];
    const role = el("select", { id: "atRole" });
    role.append(el("option", { value: "researcher", text: "Researcher prompt" }), el("option", { value: "ai", text: "AI response" }));
    role.value = last && last.role === "researcher" ? "ai" : "researcher";
    const text = el("textarea", { id: "atText", rows: "6", dir: "auto", class: "conv-keep" });
    const time = el("input", { id: "atTime", placeholder: "e.g. 2026-11-27 10:58 (optional)" });
    const designed = el("select", { id: "atDesigned" });
    designed.append(el("option", { value: "", text: "No: written directly in the AI system" }));
    c.designedPrompts.forEach((x) => designed.append(el("option", { value: x.id, text: x.id + ": " + short(x.text, 60) })));
    const where = el("p", { class: "hint", id: "atWhere", text: "Added at the end of the conversation shown." });
    det.append(el("summary", { text: "Add a turn by hand" }),
      el("p", { class: "hint", text: "Paste each message from the conversation in order. Pasted text is recorded as the original wording." }), where,
      field("atRole", "Who wrote it", role), field("atText", "Exact text", text), field("atTime", "Time shown in the application", time),
      c.designedPrompts.length ? field("atDesigned", "Was this a follow-up you designed in the Lab?", designed) : null,
      el("div", { class: "actions" }, [btn("Add this turn", () => {
        if (!text.value.trim()) { text.focus(); return; }
        const a = det.dataset.after || "", sib = det.dataset.sibling || "";
        const t = P.addTurn(c, { role: role.value, text: text.value, timestamp: time.value.trim() || null }, now(), sib ? { siblingOf: sib } : a === "start" ? { after: null } : a ? { after: a } : {});
        det.dataset.after = ""; det.dataset.sibling = ""; role.disabled = false;
        if (designed.value && t.role === "researcher") t.designedId = designed.value;
        c.events.push({ type: sib ? "version_added" : "turn_added", at: now(), detail: t.turn_id, lab_version: A.VERSION });
        save(c).then(() => { renderAll(); const d2 = document.querySelector(".cv-add"); if (d2) { d2.open = true; $("atText").focus(); } say(t.turn_id + " added."); }, (e) => say(failMessage(e)));
      }, "")]));
    return det;
  }

  /* ---------- prompt verification: every researcher prompt, its status, and the tools to check it ---------- */
  function promptsView(c) {
    const box = el("div", { class: "cv-prompts" });
    const path = P.activePath(c);
    const prompts = path.filter((t) => t.role === "researcher" && (showAdmin || t.kind !== "administrative"));
    const by = {}; prompts.forEach((t) => { const k = t.text_status === "original" || t.text_status === "researcher_corrected" ? "original" : t.provenance.verification !== "unreviewed" ? "checked" : "unchecked"; by[k] = (by[k] || 0) + 1; });
    box.append(el("p", {}, [el("strong", { text: "Researcher prompt history. " }), plural(prompts.length, "prompt") + ": " + (by.original || 0) + " from the original conversation, " + (by.checked || 0) + " reproduced by the AI and checked by you, " + (by.unchecked || 0) + " reproduced by the AI and not yet checked."]),
      el("p", { class: "hint", text: "An AI system's statement that it reproduced a prompt verbatim does not establish it. Check each prompt against the conversation itself, correct it, or restore a prompt that is missing." }));
    const seqText = () => P.promptSequence(c).join("\n\n----\n\n");
    box.append(el("div", { class: "actions" }, [btn("Copy the sequence of prompts", () => A.copy && A.copy(seqText(), "convStatus")),
      btn("Download the sequence (.txt)", () => A.download && A.download(slug(c.title) + "-prompt-sequence.txt", "Researcher prompts of " + c.title + ", in order, separated by ----\n\n" + seqText()))]));
    const ol = el("ol", { class: "cv-plist" });
    const openGaps = c.gaps.filter((g) => !g.resolved && g.missing !== "ai_response");
    if (openGaps.length) box.append(el("div", {}, [el("p", { class: "small", text: "Known gaps where a researcher prompt may be missing:" }), ...openGaps.map((g) => gapRow(c, g))]));
    prompts.forEach((t) => {
      const li = el("li", { id: "pv-" + t.turn_id }, [el("p", { class: "cv-turn-head" }, [el("strong", { class: "cv-tid", text: t.turn_id }), " ", tag(P.TEXT_STATUSES[t.text_status], t.text_status === "original" ? "ok" : "warn"), t.provenance.verification !== "unreviewed" ? tag(P.VERIFICATIONS[t.provenance.verification], "ok") : null,
        ...t.classification.filter((x) => x.status !== "suggested").map((x) => tag(P.labelOf(x.category)))]),
        el("div", { class: "cv-text conv-keep small", dir: "auto", text: t.text })]);
      c.discrepancies.filter((d) => d.turn_id === t.turn_id).forEach((d) => li.append(discrepancyView(c, t, d)));
      const bar = el("div", { class: "cv-actions" });
      if (t.text_status !== "original" && t.provenance.verification === "unreviewed") bar.append(btn("I have checked this wording", () => { t.provenance.verification = "researcher_confirmed"; t.provenance.confirmed_at = now(); save(c).then(renderMain); }));
      bar.append(btn("Correct the wording", () => openCorrection(c, t, bar)), btn("Restore an omitted prompt before this", () => { const p = path[path.indexOf(t) - 1]; openInsert(c, p ? p.turn_id : null, "researcher"); }));
      li.append(bar);
      ol.append(li);
    });
    box.append(ol);
    return box;
  }

  /* ---------- Claim History ---------- */
  function claimsView(c) {
    const box = el("div", { class: "cv-claims" });
    const path = P.activePath(c), aiTurns = path.filter((t) => t.role === "ai");
    box.append(el("p", { class: "hint", text: "Follow a consequential claim through the conversation: where it first appears, how it is challenged, what evidence is brought to it, and how it is reworded, qualified or withdrawn. Events are placed in order with their turns; the Lab never treats a later change as caused by an earlier prompt, or a change of wording as an improvement." }));
    // new claim
    const turnSel = el("select", { id: "clTurn" }); aiTurns.forEach((t) => turnSel.append(el("option", { value: t.turn_id, text: t.turn_id + ": " + short(t.text, 70) })));
    const text = el("textarea", { id: "clText", rows: "2", class: "conv-keep", dir: "auto" });
    const key = el("input", { id: "clKey", placeholder: "e.g. equality-extended (to compare the same claim across conversations)" });
    const sources = el("input", { id: "clSources", placeholder: "e.g. DOC-02 P1" });
    const msg = el("p", { class: "hint", role: "status" });
    const form = el("details", { class: "cv-sub" }, [el("summary", { text: "Record a claim" }),
      aiTurns.length ? field("clTurn", "Response in which it first appears", turnSel) : el("p", { class: "hint", text: "Record the conversation first: claims are taken from AI responses." }),
      field("clText", "The claim, in the response's own words", text, "Select the words in the response before choosing “Record a claim from this response”, or paste them here."),
      field("clSources", "Relevant source material", sources), field("clKey", "Comparable label (optional)", key),
      aiTurns.length ? btn("Record this claim", () => {
        if (!text.value.trim()) { text.focus(); return; }
        const t = c.turns.find((x) => x.turn_id === turnSel.value);
        const id = P.nextCode(c.claims, "CL");
        c.claims.push({ id, aiLabel: "", text: text.value.trim(), turn_id: turnSel.value, sources: sources.value.trim(), key: key.value.trim(), researcherReading: "", aiLater: "", outstanding: "", status: "confirmed", events: [] });
        c.events.push({ type: "claim_recorded", at: now(), detail: id, lab_version: A.VERSION });
        save(c).then(() => { renderMain(); say(id + " recorded." + (t && !t.text.includes(text.value.trim()) ? " Note: these words do not appear exactly in " + t.turn_id + "." : "")); });
      }, "") : null, msg]);
    box.append(form);
    if (!c.claims.length) box.append(el("p", { class: "muted", text: "No claims recorded yet." }));
    c.claims.forEach((cl) => box.append(claimCard(c, cl, path)));
    return box;
  }
  function claimCard(c, cl, path) {
    const first = c.turns.find((t) => t.turn_id === cl.turn_id);
    const exact = first && first.text.includes(cl.text);
    const card = el("section", { class: "cv-claim", id: "claim-" + cl.id, tabindex: "-1", "aria-labelledby": "clh-" + cl.id });
    card.append(el("h4", { id: "clh-" + cl.id }, [cl.id, cl.status === "suggested" ? " · suggested by the AI record, not confirmed" : "", cl.key ? " · " + cl.key : ""]),
      el("blockquote", { class: "conv-keep", dir: "auto", text: cl.text }),
      el("p", { class: "small" }, ["First appears in ", first ? btn(cl.turn_id, () => jumpTo(cl.turn_id)) : "an unlocated turn", first ? (exact ? " · the wording is found there exactly" : " · these words are not found exactly in that turn") : "", cl.sources ? " · sources: " + cl.sources : ""]));
    if (cl.status === "suggested") card.append(el("div", { class: "actions" }, [btn("Confirm this claim", () => { cl.status = "confirmed"; cl.events.forEach((e) => { e.origin = "researcher_reported"; }); save(c).then(renderMain); }, ""), btn("Discard the suggestion", () => { c.claims = c.claims.filter((x) => x !== cl); save(c).then(renderMain); })]));
    const txt = (id, label, k, hint) => { const t = el("textarea", { id, rows: "2", class: "conv-keep", dir: "auto" }); t.value = cl[k] || ""; t.addEventListener("change", () => { cl[k] = t.value; saveSoon(c); }); return field(id, label, t, hint); };
    card.append(el("details", { class: "cv-sub" }, [el("summary", { text: "Later wording, your interpretation and disagreements" }),
      txt("cla-" + cl.id, "The AI's later formulation", "aiLater"), txt("clr-" + cl.id, "Your own interpretation of the claim", "researcherReading", "Kept apart from the claim's original wording and the AI's later wording."), txt("clo-" + cl.id, "Outstanding disagreement", "outstanding")]));
    const tb = el("tbody");
    const pos = (id) => path.findIndex((t) => t.turn_id === id);
    cl.events.slice().sort((a, b) => pos(a.turn_id) - pos(b.turn_id)).forEach((e) => {
      const t = c.turns.find((x) => x.turn_id === e.turn_id), ev = t && t.evaluation;
      const sc = ev && Object.keys(ev.scores).length ? CRIT.filter((cr) => ev.scores[cr.id]).map((cr) => cr.label + " " + ev.scores[cr.id]).join("; ") : "";
      tb.append(el("tr", {}, [el("td", {}, [btn(e.turn_id, () => jumpTo(e.turn_id))]), el("td", { text: P.CLAIM_EVENTS[e.type] + (e.origin === "ai_reported" ? " (suggested)" : "") }), el("td", { class: "conv-keep", text: e.note || "" }), el("td", { text: sc || "–" }),
        el("td", {}, [btn("Remove", () => { cl.events = cl.events.filter((x) => x !== e); save(c).then(renderMain); }, "ghost small-btn", { "aria-label": "Remove the event at " + e.turn_id + " from " + cl.id })])]));
    });
    card.append(el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Development of " + cl.id }, [el("table", {}, [el("thead", {}, [el("tr", {}, ["Turn", "Development", "Note", "Researcher scores for that response", "Actions"].map((h) => el("th", { scope: "col", text: h })))]), tb])]));
    // add event
    const type = el("select", { id: "cet-" + cl.id }); Object.keys(P.CLAIM_EVENTS).filter((k) => k !== "introduced").forEach((k) => type.append(el("option", { value: k, text: P.CLAIM_EVENTS[k] })));
    const turn = el("select", { id: "cetu-" + cl.id }); path.filter((t) => pos(t.turn_id) > pos(cl.turn_id)).forEach((t) => turn.append(el("option", { value: t.turn_id, text: t.turn_id + " (" + (t.role === "ai" ? "AI" : "researcher") + "): " + short(t.text, 50) })));
    const note = el("input", { id: "cen-" + cl.id, class: "conv-keep", placeholder: "What happened to the claim here" });
    card.append(el("div", { class: "cv-claim-add" }, [field("cet-" + cl.id, "Development", type), field("cetu-" + cl.id, "Turn", turn), field("cen-" + cl.id, "Note", note),
      btn("Add this development", () => { if (!turn.value) return; cl.events.push({ type: type.value, turn_id: turn.value, note: note.value.trim(), origin: "researcher_reported" }); save(c).then(() => { renderMain(); const n = $("claim-" + cl.id); if (n) n.focus(); }); }, "")]));
    card.append(el("div", { class: "actions" }, [btn("Delete this claim", () => { if (confirm("Delete " + cl.id + " and its history?")) { c.claims = c.claims.filter((x) => x !== cl); save(c).then(renderMain); } }, "ghost danger small-btn")]));
    return card;
  }
  function jumpTo(id) {
    view = "conv"; showAdmin = true;
    const c = current();
    if (c && !P.activePath(c).some((t) => t.turn_id === id)) c.activeLeaf = P.deepestLeaf(c, id);
    renderMain();
    const n = $("turn-" + id);
    if (n) { n.scrollIntoView({ block: "start" }); const h = n.querySelector(".cv-tid"); if (h) h.focus(); }
  }

  /* ---------- analysis: observations, decisions, developments, reviews, checkpoints, AI notes ---------- */
  function analysisView(c) {
    const box = el("div", { class: "cv-analysis" });
    const path = P.activePath(c), ids = new Set(path.map((t) => t.turn_id));
    box.append(el("h4", { text: "Conversation-level observations" }),
      el("p", { class: "hint", text: "Qualitative observations about developments across the conversation. There is no overall score. Record which turns preceded a change; a sequence is not evidence that one turn caused another." }));
    const cat = el("select", { id: "obCat" }); P.OBSERVATION_CATEGORIES.forEach((x) => cat.append(el("option", { value: x.id, text: x.label })));
    const guide = el("div", { class: "cv-guide small" });
    const showGuide = () => { const x = P.OBSERVATION_CATEGORIES.find((y) => y.id === cat.value); guide.replaceChildren(el("p", {}, [el("strong", { text: "Definition: " }), x.def]), el("p", {}, [el("strong", { text: "How to assess: " }), x.guide]), el("p", {}, [el("strong", { text: "Example: " }), x.example]), el("p", {}, [el("strong", { text: "Limitation: " }), x.limit])); };
    cat.addEventListener("change", showGuide); showGuide();
    const text = el("textarea", { id: "obText", rows: "3", class: "conv-keep", dir: "auto" });
    const turns = el("input", { id: "obTurns", placeholder: "e.g. T005, T006, T008" });
    const conf = el("select", { id: "obConf" }); [["", "Not stated"], ["low", "Low"], ["medium", "Medium"], ["high", "High"]].forEach(([v, l]) => conf.append(el("option", { value: v, text: l })));
    box.append(el("div", { class: "cv-obform" }, [field("obCat", "Category", cat), guide, field("obText", "Observation", text), el("div", { class: "row" }, [field("obTurns", "Turns it rests on", turns), field("obConf", "Your confidence", conf)]),
      btn("Record this observation", () => {
        if (!text.value.trim()) { text.focus(); return; }
        const ts = turns.value.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter((x) => c.turns.some((t) => t.turn_id === x));
        c.observations.push({ id: P.nextCode(c.observations, "OB"), category: cat.value, text: text.value.trim(), turns: ts, confidence: conf.value, at: now() });
        save(c).then(renderMain);
      }, "")]));
    P.OBSERVATION_CATEGORIES.forEach((x) => {
      const list = c.observations.filter((o) => o.category === x.id);
      if (!list.length) return;
      box.append(el("h5", { text: x.label }), el("ul", { class: "cv-oblist" }, list.map((o) => el("li", {}, [el("strong", { text: o.id + " " }), el("span", { class: "conv-keep", text: o.text }), " ",
        ...o.turns.map((t) => btn(t, () => jumpTo(t))), o.confidence ? el("span", { class: "muted small", text: " · confidence " + o.confidence }) : null, " ",
        btn("Remove", () => { c.observations = c.observations.filter((y) => y !== o); save(c).then(renderMain); }, "ghost small-btn", { "aria-label": "Remove " + o.id })]))));
    });
    // decisions
    box.append(el("h4", { text: "Researcher decisions" }), el("p", { class: "hint", text: "The researcher's decisions are theirs to state. A decision the AI system infers, or one implied only because the conversation continued, is not a decision until you confirm it." }));
    const dText = el("textarea", { id: "dcText", rows: "2", class: "conv-keep", dir: "auto" });
    const dTurn = el("select", { id: "dcTurn" }); dTurn.append(el("option", { value: "", text: "Recorded here in the Lab, not in the conversation" }));
    path.filter((t) => t.role === "researcher").forEach((t) => dTurn.append(el("option", { value: t.turn_id, text: "Stated in " + t.turn_id + ": " + short(t.text, 60) })));
    box.append(field("dcText", "Decision", dText), field("dcTurn", "Where it is stated", dTurn), btn("Record this decision", () => {
      if (!dText.value.trim()) { dText.focus(); return; }
      c.decisions.push({ id: P.nextCode(c.decisions, "DC"), text: dText.value.trim(), status: dTurn.value ? "explicit" : "recorded", turn_id: dTurn.value || null, at: now() });
      save(c).then(renderMain);
    }, ""));
    if (c.decisions.length) box.append(el("ul", { class: "cv-oblist" }, c.decisions.map((d) => el("li", {}, [el("strong", { text: d.id + " " }), el("span", { class: "conv-keep", text: d.text }), " ", tag(P.DECISION_STATUSES[d.status], d.status === "ai_suggested" || d.status === "needs_confirmation" ? "warn" : "ok"),
      d.turn_id ? btn(d.turn_id, () => jumpTo(d.turn_id)) : null,
      d.status === "ai_suggested" || d.status === "needs_confirmation" ? btn("Confirm", () => { d.status = d.turn_id ? "explicit" : "recorded"; save(c).then(renderMain); }) : null,
      btn("Remove", () => { c.decisions = c.decisions.filter((y) => y !== d); save(c).then(renderMain); }, "ghost small-btn", { "aria-label": "Remove " + d.id })]))));
    // developments
    const dev = P.developments(c).filter((d) => d.type.indexOf("claim_") !== 0 && ids.has(d.turn_id));
    const pers = P.persistentErrors(c);
    box.append(el("h4", { text: "Developments recorded on turns" }), el("p", { class: "hint", text: "From the Details of each turn: evidence introduced, changes of instruction, scope or theory, errors and corrections." }),
      dev.length ? el("ul", { class: "cv-oblist" }, dev.map((d) => el("li", {}, [btn(d.turn_id, () => jumpTo(d.turn_id)), " " + P.FLAG_LABELS[d.type] + (d.note ? ": " : ""), d.note ? el("span", { class: "conv-keep", text: d.note }) : null, d.ref ? " (the same error as " + d.ref + ")" : ""]))) : el("p", { class: "muted", text: "None recorded." }),
      pers.length ? el("p", {}, [el("strong", { text: "Persistent errors: " }), pers.map((p) => p.turn_id + " repeats " + p.first).join("; ")]) : null);
    // reviews and checkpoints
    const rev = P.detectReviews(c);
    box.append(el("h4", { text: "Metadata reviews and checkpoints" }),
      el("p", { text: rev.length ? rev.map((r) => P.REVIEW_LABELS[r.type] + " at " + r.turn_id).join("; ") + "." : "No metadata review from the AI system appears in the recorded turns." }),
      c.checkpoints.length ? el("ul", { class: "cv-oblist" }, c.checkpoints.map((k) => el("li", { text: k.id + " · " + (k.record_type === "completed_session" ? "completed session record" : "checkpoint") + " imported " + niceTime(k.imported_at) + " · turns " + (k.firstTurn || "?") + " to " + (k.lastTurn || "?") + " · coverage the AI claimed: " + (k.claimed_coverage || "not stated") + (k.parts.length ? " · parts " + k.parts.map((p) => p.part + (p.total ? "/" + p.total : "")).join(", ") : "") }))) : el("p", { class: "muted", text: "No checkpoint or session record has been imported." }));
    if (c.aiNotes.length) box.append(el("h4", { text: "Notes written by the AI system" }), el("p", { class: "hint", text: "AI-generated summaries from the records it wrote. They are kept apart from the verbatim turns and are not evidence of what happened." }),
      ...c.aiNotes.map((n) => el("div", { class: "cv-text conv-keep small", dir: "auto", text: n.text })));
    return box;
  }

  /* ---------- timeline: discrete marks by turn; nothing is drawn between them ---------- */
  function timelineView(c) {
    const cols = P.timeline(c, CRIT);
    const box = el("div", { class: "cv-timeline" });
    box.append(el("p", { class: "hint", text: "One column per turn on the conversation shown. Scores are researcher-confirmed. A dot means not scored, “n/a” means not applicable, and no line is drawn between scores, so gaps and sparse scores are not turned into trends. Select a turn to open it." }));
    if (!cols.length) { box.append(el("p", { class: "muted", text: "Nothing is recorded yet." })); return box; }
    const head = el("tr", {}, [el("th", { scope: "col", text: "Turn" })].concat(cols.map((col) => el("th", { scope: "col" }, [btn(col.turn.turn_id, () => jumpTo(col.turn.turn_id), "ghost small-btn tl-turn", { "aria-label": col.turn.turn_id + ", " + (col.turn.role === "ai" ? "AI response" : "researcher prompt") })]))));
    const row = (label, fn) => el("tr", {}, [el("th", { scope: "row", text: label })].concat(cols.map((col) => { const v = fn(col); return el("td", { class: v && v.cls ? v.cls : "" }, v && v.node ? [v.node] : [v && v.text != null ? v.text : ""]); })));
    const rows = [
      row("Speaker", (col) => ({ text: col.turn.role === "ai" ? "AI" : "R" + (col.turn.kind === "administrative" ? " (adm.)" : ""), cls: col.turn.role === "ai" ? "tl-ai" : "tl-r" })),
      row("Purpose", (col) => ({ text: col.purposes.map((p) => P.labelOf(p.category) + (p.suggested ? "?" : "")).join(", ") })),
      row("Developments", (col) => ({ text: col.flags.map((f) => ({ evidence: "evidence", instruction: "instruction", scope: "scope", theory: "theory", error: "error", correction: "correction", decision: "decision" }[f])).join(", "), cls: col.flags.includes("error") ? "tl-err" : "" })),
      row("Claims", (col) => ({ text: col.claims.map((x) => x.claim + " " + (P.CLAIM_EVENTS[x.type] || "").toLowerCase()).join("; ") })),
      row("Checkpoint", (col) => ({ text: col.checkpoints.map((k) => k.id).join(", ") })),
      row("Gap after", (col) => ({ text: col.gapAfter.filter((g) => !g.resolved).length ? "gap" : col.gapAfter.length ? "filled" : "", cls: col.gapAfter.some((g) => !g.resolved) ? "tl-gap" : "" })),
      row("Model", (col) => ({ text: col.model || "" })),
      row("Versions", (col) => ({ text: col.branches ? col.branches + " versions" : "" }))
    ];
    CRIT.forEach((cr, i) => rows.push(row(cr.label, (col) => {
      if (!col.scores) return { text: "" };
      const s = col.scores[i];
      return s.na ? { text: "n/a", cls: "tl-na" } : s.value ? { node: el("span", { class: "tl-score s" + s.value, text: String(s.value), "aria-label": cr.label + " " + s.value }) } : { text: "·", cls: "tl-missing" };
    })));
    box.append(el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Conversation timeline: scroll sideways to see every turn" }, [el("table", { class: "cv-tl" }, [el("thead", {}, [head]), el("tbody", {}, rows)])]));
    return box;
  }

  /* ---------- branches: the whole tree ---------- */
  function branchesView(c) {
    const box = el("div", { class: "cv-branches" });
    const path = new Set(P.activePath(c).map((t) => t.turn_id));
    box.append(el("p", { class: "hint", text: "Every turn, as a tree. A regenerated response or an edited prompt starts a new branch from the turn it follows. The branch shown in the Conversation view is marked; choose another to show it." }));
    const roots = P.childrenOf(c, null);
    // a chain of single turns stays at one level; the tree indents only where the conversation branches
    const chain = (t, ul) => {
      const kids = P.childrenOf(c, t.turn_id);
      const li = el("li", { class: path.has(t.turn_id) ? "on-path" : "" }, [el("span", { class: "cv-tid", text: t.turn_id }), " " + (t.role === "ai" ? "AI" : "Researcher") + (t.regenerated_from ? " · regenerated" : "") + (t.edited_from ? " · edited" : "") + ": ", el("span", { class: "conv-keep", text: short(t.text, 90) }),
        path.has(t.turn_id) ? el("span", { class: "muted small", text: " · shown" }) : btn("Show this branch", () => { c.activeLeaf = P.deepestLeaf(c, t.turn_id); save(c).then(() => { view = "conv"; renderMain(); jumpTo(t.turn_id); }); })]);
      ul.append(li);
      if (kids.length === 1) chain(kids[0], ul);
      else if (kids.length > 1) li.append(el("ul", { "aria-label": "Branches after " + t.turn_id }, kids.map((k) => { const sub = el("li", {}, []); const inner = el("ul", { class: "cv-branch" }); chain(k, inner); sub.append(el("span", { class: "small muted", text: "Branch starting at " + k.turn_id }), inner); return sub; })));
    };
    const top = el("ul", { class: "cv-tree" });
    roots.forEach((r) => chain(r, top));
    box.append(top);
    box.append(el("p", { class: "small muted", text: plural(P.counts(c).branches, "branch", "branches") + " · " + plural(c.turns.length, "turn") + " in all · " + plural(path.size, "turn") + " on the branch shown." }));
    return box;
  }

  /* ---------- exports ---------- */
  const WORD_CSS = "body{font-family:'Source Serif 4',Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.5;color:#1f2a30} h1{font-size:18pt} h2{font-size:12pt;margin-top:14pt} .meta{color:#555555;font-size:9.5pt} pre{font-family:Consolas,'Courier New',monospace;font-size:9.5pt;white-space:pre-wrap;border:1px solid #9aa3a7;padding:6pt} .note{border-left:3pt solid #8a5300;background:#fbf0da;padding:4pt 8pt}";
  function wordDoc(title, body) { return "﻿<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" xmlns=\"http://www.w3.org/TR/REC-html40\"><head><meta charset=\"utf-8\"><title>" + P.escHtml(title) + "</title><style>" + WORD_CSS + "</style></head><body>" + body + "</body></html>"; }
  // printing to PDF: the document is placed in a hidden frame and printed from there
  function printHtml(title, body) {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
    f.style.cssText = "position:fixed;width:0;height:0;border:0;left:-10px;top:-10px";
    document.body.append(f);
    const d = f.contentDocument;
    d.open(); d.write("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>" + P.escHtml(title) + "</title><style>" + WORD_CSS + " @page{margin:18mm}</style></head><body>" + body + "</body></html>"); d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { say("Printing is not available here. Use the Word download instead."); } setTimeout(() => f.remove(), 60000); }, 150);
  }
  function exportMenu(c) {
    const det = el("details", { class: "cv-export" });
    const base = slug(c.title) + (c.sessionId ? "-" + c.sessionId : "");
    const dl = (name, text, type) => { if (A.download) A.download(name, text, type); c.events.push({ type: "exported", at: now(), detail: name }); saveSoon(c); };
    const rec = () => JSON.stringify(P.buildRecord(c, { labVersion: A.VERSION, releaseDoi: A.RELEASE && A.RELEASE.versionDoi }), null, 2);
    const groups = [
      ["The record", [
        ["Research Session Record (JSON)", () => dl(base + ".spl-session.json", rec(), "application/json")],
        ["Checkpoints and imported records (JSON)", () => artefactsOf(c.id).then((as) => dl(base + "-checkpoints.json", P.checkpointsJson(c, as), "application/json"))],
        ["Metadata with provenance (CSV)", () => dl(base + "-metadata.csv", P.metadataCsv(c), "text/csv;charset=utf-8")]]],
      ["The complete conversation", [
        ["Transcript (Markdown)", () => dl(base + "-transcript.md", P.toMarkdown(c), "text/markdown;charset=utf-8")],
        ["Transcript (Word)", () => dl(base + "-transcript.doc", wordDoc(c.title, P.toHtml(c)), "application/msword")],
        ["Transcript (print or save as PDF)", () => printHtml(c.title, P.toHtml(c))],
        ["All turns with evaluations (CSV)", () => dl(base + "-turns.csv", P.toCsv(c, CRIT), "text/csv;charset=utf-8")]]],
      ["Researcher prompts and AI responses", [
        ["Researcher prompt history (Markdown)", () => dl(base + "-prompts.md", P.toMarkdown(c, { promptsOnly: true }), "text/markdown;charset=utf-8")],
        ["Researcher prompt history (CSV)", () => dl(base + "-prompts.csv", P.toCsv(c, CRIT, { promptsOnly: true }), "text/csv;charset=utf-8")],
        ["Researcher prompt history (Word)", () => dl(base + "-prompts.doc", wordDoc(c.title, P.toHtml(c, { promptsOnly: true })), "application/msword")],
        ["AI response history (Markdown)", () => dl(base + "-responses.md", P.toMarkdown(c, { responsesOnly: true }), "text/markdown;charset=utf-8")],
        ["Classified interventions (CSV)", () => dl(base + "-interventions.csv", P.interventionsCsv(c), "text/csv;charset=utf-8")]]],
      ["Analysis", [
        ["Turn evaluations (CSV)", () => dl(base + "-evaluations.csv", P.evaluationsCsv(c, CRIT), "text/csv;charset=utf-8")],
        ["Analytical records: observations, decisions, Claim History (Markdown)", () => dl(base + "-analysis.md", P.analysisMarkdown(c), "text/markdown;charset=utf-8")],
        ["Observations, decisions and developments (CSV)", () => dl(base + "-analysis.csv", P.observationsCsv(c), "text/csv;charset=utf-8")],
        ["Claim histories (CSV)", () => dl(base + "-claims.csv", P.claimsCsv(c), "text/csv;charset=utf-8")],
        ["Claim histories (JSON)", () => dl(base + "-claims.json", JSON.stringify({ conversation_id: c.id, session_id: c.sessionId, claims: c.claims }, null, 2), "application/json")]]]
    ];
    const box = el("div", { class: "cv-export-list" });
    groups.forEach(([h, items]) => {
      box.append(el("p", { class: "cv-export-h", text: h }), el("ul", {}, items.map(([label, fn]) => el("li", {}, [btn(label, fn)]))));
    });
    box.append(el("p", { class: "hint", text: "Turn identifiers are the same in every export, so separate files can be read together. For a redacted copy, use “Redacted copy”." }));
    det.append(el("summary", { text: "Export" }), box);
    return det;
  }

  /* ---------- shared dialog ---------- */
  const dlgImport = $("convImport"), dlgMeta = $("convMeta"), dlgTool = $("convTool");
  function openDialog(d) { if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); }
  function closeDialog(d) { if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open"); }
  [dlgImport, dlgMeta, dlgTool].forEach((d) => d && d.addEventListener("close", () => { const b = $("convMain").querySelector(".cv-tools button"); if (b && d !== dlgTool) b.focus(); }));
  function cancelBtn(d) { return btn("Cancel", () => closeDialog(d), "ghost"); }

  /* ---------- import: SPL records, transcripts, provider exports (JSON or ZIP), canonical records ---------- */
  function detect(text) {
    const t = text.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        const o = JSON.parse(t);
        if (o && o.format === P.RECORD_FORMAT) return { kind: "canonical", obj: o };
        const pe = P.readProviderExport(o);
        if (!pe.error) return { kind: "provider", data: pe };
      } catch (e) { /* not JSON */ }
    }
    if (/SPL-HEADER|<<<SPL-TURN/.test(text)) return { kind: "record" };
    return { kind: "transcript" };
  }
  // a provider's data export is a ZIP file; the conversations are in conversations.json
  async function readZipConversations(file) {
    if (typeof DecompressionStream !== "function") throw new Error("This browser cannot open ZIP files. Unzip the export and choose conversations.json.");
    const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("That is not a ZIP file the Lab can read.");
    let p = dv.getUint32(eocd + 16, true);
    const n = dv.getUint16(eocd + 10, true);
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      if (!/(^|\/)conversations\.json$/i.test(name)) continue;
      if (usize > MAX_EXPORT_FILE) throw new Error("conversations.json is too large to open in the browser (over 200 MB).");
      const lh = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const data = buf.subarray(lh, lh + csize);
      if (method === 0) return new TextDecoder().decode(data);
      if (method !== 8) throw new Error("The ZIP file uses a compression method the Lab cannot read.");
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    }
    throw new Error("No conversations.json was found in the ZIP file.");
  }
  let importFileName = "";
  function openImport(c) {
    const body = $("ciBody"); body.replaceChildren();
    const ta = el("textarea", { id: "ciText", rows: "12", class: "conv-keep", dir: "auto" });
    const file = el("input", { type: "file", id: "ciFile", accept: ".txt,.md,.json,.zip,text/plain,application/json,application/zip" });
    const kind = el("select", { id: "ciKind" });
    [["auto", "Work it out from the content"], ["record", "A record or checkpoint written by the AI system (SPL format)"], ["transcript", "A copy of the conversation itself"]].forEach(([v, l]) => kind.append(el("option", { value: v, text: l })));
    const msg = el("p", { class: "status", role: "status" });
    importFileName = "";
    file.addEventListener("change", async () => {
      const f = file.files[0]; if (!f) return;
      importFileName = f.name;
      try {
        if (/\.zip$/i.test(f.name) || f.type === "application/zip") {
          if (f.size > MAX_EXPORT_FILE) { msg.textContent = "That file is too large (over 200 MB)."; return; }
          msg.textContent = "Reading the ZIP file on this device…";
          const json = await readZipConversations(f);
          ta.value = ""; msg.textContent = "Read conversations.json from " + f.name + ". Nothing was uploaded.";
          reviewProvider(c, json);
          return;
        }
        if (f.size > MAX_EXPORT_FILE || (f.size > MAX_IMPORT && !/\.json$/i.test(f.name))) { msg.textContent = "That file is too large."; file.value = ""; return; }
        const x = await f.text();
        if (x.length > MAX_IMPORT && detect(x).kind === "provider") { reviewProvider(c, x); return; }
        ta.value = x; msg.textContent = "File read: " + f.name + ". Nothing was uploaded.";
      } catch (e) { msg.textContent = e && e.message ? e.message : "The file could not be read."; }
    });
    const go = btn("Read it", () => {
      const text = ta.value;
      if (!text.trim()) { msg.textContent = "Paste the text, or choose a file, first."; ta.focus(); return; }
      if (text.length > MAX_IMPORT) { msg.textContent = "That text is too long to import by pasting (over 20 MB). Choose the file instead."; return; }
      const d = kind.value === "auto" ? detect(text) : { kind: kind.value };
      if (d.kind === "canonical") reviewCanonical(d.obj, text);
      else if (d.kind === "provider") reviewProvider(c, text, d.data);
      else if (d.kind === "record") reviewRecord(c, text);
      else reviewTranscript(c, text);
    }, "");
    body.append(el("h2", { id: "ciTitle", text: "Import into “" + c.title + "”" }),
      el("ul", { class: "hint" }, [
        el("li", { text: "A copy of the conversation: select it all in the AI application, copy and paste here. Speakers are found from labels such as “You said:” and “ChatGPT said:”, and you can correct them." }),
        el("li", { text: "A record or checkpoint the AI system wrote after an SPL command: paste all its parts together, or import each part in turn." }),
        el("li", { text: "A data export from ChatGPT or Claude: choose the ZIP file or its conversations.json, then the conversation. Its times, models and branches are kept. Support for these formats is new: check the result against the application." }),
        el("li", { text: "A Research Session Record exported from the Lab (JSON): it is added as a new conversation." })]),
      field("ciText", "Paste here", ta), field("ciFile", "Or choose a file", file), field("ciKind", "What it is", kind), el("div", { class: "actions" }, [go, cancelBtn(dlgImport)]), msg);
    openDialog(dlgImport);
    ta.focus();
  }
  function listOf(items, cls) { return el("ul", { class: cls }, items.map((x) => el("li", { text: x }))); }
  function previewTable(turns) {
    const tb = el("tbody");
    turns.forEach((t, i) => tb.append(el("tr", {}, [el("td", { text: t.n != null ? String(t.n) : String(i + 1) }), el("td", { text: (t.role === "ai" ? "AI" : "Researcher") + (t.kind === "administrative" ? " (administrative)" : "") + (t.roleInferred ? " (inferred)" : "") + (t.reconstructed ? " · not exact" : "") }),
      el("td", { class: "conv-keep", dir: "auto", text: short(t.text, 160) })])));
    return el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Turns read from the text" }, [el("table", { class: "cv-preview" }, [el("thead", {}, [el("tr", {}, [el("th", { scope: "col", text: "Turn" }), el("th", { scope: "col", text: "Speaker" }), el("th", { scope: "col", text: "Beginning of the text" })])]), tb])]);
  }
  function alignmentView(c, turns, isOrig) {
    const path = P.activePath(c);
    if (!path.length) return el("p", { class: "hint", text: "This conversation has no turns yet, so all " + plural(turns.length, "turn") + " will be added." });
    const rows = P.align(path, turns), s = P.alignSummary(rows);
    const box = el("div", { class: "cv-align" }, [el("h3", { class: "h-small", text: "Compared with what is already recorded" }),
      el("p", { text: [s.identical + " identical", s.spacing + " differ only in spacing", s.differs + " differ in wording", s.missing_from_import + " missing from this text", s.only_in_import + " only in this text"].join(" · ") })]);
    const differ = rows.filter((r) => r.status === "differs");
    if (differ.length) {
      box.append(el("p", { class: "hint", text: isOrig ? "Where the wording differs, the wording from this copy of the conversation will be kept, and the earlier wording recorded as a difference." : "Where the wording differs, the wording already recorded is kept, and this record's wording is recorded as a difference. Text you have confirmed or corrected is never overwritten." }));
      differ.slice(0, 20).forEach((r) => box.append(el("details", {}, [el("summary", { text: path[r.b].turn_id + ": wording differs" }), el("p", { class: "small muted", text: "Struck through: only in the text being imported. Underlined: only in the text already recorded." }), diffView(turns[r.i].text, path[r.b].text)])));
    }
    return box;
  }
  function backBtn(c) { return btn("Back", () => openImport(c), "ghost"); }
  function reviewRecord(c, raw) {
    const r = P.parseTransfer(raw, c.sessionId || null);
    const body = $("ciBody"); body.replaceChildren();
    const h = r.header || {};
    body.append(el("h2", { id: "ciTitle", text: "Check the record before saving" }));
    const facts = [];
    if (r.header) facts.push("Record type: " + str(h.record_type || "not stated"), "Session: " + str(h.session || "not stated"), "Protocol: " + str(h.protocol || "not stated"),
      r.parts.length ? "Parts in this text: " + r.parts.map((p) => p.part + (p.total ? " of " + p.total : "")).join(", ") : "Part " + str(h.part || "?") + " of " + str(h.parts_total || "?"),
      "Turns covered: " + (Array.isArray(h.covers) ? h.covers.join(" to ") : "not stated"), "Coverage the AI system claims: " + str(h.coverage || "not stated") + " (the Lab does not accept this on the AI system's word)",
      "Can it see the start of the conversation? " + (h.access_to_beginning === true ? "it says yes" : h.access_to_beginning === false ? "it says no" : "not stated"));
    if (h.protocol && h.protocol !== P.PROTOCOL_VERSION) facts.push("This record was made under protocol " + h.protocol + "; the Lab reads it, and keeps that version with the record.");
    if (facts.length) body.append(listOf(facts, "cv-facts"));
    if (r.errors.length) body.append(el("div", { class: "notice warn" }, [el("strong", { text: "Problems" }), listOf(r.errors)]));
    if (r.warnings.length) body.append(el("div", { class: "notice" }, [el("strong", { text: "Check these" }), listOf(r.warnings)]));
    if (r.gaps.length) body.append(el("p", { text: plural(r.gaps.length, "gap") + " will be recorded where turns are missing." }));
    if (r.claims.length || r.decisions.length) body.append(el("p", { text: "The record also suggests " + plural(r.claims.length, "claim") + " and " + plural(r.decisions.length, "decision") + ". They will be added as unverified suggestions for you to confirm or discard." }));
    if (r.turns.length) body.append(el("h3", { class: "h-small", text: plural(r.turns.length, "turn") + " read from the record" }), previewTable(r.turns), alignmentView(c, r.turns, false));
    const save1 = btn(r.errors.length ? "Save the complete turns" : "Save to this conversation", () => commitRecord(c, raw, r), "", { disabled: !r.turns.length });
    body.append(el("p", { class: "hint", text: "Saving keeps this text unchanged beside the conversation. Its turns are labelled as reproduced by the AI and unverified until compared with the original conversation." }),
      el("div", { class: "actions" }, [save1, backBtn(c), cancelBtn(dlgImport)]));
  }
  async function commitRecord(c, raw, r) {
    const h = r.header || {};
    const art = await makeArtefact(c, raw, "spl_record");
    const copy = JSON.parse(JSON.stringify(c));
    const res = P.mergeImport(copy, { turns: r.turns, gaps: r.gaps, original: false, origin: "ai_reported", artefact: art.id, at: now(),
      recordType: h.record_type === "completed_session" ? "completed_session" : "checkpoint", sourceRef: "SPL record" + (h.record_type ? " (" + h.record_type + ")" : ""),
      metadata: r.headers.reduce((m, hd) => Object.assign(m, P.assertionsFromHeader(hd.metadata, now(), art.id)), {}) });
    const ids = r.turns.map((t) => res.byN[t.n]).filter(Boolean);
    copy.checkpoints.push({ id: P.nextCode(copy.checkpoints, "CK"), artefact: art.id, record_type: h.record_type || "checkpoint", parts: r.parts, covers: Array.isArray(h.covers) ? h.covers : null,
      claimed_coverage: str(h.coverage), access_to_beginning: h.access_to_beginning === true ? true : h.access_to_beginning === false ? false : "unknown", imported_at: now(), firstTurn: ids[0] || "", lastTurn: ids[ids.length - 1] || "" });
    if (h.access_to_beginning === true || h.access_to_beginning === false) copy.accessToBeginning = h.access_to_beginning;
    if (h.previous_checkpoints_used) copy.previousCheckpointsUsed = true;
    if (r.notes) copy.aiNotes.push({ text: r.notes, artefact: art.id, at: now() });
    P.claimsFromRecord(r.claims, res.byN, copy.claims).forEach((cl) => copy.claims.push(cl));
    r.decisions.forEach((d) => copy.decisions.push({ id: P.nextCode(copy.decisions, "DC"), text: d.text, status: d.explicit && d.turn != null && res.byN[d.turn] ? "needs_confirmation" : "ai_suggested", turn_id: d.turn != null ? res.byN[d.turn] || null : null, at: now() }));
    await finishImport(copy, art, res);
  }
  function reviewTranscript(c, raw) {
    const parsed = P.parseTranscript(raw);
    const turns = parsed.turns.map((t) => ({ role: t.role, text: t.text }));
    const body = $("ciBody");
    const draw = () => {
      body.replaceChildren();
      body.append(el("h2", { id: "ciTitle", text: "Check the turns before saving" }),
        el("p", { class: "hint", text: "Check each speaker. Merge turns that belong together, and remove anything that is not part of the conversation, such as button labels copied from the application. The wording itself cannot be edited here: it is kept exactly as pasted." }));
      if (parsed.warnings.length) body.append(el("div", { class: "notice" }, [listOf(parsed.warnings)]));
      const ol = el("ol", { class: "cv-tlist" });
      turns.forEach((t, i) => {
        const sel = el("select", { "aria-label": "Speaker of turn " + (i + 1) });
        sel.append(el("option", { value: "researcher", text: "Researcher" }), el("option", { value: "ai", text: "AI" }));
        sel.value = t.role; sel.addEventListener("change", () => { t.role = sel.value; draw(); });
        ol.append(el("li", {}, [el("div", { class: "row-inline" }, [sel, btn("Merge with the turn above", () => { turns[i - 1].text += "\n\n" + t.text; turns.splice(i, 1); draw(); }, "ghost small-btn", { disabled: i === 0 }),
          btn("Remove", () => { turns.splice(i, 1); draw(); })]), el("div", { class: "cv-text conv-keep small clamped-s", dir: "auto", text: t.text, tabindex: "0", role: "region", "aria-label": "Text of turn " + (i + 1) })]));
      });
      body.append(ol);
      if (turns.length) body.append(alignmentView(c, turns, true));
      body.append(el("div", { class: "actions" }, [btn("Save to this conversation", async () => {
        const art = await makeArtefact(c, raw, "transcript");
        const copy = JSON.parse(JSON.stringify(c));
        const res = P.mergeImport(copy, { turns: P.markAdministrative(turns.map((t) => ({ role: t.role, text: t.text }))), gaps: [], original: true, origin: "researcher_reported", artefact: art.id, at: now(), sourceRef: "transcript pasted by the researcher" });
        await finishImport(copy, art, res);
      }, "", { disabled: !turns.length }), backBtn(c), cancelBtn(dlgImport)]));
    };
    draw();
  }
  function reviewProvider(c, raw, pre) {
    const body = $("ciBody"); body.replaceChildren();
    let data = pre;
    if (!data) { try { data = P.readProviderExport(JSON.parse(raw)); } catch (e) { data = { error: "This file is not valid JSON." }; } }
    body.append(el("h2", { id: "ciTitle", text: "Choose the conversation from the export" }));
    if (data.error) { body.append(el("p", { class: "notice warn", text: data.error }), el("div", { class: "actions" }, [backBtn(c), cancelBtn(dlgImport)])); return; }
    const search = el("input", { id: "pvSearch", type: "search", placeholder: "Search titles" });
    const list = el("div", { class: "cv-pvlist", role: "radiogroup", "aria-label": "Conversations in the export" });
    let chosen = null;
    const detail = el("div", { class: "cv-pvdetail" });
    const draw = () => {
      list.replaceChildren();
      const q = search.value.trim().toLowerCase();
      data.conversations.filter((pc) => !q || pc.title.toLowerCase().includes(q)).slice(0, 300).forEach((pc, i) => {
        const id = "pv-" + i + "-" + slug(pc.id || pc.title);
        const r = el("input", { type: "radio", name: "pvConv", id });
        r.addEventListener("change", () => { chosen = pc; showDetail(); });
        list.append(el("label", { class: "check", for: id }, [r, el("span", {}, [el("span", { class: "conv-keep", text: pc.title }), el("small", { text: (pc.created ? niceTime(pc.created) + " · " : "") + plural(pc.nodes.length, "message") })])]));
      });
    };
    const showDetail = () => {
      detail.replaceChildren();
      if (!chosen) return;
      const path = P.providerPath(chosen), sk = chosen.skipped || {};
      const branches = chosen.nodes.length - path.length;
      detail.append(el("p", {}, [el("strong", { text: chosen.provider + ": " }), plural(path.length, "message") + " on the current path" + (branches ? ", and " + plural(branches, "message") + " on other branches (regenerated responses and edited prompts)" : "") + "."]),
        el("p", { class: "hint", text: "Not imported as turns: " + [sk.system ? plural(sk.system, "system message") : "", sk.tool ? plural(sk.tool, "tool or browsing message") : "", sk.hidden ? plural(sk.hidden, "hidden message") : "", sk.empty ? plural(sk.empty, "empty message") : ""].filter(Boolean).join(", ") + (Object.values(sk).some(Boolean) ? ". The original file is kept, so they are not lost." : "none.") +
          (chosen.nodes.some((n) => n.nonText) ? " Images and other non-text parts appear as a marker in the text." : "") + (chosen.linearAssumed ? " This export does not record branches, so the messages are taken in order." : "") }),
        alignmentView(c, path, true));
    };
    search.addEventListener("input", draw); draw();
    body.append(el("p", { class: "hint", text: plural(data.conversations.length, "conversation") + " found. The whole file stays on this device; only the conversation you choose is added, and the original export is kept beside it." }),
      field("pvSearch", "Find a conversation", search), list, detail,
      el("div", { class: "actions" }, [btn("Import this conversation", async () => {
        if (!chosen) { say("Choose a conversation first."); return; }
        const text = JSON.stringify(rawConversation(raw, chosen) || chosen);
        const art = await makeArtefact(c, text, "provider_export", chosen.provider);
        const copy = JSON.parse(JSON.stringify(c));
        if (!copy.turns.length && (!copy.title || /^Research conversation$/.test(copy.title))) copy.title = chosen.title;
        const res = P.mergeProvider(copy, chosen, art.id, now());
        await finishImport(copy, art, res);
      }, ""), backBtn(c), cancelBtn(dlgImport)]));
  }
  // keep only the chosen conversation from the provider's file, exactly as the provider wrote it
  function rawConversation(raw, pc) {
    try {
      const all = JSON.parse(raw), list = Array.isArray(all) ? all : all.conversations;
      return list.find((x) => (x.conversation_id || x.id || x.uuid) === pc.id && (x.title || x.name || "Untitled conversation") === pc.title) || null;
    } catch (e) { return null; }
  }
  function reviewCanonical(obj, raw) {
    const body = $("ciBody"); body.replaceChildren();
    const r = fromRecord(obj, projectId());
    body.append(el("h2", { id: "ciTitle", text: "A Research Session Record" }));
    if (r.errors) { body.append(el("div", { class: "notice warn" }, [el("strong", { text: "This record does not meet the schema, so it was not imported:" }), listOf(r.errors.slice(0, 30))]), el("div", { class: "actions" }, [cancelBtn(dlgImport)])); return; }
    const c = r.conv;
    body.append(el("p", { text: "“" + c.title + "”: " + plural(c.turns.length, "turn") + (P.counts(c).branches > 1 ? " in " + P.counts(c).branches + " branches" : "") + ", schema version " + obj.schema_version + ". It will be added to this project as a new conversation, with its provenance as recorded." }));
    body.append(el("div", { class: "actions" }, [btn("Add as a new conversation", async () => {
      const art = await makeArtefact(c, raw, "research_session_record");
      c.artefacts = [art.id];
      c.events.push({ type: "record_imported", at: now(), detail: "Research Session Record (JSON)", lab_version: A.VERSION });
      save(c, art).then(() => { closeDialog(dlgImport); select(c.id); renderStudy(); say("Conversation added from the record."); }, (e) => say(failMessage(e)));
    }, ""), cancelBtn(dlgImport)]));
  }
  async function makeArtefact(c, raw, kind, name) {
    const art = { id: newId("AR-"), convId: c.id, projectId: projectId(), kind, importedAt: now(), size: raw.length, name: name || importFileName || "", text: raw };
    if (A.sha256) { const h = await A.sha256(raw); if (h) art.sha256 = h; }
    return art;
  }
  async function finishImport(copy, art, res) {
    // a follow-up designed in the Lab and submitted unchanged is linked to the prompt that was sent
    copy.designedPrompts.forEach((d) => { if (!copy.turns.some((t) => t.designedId === d.id)) { const t = copy.turns.find((x) => x.role === "researcher" && !x.designedId && P.normaliseText(x.text) === P.normaliseText(d.text)); if (t) t.designedId = d.id; } });
    try { await save(copy, art); } catch (e) { say(failMessage(e)); return; }
    closeDialog(dlgImport);
    renderAll(); renderStudy();
    const s = res.summary;
    say("Imported. " + plural(res.added, "turn") + " added" + (res.branchAdded ? ", and " + plural(res.branchAdded, "turn") + " on other branches" : "") + "; " + (s.identical + s.spacing) + " already recorded; " + plural(res.discrepancies.length, "difference") + " recorded." + (copy.gaps.some((g) => !g.resolved) ? " Gaps are marked in the conversation." : ""));
  }

  /* ---------- metadata ---------- */
  function assertionText(a) {
    if (!a) return "Nothing recorded";
    return a.status === "known" || a.status === "confirmation_required" ? str(a.value) : P.STATUSES[a.status];
  }
  function openMeta(c, focusField) {
    const body = $("cmBody"); body.replaceChildren();
    const out = P.outstandingFields(c.metadata, c);
    const env = P.environmentOf(c.metadata);
    body.append(el("h2", { id: "cmTitle", text: "Research metadata" }),
      el("p", { class: "hint", text: "Every value keeps where it came from and whether it has been checked. Values reported by the AI system start unreviewed. A correction adds a new value; earlier values are kept. “Not exposed by provider” is complete documentation: it records that the provider does not make the value available." }),
      el("p", {}, [el("strong", { text: out.length ? plural(out.length, "required item") + " outstanding: " : "All required items are documented." }), out.map((f) => f.label).join(", ")]),
      el("p", { class: "small" }, [el("strong", { text: "How the model was identified: " }), P.modelIdentification(c.metadata)]),
      el("p", { class: "hint", text: env ? "Guidance below is for " + { consumer: "a web, desktop or mobile application", api: "an API", local: "a model run on your own computer" }[env] + ", as recorded under access method, with general advice. Applications differ by platform and version, so menu names are not given." : "Record the access method to see guidance for your kind of environment. Applications differ by platform and version, so menu names are not given." }));
    const sys = [["Session identifier", c.sessionId || "None"], ["Protocol", c.protocolVersion ? "SPL-RSP " + c.protocolVersion : "Not used"], ["Record schema version", P.SCHEMA_VERSION], ["Prompt copied from the Lab", c.promptCopiedAt ? niceTime(c.promptCopiedAt) : "Not recorded"],
      ["Prompt identifiers", c.promptHistory.length ? c.promptHistory.map((x) => x.id).join(", ") : "None"], ["Source text fingerprint", c.sourceSha256 || "Not recorded"], ["Checkpoints", c.checkpoints.length ? c.checkpoints.map((k) => k.id).join(", ") : "None"], ["Lab version when created", c.labVersion || "Not recorded"]];
    body.append(el("details", { class: "cv-sub" }, [el("summary", { text: "Recorded by the Lab" }), el("dl", { class: "cv-dl" }, sys.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { class: "conv-keep", text: v })])),
      el("p", { class: "hint", text: "Times recorded by the Lab are those of this device's clock, which may be wrong. The time a prompt was copied is not the time it was submitted, and the time a response was imported is not the time it was produced." })]));
    const list = el("div", { class: "cv-meta-list" });
    P.FIELDS.forEach((f) => list.append(fieldView(c, f)));
    body.append(list, el("div", { class: "actions" }, [btn("Close", () => { closeDialog(dlgMeta); renderMain(); }, "ghost")]));
    openDialog(dlgMeta);
    if (focusField) { const d = [...body.querySelectorAll(".cv-field")][P.FIELD_IDS.indexOf(focusField)]; if (d) { d.open = true; d.querySelector("summary").focus(); } }
  }
  function fieldView(c, f) {
    const fl = c.metadata[f.id] || { assertions: [] }, cur = P.currentAssertion(fl), done = P.fieldDone(fl), conflict = P.fieldConflict(fl), req = P.isRequired(f, c);
    const det = el("details", { class: "cv-field" + (done ? " is-done" : "") });
    det.append(el("summary", {}, [el("strong", { text: f.label }), req ? el("span", { class: "muted small", text: " (required)" }) : f.required === "closure" ? el("span", { class: "muted small", text: " (required when the session ends)" }) : null, ": ",
      el("span", { class: "conv-keep", text: assertionText(cur) }), " ",
      cur ? tag(P.ORIGINS[cur.provenance.origin]) : null,
      conflict ? tag("Sources disagree", "warn") : cur ? tag(cur.status === "not_exposed" || cur.status === "not_applicable" ? "Complete" : P.VERIFICATIONS[cur.provenance.verification], done ? "ok" : "warn") : tag(req ? "Outstanding" : "Not recorded", req ? "warn" : "")]));
    det.append(el("p", { class: "hint" }, [f.why + " ", el("strong", { text: "Can the AI system establish it? " }), { partly: "Sometimes.", rarely: "Rarely.", no: "No." }[f.ai] + " ", f.may ? "It may legitimately remain unavailable." : ""]),
      el("ul", { class: "hint" }, P.guidanceFor(f, c.metadata).map((g) => el("li", { text: g }))));
    if (fl.assertions.length) det.append(el("ol", { class: "cv-hist" }, fl.assertions.map((a, i) => el("li", {}, [el("span", { class: "conv-keep", text: assertionText(a) }), " · " + P.ORIGINS[a.provenance.origin] + " · " + P.VERIFICATIONS[a.provenance.verification] + (a.provenance.source_ref ? " · " + a.provenance.source_ref : "") + (a.provenance.recorded_at ? " · " + niceTime(a.provenance.recorded_at) : "") + (a.reason ? " · " + a.reason : "") + (fl.resolution && fl.resolution.chosen === i ? " · chosen by the researcher" : "")]))));
    const reopen = () => save(c).then(() => openMeta(c, f.id), (e) => say(failMessage(e)));
    const add = (a) => { const x = c.metadata[f.id] || (c.metadata[f.id] = { assertions: [] }); if (x.assertions.length) a.supersedes = x.assertions.length - 1; x.assertions.push(a); if (x.resolution) delete x.resolution; reopen(); };
    if (conflict) {
      const opts = fl.assertions.map((a, i) => [i, a]).filter(([, a]) => a.status === "known" || a.status === "confirmation_required");
      const sel = el("select", { id: "rs-" + f.id }); opts.forEach(([i, a]) => sel.append(el("option", { value: String(i), text: str(a.value) + " (" + P.ORIGINS[a.provenance.origin] + ")" })));
      const why = el("input", { id: "rw-" + f.id, placeholder: "Why this value is preferred, or why the disagreement stands" });
      det.append(el("div", { class: "cv-resolve" }, [el("p", { class: "small", text: "The recorded sources give different values. Both are kept. Choose the value to report and give your reason, or leave the disagreement documented." }),
        field("rs-" + f.id, "Value to report", sel), field("rw-" + f.id, "Reason", why), btn("Record this resolution", () => { if (!why.value.trim()) { why.focus(); return; } fl.resolution = { chosen: parseInt(sel.value, 10), reason: why.value.trim(), at: now() }; reopen(); }, "")]));
    }
    const acts = el("div", { class: "actions" });
    if (cur && cur.provenance.verification === "unreviewed" && ["confirmation_required", "known", "not_exposed", "unknown"].includes(cur.status)) {
      // confirming adds a verification status to the value; where it came from does not change
      acts.append(btn("Confirm this value", () => { cur.provenance.verification = "researcher_confirmed"; cur.provenance.confirmed_at = now(); if (cur.status === "confirmation_required") cur.status = "known"; reopen(); }, "small-btn"));
    }
    const vId = "mv-" + f.id, oId = "mo-" + f.id, sId = "ms-" + f.id;
    const val = el("input", { id: vId, class: "conv-keep" });
    const org = el("select", { id: oId });
    [["researcher_reported", "I read or know it"], ["official_documentation", "Official documentation"], ["provider_recorded", "The provider's data export"]].forEach(([v, l]) => org.append(el("option", { value: v, text: l })));
    const src = el("input", { id: sId, placeholder: "e.g. model selector; the provider's model page, consulted 27 Nov 2026" });
    const mark = (status, ask) => {
      const reason = ask ? prompt(ask, "") : "";
      if (ask && reason === null) return;
      add({ value: null, status, provenance: { origin: "researcher_reported", verification: "researcher_confirmed", source_ref: "", recorded_at: now() }, reason: reason || "" });
    };
    det.append(acts, el("div", { class: "cv-meta-form" }, [field(vId, cur ? "Correct or add a value" : "Value", val), field(oId, "Where it comes from", org), field(sId, "Source or note", src),
      el("div", { class: "actions" }, [btn("Save this value", () => {
        if (!val.value.trim()) { val.focus(); return; }
        add({ value: val.value.trim(), status: "known", provenance: { origin: org.value, verification: "researcher_confirmed", source_ref: src.value.trim(), recorded_at: now() }, reason: cur ? "Entered by the researcher; earlier values are kept." : "" });
      }, "small-btn"), btn("Not exposed by provider", () => mark("not_exposed")), btn("Unknown, with a reason", () => mark("unknown", "Why can this not be established?")), btn("Not applicable", () => mark("not_applicable"))])]));
    return det;
  }

  /* ---------- follow-up prompt builder ---------- */
  function openBuilder(c) {
    const body = $("ctBody"); body.replaceChildren();
    const path = P.activePath(c), aiTurns = path.filter((t) => t.role === "ai" && t.kind !== "administrative");
    const purpose = el("select", { id: "fbPurpose" });
    P.TAXONOMY.forEach((x) => { if (x.id !== "researcher_defined") purpose.append(el("option", { value: x.id, text: x.label })); });
    purpose.append(el("option", { value: "researcher_influence", text: "Susceptibility to researcher influence" }), el("option", { value: "researcher_defined", text: "Researcher-defined" }));
    const turn = el("select", { id: "fbTurn" }); turn.append(el("option", { value: "", text: "Your previous response (no specific turn)" }));
    aiTurns.forEach((t) => turn.append(el("option", { value: t.turn_id, text: t.turn_id + ": " + short(t.text, 60) })));
    if (aiTurns.length) turn.value = aiTurns[aiTurns.length - 1].turn_id;
    const claim = el("select", { id: "fbClaim" }); claim.append(el("option", { value: "", text: "No recorded claim" }));
    c.claims.forEach((cl) => claim.append(el("option", { value: cl.id, text: cl.id + ": " + short(cl.text, 60) })));
    const quote = el("input", { id: "fbQuote", class: "conv-keep", placeholder: "Or quote the words you are examining" });
    const material = el("textarea", { id: "fbMaterial", rows: "4", class: "conv-keep", dir: "auto", placeholder: "Counter-evidence, context, a theoretical perspective or a revised instruction" });
    const reqs = el("div", { class: "checks", role: "group", "aria-label": "Methodological requirements" });
    P.FOLLOWUP_REQUIREMENTS.forEach((r) => { const id = "fbr-" + r.id, cb = el("input", { type: "checkbox", id, value: r.id }); if (r.id === "quote" || r.id === "revision") cb.checked = true; reqs.append(el("label", { class: "check", for: id }, [cb, el("span", { text: r.text })])); });
    const out = el("textarea", { id: "fbOut", rows: "8", class: "conv-keep", dir: "auto" });
    const gen = () => {
      const cl = c.claims.find((x) => x.id === claim.value);
      out.value = P.buildFollowUp({ purpose: purpose.value, turnLabel: turn.value ? "your response " + turn.value : "", claim: cl ? cl.text : quote.value.trim(), material: material.value.trim(),
        requirements: [...reqs.querySelectorAll("input:checked")].map((x) => x.value) });
    };
    [purpose, turn, claim, quote, material].forEach((x) => x.addEventListener("change", gen)); reqs.addEventListener("change", gen);
    gen();
    const msg = el("p", { class: "status", role: "status", id: "fbStatus" });
    body.append(el("h2", { id: "ctTitle", text: "Design a follow-up prompt" }),
      el("p", { class: "hint", text: "An optional aid. Choose the purpose, the response and claim you are examining, and your requirements; then edit the wording freely. You can also write follow-ups directly in the AI system: nothing here is needed to record or evaluate a turn." }),
      el("div", { class: "row" }, [field("fbPurpose", "Purpose", purpose), field("fbTurn", "Response examined", turn)]), el("div", { class: "row" }, [field("fbClaim", "Claim examined", claim), field("fbQuote", "Words examined", quote)]),
      field("fbMaterial", "Material to add", material), el("fieldset", { class: "plain-set" }, [el("legend", { class: "label-like", text: "Methodological requirements" }), reqs]),
      field("fbOut", "Your follow-up prompt (edit it as you wish)", out),
      el("div", { class: "actions" }, [btn("Copy", () => A.copy && A.copy(out.value, "fbStatus"), ""), btn("Save as a designed prompt", () => {
        if (!out.value.trim()) return;
        const id = P.nextCode(c.designedPrompts, "FP");
        c.designedPrompts.push({ id, purpose: purpose.value, target: turn.value, claim: claim.value, text: out.value, at: now() });
        save(c).then(() => { msg.textContent = id + " saved. When you record the prompt you actually sent, link it to " + id + " so the designed and the submitted wording can be compared."; renderDesigned(); });
      }), btn("Close", () => closeDialog(dlgTool), "ghost")]), msg, el("div", { id: "fbDesigned" }));
    const renderDesigned = () => {
      const box = $("fbDesigned"); if (!box) return;
      box.replaceChildren();
      if (!c.designedPrompts.length) return;
      box.append(el("h3", { class: "h-small", text: "Designed prompts in this conversation" }), el("ul", { class: "cv-oblist" }, c.designedPrompts.map((d) => {
        const linked = c.turns.find((t) => t.designedId === d.id);
        return el("li", {}, [el("strong", { text: d.id + " " }), el("span", { class: "conv-keep", text: short(d.text, 140) }), " · " + (linked ? "submitted as " + linked.turn_id + (P.normaliseText(linked.text) === P.normaliseText(d.text) ? ", unchanged" : ", with changes") : "not yet linked to a recorded prompt")]);
      })));
    };
    renderDesigned();
    openDialog(dlgTool);
    purpose.focus();
  }

  /* ---------- redaction ---------- */
  function openRedaction(c) {
    const body = $("ctBody"); body.replaceChildren();
    const rules = c.redaction;
    const terms = el("ul", { class: "cv-oblist" });
    const drawTerms = () => {
      terms.replaceChildren();
      rules.terms.forEach((r, i) => terms.append(el("li", {}, [el("span", { class: "conv-keep", text: "“" + r.text + "”" }), " → [withheld: " + r.reason + "]" + (r.wholeWord ? " · whole words only" : ""), " ", btn("Remove", () => { rules.terms.splice(i, 1); saveSoon(c); drawTerms(); count(); }, "ghost small-btn", { "aria-label": "Remove the rule for " + r.text })])));
      Object.keys(rules.turns).forEach((id) => terms.append(el("li", {}, ["The whole of " + id + " → [withheld: " + rules.turns[id] + "] ", btn("Remove", () => { delete rules.turns[id]; saveSoon(c); drawTerms(); count(); }, "ghost small-btn", { "aria-label": "Stop withholding " + id })])));
      if (!rules.terms.length && !Object.keys(rules.turns).length) terms.append(el("li", { class: "muted", text: "Nothing is withheld yet." }));
    };
    const info = el("p", { class: "small", role: "status" });
    const count = () => { let n = 0; c.turns.forEach((t) => { if (P.redactTurn(t, rules) !== t.text) n++; }); info.textContent = plural(n, "turn") + " would be changed in the redacted copy."; };
    const tIn = el("input", { id: "rdText", class: "conv-keep" }), rIn = el("input", { id: "rdReason", value: "personal information" }), ww = el("input", { type: "checkbox", id: "rdWhole" });
    const turnSel = el("select", { id: "rdTurn" }); P.activePath(c).forEach((t) => turnSel.append(el("option", { value: t.turn_id, text: t.turn_id + ": " + short(t.text, 60) })));
    const tReason = el("input", { id: "rdTurnReason", value: "withheld by the researcher" });
    const sugBox = el("div");
    body.append(el("h2", { id: "ctTitle", text: "Prepare a redacted copy" }),
      el("p", { class: "hint", text: "Choose what to withhold from shared or published copies. The record in the Lab is not changed. Each withheld passage is marked [withheld: reason], and every redacted export says that it is redacted and is not a verbatim record." }),
      el("h3", { class: "h-small", text: "Withheld" }), terms, info,
      el("h3", { class: "h-small", text: "Withhold a word or passage wherever it appears" }),
      el("div", { class: "row" }, [field("rdText", "Exact text", tIn), field("rdReason", "Reason shown in its place", rIn)]),
      el("label", { class: "check", for: "rdWhole" }, [ww, el("span", { text: "Whole words only" })]),
      btn("Add", () => { if (!tIn.value) { tIn.focus(); return; } rules.terms.push({ text: tIn.value, reason: rIn.value.trim() || "redacted", wholeWord: ww.checked }); tIn.value = ""; saveSoon(c); drawTerms(); count(); }, ""),
      el("h3", { class: "h-small", text: "Withhold a whole turn" }), el("div", { class: "row" }, [field("rdTurn", "Turn", turnSel), field("rdTurnReason", "Reason", tReason)]),
      btn("Withhold this turn", () => { rules.turns[turnSel.value] = tReason.value.trim() || "withheld"; saveSoon(c); drawTerms(); count(); }, ""),
      el("h3", { class: "h-small", text: "Find possible personal information" }),
      btn("Find e-mail addresses and telephone numbers", () => {
        sugBox.replaceChildren();
        const s = P.suggestRedactions(c);
        if (!s.length) { sugBox.append(el("p", { class: "muted", text: "None found. Check names and other details yourself." })); return; }
        sugBox.append(el("ul", { class: "cv-oblist" }, s.map((x) => el("li", {}, [el("span", { class: "conv-keep", text: x.text }), " (" + x.reason + ") ", btn("Withhold", () => { rules.terms.push({ text: x.text, reason: x.reason, wholeWord: false }); saveSoon(c); drawTerms(); count(); })]))));
      }), sugBox,
      el("h3", { class: "h-small", text: "Export the redacted copy" }),
      el("div", { class: "actions" }, [
        btn("Transcript (Markdown)", () => A.download && A.download(slug(c.title) + "-transcript-REDACTED.md", P.toMarkdown(c, { redaction: rules }), "text/markdown;charset=utf-8")),
        btn("Transcript (Word)", () => A.download && A.download(slug(c.title) + "-transcript-REDACTED.doc", wordDoc(c.title + " (redacted)", P.toHtml(c, { redaction: rules })), "application/msword")),
        btn("Transcript (print or save as PDF)", () => printHtml(c.title + " (redacted)", P.toHtml(c, { redaction: rules }))),
        btn("Researcher prompts (Markdown)", () => A.download && A.download(slug(c.title) + "-prompts-REDACTED.md", P.toMarkdown(c, { promptsOnly: true, redaction: rules }), "text/markdown;charset=utf-8")),
        btn("All turns (CSV)", () => A.download && A.download(slug(c.title) + "-turns-REDACTED.csv", P.toCsv(c, CRIT, { redaction: rules }), "text/csv;charset=utf-8"))]),
      el("div", { class: "actions" }, [btn("Close", () => closeDialog(dlgTool), "ghost")]));
    drawTerms(); count();
    openDialog(dlgTool);
    tIn.focus();
  }

  /* ---------- the Sensitivity study: conversations as conditions, and their comparison ---------- */
  let compareIds = [];
  function renderStudy() {
    const box = $("studyConvs");
    if (!box) return;
    box.replaceChildren();
    box.append(el("h2", { class: "h-small", text: "Conversations as study conditions" }),
      el("p", { class: "hint", text: "Compare whole conversations across AI systems, follow-up strategies, theoretical framings, the protocol and its reminders, or repeated sessions. Set each conversation's condition and comparison group under Log & evaluate, Conversation, About this conversation. Differences in outcomes coincide with differences in conditions; the comparison does not establish causes." }));
    if (!available) { box.append(el("p", { class: "muted", text: "Conversations are not available in this browser." })); return; }
    if (!convs.length) { box.append(el("p", { class: "muted", text: "No conversations recorded in this project yet." })); return; }
    const cond = (id) => { const x = (A.CONDITIONS || []).find((y) => y.id === id); return x ? x.n + ". " + x.name : "Build tab prompt"; };
    const tb = el("tbody");
    convs.forEach((c) => {
      const id = "cmp-" + c.id, cb = el("input", { type: "checkbox", id }); cb.checked = compareIds.includes(c.id);
      cb.addEventListener("change", () => { compareIds = cb.checked ? compareIds.concat([c.id]) : compareIds.filter((x) => x !== c.id); });
      const m = P.currentAssertion(c.metadata.model_name);
      tb.append(el("tr", {}, [el("td", {}, [cb]), el("th", { scope: "row" }, [el("label", { for: id, class: "conv-keep", text: c.title })]), el("td", { text: cond(c.condition) }), el("td", { class: "conv-keep", text: c.group || "–" }),
        el("td", { text: c.sequenceDesign || "not stated" }), el("td", { text: c.protocolVersion ? "SPL-RSP " + c.protocolVersion + (c.reminders ? ", " + (c.reminders === "off" ? "no reminders" : "every ~" + c.reminders) : "") : "not used" }),
        el("td", { class: "conv-keep", text: m ? str(m.value || P.STATUSES[m.status]) : "not recorded" }), el("td", { text: String(P.counts(c).researcher_prompts) })]));
    });
    box.append(el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Conversations in this project: scroll sideways to see every column" }, [el("table", {}, [el("thead", {}, [el("tr", {}, ["Compare", "Conversation", "Condition", "Group", "Follow-ups", "Protocol", "Model", "Prompts"].map((h) => el("th", { scope: "col", text: h })))]), tb])]));
    const groups = [...new Set(convs.map((c) => c.group).filter(Boolean))];
    box.append(el("div", { class: "actions" }, [btn("Compare the selected conversations", () => { const list = convs.filter((c) => compareIds.includes(c.id)); if (list.length < 2) { $("studyCmp").replaceChildren(el("p", { class: "notice", text: "Choose at least two conversations." })); return; } drawComparison(list); }, ""),
      ...groups.map((g) => btn("Compare group “" + g + "”", () => { compareIds = convs.filter((c) => c.group === g).map((c) => c.id); renderStudy(); drawComparison(convs.filter((c) => c.group === g)); }))]),
      el("div", { id: "studyCmp" }));
  }
  function drawComparison(list) {
    const out = $("studyCmp"); out.replaceChildren();
    const cmp = P.compareConversations(list, CRIT);
    out.append(el("h3", { class: "h-small", text: "Comparison of " + plural(list.length, "conversation") }));
    if (cmp.warnings.length) out.append(el("div", { class: "notice warn" }, [listOf(cmp.warnings)]));
    const headRow = () => el("tr", {}, [el("th", { scope: "col", text: "Item" })].concat(list.map((c) => el("th", { scope: "col", class: "conv-keep", text: short(c.title, 40) }))));
    const tbl = (label, rows) => el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": label }, [el("table", { class: "cv-cmp" }, [el("thead", {}, [headRow()]), el("tbody", {}, rows)])]);
    out.append(el("h4", { text: "Conditions and model information" }), tbl("Conditions of each conversation", cmp.conditions.concat(cmp.meta).map((r) => el("tr", { class: r.differs ? "differs" : "" }, [el("th", { scope: "row", text: r.label + (r.differs ? " (differs)" : "") })].concat(r.values.map((v) => el("td", { class: "conv-keep", text: v })))))));
    out.append(el("h4", { text: "Follow-up prompts in order" }), el("p", { class: "hint", text: "Substantive researcher prompts on each conversation's shown branch, side by side by position, with the researcher's classification and the confirmed scores of the response that followed (" + CRIT.map((c) => c.label).join(", ") + "). “=” marks a position where the wording is identical in every conversation." }));
    out.append(tbl("Follow-up prompts by position", cmp.rows.map((r, i) => el("tr", {}, [el("th", { scope: "row", text: (r.index === 1 ? "Initial" : "Follow-up " + (r.index - 1)) + (cmp.identical[i] ? " =" : "") })].concat(r.cells.map((cell) => el("td", {}, cell ? [
      el("div", { class: "cv-text conv-keep small", dir: "auto", text: cell.prompt.text }), el("p", { class: "small" }, [cell.prompt.turn_id + (cell.categories.length ? " · " + cell.categories.map(P.labelOf).join(", ") : "")]),
      el("p", { class: "small muted", text: cell.response ? "Response " + cell.response.turn_id + ": " + (cell.scores.some((s) => s) ? cell.scores.map((s) => s || "·").join(" ") : "not scored") : "No response recorded" })] : [el("span", { class: "muted", text: "–" })])))))));
    const keys = Object.keys(cmp.claimKeys);
    if (keys.length) out.append(el("h4", { text: "Equivalent claims across conversations" }), tbl("Claims with the same comparable label", keys.map((k) => el("tr", {}, [el("th", { scope: "row", class: "conv-keep", text: k })].concat(cmp.claimKeys[k].map((cls) => el("td", {}, cls.length ? cls.map((cl) => el("p", { class: "small conv-keep", text: cl.id + ": " + short(cl.text, 120) + " · " + cl.events.map((e) => (P.CLAIM_EVENTS[e.type] || "").toLowerCase() + " at " + e.turn_id).join(", ") })) : [el("span", { class: "muted", text: "–" })])))))));
    out.append(el("div", { class: "actions" }, list.map((c) => btn("Copy the prompt sequence of “" + short(c.title, 30) + "”", () => A.copy && A.copy(P.promptSequence(c).join("\n\n----\n\n"), "studyCmpStatus")))), el("p", { class: "status", id: "studyCmpStatus", role: "status" }));
  }

  /* ---------- new conversation ---------- */
  $("convNew").addEventListener("click", () => {
    const name = prompt("Name of the conversation", "");
    if (name === null) return;
    const s = A.readState ? A.readState() : {};
    const c = P.newConversation({ projectId: projectId(), title: name.trim() || titleFrom(s.question), question: s.question || "", labVersion: A.VERSION });
    save(c).then(() => { select(c.id); renderStudy(); say("Conversation created. Import its transcript or the provider's export, or add turns by hand."); }, (e) => say(failMessage(e)));
  });
})();
