# sdd-docs — worked example

What a real run looks like: a bootstrap and a surgical update.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Examples

### Example 1: bootstrap in a mono-repo

User says: "/sdd-docs"

Actions:
1. Neither `context.md` nor `containers.md` exist → Bootstrap mode.
2. `context.md`: one actor (User) + one external system (Keycloak, IdP).
3. `containers.md`: `apps/finances` (monolith, own DB, frozen) and
   `apps/ledger` (event sourcing + CQRS, own DB, active), `libs/shared`,
   each app's integration with Keycloak.

Result: `docs/architecture/` gets created with the repo's current topology,
correctly split across the two levels.

### Example 2: /sdd-sync promotes a cross-cutting story already flagged by /sdd-design

Context: `/sync spec-0015` closes a story that added `apps/notifications`
(new microservice, consumes ledger events via a new adapter). It doesn't add
any new actor or external system. `design.md` already carries:

```markdown
