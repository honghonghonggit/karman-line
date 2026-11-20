/* ==========================================================================
   별 배경 — canvas 로 반짝이며 천천히 흐르는 별 + 유성 + 나선 은하
   웹프로그램02(Kármán Line)의 initStarfield 를 이 페이지에 맞게 줄여 가져왔다.
   - 별: 좌표를 0~1 비율로 저장해 화면 크기가 바뀌어도 다시 뿌리지 않는다.
   - 은하: 로그 나선 팔 4개 + 중심부 + 바깥 입자, 천천히 회전한다.
   - 탭이 숨겨지면 멈추고, 모션 줄이기 설정이면 정지된 한 장면만 그린다.
   ========================================================================== */
(() => {
  'use strict';

  const canvas = document.getElementById('starfield');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const TINTS = ['255,255,255', '255,255,255', '255,255,255', '170,215,255', '255,226,190'];
  const GAL_COLORS = ['255,255,255', '95,212,232', '150,200,255', '255,236,214'];
  const GAL_ALPHAS = [0.2, 0.36, 0.58, 0.88];
  const GALAXY_N = isSmall ? 1800 : 3600;
  const PUSH_RADIUS = isSmall ? 80 : 120;   // 마우스가 은하 입자를 밀어내는 반경(px)
  const pointer = { x: 0, y: 0, active: false };
  let scrollY = 0, prevScrollY = 0;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let meteors = [];
  let galaxy = null;
  let clock = 0;
  let nextMeteor = 3;
  let last = 0;
  let rafId = 0;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function createStars() {
    const count = clamp(Math.round((width * height) / 1500), 220, 900);
    stars = Array.from({ length: count }, () => {
      const size = 0.35 + Math.pow(Math.random(), 3) * 1.6;
      return {
        x: Math.random(),
        y: Math.random(),
        size,
        alpha: 0.35 + Math.random() * 0.65,
        speed: 0.6 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        drift: 1.5 + size * 4,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)]
      };
    });
  }

  // 은하 입자: 반지름 1 인 원판 안의 값(r, 각도)으로 저장하고 그릴 때 화면 크기로 늘린다
  function createGalaxy() {
    const ARMS = 4, WIND = 0.5, K = 9;
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const buckets = Array.from({ length: GAL_COLORS.length * GAL_ALPHAS.length }, () => []);
    const r = new Float32Array(GALAXY_N);
    const th = new Float32Array(GALAXY_N);
    const sz = new Float32Array(GALAXY_N);
    const ox = new Float32Array(GALAXY_N);
    const oy = new Float32Array(GALAXY_N);

    for (let i = 0; i < GALAXY_N; i++) {
      const roll = Math.random();
      let radius, theta, color;
      if (roll < 0.7) {
        radius = 0.02 + Math.pow(Math.random(), 1.7) * 0.98;
        const arm = Math.floor(Math.random() * ARMS);
        theta = (arm * 2 * Math.PI) / ARMS + Math.log(1 + radius * K) / WIND + gauss() * (0.16 + 0.3 * radius);
        const c = Math.random();
        color = c < 0.4 ? 0 : c < 0.75 ? 1 : 2;
      } else if (roll < 0.9) {
        radius = Math.min(Math.abs(gauss()) * 0.22, 0.45);
        theta = Math.random() * Math.PI * 2;
        color = Math.random() < 0.5 ? 3 : 0;
      } else {
        radius = 0.15 + Math.random() * 0.85;
        theta = Math.random() * Math.PI * 2;
        color = Math.random() < 0.5 ? 0 : 2;
      }
      r[i] = radius;
      th[i] = theta;
      sz[i] = (0.9 + Math.pow(Math.random(), 3) * 1.6) * (isSmall ? 1.1 : 1);
      const brightness = clamp(0.95 - radius * 0.85 + (Math.random() - 0.5) * 0.35, 0.05, 0.999);
      buckets[color * GAL_ALPHAS.length + Math.floor(brightness * GAL_ALPHAS.length)].push(i);
    }
    const styles = [];
    GAL_COLORS.forEach((c) => GAL_ALPHAS.forEach((a) => styles.push(`rgba(${c},${a})`)));
    // 같은 색·밝기끼리 묶어 fillStyle 을 버킷마다 한 번만 바꾼다
    galaxy = { r, th, sz, ox, oy, disturbed: false, lists: buckets.map((l) => Int32Array.from(l)), styles };
  }

  function drawGalaxy(dt) {
    // 스크롤하면 은하가 커지고 더 누워 기울어진다 (웹프로그램02 와 같은 방식)
    const maxScroll = Math.max(document.documentElement.scrollHeight - height, 1);
    const p = clamp(scrollY / maxScroll, 0, 1);
    const zoom = 1 + p * 0.7;
    const tilt = 0.52 - p * 0.3;               // 세로로 눌러 기울어 보이게
    const cx = width * (isSmall ? 0.78 : 0.84);
    const cy = height * (isSmall ? 0.17 : 0.2);
    const radius = Math.min(width, height) * (isSmall ? 0.34 : 0.3) * zoom;
    const angle = clock * 0.025;                // 천천히 회전
    const skew = -0.5, cosS = Math.cos(skew), sinS = Math.sin(skew);

    const animate = dt > 0;
    const pointerOn = animate && pointer.active;
    const track = animate && (pointerOn || galaxy.disturbed);
    const decay = Math.exp(-dt * 2.4);          // 밀려난 입자가 제자리로 돌아오는 속도
    const push2 = PUSH_RADIUS * PUSH_RADIUS;
    let maxOffset = 0;

    ctx.globalCompositeOperation = 'lighter';    // 겹칠수록 밝아져 중심부가 빛난다
    for (let b = 0; b < galaxy.lists.length; b++) {
      const list = galaxy.lists[b];
      if (!list.length) continue;
      ctx.fillStyle = galaxy.styles[b];
      for (let k = 0; k < list.length; k++) {
        const i = list[k];
        const x0 = galaxy.r[i] * Math.cos(galaxy.th[i] + angle);
        const y0 = galaxy.r[i] * Math.sin(galaxy.th[i] + angle);
        const ex = x0 * radius;
        const ey = y0 * radius * tilt;
        let x = cx + ex * cosS - ey * sinS;
        let y = cy + ex * sinS + ey * cosS;

        if (track) {
          let ox = galaxy.ox[i], oy = galaxy.oy[i];
          if (pointerOn) {
            const dx = x + ox - pointer.x;
            const dy = y + oy - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < push2) {
              const d = Math.sqrt(d2) + 0.001;
              const f = 1 - d / PUSH_RADIUS;    // 가까울수록 세게
              const push = (f * f * dt * 260) / d;
              ox += dx * push;
              oy += dy * push;
            }
          }
          ox *= decay; oy *= decay;
          galaxy.ox[i] = ox; galaxy.oy[i] = oy;
          x += ox; y += oy;
          const off = ox * ox + oy * oy;
          if (off > maxOffset) maxOffset = off;
        }
        const s = galaxy.sz[i];
        ctx.fillRect(x, y, s, s);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (track) galaxy.disturbed = pointerOn || maxOffset > 0.01;
  }

  function spawnMeteor() {
    const fromLeft = Math.random() < 0.5;
    const speed = 520 + Math.random() * 380;
    const dir = (Math.PI / 180) * (24 + Math.random() * 14);
    meteors.push({
      x: fromLeft ? Math.random() * width * 0.5 : width * (0.5 + Math.random() * 0.5),
      y: -20,
      vx: Math.cos(dir) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(dir) * speed,
      life: 0,
      max: 0.9 + Math.random() * 0.5
    });
  }

  function draw(dt, dy = 0) {
    ctx.clearRect(0, 0, width, height);

    drawGalaxy(dt);   // 별보다 먼저(뒤에) 그린다

    for (const s of stars) {
      // 천천히 왼쪽으로 흐른다
      if (dt) {
        s.x -= (s.drift * dt) / width;
        if (s.x < -0.01) s.x += 1.02;
      }
      // 스크롤하면 큰(가까운) 별일수록 더 많이 밀려난다 (시차)
      if (dy !== 0) {
        s.y -= (dy * (0.15 + s.size * 0.3)) / height;
        if (s.y < 0) s.y += 1; else if (s.y > 1) s.y -= 1;
      }
      const tw = 0.65 + 0.35 * Math.sin(clock * s.speed + s.phase);
      const a = s.alpha * tw;
      const px = s.x * width, py = s.y * height;

      {
        ctx.fillStyle = `rgba(${s.tint},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, s.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        if (s.size > 1.3) {          // 큰 별은 은은한 번짐을 한 겹 더
          ctx.fillStyle = `rgba(${s.tint},${(a * 0.16).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, s.size * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // 유성
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const fade = 1 - m.life / m.max;
      if (fade <= 0) { meteors.splice(i, 1); continue; }
      const tail = 90;
      const len = Math.hypot(m.vx, m.vy);
      const tx = m.x - (m.vx / len) * tail;
      const ty = m.y - (m.vy / len) * tail;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
      g.addColorStop(1, 'rgba(95,212,232,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stars.length || Math.abs(Math.round((width * height) / 1500) - stars.length) / stars.length > 0.25) createStars();
    draw(0);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    nextMeteor -= dt;
    if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = 5 + Math.random() * 6; }
    const dy = scrollY - prevScrollY;
    prevScrollY = scrollY;
    draw(dt, dy);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId || reduceMotion) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(rafId); rafId = 0; }

  // 스크롤·마우스·터치 위치 기억
  const onScroll = () => { scrollY = window.scrollY; if (!rafId) draw(0, 0); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduceMotion) return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { pointer.active = false; });
  const onTouch = (e) => {
    if (reduceMotion || !e.touches.length) return;
    pointer.x = e.touches[0].clientX; pointer.y = e.touches[0].clientY; pointer.active = true;
  };
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('touchend', () => { pointer.active = false; }, { passive: true });

  createGalaxy();
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
})();
