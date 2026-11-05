#!/usr/bin/env python3
# Assembles hearts.html from ui.html + engine.js + lines.js, inlining brand images as data URIs.
import base64, os, re
D = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(D, p), encoding='utf-8').read()
s = read('ui.html').replace('/*ENGINE*/', read('engine.js') + '\n' + read('girls.js') + '\n' + read('lines.js'))
def inline(m):
    data = base64.b64encode(open(os.path.join(D, 'brand', m.group(1)), 'rb').read()).decode()
    return 'data:image/webp;base64,' + data
s = re.sub(r'brand/([a-z0-9-]+\.webp)', inline, s)
open(os.path.join(D, 'hearts.html'), 'w', encoding='utf-8').write(s)
print('built', len(s))
