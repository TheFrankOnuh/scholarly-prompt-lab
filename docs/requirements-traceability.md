# Requirements traceability: conversational research

How each requirement of the 33-section specification for conversational research is met in Scholarly Prompt Lab 1.8.0. Statuses:

- **Implemented**: in the Lab, tested (automated tests in `tests/`, or the browser checks listed in [testing-and-validation.md](testing-and-validation.md)).
- **Partial**: implemented in part; the row says what is missing and why.
- **Outstanding**: not implemented; the row says why and what is recommended.
- **Empirical**: the Lab's side is implemented, but whether external AI systems behave as instructed can only be established by the study in [testing-and-validation.md](testing-and-validation.md#2-empirical-validation-of-the-protocol-outstanding). No such result is claimed.

Main files: `protocol.js` (logic), `conversations.js` (interface), `report.js` (methods report), `schemas/spl-research-session-record.schema.json`, `tools/build-uc003.mjs` (teaching case).

## Summary

Every requirement is implemented except those listed here.

- **Outstanding:** the empirical study of the protocol (§31). Nothing in the software is outstanding.
- **Empirical:** whether AI systems follow the protocol's instructions: verbatim reproduction, the three reviews, reminders, confirmations, closure, self-identification (§3, §4, §5, §6, §7, §8), and the analytical categories as instruments (§16).
- **Partial:** seven items, listed below.

The partial rows are: provider-specific guidance (§6, by design), the record of a request to suspend reminders (§7), the full modification history (§9), the release identifier for an unreleased version (§9), provider export compatibility (§21, needs real samples), custom categories (§13, one researcher-defined category per prompt) and the automated second-model evaluation of conversation turns (§15, manual copy and paste). Each is explained below.

## §1 Research modes

| Requirement | Status | Where |
|---|---|---|
| Single-prompt analysis kept as it was | Implemented | Log and evaluate → Single output; reports and prompts unchanged without conversations (report test, comparison with 1.7.0) |
| Prompt-sensitivity study | Implemented | Sensitivity study, four conditions |
| Conversational research | Implemented | Build (Testing and record-keeping); Log and evaluate → Research conversation |
| Conversational research within a sensitivity study | Implemented | Each condition can be copied as a documented conversation; conversations carry a condition and comparison group; comparison in the Sensitivity study |
| No duplication; established workflows uncomplicated | Implemented | Conversations live inside Log & evaluate; protocol off by default |

## §2 Conversational research

| Requirement | Status | Where |
|---|---|---|
| Unique conversation identifier | Implemented | `CV-…` |
| Associated research study | Implemented | Project, study condition, comparison group |
| Title and research purpose | Implemented | Title; About this conversation → Purpose |
| Original research question | Implemented | From Build when registered |
| Initial research prompt | Implemented | Stored exactly as copied; compared with the first turn |
| Original source materials | Implemented (by reference) | SHA-256 fingerprint and description of the Build source text; the text itself stays in the project design |
| Provider, model, version | Implemented | Metadata with provenance |
| Date and settings | Implemented | Metadata fields |
| Complete sequence of prompts and responses | Implemented | Turns |
| Turn identifiers | Implemented | `T001…`, stable |
| Follow-up classifications | Implemented | Taxonomy per prompt |
| Changes in analytical instructions | Implemented | Turn Details → instruction change |
| Additional evidence introduced | Implemented | Turn Details → evidence, with source identifiers |
| Researcher corrections and interventions | Implemented | Correction flag; layered text corrections; classifications |
| Evaluation records per turn | Implemented | Six criteria, not applicable with reason |
| Conversation-level observations | Implemented | Analysis view |
| Researcher decisions and notes | Implemented | Decisions with status; methodological notes |
| Final interpretation | Implemented | About this conversation |
| Metadata provenance and verification | Implemented | Assertions |
| Research checkpoints | Implemented | `CK-…` with original text kept |
| Claim histories | Implemented | Claims view |
| Documented gaps | Implemented | Gaps with source |
| Chronological relationship preserved | Implemented | Parent links; active path |
| Earlier prompts and responses informing later ones examinable | Implemented | Evaluation shows the prompt and the exchange before; references; timeline |
| Several conversations per study, different AI systems | Implemented | Per project; comparison |
| Branches preserved, not flattened | Implemented | Tree of turns; versions; Branches view |
| Every researcher prompt an independent record, including prompts not written in the Lab | Implemented | Each prompt is its own turn with provenance |
| No arbitrary limit on turns | Implemented | IndexedDB; 400-turn test; long conversations summarised in Appendix H with full export |

## §3 Research Session Protocol

| Requirement | Status | Where |
|---|---|---|
| Model-independent, no plugins or APIs | Implemented | Text instructions only |
| Enable or disable | Implemented | Build, Testing and record-keeping, off by default |
| Optional where instructions would affect the phenomenon studied | Implemented | Advice beside the option; protocol use recorded as a condition |
| Exact version recorded | Implemented | `protocol_version` on every conversation and record |
| Documented in the methods report | Implemented | Section 2.8; Appendix H |
| Instructs preservation of prompts and responses; verbatim reproduction on request | Implemented (instruction) / Empirical (compliance) | Checkpoint and end commands |
| Applies to prompts written outside the Lab | Implemented | Commands cover every message |
| Researcher need not return to the Lab each turn | Implemented | Workflow; commands copied once |
| Three components: core, commands, specification | Implemented | `coreProtocol`, `COMMANDS`, docs/research-session-protocol.md |
| Core concise | Implemented | About 400 words; duties carried by commands |
| Commands self-contained | Implemented | Tested |

## §4 Instructions to the AI (25 requirements)

All 25 are mapped to core rules, commands or Lab behaviour in the [specification, section 4](research-session-protocol.md#4-the-methodological-requirements-and-where-each-is-implemented). Status: **Implemented** as instructions; **Empirical** for whether AI systems follow them.

## §5 Mandatory metadata

| Requirement | Status | Where |
|---|---|---|
| AI provider; AI product or application (separately) | Implemented | `ai_provider`, `ai_product` (protocol 0.2) |
| Model name; version or release identifier | Implemented | Required fields |
| Model identification provenance | Implemented | Assertions; derived statement in the record and report |
| Session start (required), end (required at closure) | Implemented | `required: "yes"` and `"closure"` |
| Message timestamps; time and time zone | Implemented | Per-turn timestamps; fields |
| Knowledge cutoff; reasoning mode; temperature; top-p; maximum output; other settings | Implemented | Fields |
| Tools available; tools used; web browsing; retrieval or search | Implemented | Separate fields |
| Uploaded files; memory; custom instructions (voluntary) | Implemented | Fields, with guidance to leave out private content |
| Access method | Implemented | Field; selects guidance by environment |
| Model changes during the conversation, at turn level | Implemented | Field; model per turn; `model=` attribute; provider exports |
| Protocol version; schema version; session identifier; checkpoint identifier | Implemented | System-recorded |
| Number of prompts and responses; coverage | Implemented | Counted separately |
| Provenance and verification | Implemented | Every assertion |
| Required fields always present | Implemented | Record carries them, "Unknown" if nothing known (tested) |
| Value statuses, missing distinguished from not disclosed | Implemented | Five statuses; "not exposed" counts as documented |
| No fabricated versions, dates or settings | Implemented (instruction, Lab labels AI values) / Empirical | Core rule 5 |
| Advertised name not taken as backend identifier | Implemented | Rule 5; separate fields; report wording |

## §6 Guided metadata completion

| Requirement | Status | Where |
|---|---|---|
| Field name, why it matters, whether the AI can establish it, where to look, whether the provider discloses it, how to confirm, whether it may stay unavailable | Implemented | Review command (AI side); metadata panel (Lab side) |
| Provider-specific guidance | Partial (by design) | Guidance by kind of environment (application, API, local, export, documentation), chosen from the recorded access method. Menu names and provider-specific locations are not given, as the specification requires, because they cannot be confirmed and change between versions |
| No invented interface locations | Implemented | Tested: guidance names no interface elements |
| Browsing not introduced into evidence-constrained work | Implemented | Protocol never asks for browsing |
| Not insisting on unobtainable information | Implemented | "Not exposed" and "Unknown, with a reason" are complete |
| Natural-language or structured confirmation; corrections recognised | Implemented (instruction) / Empirical | Confirm command, with the example format |
| Researcher values keep provenance; confirmation separate from origin | Implemented | Assertions |

## §7 Opening, intermediate and closing reviews

| Requirement | Status | Where |
|---|---|---|
| Opening review after the first answer, with guidance | Implemented (instruction) / Empirical | Core rule 7; detected in the AI's turns |
| Intermediate reminders, about every 10 turns, configurable, with listed triggers | Implemented (instruction) / Empirical | Core rule 8; interval 5, 10, 20 or off |
| Only unresolved fields; no repetition | Implemented (instruction) / Empirical | Rule 8 |
| Suspension of reminders on request | Partial | The AI is told to stop when asked; the Lab does not record the request as a separate field. Recommendation: classify the request as administrative, which the record keeps |
| Closing review; never blocks the record; complete later in the Lab | Implemented | End command produces the record at once with missing items marked; metadata panel |
| Reviews part of the record; administrative; excluded or included in scoring | Implemented | Administrative designation; per-conversation option to score them |
| Protocol and reminders can be disabled | Implemented | Build, Testing and record-keeping |

## §8 Commands

| Command | Status |
|---|---|
| START, REVIEW, CONFIRM, SAVE CHECKPOINT, END, RESUME, STATUS, with the behaviour specified (record parts, transferred context, no claim to monitor context) | Implemented (instructions; full texts in docs/research-session-commands.md) / Empirical (compliance) |
| Successive checkpoints without duplication; parts imported into one conversation | Implemented (tested) |

## §9 Automatic SPL-recorded metadata

| Requirement | Status | Where |
|---|---|---|
| Project, study, conversation, prompt identifiers; prompt version | Implemented | Project id; condition and group; `CV-`; `PR-` from the prompt's hash, each copy kept |
| Protocol and schema versions | Implemented | |
| Prompt generated and copied | Implemented | Copy time (the prompt is generated as it is copied) |
| Checkpoint, transcript, record imports; confirmations; evaluations; report generation | Implemented | Events; `confirmed_at`; evaluation time; report events on Word and print |
| Software version | Implemented | `lab_version` |
| Release identifier | Partial | The version DOI is recorded when the release has one; a version not yet archived on Zenodo has none |
| Original record identifier; content hash | Implemented | `AR-…`; SHA-256 |
| Modification history | Partial | Events, corrections and the history of every metadata value are kept; individual changes to classifications, scores and notes are not logged one by one. Recommendation: an event log of edits, if researchers need it |
| Lab times not treated as submission or generation times; provider times kept separately; device clock caveat | Implemented | Metadata panel note; provider timestamps per turn |

## §10 Field-level provenance

| Requirement | Status |
|---|---|
| Six origins; five verification statuses, separate | Implemented |
| Confirmation never erases origin | Implemented (tested) |
| Conflicts kept, flagged, resolved with a reason | Implemented (tested) |
| Source reference, time and reason for corrections | Implemented |
| Report statements only where supported | Implemented (tested wording) |

## §11 Structured Research Session Record

| Requirement | Status |
|---|---|
| JSON primary, Markdown representation | Implemented |
| Session metadata listed (format, versions, ids, question, purpose, provider, product, model, dates, provenance, review history, session status, record type, coverage limits, record provenance) | Implemented |
| Turn fields (id, position, parent, role, text, source ids, purpose, evidence, methodological changes, references, timestamps, model, administrative) | Implemented |
| Every follow-up an independent record with the fields listed, verbatim prompt separate from classification | Implemented |
| One prompt, several responses; branches not flattened | Implemented |
| Analytical developments | Implemented (developments, claims, observations; AI notes kept apart) |
| Decisions: explicit, needing confirmation, AI-suggested | Implemented |
| Completeness: access to the beginning, missing turns, exact or reconstructed, checkpoints used, metadata unresolved, AI-reported versus established | Implemented |
| Formal JSON schema; imports validated | Implemented |
| Open and documented | Implemented |

## §12 Originals versus AI-generated documentation

| Requirement | Status |
|---|---|
| Original prompts and responses, provider exports, pasted records, AI records, researcher-confirmed records, AI summaries distinguished | Implemented (text status, origin, verification, AI notes) |
| AI reconstruction never presented as verified | Implemented |
| Compare a generated record with the original | Implemented (alignment, word-level comparison) |
| Review, correct and confirm; originals and revisions kept | Implemented |
| Prompt verification view; correct, restore omitted prompts, mark unavailable | Implemented (Prompts view) |
| Hashing, without claiming authenticity | Implemented |

## §13 Follow-up taxonomy

| Requirement | Status |
|---|---|
| Thirteen categories, multiple per prompt, revisable | Implemented |
| Custom categories | Partial: one researcher-defined category per prompt with its own label. Reusable named custom categories are not offered; recommendation: add them if coders need a shared extension |
| AI suggestions as suggestions | Implemented (`purpose=` attribute) |
| Definitions and examples; open to refinement | Implemented (docs/follow-up-taxonomy.md) |
| Wording never changed; administrative designation | Implemented |

## §14 Follow-up prompt builder

| Requirement | Status |
|---|---|
| Purpose, claim or response examined, methodological requirements | Implemented |
| The five example wordings, and one for every purpose | Implemented |
| Editable; optional; never a prerequisite | Implemented |
| Designed versus executed prompt kept apart | Implemented (FP- link, word comparison) |

## §15 Turn evaluation

| Requirement | Status |
|---|---|
| Six criteria on each response | Implemented |
| Automated checks | Implemented: quotation checks per response, kept as suggestions |
| Second-model evaluation | Partial: the evaluation prompt is copied and the reply recorded as suggestions, as for single outputs; it is not run automatically because the Lab makes no calls to AI systems |
| Suggested, second-model and confirmed scores distinguished; only confirmed scores summarised | Implemented (tested) |
| Not applicable with explanation; no low score for inapplicability | Implemented |
| Linked to the eliciting prompt; prompt and preceding exchange shown | Implemented |
| Administrative messages excluded but kept | Implemented |

## §16 Conversation-level measures

| Requirement | Status |
|---|---|
| Seven categories with definition, guidance, examples, recording fields, turn references, limitations | Implemented |
| Qualitative; no composite score | Implemented |
| Which follow-ups preceded changes; no causal attribution | Implemented (sequence only, in interface, exports and report) |
| Categories as validated instruments | Empirical (not claimed) |

## §17 Claim History

| Requirement | Status |
|---|---|
| Identifier, original wording, first turn, sources | Implemented |
| Challenges, evidence requests, evidence, counter-evidence, wording and scope changes, qualifications, retractions, persistent errors, decisions, evaluations, disagreements | Implemented |
| Created and confirmed manually; AI suggestions unverified | Implemented |
| Original, AI's later and researcher's wording kept apart | Implemented |
| Several claims per response; several developments per claim | Implemented |
| Export | Implemented (CSV, JSON, Markdown) |
| No treatment of change as improvement or cause | Implemented |

## §18 Comparison and prompt sensitivity

| Requirement | Status |
|---|---|
| Comparisons across systems, follow-up sequences, strategies, contextual corrections, protocol use, reminder settings, framings, repeated sessions, equivalent claims | Implemented (conditions, groups, metadata, classifications and comparable claim labels shown side by side) |
| Standardised versus adaptive distinguished, not pooled | Implemented (warning) |
| Exact wording and sequence compared; sequence exported for reproduction | Implemented |
| Comparability limits stated; no causal claims from scores | Implemented |

## §19 Visualisation

| Requirement | Status |
|---|---|
| Timeline; scores turn by turn; errors and corrections; persistent errors; instruction changes; evidence; checkpoints; model changes; claims; branching; comparisons | Implemented (Timeline, Branches, Claims, comparison tables) |
| From a result to the turn | Implemented |
| No continuous trends from sparse data; missing and inapplicable marked | Implemented: discrete marks, no lines (tested) |
| Prompt-only view; administrative filter | Implemented |

Graphical line or bar charts were deliberately not used: with few, uneven observations per conversation, a table of discrete marks is the less misleading form.

## §20 CONTEXT

| Requirement | Status |
|---|---|
| Seven dimensions applied to conversations, no new dimensions | Implemented (Appendix E counts conversation records; section 2.8) |
| Transparency includes every follow-up prompt verbatim, metadata, protocol version and administrative interventions | Implemented |

## §21 Import and export

| Requirement | Status |
|---|---|
| Manual recording | Implemented |
| Transcript import with speaker and boundary review | Implemented |
| SPL record import with validation and version messages | Implemented |
| Checkpoints, duplicates, conflicts, no silent overwriting, sequential parts | Implemented (tested) |
| Provider exports | Partial: ChatGPT and Claude exports are read, branches and per-message metadata kept, tested with constructed samples. Not yet checked against real exports, which the specification asks to examine first. See [provider-exports.md](provider-exports.md) |
| JSON, Markdown, CSV, Word, PDF | Implemented |
| Independent exports: transcript, prompts, responses, interventions, evaluations, analysis, claims, metadata, checkpoints | Implemented |
| Stable identifiers; redacted copies | Implemented |

## §22 Methods report

| Requirement | Status |
|---|---|
| Every item listed (rationale, systems, versions, settings, dates, provenance, counts, initial prompts, follow-up purposes, changes of orientation and instruction, sources introduced, interpretations, errors and corrections, evaluations, observations, claims, comparisons, protocol, reviews, provenance and completeness, decisions, limitations) | Implemented (section 2.8) |
| Appendix H with every prompt and response; long conversations cross-referenced | Implemented |
| Prompts exportable separately | Implemented |
| Counts kept distinct | Implemented |
| Intended, reported and documented kept apart; no completeness claimed from an AI record | Implemented |
| Precise statements on unavailable metadata | Implemented (generated only from records) |

## §23 Teaching resources

| Requirement | Status |
|---|---|
| Complete instructional example with every element listed | Implemented: SPL-UC-003 (tested) |
| Every prompt and response verbatim | Implemented (docs/teaching/spl-uc-003-transcript.md) |
| An incomplete and inaccurate AI record verified and corrected | Implemented |
| Unavailable model version and settings | Implemented |
| Specimens labelled; no empirical claims | Implemented |
| Loads without overwriting records; earlier cases preserved | Implemented |

## §24 Integrity safeguards

All seventeen safeguards are stated where they apply: in the interface (coverage, provenance, suggestions, reviews), the documentation and the report's limitations. A record with a known missing prompt or response is never complete (tested). Status: **Implemented**. The protocol's limitations (no guaranteed verbatim reproduction, retrieval, end detection, self-identification or compliance) are stated in the interface, the specification and the report.

## §25 Privacy and security

| Requirement | Status |
|---|---|
| Local-first, offline, no APIs, accounts or cloud | Implemented |
| Imported content untrusted; no execution; JSON validated; rendering as text only | Implemented (tested; no `innerHTML` in the conversation code) |
| Export, delete and manage sensitive records | Implemented |
| Local storage versus provider practices communicated | Implemented (workspace and privacy statement) |
| Redacted copies marked, originals kept | Implemented |
| No unnecessary personal data or credentials | Implemented |

## §26 Data architecture and storage

| Requirement | Status |
|---|---|
| Entities and relations (project, study, conversation, branch, turn, source, checkpoint, metadata, provenance, evaluation, claims, annotations, report) | Implemented |
| Tree with stable identifiers and parents | Implemented |
| No duplicated transcripts for checkpoints; immutable originals; separate annotations | Implemented |
| IndexedDB justified and used; quotas, persistence, hashing, backups, failed-import safety, storage health | Implemented |

## §27 Design and user experience

| Requirement | Status |
|---|---|
| Every listed interface element and action | Implemented |
| Progressive disclosure | Implemented (details panels, views) |
| Metadata interface: confirm, correct, add, mark unavailable, give reasons, review sources; no sense of failure for unexposed values | Implemented |
| Primary journey; manual recording available | Implemented |
| British English; plain academic wording | Implemented |
| Accessibility on desktop, mobile and installed app | Implemented (axe-core, light and dark, three widths) |

## §28 Open infrastructure

| Requirement | Status |
|---|---|
| Versioned specification, commands, metadata and provenance, guide, taxonomy, evaluation, Claim History, schema | Implemented (lower-case file names follow the repository's convention; metadata and provenance are one document) |
| Adoption outside the Lab | Implemented (conformance checklist; `protocol.js` reusable) |
| Branches, reconstruction, confirmed records defined; checkpoint and assembly examples | Implemented (specification §8, fixtures, SPL-UC-003) |
| Release identifiers, citation, backward compatibility | Implemented (0.1 records read; version table) |

## §29 Compatibility

| Requirement | Status |
|---|---|
| Every existing feature preserved | Implemented (all earlier tests pass; regression comparison) |
| No forced migration; existing records compatible | Implemented |
| Long records without truncation | Implemented (tested) |
| Mixed content preserved through the lifecycle | Implemented (tested) |
| Visual design preserved | Implemented (1.8.0 restores the approved header) |

## §30 Software testing

Every fixture and test area listed is covered by automated tests, except responsive behaviour, accessibility, offline operation, installation and failed storage operations, which are checked in the browser for each release. Status: **Implemented**. Software tests do not establish AI compliance.

## §31 Empirical validation

| Requirement | Status |
|---|---|
| Validation strategy, outcomes and protocol-influence comparisons | Implemented as a plan (docs/testing-and-validation.md) |
| Conducting the study | **Empirical: outstanding.** No AI runs were made, in keeping with the decision to leave AI out of the Lab's own development for now. It needs researchers, AI accounts, sample exports and, for studies with participants, ethics approval |

## §32 Proposal

Delivered and approved before implementation.

## §33 Homepage

| Requirement | Status |
|---|---|
| The approved wording, verbatim | Implemented |
| Product name the principal identity, approved typography restored | Implemented (1.8.0) |
| Product name a home link, without underline, keyboard-accessible, no reload, back and forward, offline | Implemented |
| Descriptions consistent across the page, app, README, citation and archive metadata, repository | Implemented |
