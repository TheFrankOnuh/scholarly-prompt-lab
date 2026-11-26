/* Scholarly Prompt Lab: page layout helpers.
   1. The Build tab as seven steps with a progress rail, or all steps at once.
   2. On small screens, the prompt panel as a sheet fixed to the bottom of the screen.
   3. The privacy link in the top bar opens the privacy statement in the footer.
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

  /* ---------- 1. steps ---------- */
  var form = $("builder");
  var sets = form ? Array.prototype.filter.call(form.children, function (n) { return n.tagName === "FIELDSET"; }) : [];
  var KEY_MODE = "spl.ui.mode", KEY_STEP = "spl.ui.step";
  var mode = read(localStorage, KEY_MODE) === "all" ? "all" : "steps";
  var cur = Math.min(sets.length - 1, Math.max(0, parseInt(read(sessionStorage, KEY_STEP) || "0", 10) || 0));
  var titles = sets.map(function (fs) { var t = fs.querySelector(".leg-title"); return t ? t.textContent.trim() : "Step"; });
  var railBtns = [], toggle, live;

  // a step counts as started once any of its own answers has content (search boxes and add-forms do not count)
  function started(fs) {
    var f = fs.querySelectorAll("input, textarea");
    for (var i = 0; i < f.length; i++) {
      var x = f[i];
      if (x.closest("#addTheoryForm, #discAddForm, .picker-search") || x.id === "theorySearch" || x.type === "file") continue;
      if (x.type === "checkbox" || x.type === "radio") { if (x.checked) return true; }
      else if (x.type !== "button" && x.type !== "submit" && x.value && x.value.trim()) return true;
    }
    return false;
  }

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
    if (toggle) {
      toggle.textContent = mode === "steps" ? "Show all steps on one page" : "Show one step at a time";
      toggle.setAttribute("aria-pressed", mode === "all" ? "true" : "false");
    }
    if (form) form.classList.toggle("stepped", mode === "steps");
    // on narrow screens the rail scrolls sideways: keep the current step in view
    var list = railBtns.length ? railBtns[0].closest("ol") : null;
    if (list && list.scrollWidth > list.clientWidth && railBtns[cur]) list.scrollLeft = Math.max(0, railBtns[cur].parentNode.offsetLeft - list.offsetLeft - 8);
  }

  function go(i, focus) {
    if (i < 0 || i >= sets.length) return;
    cur = i;
    write(sessionStorage, KEY_STEP, String(i));
    if (mode === "all") {
      // in the all-steps view the rail moves to the step instead
      sets[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      return;
    }
    render();
    if (live) live.textContent = "Step " + (i + 1) + " of " + sets.length + ": " + titles[i];
    if (focus) {
      sets[i].setAttribute("tabindex", "-1");
      sets[i].focus({ preventScroll: true });
      var top = rail.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) rail.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  // show the step that holds an element, so links, the demo and file loading always land on something visible
  function reveal(target) {
    if (!target || !target.closest) return;
    var fs = target.closest("#builder > fieldset");
    if (fs && mode === "steps") { var i = sets.indexOf(fs); if (i !== -1 && i !== cur) go(i, false); }
    var sheet = target.closest(".sheet");
    if (sheet) openSheet(true);
  }

  var rail = null;
  if (form && sets.length) {
    rail = el("nav", { class: "stepper", "aria-label": "Steps in building your prompt" });
    var ol = el("ol");
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
    toggle = el("button", { type: "button", class: "ghost small-btn step-mode" });
    toggle.addEventListener("click", function () {
      mode = mode === "steps" ? "all" : "steps";
      write(localStorage, KEY_MODE, mode);
      render();
    });
    live = el("p", { class: "vh", role: "status" });
    rail.append(ol, toggle, live);
    // the rail spans the full width above the form and the prompt panel
    var grid = form.parentNode;
    grid.parentNode.insertBefore(rail, grid);

    sets.forEach(function (fs, i) {
      var nav = el("div", { class: "step-nav" });
      if (i > 0) {
        var back = el("button", { type: "button", class: "ghost", text: "Back" });
        back.addEventListener("click", function () { go(i - 1, true); });
        nav.append(back);
      }
      var next;
      if (i < sets.length - 1) {
        next = el("button", { type: "button", text: "Next: " + titles[i + 1] });
        next.addEventListener("click", function () { go(i + 1, true); });
      } else {
        next = el("button", { type: "button", text: "Done: review and copy your prompt" });
        next.addEventListener("click", function () {
          var c = $("copyPrompt");
          openSheet(true);
          if (c) { c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); c.focus({ preventScroll: true }); }
        });
      }
      nav.append(next);
      fs.append(nav);
    });
    var t;
    form.addEventListener("input", function () { clearTimeout(t); t = setTimeout(render, 250); });
    form.addEventListener("change", function () { clearTimeout(t); t = setTimeout(render, 250); });
    render();
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

  /* ---------- 3. privacy link ---------- */
  document.querySelectorAll('a[href="#privacy"]').forEach(function (a) {
    a.addEventListener("click", function () { var d = $("privacy"); if (d) d.open = true; });
  });

  window.LAB_STEPS = { reveal: reveal, go: go, mode: function () { return mode; }, count: sets.length };
})();
