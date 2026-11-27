# Research metadata and provenance

**SPL Research Session Protocol, version 0.1 (draft).** How a documented conversation records what is known about the AI system and the session, where each value came from, and whether it has been checked.

## Fields

<!-- generated:fields -->
| Field | Key | Required | Can the AI usually establish it? | May remain unavailable | Where to look |
|---|---|---|---|---|---|
| AI provider and product | `ai_system` | Yes | Partly | No | The application's name and its provider, as shown in the interface or your account. |
| Model name as shown | `model_name` | Yes | Partly | No | The model selector in the application; the model field of an API request; the file name of a local model. |
| Model version or release identifier | `model_version` | Yes | Rarely | Yes | API responses usually return the exact model identifier. Consumer applications often do not show it: record it as not exposed by the provider. |
| Access method | `access_method` | Yes | No | No | How you reached the system: web browser, desktop application, mobile application, API, or a model run on your own computer. |
| Session start date | `session_start` | Yes | Rarely | No | The conversation's date in the application's history, a data export, or your own note of when you began. |
| Session end date | `session_end` | Where available | Rarely | No | The date of the last message, in the application, a data export or your own note. |
| Time zone of the dates | `time_zone` | Where available | No | Yes | Your device's time zone, or the offset given in a data export. |
| Reasoning or thinking mode | `reasoning_mode` | Where available | Partly | Yes | Usually beside the model selector, or in the API request. |
| Temperature | `temperature` | Where available | Rarely | Yes | API request settings. Consumer applications usually do not show it: record it as not exposed by the provider. |
| Top-p | `top_p` | Where available | Rarely | Yes | API request settings. Usually not exposed in consumer applications. |
| Maximum output length | `max_output` | Where available | Rarely | Yes | API request settings; sometimes the application's documentation. |
| Other settings | `other_settings` | Where available | Partly | Yes | The application's settings, or your API request. |
| Tools available and used | `tools` | Where available | Partly | Yes | The tools shown as switched on in the conversation, and any tool use visible in the responses. |
| Web browsing | `web_browsing` | Where available | Partly | Yes | The application's search or browsing switch for this conversation. |
| Uploaded files or retrieval | `uploaded_files` | Where available | Partly | Yes | The files attached to the conversation or project in the application. |
| Memory or personalisation | `memory` | Where available | Rarely | Yes | The application's personalisation or memory settings. You may record only that they exist, without their content. |
| Knowledge cutoff | `knowledge_cutoff` | Where available | Partly | Yes | The provider's model documentation. |
| Model changes during the conversation | `model_changes` | Where available | Partly | Yes | The model shown beside each response, or a data export's per-message model field. |
<!-- /generated -->

The Lab also records, itself, the protocol version, the session identifier, the record schema version, the Lab version, and the times of its own events: prompt generated, prompt copied, record imported, record confirmed, evaluation recorded, report generated. These are Lab events. They are never used as the time a prompt was submitted or a response generated.

Counts of researcher prompts, AI responses, administrative messages and gaps are derived from the turns and kept separately; they are never assumed to be equal.

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
4. When assertions conflict, both are shown. The researcher records a resolution with a reason, or leaves the disagreement documented.
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
