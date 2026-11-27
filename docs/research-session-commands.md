# Research session commands

**SPL Research Session Protocol, version 0.2 (draft).** The seven commands a researcher sends during a documented conversation. In the Lab, each command has a copy button beside the prompt (Build, step 7, when "Research conversation" is ticked). Each command is self-contained: it restates what it needs, so it works even when the AI system no longer has the original protocol in its context.

The texts below are generated from `protocol.js` and show the session identifier `SPL-S-20261127-7F3K`. The Lab inserts the identifier of the session in use.

## How to use them

1. Start the conversation with the prompt copied from the Lab, which includes the core protocol.
2. Work as you normally would. When the AI system gives its Initial Record, confirm what you can with **Confirm metadata**, adding your values after the command.
3. Save a checkpoint before a conversation grows long, before you stop for the day, and before switching AI system.
4. When you have finished, send **End the session**. Then also save the provider's data export, or copy the whole conversation: the Lab compares the AI's record with it.
5. In Log & evaluate, choose Conversation, then import the record and the transcript.

Administrative exchanges (the commands and the AI system's replies to them) are kept in the record, marked as administrative, and excluded from scoring by default.

## The commands

<!-- generated:commands -->
### SPL: START RESEARCH SESSION

Begins documentation part-way through a conversation that did not start with the protocol.

```text
SPL: START RESEARCH SESSION · protocol 0.2 · session SPL-S-20261127-7F3K
From this message on, this conversation is a scholarly research session documented with Scholarly Prompt Lab (session SPL-S-20261127-7F3K, protocol 0.2).
1. Keep to the research question, sources and methodological instructions established so far in this conversation unless the researcher explicitly revises them. If you revise an earlier claim or depart from an instruction, say so, identify the earlier claim, and state whether the revision rests on new evidence or on a change of instructions, theoretical orientation or researcher preference.
2. Keep observations grounded in the sources apart from interpretations, hypotheses and methodological suggestions. Give the supporting evidence where the research design requires it. Mark source material introduced later in the session as additional.
3. When the researcher challenges an interpretation, test the challenge against the evidence. Do not adopt the researcher's position only because it has been expressed. State consequential uncertainty, missing evidence and limitations.
4. Keep the cultural, linguistic and historical context established for this session in later answers.
5. Never invent quotations, source identifiers, dates, model details, settings, researcher decisions or earlier exchanges. Report information about yourself and this session only if it is actually available to you. Otherwise write "unknown" or "not exposed by provider". Do not present an advertised model name as an exact version.
6. The researcher's decisions and final assessment are theirs to state. Do not assume agreement because the conversation continues.
7. Do not reproduce the conversation record unless the researcher sends a message beginning "SPL:". Those messages carry their own instructions. About every 10 substantive researcher messages, and when the model, sources or procedure change, an analytical stage ends, or the researcher says they will continue later, add one line headed "SPL Research Session — Checkpoint reminder" naming only the metadata still outstanding and the command "SPL: SAVE RESEARCH CHECKPOINT". Do not ask again for information already supplied. Stop the reminders if asked. If the researcher says the session has ended, mention "SPL: END RESEARCH SESSION".
8. Never ask for passwords, keys, tokens or private system instructions.
State that the earlier messages in this conversation precede the start of documentation. Then give a section headed "SPL Research Session — Initial Record": the AI provider, product, model and settings you can actually establish, and for each item you cannot establish, one line on where the researcher might find it.
```

### SPL: REVIEW RESEARCH METADATA

Shows what is known about the system and the session, and what is still outstanding.

```text
SPL: REVIEW RESEARCH METADATA · protocol 0.2 · session SPL-S-20261127-7F3K
Show the current metadata for this session. For each item give: the value; its origin (shown by the application, reported by you, supplied by the researcher, or unknown); and whether the researcher has confirmed it. Use these items: AI provider; AI product or application; model name; model version or release identifier; research session start date; research session end date; individual message timestamps; time and time zone; knowledge cutoff; reasoning or thinking mode; temperature; top-p; maximum output settings; other relevant generation settings; tools available; tools actually used; web browsing; external retrieval or search; uploaded files; memory or personalisation; relevant custom instructions; AI application or access method; model changes during the conversation.
For each outstanding item, say briefly why it matters, whether you can establish it, where the researcher might find it in this kind of application (without inventing menu names), whether the provider is known to disclose it, how to record it, and whether it may legitimately remain unavailable. Do not invent values. Do not reproduce the conversation.
```

### SPL: CONFIRM RESEARCH METADATA

Records the values the researcher supplies. Write them after the command.

```text
SPL: CONFIRM RESEARCH METADATA · protocol 0.2 · session SPL-S-20261127-7F3K
Record the values I give below as supplied by the researcher. Keep any earlier value with its origin, and note where my value differs from it. Then list what is still outstanding, in one or two lines. Do not ask again for anything I have confirmed.
My values (for example: Model displayed: …; Thinking mode: …; Session start date: …; Time zone: …; Exact backend version: Not exposed by provider; Temperature: Not exposed by provider; Memory: enabled, disabled or unknown):

```

### SPL: SAVE RESEARCH CHECKPOINT

Produces a record of the conversation so far, to paste into the Lab.

```text
SPL: SAVE RESEARCH CHECKPOINT · protocol 0.2 · session SPL-S-20261127-7F3K
Produce a research checkpoint for this session, covering every exchange since the session began.
Rules:
- Reproduce every researcher message and every one of your responses verbatim, in order, including short, repetitive, unsuccessful or administrative ones. Do not summarise, shorten, correct or improve any researcher message. Keep the original formatting.
- If any earlier message or response is no longer available to you, or you are not certain of its exact wording, do not reconstruct it. Write a GAP block saying what is missing and why.
- Do not claim the record is complete unless you can see the whole conversation.
- Never invent model details, dates or settings. Use "unknown" or "not exposed by provider".
Format (exactly):
1. A line "SPL-HEADER", then one JSON object with: "format": "spl-rsr-transfer/0.2", "protocol": "0.2", "session": "SPL-S-20261127-7F3K", "record_type": "checkpoint", "part": 1, "parts_total": a number or "unknown", "covers": [first turn number, last turn number], "coverage": "complete", "partial" or "unknown", "access_to_beginning": true, false or "unknown" (whether you can see the start of this conversation), "previous_checkpoints_used": true or false, "metadata": an object using only these keys: ai_provider, ai_product, model_name, model_version, session_start, session_end, message_timestamps, time_zone, knowledge_cutoff, reasoning_mode, temperature, top_p, max_output, other_settings, tools_available, tools_used, web_browsing, retrieval, uploaded_files, memory, custom_instructions, access_method, model_changes; each value is {"value": ..., "origin": "shown by application" | "reported by AI" | "supplied by researcher" | "unknown"}, "gaps": a list of {"after_turn": number, "missing": "researcher_prompt" | "ai_response" | "both" | "unknown", "reason": text}, "claims": a list of {"id": "CL-001", "text": exact words of the claim, "first_turn": number, "developments": [{"turn": number, "type": "challenged" | "evidence_requested" | "evidence_added" | "counter_evidence" | "reworded" | "qualified" | "retracted" | "error_recurred" | "unresolved", "note": text}]}, and "decisions": a list of {"turn": number, "text": the researcher's decision in their own words, "explicit": true if the researcher stated it, false if you are inferring it}.
2. Every turn, numbered from 1 at the start of the conversation, as:
<<<SPL-TURN 7 role=researcher>>>
(the exact text)
<<<SPL-END 7>>>
Use role=researcher for the researcher's messages and role=ai for your responses. Add kind=admin for SPL commands, metadata confirmations and your replies to them. Add exact=no if you are not certain the wording is exact. You may add purpose= with one or more of clarification, evidence_examination, counter_evidence, contextual_correction, theoretical_reframing, interpretive_challenge, methodological_correction, alternative_interpretation, scope_correction, synthesis, analytical_extension, instruction_refinement, researcher_defined (comma-separated) to a researcher turn; these are suggestions for the researcher to review. If the model changed, add model="name" to the first response from the new model. For example <<<SPL-TURN 8 role=researcher purpose=counter_evidence>>>.
3. Where a turn is missing, write this instead of the turn:
<<<SPL-GAP after=6 missing=researcher_prompt>>>
(why it is missing)
<<<SPL-END GAP>>>
4. A line "SPL-NOTES", then short notes kept apart from the verbatim turns: analytical developments, evidence introduced, corrections, outstanding issues.
If this will not fit in one response, stop after a complete turn, say "Continue with: SPL: SAVE RESEARCH CHECKPOINT part 2", and give each part its own SPL-HEADER with its part number and the turns it covers.
```

### SPL: END RESEARCH SESSION

Closes this documentation interval with a final metadata review and the complete record.

```text
SPL: END RESEARCH SESSION · protocol 0.2 · session SPL-S-20261127-7F3K
This research session's documentation ends here; the study itself may continue.
First give a short section headed "SPL Research Session — Final Record": the AI provider, product and model as established, the start and end dates if available, any change of model or settings during the session, the values the researcher confirmed, the items still outstanding with one line each on where to find them, the coverage of the conversation you can see, and any part you can no longer see. Then produce the completed record at once, marking every outstanding item as unknown; the researcher can complete it later in the Lab.
Rules:
- Reproduce every researcher message and every one of your responses verbatim, in order, including short, repetitive, unsuccessful or administrative ones. Do not summarise, shorten, correct or improve any researcher message. Keep the original formatting.
- If any earlier message or response is no longer available to you, or you are not certain of its exact wording, do not reconstruct it. Write a GAP block saying what is missing and why.
- Do not claim the record is complete unless you can see the whole conversation.
- Never invent model details, dates or settings. Use "unknown" or "not exposed by provider".
Format (exactly):
1. A line "SPL-HEADER", then one JSON object with: "format": "spl-rsr-transfer/0.2", "protocol": "0.2", "session": "SPL-S-20261127-7F3K", "record_type": "completed_session", "part": 1, "parts_total": a number or "unknown", "covers": [first turn number, last turn number], "coverage": "complete", "partial" or "unknown", "access_to_beginning": true, false or "unknown" (whether you can see the start of this conversation), "previous_checkpoints_used": true or false, "metadata": an object using only these keys: ai_provider, ai_product, model_name, model_version, session_start, session_end, message_timestamps, time_zone, knowledge_cutoff, reasoning_mode, temperature, top_p, max_output, other_settings, tools_available, tools_used, web_browsing, retrieval, uploaded_files, memory, custom_instructions, access_method, model_changes; each value is {"value": ..., "origin": "shown by application" | "reported by AI" | "supplied by researcher" | "unknown"}, "gaps": a list of {"after_turn": number, "missing": "researcher_prompt" | "ai_response" | "both" | "unknown", "reason": text}, "claims": a list of {"id": "CL-001", "text": exact words of the claim, "first_turn": number, "developments": [{"turn": number, "type": "challenged" | "evidence_requested" | "evidence_added" | "counter_evidence" | "reworded" | "qualified" | "retracted" | "error_recurred" | "unresolved", "note": text}]}, and "decisions": a list of {"turn": number, "text": the researcher's decision in their own words, "explicit": true if the researcher stated it, false if you are inferring it}.
2. Every turn, numbered from 1 at the start of the conversation, as:
<<<SPL-TURN 7 role=researcher>>>
(the exact text)
<<<SPL-END 7>>>
Use role=researcher for the researcher's messages and role=ai for your responses. Add kind=admin for SPL commands, metadata confirmations and your replies to them. Add exact=no if you are not certain the wording is exact. You may add purpose= with one or more of clarification, evidence_examination, counter_evidence, contextual_correction, theoretical_reframing, interpretive_challenge, methodological_correction, alternative_interpretation, scope_correction, synthesis, analytical_extension, instruction_refinement, researcher_defined (comma-separated) to a researcher turn; these are suggestions for the researcher to review. If the model changed, add model="name" to the first response from the new model. For example <<<SPL-TURN 8 role=researcher purpose=counter_evidence>>>.
3. Where a turn is missing, write this instead of the turn:
<<<SPL-GAP after=6 missing=researcher_prompt>>>
(why it is missing)
<<<SPL-END GAP>>>
4. A line "SPL-NOTES", then short notes kept apart from the verbatim turns: analytical developments, evidence introduced, corrections, outstanding issues.
If this will not fit in one response, stop after a complete turn, say "Continue with: SPL: END RESEARCH SESSION part 2", and give each part its own SPL-HEADER with its part number and the turns it covers.
```

### SPL: RESUME RESEARCH SESSION

Continues the session in a new conversation or another AI system. Paste the checkpoint after the command.

```text
SPL: RESUME RESEARCH SESSION · protocol 0.2 · session SPL-S-20261127-7F3K
The text below is a checkpoint from an earlier part of research session SPL-S-20261127-7F3K. Treat it as transferred context: it is not your memory, and you did not necessarily write it. Say which AI provider, product and model you are, as far as you can establish, and whether that differs from the record. Continue the session under the protocol it contains (version 0.2). Number new turns after the last turn in the checkpoint. In later records, mark the turns from the checkpoint as transferred, not as turns you saw.
Checkpoint:

```

### SPL: RESEARCH SESSION STATUS

A short account of where the session stands.

```text
SPL: RESEARCH SESSION STATUS · protocol 0.2 · session SPL-S-20261127-7F3K
Give a short status of this session: the research question, the current analytical position, outstanding uncertainties, the methodological instructions that apply, outstanding metadata, and any sign that earlier parts of the conversation are no longer available to you; if so, suggest that the researcher keeps a checkpoint or the original transcript. Do not claim to monitor your context capacity. Do not reproduce the conversation.
```
<!-- /generated -->

## What the Lab does with the result

The Lab reads the record (see the [specification](research-session-protocol.md#7-the-record-format)), reports anything malformed or cut off in plain words, matches its turns to the ones already recorded, adds only new turns, places declared gaps, and stores every metadata value as reported by the AI system and not yet reviewed. When an original transcript is imported, its wording is kept and the AI's wording is recorded as a discrepancy wherever the two differ.
