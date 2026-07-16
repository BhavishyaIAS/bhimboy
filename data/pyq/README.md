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

| Year | File | Questions |
|------|------|-----------|
| 2020 | `2020-mains.json` | 129 (Essay + Papers II–V) |
| 2023 | `2023-mains.json` | 129 (Essay + Papers II–V) |
| 2025 | `2025-mains.json` | 129 (Essay + Papers II–V) |
| 2016 | _pending upload_ | — |
| 2017 | _pending upload_ | — |

### Prelims (Paper-I, key-only)

| Year | File | Questions |
|------|------|-----------|
| 2018 | `2018-prelims.json` | 115 (5 deleted skipped) |
| 2022 | `2022-prelims.json` | 114 (6 deleted skipped) |
| 2016 | _pending — scanned image, OCR_ | — |
| 2024 | _pending — scanned image, OCR_ | — |
