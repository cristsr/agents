#!/usr/bin/env node
// validate-rules.mjs — validates a project's `docs/rules.md` (the constitution)
// against the contract its template declares
// (`~/.agents/skills/rules/references/rules-template.md`).
// Run after every rules edit (the /rules skill runs it on write, /healthcheck on demand):
//   node ~/.agents/scripts/validate-rules.mjs [docs/rules.md]
//
// It checks the FORM, not the content: the front-matter, the three fields per
// article, the normative principle, and the binary gates. A well-formed rule still
// needs a human or the design/plan skills to apply it — but a malformed
// constitution is now caught mechanically.
//
// Exit codes: 0 = valid · 1 = issues found · 2 = could not run (bad args, no file)

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

let parseYaml;
try {
  const { load } = await import('js-yaml');
  parseYaml = (text) => load(text);
} catch {
  parseYaml = () => null;
}

const issues = [];
const warnings = [];
const notes = [];
const issue = (m) => issues.push(m);
const warn = (m) => warnings.push(m);

const target = process.argv[2] ?? resolve(process.cwd(), 'docs/rules.md');
const abs = resolve(target);
if (!existsSync(abs)) {
  console.error(`FAIL: no rules document at ${abs}`);
  console.error('Create it with /rules (template: ~/.agents/skills/rules/references/rules-template.md).');
  process.exit(2);
}

const text = readFileSync(abs, 'utf8');
const lines = text.split(/\r?\n/);

// ── 1. Front-matter ────────────────────────────────────────────────────────
const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fmMatch) {
  issue('front-matter: missing — the constitution must carry version/ratified/last_amended');
} else {
  const fm = parseYaml(fmMatch[1]);
  if (fm && typeof fm === 'object') {
    const semver = /^\d+\.\d+\.\d+$/;
    if (typeof fm.version !== 'string' || !semver.test(fm.version)) {
      issue(`front-matter.version: "${fm.version ?? 'missing'}" is not semver (MAJOR.MINOR.PATCH)`);
    }
    const date = /^\d{4}-\d{2}-\d{2}$/;
    for (const key of ['ratified', 'last_amended']) {
      const v = fm[key];
      const s = v instanceof Date ? v.toISOString().slice(0, 10) : v;
      if (typeof s !== 'string' || !date.test(s)) {
        issue(`front-matter.${key}: "${fm[key] ?? 'missing'}" is not YYYY-MM-DD`);
      }
    }
  } else {
    issue('front-matter: does not parse as YAML');
  }
}

// ── 2. Articles ────────────────────────────────────────────────────────────
// An article block runs from a `### Article N:` heading up to the next heading of
// any level (`### Article`, `## Mandatory Quality Gates`, …).
const sectionEnd = (start) => {
  const idx = lines.findIndex((l, k) => k >= start && /^#+\s/.test(l));
  return idx === -1 ? lines.length : idx;
};

let articleCount = 0;
let i = 0;
while (i < lines.length) {
  const am = lines[i].match(/^###\s+Article\s+(\d+)\s*:\s*(.*)$/i);
  if (!am) { i++; continue; }
  articleCount++;
  const num = am[1];
  if (!am[2]) warn(`Article ${num}: missing short name after "Article ${num}:"`);

  const end = sectionEnd(i + 1);
  const block = lines.slice(i, end).join('\n');

  for (const field of ["Principle", "Reason", "How it's verified"]) {
    if (!block.includes(`**${field}:**`)) issue(`Article ${num}: missing **${field}:**`);
  }
  const principle = block.match(/\*\*Principle:\*\*\s*(.*)/);
  if (principle && !/\b(MUST|SHALL|NEVER)\b/i.test(principle[1])) {
    issue(`Article ${num}: Principle is not normative — phrase it with MUST/SHALL/NEVER so a reviewer can answer yes/no`);
  }
  // Hardened "How it's verified": code review alone is the weakest gate.
  const verified = block.match(/\*\*How it's verified:\*\*\s*(.*)/);
  if (verified) {
    const concrete =
      /\b(CI|lint(er|ing)?|tests?|testing|npm|npx|scripts?|pipeline|gates?|audits?|checks?|checkers?|validators?|e2e|contracts?)\b|\/(design|plan)\b/i
        .test(verified[1]);
    if (/\breview\b/i.test(verified[1]) && !concrete) {
      warn(`Article ${num}: "How it's verified" names only code review — name a concrete gate (CI job, linter, /design phase, script) or demote the rule to docs/`);
    }
  }
  i = end;
}

if (articleCount === 0) {
  issue('no articles found ("### Article N:") — the constitution has no rules');
} else if (articleCount > 10) {
  warn(`${articleCount} articles — the template targets 6-10; move the negotiable ones to docs/`);
} else {
  notes.push(`${articleCount} articles`);
}

// ── 3. Quality Gates ───────────────────────────────────────────────────────
const gatesHeading = lines.findIndex((l) => /^##\s+Mandatory Quality Gates/i.test(l));
if (gatesHeading === -1) {
  issue('missing "## Mandatory Quality Gates" section');
} else {
  const gateLines = lines
    .slice(gatesHeading, sectionEnd(gatesHeading + 1))
    .filter((l) => /^[-*]\s+\[[ xX]\]/.test(l));
  if (gateLines.length === 0) {
    warn('no gates checked (no "- [ ]" / "- [x]" checkbox under "Mandatory Quality Gates")');
  } else {
    notes.push(`${gateLines.length} gates`);
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
if (notes.length) console.log(`note: ${notes.join(' · ')}`);
if (warnings.length) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${w}`);
}
if (issues.length) {
  console.log(`ISSUES (${issues.length}):`);
  for (const x of issues) console.log(`  ${x}`);
  process.exit(1);
}
console.log(`OK: ${abs} — ${articleCount} articles, constitution contract intact.`);
process.exit(0);
