---
title: 'Scholarly Prompt Lab: a local-first tool for designing, documenting and evaluating prompts in humanities and social science research'
tags:
  - JavaScript
  - digital humanities
  - research methods
  - research transparency
  - prompt design
authors:
  - name: Frank Onuh
    orcid: 0000-0000-0000-0000
    affiliation: 1
affiliations:
  - name: "[To complete: affiliation]"
    index: 1
date: 27 November 2026
bibliography: paper.bib
---

# Summary

Scholarly Prompt Lab is a free, open-source web application for researchers in the humanities and social sciences who use generative AI systems in their work. It treats the prompt as part of the research method. The Lab guides a researcher through seven steps that build a structured prompt from a research question, a theoretical orientation, an analytical procedure, a research design, the source material and its context, an output format and a set of analytical standards. It then records each run of the prompt, checks the quotations in an AI system's answer against the researcher's own sources, supports structured evaluation against six scholarly criteria, and drafts a methodological report with a disclosure statement and appendices.

The Lab is organised by the CONTEXT framework, which names seven dimensions of accountable prompting: conceptual grounding, operationalisation, situated knowledge, traceability, evaluation, cross-model examination and transparency. The Lab runs entirely in the browser. It sends no research data to any server and does not call AI systems itself: the researcher copies the prompt into the system of their choice and pastes the answer back.

# Statement of need

When a researcher asks an AI system to code, summarise, translate or interpret material, the wording of the instruction shapes what comes back. Publishing guidance now asks authors to disclose which AI tool they used and how [@cope2023]. A disclosure of that kind records that AI was used; it does not give a reader what they need to judge how the use shaped the findings: the conceptual frame given to the model, the procedure it was asked to follow, the context it was likely to lack, the evidence behind each claim, how the outputs were evaluated, and whether results held across systems and prompt formulations.

Researchers in the humanities and social sciences need a way to design such prompts deliberately and to keep a record of them that a reader can inspect. The Lab addresses that need for scholars who may have little programming experience and who often work with material that should not leave their computer, such as unpublished archives, interview transcripts or sources about communities whose data rights must be respected [@carroll2020].

# State of the field

The Lab draws on established documentation practices. Datasheets for datasets [@gebru2021] and model cards [@mitchell2019] document how a dataset or a model was made and where it should be used; the Lab applies the same discipline to a researcher's use of a model in a particular study. Digital humanities has long asked researchers to examine how their tools shape their findings [@vanes2018]; the Lab treats the prompt as such a tool and supports a prompt-sensitivity study that compares four nested prompt conditions. Its exports are designed to make an AI-assisted analysis reusable in the sense of the FAIR principles [@wilkinson2016]. We are not aware of another open tool that combines structured prompt design, local record-keeping, quotation verification against the researcher's sources and methods reporting for humanities research.

# Functionality

- **Prompt design.** Seven steps, each tied to a CONTEXT dimension, with a library of 176 theoretical orientations (each with key works, core concepts and critiques), 80 disciplines, and procedures built from the discipline's conventions, the frameworks' own steps and the chosen prompting technique.
- **Records.** Each run is logged with the AI system, version, date, settings and the exact prompt used, together with a SHA-256 fingerprint of the source text analysed.
- **Quotation verification.** Quotations in an answer are matched against the researcher's sources, in any script, and reported as exact, near or not found. The Lab states that a matching quotation shows only that the words appear in the source.
- **Evaluation.** Six criteria scored from 1 to 5. Scores suggested by automatic checks count only when the researcher confirms them.
- **Methods report.** A report that keeps apart what the research design intends, what the researcher reports, what the records document and what the researcher confirmed, with a four-status assessment of each CONTEXT dimension. It exports to Word and PDF.
- **Projects and teaching cases.** Several studies can be kept apart and backed up to a file. Two documented teaching cases open as separate projects.
- **Privacy and access.** All data stays in the browser. The Lab works offline once installed, stores its fonts locally, and was checked against WCAG 2.2 level AA with an automated accessibility checker.

# Quality control

The code base is plain HTML, CSS and JavaScript with no build step. Automated tests (run on every change with GitHub Actions) cover the quotation checks, the evaluation logic, the methods report, project storage, version consistency and the reference data. Each release is archived on Zenodo with its own DOI [@onuh2026].

# AI usage disclosure

Generative AI coding and writing assistants were used during the development, testing and documentation of the software and in drafting this paper. The author directed the work, reviewed and tested all code, verified every reference against its source, and takes responsibility for the software and the text. [To complete: name the tools and versions used, and the parts of the work they assisted, as JOSS requires.]

# Acknowledgements

[To complete]

# References
