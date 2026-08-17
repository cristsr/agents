// prose.mjs — reads the cross-references the ecosystem writes in PROSE.
//
// A skill hands off to another one by name ("that's /plan's job") and cites the
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
 * case — `` `/plan` `` is exactly how one skill cites another — so backticks are
 * left alone. Fences are matched with leading whitespace allowed: a fence nested
 * in a list item is indented, and an anchored `^```" would miss it and take the
 * whole diagram as prose.
 */
export function stripFences(text) {
  return String(text ?? '').replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, '');
}

// Two spellings count as an invocation, and only these two: the command wrapped
// in backticks (`` `/plan` ``), or one opening a word after a space, a quote or
// a parenthesis ("run /plan"). What this deliberately excludes is the
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
