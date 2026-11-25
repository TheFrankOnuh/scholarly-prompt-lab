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
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(function () {
      return navigator.serviceWorker.ready;
    }).then(function () {
      say("Saved on this device: the Lab now opens without an internet connection.");
    }).catch(function () { /* offline support is optional */ });
  });

  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (btn) btn.hidden = false;
  });
  if (btn) btn.addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; btn.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { if (btn) btn.hidden = true; say("Installed. Open it from your home screen or apps list, online or offline."); });
  window.addEventListener("offline", function () { say("You are offline. The Lab keeps working, and your work stays saved in this browser."); });
  window.addEventListener("online", function () { say("Back online."); });
})();
