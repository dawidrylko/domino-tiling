# Notes

Each note is Markdown with code cells marked `js run`. `pnpm site:build` runs the cells in order and publishes every note as a page of the [project site](https://dawidrylko.github.io/domino-tiling/) with the output under each cell, so the results there are recomputed from this repository on every deploy. On GitHub only the code is shown. A cell that throws stops the build, so a cell that checks a result fails the deploy when the result is wrong.

The renderer in `site/notes.js` covers a subset of Markdown: headings, paragraphs, flat lists, tables, block quotes, code blocks, `math` blocks and inline `$...$` (rendered with KaTeX), code spans, links, bold and italics. Nested lists and a `|` inside a table cell are not supported.

1. [Method](01-method.md): how the tilings are counted, numbered and sampled, and how every number is checked.
2. [A004003 notebook](02-a004003.md): domino tilings by three methods, the resultant and the running time.
3. [A239273 notebook](03-a239273.md): domicule tilings up to 20 × 20, the modular solver and the Markov chain.
