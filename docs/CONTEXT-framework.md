# The CONTEXT Framework

*A proposed framework for situated and accountable scholarly prompting*

## The argument

Every prompt carries methodological and epistemological decisions. It names some actors and not others, chooses some terms over others, and sets what counts as an answer. When scholars delegate interpretive work to AI, the prompt becomes part of how knowledge is constructed.

Ask a model to "explain the Aba Women's Riot of 1929" and you will likely get a story of disorder put down by the colonial state. Ask it to examine "the 1929 Women's War" through women's political institutions, colonial taxation and collective resistance, and to separate evidence from interpretation, and a different history comes back. Neither output is the past. Both are artefacts of the prompt and the model.

Prompting can therefore work as a research method in the digital humanities, provided it is designed, documented and evaluated like one. CONTEXT is a checklist for doing that.

## The seven dimensions

### C: Conceptual grounding
Define the research problem and the theoretical assumptions behind it.

- State the research question in one or two sentences.
- Name the theoretical orientation (critical discourse analysis, gender history, ethnography of communication, and so on).
- Ask what the question takes for granted. A question about "tribal conflict" already contains an answer.

### O: Operationalisation
Translate scholarly concepts into explicit analytical instructions.

- Write the procedure as numbered steps a careful research assistant could follow.
- Define codes and categories. If you use a codebook, give coded examples (few-shot prompting) and check the model's coding against a hand-coded sample.
- Specify the output format and fields so outputs can be compared.

### N: Situated knowledge
Account for cultural, linguistic and historical specificity.

- Say whose knowledge this is, in which language, from which period and place.
- Note what an outsider, or a model trained mostly on outsiders' writing, is likely to misread.
- List contested terms and ask the model to comment on them.
- Keep indigenous-language terms in their original form with a gloss.
- Linguistic fluency in a model is not cultural validity. Plan for review by people with the relevant expertise.

### T: Traceability
Connect generated claims to identifiable evidence.

- Supply source texts with identifiers where possible (`[DOC-01]`, `[ED-02]`).
- Require a quotation and identifier for every substantive claim.
- Forbid invented quotations, sources, dates and people.
- Spot-check quotations against the originals. Models can misquote convincingly.

### E: Evaluation
Assess accuracy, validity and interpretive limits.

Score outputs on six criteria (1 = poor, 5 = strong):

| Criterion | What it measures |
|---|---|
| Factual accuracy | Whether claims agree with independent evidence |
| Contextual fidelity | Whether relevant cultural and historical context is preserved |
| Evidence traceability | Whether claims can be traced to their sources |
| Freedom from misrepresentation | Absence of stereotypes or unsupported generalisations |
| Interpretive plurality | Recognition of defensible alternative readings |
| Uncertainty calibration | Recognition of limits and missing knowledge |

Also record whether the output **adopted your framing without testing it**. A critical prompt can produce a critical-sounding answer simply because you asked for one. That is sycophancy, not analysis. Where possible, have subject specialists score independently and keep their disagreements on record.

### X: Cross-model examination
Test the stability of findings across prompts and systems.

- Run the same prompt on more than one model.
- Run it more than once on each model; outputs vary between runs.
- Vary the framing deliberately (the Lab's four-condition sensitivity study does this).
- Where relevant, run it in more than one language.
- A finding that appears under only one model or one wording is a finding about that model or wording.

### T: Transparency
Document AI involvement, methodological decisions and human oversight.

Record, for every output used in research:

- the exact prompt;
- model name and version;
- date of the run;
- interface and settings (temperature, system prompt, tools such as web search);
- who reviewed the output and what they changed or rejected.

Disclose AI use in publications, and say what role it played (see below).

## Four roles AI can play

Each role calls for a different method.

| Role | Examples | Key check |
|---|---|---|
| **Research tool** | Transcription, metadata extraction, coding | Accuracy against a hand-coded sample |
| **Object of study** | How a model represents a people, place or period | The prompt is the experimental condition; vary it systematically |
| **Interpretive aid** | Exploring hypotheses and alternative readings | Every reading stays under scholarly judgement |
| **Research infrastructure** | Retrieval over a curated archive | What the archive includes and leaves out |

## A four-condition sensitivity study

To test how much the prompt shapes the result, run one research task under four conditions with the same output specification:

1. **Baseline**: the research question only.
2. **Theory-grounded**: adds discipline and theoretical orientation.
3. **Context-grounded**: adds source material, cultural and historical context, and terminology.
4. **Evidence-constrained**: adds the analytical procedure and safeguards.

A small study (for example 10 research items × 4 conditions × 3 runs × 3 models = 360 outputs) is enough to show patterns worth reporting descriptively. Keep the results open: a fuller prompt may help, may introduce new errors, or may only make the model agree with you.

## Status

CONTEXT is offered as a proposal for discussion, testing and refinement. Its relationship to existing frameworks for AI-assisted research should be established through a literature review before strong claims of novelty are made.

## Background reading

- Bender, E. M., Gebru, T., McMillan-Major, A., & Shmitchell, S. (2021). On the dangers of stochastic parrots: Can language models be too big? *FAccT '21*.
- D'Ignazio, C., & Klein, L. F. (2020). *Data Feminism*. MIT Press.
- Drucker, J. (2014). *Graphesis: Visual Forms of Knowledge Production*. Harvard University Press.
- Mudimbe, V. Y. (1988). *The Invention of Africa*. Indiana University Press.
- Ngũgĩ wa Thiong'o (1986). *Decolonising the Mind*. James Currey.
- Noble, S. U. (2018). *Algorithms of Oppression*. NYU Press.
- Said, E. W. (1978). *Orientalism*. Pantheon.
