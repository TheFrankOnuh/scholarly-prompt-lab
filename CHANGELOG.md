# Version history

This page lists every version of the Scholarly Prompt Lab, newest first.

**How to read the numbers.** Each part of a version number is a whole number, so 0.12 means "twelve" and comes after 0.5. Versions that begin with 0 were development versions. Version 1.0.0 is the first full release.

**Why some numbers are missing.** The Lab was released publicly at milestones only. Versions 0.4 and 0.6 to 0.11 were working versions between those milestones. They were never published as releases, and the work done in them is listed below under the release that followed.

To cite the Lab, use the DOI that always opens the latest version: [10.5281/zenodo.24521711](https://doi.org/10.5281/zenodo.24521711).

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
