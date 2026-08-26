# sdd-commit — worked example

What a real run looks like: the commit grouping and the drafted PR.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Examples

### Example 1: standard close after /sdd-sync

User says: "/sdd-commit spec-0009"

Actions:
1. Verify `work/done/spec-0009/` exists (`/sdd-sync` left it) and the current
   branch isn't the base branch.
2. `git status --porcelain` → detects 2 files already staged from a previous
   session that don't belong to this story; warn the user and
   `git restore --staged` those two before continuing.
3. `git add` Task 1's files, `git status --porcelain` to confirm the index,
   `git commit -m "feat(movement): add transfers between own accounts"`.
4. Repeat for Task 2 and for the archive commit.
5. Print the title `feat(movement): spec-0009 add transfers between own
   accounts`, the PR body, and the `gh pr create --base <BASE_BRANCH> …`
   command without running it.

Result: 3 real commits on the branch, clean working tree except for the
unrelated files, PR drafted and ready for the user to open.

### Example 2: automatic suggestion when /sdd-sync closes

Context: `/sync spec-0010` finished promoting docs and archiving the story.

Actions:
1. `/sdd-sync` suggests: "Run `/commit spec-0010` to execute the commits and leave the PR
   drafted."
2. If the user confirms, run the full workflow from Step 1.

Result: the story's close continues without the user having to assemble git
commands by hand.
