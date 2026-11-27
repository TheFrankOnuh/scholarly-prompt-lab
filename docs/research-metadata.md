# Research metadata and provenance

**SPL Research Session Protocol, version 0.2 (draft).** How a documented conversation records what is known about the AI system and the session, where each value came from, and whether it has been checked.

## Fields

<!-- generated:fields -->
| Field | Key | Required | Can the AI usually establish it? | May remain unavailable | Where to look |
|---|---|---|---|---|---|
| AI provider | `ai_provider` | Yes | Partly | No | [object Object] |
| AI product or application | `ai_product` | Yes | Partly | No | [object Object] |
| Model name | `model_name` | Yes | Partly | No | [object Object] |
| Model version or release identifier | `model_version` | Yes | Rarely | Yes | [object Object] |
| Research session start date | `session_start` | Yes | Rarely | No | [object Object] |
| Research session end date | `session_end` | Yes | Rarely | No | [object Object] |
| Individual message timestamps | `message_timestamps` | Where available | Rarely | Yes | [object Object] |
| Time and time zone | `time_zone` | Where available | No | Yes | [object Object] |
| Knowledge cutoff | `knowledge_cutoff` | Where available | Partly | Yes | [object Object] |
| Reasoning or thinking mode | `reasoning_mode` | Where available | Partly | Yes | [object Object] |
| Temperature | `temperature` | Where available | Rarely | Yes | [object Object] |
| Top-p | `top_p` | Where available | Rarely | Yes | [object Object] |
| Maximum output settings | `max_output` | Where available | Rarely | Yes | [object Object] |
| Other relevant generation settings | `other_settings` | Where available | Partly | Yes | [object Object] |
| Tools available | `tools_available` | Where available | Partly | Yes | [object Object] |
| Tools actually used | `tools_used` | Where available | Partly | Yes | [object Object] |
| Web browsing | `web_browsing` | Where available | Partly | Yes | [object Object] |
| External retrieval or search | `retrieval` | Where available | Partly | Yes | [object Object] |
| Uploaded files | `uploaded_files` | Where available | Partly | Yes | [object Object] |
| Memory or personalisation | `memory` | Where available | Rarely | Yes | [object Object] |
| Relevant custom instructions | `custom_instructions` | Where available | Rarely | Yes | [object Object] |
| AI application or access method | `access_method` | Where available | No | No | [object Object] |
| Model changes during the conversation | `model_changes` | Where available | Partly | Yes | [object Object] |
<!-- /generated -->

The Lab also records, itself, the protocol version, the session identifier, the record schema version, the Lab version, and the times of its own events: prompt generated, prompt copied, record imported, record confirmed, evaluation recorded, report generated. These are Lab events. They are never used as the time a prompt was submitted or a response generated.

Counts of researcher prompts, AI responses, administrative messages and gaps are derived from the turns and kept separately; they are never assumed to be equal.

Fields marked "Where available" are recorded when they can be established. Session end date is required once the session has ended. Every required field is present in an exported record, with "Unknown" where nothing is known. The model can also be recorded for each turn, where a conversation changed model part-way.

The Lab also derives a statement of how the model was identified, written only from the recorded assertions, for example: "The AI system identified its model through self-reported metadata. The researcher confirmed the displayed model name. The exact backend release identifier was not exposed by the provider."

## Value statuses

| Status | Meaning |
|---|---|
| Known | A value is recorded. |
| Researcher confirmation required | A value is recorded but has not been confirmed, for example because the AI system reported it. |
| Unknown | Not yet established. The researcher can leave it with a recorded reason. |
| Not exposed by provider | The provider does not make it available. This is a finding, not a failure, and counts as complete documentation. |
| Not applicable | Does not apply to this session, for example temperature for a system with no such setting. |

## Provenance: origin and verification are separate

Every value is an **assertion** with two separate attributes.

**Origin**, where the value came from:

| Origin | Example |
|---|---|
| Recorded by the Lab (`system_recorded`) | Session identifier, protocol version, the time a prompt was copied |
| Recorded by the provider (`provider_recorded`) | A timestamp or model identifier in a provider's data export |
| Reported by the AI system (`ai_reported`) | The model name the AI system gives in its Initial Record |
| Reported by the researcher (`researcher_reported`) | The model the researcher read from the model selector |
| Official documentation (`official_documentation`) | A provider's model page, with the date consulted |
| Origin unknown (`unknown`) | A value whose source cannot be traced |

**Verification**, whether it has been checked:

| Verification | Meaning |
|---|---|
| Not yet reviewed (`unreviewed`) | Recorded, not checked |
| Confirmed by the researcher (`researcher_confirmed`) | The researcher checked it, for example against the application |
| Compared with the original (`compared_with_original`) | Checked against a transcript or provider export |
| Disputed (`disputed`) | Sources disagree, and the disagreement is not resolved |
| Cannot be verified (`unavailable`) | No means of checking exists |

Whatever basis an AI system claims for a value ("shown by the application", for instance), the value is stored as AI-reported and unreviewed: the AI system's statement about where a value came from is itself AI-reported.

**Rules.**

1. Assertions are never overwritten. A field holds every assertion ever made, oldest first.
2. Confirmation adds a verification status to an assertion. It never changes its origin.
3. A correction adds a new assertion, with its reason, and the earlier one remains.
4. When assertions from different sources give different values, the field is marked "Sources disagree" and is not counted as documented. The researcher chooses the value to report and gives a reason (stored as the field's resolution), or leaves the disagreement documented. Nothing is deleted.
5. The methods report writes only what the assertions support. With an AI-reported model name confirmed by the researcher against the model selector, and the backend version marked not exposed, it can say exactly that; without the confirmation, it cannot say the name was confirmed.

## Guidance by environment

The Lab gives guidance by type of environment rather than naming menus, because interfaces change between versions.

- **Consumer chat application** (web, desktop, mobile). The model selector usually shows the advertised model and sometimes a reasoning mode. Message times may appear on hover or in a data export. Memory and personalisation are usually in account settings. Sampling settings such as temperature are usually not exposed: record them as such.
- **API.** The request configuration holds the model identifier and sampling settings; the response usually returns the exact model identifier. Record both.
- **Locally hosted model.** The model file name, its release and the inference settings are in the local configuration. Record the file name and, if available, its checksum.
- **Provider data export.** May contain message identifiers, timestamps and model identifiers per message.
- **Official documentation and release notes.** Can establish what an advertised model name referred to on a given date. Record the page and the date consulted.

## Avoiding fabricated values

- The protocol forbids invention and gives the AI system the words to use when information is missing.
- AI-reported values are always labelled as such and start unreviewed.
- The Lab never fills a field with its own clock time unless the field is a Lab event.
- Where a provider export and an AI record disagree, both are kept and the export is shown first.
- The researcher is never asked for passwords, keys, tokens or private instructions. Memory and custom instructions may be recorded only as existing, without their content.
