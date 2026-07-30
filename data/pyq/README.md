# Previous-Year Questions (PYQ) ingestion

Mains previous-year questions live here as `<year>-mains.json` and are loaded
into the `mains_questions` table by `scripts/import-pyqs.mjs`. They then appear
in the **PYQ Vault** and under each **micro-theme** page.

## File format

Each file is a JSON array of question objects:

```jsonc
{
  "year": 2020,
  "paper_label": "Paper-II: History, Culture & Geography",
  "no": 1,               // question number on the paper
  "part": "a",           // OR-option (a / b / c) — omit if none
  "microtheme": "MN-PII-HCOI-002",   // the micro-theme CODE this maps to
  "marks": 10,
  "directive_word": "critically explain",
  "text": "Critically explain the salient features of urban planning of Harappan Civilization."
}
```

### Questions that straddle two micro-themes

Use `microthemes` (array) instead of `microtheme`. The **first** code is the
primary placement (`microtheme_id`, shown in the vault once); the rest are
stored in the question's `keywords`, so the question **also** surfaces on those
micro-theme pages — without duplicating the row in the vault:

```jsonc
{
  "...": "...",
  "microthemes": ["MN-PIII-PAG-014", "MN-PIII-PAG-015"]
}
```

## Rules

- **Transcribe verbatim** from the official paper. Never paraphrase or invent a
  question — PYQs are trusted as the real exam.
- Every OR-option (a/b/c) is a real question a candidate could attempt — include
  each as its own entry.
- `microtheme` / `microthemes` codes must already exist in the `microthemes`
  table (the importer fails loudly on unknown codes).
- `model_answer` is left empty on import — model answers are not part of the
  real paper and can be added later via the admin editor.

## Prelims (`<year>-prelims.json`)

Prelims previous-year papers are loaded into `prelims_questions` with
`--type prelims`. Each item carries the question and its official `answer`:

```jsonc
{
  "year": 2022,
  "paper_label": "Prelims Paper-I",
  "no": 1,
  "microtheme": "PRE-PI-HC-005",
  "text": "During the Indus Valley Civilization, the beads manufacturing industry was located at",
  "answer": "Chanhudaro"      // the official correct answer
}
```

APPSC publishes prelims papers as **FINAL KEY** documents: they print each
question with **only its correct answer** — the three distractor options are
not released, and we never invent them. On import the answer goes into
`option_a` (with `option_b/c/d` left empty and `correct_option` = `A`); the
micro-theme card then renders a **think-then-reveal** flow instead of a
four-option MCQ. `QUESTION DELETED` items in the key are skipped. Dual-theme
questions use `microthemes` (array) exactly as for mains.

## Import

```bash
node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/2020-mains.json
node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/2022-prelims.json --type prelims
# --draft   import as draft instead of published
```

The importer is **idempotent**: it matches on (year, paper_label, primary
micro-theme, question text) and **updates in place** on re-run, so fixing a
mapping and re-importing never creates duplicates.

## Status

### Mains

| Year | File | Questions | Model answers |
|------|------|-----------|---------------|
| 2020 | `2020-mains.json` | 129 (Essay + Papers II–V) | ✅ `answers/2020-mains-answers.json` |
| 2023 | `2023-mains.json` | 129 (Essay + Papers II–V) | ✅ `answers/2023-mains-answers.json` |
| 2025 | `2025-mains.json` | 129 (Essay + Papers II–V) | ✅ `answers/2025-mains-answers.json` |
| 2016 | _pending upload_ (full paper) | — | — |
| 2017 | _pending upload_ (full paper) | — | — |

### General Essay archive (2008–2024, APPSC + TGPSC)

`essays-archive.json` holds General Essay topics from years whose **full mains
papers are not ingested** — 63 questions across APPSC 2008 / 2011 / 2012 /
2016 / 2017 and TGPSC 2016 / 2024 (TGPSC rows use the paper label
`Paper-I: General Essay (TGPSC)` so the two boards' same-year papers stay
distinct). All are mapped to the `MN-PI-ECB-*` essay banks. Together with the
27 essays inside the 2020/2023/2025 mains files this completes the full
90-topic compilation (2008–2025). Model answers are authored fresh (never
copied from compilations) in `answers/essays-archive-answers.json`, keyed
`Q<no>` by the compilation numbering, and attached by:

```bash
node --env-file=.env.local scripts/update-essay-answers.mjs
```

### Paper-II archive (2008–2024, APPSC + TGPSC)

`paper2-archive.json` holds Mains **Paper-II** (History, Culture & Geography of
India and AP) PYQs from years whose full papers are not ingested — 92 questions
across APPSC 2008 / 2011 / 2012 / 2016 / 2017 and TGPSC 2016 / 2024 (plus one
2025 APPSC soils question absent from the main 2025 paper). TGPSC rows use the
paper label `Paper-II: History, Culture & Geography (TGPSC)` so the two boards'
same-year papers stay distinct; APPSC rows reuse the standard
`Paper-II: History, Culture & Geography` label. Questions are transcribed
verbatim from the official papers and mapped to the `MN-PII-*` micro-themes
(HCOI = History of India, HCOA = History of Andhra, G = Geography). Model
answers are authored fresh (facts absorbed from reference compilations, all
prose original) in `answers/paper2-archive-answers.json`, keyed `Q<no>` by the
compilation numbering, and attached by:

```bash
node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/paper2-archive.json
node --env-file=.env.local scripts/update-paper2-archive-answers.mjs
```

### Paper-III archive (2008–2024, APPSC + TGPSC)

`paper3-archive.json` holds Mains **Paper-III** (Polity, Governance, Law &
Ethics) PYQs from years whose full papers are not ingested — 68 questions
across APPSC 2008 / 2011 / 2012 / 2016 / 2017 / 2024 and TGPSC 2016 / 2024
(including two 2020 APPSC questions — office of profit; Rajya Sabha vs Lok
Sabha — absent from the ingested 2020 paper). TGPSC rows use the paper label
`Paper-III: Polity, Governance, Law & Ethics (TGPSC)`; APPSC rows reuse the
standard `Paper-III: Polity, Governance, Law & Ethics` label. Questions are
transcribed verbatim from the official Paper-III compilation and mapped to the
`MN-PIII-*` micro-themes (PC = Polity & Constitution, PAG = Public
Administration & Governance, EIPS = Ethics, LII = Law). Model answers are
authored fresh — the compilation's model-answer substance **merged** with own
knowledge and recent case law, fully restructured into original prose — in
`answers/paper3-archive-answers.json`, keyed `Q<no>`, and attached by:

```bash
node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/paper3-archive.json
node --env-file=.env.local scripts/update-paper3-archive-answers.mjs
```

The **2020 / 2023 / 2025** Paper-III model answers already ingested were
**overhauled** in place (merging the compilation's worked examples, data and
recent developments with the existing answers) via the per-year
`answers/<year>-mains-answers.json` files and `update-model-answers.mjs`.

### Paper-V archive (2008–2024, APPSC + TGPSC)

`paper5-archive.json` holds Mains **Paper-V** (Science, Technology &
Environment) PYQs from years whose full papers are not ingested — 182
questions across APPSC 2008 / 2011 / 2012 / 2016 / 2017 and TGPSC 2016 / 2024.
TGPSC rows use the paper label `Paper-V: Science, Technology & Environment
(TGPSC)`; APPSC rows reuse the standard `Paper-V: Science, Technology &
Environment` label. Questions are transcribed verbatim from the official
Paper-V compilation and mapped to the `MN-PV-*` micro-themes (STNB = S&T
basics/institutions, SP = Space, ED/E2 = Energy & Environment, HB = Health &
Biotech, BN = Biotech, PL = Pollution, I = IT/e-governance/disasters, IIST =
IPR). Model answers are authored fresh — the compilation's model-answer
substance **merged** with own knowledge and recent developments, fully
restructured into original prose — in `answers/paper5-archive-answers.json`,
keyed `Q<no>`, and attached by:

```bash
node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/paper5-archive.json
node --env-file=.env.local scripts/update-paper5-archive-answers.mjs
```

The **2020 / 2023 / 2025** Paper-V model answers already ingested were
**overhauled** in place (merging the compilation's worked examples, latest
data, schemes and value-additions with the existing answers) via the per-year
`answers/<year>-mains-answers.json` files and `update-model-answers.mjs`.

### Paper-IV archive (2008–2024, APPSC + TGPSC)

`paper4-archive.json` holds Mains **Paper-IV** (Economy & Development of India
and Andhra Pradesh) PYQs from years whose full papers are not ingested — 147
questions across APPSC/TGPSC 2008 / 2011 / 2012 / 2016 / 2017 / 2020 / 2024
(plus a few whose year could not be read from the source). TGPSC rows use the
label `Paper-IV: Economy & Development (TGPSC)`; APPSC rows reuse the standard
`Paper-IV: Economy & Development` label. Questions are transcribed from the
uploaded topper compilation and mapped (best-effort, by keyword) to the
`MN-PIV-*` micro-themes (IEC = economy concepts, RMI/RMA = resource
mobilisation India/AP, GBI/GBA = growth & banking India/AP, IG = inclusive
growth, ADI/ADA = agriculture India/AP, IDI/IDA = industry India/AP, II/IA =
infrastructure India/AP). Each question's **full model answer is taken
directly from the compilation** (parsed from the `.docx`; tables rendered as
bullets, prep scaffolding dropped) into `answers/paper4-archive-answers.json`,
keyed `Q<no>`, and attached by:

```bash
node --env-file=.env.local scripts/import-paper4-archive.mjs --file data/pyq/paper4-archive.json
node --env-file=.env.local scripts/update-paper4-archive-answers.mjs
```

**Year field**: known years are set on each row; where the source did not
state a year the JSON leaves `"year": null` (to be filled in later). Because
`mains_questions.year` is `NOT NULL`, the paper4-archive import/attach scripts
coalesce a null year to **`0`** in the database — so the 4 unknown-year rows
currently show year `0` in the vault until edited.

The **2020 / 2023 / 2025** Paper-IV model answers already ingested were
**fully replaced** (not merged) with the compilation's answers wherever the
same question appears, via the per-year `answers/<year>-mains-answers.json`
files and `update-model-answers.mjs`.

## Model answers (Mains)

Authored model answers live in `data/pyq/answers/<year>-mains-answers.json` as a
map keyed by a **paper-qualified** question number (`P1-Q1a` … `P5-Q15b`, since
question numbers repeat across the five papers). Each value is a Markdown-subset
answer (`##` headings, `-`/`1.` lists, `**bold**`). They are attached to the
existing `mains_questions` rows by `scripts/update-model-answers.mjs`, which
converts the Markdown to a TipTap document (`model_answer`, rendered on the
cards) and a plain-text mirror (`model_answer_text`, fed to search). It matches
on (year, paper_label, question_text) and is idempotent — blanks are skipped, so
files can be filled in incrementally.

```bash
node --env-file=.env.local scripts/update-model-answers.mjs --year 2020
```

### Prelims (Paper-I)

Two source shapes are supported:
- **Key-only** (2018, 2022): the official FINAL KEY prints only the correct
  answer. Stored with the answer in `option_a`, `option_b/c/d` empty; rendered
  as a think-then-reveal card.
- **Full MCQ** (2024, 2016): a full question paper with all four options.
  - 2024's answers were circled on the scan (transcribed via vision, as OCR was
    unusable).
  - 2016's booklet carries no answer key, so the correct option for each
    question was **determined from subject knowledge** and each row carries a
    short `explanation` documenting the reasoning (admin can edit any of these
    via the model-answer / question editor). Questions were transcribed
    verbatim from a 300-dpi tesseract OCR, with diagram/match/chart-based items
    (Q51 water-harvesting match, Q79-82 team puzzle, Q113 cube-fold, Q114
    number-grid, Q117-120 bar chart) read directly from the page images.

  Both are stored as option_a..d + correct_option and rendered as an
  interactive four-option MCQ.

| Year | File | Questions | Format |
|------|------|-----------|--------|
| 2018 | `2018-prelims.json` | 115 (5 deleted skipped) | key-only |
| 2022 | `2022-prelims.json` | 114 (6 deleted skipped) | key-only |
| 2024 | `2024-prelims.json` | 118 (Q58, Q101 deleted) | full MCQ, official answers |
| 2016 | `2016-prelims.json` | 150 (Q1-150, full paper) | full MCQ, knowledge-determined answers |
