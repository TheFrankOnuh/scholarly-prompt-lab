# Translating the Lab's interface

The interface of the Lab can be offered in other languages. This page explains what is translated, how a translation is reviewed, and how to add a language.

## What is translated, and what is not

Translated: the labels, headings, buttons, help text, notices and privacy statement of the interface.

Not translated, by design:

- the prompt the Lab builds, which is what the researcher sends to an AI system;
- the methods report;
- the theory library and the worked examples;
- everything the researcher types or loads.

These stay in the language in which they were written, so that a prompt or a report means exactly what its author intended.

## How it works

`locales.js` holds one dictionary per language. Each entry maps the exact English wording of the interface to its translation:

```js
"Copy prompt": "Copier le prompt",
```

`i18n.js` replaces the English wording on the page with the translation, including text that the Lab adds later. An automated test checks that every English entry in a dictionary matches wording the Lab really uses, so a dictionary cannot drift out of date unnoticed.

## Choosing a language

The Language menu at the top right of the Lab offers English, Français and Español. The choice is remembered on the device. A link can also open the Lab in a language, for example https://thefrankonuh.github.io/scholarly-prompt-lab/?lang=fr

## Review

A dictionary has two flags. `offered: true` puts the language in the Language menu. `reviewed: true` records that a fluent speaker with knowledge of research terminology has checked every entry. Until then, the Lab shows a short line in the footer, in that language, saying that the translation is under review. A language that is not yet offered can be previewed by its reviewers at `?lang=<code>&draft=1`.

## Current status

| Language | Code | Offered | Reviewed |
|---|---|---|---|
| English | en | Source language | — |
| French | fr | Yes | Not yet: drafted, awaiting review by a fluent speaker |
| Spanish | es | Yes | Not yet: drafted, awaiting review by a fluent speaker |

Both translations cover the interface: labels, headings, buttons, help text, the six evaluation criteria, the analytical standards, the prompting techniques, the CONTEXT framework tab, the categories of AI use, and the privacy statement. The theory library, the worked examples, some messages that contain changing details (such as counts), the prompt and the methods report remain in English. The research conversation screens added in versions 1.7.0 and 1.8.0 (Log & evaluate, Conversation, and conversations in the Sensitivity study) are not yet translated; the SPL Research Session Protocol and its commands stay in English by design, like the prompt they accompany.

## Adding a language

1. Copy the `fr` block in `locales.js`, give it the new language code, and set `name`, `offered: false` and `reviewed: false`.
2. Translate each entry. Keep the CONTEXT dimension letters (C, O, N, T, E, X, T) and the acronym CONTEXT unchanged.
3. Run the tests (`node --test tests/data.test.js`).
4. Add the language to the Language menu in `index.html`.
5. Ask a fluent reviewer to check the draft at `?lang=<code>&draft=1`, then set `offered: true`, and `reviewed: true` once the review is complete.

Contributions are welcome: see [CONTRIBUTING.md](../CONTRIBUTING.md).
