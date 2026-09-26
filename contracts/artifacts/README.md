# Artifact contracts — the artifacts one stage hands to the next

A pipeline artifact is never one skill's private output. `/sdd-design` writes the API
contract; `/sdd-refine` corrects it; `/sdd-plan` reads it as the source of truth for the
DTOs it generates; `/sdd-build` exports a client collection from it; `/sdd-sync` merges it
into the module's canonical file. Five skills, one artifact — and the rules for that
artifact used to live in all five of them plus the stack packs, where nothing kept them
from drifting apart.

`contracts/artifacts/<artifact>/` is that artifact's single home:

```
contracts/artifacts/api-contract/
├── CONTRACT.md                 what it requires, how it is generated, how it is
│                               checked, who may change it, who reads it
├── template.md                 the generic floor the writer starts from
└── openapi-to-dto-mapping.md   a second floor, for the pack that overrides that too
```

## What belongs here, and what does not

The rule, restated from the repository README: **what more than one skill must agree on
lives in `contracts/`; what a single skill consults on its own lives in that skill's
`references/`.**

An artifact's shape, its generation rules, its validation gates, its mutability and the
guarantees it owes are each read by three or more skills, so they belong here. The order of the
steps that produce a *set* of artifacts, and which artifacts a given mode emits, is one
skill's own procedure and stays in that skill.

**A stack pack still overrides a template.** `floors` maps the `<STACK_REFS>` path a pack
may replace to the file in this folder that is the floor — what a project with no pack, or
a pack that carries nothing for that path, resolves to. The contract owns the floor; the
pack owns its concretion.

## The file

The folder's name is the artifact's name; nothing restates it. **Front matter is optional**,
and carries only what a script cannot infer from the file itself:

```yaml
---
floors:
  references/api-template.md: template.md
---
```

| Key | Meaning |
|---|---|
| `floors` | The `<STACK_REFS>` paths a pack may override, mapped to the file here that is the floor when no pack provides one. |
| `headings` | The structural headings a script looks up by name, spelled exactly as it looks them up — the drift guard, present only where a script enforces them. |

A contract declaring neither carries no front matter at all. `floors` is what lets a stack
pack keep overriding a template without the template existing twice. `headings` keeps the
names a validator greps for declared beside the artifact, so a rename on either side goes red
rather than leaving a check that hunts a heading nothing writes any more.

**A contract never names the skill that produces it, nor the skills that read it.** Who
calls it is the caller's business, declared in that skill's own `Contract` block — which is
where the junction is checked. This folder states the artifact: what it is, what it requires,
how it is built, how it is checked, what may change afterwards, and what any taker may rely
on. A contract that has to be edited when a caller is renamed is not a contract; it is a
dependency index.

The body carries these sections, in this order:

| Section | What it states |
|---|---|
| `## Identity` | The file name and the path pattern it lands on, per profile key. When it exists, and when it does not. |
| `## Requires` | What must be true before it can be written — countable, each with its check and the failure it produces. |
| `## Shape` | The normative structure: headings, tables, front matter, and which parts are conditional. |
| `## Generation` | How it is built: which input feeds which field, and what may never appear in it. |
| `## Validation` | Every gate, as the command or port call that runs it, plus what a failure does. |
| `## Mutability` | What may change once the artifact is written, and what a change costs. |
| `## Guarantees` | What any taker may rely on: which parts are read verbatim, which are merged, which are the source of truth for what. |
| `## Degrades` | Optional. What is lost when a port one of its gates needs is unbound. |

**A contract states; it does not narrate.** The producing skill carries the step order and
the conversation; this file carries the artifact's rules. When the two disagree, this file
is right and the skill is the defect — that is the whole reason the artifact no longer has
two owners.

Two repository-wide rules bind every artifact here, and no contract restates them: an
artifact **never names the pipeline** that produced it, and every path it writes down is
**relative to the project**. Both are enforced by `~/.agents/scripts/validate-artifacts.mjs`;
name the check, not the rule.

## Adding a contract

1. Create `contracts/artifacts/<artifact>/CONTRACT.md` — the sections above, plus front
   matter only if the artifact floors a pack-overridable template or has script-enforced
   headings — and the floor file it needs.
2. Delete the copies it replaces: the skill-local `references/<x>-template.md`, and the
   pack copy that is now the floor. Keep the packs that genuinely override it, and record
   each as a `floors` key. A floor that exists twice drifts, and the drift is silent.
3. Point the skills that produce and consume it at the contract, instead of restating the
   rules in each of them — the contract itself stays silent about who they are.
4. Cite it as `~/.agents/contracts/artifacts/<artifact>/CONTRACT.md` — that form is
   checked, so a moved contract fails the build rather than a reader.
5. Run `node ~/.agents/scripts/validate-skills.mjs`: it checks the front matter, the
   sections, the floors, and that every skill named exists.
