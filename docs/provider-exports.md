# Provider conversation exports

Scholarly Prompt Lab can read the data exports that ChatGPT and Claude let account holders download. This page says what the Lab reads, what it leaves out, and what is not yet known. The specification asked that the formats be examined before compatibility is claimed; the status below is stated with that in mind.

## Status

| Provider | What the Lab reads | Branches | How it was built and tested | Status |
|---|---|---|---|---|
| ChatGPT (OpenAI) | The ZIP file or its `conversations.json`: for each conversation, its title, creation and update times, and its message tree (`mapping`): each message's author role, text parts, creation time and recorded model (`model_slug`), its parent, and the current node | Yes: regenerated responses and edited prompts are siblings in the tree; the current node gives the branch shown | From the structure described by community tools that parse these exports, and tested with constructed samples (tests/conversations.test.js) | **Experimental.** Not yet checked against a real export from a current account. |
| Claude (Anthropic) | The ZIP file or its `conversations.json`: each conversation's name, times and `chat_messages`: sender (`human` or `assistant`), text (or text parts in `content`), creation time, and a parent message where one is recorded | Only where the export records a parent message; otherwise the messages are taken in order, and the Lab says so | From publicly described field names, and tested with constructed samples | **Experimental.** Field names beyond these have not been confirmed. |
| Others (Gemini, Copilot, Le Chat, local tools) | Not read directly | – | – | Paste the conversation as a transcript, or use the SPL record. |

No provider publishes a schema for these exports, and the formats change without notice. Until the importers have been checked against real exports, check the imported conversation against the application before relying on it, and keep the export file. The Lab keeps the chosen conversation's original JSON beside the imported turns, so nothing in it is lost even where the Lab does not read it.

## What is imported as turns, and what is not

- **Imported:** user messages as researcher prompts, and assistant messages as AI responses, with their text, times and model.
- **Not imported as turns:** system messages, hidden messages, tool and browsing messages, and messages with no text. They are counted on the import screen and remain in the stored copy of the export.
- **Non-text content** (an image, a file) is shown in the turn as `[non-text content: type]`, so the turn's position is kept. The content itself is not imported.

## Provenance

Every imported turn is recorded as original, with origin *recorded by the provider*. Times are recorded as the export gives them, in UTC. Session start and end dates, the availability of message timestamps, the time zone and the model(s) are recorded as metadata with the same origin; where the export records more than one model, the Lab also records a model change. A conversation that came from an export can be confirmed as complete with the basis *provider export*.

## Imported after an AI-generated record

When an export is imported into a conversation that already holds an AI-generated record, its branch shown is compared with the record turn by turn, its wording is kept, and every difference from the AI's record is recorded. Its other branches are then attached to the turns they grew from.

## Privacy

An export contains every conversation in the account. The Lab reads the whole file on the device, lists the conversations, and stores only the one chosen. Nothing is uploaded.

## What would complete this work

1. Sample exports from current ChatGPT and Claude accounts, containing a short test conversation with a regenerated response and an edited prompt.
2. A comparison of the Lab's import with the conversation as shown in each application.
3. Adjustments to the importers, and the samples (with any personal content removed) added to the test fixtures.
