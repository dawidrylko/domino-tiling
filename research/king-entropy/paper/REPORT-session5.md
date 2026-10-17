# Session 5: front matter for submission

No new research; only `research/king-entropy/paper/` was touched.

Before starting, the remote branch `d/king-entropy` had been rewritten; the local
checkout was reset to `origin/d/king-entropy` at `c05e4d9`.

## What changed

| commit | change |
| --- | --- |
| `b866da7` | amsart front matter: address (Independent researcher, Bielsko-Biała, Poland), email, `\subjclass[2020]{Primary 05C70; Secondary 82B20, 05A16}`, `\keywords{...}`; hyperref `pdftitle`, `pdfauthor`, `pdfsubject` (MSC 2020), `pdfkeywords`, `pdfcreator={LaTeX with hyperref}`. `\enlargethispage{2pt}` on page 1, because the longer first-page footnote overfilled it by 1.7 pt. |
| `72266a0` | Unnumbered sections before the references: *Data availability statement* (repository URL, tag `v1.0-king-entropy`, `DOI: TO-BE-ASSIGNED (Zenodo)`) and *Disclosure statement* ("The author reports no competing interests."). The tag and the DOI do not exist yet: both carry a visible bold `[TODO: ...]` in the PDF and a `TODO(submission)` comment in the source. |
| `f11bb3f` | Fixed the two warnings that were already present at `c05e4d9`: an underfull line in the Table 6 caption (file names moved into the parenthesis, as in the other captions) and a pdfTeX font-expansion warning (OT1 lmr 9 pt was first used in math mode in the bibliography; it is now selected once in text mode at `\begin{document}`). No other change to the typeset text (checked by diffing `pdftotext` output). |
| `4fa3f22` | Rebuilt `main.pdf`. |

Build: `latexmk -C && latexmk -pdf main.tex` gives 12 pages, no LaTeX, pdfTeX or BibTeX
warnings (`main.log` has no `Warning`, `Overfull` or `Underfull` lines; `main.blg` has
`warning$ -- 0`). `pdfinfo main.pdf`:

```
Title:     The dimer entropy of the king's graph
Subject:   MSC2020: Primary 05C70; Secondary 82B20, 05A16
Keywords:  king's graph, domicule tilings, perfect matchings, dimer model, entropy, transfer matrix
Author:    Dawid Ryłko
Creator:   LaTeX with hyperref
Producer:  pdfTeX-1.40.25
```

## Experimental Mathematics (Taylor & Francis): what could be checked

The container could not reach `tandfonline.com` or `authorservices.taylorandfrancis.com`
(proxy refusal), so the journal's own *Instructions for Authors* page was not read. Only
search-engine excerpts of Taylor & Francis Author Services pages were available. They
describe publisher-wide policy, not this journal:

- A data availability statement is required, placed in the manuscript before the
  References. Done, but the tag and the DOI are still placeholders.
- A competing-interest (disclosure) statement should be in the article text; if none is
  given, T&F prints "No potential competing interest was reported by the author(s)". Done.

Not verified, to check on the journal page before submitting:

- Abstract length limit. The current abstract is about 204 words (each formula counted as
  one word).
- Reference style. The paper uses `amsplain` (numbered, AMS). Whether the journal requires
  a T&F style or its Interact LaTeX template was not confirmed.
- Number of keywords, whether MSC codes are required, and any length limit.
- Whether a funding statement is required (none is included; add "This research received
  no external funding." if it is).
- Peer-review model (single or double anonymous), which decides whether the repository
  link and author name may stay in the submitted manuscript.
- ORCID, cover letter and file-format requirements.

## Still open before submission

- Create and push the tag `v1.0-king-entropy`, archive it on Zenodo, and replace both
  placeholders in the data availability statement.
- The Reproducibility section still names the branch `d/king-entropy`; point it at the tag
  once it exists.
- The date line still reads "Draft, October 2026".
