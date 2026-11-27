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

test("the fonts are stored with the Lab, in a cache kept apart from the release copy", () => {
  const sw = read("sw.js");
  const css = read("assets/fonts/fonts.css");
  const fs = require("node:fs"), path = require("node:path");
  const listed = [...sw.matchAll(/"(assets\/fonts\/[^"]+\.woff2)"/g)].map((m) => m[1]);
  assert.ok(listed.length >= 10, "sw.js must save the Latin fonts for offline use");
  for (const f of listed) assert.ok(fs.existsSync(path.join(__dirname, "..", f)), "sw.js lists a missing font: " + f);
  for (const m of css.matchAll(/url\("([^"]+)"\)/g)) assert.ok(fs.existsSync(path.join(__dirname, "..", "assets/fonts", m[1])), "fonts.css names a missing file: " + m[1]);
  assert.ok(!/https?:/.test(css.replace(/\/\*[\s\S]*?\*\//g, "")), "fonts must load from the Lab itself, never from a font service");
  assert.match(sw, /const FONT_CACHE = "spl-fonts-\d+"/);
  assert.ok(/k !== CACHE && k !== FONT_CACHE/.test(sw), "a new release must keep the saved fonts");
  assert.ok(sw.includes('"assets/fonts/fonts.css"'), "the font stylesheet belongs to the release copy");
  assert.ok(fs.existsSync(path.join(__dirname, "..", "assets/fonts/OFL-SourceSerif4.txt")) && fs.existsSync(path.join(__dirname, "..", "assets/fonts/OFL-IBMPlex.txt")), "the font licences must ship with the fonts");
});

test("text-style buttons stay readable on hover: they are never given the filled hover of a primary button", () => {
  const css = read("styles.css");
  // the general rule fills a button on hover; a button drawn as plain text must clear that fill
  const rules = css.split("}").map((r) => r.split("{")).filter((r) => r.length === 2);
  for (const sel of [".privacy-trigger:hover", "#reset:hover", "button.step-mode:hover", ".score-clear:hover", ".lib-toggle:hover"]) {
    const mine = rules.filter(([selectors]) => selectors.split(",").some((x) => x.trim().endsWith(sel)));
    assert.ok(mine.length, "no hover rule for " + sel);
    assert.ok(mine.some(([, body]) => /background: transparent/.test(body)), sel + " must keep a clear background on hover");
  }
});
