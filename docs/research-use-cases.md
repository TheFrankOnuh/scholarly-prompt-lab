# Scholarly Prompt Lab: Research Applications and Methodological Use Cases

Version 1.0 | 26 November 2026

## About these examples

These two worked teaching cases demonstrate how the Scholarly Prompt Lab (SPL) can support humanities and social science research. Each uses a deliberately small corpus of authentic primary-source excerpts so that the reader can independently inspect every textual claim. The cases are suitable for graduate methods instruction and can be expanded into larger research projects.

The example responses below are constructed teaching specimens, including deliberately introduced errors. They are not transcripts of independently executed model runs. The accompanying scores are illustrative applications of the evaluation rubric, not empirical performance measurements or human-confirmed evaluations. No claim is made that SPL improves model performance. Researchers can test that question by executing the protocols themselves. Keep this notice visible in the application and in downloaded versions.

# Use case 01 — Equality, citizenship and political belonging

**Identifier:** SPL-UC-001 | **Version:** 1.0

**Disciplines:** History; political thought; discourse studies

**Method:** Comparative historical discourse analysis and source criticism

**AI roles:** Preliminary analysis; comparative analysis; interpretive examination

**Estimated teaching time:** 60–90 minutes for the worked example; additional time for repeated model runs.

## 1. Research problem and question

Political declarations often express claims in universal language while emerging from particular struggles over membership and authority. A researcher interested in the history of equality may ask how an existing political formula is adapted to challenge an earlier conception of political belonging. Comparing the Declaration of Independence with the Declaration of Sentiments provides a bounded opportunity to examine this process.

**Research question:** How does the Declaration of Sentiments (1848) rework the language of equality in the Declaration of Independence (1776), and what can this textual comparison establish about the representation of political subjects?

The question concerns the wording of the selected declarations. It does not ask whether equality was achieved, whether every signatory shared the same political commitments, or how particular audiences understood the texts. Such questions would require additional archival evidence.

**Conceptual orientation:** Historical contextualism and intertextuality. Historical contextualism directs attention to what political language does within a particular historical situation. Intertextuality directs attention to the reuse and transformation of earlier formulations. The comparison treats the wording as evidence of textual relationships while leaving claims about intention and reception open to further investigation.

**Learning objectives:** Identify a traceable textual change; distinguish textual observations from historical interpretations; evaluate an AI response that confuses a normative assertion with an accomplished social condition.

## 2. Source material and research design

### Corpus supplied to the model

The following excerpts are the entire analytical corpus for the initial exercise. The identifiers and passage labels are research metadata, not part of the original documents. The underlying nineteenth-century and eighteenth-century texts are public domain; the linked institutional pages provide provenance.

**DOC-01 | Declaration of Independence (1776), preamble**

P1: “that all men are created equal”

P2: “deriving their just powers from the consent of the governed”

Source: US National Archives, *Declaration of Independence: A Transcription*, https://www.archives.gov/founding-docs/declaration-transcript

**DOC-02 | Declaration of Sentiments (1848), opening declaration**

P1: “that all men and women are created equal”

P2: “deriving their just powers from the consent of the governed”

Source: US National Park Service, *Declaration of Sentiments*, https://home.nps.gov/wori/learn/historyculture/declaration-of-sentiments.htm

### Provenance and contextual notes

DOC-01 was adopted by the Continental Congress on 4 July 1776 in the context of declaring independence from Britain. DOC-02 emerged from the women's rights convention at Seneca Falls, New York, on 19–20 July 1848. The Smithsonian identifies the Declaration of Independence as the model for the later declaration. This contextual information is provided separately from the corpus; it should not be cited as if it were wording from either excerpt.

The unit of analysis is a labelled passage. Paired passages are selected purposively because they contain parallel statements about equality and the legitimacy of government. This is a comparison of four excerpts, not a representative corpus of American political discourse. The selection makes lexical comparison possible but cannot establish patterns across either full document. For a larger study, retrieve the full transcriptions and predefine which clauses will be compared.

### Working definitions and decision rules

| Category | Definition and inclusion rule |
|---|---|
| Named political subject | A person or group explicitly named as bearing equality. Code the words used; do not infer unnamed groups. |
| Lexical expansion | An identifiable addition to the corresponding formulation. Code only where both passages are available. |
| Continuity | A formulation retained across both texts. Record exact shared wording. |
| Normative assertion | A statement of a principle or entitlement. Do not code it as evidence of actual implementation. |
| Historical inference | A contextual interpretation extending beyond direct lexical observation. Label it explicitly and identify additional evidence needed. |

Borderline case: the expression “men” may invite discussion of generic versus gender-specific usage. Record that ambiguity rather than imposing a single reading. The explicit addition of “and women” remains observable regardless of how the earlier term is interpreted.

## 3. Applying the CONTEXT framework

| Dimension | Application in this case |
|---|---|
| CONTEXT dimension C: Conceptual grounding | The research question concerns political subjects and intertextual change. Historical contextualism limits unsupported claims about intention. |
| CONTEXT dimension O: Operationalisation | Apply the five working categories to paired passages using explicit decision rules. |
| CONTEXT dimension N: Situated knowledge | Distinguish the circumstances of the two declarations. Avoid projecting contemporary legal categories onto historical texts. |
| CONTEXT dimension T: Traceability | Identify the document and passage for every textual observation. Check quoted wording directly. |
| CONTEXT dimension E: Evaluation | Examine unsupported claims about legal equality, historical intentions and the scope of the corpus. |
| CONTEXT dimension X: Cross-model examination | Compare four prompt conditions in repeated runs, keeping the excerpts and output fields constant. |
| CONTEXT dimension T: Transparency | Record exact prompts, model identifiers, dates, settings, unedited responses and review decisions. |

## 4. Configure the Lab

Select History or the closest available discipline; source criticism/comparative textual analysis as the method; evidence-constrained prompting as the technique if supported. Enter the research question, definitions, procedure and source material above in their corresponding fields. Select the relevant AI-use categories at study level. Choose a table as the output format. The exact menu labels may differ between SPL releases; retain the scholarly design when mapping fields.

**Analytical procedure**

1. Identify the wording in each passage and its document provenance.
2. Compare DOC-01 P1 with DOC-02 P1 and record any additions or deletions.
3. Compare the statements about legitimate authority in P2.
4. Separate direct observations from interpretations.
5. Consider an alternative reading of the term “men”.
6. Identify claims that cannot be established from the supplied excerpts.
7. Verify each quotation and record its source identifier.

**Analytical standards:** Require verifiable textual evidence; prohibit fabricated claims and sources; distinguish observation from interpretation; consider alternative interpretations; examine disconfirming evidence; report uncertainty; limit claims to the supplied material.

## 5. Complete research prompt — condition D

```text
ROLE
Assist a historian undertaking comparative historical discourse analysis. Your response will be examined against the supplied sources.

RESEARCH QUESTION
How does the Declaration of Sentiments (1848) rework the language of equality in the Declaration of Independence (1776), and what can this textual comparison establish about the representation of political subjects?

SOURCE MATERIAL
DOC-01 P1: that all men are created equal
DOC-01 P2: deriving their just powers from the consent of the governed
DOC-02 P1: that all men and women are created equal
DOC-02 P2: deriving their just powers from the consent of the governed

CONTEXT
DOC-01 belongs to the 1776 declaration of American independence. DOC-02 belongs to the 1848 Seneca Falls women's rights convention. Treat these background notes as context, separate from the quoted corpus. Use historical contextualism and intertextuality to guide interpretation. Do not assume the historical meaning of a term is identical to its contemporary meaning.

ANALYTICAL PROCEDURE
Compare P1 across both documents and P2 across both documents. Identify explicitly named subjects, lexical expansion, continuity and normative assertions. Record historical inferences separately. Treat ambiguous uses of “men” as a matter for interpretation. Consider a defensible alternative reading. Identify any evidence needed to establish historical intention, reception or actual legal change.

STANDARDS
Use an exact quotation and document/passage identifier for each textual observation. Do not invent evidence. Separate the wording of the documents from your interpretation. Consider evidence that limits your interpretation. Report uncertainty when the excerpts cannot resolve a question. Do not assume that a declaration of equality demonstrates its implementation.

OUTPUT
Return a table with these fields: claim ID, document/passage ID, exact quotation, observation, interpretation, alternative interpretation or limitation, confidence (high/moderate/low with reason). Add a brief statement of the limits of the corpus. Do not add other output fields.
```

## 6. Prompt-sensitivity study

Use the exact same source excerpts, research question and output fields in every condition. Construct nested conditions for this exercise as follows: A contains ROLE, RESEARCH QUESTION, SOURCE MATERIAL and OUTPUT; B adds ANALYTICAL PROCEDURE; C adds CONTEXT to B; D adds STANDARDS to C. Maintain the order of the corresponding blocks in the full prompt. The labels describe this case's protocol and should be mapped to SPL's actual supported condition builder rather than silently changing it.

Run each condition three times on each of two selected AI systems, if feasible (24 runs). Use fresh conversations and the same available settings; record settings that cannot be controlled. Retain every response, including refusals and malformed tables. If resources are limited, run one model first and report the reduced design. Do not claim that differences between conditions generalise beyond the tested systems.

Predefine the outcomes: proportion of quotations matching their claimed passage, number of unsupported claims of legal implementation, recognition of ambiguity, and confirmed scores on the six SPL criteria. Use the same rubric across conditions. A full prompt may introduce omissions or new errors; do not assume condition D will be superior.

## 7. Worked output and verification

**Illustrative response specimen — constructed for teaching, not an actual model run.**

| Claim | Quotation and source | Example response |
|---|---|---|
| H1 | DOC-01 P1: “all men are created equal”; DOC-02 P1: “all men and women are created equal” | The later declaration explicitly adds women to the statement of equality. This may be read as a challenge to gendered political exclusion. Confidence: high for the wording; moderate for the interpretation. |
| H2 | DOC-01 P2 and DOC-02 P2: “consent of the governed” | Both documents retain consent as a basis for legitimate government. The excerpts do not establish how consent was practised. Confidence: high for the shared wording. |
| H3 | DOC-02 P1: “all men and women are created equal” | The declaration secured equal voting rights for women in 1848. Confidence: high. |

### Researcher review demonstration

H1: Both quotations match the supplied passages. Retain the observation. The interpretation is plausible in light of the supplied context; fuller evidence is needed for specific claims about intended political membership.

H2: The quotation matches both passages. Retain the observation and limitation.

H3: The quotation matches, yet the inference is unsupported. A declaration of equality does not establish legal change. Reject the claim. This is a central teaching example of why quotation matching and factual accuracy are separate tasks.

**Corrected analytical synthesis:** The selected excerpts show that the 1848 declaration explicitly expands the named subjects of equality while retaining the earlier formulation about the consent of the governed. This supports an interpretation of textual adaptation in the service of a broader political claim. The excerpts do not establish the effects of the declaration or the legal status of voting rights at the time.

### Illustrative scoring record

| Criterion | Example score (1–5) | Rationale |
|---|---:|---|
| Factual accuracy | 2 | H3 makes a consequential unsupported historical assertion. |
| Contextual fidelity | 3 | Broad context is recognised; H3 collapses declaration and implementation. |
| Evidence traceability | 5 | All quoted fragments can be located in the stated passages. |
| Freedom from misrepresentation | 2 | H3 misrepresents the effect of the declaration. |
| Interpretive plurality | 3 | H1 offers a plausible reading but leaves the alternative meaning of “men” unexplored. |
| Uncertainty calibration | 2 | H3 is stated with unjustified confidence. |

These are worked scoring judgements for the constructed specimen. Actual researchers should apply the Lab's existing rubric and confirm their own scores. Do not include these scores in empirical condition averages.

**Output-level decision:** Used after corrections (illustrative). Error category: unsupported inference from textual evidence to historical outcome. Preserve the original specimen alongside the corrected synthesis.

## 8. Sample AI methods report

### Generative AI disclosure

This teaching case demonstrates the intended use of generative AI for preliminary historical comparison and interpretive examination. The worked response and scoring record were constructed for instructional purposes. No independent model run or human-confirmed assessment is reported here.

### Research methodology

**AI systems and conditions of use:** No model runs recorded. Record model/version, date and settings when the protocol is executed.

**Prompt design and analytical procedure:** A four-passage purposive corpus was assembled from two historical declarations. The research question concerns lexical change and continuity. The evidence-constrained procedure uses source identifiers and predefined analytical categories. The full prompt is reproduced in section 5.

**Execution and conditions:** Four nested prompt conditions are specified. Execution remains pending.

**Output verification:** The teaching review compares the specimen's quotations with the supplied passages and separately assesses the entailment of its claims.

**Researcher evaluation:** Illustrative criterion scores are provided in section 7. No researcher-confirmed scores exist for an empirical run.

**Integration into research:** The corrected synthesis illustrates how a researcher could revise an output; it is not a reported empirical AI result.

**Methodological limitations:** Four selected excerpts cannot represent the full documents or their reception. The exercise cannot establish model reliability or comparative performance before actual runs are recorded.

**Appendices:** A — full prompt (section 5); B — no empirical output records (specimen in section 7); C — H3 error and illustrative correction (section 7); D — references below; E — CONTEXT design specified (section 3), with actual X and T activities pending; F — sensitivity protocol (section 6), no results; G — illustrative scoring record (section 7), no confirmed empirical scores.

## 9. Further research and references

Extend the corpus to the full declarations and contemporaneous records of political participation. Have two readers code the same passages independently and document differences before evaluating AI outputs. Test whether conclusions change when passages that complicate the initial interpretation are included.

- United States Continental Congress. (1776). *Declaration of Independence*. US National Archives transcription. https://www.archives.gov/founding-docs/declaration-transcript
- Seneca Falls Convention. (1848). *Declaration of Sentiments*. US National Park Service transcription. https://home.nps.gov/wori/learn/historyculture/declaration-of-sentiments.htm
- Smithsonian Institution. *Declaration of Sentiments Table, 1848*. https://americanhistory.si.edu/collections/object/nmah_529599
- Skinner, Q. (1969). Meaning and understanding in the history of ideas. *History and Theory*, 8(1), 3–53. https://doi.org/10.2307/2504188
- Onuh, F. (2026). *Scholarly Prompt Lab: The Prompt as Method* [Computer software]. https://doi.org/10.5281/zenodo.24521711 (concept DOI; record the version-specific citation when running the case).

# Use case 02 — Cultural rights and collective knowledge

**Identifier:** SPL-UC-002 | **Version:** 1.0

**Disciplines:** African studies; Indigenous studies; international relations; policy discourse analysis

**Method:** Comparative interpretive document analysis

**AI roles:** Preliminary coding; comparative analysis; interpretive examination. An optional extension treats AI as an object of study.

**Estimated teaching time:** 90 minutes for the worked example; additional time for repeated model runs and specialist review.

## 1. Research problem and question

Comparative research on rights documents requires attention to the kinds of subjects to whom rights are attributed and to the institutions charged with protecting them. AI systems may flatten these distinctions by translating culturally situated rights into familiar categories of individual entitlement or state provision. A comparison between the African Charter on Human and Peoples' Rights and the United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP) offers a focused exercise in identifying these interpretive risks.

**Research question:** How do selected provisions of the African Charter and UNDRIP represent cultural participation, community authority and control of educational institutions, and what distinctions should a comparative analysis preserve?

The purpose is to compare the language of two instruments. The analysis does not rank cultures, assess compliance by governments or treat the selected provisions as representative of all African or Indigenous knowledge systems.

**Conceptual orientation:** Relational approaches to rights and situated knowledge. The analysis attends to relations among individual rights holders, communities and institutions. It also examines the risk that an analytical category developed in one context will obscure distinctions in another. These concepts guide the inquiry; they do not establish in advance that the instruments express identical theories of rights.

**Learning objectives:** Distinguish rights holders from duty bearers; identify collective and institutional dimensions of rights; assess whether AI preserves differences between source contexts; recognise when an answer requires specialist or community-informed review.

## 2. Source material and research design

### Corpus supplied to the model

These short verbatim excerpts are selected for comparison and attributed to their official sources. Only the excerpts are reproduced; consult the linked full instruments for context and any additional material. Do not present the excerpts as full articles. The documents' wider reproduction terms should be checked before redistributing full texts.

**DOC-01 | African Charter on Human and Peoples' Rights (1981), Article 17**

P1 (Article 17(2)): “Every individual may freely take part in the cultural life of his community.”

P2 (Article 17(3), fragment): “shall be the duty of the State.”

Source: African Commission on Human and Peoples' Rights, https://achpr.au.int/en/charter/african-charter-human-and-peoples-rights/

**DOC-02 | United Nations Declaration on the Rights of Indigenous Peoples (2007), Article 14(1), fragments**

P1: “Indigenous peoples have the right to establish and control their educational systems”

P2: “in their own languages”

Source: UN General Assembly resolution A/RES/61/295, https://mandates.un.org/mandate/A/RES/61/295

### Contextual notes (researcher summaries, not quotations)

African Charter Article 17(3) places responsibility on the state for promoting and protecting community-recognised morals and traditional values. The Charter is a regional human rights treaty adopted in 1981. UNDRIP was adopted by the UN General Assembly in 2007; Article 14(1) concerns Indigenous peoples' authority over educational systems and institutions providing education in their languages and in ways appropriate to their cultural teaching practices. A declaration and a treaty have distinct legal forms. The excerpts do not settle the instruments' legal effects in any jurisdiction.

The unit of analysis is a rights-bearing or duty-bearing provision, represented here by four fragments with contextual summaries. Select Article 17(2–3) and Article 14(1) purposively because they articulate different relationships between culture, community and institutions. They are not functionally identical provisions. This asymmetry is analytically important and must remain visible.

### Working definitions and decision rules

| Category | Definition and inclusion rule |
|---|---|
| Rights holder | The subject explicitly assigned a right or entitlement. Distinguish an individual from a people or collective. |
| Duty bearer | The actor explicitly assigned a responsibility. Do not infer a duty merely because an institution is mentioned. |
| Cultural participation | Express entitlement to participate in cultural life. Distinguish participation from authority over an institution. |
| Institutional authority | Express power to establish or control an institution. Do not infer exclusive authority from the word “control”. |
| Linguistic specificity | Express recognition of language in the relevant activity. Do not equate language of education with the totality of cultural rights. |
| Contextual uncertainty | A question about interpretation or application that the supplied corpus cannot resolve. Mark for further research or human review. |

Borderline case: “his community” refers to the individual's relationship with a community in DOC-01 P1. This phrase alone does not establish a separate collective legal entitlement. Conversely, the explicit subject “Indigenous peoples” in DOC-02 P1 must not be recoded as an individual merely to fit a common rights template.

## 3. Applying the CONTEXT framework

| Dimension | Application in this case |
|---|---|
| CONTEXT dimension C: Conceptual grounding | Relational rights and situated knowledge guide a question about participation and authority. |
| CONTEXT dimension O: Operationalisation | Apply the six definitions and record uncertain or non-equivalent categories. |
| CONTEXT dimension N: Situated knowledge | Preserve the specific subjects and legal forms of the documents. Avoid treating Africa or Indigenous peoples as homogeneous categories. |
| CONTEXT dimension T: Traceability | Link every textual observation to an identified fragment; distinguish contextual summaries from direct evidence. |
| CONTEXT dimension E: Evaluation | Test for category conflation, unsupported legal claims and cultural generalisations. |
| CONTEXT dimension X: Cross-model examination | Examine whether adding explicit contextual constraints changes the kinds of errors observed. |
| CONTEXT dimension T: Transparency | Record the selected English-language excerpts, exact prompts, model runs, scoring and unresolved specialist questions. |

## 4. Configure the Lab

Select African studies or the closest available discipline and comparative document/discourse analysis as the method. Use evidence-constrained prompting where supported. Enter the cultural and historical context separately from the four excerpts. Add “peoples”, “community”, “control” and “duty” under contested terminology, with the working definitions above. Select a table format and the relevant AI-use categories. Do not mark the research as completed merely because the design fields have been populated.

**Analytical procedure**

1. Identify the explicit subject and action in each passage.
2. Code rights holders and duty bearers separately.
3. Identify evidence of cultural participation, institutional authority and linguistic specificity.
4. Record differences in scope and legal form using contextual notes separately from the excerpts.
5. Examine alternative interpretations of community participation and institutional control.
6. Identify claims requiring full-document analysis, legal expertise or community-informed interpretation.
7. Verify quotations and assess whether each quotation supports the accompanying interpretation.

**Analytical standards:** Require verifiable textual evidence; prohibit fabrication; preserve the terms used in the instruments; distinguish observation from interpretation; examine alternatives; guard against uncritical agreement; flag material requiring human review; report uncertainty.

## 5. Complete research prompt — condition D

```text
ROLE
Assist a researcher conducting comparative interpretive document analysis. Your response is preliminary analytical material for scholarly review.

RESEARCH QUESTION
How do selected provisions of the African Charter and UNDRIP represent cultural participation, community authority and control of educational institutions, and what distinctions should a comparative analysis preserve?

SOURCE MATERIAL
DOC-01 P1 (African Charter, Article 17(2)): Every individual may freely take part in the cultural life of his community.
DOC-01 P2 (Article 17(3), fragment): shall be the duty of the State.
DOC-02 P1 (UNDRIP, Article 14(1), fragment): Indigenous peoples have the right to establish and control their educational systems
DOC-02 P2 (Article 14(1), fragment): in their own languages

CONTEXT
The African Charter is a regional human rights treaty adopted in 1981. Article 17(3) assigns responsibility for protecting and promoting community-recognised morals and traditional values to the state. UNDRIP is a UN General Assembly declaration adopted in 2007. Article 14(1) concerns Indigenous peoples' authority over educational systems and institutions providing education in their languages in culturally appropriate ways. These are researcher-supplied summaries, not quotations. The documents have different legal forms and the provisions have different subject matter. Treat Africa and Indigenous peoples as internally diverse. Use a relational approach to rights and situated knowledge without presuming that the two instruments express the same theory.

ANALYTICAL PROCEDURE
Identify the explicit rights holder or duty bearer in each passage. Code cultural participation, institutional authority and linguistic specificity when the wording supports them. Keep individual entitlement, community relationship and collective institutional authority distinct. Note when a category has no equivalent in the other excerpt. Examine one defensible alternative interpretation or limitation per claim. Identify issues requiring additional sources or specialist review.

STANDARDS
Use exact quotations with document and passage identifiers. Do not fabricate quotations or infer the legal effects of either instrument from these excerpts. Distinguish the corpus from the contextual summaries. Do not generalise about all African or Indigenous knowledge systems. Preserve contested terms and state uncertainty. Do not accept the researcher's conceptual orientation without examining whether the evidence supports it.

OUTPUT
Return a table with these fields: claim ID, document/passage ID, exact quotation, observation, analytical category, interpretation, alternative interpretation or limitation, confidence (high/moderate/low with reason). Add a brief note identifying questions for further review. Do not add other output fields.
```

## 6. Prompt-sensitivity study

Use conditions A–D defined by the same nested-block rule as in case 01: base task and fixed output specification; addition of analytical procedure; addition of contextual notes; addition of analytical standards. Keep the four excerpts fixed. Run three repetitions for each condition on two systems where feasible. Save the exact generated prompt for each run. Record any setting differences, refusals or truncated responses.

Primary outcomes: count of rights-holder conflations; count of unsupported claims of legal equivalence; number of unsupported generalisations about knowledge systems; quotation matching; confirmed SPL criterion scores. Define a conflation as recoding an explicit collective subject as an individual subject or attributing identical authority to provisions that use materially different language. Distinguish a justified interpretive comparison from an unsupported equivalence claim.

A domain-informed reviewer should assess contextual fidelity and misrepresentation. If this expertise is unavailable, flag those judgements as provisional. Where a second model is used, treat its assessments as suggestions pending review. Do not treat agreement between models as proof of contextual validity.

## 7. Worked output and verification

**Illustrative response specimen — constructed for teaching, not an actual model run.**

| Claim | Quotation and source | Example response |
|---|---|---|
| C1 | DOC-01 P1: “Every individual may freely take part in the cultural life of his community.” | Cultural participation is expressed as an individual entitlement situated in relation to a community. Confidence: high for the wording. |
| C2 | DOC-02 P1: “Indigenous peoples have the right to establish and control their educational systems” | The provision explicitly attributes institutional authority to Indigenous peoples. Its implementation cannot be inferred from this fragment. Confidence: high for the wording. |
| C3 | DOC-02 P2: “in their own languages” | The provision includes linguistic specificity. Together with C2, it concerns more than access to a generic educational service. Confidence: moderate for the interpretation. |
| C4 | DOC-01 P1 and DOC-02 P1 (quotations as above) | Both instruments grant the same individual right to cultural participation, so their approaches to cultural authority are legally equivalent. Confidence: high. |
| C5 | DOC-01 P2: “shall be the duty of the State.” | The state is identified as a duty bearer. The precise duty must be established from the complete provision or the contextual summary. Confidence: high for the duty bearer. |

### Researcher review demonstration

C1: The quoted wording supports the distinction between individual entitlement and community relationship. Retain as a textual observation.

C2: The collective subject and institutional action are explicit. Retain, but avoid inferring the exclusive scope of control.

C3: The phrase matches. Retain the linguistic observation; examine the complete provision before making a broader claim about educational authority.

C4: Both fragments are accurately quoted. The conclusion nevertheless conflates an individual participation provision with a collective institutional right and makes an unsupported assertion about legal equivalence. Reject the claim.

C5: The quoted fragment identifies the state as duty bearer but omits the subject matter of that duty. Retain the limited observation and consult Article 17(3) in full before interpreting its scope.

**Corrected analytical synthesis:** The selected Charter provision expresses individual participation in community cultural life, while the selected UNDRIP provision explicitly attributes authority over educational systems to Indigenous peoples and includes language-specific education. The documents therefore make different rights-bearing subjects and institutional relationships visible. The state duty in the Charter requires analysis of its complete provision. These differences warrant further comparison; the excerpts cannot establish legal equivalence or actual implementation.

### Illustrative scoring record

| Criterion | Example score (1–5) | Rationale |
|---|---:|---|
| Factual accuracy | 2 | C4 asserts legal equivalence without adequate evidence. |
| Contextual fidelity | 2 | C4 collapses materially different rights-bearing subjects and institutional contexts. |
| Evidence traceability | 5 | All quoted fragments are identifiable in the supplied material. |
| Freedom from misrepresentation | 2 | C4 obscures the collective dimension of the UNDRIP excerpt. |
| Interpretive plurality | 3 | Several limits are acknowledged; alternative readings of control are underdeveloped. |
| Uncertainty calibration | 2 | The unsupported equivalence is stated with high confidence. |

**Output-level decision:** Used after corrections (illustrative). Record C4 as category conflation and unsupported legal inference. Preserve the original specimen for audit. If the study treats AI as its object, retain the erroneous interpretation as data about the constructed teaching scenario, clearly distinct from an actual system response.

## 8. Sample AI methods report

### Generative AI disclosure

This teaching case specifies the use of generative AI for preliminary coding and comparative interpretation of rights instruments. The worked response and scoring record are instructional specimens. No empirical model execution or independent specialist assessment is reported.

### Research methodology

**AI systems and conditions of use:** No model runs recorded. Model identifiers, dates and settings remain to be documented.

**Prompt design and analytical procedure:** A purposive corpus of four short English-language fragments was selected from two distinct rights instruments. The analytical design separates individual entitlement, community relationship, institutional authority and state responsibility. Contextual summaries are identified separately from verbatim material. The full prompt appears in section 5.

**Execution and conditions:** Four nested prompt conditions are specified. Actual execution remains pending.

**Output verification:** The instructional review checks quotations against the source fragments, assesses their relationship to the stated interpretations and flags claims requiring full-document examination.

**Researcher evaluation:** Section 7 gives illustrative scores and reasons. Specialist or community-informed review remains necessary for more ambitious contextual claims. No empirical score has been confirmed.

**Integration into research:** The corrected synthesis demonstrates a possible scholarly revision. It is not a measured result from an AI system.

**Methodological limitations:** The instruments differ in legal form and subject matter. English-language excerpts alone cannot adequately represent the diversity of African or Indigenous understandings of cultural authority. Neither legal implementation nor community experience can be established through this corpus. Comparative model performance cannot be assessed until actual runs are recorded.

**Appendices:** A — full prompt (section 5); B — no empirical output records (specimen in section 7); C — C4 and C5 review decisions (section 7); D — references below; E — CONTEXT design specified (section 3), with actual X and T activities pending; F — sensitivity protocol (section 6), no results; G — illustrative scoring record (section 7), no confirmed empirical scores.

## 9. Further research and references

Extend the comparison to the complete articles and additional provisions concerning peoples' rights. Consider the original and authorised language versions where available. Include specialist and community-informed interpretation where appropriate, and document the limits of any comparative category. A separate study could treat actual AI responses as primary data and investigate which distinctions are lost across models and prompt conditions.

- Organization of African Unity. (1981). *African Charter on Human and Peoples' Rights*, Article 17. African Commission on Human and Peoples' Rights. https://achpr.au.int/en/charter/african-charter-human-and-peoples-rights/
- United Nations General Assembly. (2007). *United Nations Declaration on the Rights of Indigenous Peoples*, A/RES/61/295, Article 14. https://mandates.un.org/mandate/A/RES/61/295
- Haraway, D. (1988). Situated knowledges: The science question in feminism and the privilege of partial perspective. *Feminist Studies*, 14(3), 575–599. https://doi.org/10.2307/3178066
- Onuh, F. (2026). *Scholarly Prompt Lab: The Prompt as Method* [Computer software]. https://doi.org/10.5281/zenodo.24521711 (concept DOI; record the version-specific citation when running the case).

# Running either case in SPL

1. Load the example as a new, clearly labelled teaching project. Preserve the existing active project and its records.
2. Review the source excerpts and the research design. Inspect the prompt before submitting it to a selected external AI system.
3. Use the Sensitivity study tab to prepare the comparison conditions. If the Lab generates different conditions, record the actual prompts and use the documented protocol for comparison.
4. Record actual responses in Log & evaluate. Include model/version, date, settings and the precise prompt used. Keep teaching specimens separate from the live output log.
5. Check quotations and assess whether each quotation supports the interpretation. Review suggested evaluations and confirm only scores you have assessed.
6. Document how each output was used, including corrections, exclusions and unresolved disagreements.
7. Generate the AI methods report. Inspect the disclosure, source citations and appendices. Complete missing information and export the report for your research records.

The two examples are starting points for empirical work. Their small corpora permit close verification and methodological discussion. A researcher seeking publishable substantive findings should expand the evidence base and justify the revised design.
