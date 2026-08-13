---
name: skill-evaluator
description: >
  Reviews an existing skill against Anthropic's official guidance and produces a
  report with findings prioritized by severity, a trigger test battery and the
  concrete fixes to apply. Validates the frontmatter's hard rules, assesses the
  description's quality, detects over-triggering and under-triggering risks,
  reviews the structure and the use of progressive disclosure, checks that
  the instructions are actionable, and verifies the handoff contract when the
  skill chains with others.
  Use when the user says "/skill-evaluator", "review this skill",
  "evaluate a skill", "why doesn't my skill trigger", "the skill over-triggers",
  "audit a SKILL.md", "improve this skill", "review my skills", or points
  at a skill folder or SKILL.md and asks for feedback.
  Do NOT use to create a skill from scratch (use /skill-creator), to review
  application code (use /code-review), or to run automated test suites — this
  skill diagnoses and proposes tests, it doesn't execute them.
---

# skill-evaluator

## Overview

Reviews one or more skills against Anthropic's official guidance and returns an
actionable diagnosis: what's broken (blocking), what stops it from triggering, and
which concrete fixes to apply.

This skill is **agnostic** — it evaluates skills from any project or domain.

**Announce at start:** "I'll evaluate the skill against the guidance. Starting by reading the folder."

**Output:** a report in the chat with prioritized findings, a trigger test battery,
and — only if the user approves — the edits applied.

**Core principle:** most skills fail because of the `description`, not the
instructions. Prioritize findings by what actually changes behavior: first what
prevents the skill from loading or installing, then what makes it trigger wrongly,
and finally wording polish.

**CRITICAL: this skill diagnoses; it doesn't rewrite without permission.** Show the
report first and ask for confirmation before editing files.

---

## PHASE 1: Locate and load the skill

### Step 1 — Resolve the target

Order of preference:
1. The user passed an explicit path (folder or `SKILL.md`) → use it.
2. The user named a skill (e.g. "review `commit`") → find it:

```bash
find ~/.claude/skills ~/.agents/skills .claude/skills -maxdepth 2 -iname "SKILL.md" 2>/dev/null
```

3. The user said "review my skills" without specifying → list the ones found and
   ask with `AskUserQuestion` (`header: "Skill"`) which to evaluate. If there are
   few and they explicitly ask, evaluate them all and report per skill.

### Step 2 — Inventory the folder

```bash
SKILL_DIR=<resolved path>
ls -la "$SKILL_DIR"
find "$SKILL_DIR" -type f | sort
wc -w "$SKILL_DIR/SKILL.md"
```

Record: the main file's exact name, which subfolders exist, whether a `README.md`
is present, and `SKILL.md`'s word count.

### Step 3 — Read

Read `SKILL.md` in full. Also read the `references/` files **only if** `SKILL.md`
links them — if it doesn't link them, that's already a finding (see D3).

### Step 4 — Classify: pipeline or standalone

Decides whether **PHASE 6** applies. A skill is **pipeline** if a **named** skill
produces its input or consumes its output, if it writes into a workspace shared with
other skills, or if it reads a project profile for paths, branches or commands.
Otherwise it's **standalone** — including a skill that operates on whatever file the
user points it at: arbitrary input is not a handoff, however often it runs after
some other skill.

Say which one in the report's header. Getting this wrong costs in both directions:
group C on a standalone skill produces findings demanding a contract that shouldn't
exist, and skipping it on a pipeline skill drops the highest-impact checks there are.

---

## PHASE 2: Hard rules (blocking)

Consult `references/rubric.md` for the full rubric with severities.

These are binary: either they hold or the skill is broken. Any failure here is
**BLOCKING** severity and goes first in the report.

| ID | Rule | How it's verified |
|---|---|---|
| B1 | The file is named exactly `SKILL.md` (case-sensitive) | `ls` — not `SKILL.MD`, not `skill.md` |
| B2 | Frontmatter with opening and closing `---` delimiters | Read the first lines |
| B3 | Valid YAML (closed quotes, consistent indentation) | Parse it mentally; look for unclosed quotes |
| B4 | `name` present and in kebab-case | No spaces, uppercase or underscores |
| B5 | `name` matches the folder name | Compare |
| B6 | `name` doesn't contain "claude" or "anthropic" | Reserved |
| B7 | `description` present | — |
| B8 | `description` under 1024 characters | Count |
| B9 | No XML angle brackets in the frontmatter | Search the whole block. **The YAML block-scalar indicators `>` and `\|` on `description:` are not a violation** — they're valid YAML, not markup. What's forbidden is a tag: `<tag>`, `</tag>`, `<placeholder>` |
| B10 | No `README.md` inside the skill's folder | `ls` |

To count the `description`'s characters without eyeballing it:

```bash
python -c "import sys,re,io; t=io.open(sys.argv[1],encoding='utf-8').read(); m=re.search(r'^---\n(.*?)\n---', t, re.S); d=re.search(r'^description:\s*(.*?)(?=^\w+:|\Z)', m.group(1), re.S|re.M); print(len(' '.join(d.group(1).split())))" "$SKILL_DIR/SKILL.md"
```

---

## PHASE 3: `description` quality

This is the highest-impact analysis. The `description` is the only thing always
loaded and it's what decides triggering.

### Checks

| ID | Check | Fails if… |
|---|---|---|
| D1 | It says **what the skill does** | It only says when, or it's just a domain name |
| D2 | It says **when to use it** with real user phrases | There are no trigger phrases, just a technical description |
| D3 | The phrases are ones a user **would actually say** | It uses internal jargon the user would never type |
| D4 | It mentions file types if they're relevant | It handles `.csv`/`.fig`/`.pdf` and never names them |
| D5 | It has negative triggers if there are neighboring skills | Overlapping scope with no `Do NOT use…` |
| D6 | It isn't generic | "Helps with projects", "Processes documents" |

### Trigger diagnosis

Classify the risk as one of three:

| Risk | Signals | Fix |
|---|---|---|
| **Under-triggering** | Generic description; no trigger phrases; the user has to invoke it by hand | Add detail and nuance to the description — above all keywords and technical terms the user uses |
| **Over-triggering** | Description too broad; loads on unrelated queries; the user disables it | Add negative triggers, be more specific, narrow the scope |
| **OK** | Concrete phrases, bounded scope, exclusions where needed | — |

### Debug technique (recommend it to the user)

> Ask Claude in a clean session: "When would you use the `<name>` skill?". Claude
> will quote the description back. Whatever's missing from that answer is exactly
> what's missing from the description.

---

## PHASE 4: Structure and progressive disclosure

| ID | Check | Threshold |
|---|---|---|
| E1 | Folder in kebab-case | No spaces, underscores or uppercase |
| E2 | `SKILL.md` under 5,000 words | If it exceeds → move detail to `references/` |
| E3 | The `references/` are explicitly linked from `SKILL.md` | A file nobody links never loads |
| E4 | No empty folders (`scripts/`, `assets/`, `references/`) | Scaffolding with no content = noise |
| E5 | Heavy detail lives in `references/`, not inline | Progressive disclosure level 3 |
| E6 | The referenced `scripts/` exist and the command is correct | Verify the paths |

Remember the three levels: frontmatter (always loaded) → `SKILL.md`'s body
(when Claude believes it's relevant) → linked files (only when it navigates them).

---

## PHASE 5: Instruction quality

The symptom this phase attacks: *the skill loads but Claude doesn't follow the
instructions*.

| ID | Common cause | Check | Fix |
|---|---|---|---|
| I1 | Instructions too verbose | Long paragraphs where a list belongs? | Bullets and numbered lists; detail into `references/` |
| I2 | Buried instructions | Is the critical part near the start? | Move it up — into the `Contract` if there is one. A `## CRITICAL` heading only for something irreversible it doesn't already cover (see C5) |
| I3 | Ambiguous language | Does it say "validate properly" instead of what to validate? | Replace with verifiable criteria |
| I4 | No error handling | Is there a common-issues section with cause and solution? | Add it |
| I5 | No examples | Is there at least one end-to-end scenario? | Add user says / actions / result |
| I6 | Not actionable | Are the commands literal and copy-pasteable? | ``Run `python scripts/validate.py --input {file}` `` |

The contrast to look for:

```
# Bad
Make sure to validate things properly

# Good
CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

**Advanced signal:** if a critical validation depends on the model interpreting
text, flag it as an opportunity — recommend a script that does it programmatically.
Code is deterministic; language interpretation isn't.

---

## PHASE 6: Contract and handoff (pipeline skills only)

Skip this phase if PHASE 1 Step 4 said **standalone**, and say so in one line in the
report. `references/rubric.md` carries group C in full.

The symptom this phase attacks: *each skill reads fine on its own and the chain still
breaks*. A contract defect is only visible at the junction — reading either side
alone shows nothing wrong.

| ID | Check | Fails if… |
|---|---|---|
| C1 | A `## Contract` block after the Overview, with the rows that apply (`Requires`, `Produces`, `Writes`, `Never`, `Escalates`, `Degrades`, `Profile keys`, + `Reverting` if it overwrites live artifacts) | The block is absent, or scattered back across several `CRITICAL` sections |
| C2 | Every key in `Profile keys` exists in the project's profile template, and the skill declares all the ones it actually reads | A key is invented, missing, or the catalog and the skill disagree |
| C3 | No `\| In this document \| Key in profile.md \|` translation table | The table is still there |
| C4 | Normative literals replaced by their key | A path, branch or command the project configures is hardcoded in a step |
| C5 | No `## CRITICAL` heading the `Contract` already covers | `CRITICAL` used for language conventions, read paths or ordinary preconditions |
| C6 | The handoff holds: the previous skill's `Produces` covers this one's `Requires` | This skill requires something nobody produces, or produces something nobody consumes |
| C7 | The ecosystem's validator passes, if the project has one | It reports issues on this skill |

### How to check C2 and C6 without guessing

**C2** — read the profile template, not the catalog. Where a hand-maintained
"keys per skill" table disagrees with the skill's own `Contract`, treat **the table
as the suspect**: it's maintained by memory and drifts. Report the discrepancy;
don't silently fix the table from inside this evaluation.

**C6** — open the neighboring skill and read its `Contract`, both directions:

```
previous.Produces  ⊇  this.Requires      ← this skill can actually start
this.Produces      ⊇  next.Requires      ← the next one can actually start
```

Any `Requires` row with no producer is a finding against **whoever should produce
it**, not against the skill that needs it. Name both skills in the finding.

### What C4 looks like in practice

The failure this check exists for: a skill carried `| develop | BASE_BRANCH |` in its
translation table and, hundreds of lines below, still verified
`branch ∉ {main, master}` — passing through exactly the project the table was there
to cover. The table was correct and useless; the check was the contract.

---

## PHASE 7: Generate the trigger test battery

Derive the test cases from the `description` and the skill's examples — don't
invent them from nothing.

```
Should trigger:
- "<literal phrase from the description>"
- "<natural paraphrase of that phrase>"
- "<use case described in the skill's Examples>"

Should NOT trigger:
- "<query from the neighboring domain the description excludes>"
- "<generic unrelated query>"
- "<query another skill in the system should take>"
```

Aim for 10–20 queries if the user wants to measure seriously: the guidance's target
is triggering on **90% of relevant queries**. It's measured by running them and
counting how often it loads on its own vs. needs explicit invocation.

If there are other installed skills with neighboring scope, name them explicitly in
the report as a collision risk.

---

## PHASE 8: Report and close

### Report format

```markdown
## Evaluation: <skill-name>

**Verdict:** <Ready to use | Needs adjustments | Broken>
**Kind:** <Pipeline | Standalone>   ← standalone means group C doesn't apply
**Trigger risk:** <Under-triggering | Over-triggering | OK>

### Blocking (N)
| ID | Finding | Fix |
|---|---|---|

### Important (N)
| ID | Finding | Fix |
|---|---|---|

### Minor (N)
| ID | Finding | Fix |
|---|---|---|

### Suggested trigger tests
Should trigger: …
Should NOT trigger: …

### What I'd do first
1. <the highest-impact fix>
2. …
```

Report rules:
- **Order by severity**, not by order of appearance in the file.
- Every finding carries the concrete fix, not just the diagnosis.
- If a category has no findings, say so in one line — don't pad.
- Don't report as a problem what the guidance leaves to the author's judgment.
- **A C6 finding names both skills** — the one that requires and the one that should
  produce. The fix usually belongs to the neighbor, not to the skill under review.
- **Findings against a skill you weren't asked to evaluate are reported, not fixed.**
  Editing a neighbor from inside this evaluation leaves a change with no record of
  why it's there, and its own review won't know either.

### Handoff

Ask with `AskUserQuestion` (`header: "Fixes"`):
- `"Apply the blocking and important ones"` / `"Apply everything"` /
  `"Report only, don't touch anything"`.

If the user approves, apply the edits and show what changed. If not, stop.

Say:
> "Evaluation ready. Run the trigger queries in a clean session to verify the real
> behavior — the report predicts triggering, it doesn't measure it."

---

## Output language

**The skills reviewed and any edit applied are written in English.** Finding IDs
(B1, D3, E2, I4, C6), frontmatter field names, paths and code are always English.
So are structural headings that form a contract between skills (`## Contract`,
`## AC Coverage`, `Task N`) — a translated one is a C6 finding, not a style note:
the section is there and the next skill reports it missing.

When proposing `description` fixes, keep the triggers in the language the user
actually types — a trigger that never matches what the user writes is dead weight,
whatever language the rest of the file is in.

**Chat interaction (the report) follows the user's language.**

---

## Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| The skill can't be found | Misspelled path or skill in another scope | Run PHASE 1 Step 1's `find` over all three scopes (project, `~/.claude`, `~/.agents`) |
| `SKILL.md` is a symlink | Global skills linked from `~/.claude/skills` | Resolve the real target before editing: `readlink -f`; edit the original, not the link |
| The skill looks fine but doesn't trigger | Description technically correct but with no user language | Apply PHASE 3's debug technique and compare with what the user actually types |
| Two evaluated skills overlap | Overlapping scopes | Report the collision and propose cross negative triggers in both |
| The user says "just fix it" | They want to skip the report | Show the blocking summary anyway before editing — it's the only moment to decide scope |
| Huge but coherent skill | Progressive disclosure unused | Don't ask to cut content: ask to **move** it to `references/` and link it |
| Group C fires on a convention skill | It was classified pipeline without a real handoff | Reclassify as standalone (PHASE 1 Step 4) and drop the C findings — a contract with nothing on either side is noise |
| The `Requires` cites an artifact no skill produces | Junction never checked in both directions | C6: report it against the skill that should produce it, naming both |
| The neighbor changed while you were evaluating | Several skills reviewed in parallel | Re-check the junction with both sides in their final version — intermediate state produces phantom findings |
| The catalog and the skill declare different keys | The hand-maintained table drifted | Report the discrepancy; the profile template settles it. Historically the table has been the wrong side, so don't fix it from here (C2) |

---

## Example

**Input:** `/skill-evaluator ~/.claude/skills/report-builder`

**Flow:**
1. PHASE 1: resolves the symlink to `~/.agents/skills/report-builder`. Finds
   `SKILL.md` (6,200 words), `references/` (2 files), `README.md`. Step 4:
   **pipeline** — it reads `.agents/profile.md` and writes into `work/`.
2. PHASE 2: B10 fails → there's a `README.md` inside the folder. B1–B9 OK.
3. PHASE 3: D2 and D6 fail → `description: Generates reports.` No trigger phrases.
   Diagnosis: **under-triggering**.
4. PHASE 4: E2 fails (6,200 > 5,000 words). E3 fails → one of the `references/`
   isn't linked from `SKILL.md`.
5. PHASE 5: I4 fails → no error-handling section.
6. PHASE 6: C1 fails → no `## Contract`; preconditions scattered across three
   `CRITICAL` sections (also C5). C4 fails → Step 2 runs `git checkout develop`
   with the branch hardcoded, while the profile declares `BASE_BRANCH`.
7. PHASE 7: generates 3 positive and 3 negative queries from the Examples.
8. PHASE 8: report — 1 blocking, 5 important, 1 minor. Priority 1: rewrite the
   description with the user's phrases.

**Output:**
> "Evaluation ready: 1 blocking issue (`README.md` inside the folder), risk of
> **under-triggering** from a generic description. The highest-impact fix is
> rewriting the description. Should I apply the fixes?"
