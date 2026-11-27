/* Scholarly Prompt Lab: the SPL Research Session Protocol and the Research Session Record.
   Everything in this file is plain logic with no page and no storage, so it can be tested and reused by other tools:
   - the protocol text added to a prompt, and the seven session commands;
   - the metadata fields, the provenance and verification vocabulary, the follow-up taxonomy;
   - reading what an AI system returns for a checkpoint or session record (the transfer format);
   - splitting a pasted transcript into turns;
   - aligning an AI-reproduced record with the original conversation, turn by turn;
   - building, checking and exporting the canonical Research Session Record.
   The specification is docs/research-session-protocol.md. Nothing here sends anything anywhere. */
(function (root) {
  "use strict";

  var PROTOCOL_VERSION = "0.1";
  var SCHEMA_VERSION = "0.1";
  var TRANSFER_FORMAT = "spl-rsr-transfer/0.1";
  var RECORD_FORMAT = "spl-research-session-record";

  /* ---------- session identifiers: made by the Lab, never by the AI ---------- */
  var ID_CHARS = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O, 1/I/L, U
  function newSessionId(date, random) {
    var d = date || new Date();
    var rnd = random || Math.random;
    var ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    var tail = "";
    for (var i = 0; i < 4; i++) tail += ID_CHARS.charAt(Math.floor(rnd() * ID_CHARS.length));
    return "SPL-S-" + ymd + "-" + tail;
  }
  function isSessionId(s) { return /^SPL-S-\d{8}-[A-Z2-9]{4}$/.test(String(s || "")); }

  /* ---------- the core protocol ---------- */
  // o: { session, reminders: "off" | number (default 10), initialRecord: true | false }
  function reminderEvery(o) {
    var r = o && o.reminders;
    if (r === "off" || r === 0 || r === "0") return 0;
    var n = parseInt(r, 10);
    return n > 0 ? n : 10;
  }
  function coreProtocol(o) {
    o = o || {};
    var every = reminderEvery(o);
    var rules = [
      "Keep to the research question, sources and methodological instructions in this first message unless the researcher explicitly revises them. If you revise an earlier claim or depart from an instruction, say so, identify the earlier claim, and state whether the revision rests on new evidence or on a change of instructions, theoretical orientation or researcher preference.",
      "Keep observations grounded in the sources apart from interpretations, hypotheses and methodological suggestions. Give the supporting evidence where the research design requires it. Mark source material introduced later in the session as additional.",
      "When the researcher challenges an interpretation, test the challenge against the evidence. Do not adopt the researcher's position only because it has been expressed. State consequential uncertainty, missing evidence and limitations.",
      "Keep the cultural, linguistic and historical context established for this session in later answers.",
      "Never invent quotations, source identifiers, dates, model details, settings, researcher decisions or earlier exchanges. Report information about yourself and this session only if it is actually available to you. Otherwise write \"unknown\" or \"not exposed by provider\". Do not present an advertised model name as an exact version.",
      "The researcher's decisions and final assessment are theirs to state. Do not assume agreement because the conversation continues."
    ];
    if (o.initialRecord !== false) rules.push("After your first substantive answer, add a short section headed \"SPL Research Session — Initial Record\": the AI system, model and settings you can actually establish, the session start date if available to you, and for each item you cannot establish, one line on where the researcher might find it. The research answer comes first.");
    rules.push("Do not reproduce the conversation record unless the researcher sends a message beginning \"SPL:\". Those messages carry their own instructions. " +
      (every
        ? "About every " + every + " substantive researcher messages, and when the model, sources or procedure change, add one line reminding the researcher to confirm outstanding metadata and save a checkpoint with \"SPL: SAVE RESEARCH CHECKPOINT\". Do not ask again for information already supplied. Stop the reminders if asked. If the researcher says the session has ended, mention \"SPL: END RESEARCH SESSION\"."
        : "Do not add reminders about documentation: the researcher will send those messages when needed."));
    rules.push("Never ask for passwords, keys, tokens or private system instructions.");
    return "SPL RESEARCH SESSION PROTOCOL · version " + PROTOCOL_VERSION + " · session " + (o.session || "[session]") + "\n" +
      "This conversation is a scholarly research session documented with Scholarly Prompt Lab. Answer the research prompt that follows this protocol as you normally would. Throughout the session:\n" +
      rules.map(function (r, i) { return (i + 1) + ". " + r; }).join("\n");
  }
  var PROMPT_DIVIDER = "--- RESEARCH PROMPT ---";
  function withProtocol(prompt, o) { return coreProtocol(o) + "\n\n" + PROMPT_DIVIDER + "\n\n" + String(prompt || ""); }

  /* ---------- metadata fields ---------- */
  // ai: whether an AI system can usually establish the value itself. may: whether it may legitimately stay unavailable.
  var FIELDS = [
    { id: "ai_system", label: "AI provider and product", required: true, ai: "partly", may: false, why: "Identifies the system used, which readers need to interpret the outputs.", where: "The application's name and its provider, as shown in the interface or your account." },
    { id: "model_name", label: "Model name as shown", required: true, ai: "partly", may: false, why: "Outputs depend on the model. The advertised name is not always the exact model behind it.", where: "The model selector in the application; the model field of an API request; the file name of a local model." },
    { id: "model_version", label: "Model version or release identifier", required: true, ai: "rarely", may: true, why: "Providers update models under the same name, so the exact release affects reproducibility.", where: "API responses usually return the exact model identifier. Consumer applications often do not show it: record it as not exposed by the provider." },
    { id: "access_method", label: "Access method", required: true, ai: "no", may: false, why: "Web, desktop, mobile, API and local use can differ in settings and hidden instructions.", where: "How you reached the system: web browser, desktop application, mobile application, API, or a model run on your own computer." },
    { id: "session_start", label: "Session start date", required: true, ai: "rarely", may: false, why: "Places the conversation in time, since models and their data change.", where: "The conversation's date in the application's history, a data export, or your own note of when you began." },
    { id: "session_end", label: "Session end date", required: false, ai: "rarely", may: false, why: "Shows how long the conversation ran and whether it spanned a model update.", where: "The date of the last message, in the application, a data export or your own note." },
    { id: "time_zone", label: "Time zone of the dates", required: false, ai: "no", may: true, why: "Dates near midnight can fall on different days in different time zones.", where: "Your device's time zone, or the offset given in a data export." },
    { id: "reasoning_mode", label: "Reasoning or thinking mode", required: false, ai: "partly", may: true, why: "Extended reasoning modes can change the analysis produced.", where: "Usually beside the model selector, or in the API request." },
    { id: "temperature", label: "Temperature", required: false, ai: "rarely", may: true, why: "Affects how much outputs vary between runs.", where: "API request settings. Consumer applications usually do not show it: record it as not exposed by the provider." },
    { id: "top_p", label: "Top-p", required: false, ai: "rarely", may: true, why: "Another setting that affects variation between runs.", where: "API request settings. Usually not exposed in consumer applications." },
    { id: "max_output", label: "Maximum output length", required: false, ai: "rarely", may: true, why: "Long answers can be cut off at this limit.", where: "API request settings; sometimes the application's documentation." },
    { id: "other_settings", label: "Other settings", required: false, ai: "partly", may: true, why: "Any setting that may affect the analysis.", where: "The application's settings, or your API request." },
    { id: "tools", label: "Tools available and used", required: false, ai: "partly", may: true, why: "Tools such as code execution or document reading change what the system can do.", where: "The tools shown as switched on in the conversation, and any tool use visible in the responses." },
    { id: "web_browsing", label: "Web browsing", required: false, ai: "partly", may: true, why: "Browsing brings in material outside your sources. The protocol never switches it on.", where: "The application's search or browsing switch for this conversation." },
    { id: "uploaded_files", label: "Uploaded files or retrieval", required: false, ai: "partly", may: true, why: "Files and retrieval add material to the conversation.", where: "The files attached to the conversation or project in the application." },
    { id: "memory", label: "Memory or personalisation", required: false, ai: "rarely", may: true, why: "Remembered information and personal instructions can shape answers without appearing in the conversation.", where: "The application's personalisation or memory settings. You may record only that they exist, without their content." },
    { id: "knowledge_cutoff", label: "Knowledge cutoff", required: false, ai: "partly", may: true, why: "Shows which events the model can know about without browsing.", where: "The provider's model documentation." },
    { id: "model_changes", label: "Model changes during the conversation", required: false, ai: "partly", may: true, why: "A change of model part-way through means later turns come from a different system.", where: "The model shown beside each response, or a data export's per-message model field." }
  ];
  var FIELD_IDS = FIELDS.map(function (f) { return f.id; });

  var ORIGINS = {
    system_recorded: "Recorded by the Lab",
    provider_recorded: "Recorded by the provider",
    ai_reported: "Reported by the AI system",
    researcher_reported: "Reported by the researcher",
    official_documentation: "Official documentation",
    unknown: "Origin unknown"
  };
  var VERIFICATIONS = {
    unreviewed: "Not yet reviewed",
    researcher_confirmed: "Confirmed by the researcher",
    compared_with_original: "Compared with the original",
    disputed: "Disputed",
    unavailable: "Cannot be verified"
  };
  var STATUSES = {
    known: "Known",
    confirmation_required: "Researcher confirmation required",
    unknown: "Unknown",
    not_exposed: "Not exposed by provider",
    not_applicable: "Not applicable"
  };
  var TEXT_STATUSES = {
    original: "Original",
    ai_reproduced: "Reproduced by the AI, unverified",
    reconstructed: "Reconstructed",
    researcher_corrected: "Corrected by the researcher"
  };

  /* ---------- follow-up taxonomy, version 0.1 ---------- */
  var TAXONOMY_VERSION = "0.1";
  var TAXONOMY = [
    { id: "clarification", label: "Clarification", def: "Asks the AI to resolve an ambiguity in its own claim or wording." },
    { id: "evidence_examination", label: "Evidence examination", def: "Asks for the evidence that supports a specific claim." },
    { id: "counter_evidence", label: "Counter-evidence", def: "Introduces or requests evidence against an interpretation." },
    { id: "contextual_correction", label: "Contextual correction", def: "Corrects a cultural, linguistic or historical error." },
    { id: "theoretical_reframing", label: "Theoretical reframing", def: "Asks for a reading through another theoretical perspective." },
    { id: "interpretive_challenge", label: "Interpretive challenge", def: "Questions the reasoning or assumptions behind an interpretation." },
    { id: "methodological_correction", label: "Methodological correction", def: "Points out a departure from the research procedure." },
    { id: "alternative_interpretation", label: "Alternative interpretation", def: "Asks for other defensible readings." },
    { id: "scope_correction", label: "Scope correction", def: "Addresses claims that go beyond the evidence." },
    { id: "synthesis", label: "Synthesis", def: "Asks for an interpretation built from earlier exchanges." },
    { id: "analytical_extension", label: "Analytical extension", def: "Extends the inquiry to new material or questions." },
    { id: "instruction_refinement", label: "Instruction refinement", def: "Revises or clarifies the analytical instructions." },
    { id: "researcher_defined", label: "Researcher-defined", def: "A purpose the researcher names." }
  ];

  /* ---------- the seven session commands ---------- */
  function formatInstructions(session, recordType) {
    return "Format (exactly):\n" +
      "1. A line \"SPL-HEADER\", then one JSON object with: \"format\": \"" + TRANSFER_FORMAT + "\", \"protocol\": \"" + PROTOCOL_VERSION + "\", \"session\": \"" + session + "\", \"record_type\": \"" + recordType + "\", \"part\": 1, \"parts_total\": a number or \"unknown\", \"covers\": [first turn number, last turn number], \"coverage\": \"complete\", \"partial\" or \"unknown\", \"metadata\": an object using only these keys: " + FIELD_IDS.join(", ") + "; each value is {\"value\": ..., \"origin\": \"shown by application\" | \"reported by AI\" | \"supplied by researcher\" | \"unknown\"}, and \"gaps\": a list of {\"after_turn\": number, \"missing\": \"researcher_prompt\" | \"ai_response\" | \"both\" | \"unknown\", \"reason\": text}.\n" +
      "2. Every turn, numbered from 1 at the start of the conversation, as:\n<<<SPL-TURN 7 role=researcher>>>\n(the exact text)\n<<<SPL-END 7>>>\n" +
      "Use role=researcher for the researcher's messages and role=ai for your responses. Add kind=admin for SPL commands, metadata confirmations and your replies to them, for example <<<SPL-TURN 8 role=researcher kind=admin>>>.\n" +
      "3. Where a turn is missing, write this instead of the turn:\n<<<SPL-GAP after=6 missing=researcher_prompt>>>\n(why it is missing)\n<<<SPL-END GAP>>>\n" +
      "4. A line \"SPL-NOTES\", then short notes kept apart from the verbatim turns: analytical developments, evidence introduced, corrections, outstanding issues.\n" +
      "If this will not fit in one response, stop after a complete turn, say \"Continue with: SPL: " + (recordType === "completed_session" ? "END RESEARCH SESSION" : "SAVE RESEARCH CHECKPOINT") + " part 2\", and number the parts in the header.";
  }
  var VERBATIM_RULES = "Rules:\n" +
    "- Reproduce every researcher message and every one of your responses verbatim, in order, including short, repetitive, unsuccessful or administrative ones. Do not summarise, shorten, correct or improve any researcher message. Keep the original formatting.\n" +
    "- If any earlier message or response is no longer available to you, or you are not certain of its exact wording, do not reconstruct it. Write a GAP block saying what is missing and why.\n" +
    "- Do not claim the record is complete unless you can see the whole conversation.\n" +
    "- Never invent model details, dates or settings. Use \"unknown\" or \"not exposed by provider\".";
  var COMMANDS = [
    { id: "start", name: "START RESEARCH SESSION", label: "Start in an existing conversation",
      use: "Begins documentation part-way through a conversation that did not start with the protocol.",
      body: function (s) { return "From this message on, this conversation is a scholarly research session documented with Scholarly Prompt Lab (session " + s + ", protocol " + PROTOCOL_VERSION + ").\n" + coreProtocol({ session: s, reminders: 10, initialRecord: false }).split("\n").slice(2).join("\n").replace("in this first message", "established so far in this conversation") + "\nState that the earlier messages in this conversation precede the start of documentation. Then give a section headed \"SPL Research Session — Initial Record\": the AI system, model and settings you can actually establish, and for each item you cannot establish, one line on where the researcher might find it."; } },
    { id: "review", name: "REVIEW RESEARCH METADATA", label: "Review metadata",
      use: "Shows what is known about the system and the session, and what is still outstanding.",
      body: function () { return "Show the current metadata for this session. For each item give: the value; its origin (shown by the application, reported by you, supplied by the researcher, or unknown); and whether the researcher has confirmed it. Use these items: " + FIELDS.map(function (f) { return f.label.replace(/^([A-Z])(?=[a-z])/, function (c) { return c.toLowerCase(); }); }).join("; ") + ".\nFor each outstanding item, say briefly why it matters, whether you can establish it, where the researcher might find it, how to record it, and whether it may legitimately remain unavailable. Do not invent values. Do not reproduce the conversation."; } },
    { id: "confirm", name: "CONFIRM RESEARCH METADATA", label: "Confirm metadata",
      use: "Records the values the researcher supplies. Write them after the command.",
      body: function () { return "Record the values I give below as supplied by the researcher. Keep any earlier value with its origin, and note where my value differs from it. Then list what is still outstanding, in one or two lines. Do not ask again for anything I have confirmed.\nMy values:\n"; } },
    { id: "checkpoint", name: "SAVE RESEARCH CHECKPOINT", label: "Save a checkpoint",
      use: "Produces a record of the conversation so far, to paste into the Lab.",
      body: function (s) { return "Produce a research checkpoint for this session, covering every exchange since the session began.\n" + VERBATIM_RULES + "\n" + formatInstructions(s, "checkpoint"); } },
    { id: "end", name: "END RESEARCH SESSION", label: "End the session",
      use: "Closes this documentation interval with a final metadata review and the complete record.",
      body: function (s) { return "This research session's documentation ends here; the study itself may continue.\nFirst give a short section headed \"SPL Research Session — Final Record\": the AI system and model as established, the start and end dates if available, any change of model or settings during the session, the values the researcher confirmed, the items still outstanding with one line each on where to find them, and any part of the conversation you can no longer see.\nThen produce the completed session record.\n" + VERBATIM_RULES + "\n" + formatInstructions(s, "completed_session"); } },
    { id: "resume", name: "RESUME RESEARCH SESSION", label: "Resume from a checkpoint",
      use: "Continues the session in a new conversation or another AI system. Paste the checkpoint after the command.",
      body: function (s) { return "The text below is a checkpoint from an earlier part of research session " + s + ". Treat it as transferred context: it is not your memory, and you did not necessarily write it. If you are a different AI system or model from the one recorded, say so. Continue the session under the protocol it contains (version " + PROTOCOL_VERSION + "). Number new turns after the last turn in the checkpoint.\nCheckpoint:\n"; } },
    { id: "status", name: "RESEARCH SESSION STATUS", label: "Session status",
      use: "A short account of where the session stands.",
      body: function () { return "Give a short status of this session: the research question, the current analytical position, outstanding uncertainties, the methodological instructions that apply, outstanding metadata, and any sign that earlier parts of the conversation are no longer available to you. Do not claim to monitor your context capacity. Do not reproduce the conversation."; } }
  ];
  function commandText(id, session) {
    var c = COMMANDS.filter(function (x) { return x.id === id; })[0];
    if (!c) return "";
    return "SPL: " + c.name + " · protocol " + PROTOCOL_VERSION + " · session " + (session || "[session]") + "\n" + c.body(session || "[session]");
  }

  /* ---------- text helpers ---------- */
  function unifyLines(s) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n"); }
  // for comparison only: never stored in place of the original
  function normaliseText(s) { return unifyLines(s).normalize("NFC").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n\n").trim(); }
  function trimBlankLines(s) { return s.replace(/^(?:[ \t]*\n)+/, "").replace(/(?:\n[ \t]*)+$/, ""); }
  function words(s) { return normaliseText(s).toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean); }
  function bag(ws) { var m = new Map(); ws.forEach(function (w) { m.set(w, (m.get(w) || 0) + 1); }); return m; }
  function similarity(a, b) {
    var A = a.bag || bag(words(a.text != null ? a.text : a)), B = b.bag || bag(words(b.text != null ? b.text : b));
    var na = 0, nb = 0, common = 0;
    A.forEach(function (v) { na += v; }); B.forEach(function (v) { nb += v; });
    if (!na && !nb) return 1;
    A.forEach(function (v, k) { if (B.has(k)) common += Math.min(v, B.get(k)); });
    return (2 * common) / (na + nb);
  }

  /* ---------- reading an AI system's checkpoint or session record ---------- */
  function attrs(s) {
    var o = {}, re = /([a-z_]+)=("[^"]*"|\S+)/gi, m;
    while ((m = re.exec(s))) o[m[1].toLowerCase()] = m[2].replace(/^"|"$/g, "");
    return o;
  }
  function jsonAfter(text, from) {
    var i = text.indexOf("{", from);
    if (i === -1) return null;
    var depth = 0, inStr = false, esc = false;
    for (var j = i; j < text.length; j++) {
      var ch = text.charAt(j);
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === "\"") inStr = false; continue; }
      if (ch === "\"") inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return { text: text.slice(i, j + 1), end: j + 1 }; }
    }
    return { text: text.slice(i), end: text.length, open: true };
  }
  var MISSING = ["researcher_prompt", "ai_response", "both", "unknown"];
  function parseTransfer(raw, expectSession) {
    var text = unifyLines(raw);
    var out = { header: null, turns: [], gaps: [], notes: "", errors: [], warnings: [] };
    var h = text.indexOf("SPL-HEADER");
    if (h === -1) out.errors.push("This is not an SPL record: it has no SPL-HEADER line. If it is a copy of the conversation itself, import it as a transcript.");
    else {
      var j = jsonAfter(text, h);
      if (!j || j.open) out.errors.push("The header after SPL-HEADER is incomplete.");
      else {
        try { out.header = JSON.parse(j.text); } catch (e) { out.errors.push("The header after SPL-HEADER is not valid JSON, so its metadata cannot be read. The turns can still be read."); }
      }
    }
    var hd = out.header;
    if (hd && typeof hd === "object") {
      if (typeof hd.format !== "string" || hd.format.indexOf("spl-rsr-transfer/") !== 0) out.warnings.push("The header does not name the SPL transfer format.");
      if (expectSession && hd.session && hd.session !== expectSession) out.warnings.push("This record is for session " + hd.session + ", not " + expectSession + ".");
      if (hd.record_type && ["checkpoint", "completed_session"].indexOf(hd.record_type) === -1) out.warnings.push("Unexpected record type: " + hd.record_type + ".");
    } else if (hd !== null) { out.errors.push("The header is not a JSON object."); out.header = null; }

    var re = /<<<SPL-TURN\s+(\d+)([^>]*)>>>[ \t]*\n?([\s\S]*?)\n?<<<SPL-END\s+\1\s*>>>/g, m, seen = {};
    while ((m = re.exec(text))) {
      var n = parseInt(m[1], 10), a = attrs(m[2]);
      if (seen[n]) { out.warnings.push("Turn " + n + " appears twice in this record; the first copy is used."); continue; }
      seen[n] = 1;
      var role = (a.role || "").toLowerCase(), kind = (a.kind || "").toLowerCase() === "admin" ? "administrative" : "";
      if (role === "admin") { kind = "administrative"; role = ""; }
      if (role === "user" || role === "human") role = "researcher";
      if (role === "assistant" || role === "model") role = "ai";
      out.turns.push({ n: n, role: role, kind: kind, text: m[3] });
    }
    // a turn that starts and never ends: the response was cut off at its length limit
    var starts = text.match(/<<<SPL-TURN\s+(\d+)/g) || [];
    starts.forEach(function (s) {
      var n = parseInt(s.replace(/\D+/g, ""), 10);
      if (!seen[n]) out.errors.push("Turn " + n + " starts but has no end marker. The response was probably cut off: ask for the next part, and paste all parts together.");
    });
    var gre = /<<<SPL-GAP([^>]*)>>>[ \t]*\n?([\s\S]*?)\n?<<<SPL-END GAP\s*>>>/g;
    while ((m = gre.exec(text))) {
      var ga = attrs(m[1]);
      out.gaps.push({ after: ga.after != null && /^\d+$/.test(ga.after) ? parseInt(ga.after, 10) : null, missing: MISSING.indexOf(ga.missing) !== -1 ? ga.missing : "unknown", reason: m[2].trim(), reported_by: "ai" });
    }
    if (hd && Array.isArray(hd.gaps)) hd.gaps.forEach(function (g) {
      if (!g || typeof g !== "object") return;
      var after = Number.isInteger(g.after_turn) ? g.after_turn : null;
      if (!out.gaps.some(function (x) { return x.after === after; }))
        out.gaps.push({ after: after, missing: MISSING.indexOf(g.missing) !== -1 ? g.missing : "unknown", reason: typeof g.reason === "string" ? g.reason : "", reported_by: "ai" });
    });
    out.turns.sort(function (x, y) { return x.n - y.n; });
    // roles the record left out are inferred from alternation and marked as inferred
    out.turns.forEach(function (t, i) {
      if (!t.role) { var prev = out.turns[i - 1]; t.role = prev ? (prev.role === "researcher" ? "ai" : "researcher") : "researcher"; t.roleInferred = true; out.warnings.push("Turn " + t.n + " did not say who wrote it; the Lab inferred " + (t.role === "ai" ? "the AI" : "the researcher") + ". Check it."); }
    });
    // numbering jumps that nobody explained are gaps too
    var start = hd && Array.isArray(hd.covers) && Number.isInteger(hd.covers[0]) ? hd.covers[0] : (out.turns.length ? out.turns[0].n : 1);
    var nums = out.turns.map(function (t) { return t.n; }), expect = start;
    nums.forEach(function (n) {
      for (var k = expect; k < n; k++) {
        if (!out.gaps.some(function (g) { return g.after === k - 1; })) out.gaps.push({ after: k - 1 > 0 ? k - 1 : null, missing: "unknown", reason: "Turn " + k + " is missing from the numbering.", reported_by: "lab_alignment" });
        break;
      }
      expect = n + 1;
    });
    for (var i = 1; i < out.turns.length; i++) {
      if (out.turns[i].role === out.turns[i - 1].role && out.turns[i].n === out.turns[i - 1].n + 1)
        out.warnings.push("Turns " + out.turns[i - 1].n + " and " + out.turns[i].n + " are both by " + (out.turns[i].role === "ai" ? "the AI" : "the researcher") + ". A turn may be missing or mislabelled.");
    }
    var ni = text.search(/^SPL-NOTES[ \t]*$/m);
    if (ni !== -1) out.notes = text.slice(ni).replace(/^SPL-NOTES[ \t]*\n?/, "").replace(/<<<SPL-[\s\S]*$/, "").trim();
    if (!out.turns.length && !out.errors.length) out.errors.push("No turns were found in this record.");
    return out;
  }

  /* ---------- splitting a pasted transcript into turns ---------- */
  var R_NAMES = "you said|you|user|human|me|researcher|prompt|question";
  var A_NAMES = "chatgpt said|chatgpt|assistant|ai|claude|gemini|copilot|model|response|answer|bot|grok|deepseek|mistral|llama|perplexity|le chat";
  var LABEL_LINE = new RegExp("^[ \\t]*(?:#{1,6}[ \\t]*)?(?:\\*\\*|__)?[ \\t]*(" + R_NAMES + "|" + A_NAMES + ")[ \\t]*:?[ \\t]*(?:\\*\\*|__)?[ \\t]*:?[ \\t]*$", "i");
  var INLINE = new RegExp("^[ \\t]*(?:\\*\\*|__)?(user|human|you|me|researcher|assistant|ai|chatgpt|claude|gemini|copilot)(?:\\*\\*|__)?[ \\t]*:(?:\\*\\*|__)?[ \\t]+", "i");
  function roleOf(name) { return new RegExp("^(" + R_NAMES + ")$", "i").test(name.trim()) ? "researcher" : "ai"; }
  function parseTranscript(raw) {
    var text = unifyLines(raw), ls = text.split("\n");
    var out = { turns: [], warnings: [], style: "" };
    var first = ls.filter(function (l) { return l.trim(); })[0] || "";
    var style = LABEL_LINE.test(first) ? "label" : INLINE.test(first) ? "inline" : "";
    out.style = style;
    if (!style) {
      if (text.trim()) out.turns.push({ role: "researcher", text: trimBlankLines(text) });
      out.warnings.push("No speaker labels were found, so the whole text is one turn. Mark the turns yourself below, or add them one by one.");
      return out;
    }
    var cur = null;
    ls.forEach(function (line) {
      var m = style === "label" ? LABEL_LINE.exec(line) : INLINE.exec(line);
      if (m) {
        if (cur) out.turns.push(cur);
        cur = { role: roleOf(m[1]), lines: style === "inline" ? [line.slice(m[0].length)] : [] };
      } else if (cur) cur.lines.push(line);
    });
    if (cur) out.turns.push(cur);
    out.turns = out.turns.map(function (t) { return { role: t.role, text: trimBlankLines(t.lines.join("\n")) }; }).filter(function (t) { return t.text.trim(); });
    for (var i = 1; i < out.turns.length; i++) if (out.turns[i].role === out.turns[i - 1].role) { out.warnings.push("Two turns in a row are by the same speaker. Check the speakers, and merge turns that belong together."); break; }
    return out;
  }

  /* ---------- administrative exchanges ---------- */
  function isCommand(text) { return /^\s*SPL:\s*[A-Z]/.test(String(text || "")); }
  var ADMIN_HEADINGS = /^\s*(?:#+\s*|\*\*)?SPL Research Session — (?:Initial Record|Final Record|Checkpoint reminder)/;
  function markAdministrative(turns) {
    // a researcher's SPL command, and the AI's reply to it, are administrative; so is an AI turn that is only a protocol section
    // only turns whose kind is not yet decided are classified, so a researcher's own choice is never overridden
    turns.forEach(function (t, i) {
      if (t.kind) return;
      if (t.role === "researcher" && isCommand(t.text)) t.kind = "administrative";
      else if (t.role === "ai" && i > 0 && turns[i - 1].role === "researcher" && turns[i - 1].kind === "administrative") t.kind = "administrative";
      else if (t.role === "ai" && ADMIN_HEADINGS.test(t.text)) t.kind = "administrative";
      else t.kind = "substantive";
    });
    return turns;
  }

  /* ---------- aligning two versions of the same conversation ---------- */
  // base and incoming: arrays of { role, text }. Returns rows { b, i, status } in conversation order.
  function align(base, incoming) {
    var B = base.map(function (t) { return { role: t.role, text: t.text, norm: normaliseText(t.text), bag: bag(words(t.text)) }; });
    var I = incoming.map(function (t) { return { role: t.role, text: t.text, norm: normaliseText(t.text), bag: bag(words(t.text)) }; });
    var n = B.length, m = I.length, THRESH = 0.5;
    var sim = function (x, y) { if (x.role !== y.role) return -1; if (x.norm === y.norm) return 1; var s = similarity(x, y); return s >= THRESH ? s : -1; };
    var S = [], P = [];
    for (var a = 0; a <= n; a++) { S.push(new Float64Array(m + 1)); P.push(new Int8Array(m + 1)); }
    for (a = 1; a <= n; a++) P[a][0] = 1;
    for (var b = 1; b <= m; b++) P[0][b] = 2;
    for (a = 1; a <= n; a++) for (b = 1; b <= m; b++) {
      var best = S[a - 1][b], dir = 1;
      if (S[a][b - 1] > best) { best = S[a][b - 1]; dir = 2; }
      var s = sim(B[a - 1], I[b - 1]);
      if (s > 0 && S[a - 1][b - 1] + s >= best) { best = S[a - 1][b - 1] + s; dir = 3; }
      S[a][b] = best; P[a][b] = dir;
    }
    var rows = [];
    a = n; b = m;
    while (a > 0 || b > 0) {
      var d = P[a][b];
      if (d === 3) { rows.push({ b: a - 1, i: b - 1, status: B[a - 1].text === I[b - 1].text ? "identical" : B[a - 1].norm === I[b - 1].norm ? "spacing" : "differs" }); a--; b--; }
      else if (d === 1) { rows.push({ b: a - 1, i: null, status: "missing_from_import" }); a--; }
      else { rows.push({ b: null, i: b - 1, status: "only_in_import" }); b--; }
    }
    return rows.reverse();
  }
  var ALIGN_LABELS = { identical: "Identical", spacing: "Differs only in spacing", differs: "Wording differs", missing_from_import: "Missing from the imported record", only_in_import: "Only in the imported record" };
  function alignSummary(rows) {
    var o = { identical: 0, spacing: 0, differs: 0, missing_from_import: 0, only_in_import: 0 };
    rows.forEach(function (r) { o[r.status]++; });
    return o;
  }

  // word-level differences for display: [{ t: "same" | "del" | "ins", s }]
  function diffWords(a, b) {
    var A = String(a).split(/(\s+)/), Bw = String(b).split(/(\s+)/);
    var pre = 0;
    while (pre < A.length && pre < Bw.length && A[pre] === Bw[pre]) pre++;
    var suf = 0;
    while (suf < A.length - pre && suf < Bw.length - pre && A[A.length - 1 - suf] === Bw[Bw.length - 1 - suf]) suf++;
    var a2 = A.slice(pre, A.length - suf), b2 = Bw.slice(pre, Bw.length - suf), mid = [];
    if (a2.length * b2.length > 4000000) {
      if (a2.length) mid.push({ t: "del", s: a2.join("") });
      if (b2.length) mid.push({ t: "ins", s: b2.join("") });
    } else {
      var L = [];
      for (var x = 0; x <= a2.length; x++) L.push(new Uint32Array(b2.length + 1));
      for (x = a2.length - 1; x >= 0; x--) for (var y = b2.length - 1; y >= 0; y--) L[x][y] = a2[x] === b2[y] ? L[x + 1][y + 1] + 1 : Math.max(L[x + 1][y], L[x][y + 1]);
      x = 0; y = 0;
      while (x < a2.length && y < b2.length) {
        if (a2[x] === b2[y]) { mid.push({ t: "same", s: a2[x] }); x++; y++; }
        else if (L[x + 1][y] >= L[x][y + 1]) { mid.push({ t: "del", s: a2[x] }); x++; }
        else { mid.push({ t: "ins", s: b2[y] }); y++; }
      }
      while (x < a2.length) mid.push({ t: "del", s: a2[x++] });
      while (y < b2.length) mid.push({ t: "ins", s: b2[y++] });
    }
    var out = [];
    function add(t, s) { if (!s) return; var last = out[out.length - 1]; if (last && last.t === t) last.s += s; else out.push({ t: t, s: s }); }
    add("same", A.slice(0, pre).join(""));
    mid.forEach(function (p) { add(p.t, p.s); });
    add("same", A.slice(A.length - suf).join(""));
    return out;
  }

  /* ---------- conversations: creating, adding turns and merging an import ---------- */
  function newConversation(o) {
    o = o || {};
    return { id: o.id || "CV-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(),
      projectId: o.projectId || "", sessionId: o.sessionId || "", title: o.title || "Research conversation", question: o.question || "",
      createdAt: o.at || new Date().toISOString(), labVersion: o.labVersion || "", condition: o.condition || "custom",
      protocolVersion: o.protocolVersion || null, reminders: o.reminders == null ? null : o.reminders, prompt: o.prompt || "", promptCopiedAt: o.promptCopiedAt || "",
      includeInReport: true, completeConfirmed: false, nextTurn: 1, turns: [], gaps: [], discrepancies: [], metadata: {}, notes: "", artefacts: [],
      events: [{ type: "created", at: o.at || new Date().toISOString(), lab_version: o.labVersion || "" }] };
  }
  function nextId(conv) { var n = conv.nextTurn || conv.turns.length + 1; conv.nextTurn = n + 1; return "T" + String(n).padStart(3, "0"); }
  function addTurn(conv, t, at) {
    var turn = { turn_id: nextId(conv), role: t.role === "ai" ? "ai" : "researcher", kind: t.kind === "administrative" ? "administrative" : "substantive",
      text: unifyLines(t.text), text_status: "original", timestamp: t.timestamp || null, classification: [], attested_by: [],
      provenance: { origin: "researcher_reported", verification: "unreviewed", source_ref: "entered by the researcher", recorded_at: at || new Date().toISOString() } };
    if (turn.role === "researcher" && isCommand(turn.text)) turn.kind = "administrative";
    conv.turns.push(turn);
    return turn;
  }
  // The original conversation is the record of truth. An AI-reproduced record is compared with it, never put in its place,
  // and every difference is kept as a discrepancy: the wording the AI gave, where it differs, or a turn it left out or added.
  // incoming: { turns: [{ role, kind, text, n }], gaps: [{ after: n, missing, reason, reported_by }], original: bool,
  //             origin, artefact, at, sourceRef, metadata: { field: assertion } }
  function mergeImport(conv, incoming) {
    var at = incoming.at || new Date().toISOString();
    var isOrig = !!incoming.original;
    var base = conv.turns.slice();
    var inc = incoming.turns.map(function (t) { return { role: t.role, kind: t.kind, text: unifyLines(t.text), n: t.n }; });
    var rows = align(base, inc);
    var matched = rows.map(function (r, k) { return r.b !== null && r.i !== null ? k : -1; }).filter(function (k) { return k !== -1; });
    var firstM = matched.length ? matched[0] : -1, lastM = matched.length ? matched[matched.length - 1] : -1;
    var inside = function (k) { return firstM !== -1 && k > firstM && k < lastM; };
    var out = [], byN = {}, newAfter = {}, disc = [], added = 0;
    var prov = function () { return { origin: incoming.origin || (isOrig ? "researcher_reported" : "ai_reported"), verification: "unreviewed", source_ref: incoming.sourceRef || "", recorded_at: at }; };
    var attest = function (t) { t.attested_by = (t.attested_by || []).concat(incoming.artefact ? [incoming.artefact] : []); };
    var note = function (d) { d.artefact = incoming.artefact || ""; d.at = at; disc.push(d); };
    rows.forEach(function (r, k) {
      if (r.b !== null) {
        var t = base[r.b];
        if (r.i !== null) {
          var x = inc[r.i];
          if (x.n != null) byN[x.n] = t.turn_id;
          attest(t);
          var baseOrig = t.text_status === "original";
          if (r.status !== "identical" || isOrig !== baseOrig) {
            if (isOrig && !baseOrig) {
              if (r.status === "differs") note({ turn_id: t.turn_id, status: "ai_differs", text: t.text });
              t.text = x.text; t.text_status = "original"; delete t.sha256;
              t.provenance = prov(); t.provenance.verification = "compared_with_original";
            } else if (!isOrig && baseOrig) {
              if (r.status === "differs") note({ turn_id: t.turn_id, status: "ai_differs", text: x.text });
              else if (t.provenance.verification === "unreviewed") t.provenance.verification = "compared_with_original";
            } else if (r.status === "differs") note({ turn_id: t.turn_id, status: "conflict", text: x.text });
          } else if (isOrig && baseOrig && t.provenance.verification === "unreviewed") t.provenance.verification = "researcher_confirmed";
        } else if (inside(k)) {
          // the original has this turn and the AI record does not, or the AI record has it and the original does not
          if (!isOrig && t.text_status === "original") note({ turn_id: t.turn_id, status: "ai_omitted", text: null });
          else if (isOrig && t.text_status !== "original") note({ turn_id: t.turn_id, status: "ai_only", text: t.text });
        }
        out.push(t);
      } else {
        var y = inc[r.i];
        if (inside(k) && !isOrig && base.some(function (b) { return b.text_status === "original"; })) {
          // a turn only the AI record contains, between turns the original confirms: kept as a discrepancy, not added
          note({ turn_id: out.length ? out[out.length - 1].turn_id : null, status: "ai_only", text: y.text });
          return;
        }
        var nt = { turn_id: nextId(conv), role: y.role, kind: y.kind === "administrative" ? "administrative" : "", text: y.text,
          text_status: isOrig ? "original" : "ai_reproduced", timestamp: null, classification: [], attested_by: incoming.artefact ? [incoming.artefact] : [], provenance: prov() };
        if (isOrig && inside(k) && base.length && base.some(function (b) { return b.text_status !== "original"; })) note({ turn_id: nt.turn_id, status: "ai_omitted", text: null });
        if (y.n != null) byN[y.n] = nt.turn_id;
        newAfter[out.length ? out[out.length - 1].turn_id : "start"] = nt.turn_id;
        out.push(nt); added++;
      }
    });
    markAdministrative(out);
    conv.turns = out;
    // gaps the AI reported, placed after the right turn; a gap the original now fills is resolved
    (incoming.gaps || []).forEach(function (g) {
      var after = g.after == null ? null : byN[g.after] || null;
      if (g.after != null && !after) after = null;
      if (conv.gaps.some(function (x) { return x.after_turn === after && !x.resolved; })) return;
      conv.gaps.push({ after_turn: after, missing: g.missing || "unknown", reason: g.reason || "", reported_by: g.reported_by || "ai", resolved: false, artefact: incoming.artefact || "" });
    });
    if (isOrig) conv.gaps.forEach(function (g) {
      var filled = newAfter[g.after_turn || "start"];
      if (g.resolved || !filled) return;
      g.resolved = true; g.resolved_by = incoming.artefact || "transcript";
      // the AI said this turn was missing, so leaving it out is a declared gap, not an omission
      disc = disc.filter(function (d) { return !(d.status === "ai_omitted" && d.turn_id === filled); });
    });
    // the first message is compared with the prompt the researcher copied from the Lab
    var first = conv.turns[0];
    if (conv.prompt && first && first.role === "researcher" && !conv.promptCompared) {
      conv.promptCompared = true;
      if (normaliseText(first.text) === normaliseText(conv.prompt)) { if (first.provenance.verification === "unreviewed") first.provenance.verification = "compared_with_original"; first.matchesCopiedPrompt = true; }
      else note({ turn_id: first.turn_id, status: "differs_from_copied_prompt", text: conv.prompt });
    }
    // metadata: a new assertion only when it says something new
    Object.keys(incoming.metadata || {}).forEach(function (k) {
      var a = incoming.metadata[k], f = conv.metadata[k] || (conv.metadata[k] = { assertions: [] });
      var cur = currentAssertion(f);
      if (cur && cur.status === a.status && String(cur.value) === String(a.value)) return;
      f.assertions.push(a);
    });
    conv.discrepancies = (conv.discrepancies || []).concat(disc);
    if (incoming.artefact) conv.artefacts = (conv.artefacts || []).concat([incoming.artefact]);
    conv.events = (conv.events || []).concat([{ type: isOrig ? "transcript_imported" : "record_imported", at: at, detail: added + " turns added; " + disc.length + " differences recorded" }]);
    if (!isOrig && incoming.recordType) conv.recordType = incoming.recordType;
    return { summary: alignSummary(rows), rows: rows, added: added, discrepancies: disc };
  }
  var DISCREPANCY_LABELS = {
    ai_differs: "The AI record's wording differs from the original",
    ai_omitted: "The AI record leaves out this turn",
    ai_only: "Only the AI record contains this turn",
    conflict: "Two records give different wording",
    differs_from_copied_prompt: "The first message differs from the prompt copied from the Lab"
  };

  /* ---------- metadata assertions ---------- */
  var AI_BASIS = ["shown by application", "reported by AI", "supplied by researcher", "unknown"];
  function statusOfValue(v) {
    var s = String(v == null ? "" : typeof v === "object" ? JSON.stringify(v) : v).trim();
    if (!s || /^unknown$/i.test(s)) return { status: "unknown", value: null };
    if (/not exposed/i.test(s)) return { status: "not_exposed", value: null };
    if (/^(not applicable|n\/a)$/i.test(s)) return { status: "not_applicable", value: null };
    return { status: "confirmation_required", value: s };
  }
  // what an AI system says about itself is stored as AI-reported and unreviewed, whatever basis it claims
  function assertionsFromHeader(meta, at, sourceRef) {
    var out = {};
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return out;
    Object.keys(meta).forEach(function (k) {
      if (FIELD_IDS.indexOf(k) === -1) return;
      var raw = meta[k], v = raw && typeof raw === "object" && !Array.isArray(raw) && "value" in raw ? raw.value : raw;
      var basis = raw && typeof raw === "object" && typeof raw.origin === "string" ? raw.origin : "";
      var sv = statusOfValue(v);
      out[k] = { value: sv.value, status: sv.status, provenance: { origin: "ai_reported", verification: "unreviewed", source_ref: sourceRef || "", recorded_at: at || "" },
        reason: basis && AI_BASIS.indexOf(basis) !== -1 ? "The AI system gave the basis as: " + basis + "." : "" };
    });
    return out;
  }
  function currentAssertion(field) {
    if (!field || !Array.isArray(field.assertions) || !field.assertions.length) return null;
    return field.assertions[field.assertions.length - 1];
  }
  function fieldDone(field) {
    var a = currentAssertion(field);
    if (!a) return false;
    if (a.status === "not_exposed" || a.status === "not_applicable") return true;
    if (a.status === "unknown") return !!(a.reason && a.provenance && a.provenance.origin === "researcher_reported");
    return a.status === "known" || (a.provenance && ["researcher_confirmed", "compared_with_original"].indexOf(a.provenance.verification) !== -1);
  }
  function outstandingFields(metadata) {
    return FIELDS.filter(function (f) { return f.required && !fieldDone((metadata || {})[f.id]); });
  }

  /* ---------- coverage: never complete with a known gap, never complete on the AI's word alone ---------- */
  function coverage(conv) {
    var gaps = (conv.gaps || []).filter(function (g) { return !g.resolved; });
    var hasOriginal = (conv.turns || []).some(function (t) { return t.text_status === "original"; });
    var compared = (conv.turns || []).some(function (t) { return t.provenance && t.provenance.verification === "compared_with_original"; });
    var count = function (kind) { return gaps.filter(function (g) { return g.missing === kind || g.missing === "both"; }).length; };
    var unknownGaps = gaps.some(function (g) { return g.missing === "unknown"; });
    if (gaps.length) return { status: "partial", basis: hasOriginal ? "researcher_confirmed" : "ai_reported", prompts_missing: unknownGaps ? null : count("researcher_prompt"), responses_missing: unknownGaps ? null : count("ai_response") };
    if (conv.completeConfirmed && (conv.turns || []).length) return { status: "complete", basis: compared ? "compared_with_original" : conv.fromProviderExport ? "provider_export" : "researcher_confirmed", prompts_missing: 0, responses_missing: 0 };
    var onlyAi = (conv.turns || []).length && !hasOriginal;
    return { status: "unknown", basis: onlyAi ? "ai_reported" : "none", prompts_missing: null, responses_missing: null };
  }
  var COVERAGE_LABELS = { complete: "Complete", partial: "Partial", unknown: "Not established" };

  /* ---------- the canonical record ---------- */
  function counts(conv) {
    var t = conv.turns || [];
    return {
      researcher_prompts: t.filter(function (x) { return x.role === "researcher" && x.kind !== "administrative"; }).length,
      ai_responses: t.filter(function (x) { return x.role === "ai" && x.kind !== "administrative"; }).length,
      administrative: t.filter(function (x) { return x.kind === "administrative"; }).length,
      gaps: (conv.gaps || []).filter(function (g) { return !g.resolved; }).length
    };
  }
  function buildRecord(conv, extra) {
    extra = extra || {};
    var cov = coverage(conv);
    var hasOriginal = (conv.turns || []).some(function (t) { return t.text_status === "original"; });
    var rec = {
      format: RECORD_FORMAT, schema_version: SCHEMA_VERSION, protocol_version: conv.protocolVersion || null,
      session_id: conv.sessionId || "", conversation_id: conv.id || "", project_id: conv.projectId || "",
      record_type: hasOriginal ? "transcript" : (conv.recordType || "manual"),
      title: conv.title || "", research_question: conv.question || "",
      created_at: conv.createdAt || "", lab_version: extra.labVersion || conv.labVersion || "",
      study: { condition: conv.condition || "custom" },
      protocol: { used: !!conv.protocolVersion, reminders: conv.reminders == null ? null : String(conv.reminders), initial_prompt_copied_at: conv.promptCopiedAt || null },
      metadata: {}, turns: [], gaps: [], counts: counts(conv), coverage: cov,
      taxonomy_version: TAXONOMY_VERSION, notes: conv.notes || "",
      discrepancies: (conv.discrepancies || []).map(function (d) { return { turn_id: d.turn_id || null, status: d.status, imported_text: d.text == null ? null : d.text, artefact: d.artefact || "", resolved: !!d.resolved }; }),
      events: (conv.events || []).slice(),
      provenance: { origin: hasOriginal ? "researcher_reported" : (conv.turns || []).length ? "ai_reported" : "system_recorded", verification: conv.completeConfirmed ? "researcher_confirmed" : "unreviewed" }
    };
    Object.keys(conv.metadata || {}).forEach(function (k) { rec.metadata[k] = { assertions: conv.metadata[k].assertions.slice() }; });
    ["protocol_version", "session_id"].forEach(function (k) {
      var v = k === "protocol_version" ? conv.protocolVersion : conv.sessionId;
      if (v) rec.metadata[k] = { assertions: [{ value: v, status: "known", provenance: { origin: "system_recorded", verification: "unreviewed", source_ref: "Scholarly Prompt Lab", recorded_at: conv.createdAt || "" } }] };
    });
    rec.turns = (conv.turns || []).map(function (t, i) {
      var o = { turn_id: t.turn_id, position: i + 1, parent_id: i ? conv.turns[i - 1].turn_id : null, role: t.role, kind: t.kind || "substantive",
        text: t.text, text_status: t.text_status || "original", sha256: t.sha256 || undefined, timestamp: t.timestamp || null,
        classification: (t.classification || []).map(function (c) { return { category: c.category, status: c.status || "researcher", note: c.note || undefined }; }),
        provenance: t.provenance || { origin: "unknown", verification: "unreviewed" } };
      if (t.evaluation && (Object.keys(t.evaluation.scores || {}).length || Object.keys(t.evaluation.na || {}).length))
        o.evaluation = { scores: Object.assign({}, t.evaluation.scores), not_applicable: Object.assign({}, t.evaluation.na), evaluator: t.evaluation.evaluator || "", notes: t.evaluation.notes || "", recorded_at: t.evaluation.at || "" };
      if (t.corrections && t.corrections.length) o.corrections = t.corrections.slice();
      if (!o.sha256) delete o.sha256;
      return o;
    });
    rec.gaps = (conv.gaps || []).map(function (g) { return { after_turn: g.after_turn || null, missing: g.missing, reason: g.reason || "", reported_by: g.reported_by || "researcher", resolved: !!g.resolved }; });
    return rec;
  }

  // a dependency-free check of the rules in schemas/spl-research-session-record.schema.json
  function validateRecord(r) {
    var e = [];
    var oneOf = function (v, list, where) { if (list.indexOf(v) === -1) e.push(where + ": unexpected value " + JSON.stringify(v)); };
    if (!r || typeof r !== "object" || Array.isArray(r)) return ["The record is not a JSON object."];
    ["format", "schema_version", "session_id", "record_type", "turns", "metadata", "coverage", "provenance"].forEach(function (k) { if (!(k in r)) e.push("missing " + k); });
    if (r.format !== RECORD_FORMAT) e.push("format must be " + RECORD_FORMAT);
    if (typeof r.schema_version !== "string" || !/^\d+\.\d+$/.test(r.schema_version)) e.push("schema_version must look like 0.1");
    if (r.record_type) oneOf(r.record_type, ["checkpoint", "completed_session", "record_part", "transcript", "provider_export", "manual"], "record_type");
    var prov = function (p, where) {
      if (!p || typeof p !== "object") { e.push(where + ": missing provenance"); return; }
      oneOf(p.origin, Object.keys(ORIGINS), where + ".origin");
      if (p.verification !== undefined) oneOf(p.verification, Object.keys(VERIFICATIONS), where + ".verification");
    };
    prov(r.provenance, "provenance");
    if (!Array.isArray(r.turns)) e.push("turns must be a list");
    else {
      var ids = {};
      r.turns.forEach(function (t, i) {
        var w = "turns[" + i + "]";
        if (!t || typeof t !== "object") { e.push(w + " is not an object"); return; }
        ["turn_id", "role", "text", "kind"].forEach(function (k) { if (!(k in t)) e.push(w + ": missing " + k); });
        if (ids[t.turn_id]) e.push(w + ": duplicate turn_id " + t.turn_id);
        ids[t.turn_id] = 1;
        oneOf(t.role, ["researcher", "ai", "system"], w + ".role");
        oneOf(t.kind, ["substantive", "administrative"], w + ".kind");
        if (typeof t.text !== "string") e.push(w + ".text must be text");
        if (t.text_status !== undefined) oneOf(t.text_status, Object.keys(TEXT_STATUSES), w + ".text_status");
        if (t.sha256 !== undefined && !/^[0-9a-f]{64}$/.test(t.sha256)) e.push(w + ".sha256 is not a SHA-256 hash");
        prov(t.provenance, w);
      });
    }
    if (!r.metadata || typeof r.metadata !== "object" || Array.isArray(r.metadata)) e.push("metadata must be an object");
    else Object.keys(r.metadata).forEach(function (k) {
      var f = r.metadata[k];
      if (!f || !Array.isArray(f.assertions)) { e.push("metadata." + k + ": assertions must be a list"); return; }
      f.assertions.forEach(function (a, i) { oneOf(a && a.status, Object.keys(STATUSES), "metadata." + k + "[" + i + "].status"); prov(a && a.provenance, "metadata." + k + "[" + i + "]"); });
    });
    if (!r.coverage || typeof r.coverage !== "object") e.push("coverage must be an object");
    else {
      oneOf(r.coverage.status, ["complete", "partial", "unknown"], "coverage.status");
      oneOf(r.coverage.basis, ["ai_reported", "compared_with_original", "researcher_confirmed", "provider_export", "none"], "coverage.basis");
      var openGaps = (r.gaps || []).filter(function (g) { return !g.resolved; }).length;
      if (r.coverage.status === "complete" && openGaps) e.push("coverage cannot be complete while a gap is recorded");
      if (r.coverage.status === "complete" && r.coverage.basis === "ai_reported") e.push("coverage cannot be complete on the AI system's word alone");
    }
    (r.gaps || []).forEach(function (g, i) { oneOf(g && g.missing, MISSING, "gaps[" + i + "].missing"); });
    return e;
  }

  /* ---------- exports ---------- */
  function who(t) { return (t.role === "ai" ? "AI response" : t.role === "system" ? "System" : "Researcher prompt") + (t.kind === "administrative" ? " (administrative)" : ""); }
  function fence(text) { var ticks = "```"; while (String(text).indexOf(ticks) !== -1) ticks += "`"; return ticks + "text\n" + text + "\n" + ticks; }
  function toMarkdown(conv, o) {
    o = o || {};
    var cov = coverage(conv), c = counts(conv);
    var md = "# " + (conv.title || "Research conversation") + "\n\n";
    md += "- Session: " + (conv.sessionId || "not recorded") + "\n- Protocol: " + (conv.protocolVersion ? "SPL-RSP " + conv.protocolVersion : "not used") + "\n";
    md += "- Researcher prompts: " + c.researcher_prompts + "; AI responses: " + c.ai_responses + "; administrative messages: " + c.administrative + "; gaps: " + c.gaps + "\n";
    md += "- Coverage: " + COVERAGE_LABELS[cov.status] + " (" + cov.basis.replace(/_/g, " ") + ")\n";
    if (o.redacted) md += "- This copy is redacted. It is not a verbatim record.\n";
    md += "\n";
    var gapsAfter = {};
    (conv.gaps || []).forEach(function (g) { if (!g.resolved) (gapsAfter[g.after_turn || "start"] = gapsAfter[g.after_turn || "start"] || []).push(g); });
    var gapText = function (g) { return "> **Gap:** " + g.missing.replace(/_/g, " ") + " missing" + (g.reason ? ". " + g.reason : "") + "\n\n"; };
    (gapsAfter.start || []).forEach(function (g) { md += gapText(g); });
    (conv.turns || []).forEach(function (t) {
      if (o.promptsOnly && t.role !== "researcher") return;
      md += "## " + t.turn_id + " · " + who(t) + "\n\n";
      var bits = [TEXT_STATUSES[t.text_status] || "Original"];
      if (t.timestamp) bits.push(t.timestamp);
      if (t.classification && t.classification.length) bits.push("Purpose: " + t.classification.map(function (x) { return labelOf(x.category) + (x.note ? " (" + x.note + ")" : ""); }).join(", "));
      md += "*" + bits.join(" · ") + "*\n\n" + fence(t.text) + "\n\n";
      (gapsAfter[t.turn_id] || []).forEach(function (g) { md += gapText(g); });
    });
    return md;
  }
  function labelOf(cat) { var x = TAXONOMY.filter(function (t) { return t.id === cat; })[0]; return x ? x.label : cat; }
  function csvCell(v) {
    v = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[",\n\r]/.test(v) ? "\"" + v.replace(/"/g, "\"\"") + "\"" : v;
  }
  function toCsv(conv, criteria, o) {
    o = o || {};
    var crit = (criteria || []).map(function (c) { return c.id; });
    var head = ["conversation_id", "session_id", "turn_id", "position", "role", "kind", "text_status", "verification", "timestamp", "classification"];
    if (!o.promptsOnly) head = head.concat(crit, crit.map(function (c) { return c + "_not_applicable"; }), ["evaluator"]);
    head.push("text");
    var rows = (conv.turns || []).filter(function (t) { return !o.promptsOnly || t.role === "researcher"; }).map(function (t) {
      var ev = t.evaluation || {}, r = [conv.id, conv.sessionId, t.turn_id, conv.turns.indexOf(t) + 1, t.role, t.kind, t.text_status, t.provenance ? t.provenance.verification : "", t.timestamp || "",
        (t.classification || []).map(function (x) { return x.category; }).join("; ")];
      if (!o.promptsOnly) r = r.concat(crit.map(function (c) { return (ev.scores || {})[c] || ""; }), crit.map(function (c) { return (ev.na || {})[c] || ""; }), [ev.evaluator || ""]);
      r.push(t.text);
      return r;
    });
    return "﻿" + [head].concat(rows).map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
  }

  root.LAB_PROTOCOL = {
    PROTOCOL_VERSION: PROTOCOL_VERSION, SCHEMA_VERSION: SCHEMA_VERSION, TRANSFER_FORMAT: TRANSFER_FORMAT, RECORD_FORMAT: RECORD_FORMAT, TAXONOMY_VERSION: TAXONOMY_VERSION,
    newSessionId: newSessionId, isSessionId: isSessionId, coreProtocol: coreProtocol, withProtocol: withProtocol, PROMPT_DIVIDER: PROMPT_DIVIDER, reminderEvery: reminderEvery,
    COMMANDS: COMMANDS, commandText: commandText,
    FIELDS: FIELDS, FIELD_IDS: FIELD_IDS, ORIGINS: ORIGINS, VERIFICATIONS: VERIFICATIONS, STATUSES: STATUSES, TEXT_STATUSES: TEXT_STATUSES, TAXONOMY: TAXONOMY, labelOf: labelOf,
    unifyLines: unifyLines, normaliseText: normaliseText, similarity: similarity,
    parseTransfer: parseTransfer, parseTranscript: parseTranscript, isCommand: isCommand, markAdministrative: markAdministrative,
    align: align, alignSummary: alignSummary, ALIGN_LABELS: ALIGN_LABELS, diffWords: diffWords,
    newConversation: newConversation, addTurn: addTurn, mergeImport: mergeImport, DISCREPANCY_LABELS: DISCREPANCY_LABELS,
    assertionsFromHeader: assertionsFromHeader, currentAssertion: currentAssertion, fieldDone: fieldDone, outstandingFields: outstandingFields,
    coverage: coverage, COVERAGE_LABELS: COVERAGE_LABELS, counts: counts, buildRecord: buildRecord, validateRecord: validateRecord,
    toMarkdown: toMarkdown, toCsv: toCsv
  };
})(typeof self !== "undefined" ? self : globalThis);
