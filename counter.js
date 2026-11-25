/* Scholarly Prompt Lab: visit counter.
   When the Lab is opened online, one visit is counted by GoatCounter (goatcounter.com), a privacy-friendly,
   open-source counter. It receives four things only: the page address, the website that linked here,
   the screen size and, when a link carries one, a campaign label such as ?ref=harvard.
   It never reads what the researcher types or loads, sets no cookies, and does not record who anyone is.
   No visit is counted when the browser asks sites not to track it, when the Lab is opened from a file
   or on this computer for development, or while offline.
   CODE is the name of the Lab's GoatCounter site. While it is empty, nothing is ever sent. */
(function (root) {
  "use strict";
  var CODE = "scholarly-prompt-lab";
  var CAMPAIGN = /^(ref|utm_source|utm_medium|utm_campaign)$/;

  function visitUrl(env) {
    if (!CODE || !env || !env.location) return null;
    var loc = env.location;
    if (!/^https:$/.test(loc.protocol)) return null;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/.test(loc.hostname)) return null;
    var nav = env.navigator || {};
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return null;
    var q = [];
    String(loc.search || "").replace(/^\?/, "").split("&").forEach(function (pair) {
      var k = pair.split("=")[0];
      if (CAMPAIGN.test(k)) q.push(pair.slice(0, 80));
    });
    var ref = "";
    try { var r = new URL(env.referrer || ""); if (r.hostname !== loc.hostname) ref = r.protocol + "//" + r.hostname + "/"; } catch (e) { /* no referrer */ }
    var scr = env.screen ? [env.screen.width, env.screen.height, env.dpr || 1].join(",") : "";
    var p = loc.pathname || "/";
    return "https://" + CODE + ".goatcounter.com/count?p=" + encodeURIComponent(p) +
      (ref ? "&r=" + encodeURIComponent(ref) : "") +
      (q.length ? "&q=" + encodeURIComponent("?" + q.join("&")) : "") +
      (scr ? "&s=" + encodeURIComponent(scr) : "") +
      "&rnd=" + Math.random().toString(36).slice(2, 8);
  }

  root.LAB_COUNTER = { visitUrl: visitUrl, enabled: function () { return !!CODE; } };

  if (typeof document === "undefined" || typeof window === "undefined") return;
  var url = visitUrl({ location: window.location, navigator: window.navigator, referrer: document.referrer, screen: window.screen, dpr: window.devicePixelRatio });
  if (!url) return;
  // an image request carries no script from the counter's side and sends no cookies
  var img = new Image();
  img.referrerPolicy = "no-referrer";
  img.src = url;
})(typeof self !== "undefined" ? self : globalThis);
