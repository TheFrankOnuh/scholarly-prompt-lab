/* Scholarly Prompt Lab: page layout helpers.
   1. Step-by-step forms with a progress rail, or all steps at once: the Build tab (seven steps)
      and the Log & evaluate tab (four steps).
   2. On small screens, the Build tab's prompt panel as a sheet fixed to the bottom of the screen.
   3. In the Sensitivity study, each condition's prompt shows its first lines until opened in full.
   4. The privacy statement in the footer appears when the pointer rests on it or it receives keyboard focus.
   Nothing here reads or stores research content. Only the chosen layout and step are remembered. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  function read(store, k) { try { return store.getItem(k); } catch (e) { return null; } }
  function write(store, k, v) { try { store.setItem(k, v); } catch (e) { /* storage blocked: layout still works */ } }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // a step counts as started once any of its own answers has content (search boxes and add-forms do not count)
  function started(fs) {
    var f = fs.querySelectorAll("input, textarea, select");
    for (var i = 0; i < f.length; i++) {
      var x = f[i];
      if (x.closest("#addTheoryForm, #discAddForm, .picker-search, .no-progress") || x.id === "theorySearch" || x.type === "file") continue;
      if (x.tagName === "SELECT") { if ((x.dataset.counts === "yes" || x.closest(".criteria")) && x.value) return true; continue; }
      if (x.type === "checkbox" || x.type === "radio") { if (x.checked) return true; }
      else if (x.type !== "button" && x.type !== "submit" && x.value && x.value.trim() && !x.dataset.preset) return true;
    }
    var shown = fs.querySelector("[data-step-content]");
    return !!(shown && shown.textContent.trim());
  }

  /* ---------- 1. step-by-step forms ---------- */
  var steppers = [];
  function makeStepper(o) {
    var form = o.form, sets = o.sets;
    if (!form || !sets.length) return null;
    var mode = read(localStorage, o.keyMode) === "all" ? "all" : "steps";
    var cur = Math.min(sets.length - 1, Math.max(0, parseInt(read(sessionStorage, o.keyStep) || "0", 10) || 0));
    var titles = sets.map(function (fs) { var t = fs.querySelector(".leg-title"); return t ? t.textContent.trim() : "Step"; });
    var railBtns = [];
    var rail = el("nav", { class: "stepper" + (o.compact ? " stepper-" + sets.length : ""), "aria-label": o.railLabel });
    var ol = el("ol");
    var toggle = el("button", { type: "button", class: "ghost small-btn step-mode" });
    var live = el("p", { class: "vh", role: "status" });

    function render() {
      sets.forEach(function (fs, i) {
        fs.hidden = mode === "steps" && i !== cur;
        var nav = fs.querySelector(".step-nav");
        if (nav) nav.hidden = mode !== "steps";
      });
      railBtns.forEach(function (b, i) {
        var done = started(sets[i]);
        b.classList.toggle("done", done);
        b.classList.toggle("is-current", mode === "steps" && i === cur);
        if (mode === "steps" && i === cur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
        b.querySelector(".vh").textContent = done ? " (has answers)" : " (not started)";
      });
      toggle.textContent = mode === "steps" ? "Show all steps on one page" : "Show one step at a time";
      toggle.setAttribute("aria-pressed", mode === "all" ? "true" : "false");
      form.classList.toggle("stepped", mode === "steps");
      // on narrow screens the rail scrolls sideways: keep the current step in view
      if (ol.scrollWidth > ol.clientWidth && railBtns[cur]) ol.scrollLeft = Math.max(0, railBtns[cur].parentNode.offsetLeft - ol.offsetLeft - 8);
    }

    function go(i, focus) {
      if (i < 0 || i >= sets.length) return;
      cur = i;
      write(sessionStorage, o.keyStep, String(i));
      if (mode === "all") { sets[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); return; }
      render();
      live.textContent = "Step " + (i + 1) + " of " + sets.length + ": " + titles[i];
      if (focus) {
        sets[i].setAttribute("tabindex", "-1");
        sets[i].focus({ preventScroll: true });
        var top = rail.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) rail.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    }

    function reveal(target) {
      if (!target || !target.closest || mode !== "steps") return false;
      for (var i = 0; i < sets.length; i++) {
        if (sets[i].contains(target)) { if (i !== cur) go(i, false); return true; }
      }
      return false;
    }

    titles.forEach(function (t, i) {
      var b = el("button", { type: "button", class: "step-btn" }, [
        el("span", { class: "sn", "aria-hidden": "true", text: String(i + 1) }),
        el("span", { class: "st", text: t }),
        el("span", { class: "vh" })
      ]);
      b.addEventListener("click", function () { go(i, true); });
      railBtns.push(b);
      ol.append(el("li", {}, [b]));
    });
    toggle.addEventListener("click", function () {
      mode = mode === "steps" ? "all" : "steps";
      write(localStorage, o.keyMode, mode);
      render();
    });
    rail.append(ol, toggle, live);
    o.place(rail);

    sets.forEach(function (fs, i) {
      var nav = el("div", { class: "step-nav" });
      if (i > 0) {
        var back = el("button", { type: "button", class: "ghost", text: "Back" });
        back.addEventListener("click", function () { go(i - 1, true); });
        nav.append(back);
      }
      if (i < sets.length - 1) {
        var next = el("button", { type: "button", text: "Next: " + titles[i + 1] });
        next.addEventListener("click", function () { go(i + 1, true); });
        nav.append(next);
      } else if (o.finish) {
        var fin = el("button", { type: "button", text: o.finish.text });
        fin.addEventListener("click", o.finish.action);
        nav.append(fin);
      } else if (o.lastNav) {
        // the form's own last control row (for example Save entry) sits beside Back
        nav.classList.add("step-nav-end");
      }
      fs.append(nav);
    });

    // a required field on an earlier step: show that step before the browser reports it
    form.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest('button[type="submit"]');
      if (!b || mode !== "steps" || form.checkValidity()) return;
      var bad = form.querySelector(":invalid:not(fieldset)");
      if (bad) { e.preventDefault(); reveal(bad); bad.reportValidity(); }
    }, true);

    var t;
    function later() { clearTimeout(t); t = setTimeout(render, 250); }
    form.addEventListener("input", later);
    form.addEventListener("change", later);
    if (o.watch) new MutationObserver(later).observe(o.watch, { childList: true });
    render();
    var api = { reveal: reveal, go: go, mode: function () { return mode; }, count: sets.length, render: render };
    steppers.push(api);
    return api;
  }

  /* the Build tab: seven steps, rail above the form and the prompt panel */
  var builder = $("builder");
  var build = builder ? makeStepper({
    form: builder,
    sets: Array.prototype.filter.call(builder.children, function (n) { return n.tagName === "FIELDSET"; }),
    keyMode: "spl.ui.mode", keyStep: "spl.ui.step",
    railLabel: "Steps in building your prompt",
    place: function (rail) { var grid = builder.parentNode; grid.parentNode.insertBefore(rail, grid); },
    finish: { text: "Done: review and copy your prompt", action: function () {
      var c = $("copyPrompt");
      openSheet(true);
      if (c) { c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); c.focus({ preventScroll: true }); }
    } }
  }) : null;

  /* the Log & evaluate tab: four steps, rail above the form and the summary */
  var logForm = $("logForm");
  var logSteps = logForm ? makeStepper({
    form: logForm,
    sets: Array.prototype.filter.call(logForm.querySelectorAll(":scope > fieldset.log-step"), function () { return true; }),
    keyMode: "spl.ui.logmode", keyStep: "spl.ui.logstep",
    railLabel: "Steps in logging and evaluating an output",
    compact: true,
    watch: $("autoChecks"),
    lastNav: true,
    place: function (rail) { var grid = logForm.parentNode; grid.parentNode.insertBefore(rail, grid); }
  }) : null;

  // show whichever step holds an element, so links, the demo and file loading always land on something visible
  function reveal(target) {
    var hit = false;
    steppers.forEach(function (s) { if (s.reveal(target)) hit = true; });
    if (target && target.closest && target.closest(".sheet")) openSheet(true);
    return hit;
  }

  /* ---------- 2. the prompt panel as a sheet on small screens ---------- */
  var aside = document.querySelector("#panel-build aside.sticky");
  var sheetBtn = null;
  function openSheet(on) {
    if (!aside || !sheetBtn) return;
    aside.classList.toggle("open", on);
    sheetBtn.setAttribute("aria-expanded", on ? "true" : "false");
    sheetBtn.textContent = on ? "Hide prompt" : "Show prompt";
  }
  if (aside) {
    aside.classList.add("sheet");
    aside.id = aside.id || "promptPanel";
    sheetBtn = el("button", { type: "button", class: "ghost small-btn sheet-toggle", "aria-controls": aside.id, "aria-expanded": "false", text: "Show prompt" });
    sheetBtn.addEventListener("click", function () { openSheet(!aside.classList.contains("open")); });
    var head = aside.querySelector(".panel-head");
    if (head) head.append(sheetBtn);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && aside.classList.contains("open") && window.matchMedia("(max-width: 959px)").matches) { openSheet(false); sheetBtn.focus(); } });
  }

  /* ---------- 3. study prompts: first lines, then the full text on request ---------- */
  var conds = $("conditions");
  var openConds = {};
  function foldPrompts() {
    if (!conds) return;
    Array.prototype.forEach.call(conds.querySelectorAll("pre.prompt"), function (pre, i) {
      pre.id = pre.id || "condPrompt" + (i + 1);
      var key = pre.id;
      if (pre.dataset.fold) return;
      pre.dataset.fold = "1";
      var b = el("button", { type: "button", class: "ghost small-btn fold-toggle", "aria-controls": pre.id });
      function set(open) {
        openConds[key] = open;
        pre.classList.toggle("folded", !open);
        b.setAttribute("aria-expanded", open ? "true" : "false");
        b.textContent = open ? "Show fewer lines" : "Show the full prompt";
      }
      b.addEventListener("click", function () { set(!openConds[key]); });
      var row = pre.parentNode.querySelector(".actions");
      if (row) row.append(b); else pre.after(b);
      set(!!openConds[key]);
    });
  }
  if (conds) { new MutationObserver(foldPrompts).observe(conds, { childList: true }); foldPrompts(); }

  /* ---------- 4. privacy statement: shown on hover or keyboard focus ---------- */
  // It stays open while the pointer is over it, so it can be read and selected, and Escape closes it.
  var pv = $("privacy"), pvBtn = $("privacyBtn"), pvTimer, pvClosed = false;
  function pvShow(on) { if (!pv) return; clearTimeout(pvTimer); pv.classList.toggle("show", on); pvBtn.setAttribute("aria-expanded", on ? "true" : "false"); }
  if (pv && pvBtn) {
    pv.addEventListener("mouseenter", function () { pvClosed = false; pvShow(true); });
    pv.addEventListener("mouseleave", function () { clearTimeout(pvTimer); pvTimer = setTimeout(function () { if (!pv.contains(document.activeElement)) pvShow(false); }, 250); });
    pv.addEventListener("focusin", function () { if (!pvClosed) pvShow(true); });
    pv.addEventListener("focusout", function (e) { if (!pv.contains(e.relatedTarget)) { pvClosed = false; pvShow(false); } });
    pvBtn.addEventListener("click", function () { pvClosed = false; pvShow(!pv.classList.contains("show")); });   // touch screens have no hover
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pv.classList.contains("show")) { pvClosed = true; pvShow(false); pvBtn.focus(); } });
  }

  window.LAB_STEPS = {
    reveal: reveal,
    go: function (i, focus) { if (build) build.go(i, focus); },
    mode: function () { return build ? build.mode() : "all"; },
    count: build ? build.count : 0,
    log: logSteps
  };
})();
