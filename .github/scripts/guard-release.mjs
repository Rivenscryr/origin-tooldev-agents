// Release check for the OGame Request Guard, run by .github/workflows/guard-release.yml.
// The guard folder is ogame-request-guard/.
//
//   node .github/scripts/guard-release.mjs [repository root]
//
// Decides whether the guard on this commit is a new release, and refuses anything that would make the
// published hash ambiguous:
//   - the version is read from the guard's own `const VERSION = '…'`;
//   - the release list must have exactly one row for that version, with the guard's SHA-256, marked current,
//     and no other row may be current;
//   - no hash may appear on two rows;
//   - the guide (README.md in the guard folder) quotes the guard's hash and the tag guard-v<version>, so a release
//     never ships with a guide naming another version;
//   - if the tag guard-v<version> already exists, the guard at that tag must have the same hash. Same hash:
//     nothing to release (a release-list edit, say). Different hash: refused, because two files under one
//     version would make the published hash ambiguous; raise VERSION instead.
//
// Writes version, sha256, tag and release=true|false to $GITHUB_OUTPUT, and the release notes to
// $RUNNER_TEMP/guard-release-notes.md. Exit code 1 with a message on any refusal.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO = 'Rivenscryr/origin-tooldev-agents';
const FOLDER = 'ogame-request-guard';
const GUARD = `${FOLDER}/ogame-request-guard.js`;
const LIST = `${FOLDER}/ogame-request-guard.releases.tsv`;
const GUIDE = `${FOLDER}/README.md`;

const root = process.argv[2] ?? process.cwd();
const refuse = (message) => {
  console.error(`guard-release: ${message}`);
  process.exit(1);
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });

const guard = readFileSync(join(root, GUARD));
const version = /const VERSION = '(\d+\.\d+\.\d+)';/.exec(guard.toString('utf8'))?.[1];
if (!version) refuse(`no "const VERSION = 'x.y.z';" in ${GUARD}`);
const hash = sha256(guard);
const tag = `guard-v${version}`;

// The release list: header and comment lines skipped, one row per version.
const rows = readFileSync(join(root, LIST), 'utf8')
  .split('\n')
  .filter((line) => line.trim() !== '' && !line.startsWith('#') && !line.startsWith('version\t'))
  .map((line) => {
    const [v = '', sha = '', status = '', until = ''] = line.split('\t');
    return { version: v.trim(), sha256: sha.trim(), status: status.trim(), until: until.trim() };
  });
const mine = rows.filter((row) => row.version === version);
if (mine.length !== 1) refuse(`${LIST} must have exactly one row for ${version}, has ${mine.length}`);
const [row] = mine;
if (row.sha256 !== hash) refuse(`${LIST} lists ${version} with ${row.sha256}, but ${GUARD} hashes to ${hash}`);
if (row.status !== 'current') refuse(`${LIST} marks ${version} as ${row.status || 'nothing'}; a new release is current`);
const current = rows.filter((r) => r.status === 'current');
if (current.length !== 1) refuse(`${LIST} has ${current.length} current rows (${current.map((r) => r.version).join(', ')}); only one may be current`);
const seen = new Map();
for (const r of rows) {
  if (seen.has(r.sha256)) refuse(`${LIST}: ${r.version} and ${seen.get(r.sha256)} have the same hash`);
  seen.set(r.sha256, r.version);
}
for (const r of rows) {
  if (!['current', 'accepted', 'withdrawn'].includes(r.status)) refuse(`${LIST}: ${r.version} has unknown status "${r.status}"`);
  if (r.status === 'accepted' && !/^\d{4}-\d{2}-\d{2}$/.test(r.until)) refuse(`${LIST}: ${r.version} is accepted without an "until" date`);
}

// The guide goes out with the release: it must name this guard, by hash and by tag.
const guide = readFileSync(join(root, GUIDE), 'utf8');
if (!guide.includes(hash)) refuse(`${GUIDE} does not quote the guard's hash ${hash}`);
if (!guide.includes(tag)) refuse(`${GUIDE} does not name the tag ${tag} (its @require line)`);

// An existing tag: the same file means nothing to do; another file under the same version is refused.
let release = true;
let tagged = null;
try {
  tagged = git('show', `refs/tags/${tag}:${GUARD}`);
} catch {
  tagged = null; // no such tag yet
}
if (tagged !== null) {
  const old = sha256(tagged);
  if (old !== hash) refuse(`${tag} already holds a guard with ${old}; a changed guard needs a new VERSION`);
  release = false;
}

const requireUrl = `https://raw.githubusercontent.com/${REPO}/${tag}/${GUARD}#sha256=${hash}`;
const others = rows
  .filter((r) => r.version !== version)
  .map((r) => `| ${r.version} | \`${r.sha256}\` | ${r.status}${r.until ? ` until ${r.until}` : ''} |`);
const notes = [
  `OGame Request Guard ${version}.`,
  '',
  `SHA-256: \`${hash}\``,
  '',
  'Ship `ogame-request-guard.js` byte-identical. Userscripts load it with:',
  '',
  '```',
  `// @require ${requireUrl}`,
  '```',
  ...(others.length > 0 ? ['', 'Other versions:', '', '| Version | SHA-256 | Status |', '|---|---|---|', ...others] : []),
  '',
].join('\n');

const outputs = { version, sha256: hash, tag, release: String(release) };
console.log(Object.entries(outputs).map(([k, v]) => `${k}=${v}`).join('\n'));
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([k, v]) => `${k}=${v}\n`).join(''));
}
writeFileSync(join(process.env.RUNNER_TEMP ?? tmpdir(), 'guard-release-notes.md'), notes);
console.log(release ? `${tag}: new release` : `${tag}: already released with this hash, nothing to do`);
