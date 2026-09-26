# Legacy mode (`--ask`)

The interactive mode, kept for items whose terrain you want nothing decided on out
of your sight.

---

## Legacy mode (`--ask`)

With `--ask` there is no RPI
separation: every unknown is resolved with `AskUserQuestion`, one at a time, in a
loop, with no budget and no auto-resolution; EARS is offered rather than applied; and
the technical context (constraints, technical debt) is asked one question per turn.
`context.md` is still read as evidence and the same `Requires` apply — a `fast` story
never reaches this mode either.

Useful when the item touches terrain where you don't want anything decided out of your
sight — typically a new domain or strong contractual implications.

---
