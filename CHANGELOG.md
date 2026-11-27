# Version history

This page lists every version of the Scholarly Prompt Lab, newest first.

**How to read the numbers.** Each part of a version number is a whole number, so 0.12 means "twelve" and comes after 0.5. Versions that begin with 0 were development versions. Version 1.0.0 is the first full release.

**Why some numbers are missing.** The Lab was released publicly at milestones only. Versions 0.4 and 0.6 to 0.11 were working versions between those milestones. They were never published as releases, and the work done in them is listed below under the release that followed.

To cite the Lab, use the DOI that always opens the latest version: [10.5281/zenodo.24521711](https://doi.org/10.5281/zenodo.24521711).

## 1.8.0, November 2026

**The header.** The product name, Scholarly Prompt Lab, is again the principal identity, with the wordmark at its approved size and position. Version 1.7.0 had set "The prompt as method." larger and bolder than the product name; it now has the tagline style approved in 1.4.0, with the description and the free-software line below it in a lighter, smaller type. The wording approved for 1.7.0 is unchanged. The wordmark is now a link back to the start of the Lab (Build, top of the page). It does not reload the page, saves typed work first, closes any open dialog, works offline, and keeps keyboard focus visible; it has no underline and only a quiet change on hover.

**Conversational research, completed.**
- *SPL Research Session Protocol, version 0.2 (draft).* AI provider and product are recorded separately; tools used, external retrieval, custom instructions and message timestamps are added; a record can mark a turn as not exact, suggest follow-up purposes, claims and decisions, and record a change of model; the closing review produces the record at once with missing items marked. Records made under version 0.1 are read unchanged.
- *Branches.* A conversation is a tree: regenerated responses and edited prompts are kept as versions, with a Branches view and "version 2 of 3" controls. AI-generated records are compared with the branch shown.
- *Provider exports.* ChatGPT and Claude data exports (the ZIP file or conversations.json) can be imported: the conversation chosen, its times, the model of each message and, for ChatGPT, its branches. Tested with constructed samples; not yet with real exports.
- *Records within records.* A checkpoint that reproduces the researcher's commands, or a completed record that reproduces an earlier checkpoint, is now read correctly: markers inside a turn's text stay part of the text. A reworded prompt is recognised as the same turn with different wording. A turn found only in the AI's record leaves the conversation when the original is imported, and is kept as a recorded difference. Gaps are marked filled when a later record supplies the turn.
- *Claim History*, *conversation-level observations* and *researcher decisions*, with definitions, guidance and limitations; developments recorded on each turn (evidence introduced, changes of instruction, scope or theory, errors and whether they recur, corrections, decisions).
- *Follow-up prompt builder*, with designed and submitted prompts compared.
- *Timeline* of each conversation, with discrete marks and no lines between scores.
- *Conversations in the Sensitivity study*: each condition can be copied as a documented conversation; conversations can be compared by group, with their conditions, model information, prompts by position and equivalent claims, and warnings where designs or metadata limit comparison.
- *Redacted copies* for sharing, marked as redacted; the original is unchanged.
- *Exports*: transcripts as Word and PDF; AI response history; classified interventions; turn evaluations; analytical records; claim histories; metadata with every assertion; checkpoints with their original text.
- *Metadata*: guidance by environment; sources that disagree are flagged until the researcher resolves them; a statement of how the model was identified; the session end date is required once the session has ended.
- *Evaluation*: quotation checks and a second-model assessment for each response, recorded as suggestions apart from the researcher's scores; administrative messages can be included in scoring.
- *Prompt verification view*, with "restore an omitted prompt".
- *Methods report*: section 2.8 and Appendix H now cover branches, checkpoints, the three reviews, developments, observations, Claim History, decisions, comparisons and suggestions; Appendix E counts conversation records.
- *Teaching case SPL-UC-003*: the first teaching case pursued as a documented conversation, built from the Lab's own import code.
- *Documentation*: provider exports; software testing and empirical validation; a requirements traceability matrix for the 33-section specification.

## 1.7.0, November 2026

- **Research conversations.** Log & evaluate records either a single output, as before, or a whole conversation with an AI system: every researcher prompt verbatim, every response, administrative exchanges kept apart, and gaps recorded where turns are missing. Conversations are kept with their project in the browser's IndexedDB storage, travel with project backups (backup format version 2; earlier backups still restore), and are copied or deleted with their project.
- **SPL Research Session Protocol, version 0.1 (draft).** In Build, step 7, *Research conversation* adds the protocol and a session identifier to the prompt, with a choice of reminder interval, and offers seven session commands to copy: start, review metadata, confirm metadata, save a checkpoint, end, resume and status. The protocol is off by default; the Lab advises leaving it off when the AI system's own behaviour is the object of study. Specification: docs/research-session-protocol.md.
- **The original conversation is the record of truth.** A record or checkpoint written by the AI system is read, checked for cut-off parts and numbering gaps, and aligned with what is already recorded. When a copy of the conversation is imported, its wording is kept, and every difference from the AI's record (differing wording, a left-out turn, a turn only the AI record contains) is recorded and shown word by word. Coverage is complete only when the researcher confirms it, never while a gap is recorded and never on the AI system's word.
- **Metadata with provenance.** Each value about the AI system and the session keeps where it came from (the Lab, the provider, the AI system, the researcher, official documentation) and whether it was checked. Values are never overwritten; corrections are added. “Not exposed by provider” counts as complete documentation.
- Each researcher prompt can be classified with a follow-up taxonomy (version 0.1), and each response scored on the six criteria, with *not applicable* allowed with a reason. Exports: the Research Session Record (JSON, with a JSON Schema in schemas/), a transcript, the researcher's prompt history (Markdown and CSV) and all turns with their evaluations (CSV).
- The methods report gains section 2.8, Conversational research, and Appendix H, Conversational research records, for conversations included in the report. Reports for studies without conversations are unchanged, and prompts without the protocol are exactly as before.
- New documentation: the protocol specification, the session commands, research metadata and provenance, conversational research, the follow-up taxonomy, conversational evaluation, and a specification for Claim History, planned for a later version. The protocol wording and command texts in the documentation are generated from the code, and a test fails if they drift apart.
- The header now reads: “The prompt as method. Design, document and examine how scholarly knowledge develops through human–AI interaction. Free and open-source research software for the humanities and social sciences.” The page description, the installed-app description, the README, CITATION.cff, codemeta.json and .zenodo.json say the same, and link previews have a title and description.

## 1.6.0, November 2026

- The interface is available in English, French and Spanish, chosen from the Language menu at the top right and remembered on the device. The French and Spanish translations are awaiting review by fluent speakers, and the Lab says so in a line in the footer. The prompt, the methods report, the theory library and everything the researcher types are never translated. An automated test checks that every translated entry matches wording the Lab really uses, and that the languages cover the same wording.
- Text in any script: every text field follows the direction of the script typed into it, and each paragraph takes its own direction, so sources in Arabic, Hebrew, Persian or Urdu read right to left beside English. Quotation checks were tested with Arabic and Hebrew sources.
- The framework guide sets out how CONTEXT relates to existing work: guidance on disclosing AI use, datasheets and model cards, tool criticism, and the FAIR and CARE principles. Dimension N now asks researchers to apply the CARE Principles for Indigenous Data Governance where their sources concern Indigenous peoples. Every reference was checked against Crossref or the publisher's page.
- codemeta.json describes the software in the format used by research-software archives, and is kept in step with each version.
- A screen-reader test script (docs/accessibility-testing.md) sets out twelve tasks for testing with NVDA, VoiceOver or TalkBack.
- A draft paper for the Journal of Open Source Software is in paper/.

## 1.5.1, November 2026

- The theory library under Theoretical orientation can be folded away with "Hide the theory library", in one step at a time and when all steps are shown on one page. The chosen theories stay visible. The choice is remembered on the device; without one, the library starts folded when the design already has theories. The guided demo opens it when it needs to.

## 1.5.0, November 2026

DOI: [10.5281/zenodo.24575498](https://doi.org/10.5281/zenodo.24575498)

Versions 1.2.1 to 1.4.1 were published on the site only and not archived separately. Their changes are archived in this version.

- Two teaching cases, documented in the guide [Research applications and methodological use cases](docs/research-use-cases.md): SPL-UC-001, equality, citizenship and political belonging in the Declaration of Independence (1776) and the Declaration of Sentiments (1848); and SPL-UC-002, cultural rights and collective knowledge in the African Charter on Human and Peoples' Rights and the United Nations Declaration on the Rights of Indigenous Peoples. Every quotation and reference in the guide was checked against its source.
- A teaching case is chosen from the Worked example menu and opens as a new project with its research design, procedure, source passages, working definitions and study-level AI uses. The project that was open is kept as it is.
- While a design started from a teaching case, the Build tab shows a notice that the worked responses and scores in the guide are constructed teaching specimens, and the downloaded research design carries the same notice.
- A worked example can now bring its own analytical procedure and its own theoretical orientations. The seven existing worked examples are unchanged: their prompts, research design downloads, study protocols and methods reports are identical to version 1.3.1.
- The Discipline field shows an arrow at its right edge, which opens or closes the full list of disciplines.
- Disciplines are listed in alphabetical order, as are their groups. Typing a discipline and pressing Enter chooses the exact match.
- "+ Add your own discipline" and "+ Add your own theory" no longer show a second plus sign.

## 1.4.1, November 2026

- Privacy and data storage stays readable when the pointer rests on it: the text turns petrol and is underlined. In 1.4.0 the button was filled with dark petrol on hover, which left its text at a contrast of about 1.3:1. Every other button and link was checked and keeps a contrast of at least 4.5:1 on hover, and an automated test now guards this.
- The footer and the README say "Developed by" in place of "Created by".

## 1.4.0, November 2026

A new visual identity and a redesign of the interface. The research workflows, the prompts, the stored records, the scoring and the methods report text are unchanged: for all seven worked examples, the prompt, the research design download, the study protocol and the report text are identical to version 1.3.1.

- Typefaces: Source Serif 4 for headings, the methods report and the framework guide; IBM Plex Sans for the interface; IBM Plex Mono only for text sent to an AI system or stored verbatim. All three are under the SIL Open Font License, are stored with the Lab and are saved for offline use, so no visit reaches a font service. They cover Latin, Greek, Cyrillic and Vietnamese (Plex Mono has no Greek).
- Colour: petrol blue as the primary colour, with rubric, the red of manuscript rubrication, for CONTEXT letters and section numbers only. Every text pair measures at least 4.5:1 in light and dark mode.
- Nine text sizes in place of twenty-two, and none below 13 pixels.
- The project controls are in the header, with Manage projects opening as a panel.
- Build has a title and a one-line introduction, with the start options beside it. "Start my own research" is the main action, and "Clear form" is set apart from the start options.
- The step rail shows each step's full name. On phones it shows "Step 3 of 7" with the step name.
- The panels around each region are removed. Only the prompt keeps a sheet of its own.
- CONTEXT coverage is shown as the seven letters of CONTEXT, each underlined once that dimension is covered.
- Buttons have three levels, with line icons from Lucide (ISC licence) always beside a word. Quotation checks show a word and an icon for each result.
- Evaluation scores are chosen from a row of buttons from 1 to 5. A suggested score is outlined and labelled; a confirmed score is filled.
- The methods report is shown as a document, with section numbers in rubric and each CONTEXT status written out and coloured. The Word export uses Source Serif 4 where it is installed and Georgia otherwise.
- The wordmark and the app icon are redrawn in Source Serif 4.
- On touch screens every control is at least 44 pixels tall, the open tab stays in view, and the prompt sheet scrolls as one area.
- Fixed: the maskable app icons were not saved for offline use.

## 1.3.1, November 2026

- Install the Lab on this device keeps its gentle pulse until the Lab is installed. If the installation prompt is dismissed, the option stays available. There is no animation when reduced motion is requested.

## 1.3.0, November 2026

The methods report becomes a methodological reporting engine that connects research design, documented AI use and scholarly evaluation.

- The report keeps four kinds of statement apart: what the research design intends, what the researcher reports, what the Lab's records document, and what the researcher confirmed. Selecting a commitment or an AI-use category no longer produces a claim that an activity, check or evaluation took place.
- New heading, "AI-Assisted Research: Methodological Report", generated with the date, version and DOI. Revised section headings, and two new appendices: F (prompt-sensitivity analysis, where conditions, AI systems or repeated runs can be compared) and G (evaluation criteria and scoring records).
- The CONTEXT assessment uses four statuses (Not addressed, Specified, Documented, Not applicable) assigned by rules for each dimension. Researchers can record why a dimension does not apply.
- Prompts are reproduced verbatim with an identifier, condition, status (copied and recorded with the run, or rebuilt from the design), Lab version and linked output records.
- Missing information, activities not yet undertaken and inapplicable activities are marked differently, and each [To complete] note names exactly what is missing.
- Limitations are generated from the research design and the records, including the evidential status of outputs when AI is the object of study.
- The software citation uses the version DOI when the release metadata records one, and otherwise the DOI for all versions.
- Fixed: a criterion with no score was counted as confirmed when summarising evaluation.

## 1.2.4, November 2026

- Log & evaluate: revised wording for all four steps (Record the run, Quotation verification, Evaluate the output, Review and save), the six evaluation criteria, second-model evaluation and the options for how an output was used. Stored values are unchanged, so earlier entries read correctly.
- "What 1, 3 and 5 mean" is now "Scoring guidance".
- The quotation checks now say that a matching quotation shows only that the words appear in the source, and does not establish that a claim is accurate.
- The methods report no longer treats a second AI system's evaluation as independent review.
- Methods report: outputs logged after the selection was saved are now included automatically. Outputs the researcher unticked stay out.
- The privacy statement opens and closes when selected, with a small animated indicator, and no longer has a border.
- Install the Lab on this device is shown wherever the Lab can be installed, draws attention with one brief animation (none when reduced motion is requested), and gives instructions in browsers that install only from their own menu.

## 1.2.3, November 2026

- Methods report: eleven ways of using AI, including literature discovery and review, research design and instrument development, comparative analysis, and research writing and editing. Writing assistance is disclosed in three separate kinds: language and copyediting, structural and argumentative revision, and content generation and drafting. Choices saved by earlier versions are kept.
- Methods report: the logged outputs that belong to the study are now chosen one by one from a list, and the choice is saved with the report and the project. This replaces a two-option menu that stayed empty when the Lab was opened directly on the Methods report tab.

## 1.2.2, November 2026

- Revised text for three parts of the Build tab: Testing and record-keeping, the note under the analytical procedure, and Research design.
- Revised text for Sources and their context, Output format and Analytical standards (the eleven standards keep their meaning and their place in the prompt).
- A revised privacy statement, Privacy and data storage, in the footer.
- Revised text for Testing and record-keeping and for the introduction to the Prompt-sensitivity study.
- Every reference to a dimension now reads in one format, for example "CONTEXT dimension C: Conceptual grounding": the Build step captions, the CONTEXT coverage list, the research design download and Appendix E of the methods report.

## 1.2.1, November 2026

- Revised text for the CONTEXT framework: its introduction, the seven dimensions, the four roles of AI in humanities research and the closing statement, in the Lab, the README and the framework guide.
- The framework is no longer described as a proposal.
- Revised introduction to the Methods report tab, and revised note under the button that rebuilds the report.

## 1.2.0, November 2026

DOI: [10.5281/zenodo.24569839](https://doi.org/10.5281/zenodo.24569839)

The rest of the interface, after the Build tab.

- Log & evaluate is now four steps with the same progress rail: record the run, check the quotations, score the answer, and review and save. If a required field on an earlier step is empty, the Lab opens that step and points to the field. The list of saved entries appears once there is one.
- Log & evaluate has a title and a line saying what the tab is for, like the other tabs.
- The Sensitivity study shows the first lines of each version of the prompt, with Copy and "Show the full prompt" side by side.
- The privacy statement sits in the footer only and appears when the pointer rests on it or it receives keyboard focus. Escape closes it. The privacy line at the top of the page is gone.
- Build step 5 is now titled Output Format.
- Checked with the axe-core accessibility checker on every step and tab, in light and dark mode and on a phone-sized screen, with no failures.

## 1.1.0, November 2026

Published on the site only, not archived separately. Its changes are archived in 1.2.0.

A redesign of the Build tab in response to feedback about the interface.

- Build is now seven steps with a progress rail. One step shows at a time, with Back and Next, and a single button shows all steps on one page for those who prefer it. A step's number is filled in once it has answers.
- The privacy notice, the project bar and the start options now sit in two compact rows instead of three large panels.
- A theory's key works, concepts and critiques open in a side panel, so the theory list stays short.
- On phones the prompt sits in a panel at the bottom of the screen that opens and closes.
- The guided demo moves to the right step automatically.
- Checked with the axe-core accessibility checker on every step, the side panel and every tab, in light and dark mode, with no failures.

## 1.0.1, November 2026

DOI: [10.5281/zenodo.24544927](https://doi.org/10.5281/zenodo.24544927)

- A cookie-free visit counter. When the Lab is opened online, GoatCounter counts one visit and receives the page address, the website that linked to the Lab and the screen size. It receives nothing a researcher types or loads, and no visit is counted when the browser asks sites not to track it.
- The privacy statement now says exactly what is counted.

## 1.0.0, November 2026: first full release

DOI: [10.5281/zenodo.24526790](https://doi.org/10.5281/zenodo.24526790)

- Research projects. A researcher can keep several studies apart, each with its own questions, theories, sources, prompt, log, scores and report details.
- A whole project can be saved as one backup file and restored on another computer.
- Work saved in earlier versions becomes the first project automatically.
- The header subtitle uses the full width, and the guided demo no longer states how many steps it has.

## 0.12.0, November 2026

DOI: [10.5281/zenodo.24525460](https://doi.org/10.5281/zenodo.24525460)

Changes made in response to an external review:

- One version number, held in a single file, with an automated test that fails if any part of the Lab disagrees.
- The message that the Lab works offline appears only after every file is confirmed saved.
- A SHA-256 fingerprint of the exact source text is stored with each logged output and printed in the methods report.
- Every prompt tells the AI system to treat source text as material for analysis, and the Lab warns when a source contains wording that reads like an instruction to an AI.
- Each evaluation criterion shows what a score of 1, 3 and 5 means.
- A privacy statement in plain words.
- Four accessibility problems found by an automated audit were fixed.

### Built in development versions 0.6 to 0.11 (not released separately)

- The theory library was rebuilt: 176 entries, each labelled by type, with key works in Harvard style, core concepts and critiques. All 427 references were checked against library catalogues, and those that could not be fully confirmed are marked.
- 80 disciplines in six groups, with the option to add and propose a discipline.
- Procedures are built from the discipline's conventions, each framework's own steps and the prompting technique. A research design section records the unit of analysis, the corpus and working definitions.
- Standards are grouped, and the Lab stops asking for quotations when no sources are supplied.
- Duplicate theories are detected, and companion theories are suggested.
- The AI methods report: an AI-use statement, a methods section and appendices, for Word or PDF.
- Community proposals for theories and disciplines, with automatic checks and review by an editor.
- A guided demo, offline use, and the option to install the Lab like an app.
- Automated tests that run on every change.
- Twenty-one problems found by an independent code review were fixed.
- An accessible colour system, numbered section headings in plain language, and a wordmark.
- Seven worked examples from different regions and periods.

## 0.5.0, November 2026

DOI: [10.5281/zenodo.24522303](https://doi.org/10.5281/zenodo.24522303)

- A searchable theory library across twelve fields, with the option to add your own theory.
- Automatic checks of every quotation in an AI answer against the researcher's sources.
- Suggested evaluation scores that count only when the researcher confirms them.
- An evaluator prompt for a second opinion from another AI system.
- A guide to what to do after copying the prompt.

Version 0.4 was a working version between 0.3.1 and 0.5.0 and was not released.

## 0.3.1, November 2026

DOI: [10.5281/zenodo.24521712](https://doi.org/10.5281/zenodo.24521712)

- The same features as 0.3.0. This was the first version archived on Zenodo with a DOI.

## 0.3.0, November 2026

- The first public version: the prompt builder organised by the CONTEXT framework, a four-condition sensitivity study, an evaluation log, and loading of PDF, Word and text files with a review step.
