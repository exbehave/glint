/* Personalities: whole-design treatments, from the original Studio */
const BLENDS = [["source-over", "Normal"], ["lighter", "Add"], ["screen", "Screen"], ["overlay", "Overlay"], ["soft-light", "Soft light"], ["color-dodge", "Color dodge"], ["difference", "Difference"], ["exclusion", "Exclusion"], ["multiply", "Multiply"]];
const MOODS = [
  { key: "hypnotic", name: "Hypnotic", mode: "screen", bias: { tempo: -.1, grace: .3, social: .35, chaos: -.15 },
    draw(F, B, st, M) { st.a ||= mk(1, 1); st.b ||= mk(1, 1); const hw = B.width / 2, hh = B.height / 2;
      fit(st.a, hw, hh); const bc = fit(st.b, hw, hh);
      bc.setTransform(1, 0, 0, 1, 0, 0); bc.globalCompositeOperation = "source-over"; bc.globalAlpha = 1; bc.fillStyle = "#000"; bc.fillRect(0, 0, hw, hh);
      bc.save(); bc.translate(hw / 2, hh / 2); bc.rotate(.012 + .02 * M.energy); const s = 1.03 + .05 * M.kick; bc.scale(s, s); bc.globalAlpha = .88; bc.drawImage(st.a, -hw / 2, -hh / 2, hw, hh); bc.restore();
      bc.globalCompositeOperation = "lighter"; bc.globalAlpha = .6; bc.drawImage(B, 0, 0, hw, hh);
      [st.a, st.b] = [st.b, st.a];
      F.drawImage(st.a, 0, 0, B.width, B.height); } },
  { key: "aggressive", name: "Aggressive", mode: "lighter", bias: { energy: .35, grace: -.35, chaos: .25 },
    draw(F, B, st, M) { st.p = Math.max((st.p || 0) - M.dt * 3.5, M.hit ? 1 : 0); const p = st.p, W = B.width, H = B.height;
      for (const [k, a] of [[.14, 1], [.3, .45]]) { const s = 1 + k * p, sx = (Math.random() - .5) * W * .03 * p, sy = (Math.random() - .5) * H * .03 * p;
        F.globalAlpha *= a; F.drawImage(B, (W - W * s) / 2 + sx, (H - H * s) / 2 + sy, W * s, H * s); F.globalAlpha /= a; } } },
  { key: "dreamy", name: "Dreamy", mode: "screen", bias: { tempo: -.2, grace: .35, energy: -.1, trails: .3 },
    draw(F, B, st, M) { st.s ||= mk(1, 1); st.m ||= mk(1, 1); const W = B.width, H = B.height;
      const sc = fit(st.s, W / 14, H / 14), mc = fit(st.m, W / 4, H / 4);
      sc.globalCompositeOperation = "source-over"; sc.drawImage(B, 0, 0, st.s.width, st.s.height);
      mc.globalCompositeOperation = "source-over"; mc.imageSmoothingEnabled = true; mc.drawImage(st.s, 0, 0, st.m.width, st.m.height);
      mc.globalCompositeOperation = "lighter"; mc.globalAlpha = .35; mc.drawImage(B, 0, 0, st.m.width, st.m.height); mc.globalAlpha = 1;
      const s = 1.04 + .02 * Math.sin(M.t * .5); F.drawImage(st.m, (W - W * s) / 2, (H - H * s) / 2, W * s, H * s); } },
  { key: "glitch", name: "Glitch", mode: "source-over", bias: { chaos: .3, grace: -.45 },
    draw(F, B, st, M) { st.r ||= mk(1, 1); st.c ||= mk(1, 1); st.o ||= mk(1, 1); const hw = B.width / 2, hh = B.height / 2;
      const rc = fit(st.r, hw, hh), cc = fit(st.c, hw, hh), oc = fit(st.o, hw, hh);
      [[rc, "#ff0000"], [cc, "#00ffff"]].forEach(([c, col]) => { c.globalCompositeOperation = "source-over"; c.drawImage(B, 0, 0, hw, hh); c.globalCompositeOperation = "multiply"; c.fillStyle = col; c.fillRect(0, 0, hw, hh); });
      st.life = (st.life || 0) - M.dt;
      if (M.hit || Math.random() < M.dt * (.6 + 4 * M.chaos)) { const n = 6 + Math.floor(Math.random() * 8); st.bands = []; let y = 0; for (let i = 0; i < n && y < hh; i++) { const h = hh * (.03 + Math.random() * .16); st.bands.push([y, h, (Math.random() - .5) * hw * .18, 1 + Math.random() * hw * .02]); y += h + Math.random() * hh * .08; } st.life = .08 + Math.random() * .2; }
      oc.globalCompositeOperation = "source-over"; oc.fillStyle = "#000"; oc.fillRect(0, 0, hw, hh); oc.globalCompositeOperation = "lighter";
      const bands = st.life > 0 && st.bands ? st.bands : [[0, hh, 0, 1.5]];
      if (st.life > 0) { oc.drawImage(st.r, 1.5, 0); oc.drawImage(st.c, -1.5, 0); oc.globalCompositeOperation = "source-over"; bands.forEach(([y, h]) => { oc.fillStyle = "#000"; oc.fillRect(0, y, hw, h); }); oc.globalCompositeOperation = "lighter"; }
      bands.forEach(([y, h, dx, sp]) => { oc.drawImage(st.r, 0, y, hw, h, dx + sp, y, hw, h); oc.drawImage(st.c, 0, y, hw, h, dx - sp, y, hw, h); });
      if (!st.scan) { const p = mk(1, 3), pc = p.getContext("2d"); pc.fillStyle = "rgba(0,0,0,.45)"; pc.fillRect(0, 2, 1, 1); st.scan = oc.createPattern(p, "repeat"); }
      oc.globalCompositeOperation = "source-over"; oc.fillStyle = st.scan; oc.fillRect(0, 0, hw, hh);
      F.drawImage(st.o, 0, 0, B.width, B.height); } },
  { key: "electric", name: "Electric", mode: "lighter", bias: { energy: .2, tempo: .25 },
    draw(F, B, st, M) { st.o ||= mk(1, 1); const hw = B.width / 2, hh = B.height / 2, oc = fit(st.o, hw, hh);
      st.f = Math.max((st.f || 0) - M.dt * 6, M.hit || M.hat ? 1 : 0);
      oc.globalCompositeOperation = "source-over"; oc.fillStyle = "#000"; oc.fillRect(0, 0, hw, hh); oc.globalCompositeOperation = "lighter";
      const a = .2 + .8 * st.f * (.5 + Math.random() * .5), j = 3 * st.f;
      oc.globalAlpha = a; oc.drawImage(B, (Math.random() - .5) * j, (Math.random() - .5) * j, hw, hh); oc.drawImage(B, (Math.random() - .5) * j, (Math.random() - .5) * j, hw, hh); oc.globalAlpha = 1;
      F.drawImage(st.o, 0, 0, B.width, B.height); } },
  { key: "fluid", name: "Fluid", mode: "source-over", bias: { grace: .45, chaos: -.1, trails: .15 },
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 60, sh = H / n;
      for (let i = 0; i < n; i++) { const sy = i * sh, off = Math.sin(i * .35 + M.t * 2.2) * W * .018 * (1 + 2 * M.bass) + Math.sin(i * .13 - M.t * 1.3) * W * .01;
        F.drawImage(B, 0, sy, W, sh + 1, off, sy + Math.sin(i * .2 + M.t) * 2, W, sh + 1); } } }
];
const MOOD = Object.fromEntries(MOODS.map(m => [m.key, m]));
