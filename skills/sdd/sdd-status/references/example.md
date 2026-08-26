# sdd-status — worked example

What a real run looks like: a report and the next step it names.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/status spec-0042`

**Flow:** runs `status.mjs spec-0042 --json` and reads the answer. Nothing is written.

**Output:**
> `spec-0042` · active · `feat/SPEC-0042-transfer-projector`
> - spec.md ✓ · context.md ✓ · design.md ✓ · plan.md ✓ (7/11 tasks)
> - Stage: **build** — 4 tasks pending, resumes at Task 8.
> - Next: `/build spec-0042`

**Input:** `/sdd-status` — with no id.

**Output:** one line per active story with its stage, then the same for `WORKDIR_DONE`.
No "next step" line: with several stories open, the command belongs to whichever one
the user picks.
