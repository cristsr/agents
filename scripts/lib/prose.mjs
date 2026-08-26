// prose.mjs — reads the cross-references the ecosystem writes in PROSE.
//
// A skill hands off to another one by name ("that's /sdd-plan's job") and cites the
// repo by absolute path (`~/.agents/contracts/PORTS.md`). Neither is code, so
// nothing breaks loudly when a rename leaves one behind: the skill still reads
// as authoritative and the step silently does nothing. That is exactly how
// `/architecture` survived its own rename in seven places.
//
// This module turns both into something a validator can check. It is separate
// from validate-skills.mjs so the parsing can be tested on its own, without a
// repo-shaped fixture around it.

/**
 * Removes fenced code blocks, keeping inline code.
 *
 * Inside a fence a `/word` is a filesystem path or a shell flag, and treating it
 * as an invocation would drown the real findings. Inline code is the OPPOSITE
 * case — `` `/sdd-plan` `` is exactly how one skill cites another — so backticks are
 * left alone. Fences are matched with leading whitespace allowed: a fence nested
 * in a list item is indented, and an anchored `^```" would miss it and take the
 * whole diagram as prose.
 */
export function stripFences(text) {
  return String(text ?? '').replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, '');
}

// Two spellings count as an invocation, and only these two: the command wrapped
// in backticks (`` `/sdd-plan` ``), or one opening a word after a space, a quote or
// a parenthesis ("run /sdd-plan"). What this deliberately excludes is the
// alternation prose is full of — `` `providers`/registrations ``,
// `use case(s)/handler(s)`, `command`/query — where the slash separates two
// words and names no command at all.
//
// The trailing guard splits the two jobs a period does. `(?!\.\w)` rejects a
// file extension (`/plan.md` is a path); a period followed by a space or the end
// of the line is sentence punctuation and must NOT end the match — half the
// handoffs in the skills are the last word of their sentence.
const INVOCATION = /`\/([a-z][a-z0-9-]{2,})`|(?<=^|[\s("])\/([a-z][a-z0-9-]{2,})(?![\w/-])(?!\.\w)/gm;

/** Every distinct `/command` invoked in the prose of `text`, in order. */
export function invocations(text) {
  const out = [];
  const seen = new Set();
  for (const m of stripFences(text).matchAll(INVOCATION)) {
    const cmd = m[1] ?? m[2];
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    out.push(cmd);
  }
  return out;
}

const AGENTS_PATH = /~\/\.agents\/([A-Za-z0-9_./<>{}-]+)/g;

/**
 * Every distinct `~/.agents/…` path cited in `text`, as a repo-relative path.
 *
 * Paths carrying a placeholder (`<name>`, `{name}`) are patterns rather than
 * destinations and are skipped — `~/.agents/agents/<name>.md` documents a shape,
 * and no file was ever meant to sit there. Trailing sentence punctuation is
 * trimmed: prose ends citations with a period far more often than a file does.
 */
export function agentsPaths(text) {
  const out = [];
  const seen = new Set();
  for (const m of String(text ?? '').matchAll(AGENTS_PATH)) {
    const ref = m[1].replace(/[.,;:]+$/, '');
    if (/[<>{}]/.test(ref) || seen.has(ref)) continue;
    seen.add(ref);
    out.push(ref);
  }
  return out;
}

// A template is copied, not read: whatever sits inside its ```markdown block ends
// up in the artifact. So a note meant for whoever fills the template in — "the
// branch was resolved by /sdd-prepare", "see PHASE 3.5" — must live outside the fence
// (or inside an HTML comment, which the templates declare is never content),
// because inside it the artifact ends up naming the pipeline that produced it.
//
// Only blockquotes are inspected. That is the shape those notes take, and it keeps
// the check off the artifact's own content, where a `/sdd-docs` endpoint or a "phase 2
// rollout" business rule is legitimate.
const PIPELINE = /\/(spec|clarify|design|plan|build|sync|hotfix|refine|scan|docs|commit|prepare|forge|bootstrap|rules)\b|\bPHASE\s*\d/;

/**
 * Notes about the pipeline left inside a template's literal block.
 * Returns `[{ line, text }]`, 1-indexed — empty when the template keeps them out.
 */
export function templateNotes(text) {
  const out = [];
  let inFence = false;
  String(text ?? '').split(/\r?\n/).forEach((line, i) => {
    if (/^[ \t]*```/.test(line)) { inFence = !inFence; return; }
    if (!inFence || !/^\s*>/.test(line)) return;
    if (PIPELINE.test(line)) out.push({ line: i + 1, text: line.trim() });
  });
  return out;
}
