# Conversational research in the Lab

How to document a multi-turn research conversation with a generative AI system, and what the Lab does with it. For the protocol itself, see [research-session-protocol.md](research-session-protocol.md).

## Three research modes

| Mode | Where | What it records |
|---|---|---|
| Single-prompt analysis | Build, then Log & evaluate → Single output | One prompt and one output, as in earlier versions |
| Prompt-sensitivity study | Sensitivity study | The same question under four prompt conditions |
| Conversational research | Build step 7, then Log & evaluate → Conversation | A whole conversation: every researcher prompt, every response, the metadata and their provenance |

Single-output records, research designs and reports from earlier versions are unchanged.

## The workflow

1. **Start.** In Build, step 7, tick *Document this as a research conversation*. The prompt gains the SPL Research Session Protocol and a session identifier. Copy it. The Lab registers the session in Log & evaluate, with the exact prompt and the time it was copied.
   If the AI system's own behaviour is what you are studying, leave the protocol off: its instructions and reminders change that behaviour. Record the conversation by transcript instead.
2. **Converse.** Work naturally in the AI system you are using.
3. **Confirm and checkpoint.** Confirm what you can of the metadata; save a checkpoint when useful. The command texts are beside the prompt.
4. **End.** Send the end command. Save the provider's data export or copy the whole conversation.
5. **Import and review.** In Log & evaluate, choose Conversation, open the session, and import the record and the transcript. Review the differences the Lab finds.
6. **Evaluate.** Score responses on the six criteria, classify follow-up prompts, and confirm metadata.
7. **Report.** The Methods report gains section 2.8 and Appendix H for conversations included in the report.

## Recording a conversation

- **Turn by turn.** Add a researcher prompt, then the response. Text pasted from the conversation is recorded as original.
- **Transcript.** Paste the whole conversation. The Lab proposes turns and speakers from common labels ("You said:", "User:", "Assistant:", "ChatGPT said:" and others). Review every turn: change a speaker, merge turns that belong together, remove interface text, before saving.
- **SPL record or checkpoint.** Paste what the AI system produced for a checkpoint or the end of a session. The Lab reads its header and turns, reports problems in plain words, and adds only turns not already recorded.
- **Provider data exports.** Choose the ZIP file of a ChatGPT or Claude data export, or its `conversations.json`, then the conversation. The Lab keeps the provider's times, the model recorded for each message and, for ChatGPT, the branches (regenerated responses and edited prompts). System, tool and hidden messages are not turned into turns; they stay in the stored copy of the export. See [provider-exports.md](provider-exports.md) for what is and is not known about these formats.
- **Research Session Record (JSON).** A record exported from the Lab, or written by another tool to the schema, is added as a new conversation.

## Verification

Every turn has a text status:

| Text status | Meaning |
|---|---|
| Original | Taken from the conversation itself |
| Reproduced by the AI, unverified | Given in an AI-generated record and not yet compared with an original |
| Reconstructed | Rebuilt from memory or inference; never counted as original |
| Corrected by the researcher | Original wording with a recorded correction |

When a record and a transcript of the same conversation are both imported, the Lab aligns them turn by turn. Each pair is identical, differs only in spacing, or differs in wording; a turn may be missing from one or the other. The original wording is kept. The AI's differing wording, a turn it left out, and a turn only it contains are each recorded as a discrepancy, which is itself evidence about the reliability of AI-generated records.

Gaps come from three places, each recorded with its source: the AI system's own list, jumps in its turn numbering, and the alignment. A gap that a later transcript fills is marked resolved.

**Coverage** is *complete* only when you confirm it after checking, and never while a gap is recorded or on the AI system's word alone. Otherwise it is *partial* (gaps known) or *not established*.

## Storage

Conversations are stored in the browser's IndexedDB database, separately from the rest of the Lab's data, because long conversations would exhaust the space available to ordinary browser storage. They belong to the project that was open when they were created. The Lab asks the browser to keep this data persistent and shows how much space is used.

- A project backup includes its conversations (backup format version 2). Backups made by earlier versions restore as before.
- Deleting a project deletes its conversations. Deleting a conversation removes its turns, imported records and evaluations, after a confirmation that names what will go.
- Where IndexedDB is unavailable, for example in some private-browsing windows, conversation features say so and the rest of the Lab works as before.
- Everything stays on this device. Imported text is treated as text, never as page content.

## Exports

| Export | Formats |
|---|---|
| Research Session Record ([schema](../schemas/spl-research-session-record.schema.json)) | JSON |
| Checkpoints and imported records, with their original text | JSON |
| Metadata with provenance, every assertion | CSV |
| Complete transcript, with all branches | Markdown, Word, PDF (print) |
| All turns with evaluations | CSV |
| Researcher prompt history | Markdown, CSV, Word; plain text sequence for reproduction |
| AI response history | Markdown |
| Classified sequence of researcher interventions | CSV |
| Turn evaluations, each with the prompt it answers | CSV |
| Analytical records: observations, decisions, developments, Claim History | Markdown, CSV |
| Claim histories | CSV, JSON |
| Redacted copies | Markdown, Word, PDF, CSV |

Turn identifiers are the same in every export, so separate files can be read together.

## In the methods report

Section 2.8 summarises the conversations included in the report: the systems and how they were identified, dates, counts of researcher prompts, AI responses, administrative messages and gaps (each counted separately), follow-up purposes, protocol use and version, the reviews that took place, and the provenance and coverage of each record. Appendix H reproduces each conversation with its metadata table and every turn. An AI-generated record is never described as a verified transcript.

## Views of a conversation

| View | What it shows |
|---|---|
| Conversation | The branch selected, turn by turn: each prompt with its purpose, each response with its evaluation, versions where the conversation branched, gaps, differences from AI records, and Details for each turn |
| Prompts | Every researcher prompt with its text status, for checking against the original: confirm, correct, or restore an omitted prompt |
| Claims | Claim History |
| Analysis | Conversation-level observations, researcher decisions, developments recorded on turns, persistent errors, the metadata reviews found in the AI's turns, imported checkpoints, and notes the AI system wrote |
| Timeline | One column per turn: purposes, developments, claims, checkpoints, gaps, model changes, versions, and the six scores, each a separate mark with nothing drawn between them |
| Branches | Every turn as a tree, with the branch shown marked |

## Branches

A conversation is a tree. On any response, "Add a regenerated response" records another version of it; on any prompt, "Add an edited version of this prompt" records a revised prompt, and what follows it is recorded on the new branch. Where a turn has several versions, the Conversation view shows "version 2 of 3" with buttons to move between them. ChatGPT exports bring their branches with them. An AI-generated record describes one branch only and is compared with the branch shown.

## Designing follow-up prompts

"Design a follow-up prompt" offers a starting wording for each purpose in the follow-up taxonomy, and one for testing susceptibility to the researcher's influence. Choose the response and the claim you are examining, add material such as counter-evidence, choose methodological requirements, then edit freely and copy. Saving it gives it an identifier (FP-001…). When the prompt you actually sent is recorded, it is linked to the design, automatically if the wording is identical, and any difference between the designed and the submitted wording is shown. The builder is optional: nothing else depends on it.

## Comparing conversations

In the Sensitivity study, "Conversations as study conditions" lists the project's conversations with their condition, comparison group, follow-up design (standardised or adaptive), protocol and model. Comparing two or more shows the conditions and model information side by side, marking where they differ or are unavailable; the substantive researcher prompts by position, with identical wording marked; the researcher's classification and the scores of the response that followed; and claims with the same comparable label. It warns when standardised and adaptive sequences are mixed, and when missing metadata limits comparability. The prompt sequence of each conversation can be copied to reproduce it.

## Redacted copies

"Redacted copy" withholds words or passages wherever they appear (with whole-word matching if wanted), or whole turns, each replaced by [withheld: reason]. It can find e-mail addresses and telephone numbers for you to consider. The record in the Lab is not changed. Redacted exports (transcript as Markdown, Word or PDF; prompts; all turns as CSV) say at the top that they are redacted and are not verbatim records, and their file names say REDACTED.

## Teaching case SPL-UC-003

A conversational extension of SPL-UC-001, opened from the Worked example menu as a project of its own. See [research-use-cases.md](research-use-cases.md#spl-uc-003-equality-in-two-declarations-as-a-research-conversation).
