// Writes the protocol wording and the command texts into the documentation, from protocol.js,
// so the published specification always says exactly what the Lab gives researchers.
// Usage: node tools/protocol-docs.mjs          (update the documents)
//        node tools/protocol-docs.mjs --check  (exit with an error if they are out of date)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
globalThis.self = globalThis.self || globalThis;
require(path.join(root, "protocol.js"));
const P = globalThis.LAB_PROTOCOL;
const S = "SPL-S-20261127-7F3K";

const blocks = {
  core: "```text\n" + P.coreProtocol({ session: S }) + "\n```",
  "core-off": "```text\n" + P.coreProtocol({ session: S, reminders: "off", initialRecord: false }).split("\n").slice(-3).join("\n") + "\n```",
  commands: P.COMMANDS.map((c) => "### SPL: " + c.name + "\n\n" + c.use + "\n\n```text\n" + P.commandText(c.id, S) + "\n```").join("\n\n"),
  fields: "| Field | Key | Required | Can the AI usually establish it? | May remain unavailable | Where to look |\n|---|---|---|---|---|---|\n" +
    P.FIELDS.map((f) => "| " + f.label + " | `" + f.id + "` | " + (f.required ? "Yes" : "Where available") + " | " + { partly: "Partly", rarely: "Rarely", no: "No" }[f.ai] + " | " + (f.may ? "Yes" : "No") + " | " + f.where + " |").join("\n"),
  taxonomy: "| Category | Key | Definition |\n|---|---|---|\n" + P.TAXONOMY.map((t) => "| " + t.label + " | `" + t.id + "` | " + t.def + " |").join("\n")
};

const files = ["docs/research-session-protocol.md", "docs/research-session-commands.md", "docs/research-metadata.md", "docs/follow-up-taxonomy.md"];
const check = process.argv.includes("--check");
let stale = [];
for (const f of files) {
  const file = path.join(root, f);
  const before = fs.readFileSync(file, "utf8");
  const after = before.replace(/<!-- generated:([a-z-]+) -->[\s\S]*?<!-- \/generated -->/g, (all, name) => {
    if (!(name in blocks)) throw new Error(f + ": unknown generated block " + name);
    return "<!-- generated:" + name + " -->\n" + blocks[name] + "\n<!-- /generated -->";
  });
  if (after !== before) { stale.push(f); if (!check) fs.writeFileSync(file, after); }
}
if (check && stale.length) { console.error("Out of date (run node tools/protocol-docs.mjs): " + stale.join(", ")); process.exit(1); }
if (!check) console.log(stale.length ? "Updated: " + stale.join(", ") : "Already up to date.");
