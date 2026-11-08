#!/usr/bin/env python3
# Copies stats.js into the hb-leaders edge function as an ES module (the game and the function share one stats file).
import os, re
D = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(D, 'stats.js'), encoding='utf-8').read()
s = re.sub(r"^if \(typeof module.*$", "export { hbGameStats, hbAddUp, hbRate, HB_BOARDS, hbRank, hbFmt };", s, flags=re.M)
out = os.path.join(D, '..', 'supabase', 'functions', 'hb-leaders', 'stats.js')
open(out, 'w', encoding='utf-8').write('// GENERATED from heartbreakers-src/stats.js by make_leaders.py. Do not edit.\n' + s)
print('wrote', out)
