# skill-creator — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|---|---|---|
| `SKILL.md` body over ~500 lines | Everything inline instead of progressive disclosure | Move the detail into `references/`, one level deep, and link it |
| Instructions explain what Claude already knows | Written from assumptions, not from the baseline | Cut every section that fixes no `baseline` entry and states no rule Claude couldn't know |
| Loose prose on a fragile operation | Degree of freedom not matched to fragility | Replace it with exact steps or a script to run |
| A reference sends the reader to another reference | Nested references | Flatten: link every reference directly from `SKILL.md` |
| The evals were written after the instructions | PHASE 2 skipped | Run the baseline now; delete what it shows Claude didn't need |
| Clashes with an existing skill | Boundary drawn wrong (PHASE 1 Step 3 skipped) | Decide who owns each shared trigger; add cross negative triggers. If both sides need many, redraw the boundary |
| A piece with no trigger of its own became a skill | Granularity over discovery | Fold it into the skill that uses it, as a reference or a script |
| Invalid name | Spaces, uppercase or underscores | Convert to kebab-case: `My Cool Skill` → `my-cool-skill` |
| Generic name (`helper`, `utils`, `tools`) | Named after the mechanism, not the job | Name the job, preferably as a gerund: `processing-invoices` |
| Description in first or second person | "I can…" / "You can use this to…" | Rewrite in third person: "Processes…" |
| Empty `Contract` rows on a standalone skill | The template got filled in without running PHASE 3 Step 4 | Delete the block. No handoff, no contract — invented rows train the reader to skim it |
| `Produces` that nobody can check ("leaves the module documented") | Written for the author, not for the next skill | Restate as a count or a file that either exists or doesn't |
| The skill hardcodes a path or branch the project configures | The literal was never classified as normative | Replace with the key inline, example in parentheses; add it to `Profile keys` |
