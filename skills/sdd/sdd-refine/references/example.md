# sdd-refine — worked example

What a real run looks like: Direct and Guided mode on each artifact.
Read it when the shape of the output is in doubt; the rules themselves are in
`SKILL.md`.

## Example

### Direct Mode — refining design.md

**Input:**
> `/refine design spec-1933` — the DTO field should be `serviceTypeId` instead of `type`

**Flow:**
1. Target = design (explicit). Reads `work/active/spec-1933/spec.md` → extracts ACs: AC-2 "the field is called serviceTypeId in the contract"
2. Mode = Direct (change described)
3. Reads design.md → locates the DTOs section → shows the relevant ACs and the current content:
   > **Relevant ACs:** AC-2 — "the field is called serviceTypeId in the contract"
   ```typescript
   export class FilterZonesRequestDto {
     @IsNotEmpty()
     type: string;
   }
   ```
4. Confirms: "Do you want to rename `type` to `serviceTypeId`?" (no AC contradiction → proceeds)
5. Applies the change
6. Coherence: plan.md exists → warns
7. Handoff: "Design updated. Minor change — you can continue with the build."

---

### Direct Mode — refining spec.md

**Input:**
> `/refine spec spec-1933` — AC-2 should say "returns an empty list with status 200" instead of just "returns an empty list"

**Flow:**
1. Target = spec (explicit). No external reference is loaded — spec.md is the artifact being edited.
2. Mode = Direct (change described)
3. Reads `work/active/spec-1933/spec.md` → locates AC-2:
   ```
   ### AC-2: No results returns an empty list
   If there are no results, it returns an empty list.
   ```
4. Confirms: "Do you want to update AC-2 to include status 200?"
5. Applies the change (wording correction, no AC added/removed)
6. Coherence: minor change → no re-scan required
7. Handoff: "Story updated. The changes are minor — the existing artifacts are still valid."

---

### Guided Mode — refining context.md

**Input:**
> `/refine context spec-1933`

**Flow:**
1. Target = context (explicit). Reads `work/active/spec-1933/spec.md` → keeps the ACs in memory
2. Mode = Guided (no change described)
3. Shows the "Affected components" section with the related ACs:
   > **Relevant ACs:** AC-1 — "the system registers zones in the capabilities service"
   ```
   - catalog-ms
   ```
   → "Is this correct?"
4. User: "yes"
5. Shows the "Entity / persistence model" section with the related ACs → user: "the `deletedAt` field is missing"
6. Applies the change, continues
7. On finishing: "Context updated. When you're ready, run `/design spec-1933`."
