#!/usr/bin/env bash
# validate-skills.sh — SDD ecosystem healthcheck (portable bash: Linux, WSL, Git Bash)
# Checks:
#   1. Every profile key referenced by the skills exists in sdd-profile.template.md
#   2. Every local references/<file> path referenced by a skill exists in that skill
#   3. Every <STACK_REFS>/<file> path exists in the generic and typescript-nestjs packs
# Usage: bash validate-skills.sh
set -u

# The checks use `grep -P`, which in Git Bash fails on non-UTF8 locales
# ("grep: -P supports only unibyte and UTF-8 locales"). Without this, the greps
# return empty and the script reports a FALSE GREEN ("1 keys, no issues")
# instead of failing. Force UTF-8 before any check.
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

if ! echo 'X' | grep -qoP 'X' 2>/dev/null; then
  echo "FAIL: this grep does not support -P (PCRE). Install GNU grep with PCRE or run under WSL." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS="$ROOT/skills"
TEMPLATE="$ROOT/sdd-profile.template.md"
STACKS="$ROOT/stacks"
PACKS="generic typescript-nestjs"
# An array, not a string: unquoted, the shell expands `*/skill-creator/*` against
# the cwd before find sees it ("paths must precede expression"), the three checks
# end up with no files to review and the script reports a FALSE GREEN.
NOT_META=( -not -path '*/skill-creator/*' -not -path '*/skill-evaluator/*' )

STOP_KEYS='^(AC|ACs|API|CI|DTO|DTOs|EARS|FAIL|FTS5|NEW|NEXT|OK|PASS|PR|REST|SQL|TDD|TODO|UI|UUID|YAML|X|Y|Z|M|N|P|A|B|C)$'
key_re='`\K[A-Z][A-Z0-9_]{2,}(?=`)'
refs_re='references/[A-Za-z0-9_./-]+\.md'
stack_re='<STACK_REFS>/\K[A-Za-z0-9_./-]+\.(md|sh)'

issues=0

# --- 1. Keys defined in the template ---
defined_keys=$(grep -oP "$key_re" "$TEMPLATE" | grep -E -v "$STOP_KEYS" | sort -u)

# --- 2. Keys referenced by the skills (non-meta) ---
referenced=$(find "$SKILLS" -type f -name '*.md' "${NOT_META[@]}" -exec grep -h -oP "$key_re" {} + | grep -E -v "$STOP_KEYS" | sort -u)

warnings=$(comm -23 <(printf '%s\n' "$referenced") <(printf '%s\n' "$defined_keys"))
if [ -n "$warnings" ]; then
  echo "WARNINGS — backticked tokens that are not profile keys (check whether any is new):"
  printf '%s\n' "$warnings" | sed 's/^/  /'
fi

# --- 3. Local references/<file> paths ---
while IFS= read -r file; do
  dir="$(dirname "$file")"
  while IFS= read -r rel; do
    if [ ! -f "$dir/$rel" ]; then
      echo "ISSUE [$file]: missing local file $rel"
      issues=$((issues+1))
    fi
  done < <(grep -oP "(?<![./])${refs_re}" "$file")
done < <(find "$SKILLS" -type f -name '*.md' "${NOT_META[@]}")

# --- 4. <STACK_REFS>/<file> paths ---
# The refs already carry the pack subfolder: `references/<f>` (mandatory in ALL
# packs) or `architecture/<f>` (per stack — existing in ONE is enough).
while IFS= read -r file; do
  while IFS= read -r f; do
    if [[ "$f" == architecture/* ]]; then
      found=0
      for pack in $PACKS; do
        [ -f "$STACKS/$pack/$f" ] && found=1
      done
      if [ "$found" -eq 0 ]; then
        echo "ISSUE [$file]: $f does not exist in any pack"
        issues=$((issues+1))
      fi
    else
      for pack in $PACKS; do
        if [ ! -f "$STACKS/$pack/$f" ]; then
          echo "ISSUE [$file]: missing from pack $pack: $f"
          issues=$((issues+1))
        fi
      done
    fi
  done < <(grep -oP "$stack_re" "$file")
done < <(find "$SKILLS" -type f -name '*.md' "${NOT_META[@]}")

if [ "$issues" -eq 0 ]; then
  echo "OK: $(printf '%s\n' "$defined_keys" | wc -l) profile keys, no issues."
  exit 0
else
  echo "ISSUES ($issues):"
  exit 1
fi
