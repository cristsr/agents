# When the survey comes back without call paths

Read this only when the `CODE_SURVEY` adapter returns an inventory but no call
paths — a project with no indexed graph. The inventory is unaffected either way;
what changes is how precedent gets resolved.

---

#### Fallback — the survey came back without call paths

When `CODE_SURVEY` resolves to an adapter that returns an inventory but no call paths:

1. If the project has a graph adapter declared but no index on disk, suggest building
   it once — after that it stays auto-synced.
2. The **inventory** still arrives, one call per component, **in parallel**. When the
   adapter is an agent, the prompt must include: component name, item keywords, the
   instruction to read the component's docs, locate the module, and the `<STACK_REFS>`
   `scan-guide.md` — which **overrides the agent's own generic table**.
3. **Precedent** queries are not delegated as searches of their own: without a graph
   they're expensive. You lean on whatever verbatim citations the inventory already
   brought back; whatever remains uncovered is resolved with level 5-6 sources.
