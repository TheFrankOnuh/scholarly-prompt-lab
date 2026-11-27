/* Scholarly Prompt Lab: research conversations (Log & evaluate → Conversation).
   A conversation is kept with its project in the browser's IndexedDB database, apart from the rest of the Lab's data,
   because long conversations would exhaust ordinary browser storage. Imported records and transcripts are kept unchanged
   beside the conversation. The original conversation is the record of truth; a record written by the AI system is
   compared with it and every difference is kept (protocol.js). Imported text is only ever shown as text.
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
  function say(msg) { const s = $("convStatus"); if (s) { s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(() => (s.textContent = ""), 6000); } $("convAnnounce").textContent = msg; }
  function niceTime(iso) { const d = new Date(iso); return isNaN(d) ? str(iso) : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  function slug(s) { return (s || "conversation").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "conversation"; }
  function projectId() { try { return window.LAB_PROJECTS && window.LAB_PROJECTS.currentId ? window.LAB_PROJECTS.currentId() : "default"; } catch (e) { return "default"; } }
  function newId(prefix) { return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); }

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
  function cleanTurn(t) {
    if (!t || typeof t !== "object" || typeof t.text !== "string") return null;
    const ev = t.evaluation && typeof t.evaluation === "object" ? t.evaluation : null;
    const scores = {}, na = {};
    if (ev) {
      Object.keys(ev.scores || {}).forEach((k) => { if (CRIT_IDS.has(k) && /^[1-5]$/.test(String(ev.scores[k]))) scores[k] = String(ev.scores[k]); });
      const nas = ev.na || ev.not_applicable || {};
      Object.keys(nas).forEach((k) => { if (CRIT_IDS.has(k) && str(nas[k]).trim()) na[k] = str(nas[k]); });
    }
    return {
      turn_id: /^T\d{3,}$/.test(str(t.turn_id)) ? t.turn_id : "", role: t.role === "ai" ? "ai" : "researcher",
      kind: t.kind === "administrative" ? "administrative" : "substantive", text: t.text,
      text_status: P.TEXT_STATUSES[t.text_status] ? t.text_status : "original", timestamp: t.timestamp ? str(t.timestamp) : null,
      classification: Array.isArray(t.classification) ? t.classification.filter((c) => c && TAX.has(c.category)).map((c) => ({ category: c.category, status: c.status === "suggested" ? "suggested" : "researcher", note: c.note ? str(c.note) : undefined })) : [],
      attested_by: Array.isArray(t.attested_by) ? t.attested_by.map(str) : [],
      provenance: cleanProv(t.provenance),
      evaluation: ev ? { scores, na, evaluator: str(ev.evaluator), notes: str(ev.notes), at: str(ev.at || ev.recorded_at) } : null,
      corrections: Array.isArray(t.corrections) ? t.corrections.map((c) => ({ old: str(c && c.old), new: str(c && c.new), reason: str(c && c.reason), at: str(c && c.at) })) : [],
      sha256: /^[0-9a-f]{64}$/.test(str(t.sha256)) ? t.sha256 : undefined,
      matchesCopiedPrompt: !!t.matchesCopiedPrompt
    };
  }
  function normaliseConv(c, pid) {
    if (!c || typeof c !== "object" || !Array.isArray(c.turns)) return null;
    const o = {
      id: /^CV-[A-Z0-9]+$/.test(str(c.id)) ? c.id : newId("CV-"), projectId: pid, sessionId: P.isSessionId(c.sessionId) ? c.sessionId : "",
      title: str(c.title).slice(0, 200) || "Research conversation", question: str(c.question), createdAt: str(c.createdAt) || now(), updatedAt: str(c.updatedAt),
      labVersion: str(c.labVersion), condition: str(c.condition) || "custom", protocolVersion: c.protocolVersion ? str(c.protocolVersion) : null,
      reminders: c.reminders == null ? null : str(c.reminders), prompt: str(c.prompt), promptCopiedAt: str(c.promptCopiedAt), promptCompared: !!c.promptCompared,
      includeInReport: c.includeInReport !== false, completeConfirmed: !!c.completeConfirmed, recordType: str(c.recordType) || undefined,
      nextTurn: 1, turns: [], gaps: [], discrepancies: [], metadata: {}, notes: str(c.notes), artefacts: Array.isArray(c.artefacts) ? c.artefacts.map(str) : [],
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
    o.gaps = (Array.isArray(c.gaps) ? c.gaps : []).filter((g) => g && typeof g === "object").map((g) => ({
      after_turn: ids.has(g.after_turn) ? g.after_turn : null, missing: ["researcher_prompt", "ai_response", "both", "unknown"].includes(g.missing) ? g.missing : "unknown",
      reason: str(g.reason), reported_by: ["ai", "researcher", "lab_alignment"].includes(g.reported_by) ? g.reported_by : "researcher", resolved: !!g.resolved, resolved_by: g.resolved_by ? str(g.resolved_by) : undefined, artefact: str(g.artefact) }));
    o.discrepancies = (Array.isArray(c.discrepancies) ? c.discrepancies : []).filter((d) => d && P.DISCREPANCY_LABELS[d.status]).map((d) => ({
      turn_id: ids.has(d.turn_id) ? d.turn_id : null, status: d.status, text: d.text == null && d.imported_text == null ? null : str(d.text != null ? d.text : d.imported_text), artefact: str(d.artefact), at: str(d.at), resolved: !!d.resolved }));
    const meta = c.metadata && typeof c.metadata === "object" ? c.metadata : {};
    Object.keys(meta).forEach((k) => {
      if (!P.FIELD_IDS.includes(k) || !meta[k] || !Array.isArray(meta[k].assertions)) return;
      const as = meta[k].assertions.map(cleanAssertion).filter(Boolean);
      if (as.length) o.metadata[k] = { assertions: as };
    });
    return o;
  }
  // a canonical Research Session Record (JSON) becomes a conversation of its own
  function fromRecord(r, pid) {
    const errs = P.validateRecord(r);
    if (errs.length) return { errors: errs };
    const c = normaliseConv({
      sessionId: r.session_id, title: r.title || "Imported research session record", question: r.research_question, createdAt: r.created_at, labVersion: r.lab_version,
      condition: r.study && r.study.condition, protocolVersion: r.protocol_version, reminders: r.protocol && r.protocol.reminders, promptCopiedAt: r.protocol && r.protocol.initial_prompt_copied_at,
      completeConfirmed: r.coverage && r.coverage.status === "complete", recordType: r.record_type, notes: r.notes,
      turns: r.turns.map((t) => Object.assign({}, t, { evaluation: t.evaluation ? { scores: t.evaluation.scores, na: t.evaluation.not_applicable, evaluator: t.evaluation.evaluator, notes: t.evaluation.notes, at: t.evaluation.recorded_at } : null })),
      gaps: r.gaps, discrepancies: r.discrepancies, metadata: r.metadata, events: r.events
    }, pid);
    return { conv: c };
  }

  /* ---------- the conversations of the open project ---------- */
  let convs = [];
  let selectedId = "";
  let available = true;
  let view = "conv", showAdmin = true;
  const API = { ready: false, setMode, registerSession, exportProject, importProject, copyProject, deleteProject,
    forReport: () => convs.filter((c) => c.includeInReport !== false), all: () => convs.slice() };
  window.LAB_CONV = API;

  const loaded = openDb().then(() => byIndex("conversations", "projectId", projectId())).then((list) => {
    API.ready = true;
    convs = list.map((c) => normaliseConv(c, projectId())).filter(Boolean).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    try { selectedId = sessionStorage.getItem("spl.ui.conv") || ""; } catch (e) { /* ignore */ }
    if (!convs.some((c) => c.id === selectedId)) selectedId = convs.length ? convs[convs.length - 1].id : "";
    renderAll();
    if (window.LAB_REPORT && $("panel-report") && !$("panel-report").hidden) window.LAB_REPORT.show();
  }).catch(() => {
    available = false;
    $("convUnavailable").hidden = false;
    $("convNew").disabled = true;
    renderAll();
  });

  async function hashTurns(c) {
    if (!A.sha256) return;
    for (const t of c.turns) if (!t.sha256) { const h = await A.sha256(t.text); if (h) t.sha256 = h; }
  }
  async function save(c, artefact) {
    // turns made by an import or by hand get the same empty fields as stored ones
    c.turns.forEach((t) => {
      if (!Array.isArray(t.corrections)) t.corrections = [];
      if (!Array.isArray(t.classification)) t.classification = [];
      if (!Array.isArray(t.attested_by)) t.attested_by = [];
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
    saveTimer = setTimeout(() => { const x = pending; pending = null; save(x).then(renderList, (e) => say(failMessage(e))); }, 400);
  }
  window.addEventListener("pagehide", () => { if (pending) { clearTimeout(saveTimer); save(pending); pending = null; } });
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
      arts.push({ id, convId: convMap[a.convId], projectId: pid, kind: str(a.kind), importedAt: str(a.importedAt), size: a.text.length, sha256: str(a.sha256), text: a.text });
    });
    out.forEach((c) => {
      const m = (x) => artMap[x] || x;
      c.artefacts = c.artefacts.map(m).filter((x) => arts.some((a) => a.id === x));
      c.turns.forEach((t) => { t.attested_by = t.attested_by.map(m); });
      c.discrepancies.forEach((d) => { d.artefact = m(d.artefact); });
      c.gaps.forEach((g) => { g.artefact = m(g.artefact); if (g.resolved_by) g.resolved_by = m(g.resolved_by); });
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

  /* ---------- a session started in Build ---------- */
  function titleFrom(q) { const first = str(q).split("\n").map((x) => x.trim()).filter(Boolean)[0] || "Research conversation"; return first.length > 90 ? first.slice(0, 87) + "…" : first; }
  async function registerSession(o) {
    await loaded;
    if (!available) throw new Error("unavailable");
    let c = convs.find((x) => x.sessionId === o.sessionId);
    if (!c) {
      c = P.newConversation({ projectId: projectId(), sessionId: o.sessionId, title: titleFrom(o.question), question: o.question, labVersion: A.VERSION,
        protocolVersion: P.PROTOCOL_VERSION, reminders: o.reminders, prompt: o.prompt, promptCopiedAt: o.copiedAt, at: o.copiedAt });
      c.events.push({ type: "prompt_copied", at: o.copiedAt, lab_version: A.VERSION });
      await save(c);
      selectedId = c.id; renderAll();
      return "Session " + o.sessionId + " is ready in Log & evaluate, under Conversation. When you have finished, import its record and the transcript there.";
    }
    c.events.push({ type: "prompt_copied_again", at: o.copiedAt, lab_version: A.VERSION, detail: c.turns.length ? "turns already recorded: the recorded prompt is unchanged" : "" });
    if (!c.turns.length) { c.prompt = o.prompt; c.promptCopiedAt = o.copiedAt; c.reminders = o.reminders; }
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

  /* ---------- rendering ---------- */
  function current() { return convs.find((c) => c.id === selectedId) || null; }
  function select(id) { selectedId = id; try { sessionStorage.setItem("spl.ui.conv", id); } catch (e) { /* ignore */ } renderAll(); }
  function renderAll() { renderList(); renderMain(); }
  function covTag(cov) { return el("span", { class: "ctag cov-" + cov.status, text: P.COVERAGE_LABELS[cov.status] }); }
  function renderList() {
    const ul = $("convList"); ul.replaceChildren();
    if (!convs.length) ul.append(el("li", { class: "muted small", text: available ? "None yet." : "Not available in this browser." }));
    convs.forEach((c) => {
      const cnt = P.counts(c), cov = P.coverage(c);
      const b = el("button", { type: "button", class: "conv-pick", "aria-current": c.id === selectedId ? "true" : null }, [
        el("span", { class: "conv-keep conv-pick-title", text: c.title }),
        el("span", { class: "conv-pick-meta" }, [plural(cnt.researcher_prompts, "prompt") + " · " + plural(cnt.ai_responses, "response") + " · ", covTag(cov)])
      ]);
      b.addEventListener("click", () => select(c.id));
      ul.append(el("li", {}, [b]));
    });
  }

  function renderMain() {
    const box = $("convMain"); box.replaceChildren();
    const c = current();
    if (!c) {
      box.append(el("h3", { class: "h-small", text: "No conversation open" }),
        el("p", { class: "hint", text: "To document a conversation you are about to have, tick “Research conversation” in Build, step 7, and copy the prompt: the session appears here. To record a conversation you have already had, choose New conversation and import its transcript." }));
      return;
    }
    const cnt = P.counts(c), cov = P.coverage(c);
    // title and session
    const title = el("input", { id: "cvTitle", class: "conv-keep", value: c.title });
    title.addEventListener("change", () => { c.title = title.value.trim() || "Research conversation"; saveSoon(c); renderList(); });
    const inc = el("input", { type: "checkbox", id: "cvInclude" }); inc.checked = c.includeInReport !== false;
    inc.addEventListener("change", () => { c.includeInReport = inc.checked; saveSoon(c); });
    box.append(el("div", { class: "cv-head" }, [
      el("label", { for: "cvTitle", text: "Title" }), title,
      el("p", { class: "cv-meta" }, [
        c.sessionId ? el("span", {}, ["Session ", el("code", { text: c.sessionId })]) : el("span", { text: "No research session identifier" }), " · ",
        c.protocolVersion ? "Protocol SPL-RSP " + c.protocolVersion + (c.reminders ? (c.reminders === "off" ? ", no reminders" : ", reminders about every " + c.reminders + " messages") : "") : "Protocol not used",
        c.promptCopiedAt ? " · Prompt copied " + niceTime(c.promptCopiedAt) : ""
      ]),
      el("label", { class: "check" }, [inc, el("span", { text: "Include this conversation in the methods report" })])
    ]));
    // counts and coverage
    const covText = cov.status === "complete" ? "You confirmed that this record is complete" + (cov.basis === "compared_with_original" ? ", and it has been compared with the original conversation." : ".")
      : cov.status === "partial" ? "Part of the conversation is known to be missing (see the gaps below)."
      : cnt.researcher_prompts + cnt.ai_responses === 0 ? "Nothing is recorded yet."
      : cov.basis === "ai_reported" ? "Only a record written by the AI system is available. Import the transcript or the provider's export so the Lab can check it."
      : "Not yet confirmed. When you have checked the record against the conversation, confirm that it is complete.";
    const covBox = el("div", { class: "cv-cov" }, [
      el("p", {}, [el("strong", { text: "Coverage: " }), covTag(cov), " ", covText]),
      el("p", { class: "small muted", text: [plural(cnt.researcher_prompts, "researcher prompt"), plural(cnt.ai_responses, "AI response"), plural(cnt.administrative, "administrative message"), plural(cnt.gaps, "gap")].join(" · ") })
    ]);
    if (cov.status !== "partial" && c.turns.length) {
      const b = el("button", { type: "button", class: "ghost small-btn", text: c.completeConfirmed ? "Withdraw my confirmation" : "Confirm that the record is complete" });
      b.addEventListener("click", () => {
        if (!c.completeConfirmed && !confirm("Confirm that every researcher prompt and every response in this conversation is recorded here? Only confirm this after checking the record against the conversation itself.")) return;
        c.completeConfirmed = !c.completeConfirmed;
        c.events.push({ type: c.completeConfirmed ? "complete_confirmed" : "complete_withdrawn", at: now(), lab_version: A.VERSION });
        save(c).then(renderAll, (e) => say(failMessage(e)));
      });
      covBox.append(b);
    }
    box.append(covBox);
    // tools
    const outstanding = P.outstandingFields(c.metadata).length;
    const tools = el("div", { class: "actions cv-tools" });
    const bImp = el("button", { type: "button", text: "Import a record or transcript" }); bImp.addEventListener("click", () => openImport(c));
    const bMeta = el("button", { type: "button", class: "ghost", text: "Metadata" + (outstanding ? ": " + outstanding + " required item" + (outstanding === 1 ? "" : "s") + " outstanding" : ": required items done") });
    bMeta.addEventListener("click", () => openMeta(c));
    tools.append(bImp, bMeta, exportMenu(c));
    const bDel = el("button", { type: "button", class: "ghost danger", text: "Delete conversation" });
    bDel.addEventListener("click", () => {
      if (!confirm("Delete “" + c.title + "”, with its " + plural(c.turns.length, "turn") + ", " + plural(c.artefacts.length, "imported record") + " and its evaluations? This cannot be undone. Back up the project first if you may need it.")) return;
      run(["conversations", "artefacts"], "readwrite", (t) => { t.objectStore("conversations").delete(c.id); deleteWhere(t, "artefacts", "convId", c.id); }).then(() => {
        convs = convs.filter((x) => x.id !== c.id); selectedId = convs.length ? convs[convs.length - 1].id : ""; renderAll(); say("Conversation deleted.");
      }, (e) => say(failMessage(e)));
    });
    tools.append(bDel);
    box.append(tools, el("p", { class: "status", id: "convStatus", role: "status" }));
    // open discrepancies
    const open = c.discrepancies.filter((d) => !d.resolved);
    if (open.length) box.append(el("p", { class: "notice warn", text: plural(open.length, "difference") + " between the AI's record and the original " + (open.length === 1 ? "is" : "are") + " shown below. The original wording is kept; the AI's wording is recorded with each difference, which is itself evidence about the reliability of AI-generated records." }));
    // view controls
    const seg = el("div", { class: "seg", role: "group", "aria-label": "Show" });
    [["conv", "Conversation"], ["prompts", "Prompts only"]].forEach(([v, label]) => {
      const b = el("button", { type: "button", "aria-pressed": String(view === v), text: label });
      b.addEventListener("click", () => { view = v; renderMain(); });
      seg.append(b);
    });
    const adm = el("input", { type: "checkbox", id: "cvAdmin" }); adm.checked = showAdmin;
    adm.addEventListener("change", () => { showAdmin = adm.checked; renderMain(); });
    box.append(el("div", { class: "cv-view" }, [seg, el("label", { class: "check" }, [adm, el("span", { text: "Show administrative messages" })])]));
    // turns
    const list = el("div", { class: "cv-turns" });
    const gapsAt = (id) => c.gaps.filter((g) => g.after_turn === id);
    gapsAt(null).forEach((g) => list.append(gapRow(c, g)));
    c.turns.forEach((t) => {
      if (!showAdmin && t.kind === "administrative") return;
      if (view === "prompts" && t.role !== "researcher") return;
      list.append(turnView(c, t));
      c.discrepancies.filter((d) => d.status === "ai_only" && d.turn_id === t.turn_id).forEach((d) => list.append(aiOnlyRow(c, d)));
      gapsAt(t.turn_id).forEach((g) => list.append(gapRow(c, g)));
    });
    if (!c.turns.length) list.append(el("p", { class: "hint", text: c.prompt ? "The prompt you copied is stored with this session. Import the AI system's record or the transcript when you have them, or add turns one by one below." : "Import the transcript of the conversation, or add turns one by one below." }));
    box.append(list, addTurnForm(c));
  }

  function tag(text, cls) { return el("span", { class: "ctag " + (cls || ""), text }); }
  // identifiers never change, so a turn recorded later to fill a gap keeps its later number: its place is then given as well
  function positionNote(c, t) {
    const pos = c.turns.indexOf(t) + 1;
    return parseInt(t.turn_id.slice(1), 10) === pos ? null : el("span", { class: "muted small", text: " (turn " + pos + " in the conversation)" });
  }
  function turnView(c, t) {
    const isR = t.role === "researcher";
    const art = el("article", { class: "cv-turn " + (isR ? "is-r" : "is-a") + (t.kind === "administrative" ? " is-admin" : ""), id: "turn-" + t.turn_id, "aria-labelledby": "th-" + t.turn_id });
    const st = t.text_status, ver = t.provenance.verification;
    const head = el("p", { class: "cv-turn-head", id: "th-" + t.turn_id }, [
      el("strong", { class: "cv-tid", text: t.turn_id }), positionNote(c, t), " ", isR ? "Researcher prompt" : "AI response", t.kind === "administrative" ? " · administrative" : "", " ",
      tag(P.TEXT_STATUSES[st], st === "original" ? "ok" : st === "ai_reproduced" ? "warn" : ""), ver !== "unreviewed" ? tag(P.VERIFICATIONS[ver], "ok") : null,
      t.matchesCopiedPrompt ? tag("Matches the prompt copied from the Lab", "ok") : null, t.timestamp ? el("span", { class: "muted small", text: " " + t.timestamp }) : null
    ]);
    const text = el("div", { class: "cv-text conv-keep", dir: "auto", text: t.text });
    art.append(head, text);
    if (t.text.length > 1400) {
      text.classList.add("clamped");
      const more = el("button", { type: "button", class: "ghost small-btn", "aria-expanded": "false", text: "Show the whole text" });
      more.addEventListener("click", () => { const open = text.classList.toggle("clamped"); more.setAttribute("aria-expanded", String(!open)); more.textContent = open ? "Show the whole text" : "Show less"; });
      art.append(more);
    }
    c.discrepancies.filter((d) => d.turn_id === t.turn_id && d.status !== "ai_only").forEach((d) => art.append(discrepancyView(c, t, d)));
    if (t.corrections.length) art.append(el("details", { class: "cv-sub" }, [el("summary", { text: "Corrected by the researcher (" + t.corrections.length + ")" }),
      el("ol", {}, t.corrections.map((x) => el("li", {}, [el("span", { class: "muted small", text: niceTime(x.at) + (x.reason ? " · " + x.reason : "") }), el("div", { class: "cv-text conv-keep small", dir: "auto", text: "Before: " + x.old })])))]));
    if (t.kind !== "administrative") art.append(isR ? classifyView(c, t) : evaluateView(c, t));
    art.append(turnActions(c, t));
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
    if (!d.resolved) {
      const b = el("button", { type: "button", class: "ghost small-btn", text: "Mark as reviewed" });
      b.addEventListener("click", () => { d.resolved = true; save(c).then(renderMain, (e) => say(failMessage(e))); });
      box.append(b);
    }
    return box;
  }
  function aiOnlyRow(c, d) {
    const box = el("div", { class: "cv-disc cv-aionly" + (d.resolved ? " is-done" : "") }, [el("p", {}, [el("strong", { text: P.DISCREPANCY_LABELS.ai_only + "." }), " It is not in the original conversation, so it was not added."]),
      el("div", { class: "cv-text conv-keep small", dir: "auto", text: d.text || "" })]);
    if (!d.resolved) { const b = el("button", { type: "button", class: "ghost small-btn", text: "Mark as reviewed" }); b.addEventListener("click", () => { d.resolved = true; save(c).then(renderMain); }); box.append(b); }
    return box;
  }
  function gapRow(c, g) {
    const who = { ai: "reported by the AI system", lab_alignment: "found by the Lab in the record's numbering", researcher: "recorded by the researcher" }[g.reported_by] || "";
    const what = { researcher_prompt: "A researcher prompt is missing", ai_response: "An AI response is missing", both: "A prompt and its response are missing", unknown: "Something is missing" }[g.missing];
    const row = el("div", { class: "cv-gap" + (g.resolved ? " is-done" : ""), role: "note" }, [el("strong", { text: g.resolved ? "Gap filled. " : "Gap. " }), what + (who ? " (" + who + ")" : "") + ". ", g.reason ? el("span", { class: "conv-keep", text: g.reason }) : null]);
    if (!g.resolved) {
      const b = el("button", { type: "button", class: "ghost small-btn", text: "Mark as filled" });
      b.addEventListener("click", () => {
        if (!confirm("Mark this gap as filled? Do this only once the missing turn has been added to the record.")) return;
        g.resolved = true; g.resolved_by = "researcher"; save(c).then(renderAll, (e) => say(failMessage(e)));
      });
      row.append(" ", b);
    }
    return row;
  }
  function classifyView(c, t) {
    const det = el("details", { class: "cv-sub" });
    const sum = el("summary");
    const label = () => { sum.textContent = "Purpose of this prompt: " + (t.classification.length ? t.classification.map((x) => P.labelOf(x.category) + (x.note ? " (" + x.note + ")" : "")).join(", ") : "not classified"); };
    label();
    const grid = el("div", { class: "cv-tax", role: "group", "aria-label": "Purpose of prompt " + t.turn_id });
    P.TAXONOMY.forEach((x) => {
      const id = "tx-" + t.turn_id + "-" + x.id, cb = el("input", { type: "checkbox", id });
      cb.checked = t.classification.some((y) => y.category === x.id);
      const lab = el("label", { class: "check", for: id, title: x.def }, [cb, el("span", {}, [x.label, el("small", { text: x.def })])]);
      cb.addEventListener("change", () => {
        t.classification = t.classification.filter((y) => y.category !== x.id);
        if (cb.checked) t.classification.push({ category: x.id, status: "researcher" });
        if (x.id === "researcher_defined") note.hidden = !cb.checked;
        label(); saveSoon(c);
      });
      grid.append(lab);
    });
    const rd = t.classification.find((y) => y.category === "researcher_defined");
    const note = el("input", { "aria-label": "Your own category for prompt " + t.turn_id, placeholder: "Name your own category", value: rd && rd.note ? rd.note : "" });
    note.hidden = !rd;
    note.addEventListener("change", () => { const x = t.classification.find((y) => y.category === "researcher_defined"); if (x) { x.note = note.value.trim(); label(); saveSoon(c); } });
    det.append(sum, el("p", { class: "hint", text: "Choose every purpose that applies. The classification is kept beside the prompt and never changes its wording." }), grid, note);
    return det;
  }
  function evaluateView(c, t) {
    const ev = t.evaluation || (t.evaluation = null);
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
        if (sel.value === "na") { reason.hidden = false; if (reason.value.trim()) e.na[cr.id] = reason.value.trim(); else { reason.focus(); } }
        else reason.hidden = true;
        e.at = now(); label(); saveSoon(c);
      };
      sel.addEventListener("change", apply); reason.addEventListener("change", apply);
      rows.append(el("div", { class: "cv-crit" }, [el("label", { for: id }, [cr.label, el("small", { text: cr.help })]), sel, reason]));
    });
    const evId = "evr-" + t.turn_id, ntId = "evn-" + t.turn_id;
    const who = el("input", { id: evId, value: ev ? ev.evaluator : "", placeholder: "Initials or role" });
    const notes = el("textarea", { id: ntId, rows: "2" }); notes.value = ev ? ev.notes : "";
    who.addEventListener("change", () => { get().evaluator = who.value.trim(); saveSoon(c); });
    notes.addEventListener("change", () => { get().notes = notes.value; saveSoon(c); });
    det.append(sum, el("p", { class: "hint", text: "Score this response on the six criteria, 1 (poor) to 5 (strong). Mark a criterion not applicable only with a reason; it is not a score and is never averaged." }),
      el("details", { class: "cv-prompt-ref" }, [el("summary", { text: "The prompt this answers" }), el("div", { class: "cv-text conv-keep small", dir: "auto", text: promptBefore(c, t) })]),
      rows, el("label", { for: evId, text: "Evaluator" }), who, el("label", { for: ntId, text: "Evaluation notes" }), notes);
    return det;
  }
  function promptBefore(c, t) {
    const i = c.turns.indexOf(t);
    for (let k = i - 1; k >= 0; k--) if (c.turns[k].role === "researcher") return c.turns[k].text;
    return "No researcher prompt is recorded before this response.";
  }
  function turnActions(c, t) {
    const bar = el("div", { class: "cv-actions" });
    const kind = el("button", { type: "button", class: "ghost small-btn", text: t.kind === "administrative" ? "Mark as substantive" : "Mark as administrative" });
    kind.addEventListener("click", () => { t.kind = t.kind === "administrative" ? "substantive" : "administrative"; save(c).then(renderAll); });
    bar.append(kind);
    if (t.text_status !== "original" && t.provenance.verification === "unreviewed") {
      const ok = el("button", { type: "button", class: "ghost small-btn", text: "I have checked this wording" });
      ok.addEventListener("click", () => {
        if (!confirm("Confirm that this wording matches the conversation itself? It stays labelled as reproduced by the AI, with your confirmation recorded.")) return;
        t.provenance.verification = "researcher_confirmed"; t.provenance.confirmed_at = now(); save(c).then(renderMain);
      });
      bar.append(ok);
    }
    const fix = el("button", { type: "button", class: "ghost small-btn", text: "Correct the wording" });
    fix.addEventListener("click", () => {
      if (bar.querySelector("form")) return;
      const taId = "fx-" + t.turn_id, rsId = "fr-" + t.turn_id;
      const ta = el("textarea", { id: taId, rows: "6", class: "conv-keep", dir: "auto" }); ta.value = t.text;
      const rs = el("input", { id: rsId, placeholder: "e.g. the AI's record dropped a sentence; corrected from the application" });
      const f = el("form", { class: "cv-fix" }, [el("label", { for: taId, text: "Corrected wording" }), ta, el("label", { for: rsId, text: "Reason (required)" }), rs,
        el("div", { class: "actions" }, [el("button", { type: "submit", text: "Save the correction" }), el("button", { type: "button", class: "ghost", text: "Cancel", "data-cancel": "1" })])]);
      f.querySelector("[data-cancel]").addEventListener("click", () => f.remove());
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!rs.value.trim()) { rs.focus(); return; }
        if (ta.value === t.text) { f.remove(); return; }
        t.corrections.push({ old: t.text, new: ta.value, reason: rs.value.trim(), at: now() });
        t.text = ta.value; t.text_status = "researcher_corrected"; delete t.sha256;
        save(c).then(renderMain, (er) => say(failMessage(er)));
      });
      bar.append(f); ta.focus();
    });
    bar.append(fix);
    const rm = el("button", { type: "button", class: "ghost small-btn", text: "Remove" });
    rm.addEventListener("click", () => {
      if (!confirm("Remove " + t.turn_id + " from this conversation? The imported records it came from are kept.")) return;
      c.turns = c.turns.filter((x) => x !== t);
      c.events.push({ type: "turn_removed", at: now(), detail: t.turn_id, lab_version: A.VERSION });
      save(c).then(renderAll, (e) => say(failMessage(e)));
    });
    bar.append(rm);
    return bar;
  }
  function addTurnForm(c) {
    const det = el("details", { class: "cv-add" });
    const last = c.turns[c.turns.length - 1];
    const role = el("select", { id: "atRole" });
    role.append(el("option", { value: "researcher", text: "Researcher prompt" }), el("option", { value: "ai", text: "AI response" }));
    role.value = last && last.role === "researcher" ? "ai" : "researcher";
    const text = el("textarea", { id: "atText", rows: "6", dir: "auto", class: "conv-keep" });
    const time = el("input", { id: "atTime", placeholder: "e.g. 2026-11-27 10:58 (optional)" });
    const b = el("button", { type: "button", text: "Add this turn" });
    b.addEventListener("click", () => {
      if (!text.value.trim()) { text.focus(); return; }
      const t = P.addTurn(c, { role: role.value, text: text.value, timestamp: time.value.trim() || null }, now());
      c.events.push({ type: "turn_added", at: now(), detail: t.turn_id, lab_version: A.VERSION });
      save(c).then(() => { renderAll(); const d = document.querySelector(".cv-add"); if (d) { d.open = true; $("atText").focus(); } say(t.turn_id + " added."); }, (e) => say(failMessage(e)));
    });
    det.append(el("summary", { text: "Add a turn by hand" }),
      el("p", { class: "hint", text: "Paste each message from the conversation in order. Pasted text is recorded as the original wording." }),
      el("label", { for: "atRole", text: "Who wrote it" }), role, el("label", { for: "atText", text: "Exact text" }), text, el("label", { for: "atTime", text: "Time shown in the application" }), time,
      el("div", { class: "actions" }, [b]));
    return det;
  }

  /* ---------- exports ---------- */
  function exportMenu(c) {
    const det = el("details", { class: "cv-export" });
    const base = slug(c.title) + (c.sessionId ? "-" + c.sessionId : "");
    const dl = (name, text, type) => { if (A.download) A.download(name, text, type); c.events.push({ type: "exported", at: now(), detail: name }); saveSoon(c); };
    const items = [
      ["Research Session Record (JSON)", () => dl(base + ".spl-session.json", JSON.stringify(P.buildRecord(c, { labVersion: A.VERSION }), null, 2), "application/json")],
      ["Transcript (Markdown)", () => dl(base + "-transcript.md", P.toMarkdown(c), "text/markdown;charset=utf-8")],
      ["Researcher prompt history (Markdown)", () => dl(base + "-prompts.md", P.toMarkdown(c, { promptsOnly: true }), "text/markdown;charset=utf-8")],
      ["Researcher prompt history (CSV)", () => dl(base + "-prompts.csv", P.toCsv(c, CRIT, { promptsOnly: true }), "text/csv;charset=utf-8")],
      ["All turns with evaluations (CSV)", () => dl(base + "-turns.csv", P.toCsv(c, CRIT), "text/csv;charset=utf-8")]
    ];
    const ul = el("ul", { class: "cv-export-list" });
    items.forEach(([label, fn]) => { const b = el("button", { type: "button", class: "ghost small-btn", text: label }); b.addEventListener("click", fn); ul.append(el("li", {}, [b])); });
    det.append(el("summary", { text: "Export" }), ul);
    return det;
  }

  /* ---------- import ---------- */
  const dlgImport = $("convImport"), dlgMeta = $("convMeta");
  function openDialog(d) { if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); }
  function closeDialog(d) { if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open"); }
  [dlgImport, dlgMeta].forEach((d) => d.addEventListener("close", () => { const b = $("convMain").querySelector(".cv-tools button"); if (b) b.focus(); }));

  function detect(text) {
    const t = text.trim();
    if (t.startsWith("{")) { try { const o = JSON.parse(t); if (o && o.format === P.RECORD_FORMAT) return { kind: "canonical", obj: o }; } catch (e) { /* not JSON */ } }
    if (/SPL-HEADER|<<<SPL-TURN/.test(text)) return { kind: "record" };
    return { kind: "transcript" };
  }
  function openImport(c) {
    const body = $("ciBody"); body.replaceChildren();
    const ta = el("textarea", { id: "ciText", rows: "12", class: "conv-keep", dir: "auto" });
    const file = el("input", { type: "file", id: "ciFile", accept: ".txt,.md,.json,text/plain,application/json" });
    const kind = el("select", { id: "ciKind" });
    [["auto", "Work it out from the text"], ["record", "A record or checkpoint written by the AI system (SPL format)"], ["transcript", "A copy of the conversation itself"]].forEach(([v, l]) => kind.append(el("option", { value: v, text: l })));
    const msg = el("p", { class: "status", role: "status" });
    const go = el("button", { type: "button", text: "Read it" });
    const cancel = el("button", { type: "button", class: "ghost", text: "Cancel" });
    cancel.addEventListener("click", () => closeDialog(dlgImport));
    file.addEventListener("change", () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > MAX_IMPORT) { msg.textContent = "That file is too large (over 20 MB)."; file.value = ""; return; }
      f.text().then((x) => { ta.value = x; msg.textContent = "File read: " + f.name + ". Nothing was uploaded."; }, () => { msg.textContent = "The file could not be read."; });
    });
    go.addEventListener("click", () => {
      const text = ta.value;
      if (!text.trim()) { msg.textContent = "Paste the text, or choose a file, first."; ta.focus(); return; }
      if (text.length > MAX_IMPORT) { msg.textContent = "That text is too long to import (over 20 MB)."; return; }
      const d = kind.value === "auto" ? detect(text) : { kind: kind.value };
      if (d.kind === "canonical") reviewCanonical(d.obj, text);
      else if (d.kind === "record") reviewRecord(c, text);
      else reviewTranscript(c, text);
    });
    body.append(el("h2", { id: "ciTitle", text: "Import into “" + c.title + "”" }),
      el("ul", { class: "hint" }, [
        el("li", { text: "A copy of the conversation: select it all in the AI application, copy and paste here. Speakers are found from labels such as “You said:” and “ChatGPT said:”, and you can correct them." }),
        el("li", { text: "A record or checkpoint the AI system wrote after an SPL command: paste all its parts together." }),
        el("li", { text: "A Research Session Record exported from the Lab (JSON): it is added as a new conversation." })]),
      el("label", { for: "ciText", text: "Paste here" }), ta, el("label", { for: "ciFile", text: "Or choose a file" }), file,
      el("label", { for: "ciKind", text: "What it is" }), kind, el("div", { class: "actions" }, [go, cancel]), msg);
    openDialog(dlgImport);
    ta.focus();
  }
  function listOf(items, cls) { return el("ul", { class: cls }, items.map((x) => el("li", { text: x }))); }
  function previewTable(turns) {
    const wrap = el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Turns read from the text" });
    const tb = el("tbody");
    turns.forEach((t, i) => tb.append(el("tr", {}, [el("td", { text: t.n != null ? String(t.n) : String(i + 1) }), el("td", { text: (t.role === "ai" ? "AI" : "Researcher") + (t.kind === "administrative" ? " (administrative)" : "") + (t.roleInferred ? " (inferred)" : "") }),
      el("td", { class: "conv-keep", dir: "auto", text: t.text.length > 160 ? t.text.slice(0, 157) + "…" : t.text })])));
    wrap.append(el("table", { class: "cv-preview" }, [el("thead", {}, [el("tr", {}, [el("th", { scope: "col", text: "Turn" }), el("th", { scope: "col", text: "Speaker" }), el("th", { scope: "col", text: "Beginning of the text" })])]), tb]));
    return wrap;
  }
  function alignmentView(c, turns, isOrig) {
    if (!c.turns.length) return el("p", { class: "hint", text: "This conversation has no turns yet, so all " + plural(turns.length, "turn") + " will be added." });
    const rows = P.align(c.turns, turns), s = P.alignSummary(rows);
    const box = el("div", { class: "cv-align" }, [el("h3", { class: "h-small", text: "Compared with what is already recorded" }),
      el("p", { text: [s.identical + " identical", s.spacing + " differ only in spacing", s.differs + " differ in wording", s.missing_from_import + " missing from this text", s.only_in_import + " only in this text"].join(" · ") })]);
    const differ = rows.filter((r) => r.status === "differs");
    if (differ.length) {
      box.append(el("p", { class: "hint", text: isOrig ? "Where the wording differs, the wording from this copy of the conversation will be kept, and the earlier wording recorded as a difference." : "Where the wording differs, the wording already recorded is kept, and this record's wording is recorded as a difference." }));
      differ.slice(0, 20).forEach((r) => box.append(el("details", {}, [el("summary", { text: c.turns[r.b].turn_id + ": wording differs" }), el("p", { class: "small muted", text: "Struck through: only in the text being imported. Underlined: only in the text already recorded." }), diffView(turns[r.i].text, c.turns[r.b].text)])));
    }
    return box;
  }
  function reviewRecord(c, raw) {
    const r = P.parseTransfer(raw, c.sessionId || null);
    const body = $("ciBody"); body.replaceChildren();
    const h = r.header || {};
    body.append(el("h2", { id: "ciTitle", text: "Check the record before saving" }));
    const facts = [];
    if (r.header) facts.push("Record type: " + str(h.record_type || "not stated"), "Session: " + str(h.session || "not stated"), "Part " + str(h.part || "?") + " of " + str(h.parts_total || "?"),
      "Turns covered: " + (Array.isArray(h.covers) ? h.covers.join(" to ") : "not stated"), "Coverage the AI system claims: " + str(h.coverage || "not stated") + " (the Lab does not accept this on the AI system's word)");
    if (facts.length) body.append(listOf(facts, "cv-facts"));
    if (r.errors.length) body.append(el("div", { class: "notice warn" }, [el("strong", { text: "Problems" }), listOf(r.errors)]));
    if (r.warnings.length) body.append(el("div", { class: "notice" }, [el("strong", { text: "Check these" }), listOf(r.warnings)]));
    if (r.gaps.length) body.append(el("p", { text: plural(r.gaps.length, "gap") + " will be recorded where turns are missing." }));
    if (r.turns.length) body.append(el("h3", { class: "h-small", text: plural(r.turns.length, "turn") + " read from the record" }), previewTable(r.turns), alignmentView(c, r.turns, false));
    const save1 = el("button", { type: "button", text: r.errors.length ? "Save the complete turns" : "Save to this conversation" });
    save1.disabled = !r.turns.length;
    save1.addEventListener("click", () => commitImport(c, raw, "spl_record", { turns: r.turns, gaps: r.gaps, original: false, origin: "ai_reported", recordType: h.record_type === "completed_session" ? "completed_session" : "checkpoint",
      sourceRef: "SPL record" + (h.record_type ? " (" + h.record_type + ")" : ""), metadata: r.header ? P.assertionsFromHeader(h.metadata, now(), "SPL record") : {}, notes: r.notes }));
    body.append(el("p", { class: "hint", text: "Saving keeps this text unchanged beside the conversation. Its turns are labelled as reproduced by the AI and unverified until compared with the original conversation." }),
      el("div", { class: "actions" }, [save1, backBtn(c), cancelBtn()]));
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
        const merge = el("button", { type: "button", class: "ghost small-btn", text: "Merge with the turn above", disabled: i === 0 });
        merge.addEventListener("click", () => { turns[i - 1].text += "\n\n" + t.text; turns.splice(i, 1); draw(); });
        const rm = el("button", { type: "button", class: "ghost small-btn", text: "Remove" });
        rm.addEventListener("click", () => { turns.splice(i, 1); draw(); });
        const txt = el("div", { class: "cv-text conv-keep small clamped-s", dir: "auto", text: t.text });
        ol.append(el("li", {}, [el("div", { class: "row-inline" }, [sel, merge, rm]), txt]));
      });
      body.append(ol);
      if (turns.length) body.append(alignmentView(c, turns, true));
      const save1 = el("button", { type: "button", text: "Save to this conversation" });
      save1.disabled = !turns.length;
      save1.addEventListener("click", () => commitImport(c, raw, "transcript", { turns: P.markAdministrative(turns.map((t) => ({ role: t.role, text: t.text }))), gaps: [], original: true, origin: "researcher_reported", sourceRef: "transcript pasted by the researcher" }));
      body.append(el("div", { class: "actions" }, [save1, backBtn(c), cancelBtn()]));
    };
    draw();
  }
  function reviewCanonical(obj, raw) {
    const body = $("ciBody"); body.replaceChildren();
    const r = fromRecord(obj, projectId());
    body.append(el("h2", { id: "ciTitle", text: "A Research Session Record" }));
    if (r.errors) { body.append(el("div", { class: "notice warn" }, [el("strong", { text: "This record does not meet the schema, so it was not imported:" }), listOf(r.errors.slice(0, 30))]), el("div", { class: "actions" }, [cancelBtn()])); return; }
    const c = r.conv;
    body.append(el("p", { text: "“" + c.title + "”: " + plural(c.turns.length, "turn") + ". It will be added to this project as a new conversation, with its provenance as recorded." }));
    const b = el("button", { type: "button", text: "Add as a new conversation" });
    b.addEventListener("click", () => {
      const art = { id: newId("AR-"), convId: c.id, projectId: projectId(), kind: "research_session_record", importedAt: now(), size: raw.length, text: raw };
      c.artefacts = [art.id];
      c.events.push({ type: "record_imported", at: now(), detail: "Research Session Record (JSON)", lab_version: A.VERSION });
      save(c, art).then(() => { closeDialog(dlgImport); select(c.id); say("Conversation added from the record."); }, (e) => say(failMessage(e)));
    });
    body.append(el("div", { class: "actions" }, [b, cancelBtn()]));
  }
  function backBtn(c) { const b = el("button", { type: "button", class: "ghost", text: "Back" }); b.addEventListener("click", () => openImport(c)); return b; }
  function cancelBtn() { const b = el("button", { type: "button", class: "ghost", text: "Cancel" }); b.addEventListener("click", () => closeDialog(dlgImport)); return b; }
  async function commitImport(c, raw, kind, incoming) {
    const art = { id: newId("AR-"), convId: c.id, projectId: projectId(), kind, importedAt: now(), size: raw.length, text: raw };
    if (A.sha256) { const h = await A.sha256(raw); if (h) art.sha256 = h; }
    // work on a copy, so a failed save leaves the conversation as it was
    const copy = JSON.parse(JSON.stringify(c));
    const res = P.mergeImport(copy, Object.assign({}, incoming, { artefact: art.id, at: now() }));
    if (incoming.notes) copy.notes = (copy.notes ? copy.notes + "\n\n" : "") + "Notes from the AI system's record (" + niceTime(now()) + "):\n" + incoming.notes;
    try { await save(copy, art); } catch (e) { say(failMessage(e)); return; }
    closeDialog(dlgImport);
    renderAll();
    const s = res.summary;
    say("Imported. " + plural(res.added, "turn") + " added; " + (s.identical + s.spacing) + " already recorded; " + plural(res.discrepancies.length, "difference") + " recorded." + (copy.gaps.some((g) => !g.resolved) ? " Gaps are marked in the conversation." : ""));
  }

  /* ---------- metadata ---------- */
  function openMeta(c) {
    const body = $("cmBody"); body.replaceChildren();
    const out = P.outstandingFields(c.metadata);
    body.append(el("h2", { id: "cmTitle", text: "Research metadata" }),
      el("p", { class: "hint", text: "Every value keeps where it came from and whether it has been checked. Values reported by the AI system start unreviewed. A correction adds a new value; earlier values are kept. “Not exposed by provider” counts as complete documentation." }),
      el("p", {}, [el("strong", { text: out.length ? plural(out.length, "required item") + " outstanding: " : "All required items are documented." }), out.map((f) => f.label).join(", ")]));
    const sys = [["Session identifier", c.sessionId || "None"], ["Protocol", c.protocolVersion ? "SPL-RSP " + c.protocolVersion : "Not used"], ["Prompt copied from the Lab", c.promptCopiedAt ? niceTime(c.promptCopiedAt) : "Not recorded"], ["Lab version when created", c.labVersion || "Not recorded"]];
    body.append(el("details", { class: "cv-sub" }, [el("summary", { text: "Recorded by the Lab" }), el("dl", { class: "cv-dl" }, sys.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { class: "conv-keep", text: v })]))]));
    const list = el("div", { class: "cv-meta-list" });
    P.FIELDS.forEach((f) => list.append(fieldView(c, f)));
    const close = el("button", { type: "button", class: "ghost", text: "Close" }); close.addEventListener("click", () => { closeDialog(dlgMeta); renderMain(); });
    body.append(list, el("div", { class: "actions" }, [close]));
    openDialog(dlgMeta);
  }
  function assertionText(a) {
    if (!a) return "Nothing recorded";
    return a.status === "known" || a.status === "confirmation_required" ? str(a.value) : P.STATUSES[a.status];
  }
  function fieldView(c, f) {
    const field = c.metadata[f.id] || { assertions: [] }, cur = P.currentAssertion(field), done = P.fieldDone(field);
    const det = el("details", { class: "cv-field" + (done ? " is-done" : "") });
    det.append(el("summary", {}, [el("strong", { text: f.label }), f.required ? el("span", { class: "muted small", text: " (required)" }) : null, ": ",
      el("span", { class: "conv-keep", text: assertionText(cur) }), " ",
      cur ? tag(P.ORIGINS[cur.provenance.origin]) : null, cur ? tag(cur.status === "not_exposed" || cur.status === "not_applicable" ? "Complete" : P.VERIFICATIONS[cur.provenance.verification], done ? "ok" : "warn") : tag(f.required ? "Outstanding" : "Not recorded", f.required ? "warn" : "")]));
    det.append(el("p", { class: "hint", text: f.why + " Where to look: " + f.where + (f.may ? " It may legitimately remain unavailable." : "") }));
    if (field.assertions.length) det.append(el("ol", { class: "cv-hist" }, field.assertions.map((a) => el("li", {}, [el("span", { class: "conv-keep", text: assertionText(a) }), " · " + P.ORIGINS[a.provenance.origin] + " · " + P.VERIFICATIONS[a.provenance.verification] + (a.provenance.recorded_at ? " · " + niceTime(a.provenance.recorded_at) : "") + (a.reason ? " · " + a.reason : "")]))));
    const reopen = () => save(c).then(() => { openMeta(c); const d = [...$("cmBody").querySelectorAll(".cv-field")][P.FIELD_IDS.indexOf(f.id)]; if (d) { d.open = true; d.querySelector("summary").focus(); } }, (e) => say(failMessage(e)));
    // a new value is a new assertion: the earlier ones are kept
    const add = (a) => {
      const fl = c.metadata[f.id] || (c.metadata[f.id] = { assertions: [] });
      if (fl.assertions.length) a.supersedes = fl.assertions.length - 1;
      fl.assertions.push(a);
      reopen();
    };
    const acts = el("div", { class: "actions" });
    if (cur && cur.provenance.verification === "unreviewed" && ["confirmation_required", "known", "not_exposed", "unknown"].includes(cur.status)) {
      // confirming adds a verification status to the value; where it came from does not change
      const ok = el("button", { type: "button", class: "small-btn", text: "Confirm this value" });
      ok.addEventListener("click", () => { cur.provenance.verification = "researcher_confirmed"; cur.provenance.confirmed_at = now(); if (cur.status === "confirmation_required") cur.status = "known"; reopen(); });
      acts.append(ok);
    }
    const vId = "mv-" + f.id, oId = "mo-" + f.id, sId = "ms-" + f.id;
    const val = el("input", { id: vId, class: "conv-keep" });
    const org = el("select", { id: oId });
    [["researcher_reported", "I read or know it"], ["official_documentation", "Official documentation"], ["provider_recorded", "The provider's data export"]].forEach(([v, l]) => org.append(el("option", { value: v, text: l })));
    const src = el("input", { id: sId, placeholder: "e.g. model selector; the provider's model page, consulted 27 Nov 2026" });
    const saveV = el("button", { type: "button", class: "small-btn", text: "Save this value" });
    saveV.addEventListener("click", () => {
      if (!val.value.trim()) { val.focus(); return; }
      add({ value: val.value.trim(), status: "known", provenance: { origin: org.value, verification: "researcher_confirmed", source_ref: src.value.trim(), recorded_at: now() }, reason: cur ? "Entered by the researcher." : "" });
    });
    const mark = (status, ask) => {
      const reason = ask ? prompt(ask, "") : "";
      if (ask && reason === null) return;
      add({ value: null, status, provenance: { origin: "researcher_reported", verification: "researcher_confirmed", source_ref: "", recorded_at: now() }, reason: reason || "" });
    };
    const nx = el("button", { type: "button", class: "ghost small-btn", text: "Not exposed by provider" }); nx.addEventListener("click", () => mark("not_exposed"));
    const un = el("button", { type: "button", class: "ghost small-btn", text: "Unknown, with a reason" }); un.addEventListener("click", () => mark("unknown", "Why can this not be established?"));
    const na = el("button", { type: "button", class: "ghost small-btn", text: "Not applicable" }); na.addEventListener("click", () => mark("not_applicable"));
    det.append(acts, el("div", { class: "cv-meta-form" }, [el("label", { for: vId, text: "Value" }), val, el("label", { for: oId, text: "Where it comes from" }), org, el("label", { for: sId, text: "Source or note (optional)" }), src,
      el("div", { class: "actions" }, [saveV, nx, un, na])]));
    return det;
  }

  /* ---------- new conversation ---------- */
  $("convNew").addEventListener("click", () => {
    const name = prompt("Name of the conversation", "");
    if (name === null) return;
    const s = A.readState ? A.readState() : {};
    const c = P.newConversation({ projectId: projectId(), title: name.trim() || titleFrom(s.question), question: s.question || "", labVersion: A.VERSION });
    save(c).then(() => { select(c.id); say("Conversation created. Import its transcript, or add turns by hand."); }, (e) => say(failMessage(e)));
  });
})();
