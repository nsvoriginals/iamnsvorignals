/* Koi pond: vanilla-JS port of the koi engine.
   Koi are spine chains rasterised into character tiles; they swim around [data-koi-avoid] content,
   chase thrown pellets, spook on fast cursor swipes, and leave ASCII ripples. */
window.Pond = (() => {
  const TAU = Math.PI * 2, NODES = 20, RIPPLE_SPEED = 52, PELLET_LIFE = 14, BITE_LIFE = .45,
        RUSH_RANGE = 650, FEED_CALM = 2, PELLET_SINK = 9, THROW = 34, STARTLE = 1100,
        MAX_PELLETS = 24, STEP = 1 / 60;
  const INTERACTIVE = "a, button, input, textarea, select, label, [role='button'], [data-koi-ignore]";
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const angleDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const hash3 = (x, y, z) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  };
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), u = smoothstep(0, 1, x - xi), v = smoothstep(0, 1, y - yi);
    const a = hash3(xi, yi, seed), b = hash3(xi + 1, yi, seed),
          c = hash3(xi, yi + 1, seed), d = hash3(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const mix = (a, b, k) => [
    (a[0] + (b[0] - a[0]) * k) | 0,
    (a[1] + (b[1] - a[1]) * k) | 0,
    (a[2] + (b[2] - a[2]) * k) | 0
  ];
  const shade = (c, k) => [
    Math.min(255, c[0] * k) | 0,
    Math.min(255, c[1] * k) | 0,
    Math.min(255, c[2] * k) | 0
  ];
  const pack = c => (c[0] << 16) | (c[1] << 8) | c[2];
  const ramp = (s, t) => {
    const x = clamp(t, 0, 1) * (s.length - 1), i = Math.min(s.length - 2, Math.floor(x));
    return mix(s[i], s[i + 1], x - i);
  };
  const lineGlyph = (dx, dy) => {
    const d = Math.hypot(dx, dy) || 1;
    if (Math.abs(dy) < .38 * d) return "-";
    if (Math.abs(dx) < .38 * d) return "|";
    return dx * dy > 0 ? "\\" : "/";
  };

  /* ── palettes ── */
  const DARK = {
    bg: [26, 24, 22], white: [236, 228, 218], red: [232, 96, 56], black: [92, 90, 108],
    fin: [214, 206, 198], eye: [20, 20, 26], water: [255, 247, 240], shadow: [0, 0, 0],
    shadowAlpha: .55, pellet: [236, 170, 92], alpha: .8, depthFloor: .4, tile: [.68, .98], ink: .42,
    hi: [[112, 22, 24], [168, 34, 28], [214, 58, 30], [240, 96, 34], [250, 138, 52], [255, 178, 96]]
  };
  const LIGHT = {
    bg: [245, 243, 239], white: [112, 108, 104], red: [204, 62, 28], black: [36, 33, 40],
    fin: [138, 132, 126], eye: [24, 22, 26], water: [38, 37, 35], shadow: [60, 58, 56],
    shadowAlpha: .2, pellet: [176, 108, 40], alpha: .9, depthFloor: .55, tile: [.78, .55], ink: .45,
    hi: [[138, 24, 22], [184, 38, 24], [222, 62, 28], [238, 100, 38], [244, 140, 66], [248, 176, 116]]
  };

  /* ── shape ── */
  const F_BODY = 1, F_FIN = 2, F_EYE = 3, F_DORSAL = 4, F_BARBEL = 5, BODY_END = .74;
  function bodyHalfWidth(s) {
    if (s < .12) return .11 * Math.pow(Math.sin(s / .12 * Math.PI / 2), .55);
    if (s < .3) return .11 + .025 * smoothstep(.12, .3, s);
    return .033 + .102 * (1 - smoothstep(.3, .74, s));
  }
  const tailHalfWidth = s => .03 + .15 * Math.pow(smoothstep(.7, 1, s), .8);
  function inFin(s, a, rootS, angle, reach, width, o) {
    const rootA = bodyHalfWidth(rootS) * .85, ca = Math.cos(angle), sa = Math.sin(angle),
          du = s - rootS, da = a - rootA;
    const along = du * ca + da * sa - reach, perp = -du * sa + da * ca;
    if ((along / reach) ** 2 + (perp / width) ** 2 > 1) return false;
    o.flag = F_FIN; o.du = du; o.da = da; return true;
  }
  function classify(s, a, past, flare, o, ahead, lateral) {
    o.flag = 0; o.across = 1; o.du = 1; o.da = 0;
    if (ahead > 0) {
      if (ahead < .05 && Math.abs(lateral - (.045 + ahead * .7)) < .016) { o.flag = F_BARBEL; return true; }
      return false;
    }
    const w = bodyHalfWidth(s);
    if (s <= BODY_END && a <= w) {
      const ac = a / w; o.across = ac;
      if (s > .055 && s < .1 && ac > .5 && ac < .85) o.flag = F_EYE;
      else if (s > .28 && s < .6 && ac < .14) o.flag = F_DORSAL;
      else o.flag = F_BODY;
      return true;
    }
    if (s > .68 && past <= 0) {
      const tw = tailHalfWidth(s) * flare;
      if (a <= tw && s <= .86 + .14 * (a / tw)) { o.flag = F_FIN; o.da = a / tw * .8; return true; }
    }
    return inFin(s, a, .19, .85 + .5 * (flare - 1), .066 * flare, .04, o)
        || inFin(s, a, .47, .75, .036, .018, o);
  }

  /* ── markings ── */
  function markings(k) {
    const r = j => hash3(k.id, j, 41);
    if (k.variety === "tancho") return { red: [{ s: .11, v: 0, rs: .05, rv: .055 }], black: [] };
    const red = [];
    if (r(0) < .75) red.push({ s: .1, v: (r(1) - .5) * .03, rs: .055 + r(2) * .03, rv: .11 });
    const n = 2 + Math.floor(r(3) * 2);
    for (let j = 0; j < n; j++) {
      const sp = .42 / n;
      red.push({
        s: .25 + sp * (j + .5) + (r(10 + j) - .5) * sp * .3,
        v: (r(20 + j) - .5) * .05,
        rs: sp * (.32 + r(30 + j) * .12),
        rv: .09 + r(40 + j) * .05
      });
    }
    const black = [];
    if (k.variety === "sanke") {
      const m = 4 + Math.floor(r(50) * 3);
      for (let j = 0; j < m; j++) black.push({
        s: .24 + r(60 + j) * .44,
        v: (r(70 + j) - .5) * .16,
        rs: .022, rv: .026
      });
    }
    return { red, black };
  }
  const inPatch = (m, s, vn, w) =>
    ((s - m.s) / m.rs) ** 2 + ((vn - m.v) / m.rv) ** 2 < 1 + w;

  /* ── repel from content boxes ── */
  const push = { x: 0, y: 0 };
  function repel(boxes, x, y, margin, out) {
    out.x = 0; out.y = 0;
    for (const b of boxes) {
      let ox = x - clamp(x, b.left, b.right), oy = y - clamp(y, b.top, b.bottom),
          d = Math.hypot(ox, oy);
      if (d > margin) continue;
      if (d < 1e-3) {
        const e = [b.left - x, x - b.right, b.top - y, y - b.bottom],
              n = e.indexOf(Math.max(...e));
        ox = n === 0 ? -1 : n === 1 ? 1 : 0;
        oy = n === 2 ? -1 : n === 3 ? 1 : 0;
        d = 0;
      }
      const l = Math.hypot(ox, oy) || 1;
      out.x += ox / l * (1 - d / margin);
      out.y += oy / l * (1 - d / margin);
    }
    return out;
  }
  const rippleLife = r => 2.2 + r.strength * 1.6;

  /* ── world ── */
  const VARIETIES = [["kohaku", 3], ["sanke", 2], ["tancho", 1]];
  function pickVariety() {
    let r = Math.random() * 6;
    for (const [v, w] of VARIETIES) { r -= w; if (r <= 0) return v; }
    return "kohaku";
  }

  class World {
    constructor() {
      this.width = 0; this.height = 0; this.time = 0;
      this.koi = []; this.pellets = []; this.bites = []; this.ripples = []; this.avoid = [];
      this.lastFeed = -Infinity;
      this.pointer = { x: 0, y: 0, speed: 0, active: false };
    }
    resize(w, h) {
      const first = this.width === 0;
      this.width = w; this.height = h;
      if (first) this.seed();
    }
    seed() {
      const W = this.width, H = this.height,
            base = clamp(Math.min(W, H) * .5, 170, 420),
            count = clamp(Math.round(W * H / 240000), 3, 6),
            young = W >= 1024 ? 2 : 0;
      for (let i = 0; i < count + young; i++) {
        const isY = i >= count,
              length = base * (isY ? rand(.32, .45) : rand(.6, 1)),
              depthMax = isY ? .72 : 1,
              heading = rand(0, TAU),
              x = rand(W * .1, W * .9), y = rand(H * .1, H * .9),
              nodes = new Float32Array(NODES * 2),
              seg = length / (NODES - 1);
        for (let n = 0; n < NODES; n++) {
          nodes[n * 2] = x - Math.cos(heading) * seg * n;
          nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
        }
        this.koi.push({
          id: i + 1, variety: pickVariety(), length, nodes, heading,
          speed: 20, phase: rand(0, TAU), turn: 0, wander: 0,
          curiosity: rand(.35, 1), depth: rand(.5, depthMax),
          depthTarget: rand(.5, depthMax), depthMax,
          nextDive: rand(6, 18), nextSurface: rand(3, 14), nextWake: rand(0, 2),
          beat: 0, rush: 0, food: null, burstUntil: 0, nextBurst: rand(0, 3),
          finPhase: rand(0, TAU), startle: 0, fleeX: 0, fleeY: 0, gulp: 0
        });
      }
    }
    feed(x, y) {
      this.lastFeed = this.time;
      this.ripples.push({ x, y, born: this.time, strength: .35 });
      const count = Math.min(5 + Math.floor(Math.random() * 3), MAX_PELLETS - this.pellets.length);
      for (let k = 0; k < count; k++) {
        const a = rand(0, TAU), r = Math.sqrt(Math.random()) * THROW, dr = rand(2, 6);
        this.pellets.push({
          x: x + Math.cos(a) * r * 1.3, y: y + Math.sin(a) * r,
          born: this.time, landAt: rand(.15, .45), landed: false,
          vx: Math.cos(a) * dr, vy: Math.sin(a) * dr
        });
      }
    }
    step(dt) {
      this.time += dt;
      this.pointer.speed *= Math.exp(-dt * 8);
      for (const k of this.koi) this.stepKoi(k, dt);
      const t = this.time;
      this.pellets = this.pellets.filter(p => t - p.born < PELLET_LIFE);
      for (const p of this.pellets) {
        if (!p.landed) {
          if (t - p.born < p.landAt) continue;
          p.landed = true;
          this.ripples.push({ x: p.x, y: p.y, born: t, strength: .1 });
          for (const k of this.koi) {
            if (Math.hypot(k.nodes[0] - p.x, k.nodes[1] - p.y) < RUSH_RANGE) k.rush = 1;
          }
          continue;
        }
        const d = Math.exp(-dt * .2);
        p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      this.ripples = this.ripples.filter(r => t - r.born < rippleLife(r));
      this.bites = this.bites.filter(b => t - b.born < BITE_LIFE);
    }
    stepKoi(k, dt) {
      const W = this.width, H = this.height, pointer = this.pointer, time = this.time,
            L = k.length, nodes = k.nodes, hx = nodes[0], hy = nodes[1];
      let dx = Math.cos(k.heading), dy = Math.sin(k.heading);
      k.wander = clamp(k.wander + (Math.random() - .5) * dt * 2.4, -.9, .9);
      dx += Math.cos(k.heading + k.wander) * .6;
      dy += Math.sin(k.heading + k.wander) * .6;

      const food = this.pickFood(k, hx, hy, Math.max(L * 1.6 + 220, k.rush > 0 ? RUSH_RANGE : 0));
      const pd = Math.hypot(pointer.x - hx, pointer.y - hy),
            feeding = time - this.lastFeed < FEED_CALM;
      if (!food && !feeding && pointer.active && pointer.speed > STARTLE && pd < L * .9) {
        k.startle = 1; k.fleeX = pointer.x; k.fleeY = pointer.y;
      }
      k.startle = Math.max(0, k.startle - dt * .6);
      const fleeing = k.startle > .3 && !food;
      let chasing = false, curious = false, closing = 0;
      if (fleeing) {
        const ox = hx - k.fleeX, oy = hy - k.fleeY, d = Math.hypot(ox, oy) || 1;
        dx += ox / d * 4 * k.startle;
        dy += oy / d * 4 * k.startle;
      } else if (food) {
        const tx = food.x - hx, ty = food.y - hy, d = Math.hypot(tx, ty) || 1;
        dx += tx / d * 3; dy += ty / d * 3;
        chasing = true;
        closing = clamp(1 - d / (L * 1.2), 0, 1);
      } else if (pointer.active) {
        const tx = pointer.x - hx, ty = pointer.y - hy, d = Math.hypot(tx, ty) || 1, range = 300;
        if (d < range) {
          const w = k.curiosity * (1 - d / range) * 2.2,
                near = clamp(d / (L * .6), 0, 1);
          dx += (tx / d * near - ty / d * (1 - near)) * w;
          dy += (ty / d * near + tx / d * (1 - near)) * w;
          curious = true;
        }
      }
      for (const o of this.koi) {
        if (o === k) continue;
        const ohx = o.nodes[0], ohy = o.nodes[1];
        if (Math.abs(ohx - hx) > L * 2 || Math.abs(ohy - hy) > L * 2) continue;
        for (let n = 0; n < NODES; n += 3) {
          const ox = hx - o.nodes[n * 2], oy = hy - o.nodes[n * 2 + 1],
                d = Math.hypot(ox, oy), range = (L + o.length) * (food ? .12 : .28);
          if (d < range && d > 1e-3) {
            const w = (1 - d / range) * 2.4;
            dx += ox / d * w; dy += oy / d * w;
          }
        }
        if (!chasing && Math.hypot(ohx - hx, ohy - hy) < L * 1.6) {
          dx += Math.cos(o.heading) * .18; dy += Math.sin(o.heading) * .18;
        }
      }
      repel(this.avoid, hx, hy, L * .4, push);
      dx += push.x * (chasing || curious ? .5 : 1.8);
      dy += push.y * (chasing || curious ? .5 : 1.8);
      const over = Math.max(-hx, hx - W, -hy, hy - H);
      if (over > -L * .25) {
        const w = clamp((over + L * .25) / (L * .5), 0, 1) * 3.5,
              tx = W / 2 - hx, ty = H / 2 - hy, d = Math.hypot(tx, ty) || 1;
        dx += tx / d * w; dy += ty / d * w;
      }
      const desired = Math.atan2(dy, dx);
      const agility = (1 + k.rush * .6) * Math.min(
        fleeing ? 3 : chasing ? 1.9 + closing : curious ? 1.2 : .7,
        k.speed / L * 4
      ), maxTurn = agility * dt;
      const turned = clamp(angleDiff(k.heading, desired), -maxTurn, maxTurn);
      k.heading += turned;
      k.turn += (turned / dt - k.turn) * Math.min(1, dt * 3);

      if (time > k.nextBurst && time > k.burstUntil) {
        k.burstUntil = time + rand(.7, 1.6);
        k.nextBurst = k.burstUntil + rand(1.2, 4);
      }
      const bursting = fleeing || chasing || time < k.burstUntil;
      k.beat += ((bursting ? 1 : 0) - k.beat) * Math.min(1, dt * 3);
      if (k.beat > .6 && k.depth > .65 && time > k.nextWake) {
        const t = (NODES - 3) * 2;
        this.ripples.push({ x: nodes[t], y: nodes[t + 1], born: time, strength: .25 + .2 * k.depth });
        k.nextWake = time + rand(.8, 1.6) / k.beat;
      }
      k.rush = Math.max(0, k.rush - dt * .7);
      const cruise = 12 + L * .05,
            target = (1 + k.rush * .8) * (
              fleeing ? cruise * 3.2
              : chasing ? cruise * (1.9 + closing)
              : bursting ? cruise * (curious ? 1.6 : 1.35)
              : cruise * .45
            );
      k.speed += (target - k.speed) * Math.min(1, dt * (bursting ? 1.6 + k.rush * 3 : .35));
      k.phase += dt * (.6 + k.beat * (2.2 + k.speed / 11));
      k.finPhase += dt * 2.4;
      k.gulp += ((chasing && closing > .55 ? 1 : 0) - k.gulp) * Math.min(1, dt * 6);
      if (time > k.nextDive) {
        k.depthTarget = rand(.5, k.depthMax);
        k.nextDive = time + rand(8, 20);
      }
      k.depth += ((chasing ? 1 : k.depthTarget) - k.depth) * Math.min(1, dt * (chasing ? .8 : .15));
      nodes[0] += Math.cos(k.heading) * k.speed * dt;
      nodes[1] += Math.sin(k.heading) * k.speed * dt;
      const seg = L / (NODES - 1), maxBend = .16;
      let prev = k.heading + Math.PI;
      for (let n = 1; n < NODES; n++) {
        const px = nodes[(n - 1) * 2], py = nodes[(n - 1) * 2 + 1];
        let a = Math.atan2(nodes[n * 2 + 1] - py, nodes[n * 2] - px);
        a = prev + clamp(angleDiff(prev, a), -maxBend, maxBend);
        nodes[n * 2] = px + Math.cos(a) * seg;
        nodes[n * 2 + 1] = py + Math.sin(a) * seg;
        prev = a;
      }
      const mr = L * .08 + 6, before = this.pellets.length;
      this.pellets = this.pellets.filter(p =>
        !p.landed || (p.x - nodes[0]) ** 2 + (p.y - nodes[1]) ** 2 > mr * mr
      );
      if (this.pellets.length < before) {
        this.ripples.push({ x: nodes[0], y: nodes[1], born: time, strength: .6 });
        this.bites.push({ x: nodes[0], y: nodes[1], born: time });
        k.nextSurface = time + rand(6, 16);
      } else if (time > k.nextSurface) {
        this.ripples.push({ x: nodes[0], y: nodes[1], born: time, strength: .3 });
        k.nextSurface = time + rand(8, 20);
      }
    }
    pickFood(k, x, y, range) {
      if (k.food && !this.pellets.includes(k.food)) k.food = null;
      const nearest = this.nearestPellet(x, y, range);
      if (!k.food) return (k.food = nearest);
      const cur = Math.hypot(k.food.x - x, k.food.y - y);
      if (cur > range * 1.3) k.food = nearest;
      else if (nearest && Math.hypot(nearest.x - x, nearest.y - y) < cur * .5) k.food = nearest;
      return k.food;
    }
    nearestPellet(x, y, range) {
      let best = null, bd = range * range;
      for (const p of this.pellets) {
        if (!p.landed) continue;
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
  }

  /* ── renderer ── */
  const SUB = [.25, .25, .75, .25, .25, .75, .75, .75],
        GLYPHS = "t%SX8@#",
        DIM_UNDER = .15;

  class Renderer {
    constructor(canvas) {
      this.ctx = canvas.getContext("2d");
      this.dpr = 1;
      this.cw = 8;
      this.ch = 12;
      this.cols = 0;
      this.rows = 0;
      this.palette = DARK;
      this.styles = new Map();
      this.mk = new Map();
      this.spine = new Float32Array(NODES * 2);
      this.arc = new Float32Array(NODES);
      this.arcTotal = 1;
      this.flareL = 1;
      this.flareR = 1;
      this.hit = { flag: 0, across: 1, du: 1, da: 0 };
      this.hS = 0; this.hV = 0; this.hD = 0; this.hTx = 1; this.hTy = 0; this.hSeg = 0;
      this._order = null;
    }
    setTheme(light) { this.palette = light ? LIGHT : DARK; this.styles.clear(); }
    resize(w, h, dpr) {
      this.dpr = dpr;
      this.cw = clamp(Math.round(w / 125), 8, 12);
      this.ch = this.cw + 2;
      this.cols = Math.ceil(w / this.cw);
      this.rows = Math.ceil(h / this.ch);
      this.ctx.canvas.width = Math.round(w * dpr);
      this.ctx.canvas.height = Math.round(h * dpr);
      const n = this.cols * this.rows;
      this.energy = new Float32Array(n);
      this.tmp = new Float32Array(n);
      this.glyph = new Uint16Array(n);
      this.color = new Uint32Array(n);
      this.alpha = new Float32Array(n);
      this.tile = new Uint32Array(n);
      this.tileA = new Float32Array(n);
      this.dim = new Float32Array(n).fill(1);
      this.shadow = new Uint8Array(n);
    }
    setDimBoxes(boxes) {
      const { cols, rows, cw, ch, dim } = this;
      dim.fill(1);
      const pad = cw * 4;
      for (const b of boxes) {
        const c0 = Math.max(0, Math.floor((b.left - pad) / cw)),
              c1 = Math.min(cols - 1, Math.floor((b.right + pad) / cw)),
              r0 = Math.max(0, Math.floor((b.top - pad) / ch)),
              r1 = Math.min(rows - 1, Math.floor((b.bottom + pad) / ch));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const x = c * cw + cw / 2, y = r * ch + ch / 2,
                  d = Math.hypot(
                    Math.max(b.left - x, 0, x - b.right),
                    Math.max(b.top - y, 0, y - b.bottom)
                  ), i = r * cols + c;
            dim[i] = Math.min(dim[i], DIM_UNDER + (1 - DIM_UNDER) * smoothstep(0, pad, d));
          }
        }
      }
    }
    render(world, dt) {
      const { ctx, dpr, cols } = this;
      if (!cols) return;
      this.glyph.fill(0); this.tileA.fill(0); this.shadow.fill(0);

      // allocation-free depth sort
      const n = world.koi.length;
      if (!this._order || this._order.length !== n) this._order = new Int32Array(n);
      const order = this._order;
      for (let i = 0; i < n; i++) order[i] = i;
      for (let i = 1; i < n; i++) {
        const v = order[i], d = world.koi[v].depth;
        let j = i - 1;
        while (j >= 0 && world.koi[order[j]].depth > d) { order[j + 1] = order[j]; j--; }
        order[j + 1] = v;
      }
      for (let i = 0; i < n; i++) this.raster(world.koi[order[i]], world.time);

      this.deposit(world);
      this.diffuse(dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `600 ${Math.round(this.ch * .72)}px "Geist Mono", ui-monospace, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.drawShadows();
      this.drawWake();
      this.drawRipples(world);
      this.drawPellets(world);
      this.drawCells();
      this.drawBites(world);
      ctx.globalAlpha = 1;
    }
    style(rgb) {
      let s = this.styles.get(rgb);
      if (!s) {
        s = `rgb(${rgb >>> 16},${(rgb >>> 8) & 255},${rgb & 255})`;
        this.styles.set(rgb, s);
      }
      return s;
    }
    glyphAt(i, g, rgb, a) {
      const { ctx, cw, ch, cols } = this;
      ctx.globalAlpha = a;
      ctx.fillStyle = this.style(pack(rgb));
      ctx.fillText(g, (i % cols) * cw + cw / 2, ((i / cols) | 0) * ch + ch / 2);
    }
    cellIndex(x, y) {
      const c = Math.floor(x / this.cw), r = Math.floor(y / this.ch);
      return c < 0 || r < 0 || c >= this.cols || r >= this.rows ? -1 : r * this.cols + c;
    }
    sample(px, py, L, from = 0, to = NODES - 2) {
      const { spine, arc } = this;
      let best = Infinity, bs = 0, sign = 1, past = 0, ahead = 0, lat = 0;
      for (let n = from; n <= to; n++) {
        const ax = spine[n * 2], ay = spine[n * 2 + 1],
              sx = spine[(n + 1) * 2] - ax, sy = spine[(n + 1) * 2 + 1] - ay,
              l2 = sx * sx + sy * sy || 1,
              raw = ((px - ax) * sx + (py - ay) * sy) / l2,
              u = clamp(raw, 0, 1),
              d2 = (px - ax - sx * u) ** 2 + (py - ay - sy * u) ** 2;
        if (d2 < best) {
          const len = Math.sqrt(l2);
          best = d2;
          bs = (arc[n] + u * len) / this.arcTotal;
          sign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
          past = n === NODES - 2 ? Math.max(0, raw - 1) * len : 0;
          ahead = n === 0 ? Math.max(0, -raw) * len : 0;
          lat = Math.abs(sx * (py - ay) - sy * (px - ax)) / len;
          this.hTx = sx / len; this.hTy = sy / len; this.hSeg = n;
        }
      }
      const a = Math.sqrt(best);
      this.hD = a;
      this.hS = bs;
      this.hV = a * sign;
      return classify(bs, a / L, past / L, sign > 0 ? this.flareL : this.flareR, this.hit, ahead / L, lat / L);
    }
    skin(k, s, v, across) {
      const p = this.palette, vn = v / k.length;
      if (across > .9 || s > .74) return p.white;
      const w = (vnoise(s * 14 + k.id, vn * 30, k.id + 3) - .5) * .6;
      let m = this.mk.get(k.id);
      if (!m) { m = markings(k); this.mk.set(k.id, m); }
      for (const b of m.black) if (inPatch(b, s, vn, w)) return p.black;
      for (const r of m.red) if (inPatch(r, s, vn, w)) return p.red;
      return p.white;
    }
    raster(k, t) {
      const { spine, arc, cw, ch, cols, rows, glyph, color, alpha, tile, tileA, palette } = this,
            L = k.length, nodes = k.nodes,
            swim = .2 + 1.1 * k.beat;
      for (let n = 0; n < NODES; n++) {
        const s = n / (NODES - 1), a = Math.max(0, n - 1), b = Math.min(NODES - 1, n + 1);
        let tx = nodes[a * 2] - nodes[b * 2], ty = nodes[a * 2 + 1] - nodes[b * 2 + 1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl; ty /= tl;
        const off = L * .04 * (.05 + .95 * Math.pow(s, 2.2)) * swim * Math.sin(k.phase - s * 4.6);
        spine[n * 2] = nodes[n * 2] - ty * off;
        spine[n * 2 + 1] = nodes[n * 2 + 1] + tx * off;
      }
      arc[0] = 0;
      for (let n = 1; n < NODES; n++) {
        arc[n] = arc[n - 1] + Math.hypot(
          spine[n * 2] - spine[(n - 1) * 2],
          spine[n * 2 + 1] - spine[(n - 1) * 2 + 1]
        );
      }
      this.arcTotal = arc[NODES - 1] || 1;
      const spread = 1 - .25 * k.beat,
            scull = .18 * (1 - k.beat) * Math.sin(k.finPhase),
            bank = clamp(k.turn * .6, -.35, .35);
      this.flareL = spread + scull - bank;
      this.flareR = spread - scull + bank;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let n = 0; n < NODES; n++) {
        minX = Math.min(minX, spine[n * 2]);
        maxX = Math.max(maxX, spine[n * 2]);
        minY = Math.min(minY, spine[n * 2 + 1]);
        maxY = Math.max(maxY, spine[n * 2 + 1]);
      }
      const reach = L * .26,
            c0 = Math.max(0, Math.floor((minX - reach) / cw)),
            c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw)),
            r0 = Math.max(0, Math.floor((minY - reach) / ch)),
            r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
      if (c0 > c1 || r0 > r1) return;
      const diag = Math.hypot(cw, ch),
            sDc = Math.round(L * .07 * k.depth / cw) + 1,
            sDr = Math.round(L * .05 * k.depth / ch) + 1,
            dim = palette.alpha * (palette.depthFloor + (1 - palette.depthFloor) * k.depth),
            [t0, t1] = palette.tile,
            hit = this.hit;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * cw, y = r * ch,
                centerHit = this.sample(x + cw / 2, y + ch / 2, L);
          if (!centerHit && this.hD > L * (this.hS > .4 && this.hS < .62 ? .15 : .25) + diag) {
            c += Math.max(0, Math.floor((this.hD - L * .25 - diag) / cw));
            continue;
          }
          const from = Math.max(0, this.hSeg - 2), to = Math.min(NODES - 2, this.hSeg + 2);
          let flag = hit.flag, across = hit.across,
              s = this.hS, v = this.hV, tx = this.hTx, ty = this.hTy,
              hits = centerHit ? 1 : 0, gx = 0, gy = 0;
          const deep = centerHit && flag !== F_FIN && flag !== F_BARBEL &&
                       s > .04 && s < .72 &&
                       bodyHalfWidth(s) * L - this.hD > diag * .35;
          if (deep) hits = 5;
          for (let q = 0; !deep && q < SUB.length; q += 2) {
            if (!this.sample(x + SUB[q] * cw, y + SUB[q + 1] * ch, L, from, to)) continue;
            gx += (SUB[q] - .5) * cw;
            gy += (SUB[q + 1] - .5) * ch;
            if (hits === 0) {
              flag = hit.flag; across = hit.across;
              s = this.hS; v = this.hV;
              tx = this.hTx; ty = this.hTy;
            }
            hits++;
          }
          if (!hits) continue;
          const cov = hits / 5,
                side = v >= 0 ? 1 : -1,
                i = r * cols + c,
                key = (hash3(Math.round(s * 90), Math.round(v / (cw * .8)), k.id) * 4294967295) >>> 0,
                solid = centerHit && cov >= .6;
          let g = " ", rgb = palette.fin, al = dim, tl = null, ta = 0;
          if (flag === F_BARBEL) {
            g = lineGlyph(-tx - side * ty * .7, -ty + side * tx * .7);
            rgb = shade(mix(palette.bg, palette.fin, .9), palette.ink + .3);
          } else if (flag === F_EYE && solid) {
            tl = mix(palette.bg, palette.eye, .85);
            ta = dim;
            g = "o";
            rgb = mix(palette.bg, palette.white, .9);
          } else if (flag === F_FIN) {
            tl = mix(palette.bg, palette.fin, .55);
            ta = dim * .45 * cov;
            if (key % 2 === 0) { g = "."; al *= .6 * cov; }
          } else {
            const skin = this.skin(k, s, v, across),
                  facing = side * (.6 * ty - .8 * tx) * across,
                  lum = clamp(.22 + .5 * Math.sqrt(1 - across * across) + .18 * facing, 0, 1);
            if (skin === palette.red) {
              const lean = (hash3(k.id, 5, 17) - .5) * .3,
                    grain = (vnoise(s * 9 + k.id, v / L * 18, k.id + 21) - .5) * .25,
                    sheen = Math.max(0, Math.sin(s * 11 - t * 1.8 + k.id) - .7) / .3;
              tl = ramp(palette.hi, .15 + .8 * lum + lean + grain + sheen * .35);
            } else {
              tl = mix(palette.bg, skin, t0 + (t1 - t0) * lum);
            }
            if (hits === 5) {
              const sc = c + sDc, sr = r + sDr;
              if (sc < cols && sr < rows) this.shadow[sr * cols + sc] = 1;
              ta = dim;
              if (s < .035 && across < .6 && k.gulp > .5) {
                g = "o"; rgb = palette.eye;
              } else {
                g = GLYPHS[clamp(Math.round((1 - lum) * 4) + (key >>> 4) % 3, 0, GLYPHS.length - 1)];
                rgb = shade(tl, palette.ink);
                if (skin === palette.white) al *= .6;
                const tick = Math.floor(t * 1.4 + (key % 997) / 97);
                if (hash3(key, tick, 7) < .03) tl = mix(tl, palette.bg, .45);
              }
            } else {
              ta = dim * cov * .55;
              if (Math.hypot(gx, gy) > cw * .2 && key % 3 === 0) {
                g = "."; rgb = shade(tl, palette.ink);
              }
            }
          }
          if (g === " " && ta === 0) continue;
          tile[i] = tl ? pack(tl) : 0;
          tileA[i] = ta;
          glyph[i] = g.charCodeAt(0);
          color[i] = pack(rgb);
          alpha[i] = al;
        }
      }
    }
    drawCells() {
      const { ctx, cw, ch, cols, glyph, color, alpha, tile, tileA, dim } = this;
      for (let i = 0; i < glyph.length; i++) {
        const code = glyph[i];
        if (!code) continue;
        const x = (i % cols) * cw, y = ((i / cols) | 0) * ch;
        if (tileA[i] > 0) {
          ctx.globalAlpha = tileA[i] * dim[i];
          ctx.fillStyle = this.style(tile[i]);
          ctx.fillRect(x + 1, y + 1, cw - 1, ch - 1);
        }
        if (code === 32) continue;
        ctx.globalAlpha = alpha[i] * dim[i];
        ctx.fillStyle = this.style(color[i]);
        ctx.fillText(String.fromCharCode(code), x + cw / 2, y + ch / 2 + 1);
      }
    }
    deposit(world) {
      const e = this.energy;
      for (const k of world.koi) {
        for (let n = NODES - 4; n < NODES; n++) {
          const i = this.cellIndex(k.nodes[n * 2], k.nodes[n * 2 + 1]);
          if (i >= 0) e[i] = Math.min(1.5, e[i] + .035 + k.speed * .0012);
        }
      }
      if (world.pointer.active) {
        const i = this.cellIndex(world.pointer.x, world.pointer.y);
        if (i >= 0) e[i] = Math.min(1.5, e[i] + .12);
      }
    }
    diffuse(dt) {
      const { cols, rows, energy: e, tmp } = this, decay = Math.exp(-dt * 1.1);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c,
                l = c > 0 ? e[i - 1] : e[i],
                rt = c < cols - 1 ? e[i + 1] : e[i],
                u = r > 0 ? e[i - cols] : e[i],
                d = r < rows - 1 ? e[i + cols] : e[i];
          tmp[i] = (e[i] * 4 + l + rt + u + d) * .125 * decay;
        }
      }
      this.energy = tmp;
      this.tmp = e;
    }
    drawShadows() {
      const { shadow, glyph, dim, palette } = this;
      for (let i = 0; i < shadow.length; i++) {
        if (!shadow[i] || glyph[i]) continue;
        this.glyphAt(i, ":", palette.shadow, palette.shadowAlpha * dim[i]);
      }
    }
    drawWake() {
      const { energy: e, glyph, shadow, palette } = this;
      for (let i = 0; i < e.length; i++) {
        const v = e[i];
        if (v < .22 || glyph[i] || shadow[i]) continue;
        this.glyphAt(i, v > .5 ? "-" : ".", palette.water, Math.min(1, (v - .22) * 1.4) * .35);
      }
    }
    drawRipples(world) {
      const { cw, ch, cols, rows, glyph, palette } = this;
      for (const rp of world.ripples) {
        const age = world.time - rp.born,
              fade = Math.pow(1 - age / rippleLife(rp), 1.5) * rp.strength;
        for (let ring = 0; ring < 2; ring++) {
          const radius = Math.max(0, age - ring * .45) * RIPPLE_SPEED * (.7 + .5 * rp.strength);
          if (radius < 2) continue;
          const band = cw * .6,
                c0 = Math.max(0, Math.floor((rp.x - radius - cw) / cw)),
                c1 = Math.min(cols - 1, Math.floor((rp.x + radius + cw) / cw)),
                r0 = Math.max(0, Math.floor((rp.y - radius - ch) / ch)),
                r1 = Math.min(rows - 1, Math.floor((rp.y + radius + ch) / ch)),
                a = fade * (ring === 0 ? .55 : .3);
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              const i = r * cols + c;
              if (glyph[i]) continue;
              const dx = c * cw + cw / 2 - rp.x, dy = r * ch + ch / 2 - rp.y;
              if (Math.abs(Math.hypot(dx, dy) - radius) > band) continue;
              this.glyphAt(i, ring === 1 ? "." : lineGlyph(-dy, dx), palette.water, a);
            }
          }
        }
      }
    }
    drawBites(world) {
      for (const b of world.bites) {
        const i = this.cellIndex(b.x, b.y);
        if (i < 0) continue;
        const t = (world.time - b.born) / BITE_LIFE;
        this.glyphAt(
          i,
          t < .35 ? "*" : t < .7 ? "+" : ".",
          this.palette.pellet,
          Math.min(1, this.palette.alpha * 1.6) * (1 - t * t)
        );
      }
    }
    drawPellets(world) {
      const { glyph, palette, ch } = this;
      for (const p of world.pellets) {
        const age = world.time - p.born;
        if (!p.landed) {
          const f = age / p.landAt,
                i = this.cellIndex(p.x, p.y - (1 - f) * ch * 1.5);
          if (i < 0 || glyph[i]) continue;
          this.glyphAt(i, f < .5 ? "'" : ".", palette.pellet, palette.alpha * (.5 + .4 * f));
          continue;
        }
        const i = this.cellIndex(p.x, p.y);
        if (i < 0 || glyph[i]) continue;
        const sink = smoothstep(PELLET_SINK, PELLET_LIFE, age),
              bob = .8 + .2 * Math.sin(age * 3 + p.x);
        this.glyphAt(i, sink > .55 ? "." : "o", palette.pellet, palette.alpha * bob * (1 - .85 * sink));
      }
    }
  }

  /* ── engine ── */
  function mergeNearby(boxes) {
    const out = [];
    for (const b of [...boxes].sort((p, q) => p.top - q.top)) {
      const n = out.find(m =>
        b.top - m.bottom < 160 &&
        b.left - m.right < 160 &&
        m.left - b.right < 160
      );
      if (!n) { out.push({ ...b }); continue; }
      n.left = Math.min(n.left, b.left);
      n.right = Math.max(n.right, b.right);
      n.bottom = Math.max(n.bottom, b.bottom);
    }
    return out;
  }

  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      this.world = new World();
      this.raf = 0;
      this.last = 0;
      this.acc = 0;
      this.frames = 0;
      this.lastPT = 0;
      this.visible = true;
      this.dead = false;
      this.rs = [-1, -1];
      this.e1 = document.getElementById("c1");
      this.e2 = document.getElementById("c2");
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
      this.renderer = new Renderer(canvas);
      this.theme();

      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
      this.io = new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        this.schedule();
      });
      this.io.observe(canvas);
      this.mo = new MutationObserver(() => {
        this.theme();
        if (this.reduced.matches) this.still();
      });
      this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

      this.onMove = e => {
        const { x, y, inside } = this.local(e);
        const p = this.world.pointer;
        const el = Math.max(1, e.timeStamp - this.lastPT) / 1000;
        const sp = Math.hypot(x - p.x, y - p.y) / el;
        p.speed += (Math.min(sp, 5000) - p.speed) * .5;
        this.lastPT = e.timeStamp;
        p.x = x; p.y = y;
        p.active = inside && e.pointerType !== "touch";
      };
      this.onClick = e => {
        if (this.reduced.matches) return;
        if (e.composedPath().some(n => n instanceof Element && n.matches(INTERACTIVE))) return;
        const sel = getSelection && getSelection();
        if (sel && sel.toString()) return;
        const { x, y, inside } = this.local(e);
        if (!inside) return;
        this.world.feed(x, y);
        this.report();
      };
      this.onLeave = () => {
        this.world.pointer.active = false;
        this.world.pointer.speed = 0;
      };
      this.sched = () => this.schedule();
      this.reduced.addEventListener("change", this.sched);

      addEventListener("pointermove", this.onMove, { passive: true });
      addEventListener("click", this.onClick);
      document.documentElement.addEventListener("pointerleave", this.onLeave);
      addEventListener("blur", this.onLeave);
      this.resize();
      this.schedule();
    }
    theme() {
      this.renderer.setTheme(document.documentElement.dataset.theme === "light");
    }
    destroy() {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      this.ro.disconnect();
      this.io.disconnect();
      this.mo.disconnect();
      this.reduced.removeEventListener("change", this.sched);
      removeEventListener("pointermove", this.onMove);
      removeEventListener("click", this.onClick);
      document.documentElement.removeEventListener("pointerleave", this.onLeave);
      removeEventListener("blur", this.onLeave);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      this.renderer.resize(r.width, r.height, Math.min(devicePixelRatio || 1, 2));
      this.world.resize(r.width, r.height);
      this.measure();
      this.report();
      if (this.reduced.matches) this.still();
    }
    report() {
      const k = this.world.koi.length, p = this.world.pellets.length;
      if (this.e1 && k !== this.rs[0]) this.e1.textContent = k;
      if (this.e2 && p !== this.rs[1]) this.e2.textContent = p;
      this.rs = [k, p];
    }
    schedule() {
      cancelAnimationFrame(this.raf);
      if (this.dead || !this.visible) return;
      if (this.reduced.matches) { this.still(); return; }
      this.last = performance.now();
      this.raf = requestAnimationFrame(t => this.frame(t));
    }
    measure() {
      const o = this.canvas.getBoundingClientRect();
      const boxes = mergeNearby(
        [...document.querySelectorAll("[data-koi-avoid]")].map(el => {
          const b = el.getBoundingClientRect();
          return {
            left: b.left - o.left, top: b.top - o.top,
            right: b.right - o.left, bottom: b.bottom - o.top
          };
        })
      );
      this.renderer.setDimBoxes(boxes);
      this.world.avoid = boxes;
    }
    frame(now) {
      const dt = Math.min(.1, (now - this.last) / 1000);
      this.last = now;
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 4) {
        this.world.step(STEP);
        this.acc -= STEP;
        n++;
      }
      if (n === 4) this.acc = 0;
      if (++this.frames % 30 === 0 && !document.hidden) this.measure();
      this.renderer.render(this.world, dt);
      this.report();
      this.raf = requestAnimationFrame(t => this.frame(t));
    }
    still() {
      if (this.world.time < 4) for (let i = 0; i < 240; i++) this.world.step(STEP);
      this.measure();
      this.renderer.render(this.world, STEP);
      this.report();
    }
    local(e) {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= r.width && y <= r.height };
    }
  }

  let eng = null;
  return {
    start(el) { if (eng) return; eng = new Engine(el); },
    stop() { if (eng) { eng.destroy(); eng = null; } }
  };
})();