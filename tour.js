/* Scholarly Prompt Lab: guided demo.
   Walks a first-time user through the whole workflow with a short sample editorial and a sample AI answer
   that contains two planted errors. The user's own design is put back when the demo ends. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var startBtn = $("tourStart");
  if (!startBtn) return;

  var SAMPLE_SOURCE = "[DOC-01: Sample editorial (written for this demo)]\n" +
    "The governor's decision to close Ogbete market for three weeks has been presented as a public health measure. " +
    "The traders tell a different story. They were given two days' notice, and no one from the ministry came to explain. " +
    "Mama Nkechi, who has sold yams there for thirty years, put it plainly: “They did not ask us. They only told us.” " +
    "As our elders say, onye ajụjụ anaghị efu ụzọ: the one who asks questions does not lose the way. " +
    "A government that will not ask its people cannot expect to find its way. " +
    "The market must reopen, and the traders must be at the table when its future is decided.";

  var SAMPLE_OUTPUT = "## Finding 1: The government is represented as acting without consultation\n\n" +
    "> “They were given two days' notice, and no one from the ministry came to explain.”\n\n" +
    "Source: DOC-01\n\n" +
    "**Textual observation:** The traders are the grammatical recipients of the action; the ministry is absent.\n\n" +
    "**Interpretation:** The editorial constructs the government as an actor that decides for people, not with them.\n\n" +
    "**Alternative interpretation:** The short notice may reflect a genuine emergency, which the editorial does not discuss.\n\n" +
    "## Finding 2: Indigenous wisdom is used to judge the government\n\n" +
    "> “As our elders say, onye ajuju anaghi efu uzo: the one who asks questions never loses the way.”\n\n" +
    "Source: DOC-01\n\n" +
    "**Interpretation:** The Igbo proverb turns consultation into a test of good leadership.\n\n" +
    "## Finding 3: The traders demand compensation\n\n" +
    "> “Every trader must be paid for the three weeks of lost income.”\n\n" +
    "Source: DOC-01\n\n" +
    "**Interpretation:** The editorial frames the closure as an economic injustice. The market has 4,000 traders.\n\n" +
    "## Limitations\n\nThe editorial's factual claims cannot be verified from the text alone.";

  var steps = [
    { title: "Welcome to the Scholarly Prompt Lab", body: "This demo walks through the whole method step by step, using a sample editorial: design a research prompt, run it in the AI system you are using, check what comes back, and write up your methods. Your own work is put back when the demo ends.", prep: loadSample },
    { tab: "tab-build", target: "question", title: "1. Your research question(s) and discipline", body: "Everything follows from the question. If you have several, put each on its own line and the Lab numbers them. Above it, choose your discipline from 80 in the humanities and social sciences, or add your own and propose it for everyone." },
    { tab: "tab-build", target: "theoryLabel", scrollTo: "theoryChips", title: "2. Choose your theoretical frameworks", body: "Search 176 entries by name, thinker or idea, or filter by field. Each entry is labelled as a theory, approach, method or concept. Press \u201cSources\u201d on any entry to see its key works in Harvard style, its core concepts and the main critiques. References the catalogue check could not fully confirm are marked." },
    { tab: "tab-build", target: "addTheoryBtn", title: "3. Suggestions, and your own theories", body: "With one framework chosen, the Lab suggests companions and says why. You can also add your own theory with its key work and concepts, and propose it for every user: proposals are checked automatically and reviewed by the editor before they join the library." },
    { tab: "tab-build", target: "procedure", title: "4. The method: what the AI should do", body: "Choose a prompting technique. The procedure below it is then built for you from three things: your discipline's conventions (here, describing each media source), the steps of each framework's own method, and the technique. You can edit any step, and the Lab will not overwrite your edits." },
    { tab: "tab-build", target: "unit", title: "5. Your research design", body: "State your unit of analysis, your corpus and how it was chosen, and your working definitions. A methods reviewer will ask for these, and they go into the prompt so the AI works to your design." },
    { tab: "tab-build", target: "sourceText", title: "6. Load your sources", body: "Paste text or load PDF, Word or text files. You check the extracted text first, and each document is tagged DOC-01, DOC-02 so that every claim can be traced. Files are read on your device and never uploaded." },
    { tab: "tab-build", target: "context", title: "7. Context, contested terms and output", body: "Tell the AI what an outsider would misread: the place, period, languages and the terms that are in dispute. Then choose how findings should come back: a table, JSON, CSV or prose, with the columns you need." },
    { tab: "tab-build", target: "safeguards", title: "8. Analytical standards", body: "Tick the standards for evidence, interpretation, context and limits: exact quotations with source identifiers, no invented sources, alternative readings, a search for disconfirming evidence. If the AI is answering from its own knowledge with no sources, the Lab stops demanding quotations, which would push it to invent them." },
    { tab: "tab-build", target: "planCross", title: "9. Commit to testing and record-keeping", body: "An answer from one AI system, run once, is not a finding. Tick what you commit to: running the prompt more than once and on more than one system, and recording the system, version, date and settings." },
    { tab: "tab-build", target: "prompt", scrollTo: "promptTitle", title: "10. Your scholarly prompt", body: "The Lab assembles everything into one structured prompt. Above it, warnings point out contradictions or gaps in your design, and CONTEXT coverage shows which of the seven elements are covered, with ticks and words. Press \u201cCopy prompt\u201d: the Lab records exactly what you copied." },
    { tab: "tab-build", target: "copyPrompt", title: "11. Run it in the AI system you are using", body: "Paste the prompt into the AI system you are using, in a new conversation. The Lab never sends anything anywhere and does not call any AI itself. Then bring the answer back." },
    { tab: "tab-log", target: "lgOutput", title: "12. Paste the AI's answer", body: "Record the AI system and its version, the date and the settings, then paste its full answer. The demo has pasted a sample answer with planted errors: one quotation with changed wording and dropped Igbo diacritics, and one the AI invented.", prep: pasteOutput },
    { tab: "tab-log", target: "autoChecks", title: "13. Every quotation is checked", body: "The Lab compares each quotation with your sources. Here one is exact, one differs in wording, and one was not found. It also flags a figure that appears nowhere in the source. Open \u201cSee every quotation\u201d to compare the AI's wording with the source's." },
    { tab: "tab-log", target: "criteria", title: "14. Suggested scores, confirmed by you", body: "Scores for traceability, plurality and calibration are suggested from the checks, each with its reason. Nothing counts until you confirm or change it, and the Lab records where you disagreed with the suggestion." },
    { tab: "tab-log", target: "secondModel", title: "15. A second opinion from another AI system", body: "For accuracy, context and misrepresentation, you can copy an evaluator prompt into a different AI system and paste its reply back. Its scores arrive as suggestions only: another AI's judgement is never treated as final." },
    { tab: "tab-log", target: "lgUse", title: "16. What you did with the output", body: "Record whether you used the output as it stands, corrected it, used it only as a starting point, or rejected it. Below, \u201cErrors found\u201d lists the problems the checks found, for you to review and edit. Then save the entry." },
    { tab: "tab-study", target: "conditions", title: "17. Test how much the prompt shapes the answer", body: "The Sensitivity study gives the same task as four prompts, from the bare question to the fully specified one. If a finding appears only under your own framing, the framing produced it. Run each several times and log the results." },
    { tab: "tab-report", target: "reportPreview", title: "18. Your methods report", body: "The Methods report drafts your AI-use statement, a methods section and appendices from what you recorded: systems and dates, prompt design, checks and what they found, your evaluation, how you used the output, and limitations. Anything you did not record is marked \u201cTo complete\u201d. Edit it here, then download it for Word or save it as PDF." },
    { tab: "tab-framework", target: "frameworkList", title: "19. The CONTEXT framework", body: "This tab explains the seven dimensions behind the Lab: Conceptual grounding, Operationalisation, Situated knowledge, Traceability, Evaluation, Cross-model examination and Transparency. Each comes with the question it asks of your research." },
    { tab: "tab-build", title: "20. You are ready", body: "Design, run, check, confirm, test and report. To keep several studies apart, use Project at the top of the page: each project has its own sources, log and report. The Lab works offline once opened, saves your work only in your browser, and can export everything. Ending the demo puts your own work back exactly as it was.", last: true }
  ];

  var saved = null, i = 0, box, backdrop, lastFocus, current;

  function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }
  function setVal(id, v) { var el = $(id); if (!el) return; el.value = v; fire(el, "input"); fire(el, "change"); }

  function loadSample() {
    var ex = $("example");
    ex.value = "editorials"; fire(ex, "change");
    setVal("question", "How does the editorial represent the relationship between the state government and market traders?");
    setVal("sourceDesc", "A sample newspaper editorial written for this demo");
    setVal("sourceText", SAMPLE_SOURCE);
    setVal("context", "South-eastern Nigeria. The editorial mixes English with an Igbo proverb and assumes local knowledge of market associations.");
  }
  function pasteOutput() {
    var cond = $("lgCondition"); if (cond) { cond.value = "custom"; fire(cond, "change"); }
    setVal("lgModel", "Sample model (demo)");
    setVal("lgOutput", SAMPLE_OUTPUT);
  }

  function build() {
    backdrop = document.createElement("div"); backdrop.className = "tour-backdrop";
    box = document.createElement("div"); box.className = "tour-box";
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "false"); box.setAttribute("aria-labelledby", "tourTitle"); box.setAttribute("aria-describedby", "tourBody");
    box.innerHTML = '<p class="tour-count" id="tourCount"></p><h2 id="tourTitle" tabindex="-1"></h2><p id="tourBody"></p>' +
      '<div class="tour-actions"><button type="button" class="ghost" id="tourEnd">End demo</button><span class="tour-spacer"></span>' +
      '<button type="button" class="ghost" id="tourBack">Back</button><button type="button" id="tourNext">Next</button></div>';
    document.body.append(backdrop, box);
    $("tourEnd").addEventListener("click", end);
    $("tourBack").addEventListener("click", function () { show(i - 1); });
    $("tourNext").addEventListener("click", function () { if (steps[i].last) end(); else show(i + 1); });
    document.addEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (!box) return;
    if (e.key === "Escape") { e.preventDefault(); end(); }
  }

  function show(n) {
    if (n < 0 || n >= steps.length) return;
    i = n;
    var s = steps[i];
    if (current) current.classList.remove("tour-target");
    if (s.prep && !s.done) { s.prep(); s.done = true; }
    if (s.tab) { var t = $(s.tab); if (t && t.getAttribute("aria-selected") !== "true") t.click(); }
    // the demo's Log & evaluate steps are about a single output, not a conversation
    if (s.tab === "tab-log" && window.LAB_CONV && window.LAB_CONV.setMode) window.LAB_CONV.setMode("single");
    $("tourCount").textContent = i === 0 ? "Demo: introduction" : "Demo: step " + i;
    $("tourTitle").textContent = s.title;
    $("tourBody").textContent = s.body;
    $("tourBack").hidden = i === 0;
    $("tourNext").textContent = s.last ? "Finish" : "Next";
    backdrop.classList.toggle("dim", !s.target);
    // wait a moment for debounced checks and tab switches before pointing at things
    setTimeout(function () {
      current = s.target ? $(s.target) : null;
      if (current && window.LAB_STEPS) window.LAB_STEPS.reveal(current);
      if (current) {
        current.classList.add("tour-target");
        var scrollEl = s.scrollTo ? $(s.scrollTo) || current : current;
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var tall = scrollEl.getBoundingClientRect().height > window.innerHeight * 0.45;
        scrollEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: tall ? "start" : "center" });
      }
      $("tourTitle").focus({ preventScroll: true });
    }, s.prep || s.tab ? 650 : 50);
  }

  function start() {
    var out = $("lgOutput");
    if (out && out.value.trim()) {
      alert("You have an unsaved model output in Log & evaluate. Save or clear it first, then start the demo: the demo uses that form.");
      return;
    }
    lastFocus = document.activeElement;
    try {
      saved = { draft: localStorage.getItem("spl.draft.v1") };
      // kept on the device, so a refresh or a closed tab in the middle of the demo cannot lose the researcher's design
      localStorage.setItem("spl.tourBackup", JSON.stringify(saved));
    } catch (e) { saved = { draft: null }; }
    steps.forEach(function (s) { s.done = false; });
    document.body.classList.add("tour-on");
    build();
    show(0);
  }

  function end() {
    document.removeEventListener("keydown", onKey);
    if (current) current.classList.remove("tour-target");
    if (box) box.remove(); if (backdrop) backdrop.remove();
    box = backdrop = current = null;
    document.body.classList.remove("tour-on");
    // put the researcher's own design back, and clear the demo answer without saving it to the log
    try {
      if (saved && saved.draft !== null) localStorage.setItem("spl.draft.v1", saved.draft);
      else localStorage.removeItem("spl.draft.v1");
      localStorage.removeItem("spl.tourBackup");
      localStorage.removeItem("spl.logform.v1");
      sessionStorage.setItem("spl.tourDone", "1");
    } catch (e) { /* ignore */ }
    location.hash = "#build";
    location.reload();
  }

  startBtn.addEventListener("click", start);
})();
