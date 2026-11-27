# Claim History (specification, planned)

Claim History follows a knowledge claim through a conversation: where it first appears, how it is challenged, what evidence is brought to it, and how it is reworded, qualified or withdrawn. It is planned for a later version of the Lab; this document specifies it so that records made now can be extended without change.

## Structure

A **claim** has:

- an identifier, for example `CL-001`;
- its original wording, quoted from the turn where it first appears, with that turn's identifier;
- source references, where the claim cites sources;
- a sequence of **events**.

An **event** has a type, the turn where it occurs, and a note. Types:

challenged · evidence requested · evidence added · counter-evidence · reworded · narrowed · widened · qualified · retracted · recurred as an error · researcher decision · unresolved

Three wordings are kept apart: the claim as first stated, the AI system's later wording, and the researcher's own interpretation.

## Sequence, not cause

Events are placed in order, with turn references. The view never draws a line from a researcher prompt to a change in a claim unless the researcher has recorded that link and the reason for it. The interface writes "followed" and "preceded", not "caused". A claim linked by a suggestion, if a later version offers suggestions, stays marked unverified until the researcher confirms it.

## Export

Claim histories export as CSV and JSON, with the stable turn identifiers of the Research Session Record, so they can be read alongside the transcript.
