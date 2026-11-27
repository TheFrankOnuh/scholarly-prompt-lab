# SPL Research Session Protocol

**Version 0.2 (draft).** Version 0.2 (Scholarly Prompt Lab 1.8.0) separates the AI provider from the product, adds the metadata fields of the full specification, and lets an AI-generated record mark reconstructed turns, suggest follow-up purposes, claims and decisions, and record a change of model. Records made under version 0.1 are read unchanged. This version has not yet been tested empirically. Its reliability across AI systems and conversation lengths is under study (see [Validation](#10-known-limitations-and-validation)). Until that study is done it should be described as an instruction-based documentation mechanism whose reliability is under study, not as a validated method.

The protocol is part of [Scholarly Prompt Lab](../README.md), but it is written so that other tools and researchers can use it on their own. This document is the authoritative specification. The protocol wording and the command texts below are generated from `protocol.js`, the code the Lab itself uses, by `node tools/protocol-docs.mjs`.

## 1. Purpose and scope

Research with generative AI is often conducted as a conversation: the researcher asks, reads the answer, then clarifies, challenges, corrects or extends it. Each of those interventions shapes the knowledge produced, and is part of the research method. The protocol supports the documentation of such conversations so that a reader can see how an interpretation developed and which researcher interventions preceded each development.

The protocol does three things:

1. It asks the AI system to keep to the research design, keep evidence apart from interpretation, test challenges against evidence, and never invent details about itself or the session.
2. It asks the AI system to report what it can establish about itself and the session, and to say what it cannot establish.
3. It gives the researcher commands that ask the AI system to produce a structured record of the conversation, which the Lab then checks.

**Original conversation records take precedence over AI-generated session records.** A record that an AI system writes about its own conversation is itself an AI output. It can drop, shorten or alter turns, especially long ones, and it cannot see turns that have left its context. The Lab therefore treats the original conversation (a transcript copied from the application, or a provider's data export) as the reference for verification, compares the AI-generated record with it turn by turn, and documents every discrepancy. Where only the AI-generated record exists, every view and every report says so.

## 2. Terms

The words **must**, **should** and **may** are used as in RFC 2119.

- **Session**: a documented research conversation, identified by a session identifier made by the Lab (for example `SPL-S-20261127-7F3K`), never by the AI system.
- **Turn**: one message, by the researcher or by the AI system.
- **Researcher prompt**: a turn written by the researcher, including the initial prompt and every follow-up.
- **AI response**: a turn written by the AI system.
- **Administrative exchange**: an SPL command, a metadata confirmation, or the AI system's reply to them. Kept in the record, marked as administrative, and excluded from scoring by default.
- **Checkpoint**: a record of the conversation so far, produced on request.
- **Completed session record**: the record produced when the researcher ends a documentation interval. The study itself may continue.
- **Record part**: one of several responses that together make up a long record.
- **Gap**: a place where a turn is known or suspected to be missing.
- **Original**: wording taken from the conversation itself, by copying or from a provider export.
- **AI-reproduced**: wording the AI system gave in a record. Unverified until compared with the original or confirmed by the researcher.
- **Reconstruction**: wording rebuilt from memory or inference. Must always be labelled as such and never presented as original.

## 3. The core protocol

The core protocol accompanies the initial research prompt, above it, followed by a divider line `--- RESEARCH PROMPT ---` and the prompt itself. The Lab inserts the session identifier and the reminder interval. The complete wording, with reminders every ten substantive researcher messages:

<!-- generated:core -->
```text
SPL RESEARCH SESSION PROTOCOL · version 0.2 · session SPL-S-20261127-7F3K
This conversation is a scholarly research session documented with Scholarly Prompt Lab. Answer the research prompt that follows this protocol as you normally would. Throughout the session:
1. Keep to the research question, sources and methodological instructions in this first message unless the researcher explicitly revises them. If you revise an earlier claim or depart from an instruction, say so, identify the earlier claim, and state whether the revision rests on new evidence or on a change of instructions, theoretical orientation or researcher preference.
2. Keep observations grounded in the sources apart from interpretations, hypotheses and methodological suggestions. Give the supporting evidence where the research design requires it. Mark source material introduced later in the session as additional.
3. When the researcher challenges an interpretation, test the challenge against the evidence. Do not adopt the researcher's position only because it has been expressed. State consequential uncertainty, missing evidence and limitations.
4. Keep the cultural, linguistic and historical context established for this session in later answers.
5. Never invent quotations, source identifiers, dates, model details, settings, researcher decisions or earlier exchanges. Report information about yourself and this session only if it is actually available to you. Otherwise write "unknown" or "not exposed by provider". Do not present an advertised model name as an exact version.
6. The researcher's decisions and final assessment are theirs to state. Do not assume agreement because the conversation continues.
7. After your first substantive answer, add a short section headed "SPL Research Session — Initial Record": the AI provider, product, model and settings you can actually establish, the session start date if available to you, and for each item you cannot establish, one line on where the researcher might find it. The research answer comes first.
8. Do not reproduce the conversation record unless the researcher sends a message beginning "SPL:". Those messages carry their own instructions. About every 10 substantive researcher messages, and when the model, sources or procedure change, an analytical stage ends, or the researcher says they will continue later, add one line headed "SPL Research Session — Checkpoint reminder" naming only the metadata still outstanding and the command "SPL: SAVE RESEARCH CHECKPOINT". Do not ask again for information already supplied. Stop the reminders if asked. If the researcher says the session has ended, mention "SPL: END RESEARCH SESSION".
9. Never ask for passwords, keys, tokens or private system instructions.
```
<!-- /generated -->

With reminders switched off and the initial record not requested, the last rules read:

<!-- generated:core-off -->
```text
6. The researcher's decisions and final assessment are theirs to state. Do not assume agreement because the conversation continues.
7. Do not reproduce the conversation record unless the researcher sends a message beginning "SPL:". Those messages carry their own instructions. Do not add reminders about documentation: the researcher will send those messages when needed.
8. Never ask for passwords, keys, tokens or private system instructions.
```
<!-- /generated -->

The core protocol is deliberately short. The detailed documentation duties, which matter only when a record is produced, travel inside the commands (section 5), which are sent only when needed.

**Influence on the conversation.** The protocol adds instructions, an opening section and reminders, and so is very likely to change the conversation being studied. Where the AI system's own behaviour is the object of study, the Lab recommends leaving the protocol off and documenting the conversation by transcript alone. Whether the protocol was used, and its reminder setting, are recorded with every conversation and can themselves be compared as study conditions.

## 4. The methodological requirements and where each is implemented

The protocol answers 25 requirements set out when it was designed. Each is listed with where it is implemented: in the core protocol (rule number), in a command, or in the Lab's own behaviour, which does not depend on the AI system.

| # | Requirement | Implemented by |
|---|---|---|
| 1 | Keep to the research question and methodological instructions. | Core rule 1 |
| 2 | Distinguish observations from interpretations, hypotheses and suggestions. | Core rule 2 |
| 3 | Identify the evidence for substantive claims where the design requires it. | Core rule 2 |
| 4 | When revising an interpretation, identify the earlier claim and the basis for the revision. | Core rule 1 |
| 5 | Distinguish revisions prompted by evidence from those prompted by instructions, theory or researcher preference. | Core rule 1 |
| 6 | Test challenges against evidence; do not adopt the researcher's position only because it was expressed. | Core rule 3 |
| 7 | Identify consequential uncertainty, missing evidence and limitations. | Core rule 3 |
| 8 | Distinguish source material introduced later. | Core rule 2 |
| 9 | Preserve cultural, linguistic and historical context. | Core rule 4 |
| 10 | Identify departures from earlier instructions. | Core rule 1 |
| 11 | Never invent identifiers, quotations, dates, model details, decisions or exchanges. | Core rule 5 |
| 12 | Treat the researcher's decisions as information the researcher must supply. | Core rule 6 |
| 13 | Preserve every researcher prompt verbatim in checkpoints and records. | Checkpoint and end commands; the Lab compares the record with the original |
| 14 | Pair each prompt with its response; omit nothing for relevance. | Checkpoint and end commands; Lab alignment detects omissions |
| 15 | Never paraphrase researcher prompts; mark missing turns; label reconstructions. | Checkpoint and end commands (GAP blocks); Lab text status |
| 16 | Keep original responses apart from summaries. | Transfer format (turns apart from SPL-NOTES) |
| 17 | Preserve original and revised versions of edited prompts where available. | Provider exports and the turn tree (`edited_from`); the AI system is asked only to acknowledge what it cannot see |
| 18 | Mention the closing command only when the researcher says the session has ended. | Core rule 8 |
| 19 | Report available information about the system, model, dates, settings and tools. | Core rules 5 and 7; review command |
| 20 | Give an opening metadata review after the first answer. | Core rule 7 |
| 21 | Remind the researcher at intervals; do not repeat confirmed requests. | Core rule 8 (configurable, or off) |
| 22 | Give a closing metadata review and include confirmed values. | End command |
| 23 | Never fabricate metadata; distinguish its sources. | Core rule 5; every command; Lab provenance model |
| 24 | Never request passwords, keys, tokens or private instructions. | Core rule 9 |
| 25 | Do not treat a reported value as verified; keep the original value when corrected. | Confirm command; Lab assertions are never overwritten |

## 5. Commands

Seven commands, each self-contained, so they work even when the AI system no longer has the original protocol in its context. The complete texts are in [research-session-commands.md](research-session-commands.md).

| Command | Purpose |
|---|---|
| `SPL: START RESEARCH SESSION` | Begin documentation in a conversation that did not start with the protocol |
| `SPL: REVIEW RESEARCH METADATA` | Show the metadata record and what is outstanding |
| `SPL: CONFIRM RESEARCH METADATA` | Record values the researcher supplies |
| `SPL: SAVE RESEARCH CHECKPOINT` | Produce a record of the conversation so far |
| `SPL: END RESEARCH SESSION` | Closing metadata review and the completed record |
| `SPL: RESUME RESEARCH SESSION` | Continue from a checkpoint in a new conversation or system |
| `SPL: RESEARCH SESSION STATUS` | A short account of where the session stands |

## 6. The three metadata reviews

| Review | Trigger | Content |
|---|---|---|
| Opening: "SPL Research Session — Initial Record" | After the first substantive answer (core rule 7) | What the AI system can establish about itself and the session, outstanding items, one line of guidance for each. Placed after the research answer. |
| Intermediate: checkpoint reminder | About every N substantive researcher messages (N set in the Lab; default 10, or off), and on a change of model, sources or procedure | One line: outstanding items and the checkpoint command. Nothing if all is confirmed. Stops if the researcher asks. |
| Closing: "SPL Research Session — Final Record" | `SPL: END RESEARCH SESSION` | Consolidated metadata, changes during the session, confirmed values, outstanding items with guidance, unavailable parts of the conversation, then the completed record. |

All three are administrative. The reviews ask the AI system to report; they do not make its report reliable. Every value the AI system gives is stored as AI-reported and unreviewed until the researcher confirms it. The fields, statuses and provenance model are in [research-metadata.md](research-metadata.md).

## 7. The record format

There are two forms.

### 7.1 Transfer format (written by the AI system)

Long verbatim text is fragile inside JSON written by a language model: every quotation mark, line break and code block must be escaped, and one mistake breaks the whole record. The AI system therefore writes:

1. a line `SPL-HEADER` and a short JSON object with the metadata, the turn range covered, the coverage it claims, whether it can see the start of the conversation, the gaps it knows of, and (as suggestions for the researcher) the claims it traced and the decisions the researcher stated;
2. each turn between delimiters that need no escaping:
   ```text
   <<<SPL-TURN 7 role=researcher>>>
   (the exact text)
   <<<SPL-END 7>>>
   ```
   with `kind=admin` for administrative turns, `exact=no` where the AI is not certain of the wording (the Lab records the turn as reconstructed), `purpose=` with suggested follow-up purposes, and `model="…"` on the first response from a different model;
3. a GAP block wherever a turn is missing:
   ```text
   <<<SPL-GAP after=6 missing=researcher_prompt>>>
   (why it is missing)
   <<<SPL-END GAP>>>
   ```
4. a line `SPL-NOTES` and the AI system's notes, kept apart from the verbatim turns.

A long record is split into numbered parts, each saying which turns it covers. A turn that starts without its end marker shows that a response was cut off; the Lab reports it and asks for the next part. An example is in [`schemas/examples/checkpoint-transfer.txt`](../schemas/examples/checkpoint-transfer.txt).

### 7.2 Canonical record (stored and exported by the Lab)

The Research Session Record, defined by [`schemas/spl-research-session-record.schema.json`](../schemas/spl-research-session-record.schema.json) (JSON Schema 2020-12). It is what the Lab stores, exports and validates. Every turn and every metadata value carries its provenance. The rules that matter most:

- Every turn has a stable identifier (`T001`, `T002` …), assigned in the order turns are recorded and never changed, so that evaluations, gaps, discrepancies and exports made at different times always refer to the same turn. A turn recorded later to fill a gap keeps its later identifier; its place in the conversation is given by `position`. Each turn also has a role, a kind, its text, a text status (`original`, `ai_reproduced`, `reconstructed`, `researcher_corrected`) and a provenance with an origin and a verification status.
- Metadata fields hold a list of assertions, oldest first. An assertion is never overwritten: a correction adds a new assertion.
- Gaps are explicit records, with what is missing and who reported it.
- Coverage is `complete` only when established against an original or confirmed by the researcher, and never while a gap is recorded or on the AI system's word alone.
- Discrepancies between an AI-reproduced record and the original are kept: the wording the AI gave, a turn it left out, a turn only it contains.

## 8. Originals, reconstructions, edits, regenerations and branches

- **Original wording** comes from the conversation itself. When a transcript or provider export is imported, its wording replaces AI-reproduced wording, and the AI's version is kept as a discrepancy.
- **AI-reproduced wording** stays labelled as such until it is compared with an original or confirmed by the researcher.
- **Reconstructed wording** must be labelled `reconstructed` and is never counted as original.
- **Researcher corrections** are layered: the text before, the text after, the reason and the time are kept.
- **Edited prompts and regenerated responses** are siblings in a tree: each turn has a parent (`parent_id`), a regenerated response is a sibling under the same prompt (`regenerated_from`), and an edited prompt is a sibling of the original (`edited_from`). The record names the branch the researcher has selected (`active_leaf`); every other branch is kept with its parents. Inside a chat, an AI system sees only the active path, so branch structure comes from a provider export, which records it, or from the researcher, who can add a regenerated response or an edited prompt to any turn. AI-generated records are compared with the active path only.
- **Reproduced records inside turns.** A completed record reproduces earlier turns verbatim, including the researcher's own SPL commands and any earlier checkpoint. Markers inside a turn's text belong to that text: a reader must take the outermost `<<<SPL-TURN n>>>` … `<<<SPL-END n>>>` pairs as the structure, and look for headers, gaps and notes only outside them.
- **Gaps filled later.** A gap is marked filled when a later record supplies a turn at that place; the turn keeps its own text status. A turn an AI record leaves out without declaring a gap is recorded as an omission; a gap the AI declared is not.
- **Sequential checkpoints**: each import is aligned with the turns already recorded. Turns already present are linked, not copied; only new turns are added. A complete available conversation is assembled from several checkpoints this way, and a later transcript fills the gaps the checkpoints declared.

## 9. Versioning

| Version | Lab release | Changes |
|---|---|---|
| 0.1 | 1.7.0 | First draft. |
| 0.2 | 1.8.0 | Provider and product recorded separately; tools used, retrieval, custom instructions, message timestamps added; `exact=`, `purpose=` and `model=` turn attributes; claims and decisions in the header; whether the AI can see the start of the conversation; the closing review produces the record at once, with missing items marked. |


- Any change to the wording of the core protocol, a command or the transfer format produces a new protocol version.
- Every conversation and every record keeps the protocol version it was made under (`protocol_version`), and the schema version it was written in (`schema_version`).
- The Lab reads records of every earlier version.
- Version 1.0 will be issued only after the validation in section 10.

## 10. Known limitations and validation

**Limitations.** An instruction cannot guarantee verbatim reproduction. AI systems often do not know their exact model version or the date; consumer applications rarely expose sampling settings; models count turns unreliably; hidden context (memory, custom instructions, project files) may not be visible to the researcher. The protocol and its reminders very likely change the conversation they document.

**Validation plan.** Reference conversations in three or four AI products, at about 6, 20 and 60 turns, under four conditions (no protocol; core protocol; core protocol with reminders; a different reminder interval), with the provider export or full transcript as ground truth. Outcomes, pre-registered: the proportion of researcher prompts reproduced exactly; altered wording with a character-level edit distance; omitted, misattributed, reordered and fabricated turns; whether reported gaps match real ones; checkpoint and closure compliance; fabricated or wrong metadata against values the researcher can establish independently (for API sessions, the request configuration); correct use of "unknown" and "not exposed"; repeated requests for confirmed values; and the protocol's influence on responses, rated blind on the six criteria. Studies with researchers as participants need ethics approval. Results will be reported as found, including where the protocol performs poorly.

## 11. Using the protocol outside the Lab

A conforming tool:

1. generates a session identifier and inserts it into the core protocol and every command;
2. keeps the protocol and command wording of the version it claims, unchanged;
3. stores what the AI system reports as AI-reported and unreviewed;
4. treats an original transcript or provider export as the reference against which an AI-generated record is verified, and documents every discrepancy;
5. never marks coverage as complete while a gap is recorded or on the AI system's word alone;
6. never overwrites a metadata assertion, and keeps corrections with their reasons;
7. records the protocol version and schema version with every record;
8. validates exported records against the JSON Schema.

`protocol.js` has no dependencies and runs in a browser or in Node.js. It provides the protocol text, the commands, the transfer-format reader, transcript splitting, alignment, the canonical record and its validation, and can be reused directly.

## 12. Citation

Cite the protocol with its version and the software release it shipped in:

> Onuh, F. (2026). *SPL Research Session Protocol* (Version 0.2, draft). In *Scholarly Prompt Lab* (Version 1.8.0) [Computer software]. https://doi.org/10.5281/zenodo.24521711

The concept DOI resolves to the latest release; cite the version DOI of the release you used where one is listed in the [README](../README.md).
