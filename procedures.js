/* Scholarly Prompt Lab: analytical procedures.
   THEORY_STEPS: the analytical steps a framework's own method prescribes, in its own vocabulary.
   Frameworks not listed here get steps built from their core concepts.
   DISCIPLINE_CONVENTIONS: what a discipline expects before interpretation begins.
   Corrections and additions are welcome: see CONTRIBUTING.md. */

window.LAB_THEORY_STEPS = {
  /* ---------- language and discourse ---------- */
  cda: [
    "Description: record the formal features of the text that bear on the question (vocabulary, grammar including transitivity and modality, cohesion, text structure).",
    "Interpretation: analyse the discursive practice, that is how the text was produced, distributed and is likely to be consumed, and which genres and discourses it draws on (interdiscursivity and intertextuality).",
    "Explanation: relate both to the social practice, that is the relations of power, ideology and hegemony the discourse sustains or challenges. Say what cannot be explained from the text alone."
  ],
  "cda-sociocognitive": [
    "Identify the semantic macrostructures: the main topics the text makes prominent.",
    "Analyse local meanings: lexical choices, implications, presuppositions, and what is left implicit or vague.",
    "Test for the ideological square: emphasis on Our good things and Their bad things, and de-emphasis of Our bad things and Their good things.",
    "Describe the context model the text presupposes: setting, participants, their roles and shared knowledge."
  ],
  dha: [
    "Identify the contents or topics of the discourse.",
    "Analyse the discursive strategies in turn: nomination (how actors and events are named), predication (what qualities are attributed), argumentation (which topoi justify the claims), perspectivisation (from whose point of view), and intensification or mitigation.",
    "Examine the linguistic means that realise each strategy.",
    "Situate the text in its historical and intertextual context, and state which contextual knowledge comes from outside the supplied material."
  ],
  "social-actors": [
    "List every social actor and whether each is included or excluded (suppressed or backgrounded).",
    "For included actors, record role allocation: activated (doing) or passivated (done to).",
    "Record whether actors are genericised or specified, individualised or assimilated into groups.",
    "Record how they are named: nomination, or categorisation by function (functionalisation) or by identity (identification).",
    "Record personalisation or impersonalisation (abstraction, objectivation)."
  ],
  sfl: [
    "Analyse transitivity clause by clause: process type (material, mental, relational, verbal, behavioural, existential), participants and circumstances.",
    "Analyse the interpersonal meanings: mood and modality.",
    "Analyse the textual meanings: theme and rheme, and what is placed in thematic position.",
    "Relate the patterns to the context of situation (field, tenor, mode)."
  ],
  appraisal: [
    "Code attitude: affect (emotion), judgement (of people and behaviour) and appreciation (of things), noting whether each is inscribed or invoked.",
    "Code engagement: whether propositions are monoglossic (bare assertion) or heteroglossic, and whether other voices are contracted or expanded.",
    "Code graduation: force (raising or lowering) and focus (sharpening or softening).",
    "Report who or what is evaluated, by whom, and how consistently."
  ],
  "speech-acts": [
    "Identify the utterances that perform acts relevant to the question.",
    "Classify each illocutionary act (assertive, directive, commissive, expressive, declaration) and state its illocutionary force.",
    "Assess whether the felicity conditions for the act appear to be met, and by what authority the speaker performs it.",
    "Distinguish the illocutionary act from any perlocutionary effect, which cannot be established from the text alone."
  ],
  implicature: [
    "Identify utterances where what is meant goes beyond what is said.",
    "State which conversational maxim (quantity, quality, relation, manner) is flouted or observed in generating the implicature.",
    "Spell out the implicature and the shared assumptions it relies on.",
    "Note where an implicature depends on cultural knowledge an outsider may lack."
  ],
  politeness: [
    "Identify the face-threatening acts in the interaction and whose positive or negative face each threatens.",
    "Classify the strategy used: bald on record, positive politeness, negative politeness, off record, or avoidance.",
    "Relate strategy choice to the power and social distance between participants and the ranking of the imposition in this culture.",
    "Say where the notions of face in the model may not fit the speech community concerned."
  ],
  "ethnography-communication": [
    "Describe the speech event with the SPEAKING grid: Setting and scene; Participants; Ends; Act sequence; Key; Instrumentalities; Norms of interaction and interpretation; Genre.",
    "State which components are documented in the material and which are unknown.",
    "Interpret the event by the community's own norms of interpretation, and mark where these are inferred."
  ],
  "conversation-analysis": [
    "Work only from the transcript as given, including pauses, overlaps and repairs if they are marked.",
    "Analyse the turn-taking organisation.",
    "Identify sequences: adjacency pairs, preference organisation, expansions.",
    "Identify repair: who initiates it and who carries it out.",
    "Ground every claim in what participants themselves display in the next turn; do not import motives."
  ],
  metaphor: [
    "Identify the metaphorical expressions relevant to the question.",
    "For each, name the source domain and the target domain, and state the conceptual metaphor.",
    "Set out the mappings and entailments the metaphor carries.",
    "State what the metaphor highlights and what it hides."
  ],
  multimodal: [
    "Describe each mode present (writing, image, layout, colour, typography, sound) before interpreting.",
    "Analyse how each mode makes meaning and how the modes relate (reinforcing, complementing or contradicting one another).",
    "State what could not be assessed from the material as supplied."
  ],
  "corpus-ling": [
    "Do not estimate frequencies, keyness or collocation statistics yourself: these must come from corpus software run by the researcher.",
    "If the researcher supplies frequency lists, keywords, collocates or concordance lines, read them in context and group them into patterns.",
    "For each pattern, quote concordance lines as evidence and note counter-examples.",
    "State what corpus, reference corpus and settings the figures depend on, if given."
  ],
  cads: [
    "Do not estimate frequencies or keyness yourself: quantitative patterns must come from corpus software run by the researcher.",
    "Read the supplied keywords, collocates and concordance lines qualitatively, in their co-text.",
    "Move between the quantitative pattern and close discourse analysis of representative and unrepresentative examples.",
    "Report patterns that run against the expected reading."
  ],

  /* ---------- communication and media ---------- */
  framing: [
    "For each text, identify the problem definition: what is presented as the issue, and for whom.",
    "Identify the causal interpretation: who or what is presented as responsible.",
    "Identify the moral evaluation: how actors and actions are judged.",
    "Identify the treatment recommendation: what remedy is proposed or implied.",
    "Record the framing devices that carry the frame (keywords, stock phrases, images, sources quoted) and what is left out.",
    "Do not infer effects on audiences: a frame in a text is not evidence of how it was received."
  ],
  "frame-analysis-method": [
    "Define the unit of analysis and the candidate frames before coding.",
    "Code each unit for problem definition, causal attribution, moral judgement and remedy.",
    "Group units into frames and name each frame in neutral terms.",
    "Report units that fit no frame or more than one."
  ],
  "agenda-setting": [
    "Identify which issues the material makes prominent and by what cues (position, length, repetition, headlines).",
    "For each issue, identify which attributes are emphasised.",
    "State clearly that agenda-setting is a claim about transfer of salience to audiences, which needs audience data that is not in the texts."
  ],
  "encoding-decoding": [
    "Identify the preferred reading the text encodes and the codes it relies on.",
    "Set out what a dominant-hegemonic, a negotiated and an oppositional decoding of the text would each look like.",
    "State that actual decodings are an empirical matter requiring audience evidence, and report any such evidence in the material."
  ],
  gatekeeping: [
    "Identify the selection decisions visible in the material: what was included, given prominence, or left out.",
    "Identify the gatekeepers and the level at which each decision was made (individual, routine, organisational, social institutional, social system).",
    "State what cannot be known about selection from the published output alone."
  ],
  "rhetoric-classical": [
    "Identify the rhetorical situation: speaker, audience, occasion and purpose.",
    "Analyse the appeals: ethos (the speaker's character), pathos (emotion) and logos (argument).",
    "Analyse arrangement and style, including figures of speech.",
    "Assess the appeals against the audience addressed, not against present-day readers."
  ],
  dramatism: [
    "Apply the pentad: act (what was done), scene (when and where), agent (who), agency (by what means) and purpose (why).",
    "Identify the dominant ratio between terms (for example scene-act) and what it implies about motive.",
    "Identify strategies of identification and division between speaker and audience."
  ],
  "narrative-paradigm": [
    "Reconstruct the story the text tells: characters, events and their order.",
    "Assess narrative coherence (probability): does the story hang together?",
    "Assess narrative fidelity: does it ring true to the values and experience of the audience addressed? State whose experience you are assuming."
  ],
  "information-disorder": [
    "Classify the item as misinformation, disinformation or malinformation, and state what evidence of falseness and of intent the classification rests on.",
    "Analyse the three elements: agent (who created and distributed it), message (format and characteristics) and interpreter (how it was received and acted on).",
    "Identify the phase: creation, production or distribution.",
    "Do not assert that a claim is false, or that an agent intended harm, unless the supplied material shows it."
  ],
  oramedia: [
    "Identify the indigenous channels and modes of communication in the material (for example town crier, gong, drum, market, festival, song, assembly of elders).",
    "For each, record who may speak, to whom, on what occasions and with what authority.",
    "Describe how messages are encoded (proverb, performance, symbol) and by what norms they are interpreted.",
    "Do not rank these channels against mass media by an external standard."
  ],

  /* ---------- literature, orality, translation ---------- */
  narratology: [
    "Analyse narrative tense: order (analepsis and prolepsis), duration and frequency.",
    "Analyse mood: distance and focalisation (who perceives).",
    "Analyse voice: who narrates, at what narrative level, and in what relation to the story.",
    "Keep author, narrator and character distinct."
  ],
  "close-reading": [
    "Quote the passage and work through it in order.",
    "Attend to diction, imagery, syntax, sound and form.",
    "Identify tensions, ambiguities and patterns, and how they bear on meaning.",
    "Build the interpretation from the textual details, not from the author's biography or stated intentions."
  ],
  "oral-literature-africa": [
    "Identify the genre by the community's own classification where known (for example proverb, praise poetry, folktale), not only by a European genre label.",
    "Record the performance context: performer, audience, occasion, and how the text was recorded and transcribed.",
    "Analyse verbal style and delivery as far as the record allows.",
    "State what the written record cannot convey of the performance."
  ],
  "oral-formulaic": [
    "Identify recurring formulas and formulaic expressions.",
    "Identify themes (recurrent scenes or type-scenes).",
    "Relate both to composition in performance, and state whether the material records a performance or a later written text."
  ],
  foreignisation: [
    "Set the source text beside the translation, passage by passage.",
    "Identify where the translation domesticates (adapts to target-culture norms and fluency) and where it foreignises (keeps the difference of the source visible).",
    "Assess what each choice does to culturally specific terms, and how visible the translator is."
  ],
  skopos: [
    "State the skopos: the purpose of the translation and its intended receivers, as given in the commission or inferred from the text.",
    "Assess whether the translation is coherent for its receivers in their situation.",
    "Assess its relation to the source text in light of that purpose."
  ],

  /* ---------- history and memory ---------- */
  "oral-tradition": [
    "Classify the testimony: eyewitness account, hearsay, or oral tradition handed down beyond a generation.",
    "Reconstruct the chain of transmission as far as it is known.",
    "Record the performance: who told it, to whom, when, and for what purpose.",
    "Compare variants where available, and weigh the account against independent evidence.",
    "Treat the tradition as evidence both of the past it reports and of the present in which it was told."
  ],
  "silencing-past": [
    "Examine the four moments at which silences enter: the making of sources, the making of archives, the making of narratives, and the making of history in the final instance.",
    "For each, say what was recorded, kept or told, and what was not.",
    "Identify who had the power to shape each moment."
  ],
  "archival-grain": [
    "Read along the archival grain first: the form of the documents, the categories they use, what officials thought worth recording, and what troubled them.",
    "Only then read against the grain for what the documents did not intend to reveal.",
    "Treat the archive as a process of knowledge production, not a store of facts."
  ],
  subaltern: [
    "Identify whose perspective produced the source and for what administrative or political purpose.",
    "Look for traces of subaltern action and consciousness within elite or official accounts.",
    "State plainly where the source does not allow subaltern voices to be recovered."
  ],
  microhistory: [
    "Reduce the scale: reconstruct the single case in as much detail as the sources allow.",
    "Follow the clues and anomalies that standard accounts would pass over.",
    "State what the case suggests about wider structures, and how far one case can carry that claim."
  ],
  "collective-memory": [
    "Identify the group that carries the memory and the social frameworks that shape it.",
    "Identify how the memory is sustained (commemoration, ritual, narrative, place).",
    "Distinguish the remembered past from the documented past without treating the memory as simply false."
  ],
  "conceptual-history": [
    "Identify the key concept and trace how its meaning and use change across the sources, with dates.",
    "Distinguish the word from the concept.",
    "Identify who contested the concept and what expectations about the future it carried."
  ],

  /* ---------- postcolonial, decolonial, African thought ---------- */
  orientalism: [
    "Identify the author's strategic location: the position the text takes up in relation to the people it describes.",
    "Identify the strategic formation: the other texts, institutions and genres from which it draws authority.",
    "Analyse how the represented people are made to appear (for example as unchanging, irrational or unable to represent themselves).",
    "Judge the representation as a representation: do not assume it describes the people accurately or inaccurately without independent evidence."
  ],
  "subaltern-speak": [
    "Identify who speaks, who is spoken for, and who is spoken about.",
    "Distinguish representation as speaking for (proxy) from representation as portrayal.",
    "Identify where subaltern speech is absent, mediated or unintelligible within the dominant discourse.",
    "Do not supply the missing voice yourself."
  ],
  "decolonising-mind": [
    "Identify the languages in play and which carries authority in the material.",
    "Analyse what is gained and lost when the knowledge in question is carried in a colonial language.",
    "Keep terms from African languages in their original form and attend to what they mean within their own language."
  ],
  "conceptual-decolonisation": [
    "Identify the key concepts in the material that come from a colonial language.",
    "Ask, for each, whether it can be expressed in the African language concerned and whether the philosophical problem survives the translation.",
    "Report concepts that the African language frames differently, and name the language."
  ],
  "epistemic-injustice": [
    "Identify cases of testimonial injustice: a speaker given less credibility because of prejudice about who they are.",
    "Identify cases of hermeneutical injustice: experience that cannot be made intelligible because shared interpretive resources are lacking.",
    "State what evidence shows prejudice or a gap in resources, as opposed to ordinary disagreement."
  ],

  /* ---------- gender, race ---------- */
  intersectionality: [
    "Identify which systems of power (for example gender, ethnicity, class, age, religion) are relevant to the people in the material.",
    "Analyse how they operate together: do not add separate effects one by one.",
    "Distinguish structural, political and representational intersectionality where relevant.",
    "Report where the material makes some groups invisible."
  ],
  "gender-history": [
    "Identify how gender is signified in the sources: symbols, normative concepts, institutions and subjective identities.",
    "Analyse how gender constructs and legitimates relationships of power in this setting.",
    "Do not assume present-day or Western gender categories apply: test them against the sources."
  ],

  /* ---------- philosophy, sociology ---------- */
  hermeneutics: [
    "State the pre-understanding you bring to the text.",
    "Move between part and whole: interpret each passage in light of the whole text, and revise the reading of the whole in light of each passage.",
    "Identify where the text's horizon differs from the interpreter's, and what understanding emerges from bringing them together."
  ],
  "power-knowledge": [
    "Identify the statements that recur and the rules that make them sayable in this discourse.",
    "Identify the objects the discourse forms, the subject positions it offers, and who is authorised to speak.",
    "Identify the institutions and practices in which the discourse operates.",
    "Describe how power and knowledge sustain one another here, without assuming a single author or intention behind it."
  ],
  "weber-authority": [
    "Identify the claims to legitimacy made for those who hold power.",
    "Classify each as traditional, charismatic or legal-rational authority, noting mixtures.",
    "Give the evidence on which obedience is claimed to rest, and distinguish a claim to legitimacy from evidence that it was accepted."
  ],
  dramaturgy: [
    "Identify the performance: who performs for whom, in what setting.",
    "Distinguish front region from back region, and identify the personal front (appearance and manner).",
    "Identify impression management and any discrepancy between the performance and what is disclosed elsewhere."
  ],
  bourdieu: [
    "Define the field and what is at stake in it.",
    "Map the positions of the agents and the volume and kind of capital (economic, cultural, social, symbolic) each holds.",
    "Relate their practices and position-takings to habitus and position, and identify symbolic violence where it occurs."
  ],
  hegemony: [
    "Identify what is presented as common sense.",
    "Analyse how consent to leadership is sought and organised, and by which institutions and intellectuals.",
    "Identify counter-hegemonic positions, and distinguish consent from coercion in the evidence."
  ],
  "thick-description": [
    "Describe the action or event in detail before interpreting it.",
    "Set out the layers of meaning it has for the participants, in their own terms.",
    "Distinguish participants' interpretations from your own, and state what you infer."
  ],
  liminality: [
    "Identify the phases of the rite: separation, the liminal phase and reincorporation.",
    "Describe the condition of those in the liminal phase and any communitas among them.",
    "Relate the rite to the social structure it suspends and restores."
  ],

  /* ---------- visual and material culture ---------- */
  "visual-semiotics": [
    "Describe the linguistic message (caption, text, labels) and whether it anchors or relays the image's meaning.",
    "Describe the denoted image: what is literally shown.",
    "Analyse the connoted image: the cultural meanings its signs carry, and for which viewers."
  ],
  "grammar-of-visual-design": [
    "Analyse representational meaning: narrative or conceptual structures, participants and processes.",
    "Analyse interactive meaning: gaze (demand or offer), size of frame (social distance) and angle (attitude and power).",
    "Analyse compositional meaning: information value (left and right, top and bottom, centre and margin), salience and framing."
  ],
  iconology: [
    "Pre-iconographical description: identify the forms, objects and events shown.",
    "Iconographical analysis: identify the conventional subject matter, themes and concepts, citing the conventions relied on.",
    "Iconological interpretation: state the intrinsic meaning the work carries as a document of its culture and period, marked clearly as interpretation."
  ],
  "object-biography": [
    "Reconstruct the object's biography: where it was made, by whom, and each context it has since passed through.",
    "At each stage, identify how it was valued and classified (for example as commodity, gift, sacred object, loot or art).",
    "State the gaps in the provenance."
  ],
  restitution: [
    "Establish the provenance of the object: maker, community of origin, and the circumstances and date of each transfer.",
    "State the evidence about consent and coercion at the point of acquisition.",
    "Set out the claims made by the community of origin and by the holding institution, in their own terms.",
    "Do not fill gaps in the provenance by inference."
  ],

  /* ---------- digital ---------- */
  "llm-critique": [
    "Treat the model's output as an object of study, not as a source about the world.",
    "Identify where the output is fluent but unsupported, and where it reproduces dominant or stereotyped representations.",
    "Relate the patterns to what is known about the model's training data, and state what is not known.",
    "Compare outputs across prompts, runs and models before generalising."
  ],
  "distant-reading": [
    "Do not compute counts or statistics yourself: patterns across a corpus must come from the researcher's own computation.",
    "Interpret the supplied patterns (counts, trends, networks, maps) and state what each abstraction leaves out.",
    "Return to individual texts to test whether the pattern holds on close reading."
  ],

  /* ---------- methods ---------- */
  thematic: [
    "Familiarisation: read the whole dataset and note initial observations.",
    "Coding: generate codes for features relevant to the research question, with the extracts they come from.",
    "Generating initial themes: group codes into candidate themes.",
    "Reviewing themes: check each candidate theme against the coded extracts and the whole dataset.",
    "Defining and naming themes: state what each theme is and is not.",
    "Present all of this as candidate analysis for the researcher: in reflexive thematic analysis, themes are produced through the researcher's own interpretive work."
  ],
  grounded: [
    "Code the material line by line or incident by incident, staying close to the data (initial coding).",
    "Compare incident with incident and code with code (constant comparison).",
    "Raise the most significant codes into categories and define their properties (focused coding).",
    "Write a memo for each category, including gaps.",
    "Do not claim theoretical saturation: that requires further sampling by the researcher."
  ],
  "content-analysis": [
    "Unitise: state the sampling unit, the recording unit and the context unit.",
    "Apply the codebook exactly as supplied, with its definitions and decision rules.",
    "Record one code per unit per variable, and mark units that cannot be coded.",
    "Report counts by category, and flag every decision that needed judgement so that reliability can be checked by a second coder."
  ],
  "narrative-inquiry": [
    "Keep each account whole before comparing across accounts.",
    "Analyse what is told (events, characters, plot) and how it is told (structure, voice, audience).",
    "Situate the story in the setting and relationship in which it was told.",
    "Preserve the teller's own words and ordering."
  ],
  ipa: [
    "Work case by case: complete the analysis of one account before moving to the next.",
    "Make exploratory notes on the transcript: descriptive, linguistic and conceptual.",
    "Formulate experiential statements and cluster them into personal experiential themes.",
    "Only then look for patterns across cases, keeping divergence visible.",
    "Stay with how the participant makes sense of the experience."
  ],
  comparative: [
    "State the cases, why they are comparable, and the question the comparison answers.",
    "Compare the cases on the same dimensions, in the same order.",
    "Report differences as carefully as similarities.",
    "Do not infer causes from a small number of cases without saying how alternative explanations were considered."
  ]
};

/* What a discipline expects before interpretation begins. `match` lists the discipline names (lower case) each applies to. */
window.LAB_DISCIPLINE_CONVENTIONS = [
  { id: "history", match: ["history", "african history", "economic history", "archival studies", "classics", "medieval studies", "memory studies", "archaeology"],
    label: "Source criticism",
    steps: ["Begin with source criticism. For each document, establish what is known of its author, date, place, intended audience, purpose and genre, how close it stands to the events it describes, and whose voices it leaves out."] },
  { id: "linguistics", match: ["linguistics", "african languages and linguistics", "sociolinguistics"],
    label: "Linguistic data conventions",
    steps: ["Present every example in the original language exactly as written in the source, with tone marks and diacritics, followed by a gloss and a free translation. Do not normalise spelling or dialect."] },
  { id: "translation", match: ["translation studies"],
    label: "Parallel presentation",
    steps: ["Set source text and translation side by side, and give a literal rendering before an idiomatic one. Mark items that have no close equivalent."] },
  { id: "orality", match: ["oral literature and folklore", "music and ethnomusicology", "theatre and performance studies", "dance studies"],
    label: "Performance context",
    steps: ["Begin with the performance context: performer, audience, occasion, language or variety, and how the performance was recorded and transcribed. Treat the transcript as a trace of a performance, not the performance itself."] },
  { id: "literature", match: ["literary studies", "comparative literature", "african literatures", "creative writing", "rhetoric"],
    label: "Textual conventions",
    steps: ["Identify the edition, genre and form of each text. Quote with page or line references, and keep author, narrator and character distinct."] },
  { id: "media", match: ["media and communication studies", "journalism studies", "mass communication", "political communication", "health communication", "development communication", "digital media studies", "public relations and advertising", "misinformation and verification studies", "broadcasting and radio studies"],
    label: "Media source description",
    steps: ["For each item, record the outlet, date, genre (news report, editorial, opinion, advertisement, broadcast), author if named, and intended audience, before analysing it."] },
  { id: "social", match: ["sociology", "anthropology", "political science", "international relations", "economics", "development studies", "human geography", "psychology", "education", "criminology", "social work", "public policy and administration", "demography", "peace and conflict studies", "migration and refugee studies", "childhood and youth studies", "urban studies", "computational social science"],
    label: "Data provenance and scope",
    steps: ["State how the material was collected, from whom, when and under what conditions, as far as this is given. Do not generalise beyond the cases supplied, and do not reproduce the names of private individuals."] },
  { id: "religion", match: ["religious studies", "theology", "islamic studies", "biblical studies"],
    label: "Insider and analytic terms",
    steps: ["Distinguish the tradition's own terms and claims from analytic description. Describe belief and practice without ruling on their truth, and cite scripture or authoritative texts by their standard references."] },
  { id: "visual", match: ["art history and visual culture", "film studies", "nollywood and african screen studies", "architectural history", "museum and heritage studies", "fashion and dress studies", "design studies", "photography studies"],
    label: "Description before interpretation",
    steps: ["Describe each work or object before interpreting it: medium, maker, date, dimensions or duration, provenance and present location, as far as these are given. Say plainly if you are working from a reproduction or from an AI-generated image."] },
  { id: "law", match: ["law"],
    label: "Legal authority",
    steps: ["For each legal source, state the jurisdiction, the court or legislature, the date and its authority. Distinguish what was decided from what was said in passing."] },
  { id: "philosophy", match: ["philosophy", "african philosophy"],
    label: "Argument reconstruction",
    steps: ["Reconstruct each argument in its strongest form, with premises and conclusion set out and key terms defined, before evaluating it."] },
  { id: "digital", match: ["digital humanities", "information science", "library and information science", "ai ethics and governance", "science and technology studies"],
    label: "Corpus and tool description",
    steps: ["Describe how the corpus or dataset was built, what was included and excluded, and how it was processed. Any count or statistic must come from the researcher's own computation, not from estimation."] },
  { id: "area", match: ["african studies", "african diaspora studies", "black studies", "gender and women's studies", "postcolonial studies", "indigenous studies", "diaspora studies", "cultural studies", "environmental humanities", "medical and health humanities", "food studies"],
    label: "Situated terms",
    steps: ["Name the communities, places and periods concerned as precisely as the sources allow, and use the terms those communities use for themselves, with a gloss."] }
];
