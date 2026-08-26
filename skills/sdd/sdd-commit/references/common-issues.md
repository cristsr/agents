# sdd-commit — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| There are unrelated changes in the working tree | Other work in progress on the same branch | Exclude them from every `git add` and list them separately in the summary |
| A commit was created with the wrong grouping | The index wasn't verified before committing | `git reset --soft HEAD~1` puts it back in the index (working tree untouched); regroup and commit again — only valid while nothing has been pushed |
