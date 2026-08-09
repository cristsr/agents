---
name: healthcheck
description: >
  Validates the consistency of the SDD skill ecosystem: profile keys referenced
  by skills vs. the template, local references/ paths, and STACK_REFS pack files.
  Use when the user says "/healthcheck", "validar skills", "auditar el ecosistema",
  "verificar consistencia", "chequear el profile", or after editing skills/profile
  to confirm nothing is broken. Read-only — never modifies files.
---

# healthcheck

## Overview

Corre el script `~/.agents/scripts/validate-skills.sh` (bash portable — Linux,
WSL o Git Bash), que verifica en tres ejes:

1. **Claves de profile** — toda clave que las skills referencian existe en
   `sdd-profile.template.md` (las que no, salen como aviso para revisar si son
   keys nuevas o tokens de prosa).
2. **Rutas locales** — toda `references/<file>` que una skill consulta existe en
   esa skill (ignora rutas cross-skill `../<skill>/references/...`).
3. **Packs de stack** — toda `<STACK_REFS>/<file>` existe en los packs `generic`
   y `typescript-nestjs`.

**Announce at start:** "Validando consistencia del ecosistema SDD."

## Step 1: Run the validator

```bash
bash "$HOME/.agents/scripts/validate-skills.sh"
```

También validar el profile del proyecto actual (si hay uno): que todas las claves
que las skills leen existan en `.agents/profile.md` del proyecto, y que los valores
apuntan a rutas reales (`STACK_REFS`, `WORKING_DIRECTORY`, `WORKDIR_ACTIVE`, ...).

## Step 2: Report

- **Sin issues** → "Ecosistema consistente: <N> claves de profile, packs y references OK."
- **Con issues** → listarlos con su causa probable y la corrección:
  - Clave faltante en la plantilla → agregarla a `sdd-profile.template.md`.
  - `references/` inexistente → crear el archivo o corregir la referencia.
  - Pack faltante → copiar el template al pack o corregir la referencia.
- **Avisos (tokens no-key)** → mencionarlos brevemente; solo requieren acción si
  alguno es una clave de profile nueva que faltó registrar en la plantilla.

## Step 3: Hand off

Si todo pasa, sugerir: "Después de cambiar skills o profile, corré `/healthcheck` para confirmar que nada se rompió."

No hacer más nada — es una skill de diagnóstico, read-only.
