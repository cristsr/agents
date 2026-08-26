// diff.mjs — reads a unified diff and finds, in the lines it ADDS, the references
// the code is not allowed to carry.
//
// The rule is `design-principles` § "Comments": code never cites the story's
// artifacts — not an AC number, not a story id, not a task, not a path into the
// workspace. Each citation dies the same way. `/sdd-sync` archives the workspace, so
// the pointer goes nowhere; `/sdd-refine` and `/sdd-hotfix` renumber the ACs, so the
// number then lies; and `plan.md` already holds the traceability table, so the
// comment is a second source of truth nothing validates.
//
// Only ADDED lines are read: a repository that predates the rule is not this
// gate's business, and a diff is the only place where "what this session wrote"
// is available without judging the whole tree.
//
// Split from the script so the parsing is testable without a git repo around it.

/** Files whose job IS to carry the traceability — the rule doesn't apply to them. */
const EXEMPT = [
  /\.mdx?$/i,          // plan.md holds the AC → Task table; docs cite the story on purpose
  /(^|\/)work\//,      // the story workspace itself
  /(^|\/)\.agents\//,  // the profile and its neighbours
];

/**
 * The added lines of a unified diff, as `[{ file, line, text }]`.
 *
 * Line numbers come from the hunk headers, so they point at the NEW file — which
 * is what a developer needs to open. A diff produced with `--unified=0` gives the
 * tightest numbers, but any context width parses correctly.
 */
export function addedLines(diffText) {
  const out = [];
  let file = null;
  let lineNo = 0;
  for (const raw of String(diffText ?? '').split(/\r?\n/)) {
    if (raw.startsWith('+++ ')) {
      const path = raw.slice(4).trim();
      file = path === '/dev/null' ? null : path.replace(/^b\//, '');
      continue;
    }
    if (raw.startsWith('--- ') || raw.startsWith('diff --git')) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) { lineNo = Number(hunk[1]); continue; }
    if (raw.startsWith('+')) {
      if (file) out.push({ file, line: lineNo, text: raw.slice(1) });
      lineNo++;
      continue;
    }
    if (raw.startsWith('-') || raw.startsWith('\\')) continue;
    lineNo++;
  }
  return out;
}

/** True when this path is documentation or workspace rather than code. */
export function isExempt(file) {
  return EXEMPT.some((re) => re.test(file));
}

/**
 * The reference patterns, built from the project's own story id.
 *
 * `storyIdSource` comes from the profile (`STORY_ID_PATTERN` plus any legacy
 * prefix), so a project numbering its work `HU-1234` or `PROJ-42` is checked
 * against its own spelling rather than against the `spec-` this ecosystem happens
 * to use in its examples. `spec-\d+` is kept alongside it regardless: it costs
 * nothing and catches a line copied in from elsewhere.
 */
export function referencePatterns(storyIdSource = null) {
  const patterns = [
    [/\bAC-?\d+\b/i, 'acceptance criterion'],
    [/\bwork\/(active|done)\//, 'story workspace path'],
    [/\bspec-\d+\b/i, 'story id'],
    // Weakest of the four: a project whose DOMAIN is tasks writes "Task 3"
    // legitimately. Reported anyway — a false positive is one line to dismiss,
    // and the miss it would otherwise allow is silent.
    [/\bTask[ -]\d+\b/, 'plan task'],
  ];
  if (storyIdSource) patterns.unshift([new RegExp(`\\b(?:${storyIdSource})\\b`, 'i'), 'story id']);
  return patterns;
}

// ── Comments on single properties ───────────────────────────────────────────
// `design-principles` § "Comments": the comment sits on the structure, never on
// one of its members — a field that needs a sentence beside it needs a better
// name. This is a NOTE and never a failure, for a reason that has nothing to do
// with confidence in the regex: a project may adopt JSDoc/TSDoc as its
// documentation standard, and documenting public properties is exactly what that
// standard asks for. The project's convention outranks this default, and a script
// cannot read which one is in force.
//
// So only loose `//` comments are looked at. A `/** */` block is documentation
// syntax — the shape a project reaches for when it HAS a standard — and is never
// reported, whether it sits above a class or above a field.

const CODELIKE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|java|cs|kt|kts|swift|scala|go|dart)$/i;

// `  amount: number; // in cents`  ·  `  LEGACY = 7, // the core sends it this way`
// Applied to the line with its string literals blanked out — otherwise the `//`
// of `url: 'https://…'` reads as the start of a comment, which is the one false
// positive this check cannot afford.
// The `(?<![\\:/])` guard is the other half of the same problem: a regex literal
// ends in `\/` (`path.replace(/^b\//, '')`) and a protocol in `:` — neither starts
// a comment. Blanking strings does not cover those, because neither is a string.
const TRAILING_ON_FIELD =
  /^\s{2,}(?:readonly\s+|private\s+|public\s+|protected\s+|static\s+|final\s+|val\s+|var\s+)*[A-Za-z_$][\w$]*\??\s*[:=].*?(?<![\\:/])\/\/\s*\S/;

/** Blanks out string literals, keeping the line's length and shape. */
function withoutStrings(line) {
  return line.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, (m) => `${m[0]}${' '.repeat(Math.max(0, m.length - 2))}${m[0]}`);
}

const LOOSE_COMMENT = /^\s{2,}\/\/\s*\S/;

// A member declaration, as opposed to a local variable or a method. `const`/`let`
// are what separate "field of a structure" from "variable inside a function" —
// the distinction a parser would make and this cannot.
const FIELD_DECL =
  /^\s{2,}(?!const\b|let\b|var\b|return\b|await\b|if\b|for\b|while\b|case\b|throw\b)(?:readonly\s+|private\s+|public\s+|protected\s+|static\s+|final\s+|val\s+)*[A-Za-z_$][\w$]*\??\s*[:=](?!.*=>)[^(]*[;,]?\s*$/;

/**
 * Added lines that comment a single property, as `[{ file, line, text, kind }]`.
 * `kind` is `trailing` (comment on the declaration itself) or `leading` (comment
 * on the line above it). Always advisory — see the note above.
 */
export function propertyComments(diffText) {
  const added = addedLines(diffText).filter((a) => !isExempt(a.file) && CODELIKE.test(a.file));
  const byFile = new Map();
  for (const a of added) {
    if (!byFile.has(a.file)) byFile.set(a.file, new Map());
    byFile.get(a.file).set(a.line, a.text);
  }

  const found = [];
  for (const a of added) {
    const bare = withoutStrings(a.text);
    if (TRAILING_ON_FIELD.test(bare)) {
      found.push({ file: a.file, line: a.line, text: a.text.trim(), kind: 'trailing' });
      continue;
    }
    if (!LOOSE_COMMENT.test(bare)) continue;
    // The declaration has to be part of the same added block: a comment whose
    // subject is pre-existing code is not this diff's doing.
    const lines = byFile.get(a.file);
    let next = a.line + 1;
    while (lines.has(next) && (lines.get(next).trim() === '' || LOOSE_COMMENT.test(withoutStrings(lines.get(next))))) next++;
    if (lines.has(next) && FIELD_DECL.test(withoutStrings(lines.get(next)))) {
      found.push({ file: a.file, line: a.line, text: a.text.trim(), kind: 'leading' });
    }
  }
  return found;
}

/**
 * Every added line of code that cites the story's artifacts.
 * Returns `[{ file, line, text, reason, match }]` — empty when the diff is clean.
 */
export function artifactReferences(diffText, storyIdSource = null) {
  const patterns = referencePatterns(storyIdSource);
  const found = [];
  for (const added of addedLines(diffText)) {
    if (isExempt(added.file)) continue;
    for (const [re, reason] of patterns) {
      const m = re.exec(added.text);
      if (!m) continue;
      found.push({ ...added, text: added.text.trim(), reason, match: m[0] });
      break;
    }
  }
  return found;
}
