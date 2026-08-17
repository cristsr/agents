#!/usr/bin/env bash
# Hexagonal architecture — boundary scan.
#
# Usage:  bash scripts/audit-scan.sh <src-dir>
# Example: bash scripts/audit-scan.sh apps/nexus/src
#
# Prints one section per detector. Every hit is a LEAD, not a finding:
# open the file and confirm before reporting it. Exit code is always 0 —
# this script reports, it does not gate.

set -uo pipefail

SRC="${1:-src}"

if [ ! -d "$SRC" ]; then
  echo "audit-scan: '$SRC' is not a directory" >&2
  echo "usage: bash scripts/audit-scan.sh <src-dir>" >&2
  exit 2
fi

if command -v rg >/dev/null 2>&1; then
  GREP() { rg -n --no-heading "$@" 2>/dev/null; }
else
  GREP() { grep -rn "$@" 2>/dev/null; }
fi

section() { printf '\n===== %s\n' "$1"; }
none()    { echo "  (none)"; }

run() {
  local out
  out="$(eval "$1")"
  if [ -z "$out" ]; then none; else echo "$out"; fi
}

echo "Hexagonal boundary scan over: $SRC"

# ---------- HIGH: dependency direction ----------

section "HIGH  framework / ORM / decorators inside domain/"
run "GREP -e '@Injectable' -e '@Schema' -e '@Prop' -e '@nestjs' -e 'class-validator' '$SRC'/*/domain/ '$SRC'/shared/domain/"

section "HIGH  infrastructure leaking into application/"
run "GREP -e 'mongoose' -e '@InjectModel' -e 'typeorm' -e 'axios' -e '@shared/infrastructure' '$SRC'/*/application/"

section "HIGH  configuration read above infrastructure"
run "GREP -e 'process\.env' -e 'ConfigService' '$SRC'/*/application/ '$SRC'/*/domain/"

section "HIGH  ports declared as interface (cannot be a DI token)"
run "GREP -e 'export interface .*Port' -e 'export interface .*Repository' '$SRC'"

section "HIGH  domain entity used as persistence schema"
run "GREP -l -e '@Schema' '$SRC'/*/domain/ "

# ---------- MEDIUM: topology ----------
#
# These four read the shape of the tree, not its contents, and they are the only
# detectors that catch a defect every module shares. Grep-based detectors compare
# a file against a rule; these compare the tree against the canonical layout, and
# against itself.

section "MEDIUM  files loose at a layer root (should live in a role folder)"
echo "  a layer root carries folders and its barrel — nothing else"
echo "  domain/ is excluded here: a single-entity domain may be flat (see next section)"
run "for l in \$(find '$SRC' -mindepth 2 -maxdepth 2 -type d \\( -name application -o -name infrastructure \\) | sort); do find \"\$l\" -maxdepth 1 -type f -name '*.ts' -not -name 'index.ts'; done"

section "MEDIUM  use-case folders beside role folders in application/"
echo "  the first level of application/ is roles only; use cases nest under usecases/"
echo "  listed: application/ dirs holding *.usecase.ts, *.handler.ts or *.command.ts directly"
run "for a in \$(find '$SRC' -mindepth 2 -maxdepth 2 -type d -name application | sort); do
  for c in \$(find \"\$a\" -mindepth 1 -maxdepth 1 -type d | sort); do
    case \"\$(basename \"\$c\")\" in usecases|use-cases) continue;; esac;
    hits=\$(find \"\$c\" -maxdepth 1 -type f \\( -name '*.usecase.ts' -o -name '*.handler.ts' -o -name '*.command.ts' -o -name '*.query.ts' \\) | head -1);
    [ -n \"\$hits\" ] && echo \"\$c\";
  done;
done"

section "MEDIUM  files at a module root (only <module>.module.ts belongs there)"
run "find '$SRC' -mindepth 2 -maxdepth 2 -type f -name '*.ts' -not -name '*.module.ts' -not -name '*.module.spec.ts' -not -name 'index.ts' | sort"

section "LOW  role folders per layer (compare the modules against each other)"
echo "  a module whose row differs from the rest is either a gap or an undocumented convention"
run "for l in \$(find '$SRC' -mindepth 2 -maxdepth 2 -type d \\( -name domain -o -name application -o -name infrastructure \\) | sort); do printf '%-58s %s\n' \"\$l\" \"\$(find \"\$l\" -mindepth 1 -maxdepth 1 -type d -printf '%f ' 2>/dev/null)\"; done"

section "MEDIUM  multi-aggregate domain/ with files loose at its root"
echo "  a domain/ owning ONE aggregate may be flat; from two on, one folder each"
echo "  flagged only when the module has several aggregates, or already mixes both shapes"
run "for d in \$(find '$SRC' -mindepth 2 -maxdepth 2 -type d -name domain | sort); do
  loose=\$(find \"\$d\" -maxdepth 1 -type f -name '*.ts' -not -name 'index.ts' -not -name '*.spec.ts');
  [ -z \"\$loose\" ] && continue;
  entities=\$(find \"\$d\" -type f \\( -name '*.entity.ts' -o -name '*.aggregate.ts' \\) | wc -l);
  folders=\$(find \"\$d\" -mindepth 1 -maxdepth 1 -type d | wc -l);
  if [ \"\$entities\" -gt 1 ] || [ \"\$folders\" -gt 0 ]; then
    echo \"\$d  (\$entities aggregates, \$folders folders)\"; echo \"\$loose\" | sed 's/^/    /';
  fi;
done"

# ---------- MEDIUM: error handling ----------

section "MEDIUM  raw Error thrown instead of a typed exception"
run "GREP -e 'throw new Error\(' '$SRC'"

section "MEDIUM  swallowed errors / console logging"
run "GREP -e 'catch *\(.*\) *\{ *\}' -e 'console\.(log|error|warn)' '$SRC'"

section "MEDIUM  transport (HTTP) exception imported by the application layer"
# Only framework exceptions count. A domain NotFoundException from the shared
# kernel is the correct thing to throw from a use case.
run "GREP -e \"import .*(NotFoundException|BadRequestException|UnauthorizedException|HttpException).* from '@nestjs\" '$SRC'/*/application/ '$SRC'/*/domain/"

section "MEDIUM  catchError placed before map (mapper errors escape)"
echo "  manual check — in each external provider, confirm the final map() to domain"
echo "  comes BEFORE the outermost catchError()"
run "GREP -l -e 'catchError' '$SRC'/*/infrastructure/"

section "MEDIUM  config read in a field initializer (undefined under ES2022+)"
run "GREP -e 'readonly [A-Za-z]+: *[A-Za-z<>\[\]]+ *= *this\.(config|configService)' '$SRC'"

# ---------- MEDIUM: structure ----------

section "MEDIUM  deep relative imports bypassing path aliases"
run "GREP -e \"from '\\.\\./\\.\\./\\.\\.\" '$SRC'"

section "MEDIUM  domain file importing its own module barrel (circular risk)"
# Matches only the module's own barrel: '@x/domain' or '@x/domain/<aggregate>'.
# Imports of the shared kernel ('@shared/domain/types') are correct and excluded.
run "GREP -e \"from '@(?!shared)[a-z-]+/domain(/[a-z-]+)?'\" '$SRC'/*/domain/ || GREP -e \"from '@[a-z-]*/domain[a-z/-]*'\" '$SRC'/*/domain/ | grep -v '@shared'"

section "MEDIUM  repository read declared non-nullable (type lie)"
echo "  confirm each findBy* returning Promise<T> really cannot return null"
run "GREP -e 'abstract find[A-Za-z]*\(.*\): *Promise<[A-Z]' '$SRC'/*/domain/"

# ---------- LOW: hygiene ----------

section "LOW  T | null instead of Nullable<T>"
# nullable.type.ts is where Nullable is defined — always excluded.
run "GREP -e '[A-Za-z] \| null' '$SRC' | grep -v 'nullable.type.ts'"

section "LOW  empty barrels and empty directories"
run "find '$SRC' -name 'index.ts' -empty; find '$SRC' -type d -empty"

section "LOW  suffix drift (usecase / event handler / bootstrap naming)"
run "find '$SRC' -name '*usecase*.ts' -not -name '*.usecase.ts' -not -name '*.usecase.spec.ts'; find '$SRC' -name '*.event.ts'"

section "LOW  duplicate exports inside a barrel"
run "for f in \$(find '$SRC' -name index.ts); do d=\$(sort \"\$f\" | uniq -d); [ -n \"\$d\" ] && echo \"\$f: \$d\"; done"

# ---------- wiring ----------

section "WIRING  adapters that may not be registered in a module"
echo "  compare each class below against the providers[] of its module file"
run "GREP -l -e '@OnEvent' -e 'OnModuleInit' -e '@Cron' '$SRC'"

section "WIRING  module files found"
run "find '$SRC' -name '*.module.ts'"

printf '\nScan complete. Confirm every lead by reading the file before reporting it.\n'
