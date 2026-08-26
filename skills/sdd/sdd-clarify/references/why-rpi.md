# Why the run is shaped this way

The reasoning behind two choices in `clarify`: running inline instead of delegating
to a drafting subagent, and gathering all the evidence in a single research pass.
Read it when tempted to split the run or to hand it off.

---

> **Why not a drafting subagent:** clarifying is one sequential actor's job, and this
> document is its instructions. A subagent would have to re-read this file cold, then
> hand its state to a second cold subagent through a file on disk — paying the whole
> context twice over for work that has no parallelism to win back. Delegate for
> fan-out or for discardable bulk, never to move sequential work off your own desk.

It runs in **three strictly separated phases** (RPI). The separation is not
cosmetic — each phase needs the complete result of the previous one:

| Phase | Does | Does **not** do |
|---|---|---|
| **R — Research** | Gathers all evidence at once: ambiguities, authority sources, story assets, module inventory, code precedent, and what only the developer knows | Decides nothing, writes nothing |
| **P — Plan** | Decides **every** unknown with the problem and the terrain in view, and escalates in a single batch what no source determines | Writes nothing to disk |
| **I — Implement** | Writes the decision log, the precise ACs, and `context.md` | Decides nothing new |

**Why a single research pass:**
- A decision about an AC may rest on a port the inventory just found. Splitting the
  survey from the decision wastes that evidence.
- Graph queries — inventory and precedent — are fired **in the same batch**, in
  parallel.
- The escalation budget is applied against the **complete** list of unknowns: the ones
  coming from the ACs and the ones coming from the code, together and prioritized once.
- A constraint the developer mentions ("don't touch X's contract") arrives **before**
  deciding, not after the files have been written.
