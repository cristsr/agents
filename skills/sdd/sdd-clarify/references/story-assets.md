# Story assets — reading the item's own material

What R2b does with the `assets/` folder of a story workspace: how to find it, how to
read it, and what authority its contents carry against the rest of the hierarchy.

---

### R2b — Read the story's assets (optional)

The story workspace may carry an `assets/` folder with material that grounds the
clarification — mockups, screenshots, wireframes, a signed contract, a data export.
Not every spec has one; check for it, and continue without comment when it's absent:

```bash
[ -d work/active/spec-<number>/assets ] && find work/active/spec-<number>/assets -type f || echo "NO_ASSETS"
```

When it exists:

- List every file recursively and **read each one** with Read — images and PDFs
  included, so mockups, screenshots and contracts are real evidence, not decoration.
- Treat them as **level-3 authority (`story assets`)** in `decision-authority.md`: the
  item's own concrete material outranks code precedent for *this* item's unknowns.
  `docs/rules.md` (level 1) and `CLAUDE.md`/`profile.yaml` (level 2) still beat it.
- An asset that **states** the answer (a signed contract, a finalized spec) is
  high-confidence evidence; one that only **suggests** it (a mockup, a sketch) is
  medium — the distinction is `decision-authority.md` §4.
- Note what you couldn't parse (an opaque binary, a scanned PDF with no extractable
  text) and carry that gap into the dossier — **never guess** what an unreadable
  asset says.
- Assets are **read-only evidence**: never modified, never copied wholesale into
  `context.md`. Only the conclusions drawn from them — cited as `assets/<file>` —
  go into the decision log.
