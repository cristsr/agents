#!/usr/bin/env bash
# validate-skills.sh — healthcheck del ecosistema SDD (bash portable: Linux, WSL, Git Bash)
# Checks:
#   1. Toda clave de profile referenciada por las skills existe en sdd-profile.template.md
#   2. Toda ruta local references/<file> referenciada por una skill existe en esa skill
#   3. Toda ruta <STACK_REFS>/<file> existe en los packs generic y typescript-nestjs
# Uso: bash validate-skills.sh
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS="$ROOT/skills"
TEMPLATE="$ROOT/sdd-profile.template.md"
STACKS="$ROOT/stacks"
PACKS="generic typescript-nestjs"
NOT_META="-not -path */skill-creator/* -not -path */skill-evaluator/*"

STOP_KEYS='^(AC|ACs|API|CI|DTO|DTOs|EARS|FAIL|FTS5|NEW|NEXT|OK|PASS|PR|REST|SQL|TDD|TODO|UI|UUID|YAML|X|Y|Z|M|N|P|A|B|C)$'
key_re='`\K[A-Z][A-Z0-9_]{2,}(?=`)'
refs_re='references/[A-Za-z0-9_./-]+\.md'
stack_re='<STACK_REFS>/\K[A-Za-z0-9_./-]+\.(md|sh)'

issues=0

# --- 1. Claves definidas en la plantilla ---
defined_keys=$(grep -oP "$key_re" "$TEMPLATE" | grep -E -v "$STOP_KEYS" | sort -u)

# --- 2. Claves referenciadas por las skills (no-meta) ---
referenced=$(find "$SKILLS" -type f -name '*.md' $NOT_META -exec grep -h -oP "$key_re" {} + | grep -E -v "$STOP_KEYS" | sort -u)

warnings=$(comm -23 <(printf '%s\n' "$referenced") <(printf '%s\n' "$defined_keys"))
if [ -n "$warnings" ]; then
  echo "AVISOS — tokens en backticks que no son claves de profile (revisar si alguna es nueva):"
  printf '%s\n' "$warnings" | sed 's/^/  /'
fi

# --- 3. Rutas locales references/<file> ---
while IFS= read -r file; do
  dir="$(dirname "$file")"
  while IFS= read -r rel; do
    if [ ! -f "$dir/$rel" ]; then
      echo "ISSUE [$file]: falta archivo local $rel"
      issues=$((issues+1))
    fi
  done < <(grep -oP "(?<![./])${refs_re}" "$file")
done < <(find "$SKILLS" -type f -name '*.md' $NOT_META)

# --- 4. Rutas <STACK_REFS>/<file> ---
# Las refs ya llevan el subcarpeta del pack: `references/<f>` (obligatorio en TODOS
# los packs) o `architecture/<f>` (por stack — alcanza con que exista en UNO).
while IFS= read -r file; do
  while IFS= read -r f; do
    if [[ "$f" == architecture/* ]]; then
      found=0
      for pack in $PACKS; do
        [ -f "$STACKS/$pack/$f" ] && found=1
      done
      if [ "$found" -eq 0 ]; then
        echo "ISSUE [$file]: $f no existe en ningún pack"
        issues=$((issues+1))
      fi
    else
      for pack in $PACKS; do
        if [ ! -f "$STACKS/$pack/$f" ]; then
          echo "ISSUE [$file]: falta en pack $pack: $f"
          issues=$((issues+1))
        fi
      done
    fi
  done < <(grep -oP "$stack_re" "$file")
done < <(find "$SKILLS" -type f -name '*.md' $NOT_META)

if [ "$issues" -eq 0 ]; then
  echo "OK: $(printf '%s\n' "$defined_keys" | wc -l) claves de profile, sin issues."
  exit 0
else
  echo "ISSUES ($issues):"
  exit 1
fi
