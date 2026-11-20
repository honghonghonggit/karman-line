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
  const GAL_ALPHAS = [0.16, 0.3, 0.5, 0.78];
  const GALAXY_N = isSmall ? 900 : 1900;

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
    const count = clamp(Math.round((width * height) / 4200), 80, 380);
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
    galaxy = { r, th, sz, lists: buckets.map((l) => Int32Array.from(l)), styles };
  }

  function drawGalaxy() {
    // 오른쪽 위에 비스듬히 누운 은하. 내용을 가리지 않게 은은하게 그린다.
    const cx = width * (isSmall ? 0.78 : 0.84);
    const cy = height * (isSmall ? 0.17 : 0.2);
    const radius = Math.min(width, height) * (isSmall ? 0.34 : 0.3);
    const tilt = 0.52;                 // 세로로 눌러 기울어 보이게
    const angle = clock * 0.025;       // 천천히 회전
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const skew = -0.5, cosS = Math.cos(skew), sinS = Math.sin(skew);

    for (let b = 0; b < galaxy.lists.length; b++) {
      const list = galaxy.lists[b];
      if (!list.length) continue;
      ctx.fillStyle = galaxy.styles[b];
      for (let k = 0; k < list.length; k++) {
        const i = list[k];
        const x0 = galaxy.r[i] * Math.cos(galaxy.th[i] + angle);
        const y0 = galaxy.r[i] * Math.sin(galaxy.th[i] + angle);
        // 눌러서(tilt) 다시 비스듬히 돌린다
        const ex = x0 * radius;
        const ey = y0 * radius * tilt;
        const x = cx + ex * cosS - ey * sinS;
        const y = cy + ex * sinS + ey * cosS;
        const s = galaxy.sz[i];
        ctx.fillRect(x, y, s, s);
      }
    }
    void cosA; void sinA;
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

  function draw(dt) {
    ctx.clearRect(0, 0, width, height);

    // 별
    for (const s of stars) {
      if (dt) {
        s.y -= (s.drift * dt) / height;
        if (s.y < -0.01) { s.y = 1.01; s.x = Math.random(); }
      }
      const tw = 0.65 + 0.35 * Math.sin(clock * s.speed + s.phase);
      ctx.globalAlpha = s.alpha * tw;
      ctx.fillStyle = `rgb(${s.tint})`;
      const px = s.x * width, py = s.y * height;
      if (s.size > 1.2) {
        ctx.beginPath();
        ctx.arc(px, py, s.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(px, py, s.size, s.size);
      }
    }
    ctx.globalAlpha = 1;

    drawGalaxy();

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
    if (!stars.length) createStars();
    draw(0);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;
    nextMeteor -= dt;
    if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = 5 + Math.random() * 6; }
    draw(dt);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId || reduceMotion) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(rafId); rafId = 0; }

  createGalaxy();
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
})();
