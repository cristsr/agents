---
name: healthcheck
description: >
  Validates the consistency of the SDD skill ecosystem: profile keys and blocks
  referenced by skills vs. the YAML template, local references/ paths, and
  STACK_REFS pack files — then validates the current project's
  `.agents/profile.yaml` against the schema (required keys, enums, paths,
  cross-key rules) and its `docs/rules.md` against the constitution contract.
  Use when the user says "/healthcheck", "validate the skills", "audit the
  ecosystem", "verify consistency", "check the profile", "is my profile valid",
  or after editing skills/bootstrap or the rules to confirm nothing is broken.
  Read-only — never modifies files.
---

# healthcheck

## Overview

Runs three validators. The first checks the **ecosystem** — the global skills against
the profile template; the second checks **this project's profile** against the schema;
the third checks **this project's constitution** (`docs/rules.md`) against the contract
its template declares. Each can pass while another fails: a profile is only as valid
as the template it was written from, a template is only useful if the skills cite it
correctly, and a constitution only binds if it is well-formed enough to be checked.

`~/.agents/scripts/validate-skills.mjs` (Node) checks
along four axes:

1. **Profile keys** — every key the skills reference exists in
   `sdd-profile.template.yaml` (the ones that don't come out as warnings, to review
   whether they're new keys or prose tokens).
2. **Profile blocks** — every block a skill cites (`stack block`) exists in the
   template, and no skill still points at the pre-YAML numbered sections.
3. **Ports** — every port is in all three places it must be: the catalog
   (`~/.agents/PORTS.md`), the template's `ports` block, and the skills that call it.
   A port called from a skill but absent from the catalog is a call into a void.
4. **Local + cross-skill paths** — every `references/<file>` a skill consults exists in
   that skill, and every "the `<skill>` skill's `references/<file>`" cross-reference
   resolves in that skill's folder (`../<skill>/references/...` spellings are ignored).
5. **Stack packs** — every `<STACK_REFS>/<file>` the skills reference is a template
   that exists in the generic pack (the fallback floor every project shares, whatever
   `STACK_REFS` lists); an `<STACK_REFS>/architecture/` reference is an error — packs
   carry no guides, the framework concretion lives in the framework skill.

**Announce at start:** "Validating the SDD ecosystem's consistency."

## Step 1: Validate the ecosystem

```bash
node "$HOME/.agents/scripts/validate-skills.mjs"
```

## Step 2: Validate this project's profile

Only if the current project has one — skip without comment when there is no
`.agents/profile.yaml` and this is the skills repo itself:

```bash
node "$HOME/.agents/scripts/validate-profile.mjs" .agents/profile.yaml
```

It checks the schema version, that every block and key matches the template, that
required keys hold a value, that enums and list types are respected, that the paths
on disk resolve (`WORKING_DIRECTORY`, `STACK_REFS`, `MODULE_ROOT`), and the cross-key
rules — a half-configured docs-as-code set, `API_CONTRACT_MODE: delta` without
`DOCS_MODULE`, a `STORY_ID_PATTERN` that contradicts its prefix.

## Step 3: Validate this project's constitution

Only if the current project has one — skip without comment when there is no
`docs/rules.md` and this is the skills repo itself:

```bash
node "$HOME/.agents/scripts/validate-rules.mjs" docs/rules.md
```

It checks the *form*, not the content: the front-matter (semver `version`,
`ratified`/`last_amended` dates), that every article carries its three fields and a
normative Principle (MUST/SHALL/NEVER), that the quality gates are binary, and that
no article leans on code review alone for its verification. It exists because a
constitution `/design` and `/plan` must validate against is only trustworthy if it is
well-formed enough to be checked mechanically.

## Step 4: Report

Report all three validators together — a green ecosystem with a broken profile or a
malformed constitution is not a green run.

- **No issues** → "Ecosystem consistent: <N> profile keys, packs and references OK.
  Profile valid: <N> keys, schema v<n>."
- **With issues** → list them with their probable cause and the fix:
  - Key missing from the template → add it to `sdd-profile.template.yaml`.
  - Block cited but nonexistent → fix the citation, or add the block to the template.
  - Stale `section <n>` reference → replace it with the block name.
  - Port called but not in the catalog → the skill invented a capability: either add
    it to `PORTS.md` and the template, or call the port that already covers it.
  - Port in the catalog but not in the template → projects have no way to wire it.
  - Nonexistent `references/` → create the file or fix the reference.
  - Missing pack → copy the template into the pack or fix the reference.
  - Required profile key null → run `/bootstrap` to fill it; don't invent the value.
  - Profile path that doesn't resolve → the project moved, or the key is a leftover.
- **Warnings (non-key tokens)** → mention them briefly; they only need action if one
  is a new profile key that was never registered in the template.

## Step 5: Hand off

If everything passes, suggest: "After changing skills, the profile or the rules, run
`/healthcheck` to confirm nothing broke."

Do nothing else — this is a diagnostic skill, read-only.

---

## Output language

**Conversational output** follows `~/.agents/references/chat-conventions.md` — the six blocks (announce, progress, question, summary, stop, handoff).

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the report samples above are written in English;
render them in the user's language when that differs.
