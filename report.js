/* Scholarly Prompt Lab: AI methods report.
   Drafts a methods section, an AI-use statement and appendices from what the researcher recorded in the Lab.
   Rule: it states only what was recorded. Anything not recorded is marked as a gap for the researcher to complete.
   It never says the analysis is verified; it reports which checks were run and what they found. */
(function () {
  "use strict";

  /* ---------- how AI was used: categories (shared with the tests) ---------- */
  // Each category has the label shown to the researcher and the phrase used in the AI-use statement.
  // The three writing subcategories belong to "Research writing and editing" and are recorded separately.
  var ROLES = [
    { id: "prelim", label: "Preliminary analysis: Initial examination of source material, followed by my review.", text: "to carry out an initial examination of the source material, which the researcher then reviewed" },
    { id: "aicoding", label: "Preliminary coding: Initial coding of research material, which I reviewed and revised.", text: "to carry out an initial coding of the research material, which the researcher then reviewed and revised" },
    { id: "coding", label: "Coding and classification: Application of my established coding scheme.", text: "to apply the researcher's established coding scheme to the material, with the coding checked by the researcher" },
    { id: "extract", label: "Information processing: Extraction, summarisation or organisation of source material.", text: "to extract, summarise or organise information from the source material" },
    { id: "translate", label: "Translation or transcription: Assistance with language translation or transcription.", text: "to assist with translation or transcription, which the researcher checked against the original" },
    { id: "challenge", label: "Interpretive examination: Exploration of alternative readings and counterarguments to assess my interpretation.", text: "to explore alternative readings and counterarguments in order to assess the researcher's interpretation" },
    { id: "object", label: "Object of study: Examination of the AI system and its outputs.", text: "" },
    { id: "litreview", label: "Literature discovery and review: Identification, comparison and synthesis of relevant scholarship, with independent verification of sources.", text: "to identify, compare and synthesise relevant scholarship, with every source verified independently by the researcher" },
    { id: "design", label: "Research design and instrument development: Assistance with developing research questions, analytical frameworks, interview guides or coding schemes.", text: "to assist with developing research questions, analytical frameworks, interview guides or coding schemes" },
    { id: "compare", label: "Comparative analysis: Examination of patterns, differences and relationships across documents, datasets, languages or research contexts.", text: "to examine patterns, differences and relationships across documents, datasets, languages or research contexts" },
    { id: "writing", label: "Research writing and editing: Assistance with drafting, revising or editing scholarly texts under my supervision.", text: "" },
    { id: "writing_lang", parent: "writing", label: "Language and copyediting: Assistance with grammar, spelling, punctuation, clarity and academic language.", text: "language and copyediting (grammar, spelling, punctuation, clarity and academic language)" },
    { id: "writing_struct", parent: "writing", label: "Structural and argumentative revision: Assistance with organising scholarly arguments, improving coherence and refining the structure of researcher-authored texts.", text: "structural and argumentative revision of texts written by the researcher (organising arguments, improving coherence and refining structure)" },
    { id: "writing_draft", parent: "writing", label: "Content generation and drafting: Generation of substantive academic text, including passages or sections subsequently reviewed and revised by me.", text: "the generation of substantive academic text, including passages or sections that the researcher subsequently reviewed and revised" }
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

  // The sentences of the AI-use statement that describe how AI was used. gap() marks what the researcher must complete.
  function useSentences(roles, sysCount, gap, plural) {
    roles = normaliseRoles(roles);
    if (!roles.length) return gap("how generative AI was used in this study. Tick the uses that apply in the form beside this preview");
    var tool = ROLES.filter(function (x) { return x.text && !x.parent && roles.indexOf(x.id) !== -1; }).map(function (x) { return x.text; });
    var parts = [];
    if (tool.length) parts.push("Generative AI was used in this study " + (tool.length === 1 ? tool[0] : "in " + NUM[tool.length - 2] + " ways: " + tool.join("; ")) + ". Its output was not treated as a finding in itself.");
    if (roles.indexOf("writing") !== -1) {
      var w = ROLES.filter(function (x) { return x.parent === "writing" && roles.indexOf(x.id) !== -1; }).map(function (x) { return x.text; });
      var joined = w.length < 2 ? w.join("") : w.slice(0, -1).join("; ") + "; and " + w[w.length - 1];
      parts.push(w.length
        ? "In research writing and editing, carried out under the researcher's supervision, generative AI was used for " + joined + "."
        : "Generative AI assisted with drafting, revising or editing scholarly texts under the researcher's supervision. " + gap("which kinds of writing assistance were used: language and copyediting, structural and argumentative revision, or content generation and drafting"));
    }
    if (roles.indexOf("object") !== -1) {
      var other = parts.length > 0;
      parts.push("Generative AI was " + (other ? "also " : "") + "the object of " + (other ? "study" : "this study") + ": the outputs of " + (sysCount ? plural(sysCount, "AI system") : "AI systems") + " were collected and analysed as data about how such systems respond, and were not used as evidence about the subject matter itself.");
    }
    return parts.join(" ");
  }

  // Which logged outputs belong to the study. A saved choice is kept, minus outputs since deleted.
  // With no saved choice (a first visit, or a report set up in an earlier version), the outputs for the current
  // research question are chosen, or every output if none matches or the earlier report used every output.
  function pickOutputs(log, st, question) {
    var ids = log.map(function (e) { return e.id; });
    if (Array.isArray(st.outputs)) return st.outputs.filter(function (id) { return ids.indexOf(id) !== -1; });
    var q = String(question || "").trim();
    var mine = log.filter(function (e) { return String(e.question || "").trim() === q; }).map(function (e) { return e.id; });
    if (st.scope === "all" || !mine.length) return ids;
    return mine;
  }

  window.LAB_REPORT_DATA = { ROLES: ROLES, normaliseRoles: normaliseRoles, legacyRoles: legacyRoles, useSentences: useSentences, pickOutputs: pickOutputs };

  var A = window.LAB_APP;
  if (!A) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "spl.report.v1";
  var REL = A.RELEASE || {};
  // cite the DOI of exactly this version when it is known; otherwise the DOI that covers all versions
  var LAB_DOI = "https://doi.org/" + (REL.versionDoi || REL.conceptDoi || "10.5281/zenodo.24521711");
  var USE_LABEL = { used: "Used as it stands", revised: "Used after the researcher's corrections", prompted: "Used only as a starting point for the researcher's own analysis", rejected: "Rejected", data: "Kept as data about the AI system", "": "Not recorded" };

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
    var s = { title: $("rpTitle").value, author: $("rpAuthor").value, roles: chosenRoles(), rolesVersion: 2, use: $("rpUse").value, sources: $("rpSources").checked, outputs: chosenOutputs() };
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    return s;
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

  function build() {
    var st = saveSettings();
    var d = A.readState();
    var L = A.L;
    var entries = entriesFor(st.outputs || []);
    var logged = A.getLog().length;
    var th = A.theoryLines(d);
    var tech = A.techniqueOf(d);
    var conv = A.conventionFor(d.discipline);
    var cov = A.coverage(d);
    var covered = cov.filter(function (c) { return c.on; }).length;
    var out = [];
    var n = entries.length;

    // ---- facts from the log ----
    var systems = {};
    entries.forEach(function (e) {
      var k = (e.model || "").trim() || "(system not recorded)";
      systems[k] = systems[k] || { n: 0, dates: [], settings: {} };
      systems[k].n++; if (e.date) systems[k].dates.push(e.date); if (e.settings) systems[k].settings[e.settings] = 1;
    });
    var sysNames = Object.keys(systems);
    var allDates = entries.map(function (e) { return e.date; }).filter(Boolean).sort();
    var withChecks = entries.filter(function (e) { return e.checks && e.checks.sourceWords > 0; });
    var tot = { q: 0, exact: 0, near: 0, missing: 0, outside: 0 };
    withChecks.forEach(function (e) { tot.q += e.checks.quotations; tot.exact += e.checks.exact; tot.near += e.checks.near; tot.missing += e.checks.missing + (e.checks.termsMissing || 0); tot.outside += (e.checks.outsideFacts || []).length; });
    var second = entries.filter(function (e) { return e.secondModel; });
    var secondNames = {}; second.forEach(function (e) { if (e.secondModel.model) secondNames[e.secondModel.model] = 1; });
    var evaluators = {}; entries.forEach(function (e) { if (e.evaluator) evaluators[e.evaluator] = 1; });
    var unconfirmed = 0, confirmedAny = 0;
    var means = L.criteria.map(function (c) {
      var v = entries.filter(function (e) { return A.countsScore(e, c.id); }).map(function (e) { return parseInt(e.scores[c.id], 10); }).filter(function (x) { return !isNaN(x); });
      entries.forEach(function (e) { if (e.scores[c.id] && !A.countsScore(e, c.id)) unconfirmed++; });
      confirmedAny += v.length;
      return { c: c, n: v.length, mean: v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null, min: v.length ? Math.min.apply(null, v) : null, max: v.length ? Math.max.apply(null, v) : null };
    });
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
    var framed = entries.filter(function (e) { return e.sycophancy; }).length;
    var rebuilt = entries.filter(function (e) { return e.promptSource !== "copied" && e.promptSource !== "copied-design-changed"; }).length;
    var srcWords = d.sourceText.trim() ? d.sourceText.trim().split(/\s+/).length : 0;
    var srcDocs = (d.sourceText.match(/\[DOC-\d+/g) || []).length;

    // ---- title block ----
    out.push("<h1>" + (st.title.trim() ? esc(st.title.trim()) : gap("title of your study")) + "</h1>");
    out.push('<p class="meta">Report of AI-assisted methods' + (st.author.trim() ? " · " + esc(st.author.trim()) : "") + " · prepared " + niceDate(A.today()) + " with the Scholarly Prompt Lab, version " + esc(A.VERSION) + " (" + esc(LAB_DOI) + ")</p>");
    if (!n) out.push(p(gap(logged
      ? "no logged outputs are selected for this study. Select them under \u201cSelect logged outputs for this study\u201d. Until then this report describes only the design of the prompt."
      : "no AI outputs are logged for this study yet. Run your prompt in the AI system you are using, then record the output in Log & evaluate. Until then this report describes only the design of the prompt.")));

    // ---- 1. AI-use statement ----
    out.push("<h2>1. Statement on the use of generative AI</h2>");
    var roleSentence = useSentences(st.roles || [], sysNames.length, gap, plural);
    var stmt = roleSentence + " " +
      (n ? "The " + (sysNames.length === 1 ? "system used was " : "systems used were ") + esc(joinAnd(sysNames)) + (allDates.length ? ", " + (allDates[0] === allDates[allDates.length - 1] ? "on " + niceDate(allDates[0]) : "between " + niceDate(allDates[0]) + " and " + niceDate(allDates[allDates.length - 1])) : "") + ". " : "") +
      "Prompts were designed and documented with the Scholarly Prompt Lab (Onuh, 2026)" + (n ? ", and every prompt and output is recorded in the appendices" : "") + ". " +
      (withChecks.length ? "Quotations in the AI output were checked against the source texts, and the output was evaluated by the researcher. " : "") +
      "The researcher is responsible for the analysis and conclusions presented.";
    out.push('<p class="stmt" id="rpStatement">' + stmt + "</p>");

    // ---- 2. Methods ----
    out.push("<h2>2. Methods: use of generative AI</h2>");
    out.push("<h3>2.1 AI systems and dates</h3>");
    if (!n) out.push(p(gap("which AI system and version you used, and when")));
    else {
      out.push(p(plural(n, "output was", "outputs were") + " collected from " + plural(sysNames.length, "AI system") + (allDates.length ? (allDates[0] === allDates[allDates.length - 1] ? " on " + niceDate(allDates[0]) : " between " + niceDate(allDates[0]) + " and " + niceDate(allDates[allDates.length - 1])) : "") + "."));
      out.push(table(["AI system and version", "Outputs", "Dates", "Settings"], sysNames.map(function (k) {
        var s = systems[k], ds = s.dates.sort(), sets = Object.keys(s.settings);
        return [esc(k), String(s.n), ds.length ? (ds[0] === ds[ds.length - 1] ? niceDate(ds[0]) : niceDate(ds[0]) + " to " + niceDate(ds[ds.length - 1])) : gap("date"), sets.length ? esc(sets.join("; ")) : gap("interface and settings, for example web chat or API, temperature, whether web search was on")];
      })));
    }

    out.push("<h3>2.2 Design of the prompt</h3>");
    var design = [];
    var qLines = d.question.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    design.push(qLines.length > 1
      ? "The research questions put to the AI system were: " + qLines.map(function (x, k) { return "(" + (k + 1) + ") \u201c" + esc(x) + "\u201d"; }).join("; ") + "."
      : "The research question put to the AI system was: " + (qLines.length ? "\u201c" + esc(qLines[0]) + "\u201d" : gap("your research question")) + ".");
    design.push("The study is in " + esc(d.discipline) + "." + (conv && tech.sources !== "none" ? " Following the conventions of the discipline, the prompt first required " + esc(conv.label.toLowerCase()) + "." : ""));
    if (th.length) design.push("The analysis was framed by " + joinAnd(th.map(function (t) { var c = (t.works || []).map(function (w) { return esc(w.authors.replace(/\s*\(eds?\.?\)/i, "").split(",")[0]) + " " + w.year; }).join("; "); return esc(t.n) + (c ? " (" + c + ")" : t.custom ? " (a framework defined by the researcher)" : ""); })) + ". The prompt set out the analytical steps of " + (th.length > 1 ? "each framework" : "the framework") + " and its core concepts, and instructed the AI system to say where the material did not fit.");
    else design.push(gap("the theoretical framework that guided the analysis, or a statement that none was used"));
    if (d.theoryNotes.trim()) design.push("The researcher added this guidance on the use of theory: “" + esc(d.theoryNotes.trim()) + "”");
    design.push("The prompting technique was " + esc(tech.label.split(" (")[0].toLowerCase()) + (tech.sources === "none" ? ": the AI system answered from its own general knowledge, and no sources were supplied." : "."));
    out.push(p(design.join(" ")));
    var rd = [["Unit of analysis", d.unit], ["Corpus and selection", d.corpus], ["Working definitions and decision rules", d.definitions]];
    out.push(list(rd.map(function (x) { return "<strong>" + x[0] + ":</strong> " + (x[1].trim() ? esc(x[1].trim()) : gap(x[0].toLowerCase())); })));
    if (tech.sources !== "none") out.push(p("Source material supplied to the AI system: " + (d.sourceDesc.trim() ? esc(d.sourceDesc.trim()) : gap("a description of your sources")) + (srcWords ? " (" + srcWords.toLocaleString() + " words" + (srcDocs ? " in " + plural(srcDocs, "document") : "") + ", each tagged with an identifier so that claims could be traced)." : ". " + gap("the source text was not loaded in the Lab, so its length is not recorded"))));
    if (d.context.trim() || d.terms.trim()) out.push(p("The prompt gave the AI system this context" + (d.terms.trim() ? " and flagged contested terminology" : "") + ": " + esc([d.context.trim(), d.terms.trim() ? "Contested terms: " + d.terms.trim() : ""].filter(Boolean).join(" ")) + ""));
    var sg = L.safeguards.filter(function (x) { return d.safeguards.indexOf(x.id) !== -1; });
    if (sg.length) out.push(p("The AI system was instructed to work to these standards:") + list(sg.map(function (x) { return "<strong>" + esc(x.group) + ".</strong> " + esc(tech.sources === "none" && x.noSource ? x.noSource : x.text); })));
    var shas = {}; entries.forEach(function (e) { if (e.design && e.design.sourceSha256) shas[e.design.sourceSha256] = (shas[e.design.sourceSha256] || 0) + 1; });
    var shaKeys = Object.keys(shas);
    if (shaKeys.length) out.push(p("To identify the exact source text analysed, the Lab recorded its SHA-256 fingerprint when each output was logged: " + shaKeys.map(function (k) { return "<code>" + k + "</code> (" + plural(shas[k], "output") + ")"; }).join("; ") + ". The same text always produces the same fingerprint." + (shaKeys.length > 1 ? " More than one fingerprint means the source text changed between runs." : "")));
    out.push(p("The prompt covers " + covered + " of the 7 dimensions of the CONTEXT framework for scholarly prompting (Appendix E). The full prompt is given in Appendix A."));

    out.push("<h3>2.3 Runs</h3>");
    if (!n) out.push(p(gap("how many times the prompt was run, and on which systems")));
    else {
      var conds = Object.keys(byCond);
      out.push(p("In total, " + plural(n, "run was", "runs were") + " logged" + (conds.length > 1 || conds[0] !== "custom" ? ", across the prompt conditions below. Each condition adds one layer to the prompt, so that the effect of the prompt's framing on the output can be seen." : ".")));
      if (conds.length > 1 || conds[0] !== "custom") out.push(table(["Prompt condition", "Runs"], conds.sort().map(function (k) { return [esc(A.condName(k)), String(byCond[k])]; })));
      if (rebuilt) out.push(p("For " + plural(rebuilt, "entry", "entries") + ", the prompt was not copied from the Lab in the same session, so the prompt recorded is the one the design gave when the entry was saved. " + gap("confirm that this is the prompt you ran")));
    }

    out.push("<h3>2.4 Checks on the AI output</h3>");
    if (!n) out.push(p(gap("how the AI output was checked")));
    else if (!withChecks.length) out.push(p("The AI output was not checked automatically against sources, because no source text was loaded in the Lab when the outputs were logged. " + gap("describe how you checked the output against your sources")));
    else {
      out.push(p("Each output was compared automatically with the source text, in the researcher's browser. Across " + plural(withChecks.length, "output") + ", " + plural(tot.q, "quotation was", "quotations were") + " checked: " + tot.exact + " matched the source exactly, " + tot.near + " differed from the source in wording or diacritics, and " + tot.missing + " could not be found in the source." +
        (tot.outside ? " The outputs also contained " + plural(tot.outside, "name or figure", "names or figures") + " that " + (tot.outside === 1 ? "does" : "do") + " not appear in the sources." : "") +
        " The items flagged for each output are listed in Appendix C. These checks compare text with text; they do not assess whether an interpretation is sound."));
      if (withChecks.length < n) out.push(p((n - withChecks.length) + " of the " + n + " outputs could not be checked in this way because no source text was loaded at the time."));
    }
    if (second.length) out.push(p("For " + plural(second.length, "output") + ", a second AI system (" + (Object.keys(secondNames).length ? esc(joinAnd(Object.keys(secondNames))) : gap("name and version of the second system")) + ") was asked to evaluate the output against the same criteria. Its scores were treated as suggestions only and were accepted, changed or rejected by the researcher."));

    out.push("<h3>2.5 Evaluation by the researcher</h3>");
    if (!confirmedAny) out.push(p(n ? "No scores have been confirmed by the researcher yet. " + gap("confirm the suggested scores in Log & evaluate, or describe your own evaluation") : gap("how you evaluated the output")));
    else {
      out.push(p("The outputs were scored by " + (Object.keys(evaluators).length ? esc(joinAnd(Object.keys(evaluators))) : "the researcher " + gap("name or role of the evaluator")) + " on six criteria, from 1 (poor) to 5 (strong). Only scores the researcher confirmed are reported."));
      out.push(table(["Criterion", "What it measures", "Outputs scored", "Mean", "Range"], means.map(function (m) { return [esc(m.c.label), esc(m.c.help), String(m.n), m.mean == null ? "–" : m.mean.toFixed(1), m.mean == null ? "–" : m.min + " to " + m.max]; })));
      var ag = [];
      if (agree.checks[1]) ag.push("the researcher's score matched the score suggested by the automatic checks in " + agree.checks[0] + " of " + agree.checks[1] + " cases");
      if (agree.ai[1]) ag.push("and matched the second AI system's score in " + agree.ai[0] + " of " + agree.ai[1] + " cases");
      if (ag.length) out.push(p("Where a score was suggested, " + ag.join(", ") + "."));
      if (unconfirmed) out.push(p(plural(unconfirmed, "suggested score was", "suggested scores were") + " left unconfirmed and " + (unconfirmed === 1 ? "is" : "are") + " not reported."));
      if (n < 5) out.push(p("With " + plural(n, "output") + ", these figures are descriptive only."));
    }
    if (framed) out.push(p("In " + plural(framed, "case") + ", the researcher judged that the output had adopted the framing of the prompt without testing it."));

    out.push("<h3>2.6 How the AI output was used</h3>");
    if (n) {
      var known = Object.keys(uses).filter(function (k) { return k; });
      if (known.length) out.push(table(["What was done with the output", "Outputs"], Object.keys(uses).map(function (k) { return [esc(USE_LABEL[k]), String(uses[k])]; })));
      if (uses[""]) out.push(p(gap("for " + plural(uses[""], "output") + ", what you did with it has not been recorded")));
    }
    out.push(p(st.use.trim() ? esc(st.use.trim()) : gap("in your own words, how the AI outputs informed your final analysis, and what you changed or rejected")));

    out.push("<h3>2.7 Limitations</h3>");
    var lim = [];
    lim.push("Generative AI systems can produce fluent text that is inaccurate, and can vary from one run to the next. The AI output in this study was treated as material to be checked, not as evidence.");
    if (n && sysNames.length === 1) lim.push("Only one AI system was used, so the results may reflect that system and not AI systems in general.");
    if (n === 1) lim.push("The prompt was run once. A repeat run might give a different output.");
    else if (n > 1 && Object.keys(byCond).length === 1 && sysNames.length === 1) lim.push("All runs used the same system and prompt condition, so the effect of the prompt's wording was not tested.");
    if (withChecks.length) lim.push("The automatic checks only compare the output with the source text that was loaded. They cannot detect errors of fact that lie outside those sources, or judge interpretation.");
    if (n && !second.length && Object.keys(evaluators).length < 2) lim.push("The outputs were evaluated by a single evaluator. No independent second evaluation was carried out.");
    if (second.length) lim.push("The second-system evaluation is itself the output of an AI system and carries the same risks.");
    lim.push("The versions of AI systems change over time, so the same prompt may not reproduce these outputs later. The prompts and outputs are therefore recorded in full.");
    out.push(list(lim.map(esc)));

    // ---- appendices ----
    out.push("<h2>Appendix A. Prompts</h2>");
    var prompts = {};
    entries.forEach(function (e) { var k = e.condition + "\u0000" + A.fullPrompt(e); prompts[k] = prompts[k] || { cond: e.condition, text: A.fullPrompt(e), n: 0, src: e.promptSource, at: e.promptCopiedAt }; prompts[k].n++; });
    var pk = Object.keys(prompts);
    if (!pk.length) out.push(p("The prompt as designed (no run has been logged yet):") + "<pre>" + esc(stripSources(document.getElementById("prompt").textContent, st.sources)) + "</pre>");
    pk.forEach(function (k, i) {
      var x = prompts[k];
      out.push("<h3>A" + (i + 1) + ". " + esc(A.condName(x.cond)) + " (" + plural(x.n, "run") + ")</h3>");
      out.push(p(x.src === "copied" || x.src === "copied-design-changed" ? "Recorded when the prompt was copied from the Lab" + (x.at ? ", " + niceDate(x.at.slice(0, 10)) : "") + "." : "Recorded when the log entry was saved."));
      out.push("<pre>" + esc(stripSources(x.text, st.sources)) + "</pre>");
    });

    out.push("<h2>Appendix B. Log of AI outputs</h2>");
    if (!n) out.push(p("No outputs logged."));
    else out.push(table(["No.", "Date", "AI system", "Condition", "Run"].concat(L.criteria.map(function (c) { return c.label; }), ["Use of the output"]), entries.map(function (e, i) {
      return [String(i + 1), niceDate(e.date), esc(e.model), esc(A.condName(e.condition)), String(e.run)].concat(L.criteria.map(function (c) { return e.scores[c.id] ? e.scores[c.id] + (A.countsScore(e, c.id) ? "" : " (unconfirmed)") : "–"; }), [esc(USE_LABEL[e.use || ""]) + (e.useNote ? ": " + esc(e.useNote) : "")]);
    })));

    out.push("<h2>Appendix C. Errors found and outputs</h2>");
    if (!n) out.push(p("No outputs logged."));
    entries.forEach(function (e, i) {
      out.push("<h3>C" + (i + 1) + ". " + esc(e.model) + ", " + niceDate(e.date) + ", " + esc(A.condName(e.condition)) + ", run " + e.run + "</h3>");
      if (e.checks && e.checks.sourceWords) out.push(p("Quotations checked: " + e.checks.quotations + " (" + e.checks.exact + " exact, " + e.checks.near + " differing in wording, " + (e.checks.missing + (e.checks.termsMissing || 0)) + " not found)."));
      out.push(p("<strong>Errors found, as reviewed by the researcher:</strong>") + (e.errors ? "<pre>" + esc(e.errors) + "</pre>" : p("None recorded.")));
      if (e.notes) out.push(p("<strong>Researcher's notes:</strong> " + esc(e.notes)));
      out.push(p("<strong>Output of the AI system:</strong>") + "<pre>" + esc(e.output) + "</pre>");
    });

    out.push("<h2>Appendix D. References</h2>");
    var refs = {};
    var flagged = false;
    th.forEach(function (t) { (t.works || []).forEach(function (w) { if (w.v > 1) flagged = true; refs[A.harvard(w) + (w.v > 1 ? " \u2020" : "")] = 1; }); });
    refs["Onuh, F. (2026) *Scholarly Prompt Lab: The Prompt as Method* (Version " + A.VERSION + ") [Computer software]. Zenodo. " + LAB_DOI] = 1;
    out.push(list(Object.keys(refs).sort(function (a, b) { return a.localeCompare(b); }).map(ital)));
    if (flagged) out.push(p("\u2020 This reference could not be fully confirmed in library catalogues (usually the year of this edition). Check it against your own copy."));
    if (th.some(function (t) { return t.works && t.works.length; })) out.push(p("References to theoretical frameworks come from the Lab's theory library. Check editions and page numbers against your own copies before publication."));

    out.push("<h2>Appendix E. CONTEXT checklist for this prompt</h2>");
    out.push(table(["Dimension", "Status"], cov.map(function (c) { return [esc("CONTEXT dimension " + c.l + ": " + (c.fullName || c.name)), c.on ? "Covered" : "Not covered: needs " + esc(c.need)]; })));
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
  $("rpOutAll").addEventListener("click", function () { Array.prototype.forEach.call(document.querySelectorAll("#rpOutputs input[type=checkbox]"), function (c) { c.checked = true; }); outputsChanged(); });
  $("rpOutNone").addEventListener("click", function () { Array.prototype.forEach.call(document.querySelectorAll("#rpOutputs input[type=checkbox]"), function (c) { c.checked = false; }); outputsChanged(); });
  ["rpTitle", "rpAuthor", "rpUse", "rpSources"].forEach(function (id) {
    $(id).addEventListener("change", function () { saveSettings(); if (!edited) render(); });
  });

  function fileName(ext) { return ($("rpTitle").value.trim() || "ai-methods-report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "." + ext; }
  $("rpWord").addEventListener("click", function () {
    var css = "body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5} h1{font-size:18pt} h2{font-size:14pt;margin-top:18pt} h3{font-size:12pt;margin-top:12pt}" +
      " table{border-collapse:collapse;width:100%} th,td{border:1px solid #666;padding:3pt 5pt;font-size:10pt;vertical-align:top;text-align:left} th{background:#eeeeee}" +
      " pre{font-family:Consolas,'Courier New',monospace;font-size:9pt;white-space:pre-wrap;border:1px solid #999;padding:6pt} .gap{background:#fff2a8;font-weight:bold} .meta{color:#555555} .stmt{border-left:3pt solid #0e5c47;padding-left:8pt}";
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
