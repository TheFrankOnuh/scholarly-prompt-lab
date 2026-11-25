// Checks that the visit counter counts a visit and can never send research content.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "..", "counter.js"), "utf8");
// load a copy of the counter with a site name set, so what it would send can be inspected
function load(code) {
  const ctx = {};
  const set = src.replace(/var CODE = "[^"]*";/, 'var CODE = "' + code + '";');
  new Function("self", set)(ctx);
  return ctx.LAB_COUNTER;
}
const live = (o) => Object.assign({
  location: { protocol: "https:", hostname: "thefrankonuh.github.io", pathname: "/scholarly-prompt-lab/", search: "" },
  navigator: {}, referrer: "", screen: { width: 1440, height: 900 }, dpr: 2
}, o);

test("the counter reads nothing the researcher types, loads or stores", () => {
  for (const banned of ["localStorage", "sessionStorage", "indexedDB", "document.cookie", "getElementById", "querySelector", ".value", "LAB_APP", "caches"]) {
    assert.ok(!src.includes(banned), "counter.js must not use " + banned);
  }
});

test("the counter is set to the Lab's own GoatCounter site", () => {
  assert.match(src, /var CODE = "scholarly-prompt-lab";/);
});

test("with no site name set, nothing is ever sent", () => {
  const C = load("");
  assert.equal(C.enabled(), false);
  assert.equal(C.visitUrl(live()), null);
});

test("a visit sends only the page, the linking site, the screen and a campaign label", () => {
  const C = load("spl");
  const u = new URL(C.visitUrl(live({ referrer: "https://www.linkedin.com/feed/update/12345?trk=abc", location: { protocol: "https:", hostname: "thefrankonuh.github.io", pathname: "/scholarly-prompt-lab/", search: "?ref=harvard&secret=x&utm_source=qr" } })));
  assert.equal(u.hostname, "spl.goatcounter.com");
  assert.deepEqual([...u.searchParams.keys()].sort(), ["p", "q", "r", "rnd", "s"]);
  assert.equal(u.searchParams.get("p"), "/scholarly-prompt-lab/");
  assert.equal(u.searchParams.get("r"), "https://www.linkedin.com/", "only the linking site, never the full address");
  assert.equal(u.searchParams.get("q"), "?ref=harvard&utm_source=qr", "only campaign labels are kept");
  assert.equal(u.searchParams.get("s"), "1440,900,2");
});

test("visits from the Lab's own pages do not count as referrals", () => {
  const C = load("spl");
  const u = new URL(C.visitUrl(live({ referrer: "https://thefrankonuh.github.io/scholarly-prompt-lab/#log" })));
  assert.equal(u.searchParams.has("r"), false);
});

test("no visit is counted when the browser asks not to be tracked", () => {
  const C = load("spl");
  assert.equal(C.visitUrl(live({ navigator: { doNotTrack: "1" } })), null);
  assert.equal(C.visitUrl(live({ navigator: { globalPrivacyControl: true } })), null);
});

test("no visit is counted from a file, from development copies or over plain http", () => {
  const C = load("spl");
  for (const loc of [
    { protocol: "file:", hostname: "", pathname: "/C:/lab/index.html" },
    { protocol: "https:", hostname: "localhost", pathname: "/" },
    { protocol: "https:", hostname: "127.0.0.1", pathname: "/" },
    { protocol: "https:", hostname: "lab.test", pathname: "/" },
    { protocol: "http:", hostname: "example.org", pathname: "/" }
  ]) assert.equal(C.visitUrl(live({ location: loc })), null, loc.protocol + loc.hostname);
});
