# Shatter sounds for the moon (Kennedy, Nov 9, 18:53: the glass shatter is out; pick from a menu).
# Run from this folder: python3 shatter.py  -> shatter-a..e.m4a, plus each layered with the gunshot (with-*.m4a).
import numpy as np, subprocess, scipy.signal as sg, scipy.io.wavfile as wf
SR = 48000; rng = np.random.default_rng(11)
def t(n): return np.arange(int(n * SR)) / SR
def lp(x, f, o=2): b, a = sg.butter(o, f / (SR / 2)); return sg.lfilter(b, a, x)
def hp(x, f, o=2): b, a = sg.butter(o, f / (SR / 2), 'high'); return sg.lfilter(b, a, x)
def bp(x, f1, f2, o=2): b, a = sg.butter(o, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return sg.lfilter(b, a, x)
def at(dst, x, sec): i = int(sec * SR); n = min(len(x), len(dst) - i); dst[i:i + n] += x[:n]
def verb(x, rt, wet, lpf=5000):
    n = int(rt * 1.3 * SR); tt = np.arange(n) / SR; ir = rng.standard_normal(n) * np.exp(-6.9 * tt / rt); ir = lp(ir, lpf); ir[:int(.01 * SR)] = 0
    y = sg.fftconvolve(x, ir)[:len(x)]; y /= np.max(np.abs(y)) + 1e-9; return x + wet * y * np.max(np.abs(x))
def crack(dur=.012, lo=1500): n = int(dur * SR); return hp(rng.standard_normal(n), lo) * np.linspace(1, 0, n) ** .6

def crystal():   # A: a bright crack, then a cascade of glassy pings, like a crystal ball bursting
    y = np.zeros(int(1.6 * SR)); at(y, crack(.015, 2500) * .9, 0)
    for k in range(46):
        d = .005 + rng.random() ** 1.8 * .7; f = 2200 + rng.random() * 5200; n = t(.35)
        p = (np.sin(2 * np.pi * f * n) + .4 * np.sin(2 * np.pi * f * 2.76 * n)) * np.exp(-n / (.04 + rng.random() * .08))
        at(y, p * (.5 - d * .5) * (.5 + rng.random() * .5), d)
    return verb(y, 1.2, .45, 7000)
def porcelain():   # B: a hard smash, a low knock, then fragments clattering down
    y = np.zeros(int(1.4 * SR)); at(y, bp(rng.standard_normal(int(.09 * SR)), 900, 6000) * np.exp(-t(.09) / .02) * 1.2, 0)
    at(y, np.sin(2 * np.pi * 140 * t(.15)) * np.exp(-t(.15) / .03) * .6, 0)
    for k in range(28):
        d = .04 + rng.random() ** 1.4 * .75; n = t(.06); f = 1800 + rng.random() * 4000
        c = bp(rng.standard_normal(len(n)), f * .7, min(f * 1.4, 20000)) * np.exp(-n / .006) + np.sin(2 * np.pi * f * n) * np.exp(-n / .012) * .4
        at(y, c * (.45 - d * .4) * (.4 + rng.random() * .6), d)
    return verb(y, .7, .3)
def thunder():   # C: a sharp lightning crackle over a deep rolling boom
    y = np.zeros(int(2.4 * SR)); at(y, crack(.02, 1200) * 1.0, 0)
    n = t(.35); at(y, hp(rng.standard_normal(len(n)), 2000) * np.exp(-n / .05) * (1 + .8 * np.sign(np.sin(2 * np.pi * 37 * n))) * .35, .005)
    n = t(2.2); rum = lp(rng.standard_normal(len(n)), 160, 3) * (1 - np.exp(-n / .02)) * np.exp(-n / .6)
    at(y, rum / (np.max(np.abs(rum)) + 1e-9) * .9, .01)
    return verb(y, 1.6, .25, 2500)
def impact():   # D: a cinematic hit: a sub drop with a punchy burst and a long dark tail
    y = np.zeros(int(2.2 * SR)); n = t(1.6); f = 32 + 58 * np.exp(-n / .09); ph = 2 * np.pi * np.cumsum(f) / SR
    at(y, np.tanh(2.2 * np.sin(ph) * np.exp(-n / .35)) * .9, 0)
    at(y, lp(rng.standard_normal(int(.18 * SR)), 5000) * np.exp(-t(.18) / .03) * .9, 0)
    at(y, crack(.01, 3000) * .6, 0)
    return verb(y, 1.8, .45, 3000)
def sparkle():   # E: magic: an airy burst sweeping down, with twinkles trailing off
    y = np.zeros(int(1.8 * SR)); n = t(.8); w = rng.standard_normal(len(n)); out = np.zeros_like(w)
    for i, (f1, f2) in enumerate(zip(np.geomspace(7000, 900, 8), np.geomspace(9000, 1300, 8))):
        seg = slice(i * len(n) // 8, (i + 1) * len(n) // 8); out[seg] = bp(w, f1, f2)[seg]
    at(y, out * np.exp(-n / .25) * .6, 0); at(y, crack(.01, 3000) * .5, 0)
    for k in range(30):
        d = .03 + rng.random() * 1.1; f = 3500 + rng.random() * 4500; n2 = t(.25)
        at(y, np.sin(2 * np.pi * f * n2 + 3 * np.sin(2 * np.pi * 9 * n2)) * np.sin(np.pi * n2 / .25) ** 2 * (.35 - d * .25), d)
    return verb(y, 1.4, .5, 8000)

def save(name, y, peak=-1):
    y = y / np.max(np.abs(y)) * .95; wf.write(name + '.wav', SR, (y * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', name + '.wav', '-af', f'silenceremove=stop_periods=-1:stop_threshold=-60dB:stop_duration=0.3,volume={peak}dB', '-ar', '48000', '-ac', '1', '-c:a', 'aac', '-b:a', '128k', name + '.m4a'], check=True)
    return y
opts = {'a': crystal(), 'b': porcelain(), 'c': thunder(), 'd': impact(), 'e': sparkle()}
sr, shot = wf.read('shot-a.wav') if __import__('os').path.exists('shot-a.wav') else (None, None)
for k, y in opts.items():
    y = save('shatter-' + k, y, -3)
    if shot is not None:   # layered: the gunshot (in use, A) with the shatter 50 ms later, as in the game
        s = shot.astype(float) / 32767; mix = np.zeros(max(len(s), int(.05 * SR) + len(y)) + SR // 4)
        mix[:len(s)] += s * 1.0; at(mix, y * .8, .05); save('with-' + k, mix)
