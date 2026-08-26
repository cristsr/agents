// paths.mjs — the one place that decides how a path is SPOKEN.
//
// Every path these scripts print is read by an agent that writes things down: a
// validator's FAIL line ends up quoted in a spec.md, a status report inside a
// close-out. So `C:\Users\styve\.agents\docs\rules.md` is not a display detail —
// it is a value that outlives the machine it was resolved on and is false on
// every other one, in an artifact that gets committed, reviewed and archived.
//
// The rule is the artifacts' own: a path is relative to the working directory.
// Outside it, `~` names the home directory — the spelling the ecosystem already
// uses for its own files (`~/.agents/contracts/PORTS.md`). Only what lies outside
// both survives absolute, and by then the absoluteness is the finding.

import { relative, isAbsolute, resolve } from 'node:path';
import { homedir } from 'node:os';

const slash = (p) => String(p).split('\\').join('/');

// Windows compares paths case-insensitively and POSIX does not, and the
// difference is not cosmetic here: folding case on Linux would read `/home/Ana`
// as the home of `/home/ana` and rewrite someone else's path to `~`.
const FOLD_CASE = process.platform === 'win32';
const fold = (p) => (FOLD_CASE ? p.toLowerCase() : p);

/** `path` with the home directory written as `~`. */
export function home(path) {
  const p = String(path ?? '');
  const h = homedir();
  const inHome = h && fold(p).startsWith(fold(h));
  return slash(inHome ? `~${p.slice(h.length)}` : p);
}

/**
 * `path` as it should be printed: relative to `root`, `~/…` when it sits outside
 * `root` but under the home directory, absolute only when it is neither.
 *
 * On Windows `relative()` returns an absolute path across drives, which is why
 * the escape check is `isAbsolute` and not just a leading `..`.
 */
export function rel(path, root = process.cwd()) {
  if (path === null || path === undefined || path === '') return path;
  const abs = resolve(String(path));
  const inside = relative(resolve(root), abs);
  if (inside === '') return '.';
  if (!inside.startsWith('..') && !isAbsolute(inside)) return slash(inside);
  return home(abs);
}

// What a machine path looks like, in the four spellings that actually reach an
// artifact: a Windows drive (`C:\Users\…`, `C:/dev/…`), a POSIX home
// (`/home/me/…`, `/Users/me/…`, `/root/…`), a Git-Bash or WSL mount of a Windows
// drive (`/c/Users/…`, `/mnt/c/…`), and a `file://` URL.
//
// A bare `/segment` is deliberately NOT one of them. In an artifact it is an
// endpoint (`/api/v1/invoices`), a command (`/sdd-design`) or a root-relative link
// far more often than a filesystem path, and a check that cries over those is a
// check that gets turned off. `~/…` is not one either: it names a location
// without naming a machine, which is the whole point of writing it that way.
//
// The lookbehind on the drive letter is what keeps `ssh://host/x` out: a URL
// scheme ends in a letter too, and `p:/` inside `ftp://` is otherwise
// indistinguishable from a drive.
const MACHINE_PATH = /file:\/\/\S+|(?<![A-Za-z])[A-Za-z]:[\\/][^\s"'`)\]]+|\/(?:home|Users|root|mnt\/[a-z]|[a-z]\/Users)\/[^\s"'`)\]]+/g;

// URLs share the syntax and none of the problem: a path under a host belongs to
// that host, not to the machine that wrote the line.
const URL_LIKE = /\bhttps?:\/\/\S+/g;

// The spellings above are the ones worth guessing at. They are not the whole
// set, and on POSIX they can't be: a project cloned to `/srv/app` or `/opt/build`
// is just as machine-bound, and no pattern separates `/srv/app/docs/rules.md`
// from `/api/v1/invoices` by looking at it.
//
// But the caller KNOWS where the project is. Given that root (and the home
// directory), the check stops guessing: any line quoting either one literally is
// a machine path, whatever the layout — exact, and with no false positive to
// trade for it.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function anchorPattern(anchor) {
  const parts = resolve(anchor).replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean);
  // A filesystem root (`/`, `C:\`) anchors nothing: it would match every path.
  if (parts.length < 2) return null;
  return new RegExp(`${parts.map(escape).join('[\\\\/]')}[^\\s"'\`)\\]]*`, FOLD_CASE ? 'i' : '');
}

/**
 * Lines carrying a path that only exists on the machine that wrote them.
 * `root` is the project root, when the caller knows it — see above.
 * Returns `[{ line, text, match }]`, 1-indexed — empty when every path travels.
 */
export function machinePaths(text, root = null) {
  if (!text) return [];
  const anchors = [root, homedir()].filter(Boolean).map(anchorPattern).filter(Boolean);
  const found = [];
  String(text).split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const scanned = line.replace(URL_LIKE, '');
    const hit = scanned.match(MACHINE_PATH) ?? anchors.map((re) => scanned.match(re)).find(Boolean);
    if (hit) found.push({ line: i + 1, text: line, match: hit[0] });
  });
  return found;
}
