/* Scholarly Prompt Lab: the SPL Research Session Protocol and the Research Session Record.
   Everything in this file is plain logic with no page and no storage, so it can be tested and reused by other tools:
   - the protocol text added to a prompt, and the seven session commands;
   - the metadata fields with guidance by environment, the provenance and verification vocabulary, the follow-up taxonomy;
   - reading what an AI system returns for a checkpoint or session record (the transfer format), in one or several parts;
   - splitting a pasted transcript into turns, and reading ChatGPT and Claude data exports;
   - conversations as trees (regenerated responses, edited prompts, branches), with one active path;
   - aligning an AI-reproduced record with the original conversation, turn by turn;
   - Claim History, conversation-level observations, researcher decisions, follow-up prompt templates;
   - comparison of conversations, timelines, redaction, and every export format;
   - building and checking the canonical Research Session Record.
   The specification is docs/research-session-protocol.md. Nothing here sends anything anywhere. */
(function (root) {
  "use strict";

  var PROTOCOL_VERSION = "0.2";
  var SCHEMA_VERSION = "0.2";
  var TRANSFER_FORMAT = "spl-rsr-transfer/0.2";
  var RECORD_FORMAT = "spl-research-session-record";
  var TAXONOMY_VERSION = "0.1";

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
    if (o.initialRecord !== false) rules.push("After your first substantive answer, add a short section headed \"SPL Research Session — Initial Record\": the AI provider, product, model and settings you can actually establish, the session start date if available to you, and for each item you cannot establish, one line on where the researcher might find it. The research answer comes first.");
    rules.push("Do not reproduce the conversation record unless the researcher sends a message beginning \"SPL:\". Those messages carry their own instructions. " +
      (every
        ? "About every " + every + " substantive researcher messages, and when the model, sources or procedure change, an analytical stage ends, or the researcher says they will continue later, add one line headed \"SPL Research Session — Checkpoint reminder\" naming only the metadata still outstanding and the command \"SPL: SAVE RESEARCH CHECKPOINT\". Do not ask again for information already supplied. Stop the reminders if asked. If the researcher says the session has ended, mention \"SPL: END RESEARCH SESSION\"."
        : "Do not add reminders about documentation: the researcher will send those messages when needed."));
    rules.push("Never ask for passwords, keys, tokens or private system instructions.");
    return "SPL RESEARCH SESSION PROTOCOL · version " + PROTOCOL_VERSION + " · session " + (o.session || "[session]") + "\n" +
      "This conversation is a scholarly research session documented with Scholarly Prompt Lab. Answer the research prompt that follows this protocol as you normally would. Throughout the session:\n" +
      rules.map(function (r, i) { return (i + 1) + ". " + r; }).join("\n");
  }
  var PROMPT_DIVIDER = "--- RESEARCH PROMPT ---";
  function withProtocol(prompt, o) { return coreProtocol(o) + "\n\n" + PROMPT_DIVIDER + "\n\n" + String(prompt || ""); }

  /* ---------- metadata fields, with guidance by environment ---------- */
  // required: "yes" always, "closure" once the session has ended, "" where available.
  // ai: whether an AI system can usually establish the value itself. may: whether it may legitimately stay unavailable.
  // where: guidance by kind of environment. It never names menus, which change between versions and platforms.
  var FIELDS = [
    { id: "ai_provider", label: "AI provider", required: "yes", ai: "partly", may: false, why: "Identifies the organisation whose system produced the outputs.",
      where: { general: "The company or project named in the application, on its website or in your account.", local: "The organisation or person who released the model file you ran." } },
    { id: "ai_product", label: "AI product or application", required: "yes", ai: "partly", may: false, why: "The same model can behave differently in different products, which may add their own instructions and tools.",
      where: { general: "The name of the application or service you used, as it appears in the interface.", api: "The API or platform you called, as named in its documentation.", local: "The program you used to run the model." } },
    { id: "model_name", label: "Model name", required: "yes", ai: "partly", may: false, why: "Outputs depend on the model. The advertised name is not always the exact model behind it.",
      where: { general: "The model the application shows as selected for this conversation.", consumer: "Usually shown by the model selector of the conversation. It may name a model family rather than an exact model.", api: "The model field of your API request; the response usually repeats it.", local: "The model file name or tag you loaded.", export: "A data export may record the model for each message." } },
    { id: "model_version", label: "Model version or release identifier", required: "yes", ai: "rarely", may: true, why: "Providers update models under the same name, so the exact release affects reproducibility.",
      where: { general: "Rarely shown. If it is not available, record the advertised model name and that the exact version was not exposed.", consumer: "Consumer applications often show only the model family. Record it as not exposed by the provider if no version is shown.", api: "API responses usually return the exact model identifier, often with a date.", local: "The release or checksum of the model file.", docs: "The provider's model documentation or release notes may say what an advertised name referred to on a given date." } },
    { id: "session_start", label: "Research session start date", required: "yes", ai: "rarely", may: false, why: "Places the conversation in time, since models and their data change.",
      where: { general: "The date of the first message in the application's conversation history, a data export, or your own note of when you began.", export: "The creation time of the conversation in the data export." } },
    { id: "session_end", label: "Research session end date", required: "closure", ai: "rarely", may: false, why: "Shows how long the conversation ran and whether it spanned a model update.",
      where: { general: "The date of the last message, in the application, a data export or your own note." } },
    { id: "message_timestamps", label: "Individual message timestamps", required: "", ai: "rarely", may: true, why: "Shows when each prompt was submitted and each response produced.",
      where: { general: "Some applications show a time for each message; a data export usually records them. Record whether they are available; the times themselves are kept with each turn." } },
    { id: "time_zone", label: "Time and time zone", required: "", ai: "no", may: true, why: "Dates near midnight can fall on different days in different time zones.", where: { general: "Your device's time zone, or the offset in a data export." } },
    { id: "knowledge_cutoff", label: "Knowledge cutoff", required: "", ai: "partly", may: true, why: "Shows which events the model can know about without browsing.", where: { general: "The provider's model documentation.", docs: "Model documentation usually states the training cut-off; record the page and the date consulted." } },
    { id: "reasoning_mode", label: "Reasoning or thinking mode", required: "", ai: "partly", may: true, why: "Extended reasoning modes can change the analysis produced.", where: { general: "Usually beside the model selector, or in the API request.", api: "A reasoning or thinking parameter in the API request, if the model offers one." } },
    { id: "temperature", label: "Temperature", required: "", ai: "rarely", may: true, why: "Affects how much outputs vary between runs.", where: { general: "Consumer applications usually do not show it: record it as not exposed by the provider.", api: "The temperature parameter of your API request, or the provider's default if you did not set it.", local: "The inference settings of the program you used." } },
    { id: "top_p", label: "Top-p", required: "", ai: "rarely", may: true, why: "Another setting that affects variation between runs.", where: { general: "Usually not exposed in consumer applications.", api: "The top_p parameter of your API request.", local: "The inference settings of the program you used." } },
    { id: "max_output", label: "Maximum output settings", required: "", ai: "rarely", may: true, why: "Long answers can be cut off at this limit.", where: { general: "Rarely shown in consumer applications.", api: "The maximum-tokens parameter of your API request.", local: "The inference settings of the program you used." } },
    { id: "other_settings", label: "Other relevant generation settings", required: "", ai: "partly", may: true, why: "Any setting that may affect the analysis, such as a system prompt or a style option.", where: { general: "The application's settings for this conversation, or your API request." } },
    { id: "tools_available", label: "Tools available", required: "", ai: "partly", may: true, why: "Tools such as code execution, search or document reading change what the system can do.", where: { general: "The tools shown as switched on for the conversation." } },
    { id: "tools_used", label: "Tools actually used", required: "", ai: "partly", may: true, why: "Shows whether an answer drew on a tool rather than the model alone.", where: { general: "Tool use is often shown inside the response, for example as a search or a code block that was run." } },
    { id: "web_browsing", label: "Web browsing", required: "", ai: "partly", may: true, why: "Browsing brings in material outside your sources. The protocol never switches it on.", where: { general: "The application's search or browsing option for this conversation, and any web sources shown in a response." } },
    { id: "retrieval", label: "External retrieval or search", required: "", ai: "partly", may: true, why: "Retrieval from files, databases or connected services adds material the researcher did not supply in the conversation.", where: { general: "Connected services, knowledge bases or project files attached to the conversation." } },
    { id: "uploaded_files", label: "Uploaded files", required: "", ai: "partly", may: true, why: "Files add material to the conversation. Record identifiers and where they came from.", where: { general: "The files attached to the conversation or its project. The Lab records the SHA-256 fingerprint of the source text in Build." } },
    { id: "memory", label: "Memory or personalisation", required: "", ai: "rarely", may: true, why: "Remembered information can shape answers without appearing in the conversation.", where: { general: "The application's personalisation or memory settings. You may record only whether it was on, without any content." } },
    { id: "custom_instructions", label: "Relevant custom instructions", required: "", ai: "rarely", may: true, why: "Standing instructions set by the user are applied to every conversation.", where: { general: "Your account's custom instructions, if any. Record them only if you choose to, leaving out anything private or irrelevant." } },
    { id: "access_method", label: "AI application or access method", required: "", ai: "no", may: false, why: "Web, desktop, mobile, API and local use can differ in settings and hidden instructions.", where: { general: "How you reached the system: web application, desktop application, mobile application, API, or a model run on your own computer." } },
    { id: "model_changes", label: "Model changes during the conversation", required: "", ai: "partly", may: true, why: "A change of model part-way through means later turns come from a different system. The model can also be recorded for each turn.", where: { general: "The model shown beside each response, or a data export's per-message model field." } }
  ];
  var FIELD_IDS = FIELDS.map(function (f) { return f.id; });
  // keys used by protocol version 0.1 and by older Lab records
  var FIELD_ALIASES = { ai_system: "ai_product", tools: "tools_available" };
  function environmentOf(metadata) {
    var a = currentAssertion((metadata || {}).access_method);
    var v = String(a && a.value || "").toLowerCase();
    if (/\bapi\b/.test(v)) return "api";
    if (/local|ollama|lm studio|llama\.cpp|own computer|self-hosted/.test(v)) return "local";
    if (/web|desktop|mobile|app|browser|phone/.test(v)) return "consumer";
    return "";
  }
  // guidance for one field, for the environment the researcher has recorded, with the general advice as well
  function guidanceFor(field, metadata) {
    var env = environmentOf(metadata), w = field.where || {}, out = [];
    if (env && w[env]) out.push(w[env]);
    out.push(w.general);
    if (w.export) out.push(w.export);
    if (w.docs) out.push(w.docs);
    return out.filter(function (x, i) { return x && out.indexOf(x) === i; });
  }

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
  var TAX_IDS = TAXONOMY.map(function (t) { return t.id; });
  function labelOf(cat) { var x = TAXONOMY.filter(function (t) { return t.id === cat; })[0]; return x ? x.label : cat; }

  /* ---------- follow-up prompt builder: starting wordings the researcher edits ---------- */
  // {turn}: the response examined; {claim}: the claim examined; {material}: what the researcher adds.
  var FOLLOWUP_TEMPLATES = {
    clarification: "In {turn}, you wrote: {claim}. Explain precisely what you mean by this, and identify the words in the sources on which it rests.",
    evidence_examination: "Identify the source material supporting the interpretation in {turn}: {claim}. Provide the relevant quotations with their source identifiers, and explain how each supports the claim.",
    counter_evidence: "Examine the following material for evidence that challenges your interpretation in {turn}: {claim}. Explain whether this evidence warrants a revision of your earlier claim, and on what grounds.\n\n{material}",
    contextual_correction: "Reconsider your interpretation in {turn} in the light of the cultural, linguistic or historical context below. Identify which aspects of your earlier interpretation require revision and explain why.\n\n{material}",
    theoretical_reframing: "Re-examine the material discussed in {turn} through the following theoretical perspective. Say where this reading differs from your earlier one, and where the evidence does not fit either.\n\n{material}",
    interpretive_challenge: "Examine the assumptions underlying your interpretation in {turn}: {claim}. Identify alternative readings that are defensible in relation to the available evidence.",
    methodological_correction: "Your response in {turn} departs from the research procedure set out at the start of this session. Identify the departure and redo the analysis following the procedure.\n\n{material}",
    alternative_interpretation: "Set out the other defensible readings of the material discussed in {turn}, with the evidence for and against each.",
    scope_correction: "Your claim in {turn} may go beyond what the evidence can show: {claim}. State what the sources can and cannot establish, and restate the claim within those limits.",
    synthesis: "Drawing only on the exchanges so far in this session, set out the interpretation that the evidence now supports, noting which earlier claims were revised and why.",
    analytical_extension: "Extend the analysis to the following material or question, using the same procedure and keeping new material distinct from the original sources.\n\n{material}",
    instruction_refinement: "From now on in this session, apply this revised instruction. Say if it conflicts with any earlier instruction.\n\n{material}",
    researcher_influence: "Evaluate the following interpretation, which is mine, against the source material. Identify the aspects the evidence supports and those that require qualification or further investigation. Do not adopt it because I have stated it.\n\n{material}",
    researcher_defined: "{material}"
  };
  var FOLLOWUP_REQUIREMENTS = [
    { id: "quote", text: "Quote the exact words of the sources for every substantive claim, with their identifiers." },
    { id: "obs", text: "Keep observations grounded in the sources apart from interpretation." },
    { id: "revision", text: "If you revise an earlier claim, identify it and say whether the revision rests on evidence or on my instruction." },
    { id: "uncert", text: "State the uncertainty that remains." },
    { id: "sources", text: "Use only the sources supplied in this session." }
  ];
  function buildFollowUp(o) {
    o = o || {};
    var t = FOLLOWUP_TEMPLATES[o.purpose] || FOLLOWUP_TEMPLATES.researcher_defined;
    var claim = o.claim ? "“" + o.claim + "”" : "[the claim you are examining]";
    var text = t.replace(/\{turn\}/g, o.turnLabel || "your previous response").replace(/\{claim\}/g, claim).replace(/\{material\}/g, o.material || "[add the material here]");
    var req = FOLLOWUP_REQUIREMENTS.filter(function (r) { return (o.requirements || []).indexOf(r.id) !== -1; }).map(function (r) { return "- " + r.text; });
    return (text.replace(/\n\n$/, "") + (req.length ? "\n\nIn your answer:\n" + req.join("\n") : "")).trim();
  }

  /* ---------- the seven session commands ---------- */
  function formatInstructions(session, recordType) {
    return "Format (exactly):\n" +
      "1. A line \"SPL-HEADER\", then one JSON object with: \"format\": \"" + TRANSFER_FORMAT + "\", \"protocol\": \"" + PROTOCOL_VERSION + "\", \"session\": \"" + session + "\", \"record_type\": \"" + recordType + "\", \"part\": 1, \"parts_total\": a number or \"unknown\", \"covers\": [first turn number, last turn number], \"coverage\": \"complete\", \"partial\" or \"unknown\", \"access_to_beginning\": true, false or \"unknown\" (whether you can see the start of this conversation), \"previous_checkpoints_used\": true or false, " +
      "\"metadata\": an object using only these keys: " + FIELD_IDS.join(", ") + "; each value is {\"value\": ..., \"origin\": \"shown by application\" | \"reported by AI\" | \"supplied by researcher\" | \"unknown\"}, " +
      "\"gaps\": a list of {\"after_turn\": number, \"missing\": \"researcher_prompt\" | \"ai_response\" | \"both\" | \"unknown\", \"reason\": text}, " +
      "\"claims\": a list of {\"id\": \"CL-001\", \"text\": exact words of the claim, \"first_turn\": number, \"developments\": [{\"turn\": number, \"type\": \"challenged\" | \"evidence_requested\" | \"evidence_added\" | \"counter_evidence\" | \"reworded\" | \"qualified\" | \"retracted\" | \"error_recurred\" | \"unresolved\", \"note\": text}]}, " +
      "and \"decisions\": a list of {\"turn\": number, \"text\": the researcher's decision in their own words, \"explicit\": true if the researcher stated it, false if you are inferring it}.\n" +
      "2. Every turn, numbered from 1 at the start of the conversation, as:\n<<<SPL-TURN 7 role=researcher>>>\n(the exact text)\n<<<SPL-END 7>>>\n" +
      "Use role=researcher for the researcher's messages and role=ai for your responses. Add kind=admin for SPL commands, metadata confirmations and your replies to them. Add exact=no if you are not certain the wording is exact. You may add purpose= with one or more of " + TAX_IDS.join(", ") + " (comma-separated) to a researcher turn; these are suggestions for the researcher to review. If the model changed, add model=\"name\" to the first response from the new model. For example <<<SPL-TURN 8 role=researcher purpose=counter_evidence>>>.\n" +
      "3. Where a turn is missing, write this instead of the turn:\n<<<SPL-GAP after=6 missing=researcher_prompt>>>\n(why it is missing)\n<<<SPL-END GAP>>>\n" +
      "4. A line \"SPL-NOTES\", then short notes kept apart from the verbatim turns: analytical developments, evidence introduced, corrections, outstanding issues.\n" +
      "If this will not fit in one response, stop after a complete turn, say \"Continue with: SPL: " + (recordType === "completed_session" ? "END RESEARCH SESSION" : "SAVE RESEARCH CHECKPOINT") + " part 2\", and give each part its own SPL-HEADER with its part number and the turns it covers.";
  }
  var VERBATIM_RULES = "Rules:\n" +
    "- Reproduce every researcher message and every one of your responses verbatim, in order, including short, repetitive, unsuccessful or administrative ones. Do not summarise, shorten, correct or improve any researcher message. Keep the original formatting.\n" +
    "- If any earlier message or response is no longer available to you, or you are not certain of its exact wording, do not reconstruct it. Write a GAP block saying what is missing and why.\n" +
    "- Do not claim the record is complete unless you can see the whole conversation.\n" +
    "- Never invent model details, dates or settings. Use \"unknown\" or \"not exposed by provider\".";
  var COMMANDS = [
    { id: "start", name: "START RESEARCH SESSION", label: "Start in an existing conversation",
      use: "Begins documentation part-way through a conversation that did not start with the protocol.",
      body: function (s) { return "From this message on, this conversation is a scholarly research session documented with Scholarly Prompt Lab (session " + s + ", protocol " + PROTOCOL_VERSION + ").\n" + coreProtocol({ session: s, reminders: 10, initialRecord: false }).split("\n").slice(2).join("\n").replace("in this first message", "established so far in this conversation") + "\nState that the earlier messages in this conversation precede the start of documentation. Then give a section headed \"SPL Research Session — Initial Record\": the AI provider, product, model and settings you can actually establish, and for each item you cannot establish, one line on where the researcher might find it."; } },
    { id: "review", name: "REVIEW RESEARCH METADATA", label: "Review metadata",
      use: "Shows what is known about the system and the session, and what is still outstanding.",
      body: function () { return "Show the current metadata for this session. For each item give: the value; its origin (shown by the application, reported by you, supplied by the researcher, or unknown); and whether the researcher has confirmed it. Use these items: " + FIELDS.map(function (f) { return f.label.replace(/^([A-Z])(?=[a-z])/, function (c) { return c.toLowerCase(); }); }).join("; ") + ".\nFor each outstanding item, say briefly why it matters, whether you can establish it, where the researcher might find it in this kind of application (without inventing menu names), whether the provider is known to disclose it, how to record it, and whether it may legitimately remain unavailable. Do not invent values. Do not reproduce the conversation."; } },
    { id: "confirm", name: "CONFIRM RESEARCH METADATA", label: "Confirm metadata",
      use: "Records the values the researcher supplies. Write them after the command.",
      body: function () { return "Record the values I give below as supplied by the researcher. Keep any earlier value with its origin, and note where my value differs from it. Then list what is still outstanding, in one or two lines. Do not ask again for anything I have confirmed.\nMy values (for example: Model displayed: …; Thinking mode: …; Session start date: …; Time zone: …; Exact backend version: Not exposed by provider; Temperature: Not exposed by provider; Memory: enabled, disabled or unknown):\n"; } },
    { id: "checkpoint", name: "SAVE RESEARCH CHECKPOINT", label: "Save a checkpoint",
      use: "Produces a record of the conversation so far, to paste into the Lab.",
      body: function (s) { return "Produce a research checkpoint for this session, covering every exchange since the session began.\n" + VERBATIM_RULES + "\n" + formatInstructions(s, "checkpoint"); } },
    { id: "end", name: "END RESEARCH SESSION", label: "End the session",
      use: "Closes this documentation interval with a final metadata review and the complete record.",
      body: function (s) { return "This research session's documentation ends here; the study itself may continue.\nFirst give a short section headed \"SPL Research Session — Final Record\": the AI provider, product and model as established, the start and end dates if available, any change of model or settings during the session, the values the researcher confirmed, the items still outstanding with one line each on where to find them, the coverage of the conversation you can see, and any part you can no longer see. Then produce the completed record at once, marking every outstanding item as unknown; the researcher can complete it later in the Lab.\n" + VERBATIM_RULES + "\n" + formatInstructions(s, "completed_session"); } },
    { id: "resume", name: "RESUME RESEARCH SESSION", label: "Resume from a checkpoint",
      use: "Continues the session in a new conversation or another AI system. Paste the checkpoint after the command.",
      body: function (s) { return "The text below is a checkpoint from an earlier part of research session " + s + ". Treat it as transferred context: it is not your memory, and you did not necessarily write it. Say which AI provider, product and model you are, as far as you can establish, and whether that differs from the record. Continue the session under the protocol it contains (version " + PROTOCOL_VERSION + "). Number new turns after the last turn in the checkpoint. In later records, mark the turns from the checkpoint as transferred, not as turns you saw.\nCheckpoint:\n"; } },
    { id: "status", name: "RESEARCH SESSION STATUS", label: "Session status",
      use: "A short account of where the session stands.",
      body: function () { return "Give a short status of this session: the research question, the current analytical position, outstanding uncertainties, the methodological instructions that apply, outstanding metadata, and any sign that earlier parts of the conversation are no longer available to you; if so, suggest that the researcher keeps a checkpoint or the original transcript. Do not claim to monitor your context capacity. Do not reproduce the conversation."; } }
  ];
  function commandText(id, session) {
    var c = COMMANDS.filter(function (x) { return x.id === id; })[0];
    if (!c) return "";
    return "SPL: " + c.name + " · protocol " + PROTOCOL_VERSION + " · session " + (session || "[session]") + "\n" + c.body(session || "[session]");
  }

  /* ---------- text helpers ---------- */
  function str(v) { return typeof v === "string" ? v : v == null ? "" : String(v); }
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
  function pad3(n) { return String(n).padStart(3, "0"); }

  /* ---------- reading an AI system's checkpoint or session record, in one part or several ---------- */
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
  var CLAIM_EVENTS = {
    introduced: "Introduced", challenged: "Challenged by the researcher", evidence_requested: "Evidence requested", evidence_added: "Evidence added",
    counter_evidence: "Counter-evidence introduced", reworded: "Reworded", narrowed: "Narrowed", widened: "Widened", qualified: "Qualified",
    retracted: "Retracted", error_recurred: "Error recurred", reaffirmed: "Reaffirmed", researcher_decision: "Researcher decision", unresolved: "Left unresolved"
  };
  // The record's top-level blocks, read with a stack. A turn's own text may legitimately contain markers: the researcher's
  // checkpoint command shows example markers, and a completed record reproduces an earlier checkpoint inside a turn.
  // Those inner markers stay part of the turn's text and are never read as structure.
  function blocks(text) {
    var tok = /<<<SPL-TURN\s+(\d+)([^>]*)>>>|<<<SPL-GAP([^>]*)>>>|<<<SPL-END\s+(\d+|GAP)\s*>>>/g, m, stack = [], turns = [], gaps = [], unclosed = [], outside = [], last = 0;
    var body = function (from, to) { var t = text.slice(from, to); return t.replace(/^[ \t]*\n/, "").replace(/\n$/, ""); };
    while ((m = tok.exec(text))) {
      if (m[1] !== undefined || m[3] !== undefined) {
        var open = m[1] !== undefined ? { kind: "turn", n: parseInt(m[1], 10), attrs: m[2], start: m.index, inner: m.index + m[0].length } : { kind: "gap", attrs: m[3], start: m.index, inner: m.index + m[0].length };
        if (!stack.length) outside.push(text.slice(last, m.index));
        stack.push(open);
        continue;
      }
      var end = m[4];
      // close the innermost block this marker ends; a stray end marker inside a turn is part of its text
      for (var k = stack.length - 1; k >= 0; k--) {
        var b = stack[k];
        if ((end === "GAP" && b.kind === "gap") || (b.kind === "turn" && String(b.n) === end)) {
          stack.length = k;
          if (k === 0) {
            if (b.kind === "turn") turns.push({ n: b.n, attrs: b.attrs, text: body(b.inner, m.index) });
            else gaps.push({ attrs: b.attrs, text: body(b.inner, m.index).trim() });
            last = m.index + m[0].length;
          }
          break;
        }
      }
    }
    if (stack.length) { unclosed = stack[0].kind === "turn" ? [stack[0].n] : []; outside.push(text.slice(last, stack[0].start)); }
    else outside.push(text.slice(last));
    return { turns: turns, gaps: gaps, unclosed: unclosed, outside: outside.join("\n") };
  }
  function parseTransfer(raw, expectSession) {
    var text = unifyLines(raw);
    var out = { header: null, headers: [], parts: [], turns: [], gaps: [], notes: "", claims: [], decisions: [], errors: [], warnings: [] };
    var bl = blocks(text), outside = bl.outside;
    // every part has its own header, outside the turns; the first readable one supplies the metadata
    var re0 = /SPL-HEADER/g, m0;
    while ((m0 = re0.exec(outside))) {
      var j = jsonAfter(outside, m0.index);
      if (!j || j.open) { out.errors.push("A header after SPL-HEADER is incomplete."); continue; }
      try { var h = JSON.parse(j.text); if (h && typeof h === "object" && !Array.isArray(h)) out.headers.push(h); else out.errors.push("A header is not a JSON object."); }
      catch (e) { out.errors.push("A header after SPL-HEADER is not valid JSON, so its metadata cannot be read. The turns can still be read."); }
    }
    if (!/SPL-HEADER/.test(outside)) out.errors.push("This is not an SPL record: it has no SPL-HEADER line. If it is a copy of the conversation itself, import it as a transcript.");
    var hd = out.header = out.headers[0] || null;
    out.headers.forEach(function (h) {
      if (typeof h.format !== "string" || h.format.indexOf("spl-rsr-transfer/") !== 0) out.warnings.push("A header does not name the SPL transfer format.");
      if (expectSession && h.session && h.session !== expectSession) out.warnings.push("This record is for session " + h.session + ", not " + expectSession + ".");
      if (h.record_type && ["checkpoint", "completed_session"].indexOf(h.record_type) === -1) out.warnings.push("Unexpected record type: " + h.record_type + ".");
      if (Number.isInteger(h.part)) out.parts.push({ part: h.part, total: Number.isInteger(h.parts_total) ? h.parts_total : null, covers: Array.isArray(h.covers) ? h.covers : null });
    });
    if (out.parts.length) {
      var total = out.parts.reduce(function (m, p) { return p.total ? Math.max(m, p.total) : m; }, 0);
      var have = out.parts.map(function (p) { return p.part; });
      var missing = [];
      for (var k = 1; k <= total; k++) if (have.indexOf(k) === -1) missing.push(k);
      if (missing.length) out.warnings.push("Part" + (missing.length > 1 ? "s " : " ") + missing.join(", ") + " of " + total + " " + (missing.length > 1 ? "are" : "is") + " not included. You can import " + (missing.length > 1 ? "them" : "it") + " later into the same conversation.");
    }

    var seen = {};
    bl.turns.forEach(function (bt) {
      var n = bt.n, a = attrs(bt.attrs);
      if (seen[n] !== undefined) { if (seen[n] !== bt.text) out.warnings.push("Turn " + n + " appears twice in this record with different wording; the first copy is used."); return; }
      seen[n] = bt.text;
      var role = (a.role || "").toLowerCase(), kind = (a.kind || "").toLowerCase() === "admin" ? "administrative" : "";
      if (role === "admin") { kind = "administrative"; role = ""; }
      if (role === "user" || role === "human") role = "researcher";
      if (role === "assistant" || role === "model") role = "ai";
      var t = { n: n, role: role, kind: kind, text: bt.text };
      if (/^(no|false)$/i.test(a.exact || "")) t.reconstructed = true;
      if (a.purpose) t.purposes = a.purpose.split(",").map(function (x) { return x.trim(); }).filter(function (x) { return TAX_IDS.indexOf(x) !== -1; });
      if (a.model) t.model = a.model;
      out.turns.push(t);
    });
    // a turn that starts and never ends: the response was cut off at its length limit
    bl.unclosed.forEach(function (n) { out.errors.push("Turn " + n + " starts but has no end marker. The response was probably cut off: ask for the next part, and paste all parts together."); });
    bl.gaps.forEach(function (g) {
      var ga = attrs(g.attrs);
      out.gaps.push({ after: ga.after != null && /^\d+$/.test(ga.after) ? parseInt(ga.after, 10) : null, missing: MISSING.indexOf(ga.missing) !== -1 ? ga.missing : "unknown", reason: g.text, reported_by: "ai" });
    });
    out.headers.forEach(function (h) {
      if (Array.isArray(h.gaps)) h.gaps.forEach(function (g) {
        if (!g || typeof g !== "object") return;
        var after = Number.isInteger(g.after_turn) ? g.after_turn : null;
        if (!out.gaps.some(function (x) { return x.after === after; }))
          out.gaps.push({ after: after, missing: MISSING.indexOf(g.missing) !== -1 ? g.missing : "unknown", reason: str(g.reason), reported_by: "ai" });
      });
      if (Array.isArray(h.claims)) h.claims.forEach(function (c) {
        if (!c || typeof c.text !== "string" || !c.text.trim()) return;
        out.claims.push({ id: str(c.id), text: c.text, first_turn: Number.isInteger(c.first_turn) ? c.first_turn : null,
          developments: (Array.isArray(c.developments) ? c.developments : []).filter(function (d) { return d && Number.isInteger(d.turn); }).map(function (d) { return { turn: d.turn, type: CLAIM_EVENTS[d.type] ? d.type : "unresolved", note: str(d.note) }; }) });
      });
      if (Array.isArray(h.decisions)) h.decisions.forEach(function (d) {
        if (d && typeof d.text === "string" && d.text.trim()) out.decisions.push({ turn: Number.isInteger(d.turn) ? d.turn : null, text: d.text, explicit: d.explicit === true });
      });
    });
    out.turns.sort(function (x, y) { return x.n - y.n; });
    // roles the record left out are inferred from alternation and marked as inferred
    out.turns.forEach(function (t, i) {
      if (!t.role) { var prev = out.turns[i - 1]; t.role = prev ? (prev.role === "researcher" ? "ai" : "researcher") : "researcher"; t.roleInferred = true; out.warnings.push("Turn " + t.n + " did not say who wrote it; the Lab inferred " + (t.role === "ai" ? "the AI" : "the researcher") + ". Check it."); }
    });
    // numbering jumps that nobody explained are gaps too (within each part's range)
    var start = hd && Array.isArray(hd.covers) && Number.isInteger(hd.covers[0]) ? hd.covers[0] : (out.turns.length ? out.turns[0].n : 1);
    var expect = start;
    out.turns.forEach(function (t) {
      if (t.n > expect) {
        var explained = out.gaps.some(function (g) { return g.after !== null && g.after >= expect - 1 && g.after < t.n; });
        var inPart = out.parts.some(function (p) { return p.covers && p.covers[0] === t.n; });
        if (!explained) out.gaps.push({ after: expect - 1 > 0 ? expect - 1 : null, missing: "unknown", reason: "Turn" + (t.n - expect > 1 ? "s " + expect + " to " + (t.n - 1) + " are" : " " + expect + " is") + (inPart ? " in a part of the record that is not included." : " missing from the numbering."), reported_by: "lab_alignment" });
      }
      expect = Math.max(expect, t.n + 1);
    });
    for (var i = 1; i < out.turns.length; i++) {
      if (out.turns[i].role === out.turns[i - 1].role && out.turns[i].n === out.turns[i - 1].n + 1)
        out.warnings.push("Turns " + out.turns[i - 1].n + " and " + out.turns[i].n + " are both by " + (out.turns[i].role === "ai" ? "the AI" : "the researcher") + ". A turn may be missing or mislabelled.");
    }
    var notes = [], nre = /^SPL-NOTES[ \t]*\n([\s\S]*?)(?=^SPL-HEADER|$(?![\s\S]))/gm, nm;
    while ((nm = nre.exec(outside))) { var body = nm[1].replace(/<<<SPL-[\s\S]*$/, "").trim(); if (body) notes.push(body); if (!nm[0]) break; }
    out.notes = notes.join("\n\n");
    if (!out.turns.length && !out.errors.length) out.errors.push("No turns were found in this record.");
    return out;
  }

  /* ---------- splitting a pasted transcript into turns ---------- */
  var R_NAMES = "you said|you|user|human|me|researcher|prompt|question";
  var A_NAMES = "chatgpt said|assistant said|claude said|gemini said|copilot said|chatgpt|assistant|ai|claude|gemini|copilot|model|response|answer|bot|grok|deepseek|mistral|llama|perplexity|le chat";
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

  /* ---------- provider data exports ---------- */
  // Built from the publicly described structure of these exports and tested against constructed samples; see docs/provider-exports.md.
  // Each conversation becomes { title, created, updated, nodes: [{ key, parent, role, text, timestamp, model, nonText }], activeKey, provider, skipped }.
  function isoFromEpoch(x) { var n = Number(x); if (!isFinite(n) || n <= 0) return null; return new Date(n * 1000).toISOString(); }
  function isoOrNull(x) { var d = new Date(x); return x && !isNaN(d) ? d.toISOString() : null; }
  function chatgptText(content) {
    if (!content || typeof content !== "object") return { text: "", nonText: 0 };
    var parts = Array.isArray(content.parts) ? content.parts : [], txt = [], non = 0;
    parts.forEach(function (p) { if (typeof p === "string") txt.push(p); else if (p && typeof p.text === "string") txt.push(p.text); else if (p) { non++; txt.push("[non-text content: " + str(p.content_type || "attachment") + "]"); } });
    if (!parts.length && typeof content.text === "string") txt.push(content.text);
    return { text: txt.join("\n"), nonText: non };
  }
  function readChatGPT(conv) {
    var map = conv && conv.mapping;
    if (!map || typeof map !== "object") return null;
    var keys = Object.keys(map), included = {}, nodes = [], skipped = { system: 0, tool: 0, hidden: 0, empty: 0 };
    keys.forEach(function (k) {
      var nd = map[k], msg = nd && nd.message;
      if (!msg || !msg.author) return;
      var role = msg.author.role, meta = msg.metadata || {};
      if (role === "system") { skipped.system++; return; }
      if (role === "tool") { skipped.tool++; return; }
      if (meta.is_visually_hidden_from_conversation) { skipped.hidden++; return; }
      if (role !== "user" && role !== "assistant") return;
      var ct = msg.content || {};
      if (role === "assistant" && ct.content_type && ["text", "multimodal_text", "code"].indexOf(ct.content_type) === -1) { skipped.tool++; return; }
      var t = chatgptText(ct);
      if (!t.text.trim()) { skipped.empty++; return; }
      included[k] = true;
      nodes.push({ key: k, parentRaw: nd.parent || null, role: role === "user" ? "researcher" : "ai", text: t.text, nonText: t.nonText,
        timestamp: isoFromEpoch(msg.create_time), model: str(meta.model_slug || meta.default_model_slug) || null });
    });
    // the parent of an included message is its nearest included ancestor
    var up = function (k) { var seen = 0; while (k && !included[k] && seen++ < 100000) k = map[k] && map[k].parent; return k && included[k] ? k : null; };
    nodes.forEach(function (n) { n.parent = up(n.parentRaw); delete n.parentRaw; });
    var active = conv.current_node ? (included[conv.current_node] ? conv.current_node : up(conv.current_node)) : null;
    nodes.sort(function (a, b) { return (a.timestamp || "").localeCompare(b.timestamp || ""); });
    return { provider: "ChatGPT data export", title: str(conv.title) || "Untitled conversation", created: isoFromEpoch(conv.create_time), updated: isoFromEpoch(conv.update_time),
      id: str(conv.conversation_id || conv.id), nodes: nodes, activeKey: active, skipped: skipped };
  }
  function readClaude(conv) {
    var msgs = conv && conv.chat_messages;
    if (!Array.isArray(msgs)) return null;
    var nodes = [], skipped = { system: 0, tool: 0, hidden: 0, empty: 0 }, prev = null, byId = {};
    msgs.forEach(function (m) {
      if (!m) return;
      var role = m.sender === "human" ? "researcher" : m.sender === "assistant" ? "ai" : "";
      if (!role) { skipped.system++; return; }
      var text = typeof m.text === "string" && m.text.trim() ? m.text : (Array.isArray(m.content) ? m.content.filter(function (c) { return c && c.type === "text" && typeof c.text === "string"; }).map(function (c) { return c.text; }).join("\n") : "");
      var non = Array.isArray(m.content) ? m.content.filter(function (c) { return c && c.type && c.type !== "text"; }).length : 0;
      if (!text.trim()) { skipped.empty++; return; }
      var key = str(m.uuid) || "m" + nodes.length;
      var parent = m.parent_message_uuid && byId[m.parent_message_uuid] ? m.parent_message_uuid : prev;
      var n = { key: key, parent: parent, role: role, text: text, nonText: non, timestamp: isoOrNull(m.created_at), model: null };
      nodes.push(n); byId[key] = true; prev = key;
    });
    return { provider: "Claude data export", title: str(conv.name) || "Untitled conversation", created: isoOrNull(conv.created_at), updated: isoOrNull(conv.updated_at),
      id: str(conv.uuid), nodes: nodes, activeKey: prev, skipped: skipped, linearAssumed: !msgs.some(function (m) { return m && m.parent_message_uuid; }) };
  }
  // the whole export file: a list of conversations from one provider
  function readProviderExport(json) {
    var list = Array.isArray(json) ? json : json && Array.isArray(json.conversations) ? json.conversations : null;
    if (!list) return { error: "This file is not a conversation export the Lab can read." };
    var out = [];
    list.forEach(function (c) { var r = readChatGPT(c) || readClaude(c); if (r) out.push(r); });
    if (!out.length) return { error: "No conversations were found in this file." };
    return { conversations: out, provider: out[0].provider };
  }
  // the path the provider marks as current, as an ordered list of nodes
  function providerPath(pc) {
    var byKey = {}; pc.nodes.forEach(function (n) { byKey[n.key] = n; });
    var path = [], k = pc.activeKey, guard = 0;
    while (k && byKey[k] && guard++ < 100000) { path.unshift(byKey[k]); k = byKey[k].parent; }
    return path;
  }

  /* ---------- administrative exchanges ---------- */
  function isCommand(text) { return /^\s*SPL:\s*[A-Z]/.test(String(text || "")); }
  var ADMIN_HEADINGS = /^\s*(?:#+\s*|\*\*)?SPL Research Session — (?:Initial Record|Final Record|Checkpoint reminder)/;
  function markAdministrative(turns) {
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
  // the three metadata reviews and the reminders, wherever they appear in the AI's turns
  function detectReviews(conv) {
    var out = [];
    activePath(conv).forEach(function (t) {
      if (t.role !== "ai") return;
      // only the AI's own words: a record it reproduces (from SPL-HEADER on) quotes earlier reviews, which are not new ones
      var own = t.text.split(/^SPL-HEADER/m)[0];
      if (/^(?:#+\s*|\*\*)?SPL Research Session — Initial Record/m.test(own)) out.push({ type: "opening", turn_id: t.turn_id });
      if (/^(?:#+\s*|\*\*)?SPL Research Session — Checkpoint reminder/m.test(own)) out.push({ type: "intermediate", turn_id: t.turn_id });
      if (/^(?:#+\s*|\*\*)?SPL Research Session — Final Record/m.test(own)) out.push({ type: "closing", turn_id: t.turn_id });
    });
    return out;
  }
  var REVIEW_LABELS = { opening: "Opening review (Initial Record)", intermediate: "Intermediate review (checkpoint reminder)", closing: "Closing review (Final Record)" };

  /* ---------- conversations as trees ---------- */
  // conv.turns holds every turn of every branch. Each turn names its parent. conv.activeLeaf picks the path shown.
  function byId(conv) { var m = {}; (conv.turns || []).forEach(function (t) { m[t.turn_id] = t; }); return m; }
  function childrenOf(conv, id) { return (conv.turns || []).filter(function (t) { return (t.parent_id || null) === (id || null); }); }
  function leaves(conv) { var parents = {}; (conv.turns || []).forEach(function (t) { if (t.parent_id) parents[t.parent_id] = 1; }); return (conv.turns || []).filter(function (t) { return !parents[t.turn_id]; }); }
  function pathTo(conv, id) {
    var m = byId(conv), out = [], t = m[id], guard = 0;
    while (t && guard++ < 100000) { out.unshift(t); t = t.parent_id ? m[t.parent_id] : null; }
    return out;
  }
  function activePath(conv) {
    var m = byId(conv), leaf = conv.activeLeaf && m[conv.activeLeaf] ? conv.activeLeaf : null;
    if (!leaf) { var ls = leaves(conv); leaf = ls.length ? ls[ls.length - 1].turn_id : null; }
    return leaf ? pathTo(conv, leaf) : [];
  }
  // the most recently recorded leaf below a turn: switching to a version shows its whole continuation
  function deepestLeaf(conv, id) {
    var cur = id, guard = 0, kids;
    while ((kids = childrenOf(conv, cur)).length && guard++ < 100000) cur = kids[kids.length - 1].turn_id;
    return cur;
  }
  function siblingsOf(conv, t) { return childrenOf(conv, t.parent_id || null).filter(function (x) { return x.role === t.role; }); }
  function branchCount(conv) { return Math.max(1, leaves(conv).length); }
  // turns recorded before 1.8 had no parent: the recorded order is the path
  function linkLinear(conv) {
    var has = (conv.turns || []).some(function (t) { return t.parent_id; });
    if (!has) (conv.turns || []).forEach(function (t, i) { t.parent_id = i ? conv.turns[i - 1].turn_id : null; });
    return conv;
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
    rows.reverse();
    // a single unmatched turn on each side, by the same speaker, between the same matched turns, is the same turn reworded
    var out = [];
    for (var k = 0; k < rows.length; k++) {
      var r = rows[k], nx = rows[k + 1];
      var single = function (j, st) { return rows[j] && rows[j].status === st && (!rows[j - 1] || rows[j - 1].status !== st) && (!rows[j + 1] || rows[j + 1].status !== st); };
      if (nx && ((r.status === "missing_from_import" && nx.status === "only_in_import") || (r.status === "only_in_import" && nx.status === "missing_from_import")) &&
        !(rows[k - 1] && (rows[k - 1].status === "missing_from_import" || rows[k - 1].status === "only_in_import")) && !(rows[k + 2] && (rows[k + 2].status === "missing_from_import" || rows[k + 2].status === "only_in_import"))) {
        var bi = r.b !== null ? r.b : nx.b, ii = r.i !== null ? r.i : nx.i;
        if (B[bi].role === I[ii].role) { out.push({ b: bi, i: ii, status: "differs", reworded: true }); k++; continue; }
      }
      out.push(r);
    }
    return out;
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
    var at = o.at || new Date().toISOString();
    return { id: o.id || "CV-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(),
      projectId: o.projectId || "", sessionId: o.sessionId || "", title: o.title || "Research conversation", question: o.question || "", purpose: o.purpose || "",
      createdAt: at, labVersion: o.labVersion || "", condition: o.condition || "custom", group: o.group || "", sequenceDesign: o.sequenceDesign || "",
      protocolVersion: o.protocolVersion || null, reminders: o.reminders == null ? null : o.reminders, prompt: o.prompt || "", promptCopiedAt: o.promptCopiedAt || "",
      promptHistory: [], sourceSha256: o.sourceSha256 || "", sourceDesc: o.sourceDesc || "",
      includeInReport: true, completeConfirmed: false, scoreAdmin: false, sessionStatus: "open", nextTurn: 1, activeLeaf: null,
      turns: [], gaps: [], discrepancies: [], metadata: {}, notes: "", finalInterpretation: "", artefacts: [], checkpoints: [],
      claims: [], observations: [], decisions: [], designedPrompts: [], aiNotes: [], redaction: { terms: [], turns: {} },
      events: [{ type: "created", at: at, lab_version: o.labVersion || "" }] };
  }
  function nextId(conv) { var n = conv.nextTurn || conv.turns.length + 1; conv.nextTurn = n + 1; return "T" + pad3(n); }
  function blankTurn(conv, role, text) {
    return { turn_id: nextId(conv), parent_id: null, role: role === "ai" ? "ai" : "researcher", kind: "", text: unifyLines(text), text_status: "original", timestamp: null,
      classification: [], attested_by: [], provenance: { origin: "researcher_reported", verification: "unreviewed", source_ref: "", recorded_at: "" },
      evaluation: null, corrections: [], flags: {}, refs: [], model: null, regenerated_from: null, edited_from: null };
  }
  // after: the turn the new one follows (by default the end of the active path); sibling: a regenerated response or an edited prompt
  function addTurn(conv, t, at, o) {
    o = o || {};
    var path = activePath(conv);
    var turn = blankTurn(conv, t.role, t.text);
    turn.kind = t.kind === "administrative" ? "administrative" : "substantive";
    turn.timestamp = t.timestamp || null;
    turn.provenance = { origin: "researcher_reported", verification: "unreviewed", source_ref: "entered by the researcher", recorded_at: at || new Date().toISOString() };
    if (turn.role === "researcher" && isCommand(turn.text)) turn.kind = "administrative";
    if (o.siblingOf) {
      var sib = byId(conv)[o.siblingOf];
      turn.parent_id = sib ? sib.parent_id : null;
      if (sib && sib.role === "ai") turn.regenerated_from = sib.regenerated_from || sib.turn_id;
      if (sib && sib.role === "researcher") turn.edited_from = sib.edited_from || sib.turn_id;
      conv.turns.push(turn);
      conv.activeLeaf = turn.turn_id;
      return turn;
    }
    var after = o.after !== undefined ? o.after : (path.length ? path[path.length - 1].turn_id : null);
    // inserting between two turns: the later turn now follows the new one
    childrenOf(conv, after).forEach(function (c) { if (o.after !== undefined && path.indexOf(c) !== -1) c.parent_id = turn.turn_id; });
    turn.parent_id = after;
    conv.turns.push(turn);
    if (o.after === undefined) conv.activeLeaf = turn.turn_id;
    return turn;
  }
  // The original conversation is the record of truth. An AI-reproduced record is compared with it, never put in its place,
  // and every difference is kept as a discrepancy: the wording the AI gave, where it differs, or a turn it left out or added.
  // The comparison runs along the active path, which is what an AI system can see.
  // incoming: { turns: [{ role, kind, text, n, reconstructed, purposes, model, timestamp }], gaps: [{ after: n, missing, reason, reported_by }],
  //             original: bool, origin, artefact, at, sourceRef, metadata: { field: assertion } }
  function mergeImport(conv, incoming) {
    var at = incoming.at || new Date().toISOString();
    var isOrig = !!incoming.original;
    linkLinear(conv);
    var base = activePath(conv);
    var onPath = {}; base.forEach(function (t) { onPath[t.turn_id] = 1; });
    var inc = incoming.turns.map(function (t) { return Object.assign({}, t, { text: unifyLines(t.text) }); });
    var rows = align(base, inc);
    var matched = rows.map(function (r, k) { return r.b !== null && r.i !== null ? k : -1; }).filter(function (k) { return k !== -1; });
    var firstM = matched.length ? matched[0] : -1, lastM = matched.length ? matched[matched.length - 1] : -1;
    var inside = function (k) { return firstM !== -1 && k > firstM && k < lastM; };
    var out = [], byN = {}, byIndex = {}, newAfter = {}, disc = [], added = 0, dropped = {};
    var prov = function () { return { origin: incoming.origin || (isOrig ? "researcher_reported" : "ai_reported"), verification: "unreviewed", source_ref: incoming.sourceRef || "", recorded_at: at }; };
    var attest = function (t) { t.attested_by = (t.attested_by || []).concat(incoming.artefact ? [incoming.artefact] : []); };
    var note = function (d) { d.artefact = incoming.artefact || ""; d.at = at; disc.push(d); };
    var enrich = function (t, x) {
      if (x.timestamp && !t.timestamp) t.timestamp = x.timestamp;
      if (x.model) t.model = { value: x.model, origin: incoming.origin || "ai_reported" };
      if (x.purposes && x.purposes.length && t.role === "researcher") x.purposes.forEach(function (p) { if (!(t.classification || []).some(function (c) { return c.category === p; })) (t.classification = t.classification || []).push({ category: p, status: "suggested" }); });
    };
    rows.forEach(function (r, k) {
      if (r.b !== null) {
        var t = base[r.b];
        if (r.i !== null) {
          var x = inc[r.i];
          if (x.n != null) byN[x.n] = t.turn_id;
          byIndex[r.i] = t.turn_id;
          attest(t); enrich(t, x);
          var baseOrig = t.text_status === "original" || t.text_status === "researcher_corrected";
          if (r.status !== "identical" || isOrig !== baseOrig) {
            if (isOrig && !baseOrig) {
              if (r.status === "differs") note({ turn_id: t.turn_id, status: "ai_differs", text: t.text });
              t.text = x.text; t.text_status = "original"; delete t.sha256;
              t.provenance = prov(); t.provenance.verification = "compared_with_original";
            } else if (!isOrig && baseOrig) {
              if (r.status === "differs") note({ turn_id: t.turn_id, status: "ai_differs", text: x.text });
              else if (t.provenance.verification === "unreviewed") t.provenance.verification = "compared_with_original";
            } else if (r.status === "differs") {
              // never overwrite text the researcher has confirmed or corrected: the other wording is kept beside it
              note({ turn_id: t.turn_id, status: "conflict", text: x.text });
            }
          } else if (isOrig && baseOrig && t.provenance.verification === "unreviewed") t.provenance.verification = "researcher_confirmed";
        } else if (inside(k)) {
          if (!isOrig && t.text_status === "original") note({ turn_id: t.turn_id, status: "ai_omitted", text: null });
          else if (isOrig && t.text_status !== "original" && t.text_status !== "researcher_corrected" && t.provenance.verification !== "researcher_confirmed") {
            // the original conversation does not contain this AI-reproduced turn: it leaves the path, and is kept as a difference
            note({ turn_id: out.length ? out[out.length - 1].turn_id : null, status: "ai_only", text: t.text, removed: t.turn_id });
            dropped[t.turn_id] = 1;
            return;
          }
        }
        out.push(t);
      } else {
        var y = inc[r.i];
        if (inside(k) && !isOrig && base.some(function (b) { return b.text_status === "original"; })) {
          // a turn only the AI record contains, between turns the original confirms: kept as a discrepancy, not added
          note({ turn_id: out.length ? out[out.length - 1].turn_id : null, status: "ai_only", text: y.text });
          return;
        }
        var nt = blankTurn(conv, y.role, y.text);
        nt.kind = y.kind === "administrative" ? "administrative" : "";
        nt.text_status = isOrig ? "original" : y.reconstructed ? "reconstructed" : "ai_reproduced";
        nt.attested_by = incoming.artefact ? [incoming.artefact] : [];
        nt.provenance = prov();
        enrich(nt, y);
        if (isOrig && inside(k) && base.length && base.some(function (b) { return b.text_status !== "original"; })) note({ turn_id: nt.turn_id, status: "ai_omitted", text: null });
        if (y.n != null) byN[y.n] = nt.turn_id;
        byIndex[r.i] = nt.turn_id;
        newAfter[out.length ? out[out.length - 1].turn_id : "start"] = nt.turn_id;
        conv.turns.push(nt);
        out.push(nt); added++;
      }
    });
    markAdministrative(out);
    if (Object.keys(dropped).length) conv.turns = conv.turns.filter(function (t) { return !dropped[t.turn_id]; });
    // the active path, in order: each turn follows the one before it
    out.forEach(function (t, i) { t.parent_id = i ? out[i - 1].turn_id : (onPath[t.turn_id] ? t.parent_id || null : null); });
    if (out.length) out[0].parent_id = null;
    if (out.length) conv.activeLeaf = out[out.length - 1].turn_id;
    // gaps the AI reported, placed after the right turn; a gap the original now fills is resolved
    (incoming.gaps || []).forEach(function (g) {
      var after = g.after == null ? null : byN[g.after] || null;
      if (conv.gaps.some(function (x) { return x.after_turn === after && !x.resolved; })) return;
      conv.gaps.push({ after_turn: after, missing: g.missing || "unknown", reason: g.reason || "", reported_by: g.reported_by || "ai", resolved: false, artefact: incoming.artefact || "" });
    });
    // a gap is filled when a later record supplies a turn at that place; the turn keeps its own text status
    conv.gaps.forEach(function (g) {
      if (g.resolved) return;
      var filled = newAfter[g.after_turn || "start"];
      if (!filled) {
        var at0 = g.after_turn ? out.findIndex(function (t) { return t.turn_id === g.after_turn; }) : -1;
        var nx = out[at0 + 1];
        if (nx && g.artefact && (nx.attested_by || []).indexOf(g.artefact) === -1 && (nx.attested_by || []).indexOf(incoming.artefact) !== -1) filled = nx.turn_id;
      }
      if (!filled || (g.artefact && g.artefact === incoming.artefact)) return;
      g.resolved = true; g.resolved_by = incoming.artefact || (isOrig ? "transcript" : "record");
      // the AI said this turn was missing, so leaving it out is a declared gap, not an omission
      if (g.reported_by === "ai") disc = disc.filter(function (d) { return !(d.status === "ai_omitted" && d.turn_id === filled); });
    });
    // the first message is compared with the prompt the researcher copied from the Lab
    var first = out[0];
    if (conv.prompt && first && first.role === "researcher" && !conv.promptCompared) {
      conv.promptCompared = true;
      if (normaliseText(first.text) === normaliseText(conv.prompt)) { if (first.provenance.verification === "unreviewed") first.provenance.verification = "compared_with_original"; first.matchesCopiedPrompt = true; }
      else note({ turn_id: first.turn_id, status: "differs_from_copied_prompt", text: conv.prompt });
    }
    // metadata: a new assertion only when it says something new
    Object.keys(incoming.metadata || {}).forEach(function (k0) {
      var k = FIELD_ALIASES[k0] || k0;
      var a = incoming.metadata[k0], f = conv.metadata[k] || (conv.metadata[k] = { assertions: [] });
      if (f.assertions.some(function (x) { return x.status === a.status && str(x.value) === str(a.value) && x.provenance.origin === a.provenance.origin; })) return;
      f.assertions.push(a);
    });
    conv.discrepancies = (conv.discrepancies || []).concat(disc);
    if (incoming.artefact) conv.artefacts = (conv.artefacts || []).concat([incoming.artefact]);
    conv.events = (conv.events || []).concat([{ type: isOrig ? (incoming.origin === "provider_recorded" ? "provider_export_imported" : "transcript_imported") : "record_imported", at: at, detail: added + " turns added; " + disc.length + " differences recorded" }]);
    if (!isOrig && incoming.recordType) conv.recordType = incoming.recordType;
    if (!isOrig && incoming.recordType === "completed_session") conv.sessionStatus = "ended";
    return { summary: alignSummary(rows), rows: rows, added: added, discrepancies: disc, byN: byN, byIndex: byIndex };
  }
  // A provider export holds the whole tree. Its current path is merged like any original record; its other branches are then
  // attached to the turns they grew from.
  function mergeProvider(conv, pc, artefact, at) {
    at = at || new Date().toISOString();
    var path = providerPath(pc), onPath = {};
    path.forEach(function (n) { onPath[n.key] = 1; });
    var res = mergeImport(conv, { turns: path.map(function (n) { return { role: n.role, text: n.text, timestamp: n.timestamp, model: n.model }; }), original: true, origin: "provider_recorded", artefact: artefact, at: at, sourceRef: pc.provider });
    var keyToId = {};
    path.forEach(function (n, i) { keyToId[n.key] = res.byIndex[i]; });
    var rest = pc.nodes.filter(function (n) { return !onPath[n.key]; }), branchAdded = 0, guard = 0;
    // add in an order that puts each parent before its children
    while (rest.length && guard++ < 100000) {
      var next = rest.filter(function (n) { return !n.parent || keyToId[n.parent]; });
      if (!next.length) break;
      next.forEach(function (n) {
        var t = blankTurn(conv, n.role, n.text);
        t.parent_id = n.parent ? keyToId[n.parent] : null;
        t.kind = "";
        t.timestamp = n.timestamp; t.text_status = "original";
        if (n.model) t.model = { value: n.model, origin: "provider_recorded" };
        t.attested_by = artefact ? [artefact] : [];
        t.provenance = { origin: "provider_recorded", verification: "unreviewed", source_ref: pc.provider, recorded_at: at };
        var sib = childrenOf(conv, t.parent_id).filter(function (x) { return x.role === t.role; })[0];
        if (sib && t.role === "ai") t.regenerated_from = sib.turn_id;
        if (sib && t.role === "researcher") t.edited_from = sib.turn_id;
        conv.turns.push(t); keyToId[n.key] = t.turn_id; branchAdded++;
      });
      rest = rest.filter(function (n) { return !keyToId[n.key]; });
    }
    conv.turns.forEach(function (t) { if (!t.kind) t.kind = t.role === "researcher" && isCommand(t.text) ? "administrative" : "substantive"; });
    conv.fromProviderExport = true;
    var first = pc.nodes.filter(function (n) { return n.timestamp; }).map(function (n) { return n.timestamp; }).sort();
    if (first.length) {
      var add = function (k, v) { var f = conv.metadata[k] || (conv.metadata[k] = { assertions: [] }); if (!f.assertions.some(function (x) { return str(x.value) === v && x.provenance.origin === "provider_recorded"; })) f.assertions.push({ value: v, status: "known", provenance: { origin: "provider_recorded", verification: "unreviewed", source_ref: pc.provider, recorded_at: at } }); };
      add("session_start", first[0]);
      add("session_end", first[first.length - 1]);
      add("message_timestamps", "Available for each message in the provider's export");
      add("time_zone", "UTC (the export records times in Coordinated Universal Time)");
      var models = pc.nodes.map(function (n) { return n.model; }).filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; });
      if (models.length) add("model_name", models.join(", "));
      if (models.length > 1) add("model_changes", "Models recorded in the export: " + models.join(", "));
    }
    return Object.assign(res, { branchAdded: branchAdded, skipped: pc.skipped });
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
    Object.keys(meta).forEach(function (k0) {
      var k = FIELD_ALIASES[k0] || k0;
      if (FIELD_IDS.indexOf(k) === -1) return;
      var raw = meta[k0], v = raw && typeof raw === "object" && !Array.isArray(raw) && "value" in raw ? raw.value : raw;
      var basis = raw && typeof raw === "object" && typeof raw.origin === "string" ? raw.origin : "";
      var sv = statusOfValue(v);
      out[k] = { value: sv.value, status: sv.status, provenance: { origin: "ai_reported", verification: "unreviewed", source_ref: sourceRef || "", recorded_at: at || "" },
        reason: basis && AI_BASIS.indexOf(basis) !== -1 ? "The AI system gave the basis as: " + basis + "." : "" };
    });
    return out;
  }
  function currentAssertion(field) {
    if (!field || !Array.isArray(field.assertions) || !field.assertions.length) return null;
    if (field.resolution && Number.isInteger(field.resolution.chosen) && field.assertions[field.resolution.chosen]) return field.assertions[field.resolution.chosen];
    return field.assertions[field.assertions.length - 1];
  }
  // sources disagree when two values, from different origins, differ and the researcher has not resolved it
  function fieldConflict(field) {
    if (!field || !Array.isArray(field.assertions) || field.resolution) return false;
    var vals = {};
    field.assertions.forEach(function (a) { if ((a.status === "known" || a.status === "confirmation_required") && a.value) { var k = normaliseText(a.value).toLowerCase(); (vals[k] = vals[k] || {})[a.provenance.origin] = 1; } });
    var keys = Object.keys(vals);
    if (keys.length < 2) return false;
    var origins = {}; keys.forEach(function (k) { Object.keys(vals[k]).forEach(function (o) { origins[o] = 1; }); });
    return Object.keys(origins).length > 1;
  }
  function fieldDone(field) {
    var a = currentAssertion(field);
    if (!a || fieldConflict(field)) return false;
    if (a.status === "not_exposed" || a.status === "not_applicable") return true;
    if (a.status === "unknown") return !!(a.reason && a.provenance && a.provenance.origin === "researcher_reported");
    return a.status === "known" || (a.provenance && ["researcher_confirmed", "compared_with_original"].indexOf(a.provenance.verification) !== -1);
  }
  function isRequired(f, conv) { return f.required === "yes" || (f.required === "closure" && conv && conv.sessionStatus === "ended"); }
  function outstandingFields(metadata, conv) {
    return FIELDS.filter(function (f) { return isRequired(f, conv || { sessionStatus: "ended" }) && !fieldDone((metadata || {})[f.id]); });
  }
  // a sentence on how the model was identified, written only from what the assertions record
  function modelIdentification(metadata) {
    var a = currentAssertion((metadata || {}).model_name), v = currentAssertion((metadata || {}).model_version);
    if (!a) return "The model was not identified in the records.";
    var src = { ai_reported: "The AI system identified its model through self-reported metadata.", provider_recorded: "The model name was recorded in the provider's data.", researcher_reported: "The researcher recorded the model name.", official_documentation: "The model name was taken from the provider's documentation.", system_recorded: "The model name was recorded by the Lab.", unknown: "The origin of the model name is not known." }[a.provenance.origin];
    var chk = a.provenance.verification === "researcher_confirmed" && a.provenance.origin !== "researcher_reported" ? " The researcher confirmed the displayed model name." : a.provenance.verification === "compared_with_original" ? " The model name was compared with the original record." : a.provenance.origin === "ai_reported" ? " The researcher has not confirmed it." : "";
    var ver = !v ? " No version or release identifier is recorded." : v.status === "not_exposed" ? " The exact backend release identifier was not exposed by the provider." : v.status === "known" || v.status === "confirmation_required" ? " A version identifier is recorded (" + str(v.value) + ")." : " The exact version was not established.";
    return src + chk + ver;
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

  /* ---------- analysis: Claim History, observations, decisions, developments ---------- */
  var OBSERVATION_CATEGORIES = [
    { id: "interpretive_stability", label: "Interpretive stability", def: "Whether changes in interpretation can be traced to new evidence, revised instructions or another recorded development.", guide: "List each change of interpretation and the turns before it. Note whether a recorded development precedes it.", example: "The reading of DOC-02 changed at T008, after the counter-evidence at T007.", limit: "Stability is not a virtue in itself: an unchanged wrong reading is stable." },
    { id: "responsiveness_to_evidence", label: "Responsiveness to evidence", def: "How the AI system treats evidence introduced later: whether it revises, qualifies, ignores or overreacts.", guide: "Pair each turn that introduces evidence with the responses that follow.", example: "The claim was qualified, not withdrawn, after the passage on the elective franchise.", limit: "Depends on the strength of the evidence the researcher chose." },
    { id: "error_persistence", label: "Error persistence", def: "Whether a previously identified factual, contextual or interpretive error recurs after correction.", guide: "Link the error to later turns where it reappears.", example: "The misdated convention reappeared at T012 after correction at T009.", limit: "Absence of recurrence is not proof of correction." },
    { id: "context_retention", label: "Context retention", def: "Whether sources and the cultural, linguistic and historical context established earlier remain reflected later.", guide: "Note later turns that omit or contradict earlier context.", example: "By T014 the answer no longer distinguished the two documents.", limit: "May reflect limits on the context the system can see rather than its reasoning." },
    { id: "researcher_influence", label: "Susceptibility to researcher influence", def: "Whether shifts in interpretation follow the researcher's stated position without supporting evidence.", guide: "Mark turns where the AI adopts a stated position and check whether it cites evidence.", example: "At T010 the AI adopted the researcher's reading without citing the sources.", limit: "Agreement can be correct: judge the evidence, not the agreement." },
    { id: "instruction_adherence", label: "Instruction adherence", def: "Whether the AI keeps to the session's methodological instructions, including documented revisions.", guide: "Cite departures by turn.", example: "From T011 the answers stopped giving one quotation per claim.", limit: "The instructions themselves may be ambiguous." },
    { id: "interpretive_development", label: "Interpretive development", def: "How interpretations emerge, change and are reconsidered across the exchange.", guide: "A narrative observation with turn references; link it to Claim History where relevant.", example: "A reading of 'men' as exclusive emerged at T006 and organised later answers.", limit: "Descriptive only." }
  ];
  var DECISION_STATUSES = { explicit: "Stated by the researcher in the conversation", recorded: "Recorded by the researcher in the Lab", needs_confirmation: "Needs the researcher's confirmation", ai_suggested: "Suggested by the AI system, not confirmed" };
  var FLAG_LABELS = { evidence: "Additional evidence or source material introduced", instruction: "Analytical instructions changed", scope: "Analytical scope changed", theory: "Theoretical orientation changed", error: "Error identified in this response", correction: "Researcher correction", decision: "Researcher decision" };
  function nextCode(list, prefix) {
    var max = 0; (list || []).forEach(function (x) { var m = new RegExp("^" + prefix + "-(\\d+)$").exec(x.id || ""); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return prefix + "-" + pad3(max + 1);
  }
  // analytical developments derived from what the researcher recorded: flags, claim events, observations and decisions
  function developments(conv) {
    var out = [];
    activePath(conv).forEach(function (t) {
      Object.keys(t.flags || {}).forEach(function (k) { var f = t.flags[k]; if (f && f.on) out.push({ type: k, turn_id: t.turn_id, note: str(f.note), ref: str(f.ref), origin: "researcher_reported" }); });
    });
    (conv.claims || []).forEach(function (c) { (c.events || []).forEach(function (e) { out.push({ type: "claim_" + e.type, turn_id: e.turn_id, note: c.id + (e.note ? ": " + e.note : ""), origin: c.status === "suggested" ? "ai_reported" : "researcher_reported" }); }); });
    return out;
  }
  // an error that is marked as the same as an earlier one, or a claim event of that kind, counts as persistent
  function persistentErrors(conv) {
    var out = [];
    activePath(conv).forEach(function (t) { var f = t.flags && t.flags.error; if (f && f.on && f.ref) out.push({ turn_id: t.turn_id, first: f.ref, note: str(f.note) }); });
    (conv.claims || []).forEach(function (c) { (c.events || []).forEach(function (e) { if (e.type === "error_recurred") out.push({ turn_id: e.turn_id, first: c.turn_id, note: c.id + (e.note ? ": " + e.note : "") }); }); });
    return out;
  }
  // claims an AI-generated record suggests, kept as unverified suggestions with their turns mapped
  function claimsFromRecord(claims, byN, existing) {
    var out = [], list = (existing || []).slice();
    (claims || []).forEach(function (c) {
      var id = nextCode(list, "CL");
      var cl = { id: id, aiLabel: c.id || "", text: c.text, turn_id: c.first_turn != null ? byN[c.first_turn] || null : null, sources: [], key: "", researcherReading: "", aiLater: "", status: "suggested", outstanding: "",
        events: (c.developments || []).map(function (d) { return { type: d.type, turn_id: byN[d.turn] || null, note: d.note, origin: "ai_reported" }; }).filter(function (e) { return e.turn_id; }) };
      list.push(cl); out.push(cl);
    });
    return out;
  }

  /* ---------- comparison of conversations ---------- */
  function substantivePrompts(conv) { return activePath(conv).filter(function (t) { return t.role === "researcher" && t.kind !== "administrative"; }); }
  function responseTo(conv, prompt) {
    var path = activePath(conv), i = path.indexOf(prompt);
    for (var k = i + 1; k < path.length; k++) { if (path[k].role === "researcher") break; if (path[k].role === "ai") return path[k]; }
    return null;
  }
  // align follow-up prompts across conversations by position, and say where the conditions differ
  function compareConversations(convs, criteria) {
    var max = convs.reduce(function (m, c) { return Math.max(m, substantivePrompts(c).length); }, 0);
    var rows = [];
    for (var i = 0; i < max; i++) {
      rows.push({ index: i + 1, cells: convs.map(function (c) {
        var p = substantivePrompts(c)[i];
        if (!p) return null;
        var r = responseTo(c, p), ev = r && r.evaluation;
        return { prompt: p, categories: (p.classification || []).filter(function (x) { return x.status !== "suggested"; }).map(function (x) { return x.category; }), response: r,
          scores: (criteria || []).map(function (cr) { return ev && ev.na && ev.na[cr.id] ? "n/a" : ev && ev.scores && ev.scores[cr.id] ? ev.scores[cr.id] : ""; }) };
      }) });
    }
    var fields = ["ai_provider", "ai_product", "model_name", "model_version", "reasoning_mode", "temperature", "web_browsing", "memory", "access_method"];
    var meta = fields.map(function (k) {
      var vals = convs.map(function (c) { var a = currentAssertion((c.metadata || {})[k]); return !a ? "not recorded" : a.status === "known" || a.status === "confirmation_required" ? str(a.value) : STATUSES[a.status].toLowerCase(); });
      var known = vals.filter(function (v) { return ["not recorded", "unknown", "not exposed by provider"].indexOf(v) === -1; });
      return { field: k, label: (FIELDS.filter(function (f) { return f.id === k; })[0] || {}).label, values: vals, differs: known.length > 1 && known.some(function (v) { return v !== known[0]; }), unknown: known.length < vals.length };
    });
    var conditions = [
      { label: "Research Session Protocol", values: convs.map(function (c) { return c.protocolVersion ? "SPL-RSP " + c.protocolVersion : "not used"; }) },
      { label: "Metadata reminders", values: convs.map(function (c) { return !c.protocolVersion ? "–" : c.reminders === "off" ? "off" : c.reminders ? "about every " + c.reminders : "not recorded"; }) },
      { label: "Follow-up sequence", values: convs.map(function (c) { return c.sequenceDesign === "standardised" ? "standardised" : c.sequenceDesign === "adaptive" ? "adaptive" : "not stated"; }) },
      { label: "Prompt condition", values: convs.map(function (c) { return str(c.condition) || "custom"; }) },
      { label: "Source text fingerprint", values: convs.map(function (c) { return c.sourceSha256 ? c.sourceSha256.slice(0, 12) + "…" : "not recorded"; }) }
    ];
    conditions.forEach(function (r) { r.differs = r.values.some(function (v) { return v !== r.values[0]; }); });
    var designs = convs.map(function (c) { return c.sequenceDesign || ""; });
    var warnings = [];
    if (designs.indexOf("standardised") !== -1 && designs.indexOf("adaptive") !== -1) warnings.push("Standardised and adaptive follow-up sequences answer different questions and are not directly comparable.");
    if (designs.indexOf("") !== -1) warnings.push("Not every conversation states whether its follow-up sequence was standardised or adaptive.");
    if (meta.some(function (m) { return m.unknown; })) warnings.push("Some model information or settings are unavailable, which limits comparability.");
    if (meta.some(function (m) { return m.differs; })) warnings.push("The conversations differ in recorded model information or settings, as well as in the prompts.");
    // exact wording identical across conversations? a standardised sequence should be
    var identical = rows.map(function (r) { var t = r.cells.filter(Boolean).map(function (c) { return normaliseText(c.prompt.text); }); return t.length === convs.length && t.every(function (x) { return x === t[0]; }); });
    // claims marked as the same claim across conversations
    var keys = {};
    convs.forEach(function (c, ci) { (c.claims || []).forEach(function (cl) { if (cl.key) (keys[cl.key] = keys[cl.key] || convs.map(function () { return []; }))[ci].push(cl); }); });
    return { rows: rows, meta: meta, conditions: conditions, warnings: warnings, identical: identical, claimKeys: keys };
  }
  function promptSequence(conv) { return substantivePrompts(conv).map(function (t) { return t.text; }); }

  /* ---------- timeline: discrete events and scores by turn, with nothing drawn between them ---------- */
  function timeline(conv, criteria) {
    var path = activePath(conv), cols = [];
    path.forEach(function (t, i) {
      var ev = t.evaluation || null, sibs = siblingsOf(conv, t);
      cols.push({ turn: t, position: i + 1,
        purposes: (t.classification || []).map(function (c) { return { category: c.category, suggested: c.status === "suggested" }; }),
        flags: Object.keys(t.flags || {}).filter(function (k) { return t.flags[k] && t.flags[k].on; }),
        gapAfter: (conv.gaps || []).filter(function (g) { return g.after_turn === t.turn_id; }),
        checkpoints: (conv.checkpoints || []).filter(function (c) { return c.lastTurn === t.turn_id; }),
        claims: [].concat.apply([], (conv.claims || []).map(function (c) { return (c.turn_id === t.turn_id ? [{ claim: c.id, type: "introduced" }] : []).concat((c.events || []).filter(function (e) { return e.turn_id === t.turn_id; }).map(function (e) { return { claim: c.id, type: e.type }; })); })),
        model: t.model && t.model.value ? t.model.value : null,
        branches: sibs.length > 1 ? sibs.length : 0,
        scores: t.role === "ai" && (t.kind !== "administrative" || conv.scoreAdmin) ? (criteria || []).map(function (cr) { return ev && ev.na && ev.na[cr.id] ? { na: true, reason: ev.na[cr.id] } : ev && ev.scores && ev.scores[cr.id] ? { value: parseInt(ev.scores[cr.id], 10) } : { missing: true }; }) : null });
    });
    return cols;
  }

  /* ---------- redaction: the original stays as it is; only the exported copy changes ---------- */
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function redactText(text, rules) {
    var out = String(text);
    ((rules && rules.terms) || []).forEach(function (r) {
      if (!r || !r.text) return;
      var re = new RegExp((r.wholeWord ? "(?<![\\p{L}\\p{N}])" : "") + escapeRe(r.text) + (r.wholeWord ? "(?![\\p{L}\\p{N}])" : ""), "gu");
      out = out.replace(re, "[withheld: " + (r.reason || "redacted") + "]");
    });
    return out;
  }
  function redactTurn(t, rules) {
    var whole = rules && rules.turns && rules.turns[t.turn_id];
    return whole ? "[withheld: " + whole + "]" : redactText(t.text, rules);
  }
  // candidates the researcher may choose to withhold: e-mail addresses and telephone numbers
  function suggestRedactions(conv) {
    var found = {};
    (conv.turns || []).forEach(function (t) {
      (t.text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).forEach(function (x) { found[x] = "e-mail address"; });
      (t.text.match(/\+?\d[\d ()-]{7,}\d/g) || []).forEach(function (x) { if (x.replace(/\D/g, "").length >= 8) found[x.trim()] = "telephone number"; });
    });
    return Object.keys(found).map(function (k) { return { text: k, reason: found[k] }; });
  }
  function hasRedactions(rules) { return !!(rules && ((rules.terms || []).length || Object.keys(rules.turns || {}).length)); }

  /* ---------- counts ---------- */
  function counts(conv) {
    var t = conv.turns || [], scoreAdmin = !!conv.scoreAdmin;
    return {
      researcher_prompts: t.filter(function (x) { return x.role === "researcher" && x.kind !== "administrative"; }).length,
      ai_responses: t.filter(function (x) { return x.role === "ai" && x.kind !== "administrative"; }).length,
      administrative: t.filter(function (x) { return x.kind === "administrative"; }).length,
      turns: t.length,
      gaps: (conv.gaps || []).filter(function (g) { return !g.resolved; }).length,
      branches: branchCount(conv),
      on_active_path: activePath(conv).length,
      scored: t.filter(function (x) { return x.role === "ai" && (x.kind !== "administrative" || scoreAdmin) && x.evaluation && Object.keys(x.evaluation.scores || {}).length; }).length
    };
  }

  /* ---------- the canonical record ---------- */
  function buildRecord(conv, extra) {
    extra = extra || {};
    var cov = coverage(conv);
    var hasOriginal = (conv.turns || []).some(function (t) { return t.text_status === "original"; });
    var path = activePath(conv), posOf = {};
    path.forEach(function (t, i) { posOf[t.turn_id] = i + 1; });
    var depth = function (t) { return pathTo(conv, t.turn_id).length; };
    var rec = {
      format: RECORD_FORMAT, schema_version: SCHEMA_VERSION, protocol_version: conv.protocolVersion || null,
      session_id: conv.sessionId || "", conversation_id: conv.id || "", project_id: conv.projectId || "",
      record_type: conv.fromProviderExport ? "provider_export" : hasOriginal ? "transcript" : (conv.recordType || "manual"),
      title: conv.title || "", research_question: conv.question || "", purpose: conv.purpose || "", final_interpretation: conv.finalInterpretation || "",
      session_status: conv.sessionStatus || "open",
      created_at: conv.createdAt || "", lab_version: extra.labVersion || conv.labVersion || "", release_doi: extra.releaseDoi || "",
      study: { condition: conv.condition || "custom", group: conv.group || "", sequence_design: conv.sequenceDesign || "" },
      sources: { sha256: conv.sourceSha256 || "", description: conv.sourceDesc || "" },
      protocol: { used: !!conv.protocolVersion, reminders: conv.reminders == null ? null : String(conv.reminders), initial_prompt_copied_at: conv.promptCopiedAt || null,
        prompts_copied: (conv.promptHistory || []).slice() },
      metadata: {}, model_identification: modelIdentification(conv.metadata), metadata_unresolved: outstandingFields(conv.metadata, conv).map(function (f) { return f.id; }),
      active_leaf: path.length ? path[path.length - 1].turn_id : null,
      turns: [], gaps: [], counts: counts(conv), coverage: cov,
      completeness: { access_to_beginning: conv.accessToBeginning == null ? "unknown" : conv.accessToBeginning, previous_checkpoints_used: !!conv.previousCheckpointsUsed,
        exact_or_reconstructed: (conv.turns || []).some(function (t) { return t.text_status === "reconstructed"; }) ? "some turns reconstructed" : hasOriginal ? "original wording" : "AI-reproduced, unverified" },
      reviews: detectReviews(conv), checkpoints: (conv.checkpoints || []).slice(),
      taxonomy_version: TAXONOMY_VERSION, notes: conv.notes || "",
      ai_notes: (conv.aiNotes || []).map(function (n) { return { text: n.text, artefact: n.artefact || "", provenance: { origin: "ai_reported", verification: "unreviewed" } }; }),
      claims: (conv.claims || []).slice(), observations: (conv.observations || []).slice(), decisions: (conv.decisions || []).slice(),
      designed_prompts: (conv.designedPrompts || []).slice(), developments: developments(conv),
      discrepancies: (conv.discrepancies || []).map(function (d) { return { turn_id: d.turn_id || null, status: d.status, imported_text: d.text == null ? null : d.text, artefact: d.artefact || "", resolved: !!d.resolved }; }),
      events: (conv.events || []).slice(),
      provenance: { origin: conv.fromProviderExport ? "provider_recorded" : hasOriginal ? "researcher_reported" : (conv.turns || []).length ? "ai_reported" : "system_recorded", verification: conv.completeConfirmed ? "researcher_confirmed" : "unreviewed" }
    };
    Object.keys(conv.metadata || {}).forEach(function (k) { rec.metadata[k] = { assertions: conv.metadata[k].assertions.slice() }; if (conv.metadata[k].resolution) rec.metadata[k].resolution = conv.metadata[k].resolution; });
    // every required field is present in the record, even when nothing is known
    FIELDS.forEach(function (f) { if (f.required && !rec.metadata[f.id]) rec.metadata[f.id] = { assertions: [{ value: null, status: "unknown", provenance: { origin: "unknown", verification: "unreviewed" } }] }; });
    ["protocol_version", "session_id"].forEach(function (k) {
      var v = k === "protocol_version" ? conv.protocolVersion : conv.sessionId;
      if (v) rec.metadata[k] = { assertions: [{ value: v, status: "known", provenance: { origin: "system_recorded", verification: "unreviewed", source_ref: "Scholarly Prompt Lab", recorded_at: conv.createdAt || "" } }] };
    });
    rec.metadata.schema_version = { assertions: [{ value: SCHEMA_VERSION, status: "known", provenance: { origin: "system_recorded", verification: "unreviewed", source_ref: "Scholarly Prompt Lab" } }] };
    var ordered = path.concat((conv.turns || []).filter(function (t) { return !posOf[t.turn_id]; }));
    rec.turns = ordered.map(function (t) {
      var o = { turn_id: t.turn_id, position: posOf[t.turn_id] || null, depth: depth(t), on_active_path: !!posOf[t.turn_id], parent_id: t.parent_id || null, role: t.role, kind: t.kind || "substantive",
        text: t.text, text_status: t.text_status || "original", sha256: t.sha256 || undefined, timestamp: t.timestamp || null,
        classification: (t.classification || []).map(function (c) { return { category: c.category, status: c.status || "researcher", note: c.note || undefined }; }),
        provenance: t.provenance || { origin: "unknown", verification: "unreviewed" } };
      if (t.regenerated_from) o.regenerated_from = t.regenerated_from;
      if (t.edited_from) o.edited_from = t.edited_from;
      if (t.model && t.model.value) o.model = { assertions: [{ value: t.model.value, status: "known", provenance: { origin: t.model.origin || "researcher_reported", verification: "unreviewed" } }] };
      if (t.flags && Object.keys(t.flags).some(function (k) { return t.flags[k] && t.flags[k].on; })) o.developments = Object.keys(t.flags).filter(function (k) { return t.flags[k] && t.flags[k].on; }).map(function (k) { return { type: k, note: str(t.flags[k].note), ref: str(t.flags[k].ref) || undefined, source_ids: t.flags[k].sources || undefined }; });
      if (t.refs && t.refs.length) o.references = t.refs.slice();
      if (t.designedId) o.designed_prompt = t.designedId;
      var ev = t.evaluation;
      if (ev && (Object.keys(ev.scores || {}).length || Object.keys(ev.na || {}).length || ev.checks || ev.second)) {
        o.evaluation = { scores: Object.assign({}, ev.scores), not_applicable: Object.assign({}, ev.na), evaluator: ev.evaluator || "", notes: ev.notes || "", recorded_at: ev.at || "", status: "researcher_confirmed" };
        // suggestions are kept apart from the researcher's scores and never count as scores
        if (ev.checks || ev.second) o.evaluation.suggestions = { checks: ev.checks ? { summary: ev.checks.summary, scores: ev.checks.scores, recorded_at: ev.checks.at, status: "suggested" } : null,
          second_model: ev.second ? { model: ev.second.model, scores: ev.second.scores, overall: ev.second.overall, recorded_at: ev.second.at, status: "suggested", provenance: { origin: "ai_reported", verification: "unreviewed" } } : null };
      }
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
    if (typeof r.schema_version !== "string" || !/^\d+\.\d+$/.test(r.schema_version)) e.push("schema_version must look like 0.2");
    else if (["0.1", "0.2"].indexOf(r.schema_version) === -1) e.push("schema_version " + r.schema_version + " is newer than this version of the Lab can read");
    if (r.record_type) oneOf(r.record_type, ["checkpoint", "completed_session", "record_part", "transcript", "provider_export", "manual"], "record_type");
    var prov = function (p, where) {
      if (!p || typeof p !== "object") { e.push(where + ": missing provenance"); return; }
      oneOf(p.origin, Object.keys(ORIGINS), where + ".origin");
      if (p.verification !== undefined) oneOf(p.verification, Object.keys(VERIFICATIONS), where + ".verification");
    };
    prov(r.provenance, "provenance");
    var ids = {};
    if (!Array.isArray(r.turns)) e.push("turns must be a list");
    else {
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
        if (t.evaluation && t.evaluation.scores) Object.keys(t.evaluation.scores).forEach(function (k) { if (!/^[1-5]$/.test(String(t.evaluation.scores[k]))) e.push(w + ".evaluation.scores." + k + " must be 1 to 5"); });
        if (t.evaluation && t.evaluation.not_applicable) Object.keys(t.evaluation.not_applicable).forEach(function (k) { if (!str(t.evaluation.not_applicable[k]).trim()) e.push(w + ".evaluation.not_applicable." + k + " needs a reason"); });
        prov(t.provenance, w);
      });
      r.turns.forEach(function (t, i) { if (t && t.parent_id && !ids[t.parent_id]) e.push("turns[" + i + "].parent_id names a turn that is not in the record"); });
      // no turn may be its own ancestor
      var parent = {}; r.turns.forEach(function (t) { if (t) parent[t.turn_id] = t.parent_id || null; });
      Object.keys(parent).forEach(function (id) { var seen = {}, k = id, n = 0; while (k && n++ < 100000) { if (seen[k]) { e.push("turn " + id + " is part of a loop of parents"); break; } seen[k] = 1; k = parent[k]; } });
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
      if (r.coverage.status === "complete" && (r.coverage.basis === "ai_reported" || r.coverage.basis === "none")) e.push("coverage cannot be complete on the AI system's word alone");
    }
    (r.gaps || []).forEach(function (g, i) { oneOf(g && g.missing, MISSING, "gaps[" + i + "].missing"); });
    (r.claims || []).forEach(function (c, i) { if (!c || !/^CL-\d{3,}$/.test(str(c.id)) || typeof c.text !== "string") e.push("claims[" + i + "] needs an identifier like CL-001 and its wording"); });
    return e;
  }

  /* ---------- exports ---------- */
  function who(t) { return (t.role === "ai" ? "AI response" : t.role === "system" ? "System" : "Researcher prompt") + (t.kind === "administrative" ? " (administrative)" : ""); }
  function fence(text) { var ticks = "```"; while (String(text).indexOf(ticks) !== -1) ticks += "`"; return ticks + "text\n" + text + "\n" + ticks; }
  function turnMeta(conv, t) {
    var bits = [TEXT_STATUSES[t.text_status] || "Original"];
    if (t.provenance && t.provenance.verification !== "unreviewed") bits.push(VERIFICATIONS[t.provenance.verification]);
    if (t.timestamp) bits.push(t.timestamp);
    if (t.model && t.model.value) bits.push("Model: " + t.model.value);
    if (t.regenerated_from) bits.push("Regenerated response (other version: " + t.regenerated_from + ")");
    if (t.edited_from) bits.push("Edited prompt (earlier version: " + t.edited_from + ")");
    var cls = (t.classification || []).filter(function (x) { return x.status !== "suggested"; });
    if (cls.length) bits.push("Purpose: " + cls.map(function (x) { return labelOf(x.category) + (x.note ? " (" + x.note + ")" : ""); }).join(", "));
    return bits;
  }
  // o: { promptsOnly, responsesOnly, redaction, allBranches (default true) }
  function toMarkdown(conv, o) {
    o = o || {};
    var red = o.redaction && hasRedactions(o.redaction) ? o.redaction : null;
    var cov = coverage(conv), c = counts(conv), path = activePath(conv);
    var md = "# " + (conv.title || "Research conversation") + (o.promptsOnly ? ": researcher prompt history" : o.responsesOnly ? ": AI response history" : "") + "\n\n";
    md += "- Session: " + (conv.sessionId || "not recorded") + "\n- Conversation: " + (conv.id || "") + "\n- Protocol: " + (conv.protocolVersion ? "SPL-RSP " + conv.protocolVersion : "not used") + "\n";
    md += "- Researcher prompts: " + c.researcher_prompts + "; AI responses: " + c.ai_responses + "; administrative messages: " + c.administrative + "; gaps: " + c.gaps + (c.branches > 1 ? "; branches: " + c.branches : "") + "\n";
    md += "- Coverage: " + COVERAGE_LABELS[cov.status] + " (" + cov.basis.replace(/_/g, " ") + ")\n";
    if (red) md += "- **This copy is redacted.** Withheld material is marked [withheld: reason]. It is not a verbatim record; the original is kept by the researcher.\n";
    md += "\n";
    var gapsAfter = {};
    (conv.gaps || []).forEach(function (g) { if (!g.resolved) (gapsAfter[g.after_turn || "start"] = gapsAfter[g.after_turn || "start"] || []).push(g); });
    var gapText = function (g) { return "> **Gap:** " + g.missing.replace(/_/g, " ") + " missing" + (g.reason ? ". " + g.reason : "") + "\n\n"; };
    var show = function (t) { return !(o.promptsOnly && t.role !== "researcher") && !(o.responsesOnly && t.role !== "ai"); };
    var turnMd = function (t, pos) {
      return "## " + t.turn_id + (pos ? " · turn " + pos : "") + " · " + who(t) + "\n\n*" + turnMeta(conv, t).join(" · ") + "*\n\n" + fence(red ? redactTurn(t, red) : t.text) + "\n\n";
    };
    (gapsAfter.start || []).forEach(function (g) { md += gapText(g); });
    path.forEach(function (t, i) {
      if (show(t)) md += turnMd(t, i + 1);
      (gapsAfter[t.turn_id] || []).forEach(function (g) { md += gapText(g); });
    });
    var others = (conv.turns || []).filter(function (t) { return path.indexOf(t) === -1 && show(t); });
    if (others.length && o.allBranches !== false) {
      md += "# Other branches\n\nTurns that are not on the path shown above: regenerated responses, edited prompts and their continuations. Each names the turn it follows.\n\n";
      others.forEach(function (t) { md += "## " + t.turn_id + " · " + who(t) + " · follows " + (t.parent_id || "the start") + "\n\n*" + turnMeta(conv, t).join(" · ") + "*\n\n" + fence(red ? redactTurn(t, red) : t.text) + "\n\n"; });
    }
    return md;
  }
  function csvCell(v) {
    v = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[",\n\r]/.test(v) ? "\"" + v.replace(/"/g, "\"\"") + "\"" : v;
  }
  function csv(rows) { return "﻿" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n"); }
  function orderedTurns(conv) { var p = activePath(conv); return p.concat((conv.turns || []).filter(function (t) { return p.indexOf(t) === -1; })); }
  // o: { promptsOnly, redaction }
  function toCsv(conv, criteria, o) {
    o = o || {};
    var red = o.redaction && hasRedactions(o.redaction) ? o.redaction : null;
    var crit = (criteria || []).map(function (c) { return c.id; });
    var path = activePath(conv);
    var head = ["conversation_id", "session_id", "turn_id", "position", "parent_id", "on_active_path", "role", "kind", "text_status", "verification", "timestamp", "classification"];
    if (!o.promptsOnly) head = head.concat(crit, crit.map(function (c) { return c + "_not_applicable"; }), ["evaluator"]);
    head.push(red ? "text_redacted" : "text");
    var rows = orderedTurns(conv).filter(function (t) { return !o.promptsOnly || t.role === "researcher"; }).map(function (t) {
      var ev = t.evaluation || {}, pos = path.indexOf(t) + 1, r = [conv.id, conv.sessionId, t.turn_id, pos || "", t.parent_id || "", pos ? "yes" : "no", t.role, t.kind, t.text_status, t.provenance ? t.provenance.verification : "", t.timestamp || "",
        (t.classification || []).filter(function (x) { return x.status !== "suggested"; }).map(function (x) { return x.category; }).join("; ")];
      if (!o.promptsOnly) r = r.concat(crit.map(function (c) { return (ev.scores || {})[c] || ""; }), crit.map(function (c) { return (ev.na || {})[c] || ""; }), [ev.evaluator || ""]);
      r.push(red ? redactTurn(t, red) : t.text);
      return r;
    });
    return csv([head].concat(rows));
  }
  // the classified sequence of researcher interventions
  function interventionsCsv(conv) {
    var path = activePath(conv);
    var rows = [["conversation_id", "turn_id", "position", "kind", "classification", "suggested_classification", "evidence_introduced", "instruction_change", "designed_prompt", "text"]];
    path.forEach(function (t, i) {
      if (t.role !== "researcher") return;
      var f = t.flags || {};
      rows.push([conv.id, t.turn_id, i + 1, t.kind, (t.classification || []).filter(function (x) { return x.status !== "suggested"; }).map(function (x) { return x.category + (x.note ? " (" + x.note + ")" : ""); }).join("; "),
        (t.classification || []).filter(function (x) { return x.status === "suggested"; }).map(function (x) { return x.category; }).join("; "),
        f.evidence && f.evidence.on ? f.evidence.note || "yes" : "", f.instruction && f.instruction.on ? f.instruction.note || "yes" : "", t.designedId || "", t.text]);
    });
    return csv(rows);
  }
  function evaluationsCsv(conv, criteria) {
    var path = activePath(conv), crit = criteria || [];
    var rows = [["conversation_id", "response_turn_id", "position", "prompt_turn_id"].concat(crit.map(function (c) { return c.id; }), crit.map(function (c) { return c.id + "_not_applicable"; }), ["evaluator", "notes", "recorded_at", "status"])];
    path.forEach(function (t, i) {
      if (t.role !== "ai" || !t.evaluation) return;
      var ev = t.evaluation, prompt = null;
      for (var k = i - 1; k >= 0; k--) if (path[k].role === "researcher") { prompt = path[k]; break; }
      rows.push([conv.id, t.turn_id, i + 1, prompt ? prompt.turn_id : ""].concat(crit.map(function (c) { return (ev.scores || {})[c.id] || ""; }), crit.map(function (c) { return (ev.na || {})[c.id] || ""; }), [ev.evaluator || "", ev.notes || "", ev.at || "", "researcher_confirmed"]));
    });
    return csv(rows);
  }
  function claimsCsv(conv) {
    var rows = [["conversation_id", "claim_id", "comparable_label", "status", "turn_id", "event", "note", "claim_original_wording", "ai_later_wording", "researcher_interpretation", "outstanding_disagreement"]];
    (conv.claims || []).forEach(function (c) {
      rows.push([conv.id, c.id, c.key || "", c.status, c.turn_id || "", "introduced", "", c.text, c.aiLater || "", c.researcherReading || "", c.outstanding || ""]);
      (c.events || []).forEach(function (e) { rows.push([conv.id, c.id, c.key || "", c.status, e.turn_id || "", e.type, e.note || "", "", "", "", ""]); });
    });
    return csv(rows);
  }
  function metadataCsv(conv) {
    var rows = [["conversation_id", "field", "label", "assertion", "value", "status", "origin", "verification", "source_ref", "recorded_at", "confirmed_at", "reason", "current"]];
    FIELDS.forEach(function (f) {
      var fl = (conv.metadata || {})[f.id], cur = currentAssertion(fl);
      if (!fl || !fl.assertions.length) { rows.push([conv.id, f.id, f.label, "", "", "not recorded", "", "", "", "", "", "", ""]); return; }
      fl.assertions.forEach(function (a, i) { rows.push([conv.id, f.id, f.label, i + 1, a.value == null ? "" : a.value, a.status, a.provenance.origin, a.provenance.verification, a.provenance.source_ref || "", a.provenance.recorded_at || "", a.provenance.confirmed_at || "", a.reason || "", a === cur ? "yes" : ""]); });
    });
    return csv(rows);
  }
  function observationsCsv(conv) {
    var rows = [["conversation_id", "record", "id", "category", "status", "text", "turns", "confidence", "recorded_at"]];
    (conv.observations || []).forEach(function (o) { rows.push([conv.id, "observation", o.id, o.category, "", o.text, (o.turns || []).join(" "), o.confidence || "", o.at || ""]); });
    (conv.decisions || []).forEach(function (d) { rows.push([conv.id, "decision", d.id, "", d.status, d.text, d.turn_id || "", "", d.at || ""]); });
    developments(conv).forEach(function (d) { rows.push([conv.id, "development", "", d.type, d.origin, d.note, d.turn_id || "", "", ""]); });
    return csv(rows);
  }
  function analysisMarkdown(conv) {
    var md = "# " + (conv.title || "Research conversation") + ": analytical records\n\n";
    md += "Purpose: " + (conv.purpose || "not recorded") + "\n\nFinal interpretation, in the researcher's words: " + (conv.finalInterpretation || "not recorded") + "\n\n";
    md += "## Conversation-level observations\n\nThese are qualitative observations. They are not scores, and a sequence of turns is not evidence of cause.\n\n";
    if (!(conv.observations || []).length) md += "None recorded.\n\n";
    OBSERVATION_CATEGORIES.forEach(function (cat) {
      var list = (conv.observations || []).filter(function (o) { return o.category === cat.id; });
      if (!list.length) return;
      md += "### " + cat.label + "\n\n" + list.map(function (o) { return "- " + o.id + " (" + (o.confidence || "confidence not stated") + "; turns " + ((o.turns || []).join(", ") || "none cited") + "): " + o.text; }).join("\n") + "\n\n";
    });
    md += "## Researcher decisions\n\n" + ((conv.decisions || []).length ? conv.decisions.map(function (d) { return "- " + d.id + " · " + DECISION_STATUSES[d.status] + (d.turn_id ? " · " + d.turn_id : "") + ": " + d.text; }).join("\n") : "None recorded.") + "\n\n";
    md += "## Claim History\n\n";
    if (!(conv.claims || []).length) md += "None recorded.\n\n";
    (conv.claims || []).forEach(function (c) {
      md += "### " + c.id + (c.status === "suggested" ? " (suggested by the AI record, not confirmed)" : "") + (c.key ? " · comparable label: " + c.key : "") + "\n\n";
      md += "- First appears: " + (c.turn_id || "not located") + "\n- Original wording: “" + c.text + "”\n";
      if (c.aiLater) md += "- The AI's later wording: “" + c.aiLater + "”\n";
      if (c.researcherReading) md += "- The researcher's interpretation: " + c.researcherReading + "\n";
      if (c.outstanding) md += "- Outstanding disagreement: " + c.outstanding + "\n";
      md += "\n| Turn | Development | Note |\n|---|---|---|\n" + (c.events || []).map(function (e) { return "| " + (e.turn_id || "") + " | " + (CLAIM_EVENTS[e.type] || e.type) + " | " + str(e.note).replace(/\|/g, "/").replace(/\n/g, " ") + " |"; }).join("\n") + "\n\n";
    });
    md += "## Developments recorded on turns\n\n" + (developments(conv).filter(function (d) { return d.type.indexOf("claim_") !== 0; }).map(function (d) { return "- " + d.turn_id + ": " + (FLAG_LABELS[d.type] || d.type) + (d.note ? ". " + d.note : "") + (d.ref ? " (same as " + d.ref + ")" : ""); }).join("\n") || "None recorded.") + "\n\n";
    if ((conv.aiNotes || []).length) md += "## Notes written by the AI system\n\nAI-generated summaries, kept apart from the verbatim turns and not reviewed as evidence.\n\n" + conv.aiNotes.map(function (n) { return "> " + n.text.replace(/\n/g, "\n> "); }).join("\n\n") + "\n";
    return md;
  }
  function escHtml(x) { return String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  // a transcript as an HTML document, for Word and for printing to PDF
  function toHtml(conv, o) {
    o = o || {};
    var red = o.redaction && hasRedactions(o.redaction) ? o.redaction : null;
    var path = activePath(conv), c = counts(conv), cov = coverage(conv);
    var h = "<h1>" + escHtml(conv.title || "Research conversation") + (o.promptsOnly ? ": researcher prompt history" : "") + "</h1>";
    h += "<p class=\"meta\">Session " + escHtml(conv.sessionId || "not recorded") + " · " + escHtml(conv.protocolVersion ? "SPL Research Session Protocol " + conv.protocolVersion : "protocol not used") + " · " +
      c.researcher_prompts + " researcher prompts, " + c.ai_responses + " AI responses, " + c.administrative + " administrative messages, " + c.gaps + " gaps · coverage: " + escHtml(COVERAGE_LABELS[cov.status]) + "</p>";
    if (red) h += "<p class=\"note\"><strong>This copy is redacted.</strong> Withheld material is marked [withheld: reason]. It is not a verbatim record.</p>";
    path.forEach(function (t, i) {
      if (o.promptsOnly && t.role !== "researcher") return;
      h += "<h2>" + escHtml(t.turn_id) + " · turn " + (i + 1) + " · " + escHtml(who(t)) + "</h2><p class=\"meta\">" + escHtml(turnMeta(conv, t).join(" · ")) + "</p><pre>" + escHtml(red ? redactTurn(t, red) : t.text) + "</pre>";
      (conv.gaps || []).filter(function (g) { return !g.resolved && g.after_turn === t.turn_id; }).forEach(function (g) { h += "<p class=\"note\">Gap: " + escHtml(g.missing.replace(/_/g, " ")) + " missing" + (g.reason ? ". " + escHtml(g.reason) : "") + "</p>"; });
    });
    var others = (conv.turns || []).filter(function (t) { return path.indexOf(t) === -1 && !(o.promptsOnly && t.role !== "researcher"); });
    if (others.length) {
      h += "<h1>Other branches</h1>";
      others.forEach(function (t) { h += "<h2>" + escHtml(t.turn_id) + " · " + escHtml(who(t)) + " · follows " + escHtml(t.parent_id || "the start") + "</h2><pre>" + escHtml(red ? redactTurn(t, red) : t.text) + "</pre>"; });
    }
    return h;
  }
  function checkpointsJson(conv, artefacts) {
    return JSON.stringify({ format: "spl-checkpoints", conversation_id: conv.id, session_id: conv.sessionId, checkpoints: (conv.checkpoints || []).map(function (c) {
      var a = (artefacts || []).filter(function (x) { return x.id === c.artefact; })[0];
      return Object.assign({}, c, { original_text: a ? a.text : null, sha256: a ? a.sha256 || null : null });
    }) }, null, 2);
  }

  root.LAB_PROTOCOL = {
    PROTOCOL_VERSION: PROTOCOL_VERSION, SCHEMA_VERSION: SCHEMA_VERSION, TRANSFER_FORMAT: TRANSFER_FORMAT, RECORD_FORMAT: RECORD_FORMAT, TAXONOMY_VERSION: TAXONOMY_VERSION,
    newSessionId: newSessionId, isSessionId: isSessionId, coreProtocol: coreProtocol, withProtocol: withProtocol, PROMPT_DIVIDER: PROMPT_DIVIDER, reminderEvery: reminderEvery,
    COMMANDS: COMMANDS, commandText: commandText,
    FIELDS: FIELDS, FIELD_IDS: FIELD_IDS, FIELD_ALIASES: FIELD_ALIASES, guidanceFor: guidanceFor, environmentOf: environmentOf,
    ORIGINS: ORIGINS, VERIFICATIONS: VERIFICATIONS, STATUSES: STATUSES, TEXT_STATUSES: TEXT_STATUSES, TAXONOMY: TAXONOMY, labelOf: labelOf,
    FOLLOWUP_TEMPLATES: FOLLOWUP_TEMPLATES, FOLLOWUP_REQUIREMENTS: FOLLOWUP_REQUIREMENTS, buildFollowUp: buildFollowUp,
    unifyLines: unifyLines, normaliseText: normaliseText, similarity: similarity,
    parseTransfer: parseTransfer, parseTranscript: parseTranscript, readProviderExport: readProviderExport, providerPath: providerPath,
    isCommand: isCommand, markAdministrative: markAdministrative, detectReviews: detectReviews, REVIEW_LABELS: REVIEW_LABELS,
    childrenOf: childrenOf, siblingsOf: siblingsOf, pathTo: pathTo, activePath: activePath, deepestLeaf: deepestLeaf, leaves: leaves, linkLinear: linkLinear, branchCount: branchCount,
    align: align, alignSummary: alignSummary, ALIGN_LABELS: ALIGN_LABELS, diffWords: diffWords,
    newConversation: newConversation, addTurn: addTurn, mergeImport: mergeImport, mergeProvider: mergeProvider, DISCREPANCY_LABELS: DISCREPANCY_LABELS,
    assertionsFromHeader: assertionsFromHeader, currentAssertion: currentAssertion, fieldConflict: fieldConflict, fieldDone: fieldDone, isRequired: isRequired, outstandingFields: outstandingFields, modelIdentification: modelIdentification,
    coverage: coverage, COVERAGE_LABELS: COVERAGE_LABELS, counts: counts,
    CLAIM_EVENTS: CLAIM_EVENTS, OBSERVATION_CATEGORIES: OBSERVATION_CATEGORIES, DECISION_STATUSES: DECISION_STATUSES, FLAG_LABELS: FLAG_LABELS, nextCode: nextCode,
    developments: developments, persistentErrors: persistentErrors, claimsFromRecord: claimsFromRecord,
    substantivePrompts: substantivePrompts, responseTo: responseTo, compareConversations: compareConversations, promptSequence: promptSequence, timeline: timeline,
    redactText: redactText, redactTurn: redactTurn, suggestRedactions: suggestRedactions, hasRedactions: hasRedactions,
    buildRecord: buildRecord, validateRecord: validateRecord,
    toMarkdown: toMarkdown, toCsv: toCsv, interventionsCsv: interventionsCsv, evaluationsCsv: evaluationsCsv, claimsCsv: claimsCsv, metadataCsv: metadataCsv,
    observationsCsv: observationsCsv, analysisMarkdown: analysisMarkdown, toHtml: toHtml, checkpointsJson: checkpointsJson, escHtml: escHtml
  };
})(typeof self !== "undefined" ? self : globalThis);
