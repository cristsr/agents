# Legacy mode (`--ask`)

The interactive mode, kept for items whose terrain you want nothing decided on out
of your sight.

---

## Legacy mode (`--ask`)

With `--ask` there is no RPI
separation: every unknown is resolved with `AskUserQuestion`, one at a time, in a
loop, with no budget and no auto-resolution; EARS is offered rather than applied; and
the technical context is surveyed by asking (component, artifacts, patterns,
constraints, integrations, technical debt), one per turn. The code inventory and
`context.md` are produced all the same.

The build-mode question (P2b) is asked here too, under the same rule: `evidence` is
never assumed, and the eligibility conditions are identical.

Useful when the item touches terrain where you don't want anything decided out of your
sight — typically a new domain or strong contractual implications.

---
