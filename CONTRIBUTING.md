# Contributing

Thank you for helping. The Lab is meant to grow through scholars adding the examples, languages and criteria their own fields need.

## Ways to contribute

- **Worked examples.** Add a research design from your discipline to `examples` in `data.js`. Good examples name a real research question, the cultural and linguistic context, and the terms an outsider might misread. Do not paste copyrighted source text; describe the source and leave a placeholder.
- **Interface translations.** Yoruba, Hausa, Igbo, Nigerian Pidgin, Swahili, French, Arabic and other languages are all welcome. Open an issue first so we can agree on how to structure translated strings.
- **Theories.** Add them to `theories.js`. Each needs a unique `id`, a field (`f`), a name (`n`), key thinkers (`t`) and what the analysis should attend to (`a`), written so it reads well after "attend to". Theories from African and other under-represented scholarly traditions are especially welcome. If you are not comfortable editing code, add the theory in the Lab and press **Share** beside it to open a pre-filled suggestion.
- **Techniques, safeguards and evaluation criteria.** Add them to `data.js`.
- **Bug reports and suggestions.** Open an issue describing what you did, what you expected and what happened.

## Working on the code

There is no build step. Edit the files and open `index.html` in a browser.

- `index.html`: page structure
- `styles.css`: styles (light and dark themes)
- `theories.js`: the theory library
- `data.js`: reference data and worked examples
- `app.js`: application logic

Ground rules:

1. No network requests and no tracking. The Lab must keep working offline and keep users' research on their own machines.
2. No external dependencies unless there is a strong reason.
3. Keep it usable on a phone and with a keyboard alone.

## Ethics

Do not add examples that include personal data, unpublished interview material, or community knowledge shared without consent to publish.
