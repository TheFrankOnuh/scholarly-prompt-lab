/* Scholarly Prompt Lab: automatic checks on a model output.
   Pure functions, no network. They compare the output against the researcher's own source text.
   They never decide whether an interpretation is right; they find things a scholar should look at. */
(function (root) {
  "use strict";

  // Scripts written without spaces between words are compared character by character.
  const UNSPACED = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Thai}";
  const WORD = new RegExp("[" + UNSPACED + "]|(?:(?![" + UNSPACED + "])[\\p{L}\\p{M}\\p{N}])+(?:['’](?:(?![" + UNSPACED + "])[\\p{L}\\p{M}])+)*", "gu");

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
    return q.replace(/\*\*|__|`/g, "").replace(/^[\s*_"“”«»'‘’]+|[\s*_"“”«»'‘’]+$/g, "").replace(/\s+/g, " ").trim();
  }
  // curly quotes may run over a line break inside a paragraph; straight quotes must stay on one line and not follow a digit (6")
  const INLINE = /“((?:[^”\n]|\n(?!\s*\n)){1,2000})”|(?<![\p{L}\p{N}])"([^"\n]{1,1200})"(?![\p{L}\p{N}])|«([^»\n]{1,1200})»|(?<![\p{L}\p{N}])‘((?:[^’\n]|’(?=\p{L})){1,1200})’(?!\p{L})/gu;
  function inlineQuotes(text) {
    const out = [];
    let m;
    INLINE.lastIndex = 0;
    while ((m = INLINE.exec(text))) { const q = cleanQuote(m[1] || m[2] || m[3] || m[4] || ""); if (q) out.push(q); }
    return out;
  }
  function stripInline(text) { INLINE.lastIndex = 0; return text.replace(INLINE, " "); }

  const EVIDENCE_KEY = /quot|evidence|excerpt|verbatim|passage/i;
  const ALT_KEY = /alternative/i;

  function parseJsonOutput(output) {
    const t = output.replace(/```(?:json)?/gi, "").trim();
    if (!/^[\[{]/.test(t)) return null;
    try { const d = JSON.parse(t); return d && typeof d === "object" ? d : null; } catch (e) { return null; }
  }
  function parseCsv(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim())) rows.push(row); row = []; }
      else cell += c;
    }
    row.push(cell); if (row.some((x) => x.trim())) rows.push(row);
    return rows;
  }
  function parseCsvOutput(output) {
    const t = output.replace(/```(?:csv)?/gi, "").trim();
    const first = (t.split(/\r?\n/)[0] || "");
    if ((first.match(/,/g) || []).length < 2 || /[.!?]\s*$/.test(first) || /^\s*[#>|]/.test(first)) return null;
    const rows = parseCsv(t);
    if (rows.length < 2) return null;
    const width = rows[0].length;
    if (width < 3 || rows.filter((r) => r.length === width).length < rows.length * 0.8) return null;
    return { header: rows[0].map((h) => h.trim()), rows: rows.slice(1) };
  }
  function tableRows(output) {
    // markdown table: header row, separator row, data rows
    const lines = output.split(/\r?\n/);
    const tables = [];
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\s*\|.*\|\s*$/.test(lines[i]) && /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
        const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const header = cells(lines[i]); const rows = [];
        let j = i + 2;
        while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) { rows.push(cells(lines[j])); j++; }
        tables.push({ header, rows });
        i = j;
      }
    }
    return tables;
  }
  function nonEmpty(v) { return v != null && String(v).trim() && !/^(-|–|—|n\/a|none|null)$/i.test(String(v).trim()); }

  // Works out what kind of output this is and pulls out the quotations it presents as evidence.
  function extractQuotes(output) {
    const found = [];
    const info = { format: "prose", findings: null, alternatives: null, note: "" };
    const text = nfc(output);
    const push = (q, block) => { q = cleanQuote(q); if (q) found.push({ text: q, block: !!block }); };

    const json = parseJsonOutput(text);
    const csv = json ? null : parseCsvOutput(text);
    if (json) {
      info.format = "json";
      const objects = [];
      let evidenceFields = 0;
      (function walk(v, key) {
        if (typeof v === "string") {
          if (key && EVIDENCE_KEY.test(key)) { evidenceFields++; const inner = inlineQuotes(v); if (inner.length > 1) inner.forEach((q) => push(q, true)); else push(v, true); }
          else inlineQuotes(v).forEach((q) => push(q, false));
        } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
        else if (v && typeof v === "object") { objects.push(v); Object.keys(v).forEach((k) => walk(v[k], k)); }
      })(json, "");
      const rows = Array.isArray(json) ? json.filter((x) => x && typeof x === "object") : objects.filter((o) => Object.keys(o).some((k) => EVIDENCE_KEY.test(k) || /interpret|finding|claim/i.test(k)));
      info.findings = rows.length || null;
      if (rows.some((o) => Object.keys(o).some((k) => ALT_KEY.test(k)))) info.alternatives = rows.filter((o) => Object.keys(o).some((k) => ALT_KEY.test(k) && nonEmpty(o[k]))).length;
      if (!evidenceFields) info.note = "The JSON has no field for quotations or evidence, so only quoted passages inside other fields were checked.";
    } else if (csv) {
      info.format = "csv";
      const ev = csv.header.map((h, i) => (EVIDENCE_KEY.test(h) ? i : -1)).filter((i) => i >= 0);
      const alt = csv.header.findIndex((h) => ALT_KEY.test(h));
      csv.rows.forEach((r) => r.forEach((c, i) => { if (ev.includes(i)) { if (nonEmpty(c)) push(c, true); } else inlineQuotes(c).forEach((q) => push(q, false)); }));
      info.findings = csv.rows.length;
      if (alt >= 0) info.alternatives = csv.rows.filter((r) => nonEmpty(r[alt])).length;
      if (!ev.length) info.note = "The CSV has no column for quotations or evidence, so only quoted passages inside other columns were checked.";
    } else {
      const lines = text.split(/\r?\n/);
      const rest = [];
      let block = [];
      const flush = () => {
        if (!block.length) return;
        // drop attribution lines such as "— Mama Nkechi" at the end of a quoted block
        while (block.length > 1 && /^\s*[—–]\s*\S/.test(block[block.length - 1])) block.pop();
        const joined = block.join("\n").trim();
        block = [];
        const pairs = inlineQuotes(joined);
        const outsideWords = pairs.length ? wordsOf(stripInline(joined)).length : 99;
        // quoted passage(s) followed only by a short citation: check the passages, not the citation
        if (pairs.length && outsideWords <= 8) pairs.forEach((q) => push(q, true));
        else push(joined.replace(/\s*\((?:DOC-?\s?\d+|p\.\s?\d+)[^)]*\)\s*$/i, ""), true);
      };
      lines.forEach((line) => {
        const m = line.match(/^\s*>+\s?(.*)$/);
        if (m) { if (m[1].trim()) block.push(m[1]); else flush(); }
        else { flush(); rest.push(line); }
      });
      flush();
      inlineQuotes(rest.join("\n")).forEach((q) => push(q, false));
      const tables = tableRows(text);
      if (tables.length) {
        info.format = "table";
        const big = tables.reduce((a, b) => (b.rows.length > a.rows.length ? b : a), tables[0]);
        const alt = big.header.findIndex((h) => ALT_KEY.test(h));
        info.tableFindings = big.rows.length;
        if (alt >= 0) info.tableAlternatives = big.rows.filter((r) => nonEmpty(r[alt])).length;
      }
    }
    const seen = new Set();
    const quotes = found.filter((q) => {
      const k = wordsOf(q.text).join(" ");
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return { quotes, info };
  }
  // text with quotations removed, for the "outside facts" scan
  function withoutQuotes(output) {
    return stripInline(nfc(output).split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join("\n"));
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

  let srcCache = { key: null, src: null };
  function makeSource(sourceText) {
    if (srcCache.key === sourceText && srcCache.src) return srcCache.src;
    const text = nfc(sourceText);
    // page and document markers are labels, not part of the text: blank them out (same length, so positions hold)
    const masked = text.replace(/\[(?:DOC-\d+[^\]\n]*|p\.\s*\d+)\]/g, (m) => " ".repeat(m.length));
    let toks = tokens(masked);
    // rejoin words split by a hyphen at a line end, as PDFs often do (war-\nrant)
    const merged = [];
    toks.forEach((t) => {
      const p = merged[merged.length - 1];
      if (p && /^-[ \t]*\r?\n[ \t]*$/.test(masked.slice(p.e, t.i))) { p.w += t.w; p.e = t.e; }
      else merged.push({ w: t.w, i: t.i, e: t.e });
    });
    toks = merged;
    const words = toks.map((t) => t.w);
    const bareWords = words.map(stripMarks);
    const starts = (arr) => { const out = new Array(arr.length); let pos = 1; for (let k = 0; k < arr.length; k++) { out[k] = pos; pos += arr[k].length + 1; } return out; };
    const joined = " " + words.join(" ") + " ";
    const bare = " " + bareWords.join(" ") + " ";
    const index = new Map();
    bareWords.forEach((w, k) => { if (!index.has(w)) index.set(w, []); index.get(w).push(k); });
    const docs = [];
    const dre = /\[DOC-(\d+)[^\]]*\]/g;
    let m;
    while ((m = dre.exec(text))) docs.push({ id: "DOC-" + m[1].padStart(2, "0"), at: m.index });
    const pages = new Set();
    const pre = /\[p\.\s*(\d+)\]/g;
    while ((m = pre.exec(text))) pages.add(m[1]);
    const numbers = " " + text.replace(/(\d),(?=\d{3}\b)/g, "$1") + " ";
    const src = { text, toks, joined, bare, joinedStarts: starts(words), bareStarts: starts(bareWords), bareWords, index, docs, pages, numbers,
      wordSet: new Set(bareWords), empty: !toks.length, results: new Map() };
    srcCache = { key: sourceText, src };
    return src;
  }
  function docAt(src, charIndex) {
    let id = null;
    for (const d of src.docs) { if (d.at <= charIndex) id = d.id; else break; }
    return id;
  }
  function docOfTok(src, tok) { const t = src.toks[Math.min(tok, src.toks.length - 1)]; return t ? docAt(src, t.i) : null; }
  function excerpt(src, startTok, len) {
    const a = src.toks[Math.max(0, startTok)], b = src.toks[Math.min(src.toks.length - 1, startTok + len - 1)];
    if (!a || !b) return "";
    return src.text.slice(a.i, b.e).replace(/\[(?:DOC-\d+[^\]\n]*|p\.\s*\d+)\]/g, " ").replace(/-[ \t]*\r?\n[ \t]*/g, "").replace(/\s+/g, " ").trim();
  }
  function posToTok(startsArr, pos) {
    // position of a word's first character in the joined string -> token index
    let lo = 0, hi = startsArr.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (startsArr[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo;
  }

  function segmentsOf(q) {
    // an editorial bracket touching a word keeps its letters: [T]he -> The, trader[s] -> traders
    const t = q.replace(/\[(\p{L}{1,3})\](?=\p{L})/gu, "$1").replace(/(?<=\p{L})\[(\p{L}{1,3})\]/gu, "$1");
    // otherwise split at ellipses and bracketed insertions: each part must appear, in order
    return t.split(/\s*(?:\.{3,}|…|\[[^\]]*\])\s*/).map((p) => wordsOf(p)).filter((w) => w.length);
  }

  const MAX_GAP = 150;   // words allowed between the parts of a quotation joined by "..."
  // Finds the parts in order. strict: same document, each part close to the last. Returns the first token index or -1.
  function findSegments(src, segs, key, strict) {
    const hay = src[key], startsArr = key === "bare" ? src.bareStarts : src.joinedStarts;
    const needle = (s) => " " + (key === "bare" ? stripMarks(s.join(" ")) : s.join(" ")) + " ";
    const first = needle(segs[0]);
    let from = 0, tries = 0;
    while (tries++ < 60) {
      const at = hay.indexOf(first, from);
      if (at === -1) return -1;
      const startTok = posToTok(startsArr, at + 1);
      let endTok = startTok + segs[0].length, ok = true;
      for (let k = 1; k < segs.length && ok; k++) {
        const nd = needle(segs[k]);
        const p = hay.indexOf(nd, startsArr[Math.min(endTok, startsArr.length - 1)] - 1);
        if (p === -1) { ok = false; break; }
        const tok = posToTok(startsArr, p + 1);
        if (strict && (tok - endTok > MAX_GAP || docOfTok(src, tok) !== docOfTok(src, startTok))) { ok = false; break; }
        endTok = tok + segs[k].length;
      }
      if (ok) return startTok;
      if (segs.length === 1) return -1;
      from = at + 1;
    }
    return -1;
  }

  function nearest(src, qWords) {
    const q = qWords.map(stripMarks);
    const n = q.length;
    // start from the rarest words of the quotation, so common words such as "the" cannot crowd out the right place
    const ranked = q.map((w, k) => ({ k, posts: src.index.get(w) || [] })).filter((x) => x.posts.length).sort((a, b) => a.posts.length - b.posts.length);
    const starts = new Set();
    for (const r of ranked.slice(0, 5)) {
      if (starts.size > 2500) break;
      for (const pos of r.posts) { const s = pos - r.k; if (s >= -2) starts.add(Math.max(0, s)); if (starts.size > 4000) break; }
    }
    // cheap pre-filter: how many of the quotation's words fall in the window
    const need = new Map(); q.forEach((w) => need.set(w, (need.get(w) || 0) + 1));
    const scored = [];
    for (const s of starts) {
      const seen = new Map(); let hit = 0;
      for (let j = s; j < s + n && j < src.bareWords.length; j++) {
        const w = src.bareWords[j], c = need.get(w);
        if (c) { const u = seen.get(w) || 0; if (u < c) { seen.set(w, u + 1); hit++; } }
      }
      if (hit / n >= 0.5) scored.push({ s, hit });
    }
    scored.sort((a, b) => b.hit - a.hit);
    let best = { sim: 0, start: -1, len: 0 };
    for (const c of scored.slice(0, 12)) {
      for (let len = Math.max(1, n - 2); len <= n + 2; len++) {
        const win = src.bareWords.slice(c.s, c.s + len);
        if (!win.length) continue;
        const sim = 1 - lev(q, win) / Math.max(n, win.length);
        if (sim > best.sim) best = { sim, start: c.s, len: win.length };
      }
    }
    return best;
  }

  function checkQuote(src, qt) {
    const key = (qt.block ? "B:" : "I:") + qt.text;
    const cached = src.results.get(key);
    if (cached) return cached;
    const res = checkQuoteUncached(src, qt);
    if (res) src.results.set(key, res);
    return res;
  }
  function checkQuoteUncached(src, qt) {
    const words = wordsOf(qt.text);
    // a few quoted words inside a sentence are a "term"; anything set out as a quotation block is a quotation
    const isTerm = words.length < (qt.block ? 2 : 4);
    const res = { text: qt.text, words: words.length, term: isTerm, status: "missing", note: "", source: "", doc: null };
    const segs = segmentsOf(qt.text);
    if (!segs.length) return null;
    const single = segs.length === 1;
    const shortPart = !single && segs.some((s) => s.length < 3);
    let tok = findSegments(src, segs, "joined", true);
    if (tok >= 0 && !shortPart) {
      res.status = "exact";
      if (!single) res.note = "with omissions marked";
      res.doc = docOfTok(src, tok);
      return res;
    }
    if (tok < 0) tok = shortPart ? -1 : findSegments(src, segs, "bare", true);
    if (tok >= 0 && !shortPart) {
      res.status = "near";
      res.note = "Accents or diacritics differ from the source";
      res.source = excerpt(src, tok, segs[0].length);
      res.doc = docOfTok(src, tok);
      return res;
    }
    if (!single) {
      // the parts exist, but are far apart, in different documents, or only a word or two long
      const loose = findSegments(src, segs, "bare", false);
      if (loose >= 0) {
        res.status = "near";
        res.note = shortPart ? "Joined from very short fragments with omissions: check that the source says this"
          : "The parts appear in the source, but far apart or in different documents: check the omissions";
        res.doc = docOfTok(src, loose);
        return res;
      }
    }
    if (isTerm) return res;
    const longest = segs.reduce((a, b) => (b.length > a.length ? b : a), segs[0]);
    const best = nearest(src, longest);
    if (best.sim >= 0.75 && best.start >= 0) {
      res.status = "near";
      res.source = excerpt(src, best.start, best.len);
      const marksToo = stripMarks(wordsOf(res.source).join(" ")) !== wordsOf(res.source).join(" ") && stripMarks(longest.join(" ")) === longest.join(" ");
      res.note = "Wording differs from the source (" + Math.round(best.sim * 100) + "% match)" + (marksToo ? ", and accents or diacritics are missing" : "");
      res.doc = docOfTok(src, best.start);
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
    const nre = /(?<![\p{L}\-#.\d,])(?:[₦$£€]\s?)?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|per cent|million|billion|trillion)?/giu;
    let m;
    while ((m = nre.exec(text))) {
      const raw = m[0].trim().replace(/[,.]+$/, "");
      const digits = raw.replace(/[^\d.]/g, "").replace(/\.$/, "");
      const before = text.slice(Math.max(0, m.index - 10), m.index);
      const lineStart = /(^|\n)\s*$/.test(text.slice(Math.max(0, m.index - 6), m.index));
      if (lineStart && /^[.)]\s/.test(text.slice(m.index + m[0].trimEnd().length))) continue;          // list marker: "10. "
      if (/(finding|doc-|p\.|page|run|condition|step|figure|table|section|version|v)\s*$/i.test(before)) continue;
      if (digits.length < 2 && !/%|percent|million|billion|[₦$£€]/i.test(raw)) continue;
      if (!digits) continue;
      // present in the source as a whole number, not as part of a longer one (19 is not "in" 1929)
      const esc = digits.replace(/\./g, "\\.");
      if (new RegExp("(?<![\\d.])" + esc + "(?![\\d]|\\.\\d)").test(src.numbers)) continue;
      add(raw);
    }
    // capitalised names not at the start of a sentence
    const cre = /(^|[^\p{L}\p{M}])(\p{Lu}[\p{L}\p{M}'’\-]{2,}(?:\s+(?:of|the|and|de|du|van|von)?\s*\p{Lu}[\p{L}\p{M}'’\-]{2,})*)/gu;
    const known = (w) => { const b = stripMarks(w.replace(/['’]s?$/, "")); return src.wordSet.has(b) || prompt.has(b) || src.wordSet.has(stripMarks(w)) || prompt.has(stripMarks(w)); };
    text.split(/\r?\n/).forEach((line) => {
      if (/^\s*(#|\|?\s*-{3})/.test(line)) return;
      const clean = line.replace(/\*\*|__|`/g, "");
      cre.lastIndex = 0;
      while ((m = cre.exec(clean))) {
        const phrase = m[2].replace(/['’]s$/, "");
        const pre = clean.slice(0, m.index + m[1].length).trimEnd();
        if (!pre || /[.!?:;|•\-–—(]$/.test(pre) || /^\s*[-*\d.]+\s*$/.test(pre)) continue;
        const ws = wordsOf(phrase).filter((w) => !["of", "the", "and", "de", "du", "van", "von"].includes(w));
        if (!ws.length || ws.every((w) => STOP.has(w))) continue;
        if (ws.some((w) => !known(w))) add(phrase);
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
    const pats = [/Pasted\s+[A-Za-z]+\s*\(\d{6,}[-_]?\d*\)\.\w+/g, /&#x?[0-9a-f]+;/gi, /^\s*(Copy code|Regenerate response|Regenerate)\s*$/gim, /utm_source=\w+/g];
    pats.forEach((p) => { let m; p.lastIndex = 0; while ((m = p.exec(output))) hits.add(m[0].trim()); });
    return [...hits].filter(Boolean).slice(0, 10);
  }

  function times(n) { return n === 1 ? "once" : n === 2 ? "twice" : n + " times"; }
  function count(re, s) { return (s.match(re) || []).length; }

  /* ---------- main ---------- */
  function analyse(output, sourceText, promptText) {
    const src = makeSource(sourceText || "");
    const ex = extractQuotes(output || "");
    const quotes = ex.quotes, info = ex.info;
    const checked = src.empty ? [] : quotes.map((q) => checkQuote(src, q)).filter(Boolean);
    const quotations = checked.filter((q) => !q.term);
    const terms = checked.filter((q) => q.term);
    const cited = [...new Set(((output || "").match(/DOC-?\s?\d{1,3}/gi) || []).map((d) => "DOC-" + d.replace(/\D/g, "").padStart(2, "0")))];
    const known = new Set(src.docs.map((d) => d.id));
    const citedPages = [...new Set(((output || "").match(/\bp\.\s?(\d+)/g) || []).map((p) => p.replace(/\D/g, "")))];
    const o = output || "";
    const structured = info.format === "json" || info.format === "csv";
    const secs = structured ? [] : sections(o);
    const noEvidence = secs.filter((s) => {
      const words = wordsOf(s.text).length;
      const hasQuote = /^\s*>/m.test(s.text) || inlineQuotes(s.text).some((q) => wordsOf(q).length >= 3);
      return words >= 60 && !hasQuote && !/limitation|safeguard|conclusion|summary|method|opening|structure|actor|overview/i.test(s.heading);
    }).map((s) => s.heading);
    const interpretations = count(/(^|\n)\s*(\*\*)?\s*interpretation\s*(\*\*)?\s*[:：]/gi, o);
    const findingHeads = count(/^\s*#{1,6}\s*\**\s*finding\b/gim, o);
    let findings = Math.max(interpretations, findingHeads);
    let alternatives = count(/alternative (interpretation|reading|explanation|view)/gi, o);
    let altKnown = true;
    if (structured) { findings = info.findings || 0; altKnown = info.alternatives != null; alternatives = info.alternatives || 0; }
    else if (!findings && info.tableFindings) { findings = info.tableFindings; altKnown = info.tableAlternatives != null; alternatives = info.tableAlternatives || 0; }
    const limitationMarks = count(/\b(limitations?|uncertain(ty)?|insufficient evidence|cannot (be )?(determined|established|verified|determine|establish|verify)|not (been )?(independently )?verified|unverified|unclear|unknown|beyond the (supplied )?source|no evidence)\b/gi, o);
    return {
      hasSource: !src.empty,
      format: info.format, formatNote: info.note,
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
      outsideFacts: src.empty || structured ? [] : outsideFacts(o, src, promptText),
      noEvidence,
      findings, alternatives, altKnown,
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
    else if (!Q) s.trace = { score: r.formatNote ? null : 1, reason: r.formatNote || "The output gives no quotations from the sources." };
    else {
      const rate = (r.exact + 0.5 * r.near) / Q;
      let sc = rate >= 0.95 ? 5 : rate >= 0.85 ? 4 : rate >= 0.7 ? 3 : rate >= 0.5 ? 2 : 1;
      if (r.missing && sc === 5) sc = 4;
      if (r.missingDocs.length) sc = Math.max(1, sc - 1);
      s.trace = { score: sc, reason: r.exact + " of " + Q + " quotations match the source exactly, " + r.near + " nearly, " + r.missing + " not found" +
        (r.missingDocs.length ? "; cites " + r.missingDocs.join(", ") + ", which is not loaded" : "") + "." };
    }
    // plurality
    if (!r.findings || r.altKnown === false) s.plural = { score: null, reason: !r.findings
      ? "Findings could not be counted in this output format, so no score is suggested." + (r.alternatives ? " Alternative readings are mentioned " + times(r.alternatives) + "." : "")
      : "This output has no column or field for alternative interpretations, so no score is suggested." };
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
    if (r.formatNote) L.push("- " + r.formatNote);
    r.quotations.filter((x) => x.status === "missing").forEach((x) => L.push("- Quotation not found in the source: " + q(x.text)));
    r.quotations.filter((x) => x.status === "near").forEach((x) => L.push("- " + x.note + ": " + q(x.text) + (x.source ? " Source" + (x.doc ? " (" + x.doc + ")" : "") + " reads: " + q(x.source) : "")));
    r.termsMissing.forEach((x) => L.push("- Quoted term not found in the source: " + q(x.text)));
    if (r.missingDocs.length) L.push("- Cites sources that are not loaded: " + r.missingDocs.join(", "));
    if (r.missingPages.length) L.push("- Cites pages not present in the source: p. " + r.missingPages.join(", p. "));
    if (r.outsideFacts.length) L.push("- Names or numbers not found in your source (check whether they are accurate and where they come from): " + r.outsideFacts.map((f) => f.text).join("; "));
    r.noEvidence.forEach((h) => L.push("- Section makes claims without any quotation: \"" + h + "\""));
    if (r.findings && r.altKnown !== false && r.alternatives < r.findings) L.push("- Alternative interpretations given for only about " + r.alternatives + " of " + r.findings + " findings.");
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
    const byLabel = new Map();
    criteria.forEach((c) => { byLabel.set(c.id, c.id); byLabel.set(c.label.toLowerCase(), c.id); });
    const scores = {};
    if (!scoresIn || typeof scoresIn !== "object" || Array.isArray(scoresIn)) return { ok: false, error: "The JSON has no recognisable scores." };
    Object.keys(scoresIn).forEach((k) => {
      const id = byLabel.get(k) || byLabel.get(String(k).toLowerCase());
      if (!id) return;
      if (scores[id] && scores[id].score != null) return;     // keep the first valid score for a criterion
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

  const api = { analyse, suggestScores, errorsText, evaluatorPrompt, parseEvaluatorReply, aiErrorsText, _extractQuotes: (o) => extractQuotes(o).quotes };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LAB_CHECKS = api;
})(typeof window !== "undefined" ? window : globalThis);
