# skill-creator — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| Enormous `SKILL.md` | Everything inline instead of progressive disclosure | Move the detail into `references/` and link it |
| Clashes with an existing skill | Overlapping scopes | Add negative triggers to both (`Do NOT use to…`) |
| Invalid name | Spaces, uppercase or underscores | Convert to kebab-case: `My Cool Skill` → `my-cool-skill` |
| Empty `Contract` rows on a standalone skill | The template got filled in without running PHASE 2 Step 4 | Delete the block. No handoff, no contract — invented rows train the reader to skim it |
| `Produces` that nobody can check ("leaves the module documented") | Written for the author, not for the next skill | Restate as a count or a file that either exists or doesn't |
| The skill hardcodes a path or branch the project configures | The literal was never classified as normative | Replace with the key inline, example in parentheses; add it to `Profile keys` |
