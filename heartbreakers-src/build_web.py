#!/usr/bin/env python3
"""Packages BGC: Heartbreakers for glint.haus/heartbreakers/ (in the exbehave/glint repo).
Run build.py first (it makes hearts.html). Usage: python3 build_web.py  (writes ../heartbreakers/)"""
import os, sys, json, shutil
from PIL import Image, ImageDraw, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '..'), 'heartbreakers')
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)

# the game page: the artifact body wrapped in a real document (the artifact skeleton isn't there on the web)
body = open(os.path.join(D, 'hearts.html'), encoding='utf-8').read()
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Heartbreakers">
<meta name="theme-color" content="#12060f">
<link rel="icon" href="icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box;height:100%;background:#12060f}*,*::before,*::after{box-sizing:inherit}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
"""
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(head + body + '\n</body>\n</html>\n')
shutil.copy(os.path.join(D, 'web', 'admin.html'), os.path.join(OUT, 'admin.html'))

# images for the admin page
for f in ['logo.webp', 'bg-port.webp']:
    shutil.copy(os.path.join(D, 'brand', f), os.path.join(OUT, 'img', f))
for n in ['natalie', 'judi', 'victor-twins', 'amy', 'dalila']:
    Image.open(os.path.join(D, 'sprites', n + '-bust.png')).save(os.path.join(OUT, 'img', n + '.webp'), quality=88, method=6)

# home-screen icons: the horned heart glowing on deep plum
heart = Image.open(os.path.join(D, 'brand', 'heart.png')).convert('RGBA')
def icon(size):
    im = Image.new('RGBA', (size, size), (18, 6, 15, 255))
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((size * .12, size * .12, size * .88, size * .88), fill=(120, 20, 80, 150))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * .12)))
    h = int(size * .74); w = int(h * heart.width / heart.height)
    hh = heart.resize((w, h), Image.LANCZOS)
    halo = hh.filter(ImageFilter.GaussianBlur(size * .025))
    x, y = (size - w) // 2, (size - h) // 2
    im.alpha_composite(halo, (x, y)); im.alpha_composite(hh, (x, y))
    return im.convert('RGB')
icon(180).save(os.path.join(OUT, 'apple-touch-icon.png'))
icon(192).save(os.path.join(OUT, 'icon-192.png'))
icon(512).save(os.path.join(OUT, 'icon-512.png'))
json.dump({
    "name": "BGC: Heartbreakers", "short_name": "Heartbreakers", "start_url": "./", "scope": "./",
    "display": "standalone", "orientation": "any", "background_color": "#12060f", "theme_color": "#12060f",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}]
}, open(os.path.join(OUT, 'manifest.webmanifest'), 'w'), indent=2)
print('wrote', OUT, sorted(os.listdir(OUT)))
