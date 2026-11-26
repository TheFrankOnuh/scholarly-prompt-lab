# The CONTEXT Framework

The CONTEXT framework provides a methodological basis for situated and accountable scholarly prompting. When researchers use AI to undertake interpretive work, the instructions they give shape the knowledge produced. The prompt therefore forms part of the research method and warrants the same methodological scrutiny as other research instruments.

## The argument

Every prompt carries methodological and epistemological decisions. It names some actors and not others, chooses some terms over others, and sets what counts as an answer. When scholars delegate interpretive work to AI, the prompt becomes part of how knowledge is constructed.

Ask a model to "explain the Aba Women's Riot of 1929" and you will likely get a story of disorder put down by the colonial state. Ask it to examine "the 1929 Women's War" through women's political institutions, colonial taxation and collective resistance, and to separate evidence from interpretation, and a different history comes back. Neither output is the past. Both are artefacts of the prompt and the model.

Prompting can therefore work as a research method in the digital humanities, provided it is designed, documented and evaluated like one. CONTEXT is a checklist for doing that.

## The seven dimensions

### C — Conceptual grounding
Establish the research problem and the theoretical assumptions that inform the inquiry.

*What am I investigating, and which concepts inform my analysis?*

- State the research question in one or two sentences.
- Name the theoretical orientation (critical discourse analysis, gender history, ethnography of communication, and so on).
- Ask what the question takes for granted. A question about "tribal conflict" already contains an answer.

### O — Operationalisation
Translate theoretical concepts and methodological choices into instructions the AI system can execute.

*What analytical tasks should the model perform, and according to which procedures?*

- Write the procedure as numbered steps a careful research assistant could follow.
- Define codes and categories. If you use a codebook, give coded examples (few-shot prompting) and check the model's coding against a hand-coded sample.
- Specify the output format and fields so outputs can be compared.

### N — Situated knowledge
Consider the cultural, linguistic and historical conditions in which knowledge is produced and understood.

*Whose knowledge informs the analysis, and what might the model misunderstand or overlook?*

- Say whose knowledge this is, in which language, from which period and place.
- Note what an outsider, or a model trained mostly on outsiders' writing, is likely to misread.
- List contested terms and ask the model to comment on them.
- Keep indigenous-language terms in their original form with a gloss.
- Linguistic fluency in a model is not cultural validity. Plan for review by people with the relevant expertise.

### T — Traceability
Establish a verifiable connection between AI-generated claims and their supporting evidence.

*What evidence supports each claim, and how can I independently verify it?*

- Supply source texts with identifiers where possible (`[DOC-01]`, `[ED-02]`).
- Require a quotation and identifier for every substantive claim.
- Forbid invented quotations, sources, dates and people.
- Spot-check quotations against the originals. Models can misquote convincingly.

### E — Evaluation
Establish the criteria for assessing the accuracy and scholarly validity of AI-generated interpretations.

*What makes an interpretation defensible, and whose expertise is needed to assess it?*

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

### X — Cross-model examination
Examine how changes in models, prompt formulations and languages affect research findings.

*To what extent are my findings influenced by the AI system or the way I formulate my instructions?*

- Run the same prompt on more than one model.
- Run it more than once on each model; outputs vary between runs.
- Vary the framing deliberately (the Lab's four-condition sensitivity study does this).
- Where relevant, run it in more than one language.
- A finding that appears under only one model or one wording is a finding about that model or wording.

### T — Transparency
Maintain a record of AI involvement and the methodological decisions for which the researcher is responsible.

*Does my documentation allow another researcher to examine how I arrived at my findings?*

Record, for every output used in research:

- the exact prompt;
- model name and version;
- date of the run;
- interface and settings (temperature, system prompt, tools such as web search);
- who reviewed the output and what they changed or rejected.

Disclose AI use in publications, and say what role it played (see below).

## Four roles of AI in humanities research

Each role calls for a different method.

### Research tool
AI supports tasks such as transcription, data extraction and coding. Researchers should assess its performance against independently examined samples.

### Object of study
AI becomes the subject of scholarly investigation. Researchers may examine its assumptions, representations or patterns of response. Prompt design forms part of the research method.

### Interpretive aid
AI assists researchers in exploring hypotheses and alternative interpretations. The researcher retains responsibility for assessing the validity of those interpretations.

### Research infrastructure
AI facilitates access to scholarly materials and curated archives. Researchers should account for the scope and limitations of the collections on which their findings depend.

## A four-condition sensitivity study

To test how much the prompt shapes the result, run one research task under four conditions with the same output specification:

1. **Baseline**: the research question only.
2. **Theory-grounded**: adds discipline and theoretical orientation.
3. **Context-grounded**: adds source material, cultural and historical context, and terminology.
4. **Evidence-constrained**: adds the analytical procedure and safeguards.

A small study (for example 10 research items × 4 conditions × 3 runs × 3 models = 360 outputs) is enough to show patterns worth reporting descriptively. Keep the results open: a fuller prompt may help, may introduce new errors, or may only make the model agree with you.

## Status

The relationship of CONTEXT to existing frameworks for AI-assisted research should be established through a literature review before strong claims of novelty are made.

## Background reading

- Bender, E. M., Gebru, T., McMillan-Major, A., & Shmitchell, S. (2021). On the dangers of stochastic parrots: Can language models be too big? *FAccT '21*.
- D'Ignazio, C., & Klein, L. F. (2020). *Data Feminism*. MIT Press.
- Drucker, J. (2014). *Graphesis: Visual Forms of Knowledge Production*. Harvard University Press.
- Mudimbe, V. Y. (1988). *The Invention of Africa*. Indiana University Press.
- Ngũgĩ wa Thiong'o (1986). *Decolonising the Mind*. James Currey.
- Noble, S. U. (2018). *Algorithms of Oppression*. NYU Press.
- Said, E. W. (1978). *Orientalism*. Pantheon.
