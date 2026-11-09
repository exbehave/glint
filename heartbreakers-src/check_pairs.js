// Quote-pairing coverage check: node heartbreakers-src/check_pairs.js
// Lists pair entries whose lines aren't any girl's quote (typos, reworded quotes), and quotes with no strong
// (score ≥ 2) pair in either direction, by girl. Run it after adding a girl or changing quotes; build.py runs it too.
const fs = require('fs'), D = __dirname;
require('vm').runInThisContext(fs.readFileSync(D + '/lines.js', 'utf8') + fs.readFileSync(D + '/pairs.js', 'utf8') + ';globalThis.X={LINES,PAIRS,KENNEDY_PAIRS}');
const n = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().replace(/\s*\(\d+\)$/, '');
const skip = new Set(['taunt', 'moonVictim']);   // placeholder moments with no clips
// only the girls in the game (ROSTER in ui.html); the rest still have placeholder lines
const roster = new Set(JSON.parse(fs.readFileSync(D + '/ui.html', 'utf8').match(/const ROSTER = \{ bgc: (\[[^\]]*\])/)[1].replace(/'/g, '"')));
const who = {};
for (const g in X.LINES) if (roster.has(g)) for (const m in X.LINES[g]) if (!skip.has(m)) X.LINES[g][m].forEach(l => (who[n(l)] = who[n(l)] || new Set()).add(g));
const allLines = new Set(); for (const g in X.LINES) for (const m in X.LINES[g]) X.LINES[g][m].forEach(l => allLines.add(n(l)));
const all = [...X.PAIRS, ...X.KENNEDY_PAIRS.map(([a, b]) => [a, b, 5])];
const unknown = new Set(), deg = {};
for (const [a, b, sc] of all) {
  for (const x of [a, b]) if (!who[n(x)] && !allLines.has(n(x))) unknown.add(x);
  if (sc >= 2) { deg[n(a)] = (deg[n(a)] || 0) + 1; deg[n(b)] = (deg[n(b)] || 0) + 1; }
}
const lonely = {};
for (const l in who) if (!deg[l]) for (const g of who[l]) (lonely[g] = lonely[g] || []).push(l);
const ok = !unknown.size;
if (unknown.size) console.log('pairs.js lines that match no quote:\n  ' + [...unknown].join('\n  '));
const lc = Object.values(lonely).flat().length;
if (lc) console.log(`quotes with no pairs yet (${lc}):\n` + Object.entries(lonely).map(([g, ls]) => `  ${g}: ${ls.join(' | ')}`).join('\n'));
if (ok && !lc) console.log('pairs: every quote is paired');
process.exitCode = ok ? 0 : 1;
