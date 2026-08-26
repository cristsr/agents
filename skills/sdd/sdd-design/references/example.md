# sdd-design — worked example

What a real run looks like: a design run and the artifacts it leaves.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

**Input:** `/design spec-1933` — an endpoint that filters zones by service type,
already clarified. Profile: `API_CONTRACT_MODE: delta`, `DOC_UNIT: story`.

**Flow:**
1. **Step 1:** the four `Requires` rows pass — `spec.md`, `context.md`, and
   `grep -c 'NEEDS CLARIFICATION'` returns `0`.
2. **Step 2 (PHASE 1-2):** loads the artifacts and the constitution
   (`docs/rules.md` found). PHASE 2 raises two unknowns: whether the filter paginates,
   and whether an unknown service type is a 400 or an empty 200.
3. **Step 3 (PHASE 3):** asks them **one at a time** — the second question changes
   depending on the first. Both answers become `## Design Decisions` bullets.
4. **Step 4 (PHASE 3.5, 4, 4.5):** no `research.md` (both decisions were forced by
   existing patterns). Writes `docs/api.delta.yaml` with the path and the two schemas,
   `docs/diagram.md`, and updates the module's existing `docs/component.md`
   surgically. No `## Data Modeling` — the story adds no table. The four gates pass.
5. **Step 5:** `CONTRACT_LINT` is unbound → syntax reviewed by hand and noted in
   `design.md`. Check 2 (`grep -n '<[a-z]'`) returns nothing. `DIAGRAM_CHECK` flags
   `FilterZonesUseCase` as unknown — expected, this story creates it — so it stays
   recorded as a known risk instead of renamed.
6. **Step 6 (PHASE 5):** summary + STOP for review.

**Output:**
> "Designed `catalog-ms`: 1 endpoint on the `zones` collection, 2 schemas, no data model.
> Global Architecture Impact: **No**. Quality Gates: 4/4 ✅.
> `CONTRACT_LINT` unbound — contract reviewed manually.
> **STOP:** review `docs/api.delta.yaml` before continuing. When ready, `/plan spec-1933`."
