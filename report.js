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
    return DIMS.map(function (dm) {
      var why = String((f.na || {})[dm.key] || "").trim();
      var r = why ? ["Not applicable", why] : rules[dm.key]();
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
      systems: Math.max(namedSystems.length, sysKeys.length && !namedSystems.length ? 1 : 0), conditions: conds.length, repeats: repeats, na: st.na || {}
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
      : "No AI outputs are documented yet, so this report describes the research design only.") + "</p>");

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
    disc.push("Prompts were designed and recorded with Scholarly Prompt Lab (Onuh, " + cit.year + "). The researcher is responsible for the analysis and conclusions presented.");
    out.push('<p class="stmt" id="rpStatement">' + disc.join(" ") + "</p>");

    // ---- 2. Research methodology ----
    out.push("<h2>2. Research methodology</h2>");

    out.push("<h3>2.1 AI systems and conditions of use</h3>");
    if (!n) out.push(p(gap("AI system, version and dates of use")));
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
    if (!n) ex.push("Not yet undertaken: no runs are documented.");
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
    if (!n) ver.push("Not yet undertaken: no AI outputs are documented.");
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
    if (!n) out.push(p("Not yet undertaken: no AI outputs are documented."));
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
    return out.join("\n");
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
  function render() { $("reportPreview").innerHTML = build(); edited = false; }
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
    var css = "body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5} h1{font-size:18pt} h2{font-size:14pt;margin-top:18pt} h3{font-size:12pt;margin-top:12pt}" +
      " table{border-collapse:collapse;width:100%} th,td{border:1px solid #666;padding:3pt 5pt;font-size:10pt;vertical-align:top;text-align:left} th{background:#eeeeee}" +
      " pre{font-family:Consolas,'Courier New',monospace;font-size:9pt;white-space:pre-wrap;border:1px solid #999;padding:6pt} .gap{background:#fff2a8;font-weight:bold} .meta{color:#555555} .subtitle{font-size:13pt;font-weight:bold;margin:0} .note{border-left:3pt solid #8a5a00;background:#fbf1dc;padding:4pt 8pt} .stmt{border-left:3pt solid #0e5c47;padding-left:8pt}";
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' +
      esc($("rpTitle").value.trim() || "AI methods report") + "</title><style>" + css + "</style></head><body>" + $("reportPreview").innerHTML + "</body></html>";
    A.download(fileName("doc"), "﻿" + html, "application/msword");
    var gaps = $("reportPreview").querySelectorAll(".gap").length;
    A.flash("rpStatus", "Downloaded. It opens in Word, Google Docs and LibreOffice." + (gaps ? " " + gaps + " part" + (gaps === 1 ? " is" : "s are") + " still marked [To complete]." : ""));
  });
  $("rpPrint").addEventListener("click", function () {
    document.body.classList.add("printing-report");
    var done = function () { document.body.classList.remove("printing-report"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
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
