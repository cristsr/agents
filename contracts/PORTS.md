# Ports — the capabilities the skills depend on

A skill never names a tool. It names a **capability** and calls it: "run `TESTS.module`
for this module", "run `CONTRACT_LINT.run` over this file". Which command, agent or MCP
tool actually provides that capability is declared per project in the profile's `ports`
block, and nowhere else.

This file is the interface. The profile is the wiring. The skills are the domain.

```
skill  ──calls──▶  PORT.operation  ◀──implements──  adapter (profile)
(domain)           (this catalog)                   (project config)
```

Two consequences worth stating plainly, because they are what the split buys:

- **A project changes its stack without touching a skill.** Swap Jest for pytest in
  one profile line; `/build` is unchanged, because it never knew about Jest.
- **A skill states its degraded behavior once, in its own `Degrades` row.** What
  happens when a capability isn't available is a domain decision — the profile has no
  say in it, and cannot turn a warning into a blocker by configuration.

---

## Declaring adapters (profile)

Every port is a map of **operation → ordered list of adapters**. Ports with a single
operation use `run`.

```yaml
ports:
  TESTS:
    module:
      - npx jest src/modules/<module>/ --no-coverage
    full:
      - npx jest --no-coverage
  CONTRACT_LINT:
    run:
      - python -c "import yaml,sys; yaml.safe_load(open(sys.argv[1], encoding='utf-8'))" <file>
      - npx js-yaml <file>
  CODE_SURVEY:
    run:
      - mcp:mcp__codegraph__codegraph_explore
      - agent:code-explorer?model=sonnet
      - inline
```

### Adapter forms

| Form | Meaning | Available when |
|---|---|---|
| `<shell command>` | Run it, with the operation's placeholders substituted | the executable resolves |
| `mcp:<tool>` | Call that MCP tool | the tool is present in the session |
| `agent:<name>` | Delegate to that subagent; `?model=<model>` overrides its frontmatter | the host supports subagents |
| `inline` | The skill does it itself with its own file tools | always — it ends the chain |

`mcp:` tool names are harness-specific: Claude Code spells them
`mcp__<server>__<tool>`, opencode `<server>_<tool>` (e.g. `codegraph_codegraph_explore`).
The consuming skill calls the spelling its harness uses.

### Layered packs, then profile

Adapters resolve in layers. `STACK_REFS` is a **list** of packs, ordered base →
specific — a language pack (`~/.agents/stacks/typescript`) carries the ecosystem
defaults, a framework pack on top of it (`~/.agents/stacks/nestjs`) adds its
concretion. Each pack's `ports.yaml` carries the **stack idiom** — how a project on
that layer usually runs its tests, lints a contract, exports a collection — and a
later pack's operation replaces an earlier one's. The profile carries **this
project's facts** and overrides on top of everything:

| In the profile | Meaning |
|---|---|
| `null`, or the operation omitted | Inherit the pack's adapters |
| `[ … ]` | Use these instead of the pack's |
| `[]` | Explicitly unbound: ignore the pack, this project doesn't have the capability |

**Inheritance is per operation, not per port.** Binding `TESTS.full` to a project's own
CI script leaves `TESTS.module` inherited from the packs. A project with no `STACK_REFS`
has no first layer, so `null` there simply means unbound.

The split has a rule of thumb: if the answer would be the same in any project of this
stack, it belongs in a pack; if it depends on how *this* repo is wired — an nx
target, a custom npm script, a CI entry point — it belongs in the profile. That is why
the `typescript` pack binds `TESTS.module` to `npx jest <module>` but leaves
`CI_GATES` empty, and why `nestjs` binds nothing at all: every TS repo filters Jest
the same way, no two of them run their gates alike, and Nest adds no adapter the
language pack doesn't already provide.

### Resolution rules

1. **First available adapter wins.** The list is preference order, not a sequence to
   run through.
2. **Available is not the same as successful.** If an adapter resolves and then exits
   non-zero, that is a *real failure* and it propagates to the skill. The next adapter
   is **not** tried. Without this rule a red test suite would silently fall through to
   another runner and report green.
3. **A port with no adapters after both layers resolve is unbound.** The skill then
   applies the `Degrades` row of its own contract.
4. **`inline` is always available**, so any chain ending in it is never unbound.

### Placeholders

Each operation below declares the placeholders it accepts — that is the port's
signature. A skill substitutes them; it doesn't invent new ones. If a declared adapter
omits a placeholder, the value is simply not passed: the project chose a command that
doesn't need it.

---

## The catalog

### `TESTS` — run the project's test suite

| Operation | Placeholders | Contract |
|---|---|---|
| `module` | `<module>` | Runs the tests covering one module. Exit 0 = green. |
| `full` | `<component>` | Runs a whole component's suite. Exit 0 = green. |

Consumed by `/build` (the TDD cycle and the pre-review run), `/hotfix`, `/forge`.
`module` is the hot path — it runs on every red-green-refactor turn, so it must be
the narrowest command the stack allows.

### `VERIFY` — check a deliverable that no test suite covers

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<target>` | Checks one deliverable. Exit 0 = the evidence is green. |
| `full` | `<component>` | The closing check over a whole component. Exit 0 = green. |

Consumed by `/plan`, `/build`, `/hotfix` and `/forge` **only when the story runs in
`build_mode: evidence`** — the story declares in its front matter that its acceptance
criteria are closed with executable evidence rather than with a test written red-first.
In `build_mode: tdd` (the default) this port is never called and `TESTS` keeps the hot
path unchanged.

What it runs is whatever actually proves the deliverable: a schema validator over a
Markdown artifact, a linter over a config file, a migration dry-run, a docs link check.
The contract is the exit code, exactly as in `TESTS`.

**This port is not optional in its mode.** A story in `build_mode: evidence` whose
`VERIFY` is unbound stops — it does not degrade to "reviewed by eye". That is the same
rule as `TESTS.module` unbound in `tdd`, and it is what keeps the relaxed mode from
becoming an escape hatch: without a way to verify, there is no evidence to close an AC
with.

### `CI_GATES` — the gates CI would run

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<apps>` | lint + test + build over the affected apps. Exit 0 = all gates pass. |

Consumed by `/sync` before closing a story. `/commit` names its result in the PR body
without running it.

### `CONTRACT_LINT` — the API contract file is syntactically valid

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<file>` | Exit 0 = parses. Any output on failure should carry the line. |

Consumed by `/design` and `/refine` after writing the contract artifact.

### `CONTRACT_DIFF` — classify a contract change

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<old>`, `<new>` | Reports whether the change is breaking or non-breaking. |

Consumed by `/sync` when merging a delta into a module's canonical contract, and named
by `/design` when it flags a risk.

### `DIAGRAM_CHECK` — every identifier in the diagrams names a real symbol

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<file>` (optional — most projects validate the whole docs tree) | Exit 0 = no drift. |

Consumed by `/design` and `/sync`. This is the gate that keeps docs-as-code honest;
without it diagrams drift into fiction, which is why the profile validator warns when
docs-as-code is on and this port is unbound.

### `API_CLIENT_EXPORT` — turn the contract into an importable client collection

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<input>`, `<output>` | Writes the collection to `<output>`. |

Consumed by `/build`. Never blocking: a missing collection costs a manual import, not
a broken story.

### `PROJECT_GRAPH` — the repo's app/lib dependency graph

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<out>` | Writes the graph where `/docs` can read it. |

Consumed by `/docs` when bootstrapping, as an extra reference over the manual
survey — never as the only source.

### `CODE_SURVEY` — inspect the codebase to answer a structural question

| Operation | Placeholders | Contract |
|---|---|---|
| `run` | `<module>`, `<symbol>` | Returns the module's inventory, call paths and blast radius as the adapter can. |

Consumed by `/clarify` and `/scan`. (`/hexagonal-audit` does **not** use it: it runs
the audit script from its own stack pack, which answers a different question.) This
port replaces the three keys that used to describe one capability — a code graph
setting, an explorer agent and its model — and its adapters differ in **depth, not
availability**:

| Adapter | Returns |
|---|---|
| `mcp:mcp__codegraph__codegraph_explore` | symbols, call paths, blast radius — the only one that answers "what breaks if I change this" |
| `agent:code-explorer` | a structured inventory from reading files, without call paths |
| `inline` | the same inventory, but spent against the main context |

A skill that needs call paths must say so and handle their absence — the port
guarantees an inventory, not a graph.

---

## Adding a port

A new port is a change to this catalog first: name the capability, define its
operations and placeholders, and list which skills consume it. Then declare its
adapters in the template, and only then call it from a skill. The order matters —
`validate-skills.mjs` checks that every port a skill calls exists here, and
`validate-profile.mjs` checks that every port declared in a profile exists here too.
A port invented in a skill fails both.
