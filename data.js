/* Scholarly Prompt Lab: reference data.
   Add disciplines, theories, techniques or worked examples here. See CONTRIBUTING.md. */

window.LAB = {


  techniques: {
    "zero-shot": {
      sources: "none", theoryAt: 1,
      label: "Zero-shot (baseline interpretation)",
      hint: "No examples or sources. Useful for seeing what the model brings on its own. Treat the result as data about the model, not about the past.",
      steps: [
        "Answer the research question using your general knowledge.",
        "State which parts of your answer you are confident about and which you are not.",
        "Name the kinds of sources a researcher would need to check each claim."
      ]
    },
    "few-shot": {
      sources: "required", theoryAt: 1,
      label: "Few-shot (apply a codebook)",
      hint: "Give coded examples so the model applies your categories. Check its coding against a hand-coded sample before trusting it.",
      steps: [
        "Read the coded examples and infer how each code is applied.",
        "Apply the same codes to each new passage in the source material.",
        "Quote the words that justify each code.",
        "Mark passages that fit no code, or more than one, rather than forcing a choice."
      ]
    },
    "context-grounded": {
      sources: "required", theoryAt: 2,
      label: "Context-grounded (interpret primary documents)",
      hint: "The model works only from the documents you supply. Paste them in the Source text box with identifiers.",
      steps: [
        "Read only the supplied documents.",
        "Identify passages relevant to the research question.",
        "Interpret each passage in light of the stated theoretical orientation.",
        "Cite the document identifier for every claim."
      ]
    },
    "structured-output": {
      sources: "required", theoryAt: -1,
      label: "Structured output (extract archival metadata)",
      hint: "For extraction: names, dates, places, document types. Specify the fields exactly and spot-check a sample by hand.",
      steps: [
        "For each document, extract only the requested fields.",
        "Copy values exactly as written in the source, including original spellings.",
        "Leave a field empty and note why when the source does not state it.",
        "Do not normalise names or places unless asked."
      ]
    },
    "comparative": {
      sources: "optional", theoryAt: 1,
      label: "Comparative (across models, languages or framings)",
      hint: "Run the identical prompt on several models or in several languages. The differences are the finding.",
      steps: [
        "Answer the research question.",
        "List the key terms and categories you relied on.",
        "State the assumptions behind your answer.",
        "Note where another tradition, language or community might answer differently."
      ]
    },
    "adversarial": {
      sources: "optional", theoryAt: 0,
      label: "Adversarial (test assumptions and bias)",
      hint: "Ask the model to argue against a reading, including yours. Use it to expose what a framing hides.",
      steps: [
        "Set out the strongest version of the reading implied by the research question.",
        "Set out the strongest counter-reading supported by the evidence.",
        "Identify assumptions in the question itself that may distort the answer.",
        "Say which reading the evidence better supports, or that it cannot decide."
      ]
    },
    "iterative": {
      sources: "required", theoryAt: 0,
      label: "Iterative (refine analytical categories)",
      hint: "Use across several rounds. Record each round's prompt and output in the log so the refinement is visible.",
      steps: [
        "Propose an initial set of analytical categories from the source material.",
        "Define each category and give one quoted example.",
        "Identify passages that do not fit and suggest how categories might change.",
        "List open questions for the researcher before the next round."
      ]
    },
    "evidence-constrained": {
      sources: "required", theoryAt: 0,
      label: "Evidence-constrained (every claim needs a quotation)",
      hint: "The strictest mode for analytical claims. Pair with pasted source text.",
      steps: [
        "Identify the social actors or themes relevant to the research question.",
        "For each claim, give a direct quotation and its document identifier.",
        "Separate what the text says from your interpretation of it.",
        "Record passages where another interpretation is defensible.",
        "State plainly when the evidence is insufficient."
      ]
    },
    "multimodal": {
      sources: "required", theoryAt: 2,
      label: "Multimodal (images, manuscripts, artefacts)",
      hint: "For photographs, manuscripts, artefacts or generated images. Generated images are model outputs, never historical evidence.",
      steps: [
        "Describe what is visible before interpreting it.",
        "Identify features of architecture, dress, objects, people and setting.",
        "Note which features match documented sources and which are uncertain.",
        "Flag anything that looks like a stereotype or an anachronism."
      ]
    },
    "rag": {
      sources: "required", theoryAt: 1,
      label: "Retrieval-augmented (query a curated archive)",
      hint: "Needs a retrieval system beyond the prompt. Document what the archive includes and excludes.",
      steps: [
        "Answer only from the retrieved passages.",
        "Cite the archive identifier for every passage used.",
        "Say when the retrieved passages do not answer the question.",
        "Note what kinds of sources appear to be missing from the archive."
      ]
    }
  },

  /* Standards the model must work to. `noSource` is the wording used when the model answers from its own knowledge,
     where demanding quotations from sources would push it to invent them. */
  safeguardGroups: ["Evidence", "Interpretation", "Context", "Limits"],
  safeguards: [
    { id: "quote", group: "Evidence", ctx: "T", label: "Require traceable textual evidence",
      text: "Support every substantive claim with an exact quotation and its source identifier.",
      noSource: "No sources have been supplied, so do not present anything as a quotation. Mark every claim as coming from your general knowledge, and name the kind of source a researcher would need to verify it." },
    { id: "nofab", group: "Evidence", ctx: "T", label: "Forbid fabrication",
      text: "Do not invent quotations, sources, dates or people. Do not add information absent from the supplied material unless you label it as outside knowledge.",
      noSource: "Do not invent quotations, sources, dates or people. If you are not certain that a source exists, say so instead of citing it." },
    { id: "obs", group: "Interpretation", ctx: "E", label: "Separate observation from interpretation",
      text: "Keep what the sources say (observation) separate from what you take it to mean (interpretation), and label each.",
      noSource: "Keep what is well documented separate from your own interpretation or inference, and label each." },
    { id: "alt", group: "Interpretation", ctx: "E", label: "Preserve alternative interpretations",
      text: "For each interpretation, give the strongest alternative reading the evidence would also support." },
    { id: "disconfirm", group: "Interpretation", ctx: "E", label: "Search for disconfirming evidence",
      text: "Look actively for passages that count against your emerging reading, and report them alongside the passages that support it.",
      noSource: "State the strongest evidence or argument against your answer." },
    { id: "syco", group: "Interpretation", ctx: "E", label: "Guard against sycophancy",
      text: "Do not simply confirm the framing of this prompt. If the evidence does not support the question's assumptions or the chosen frameworks, say so." },
    { id: "terms", group: "Context", ctx: "N", label: "Examine contested terminology",
      text: "Comment on how the terminology used to describe the subject shapes its representation." },
    { id: "lang", group: "Context", ctx: "N", label: "Preserve indigenous-language terms",
      text: "Keep indigenous-language terms in their original form, with diacritics and tone marks, and add a gloss; do not replace them with approximate English equivalents." },
    { id: "review", group: "Context", ctx: "E", label: "Flag items for human review",
      text: "Flag every classification that is ambiguous or culturally sensitive for review by a person with the relevant linguistic and cultural expertise." },
    { id: "uncert", group: "Limits", ctx: "E", label: "Explicitly report uncertainty",
      text: "State uncertainty, missing evidence and limitations explicitly, and say what evidence would resolve them." },
    { id: "scope", group: "Limits", ctx: "E", label: "Stay within the evidence",
      text: "Do not generalise beyond the supplied material, and do not infer the intentions of authors or the reactions of audiences from the text alone.",
      noSource: "Do not present contested or regional matters as settled, and say where scholarly opinion is divided." }
  ],

  criteria: [
    { id: "accuracy", label: "Factual accuracy", help: "Claims agree with independent evidence", rubric: ["Several checkable claims are wrong or contradicted by evidence", "Mostly accurate, with some unsupported or incorrect claims", "Every checkable claim agrees with the sources and independent evidence"] },
    { id: "fidelity", label: "Contextual fidelity", help: "Cultural and historical context preserved", rubric: ["Strips out or distorts the cultural, linguistic or historical context", "Includes some relevant context but with notable gaps", "Represents the relevant context accurately and uses it in the interpretation"] },
    { id: "trace", label: "Evidence traceability", help: "Claims can be traced to sources", rubric: ["Claims cannot be traced to sources, or quotations are misquoted or invented", "Most claims cite sources, but some do not or quote inaccurately", "Every substantive claim has an accurate quotation and a correct source identifier"] },
    { id: "misrep", label: "Freedom from misrepresentation", help: "No stereotypes or unsupported generalisations", rubric: ["Contains stereotypes or sweeping, unsupported generalisations", "Contains minor generalisations or loaded terms", "No stereotypes or unsupported generalisations"] },
    { id: "plural", label: "Interpretive plurality", help: "Recognises defensible alternative readings", rubric: ["Presents a single reading as fact", "Offers alternatives, but they are token or weak", "Offers substantive, defensible alternative readings"] },
    { id: "calib", label: "Uncertainty calibration", help: "Acknowledges limits and missing knowledge", rubric: ["Overconfident; no limits or missing knowledge acknowledged", "Acknowledges some limits", "States limits and missing knowledge clearly and in proportion to the evidence"] }
  ],

  framework: [
    { l: "C", name: "Conceptual grounding", d: "Establish the research problem and the theoretical assumptions that inform the inquiry.", q: "What am I investigating, and which concepts inform my analysis?" },
    { l: "O", name: "Operationalisation", d: "Translate theoretical concepts and methodological choices into instructions the AI system can execute.", q: "What analytical tasks should the model perform, and according to which procedures?" },
    { l: "N", name: "Situated knowledge", d: "Consider the cultural, linguistic and historical conditions in which knowledge is produced and understood.", q: "Whose knowledge informs the analysis, and what might the model misunderstand or overlook?" },
    { l: "T", name: "Traceability", d: "Establish a verifiable connection between AI-generated claims and their supporting evidence.", q: "What evidence supports each claim, and how can I independently verify it?" },
    { l: "E", name: "Evaluation", d: "Establish the criteria for assessing the accuracy and scholarly validity of AI-generated interpretations.", q: "What makes an interpretation defensible, and whose expertise is needed to assess it?" },
    { l: "X", name: "Cross-model examination", d: "Examine how changes in models, prompt formulations and languages affect research findings.", q: "To what extent are my findings influenced by the AI system or the way I formulate my instructions?" },
    { l: "T", name: "Transparency", d: "Maintain a record of AI involvement and the methodological decisions for which the researcher is responsible.", q: "Does my documentation allow another researcher to examine how I arrived at my findings?" }
  ],

  examples: [
    {
      id: "uprising1857",
      title: "History (South Asia): the 1857 uprising in India and the words used for it",
      discipline: "History",
      question: "How do British official accounts of the events of 1857 in India represent the people who rose against Company rule, and how do the terms \"mutiny\", \"rebellion\" and \"war of independence\" shape the history that is told?",
      theories: ["postcolonial", "subaltern", "archival-grain"],
      theoryNotes: "",
      technique: "evidence-constrained",
      unit: "the passage",
      sourceDesc: "Authenticated excerpts from British official correspondence and reports on the events of 1857, each with its archive reference",
      sourceText: "[DOC-01] Paste the first excerpt here, with its archive reference.\n[DOC-02] ...",
      context: "North and central India, 1857 to 1858, under the East India Company. The sources were written by Company and Crown officials. Indian participants and witnesses left far fewer written records, and later nationalist and regional histories tell the events differently.",
      terms: "\"Sepoy Mutiny\" vs \"Indian Rebellion\" vs \"First War of Independence\"; \"native\"; \"loyal\"",
      output: "table",
      fields: "passage ID, who is represented, quotation, how they are represented, what the account leaves out, alternative interpretation, confidence",
      safeguards: ["quote", "nofab", "obs", "alt", "disconfirm", "syco", "terms", "uncert", "scope"]
    },
    {
      id: "aba",
      title: "History (West Africa): the 1929 Women's War in southeastern Nigeria",
      discipline: "History",
      question: "How did women's political institutions shape collective resistance to colonial taxation in the 1929 Women's War, and how do the terms \"riot\" and \"war\" shape its historical representation?",
      theories: ["gender-history", "amadiume", "postcolonial", "archival-grain"],
      theoryNotes: "Treat women's networks and collective sanctions as political institutions, not as disorder.",
      technique: "evidence-constrained",
      unit: "the passage",
      sourceDesc: "Selected primary and secondary sources supplied by the researcher (e.g. commission of inquiry testimony, scholarly histories)",
      context: "Igbo, Ibibio and neighbouring communities in the colonial Owerri and Calabar provinces, November–December 1929. Women's networks and collective sanctions (such as \"sitting on a man\") were political institutions, not disorder. Colonial records describe events through the warrant-chief system and the 1928 tax on men.",
      terms: "\"Aba Women's Riot\" (colonial usage) vs \"Women's War\" (Ogu Umunwanyi)",
      output: "table",
      fields: "claim, source identifier, quotation, evidence or interpretation, alternative interpretation, confidence",
      safeguards: ["quote", "nofab", "obs", "uncert", "alt", "terms", "syco", "lang"]
    },
    {
      id: "basho",
      title: "Translation studies (Japan): English versions of a Bashō haiku",
      discipline: "Translation studies",
      question: "What do different English translations of Bashō's frog haiku keep, change or lose, and what does each choice assume about the poem?",
      theories: ["foreignisation", "skopos", "close-reading"],
      theoryNotes: "",
      technique: "comparative",
      unit: "each feature of the source poem (sound pattern, cutting word, season word, image, word order)",
      sourceDesc: "The Japanese text of the poem with a romanised reading, and the English translations being compared, each with its translator and date",
      sourceText: "[DOC-01: Japanese text]\n古池や蛙飛びこむ水の音\nFuruike ya / kawazu tobikomu / mizu no oto\n\n[DOC-02: translation A] Paste the first translation here, with its translator and date.\n[DOC-03: translation B] ...",
      context: "Japanese haiku, late seventeenth century. The poem has seventeen sound units in a 5-7-5 pattern, a cutting word (ya) and a season word (kawazu, frog, for spring). Japanese does not mark singular or plural here, so \"frog\" or \"frogs\" is the translator's choice.",
      terms: "\"syllable\" vs on (sound unit); kireji (cutting word); kigo (season word)",
      output: "table",
      fields: "feature of the source, translation A, translation B, what is kept, what is changed or lost, uncertainty",
      safeguards: ["obs", "alt", "lang", "review", "uncert"]
    },
    {
      id: "proverb",
      title: "Linguistics (West Africa): what is lost when AI translates an Igbo proverb?",
      discipline: "Linguistics",
      question: "What cultural knowledge is retained or lost when the Igbo proverb \"Onye ajụjụ anaghị efu ụzọ\" is translated and explained?",
      theories: ["ethnography-communication", "oral-literature-africa", "foreignisation"],
      theoryNotes: "",
      technique: "comparative",
      unit: "the proverb in its speech situation",
      sourceDesc: "The proverb, plus interpretations collected from competent Igbo speakers (to be compared with the model output afterwards, not shown to the model)",
      sourceText: "Onye ajụjụ anaghị efu ụzọ.",
      context: "Igbo oral tradition. Proverbs (ilu) are used in specific speech situations, often by elders, and their meaning depends on who speaks, to whom and when. A common gloss is \"A person who asks questions does not lose their way.\"",
      terms: "\"proverb\" vs ilu; \"elder\" vs specific titled roles",
      output: "table",
      fields: "literal translation, idiomatic translation, situations of use, cultural significance, uncertainty",
      safeguards: ["obs", "uncert", "alt", "review", "lang"]
    },
    {
      id: "editorials",
      title: "Media studies (any country): how newspaper editorials frame immigration",
      discipline: "Media and communication studies",
      question: "How do newspaper editorials frame immigration, and whose voices do they include or leave out?",
      theories: ["framing", "cda", "social-actors"],
      theoryNotes: "",
      technique: "evidence-constrained",
      unit: "the editorial",
      sourceDesc: "Newspaper editorials supplied with this prompt, each with its outlet, date and a document identifier",
      sourceText: "[ED-01] Paste editorial text here, with outlet and date.\n[ED-02] ...",
      context: "Name the country, the newspapers and the period you are studying, and say what was happening at the time (for example an election or a change in the law), which a general reader or an AI system may not know.",
      terms: "\"migrant\" vs \"immigrant\" vs \"refugee\" vs \"asylum seeker\"; \"illegal\" vs \"undocumented\"",
      output: "table",
      fields: "document ID, frame, social actor, textual evidence, interpretation, alternative interpretation",
      safeguards: ["quote", "nofab", "obs", "alt", "disconfirm", "terms", "uncert", "scope"]
    },
    {
      id: "interviews",
      title: "Sociology (any country): interviews with care workers about their work",
      discipline: "Sociology",
      question: "How do care workers describe what makes their work valued or undervalued?",
      theories: ["thematic", "care-ethics", "intersectionality"],
      theoryNotes: "",
      technique: "context-grounded",
      unit: "the meaning unit: a stretch of talk on one topic",
      sourceDesc: "Anonymised interview transcripts, each with a participant code",
      sourceText: "[DOC-01: participant P01] Paste the anonymised transcript here.\n[DOC-02: participant P02] ...",
      context: "Say where and when the interviews took place, who the participants are and what consent they gave. Remove names and identifying details before pasting anything into an AI system.",
      terms: "\"unskilled\"; \"carer\" vs \"care worker\"",
      output: "table",
      fields: "candidate theme, participant code, quotation, interpretation, counter-example, confidence",
      safeguards: ["quote", "nofab", "obs", "alt", "disconfirm", "review", "uncert", "scope"]
    },
    {
      id: "tenochtitlan",
      title: "Visual culture (Mesoamerica): AI images of Tenochtitlan",
      discipline: "Art history and visual culture",
      question: "How do AI-generated images of Tenochtitlan before 1521 compare with archaeological findings, sixteenth-century accounts and surviving objects?",
      theories: ["visual-semiotics", "orientalism", "llm-critique"],
      theoryNotes: "",
      technique: "multimodal",
      unit: "each visible feature of an image (architecture, dress, objects, people, setting)",
      sourceDesc: "AI-generated images (each labelled with the prompt that produced it) alongside documented references such as published archaeology of the Templo Mayor and sixteenth-century maps and codices",
      context: "The Mexica (Aztec) capital, built on an island in Lake Texcoco and reached by causeways, with the Templo Mayor at its centre. It fell to Spanish forces and their Indigenous allies in 1521. Generated images are model outputs and cannot serve as evidence of what the city looked like. Many early descriptions were written by the conquerors.",
      terms: "\"Aztec\" vs Mexica; \"discovery\" vs conquest; \"primitive\"",
      output: "table",
      fields: "image ID, feature, what is depicted, documented comparison, match / mismatch / uncertain, note",
      safeguards: ["obs", "uncert", "review", "terms", "nofab"]
    }
  ]
};
