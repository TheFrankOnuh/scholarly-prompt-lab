/* Scholarly Prompt Lab: application logic. No dependencies, no network calls. */
(function () {
  "use strict";

  const L = window.LAB;
  const VERSION = "0.5.0";
  const KEY_DRAFT = "spl.draft.v1";
  const KEY_LOG = "spl.log.v1";
  const $ = (id) => document.getElementById(id);

  const CONDITIONS = [
    { n: 1, id: "baseline", name: "Baseline", adds: "The research question and the output specification only." },
    { n: 2, id: "theory", name: "Theory-grounded", adds: "Adds discipline and theoretical orientation." },
    { n: 3, id: "context", name: "Context-grounded", adds: "Adds source material, cultural and historical context, and terminology." },
    { n: 4, id: "evidence", name: "Evidence-constrained", adds: "Adds the analytical procedure and every safeguard." }
  ];

  /* ---------- storage (never required for the page to work) ---------- */
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ---------- helpers ---------- */
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach((c) => n.append(c));
    return n;
  }
  function option(value, label) { return el("option", { value, text: label }); }
  function lines(s) { return (s || "").split("\n").map((x) => x.trim()).filter(Boolean); }
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function flash(id, msg) { const s = $(id); s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(() => (s.textContent = ""), 2600); }
  async function copy(text, statusId) {
    try { await navigator.clipboard.writeText(text); flash(statusId, "Copied."); }
    catch (e) {
      const t = el("textarea"); t.value = text; document.body.append(t); t.select();
      try { document.execCommand("copy"); flash(statusId, "Copied."); } catch (e2) { flash(statusId, "Copy failed. Select the text and copy it manually."); }
      t.remove();
    }
  }
  function slug(s) { return (s || "research-design").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "research-design"; }

  /* ---------- populate controls ---------- */
  L.disciplines.forEach((d) => $("discipline").append(option(d, d)));
  Object.keys(L.techniques).forEach((k) => $("technique").append(option(k, L.techniques[k].label)));
  $("example").append(option("", "Choose an example…"));
  L.examples.forEach((x) => $("example").append(option(x.id, x.title)));
  L.safeguards.forEach((g) => {
    $("safeguards").append(el("label", { class: "check" }, [
      el("input", { type: "checkbox", value: g.id, "data-ctx": g.ctx }), g.label
    ]));
  });
  $("lgCondition").append(option("custom", "Prompt from the Build tab"));
  CONDITIONS.forEach((c) => $("lgCondition").append(option(c.id, "Study condition " + c.n + ": " + c.name)));
  $("lgCondition").value = "custom";
  L.criteria.forEach((c) => {
    const sel = el("select", { id: "sc_" + c.id, "aria-label": c.label });
    sel.append(option("", "–"));
    for (let i = 1; i <= 5; i++) sel.append(option(String(i), String(i)));
    $("criteria").append(el("div", { class: "criterion" }, [
      el("span", {}, [c.label, " ", el("span", { id: "st_" + c.id }), el("small", { text: c.help })]), sel,
      el("div", { class: "sugs", id: "sug_" + c.id })
    ]));
  });
  L.framework.forEach((f) => {
    $("frameworkList").append(el("div", {}, [
      el("span", { class: "letter", text: f.l }),
      el("div", {}, [el("strong", { text: f.name }), el("p", { text: f.d }), el("p", { class: "q", text: f.q })])
    ]));
  });
  $("lgDate").value = today();

  /* ---------- theory library and picker ---------- */
  const KEY_THEORIES = "spl.mytheories.v1";
  const TF = window.LAB_THEORY_FIELDS;
  const MINE = { id: "mine", label: "Your theories" };
  let myTheories = store.get(KEY_THEORIES, []);
  if (!Array.isArray(myTheories)) myTheories = [];
  let selectedTheories = [];
  let theoryField = "all";
  let theoryQuery = "";

  function allTheories() { return myTheories.concat(window.LAB_THEORIES); }
  function theoryById(id) { return allTheories().find((t) => t.id === id); }
  function fieldLabel(id) { return id === "mine" ? MINE.label : (TF.find((f) => f.id === id) || {}).label || "Other"; }
  function norm(x) { return (x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  [{ id: "all", label: "All fields" }, { id: "selected", label: "Selected" }, MINE].concat(TF).forEach((f) => {
    const b = el("button", { type: "button", "data-field": f.id, text: f.label, "aria-pressed": f.id === "all" ? "true" : "false" });
    b.addEventListener("click", () => { theoryField = f.id; renderTheoryPicker(); $("theoryList").scrollTop = 0; });
    $("theoryFields").append(b);
  });
  [MINE].concat(TF).forEach((f) => $("ntField").append(option(f.id, f.label)));

  function highlight(text, q) {
    const frag = document.createDocumentFragment();
    if (!q) { frag.append(text); return frag; }
    const n = norm(text);
    let i = 0, at;
    while ((at = n.indexOf(q, i)) !== -1) {
      frag.append(text.slice(i, at), el("mark", { text: text.slice(at, at + q.length) }));
      i = at + q.length;
    }
    frag.append(text.slice(i));
    return frag;
  }

  function shareUrl(t) {
    const body = "Please consider adding this theory to the Scholarly Prompt Lab.\n\nName: " + t.n + "\nKey thinkers: " + (t.t || "") +
      "\nWhat the analysis should attend to: " + t.a + "\nSuggested field: " + fieldLabel(t.f) + "\n\nWhy it matters for humanities research:\n";
    return "https://github.com/TheFrankOnuh/scholarly-prompt-lab/issues/new?title=" + encodeURIComponent("Theory suggestion: " + t.n) + "&body=" + encodeURIComponent(body) + "&labels=theory";
  }

  function toggleTheory(id, on) {
    const has = selectedTheories.includes(id);
    if (on && !has) selectedTheories.push(id);
    if (!on && has) selectedTheories = selectedTheories.filter((x) => x !== id);
    renderTheoryPicker();
    renderBuild();
  }

  function renderTheoryPicker() {
    // chips
    const chips = $("theoryChips"); chips.replaceChildren();
    selectedTheories.forEach((id) => {
      const t = theoryById(id); if (!t) return;
      const x = el("button", { type: "button", "aria-label": "Remove " + t.n, title: "Remove", text: "×" });
      x.addEventListener("click", () => toggleTheory(id, false));
      chips.append(el("span", { class: "chip", title: t.n + (t.t ? " (" + t.t + ")" : "") }, [el("span", { text: t.n }), x]));
    });
    const total = allTheories().length;
    $("theoryCount").textContent = selectedTheories.length ? selectedTheories.length + " selected" : total + " theories available";

    // field tabs
    document.querySelectorAll("#theoryFields button").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.field === theoryField ? "true" : "false");
      if (b.dataset.field === "selected") b.textContent = "Selected (" + selectedTheories.length + ")";
      if (b.dataset.field === "mine") { b.textContent = "Your theories (" + myTheories.length + ")"; }
    });

    // list
    const q = norm(theoryQuery.trim());
    const list = $("theoryList"); list.replaceChildren();
    let shown = allTheories().filter((t) => {
      if (theoryField === "selected" && !selectedTheories.includes(t.id)) return false;
      if (theoryField !== "all" && theoryField !== "selected" && t.f !== theoryField) return false;
      if (!q) return true;
      return norm(t.n + " " + t.t + " " + t.a + " " + fieldLabel(t.f)).includes(q);
    });
    // when searching, rank name matches first
    if (q) shown = shown.sort((a, b) => (norm(b.n).includes(q) ? 1 : 0) - (norm(a.n).includes(q) ? 1 : 0));
    const groups = [];
    const order = ["mine"].concat(TF.map((f) => f.id));
    if (q) groups.push({ id: "results", label: "Results", items: shown });
    else order.forEach((fid) => { const items = shown.filter((t) => t.f === fid); if (items.length) groups.push({ id: fid, label: fieldLabel(fid), items }); });

    groups.forEach((g) => {
      const box = el("div", { class: "picker-group" }, [el("h4", { text: g.label + " · " + g.items.length })]);
      g.items.forEach((t) => {
        const on = selectedTheories.includes(t.id);
        const cb = el("input", { type: "checkbox", value: t.id });
        cb.checked = on;
        cb.addEventListener("change", () => toggleTheory(t.id, cb.checked));
        const name = el("span", { class: "tn" }, [highlight(t.n, q)]);
        if (t.custom) name.append(el("span", { class: "badge", text: "Yours" }));
        const text = el("span", {}, [name, " ", t.t ? el("span", { class: "tt" }, [highlight(t.t, q)]) : "", el("span", { class: "ta" }, [highlight(t.a, q)])]);
        const tools = el("span", { class: "tools" });
        if (t.custom) {
          const share = el("a", { href: shareUrl(t), target: "_blank", rel: "noopener", title: "Opens a pre-filled suggestion on GitHub (needs a GitHub account)", text: "Share" });
          const del = el("button", { type: "button", text: "Delete" });
          del.addEventListener("click", (e) => {
            e.preventDefault();
            if (!confirm("Delete your theory \"" + t.n + "\"? This removes it from this browser.")) return;
            myTheories = myTheories.filter((x) => x.id !== t.id);
            store.set(KEY_THEORIES, myTheories);
            selectedTheories = selectedTheories.filter((x) => x !== t.id);
            renderTheoryPicker(); renderBuild();
          });
          tools.append(share, del);
        }
        box.append(el("label", { class: "theory-row" + (on ? " on" : "") }, [cb, text, tools]));
      });
      list.append(box);
    });
    if (!shown.length) {
      const empty = el("div", { class: "picker-empty" });
      if (theoryField === "selected") empty.textContent = "No theories selected yet.";
      else if (theoryField === "mine" && !q) empty.textContent = "You have not added any theories yet. Use \"+ Add your own theory\" below.";
      else {
        empty.append("No theory matches \"" + theoryQuery + "\". ");
        const add = el("button", { type: "button", class: "ghost small-btn", text: "Add \"" + theoryQuery.trim() + "\" as your own" });
        add.addEventListener("click", () => openAddTheory(theoryQuery.trim()));
        empty.append(add);
      }
      list.append(empty);
    }
    $("theoryShowing").textContent = "Showing " + shown.length + " of " + total;
  }

  function openAddTheory(name) {
    $("addTheoryForm").hidden = false;
    $("addTheoryBtn").setAttribute("aria-expanded", "true");
    if (name) $("ntName").value = name;
    $("ntField").value = theoryField !== "all" && theoryField !== "selected" ? theoryField : "mine";
    $("ntName").focus();
  }
  function closeAddTheory() {
    $("addTheoryForm").hidden = true;
    $("addTheoryBtn").setAttribute("aria-expanded", "false");
    ["ntName", "ntThinkers", "ntFocus"].forEach((i) => ($(i).value = ""));
  }
  $("addTheoryBtn").addEventListener("click", () => ($("addTheoryForm").hidden ? openAddTheory("") : closeAddTheory()));
  $("ntCancel").addEventListener("click", closeAddTheory);
  $("ntSave").addEventListener("click", () => {
    const n = $("ntName").value.trim(), a = $("ntFocus").value.trim();
    if (!n) { $("ntName").focus(); $("ntName").setCustomValidity("Give the theory a name."); $("ntName").reportValidity(); return; }
    if (!a) { $("ntFocus").focus(); $("ntFocus").setCustomValidity("Say what the analysis should pay attention to."); $("ntFocus").reportValidity(); return; }
    const t = { id: "u-" + Date.now().toString(36), f: $("ntField").value, n, t: $("ntThinkers").value.trim(), a: a.replace(/\.$/, ""), custom: true };
    myTheories.unshift(t);
    store.set(KEY_THEORIES, myTheories);
    selectedTheories.push(t.id);
    closeAddTheory();
    theoryQuery = ""; $("theorySearch").value = ""; theoryField = "selected";
    renderTheoryPicker(); renderBuild();
  });
  ["ntName", "ntFocus"].forEach((i) => $(i).addEventListener("input", () => $(i).setCustomValidity("")));
  let searchTimer;
  $("theorySearch").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      theoryQuery = $("theorySearch").value;
      if (theoryQuery && theoryField === "selected") theoryField = "all";
      renderTheoryPicker(); $("theoryList").scrollTop = 0;
    }, 80);
  });
  $("theorySearch").addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("theorySearch").value) { e.preventDefault(); $("theorySearch").value = ""; theoryQuery = ""; renderTheoryPicker(); }
    if (e.key === "Enter") e.preventDefault();
  });

  function theoryLines(s) {
    return (s.theories || []).map(theoryById).filter(Boolean);
  }

  /* ---------- state ---------- */
  const FIELDS = ["discipline", "question", "theoryNotes", "technique", "procedure", "fewshot", "sourceDesc", "sourceText", "context", "terms", "output", "fields"];

  function readState() {
    const s = {};
    FIELDS.forEach((f) => (s[f] = $(f).value));
    s.theories = selectedTheories.slice();
    s.theoryDefs = s.theories.map(theoryById).filter((t) => t && t.custom);
    s.safeguards = [...document.querySelectorAll("#safeguards input:checked")].map((i) => i.value);
    s.planCross = $("planCross").checked;
    s.planLog = $("planLog").checked;
    s.runs = $("runs").value;
    s.models = $("models").value;
    return s;
  }

  function writeState(s) {
    // older saved designs had a single free-text "theory" field
    if (!s.theoryNotes && typeof s.theory === "string" && s.theory.trim()) s = Object.assign({}, s, { theoryNotes: s.theory });
    // theories defined by someone else's exported design: add them to this browser's list
    (s.theoryDefs || []).forEach((t) => {
      if (t && t.id && t.n && t.a && !theoryById(t.id)) myTheories.push(Object.assign({}, t, { custom: true }));
    });
    store.set(KEY_THEORIES, myTheories);
    selectedTheories = (s.theories || []).filter((id) => theoryById(id));
    FIELDS.forEach((f) => { if (s[f] !== undefined) $(f).value = s[f]; });
    if (!s.procedure) $("procedure").value = L.techniques[$("technique").value].steps.join("\n");
    document.querySelectorAll("#safeguards input").forEach((i) => (i.checked = (s.safeguards || []).includes(i.value)));
    $("planCross").checked = !!s.planCross;
    $("planLog").checked = !!s.planLog;
    if (s.runs) $("runs").value = s.runs;
    if (s.models !== undefined) $("models").value = s.models;
    renderTheoryPicker();
  }

  const BLANK = { discipline: "History", question: "", theories: [], theoryNotes: "", technique: "evidence-constrained", procedure: "", fewshot: "",
    sourceDesc: "", sourceText: "", context: "", terms: "", output: "table", fields: "", safeguards: ["quote", "nofab", "obs", "uncert", "alt"],
    planCross: false, planLog: false };

  /* ---------- prompt construction ---------- */
  function outputSpec(s) {
    const f = (s.fields || "").trim() || "finding, source identifier, textual evidence, interpretation, alternative interpretation, confidence";
    switch (s.output) {
      case "json": return "Return a JSON array of objects with these keys: " + f + ". Use null where the evidence does not say. Return only the JSON.";
      case "csv": return "Return CSV with this header row: " + f + ". Quote any field containing a comma.";
      case "prose": return "Write structured prose organised by finding. For each finding give: " + f + ".";
      default: return "Return a table with these columns: " + f + ".";
    }
  }

  // level: 1 baseline, 2 theory, 3 context, 4 full
  function buildPrompt(s, level) {
    level = level || 4;
    const out = [];
    const q = s.question.trim() || "[State your research question]";
    if (level >= 2) {
      out.push("ROLE: You are assisting a researcher in " + (s.discipline || "the humanities") + ". Treat your answer as material for scholarly checking, not as an authoritative account: it will be compared with independent evidence and expert judgement.");
    }
    out.push("RESEARCH QUESTION: " + q);
    if (level >= 2) {
      const th = theoryLines(s);
      const notes = s.theoryNotes.trim();
      if (th.length || notes) {
        let block = "THEORETICAL ORIENTATION:";
        if (th.length) block += (th.length > 1 ? " Use these frameworks together, and say where they point in different directions." : "") +
          "\n" + th.map((t) => "- " + t.n + (t.t ? " (" + t.t + ")" : "") + ": attend to " + t.a + ".").join("\n");
        if (notes) block += (th.length ? "\n" : " ") + notes;
        out.push(block);
      }
    }
    if (level >= 3) {
      if (s.sourceDesc.trim()) out.push("SOURCE MATERIAL: " + s.sourceDesc.trim() + (s.sourceText.trim() ? " (supplied below)." : ""));
      if (s.context.trim()) out.push("CULTURAL, LINGUISTIC AND HISTORICAL CONTEXT: " + s.context.trim());
      if (s.terms.trim()) out.push("CONTESTED TERMINOLOGY: " + s.terms.trim());
    }
    if (level >= 4) {
      if (s.technique === "few-shot" && s.fewshot.trim()) out.push("CODED EXAMPLES:\n" + s.fewshot.trim());
      const steps = lines(s.procedure);
      if (steps.length) out.push("PROCEDURE:\n" + steps.map((x, i) => (i + 1) + ". " + x).join("\n"));
      const g = L.safeguards.filter((x) => s.safeguards.includes(x.id)).map((x) => "- " + x.text);
      if (g.length) out.push("SAFEGUARDS:\n" + g.join("\n"));
    }
    out.push("OUTPUT: " + outputSpec(s));
    if (level >= 3 && s.sourceText.trim()) {
      out.push("SOURCE TEXT:\n<<<BEGIN SOURCE>>>\n" + s.sourceText.trim() + "\n<<<END SOURCE>>>");
    }
    return out.join("\n\n");
  }

  function coverage(s) {
    const has = (id) => s.safeguards.includes(id);
    return [
      { l: "C", name: "Conceptual", on: !!(s.question.trim() && (s.theories.length || s.theoryNotes.trim())), need: "a research question and a theoretical orientation" },
      { l: "O", name: "Operational", on: lines(s.procedure).length >= 2, need: "at least two procedure steps" },
      { l: "N", name: "Situated", on: !!(s.context.trim() || s.terms.trim() || has("lang")), need: "cultural, linguistic or historical context" },
      { l: "T", name: "Traceable", on: has("quote") || (has("nofab") && !!s.sourceText.trim()), need: "a traceable-evidence safeguard" },
      { l: "E", name: "Evaluated", on: ["uncert", "alt", "review", "syco", "obs"].filter(has).length >= 2, need: "at least two evaluation safeguards" },
      { l: "X", name: "Cross-model", on: s.planCross, need: "a plan to compare models or prompt conditions" },
      { l: "T", name: "Transparent", on: s.planLog, need: "a plan to log model, version, date and settings" }
    ];
  }

  /* ---------- render: build ---------- */
  function renderBuild() {
    const s = readState();
    $("prompt").textContent = buildPrompt(s, 4);
    $("techniqueHint").textContent = L.techniques[s.technique].hint;
    $("fewshotWrap").hidden = s.technique !== "few-shot";
    const cov = coverage(s);
    const meter = $("meter"); meter.replaceChildren();
    cov.forEach((c) => meter.append(el("div", { class: c.on ? "on" : "", title: c.name + (c.on ? ": covered" : ": add " + c.need) }, [c.l, el("small", { text: c.name })])));
    const missing = cov.filter((c) => !c.on);
    $("meterNote").textContent = missing.length
      ? "CONTEXT coverage " + (7 - missing.length) + "/7. Still to add: " + missing.map((c) => c.need).join("; ") + "."
      : "CONTEXT coverage 7/7. The design is fully specified; the outputs still need checking.";
    store.set(KEY_DRAFT, s);
    updateSourceInfo();
    renderStudy(s);
  }

  /* ---------- render: study ---------- */
  function modelList(s) { return (s.models || "").split(",").map((m) => m.trim()).filter(Boolean); }

  function renderStudy(s) {
    s = s || readState();
    const wrap = $("conditions"); wrap.replaceChildren();
    CONDITIONS.forEach((c) => {
      const text = buildPrompt(s, c.n);
      const status = el("p", { class: "status", id: "st_" + c.id, role: "status" });
      const btn = el("button", { type: "button", text: "Copy condition " + c.n });
      btn.addEventListener("click", () => copy(text, "st_" + c.id));
      wrap.append(el("div", { class: "card" }, [
        el("h3", { text: c.n + ". " + c.name }),
        el("p", { class: "muted", text: c.adds }),
        el("pre", { class: "prompt", text: text, tabindex: "0" }),
        el("div", { class: "actions" }, [btn]), status
      ]));
    });
    const runs = Math.max(1, parseInt(s.runs, 10) || 1);
    const m = Math.max(1, modelList(s).length);
    $("studySize").textContent = "4 conditions × " + runs + " runs × " + m + " model" + (m > 1 ? "s" : "") + " = " + (4 * runs * m) + " outputs per research item";
  }

  function studyProtocol(s) {
    const models = modelList(s);
    const runs = Math.max(1, parseInt(s.runs, 10) || 1);
    let md = "# Prompt-sensitivity study protocol\n\n";
    md += "- Generated: " + today() + " with Scholarly Prompt Lab v" + VERSION + "\n";
    md += "- Discipline: " + s.discipline + "\n- Research question: " + (s.question || "—") + "\n";
    md += "- Models: " + (models.join(", ") || "to be specified") + "\n- Runs per condition: " + runs + "\n";
    md += "- Planned outputs: " + 4 * runs * Math.max(1, models.length) + "\n\n";
    md += "## Procedure\n\n1. Record each model's exact name, version and settings before running.\n2. Start a fresh conversation for every run so earlier runs do not influence later ones.\n3. Paste the condition prompt exactly as written. Do not edit between runs.\n4. Save each output in full with the date, then score it against the six criteria.\n5. Where possible, have a subject specialist score independently. Keep disagreements; do not average them away.\n\n";
    md += "## Evaluation criteria\n\n" + L.criteria.map((c) => "- **" + c.label + "**: " + c.help).join("\n") + "\n\n";
    CONDITIONS.forEach((c) => {
      md += "## Condition " + c.n + ": " + c.name + "\n\n" + c.adds + "\n\n```text\n" + buildPrompt(s, c.n) + "\n```\n\n";
    });
    return md;
  }

  function designRecord(s) {
    const cov = coverage(s);
    let md = "# Research design: " + (s.question || "untitled") + "\n\n";
    md += "Generated " + today() + " with Scholarly Prompt Lab v" + VERSION + ".\n\n";
    md += "| Field | Value |\n|---|---|\n";
    const row = (k, v) => "| " + k + " | " + String(v || "—").replace(/\|/g, "\\|").replace(/\n/g, "<br>") + " |\n";
    md += row("Discipline", s.discipline) + row("Theoretical orientation", theoryLines(s).map((t) => t.n + (t.t ? " (" + t.t + ")" : "") + (t.custom ? " [researcher-defined]" : "")).concat(s.theoryNotes.trim() ? [s.theoryNotes.trim()] : []).join("\n")) + row("Technique", L.techniques[s.technique].label);
    md += row("Source material", s.sourceDesc) + row("Context", s.context) + row("Contested terminology", s.terms) + row("Output", s.output + ": " + (s.fields || "default fields")) + "\n";
    md += "## CONTEXT checklist\n\n" + cov.map((c) => "- [" + (c.on ? "x" : " ") + "] **" + c.l + " · " + c.name + "**" + (c.on ? "" : " (needs " + c.need + ")")).join("\n") + "\n\n";
    md += "## Prompt\n\n```text\n" + buildPrompt(s, 4) + "\n```\n\n";
    md += "## Disclosure statement (draft)\n\nThis study used generative AI as part of its method. Prompts, model names and versions, run dates and settings are recorded in the accompanying log. All AI outputs were reviewed by the researcher" + (s.safeguards.includes("review") ? ", and culturally sensitive classifications were referred to subject specialists" : "") + ". AI outputs are treated as data for analysis, not as evidence about the past.\n";
    return md;
  }

  /* ---------- log ---------- */
  let log = store.get(KEY_LOG, []);
  if (!Array.isArray(log)) log = [];

  function condName(id) { const c = CONDITIONS.find((x) => x.id === id); return c ? c.n + ". " + c.name : "Build tab prompt"; }
  function countsScore(e, id) {
    // only confirmed or researcher-entered scores count; entries from older versions have no status and count
    const st = e.scoreStatus && e.scoreStatus[id];
    return st !== "suggested";
  }

  /* ---------- automatic checks and suggested scores ---------- */
  const CK = window.LAB_CHECKS;
  let checks = null;            // latest automatic check result
  let sugs = {};                // { criterionId: { checks: {score, reason}, ai: {score, reason, model} } }
  let scoreState = {};          // { criterionId: "empty" | "suggested" | "confirmed" | "manual" }
  let aiEval = null;            // parsed second-model evaluation
  let lastAutoErrors = "";      // what the Lab last wrote into Errors found

  function promptForEntry() {
    const s = readState();
    const c = CONDITIONS.find((x) => x.id === $("lgCondition").value);
    return buildPrompt(s, c ? c.n : 4);
  }

  function setScore(id, value, state) {
    $("sc_" + id).value = value == null ? "" : String(value);
    scoreState[id] = value == null ? "empty" : state;
    renderScoreRow(id);
  }

  function prefill() {
    // fill empty or still-suggested scores: deterministic checks first, then the second model
    L.criteria.forEach((c) => {
      const st = scoreState[c.id] || "empty";
      if (st === "confirmed" || st === "manual") return;
      const s = sugs[c.id] || {};
      const pick = s.checks && s.checks.score != null ? s.checks : s.ai && s.ai.score != null ? s.ai : null;
      if (pick) setScore(c.id, pick.score, "suggested");
      else if (st === "suggested") setScore(c.id, null, "empty");
      else renderScoreRow(c.id);
    });
  }

  function renderScoreRow(id) {
    const st = scoreState[id] || "empty";
    $("sc_" + id).classList.toggle("suggested", st === "suggested");
    const badge = $("st_" + id); badge.replaceChildren();
    if (st === "suggested") badge.append(el("span", { class: "sbadge sug", text: "Suggested" }));
    if (st === "confirmed" || st === "manual") badge.append(el("span", { class: "sbadge ok", text: st === "confirmed" ? "Confirmed" : "Your score" }));
    const box = $("sug_" + id); box.replaceChildren();
    const s = sugs[id] || {};
    [["checks", "Automatic checks"], ["ai", "Second model"]].forEach(([k, label]) => {
      const v = s[k];
      if (!v) return;
      const chip = v.score == null
        ? el("span", { class: "sug-chip none", text: label + ": " + v.reason })
        : el("span", { class: "sug-chip" }, [el("strong", { text: label + ": " + v.score }), " " + v.reason]);
      const same = String($("sc_" + id).value) === String(v.score);
      if (v.score != null && !same) {
        const use = el("button", { type: "button", class: "ghost", text: "Use " + v.score });
        use.addEventListener("click", () => setScore(id, v.score, "confirmed"));
        chip.append(use);
      } else if (v.score != null && same && st !== "suggested") chip.append(el("span", { class: "sbadge ok", text: "matches" }));
      box.append(chip);
    });
    if (st === "suggested") {
      const ok = el("button", { type: "button", class: "small-btn", text: "Confirm " + $("sc_" + id).value });
      ok.addEventListener("click", () => setScore(id, $("sc_" + id).value, "confirmed"));
      box.append(ok);
    }
    $("confirmAll").hidden = !L.criteria.some((c) => scoreState[c.id] === "suggested");
  }

  L.criteria.forEach((c) => {
    $("sc_" + c.id).addEventListener("change", () => {
      const v = $("sc_" + c.id).value;
      const s = sugs[c.id] || {};
      const matches = [s.checks, s.ai].some((x) => x && String(x.score) === v);
      scoreState[c.id] = !v ? "empty" : matches ? "confirmed" : "manual";
      renderScoreRow(c.id);
    });
  });
  $("confirmAll").addEventListener("click", () => {
    L.criteria.forEach((c) => { if (scoreState[c.id] === "suggested") scoreState[c.id] = "confirmed"; renderScoreRow(c.id); });
  });

  function composeErrors() {
    const parts = [];
    if (checks) parts.push(CK.errorsText(checks, "Scholarly Prompt Lab v" + VERSION + ", " + today()));
    if (aiEval) parts.push(CK.aiErrorsText(aiEval, $("evModel").value.trim() || aiEval.model));
    return parts.join("\n\n");
  }
  function refreshErrors(force) {
    const cur = $("lgErrors").value.trim();
    const next = composeErrors();
    if (force || !cur || cur === lastAutoErrors.trim()) { $("lgErrors").value = next; lastAutoErrors = next; return true; }
    return false;
  }

  function renderChecks() {
    const box = $("autoChecks"); box.replaceChildren();
    if (!checks) return;
    const r = checks;
    box.append(el("h3", { text: "Automatic checks" }));
    if (!r.hasSource) {
      box.append(el("p", { class: "ac-note", text: "No source text is loaded in the Build tab, so quotations cannot be checked. Load or paste your sources there, then come back: the checks re-run automatically." }));
    }
    const stat = (n, label, cls) => el("div", { class: "ac-stat " + (cls || "") }, [el("b", { text: String(n) }), el("span", { text: label })]);
    const Q = r.quotations.length;
    const grid = el("div", { class: "ac-grid" });
    if (r.hasSource) {
      grid.append(stat(r.exact + " / " + Q, "quotations exact", Q && r.exact === Q ? "good" : ""));
      grid.append(stat(r.near, "need a wording check", r.near ? "bad" : "good"));
      grid.append(stat(r.missing + r.termsMissing.length, "not found in source", r.missing + r.termsMissing.length ? "bad" : "good"));
      grid.append(stat(r.outsideFacts.length, "names or numbers from outside the source", r.outsideFacts.length ? "bad" : "good"));
    }
    grid.append(stat(r.alternatives + " / " + (r.findings || "?"), "findings with alternative readings", r.findings && r.alternatives < r.findings ? "bad" : ""));
    if (r.debris.length) grid.append(stat(r.debris.length, "pieces of copy-paste debris", "bad"));
    box.append(grid);
    if (r.hasSource && (Q || r.terms.length)) {
      const d = el("details", {}, [el("summary", { text: "See every quotation (" + (Q + r.terms.length) + ")" })]);
      const ul = el("ul", { class: "qlist" });
      const rank = { missing: 0, near: 1, exact: 2 };
      r.quotations.concat(r.terms).slice().sort((a, b) => rank[a.status] - rank[b.status]).forEach((q) => {
        const li = el("li", {}, [el("span", { class: "qtag " + q.status, text: q.status === "missing" ? "not found" : q.status }), "“" + q.text + "”"]);
        if (q.term) li.append(el("span", { class: "muted", text: " (short term)" }));
        if (q.note) li.append(el("span", { class: "src", text: q.note }));
        if (q.source) li.append(el("span", { class: "src", text: "Source" + (q.doc ? " " + q.doc : "") + ": “" + q.source + "”" }));
        else if (q.doc && q.status === "exact") li.append(el("span", { class: "src", text: "Found in " + q.doc }));
        ul.append(li);
      });
      d.append(ul);
      box.append(d);
    }
    const note = el("p", { class: "ac-note", text: "Checked in your browser against the source text in the Build tab (" + r.sourceWords.toLocaleString() + " words). These checks find things to look at; they do not judge interpretations. " });
    if ($("lgErrors").value.trim() && $("lgErrors").value.trim() !== lastAutoErrors.trim()) {
      const b = el("button", { type: "button", class: "ghost small-btn", text: "Replace Errors found with these results" });
      b.addEventListener("click", () => { refreshErrors(true); renderChecks(); });
      note.append(b);
    }
    box.append(note);
  }

  function runChecks() {
    const out = $("lgOutput").value;
    if (!out.trim()) {
      checks = null; renderChecks();
      L.criteria.forEach((c) => { if (sugs[c.id]) delete sugs[c.id].checks; });
      prefill(); refreshErrors(false);
      return;
    }
    const s = readState();
    checks = CK.analyse(out, s.sourceText, promptForEntry() + "\n" + s.question + "\n" + s.context);
    const sg = CK.suggestScores(checks);
    L.criteria.forEach((c) => {
      sugs[c.id] = sugs[c.id] || {};
      if (sg[c.id] && sg[c.id].score != null) sugs[c.id].checks = sg[c.id];
      else if (sg[c.id]) sugs[c.id].checks = { score: null, reason: sg[c.id].reason };
    });
    prefill();
    refreshErrors(false);
    renderChecks();
  }
  let checkTimer;
  $("lgOutput").addEventListener("input", () => { clearTimeout(checkTimer); checkTimer = setTimeout(runChecks, 400); });
  $("lgCondition").addEventListener("change", runChecks);
  $("lgErrors").addEventListener("input", () => { if (checks) renderChecks(); });

  /* second-model evaluation */
  $("copyEvalPrompt").addEventListener("click", () => {
    const out = $("lgOutput").value.trim();
    if (!out) { flash("evalStatus", "Paste the model output first."); return; }
    const s = readState();
    copy(CK.evaluatorPrompt({ prompt: promptForEntry(), source: s.sourceText.trim(), output: out, criteria: L.criteria }), "evalStatus");
  });
  $("applyEval").addEventListener("click", () => {
    const ev = CK.parseEvaluatorReply($("evReply").value, L.criteria);
    if (!ev.ok) { flash("evalStatus", ev.error); return; }
    aiEval = ev;
    if (!$("evModel").value.trim() && ev.model) $("evModel").value = ev.model;
    const model = $("evModel").value.trim() || ev.model || "second model";
    L.criteria.forEach((c) => {
      sugs[c.id] = sugs[c.id] || {};
      if (ev.scores[c.id]) sugs[c.id].ai = Object.assign({ model }, ev.scores[c.id]);
    });
    if (ev.framing && !$("lgSyco").checked) flash("evalStatus", "Applied. The evaluator thinks the output adopted the prompt's framing: decide whether to tick that box.");
    else flash("evalStatus", "Applied: " + Object.keys(ev.scores).length + " scores and " + ev.errors.length + " errors added as suggestions.");
    prefill();
    if (!refreshErrors(false)) {
      $("lgErrors").value = $("lgErrors").value.trim() + "\n\n" + CK.aiErrorsText(ev, model);
      lastAutoErrors = "";
    }
  });

  function resetEvaluation() {
    checks = null; sugs = {}; scoreState = {}; aiEval = null; lastAutoErrors = "";
    $("lgErrors").value = ""; $("evReply").value = ""; $("evModel").value = "";
    L.criteria.forEach((c) => setScore(c.id, null, "empty"));
    renderChecks();
  }
  function mean(arr) { return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null; }

  function renderLog() {
    store.set(KEY_LOG, log);
    $("entryCount").textContent = "(" + log.length + ")";
    const t = $("entries"); t.replaceChildren();
    if (!log.length) {
      t.append(el("tr", {}, [el("td", { class: "muted", text: "No entries yet. Run a prompt, paste the output on the left, and score it." })]));
    } else {
      t.append(el("thead", {}, [el("tr", {}, ["Date", "Model", "Condition", "Run", "Scores", "Flags", "Output", ""].map((h) => el("th", { text: h })))]));
      const body = el("tbody");
      log.slice().reverse().forEach((e) => {
        const scores = L.criteria.map((c) => c.label.split(" ")[0].slice(0, 4) + " " + (e.scores[c.id] ? e.scores[c.id] + (countsScore(e, c.id) ? "" : "?") : "–")).join(" · ");
        const del = el("button", { type: "button", class: "ghost", text: "Delete" });
        del.addEventListener("click", () => {
          if (confirm("Delete this entry? This cannot be undone unless you exported it.")) { log = log.filter((x) => x.id !== e.id); renderLog(); }
        });
        const flags = el("td");
        if (e.sycophancy) flags.append(el("span", { class: "flag", text: "adopted framing" }), " ");
        if (e.checks && (e.checks.missing || e.checks.near || e.checks.termsMissing)) flags.append(el("span", { class: "flag", text: (e.checks.missing + e.checks.near + e.checks.termsMissing) + " quote issues" }), " ");
        if (e.scoreStatus && Object.values(e.scoreStatus).includes("suggested")) flags.append(el("span", { class: "flag", text: "unconfirmed scores" }));
        body.append(el("tr", {}, [
          el("td", { text: e.date }), el("td", { text: e.model }), el("td", { text: condName(e.condition) }),
          el("td", { text: String(e.run) }), el("td", { text: scores }), flags,
          el("td", { class: "out" }, [el("div", { text: e.output })]), el("td", {}, [del])
        ]));
      });
      t.append(body);
    }
    // summary
    const sum = $("summary"); sum.replaceChildren();
    const groups = {};
    log.forEach((e) => (groups[e.condition] = groups[e.condition] || []).push(e));
    const keys = Object.keys(groups);
    if (!keys.length) { sum.append(el("p", { class: "muted", text: "Averages per condition appear here once you log scored outputs." })); return; }
    const tbl = el("table");
    tbl.append(el("tr", {}, ["Condition", "n"].concat(L.criteria.map((c) => c.label), ["Adopted framing"]).map((h) => el("th", { text: h }))));
    keys.sort().forEach((k) => {
      const g = groups[k];
      const cells = [condName(k), String(g.length)];
      L.criteria.forEach((c) => {
        const v = g.filter((e) => countsScore(e, c.id)).map((e) => parseInt(e.scores[c.id], 10)).filter((x) => !isNaN(x));
        const m = mean(v);
        cells.push(m === null ? "–" : m.toFixed(1) + (v.length < g.length ? " (" + v.length + ")" : ""));
      });
      cells.push(g.filter((e) => e.sycophancy).length + "/" + g.length);
      tbl.append(el("tr", {}, cells.map((x) => el("td", { text: x }))));
    });
    sum.append(el("div", { class: "table-wrap" }, [tbl]));
    sum.append(el("p", { class: "muted", text: "Means on a 1–5 scale, using confirmed scores only. A number in brackets is how many entries were counted for that criterion. With few runs, read these as descriptive only." }));
    // agreement between suggestions and the researcher's final scores
    const agree = { checks: [], ai: [] };
    log.forEach((e) => {
      if (!e.suggested || !e.scoreStatus) return;
      L.criteria.forEach((c) => {
        const st = e.scoreStatus[c.id], fin = parseInt(e.scores[c.id], 10);
        if (!st || st === "suggested" || isNaN(fin)) return;
        ["checks", "ai"].forEach((k) => {
          const sg = e.suggested[c.id] && e.suggested[c.id][k];
          if (sg && sg.score != null) agree[k].push({ crit: c.id, diff: fin - sg.score });
        });
      });
    });
    const rows = [["Automatic checks", agree.checks], ["Second model", agree.ai]].filter(([, a]) => a.length);
    if (rows.length) {
      sum.append(el("h3", { class: "h-small", text: "How often you agreed with the suggestions" }));
      const at = el("table");
      at.append(el("tr", {}, ["Source", "Scores compared", "Same score", "Mean difference", "You scored lower / higher"].map((h) => el("th", { text: h }))));
      rows.forEach(([label, a]) => {
        const same = a.filter((x) => x.diff === 0).length;
        const mad = a.reduce((t, x) => t + Math.abs(x.diff), 0) / a.length;
        at.append(el("tr", {}, [label, String(a.length), same + " (" + Math.round(100 * same / a.length) + "%)", mad.toFixed(2),
          a.filter((x) => x.diff < 0).length + " / " + a.filter((x) => x.diff > 0).length].map((x) => el("td", { text: x }))));
      });
      sum.append(el("div", { class: "table-wrap" }, [at]));
      sum.append(el("p", { class: "muted", text: "Where you and the machine disagree is a finding in itself: it shows where automated judgement departs from scholarly judgement." }));
    }
  }

  $("logForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const s = readState();
    const cond = $("lgCondition").value;
    const c = CONDITIONS.find((x) => x.id === cond);
    if (!checks) runChecks();
    const scores = {}, scoreStatus = {}, suggested = {};
    L.criteria.forEach((cr) => {
      const v = $("sc_" + cr.id).value;
      if (v) { scores[cr.id] = v; scoreStatus[cr.id] = scoreState[cr.id] === "suggested" ? "suggested" : (scoreState[cr.id] || "manual"); }
      if (sugs[cr.id]) suggested[cr.id] = JSON.parse(JSON.stringify(sugs[cr.id]));
    });
    const pending = Object.values(scoreStatus).filter((x) => x === "suggested").length;
    if (pending && !confirm(pending + (pending > 1 ? " scores are still unconfirmed suggestions" : " score is still an unconfirmed suggestion") + ". Save anyway? Unconfirmed scores are kept but do not count in the summary until you confirm them.")) return;
    log.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      condition: cond, run: parseInt($("lgRun").value, 10) || 1,
      model: $("lgModel").value.trim(), date: $("lgDate").value, settings: $("lgSettings").value.trim(),
      output: $("lgOutput").value, scores, scoreStatus, suggested, evaluator: $("lgEvaluator").value.trim(),
      sycophancy: $("lgSyco").checked, notes: $("lgNotes").value.trim(), errors: $("lgErrors").value.trim(),
      checks: checks ? { sourceWords: checks.sourceWords, quotations: checks.quotations.length, exact: checks.exact, near: checks.near, missing: checks.missing,
        termsMissing: checks.termsMissing.length, missingDocs: checks.missingDocs, outsideFacts: checks.outsideFacts.map((f) => f.text),
        findings: checks.findings, alternatives: checks.alternatives, debris: checks.debris.length } : null,
      secondModel: aiEval ? { model: $("evModel").value.trim() || aiEval.model, scores: aiEval.scores, errors: aiEval.errors, adoptedFraming: aiEval.framing, overall: aiEval.overall } : null,
      question: s.question, prompt: buildPrompt(s, c ? c.n : 4), loggedAt: new Date().toISOString(), labVersion: VERSION
    });
    renderLog();
    $("lgOutput").value = ""; $("lgNotes").value = ""; $("lgSyco").checked = false;
    resetEvaluation();
    $("lgRun").value = (parseInt($("lgRun").value, 10) || 1) + 1;
    flash("logStatus", "Saved with the exact prompt, the automatic checks, the errors list and the status of every score.");
  });

  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  $("expJson").addEventListener("click", () => {
    download("prompt-lab-log-" + today() + ".json", JSON.stringify({ tool: "Scholarly Prompt Lab", version: VERSION, exportedAt: new Date().toISOString(), design: readState(), entries: log }, null, 2), "application/json");
  });
  $("expCsv").addEventListener("click", () => {
    const crit = L.criteria.map((c) => c.id);
    const head = ["id", "date", "model", "settings", "condition", "run", "evaluator"]
      .concat(crit, crit.map((c) => c + "_status"), crit.map((c) => c + "_checks_suggested"), crit.map((c) => c + "_second_model"),
        ["second_model", "quotations", "quotes_exact", "quotes_near", "quotes_not_found", "outside_facts", "adopted_framing", "errors_found", "notes", "question", "prompt", "output"]);
    const sg = (e, c, k) => (e.suggested && e.suggested[c] && e.suggested[c][k] && e.suggested[c][k].score != null ? e.suggested[c][k].score : "");
    const rows = log.map((e) => [e.id, e.date, e.model, e.settings, e.condition, e.run, e.evaluator]
      .concat(crit.map((c) => e.scores[c] || ""), crit.map((c) => (e.scoreStatus && e.scoreStatus[c]) || (e.scores[c] ? "manual" : "")),
        crit.map((c) => sg(e, c, "checks")), crit.map((c) => sg(e, c, "ai")),
        [e.secondModel ? e.secondModel.model : "", e.checks ? e.checks.quotations : "", e.checks ? e.checks.exact : "", e.checks ? e.checks.near : "",
          e.checks ? e.checks.missing + (e.checks.termsMissing || 0) : "", e.checks ? e.checks.outsideFacts.join("; ") : "",
          e.sycophancy ? 1 : 0, e.errors || "", e.notes, e.question, e.prompt, e.output]));
    download("prompt-lab-log-" + today() + ".csv", "﻿" + [head].concat(rows).map((r) => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  });
  $("expMd").addEventListener("click", () => {
    let md = "# AI-assisted research log\n\nExported " + today() + " from Scholarly Prompt Lab v" + VERSION + ". " + log.length + " entries.\n\n";
    md += "## Summary by condition\n\n";
    [...$("summary").querySelectorAll("table")].forEach((tbl, ti) => {
      if (ti === 1) md += "### Agreement between suggested and confirmed scores\n\n";
      const rows = [...tbl.querySelectorAll("tr")].map((tr) => [...tr.children].map((td) => td.textContent));
      md += rows.map((r, i) => "| " + r.join(" | ") + " |" + (i === 0 ? "\n|" + r.map(() => "---").join("|") + "|" : "")).join("\n") + "\n\n";
    });
    md += "Only confirmed scores are averaged. Suggested scores come from the Lab's automatic checks (quotation matching against the supplied sources) or from a second AI model, and were accepted, changed or left unconfirmed by the researcher.\n\n";
    md += "## Entries\n\n";
    log.forEach((e, i) => {
      md += "### " + (i + 1) + ". " + condName(e.condition) + ", run " + e.run + " (" + e.model + ", " + e.date + ")\n\n";
      md += "- Settings: " + (e.settings || "—") + "\n- Evaluator: " + (e.evaluator || "—") + "\n";
      md += "\n| Criterion | Final score | Status | Automatic checks | Second model |\n|---|---|---|---|---|\n";
      L.criteria.forEach((c) => {
        const s = (e.suggested && e.suggested[c.id]) || {};
        const st = (e.scoreStatus && e.scoreStatus[c.id]) || (e.scores[c.id] ? "manual" : "—");
        const fmt = (x) => (x ? (x.score == null ? "—" : x.score) + (x.reason ? ": " + x.reason.replace(/\|/g, "/") : "") : "—");
        md += "| " + c.label + " | " + (e.scores[c.id] || "–") + " | " + st + " | " + fmt(s.checks) + " | " + fmt(s.ai) + " |\n";
      });
      md += "\n";
      if (e.checks) md += "- Quotations checked: " + e.checks.quotations + " (" + e.checks.exact + " exact, " + e.checks.near + " need a wording check, " + e.checks.missing + " not found) against " + e.checks.sourceWords + " words of source text\n";
      if (e.secondModel) md += "- Second-model evaluator: " + (e.secondModel.model || "—") + "\n";
      md += "- Adopted the prompt's framing without testing it: " + (e.sycophancy ? "yes" : "no") + "\n";
      if (e.notes) md += "- Notes: " + e.notes + "\n";
      if (e.errors) md += "\n**Errors found (reviewed by the researcher)**\n\n```text\n" + e.errors + "\n```\n";
      md += "\n**Prompt**\n\n```text\n" + e.prompt + "\n```\n\n**Output**\n\n```text\n" + e.output + "\n```\n\n";
    });
    download("prompt-lab-report-" + today() + ".md", md, "text/markdown;charset=utf-8");
  });
  $("impJson").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const entries = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(entries)) throw new Error("no entries");
      const ids = new Set(log.map((e) => e.id));
      let added = 0;
      entries.forEach((e) => {
        if (e && typeof e === "object" && e.id && !ids.has(e.id)) {
          log.push(Object.assign({ scores: {}, output: "", model: "", date: "", condition: "custom", run: 1 }, e)); added++;
        }
      });
      if (data.design && confirm("This file also contains a research design. Load it into the Build tab? (Your current design will be replaced.)")) {
        writeState(data.design); renderBuild();
      }
      renderLog();
      flash("logStatus", "Imported " + added + " new entr" + (added === 1 ? "y" : "ies") + ".");
    } catch (e) { flash("logStatus", "That file is not a Prompt Lab export."); }
    ev.target.value = "";
  });

  /* ---------- user's own source files (read locally, never uploaded) ---------- */
  const SOURCE_HINT = $("sourceInfo").textContent;
  function nextDocNumber(text) {
    let max = 0;
    (text.match(/\[DOC-(\d+)/g) || []).forEach((m) => { max = Math.max(max, parseInt(m.slice(5), 10)); });
    return max + 1;
  }
  function updateSourceInfo() {
    const t = $("sourceText").value;
    const info = $("sourceInfo");
    if (!t.trim()) { info.textContent = SOURCE_HINT; info.classList.remove("warn"); return; }
    const words = t.trim().split(/\s+/).length;
    const docs = (t.match(/\[DOC-\d+/g) || []).length;
    let msg = words.toLocaleString() + " words" + (docs ? " in " + docs + " document" + (docs > 1 ? "s" : "") : "") + ".";
    const big = words > 60000;
    if (big) msg += " This may exceed what some AI systems accept in one prompt. Consider splitting the corpus across several runs.";
    info.textContent = msg;
    info.classList.toggle("warn", big);
  }
  /* PDF and Word reading. Libraries live in vendor/ and load only when first needed. */
  let pdfjsPromise = null, mammothPromise = null;
  function loadPdfjs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import(new URL("vendor/pdfjs/pdf.min.mjs", location.href).href).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
        return lib;
      }).catch((e) => { pdfjsPromise = null; throw e; });
    }
    return pdfjsPromise;
  }
  function loadMammoth() {
    if (!mammothPromise) {
      mammothPromise = new Promise((resolve, reject) => {
        if (window.mammoth) return resolve(window.mammoth);
        const s = el("script", { src: "vendor/mammoth/mammoth.browser.min.js" });
        s.onload = () => resolve(window.mammoth);
        s.onerror = () => { mammothPromise = null; s.remove(); reject(new Error("load failed")); };
        document.head.append(s);
      });
    }
    return mammothPromise;
  }
  function textChecks(text, warnings) {
    if (/�|[-]/.test(text)) warnings.push("Some characters did not convert cleanly (shown as � or blank boxes). Check accented letters such as ọ, ụ, ị, ẹ, ṣ against the original.");
  }
  async function extractFile(f) {
    const name = f.name;
    const ext = (name.split(".").pop() || "").toLowerCase();
    const res = { name, text: "", warnings: [], error: "" };
    try {
      if (ext === "pdf") {
        let lib;
        try { lib = await loadPdfjs(); }
        catch (e) { res.error = "PDF reading could not start. If you opened the Lab from a downloaded copy, use the online version instead, or copy and paste the text."; return res; }
        let pdf;
        try { pdf = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false, disableFontFace: true }).promise; }
        catch (e) {
          res.error = e && e.name === "PasswordException" ? "This PDF is password-protected. Remove the password and try again." : "This file could not be opened as a PDF.";
          return res;
        }
        const pages = [];
        let chars = 0;
        for (let p = 1; p <= pdf.numPages; p++) {
          const tc = await (await pdf.getPage(p)).getTextContent();
          let t = "";
          tc.items.forEach((it) => { if (typeof it.str === "string") { t += it.str; if (it.hasEOL) t += "\n"; } });
          t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
          chars += t.replace(/\s/g, "").length;
          pages.push("[p. " + p + "]\n" + t);
        }
        res.text = pages.join("\n\n").normalize("NFC");
        if (chars < 30 * pdf.numPages) {
          res.warnings.push("Very little text was found (" + pdf.numPages + " page" + (pdf.numPages > 1 ? "s" : "") + "). This looks like a scanned PDF, which needs text recognition (OCR) first. Untick it, or paste a typed transcription instead.");
        }
        res.warnings.push("Page markers [p. 1], [p. 2]… were added so claims can cite pages. Check that columns, footnotes and headers came out in the right order.");
        textChecks(res.text, res.warnings);
      } else if (ext === "docx") {
        let m;
        try { m = await loadMammoth(); }
        catch (e) { res.error = "Word reading could not start. Try again, or save the document as .txt."; return res; }
        const out = await m.extractRawText({ arrayBuffer: await f.arrayBuffer() });
        res.text = out.value.replace(/\n{3,}/g, "\n\n").trim().normalize("NFC");
        res.warnings.push("Tables and footnotes come through as plain text.");
        textChecks(res.text, res.warnings);
      } else if (ext === "doc") {
        res.error = "This is the old Word format (.doc). Open it in Word and save it as .docx, then load it again.";
      } else {
        const body = (await f.text()).replace(/\r\n/g, "\n").trim();
        if (/\u0000/.test(body.slice(0, 2000))) res.error = "This does not look like a text file. Supported: .txt, .md, .csv, transcripts, .docx and .pdf.";
        else { res.text = body.normalize("NFC"); textChecks(res.text, res.warnings); }
      }
      if (!res.error && !res.text.trim()) res.error = "No text was found in this file.";
    } catch (e) {
      res.error = "This file could not be read.";
    }
    return res;
  }

  let pending = [];
  function renderReview(loading) {
    const list = $("reviewList"); list.replaceChildren();
    if (loading) { list.append(el("p", { class: "muted", text: loading })); $("reviewAdd").disabled = true; return; }
    pending.forEach((r, i) => {
      const box = el("div", { class: "review-item" + (r.error ? " bad" : "") });
      const head = el("label", { class: "check" });
      const cb = el("input", { type: "checkbox" });
      cb.checked = !r.error && !r.warnings.some((w) => w.startsWith("Very little text"));
      cb.disabled = !!r.error;
      cb.addEventListener("change", () => { r.include = cb.checked; updateReviewButton(); });
      r.include = cb.checked;
      const words = r.text.trim() ? r.text.trim().split(/\s+/).length : 0;
      head.append(cb, el("strong", { text: r.name }), el("span", { class: "muted", text: r.error ? "" : " · " + words.toLocaleString() + " words" }));
      box.append(head);
      if (r.error) box.append(el("p", { class: "hint warn", text: r.error }));
      r.warnings.forEach((w) => box.append(el("p", { class: "hint" + (/Very little|did not convert/.test(w) ? " warn" : ""), text: w })));
      if (!r.error) {
        const ta = el("textarea", { rows: "8", "aria-label": "Extracted text of " + r.name });
        ta.value = r.text;
        ta.addEventListener("input", () => (r.text = ta.value));
        box.append(ta);
      }
      list.append(box);
    });
    updateReviewButton();
  }
  function updateReviewButton() {
    const n = pending.filter((r) => r.include).length;
    $("reviewAdd").disabled = n === 0;
    $("reviewAdd").textContent = n ? "Add " + n + " file" + (n > 1 ? "s" : "") + " to source text" : "Nothing selected";
  }
  function openDialog() { const d = $("review"); if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); }
  function closeDialog() { const d = $("review"); if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open"); }

  $("sourceFiles").addEventListener("change", async (ev) => {
    const files = [...ev.target.files];
    ev.target.value = "";
    if (!files.length) return;
    pending = [];
    openDialog();
    for (let i = 0; i < files.length; i++) {
      renderReview("Reading " + files[i].name + " (" + (i + 1) + " of " + files.length + ")…");
      pending.push(await extractFile(files[i]));
    }
    renderReview();
  });
  $("reviewCancel").addEventListener("click", () => { pending = []; closeDialog(); });
  $("reviewAdd").addEventListener("click", () => {
    const chosen = pending.filter((r) => r.include && r.text.trim());
    if (!chosen.length) return;
    if ($("example").value) {
      // Loading your own files starts your own design instead of adding to a worked example.
      $("example").value = "";
      writeState(Object.assign({}, BLANK, { planCross: $("planCross").checked, planLog: $("planLog").checked }));
    }
    let text = $("sourceText").value.replace(/\s+$/, "");
    let n = nextDocNumber(text);
    chosen.forEach((r) => {
      text += (text ? "\n\n" : "") + "[DOC-" + String(n).padStart(2, "0") + ": " + r.name + "]\n" + r.text.trim();
      n++;
    });
    $("sourceText").value = text;
    pending = [];
    closeDialog();
    renderBuild();
    showTab("tab-build");
    $("sourceText").scrollIntoView({ behavior: "smooth", block: "center" });
    $("sourceText").classList.remove("flash-target"); void $("sourceText").offsetWidth; $("sourceText").classList.add("flash-target");
  });

  /* ---------- events: build ---------- */
  $("builder").addEventListener("submit", (e) => e.preventDefault());
  $("builder").addEventListener("input", renderBuild);
  $("builder").addEventListener("change", renderBuild);
  $("runs").addEventListener("input", renderBuild);
  $("models").addEventListener("input", renderBuild);
  let lastTechnique = null;
  $("technique").addEventListener("focus", () => (lastTechnique = $("technique").value));
  $("technique").addEventListener("change", () => {
    const prev = lastTechnique && L.techniques[lastTechnique] ? L.techniques[lastTechnique].steps.join("\n") : null;
    const cur = $("procedure").value.trim();
    if (!cur || cur === prev || Object.values(L.techniques).some((t) => t.steps.join("\n") === cur)) {
      $("procedure").value = L.techniques[$("technique").value].steps.join("\n");
    }
    lastTechnique = $("technique").value;
    renderBuild();
  });
  $("example").addEventListener("change", () => {
    const x = L.examples.find((e) => e.id === $("example").value);
    const s = Object.assign({}, BLANK, x || {}, { planCross: $("planCross").checked, planLog: $("planLog").checked });
    if (!x) s.procedure = "";
    else s.procedure = L.techniques[s.technique].steps.join("\n");
    writeState(s); renderBuild();
  });
  $("startOwn").addEventListener("click", () => {
    const s = readState();
    const dirty = !$("example").value && (s.question.trim() || s.sourceText.trim());
    if (dirty && !confirm("Start a new blank design? Your current one will be replaced. (Download it first if you want to keep it.)")) return;
    $("example").value = "";
    writeState(Object.assign({}, BLANK, { planCross: s.planCross, planLog: s.planLog }));
    renderBuild();
    $("question").scrollIntoView({ behavior: "smooth", block: "center" });
    $("question").focus({ preventScroll: true });
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("Clear the whole form?")) return;
    $("example").value = ""; writeState(Object.assign({}, BLANK)); renderBuild();
  });
  $("copyPrompt").addEventListener("click", () => copy($("prompt").textContent, "buildStatus"));
  $("goLog").addEventListener("click", () => {
    $("lgCondition").value = "custom";
    showTab("tab-log");
    runChecks();
    $("lgOutput").scrollIntoView({ behavior: "smooth", block: "center" });
    $("lgOutput").focus({ preventScroll: true });
  });
  $("goStudy").addEventListener("click", () => { showTab("tab-study"); window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("dlPrompt").addEventListener("click", () => download(slug(readState().question) + "-prompt.txt", $("prompt").textContent));
  $("dlDesign").addEventListener("click", () => { const s = readState(); download(slug(s.question) + "-design.md", designRecord(s), "text/markdown;charset=utf-8"); });
  $("dlStudy").addEventListener("click", () => { const s = readState(); download(slug(s.question) + "-study-protocol.md", studyProtocol(s), "text/markdown;charset=utf-8"); });

  /* ---------- tabs ---------- */
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  function showTab(id) {
    tabs.forEach((t) => {
      const on = t.id === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    try { history.replaceState(null, "", "#" + id.replace("tab-", "")); } catch (e) { /* ignore */ }
    if (id === "tab-log" && $("lgOutput").value.trim()) runChecks();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => showTab(t.id));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      showTab(n.id); n.focus();
    });
  });

  /* ---------- init ---------- */
  const draft = store.get(KEY_DRAFT, null);
  writeState(Object.assign({}, BLANK, draft || L.examples[0], draft ? {} : { procedure: L.techniques[L.examples[0].technique].steps.join("\n") }));
  if (!draft) $("example").value = L.examples[0].id;
  renderBuild();
  renderLog();
  const hash = location.hash.replace("#", "");
  if (hash && $("tab-" + hash)) showTab("tab-" + hash);
})();
