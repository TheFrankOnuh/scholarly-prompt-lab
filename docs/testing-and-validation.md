# Software testing and empirical validation

Two different questions, kept apart here and everywhere else in the Lab's documentation.

1. **Does the Lab handle research records correctly?** This is a question about software. It is answered by the tests below, which run on every change.
2. **Do AI systems follow the SPL Research Session Protocol, and does the protocol change what they do?** This is an empirical question about external systems. No test of the Lab's software can answer it. It has **not yet been studied**.

Passing software tests does not establish the reliability of an external AI system's compliance with the protocol.

## 1. Software testing (done, and repeated on every change)

The automated tests run in GitHub Actions on every push (`.github/workflows/test.yml`) and locally with `node --test tests/*.test.js`.

| Area | What is tested | File |
|---|---|---|
| Protocol text and commands | Version and session in every text; rules numbered; reminders and initial record can be switched off; every command self-contained; nothing secret requested | protocol.test.js |
| Record reading | Turns, roles, administrative turns, declared gaps, notes; cut-off records; broken headers; repeated turns; numbering jumps; example markers inside reproduced commands; checkpoints reproduced inside later records; records in several parts, with missing parts reported; `exact=`, `purpose=` and `model=` attributes | protocol.test.js, conversations.test.js |
| Transcripts | Speaker labels in several styles; unlabelled text; administrative exchanges | protocol.test.js |
| Original conversation records take precedence | Transcript wording replaces AI wording; AI differences kept; paraphrased prompts detected; omissions and AI-only turns recorded; declared gaps not counted as omissions; gaps filled by later records; researcher-corrected text never overwritten | protocol.test.js, conversations.test.js |
| Sequential checkpoints | Assembly without duplicates; identifiers stable | protocol.test.js |
| Branches | Regenerated responses and edited prompts as siblings; switching branch; inserting a restored turn; parent loops and missing parents rejected | conversations.test.js |
| Provider exports | ChatGPT tree with branches, times, models, skipped system and tool messages, non-text parts; Claude messages; export after an AI record | conversations.test.js |
| Metadata | Every field of the specification present, with guidance and no interface names; required, required-at-closure and optional fields; aliases from protocol 0.1; AI-reported values stay AI-reported; conflicts flagged and resolved without deletion; the model identification statement | protocol.test.js, conversations.test.js |
| Coverage | Never complete with a gap, never complete on the AI's word, complete only on confirmation | protocol.test.js |
| Analysis | Claims suggested by AI records arrive unverified; developments and persistent errors; follow-up templates for every purpose; timeline marks; comparison and its warnings | conversations.test.js |
| Text preservation | Unicode, Igbo and Yoruba diacritics, Arabic and Hebrew, Markdown tables, code fences, trailing spaces, HTML and script text, through reading, merging, the record and JSON | protocol.test.js |
| Exports | Every format; formula injection blocked in CSV; HTML escaped in Word and print exports; redacted copies labelled and the original unchanged | protocol.test.js, conversations.test.js |
| Schema | The JSON Schema and the built-in validator agree on every vocabulary; the canonical record validates | protocol.test.js |
| Teaching case SPL-UC-003 | Valid record; every element the specification lists for the worked example | conversations.test.js |
| Documentation | The protocol and command wording in the docs is exactly what the code gives | protocol.test.js and CI |
| Existing features | Quotation checks, data, projects and backups, version agreement, offline file list, translations, report helpers | the other test files |
| Homepage | Approved hierarchy; the product name is a home link without underline; no reload | conversations.test.js |

Checks done by hand or in the browser for each release, and recorded in the release notes: the conversational workflow end to end, importing a ZIP export, backups with conversations, accessibility (axe-core, WCAG 2.2 AA, light and dark, phone, tablet and desktop), offline operation, and screenshots of the header against the approved design.

## 2. Empirical validation of the protocol (outstanding)

None of the following has been done. No result is claimed.

**Design.** Reference conversations conducted by researchers in three or four AI products, at about 6, 20 and 60 turns, under four conditions: no protocol; the core protocol; the core protocol with reminders; a different reminder interval, and metadata confirmation at different stages. Each conversation's provider export or full transcript is the ground truth. Outcomes pre-registered.

**Record fidelity.** Against the ground truth: researcher prompts reproduced exactly; altered wording, with a character-level edit distance; omitted prompts and responses; wrong speaker or order; fabricated turns; whether reported gaps match real ones; compliance with the checkpoint and closing commands; behaviour in long conversations and after context loss; preservation of branch information where available; adherence to the original instructions.

**Metadata.** Fabricated or wrong model identifiers, versions, dates and settings, against values the researcher can establish independently (for API sessions, the request configuration); correct use of "unknown" and "not exposed"; accuracy of the guidance on where to find values, checked against provider documentation; retention of confirmed values; repeated requests.

**Influence of the protocol.** Blinded ratings of responses with and without the protocol on the six criteria; response length; instruction adherence; interpretive development; token use where available; conversation length; researcher burden and satisfaction.

**Taxonomy and observation categories.** Agreement between two coders, by category; revision of definitions.

**Ethics.** Studies with researchers as participants need ethics approval. The pilot pack prepared for the Lab can serve as a template.

Until this work is done, describe the protocol as an instruction-based documentation mechanism whose reliability is under study.
