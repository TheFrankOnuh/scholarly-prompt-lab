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
    { title: "Welcome to the Scholarly Prompt Lab", body: "This short demo shows the whole workflow with a sample editorial: design a research prompt, run it in an AI system, then check what the AI gave back. Your own work is put back when the demo ends.", prep: loadSample },
    { tab: "tab-build", target: "question", title: "1. Start with your research question(s)", body: "Everything follows from the question. The demo has filled one in. Choose your discipline above it: there are 80, and you can add your own." },
    { tab: "tab-build", target: "theoryLabel", scrollTo: "theoryChips", title: "2. Choose your theoretical frameworks", body: "Search the library by theory, thinker or idea, or add your own. “Sources” shows each framework's key works and debates. With one theory chosen, the Lab suggests companions and says why." },
    { tab: "tab-build", target: "sourceText", title: "3. Load your sources", body: "Paste text or load PDF, Word or text files. Each document is tagged DOC-01, DOC-02 so the AI can cite it. Files are read on your device and never uploaded." },
    { tab: "tab-build", target: "prompt", title: "4. Copy the prompt into the AI system you are using", body: "The Lab assembles your question, theories, procedure, safeguards and sources into one structured prompt. The meter above shows how much of the CONTEXT framework it covers. The Lab never sends it anywhere: you paste it into the AI system yourself." },
    { tab: "tab-log", target: "lgOutput", title: "5. Paste the AI's answer", body: "The demo has pasted a sample answer with two planted errors: one quotation with altered wording and dropped Igbo diacritics, and one quotation the AI invented.", prep: pasteOutput },
    { tab: "tab-log", target: "autoChecks", title: "6. The Lab checks every quotation", body: "Each quotation is compared with your sources. Here one is exact, one needs a wording check, and one was not found. It also flagged a number that appears nowhere in the source. Open “See every quotation” to compare wordings." },
    { tab: "tab-log", target: "criteria", title: "7. Suggested scores, confirmed by you", body: "Three scores are suggested from the checks, each with its reason. Nothing counts until you confirm or change it, and the Lab records where you disagreed. Accuracy, context and misrepresentation need your judgement or a second AI model." },
    { tab: "tab-log", target: "lgErrors", title: "8. A ready-made list of errors to review", body: "The problems found are listed for you to review, edit and keep with the entry. Saved entries can be exported as a report for your methods section." },
    { tab: "tab-study", target: "conditions", title: "9. Test how much the prompt shapes the answer", body: "The Sensitivity study gives the same task as four prompts, from a bare question to the fully specified one. If a finding appears only under your critical framing, the framing produced it." },
    { title: "That is the whole method", body: "Design, run, check, confirm, compare. Ending the demo puts your own work back exactly as it was.", last: true }
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
    $("tourCount").textContent = "Demo · step " + (i + 1) + " of " + steps.length;
    $("tourTitle").textContent = s.title;
    $("tourBody").textContent = s.body;
    $("tourBack").hidden = i === 0;
    $("tourNext").textContent = s.last ? "Finish" : "Next";
    backdrop.classList.toggle("dim", !s.target);
    // wait a moment for debounced checks and tab switches before pointing at things
    setTimeout(function () {
      current = s.target ? $(s.target) : null;
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
