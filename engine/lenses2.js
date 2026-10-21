/* Lenses, intense batch (Oct 21, 2026). Same contract as engine/lenses.js: { key, name, mode, desc, shape, draw(F, B, st, M) }.
   These change the whole picture; most want a high opacity. Auditioned in Casting before joining the app. */
const LENSES2 = [
  { key: "afterimage", name: "Afterimage", mode: "lighter", desc: "Frames echo and fade behind the picture, hanging on longer when it's loud.",
    shape: [{ key: "length", label: "Length", def: .5 }, { key: "strength", label: "Strength", def: .6 }, { key: "tint", label: "Color drift", def: .3 }],
    draw(F, B, st, M) { const W = B.width, H = B.height; st.acc ||= mk(1, 1); const ac = fit(st.acc, W / 2, H / 2), fade = clamp(M.dt * (.4 + 5 * (1 - M.k("length"))) / (1 + 1.5 * M.loud), 0, 1);
      ac.setTransform(1, 0, 0, 1, 0, 0); ac.globalCompositeOperation = "destination-out"; ac.fillStyle = `rgba(0,0,0,${fade})`; ac.fillRect(0, 0, W / 2, H / 2);
      ac.globalCompositeOperation = "lighter"; ac.globalAlpha = .55; ac.filter = M.k("tint") > .02 ? `hue-rotate(${Math.round(M.t * 40 * M.k("tint")) % 360}deg)` : "none"; ac.drawImage(B, 0, 0, W / 2, H / 2); ac.filter = "none"; ac.globalAlpha = 1;
      const a = .4 + .6 * M.k("strength"); F.globalAlpha *= a; F.drawImage(st.acc, 0, 0, W, H); F.globalAlpha /= a; } },

  { key: "kaleido", name: "Kaleidoscope", mode: "source-over", desc: "Mirrors the picture into wedges that turn on the beat.",
    shape: [{ key: "wedges", label: "Wedges", def: .33, min: 0, max: 3, fmt: i => ["4", "6", "8", "12"][i] }, { key: "turn", label: "Turn speed", def: .3 }, { key: "zoom", label: "Zoom", def: .4 }, { key: "step", label: "Step on the beat", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = [4, 6, 8, 12][Math.round(M.k("wedges") * 3)], cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy) + 2;
      st.ang = (st.ang || 0) + M.dt * M.k("turn") * .8; if (M.hit) st.kick = M.k("step") * LTAU / n; st.kick = (st.kick || 0) * Math.exp(-M.dt * 4); const ang = st.ang + st.kick, z = 1 + M.k("zoom") * (.4 + .3 * M.bass), wedge = LTAU / n;
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H);
      for (let i = 0; i < n; i++) { F.save(); F.translate(cx, cy); F.rotate(i * wedge); F.beginPath(); F.moveTo(0, 0); F.arc(0, 0, R, 0, wedge + .01); F.closePath(); F.clip();
        F.rotate(ang); if (i % 2) F.scale(1, -1); F.scale(z, z); F.drawImage(B, -cx, -cy); F.restore(); } } },

  { key: "crt", name: "CRT", mode: "source-over", desc: "Scanlines, a curved tube, phosphor glow, and a flicker on kicks.",
    shape: [{ key: "curve", label: "Curve", def: .4 }, { key: "lines", label: "Scanlines", def: .5 }, { key: "glow", label: "Phosphor glow", def: .5 }, { key: "flicker", label: "Flicker", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, rows = 90, rh = H / rows, k = .12 * M.k("curve"); st.fl = Math.max((st.fl || 0) - M.dt * 6, M.hit ? M.k("flicker") : 0);
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H); const jit = st.fl * H * .01 * (Math.random() - .5);
      for (let i = 0; i < rows; i++) { const y = i * rh, d = (y + rh / 2) / H * 2 - 1, s = 1 - k * d * d; F.drawImage(B, 0, y, W, rh + 1, (W - W * s) / 2, y + jit, W * s, rh + 1); }
      if (M.k("glow") > .02) { st.g ||= mk(1, 1); const gc = fit(st.g, W / 8, H / 8); gc.globalCompositeOperation = "source-over"; gc.clearRect(0, 0, gc.canvas.width, gc.canvas.height); gc.drawImage(B, 0, 0, W / 8, H / 8); F.globalCompositeOperation = "lighter"; F.globalAlpha *= .35 * M.k("glow") * (1 + st.fl); F.drawImage(st.g, 0, 0, W, H); F.globalAlpha /= .35 * M.k("glow") * (1 + st.fl); F.globalCompositeOperation = "source-over"; }
      const sp = Math.max(2, Math.round(3 + 3 * (1 - M.k("lines")))); if (st.sp !== sp) { st.sp = sp; const p = mk(1, sp), pc = p.getContext("2d"); pc.fillStyle = "rgba(0,0,0,.55)"; pc.fillRect(0, sp - 1, 1, 1); st.pat = F.createPattern(p, "repeat"); }
      F.globalAlpha *= .4 + .6 * M.k("lines"); F.fillStyle = st.pat; F.fillRect(0, 0, W, H); F.globalAlpha /= .4 + .6 * M.k("lines");
      const vg = F.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.hypot(W, H) / 2); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${.5 * M.k("curve")})`); F.fillStyle = vg; F.fillRect(0, 0, W, H); } },

  { key: "chromatic", name: "Chromatic", mode: "source-over", desc: "The red and blue of the picture split apart, pushed by the bass.",
    shape: [{ key: "amount", label: "Amount", def: .5 }, { key: "radial", label: "Outward from center", def: .5 }, { key: "react", label: "Push with bass", def: .7 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = W * .02 * M.k("amount") * (1 + 2 * M.bass * M.k("react")), rad = M.k("radial");
      st.r ||= mk(1, 1); st.g ||= mk(1, 1); st.b ||= mk(1, 1); const hw = W / 2, hh = H / 2;
      [[st.r, "#ff0000"], [st.g, "#00ff00"], [st.b, "#0000ff"]].forEach(([c, col]) => { const cc = fit(c, hw, hh); cc.globalCompositeOperation = "source-over"; cc.clearRect(0, 0, hw, hh); cc.drawImage(B, 0, 0, hw, hh); cc.globalCompositeOperation = "multiply"; cc.fillStyle = col; cc.fillRect(0, 0, hw, hh); });
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H); F.globalCompositeOperation = "lighter";
      const place = (c, o) => { const z = 1 + o * s / W * 2 * rad, dx = o * s * (1 - rad); F.drawImage(c, (W - W * z) / 2 + dx, (H - H * z) / 2, W * z, H * z); };
      place(st.r, 1); place(st.g, 0); place(st.b, -1); F.globalCompositeOperation = "source-over"; } },

  { key: "pixelate", name: "Pixelate", mode: "source-over", desc: "Blocks grow on each kick and dissolve back to sharp.",
    shape: [{ key: "base", label: "Block size", def: .15 }, { key: "kick", label: "Kick size", def: .6 }, { key: "speed", label: "Dissolve speed", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height; st.p = Math.max((st.p || 0) - M.dt * (1 + 6 * M.k("speed")), M.hit ? M.k("kick") : 0); const blk = 1 + (W / 40) * (M.k("base") + st.p * 1.2); if (blk < 1.5) { F.drawImage(B, 0, 0); return; }
      st.s ||= mk(1, 1); const sc = fit(st.s, W / blk, H / blk); sc.imageSmoothingEnabled = true; sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(B, 0, 0, sc.canvas.width, sc.canvas.height);
      F.imageSmoothingEnabled = false; F.fillStyle = "#000"; F.fillRect(0, 0, W, H); F.drawImage(st.s, 0, 0, W, H); F.imageSmoothingEnabled = true; } },

  { key: "strobe", name: "Strobe", mode: "lighter", desc: "Hard flashes on kicks, with a ceiling on how often.",
    shape: [{ key: "bright", label: "Brightness", def: .7 }, { key: "decay", label: "Decay", def: .6 }, { key: "max", label: "Max per second", def: .3, min: 1, max: 8, fmt: n => n + "/s", slide: true }, { key: "tint", label: "Tint", def: 0 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, gap = 1 / Math.round(lerp(1, 8, M.k("max"))); st.since = (st.since || 0) + M.dt; if (M.hit && st.since >= gap) { st.f = 1; st.since = 0; } st.f = (st.f || 0) * Math.exp(-M.dt * (4 + 20 * M.k("decay")));
      if (st.f < .01) return; const t = M.k("tint"); F.fillStyle = t < .02 ? `rgba(255,255,255,${st.f * M.k("bright")})` : hsl(t * 360, 90, 70, st.f * M.k("bright")); F.fillRect(0, 0, W, H); } },

  { key: "smear", name: "Smear", mode: "source-over", desc: "The picture drags in one direction like wet paint.",
    shape: [{ key: "dir", label: "Direction", def: .25 }, { key: "length", label: "Length", def: .5 }, { key: "react", label: "More on hits", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, an = M.k("dir") * LTAU, L = W * .12 * M.k("length") * (1 + 2 * M.kick * M.k("react")), n = 10;
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H); for (let i = 0; i < n; i++) { const u = i / (n - 1), a = (1 - u) * .9 / n * 2 + .05; F.globalAlpha = Math.min(1, a * 2.2); F.drawImage(B, Math.cos(an) * L * u, Math.sin(an) * L * u); } F.globalAlpha = 1; } },

  { key: "ripple", name: "Ripple", mode: "source-over", desc: "A water ring spreads out from the center on every hit.",
    shape: [{ key: "strength", label: "Strength", def: .5 }, { key: "speed", label: "Speed", def: .5 }, { key: "width", label: "Ring width", def: .4 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy); st.rings ||= []; if (M.hit && st.rings.length < 4) st.rings.push({ r: 0, a: 1 });
      F.drawImage(B, 0, 0); const sp = R * (.5 + 1.5 * M.k("speed")), w = R * (.06 + .2 * M.k("width")), amp = .12 * M.k("strength");
      st.rings.forEach(rg => { rg.r += sp * M.dt; rg.a = Math.max(0, 1 - rg.r / R); const steps = 6; for (let i = 0; i < steps; i++) { const r0 = rg.r - w + w * 2 * i / steps, r1 = r0 + w * 2 / steps; if (r1 <= 0) continue; const ph = (i / steps) * Math.PI * 2, z = 1 + Math.sin(ph) * amp * rg.a;
          F.save(); F.beginPath(); F.arc(cx, cy, Math.max(0, r1), 0, LTAU); F.arc(cx, cy, Math.max(0, r0), 0, LTAU, true); F.clip(); F.translate(cx, cy); F.scale(z, z); F.drawImage(B, -cx, -cy); F.restore(); } });
      st.rings = st.rings.filter(rg => rg.a > 0); } },

  { key: "tunnel", name: "Tunnel", mode: "source-over", desc: "The picture zooms into itself, an endless feedback corridor.",
    shape: [{ key: "zoom", label: "Zoom", def: .4 }, { key: "twist", label: "Twist", def: .3 }, { key: "decay", label: "Decay", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, hw = W / 2, hh = H / 2; st.a ||= mk(1, 1); st.b ||= mk(1, 1); fit(st.a, hw, hh); const bc = fit(st.b, hw, hh), z = 1 + (.02 + .12 * M.k("zoom")) * (1 + M.kick), rot = (M.k("twist") - .5) * .12 * (1 + M.bass);
      bc.setTransform(1, 0, 0, 1, 0, 0); bc.globalCompositeOperation = "source-over"; bc.globalAlpha = 1; bc.fillStyle = "#000"; bc.fillRect(0, 0, hw, hh);
      bc.save(); bc.translate(hw / 2, hh / 2); bc.rotate(rot); bc.scale(z, z); bc.globalAlpha = .8 + .19 * M.k("decay"); bc.drawImage(st.a, -hw / 2, -hh / 2, hw, hh); bc.restore();
      bc.globalCompositeOperation = "lighter"; bc.globalAlpha = .75; bc.drawImage(B, 0, 0, hw, hh); [st.a, st.b] = [st.b, st.a];
      F.drawImage(st.a, 0, 0, W, H); } },

  { key: "mirror", name: "Mirror", mode: "source-over", desc: "One half of the picture reflected onto the other.",
    shape: [{ key: "axis", label: "Reflect", def: 0, min: 0, max: 3, fmt: i => ["Left onto right", "Right onto left", "Top onto bottom", "Bottom onto top"][i] }, { key: "seam", label: "Seam", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, ax = Math.round(M.k("axis") * 3), s = M.k("seam"); F.drawImage(B, 0, 0);
      if (ax < 2) { const x = W * s; F.save(); if (ax === 0) { F.beginPath(); F.rect(x, 0, W - x, H); F.clip(); F.translate(x * 2, 0); F.scale(-1, 1); F.drawImage(B, 0, 0); } else { F.beginPath(); F.rect(0, 0, x, H); F.clip(); F.translate(x * 2, 0); F.scale(-1, 1); F.drawImage(B, 0, 0); } F.restore(); }
      else { const y = H * s; F.save(); if (ax === 2) { F.beginPath(); F.rect(0, y, W, H - y); F.clip(); F.translate(0, y * 2); F.scale(1, -1); F.drawImage(B, 0, 0); } else { F.beginPath(); F.rect(0, 0, W, y); F.clip(); F.translate(0, y * 2); F.scale(1, -1); F.drawImage(B, 0, 0); } F.restore(); } } },

  { key: "posterize", name: "Posterize", mode: "source-over", desc: "Color crushed to a few steps, harder when it's loud.",
    shape: [{ key: "levels", label: "Levels", def: .3 }, { key: "react", label: "Harder when loud", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = 1 / 3; st.s ||= mk(1, 1); const sc = fit(st.s, W * s, H * s), w = sc.canvas.width, h = sc.canvas.height; sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(B, 0, 0, w, h);
      let id; try { id = sc.getImageData(0, 0, w, h); } catch (_) { F.drawImage(B, 0, 0); return; } const lv = Math.max(2, Math.round(lerp(8, 2, clamp(M.k("levels") + M.loud * M.k("react") * .5, 0, 1)))), q = 255 / (lv - 1), d = id.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(d[i] / q) * q; d[i + 1] = Math.round(d[i + 1] / q) * q; d[i + 2] = Math.round(d[i + 2] / q) * q; }
      sc.putImageData(id, 0, 0); F.imageSmoothingEnabled = false; F.drawImage(st.s, 0, 0, W, H); F.imageSmoothingEnabled = true; } },

  { key: "invert", name: "Invert", mode: "source-over", desc: "Flips to negative on kicks and snaps back.",
    shape: [{ key: "hold", label: "Hold", def: .3 }, { key: "on", label: "Flip on", def: 0, min: 0, max: 2, fmt: i => ["Kicks", "Hi-hats", "Loud parts"][i] }],
    draw(F, B, st, M) { const W = B.width, H = B.height, on = Math.round(M.k("on") * 2), trig = on === 0 ? M.hit : on === 1 ? M.hat : M.loud > .7; st.h = Math.max((st.h || 0) - M.dt / (.05 + .6 * M.k("hold")), trig ? 1 : 0);
      if (st.h <= 0) { F.drawImage(B, 0, 0); return; } F.filter = "invert(1)"; F.fillStyle = "#000"; F.fillRect(0, 0, W, H); F.drawImage(B, 0, 0); F.filter = "none"; } },

  { key: "haze", name: "Heat haze", mode: "source-over", desc: "Slow, wavy distortion that rises with the energy.",
    shape: [{ key: "amount", label: "Amount", def: .5 }, { key: "speed", label: "Speed", def: .4 }, { key: "scale", label: "Scale", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 50, sh = H / n, amp = W * .03 * M.k("amount") * (.4 + M.energy), f = .1 + .5 * M.k("scale"), v = M.t * (.5 + 3 * M.k("speed"));
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H); for (let i = 0; i < n; i++) { const y = i * sh, off = Math.sin(i * f + v) * amp + Math.sin(i * f * 2.3 - v * 1.3) * amp * .4, sy = Math.sin(i * f * .7 + v * .8) * amp * .2; F.drawImage(B, 0, y, W, sh + 1, off, y + sy, W, sh + 1); } } },

  { key: "bokeh", name: "Bokeh", mode: "source-over", desc: "A soft blur with the bright points blooming into discs.",
    shape: [{ key: "blur", label: "Blur", def: .5 }, { key: "discs", label: "Discs", def: .5 }, { key: "size", label: "Disc size", def: .4 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = 1 / (2 + 10 * M.k("blur")); st.s ||= mk(1, 1); const sc = fit(st.s, W * s, H * s); sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(B, 0, 0, sc.canvas.width, sc.canvas.height);
      F.imageSmoothingEnabled = true; F.fillStyle = "#000"; F.fillRect(0, 0, W, H); F.drawImage(st.s, 0, 0, W, H);
      const pts = lensBright(lensSample(B, st, M, 2), 4 + Math.round(M.k("discs") * 30)), r = W * (.01 + .03 * M.k("size")) * (1 + .3 * M.kick); F.globalCompositeOperation = "lighter";
      pts.forEach(([x, y, l], i) => { const g = F.createRadialGradient(x * W, y * H, r * .75, x * W, y * H, r); g.addColorStop(0, `rgba(255,255,255,${.12 * l})`); g.addColorStop(.85, `rgba(255,255,255,${.35 * l})`); g.addColorStop(1, "rgba(255,255,255,0)"); F.fillStyle = g; F.beginPath(); F.arc(x * W, y * H, r, 0, LTAU); F.fill(); }); F.globalCompositeOperation = "source-over"; } },

  { key: "oldfilm", name: "Old film", mode: "source-over", desc: "Grain, scratches, gate weave and a flicker, like a worn print.",
    shape: [{ key: "grain", label: "Grain", def: .5 }, { key: "scratch", label: "Scratches", def: .4 }, { key: "weave", label: "Gate weave", def: .4 }, { key: "sepia", label: "Sepia", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, wv = M.k("weave"); st.wx = lerp(st.wx || 0, (Math.random() - .5) * W * .008 * wv, .3); st.wy = lerp(st.wy || 0, (Math.random() - .5) * H * .01 * wv, .3);
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H); F.filter = M.k("sepia") > .02 ? `sepia(${M.k("sepia")}) contrast(1.1)` : "none"; F.globalAlpha *= .86 + .14 * Math.random(); F.drawImage(B, st.wx, st.wy); F.globalAlpha /= .86 + .14 * Math.random(); F.filter = "none";
      if (M.k("grain") > .02) { st.fr = (st.fr || 0) + 1; if (st.fr % 2 === 0 || !st.nz) lensNoise(st, Math.round(W / 3), Math.round(H / 3)); F.globalCompositeOperation = "overlay"; F.globalAlpha *= .25 + .55 * M.k("grain"); F.drawImage(st.nz, 0, 0, W, H); F.globalAlpha /= .25 + .55 * M.k("grain"); F.globalCompositeOperation = "source-over"; }
      if (Math.random() < M.k("scratch") * .4) { st.sc = { x: Math.random() * W, life: .1 + Math.random() * .4, a: .3 + Math.random() * .4 }; } if (st.sc) { st.sc.life -= M.dt; st.sc.x += (Math.random() - .5) * 3; if (st.sc.life > 0) { F.strokeStyle = `rgba(255,255,240,${st.sc.a})`; F.lineWidth = 1; F.beginPath(); F.moveTo(st.sc.x, 0); F.lineTo(st.sc.x + (Math.random() - .5) * 4, H); F.stroke(); } else st.sc = null; }
      if (Math.random() < .02) { F.fillStyle = `rgba(30,20,10,${.3 + Math.random() * .4})`; F.beginPath(); F.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 4, 0, LTAU); F.fill(); } } },

  { key: "halftone", name: "Halftone", mode: "source-over", desc: "The picture as a grid of dots that swell with the brightness.",
    shape: [{ key: "spacing", label: "Dot spacing", def: .35 }, { key: "angle", label: "Angle", def: .1 }, { key: "color", label: "Keep color", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, cell = W / Math.round(lerp(120, 36, M.k("spacing"))), cols = Math.ceil(W / cell) + 2, rows = Math.ceil(H / cell) + 2; st.s ||= mk(1, 1); const sc = fit(st.s, cols, rows); sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(B, 0, 0, cols, rows);
      let d; try { d = sc.getImageData(0, 0, cols, rows).data; } catch (_) { F.drawImage(B, 0, 0); return; } F.fillStyle = "#000"; F.fillRect(0, 0, W, H); const an = M.k("angle") * Math.PI / 2, keep = M.k("color");
      F.save(); F.translate(W / 2, H / 2); F.rotate(an); F.translate(-W / 2, -H / 2);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const p = (j * cols + i) * 4, r = d[p], g = d[p + 1], b = d[p + 2], l = (r * .3 + g * .59 + b * .11) / 255 * d[p + 3] / 255; if (l < .04) continue; const rad = cell * .55 * Math.sqrt(l) * (1 + .15 * M.kick);
        F.fillStyle = keep > .5 ? `rgb(${Math.round(lerp(255, r, (keep - .5) * 2))},${Math.round(lerp(255, g, (keep - .5) * 2))},${Math.round(lerp(255, b, (keep - .5) * 2))})` : `rgb(${Math.round(255 * (1 - keep * 2) + r * keep * 2)},${Math.round(255 * (1 - keep * 2) + g * keep * 2)},${Math.round(255 * (1 - keep * 2) + b * keep * 2)})`;
        F.beginPath(); F.arc((i - 1) * cell + cell / 2, (j - 1) * cell + cell / 2, rad, 0, LTAU); F.fill(); } F.restore(); } },

  { key: "drunk", name: "Drunk", mode: "source-over", desc: "Slow double vision that drifts and wobbles.",
    shape: [{ key: "drift", label: "Drift", def: .5 }, { key: "wobble", label: "Wobble", def: .4 }, { key: "blur", label: "Blur", def: .3 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, dr = M.k("drift"), dx = Math.sin(M.t * .7) * W * .04 * dr, dy = Math.cos(M.t * .5) * H * .03 * dr, rot = Math.sin(M.t * .4) * .06 * M.k("wobble"), z = 1 + .03 * Math.sin(M.t * .9) * M.k("wobble");
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H); if (M.k("blur") > .02) { st.s ||= mk(1, 1); const s = 1 / (1 + 6 * M.k("blur")), sc = fit(st.s, W * s, H * s); sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(B, 0, 0, sc.canvas.width, sc.canvas.height); F.imageSmoothingEnabled = true; F.drawImage(st.s, 0, 0, W, H); } else F.drawImage(B, 0, 0);
      F.save(); F.globalAlpha *= .5; F.translate(W / 2 + dx, H / 2 + dy); F.rotate(rot); F.scale(z, z); F.drawImage(B, -W / 2, -H / 2); F.restore(); } },

  { key: "tiltshift", name: "Tilt-shift", mode: "source-over", desc: "A sharp band across the middle, blur above and below.",
    shape: [{ key: "pos", label: "Band position", def: .5 }, { key: "width", label: "Band width", def: .35 }, { key: "blur", label: "Blur", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = 1 / (2 + 10 * M.k("blur")); st.s ||= mk(1, 1); const sc = fit(st.s, W * s, H * s); sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(B, 0, 0, sc.canvas.width, sc.canvas.height);
      F.imageSmoothingEnabled = true; F.fillStyle = "#000"; F.fillRect(0, 0, W, H); F.drawImage(st.s, 0, 0, W, H);
      const y = H * M.k("pos"), hw = H * (.06 + .3 * M.k("width")); st.m ||= mk(1, 1); const mc = fit(st.m, W, H); mc.globalCompositeOperation = "source-over"; mc.clearRect(0, 0, W, H); mc.drawImage(B, 0, 0); mc.globalCompositeOperation = "destination-in";
      const g = mc.createLinearGradient(0, y - hw * 1.6, 0, y + hw * 1.6); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.3, "rgba(0,0,0,1)"); g.addColorStop(.7, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); mc.fillStyle = g; mc.fillRect(0, 0, W, H); F.drawImage(st.m, 0, 0); } },

  { key: "shatter", name: "Shatter", mode: "source-over", desc: "On big hits the picture cracks into shards that slide apart, then heal.",
    shape: [{ key: "pieces", label: "Pieces", def: .4 }, { key: "spread", label: "Spread", def: .5 }, { key: "heal", label: "Heal speed", def: .5 }, { key: "on", label: "Break on", def: 0, min: 0, max: 1, fmt: i => ["Loud hits", "Every kick"][i] }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = Math.round(lerp(4, 12, M.k("pieces"))), key = n + ":" + W;
      if (st.key !== key) { st.key = key; st.sh = []; const cw = W / n, ch = H / Math.round(n * H / W); const pts = []; for (let j = 0; j <= Math.round(n * H / W); j++) { pts.push([]); for (let i = 0; i <= n; i++) pts[j].push([i * cw + (i && i < n ? (Math.random() - .5) * cw * .8 : 0), j * ch + (j && j < pts.length - 1 + 1 && j < Math.round(n * H / W) ? (Math.random() - .5) * ch * .8 : 0)]); }
        for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < n; i++) { const q = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]]; [[q[0], q[1], q[2]], [q[0], q[2], q[3]]].forEach(tri => { const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, an = Math.atan2(cy - H / 2, cx - W / 2) + (Math.random() - .5) * .6; st.sh.push({ tri, vx: Math.cos(an), vy: Math.sin(an), rot: (Math.random() - .5) * .3, cx, cy }); }); } }
      const on = Math.round(M.k("on")), trig = on === 1 ? M.hit : (M.hit && M.loud > .55); if (trig && (st.d || 0) < .3) st.d = 1; st.d = (st.d || 0) * Math.exp(-M.dt * (.8 + 4 * M.k("heal")));
      if (st.d < .01) { F.drawImage(B, 0, 0); return; } const D = st.d * W * .12 * M.k("spread"); F.fillStyle = "#000"; F.fillRect(0, 0, W, H);
      st.sh.forEach(s => { F.save(); F.translate(s.cx + s.vx * D, s.cy + s.vy * D); F.rotate(s.rot * st.d); F.translate(-s.cx, -s.cy); F.beginPath(); F.moveTo(s.tri[0][0], s.tri[0][1]); F.lineTo(s.tri[1][0], s.tri[1][1]); F.lineTo(s.tri[2][0], s.tri[2][1]); F.closePath(); F.clip(); F.drawImage(B, 0, 0); F.restore(); }); } },

  { key: "spin", name: "Spin", mode: "source-over", desc: "The whole picture rotates; speed follows the tempo, with a nudge on kicks.",
    shape: [{ key: "speed", label: "Speed", def: .3 }, { key: "dir", label: "Direction", def: 0, min: 0, max: 1, fmt: i => ["Clockwise", "Counter"][i] }, { key: "nudge", label: "Nudge on kicks", def: .4 }, { key: "zoom", label: "Zoom to cover corners", def: .6 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, d = Math.round(M.k("dir")) ? -1 : 1; st.v = lerp(st.v || 0, M.k("speed") * 1.2 * (1 + M.loud) + (M.hit ? 3 * M.k("nudge") : 0), M.dt * 3); st.a = (st.a || 0) + st.v * d * M.dt;
      const z = 1 + M.k("zoom") * (Math.hypot(W, H) / Math.min(W, H) - 1); F.fillStyle = "#000"; F.fillRect(0, 0, W, H); F.save(); F.translate(W / 2, H / 2); F.rotate(st.a); F.scale(z, z); F.drawImage(B, -W / 2, -H / 2); F.restore(); } },

  { key: "contour", name: "Contour", mode: "source-over", desc: "Edges only, a neon outline of whatever's on screen.",
    shape: [{ key: "thick", label: "Thickness", def: .3 }, { key: "glow", label: "Glow", def: .5 }, { key: "hue", label: "Hue", def: 0 }, { key: "keep", label: "Keep the picture", def: .15 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, hw = W / 2, hh = H / 2, o = 1 + 3 * M.k("thick"); st.e ||= mk(1, 1); const ec = fit(st.e, hw, hh);
      ec.setTransform(1, 0, 0, 1, 0, 0); ec.globalCompositeOperation = "source-over"; ec.globalAlpha = 1; ec.clearRect(0, 0, hw, hh); ec.drawImage(B, 0, 0, hw, hh); ec.globalCompositeOperation = "difference"; ec.drawImage(B, o, o, hw, hh); ec.drawImage(B, -o, -o, hw, hh);
      ec.globalCompositeOperation = "source-over"; ec.filter = `brightness(${1.2 + 1.3 * M.k("glow")}) saturate(1.6)` + (M.k("hue") > .02 ? ` hue-rotate(${Math.round(M.k("hue") * 360)}deg)` : ""); ec.drawImage(st.e, 0, 0); ec.filter = "none";
      F.fillStyle = "#000"; F.fillRect(0, 0, W, H); if (M.k("keep") > .02) { F.globalAlpha *= M.k("keep"); F.drawImage(B, 0, 0); F.globalAlpha /= M.k("keep"); } F.globalCompositeOperation = "lighter"; F.drawImage(st.e, 0, 0, W, H); if (M.k("glow") > .3) { st.g ||= mk(1, 1); const gc = fit(st.g, W / 8, H / 8); gc.globalCompositeOperation = "source-over"; gc.clearRect(0, 0, gc.canvas.width, gc.canvas.height); gc.drawImage(st.e, 0, 0, W / 8, H / 8); F.globalAlpha *= (M.k("glow") - .3); F.drawImage(st.g, 0, 0, W, H); F.globalAlpha /= (M.k("glow") - .3); } F.globalCompositeOperation = "source-over"; } },

  { key: "thermal", name: "Thermal", mode: "source-over", desc: "Brightness remapped to a heat-camera gradient.",
    shape: [{ key: "pal", label: "Palette", def: 0, min: 0, max: 2, fmt: i => ["Classic", "Ice", "Acid"][i] }, { key: "contrast", label: "Contrast", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = 1 / 2; st.s ||= mk(1, 1); const sc = fit(st.s, W * s, H * s), w = sc.canvas.width, h = sc.canvas.height; sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(B, 0, 0, w, h);
      let id; try { id = sc.getImageData(0, 0, w, h); } catch (_) { F.drawImage(B, 0, 0); return; } const p = Math.round(M.k("pal") * 2); if (st.pal !== p) { st.pal = p; const stops = [[[0, 0, 0], [40, 0, 80], [180, 0, 60], [255, 90, 0], [255, 220, 40], [255, 255, 255]], [[0, 0, 0], [0, 20, 90], [0, 120, 200], [90, 220, 255], [220, 250, 255], [255, 255, 255]], [[0, 0, 0], [20, 60, 0], [60, 160, 0], [180, 255, 40], [255, 255, 160], [255, 255, 255]]][p]; st.lut = new Uint8ClampedArray(256 * 3); for (let i = 0; i < 256; i++) { const u = i / 255 * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(u)), f = u - k; for (let c = 0; c < 3; c++) st.lut[i * 3 + c] = lerp(stops[k][c], stops[k + 1][c], f); } }
      const d = id.data, ct = .6 + 1.4 * M.k("contrast"); for (let i = 0; i < d.length; i += 4) { let l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255 * d[i + 3] / 255; l = clamp(Math.pow(l, 1 / (.7 + ct * .6)) * (.55 + .45 * ct), 0, 1); const q = Math.round(l * 255) * 3; d[i] = st.lut[q]; d[i + 1] = st.lut[q + 1]; d[i + 2] = st.lut[q + 2]; d[i + 3] = 255; }
      sc.putImageData(id, 0, 0); F.imageSmoothingEnabled = true; F.drawImage(st.s, 0, 0, W, H); } }
];
LENSES.push(...LENSES2); LENSES2.forEach(l => { LENS[l.key] = l; });
