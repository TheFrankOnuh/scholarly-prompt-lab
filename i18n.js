/* Scholarly Prompt Lab: the interface in other languages.
   The English wording in the page is the source. A language dictionary (locales.js) maps each English string to its
   translation, and this file swaps the visible text and the placeholder, label and title attributes of the interface.
   Text the Lab adds later is translated as it appears. The Language menu in the header switches language; the choice
   is remembered on this device.
   Never translated: the prompt sent to an AI system, the methods report, the theory library, the worked examples,
   and everything the researcher types. Nothing here sends anything anywhere. */
(function () {
  "use strict";
  var LOCALES = window.LAB_LOCALES || {};
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  var offered = Object.keys(LOCALES).filter(function (k) { return LOCALES[k].meta && LOCALES[k].meta.offered; });
  var params = new URLSearchParams(location.search);
  // ?lang=xx chooses a language from a link; a language not yet offered opens only with &draft=1, for its reviewers
  var asked = params.get("lang");
  if (asked && (asked === "en" || offered.indexOf(asked) !== -1)) write("spl.ui.lang", asked);
  var lang = asked || read("spl.ui.lang") || "en";
  var dict = LOCALES[lang];
  var allowed = dict && (offered.indexOf(lang) !== -1 || params.get("draft") === "1");
  var api = { lang: "en", languages: ["en"].concat(offered), t: function (s) { return s; } };
  window.LAB_I18N = api;

  // the Language menu: choosing a language saves any unsaved work, remembers the choice and reloads the page in it
  var menu = document.getElementById("langSel");
  if (menu) {
    menu.value = allowed ? lang : "en";
    menu.addEventListener("change", function () {
      try { if (window.LAB_APP && window.LAB_APP.flush) window.LAB_APP.flush(); } catch (e) { /* ignore */ }
      write("spl.ui.lang", menu.value);
      // a link's ?lang would override the choice, so drop it; otherwise reload in place (a #section alone would not reload)
      var u = new URL(location.href);
      if (u.searchParams.has("lang") || u.searchParams.has("draft")) {
        u.searchParams.delete("lang"); u.searchParams.delete("draft");
        location.replace(u.pathname + u.search + u.hash);
      } else location.reload();
    });
  }
  if (!allowed || lang === "en") return;

  var S = dict.strings;
  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };
  function has(k) { return Object.prototype.hasOwnProperty.call(S, k); }
  function t(s) { var k = norm(s); return has(k) ? S[k] : s; }
  var KEEP = "script, style, textarea, input, select#example, #projSelect, #langSel, #prompt, .prompt, #reportPreview, .report, #theoryList, #theoryChips, #entries, code, pre";
  var ATTRS = ["placeholder", "aria-label", "title"];

  function textNode(n) {
    var p = n.parentElement;
    if (!p || p.closest(KEEP)) return;
    var v = n.nodeValue, k = norm(v);
    if (!k || !has(k)) return;
    n.nodeValue = v.match(/^\s*/)[0] + S[k] + v.match(/\s*$/)[0];
  }
  function element(el) {
    if (el.closest && el.closest("script, style, #prompt, .prompt, #reportPreview, .report")) return;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (v && has(norm(v))) el.setAttribute(a, S[norm(v)]);
    });
  }
  function translate(root) {
    if (root.nodeType === 3) { textNode(root); return; }
    if (root.nodeType !== 1) return;
    element(root);
    root.querySelectorAll("[placeholder], [aria-label], [title]").forEach(element);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) textNode(n);
  }

  translate(document.body);
  document.documentElement.lang = lang;
  new MutationObserver(function (list) {
    list.forEach(function (m) { m.addedNodes.forEach(translate); });
  }).observe(document.body, { childList: true, subtree: true });

  // until a fluent speaker has reviewed a translation, the Lab says so, in that language
  if (!dict.meta.reviewed) {
    var note = document.createElement("p");
    note.className = "small muted i18n-note";
    note.textContent = t("Translation under review: some wording may change.");
    var foot = document.querySelector(".footer");
    if (foot) foot.insertBefore(note, foot.firstChild);
  }
  api.lang = lang; api.t = t;
})();
