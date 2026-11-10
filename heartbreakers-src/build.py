#!/usr/bin/env python3
# Assembles hearts.html from ui.html + engine.js + lines.js, inlining brand images as data URIs.
import base64, os, re
D = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(D, p), encoding='utf-8').read()
s = read('ui.html').replace('/*ENGINE*/', read('engine.js') + '\n' + read('girls.js') + '\n' + read('stats.js') + '\n' + read('lines.js') + '\n' + read('pairs.js') + '\n' + read('highlights.js') + '\n' + read('ending.js') + '\n' + read('think.js'))
def inline(m):
    data = base64.b64encode(open(os.path.join(D, 'brand', m.group(1)), 'rb').read()).decode()
    return 'data:image/webp;base64,' + data
s = re.sub(r'brand/([a-z0-9-]+\.webp)', inline, s)
# recorded sound effects (sfx/*.m4a) inlined as data URIs
import json
sfx = {f[:-4]: 'data:audio/mp4;base64,' + base64.b64encode(open(os.path.join(D, 'sfx', f), 'rb').read()).decode()
       for f in sorted(os.listdir(os.path.join(D, 'sfx'))) if f.endswith('.m4a')}
s = s.replace('/*SFX*/{}', json.dumps(sfx))
open(os.path.join(D, 'hearts.html'), 'w', encoding='utf-8').write(s)
print('built', len(s))

# quote pairing coverage (Nov 9): warn about quotes with no pairs and pair lines that match no quote
import subprocess
subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'check_pairs.js')])
