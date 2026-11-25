/* Scholarly Prompt Lab: research projects.
   A researcher can keep several studies apart. Each project has its own questions, theories, sources,
   prompt, log, scores and report details. The project that is open lives in the Lab's ordinary storage
   keys, so the rest of the Lab works exactly as before. The other projects are parked, one record each.
   Theories and disciplines a researcher has added are shared by all projects. */
(function (root) {
  "use strict";
  var INDEX = "spl.projects.v1";
  var PREFIX = "spl.project.";
  var KEYS = ["spl.draft.v1", "spl.log.v1", "spl.sources.v1", "spl.logform.v1", "spl.report.v1"];
  var FORMAT = "scholarly-prompt-lab-project";

  function cleanName(n) {
    n = String(n == null ? "" : n).replace(/\s+/g, " ").trim().slice(0, 80);
    return n || "Untitled project";
  }

  function make(storage, clock) {
    var now = clock || function () { return new Date().toISOString(); };
    var counter = 0;
    function newId() { counter += 1; return "p" + Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 6); }

    function readIndex() {
      try {
        var o = JSON.parse(storage.getItem(INDEX) || "null");
        if (o && Array.isArray(o.list) && o.list.length && o.list.some(function (p) { return p && p.id === o.current; })) return o;
      } catch (e) { /* fall through */ }
      return null;
    }
    function writeIndex(ix) { storage.setItem(INDEX, JSON.stringify(ix)); }
    // The first time the Lab runs with projects, whatever is already saved becomes the first project.
    function ensure() {
      var ix = readIndex();
      if (ix) return ix;
      var id = newId();
      ix = { current: id, list: [{ id: id, name: "My first project", created: now() }] };
      try { writeIndex(ix); } catch (e) { /* storage full: the Lab still works with one project */ }
      return ix;
    }
    function snapshot() {
      var d = {};
      KEYS.forEach(function (k) { var v = storage.getItem(k); if (v !== null && v !== undefined) d[k] = v; });
      return d;
    }
    function clearOpen() { KEYS.forEach(function (k) { storage.removeItem(k); }); }
    function open(d) {
      clearOpen();
      Object.keys(d).forEach(function (k) { if (KEYS.indexOf(k) !== -1 && typeof d[k] === "string") storage.setItem(k, d[k]); });
    }
    function parked(id) {
      try { var o = JSON.parse(storage.getItem(PREFIX + id) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
    }
    function dataOf(id) { return id === ensure().current ? snapshot() : parked(id); }
    function find(ix, id) { return ix.list.filter(function (p) { return p.id === id; })[0] || null; }

    function summary(d) {
      var out = { sources: 0, runs: 0, question: "" };
      try {
        var draft = JSON.parse(d["spl.draft.v1"] || "{}") || {};
        out.question = String(draft.question || "").split("\n")[0].trim().slice(0, 120);
        var tags = String(draft.sourceText || "").match(/\[DOC-\d+/g);
        out.sources = tags ? tags.length : (String(draft.sourceText || "").trim() ? 1 : 0);
      } catch (e) { /* unreadable draft counts as empty */ }
      try { var log = JSON.parse(d["spl.log.v1"] || "[]"); out.runs = Array.isArray(log) ? log.length : 0; } catch (e) { /* ignore */ }
      return out;
    }

    function list() {
      var ix = ensure();
      return ix.list.map(function (p) {
        var s = summary(dataOf(p.id));
        return { id: p.id, name: p.name, created: p.created, current: p.id === ix.current, sources: s.sources, runs: s.runs, question: s.question };
      });
    }

    // Switching never loses work: the open project is parked first, and if the browser's storage is too full
    // to finish, everything is put back as it was.
    function switchTo(id) {
      var ix = ensure();
      if (id === ix.current) return { ok: true };
      if (!find(ix, id)) return { ok: false, reason: "missing" };
      var cur = snapshot(), target = parked(id), curId = ix.current;
      try { storage.setItem(PREFIX + curId, JSON.stringify(cur)); } catch (e) { try { storage.removeItem(PREFIX + curId); } catch (e2) { /* ignore */ } return { ok: false, reason: "full" }; }
      try {
        open(target);
        ix.current = id;
        writeIndex(ix);
      } catch (e) {
        try { clearOpen(); storage.removeItem(PREFIX + curId); open(cur); ix.current = curId; writeIndex(ix); } catch (e2) { /* nothing more can be done */ }
        return { ok: false, reason: "full" };
      }
      storage.removeItem(PREFIX + id);
      return { ok: true };
    }

    function create(name, data) {
      var ix = ensure(), id = newId();
      var d = {};
      Object.keys(data || {}).forEach(function (k) { if (KEYS.indexOf(k) !== -1 && typeof data[k] === "string") d[k] = data[k]; });
      try {
        storage.setItem(PREFIX + id, JSON.stringify(d));
        ix.list.push({ id: id, name: cleanName(name), created: now() });
        writeIndex(ix);
      } catch (e) {
        try { storage.removeItem(PREFIX + id); } catch (e2) { /* ignore */ }
        return { ok: false, reason: "full" };
      }
      return { ok: true, id: id };
    }

    function rename(id, name) {
      var ix = ensure(), p = find(ix, id);
      if (!p) return { ok: false, reason: "missing" };
      p.name = cleanName(name);
      try { writeIndex(ix); } catch (e) { return { ok: false, reason: "full" }; }
      return { ok: true };
    }

    function duplicate(id) {
      var ix = ensure(), p = find(ix, id);
      if (!p) return { ok: false, reason: "missing" };
      return create(cleanName(p.name + " (copy)"), dataOf(id));
    }

    function remove(id) {
      var ix = ensure();
      if (!find(ix, id)) return { ok: false, reason: "missing" };
      if (ix.list.length < 2) return { ok: false, reason: "last" };
      if (id === ix.current) {
        var other = ix.list.filter(function (p) { return p.id !== id; })[0];
        open(parked(other.id));              // the deleted project's data goes, so this always fits
        storage.removeItem(PREFIX + other.id);
        ix.current = other.id;
      } else {
        storage.removeItem(PREFIX + id);
      }
      ix.list = ix.list.filter(function (p) { return p.id !== id; });
      writeIndex(ix);
      return { ok: true };
    }

    function exportProject(id, labVersion) {
      var ix = ensure(), p = find(ix, id);
      if (!p) return null;
      return { format: FORMAT, formatVersion: 1, labVersion: labVersion || "", name: p.name, exported: now(), data: dataOf(id) };
    }

    // A backup file comes from outside, so it is checked before anything is stored.
    function importProject(o) {
      if (!o || typeof o !== "object" || o.format !== FORMAT) return { ok: false, reason: "format" };
      if (!o.data || typeof o.data !== "object" || Array.isArray(o.data)) return { ok: false, reason: "format" };
      var d = {}, bad = false;
      Object.keys(o.data).forEach(function (k) {
        if (KEYS.indexOf(k) === -1) return;                       // unknown keys are ignored
        if (typeof o.data[k] !== "string") { bad = true; return; }
        try { JSON.parse(o.data[k]); } catch (e) { bad = true; return; }
        d[k] = o.data[k];
      });
      if (bad) return { ok: false, reason: "format" };
      return create(cleanName(o.name), d);
    }

    return { ensure: ensure, list: list, switchTo: switchTo, create: create, rename: rename, duplicate: duplicate, remove: remove,
      exportProject: exportProject, importProject: importProject, current: function () { return ensure().current; } };
  }

  root.LAB_PROJECTS = { make: make, KEYS: KEYS, FORMAT: FORMAT, cleanName: cleanName };

  /* ---------- the page ---------- */
  if (typeof document === "undefined" || !document.getElementById("projSelect")) return;
  var P;
  try { P = make(window.localStorage); P.ensure(); } catch (e) { return; }
  var A = window.LAB_APP || {};
  var $ = function (id) { return document.getElementById(id); };
  var FULL = "This browser's storage is too full to do that. Back up a project to a file, delete it here, then try again.";

  function say(msg) { $("projMsg").textContent = msg; }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { n.append(c); });
    return n;
  }
  function count(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  function demoRunning() { try { return !!localStorage.getItem("spl.tourBackup"); } catch (e) { return false; } }
  // typed work is saved a moment after typing stops, so it is saved now before a project is parked
  function saveNow() { if (A.flush) { try { A.flush(); } catch (e) { /* ignore */ } } }
  function reload() { location.hash = "#build"; location.reload(); }
  function failed(r) { say(r.reason === "full" ? FULL : r.reason === "last" ? "A project cannot be deleted while it is the only one." : "That did not work. Nothing was changed."); }

  function go(id) {
    if (demoRunning()) { say("End the demo before changing project."); render(); return; }
    saveNow();
    var r = P.switchTo(id);
    if (r.ok) reload(); else { failed(r); render(); }
  }

  function render() {
    var items = P.list(), sel = $("projSelect"), body = $("projList");
    sel.textContent = "";
    items.forEach(function (p) { var o = el("option", { value: p.id, text: p.name }); if (p.current) o.selected = true; sel.append(o); });
    body.textContent = "";
    items.forEach(function (p) {
      var actions = el("td", { class: "proj-actions" });
      function btn(label, fn) { var b = el("button", { type: "button", class: "ghost small", text: label, "aria-label": label + ": " + p.name }); b.addEventListener("click", fn); actions.append(b); }
      if (!p.current) btn("Open", function () { go(p.id); });
      btn("Rename", function () {
        var n = prompt("New name for this project", p.name);
        if (n === null) return;
        var r = P.rename(p.id, n); if (r.ok) { say("Renamed."); render(); } else failed(r);
      });
      btn("Duplicate", function () {
        saveNow();
        var r = P.duplicate(p.id); if (r.ok) { say("A copy of “" + p.name + "” was made."); render(); } else failed(r);
      });
      btn("Back up", function () {
        saveNow();
        var file = P.exportProject(p.id, A.VERSION);
        var name = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
        if (A.download) A.download(name + ".spl-project.json", JSON.stringify(file, null, 2), "application/json");
        say("Backup file saved for “" + p.name + "”.");
      });
      if (items.length > 1) btn("Delete", function () {
        if (demoRunning()) { say("End the demo before deleting a project."); return; }
        if (!confirm("Delete the project “" + p.name + "” with its " + count(p.sources, "source") + " and " + count(p.runs, "logged run") + "? This cannot be undone. Back it up first if you may need it.")) return;
        var wasCurrent = p.current, r = P.remove(p.id);
        if (!r.ok) { failed(r); return; }
        if (wasCurrent) reload(); else { say("Deleted."); render(); }
      });
      body.append(el("tr", {}, [
        el("th", { scope: "row" }, [p.name, p.current ? el("span", { class: "proj-open", text: " Open now" }) : ""]),
        el("td", { text: p.question || "No research question yet" }),
        el("td", { text: count(p.sources, "source") }),
        el("td", { text: count(p.runs, "logged run") }),
        actions
      ]));
    });
    $("projCount").textContent = "(" + items.length + ")";
  }

  $("projSelect").addEventListener("change", function () { go($("projSelect").value); });
  $("projNew").addEventListener("click", function () {
    if (demoRunning()) { say("End the demo before starting a new project."); return; }
    var n = prompt("Name of the new project", "");
    if (n === null) return;
    saveNow();
    // a new project starts with an empty form, not with the worked example shown to first-time visitors
    var r = P.create(n, A.BLANK ? { "spl.draft.v1": JSON.stringify(A.BLANK) } : {});
    if (!r.ok) { failed(r); return; }
    var s = P.switchTo(r.id);
    if (s.ok) reload(); else { failed(s); render(); }
  });
  $("projRestore").addEventListener("click", function () { $("projFile").click(); });
  $("projFile").addEventListener("change", function () {
    var f = $("projFile").files[0];
    if (!f) return;
    if (f.size > 12 * 1024 * 1024) { say("That file is too large to be a project backup."); $("projFile").value = ""; return; }
    var reader = new FileReader();
    reader.onload = function () {
      var o = null;
      try { o = JSON.parse(String(reader.result)); } catch (e) { /* handled below */ }
      var r = P.importProject(o);
      if (r.ok) { say("Project restored. Choose Open to work on it."); render(); }
      else say(r.reason === "full" ? FULL : "That file is not a Scholarly Prompt Lab project backup.");
      $("projFile").value = "";
    };
    reader.onerror = function () { say("The file could not be read."); };
    reader.readAsText(f);
  });
  render();
})(typeof self !== "undefined" ? self : globalThis);
