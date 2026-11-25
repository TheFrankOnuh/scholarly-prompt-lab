// Sets the Lab's version number in every place it appears. Usage: node tools/set-version.mjs 0.12.1 [versionDoi]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [v, doi = ""] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(v || "")) { console.error("Give a version such as 0.12.1"); process.exit(1); }
const edit = (file, fn) => { const p = path.join(ROOT, file); const a = fs.readFileSync(p, "utf8"); const b = fn(a); if (a !== b) fs.writeFileSync(p, b); };
edit("release.js", (s) => s.replace(/version: "[^"]*"/, 'version: "' + v + '"').replace(/versionDoi: "[^"]*"/, 'versionDoi: "' + doi + '"'));
edit("index.html", (s) => s.replace(/\?v=[0-9.]+"/g, '?v=' + v + '"'));
edit("CITATION.cff", (s) => s.replace(/^version: .*$/m, "version: " + v).replace(/^date-released: .*$/m, "date-released: " + new Date().toISOString().slice(0, 10)));
edit("README.md", (s) => s.replace(/\(Version [0-9.]+\) \[Computer software\]/, "(Version " + v + ") [Computer software]"));
console.log("Version set to " + v + (doi ? " with DOI " + doi : ""));
