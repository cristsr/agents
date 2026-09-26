# Chat Output Conventions

The conversational SDD skills present their work to the user in the **same six
blocks**. "Conversational" means skills that drive a run and hand off to the next
one: `sdd-spec`, `sdd-route`, `sdd-prepare`, `sdd-scan`, `sdd-clarify`, `sdd-design`, `sdd-plan`, `sdd-build`, `sdd-sync`,
`sdd-commit`, `sdd-hotfix`, `sdd-refine`, `sdd-forge`, `sdd-status`, `healthcheck`, `sdd-docs`, `sdd-rules`,
`sdd-bootstrap`, `profile`, `hexagonal-audit`. Convention skills (`typescript`,
`error-handling`, `hexagonal-architecture`, `design-principles`) are exempt — they
enforce rules, they don't run a conversation.

## The three language axes

A project writes in more than one language at once, and the profile's `language`
block splits them on three independent keys. A skill names what it puts on each
axis; these are the axes.

| Key | Governs | Falls back to |
|---|---|---|
| `ARTIFACT_LANGUAGE` | the **prose** a skill writes into an artifact — ACs, descriptions, decisions, findings | `OUTPUT_LANGUAGE`, when the project doesn't declare it |
| `OUTPUT_LANGUAGE` | everything said **to the user** in chat | — |
| `IDENTIFIER_LANGUAGE` | **code and its names** — paths, classes, fields, endpoints, test names, comments | nothing; it has no default and may not be null |

Three rules hold across every skill, whatever those keys say.

**Never translate an artifact into English on your own.** Prose written in
`ARTIFACT_LANGUAGE` stays there. A skill editing an artifact someone else produced
writes the correction in the language the surrounding text is already in — a
refinement never switches an artifact's language.

**Structural headings are literals, not prose.** `[Step N]`, `✓`, `✗`,
`## Summary`, `Next:`, `## Contract`, `## AC Coverage`, `Task N` and their kind are
matched by name — by the next skill in the pipeline, or by a validator script.
Translating one doesn't localize the document, it breaks the handoff: the section is
there and the reader reports it missing. They stay English regardless of
`ARTIFACT_LANGUAGE`. A skill whose validator matches further literals of its own
lists them itself.

**Identifiers are quoted, not translated.** A path, a class, a field or an endpoint
taken from the code is copied exactly as the code spells it. When a skill *names* a
new identifier it follows `IDENTIFIER_LANGUAGE` and matches what the codebase
already does — no skill carries a default of its own.

Message samples in the skills are written in English as the default — render them in
`OUTPUT_LANGUAGE` when that differs.

## The six blocks

1. **Announce** — the first line of the run, exactly one line:
   > Starting `/<skill>` for `spec-<number>`.

   Skills with no story (`sdd-status`, `healthcheck`) announce the action only:
   > Starting `/<skill>`.

2. **Progress** — one `[Step N] <verb> ...` line per step of a long run, marked
   `✓` when done and `✗` on failure. Sub-steps are indented under their step.

3. **Question / escalation** — choices go through the harness's question tool
   (`AskUserQuestion` / `question`); free-text asks are quoted:
   > "<question>"

   One question call at a time, except `/sdd-clarify`'s single batch of max 3 and
   `/sdd-forge`'s relayed `/sdd-plan`/`/sdd-build` gates. Recommended options come first,
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
   next step is a user review (as in `/sdd-design` and `/sdd-build`).

## Which blocks each skill uses

The tier decides which stages exist, so "the next skill" is a function of `spec.md`'s
front matter (`tier: fast | standard | full`, absent meaning `full`), never of this
table alone — `contracts/TIERS.md` carries the rule the cells abbreviate:

- `/sdd-spec` hands off to `/sdd-route` in every tier. Its initial run infers the tier,
  then hands off to `/sdd-prepare`; after it, `fast` goes to `/sdd-build` — no survey,
  no clarification pass, no design, no plan — and `standard` and `full` go to
  `/sdd-scan`, then `/sdd-clarify`.
- `/sdd-clarify` hands off to `/sdd-route` — its review run — which hands off to
  `/sdd-design` in `full` under `tdd` and to `/sdd-plan` everywhere else: `standard`,
  and `full` under `evidence`.
- `/sdd-plan` exists in `full` and `standard` only: `fast` builds straight from
  `spec.md`, where `## Change Surface` and `## AC Coverage` stand in for the plan.

A skill announces the tier only where it decided it: `/sdd-route` names the tier it
inferred or confirmed in the `Summary` block's `Produced` and `Counts` lines — the six blocks are
fixed, and the tier is a value in an existing line, not a seventh block.

| Skill | Announce | Progress | Question | Summary | Stop | Handoff |
|---|---|---|---|---|---|---|
| sdd-spec | ✓ | — | ✓ | ✓ | ✓ | ✓ → sdd-route |
| sdd-route | ✓ | — | ✓ (evidence, lowering, confirm — one call) | ✓ | ✓ | ✓ → sdd-prepare (initial) / sdd-design (full+tdd) / sdd-plan (standard, full+evidence) |
| sdd-prepare | ✓ | ✓ | ✓ (branch) | ✓ | ✓ | ✓ → sdd-build (fast) / sdd-scan |
| sdd-scan | ✓ | ✓ | ✓ (components) | ✓ | ✓ | ✓ → sdd-clarify (first survey) / by status (refresh) |
| sdd-clarify | ✓ | — | ✓ (R5 + batch ≤3) | ✓ | ✓ | ✓ → sdd-route |
| sdd-design | ✓ | ✓ | ✓ (≤5) | ✓ | ✓ | ✓ → sdd-plan (after review) |
| sdd-plan | ✓ | — | — | ✓ | ✓ | ✓ → sdd-build (full, standard) |
| sdd-build | ✓ | ✓ | — | ✓ | ✓ | ✓ → sdd-sync (after review) |
| sdd-sync | ✓ | ✓ | — | ✓ | ✓ | ✓ → sdd-commit |
| sdd-commit | ✓ | ✓ | — | ✓ | ✓ | ✓ → PR (gh pr create) |
| sdd-hotfix | ✓ | ✓ | — | ✓ | ✓ | ✓ → sdd-build |
| sdd-refine | ✓ | — | ✓ | ✓ | ✓ | ✓ → next artifact |
| sdd-forge | ✓ | — | — | ✓ | ✓ | ✓ → sdd-commit |
| sdd-status | ✓ | — | — | ✓ | — | ✓ (suggests next step) |
| healthcheck | ✓ | — | — | ✓ | — | ✓ (remedy per finding) |
| sdd-docs | ✓ | — | — | ✓ | ✓ | ✓ → sdd-sync |
| sdd-rules | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| sdd-bootstrap | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ → sdd-spec / sdd-prepare |
| profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| hexagonal-audit | ✓ | ✓ | — | ✓ | ✓ | ✓ → sdd-route |

## Validation

`npm run skills:check` enforces, for every non-exempt skill: an
`Announce at start` line, an `## Output language` section, and a citation of this
file. The exemption list lives in `scripts/validate-skills.mjs` (`CHAT_EXEMPT`) —
edit it when a skill stops being conversational. Update this table whenever a
skill's flow changes.
