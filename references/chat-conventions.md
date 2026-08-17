# Chat Output Conventions

The conversational SDD skills present their work to the user in the **same six
blocks**. "Conversational" means skills that drive a run and hand off to the next
one: `spec`, `prepare`, `clarify`, `scan`, `design`, `plan`, `build`, `sync`,
`commit`, `hotfix`, `refine`, `forge`, `status`, `healthcheck`, `docs`, `rules`,
`bootstrap`, `profile`, `hexagonal-audit`. Convention skills (`typescript`,
`error-handling`, `hexagonal-architecture`, `design-principles`) are exempt — they
enforce rules, they don't run a conversation.

**Chat prose follows `OUTPUT_LANGUAGE`**; artifact prose follows
`ARTIFACT_LANGUAGE`. The structural tokens below stay verbatim (English):
`[Step N]`, `✓`, `✗`, `## Summary`, `Next:`. Message samples in the skills are
written in English as the default — render them in `OUTPUT_LANGUAGE` when that
differs.

## The six blocks

1. **Announce** — the first line of the run, exactly one line:
   > Starting `/<skill>` for `spec-<number>`.

   Skills with no story (`status`, `healthcheck`) announce the action only:
   > Starting `/<skill>`.

2. **Progress** — one `[Step N] <verb> ...` line per step of a long run, marked
   `✓` when done and `✗` on failure. Sub-steps are indented under their step.

3. **Question / escalation** — choices go through the harness's question tool
   (`AskUserQuestion` / `question`); free-text asks are quoted:
   > "<question>"

   One question call at a time, except `/clarify`'s single batch of max 3 and
   `/forge`'s relayed `/plan`/`/build` gates. Recommended options come first,
   labelled " (Recommended)".

4. **Summary** — the closing block, `## Summary` heading with labeled lines,
   no more than 8:

   ```markdown
   ## Summary
   - Story: spec-<number>
   - Produced: <paths or artifact names>
   - Counts: <the numbers that matter: tasks, ACs, files, queries>
   - Escalations: <none | one line each>
   - Next: /<next-skill> spec-<number>
   ```

   Point to the files instead of dumping their content, unless the user asks.

5. **Stop** — the run ended without completing; one line for the reason, one for
   the remedy:
   > Stop — <reason>.
   > Run `/<skill> spec-<number>` first.

6. **Handoff** — every completed run ends with the next step:
   `Next: /<next-skill> spec-<number>` — or "review the changes first" when the
   next step is a user review (as in `/design` and `/build`).

## Which blocks each skill uses

| Skill | Announce | Progress | Question | Summary | Stop | Handoff |
|---|---|---|---|---|---|---|
| spec | ✓ | — | ✓ | ✓ | ✓ | ✓ → prepare / clarify |
| prepare | ✓ | ✓ | ✓ (branch) | ✓ | ✓ | ✓ → clarify |
| clarify | ✓ | — | ✓ (R5 + batch ≤3) | ✓ | ✓ | ✓ → design |
| scan | ✓ | ✓ | — | ✓ | ✓ | ✓ → design |
| design | ✓ | ✓ | ✓ (≤5) | ✓ | ✓ | ✓ → plan (after review) |
| plan | ✓ | — | — | ✓ | ✓ | ✓ → build |
| build | ✓ | ✓ | — | ✓ | ✓ | ✓ → sync (after review) |
| sync | ✓ | ✓ | — | ✓ | ✓ | ✓ → commit |
| commit | ✓ | ✓ | — | ✓ | ✓ | ✓ → PR (gh pr create) |
| hotfix | ✓ | ✓ | — | ✓ | ✓ | ✓ → build |
| refine | ✓ | — | ✓ | ✓ | ✓ | ✓ → next artifact |
| forge | ✓ | — | — | ✓ | ✓ | ✓ → commit |
| status | ✓ | — | — | ✓ | — | ✓ (suggests next step) |
| healthcheck | ✓ | — | — | ✓ | — | ✓ (remedy per finding) |
| docs | ✓ | — | — | ✓ | ✓ | ✓ → sync |
| rules | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| bootstrap | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ → spec / prepare |
| profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| hexagonal-audit | ✓ | ✓ | — | ✓ | ✓ | ✓ → clarify |

## Validation

`npm run skills:check` enforces, for every non-exempt skill: an
`Announce at start` line, an `## Output language` section, and a citation of this
file. The exemption list lives in `scripts/validate-skills.mjs` (`CHAT_EXEMPT`) —
edit it when a skill stops being conversational. Update this table whenever a
skill's flow changes.
