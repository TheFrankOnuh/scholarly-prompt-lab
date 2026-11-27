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
- **Provider data exports** (planned). The ChatGPT export is a tree of messages with times and model fields; there is no official schema, so the importer will be built and tested against real sample exports. Other providers will follow once their exports have been examined.

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

Each conversation can be exported as:

- the Research Session Record (JSON, [schema](../schemas/spl-research-session-record.schema.json));
- a transcript (Markdown), with turn identifiers, text statuses, classifications and gaps;
- the researcher's prompt history (Markdown and CSV);
- all turns with their evaluations (CSV).

## In the methods report

Section 2.8 summarises the conversations included in the report: the systems and how they were identified, dates, counts of researcher prompts, AI responses, administrative messages and gaps (each counted separately), follow-up purposes, protocol use and version, the reviews that took place, and the provenance and coverage of each record. Appendix H reproduces each conversation with its metadata table and every turn. An AI-generated record is never described as a verified transcript.

## Planned for later versions

Branching (regenerated responses and edited prompts), provider export import, Claim History, conversation-level observations, the follow-up prompt builder, conversations as conditions in the Sensitivity study, timelines, redaction, and a worked teaching case (SPL-UC-003).
