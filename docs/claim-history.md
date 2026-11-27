# Claim History

Claim History follows a knowledge claim through a conversation: where it first appears, how it is challenged, what evidence is brought to it, and how it is reworded, qualified or withdrawn. In the Lab: Log & evaluate, Conversation, Claims. From any AI response, "Record a claim from this response" starts a claim with the words you select.

## Structure

A **claim** has:

- an identifier, for example `CL-001`;
- its original wording, quoted from the turn where it first appears, with that turn's identifier;
- source references, where the claim cites sources;
- a sequence of **events**.

An **event** has a type, the turn where it occurs, and a note. Types:

challenged · evidence requested · evidence added · counter-evidence introduced · reworded · narrowed · widened · qualified · reaffirmed · retracted · error recurred · researcher decision · left unresolved

A claim may also carry a **comparable label**, so that the same claim can be followed across conversations in the Sensitivity study, and its sources. The Lab says whether the claim's wording is found exactly in the turn where it is said to appear. Each event shows the researcher's scores for that response, so the claim and its evaluation can be read together.

Three wordings are kept apart: the claim as first stated, the AI system's later wording, and the researcher's own interpretation.

## Sequence, not cause

Events are placed in order, with turn references. The view never draws a line from a researcher prompt to a change in a claim unless the researcher has recorded that link and the reason for it. The interface writes "followed" and "preceded", not "caused". Claims and developments suggested by an AI-generated record (the `claims` list in its header) arrive as unverified suggestions, and count only once the researcher confirms them.

## Export

Claim histories export as CSV and JSON, with the stable turn identifiers of the Research Session Record, so they can be read alongside the transcript.
