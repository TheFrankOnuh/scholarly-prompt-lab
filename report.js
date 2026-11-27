/* Scholarly Prompt Lab: AI methods report.
   Drafts a methods section, an AI-use statement and appendices from what the researcher recorded in the Lab.
   Rule: it states only what was recorded. Anything not recorded is marked as a gap for the researcher to complete.
   It never says the analysis is verified; it reports which checks were run and what they found. */
(function () {
  "use strict";

  /* ---------- how AI was used: categories (shared with the tests) ---------- */
  // Each category has the label shown to the researcher and the phrase used in the AI-use disclosure.
  // The phrase restates what the researcher selected. It never adds a claim that something was checked or verified.
  // The three writing subcategories belong to "Research writing and editing" and are recorded separately.
  var ROLES = [
    { id: "prelim", label: "Preliminary analysis: Initial examination of source material, followed by my review.", phrase: "preliminary analysis (an initial examination of source material, followed by the researcher's review)" },
    { id: "aicoding", label: "Preliminary coding: Initial coding of research material, which I reviewed and revised.", phrase: "preliminary coding (initial coding of research material, which the researcher reviewed and revised)" },
    { id: "coding", label: "Coding and classification: Application of my established coding scheme.", phrase: "coding and classification (application of the researcher's established coding scheme)" },
    { id: "extract", label: "Information processing: Extraction, summarisation or organisation of source material.", phrase: "information processing (extraction, summarisation or organisation of source material)" },
    { id: "translate", label: "Translation or transcription: Assistance with language translation or transcription.", phrase: "translation or transcription (assistance with language translation or transcription)" },
    { id: "challenge", label: "Interpretive examination: Exploration of alternative readings and counterarguments to assess my interpretation.", phrase: "interpretive examination (exploration of alternative readings and counterarguments to assess the researcher's interpretation)" },
    { id: "object", label: "Object of study: Examination of the AI system and its outputs.", phrase: "" },
    { id: "litreview", label: "Literature discovery and review: Identification, comparison and synthesis of relevant scholarship, with independent verification of sources.", phrase: "literature discovery and review (identification, comparison and synthesis of relevant scholarship, with independent verification of sources)" },
    { id: "design", label: "Research design and instrument development: Assistance with developing research questions, analytical frameworks, interview guides or coding schemes.", phrase: "research design and instrument development (assistance with developing research questions, analytical frameworks, interview guides or coding schemes)" },
    { id: "compare", label: "Comparative analysis: Examination of patterns, differences and relationships across documents, datasets, languages or research contexts.", phrase: "comparative analysis (examination of patterns, differences and relationships across documents, datasets, languages or research contexts)" },
    { id: "writing", label: "Research writing and editing: Assistance with drafting, revising or editing scholarly texts under my supervision.", phrase: "" },
    { id: "writing_lang", parent: "writing", label: "Language and copyediting: Assistance with grammar, spelling, punctuation, clarity and academic language.", phrase: "language and copyediting (grammar, spelling, punctuation, clarity and academic language)" },
    { id: "writing_struct", parent: "writing", label: "Structural and argumentative revision: Assistance with organising scholarly arguments, improving coherence and refining the structure of researcher-authored texts.", phrase: "structural and argumentative revision of researcher-authored texts" },
    { id: "writing_draft", parent: "writing", label: "Content generation and drafting: Generation of substantive academic text, including passages or sections subsequently reviewed and revised by me.", phrase: "content generation and drafting (substantive academic text, subsequently reviewed and revised by the researcher)" }
  ];
  var ROLE_IDS = ROLES.map(function (x) { return x.id; });
  var NUM = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];

  // Saved choices from earlier versions are kept: the old "improving the wording of text I wrote myself"
  // is language and copyediting under research writing and editing.
  function normaliseRoles(saved) {
    var out = [];
    (Array.isArray(saved) ? saved : []).forEach(function (r) {
      if (r === "writing_old") r = "writing_lang";
      if (ROLE_IDS.indexOf(r) !== -1 && out.indexOf(r) === -1) out.push(r);
    });
    ROLES.forEach(function (x) { if (x.parent && out.indexOf(x.id) !== -1 && out.indexOf(x.parent) === -1) out.push(x.parent); });
    return ROLE_IDS.filter(function (id) { return out.indexOf(id) !== -1; });
  }
  function legacyRoles(st) {
    if (Array.isArray(st.roles)) {
      // version 1.2.2 and earlier stored "writing" for the single option about improving one's own wording
      var v = st.rolesVersion === 2 ? st.roles : st.roles.map(function (r) { return r === "writing" ? "writing_old" : r; });
      return normaliseRoles(v);
    }
    return st.role === "object" ? ["object"] : st.role === "both" ? ["prelim", "object"] : ["prelim"];
  }

  // The researcher-reported part of the disclosure: how the researcher says AI was used across the study.
  // Every sentence is attributed to the researcher, because selecting a category is a report, not a record of the activity.
  var ANALYTIC = ["prelim", "aicoding", "coding", "extract", "translate", "challenge", "compare"];
  var ROLE_TEXT = {}; ROLES.forEach(function (x) { if (x.phrase) ROLE_TEXT[x.id] = x.phrase; });
  function useSentences(roles, gap) {
    roles = normaliseRoles(roles);
    if (!roles.length) return gap("study-level AI use");
    var list = function (a) { return a.length < 2 ? a.join("") : a.length === 2 ? a[0] + " and " + a[1] : a.slice(0, -1).join("; ") + "; and " + a[a.length - 1]; };
    var tool = ROLES.filter(function (x) { return x.phrase && !x.parent && roles.indexOf(x.id) !== -1; }).map(function (x) { return x.phrase; });
    var parts = [];
    if (tool.length) parts.push("The researcher reports using generative AI in this study for " + (tool.length === 1 ? tool[0] : "the following purposes: " + list(tool)) + ".");
    if (roles.indexOf("writing") !== -1) {
      var w = ROLES.filter(function (x) { return x.parent === "writing" && roles.indexOf(x.id) !== -1; }).map(function (x) { return x.phrase; });
      parts.push(w.length
        ? "The researcher reports AI assistance with research writing and editing under their supervision, comprising " + list(w) + "."
        : "The researcher reports AI assistance with research writing and editing under their supervision. " + gap("type of writing assistance: language and copyediting, structural and argumentative revision, or content generation and drafting"));
    }
    if (roles.indexOf("object") !== -1) parts.push(parts.length
      ? "The researcher also reports that generative AI is an object of study, so the AI outputs are treated as research data about the AI systems."
      : "The researcher reports that generative AI is the object of study, so the AI outputs are treated as research data about the AI systems.");
    return parts.join(" ");
  }

  // Which logged outputs belong to the study. A saved choice is kept, minus outputs since deleted.
  // Outputs logged after the choice was saved are added, so new runs are not left out by accident,
  // while outputs the researcher unticked stay unticked.
  // With no saved choice (a first visit, or a report set up in an earlier version), the outputs for the current
  // research question are chosen, or every output if none matches or the earlier report used every output.
  function pickOutputs(log, st, question) {
    var ids = log.map(function (e) { return e.id; });
    if (Array.isArray(st.outputs)) {
      var seen = Array.isArray(st.seen) ? st.seen : null;
      return ids.filter(function (id) { return st.outputs.indexOf(id) !== -1 || (seen && seen.indexOf(id) === -1); });
    }
    var q = String(question || "").trim();
    var mine = log.filter(function (e) { return String(e.question || "").trim() === q; }).map(function (e) { return e.id; });
    if (st.scope === "all" || !mine.length) return ids;
    return mine;
  }

  /* ---------- the CONTEXT assessment (shared with the tests) ---------- */
  // Four statuses, assigned from the records alone. They describe what is specified and recorded,
  // never the quality or validity of the research.
  //   Not addressed  - nothing in the design or the records
  //   Specified      - set out in the research design or the prompt
  //   Documented     - a relevant activity is recorded (a logged run, a check, a confirmed score)
  //   Not applicable - the researcher has given a methodological justification
  var DIMS = [
    { key: "c", l: "C", name: "Conceptual grounding" }, { key: "o", l: "O", name: "Operationalisation" },
    { key: "n", l: "N", name: "Situated knowledge" }, { key: "t1", l: "T", name: "Traceability" },
    { key: "e", l: "E", name: "Evaluation" }, { key: "x", l: "X", name: "Cross-model examination" },
    { key: "t2", l: "T", name: "Transparency" }
  ];
  function dimLabel(dm) { return "CONTEXT dimension " + dm.l + ": " + dm.name; }
  function countRuns(n) { return n + (n === 1 ? " documented run" : " documented runs"); }

  // f: { question, theories, theoryNotes, procedureSteps, context, terms, safeguards, sourceText, planCross, planLog,
  //      prompts: [prompt text of each selected output], outputs: n, checked: n, confirmed: n, complete: n (outputs with system and date),
  //      systems: n, conditions: n, repeats: n (largest number of runs of one condition on one system), na: { key: justification } }
  function contextAssessment(f) {
    var has = function (id) { return (f.safeguards || []).indexOf(id) !== -1; };
    var inPrompt = function (re) { return f.prompts.filter(function (t) { return re.test(t); }).length; };
    var evalGuards = ["uncert", "alt", "review", "syco", "obs"].filter(has).length;
    var rules = {
      c: function () {
        var spec = !!(String(f.question).trim() && ((f.theories || []).length || String(f.theoryNotes).trim()));
        var k = inPrompt(/THEORETICAL ORIENTATION:/);
        if (k) return ["Documented", "The research question and theoretical orientation appear in the prompt of " + countRuns(k) + "."];
        if (spec) return ["Specified", "The research question and theoretical orientation are set out in the research design. No documented run used a prompt containing them."];
        return ["Not addressed", "No research question with a stated theoretical orientation is recorded."];
      },
      o: function () {
        var k = inPrompt(/\nPROCEDURE:\n/);
        if (k) return ["Documented", "The analytical procedure appears in the prompt of " + countRuns(k) + "."];
        if (f.procedureSteps >= 2) return ["Specified", "An analytical procedure of " + f.procedureSteps + " steps is set out in the research design. No documented run used a prompt containing it."];
        return ["Not addressed", "No analytical procedure of two or more steps is recorded."];
      },
      n: function () {
        var k = inPrompt(/CULTURAL, LINGUISTIC AND HISTORICAL CONTEXT:|CONTESTED TERMINOLOGY:/);
        if (k) return ["Documented", "Cultural, linguistic or historical context, or contested terminology, appears in the prompt of " + countRuns(k) + "."];
        if (String(f.context).trim() || String(f.terms).trim() || has("lang")) return ["Specified", "Context, contested terminology or the preservation of original-language terms is set out in the research design. No documented run used a prompt containing it."];
        return ["Not addressed", "No cultural, linguistic or historical context is recorded."];
      },
      t1: function () {
        if (f.checked) return ["Documented", "Automated quotation matching against the loaded source text is recorded for " + f.checked + " of " + f.outputs + " outputs. It confirms only that quoted words appear in the source."];
        if (has("quote") || (has("nofab") && String(f.sourceText).trim())) return ["Specified", "The prompt requires traceable evidence. No quotation matching is recorded for the selected outputs."];
        return ["Not addressed", "No requirement for traceable evidence and no quotation matching are recorded."];
      },
      e: function () {
        if (f.confirmed) return ["Documented", "Researcher-confirmed scores are recorded for " + f.confirmed + " of " + f.outputs + " outputs (Appendix G)."];
        if (evalGuards >= 2) return ["Specified", "The prompt includes " + evalGuards + " evaluation standards. No researcher-confirmed scores are recorded."];
        return ["Not addressed", "No evaluation standards and no researcher-confirmed scores are recorded."];
      },
      x: function () {
        if (f.systems >= 2 || f.conditions >= 2) return ["Documented", "Outputs from " + f.systems + (f.systems === 1 ? " AI system" : " AI systems") + " under " + f.conditions + (f.conditions === 1 ? " prompt condition" : " prompt conditions") + " are recorded (Appendix F)."];
        var rep = f.repeats >= 2 ? " Repeated runs of one prompt on one AI system are recorded, but no comparison across AI systems or prompt conditions." : "";
        if (f.planCross) return ["Specified", "The research design commits to cross-model examination." + (rep || " The selected records contain one AI system and one prompt condition.")];
        return ["Not addressed", "No commitment to cross-model examination is recorded." + rep];
      },
      t2: function () {
        if (f.outputs && f.complete === f.outputs) return ["Documented", "The AI system and date of use are recorded for all " + f.outputs + " outputs, with the prompt used (Appendices A and B)."];
        if (f.outputs) return ["Specified", "Outputs are recorded, but the AI system or date of use is missing for " + (f.outputs - f.complete) + " of " + f.outputs + "."];
        if (f.planLog) return ["Specified", "The research design commits to recording the AI system, version, date, settings and human review. No outputs are recorded yet."];
        return ["Not addressed", "No commitment to research documentation and no recorded outputs."];
      }
    };
    // conversation records document a dimension when the single outputs do not (f.conv is empty in studies without conversations)
    var cv = f.conv || null;
    var convRules = cv && cv.n ? {
      c: function () { return cv.theory ? "The theoretical orientation appears in the initial prompt of " + plural(cv.theory, "research conversation") + "." : cv.theoryChanges ? plural(cv.theoryChanges, "change") + " of theoretical orientation " + (cv.theoryChanges === 1 ? "is" : "are") + " recorded in the conversations." : ""; },
      o: function () { return cv.procedure ? "The analytical procedure appears in the initial prompt of " + plural(cv.procedure, "research conversation") + (cv.instructionChanges ? ", and " + plural(cv.instructionChanges, "change") + " to the instructions " + (cv.instructionChanges === 1 ? "is" : "are") + " recorded by turn" : "") + "." : ""; },
      n: function () { return cv.context || cv.contextCorrections ? (cv.context ? "Context appears in the initial prompt of " + plural(cv.context, "research conversation") + "." : "") + (cv.contextCorrections ? " " + plural(cv.contextCorrections, "contextual correction") + " " + (cv.contextCorrections === 1 ? "is" : "are") + " recorded in the conversations." : "") : ""; },
      t1: function () { return cv.checked ? "Quotation checks are recorded for " + plural(cv.checked, "AI response") + " in the conversations." : cv.evidence ? plural(cv.evidence, "turn") + " introducing evidence, with source identifiers, " + (cv.evidence === 1 ? "is" : "are") + " recorded in the conversations." : ""; },
      e: function () { return cv.scored || cv.observations ? (cv.scored ? "Researcher scores are recorded for " + plural(cv.scored, "AI response") + " in the conversations" : "") + (cv.scored && cv.observations ? ", and " : "") + (cv.observations ? plural(cv.observations, "conversation-level observation") : "") + " (section 2.8, Appendix H)." : ""; },
      x: function () { return cv.compared ? plural(cv.compared, "research conversation") + " are compared across AI systems or conversational conditions (section 2.8)." : ""; },
      t2: function () { return cv.preserved ? "Every recorded researcher prompt is preserved in its original wording, or checked by the researcher, in " + plural(cv.preserved, "research conversation") + ", with metadata provenance and the protocol version (Appendix H)." : ""; }
    } : null;
    return DIMS.map(function (dm) {
      var why = String((f.na || {})[dm.key] || "").trim();
      var r = why ? ["Not applicable", why] : rules[dm.key]();
      if (!why && r[0] !== "Documented" && convRules) { var b = convRules[dm.key](); if (b) r = ["Documented", b.trim()]; }
      return { key: dm.key, l: dm.l, name: dm.name, label: dimLabel(dm), status: r[0], basis: r[1] };
    });
  }

  // The Lab's own citation: the DOI of exactly this version when the release metadata records one, and otherwise
  // the DOI that resolves to all versions. A DOI is never constructed.
  function labCitation(rel) {
    var year = /^\d{4}/.test(rel.released || "") ? rel.released.slice(0, 4) : "n.d.";
    var doi = rel.versionDoi || rel.conceptDoi;
    return {
      text: "Onuh, F. (" + year + ") *Scholarly Prompt Lab: The Prompt as Method* (Version " + rel.version + ") [Computer software]. Zenodo. https://doi.org/" + doi,
      doi: doi, versionSpecific: !!rel.versionDoi, year: year
    };
  }

  window.LAB_REPORT_DATA = { ROLES: ROLES, normaliseRoles: normaliseRoles, legacyRoles: legacyRoles, useSentences: useSentences, pickOutputs: pickOutputs, contextAssessment: contextAssessment, labCitation: labCitation, DIMS: DIMS };

  var A = window.LAB_APP;
  if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "spl.report.v1";
  var REL = Object.assign({ version: A.VERSION, versionDoi: "", conceptDoi: "10.5281/zenodo.24521711", released: "" }, A.RELEASE || {});
  var USE_LABEL = { used: "Used without modification", revised: "Used after the researcher's corrections", prompted: "Used to inform the researcher's own analysis", rejected: "Rejected", data: "Retained as research data about the AI system", "": "Decision pending" };

  function chosenRoles() {
    var out = [];
    ROLES.forEach(function (x) { var el = document.getElementById("rpRole_" + x.id); if (el && el.checked) out.push(x.id); });
    return normaliseRoles(out);
  }

  function esc(x) { return String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function gap(text) { return '<span class="gap">[To complete: ' + esc(text) + "]</span>"; }
  function p(html) { return "<p>" + html + "</p>"; }
  function list(items) { return "<ul>" + items.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>"; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many || one + "s"); }
  function joinAnd(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function ital(s) { return esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>"); }
  function niceDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); if (!m) return esc(d || ""); return parseInt(m[3], 10) + " " + ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][parseInt(m[2], 10) - 1] + " " + m[1]; }
  function table(head, rows) {
    return "<table><thead><tr>" + head.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }

  function settings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    return s;
  }
  function saveSettings() {
    var s = { title: $("rpTitle").value, author: $("rpAuthor").value, roles: chosenRoles(), rolesVersion: 2, use: $("rpUse").value, sources: $("rpSources").checked, outputs: chosenOutputs(), seen: A.getLog().map(function (e) { return e.id; }), na: chosenNa() };
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    return s;
  }

  // a researcher's reasons why a CONTEXT dimension does not apply to the study
  function chosenNa() {
    var na = {};
    DIMS.forEach(function (dm) { var el = document.getElementById("rpNa_" + dm.key); if (el && el.value.trim()) na[dm.key] = el.value.trim(); });
    return na;
  }
  // the outputs ticked in the list, in the order of the log
  function chosenOutputs() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll("#rpOutputs input[type=checkbox]"), function (cb) { if (cb.checked) out.push(cb.value); });
    return out;
  }
  function entriesFor(ids) {
    return A.getLog().filter(function (e) { return ids.indexOf(e.id) !== -1; });
  }

  function stripSources(prompt, keep) {
    if (keep) return prompt;
    return prompt.replace(/<<<BEGIN SOURCE>>>\n([\s\S]*?)\n<<<END SOURCE>>>/, function (all, body) {
      var words = body.trim() ? body.trim().split(/\s+/).length : 0;
      var docs = (body.match(/\[DOC-\d+/g) || []).length;
      return "<<<BEGIN SOURCE>>>\n[The source text supplied to the AI system is not reproduced here: " + words.toLocaleString() + " words" + (docs ? " in " + plural(docs, "document") : "") + ".]\n<<<END SOURCE>>>";
    });
  }

  // Reporting rule. Four kinds of statement are kept apart, and each is worded for what it is:
  //   intended use      - commitments in the research design ("The research design commits to ...")
  //   reported use      - what the researcher states about the study ("The researcher reports ...")
  //   documented use    - what the Lab's records show ("The records document ...")
  //   confirmed evaluation - scores the researcher confirmed
  // Nothing is said to have been checked, reviewed, corrected or verified unless a record shows it.
  // [To complete: ...] marks missing information. "Not undertaken" and "Not applicable" are stated as such.
  function build() {
    var st = saveSettings();
    var d = A.readState();
    var L = A.L;
    var logAll = A.getLog();
    var entries = entriesFor(st.outputs || []);
    var th = A.theoryLines(d);
    var tech = A.techniqueOf(d);
    var conv = A.conventionFor(d.discipline);
    var noSources = tech.sources === "none";
    var roles = normaliseRoles(st.roles || []);
    var out = [];
    var n = entries.length;
    var cit = labCitation(REL);
    // research conversations (conversations.js), included by the researcher; absent from studies without them
    var convs = window.LAB_CONV && window.LAB_CONV.forReport && PR ? window.LAB_CONV.forReport() : [];
    // a researcher-confirmed score: a score is present and is not an unconfirmed suggestion
    var conf = function (e, id) { return !!(e.scores && e.scores[id]) && A.countsScore(e, id); };

    // ---- facts from the records ----
    var bId = {}; entries.forEach(function (e, i) { bId[e.id] = "B" + (i + 1); });
    var systems = {};
    entries.forEach(function (e) {
      var k = (e.model || "").trim();
      var key = k || "\u0000";
      systems[key] = systems[key] || { name: k, n: 0, dates: [], settings: {}, missingDate: 0 };
      systems[key].n++; if (e.date) systems[key].dates.push(e.date); else systems[key].missingDate++;
      if ((e.settings || "").trim()) systems[key].settings[e.settings.trim()] = 1;
    });
    var sysKeys = Object.keys(systems);
    var namedSystems = sysKeys.filter(function (k) { return systems[k].name; }).map(function (k) { return systems[k].name; });
    var allDates = entries.map(function (e) { return e.date; }).filter(Boolean).sort();
    var range = function (ds) { return !ds.length ? "" : ds[0] === ds[ds.length - 1] ? niceDate(ds[0]) : niceDate(ds[0]) + " to " + niceDate(ds[ds.length - 1]); };
    var withChecks = entries.filter(function (e) { return e.checks && e.checks.sourceWords > 0; });
    var tot = { q: 0, exact: 0, near: 0, missing: 0, outside: 0 };
    withChecks.forEach(function (e) { tot.q += e.checks.quotations; tot.exact += e.checks.exact; tot.near += e.checks.near; tot.missing += e.checks.missing + (e.checks.termsMissing || 0); tot.outside += (e.checks.outsideFacts || []).length; });
    var second = entries.filter(function (e) { return e.secondModel; });
    var secondNames = {}; second.forEach(function (e) { if (e.secondModel.model) secondNames[e.secondModel.model] = 1; });
    var evaluators = {}; entries.forEach(function (e) { if ((e.evaluator || "").trim()) evaluators[e.evaluator.trim()] = 1; });
    var confirmedOutputs = entries.filter(function (e) { return L.criteria.some(function (c) { return conf(e, c.id); }); }).length;
    var unconfirmed = 0;
    var means = L.criteria.map(function (c) {
      var v = entries.filter(function (e) { return conf(e, c.id); }).map(function (e) { return parseInt(e.scores[c.id], 10); }).filter(function (x) { return !isNaN(x); });
      entries.forEach(function (e) { if (e.scores[c.id] && !conf(e, c.id)) unconfirmed++; });
      return { c: c, n: v.length, mean: v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null, min: v.length ? Math.min.apply(null, v) : null, max: v.length ? Math.max.apply(null, v) : null };
    });
    // where a suggestion existed and the researcher confirmed a score, did they keep or change it?
    var agree = { checks: [0, 0], ai: [0, 0] };
    entries.forEach(function (e) {
      if (!e.suggested || !e.scoreStatus) return;
      L.criteria.forEach(function (c) {
        var fin = parseInt(e.scores[c.id], 10), stt = e.scoreStatus[c.id];
        if (isNaN(fin) || !stt || stt === "suggested") return;
        ["checks", "ai"].forEach(function (k) { var sg = e.suggested[c.id] && e.suggested[c.id][k]; if (sg && sg.score != null) { agree[k][1]++; if (sg.score === fin) agree[k][0]++; } });
      });
    });
    var uses = {}; entries.forEach(function (e) { uses[e.use || ""] = (uses[e.use || ""] || 0) + 1; });
    var byCond = {}; entries.forEach(function (e) { byCond[e.condition] = (byCond[e.condition] || 0) + 1; });
    var conds = Object.keys(byCond);
    var cells = {}; entries.forEach(function (e) { var k = e.condition + "\u0000" + ((e.model || "").trim() || "(AI system not recorded)"); cells[k] = (cells[k] || 0) + 1; });
    var repeats = Object.keys(cells).reduce(function (m, k) { return Math.max(m, cells[k]); }, 0);
    var framed = entries.filter(function (e) { return e.sycophancy; }).length;
    var srcWords = d.sourceText.trim() ? d.sourceText.trim().split(/\s+/).length : 0;
    var srcDocs = (d.sourceText.match(/\[DOC-\d+/g) || []).length;
    var steps = d.procedure.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);

    // the prompts actually recorded with the selected outputs, each with an identifier
    var prompts = [], promptOf = {};
    entries.forEach(function (e) {
      var text = A.fullPrompt(e), key = e.condition + "\u0000" + text, pr = null;
      for (var i = 0; i < prompts.length; i++) if (prompts[i].key === key) { pr = prompts[i]; break; }
      if (!pr) { pr = { key: key, id: "P" + (prompts.length + 1), cond: e.condition, text: text, outputs: [], sources: {}, copied: [], versions: {} }; prompts.push(pr); }
      pr.outputs.push(bId[e.id]);
      pr.sources[e.promptSource || "rebuilt"] = (pr.sources[e.promptSource || "rebuilt"] || 0) + 1;
      if (e.promptCopiedAt) pr.copied.push(e.promptCopiedAt.slice(0, 10));
      if (e.labVersion) pr.versions[e.labVersion] = 1;
      promptOf[e.id] = pr.id;
    });

    var ctx = contextAssessment({
      question: d.question, theories: d.theories, theoryNotes: d.theoryNotes, procedureSteps: steps.length, context: d.context, terms: d.terms,
      safeguards: d.safeguards, sourceText: d.sourceText, planCross: d.planCross, planLog: d.planLog,
      prompts: prompts.reduce(function (a, pr) { return a.concat(pr.outputs.map(function () { return pr.text; })); }, []),
      outputs: n, checked: withChecks.length, confirmed: confirmedOutputs,
      complete: entries.filter(function (e) { return (e.model || "").trim() && e.date; }).length,
      systems: Math.max(namedSystems.length, sysKeys.length && !namedSystems.length ? 1 : 0), conditions: conds.length, repeats: repeats, na: st.na || {},
      conv: convs.length ? conversationFacts(convs) : null
    });
    var ctxCount = {}; ctx.forEach(function (c) { ctxCount[c.status] = (ctxCount[c.status] || 0) + 1; });
    var compared = namedSystems.length >= 2 || conds.length >= 2 || repeats >= 2;

    // ---- title ----
    out.push("<h1>" + (st.title.trim() ? esc(st.title.trim()) : gap("study title")) + "</h1>");
    out.push('<p class="subtitle">AI-Assisted Research: Methodological Report</p>');
    out.push('<p class="meta">' + (st.author.trim() ? esc(st.author.trim()) + "<br>" : "") +
      "Generated on " + niceDate(A.today()) + " using Scholarly Prompt Lab (Version " + esc(A.VERSION) + "). " +
      (cit.versionSpecific ? "DOI for this version: " : "DOI (all versions): ") + '<a href="https://doi.org/' + esc(cit.doi) + '">https://doi.org/' + esc(cit.doi) + "</a></p>");
    if (!n) out.push('<p class="note">' + (logAll.length
      ? "No logged outputs are selected for this study, so this report describes the research design only. Select outputs in the report settings to include them."
      : "No AI outputs are documented yet, so this report describes the research design only.") +
      (convs.length ? " Research conversations are reported separately, in section 2.8 and Appendix H." : "") + "</p>");

    // ---- 1. Generative AI disclosure ----
    out.push("<h2>1. Generative AI disclosure</h2>");
    var disc = [useSentences(roles, gap)];
    if (n) {
      disc.push("The study's records in Scholarly Prompt Lab document " + plural(n, "AI output") + (namedSystems.length ? " from " + esc(joinAnd(namedSystems)) : "") +
        (allDates.length ? (allDates[0] === allDates[allDates.length - 1] ? ", used on " + niceDate(allDates[0]) : ", used between " + niceDate(allDates[0]) + " and " + niceDate(allDates[allDates.length - 1])) : "") + "." +
        (namedSystems.length < sysKeys.length || allDates.length < n ? " " + gap("AI system, version and dates of use for every output") : ""));
      if (withChecks.length) disc.push("Automated quotation matching against the loaded source text is recorded for " + (withChecks.length === n ? (n === 1 ? "this output" : "all " + n + " outputs") : withChecks.length + " of them") + ".");
      if (confirmedOutputs) disc.push("Researcher-confirmed evaluation scores are recorded for " + (confirmedOutputs === n ? (n === 1 ? "this output" : "all " + n + " outputs") : confirmedOutputs + " of them") + ".");
    }
    if (convs.length) disc.push("The records also document " + plural(convs.length, "research conversation") + " with generative AI systems, comprising " + plural(convs.reduce(function (m, c) { return m + PR.counts(c).researcher_prompts; }, 0), "researcher prompt") + " and " + plural(convs.reduce(function (m, c) { return m + PR.counts(c).ai_responses; }, 0), "AI response") + " (section 2.8 and Appendix H).");
    disc.push("Prompts were designed and recorded with Scholarly Prompt Lab (Onuh, " + cit.year + "). The researcher is responsible for the analysis and conclusions presented.");
    out.push('<p class="stmt" id="rpStatement">' + disc.join(" ") + "</p>");

    // ---- 2. Research methodology ----
    out.push("<h2>2. Research methodology</h2>");

    out.push("<h3>2.1 AI systems and conditions of use</h3>");
    // with no single outputs but with conversations, the single-output sections point to section 2.8 instead of asking for input
    var onlyConv = !n && convs.length ? "No single AI outputs are documented. The research conversations, with their AI systems, are described in section 2.8." : "";
    if (!n) out.push(p(onlyConv || gap("AI system, version and dates of use")));
    else out.push(table(["AI system and version", "Outputs", "Dates of use", "Interface and settings"], sysKeys.map(function (k) {
      var s = systems[k], sets = Object.keys(s.settings);
      return [s.name ? esc(s.name) : gap("AI system and version"), String(s.n),
        s.dates.length ? range(s.dates.sort()) + (s.missingDate ? "; " + gap("date of use for " + plural(s.missingDate, "output")) : "") : gap("date of use"),
        sets.length ? esc(sets.join("; ")) : gap("interface and settings")];
    })));

    out.push("<h3>2.2 Prompt design and analytical procedure</h3>");
    var design = [];
    var qLines = d.question.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    design.push(qLines.length > 1
      ? "The research questions were: " + qLines.map(function (x, k) { return "(" + (k + 1) + ") “" + esc(x) + "”"; }).join("; ") + (/[?!.]$/.test(qLines[qLines.length - 1]) ? "" : ".")
      : "The research question was: " + (qLines.length ? "“" + esc(qLines[0]) + "”" + (/[?!.]$/.test(qLines[0]) ? "" : ".") : gap("research question(s)")));
    design.push("The study is situated in " + esc(d.discipline) + "." + (conv && !noSources ? " Following the conventions of the discipline, the research design requires " + esc(conv.label.toLowerCase()) + "." : ""));
    if (th.length) design.push("The research design applies " + joinAnd(th.map(function (t) { var c = (t.works || []).map(function (w) { return esc(w.authors.replace(/\s*\(eds?\.?\)/i, "").split(",")[0]) + " " + w.year; }).join("; "); return esc(t.n) + (c ? " (" + c + ")" : t.custom ? " (a framework defined by the researcher)" : ""); })) + ", sets out the analytical steps and core concepts of " + (th.length > 1 ? "each framework" : "the framework") + ", and asks the AI system to say where the material does not fit.");
    else design.push(gap("theoretical framework, or a statement that none was used"));
    if (d.theoryNotes.trim()) design.push("The researcher's guidance on the use of theory: “" + esc(d.theoryNotes.trim()) + "”");
    design.push("The prompting technique is " + esc(tech.label.split(" (")[0].toLowerCase()) + (noSources ? ": the AI system answers from its general knowledge, and no source material is supplied." : ".") +
      (steps.length ? " The analytical procedure has " + plural(steps.length, "step") + " and is reproduced verbatim in Appendix A." : " " + gap("analytical procedure")));
    out.push(p(design.join(" ")));
    var rd = [["Unit of analysis", d.unit, "unit of analysis"], ["Corpus and selection criteria", d.corpus, "corpus and selection criteria"], ["Working definitions and decision rules", d.definitions, "working definitions and decision rules"]];
    out.push(list(rd.map(function (x) { return "<strong>" + x[0] + ":</strong> " + (x[1].trim() ? esc(x[1].trim()) : gap(x[2])); })));
    if (noSources) out.push(p("Source material: not applicable to this prompting technique."));
    else out.push(p("Source material: " + (d.sourceDesc.trim() ? esc(d.sourceDesc.trim()) : gap("description of the source material")) +
      (srcWords ? " (" + srcWords.toLocaleString() + " words" + (srcDocs ? " in " + plural(srcDocs, "document") + ", each with an identifier for tracing claims" : "") + ")." : ". " + gap("source text, which is not loaded in the Lab"))));
    if (d.context.trim() || d.terms.trim()) out.push(p("Context given to the AI system: " + esc([d.context.trim(), d.terms.trim() ? "Contested terminology: " + d.terms.trim() : ""].filter(Boolean).join(" "))));
    var sg = L.safeguards.filter(function (x) { return d.safeguards.indexOf(x.id) !== -1; });
    if (sg.length) out.push(p("The research design instructs the AI system to observe these analytical standards: " + esc(joinAnd(sg.map(function (x) { return x.label.charAt(0).toLowerCase() + x.label.slice(1); }))) + ". The full instructions are given in Appendix A."));
    var shas = {}; entries.forEach(function (e) { if (e.design && e.design.sourceSha256) shas[e.design.sourceSha256] = (shas[e.design.sourceSha256] || 0) + 1; });
    var shaKeys = Object.keys(shas);
    if (shaKeys.length) out.push(p("The source text analysed is identified by its SHA-256 fingerprint, recorded when each output was logged: " + shaKeys.map(function (k) { return "<code>" + k + "</code> (" + plural(shas[k], "output") + ")"; }).join("; ") + "." + (shaKeys.length > 1 ? " More than one fingerprint means the source text changed between runs." : "")));
    var designedNow = document.getElementById("prompt").textContent;
    if (prompts.length && !prompts.some(function (pr) { return pr.text === designedNow; })) out.push(p("The documented runs used prompts that differ from the research design as it now stands. Appendix A reproduces each prompt exactly as recorded, so the elements of the design that each run used can be examined."));
    out.push(p("Appendix E assesses the study against the seven CONTEXT dimensions: " + ["Documented", "Specified", "Not addressed", "Not applicable"].filter(function (k) { return ctxCount[k]; }).map(function (k) { return ctxCount[k] + " " + k.toLowerCase(); }).join(", ") + "."));

    out.push("<h3>2.3 Execution and experimental conditions</h3>");
    var ex = [];
    if (!n) ex.push(onlyConv || "Not yet undertaken: no runs are documented.");
    else {
      ex.push("The selected records document " + plural(n, "run") + (namedSystems.length ? " on " + plural(namedSystems.length, "AI system") : "") + " under " + plural(conds.length, "prompt condition") + (conds.length === 1 ? " (" + esc(A.condName(conds[0])) + ")" : "") + "." +
        (repeats >= 2 ? " At least one prompt was run " + repeats + " times on the same AI system." : ""));
      if (compared) ex.push("Results are compared by " + joinAnd([conds.length >= 2 ? "prompt condition" : "", namedSystems.length >= 2 ? "AI system" : "", repeats >= 2 ? "repeated run" : ""].filter(Boolean)) + " in Appendix F.");
      else if (d.planCross) ex.push("The research design commits to testing the prompt through repeated runs and across AI systems or prompt formulations. No such comparison is documented in the selected records.");
      else ex.push("No comparison across AI systems, prompt conditions or repeated runs is documented.");
      var rebuilt = entries.filter(function (e) { return e.promptSource !== "copied" && e.promptSource !== "copied-design-changed"; }).length;
      if (rebuilt) ex.push("For " + plural(rebuilt, "output") + ", the prompt was not copied from the Lab in the same session. The prompt recorded is the one the research design produced when the output was logged. " + gap("confirmation that this is the prompt used"));
    }
    if (d.planLog && !n) ex.push("The research design commits to recording the AI system, its version, the date of use, relevant settings and who reviewed the output.");
    out.push(p(ex.join(" ")));

    out.push("<h3>2.4 Output verification</h3>");
    var ver = [];
    if (!n) ver.push(onlyConv || "Not yet undertaken: no AI outputs are documented.");
    else if (noSources) ver.push("Quotation matching is not applicable: the prompting technique supplies no source material against which quotations could be matched.");
    else if (!withChecks.length) ver.push("No quotation matching is recorded for the selected outputs, because no source text was loaded in the Lab when they were logged. " + gap("verification undertaken outside the Lab, or a statement that none was undertaken"));
    else {
      ver.push("Automated quotation matching compared each quotation in " + (withChecks.length === n ? "the outputs" : withChecks.length + " of the " + n + " outputs") + " with the source text loaded in the Lab. Of " + plural(tot.q, "quotation") + ", " + tot.exact + " matched the source exactly, " + tot.near + " differed in wording or diacritics, and " + tot.missing + " could not be found." +
        (tot.outside ? " The outputs also contain " + plural(tot.outside, "name or figure", "names or figures") + " not found in the sources." : "") +
        " A match shows only that the quoted words appear in the source. It does not establish that a claim is accurate or that an interpretation is sound. The items flagged for each output are listed in Appendix C.");
      if (withChecks.length < n) ver.push("For " + plural(n - withChecks.length, "output") + ", no quotation matching is recorded because no source text was loaded at the time.");
    }
    if (second.length) ver.push("For " + plural(second.length, "output") + ", a second AI system (" + (Object.keys(secondNames).length ? esc(joinAnd(Object.keys(secondNames))) : gap("evaluator AI system and version")) + ") produced an assessment against three of the criteria. These assessments are AI-generated suggestions, not independent validation, and are reported with the researcher's decisions in Appendix G.");
    out.push(p(ver.join(" ")));

    out.push("<h3>2.5 Researcher evaluation</h3>");
    if (!n) out.push(p(onlyConv || "Not yet undertaken: no AI outputs are documented."));
    else if (!confirmedOutputs) out.push(p("No researcher-confirmed scores are recorded for the selected outputs." + (unconfirmed ? " " + plural(unconfirmed, "automatically suggested score remains", "automatically suggested scores remain") + " unconfirmed and " + (unconfirmed === 1 ? "is" : "are") + " not reported as evaluation." : "") + " " + gap("researcher evaluation of the outputs, or a statement that none was undertaken")));
    else {
      out.push(p("The researcher scored " + plural(confirmedOutputs, "output") + " on six criteria from 1 (poor) to 5 (strong)" + (Object.keys(evaluators).length ? ", recording the evaluator as " + esc(joinAnd(Object.keys(evaluators))) : "") + ". Only researcher-confirmed scores are summarised here. The criteria, scoring guidance and each score are given in Appendix G." + (Object.keys(evaluators).length ? "" : " " + gap("evaluator name or role"))));
      out.push(table(["Criterion", "Outputs scored", "Mean", "Range"], means.map(function (m) { return [esc(m.c.label), String(m.n), m.mean == null ? "–" : m.mean.toFixed(1), m.mean == null ? "–" : m.min === m.max ? String(m.min) : m.min + "–" + m.max]; })));
      var ag = [];
      if (agree.checks[1]) ag.push(agree.checks[0] + " of " + agree.checks[1] + " suggested by the automated checks");
      if (agree.ai[1]) ag.push(agree.ai[0] + " of " + agree.ai[1] + " suggested by the second AI system");
      if (ag.length) out.push(p("Of the scores the researcher confirmed where a suggestion existed, the researcher kept " + ag.join(" and ") + ", and changed the others."));
      if (unconfirmed) out.push(p(plural(unconfirmed, "suggested score remains", "suggested scores remain") + " unconfirmed and " + (unconfirmed === 1 ? "is" : "are") + " not included."));
      if (n < 5) out.push(p("With " + plural(n, "output") + ", these figures are descriptive only."));
    }
    if (framed) out.push(p("For " + plural(framed, "output") + ", the researcher recorded uncritical adoption of the researcher's framing."));

    out.push("<h3>2.6 Integration of AI outputs into the research</h3>");
    if (n) {
      var known = Object.keys(uses).filter(function (k) { return k; });
      if (known.length) out.push(p("Decisions recorded for individual outputs:") + table(["Decision", "Outputs"], ["used", "revised", "prompted", "data", "rejected"].filter(function (k) { return uses[k]; }).map(function (k) { return [esc(USE_LABEL[k]), String(uses[k])]; })));
      if (uses[""]) out.push(p(gap("decision on " + plural(uses[""], "output"))));
    }
    out.push(p(st.use.trim() ? "The researcher's account of how the AI outputs informed the study: “" + esc(st.use.trim()) + "”" : n ? gap("account of how the AI outputs informed the analysis") : "Not yet undertaken: no AI outputs are documented."));

    out.push("<h3>2.7 Methodological limitations</h3>");
    var lim = [];
    var asObject = roles.indexOf("object") !== -1;
    var asTool = roles.some(function (r) { return ANALYTIC.indexOf(r) !== -1; });
    if (!n) lim.push("No AI outputs are documented, so the limitations of AI use cannot yet be assessed from the records.");
    else {
      if (asObject) lim.push("Because AI is an object of study, the outputs are primary data about the AI systems. The findings describe the behaviour of the recorded systems under the recorded prompts and may not hold for other versions, settings or prompts.");
      if (asTool) lim.push("Findings about the source material that draw on AI outputs depend on the researcher's own examination of the sources. The records do not establish that the outputs represent the sources accurately.");
      // model variability, model choice and prompt sensitivity, stated once and only for what was not examined
      var notEx = [];
      if (namedSystems.length <= 1) notEx.push("the choice of AI system");
      if (conds.length === 1) notEx.push("the wording of the prompt");
      if (repeats < 2) notEx.push("variation between runs");
      if (notEx.length && ctx[5].status !== "Not applicable") lim.push("The records do not examine the influence of " + joinAnd(notEx) + " on the outputs" + (namedSystems.length <= 1 ? ", so the results may be specific to the AI system used" : "") + ".");
      lim.push("AI systems change between versions. Re-running the prompts in Appendix A may not reproduce the outputs in Appendix B.");
      // the size of the source text as recorded with the checked outputs, not as it stands in the design now
      var checkedWords = withChecks.reduce(function (m, e) { return Math.max(m, (e.design && e.design.sourceWords) || e.checks.sourceWords || 0); }, 0);
      if (withChecks.length) lim.push("Quotation matching covers only the source text loaded in the Lab" + (checkedWords ? " (" + checkedWords.toLocaleString() + " words when the outputs were logged)" : "") + ". It cannot detect errors involving material outside that text.");
      if (ctx[2].status === "Not addressed" && !noSources) lim.push("No cultural, linguistic or historical context was specified, so the AI system may have read the material through its default assumptions.");
      if (!framed && d.safeguards.indexOf("syco") === -1 && !asObject) lim.push("The prompt did not instruct the AI system to guard against uncritical agreement with the researcher.");
      if (agree.checks[1] || agree.ai[1]) lim.push("Some confirmed scores began as automated suggestions. The suggestions are heuristics, and the scores remain the researcher's judgement.");
      if (second.length) lim.push("The second-model assessments are themselves AI outputs, with the same risks. They are not an independent validation of the analysis.");
      if (confirmedOutputs && Object.keys(evaluators).length < 2) lim.push("The outputs were evaluated by a single evaluator. No independent evaluation by another researcher is documented.");
    }
    out.push(list(lim.filter(Boolean).map(esc)));

    if (convs.length) out.push(conversationSection(convs, L));

    // ---- Appendix A. Research prompts ----
    out.push("<h2>Appendix A. Research prompts</h2>");
    out.push(p("Each prompt is reproduced verbatim, with its line breaks, headings, numbered procedure and output specification." + (st.sources ? "" : " Source text is summarised; include it in full with the option in the report settings.")));
    var srcNote = { copied: "the exact prompt copied from the Lab and recorded with the run", "copied-design-changed": "the exact prompt copied from the Lab and recorded with the run (the research design was changed afterwards)", rebuilt: "the prompt the research design produced when the output was logged; the exact prompt used is not confirmed" };
    prompts.forEach(function (pr) {
      out.push("<h3>" + pr.id + ": " + esc(A.condName(pr.cond)) + "</h3>");
      var meta = [["Prompt identifier", pr.id], ["Research condition", esc(A.condName(pr.cond))], ["Associated output records", pr.outputs.join(", ")],
        ["Status", Object.keys(pr.sources).map(function (k) { return esc(srcNote[k] || srcNote.rebuilt) + (Object.keys(pr.sources).length > 1 ? " (" + plural(pr.sources[k], "output") + ")" : ""); }).join("; ")]];
      if (pr.copied.length) meta.push(["Copied on", range(pr.copied.sort())]);
      if (Object.keys(pr.versions).length) meta.push(["Scholarly Prompt Lab version", esc(Object.keys(pr.versions).join(", "))]);
      out.push(table(["Field", "Value"], meta));
      out.push("<pre>" + esc(stripSources(pr.text, st.sources)) + "</pre>");
    });
    var designed = document.getElementById("prompt").textContent;
    if (!prompts.some(function (pr) { return pr.text === designed; }))
      out.push("<h3>" + (prompts.length ? "Prompt as currently designed" : "Prompt as designed") + "</h3>" + p(prompts.length ? "The current research design produces this prompt, which differs from the prompts recorded with the documented runs above. It is not linked to any documented run." : "No run is documented. This is the prompt the research design produces.") + "<pre>" + esc(stripSources(designed, st.sources)) + "</pre>");

    // ---- Appendix B. AI output records ----
    out.push("<h2>Appendix B. AI output records</h2>");
    if (!n) out.push(p("Not undertaken: no AI outputs are documented for this study."));
    else {
      out.push(table(["Record", "Date of use", "AI system and version", "Interface and settings", "Condition", "Run", "Prompt", "Lab version"], entries.map(function (e) {
        return [bId[e.id], e.date ? niceDate(e.date) : gap("date of use"), (e.model || "").trim() ? esc(e.model) : gap("AI system and version"), (e.settings || "").trim() ? esc(e.settings) : gap("interface and settings"), esc(A.condName(e.condition)), String(e.run), promptOf[e.id], esc(e.labVersion || "–")];
      })));
      entries.forEach(function (e) { out.push("<h3>" + bId[e.id] + ". Output</h3><pre>" + esc(e.output) + "</pre>"); });
    }

    // ---- Appendix C. Identified errors and researcher decisions ----
    out.push("<h2>Appendix C. Identified errors and researcher decisions</h2>");
    if (!n) out.push(p("Not undertaken: no AI outputs are documented for this study."));
    entries.forEach(function (e) {
      out.push("<h3>" + bId[e.id] + ". " + ((e.model || "").trim() ? esc(e.model) : "AI system not recorded") + (e.date ? ", " + niceDate(e.date) : "") + "</h3>");
      var rows = [];
      rows.push(["Quotation matching", e.checks && e.checks.sourceWords ? e.checks.quotations + " quotations: " + e.checks.exact + " exact, " + e.checks.near + " differing in wording, " + (e.checks.missing + (e.checks.termsMissing || 0)) + " not found" : noSources ? "Not applicable" : "Not recorded"]);
      rows.push(["Decision", e.use ? esc(USE_LABEL[e.use]) : gap("decision on this output")]);
      if ((e.useNote || "").trim()) rows.push(["Revisions and reasons for rejection", esc(e.useNote)]);
      if (e.sycophancy) rows.push(["Framing", "Uncritical adoption of the researcher's framing recorded"]);
      out.push(table(["Item", "Record"], rows));
      out.push(p("<strong>Identified errors, as reviewed by the researcher:</strong>") + ((e.errors || "").trim() ? "<pre>" + esc(e.errors) + "</pre>" : p("None recorded.")));
    });

    // ---- Appendix D. References ----
    out.push("<h2>Appendix D. References</h2>");
    var refs = {}, flagged = false;
    th.forEach(function (t) { (t.works || []).forEach(function (w) { if (w.v > 1) flagged = true; refs[A.harvard(w) + (w.v > 1 ? " †" : "")] = 1; }); });
    refs[cit.text] = 1;
    out.push(list(Object.keys(refs).sort(function (a, b) { return a.localeCompare(b); }).map(ital)));
    if (!cit.versionSpecific) out.push(p("No version-specific DOI is recorded in the release metadata for version " + esc(REL.version) + ", so the DOI given resolves to all versions of the software."));
    if (flagged) out.push(p("† This reference could not be fully confirmed in library catalogues (usually the year of this edition). Check it against your own copy."));
    if (th.some(function (t) { return t.works && t.works.length; })) out.push(p("References to theoretical frameworks come from the Lab's theory library. Check editions and page numbers against your own copies before publication."));

    // ---- Appendix E. CONTEXT framework assessment ----
    out.push("<h2>Appendix E. CONTEXT framework assessment</h2>");
    out.push(p("Statuses: <strong>Not addressed</strong>, the dimension has not been addressed in the research design; <strong>Specified</strong>, it has been addressed in the prompt or research design; <strong>Documented</strong>, relevant methodological activities have been recorded; <strong>Not applicable</strong>, the researcher has provided a methodological justification for its exclusion."));
    out.push(table(["Dimension", "Status", "Basis in the records"], ctx.map(function (c) { return [esc(c.label), esc(c.status), esc(c.basis)]; })));
    out.push(p("The assessment reports what is specified and recorded. It does not certify the quality or validity of the research."));

    // ---- Appendix F. Prompt-sensitivity analysis ----
    if (compared) {
      out.push("<h2>Appendix F. Prompt-sensitivity analysis</h2>");
      out.push(p("Results by prompt condition and AI system. Means use researcher-confirmed scores only, on a scale of 1 to 5. With few runs, differences may reflect variation between runs rather than the prompt or the AI system."));
      var condOrder = function (id) { var c = A.CONDITIONS.filter(function (x) { return x.id === id; })[0]; return c ? c.n : 9; };
      out.push(table(["Condition", "AI system", "Runs", "Quotations: exact / differing / not found"].concat(L.criteria.map(function (c) { return c.label; })), Object.keys(cells).sort(function (a, b) { var x = a.split("\u0000"), y = b.split("\u0000"); return condOrder(x[0]) - condOrder(y[0]) || x[1].localeCompare(y[1]); }).map(function (k) {
        var parts = k.split("\u0000"), es = entries.filter(function (e) { return e.condition === parts[0] && ((e.model || "").trim() || "(AI system not recorded)") === parts[1]; });
        var ck = es.filter(function (e) { return e.checks && e.checks.sourceWords; });
        var q = ck.length ? [0, 0, 0] : null;
        ck.forEach(function (e) { q[0] += e.checks.exact; q[1] += e.checks.near; q[2] += e.checks.missing + (e.checks.termsMissing || 0); });
        return [esc(A.condName(parts[0])), esc(parts[1]), String(es.length), q ? q.join(" / ") : "Not recorded"].concat(L.criteria.map(function (c) {
          var v = es.filter(function (e) { return conf(e, c.id); }).map(function (e) { return parseInt(e.scores[c.id], 10); });
          return v.length ? (v.reduce(function (a, b) { return a + b; }, 0) / v.length).toFixed(1) + " (" + v.length + ")" : "–";
        }));
      })));
    }

    if (compared && repeats >= 2) {
      out.push(p("Individual runs, so that variation between repeated runs can be examined:"));
      out.push(table(["Record", "Condition", "AI system", "Run", "Quotations: exact / differing / not found", "Researcher-confirmed scores"], entries.map(function (e) {
        var sc = L.criteria.filter(function (c) { return conf(e, c.id); }).map(function (c) { return c.label + " " + e.scores[c.id]; });
        return [bId[e.id], esc(A.condName(e.condition)), (e.model || "").trim() ? esc(e.model) : "Not recorded", String(e.run),
          e.checks && e.checks.sourceWords ? e.checks.exact + " / " + e.checks.near + " / " + (e.checks.missing + (e.checks.termsMissing || 0)) : "Not recorded", sc.length ? esc(sc.join("; ")) : "None"];
      })));
    }

    // ---- Appendix G. Evaluation criteria and scoring records ----
    var scored = entries.filter(function (e) { return L.criteria.some(function (c) { return e.scores[c.id] || (e.suggested && e.suggested[c.id]); }) || e.secondModel; });
    if (scored.length) {
      out.push("<h2>Appendix G. Evaluation criteria and scoring records</h2>");
      out.push(table(["Criterion", "Definition", "1", "3", "5"], L.criteria.map(function (c) { return [esc(c.label), esc(c.help), esc(c.rubric[0]), esc(c.rubric[1]), esc(c.rubric[2])]; })));
      scored.forEach(function (e) {
        out.push("<h3>" + bId[e.id] + ". Scores</h3>");
        out.push(table(["Criterion", "Suggested by checks", "Suggested by second model", "Researcher score", "Status"], L.criteria.map(function (c) {
          var sg = (e.suggested && e.suggested[c.id]) || {};
          var fin = e.scores[c.id], stt = e.scoreStatus ? e.scoreStatus[c.id] : "";
          var differs = conf(e, c.id) && [sg.checks, sg.ai].some(function (x) { return x && x.score != null && String(x.score) !== String(fin); });
          return [esc(c.label), sg.checks && sg.checks.score != null ? String(sg.checks.score) : "–", sg.ai && sg.ai.score != null ? String(sg.ai.score) : "–", fin ? esc(fin) : "–",
            !fin ? "Not scored" : conf(e, c.id) ? (stt === "manual" ? "Researcher's own score" : "Confirmed by the researcher") + (differs ? "; differs from the suggestion" : "") : "Suggested, not confirmed"];
        })));
        if (e.secondModel) out.push(p("Second-model assessment" + (e.secondModel.model ? " by " + esc(e.secondModel.model) : "") + (e.secondModel.overall ? ": “" + esc(e.secondModel.overall) + "”" : ".") + " This is an AI-generated suggestion, not independent validation."));
        if ((e.notes || "").trim()) out.push(p("<strong>Evaluation notes and disagreements:</strong> " + esc(e.notes)));
        if ((e.evaluator || "").trim()) out.push(p("<strong>Evaluator:</strong> " + esc(e.evaluator)));
      });
    }
    if (convs.length) out.push(conversationAppendix(convs, L));
    return out.join("\n");
  }

  /* ---------- research conversations: section 2.8 and Appendix H ---------- */
  var PR = window.LAB_PROTOCOL;
  // what the provenance of a value allows the report to say, and no more
  function provPhrase(a) {
    if (!a) return "not recorded";
    var pv = a.provenance || {}, v = pv.verification;
    var who = { ai_reported: "reported by the AI system", researcher_reported: "recorded by the researcher", provider_recorded: "recorded in the provider's data", official_documentation: "taken from the provider's documentation", system_recorded: "recorded by Scholarly Prompt Lab", unknown: "of unknown origin" }[pv.origin] || "of unknown origin";
    var chk = v === "researcher_confirmed" ? (pv.origin === "researcher_reported" ? "" : " and confirmed by the researcher") : v === "compared_with_original" ? " and compared with the original record" : v === "disputed" ? "; disputed" : pv.origin === "ai_reported" ? " and not confirmed by the researcher" : "";
    return who + chk;
  }
  function fieldValue(c, id) {
    var f = c.metadata[id], a = f ? PR.currentAssertion(f) : null;
    if (!a) return { text: "not recorded", a: null };
    var t = a.status === "known" || a.status === "confirmation_required" ? "“" + esc(a.value) + "”" : a.status === "not_exposed" ? "not exposed by the provider" : a.status === "not_applicable" ? "not applicable" : "not established";
    return { text: t, a: a };
  }
  function covSentence(c) {
    var cov = PR.coverage(c), k = PR.counts(c);
    if (cov.status === "complete") return "The researcher confirmed that the record is complete" + (cov.basis === "compared_with_original" ? ", after it was compared with the original conversation." : cov.basis === "provider_export" ? ", from the provider's data export." : ".");
    if (cov.status === "partial") return "The record is incomplete: " + plural(k.gaps, "gap") + " " + (k.gaps === 1 ? "is" : "are") + " recorded" + (cov.prompts_missing != null ? ", with " + plural(cov.prompts_missing, "researcher prompt") + " and " + plural(cov.responses_missing, "AI response") + " missing" : ", and the number of missing turns is not known") + ".";
    return cov.basis === "ai_reported" ? "Only a record written by the AI system is available; its completeness has not been established against the original conversation." : "Its completeness has not been confirmed.";
  }
  // a precise statement about unavailable settings, made only when the records say so
  function unavailableSentence(c) {
    var gone = ["temperature", "top_p", "max_output", "reasoning_mode"].filter(function (k) { var a = PR.currentAssertion(c.metadata[k]); return a && a.status === "not_exposed"; });
    if (!gone.length) return "";
    var names = { temperature: "the temperature", top_p: "top-p", max_output: "the maximum output setting", reasoning_mode: "the reasoning mode" };
    var env = PR.environmentOf(c.metadata);
    return " " + joinAnd(gone.map(function (k) { return names[k]; })).replace(/^./, function (x) { return x.toUpperCase(); }) + (gone.length === 1 ? " was" : " were") + " unavailable" + (env === "consumer" ? " through the consumer AI application" : env === "api" ? " through the API" : "") + ".";
  }
  // what the conversation records document, for the CONTEXT assessment
  function conversationFacts(convs) {
    var f = { n: convs.length, theory: 0, procedure: 0, context: 0, theoryChanges: 0, instructionChanges: 0, contextCorrections: 0, checked: 0, evidence: 0, scored: 0, observations: 0, compared: 0, preserved: 0 };
    var groups = {};
    convs.forEach(function (c) {
      var path = PR.activePath(c), first = path.filter(function (t) { return t.role === "researcher"; })[0], txt = first ? first.text : c.prompt || "";
      if (/THEORETICAL ORIENTATION:/.test(txt)) f.theory++;
      if (/\nPROCEDURE:\n/.test(txt)) f.procedure++;
      if (/CULTURAL, LINGUISTIC AND HISTORICAL CONTEXT:|CONTESTED TERMINOLOGY:/.test(txt)) f.context++;
      path.forEach(function (t) {
        var fl = t.flags || {};
        if (fl.theory && fl.theory.on) f.theoryChanges++;
        if (fl.instruction && fl.instruction.on) f.instructionChanges++;
        if (fl.evidence && fl.evidence.on) f.evidence++;
        if (t.classification.some(function (x) { return x.category === "contextual_correction" && x.status !== "suggested"; })) f.contextCorrections++;
        if (t.evaluation && t.evaluation.checks) f.checked++;
        if (t.role === "ai" && t.evaluation && Object.keys(t.evaluation.scores).length) f.scored++;
      });
      f.observations += c.observations.length;
      if (c.group) groups[c.group] = (groups[c.group] || 0) + 1;
      var prompts = path.filter(function (t) { return t.role === "researcher"; });
      if (prompts.length && prompts.every(function (t) { return t.text_status === "original" || t.text_status === "researcher_corrected" || t.provenance.verification !== "unreviewed"; }) && P_ok(c)) f.preserved++;
    });
    Object.keys(groups).forEach(function (g) { if (groups[g] > 1) f.compared += groups[g]; });
    return f;
  }
  function P_ok(c) { return !c.gaps.some(function (g) { return !g.resolved; }); }
  // a quotation closes the sentence when it already ends in a full stop
  function endq(t) { t = String(t).trim(); return "“" + esc(t) + "”" + (/[.!?]$/.test(t) ? "" : "."); }
  function conversationSection(convs, L) {
    var o = ["<h3>2.8 Conversational research</h3>"];
    var k = convs.map(function (c) { return PR.counts(c); });
    var sum = function (f) { return k.reduce(function (m, x) { return m + x[f]; }, 0); };
    var purposes = convs.filter(function (c) { return (c.purpose || "").trim(); });
    o.push(p("The study documents " + plural(convs.length, "research conversation") + " with generative AI systems, in which the researcher's follow-up prompts form part of the research instrument. Across them the records hold " + plural(sum("researcher_prompts"), "researcher prompt") + ", " + plural(sum("ai_responses"), "AI response") + " and " + plural(sum("administrative"), "administrative message") + ", counted separately, " + plural(sum("turns"), "recorded turn") + " in all" + (sum("branches") > convs.length ? " across " + sum("branches") + " branches (regenerated responses and edited prompts)" : "") + ", and " + plural(sum("gaps"), "recorded gap") + ". Each conversation is reproduced in Appendix H."));
    o.push(p(purposes.length ? "Purpose of the conversational research, as recorded by the researcher: " + purposes.map(function (c) { return convs.length > 1 ? "“" + esc(c.purpose.trim()) + "” (H" + (convs.indexOf(c) + 1) + ")" : endq(c.purpose); }).join("; ") + (convs.length > 1 ? "." : "") : gap("why the research was conducted as a conversation")));
    o.push(table(["Record", "Conversation", "AI provider, product and model", "Session dates", "Prompts", "Responses", "Gaps", "Coverage"], convs.map(function (c, i) {
      var pv = fieldValue(c, "ai_provider"), pd = fieldValue(c, "ai_product"), mod = fieldValue(c, "model_name"), s0 = fieldValue(c, "session_start"), s1 = fieldValue(c, "session_end"), kk = k[i];
      return ["H" + (i + 1), esc(c.title), [pv.a ? pv.text : "", pd.a ? pd.text : "", "model " + mod.text].filter(Boolean).join("; "), s0.a ? s0.text + (s1.a ? " to " + s1.text : "") : gap("session dates"), String(kk.researcher_prompts), String(kk.ai_responses), String(kk.gaps), esc(PR.COVERAGE_LABELS[PR.coverage(c).status])];
    })));
    convs.forEach(function (c, i) {
      var settings = ["reasoning_mode", "temperature", "top_p", "web_browsing", "memory"].map(function (f) { var v = fieldValue(c, f); return v.a && (v.a.status === "known" || v.a.status === "confirmation_required") ? PR.FIELDS.filter(function (x) { return x.id === f; })[0].label.toLowerCase() + " " + v.text : ""; }).filter(Boolean);
      o.push(p("<strong>H" + (i + 1) + ".</strong> " + esc(PR.modelIdentification(c.metadata)) + esc(unavailableSentence(c)) + (settings.length ? " Recorded settings: " + settings.join("; ") + "." : "") + " " + covSentence(c) +
        (fieldValue(c, "model_name").a ? "" : " " + gap("model as shown in the application"))));
    });
    // protocol use, and the reviews it asks for: what was intended is kept apart from what the records show
    var withP = convs.filter(function (c) { return c.protocolVersion; });
    if (withP.length) {
      var versions = {}; withP.forEach(function (c) { versions[c.protocolVersion] = 1; });
      var rv = { opening: 0, intermediate: 0, closing: 0 };
      withP.forEach(function (c) { var seen = {}; PR.detectReviews(c).forEach(function (r) { if (!seen[r.type]) { rv[r.type]++; seen[r.type] = 1; } }); });
      o.push(p(plural(withP.length, "conversation") + (withP.length === convs.length ? "" : " of " + convs.length) + " began with the SPL Research Session Protocol (version " + esc(Object.keys(versions).join(", ")) + "), which asks the AI system to keep to the research design, to report only what it can establish about itself, and to produce structured records on request. The protocol is a draft whose reliability has not been validated, and its instructions and reminders may have influenced the conversations. In the recorded turns, the AI system's opening metadata review appears in " + (rv.opening ? plural(rv.opening, "conversation") : "none") + ", a checkpoint reminder in " + (rv.intermediate || "none") + ", and the closing review in " + (rv.closing || "none") + "." +
        (withP.length < convs.length ? " " + plural(convs.length - withP.length, "conversation") + " " + (convs.length - withP.length === 1 ? "was" : "were") + " recorded without the protocol." : "")));
    } else o.push(p("The conversations were recorded without the SPL Research Session Protocol."));
    // where the records came from, and what was checked
    var orig = 0, aiOnly = 0, rec = 0, disc = { ai_differs: 0, ai_omitted: 0, ai_only: 0 }, ck = 0, prov = 0, filled = 0;
    convs.forEach(function (c) {
      c.turns.forEach(function (t) { if (t.text_status === "original" || t.text_status === "researcher_corrected") orig++; else if (t.text_status === "reconstructed") rec++; else if (t.provenance.verification === "unreviewed") aiOnly++; });
      c.discrepancies.forEach(function (d) { if (disc[d.status] !== undefined) disc[d.status]++; });
      ck += (c.checkpoints || []).length; if (c.fromProviderExport) prov++;
      filled += c.gaps.filter(function (g) { return g.resolved && g.reported_by !== "researcher"; }).length;
    });
    var parts = [plural(orig, "turn") + " " + (orig === 1 ? "is" : "are") + " taken from the original conversations" + (prov ? " (" + plural(prov, "conversation") + " from the provider's data export)" : "")];
    if (aiOnly) parts.push(plural(aiOnly, "turn") + " " + (aiOnly === 1 ? "is" : "are") + " known only from records written by the AI system and " + (aiOnly === 1 ? "has" : "have") + " not been verified against the original");
    if (rec) parts.push(plural(rec, "turn") + " " + (rec === 1 ? "is" : "are") + " marked as reconstructed, not exact");
    o.push(p("Of the recorded turns, " + parts.join("; ") + "." + (ck ? " " + plural(ck, "AI-generated checkpoint or session record") + " " + (ck === 1 ? "was" : "were") + " imported." : "") +
      (disc.ai_differs + disc.ai_omitted + disc.ai_only ? " Comparing the AI-generated records with the original conversations found " + [disc.ai_differs ? plural(disc.ai_differs, "turn") + " reproduced with different wording" : "", disc.ai_omitted ? plural(disc.ai_omitted, "turn") + " left out" : "", disc.ai_only ? plural(disc.ai_only, "turn") + " not present in the original" : ""].filter(Boolean).join(", ") + ". The original wording is used throughout." : "") +
      (filled ? " " + plural(filled, "gap") + " in the AI-generated records " + (filled === 1 ? "was" : "were") + " later filled from another record." : "")));
    // the researcher's interventions: purposes, changes of instruction or theory, evidence introduced, errors and corrections
    var cats = {}, follow = 0, classified = 0, fl = {}, designed = 0, designedChanged = 0;
    convs.forEach(function (c) {
      var path = PR.activePath(c), rs = path.filter(function (t) { return t.role === "researcher" && t.kind !== "administrative"; }).slice(1);
      follow += rs.length;
      rs.forEach(function (t) { var mine = t.classification.filter(function (x) { return x.status !== "suggested"; }); if (mine.length) classified++; mine.forEach(function (x) { var lb = PR.labelOf(x.category) + (x.note ? " (" + x.note + ")" : ""); cats[lb] = (cats[lb] || 0) + 1; }); });
      path.forEach(function (t) { Object.keys(t.flags || {}).forEach(function (f) { if (t.flags[f] && t.flags[f].on) fl[f] = (fl[f] || 0) + 1; }); if (t.designedId) { designed++; var d = c.designedPrompts.filter(function (x) { return x.id === t.designedId; })[0]; if (d && PR.normaliseText(d.text) !== PR.normaliseText(t.text)) designedChanged++; } });
    });
    if (follow) o.push(p("The researcher classified " + classified + " of " + plural(follow, "follow-up prompt") + " by purpose, using the Lab's follow-up taxonomy (version " + esc(PR.TAXONOMY_VERSION) + "; a prompt may have several purposes)" +
      (classified ? ": " + Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; }).map(function (x) { return esc(x.charAt(0).toLowerCase() + x.slice(1)) + " (" + cats[x] + ")"; }).join(", ") + "." : ".") + (classified < follow ? " " + gap("purpose of the remaining follow-up prompts, if relevant") : "") +
      (designed ? " " + plural(designed, "follow-up prompt") + " " + (designed === 1 ? "was" : "were") + " designed with the Lab's follow-up builder" + (designedChanged ? ", of which " + designedChanged + " " + (designedChanged === 1 ? "was" : "were") + " changed before submission; both wordings are kept" : " and submitted unchanged") + "." : "")));
    var flagText = [["evidence", "turn introducing additional evidence or source material", "turns introducing additional evidence or source material"], ["instruction", "change to the analytical instructions", "changes to the analytical instructions"], ["theory", "change of theoretical orientation", "changes of theoretical orientation"], ["scope", "change of analytical scope", "changes of analytical scope"], ["error", "response in which an error was identified", "responses in which an error was identified"], ["correction", "researcher correction", "researcher corrections"]].filter(function (f) { return fl[f[0]]; }).map(function (f) { return plural(fl[f[0]], f[1], f[2]); });
    var pers = convs.reduce(function (m, c) { return m + PR.persistentErrors(c).length; }, 0);
    if (flagText.length || pers) o.push(p("The researcher recorded " + joinAnd(flagText) + (pers ? (flagText.length ? "; " : "") + plural(pers, "recurrence") + " of an earlier error" : "") + ". These are listed by turn in Appendix H."));
    // researcher evaluation of responses
    var scored = 0, na = {}, vals = {};
    convs.forEach(function (c) { PR.activePath(c).forEach(function (t) {
      if (t.role !== "ai" || (t.kind === "administrative" && !c.scoreAdmin) || !t.evaluation) return;
      var e = t.evaluation; if (Object.keys(e.scores).length) scored++;
      Object.keys(e.scores).forEach(function (id) { (vals[id] = vals[id] || []).push(parseInt(e.scores[id], 10)); });
      Object.keys(e.na).forEach(function (id) { na[id] = (na[id] || 0) + 1; });
    }); });
    if (scored) {
      o.push(p("The researcher scored " + plural(scored, "AI response") + " in the conversations on the six criteria, from 1 (poor) to 5 (strong). These scores are reported separately from those for single outputs. A criterion marked not applicable is not a score and is not averaged; the reasons are given in Appendix H." + (convs.some(function (c) { return c.scoreAdmin; }) ? " Administrative messages were included in scoring for at least one conversation, at the researcher's choice." : "")));
      o.push(table(["Criterion", "Responses scored", "Mean", "Range", "Not applicable"], L.criteria.map(function (c) {
        var v = vals[c.id] || [];
        return [esc(c.label), String(v.length), v.length ? (v.reduce(function (a, b) { return a + b; }, 0) / v.length).toFixed(1) : "–", v.length ? (Math.min.apply(null, v) === Math.max.apply(null, v) ? String(v[0]) : Math.min.apply(null, v) + "–" + Math.max.apply(null, v)) : "–", String(na[c.id] || 0)];
      })));
    } else o.push(p(gap("researcher evaluation of the AI responses in the conversations, if part of the design")));
    // conversation-level observations, claims and decisions
    var obs = convs.reduce(function (m, c) { return m + c.observations.length; }, 0), cl = convs.reduce(function (m, c) { return m + c.claims.filter(function (x) { return x.status !== "suggested"; }).length; }, 0);
    var dec = convs.reduce(function (m, c) { return m.concat(c.decisions.filter(function (d) { return d.status === "explicit" || d.status === "recorded"; })); }, []);
    if (obs) {
      var oc = {}; convs.forEach(function (c) { c.observations.forEach(function (x) { oc[x.category] = (oc[x.category] || 0) + 1; }); });
      o.push(p("The researcher recorded " + plural(obs, "conversation-level observation") + " (" + PR.OBSERVATION_CATEGORIES.filter(function (x) { return oc[x.id]; }).map(function (x) { return x.label.toLowerCase() + " " + oc[x.id]; }).join(", ") + "). These are qualitative observations, not measures; the categories have not been validated as instruments, and an observed sequence of turns is not presented as a cause."));
    }
    if (cl) o.push(p("Claim histories trace " + plural(cl, "claim") + " through the conversations (Appendix H). They record the order in which claims were challenged, supported, qualified or withdrawn; they do not establish that a later formulation is an improvement or that it was caused by a particular prompt."));
    if (dec.length) o.push(p("Decisions the researcher recorded about the use of AI-generated interpretations: " + dec.map(function (d) { return "“" + esc(d.text) + "”" + (d.turn_id ? " (" + esc(d.turn_id) + ")" : ""); }).join("; ") + "."));
    var finals = convs.filter(function (c) { return (c.finalInterpretation || "").trim(); });
    if (finals.length) o.push(p("The researcher's final interpretation" + (finals.length > 1 ? "s" : "") + ", in their own words: " + finals.map(function (c) { return convs.length > 1 ? "“" + esc(c.finalInterpretation.trim()) + "” (H" + (convs.indexOf(c) + 1) + ")" : endq(c.finalInterpretation); }).join("; ") + (convs.length > 1 ? "." : "")));
    // comparison across conversations in the same group
    var groups = {}; convs.forEach(function (c) { if (c.group) (groups[c.group] = groups[c.group] || []).push(c); });
    Object.keys(groups).filter(function (g) { return groups[g].length > 1; }).forEach(function (g) {
      var cmp = PR.compareConversations(groups[g], L.criteria), diffs = cmp.conditions.concat(cmp.meta).filter(function (r) { return r.differs; }).map(function (r) { return r.label.toLowerCase(); });
      o.push(p("Comparison group “" + esc(g) + "”: " + plural(groups[g].length, "conversation") + " (" + groups[g].map(function (c) { return "H" + (convs.indexOf(c) + 1); }).join(", ") + ") were compared" + (diffs.length ? "; they differ in " + esc(joinAnd(diffs)) : "") + ". " + esc(cmp.warnings.join(" ")) + " Differences in scores between the conversations are not presented as effects of the conditions."));
    });
    var lim = ["The records describe the conversations as conducted with the recorded systems; the same follow-up prompts may produce different responses on another occasion or system.", "The researcher's interventions may themselves have shaped the AI-generated interpretations; a later response following an intervention is not evidence that the intervention caused it."];
    if (withP.length) lim.push("The SPL Research Session Protocol adds instructions, metadata reviews and reminders to the conversation, so the conversations it documents may differ from conversations held without it. An initial prompt cannot guarantee continued adherence to its instructions.");
    if (convs.some(function (c) { return Object.keys(c.metadata).some(function (kk) { var a = PR.currentAssertion(c.metadata[kk]); return a && a.provenance.origin === "ai_reported" && a.provenance.verification === "unreviewed"; }); }))
      lim.push("Some details about the AI systems were reported by the AI systems themselves and were not confirmed by the researcher; AI systems often do not know their exact version or the date. A researcher's confirmation is itself not independent verification.");
    if (aiOnly) lim.push("Turns known only from AI-generated records may differ from what was actually said.");
    if (convs.some(function (c) { return PR.coverage(c).status !== "complete"; })) lim.push("The completeness of " + (convs.length === 1 ? "the conversation record" : "some conversation records") + " has not been established.");
    if (!convs.some(function (c) { return PR.counts(c).branches > 1; })) lim.push("No regenerated responses or edited prompts are recorded; if the conversations contained them, they are not represented.");
    lim.push("The absence of a recorded error does not establish that a response is accurate, and agreement between AI systems does not establish that an interpretation is valid. Content fingerprints show that stored text has not changed since it was recorded, not that it was authentic.");
    o.push(p("<strong>Limitations specific to the conversations:</strong>") + list(lim.map(esc)));
    return o.join("\n");
  }
  function turnLine(c, t, pos) {
    var bits = [t.role === "ai" ? "AI response" : "Researcher prompt"];
    if (t.kind === "administrative") bits.push("administrative");
    bits.push(PR.TEXT_STATUSES[t.text_status].charAt(0).toLowerCase() + PR.TEXT_STATUSES[t.text_status].slice(1));
    if (t.provenance.verification !== "unreviewed") bits.push(PR.VERIFICATIONS[t.provenance.verification].toLowerCase());
    if (t.timestamp) bits.push(t.timestamp);
    if (t.model && t.model.value) bits.push("model " + t.model.value);
    if (t.regenerated_from) bits.push("regenerated response (another version of " + t.regenerated_from + ")");
    if (t.edited_from) bits.push("edited prompt (revising " + t.edited_from + ")");
    var mine = t.classification.filter(function (x) { return x.status !== "suggested"; });
    if (mine.length) bits.push("purpose: " + mine.map(function (x) { return PR.labelOf(x.category).toLowerCase() + (x.note ? " (" + x.note + ")" : ""); }).join(", "));
    Object.keys(t.flags || {}).forEach(function (f) { if (t.flags[f] && t.flags[f].on) bits.push(PR.FLAG_LABELS[f].toLowerCase() + (t.flags[f].note ? ": " + t.flags[f].note : "") + (t.flags[f].ref ? " (same as " + t.flags[f].ref + ")" : "")); });
    if (t.designedId) bits.push("designed in the Lab as " + t.designedId);
    return "<p><strong>" + esc(t.turn_id) + "</strong>" + (pos && parseInt(t.turn_id.slice(1), 10) !== pos ? " (turn " + pos + " in the conversation)" : "") + (!pos ? " (follows " + esc(t.parent_id || "the start") + ")" : "") + " · " + esc(bits.join(" · ")) + "</p>";
  }
  function conversationAppendix(convs, L) {
    var o = ["<h2>Appendix H. Conversational research records</h2>"];
    o.push(p("Each conversation is reproduced with its metadata and every recorded turn, in order, with stable turn identifiers. For each value, the table gives where it came from and whether it was checked. Text status: <strong>original</strong>, taken from the conversation itself; <strong>reproduced by the AI, unverified</strong>, known only from a record the AI system wrote; <strong>reconstructed</strong>, not exact; <strong>corrected by the researcher</strong>, original wording with a recorded correction. Administrative messages are the SPL commands and the AI system's replies to them. Where a conversation branched, the branch the researcher selected is given first and the other branches follow."));
    convs.forEach(function (c, i) {
      var k = PR.counts(c), cov = PR.coverage(c), path = PR.activePath(c);
      o.push("<h3>H" + (i + 1) + ". " + esc(c.title) + "</h3>");
      var rows = [["Session identifier", esc(c.sessionId || "None"), "Recorded by Scholarly Prompt Lab", "–"], ["Protocol", c.protocolVersion ? "SPL Research Session Protocol " + esc(c.protocolVersion) + (c.reminders ? (c.reminders === "off" ? ", no reminders" : ", reminders about every " + esc(c.reminders) + " messages") : "") : "Not used", "Recorded by Scholarly Prompt Lab", "–"]];
      if (c.sourceSha256) rows.push(["Source text (SHA-256)", "<code>" + esc(c.sourceSha256) + "</code>", "Recorded by Scholarly Prompt Lab", "–"]);
      PR.FIELDS.forEach(function (f) {
        var fl = c.metadata[f.id], a = fl ? PR.currentAssertion(fl) : null;
        if (!a && !PR.isRequired(f, c)) return;
        rows.push([esc(f.label), a ? (a.status === "known" || a.status === "confirmation_required" ? esc(a.value) : esc(PR.STATUSES[a.status])) + (a.reason && a.provenance.origin === "researcher_reported" && a.status !== "known" ? " (" + esc(a.reason) + ")" : "") : gap(f.label.toLowerCase()), a ? esc(PR.ORIGINS[a.provenance.origin]) : "–",
          a ? esc(PR.VERIFICATIONS[a.provenance.verification]) + (PR.fieldConflict(fl) ? "; sources disagree" : "") + (fl.resolution ? "; resolved by the researcher: " + esc(fl.resolution.reason) : "") + (fl.assertions.length > 1 ? "; " + plural(fl.assertions.length - 1, "earlier value") + " kept" : "") : "–"]);
      });
      o.push(table(["Item", "Value", "Origin", "Verification"], rows));
      o.push(p(plural(k.researcher_prompts, "researcher prompt") + ", " + plural(k.ai_responses, "AI response") + ", " + plural(k.administrative, "administrative message") + ", " + plural(k.gaps, "gap") + (k.branches > 1 ? ", " + k.branches + " branches" : "") + ". Coverage: " + esc(PR.COVERAGE_LABELS[cov.status]) + ". " + covSentence(c) +
        ((c.checkpoints || []).length ? " Imported AI-generated records: " + c.checkpoints.map(function (x) { return esc(x.id) + " (" + (x.record_type === "completed_session" ? "completed session" : "checkpoint") + ", turns " + esc(x.firstTurn || "?") + " to " + esc(x.lastTurn || "?") + ")"; }).join("; ") + "." : "")));
      var chars = c.turns.reduce(function (m, t) { return m + t.text.length; }, 0);
      var long = c.turns.length > 60 || chars > 120000;
      if (long) o.push(p("This conversation is long, so the researcher prompts are reproduced here and the AI responses are listed by identifier. The complete transcript, with every response and the same turn identifiers, is exported separately from the Lab (Log &amp; evaluate, Conversation, Export, Transcript)."));
      var gapP = function (g) { return '<p class="note">' + (g.resolved ? "Gap, since filled: " : "Gap: ") + esc({ researcher_prompt: "a researcher prompt is missing", ai_response: "an AI response is missing", both: "a prompt and its response are missing", unknown: "something is missing" }[g.missing]) + (g.reason ? " (" + esc(g.reason) + ")" : "") + ".</p>"; };
      var turnBlock = function (t, pos) {
        o.push(turnLine(c, t, pos) + (long && t.role === "ai" ? "" : "<pre>" + esc(t.text) + "</pre>"));
        if (t.evaluation && (Object.keys(t.evaluation.scores).length || Object.keys(t.evaluation.na).length)) {
          var sc = L.criteria.filter(function (cr) { return t.evaluation.scores[cr.id]; }).map(function (cr) { return esc(cr.label) + " " + esc(t.evaluation.scores[cr.id]); });
          var nas = L.criteria.filter(function (cr) { return t.evaluation.na[cr.id]; }).map(function (cr) { return esc(cr.label) + " not applicable (" + esc(t.evaluation.na[cr.id]) + ")"; });
          o.push(p("<em>Researcher scores:</em> " + sc.concat(nas).join("; ") + (t.evaluation.evaluator ? ". Evaluator: " + esc(t.evaluation.evaluator) : "") + "." + (t.evaluation.notes ? " " + esc(t.evaluation.notes) : "")));
        }
        var sg = t.evaluation && (t.evaluation.checks || t.evaluation.second);
        if (sg) o.push(p("<em>Suggestions, not counted as scores:</em> " + [t.evaluation.checks ? "automatic quotation checks: " + esc(t.evaluation.checks.summary) : "", t.evaluation.second ? "second-model assessment" + (t.evaluation.second.model ? " by " + esc(t.evaluation.second.model) : "") + ": " + L.criteria.filter(function (cr) { return t.evaluation.second.scores[cr.id] && t.evaluation.second.scores[cr.id].score != null; }).map(function (cr) { return esc(cr.label) + " " + t.evaluation.second.scores[cr.id].score; }).join("; ") + (t.evaluation.second.overall ? " (\u201c" + esc(t.evaluation.second.overall) + "\u201d)" : "") : ""].filter(Boolean).join(". ") + "."));
        if (t.corrections.length) o.push(p("<em>Corrected by the researcher:</em> " + t.corrections.map(function (x) { return esc(x.reason || "no reason given"); }).join("; ") + "."));
      };
      c.gaps.filter(function (g) { return !g.after_turn; }).forEach(function (g) { o.push(gapP(g)); });
      path.forEach(function (t, j) { turnBlock(t, j + 1); c.gaps.filter(function (g) { return g.after_turn === t.turn_id; }).forEach(function (g) { o.push(gapP(g)); }); });
      var others = c.turns.filter(function (t) { return path.indexOf(t) === -1; });
      if (others.length) { o.push(p("<strong>Other branches.</strong> Turns not on the branch above, each with the turn it follows:")); others.forEach(function (t) { turnBlock(t, 0); }); }
      if (c.discrepancies.length) o.push(p("<strong>Differences between the AI-generated record and the original:</strong>") + list(c.discrepancies.map(function (d) { return (d.turn_id ? esc(d.turn_id) + ": " : "") + esc(PR.DISCREPANCY_LABELS[d.status]) + (d.resolved ? " (reviewed by the researcher)" : ""); })));
      var claims = c.claims.filter(function (x) { return x.status !== "suggested"; });
      claims.forEach(function (cl) {
        o.push(p("<strong>Claim History " + esc(cl.id) + "</strong>" + (cl.key ? " (comparable label: " + esc(cl.key) + ")" : "") + ": “" + esc(cl.text) + "”, first in " + esc(cl.turn_id || "an unlocated turn") + (cl.sources ? "; sources: " + esc(cl.sources) : "") + "." +
          (cl.aiLater ? " The AI's later formulation: “" + esc(cl.aiLater) + "”." : "") + (cl.researcherReading ? " The researcher's interpretation: " + esc(cl.researcherReading) + "." : "") + (cl.outstanding ? " Outstanding disagreement: " + esc(cl.outstanding) + "." : "")));
        if (cl.events.length) o.push(table(["Turn", "Development", "Note"], cl.events.map(function (e) { return [esc(e.turn_id), esc(PR.CLAIM_EVENTS[e.type]), esc(e.note || "")]; })));
      });
      if (c.observations.length) o.push(p("<strong>Conversation-level observations:</strong>") + list(c.observations.map(function (x) { var cat = PR.OBSERVATION_CATEGORIES.filter(function (y) { return y.id === x.category; })[0]; return esc(x.id + " · " + cat.label + (x.turns.length ? " (" + x.turns.join(", ") + ")" : "") + (x.confidence ? ", confidence " + x.confidence : "") + ": " + x.text); })));
      var decs = c.decisions;
      if (decs.length) o.push(p("<strong>Researcher decisions:</strong>") + list(decs.map(function (d) { return esc(d.id + " · " + PR.DECISION_STATUSES[d.status] + (d.turn_id ? " (" + d.turn_id + ")" : "") + ": " + d.text); })));
    });
    return o.join("\n");
  }

  // Every logged output, each with a tick box. The choice is saved with the report settings (and with the project),
  // so it survives refreshing or reopening the Lab.
  function outputLabel(e, i) {
    var bits = [e.date ? niceDate(e.date) : "Date not recorded", (e.model || "").trim() || "AI system not recorded", A.condName(e.condition), "Run " + (e.run || 1)];
    return (i + 1) + ". " + bits.join(" · ");
  }
  function refreshOutputs() {
    var d = A.readState(), log = A.getLog();
    var chosen = pickOutputs(log, settings(), d.question);
    var box = $("rpOutputs");
    box.replaceChildren();
    log.forEach(function (e, i) {
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.value = e.id; cb.id = "rpOut_" + e.id; cb.checked = chosen.indexOf(e.id) !== -1;
      var lab = document.createElement("label"); lab.className = "check"; lab.htmlFor = cb.id;
      var txt = document.createElement("span"); txt.textContent = outputLabel(e, i);
      lab.append(cb, txt);
      box.append(lab);
      cb.addEventListener("change", outputsChanged);
    });
    $("rpOutEmpty").hidden = log.length > 0;
    $("rpOutPicker").hidden = !log.length;
    summariseOutputs();
  }
  function summariseOutputs() {
    var all = document.querySelectorAll("#rpOutputs input[type=checkbox]").length;
    var on = chosenOutputs().length;
    $("rpOutSummary").textContent = on + " of " + all + " selected";
  }
  function outputsChanged() { summariseOutputs(); saveSettings(); if (!edited) render(); }

  var edited = false, shownOnce = false;
  function render() { $("reportPreview").innerHTML = build(); dress($("reportPreview")); edited = false; }
  // Presentation only: section numbers set apart so they can be printed in rubric, and the assessment statuses
  // given a class so each is coloured as well as written out. The words of the report are not changed.
  var STATUS_CLASS = { "Documented": "st-doc", "Specified": "st-spec", "Not addressed": "st-none", "Not applicable": "st-na" };
  function dress(root) {
    Array.prototype.forEach.call(root.querySelectorAll("h2, h3"), function (h) {
      var t = h.firstChild;
      if (!t || t.nodeType !== 3) return;
      var m = /^(Appendix [A-Z]\.|\d+(?:\.\d+)*\.?)\s/.exec(t.nodeValue);
      if (!m) return;
      t.nodeValue = t.nodeValue.slice(m[0].length);
      var n = document.createElement("span"); n.className = "num"; n.textContent = m[1];
      h.insertBefore(document.createTextNode(" "), t); h.insertBefore(n, h.firstChild);
    });
    Array.prototype.forEach.call(root.querySelectorAll("td"), function (td) {
      var c = STATUS_CLASS[td.textContent.trim()];
      if (c) td.className = c; // one class only: Word ignores cells with two
    });
  }
  function show() {
    if (!shownOnce) {
      var st = settings();
      $("rpTitle").value = st.title || ""; $("rpAuthor").value = st.author || ""; var saved = legacyRoles(st);
      ROLES.forEach(function (x) { document.getElementById("rpRole_" + x.id).checked = saved.indexOf(x.id) !== -1; });
      $("rpUse").value = st.use || ""; $("rpSources").checked = !!st.sources;
      DIMS.forEach(function (dm) { var el = document.getElementById("rpNa_" + dm.key); if (el) el.value = (st.na || {})[dm.key] || ""; });
      shownOnce = true;
    }
    refreshOutputs();
    saveSettings();
    if (!edited) render();
    else A.flash("rpStatus", "You have edited the preview, so it was not refreshed. Press “Rebuild the report from my records” to update it.");
  }

  $("reportPreview").addEventListener("input", function () { edited = true; });
  $("rpBuild").addEventListener("click", function () {
    if (edited && !confirm("Rebuild the report? The edits you made in the preview will be replaced.")) return;
    render(); A.flash("rpStatus", "Report rebuilt from your records.");
  });
  var subBox = null;
  ROLES.forEach(function (x) {
    var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "rpRole_" + x.id;
    var lab = document.createElement("label"); lab.className = "check"; lab.append(cb, x.label);
    if (x.parent) {
      // the writing subcategories sit under their category and can each be ticked on their own
      if (!subBox) { subBox = document.createElement("div"); subBox.className = "checks sub-checks"; subBox.setAttribute("role", "group"); subBox.setAttribute("aria-label", "Research writing and editing"); $("rpRoles").append(subBox); }
      subBox.append(lab);
    } else $("rpRoles").append(lab);
    cb.addEventListener("change", function () {
      var parent = x.parent ? document.getElementById("rpRole_" + x.parent) : null;
      if (parent && cb.checked) parent.checked = true;   // a subcategory implies its category
      if (x.id === "writing" && !cb.checked) ROLES.forEach(function (y) { if (y.parent === "writing") document.getElementById("rpRole_" + y.id).checked = false; });
      saveSettings(); if (!edited) render();
    });
  });
  DIMS.forEach(function (dm) {
    var id = "rpNa_" + dm.key;
    var lab = document.createElement("label"); lab.htmlFor = id; lab.textContent = dimLabel(dm);
    var inp = document.createElement("input"); inp.id = id; inp.placeholder = "Reason it does not apply (leave empty if it applies)";
    inp.addEventListener("change", function () { saveSettings(); if (!edited) render(); });
    $("rpNa").append(lab, inp);
  });
  $("rpOutAll").addEventListener("click", function () { Array.prototype.forEach.call(document.querySelectorAll("#rpOutputs input[type=checkbox]"), function (c) { c.checked = true; }); outputsChanged(); });
  $("rpOutNone").addEventListener("click", function () { Array.prototype.forEach.call(document.querySelectorAll("#rpOutputs input[type=checkbox]"), function (c) { c.checked = false; }); outputsChanged(); });
  ["rpTitle", "rpAuthor", "rpUse", "rpSources"].forEach(function (id) {
    $(id).addEventListener("change", function () { saveSettings(); if (!edited) render(); });
  });

  function fileName(ext) { return ($("rpTitle").value.trim() || "ai-methods-report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "." + ext; }
  $("rpWord").addEventListener("click", function () {
    // Word cannot embed web fonts: Source Serif 4 is used where it is installed, Georgia otherwise
    var css = "body{font-family:'Source Serif 4',Georgia,'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#1f2a30} h1{font-size:20pt;margin-bottom:2pt} h2{font-size:14pt;margin-top:18pt} h3{font-size:12pt;margin-top:12pt} .num{color:#a8402c;margin-right:4pt}" +
      " table{border-collapse:collapse;width:100%} th,td{border:1px solid #9aa3a7;padding:3pt 5pt;font-family:Calibri,Arial,sans-serif;font-size:9.5pt;vertical-align:top;text-align:left} th{background:#eef2f1}" +
      " .st-doc{color:#24694f;font-weight:bold} .st-spec{color:#17434d;font-weight:bold} .st-none{color:#56626a} .st-na{color:#56626a;font-style:italic}" +
      " pre{font-family:Consolas,'Courier New',monospace;font-size:9pt;white-space:pre-wrap;border:1px solid #9aa3a7;padding:6pt} .gap{background:#fbefc9;font-weight:bold} .meta{color:#555555} .subtitle{font-size:13pt;font-weight:bold;margin:0} .note{border-left:3pt solid #8a5300;background:#fbf0da;padding:4pt 8pt} .stmt{border-left:3pt solid #17434d;padding-left:8pt}";
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' +
      esc($("rpTitle").value.trim() || "AI methods report") + "</title><style>" + css + "</style></head><body>" + $("reportPreview").innerHTML + "</body></html>";
    A.download(fileName("doc"), "﻿" + html, "application/msword");
    if (window.LAB_CONV && window.LAB_CONV.noteEvent) window.LAB_CONV.noteEvent("report_generated", "Word");
    var gaps = $("reportPreview").querySelectorAll(".gap").length;
    A.flash("rpStatus", "Downloaded. It opens in Word, Google Docs and LibreOffice." + (gaps ? " " + gaps + " part" + (gaps === 1 ? " is" : "s are") + " still marked [To complete]." : ""));
  });
  $("rpPrint").addEventListener("click", function () {
    document.body.classList.add("printing-report");
    var done = function () { document.body.classList.remove("printing-report"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
    if (window.LAB_CONV && window.LAB_CONV.noteEvent) window.LAB_CONV.noteEvent("report_generated", "print or PDF");
    setTimeout(done, 60000);
  });
  $("rpCopyStmt").addEventListener("click", function () {
    var s = $("reportPreview").querySelector("#rpStatement");
    A.copy(s ? s.textContent : "", "rpStatus");
  });

  window.LAB_REPORT = { show: show, build: build };
  // The Lab may open directly on this tab (for example after a refresh): it was shown before this file loaded.
  if ($("panel-report") && !$("panel-report").hidden) show();
})();
