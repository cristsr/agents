// filetree.mjs — the plan's File Tree, derived instead of hand-built.
//
// The `### File Tree` section of plan.md and its visual companion
// docs/file-tree.md are pure functions of the tasks' `**Files:**` lines. Letting a
// model assemble them by hand made a deterministic job fallible, and the validator
// then had to catch the slips. Rendering them here removes the slip at the source.
//
// Two renderings of one list:
//   - flat: one fenced block per component, every leaf carrying the file's complete
//     path, because validate-artifacts looks a task's path up as a plain substring;
//   - nested: folders as parent nodes, for a human to see the shape of the change.

const TREE_INTRO =
  "Consolidated from every task's `**Files:**` lines — regenerate it if a task's Files\n" +
  'change, never hand-edit it independently of the tasks.';

/**
 * The components the plan header declares — the backticked values on the
 * `**<Component>(s):**` line. The label varies with `COMPONENT_TERM`, so the line is
 * found by its `(s):**` shape, not by a word.
 */
export function declaredComponents(planText) {
  if (!planText) return [];
  const line = planText.split(/\r?\n/).find((l) => /^\*\*[^*]+\(s\):\*\*/.test(l));
  if (!line) return [];
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/\/+$/, ''));
}

/**
 * Which component a path belongs to, most specific source first: a component the
 * header declares (longest prefix wins), then `MODULE_ROOT/<next segment>`, then the
 * path's first segment.
 */
export function componentOf(path, { components = [], moduleRoot = null } = {}) {
  const declared = [...components]
    .sort((a, b) => b.length - a.length)
    .find((c) => path === c || path.startsWith(`${c}/`));
  if (declared) return declared;

  const root = typeof moduleRoot === 'string' ? moduleRoot.replace(/\/+$/, '') : '';
  if (root && path.startsWith(`${root}/`)) {
    const next = path.slice(root.length + 1).split('/')[0];
    if (next) return `${root}/${next}`;
  }
  return path.split('/')[0];
}

/**
 * The files grouped by component, deduped by path. A file several tasks touch keeps
 * the kind of its first appearance; groups and files keep the plan's order.
 * Returns `[{ component, files: [{ path, kind }] }]`, `kind` lower-cased.
 */
export function consolidate(files, options = {}) {
  const groups = new Map();
  const seen = new Set();
  for (const f of files) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    const component = componentOf(f.path, options);
    if (!groups.has(component)) groups.set(component, []);
    groups.get(component).push({ path: f.path, kind: f.kind.toLowerCase() });
  }
  return [...groups].map(([component, list]) => ({ component, files: list }));
}

/** The body of `### File Tree`: intro, then one label and one fenced flat block per component. */
export function renderFlat(groups) {
  const parts = [TREE_INTRO];
  for (const { component, files } of groups) {
    const width = Math.max(...files.map((f) => f.path.length)) + 2;
    const lines = files.map((f, i) => {
      const connector = i === files.length - 1 ? '└── ' : '├── ';
      return `${connector}${f.path.padEnd(width)}(${f.kind})`;
    });
    parts.push(`**${component}**`, ['```', ...lines, '```'].join('\n'));
  }
  return parts.join('\n\n');
}

/** docs/file-tree.md: the same list as a nested directory tree per component. */
export function renderNested(groups, storyId) {
  const parts = [
    `# ${storyId}: File Tree (visual)`,
    '> For review only — the version the build and the validator check is the\n' +
      '> `### File Tree` section in `plan.md`. Regenerated together with it; never edited\n' +
      '> separately.',
  ];
  for (const { component, files } of groups) {
    const root = { dirs: new Map(), files: [] };
    for (const f of files) {
      const rest = f.path === component ? f.path : f.path.slice(component.length + 1);
      const segments = rest.split('/');
      const name = segments.pop();
      let node = root;
      for (const s of segments) {
        if (!node.dirs.has(s)) node.dirs.set(s, { dirs: new Map(), files: [] });
        node = node.dirs.get(s);
      }
      node.files.push({ name, kind: f.kind });
    }
    const lines = [component];
    walk(root, '', lines);
    parts.push(`**${component}**`, ['```', ...lines, '```'].join('\n'));
  }
  return `${parts.join('\n\n')}\n`;
}

function walk(node, prefix, out) {
  const entries = [
    ...[...node.dirs].map(([name, child]) => ({ name, child })),
    ...node.files.map((f) => ({ name: `${f.name}   (${f.kind})` })),
  ];
  entries.forEach((entry, i) => {
    const last = i === entries.length - 1;
    out.push(`${prefix}${last ? '└── ' : '├── '}${entry.name}`);
    if (entry.child) walk(entry.child, `${prefix}${last ? '    ' : '│   '}`, out);
  });
}

/**
 * plan.md with its `### File Tree` section replaced by `body`. A trailing `---`
 * separator the old section carried is kept. A plan with no such section gets one
 * inserted right before its first task.
 */
export function replaceFileTree(planText, body) {
  const eol = planText.includes('\r\n') ? '\r\n' : '\n';
  const lines = planText.split(/\r?\n/);
  const start = lines.findIndex((l) => /^###\s+File Tree\s*$/i.test(l));
  const block = ['### File Tree', '', ...body.split('\n'), ''];

  if (start === -1) {
    const firstTask = lines.findIndex((l) => /^###\s+Task\s+/i.test(l));
    const at = firstTask === -1 ? lines.length : firstTask;
    return [...lines.slice(0, at), ...block, ...lines.slice(at)].join(eol);
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= 3) { end = i; break; }
  }
  const old = lines.slice(start + 1, end);
  const lastContent = [...old].reverse().find((l) => l.trim() !== '');
  const tail = lastContent?.trim() === '---' ? ['---', ''] : [];
  return [...lines.slice(0, start), ...block, ...tail, ...lines.slice(end)].join(eol);
}

/** The current body of `### File Tree`, trimmed — for the staleness check. */
export function currentFileTree(planText) {
  if (!planText) return null;
  const lines = planText.split(/\r?\n/);
  const start = lines.findIndex((l) => /^###\s+File Tree\s*$/i.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= 3) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n').replace(/\n-{3,}\s*$/, '').trim();
}
