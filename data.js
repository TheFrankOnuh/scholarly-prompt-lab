/* Scholarly Prompt Lab: reference data.
   Add disciplines, theories, techniques or worked examples here. See CONTRIBUTING.md. */

window.LAB = {
  disciplines: [
    "History", "Literary studies", "Linguistics", "Translation studies", "Oral literature",
    "Philosophy", "Religious studies", "Cultural studies", "Media and communication studies",
    "Art history and visual culture", "Archival studies", "Film studies", "Anthropology", "Other"
  ],


  techniques: {
    "zero-shot": {
      label: "Zero-shot (baseline interpretation)",
      hint: "No examples or sources. Useful for seeing what the model brings on its own. Treat the result as data about the model, not about the past.",
      steps: [
        "Answer the research question using your general knowledge.",
        "State which parts of your answer you are confident about and which you are not.",
        "Name the kinds of sources a researcher would need to check each claim."
      ]
    },
    "few-shot": {
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

  safeguards: [
    { id: "quote", text: "Support every substantive claim with an exact quotation and source identifier.", label: "Require traceable textual evidence", ctx: "T" },
    { id: "nofab", text: "Do not invent quotations, sources, dates or people. Do not add information absent from the supplied material unless you label it as outside knowledge.", label: "Forbid fabrication", ctx: "T" },
    { id: "obs", text: "Distinguish documented evidence and textual observations from interpretation.", label: "Separate observation from interpretation", ctx: "E" },
    { id: "uncert", text: "Report uncertainty, missing evidence and limitations explicitly.", label: "Explicitly report uncertainty", ctx: "E" },
    { id: "alt", text: "Record defensible alternative interpretations.", label: "Preserve alternative interpretations", ctx: "E" },
    { id: "review", text: "Flag ambiguous or culturally sensitive classifications for human expert review.", label: "Flag items for human review", ctx: "E" },
    { id: "syco", text: "Do not simply confirm the framing of this prompt. If the evidence does not support it, say so.", label: "Guard against sycophancy", ctx: "E" },
    { id: "terms", text: "Comment on how the terminology used to describe the subject shapes its representation.", label: "Examine contested terminology", ctx: "N" },
    { id: "lang", text: "Keep indigenous-language terms in their original form with a gloss; do not replace them with approximate English equivalents.", label: "Preserve indigenous-language terms", ctx: "N" }
  ],

  criteria: [
    { id: "accuracy", label: "Factual accuracy", help: "Claims agree with independent evidence" },
    { id: "fidelity", label: "Contextual fidelity", help: "Cultural and historical context preserved" },
    { id: "trace", label: "Evidence traceability", help: "Claims can be traced to sources" },
    { id: "misrep", label: "Freedom from misrepresentation", help: "No stereotypes or unsupported generalisations" },
    { id: "plural", label: "Interpretive plurality", help: "Recognises defensible alternative readings" },
    { id: "calib", label: "Uncertainty calibration", help: "Acknowledges limits and missing knowledge" }
  ],

  framework: [
    { l: "C", name: "Conceptual grounding", d: "Define the research problem and the theoretical assumptions behind it.", q: "What exactly am I investigating, and through which concepts?" },
    { l: "O", name: "Operationalisation", d: "Translate scholarly concepts into explicit analytical instructions.", q: "What operations should the model perform, step by step?" },
    { l: "N", name: "Situated knowledge", d: "Account for cultural, linguistic and historical specificity.", q: "Whose knowledge is this, in which language, and what will an outsider misread?" },
    { l: "T", name: "Traceability", d: "Connect generated claims to identifiable evidence.", q: "Can every claim be followed back to a source I can check?" },
    { l: "E", name: "Evaluation", d: "Assess accuracy, validity and interpretive limits.", q: "How will I decide whether this output is defensible, and who else should judge it?" },
    { l: "X", name: "Cross-model examination", d: "Test the stability of findings across prompts and systems.", q: "Does the finding survive a different model, wording or language?" },
    { l: "T", name: "Transparency", d: "Document AI involvement, methodological decisions and human oversight.", q: "Could another scholar reproduce or audit what I did?" }
  ],

  examples: [
    {
      id: "aba",
      title: "History: the 1929 Women's War in southeastern Nigeria",
      discipline: "History",
      question: "How did women's political institutions shape collective resistance to colonial taxation in the 1929 Women's War, and how do the terms \"riot\" and \"war\" shape its historical representation?",
      theories: ["gender-history", "amadiume", "postcolonial", "archival-grain"],
      theoryNotes: "Treat women's networks and collective sanctions as political institutions, not as disorder.",
      technique: "evidence-constrained",
      sourceDesc: "Selected primary and secondary sources supplied by the researcher (e.g. commission of inquiry testimony, scholarly histories)",
      context: "Igbo, Ibibio and neighbouring communities in the colonial Owerri and Calabar provinces, November–December 1929. Women's networks and collective sanctions (such as \"sitting on a man\") were political institutions, not disorder. Colonial records describe events through the warrant-chief system and the 1928 tax on men.",
      terms: "\"Aba Women's Riot\" (colonial usage) vs \"Women's War\" (Ogu Umunwanyi)",
      output: "table",
      fields: "claim, source identifier, quotation, evidence or interpretation, alternative interpretation, confidence",
      safeguards: ["quote", "nofab", "obs", "uncert", "alt", "terms", "syco", "lang"]
    },
    {
      id: "proverb",
      title: "Linguistics: what is lost when AI translates an Igbo proverb?",
      discipline: "Linguistics",
      question: "What cultural knowledge is retained or lost when the Igbo proverb \"Onye ajụjụ anaghị efu ụzọ\" is translated and explained?",
      theories: ["ethnography-communication", "oral-literature-africa", "foreignisation"],
      theoryNotes: "",
      technique: "comparative",
      sourceDesc: "The proverb, plus interpretations collected from competent Igbo speakers (to be compared with the model output afterwards, not shown to the model)",
      sourceText: "Onye ajụjụ anaghị efu ụzọ.",
      context: "Igbo oral tradition. Proverbs (ilu) are used in specific speech situations, often by elders, and their meaning depends on who speaks, to whom and when. A common gloss is \"A person who asks questions does not lose their way.\"",
      terms: "\"proverb\" vs ilu; \"elder\" vs specific titled roles",
      output: "table",
      fields: "literal translation, idiomatic translation, situations of use, cultural significance, uncertainty",
      safeguards: ["obs", "uncert", "alt", "review", "lang"]
    },
    {
      id: "lugard",
      title: "Postcolonial studies: reading Lugard's The Dual Mandate (1922)",
      discipline: "History",
      question: "How does the passage represent African political authority and legitimacy?",
      theories: ["postcolonial", "colonial-library", "weber-authority", "cda"],
      theoryNotes: "",
      technique: "context-grounded",
      sourceDesc: "An authenticated excerpt from Frederick Lugard, The Dual Mandate in British Tropical Africa (1922), with page reference",
      sourceText: "[DM-01, p. __] Paste the authenticated excerpt here.",
      context: "Written by the architect of indirect rule in Nigeria. Compare its claims with documented indigenous political institutions (e.g. Igbo village assemblies and age grades, the Sokoto Caliphate, the Oyo political system), which the passage may not describe.",
      terms: "\"native\", \"tribe\", \"chief\", \"primitive\"",
      output: "table",
      fields: "passage ID, representation of authority, quotation, colonial assumption, documented counter-evidence, confidence",
      safeguards: ["quote", "nofab", "obs", "uncert", "alt", "syco", "terms"]
    },
    {
      id: "editorials",
      title: "Media studies: political authority in Nigerian newspaper editorials",
      discipline: "Media and communication studies",
      question: "How is political authority represented in Nigerian newspaper editorials?",
      theories: ["cda", "social-actors", "framing", "translanguaging"],
      theoryNotes: "",
      technique: "evidence-constrained",
      sourceDesc: "Newspaper editorials supplied with this prompt, each with a document identifier",
      sourceText: "[ED-01] Paste editorial text here.\n[ED-02] ...",
      context: "Nigerian English-language press. Editorials may mix English with Nigerian Pidgin or indigenous-language phrases, and rely on local political knowledge a general reader may lack.",
      terms: "",
      output: "table",
      fields: "document ID, social actor, analytical category, textual evidence, interpretation, alternative interpretation",
      safeguards: ["quote", "nofab", "obs", "uncert", "alt", "review"]
    },
    {
      id: "benin",
      title: "Visual culture: AI images of the Benin Kingdom",
      discipline: "Art history and visual culture",
      question: "How do AI-generated images of a royal courtyard in the Benin Kingdom compare with archaeological findings, historical accounts and surviving artefacts?",
      theories: ["visual-semiotics", "object-biography", "restitution", "llm-critique"],
      theoryNotes: "",
      technique: "multimodal",
      sourceDesc: "AI-generated images (labelled with the prompt that produced each) alongside documented references such as Benin bronze plaques and published archaeology",
      context: "Benin Kingdom (Edo), with a defined period chosen by the researcher. Generated images are experimental outputs and cannot serve as evidence of what the kingdom looked like. Many surviving artefacts were looted in 1897; note where reference images come from.",
      terms: "\"Benin Bronzes\" (many are brass); \"primitive art\"",
      output: "table",
      fields: "image ID, feature, what is depicted, documented comparison, match / mismatch / uncertain, note",
      safeguards: ["obs", "uncert", "review", "terms", "nofab"]
    }
  ]
};
