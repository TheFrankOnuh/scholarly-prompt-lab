# Version history

This page lists every version of the Scholarly Prompt Lab, newest first.

**How to read the numbers.** Each part of a version number is a whole number, so 0.12 means "twelve" and comes after 0.5. Versions that begin with 0 were development versions. Version 1.0.0 is the first full release.

**Why some numbers are missing.** The Lab was released publicly at milestones only. Versions 0.4 and 0.6 to 0.11 were working versions between those milestones. They were never published as releases, and the work done in them is listed below under the release that followed.

To cite the Lab, use the DOI that always opens the latest version: [10.5281/zenodo.24521711](https://doi.org/10.5281/zenodo.24521711).

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
