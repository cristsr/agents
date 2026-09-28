# `evals/evals.json` — format

## Contents

- Where it lives
- Fields
- Full example
- How each field is filled
- Rules

---

## Where it lives

`<skill-name>/evals/evals.json`, inside the skill's folder, so it follows the skill
through renames and splits. `SKILL.md` never links it: the evals are for whoever
develops the skill, not for the run, so they cost no tokens at activation.

Input files an eval needs go next to it, in `evals/files/`.

---

## Fields

| Field | Required | What it holds |
|---|---|---|
| `skill` | Yes | The skill's `name` |
| `models` | Yes | The target models the skill must work on (`haiku`, `sonnet`, `opus`) |
| `baseline` | Yes | Failures observed **without** the skill — the scope of what the instructions fix |
| `triggers.should` | Yes | Queries that must load the skill: literal phrases and paraphrases |
| `triggers.should_not` | Yes | Queries that must not load it, each with the `owner` skill that should take it (`null` if none) |
| `evals` | Yes | Behavior scenarios: `id`, `query`, `files`, `expected_behavior` |
| `runs` | No | One entry per run with the skill: model, trigger hits, evals passed, navigation observed |

---

## Full example

```json
{
  "skill": "processing-invoices",
  "models": ["haiku", "sonnet"],
  "baseline": [
    { "eval": 1, "model": "sonnet", "failure": "Read 03/04 as March 4; supplier dates are DD/MM" },
    { "eval": 2, "model": "sonnet", "failure": "Summed line totals including the withheld tax" }
  ],
  "triggers": {
    "should": [
      "process this invoice",
      "extract the totals from these supplier PDFs",
      "load the invoices into the ledger"
    ],
    "should_not": [
      { "query": "review the terms of this supplier contract", "owner": "reviewing-contracts" },
      { "query": "convert this PDF to Word", "owner": null }
    ]
  },
  "evals": [
    {
      "id": 1,
      "query": "Process the invoice in evals/files/inv-001.pdf",
      "files": ["evals/files/inv-001.pdf"],
      "expected_behavior": [
        "Parses every date as DD/MM",
        "Outputs one row per line item with net, tax and total"
      ]
    },
    {
      "id": 2,
      "query": "What's the net payable on inv-002?",
      "files": ["evals/files/inv-002.pdf"],
      "expected_behavior": ["Subtracts the withheld tax from the gross total"]
    },
    {
      "id": 3,
      "query": "Process this scanned invoice",
      "files": ["evals/files/inv-003-scanned.pdf"],
      "expected_behavior": ["Reports that the PDF has no text layer instead of guessing values"]
    }
  ],
  "runs": [
    {
      "model": "haiku",
      "triggers": "9/10 should, 0/2 should_not",
      "evals": "3/3",
      "navigation": "SKILL.md, references/tax-rules.md; never opened references/formats.md"
    }
  ]
}
```

---

## How each field is filled

1. **`triggers` and `evals`** — from the PHASE 1 use cases, before any instruction is
   written. One behavior eval per use case, plus at least one edge case.
2. **`should_not`** — at least one query per neighboring skill found in the
   collision check, naming it as `owner`, plus one generic unrelated query.
3. **`baseline`** — run the behavior evals without the skill (clean session or a
   subagent that doesn't have it) and write down each concrete failure.
4. **`runs`** — after the instructions exist, one entry per target model.

---

## Rules

- **`expected_behavior` is verifiable.** "Handles dates correctly" can't be checked;
  "parses every date as DD/MM" can.
- **Empty `baseline` means no skill.** If Claude passes every eval without it, the
  skill would only spend tokens.
- **Every instruction traces back.** Each section of `SKILL.md` should fix a
  `baseline` entry or state a rule Claude couldn't know.
- **The file evolves with the skill.** When the skill is split, each piece takes the
  evals and triggers that belong to its responsibility; a `should` that moved becomes
  a `should_not` owned by the sibling.
