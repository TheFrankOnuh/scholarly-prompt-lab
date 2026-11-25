/* Scholarly Prompt Lab: automatic checks on a model output.
   Pure functions, no network. They compare the output against the researcher's own source text.
   They never decide whether an interpretation is right; they find things a scholar should look at. */
(function (root) {
  "use strict";

  const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu;

  function nfc(s) { return (s || "").normalize("NFC"); }
  function stripMarks(s) { return s.normalize("NFD").replace(/\p{M}+/gu, "").normalize("NFC"); }
  function tokens(text) {
    const out = [];
    const t = nfc(text);
    let m;
    WORD.lastIndex = 0;
    while ((m = WORD.exec(t))) out.push({ w: m[0].toLowerCase().replace(/’/g, "'"), i: m.index, e: m.index + m[0].length });
    return out;
  }
  function wordsOf(text) { return tokens(text).map((t) => t.w); }

  /* ---------- quotation extraction ---------- */
  function cleanQuote(q) {
    return q.replace(/\*\*|__|`/g, "").replace(/^[\s"“”«»'‘’]+|[\s"“”«»'‘’]+$/g, "").replace(/\s+/g, " ").trim();
  }
  function extractQuotes(output) {
    const found = [];
    const seen = new Set();
    const lines = nfc(output).split(/\r?\n/);
    const rest = [];
    lines.forEach((line) => {
      const m = line.match(/^\s*>+\s?(.*)$/);
      if (m) {
        const q = cleanQuote(m[1]);
        if (q) found.push({ text: q, block: true });
      } else rest.push(line);
    });
    const body = rest.join("\n");
    const re = /“([^”\n]{1,800})”|"([^"\n]{1,800})"|«([^»\n]{1,800})»/g;
    let m;
    while ((m = re.exec(body))) {
      const q = cleanQuote(m[1] || m[2] || m[3]);
      if (q) found.push({ text: q, block: false });
    }
    return found.filter((q) => {
      const k = wordsOf(q.text).join(" ");
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  // text with quotations removed, for the "outside facts" scan
  function withoutQuotes(output) {
    return nfc(output).split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join("\n")
      .replace(/“[^”\n]*”|"[^"\n]*"|«[^»\n]*»/g, " ");
  }

  /* ---------- matching ---------- */
  function lev(a, b) {
    const n = a.length, m = b.length;
    if (!n) return m; if (!m) return n;
    let prev = new Array(m + 1), cur = new Array(m + 1);
    for (let j = 0; j <= m; j++) prev[j] = j;
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      for (let j = 1; j <= m; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      const t = prev; prev = cur; cur = t;
    }
    return prev[m];
  }

  function makeSource(sourceText) {
    const text = nfc(sourceText);
    const toks = tokens(text);
    const joined = " " + toks.map((t) => t.w).join(" ") + " ";
    const bare = stripMarks(joined);
    const index = new Map();
    toks.forEach((t, k) => { if (!index.has(t.w)) index.set(t.w, []); index.get(t.w).push(k); });
    const docs = [];
    const dre = /\[DOC-(\d+)[^\]]*\]/g;
    let m;
    while ((m = dre.exec(text))) docs.push({ id: "DOC-" + m[1].padStart(2, "0"), at: m.index });
    const pages = new Set();
    const pre = /\[p\.\s*(\d+)\]/g;
    while ((m = pre.exec(text))) pages.add(m[1]);
    const wordSet = new Set(toks.map((t) => stripMarks(t.w)));
    return { text, toks, joined, bare, index, docs, pages, wordSet, empty: !toks.length };
  }
  function docAt(src, charIndex) {
    let id = null;
    src.docs.forEach((d) => { if (d.at <= charIndex) id = d.id; });
    return id;
  }
  function excerpt(src, startTok, len) {
    const a = src.toks[Math.max(0, startTok)], b = src.toks[Math.min(src.toks.length - 1, startTok + len - 1)];
    if (!a || !b) return "";
    return src.text.slice(a.i, b.e).replace(/\s+/g, " ");
  }

  function segmentsOf(q) {
    // split at ellipses and editorial brackets: each part must appear, in order
    return q.split(/\s*(?:\.\.\.|…|\[[^\]]*\])\s*/).map((p) => wordsOf(p)).filter((w) => w.length);
  }

  function findSegmentsInOrder(src, segs, joinedKey) {
    let from = 0;
    for (const s of segs) {
      const at = src[joinedKey].indexOf(" " + (joinedKey === "bare" ? stripMarks(s.join(" ")) : s.join(" ")) + " ", from);
      if (at === -1) return false;
      from = at + 1;
    }
    return true;
  }

  function charToTok(str, pos) {
    // position in a space-joined token string -> token index (word tokens never contain spaces)
    const before = str.slice(0, pos + 1).trim();
    return before ? before.split(" ").length : 0;
  }

  function nearest(src, q) {
    const n = q.length;
    const starts = new Set();
    const probes = [0, 1, 2, n - 1, n - 2].filter((k) => k >= 0 && k < n);
    probes.forEach((k) => (src.index.get(q[k]) || []).forEach((pos) => { const s = pos - k; if (s >= 0) starts.add(s); }));
    let best = { sim: 0, start: -1, len: 0 };
    let checked = 0;
    for (const s of starts) {
      if (++checked > 3000) break;
      for (let len = Math.max(1, n - 2); len <= n + 2; len++) {
        const win = src.toks.slice(s, s + len).map((t) => t.w);
        if (!win.length) continue;
        const sim = 1 - lev(q, win) / Math.max(n, win.length);
        if (sim > best.sim) best = { sim, start: s, len: win.length };
      }
    }
    return best;
  }

  function checkQuote(src, qt) {
    const words = wordsOf(qt.text);
    const isTerm = words.length < 4;
    const res = { text: qt.text, words: words.length, term: isTerm, status: "missing", note: "", source: "", doc: null };
    const segs = segmentsOf(qt.text);
    if (!segs.length) return null;
    const single = segs.length === 1;
    if (findSegmentsInOrder(src, segs, "joined")) {
      res.status = "exact";
      if (!single) res.note = "with omissions marked";
      const at = src.joined.indexOf(" " + segs[0].join(" ") + " ");
      const tok = charToTok(src.joined, at);
      res.doc = src.toks[tok] ? docAt(src, src.toks[tok].i) : null;
      return res;
    }
    if (findSegmentsInOrder(src, segs, "bare")) {
      res.status = "near";
      res.note = "Accents or diacritics differ from the source";
      const at = src.bare.indexOf(" " + stripMarks(segs[0].join(" ")) + " ");
      const tok = charToTok(src.bare, at);
      res.source = excerpt(src, tok, words.length);
      res.doc = src.toks[tok] ? docAt(src, src.toks[tok].i) : null;
      return res;
    }
    if (isTerm) return res;
    const longest = segs.reduce((a, b) => (b.length > a.length ? b : a), segs[0]);
    const best = nearest(src, longest);
    if (best.sim >= 0.75 && best.start >= 0) {
      res.status = "near";
      res.note = "Wording differs from the source (" + Math.round(best.sim * 100) + "% match)";
      res.source = excerpt(src, best.start, best.len);
      res.doc = docAt(src, src.toks[best.start].i);
    }
    return res;
  }

  /* ---------- other checks ---------- */
  const STOP = new Set(("i ai cda doc id json csv pdf url finding findings interpretation interpretations alternative observation observations " +
    "confidence high moderate low source sources evidence textual analysis analytical critical discourse theme themes table section " +
    "limitations limitation conclusion overall note notes summary dimension narrative representation scholarly framework " +
    "president government english first second third fourth fifth").split(" "));

  function outsideFacts(output, src, promptText) {
    let text = withoutQuotes(output);
    debris(output).forEach((d) => { text = text.split(d).join(" "); });
    const prompt = new Set(wordsOf(promptText || "").map(stripMarks));
    const facts = new Map();
    const add = (k) => facts.set(k, (facts.get(k) || 0) + 1);
    // numbers (ignore structural ones)
    const nre = /(?<![\p{L}\-#.])(?:[₦$£€]\s?)?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|per cent|million|billion|trillion)?/giu;
    let m;
    while ((m = nre.exec(text))) {
      const raw = m[0].trim();
      const digits = raw.replace(/[^\d.]/g, "");
      const before = text.slice(Math.max(0, m.index - 10), m.index);
      if (/(finding|doc-|p\.|page|run|condition|step|figure|table|section|version|v)\s*$/i.test(before)) continue;
      if (digits.length < 2 && !/%|percent|million|billion|[₦$£€]/i.test(raw)) continue;
      if (/^\d\.$/.test(raw)) continue;
      const plain = digits.replace(/\.$/, "");
      if (src.joined.includes(" " + plain + " ") || src.text.includes(raw) || src.text.includes(plain)) continue;
      add(raw);
    }
    // capitalised names not at the start of a sentence
    const cre = /(^|[^\p{L}\p{M}])(\p{Lu}[\p{L}\p{M}'’\-]{2,}(?:\s+(?:of|the|and|de|du|van|von)?\s*\p{Lu}[\p{L}\p{M}'’\-]{2,})*)/gu;
    text.split(/\r?\n/).forEach((line) => {
      if (/^\s*(#|\|?\s*-{3})/.test(line)) return;
      const clean = line.replace(/\*\*|__|`/g, "");
      cre.lastIndex = 0;
      while ((m = cre.exec(clean))) {
        const phrase = m[2];
        const pre = clean.slice(0, m.index + m[1].length).trimEnd();
        if (!pre || /[.!?:;|•\-–—(]$/.test(pre) || /^\s*[-*\d.]+\s*$/.test(pre)) continue;
        const ws = wordsOf(phrase).filter((w) => !["of", "the", "and", "de", "du", "van", "von"].includes(w));
        if (!ws.length || ws.every((w) => STOP.has(w))) continue;
        const unknown = ws.some((w) => !src.wordSet.has(stripMarks(w)) && !prompt.has(stripMarks(w)));
        if (unknown) add(phrase);
      }
    });
    return [...facts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => ({ text: k, count: n }));
  }

  function sections(output) {
    const out = [];
    let cur = { heading: "(opening)", body: [] };
    nfc(output).split(/\r?\n/).forEach((line) => {
      const h = line.match(/^\s*#{1,6}\s+(.+)$/) || line.match(/^\s*\*\*([^*]{2,120})\*\*\s*$/);
      if (h) { out.push(cur); cur = { heading: h[1].replace(/\*\*/g, "").trim(), body: [] }; }
      else cur.body.push(line);
    });
    out.push(cur);
    return out.map((s) => ({ heading: s.heading, text: s.body.join("\n") }));
  }

  function debris(output) {
    const hits = new Set();
    const pats = [/Pasted\s+[A-Za-z]+\s*\(\d{6,}[-_]?\d*\)\.\w+/g, /&#x?[0-9a-f]+;/gi, /^\s*(Copy code|Copy|Edit|Regenerate|Share|Sources?)\s*$/gim,
      /\bimage\s*$/gim, /utm_source=\w+/g];
    pats.forEach((p) => { let m; p.lastIndex = 0; while ((m = p.exec(output))) hits.add(m[0].trim()); });
    return [...hits].filter(Boolean).slice(0, 10);
  }

  function times(n) { return n === 1 ? "once" : n === 2 ? "twice" : n + " times"; }
  function count(re, s) { return (s.match(re) || []).length; }

  /* ---------- main ---------- */
  function analyse(output, sourceText, promptText) {
    const src = makeSource(sourceText || "");
    const quotes = extractQuotes(output || "");
    const checked = src.empty ? [] : quotes.map((q) => checkQuote(src, q)).filter(Boolean);
    const quotations = checked.filter((q) => !q.term);
    const terms = checked.filter((q) => q.term);
    const cited = [...new Set(((output || "").match(/DOC-?\s?\d{1,3}/gi) || []).map((d) => "DOC-" + d.replace(/\D/g, "").padStart(2, "0")))];
    const known = new Set(src.docs.map((d) => d.id));
    const citedPages = [...new Set(((output || "").match(/\bp\.\s?(\d+)/g) || []).map((p) => p.replace(/\D/g, "")))];
    const secs = sections(output || "");
    const noEvidence = secs.filter((s) => {
      const words = wordsOf(s.text).length;
      const hasQuote = /^\s*>/m.test(s.text) || /“[^”]{8,}”|"[^"]{8,}"/.test(s.text);
      return words >= 60 && !hasQuote && !/limitation|safeguard|conclusion|summary|method|opening|structure|actor|overview/i.test(s.heading);
    }).map((s) => s.heading);
    const o = output || "";
    const interpretations = count(/(^|\n)\s*(\*\*)?\s*interpretation\s*(\*\*)?\s*[:：]/gi, o);
    const findingHeads = count(/^\s*#{1,6}\s*\**\s*finding\b/gim, o);
    const findings = Math.max(interpretations, findingHeads);
    const alternatives = count(/alternative (interpretation|reading|explanation|view)/gi, o);
    const limitationMarks = count(/\b(limitations?|uncertain(ty)?|insufficient evidence|cannot (be )?(determined|established|verified|determine|establish|verify)|not (been )?(independently )?verified|unverified|unclear|unknown|beyond the (supplied )?source|no evidence)\b/gi, o);
    return {
      hasSource: !src.empty,
      sourceWords: src.toks.length,
      sourceDocs: src.docs.map((d) => d.id),
      quotations, terms,
      exact: quotations.filter((q) => q.status === "exact").length,
      near: quotations.filter((q) => q.status === "near").length,
      missing: quotations.filter((q) => q.status === "missing").length,
      termsMissing: terms.filter((q) => q.status === "missing"),
      citedDocs: cited,
      missingDocs: src.empty ? [] : cited.filter((d) => !known.has(d)),
      missingPages: src.empty || !src.pages.size ? [] : citedPages.filter((p) => !src.pages.has(p)),
      outsideFacts: src.empty ? [] : outsideFacts(o, src, promptText),
      noEvidence,
      findings, alternatives,
      observation: /\bobservation\b/i.test(o),
      limitationsSection: /^\s*#{1,6}.*limitation/im.test(o),
      limitationMarks,
      selfConfidence: count(/confidence\s*[:：]/gi, o),
      reviewFlags: count(/human (review|validation)|expert review|requires? (independent )?(verification|validation)/gi, o),
      debris: debris(o)
    };
  }

  function suggestScores(r) {
    const s = {};
    // traceability
    const Q = r.quotations.length;
    if (!r.hasSource) s.trace = { score: null, reason: "No source text loaded in the Build tab, so quotations cannot be checked." };
    else if (!Q) s.trace = { score: 1, reason: "The output gives no quotations from the sources." };
    else {
      const rate = (r.exact + 0.5 * r.near) / Q;
      let sc = rate >= 0.95 ? 5 : rate >= 0.85 ? 4 : rate >= 0.7 ? 3 : rate >= 0.5 ? 2 : 1;
      if (r.missing && sc === 5) sc = 4;
      if (r.missingDocs.length) sc = Math.max(1, sc - 1);
      s.trace = { score: sc, reason: r.exact + " of " + Q + " quotations match the source exactly, " + r.near + " nearly, " + r.missing + " not found" +
        (r.missingDocs.length ? "; cites " + r.missingDocs.join(", ") + ", which is not loaded" : "") + "." };
    }
    // plurality
    if (!r.findings) s.plural = { score: r.alternatives ? 3 : 1, reason: r.alternatives ? "Alternative readings appear " + r.alternatives + " times, but findings could not be counted." : "No alternative interpretations found." };
    else {
      const ratio = r.alternatives / r.findings;
      s.plural = { score: ratio >= 0.9 ? 4 : ratio >= 0.5 ? 3 : ratio > 0 ? 2 : 1,
        reason: "Alternative readings given for about " + Math.min(r.alternatives, r.findings) + " of " + r.findings + " findings. Their quality needs your judgement, so the suggestion stops at 4." };
    }
    // calibration
    const L = r.limitationMarks;
    s.calib = { score: r.limitationsSection && L >= 4 ? 4 : L >= 3 ? 3 : L >= 1 ? 2 : 1,
      reason: (r.limitationsSection ? "Has a limitations section; " : "No limitations section; ") + L + " statements of uncertainty or limits." +
        (r.selfConfidence ? " The model rated its own confidence " + times(r.selfConfidence) + ": that is its opinion, not evidence." : "") + " Capped at 4." };
    ["accuracy", "fidelity", "misrep"].forEach((k) => (s[k] = { score: null, reason: "Needs your judgement or a second-model evaluation." }));
    return s;
  }

  function errorsText(r, stamp) {
    const L = [];
    const q = (t) => "“" + (t.length > 160 ? t.slice(0, 157) + "…" : t) + "”";
    L.push("AUTOMATIC CHECKS" + (stamp ? " (" + stamp + ")" : "") + ". Review each item and delete any that are not errors.");
    if (!r.hasSource) L.push("- No source text loaded in the Build tab, so quotations were not checked.");
    r.quotations.filter((x) => x.status === "missing").forEach((x) => L.push("- Quotation not found in the source: " + q(x.text)));
    r.quotations.filter((x) => x.status === "near").forEach((x) => L.push("- " + x.note + ": " + q(x.text) + (x.source ? " Source" + (x.doc ? " (" + x.doc + ")" : "") + " reads: " + q(x.source) : "")));
    r.termsMissing.forEach((x) => L.push("- Quoted term not found in the source: " + q(x.text)));
    if (r.missingDocs.length) L.push("- Cites sources that are not loaded: " + r.missingDocs.join(", "));
    if (r.missingPages.length) L.push("- Cites pages not present in the source: p. " + r.missingPages.join(", p. "));
    if (r.outsideFacts.length) L.push("- Names or numbers not found in your source (check whether they are accurate and where they come from): " + r.outsideFacts.map((f) => f.text).join("; "));
    r.noEvidence.forEach((h) => L.push("- Section makes claims without any quotation: \"" + h + "\""));
    if (r.findings && r.alternatives < r.findings) L.push("- Alternative interpretations given for only about " + r.alternatives + " of " + r.findings + " findings.");
    if (!r.observation && r.findings) L.push("- Observations are not clearly separated from interpretations.");
    if (!r.limitationMarks) L.push("- No limitations or uncertainty stated.");
    if (r.selfConfidence) L.push("- The model rates its own confidence " + times(r.selfConfidence) + ". Treat this as its opinion, not evidence.");
    if (r.debris.length) L.push("- Copy-paste debris to remove before quoting the output: " + r.debris.map((d) => "\"" + d + "\"").join(", "));
    if (L.length === 1) L.push("- No problems found by the automatic checks. Factual accuracy, context and misrepresentation still need your judgement.");
    else L.push("- Not checked automatically: factual accuracy against outside evidence, cultural and historical context, and misrepresentation.");
    return L.join("\n");
  }

  /* ---------- second-model evaluation ---------- */
  function evaluatorPrompt(o) {
    const crit = o.criteria.map((c) => "- " + c.id + " (" + c.label + "): " + c.help + ". 1 = " + c.rubric[0] + "; 3 = " + c.rubric[1] + "; 5 = " + c.rubric[2] + ".").join("\n");
    const parts = [
      "ROLE: You are an independent evaluator of an AI-generated analysis produced for humanities research. You did not write it. Judge it strictly against the source material and the evaluation criteria. Do not defer to the analysis's own confidence ratings.",
      "TASK: Score the ANALYSIS on each criterion from 1 to 5, give a one- or two-sentence reason for each score, and list every error you find. Use null for a criterion you cannot judge from the material provided (for example, factual claims that need outside evidence), and say in the reason what evidence would be needed.",
      "CRITERIA:\n" + crit,
      "ERRORS TO LOOK FOR: misquotations, claims not supported by the source, factual errors, misrepresentation of people, cultures or languages, missing historical or cultural context, interpretations presented as fact, and the analysis simply adopting the framing of its prompt without testing it.",
      "RETURN ONLY this JSON, with no other text:\n{\n  \"evaluator_model\": \"your model name and version\",\n  \"scores\": {\n" +
        o.criteria.map((c) => "    \"" + c.id + "\": {\"score\": 1-5 or null, \"reason\": \"...\"}").join(",\n") +
        "\n  },\n  \"errors\": [{\"type\": \"misquotation | unsupported claim | factual error | misrepresentation | missing context | framing adopted | other\", \"excerpt\": \"the words in the analysis\", \"explanation\": \"...\"}],\n  \"adopted_prompt_framing\": true or false,\n  \"overall\": \"two or three sentences\"\n}",
      "THE PROMPT THAT PRODUCED THE ANALYSIS:\n<<<BEGIN PROMPT>>>\n" + (o.prompt || "(not recorded)") + "\n<<<END PROMPT>>>",
      o.source ? "SOURCE MATERIAL:\n<<<BEGIN SOURCE>>>\n" + o.source + "\n<<<END SOURCE>>>" : "SOURCE MATERIAL: none supplied. Mark source-dependent judgements as null.",
      "THE ANALYSIS TO EVALUATE:\n<<<BEGIN ANALYSIS>>>\n" + o.output + "\n<<<END ANALYSIS>>>"
    ];
    return parts.join("\n\n");
  }

  function parseEvaluatorReply(text, criteria) {
    let t = (text || "").replace(/```(?:json)?/gi, "").trim();
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a === -1 || b <= a) return { ok: false, error: "No JSON found in the reply. Ask the evaluator to return only the JSON." };
    let data;
    try { data = JSON.parse(t.slice(a, b + 1)); }
    catch (e) {
      try { data = JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, "\"")); }
      catch (e2) { return { ok: false, error: "The reply is not valid JSON: " + e.message }; }
    }
    const scoresIn = data.scores || {};
    const byLabel = {};
    criteria.forEach((c) => { byLabel[c.id] = c.id; byLabel[c.label.toLowerCase()] = c.id; });
    const scores = {};
    Object.keys(scoresIn).forEach((k) => {
      const id = byLabel[k] || byLabel[k.toLowerCase()];
      if (!id) return;
      const v = scoresIn[k];
      const raw = v && typeof v === "object" ? v.score : v;
      const n = raw === null || raw === undefined || raw === "" ? null : parseInt(raw, 10);
      scores[id] = { score: n >= 1 && n <= 5 ? n : null, reason: v && typeof v === "object" ? String(v.reason || "") : "" };
    });
    if (!Object.keys(scores).length) return { ok: false, error: "The JSON has no recognisable scores." };
    const errors = Array.isArray(data.errors) ? data.errors.filter((e) => e && typeof e === "object").map((e) => ({
      type: String(e.type || "other"), excerpt: String(e.excerpt || ""), explanation: String(e.explanation || "")
    })) : [];
    return { ok: true, model: String(data.evaluator_model || ""), scores, errors, framing: data.adopted_prompt_framing === true, overall: String(data.overall || "") };
  }

  function aiErrorsText(ev, model) {
    const L = ["SECOND-MODEL EVALUATION" + (model ? " (" + model + ")" : "") + ". These are another AI's judgements: verify each before accepting it."];
    ev.errors.forEach((e) => L.push("- [" + e.type + "] " + (e.excerpt ? "“" + e.excerpt + "” " : "") + e.explanation));
    if (!ev.errors.length) L.push("- The evaluator reported no errors.");
    if (ev.framing) L.push("- The evaluator judged that the analysis adopted the prompt's framing without testing it.");
    if (ev.overall) L.push("- Overall: " + ev.overall);
    return L.join("\n");
  }

  const api = { analyse, suggestScores, errorsText, evaluatorPrompt, parseEvaluatorReply, aiErrorsText, _extractQuotes: extractQuotes };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LAB_CHECKS = api;
})(typeof window !== "undefined" ? window : globalThis);
