// Checks that every place the Lab states its version says the same thing.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
global.self = {};
require(path.join("..", "release.js"));
const REL = global.self.LAB_RELEASE;

test("release.js holds a well-formed version and DOIs", () => {
  assert.match(REL.version, /^\d+\.\d+\.\d+$/);
  assert.match(REL.conceptDoi, /^10\.5281\/zenodo\.\d+$/);
  assert.ok(REL.versionDoi === "" || /^10\.5281\/zenodo\.\d+$/.test(REL.versionDoi), "versionDoi");
  assert.notEqual(REL.versionDoi, REL.conceptDoi, "the version DOI must not be the all-versions DOI");
});

test("every asset tag in index.html carries the release version", () => {
  const tags = read("index.html").match(/\?v=[0-9.]+/g) || [];
  assert.ok(tags.length >= 10, "expected versioned asset tags");
  for (const t of tags) assert.equal(t, "?v=" + REL.version);
});

test("CITATION.cff and the README citation carry the release version", () => {
  assert.match(read("CITATION.cff"), new RegExp("^version: " + REL.version.replace(/\./g, "\\.") + "$", "m"));
  const m = /\(Version ([0-9.]+)\) \[Computer software\]/.exec(read("README.md"));
  assert.ok(m, "README has no citation line");
  assert.equal(m[1], REL.version);
});

test("no file hard-codes its own version number", () => {
  assert.ok(!/const VERSION = "\d/.test(read("app.js")), "app.js must take its version from release.js");
  const sw = read("sw.js");
  assert.ok(sw.includes('importScripts("release.js")') && !/const CACHE = "spl-v?\d/.test(sw), "sw.js must name its saved copy from release.js");
});

test("the saved copy is all-or-nothing and never mixes releases", () => {
  const sw = read("sw.js");
  assert.ok(sw.includes("cache.addAll("), "install must fail as a whole if any file fails");
  assert.ok(!/cache\.put\(/.test(sw), "files fetched online must not be added to the saved copy");
  assert.ok(!/\.catch\(\(\) => null\)/.test(sw), "caching failures must not be swallowed");
});
