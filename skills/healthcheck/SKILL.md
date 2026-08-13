---
name: healthcheck
description: >
  Validates the consistency of the SDD skill ecosystem: profile keys referenced
  by skills vs. the template, local references/ paths, and STACK_REFS pack files.
  Use when the user says "/healthcheck", "validate the skills", "audit the
  ecosystem", "verify consistency", "check the profile", or after editing
  skills/profile to confirm nothing is broken. Read-only — never modifies files.
---

# healthcheck

## Overview

Runs the `~/.agents/scripts/validate-skills.sh` script (portable bash — Linux, WSL or
Git Bash), which checks along three axes:

1. **Profile keys** — every key the skills reference exists in
   `sdd-profile.template.md` (the ones that don't come out as warnings, to review
   whether they're new keys or prose tokens).
2. **Local paths** — every `references/<file>` a skill consults exists in that skill
   (cross-skill paths `../<skill>/references/...` are ignored).
3. **Stack packs** — every `<STACK_REFS>/<file>` exists in the `generic` and
   `typescript-nestjs` packs.

**Announce at start:** "Validating the SDD ecosystem's consistency."

## Step 1: Run the validator

```bash
bash "$HOME/.agents/scripts/validate-skills.sh"
```

Also validate the current project's profile (if there is one): that every key the
skills read exists in the project's `.agents/profile.md`, and that the values point at
real paths (`STACK_REFS`, `WORKING_DIRECTORY`, `WORKDIR_ACTIVE`, …).

## Step 2: Report

- **No issues** → "Ecosystem consistent: <N> profile keys, packs and references OK."
- **With issues** → list them with their probable cause and the fix:
  - Key missing from the template → add it to `sdd-profile.template.md`.
  - Nonexistent `references/` → create the file or fix the reference.
  - Missing pack → copy the template into the pack or fix the reference.
- **Warnings (non-key tokens)** → mention them briefly; they only need action if one
  is a new profile key that was never registered in the template.

## Step 3: Hand off

If everything passes, suggest: "After changing skills or the profile, run
`/healthcheck` to confirm nothing broke."

Do nothing else — this is a diagnostic skill, read-only.

---

## CRITICAL: Output Language

This skill writes no artifacts. **Chat interaction follows the user's language**
(`OUTPUT_LANGUAGE` in the profile) — the report samples above are written in English;
render them in the user's language when that differs.
