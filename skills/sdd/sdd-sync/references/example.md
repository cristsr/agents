# sdd-sync — worked example

What a real run looks like: a close-out reconciling the docs.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Examples

### Example 1: standard close after /sdd-build

User says: "/sdd-sync spec-0009"

Actions:
1. Read `.agents/profile.yaml` and verify `work/active/spec-0009/` with the plan
   fully done (`[X]` on every task).
2. `git branch --show-current` → `feat/spec-0009-transfers`; `git status
   --porcelain` → 14 files changed, all from the story.
3. With the user's go-ahead, call `CI_GATES.run` with `finances` as `<apps>` → all
   green.
4. Promote `docs/diagram.md` and `docs/api.yaml` to
   `apps/finances/docs/movement/` (design points to the `movement` module).
5. `design.md` has a "Design Decisions" section → append a new entry at
   the top of `docs/decisions.md`.
6. `mv work/active/spec-0009 work/done/spec-0009`.
7. `design.md`'s "Global Architecture Impact" says **No** → skip
   silently, no need to inspect the diff.
8. Suggest: "Run `/commit spec-0009` to group and execute the commits and leave the PR
   drafted."

Result: documentation synced, story archived, and the user knows the next
step (`/sdd-commit`).

### Example 2: a story that does touch global architecture

Context: `/sync spec-0015` closes a story that added `apps/notifications`.
`design.md` has:

```markdown
