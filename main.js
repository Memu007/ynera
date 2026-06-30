// Ynera main.js — toda la lógica del sitio

// ————— RED NEURONAL: nodos flotantes, conexiones orgánicas, pulsos —————
(() => {
  const canvas = document.getElementById('neuralGrid');
  if (!canvas) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Deshabilitar en mobile o pantallas chicas (sin mouse real)
  if (window.innerWidth < 768) return;

  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let nodes = [], pulses = [];
  // Densidad adaptativa: ~1 nodo cada 32k px², cap entre 30 y 60.
  // Así en pantallas grandes hay suficientes nodos para que se vean
  // conexiones, y en chicas no sobran. Antes 25 fijo = casi sin red.
  let NODE_COUNT = 40;
  const LINK_DIST = 150;
  const MOUSE_RADIUS = 190;
  let mx = -999, my = -999;
  let visible = true;
  let lastPulse = 0;
  const FPS = 30;
  const FRAME_MS = 1000 / FPS;
  let lastFrame = 0;

  function rand(min, max) { return min + Math.random() * (max - min); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Recalcular cantidad de nodos según área visible
    NODE_COUNT = Math.max(30, Math.min(60, Math.round((W * H) / 32000)));
  }

  function spawnNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: rand(0, W),
        y: rand(0, H),
        vx: rand(-0.15, 0.15),
        vy: rand(-0.15, 0.15),
        r: rand(1, 2.5),
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  function spawnPulse() {
    // Encontrar un par de nodos conectados
    for (let attempts = 0; attempts < 10; attempts++) {
      const i = Math.floor(Math.random() * nodes.length);
      const a = nodes[i];
      for (let j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          pulses.push({ a, b, t: 0, speed: rand(0.008, 0.015) });
          return;
        }
      }
    }
  }

  function update() {
    // Mover nodos
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      // Rebote suave en bordes
      if (n.x < 0) { n.x = 0; n.vx *= -1; }
      if (n.x > W) { n.x = W; n.vx *= -1; }
      if (n.y < 0) { n.y = 0; n.vy *= -1; }
      if (n.y > H) { n.y = H; n.vy *= -1; }
    }

    // Avanzar pulsos
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].t += pulses[i].speed;
      if (pulses[i].t >= 1) pulses.splice(i, 1);
    }

    // Spawn pulsos periódicamente
    const now = performance.now();
    if (now - lastPulse > rand(2000, 4000) && pulses.length < 5) {
      spawnPulse();
      lastPulse = now;
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // 1. Conexiones entre nodos cercanos
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.16;

          // Boost si está cerca del mouse
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const mDist = Math.hypot(midX - mx, midY - my);
          let boost = 0;
          if (mDist < MOUSE_RADIUS) {
            boost = (1 - mDist / MOUSE_RADIUS) * 0.3;
          }

          const finalAlpha = alpha + boost;
          if (finalAlpha > 0.005) {
            // Curva bezier sutil para conexión orgánica
            const cx = (a.x + b.x) / 2 + dy * 0.08;
            const cy = (a.y + b.y) / 2 - dx * 0.08;
            ctx.strokeStyle = `rgba(43, 100, 114, ${finalAlpha})`;
            ctx.lineWidth = 0.5 + boost * 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(cx, cy, b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    // 2. Pulsos de señal viajando por conexiones
    for (let i = 0; i < pulses.length; i++) {
      const p = pulses[i];
      const px = p.a.x + (p.b.x - p.a.x) * p.t;
      const py = p.a.y + (p.b.y - p.a.y) * p.t;
      const glow = Math.sin(p.t * Math.PI); // fade in/out

      ctx.fillStyle = `rgba(43, 100, 114, ${glow * 0.6})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Nodos
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const mDist = Math.hypot(n.x - mx, n.y - my);
      const nearMouse = mDist < MOUSE_RADIUS;
      const mouseBoost = nearMouse ? (1 - mDist / MOUSE_RADIUS) : 0;
      const breath = 0.5 + Math.sin(now * 0.001 + n.phase) * 0.2;

      const alpha = 0.16 + breath * 0.06 + mouseBoost * 0.4;
      const radius = n.r + mouseBoost * 2.5;

      ctx.fillStyle = `rgba(43, 100, 114, ${alpha})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(now) {
    if (!visible) { requestAnimationFrame(loop); return; }
    if (now - lastFrame < FRAME_MS) { requestAnimationFrame(loop); return; }
    lastFrame = now;
    update();
    draw(now);
    requestAnimationFrame(loop);
  }

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    mx = -999;
    my = -999;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) requestAnimationFrame(loop);
  });

  // Pausar cuando el hero sale de pantalla
  const hero = document.querySelector('.hero');
  if (hero) {
    const heroIO = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 });
    heroIO.observe(hero);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); spawnNodes(); }, 200);
  }, { passive: true });

  resize();
  spawnNodes();
  requestAnimationFrame(loop);
})();

// Nav scroll state
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal, .draw');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('on');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  reveals.forEach(el => io.observe(el));

  // Smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ————— INTRO orchestration —————
  // Full JS-driven intro: seed falls (CSS), can flies in → tips → pans across
  // the whole garden while spraying water particles, untips, exits. Particles
  // are real physics (gravity + per-drop velocity) so it reads as a watering
  // can rose, not a decal.
  window.addEventListener('load', () => {
    const can = document.getElementById('intro-can');
    const dropsContainer = document.getElementById('water-drops');
    const garden = document.querySelector('.garden');
    if (!can || !dropsContainer || !garden) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Timeline (ms from load)
    const T = {
      canIn_s:  1400, canIn_e:  2200,
      tip_s:    2200, tip_e:    2600,
      pan_s:    2600, pan_e:    5600,
      untip_s:  5600, untip_e:  5900,
      exit_s:   5900, exit_e:   6500,
      grow_s:   4200,
    };

    // Can path positions (SVG coords)
    const X_START = -80, Y_START = 40;
    const X_LEFT  = 40,  Y_OVER = 55;   // tipping position, left side of garden
    const X_RIGHT = 400;                // end of pan, right side of garden
    const X_EXIT  = 540;
    const TIP_RAD = 28 * Math.PI / 180;

    const drops = [];
    const GRAV = 0.32;   // per-frame² velocity delta
    const GROUND = 520;

    const lerp  = (a, b, u) => a + (b - a) * u;
    const clamp = u => Math.min(1, Math.max(0, u));
    const ease  = u => (u = clamp(u), u < 0.5 ? 2*u*u : 1 - Math.pow(-2*u+2, 2)/2);

    // Spout tip world position given can translate (tx,ty) and rotation rot
    // (pivot is 12,46 in can-local coords; spout tip at ~72,26)
    function spoutTip(tx, ty, rot) {
      const c = Math.cos(rot), s = Math.sin(rot);
      const lx = 72 - 12, ly = 26 - 46;
      return { x: tx + c*lx - s*ly + 12, y: ty + s*lx + c*ly + 46 };
    }

    const colors = ['#6FA8C9', '#7FB5D1', '#8CC0D9', '#A4D0E0'];
    const t0 = performance.now();
    let lastNow = t0;

    function frame(now) {
      const t  = now - t0;
      const dt = Math.min(50, now - lastNow) / 16.6667;  // frames at 60fps
      lastNow = now;

      // —— Compute can pose ——
      let tx = X_START, ty = Y_START, rot = 0, op = 0;
      if (t < T.canIn_s) {
        // offscreen, hidden
      } else if (t < T.canIn_e) {
        const u = ease((t - T.canIn_s) / (T.canIn_e - T.canIn_s));
        tx = lerp(X_START, X_LEFT, u);
        ty = lerp(Y_START, Y_OVER, u);
        op = clamp(u * 1.6);
      } else if (t < T.tip_e) {
        tx = X_LEFT; ty = Y_OVER; op = 1;
        rot = ease((t - T.tip_s) / (T.tip_e - T.tip_s)) * TIP_RAD;
      } else if (t < T.pan_e) {
        tx = lerp(X_LEFT, X_RIGHT, ease((t - T.pan_s) / (T.pan_e - T.pan_s)));
        ty = Y_OVER; rot = TIP_RAD; op = 1;
      } else if (t < T.untip_e) {
        tx = X_RIGHT; ty = Y_OVER; op = 1;
        rot = (1 - ease((t - T.untip_s) / (T.untip_e - T.untip_s))) * TIP_RAD;
      } else if (t < T.exit_e) {
        const u = ease((t - T.exit_s) / (T.exit_e - T.exit_s));
        tx = lerp(X_RIGHT, X_EXIT, u);
        ty = Y_OVER;
        op = clamp(1 - u * 1.3);
      } else {
        op = 0;
      }

      can.style.opacity = op;
      can.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot * 180 / Math.PI}deg)`;

      // —— Spawn water drops while tipped enough ——
      const pouring = rot > TIP_RAD * 0.45 && t < T.untip_e;
      if (pouring) {
        const sp = spoutTip(tx, ty, rot);
        // Mimic can's horizontal motion imparting drop direction
        const canMoving = t > T.pan_s && t < T.pan_e;
        const canVx = canMoving
          ? ((X_RIGHT - X_LEFT) / (T.pan_e - T.pan_s)) * 16 * 0.25  // scaled
          : 0;
        const count = 2 + Math.floor(Math.random() * 3);  // 2–4 drops/frame
        for (let i = 0; i < count; i++) {
          // Fan spread from spout: angles from straight down ±35°
          const ang = (Math.random() - 0.5) * 1.2;   // rad
          const speed = 1.6 + Math.random() * 1.4;
          const vx = Math.sin(ang) * speed + canVx + (Math.random() - 0.5) * 0.6;
          const vy = Math.cos(ang) * speed * 0.6 + 0.3;  // softer initial vy; gravity takes over
          const el = document.createElementNS(SVG_NS, 'ellipse');
          el.setAttribute('cx', 0); el.setAttribute('cy', 0);
          el.setAttribute('rx', 1.0 + Math.random() * 0.6);
          el.setAttribute('ry', 1.8 + Math.random() * 0.9);
          el.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
          el.setAttribute('opacity', (0.7 + Math.random() * 0.25).toFixed(2));
          dropsContainer.appendChild(el);
          drops.push({
            x: sp.x + (Math.random() - 0.5) * 5,
            y: sp.y + (Math.random() - 0.5) * 2,
            vx, vy, life: 0, el
          });
        }
      }

      // —— Integrate drops ——
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vy += GRAV * dt;
        d.x  += d.vx * dt;
        d.y  += d.vy * dt;
        d.life += dt;
        const angDeg = Math.atan2(d.vx, d.vy) * 180 / Math.PI; // rotate so ellipse aligns with velocity
        d.el.setAttribute('transform', `translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) rotate(${-angDeg.toFixed(1)})`);
        if (d.y > GROUND || d.x < -20 || d.x > 520 || d.life > 240) {
          d.el.remove();
          drops.splice(i, 1);
        }
      }

      // —— Trigger plant growth ——
      if (t >= T.grow_s && !garden.classList.contains('grown')) {
        garden.classList.add('grown');
      }

      if (t < 9000 || drops.length > 0) {
        requestAnimationFrame(frame);
      } else {
        can.style.opacity = 0;
        // Detener el loop de gotas cuando termina la intro
        return;
      }
    }
    requestAnimationFrame(frame);
  });

  // ————— WIND SIMULATION —————
  // A single global wind field sweeps across the viewport. Every plant
  // samples the field at its own on-screen x, so the gust visibly travels
  // left→right across the page. On top of the base wind we add turbulence,
  // a spring-mass response per plant (so stiff plants lag and overshoot),
  // and a high-frequency flutter for small leaves/petals/berries.
  (() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    // Collect all sway/flutter elements with their absolute viewport X
    // (measured fresh on each resize).
    let sways = [];
    let flutters = [];

    function measure() {
      sways = Array.from(document.querySelectorAll('.sway')).map(el => {
        const r = el.getBoundingClientRect();
        return {
          el,
          cx: r.left + r.width / 2,
          // Spring state (rotational-ish, simplified as scalar wind coupling).
          v: 0,
          a: 0,
          theta: 0,
          phase: parseFloat(el.style.getPropertyValue('--phase') || 0),
          flex: parseFloat(el.style.getPropertyValue('--flex') || 1),
        };
      });
      flutters = Array.from(document.querySelectorAll('.flutter')).map(el => {
        const r = el.getBoundingClientRect();
        return {
          el,
          cx: r.left + r.width / 2,
          flex: parseFloat(el.style.getPropertyValue('--flex') || 1),
        };
      });
    }
    measure();
    let measureTicking = false;
    // Solo re-medir en resize. El scroll vertical NO cambia el centro horizontal
    // de las plantas, así que medir en scroll era un costo inútil (47 reflows/frame).
    window.addEventListener('resize', () => { if (!measureTicking) { measureTicking = true; requestAnimationFrame(() => { measure(); measureTicking = false; }); } }, { passive: true });

    // Wind "field": a slow base + gust packets that travel across viewport
    // at a set speed. We accumulate in `windAt(x, t)` which is what plants
    // sample. Units are normalized -1..1.
    const gusts = [];
    let lastGustSpawn = 0;

    // ——— Mouse como soplido: si el cursor se mueve rápido sobre el jardín,
    // genera viento local. Velocidad y dirección se convierten en empuje.
    let mouseX = 0;
    let lastMouseX = 0;
    let lastMouseT = 0;
    let mouseGust = 0;      // -1..1, decae con el tiempo
    let mouseActive = false;
    let mouseDecayTimer = 0;

    const garden = document.querySelector('.garden');
    if (garden) {
      garden.addEventListener('mousemove', (e) => {
        const now = performance.now();
        const dt = Math.max(16, now - lastMouseT);
        const dx = e.clientX - lastMouseX;
        // Velocidad horizontal en px/ms, convertida a signal -1..1
        const vx = dx / dt;
        // Mapear velocidad a gust: velocidades típicas hasta ~3 px/ms
        const impulse = Math.max(-1, Math.min(1, vx / 2.5));
        // Integrar con decay suave: el viento del mouse persiste un momento
        mouseGust = mouseGust * 0.55 + impulse * 0.6;
        mouseX = e.clientX;
        lastMouseX = e.clientX;
        lastMouseT = now;
        mouseActive = true;
        mouseDecayTimer = now;
      }, { passive: true });
      garden.addEventListener('mouseleave', () => {
        mouseActive = false;
      }, { passive: true });
    }

    function spawnGust(t) {
      const vw = window.innerWidth;
      gusts.push({
        x0: -200,
        t0: t,
        speed: 200 + Math.random() * 140,         // slower travel
        amp: 0.12 + Math.random() * 0.14,         // much gentler
        sigma: 260 + Math.random() * 160,         // wider, softer envelope
        vw
      });
    }

    function windAt(x, t) {
      // Very subtle base breathing
      let w = 0.05 * Math.sin(t * 0.0005) + 0.03 * Math.sin(t * 0.0013 + 1.3);
      // Tiny local turbulence
      w += 0.015 * Math.sin(t * 0.003 + x * 0.01);

      for (let i = gusts.length - 1; i >= 0; i--) {
        const g = gusts[i];
        const elapsed = (t - g.t0) / 1000;
        const cx = g.x0 + g.speed * elapsed;
        const dx = x - cx;
        const env = Math.exp(-(dx * dx) / (2 * g.sigma * g.sigma));
        w += g.amp * env;
        if (cx > g.vw + 400) gusts.splice(i, 1);
      }

      // Mouse "breath": contribución del mouse cuando se mueve rápido
      // sobre el jardín. mouseGust está en -1..1 con signo según dirección.
      // Se aplica con envolvente gaussiana alrededor del mouseX.
      if (mouseActive && mouseGust !== 0) {
        const dx = x - mouseX;
        const env = Math.exp(-(dx * dx) / (2 * 180 * 180));
        w += mouseGust * 0.35 * env;
      }

      return Math.max(-0.7, Math.min(0.7, w));
    }

    // Flutter: very small, only a light shimmer on leaves
    function flutterAt(x, t, baseWind) {
      const hf = Math.sin(t * 0.008 + x * 0.02)
               + 0.5 * Math.sin(t * 0.013 + x * 0.011 + 1.1);
      const coupling = 0.08 + 0.25 * Math.abs(baseWind);
      return (hf / 2) * coupling;
    }

    let start = performance.now();
    const WIND_START_MS = 8500; // After full layered growth sequence
    let gardenVisible = true;
    const gardenIO = new IntersectionObserver(entries => {
      gardenVisible = entries[0].isIntersecting;
    }, { threshold: 0 });
    if (garden) gardenIO.observe(garden);

    // Cap a 30fps: el viento no necesita 60fps y reduce carga de CPU
    let lastWindFrame = 0;
    const WIND_FRAME_MS = 1000 / 30;

    function frame(now) {
      const t = now - start;

      // Pausar viento cuando el jardín no es visible
      if (!gardenVisible) {
        requestAnimationFrame(frame);
        return;
      }

      // Limitar a 30fps
      if (now - lastWindFrame < WIND_FRAME_MS) {
        requestAnimationFrame(frame);
        return;
      }
      lastWindFrame = now;

      // During intro: keep everything at rest (--wind=0 → no rotation).
      if (t < WIND_START_MS) {
        for (let i = 0; i < sways.length; i++) sways[i].el.style.setProperty('--wind', '0');
        for (let i = 0; i < flutters.length; i++) flutters[i].el.style.setProperty('--wind', '0');
        requestAnimationFrame(frame);
        return;
      }

      // Spawn gusts rarely — every 6–11s
      if (t - lastGustSpawn > 6000 + Math.random() * 5000) {
        spawnGust(t);
        lastGustSpawn = t;
      }

      // Update each sway via simple spring physics:
      //   theta_target = wind(x) * amp(per-element via CSS)
      //   theta += spring toward target with damping
      const dt = 1 / 60;

      // Decaer el impulso del mouse naturalmente (como el aire calmándose)
      mouseGust *= 0.92;
      if (Math.abs(mouseGust) < 0.005) mouseGust = 0;
      if (t - mouseDecayTimer > 600) mouseActive = false;
      for (let i = 0; i < sways.length; i++) {
        const s = sways[i];
        // Phase shifts the SAMPLING TIME, not position — so wind visibly
        // travels across plants (the one on the left reacts before the one on
        // the right, not just differently).
        const sampleT = t - s.phase * 900;
        const w = windAt(s.cx, sampleT);
        // Underdamped spring: stiffer plants resist more AND ring longer.
        const k = 55 + (1 - s.flex) * 60;
        const c = 4.5 + (1 - s.flex) * 2.5;
        const accel = k * (w - s.theta) - c * s.v;
        s.v += accel * dt;
        s.theta += s.v * dt;
        if (s.theta > 1.6) { s.theta = 1.6; s.v *= 0.4; }
        if (s.theta < -1.6) { s.theta = -1.6; s.v *= 0.4; }
        s.el.style.setProperty('--wind', s.theta.toFixed(4));
      }

      // Flutter: leaves trail behind their stem. We compute an effective
      // wind that's the sampled wind MINUS a fraction of the nearest stem's
      // angular velocity — so when the stem whips one way, leaves briefly
      // lag in the opposite direction then catch up. Feels like fabric.
      for (let i = 0; i < flutters.length; i++) {
        const f = flutters[i];
        const baseW = windAt(f.cx, t);
        // Find nearest sway stem (by x) to borrow its velocity for lag
        let lag = 0;
        if (sways.length) {
          let best = sways[0], bestD = Math.abs(sways[0].cx - f.cx);
          for (let j = 1; j < sways.length; j++) {
            const d = Math.abs(sways[j].cx - f.cx);
            if (d < bestD) { best = sways[j]; bestD = d; }
          }
          // Leaf lag: proportional to stem angular velocity, inverted
          lag = -best.v * 0.015;
        }
        const hf = flutterAt(f.cx, t, baseW);
        const g = baseW * 0.8 + hf + lag;
        f.el.style.setProperty('--gust', g.toFixed(4));
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  // ————— TOOLTIPS BOTÁNICOS —————
  // Al pasar el mouse sobre una planta, aparece un cartel tipo etiqueta
  // de herbario con su nombre común y nombre científico. Se posiciona
  // siguiendo la planta en coordenadas del viewport.
  (() => {
    const tooltip = document.getElementById('plantTooltip');
    const visual = document.querySelector('.hero-visual');
    if (!tooltip || !visual) return;

    const plants = document.querySelectorAll('.garden g[data-name]');
    let activePlant = null;

    function updateTooltipPos(plant) {
      const plantBox = plant.getBoundingClientRect();
      const visualBox = visual.getBoundingClientRect();
      // Centrar arriba de la planta
      const x = plantBox.left + plantBox.width / 2 - visualBox.left;
      const y = plantBox.top - visualBox.top;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    }

    let trackId = null;
    // Reajustar posición si hay viento/sway (el bounding box cambia)
    function track() {
      if (!activePlant) { trackId = null; return; }
      updateTooltipPos(activePlant);
      trackId = requestAnimationFrame(track);
    }

    plants.forEach(plant => {
      plant.addEventListener('mouseenter', () => {
        // Solo mostrar después de que la intro haya terminado (5.5s)
        if (performance.now() < 5500) return;
        activePlant = plant;
        tooltip.querySelector('.common').textContent = plant.dataset.name;
        tooltip.querySelector('.species').textContent = plant.dataset.species;
        updateTooltipPos(plant);
        tooltip.classList.add('show');
        // Iniciar el seguimiento solo mientras el tooltip está visible
        if (trackId === null) trackId = requestAnimationFrame(track);
      });
      plant.addEventListener('mouseleave', () => {
        activePlant = null;
        tooltip.classList.remove('show');
      });
    });
  })();
  // ————— KONAMI CODE EASTER EGG —————
  // ↑↑↓↓←→←→BA revela una planta secreta en el jardín (omombé, un
  // arbusto medicinal guaraní) con una notificación sutil.
  (() => {
    const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let idx = 0;
    let triggered = false;

    window.addEventListener('keydown', (e) => {
      if (triggered) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === code[idx]) {
        idx++;
        if (idx === code.length) {
          triggered = true;
          revealSecret();
        }
      } else {
        idx = (key === code[0]) ? 1 : 0;
      }
    });

    function revealSecret() {
      const garden = document.querySelector('.garden');
      if (!garden) return;
      const plantsGroup = garden.querySelector('.plants-group');
      if (!plantsGroup) return;

      // Crear la planta secreta: ombú estilizado (árbol emblema rioplatense)
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'plant-secret');
      g.setAttribute('data-name', 'Ombú');
      g.setAttribute('data-species', 'Phytolacca dioica · árbol pampeano');
      g.innerHTML = `
        <rect class="hit-area" x="380" y="380" width="90" height="145" fill="transparent"/>
        <g fill="none" stroke="#3D5C4A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M 425 520 Q 420 480 428 440 Q 432 420 430 400" stroke-width="1.8"/>
          <path d="M 428 440 Q 410 430 398 420"/>
          <path d="M 428 440 Q 446 430 458 420"/>
          <path d="M 430 410 Q 420 402 414 395"/>
          <path d="M 430 410 Q 440 402 446 395"/>
        </g>
        <g stroke="none">
          <ellipse cx="428" cy="395" rx="28" ry="18" fill="#3D5C4A" opacity="0.28"/>
          <ellipse cx="422" cy="388" rx="22" ry="14" fill="#3D5C4A" opacity="0.35"/>
          <ellipse cx="434" cy="400" rx="20" ry="12" fill="#3D5C4A" opacity="0.3"/>
          <circle cx="418" cy="385" r="2.5" fill="#E3A02F"/>
          <circle cx="440" cy="392" r="2" fill="#E3A02F"/>
          <circle cx="428" cy="378" r="1.8" fill="#D9603F"/>
        </g>
      `;
      g.style.opacity = '0';
      g.style.transition = 'opacity 1.8s ease';
      plantsGroup.appendChild(g);
      requestAnimationFrame(() => { g.style.opacity = '1'; });

      // Notificación flotante (toast)
      const toast = document.createElement('div');
      toast.className = 'konami-toast';
      toast.innerHTML = '<span class="k-spark">✦</span> Encontraste el ombú · planta secreta #01';
      toast.style.cssText = `
        position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(20px);
        background: var(--ink); color: var(--cream);
        padding: 12px 22px; border-radius: 999px; font-family: 'Fraunces', serif;
        font-style: italic; font-size: 14px; letter-spacing: -0.01em;
        z-index: 1000; opacity: 0; transition: opacity 0.6s ease, transform 0.6s cubic-bezier(.3,1.3,.5,1);
        box-shadow: 0 8px 32px rgba(26,26,31,0.25);
      `;
      document.body.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => toast.remove(), 700);
      }, 4500);
    }
  })();

  // ————— MARGINALIA: fade-in al llegar a la sección —————
  (() => {
    const marginalias = document.querySelectorAll('.marginalia');
    if (!marginalias.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    marginalias.forEach(m => io.observe(m));
  })();

  // ————— TALLO VERTICAL NARRATIVO —————
  // Crece con el scroll via stroke-dashoffset. El punto clay (stem-head)
  // desliza a lo largo del path. Los nodos de cada sección florecen
  // cuando su sección cruza el medio del viewport.
  (() => {
    const stem = document.querySelector('.stem-line');
    const head = document.querySelector('.stem-head');
    const nodes = document.querySelectorAll('.stem-node');
    if (!stem || !head || !nodes.length) return;

    // Sample puntos a lo largo del path para mover el head
    const pathLen = stem.getTotalLength();

    function onScroll() {
      const doc = document.documentElement;
      const scrolled = (doc.scrollTop || document.body.scrollTop);
      const max = doc.scrollHeight - doc.clientHeight;
      const p = Math.max(0, Math.min(1, scrolled / Math.max(1, max)));

      // Crecer el tallo: pathLength=1000, offset va de 1000 a 0
      stem.style.strokeDashoffset = (1000 * (1 - p)).toFixed(1);

      // Mover el head a lo largo del path
      const pt = stem.getPointAtLength(pathLen * p);
      // El path está en viewBox 40x1000; lo mapeamos a las coords visuales
      head.setAttribute('cx', pt.x);
      head.setAttribute('cy', pt.y);
    }

    let stemTicking = false;
    const onScrollThrottled = () => {
      if (stemTicking) return;
      stemTicking = true;
      requestAnimationFrame(() => { onScroll(); stemTicking = false; });
    };
    window.addEventListener('scroll', onScrollThrottled, { passive: true });
    window.addEventListener('resize', onScrollThrottled);
    onScroll();

    // Florecer cada nodo cuando su sección correspondiente es visible
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          const node = document.querySelector(`.stem-node[data-section="${id}"]`);
          if (node) node.classList.add('reached');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -30% 0px' });

    ['origen', 'productos', 'nosotros', 'valores', 'contacto'].forEach(id => {
      const s = document.getElementById(id);
      if (s) io.observe(s);
    });
  })();

  // ————— PARTÍCULAS BOTÁNICAS FLOTANTES —————
  // Genera 8 partículas con parámetros aleatorios (tamaño, duración,
  // posición inicial, dirección de drift, rotación). Cada una tiene
  // una SVG diferente — semillas, esporas, pelusa, etc. Flotan hacia
  // arriba con un leve sway lateral que ese sale gratis del --drift.
  (() => {
    const field = document.getElementById('particleField');
    if (!field) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Variantes de partículas — cada una es un SVG chiquito
    const variants = [
      // Semilla de diente de león
      `<svg viewBox="0 0 20 20"><g fill="none" stroke="#3D5C4A" stroke-width="0.6" stroke-linecap="round" opacity="0.7">
        <line x1="10" y1="3" x2="10" y2="13"/>
        <line x1="10" y1="3" x2="6" y2="1"/>
        <line x1="10" y1="3" x2="14" y2="1"/>
        <line x1="10" y1="3" x2="7" y2="2"/>
        <line x1="10" y1="3" x2="13" y2="2"/>
        <ellipse cx="10" cy="15" rx="1.2" ry="2.5" fill="#6b4a2a" stroke="none"/>
      </g></svg>`,
      // Espora redonda suave
      `<svg viewBox="0 0 20 20"><g>
        <circle cx="10" cy="10" r="3" fill="#7A8C5A" opacity="0.5"/>
        <circle cx="10" cy="10" r="1.5" fill="#3D5C4A" opacity="0.6"/>
      </g></svg>`,
      // Pelusa tipo algodón
      `<svg viewBox="0 0 20 20"><g fill="#D9603F" opacity="0.35">
        <circle cx="8" cy="9" r="2"/>
        <circle cx="12" cy="8" r="2.2"/>
        <circle cx="10" cy="12" r="2"/>
      </g></svg>`,
      // Punto pequeño ochre (polen)
      `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="2.2" fill="#E3A02F" opacity="0.55"/></svg>`,
      // Petalito minúsculo
      `<svg viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="1.8" ry="4.5" fill="#D9603F" opacity="0.4" transform="rotate(25 10 10)"/></svg>`,
    ];

    // ——— NUEVO: variante data-packet ———
    // Rect 2×1 teal que CAE en diagonal como UART transmission. No
    // flota up como las demás. Opacidad y tamaño chicos para que sea
    // apenas perceptible. Se spawn-ea con probabilidad baja (1/8) para
    // no dominar el campo botánico.
    const packetSvg = `<svg viewBox="0 0 4 2"><rect x="0" y="0" width="4" height="2" fill="#2B6472" opacity="0.4"/></svg>`;
    const PACKET_PROBABILITY = 1 / 8;   // 1 de cada 8 partículas aprox.

    const rand = (min, max) => min + Math.random() * (max - min);

    function spawn(i) {
      const el = document.createElement('div');
      const isPacket = Math.random() < PACKET_PROBABILITY;
      el.className = isPacket ? 'particle packet' : 'particle';

      // Parámetros comunes
      const startX = rand(0, 100);      // vw
      const delay = rand(-40, 0);       // negative = start mid-animation, staggered

      if (isPacket) {
        // ——— Data-packet: cae desde arriba, drift horizontal leve ———
        // Tamaño fijo 4×2 px (rect) — no como las partículas botánicas
        // que son más grandes. Duración 12-18s (caída UART lenta).
        // Drift pequeño (-30..30 px) para que caiga casi vertical.
        const drift = rand(-30, 30);   // px horizontal drift across the fall
        const dur = rand(12, 18);      // seconds
        const op = rand(0.3, 0.4);
        el.style.cssText = `
          left: ${startX}vw;
          top: -5vh;
          width: 4px;
          height: 2px;
          --drift: ${drift}px;
          --dur: ${dur}s;
          --delay: ${delay}s;
          --op: ${op};
        `;
        el.innerHTML = packetSvg;
      } else {
        // ——— Partículas botánicas existentes (sin cambios) ———
        const size = rand(5, 11);
        const drift = rand(-60, 60);   // px horizontal drift across the climb
        const dur = rand(24, 44);      // seconds
        const rot = rand(-180, 180);
        const op = rand(0.2, 0.4);
        el.style.cssText = `
          left: ${startX}vw;
          top: 105vh;
          width: ${size}px;
          height: ${size * 1.3}px;
          --drift: ${drift}px;
          --dur: ${dur}s;
          --delay: ${delay}s;
          --rot: ${rot}deg;
          --op: ${op};
        `;
        el.innerHTML = variants[Math.floor(Math.random() * variants.length)];
      }

      field.appendChild(el);
      // Trigger animation en el siguiente frame
      requestAnimationFrame(() => el.classList.add('active'));
    }

    // 8 partículas — suficientes para sentir vida, pocas para no distraer.
    // En promedio ~1 será data-packet; las demás botánicas.
    for (let i = 0; i < 8; i++) spawn(i);

    // Pausar partículas cuando el hero sale de pantalla (el field es fixed)
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      const pIO = new IntersectionObserver(entries => {
        field.style.display = entries[0].isIntersecting ? '' : 'none';
      }, { rootMargin: '100px 0px 100px 0px' });
      pIO.observe(heroEl);
    }
  })();

  // ————— MODO DÍA / NOCHE AUTOMÁTICO —————
  // Reglas: noche =  data-i18n="footer.hora">= 19hs o < 7hs (hora local del visitante).
  // Aplica clase .night al <html>. La transición es CSS, suave (1.2s).
  // Se chequea al cargar y cada minuto, por si el usuario deja el
  // tab abierto cruzando el umbral.
  (() => {
    function isNight() {
      const h = new Date().getHours();
      return h >= 19 || h < 7;
    }
    function apply() {
      document.documentElement.classList.toggle('night', isNight());
    }
    apply();
    setInterval(apply, 60000);
  })();

/* ── Pausar animaciones CSS de secciones fuera de pantalla ── */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const secs = document.querySelectorAll('section');
  if (!secs.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      // Buffer de 200px: reanuda un poco antes de entrar (sin salto visible)
      e.target.classList.toggle('anim-paused', !e.isIntersecting);
    });
  }, { rootMargin: '200px 0px 200px 0px' });
  secs.forEach(s => io.observe(s));
})();

/* ── Lámina founders: draw-on + loop ── */
(function(){
  const svgs = document.querySelectorAll('.lamina-svg');
  if (!svgs.length) return;
  svgs.forEach(svg => {
    svg.querySelectorAll('.dp').forEach(p => {
      try { const l = Math.ceil(p.getTotalLength()) + 4; p.style.strokeDasharray = l; p.style.strokeDashoffset = l; }
      catch(e) { p.style.strokeDasharray = 400; p.style.strokeDashoffset = 400; }
    });
  });
  function activate(svg){
    if (svg.classList.contains('drawn')) return;
    svg.classList.add('drawn');
    let max = 0;
    svg.querySelectorAll('.dp').forEach(p => {
      const d = parseFloat(getComputedStyle(p).getPropertyValue('--d') || 0);
      const dur = parseFloat(getComputedStyle(p).getPropertyValue('--dur') || 1);
      max = Math.max(max, d + dur);
    });
    setTimeout(() => svg.classList.add('looping'), (max + 0.2) * 1000);
  }
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { activate(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.3, rootMargin: '0px 0px -40px 0px' });
  svgs.forEach(s => io.observe(s));
  window.addEventListener('load', () => {
    svgs.forEach(s => { if (s.getBoundingClientRect().top < window.innerHeight * 0.92) activate(s); });
  });
})();

/* ── Premium layer ── */
(function(){
  /* Hero line reveal al cargar */
  requestAnimationFrame(() => {
    setTimeout(() => document.getElementById('heroTitle')?.classList.add('lines-in'), 80);
    document.getElementById('heroTitle')?.parentElement?.classList.add('lines-in');
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('heroTitle')?.classList.add('lines-in');
  });

  /* Tallo de scroll */
  const stem = document.getElementById('scrollStem');
  const line = document.getElementById('stemLine');
  const tip  = document.getElementById('stemTipWrap');
  if (stem && line && tip) {
    let ticking = false;
    function update() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? h.scrollTop / max : 0;
      const y = p * h.clientHeight;
      line.setAttribute('y2', String(p * 1000));
      tip.style.top = (y - 7) + 'px';
      stem.classList.toggle('on', h.scrollTop > 200);
      ticking = false;
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* Botones magnéticos (sutil: 6px máx) */
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.btn-primary, .btn-cta').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = `translate(${x * 6}px, ${y * 5}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* Título de pestaña cuando se van */
  let origTitle = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? 'El jardín sigue creciendo — Ynera' : origTitle;
  });
})();

/* ── Detalles vivos ── */
(function(){
  /* Mensaje para el que inspecciona (sabemos que lo vas a hacer) */
  console.log([
    '',
    '  \u{1F331} Ynera \u2014 construimos antes de aconsejar',
    '  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    '',
    '  \u00BFMirando el c\u00F3digo? As\u00ED trabajamos:',
    '  a mano, sin frameworks, ~48KB.',
    '',
    '  Si te gusta lo que ves \u2192 hola@ynera.com',
    ''
  ].join('\n'));

  /* Favicon que germina cuando te vas de la pestaña */
  const fav = document.querySelector('link[rel="icon"][sizes="32x32"]');
  const orig = fav ? fav.href : null;
  const sprout = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#FAF7EE"/><circle cx="16" cy="16" r="14" fill="none" stroke="#2B6472" stroke-width="0.5" opacity="0.5"/><path d="M16 26V12" stroke="#3D5C4A" stroke-width="1.6" stroke-linecap="round"/><path d="M16 17Q9 15 8 8q7 1 8 9z" fill="#3D5C4A" opacity=".6"/><path d="M16 14q7-2 8-9-7 1-8 9z" fill="#3D5C4A" opacity=".6"/><circle cx="16" cy="11" r="2.6" fill="#D9603F"/></svg>');
  document.addEventListener('visibilitychange', () => {
    if (fav && orig) fav.href = document.hidden ? sprout : orig;
  });

  /* Hora de Buenos Aires en vivo */
  const ba = document.getElementById('baTime');
  if (ba) {
    const tick = () => { ba.textContent = new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date()); };
    tick(); setInterval(tick, 30000);
  }

  /* El tallo florece al llegar al final */
  const stem = document.getElementById('scrollStem');
  if (stem) {
    addEventListener('scroll', () => {
      const h = document.documentElement;
      const done = h.scrollTop / (h.scrollHeight - h.clientHeight) > 0.985;
      stem.classList.toggle('bloomed', done);
    }, { passive: true });
  }
})();

(function() {
  // Buscar el DIV .stem-track (no el <line> del SVG que también tiene esa clase)
  const stemTrack = document.querySelector('div.stem-track');
  if (!stemTrack) return;
  const nodes = stemTrack.querySelectorAll('.stem-node[data-stage]');
  const labels = stemTrack.querySelectorAll('.stem-label[data-stage]');

  // Map stage → label/node
  const byStage = {};
  nodes.forEach(n => { byStage[n.dataset.stage] = { node: n, label: null }; });
  labels.forEach(l => {
    if (byStage[l.dataset.stage]) byStage[l.dataset.stage].label = l;
  });

  // Hover sobre un nodo → muestra su label
  nodes.forEach(n => {
    n.addEventListener('mouseenter', () => {
      const entry = byStage[n.dataset.stage];
      if (entry && entry.label) entry.label.classList.add('show');
    });
    n.addEventListener('mouseleave', () => {
      const entry = byStage[n.dataset.stage];
      if (entry && entry.label && !entry.label.classList.contains('active')) {
        entry.label.classList.remove('show');
      }
    });
  });

  // Secciones a observar (incluye las nuevas pieza A, B, C)
  const stages = ['origen', 'productos', 'metodologia', 'nosotros', 'como-pensamos', 'oportunidades', 'valores', 'contacto'];

  // Mapear secciones del DOM a stages: si una sección no está en el stem-track
  // (como como-pensamos u oportunidades), usamos la etapa más cercana.
  const sectionToStage = {
    'origen': 'origen',
    'productos': 'productos',
    'metodologia': 'metodologia',
    'nosotros': 'nosotros',
    'como-pensamos': 'nosotros',       // cae bajo "nosotros"
    'oportunidades': 'nosotros',       // cae bajo "nosotros"
    'valores': 'valores',
    'contacto': 'contacto'
  };

  let currentActive = null;
  let ticking = false;

  function updateActive() {
    const vh = window.innerHeight;
    const targetLine = vh * 0.4;  // 40% desde el top = "centro de atención"
    let bestSection = null;
    let bestDist = Infinity;

    stages.forEach(stage => {
      const el = document.getElementById(stage);
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Distancia del TOP de la sección al targetLine (positivo = abajo del target, negativo = arriba)
      // Queremos la sección cuyo top esté más cerca del target, pero que ya pasó el target (top <= targetLine + 50)
      // Si no hay ninguna que haya pasado, elegimos la primera que viene
      const dist = Math.abs(r.top - targetLine);
      if (dist < bestDist && r.bottom > targetLine * 0.5) {
        bestDist = dist;
        bestSection = stage;
      }
    });

    if (bestSection) {
      const newStage = sectionToStage[bestSection] || bestSection;
      if (newStage !== currentActive) {
        // Limpiar active anterior
        if (currentActive && byStage[currentActive]) {
          byStage[currentActive].label?.classList.remove('active', 'show');
          byStage[currentActive].node?.classList.remove('active-ring');
        }
        // Marcar nuevo active
        currentActive = newStage;
        if (byStage[newStage]) {
          byStage[newStage].label?.classList.add('active');
          byStage[newStage].node?.classList.add('active-ring');
        }
      }
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateActive);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  // Initial
  setTimeout(updateActive, 100);
})();

(function() {
  // i18n cargado desde i18n.js
  const LANGS = ['es', 'en', 'it', 'fr'];
  const STORAGE_KEY = 'ynera-lang';
  const DEFAULT_LANG = 'es';

  function getLang() {
    // 1. ?lang=XX en la URL (para que hreflang funcione)
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang && LANGS.includes(urlLang)) {
        try { localStorage.setItem(STORAGE_KEY, urlLang); } catch(e) {}
        return urlLang;
      }
    } catch(e) {}
    // 2. localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGS.includes(saved)) return saved;
    } catch(e) {}
    // 3. Default ES
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (!LANGS.includes(lang)) lang = DEFAULT_LANG;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e) {}
    document.documentElement.lang = lang;

    // Crossfade
    const fadeTargets = document.querySelectorAll('h1, h2, h3, p, .eyebrow, .product-name, .product-industry, .product-desc, .product-number, .product-live, .product-link, .stage-week, .stage-title, .stage-output, .op-rubro-name, .op-cell, .founder-role, .founder-tag, .founder-desc, .value-eyebrow, .value-title, .value-desc, .footer-brand, .footer-label, .footer-copy, .footer-time-label, .footer-cookies, .mono-foot, .cp-fig, .cp-fig-desc, .cp-mono-title, .cp-mono-meta, .cp-foot-text, .op-leyenda-item, .op-leyenda-meta, .cta-note, .skip-link, .btn, .nav-anchors a, .lang-switcher button');
    fadeTargets.forEach(el => el.classList.add('i18n-fade', 'out'));

    setTimeout(() => {
      // Aplicar traducciones
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (I18N[key] && I18N[key][lang]) {
          // Preservar tags hijos (em, span, etc.) — usar innerHTML si el texto
          // original los tenía, si no usar textContent
          const txt = I18N[key][lang];
          if (txt.includes('<')) {
            el.innerHTML = txt;
          } else {
            el.textContent = txt;
          }
        }
      });
      // Quitar fade
      fadeTargets.forEach(el => el.classList.remove('out'));
      setTimeout(() => {
        fadeTargets.forEach(el => el.classList.remove('i18n-fade'));
      }, 250);
    }, 200);

    // Actualizar botones activos
    document.querySelectorAll('.lang-switcher button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // ——— SEO: actualizar title, meta, OG, Twitter, JSON-LD ———
    const t = (key) => I18N[key] && I18N[key][lang] ? I18N[key][lang] : '';

    // <title>
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = t('seo.title');

    // <meta name="description">
    const descEl = document.getElementById('meta-description');
    if (descEl) descEl.setAttribute('content', t('seo.description'));

    // OG tags
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.setAttribute('content', t('seo.og_title'));
    const ogDesc = document.getElementById('og-description');
    if (ogDesc) ogDesc.setAttribute('content', t('seo.og_description'));
    const ogLocale = document.getElementById('og-locale');
    if (ogLocale) ogLocale.setAttribute('content', t('seo.og_locale'));

    // Twitter tags
    const twTitle = document.getElementById('twitter-title');
    if (twTitle) twTitle.setAttribute('content', t('seo.twitter_title'));
    const twDesc = document.getElementById('twitter-description');
    if (twDesc) twDesc.setAttribute('content', t('seo.og_description'));

    // JSON-LD Organization schema
    const orgSchema = document.getElementById('ld-org-schema');
    if (orgSchema) {
      try {
        const data = JSON.parse(orgSchema.textContent);
        if (data['@type'] === 'ProfessionalService' || data['@type'] === 'Organization') {
          data.name = t('seo.org_name');
          data.description = t('seo.org_description');
          if (data.slogan) data.slogan = t('footer.tagline');
          orgSchema.textContent = JSON.stringify(data);
        }
      } catch(e) {}
    }

    // JSON-LD FAQPage schema (el segundo script ld+json)
    const faqSchema = document.querySelectorAll('script[type="application/ld+json"]')[1];
    if (faqSchema) {
      try {
        const data = JSON.parse(faqSchema.textContent);
        if (data['@type'] === 'FAQPage' && data.mainEntity) {
          const faqKeys = ['faq.q1','faq.q2','faq.q3','faq.q4','faq.q5','faq.q6'];
          const faqAnsKeys = ['faq.a1','faq.a2','faq.a3','faq.a4','faq.a5','faq.a6'];
          data.mainEntity.forEach((q, i) => {
            if (faqKeys[i]) q.name = t(faqKeys[i]);
            if (faqAnsKeys[i] && q.acceptedAnswer) q.acceptedAnswer.text = t(faqAnsKeys[i]);
          });
          faqSchema.textContent = JSON.stringify(data);
        }
      } catch(e) {}
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    const lang = getLang();
    // Siempre aplicar setLang para que SEO se actualice (incluso en ES default)
    setLang(lang);

    document.querySelectorAll('.lang-switcher button').forEach(btn => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  });
})();

(function() {
  const toggle = document.getElementById('navToggle');
  const mobile = document.getElementById('navMobile');
  const overlay = document.getElementById('navOverlay');
  if (!toggle || !mobile || !overlay) return;

  function openMenu() {
    toggle.classList.add('open');
    mobile.classList.remove('hidden');
    mobile.classList.add('open');
    overlay.classList.add('open');
  }
  function closeMenu() {
    toggle.classList.remove('open');
    mobile.classList.remove('open');
    overlay.classList.remove('open');
    setTimeout(() => mobile.classList.add('hidden'), 400);
  }

  toggle.addEventListener('click', () => {
    if (mobile.classList.contains('open')) closeMenu();
    else openMenu();
  });
  overlay.addEventListener('click', closeMenu);
  mobile.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', closeMenu);
  });
})();