/* Scholarly Prompt Lab: registers offline support and the optional "Install" button. */
(function () {
  "use strict";
  var status = document.getElementById("offlineStatus");
  var btn = document.getElementById("installBtn");
  function say(msg) { if (status) status.textContent = msg; }

  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) {
    // opened as a downloaded file, or an old browser: the Lab still works, just without the offline copy
    return;
  }
  function askStatus() {
    navigator.serviceWorker.ready.then(function (reg) { if (reg.active) reg.active.postMessage({ type: "status" }); });
  }
  navigator.serviceWorker.addEventListener("message", function (e) {
    var d = e.data || {};
    if (d.type !== "status") return;
    if (!d.missing.length) say("Saved on this device (version " + d.version + ", " + d.files + " files checked): the Lab opens without an internet connection.");
    else say("Not yet fully saved for offline use: " + d.missing.length + " of " + d.files + " files are missing. Stay online and reload the page to finish.");
  });
  navigator.serviceWorker.addEventListener("controllerchange", askStatus);
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(askStatus).catch(function () {
      say("Offline use could not be set up in this browser. The Lab still works while you are online.");
    });
  });

  var deferred = null;
  var help = document.getElementById("installHelp");
  var installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  // Some browsers offer their own install prompt; others install only from their menu, and some cannot install at all.
  function guidance() {
    var ua = navigator.userAgent;
    var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) return "To install, tap the Share button, then Add to Home Screen.";
    if (/Firefox\//.test(ua) && !/Android/.test(ua)) return "This browser cannot install web apps. To install the Lab, open it in Chrome, Edge or Safari. You can also bookmark this page.";
    if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return "To install, choose File, then Add to Dock.";
    if (/Android/.test(ua)) return "To install, open your browser's menu and choose Install app or Add to Home screen.";
    return "To install, open your browser's menu and choose Install. If the option is missing, the Lab may already be installed on this device.";
  }
  if (btn && !installed) {
    btn.hidden = false;
    // one brief, gentle signal after the page settles; none for people who ask for reduced motion
    setTimeout(function () { btn.classList.add("attention"); }, 1500);
    btn.addEventListener("animationend", function () { btn.classList.remove("attention"); });
  }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (btn && !installed) btn.hidden = false;
  });
  if (btn) btn.addEventListener("click", function () {
    if (!deferred) { if (help) help.textContent = guidance(); return; }
    if (help) help.textContent = "";
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; btn.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { if (btn) btn.hidden = true; if (help) help.textContent = ""; say("Installed. Open it from your home screen or apps list, online or offline."); });
  window.addEventListener("offline", function () { say("You are offline. The Lab keeps working, and your work stays saved in this browser."); });
  window.addEventListener("online", function () { say("Back online."); });
})();
