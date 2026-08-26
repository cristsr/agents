# sdd-rules — failure modes that don't stop the run

The ones that stop a run stay in `SKILL.md`, where the decision to abort is made.
These are the rest: what to do when the run can continue.

| Issue | Cause | Resolution |
|-------|-------|------------|
| Vague principles ("good code") | Non-testable answer | Ask again for the objective rejection criterion in review |
| Too many articles (>10) | Negotiable and non-negotiable got mixed | Prioritize; move the negotiable ones to `docs/` |
| File exists but is empty (0 bytes) | Prior scaffolding never populated | Treat as Create mode, version 1.0.0 |
| User doesn't know what to put | Project with no written conventions | Seed from `DOCS_ARCHITECTURE`/CONTRIBUTING if they exist, or use the gate defaults |
| An article is flagged as not normative | The Principle is phrased without MUST / SHALL / NEVER — often because it was translated ("debe") | The keyword stays English; it is what the validator tests and what makes the rule normative |
| "no gates checked" warning | Every gate was disabled in PHASE 4, leaving the checkbox list empty | Keep the section with at least one gate line; an empty list reads as an oversight, not as a decision |
| The constitution is written but `/sdd-design` and `/sdd-plan` ignore it | It lives somewhere other than `docs/rules.md` | The four consumers hard-code that path and degrade silently. Move the file there and leave a link at the preferred location |
| `/sdd-design` says the constitution has no gates it can apply | Gates recorded as prose instead of `- [ ]` checkboxes | They are a binary checklist; write them as checkboxes |
