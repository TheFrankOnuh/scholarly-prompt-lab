# Follow-up taxonomy

**Version 0.1.** A vocabulary for describing what a researcher's follow-up prompt does. It is a proposed analytical resource, not a validated instrument: the categories overlap by design, and their reliability between coders has not yet been tested.

## Categories

<!-- generated:taxonomy -->
| Category | Key | Definition |
|---|---|---|
| Clarification | `clarification` | Asks the AI to resolve an ambiguity in its own claim or wording. |
| Evidence examination | `evidence_examination` | Asks for the evidence that supports a specific claim. |
| Counter-evidence | `counter_evidence` | Introduces or requests evidence against an interpretation. |
| Contextual correction | `contextual_correction` | Corrects a cultural, linguistic or historical error. |
| Theoretical reframing | `theoretical_reframing` | Asks for a reading through another theoretical perspective. |
| Interpretive challenge | `interpretive_challenge` | Questions the reasoning or assumptions behind an interpretation. |
| Methodological correction | `methodological_correction` | Points out a departure from the research procedure. |
| Alternative interpretation | `alternative_interpretation` | Asks for other defensible readings. |
| Scope correction | `scope_correction` | Addresses claims that go beyond the evidence. |
| Synthesis | `synthesis` | Asks for an interpretation built from earlier exchanges. |
| Analytical extension | `analytical_extension` | Extends the inquiry to new material or questions. |
| Instruction refinement | `instruction_refinement` | Revises or clarifies the analytical instructions. |
| Researcher-defined | `researcher_defined` | A purpose the researcher names. |
<!-- /generated -->

**Administrative** is a designation, not a category: SPL commands, metadata confirmations and protocol reminders. Administrative exchanges are kept in the record and excluded from scoring by default.

## Use

- A prompt may have several categories.
- The classification is stored beside the prompt and never changes its wording.
- Only the researcher's classification counts. Suggestions, if a later version offers them, stay marked as suggestions until the researcher accepts them.
- A researcher-defined category needs a short label.

## Examples

| Category | Example follow-up |
|---|---|
| Clarification | "What do you mean by 'rework' here?" |
| Evidence examination | "Quote the passage that supports claim 2." |
| Counter-evidence | "Consider this passage, which seems to contradict that." |
| Contextual correction | "The term had a different meaning in 1848." |
| Theoretical reframing | "Read this through intertextuality instead." |
| Interpretive challenge | "What assumption leads you there?" |
| Methodological correction | "You did not separate observation from interpretation." |
| Alternative interpretation | "What else could this mean?" |
| Scope correction | "The excerpts cannot show legal effect." |
| Synthesis | "Bring together what we have established." |
| Analytical extension | "Now apply this to the 1866 petition." |
| Instruction refinement | "From now on, give one quotation per claim." |

## Reliability

Before the taxonomy is presented as established, two coders should classify the same set of follow-ups independently, agreement should be reported per category, and the definitions revised where agreement is low. Revisions will produce a new taxonomy version; each conversation record names the version it used (`taxonomy_version`).
