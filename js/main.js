/* ==========================================================================
   Kármán Line — main.js (Report03)
   구성
   0. 공통 준비            1. 프레임 루프(스크롤 계산을 한 곳에 모음)
   2. 측정(레이아웃 읽기)    3. 매 프레임 처리: 헤더·여행 과정·hero 패럴랙스·고도 계기판
   4. 스크롤 등장 효과      5. 수치 카운트업        6. 현재 섹션 표시
   7. 부드러운 앵커 이동     8. 모바일 메뉴          9. 예약 폼 검증과 접수 확인창
   10. hero 별 배경·나선 은하·워프  11. hero 제목 글자 등장  12. 여행 과정 로켓
   13. 갤러리 라이트박스     14. 실행
   ========================================================================== */
(() => {
  'use strict';


  /* ========================================================================
     0. 공통 준비
     - <html>에 js 클래스를 붙인다. CSS의 "숨겼다가 나타나는 효과"는
       이 클래스가 있을 때만 적용되므로, JS가 꺼져 있으면 모든 내용이 그대로 보인다.
     ======================================================================== */
  const root = document.documentElement;
  root.classList.add('js');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // 사용자가 시스템에서 "애니메이션 줄이기"를 켰는지 (바뀔 수 있으므로 매번 확인)
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => motionQuery.matches;

  const header = $('#main-header');
  const hero = $('#hero');
  const getHeaderHeight = () => (header ? header.offsetHeight : 0);

  // 스크롤 위치·화면 높이: 매 프레임 한 번만 읽어 모든 효과가 같이 쓴다
  const view = { y: 0, vh: window.innerHeight };


  /* ========================================================================
     1. 프레임 루프 — requestAnimationFrame 한 곳에서 모든 스크롤 효과를 계산
     - 각 효과는 steps 에 함수로 등록한다. (dt, dy, motion) => 계속 움직여야 하면 true
     - 스크롤이 없고 계속 움직일 것도 없으면 루프가 멈춘다. (별 애니메이션은 hero 가 보일 때만 계속)
     - 레이아웃을 읽는 일(getBoundingClientRect 등)은 여기서 하지 않고 measure() 가 캐시한다.
       그래서 프레임마다 강제 리플로우가 생기지 않는다.
     ======================================================================== */
  const steps = [];
  let frameId = 0;
  let lastTime = 0;

  function frame(now) {
    frameId = 0;
    const dt = clamp((now - lastTime) / 1000, 0.001, 0.05); // 탭 복귀 직후의 큰 간격은 잘라 낸다
    lastTime = now;

    const y = window.scrollY;
    const dy = y - view.y; // 이번 프레임에 스크롤한 거리 (워프 별의 속도 계산에 사용)
    view.y = y;

    const motion = !prefersReducedMotion();
    let keepGoing = false;
    for (const step of steps) {
      if (step(dt, dy, motion)) keepGoing = true;
    }
    if (keepGoing) frameId = requestAnimationFrame(frame);
  }

  function requestFrame() {
    if (frameId) return;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }


  /* ========================================================================
     2. 측정 — 레이아웃 값은 화면 크기·내용 높이가 바뀔 때만 읽어 캐시
     ======================================================================== */
  const journey = $('.journey-step');
  const journeySteps = journey ? $$(':scope > li', journey) : [];

  // 고도 계기판의 이정표: 섹션/투어 상품 id 와 그 위치에서의 고도(km)
  const HUD_STOPS = [
    { id: 'hero', alt: 0 },
    { id: 'tour-suborbital', alt: 100 },     // 카르만 라인 체험
    { id: 'tour-orbital', alt: 400 },        // 궤도 호텔
    { id: 'tour-moon', alt: 384400 },        // 달 플라이바이
    { id: 'tour-deepspace', alt: 1500000 }   // 딥스페이스 관측 (라그랑주점, 약 150만km)
  ];

  const cache = {
    heroHeight: 0,
    journey: null,   // { tops: [...], half, track }
    anchors: []      // [{ alt, y }]
  };

  // 문서 맨 위에서 요소 윗변까지의 거리. offsetTop 은 레이아웃 값이라 translate·scale 같은
  // 등장 효과가 걸려 있어도 영향을 받지 않는다 (getBoundingClientRect 는 변형까지 반영해 값이 흔들린다)
  function docTop(el) {
    let top = 0;
    for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  }

  let measureQueued = false;
  function scheduleMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => {
      measureQueued = false;
      measure();
    });
  }

  function measure() {
    view.vh = window.innerHeight;
    cache.heroHeight = hero ? hero.offsetHeight : 0;

    // 여행 과정: 각 단계의 문서 기준 위치와, 진행선이 지나갈 길이
    if (journey && journeySteps.length > 0) {
      const tops = journeySteps.map(docTop);
      const circle = parseFloat(getComputedStyle(journeySteps[0], '::before').height) || 44;
      const track = tops[tops.length - 1] - tops[0];
      cache.journey = { tops, half: circle / 2, track };
      journey.style.setProperty('--journey-track', `${track}px`);
    }

    // 고도 계기판: 이정표가 놓일 문서 위치 (hero 는 맨 위, 나머지는 요소의 세로 중앙)
    // 데스크톱에서는 투어 카드 4장이 한 줄에 놓여 위치가 같아지므로, 최소 160px 간격을 벌려 구간을 만든다
    const anchors = [];
    let prevY = -Infinity;
    HUD_STOPS.forEach((stop, index) => {
      const el = document.getElementById(stop.id);
      if (!el) return;
      let y = view.vh * 0.5;
      if (index > 0) y = docTop(el) + el.offsetHeight / 2;
      y = Math.max(y, prevY + (index === 0 ? 0 : 160));
      anchors.push({ alt: stop.alt, y });
      prevY = y;
    });
    cache.anchors = anchors;

    requestFrame();
  }


  /* ========================================================================
     3. 매 프레임 처리 (steps 에 등록되는 함수들)
     쓰기 전에 값이 바뀌었는지 확인해, 같은 값을 반복해서 쓰지 않는다.
     ======================================================================== */

  // 3-1. 헤더 배경 전환, 맨 위로 버튼
  const topButton = $('.back-to-top');
  const chrome = { scrolled: null, topVisible: null };

  function stepChrome() {
    const scrolled = view.y > 24;
    if (scrolled !== chrome.scrolled) {
      chrome.scrolled = scrolled;
      root.classList.toggle('is-scrolled', scrolled);
    }
    const topVisible = view.y > view.vh * 0.8;
    if (topButton && topVisible !== chrome.topVisible) {
      chrome.topVisible = topVisible;
      topButton.classList.toggle('is-visible', topVisible);
    }
    return false;
  }

  // 3-2. 여행 과정: 기준선이 각 번호 원을 지날 때 차례로 강조하고 진행 선을 채운다
  const journeyState = { fill: -1, active: -2, rocket: null };

  function stepJourney() {
    const info = cache.journey;
    if (!info) return false;

    const line = view.y + view.vh * 0.55;                 // 문서 기준 기준선 위치
    const fill = Math.round(clamp(line - (info.tops[0] + info.half), 0, info.track));

    if (fill !== journeyState.fill) {
      journeyState.fill = fill;
      journey.style.setProperty('--journey-fill', `${fill}px`);
      if (journeyState.rocket) journeyState.rocket.classList.toggle('is-on', fill > 2);
    }

    let activeIndex = -1;
    for (let i = 0; i < info.tops.length; i++) {
      if (info.tops[i] + info.half <= line) activeIndex = i;
    }
    if (activeIndex !== journeyState.active) {
      journeyState.active = activeIndex;
      journeySteps.forEach((li, index) => {
        li.classList.toggle('is-active', index === activeIndex);
        li.classList.toggle('is-passed', index < activeIndex);
      });
    }
    return false;
  }

  // 3-3. hero 패럴랙스: 스크롤하면 지구 사진은 확대, 글씨는 위로 올라가며 옅어짐 (CSS 변수 하나로 전달)
  let heroProgress = -1;

  function stepHeroParallax(dt, dy, motion) {
    if (!hero || !motion) return false;
    const p = clamp(view.y / Math.max(cache.heroHeight, 1), 0, 1);
    if (Math.abs(p - heroProgress) > 0.001) {
      heroProgress = p;
      hero.style.setProperty('--hero-p', p.toFixed(3));
    }
    return false;
  }

  // 3-4. 고도 계기판(HUD): 화면 중앙 높이에 있는 위치를 이정표 사이에서 보간해 km 로 환산
  const hud = { shown: 0, text: '', progress: -1, passed: -1, el: null, value: null, ticks: [] };

  // 이정표 사이를 보간: 둘 다 0보다 크면 지수(곱) 보간이라 100 → 400 → 384,400 처럼 자릿수가 커지는 구간도 고르게 변한다
  function altitudeAt(y) {
    const a = cache.anchors;
    if (a.length === 0) return { value: 0, progress: 0 };
    if (y <= a[0].y) return { value: a[0].alt, progress: 0 };

    for (let i = 1; i < a.length; i++) {
      if (y <= a[i].y) {
        const t = (y - a[i - 1].y) / (a[i].y - a[i - 1].y);
        const lo = a[i - 1].alt;
        const hi = a[i].alt;
        const value = lo > 0 ? lo * Math.pow(hi / lo, t) : lo + (hi - lo) * t;
        return { value, progress: (i - 1 + t) / (a.length - 1) };
      }
    }
    return { value: a[a.length - 1].alt, progress: 1 }; // 이후 섹션은 마지막 값 유지
  }

  function stepHud(dt, dy, motion) {
    if (!hud.el || cache.anchors.length === 0) return false;

    const { value, progress } = altitudeAt(view.y + view.vh * 0.5);
    let keepGoing = false;

    if (motion) {
      // 숫자가 목표값을 향해 부드럽게 따라간다 (지수 감쇠)
      const diff = value - hud.shown;
      if (Math.abs(diff) < 0.5) {
        hud.shown = value;
      } else {
        hud.shown += diff * (1 - Math.exp(-dt * 7));
        keepGoing = true;
      }
    } else {
      hud.shown = value; // 모션 줄이기: 애니메이션 없이 정지된 값만 갱신
    }

    const text = Math.round(hud.shown).toLocaleString('en-US');
    if (text !== hud.text) {
      hud.text = text;
      hud.value.textContent = text;
    }

    if (Math.abs(progress - hud.progress) > 0.0005) {
      hud.progress = progress;
      hud.el.style.setProperty('--hud-p', progress.toFixed(4));

      const passed = Math.floor(progress * (HUD_STOPS.length - 1) + 0.001);
      if (passed !== hud.passed) {
        hud.passed = passed;
        hud.ticks.forEach((tick, index) => tick.classList.toggle('is-passed', index <= passed));
      }
    }
    return keepGoing;
  }

  function initHud() {
    const el = document.createElement('aside');
    el.className = 'altitude-hud';
    el.setAttribute('aria-hidden', 'true'); // 계속 바뀌는 숫자라 스크린리더에는 읽히지 않게 한다

    const readout = document.createElement('div');
    readout.className = 'altitude-hud-readout';
    const label = document.createElement('span');
    label.className = 'altitude-hud-label';
    label.textContent = '고도';
    const value = document.createElement('span');
    value.className = 'altitude-hud-value';
    value.textContent = '0';
    const unit = document.createElement('span');
    unit.className = 'altitude-hud-unit';
    unit.textContent = 'km';
    readout.append(label, value, unit);

    const track = document.createElement('div');
    track.className = 'altitude-hud-track';
    HUD_STOPS.forEach((stop, index) => {
      const tick = document.createElement('span');
      tick.className = 'altitude-hud-tick';
      tick.style.setProperty('--t', String(index / (HUD_STOPS.length - 1)));
      track.appendChild(tick);
      hud.ticks.push(tick);
    });
    const dot = document.createElement('span');
    dot.className = 'altitude-hud-dot';
    track.appendChild(dot);

    el.append(readout, track);
    document.body.appendChild(el);
    hud.el = el;
    hud.value = value;
  }


  /* ========================================================================
     4. 스크롤 등장 효과 — IntersectionObserver
     - 화면에 들어오면 .is-visible 을 붙여 페이드 + 이동. (.reveal 도 JS가 붙이므로 JS가 없으면 처음부터 보인다.)
     - 같은 그룹(카드·수치·사진·질문·단계) 안에서는 --i(0,1,2…)를 줘서 0.08초 간격으로 차례로 튀어나온다.
     - 그룹마다 등장 방식이 다르다: 아래→위 / 확대 / 좌우 교차 / 왼쪽에서.
     ======================================================================== */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;

    // cap: 한 줄에 함께 보일 만큼의 개수. 번호를 cap 으로 나눈 나머지로 지연을 주어, 아래 줄 카드가 너무 늦게 나오지 않게 한다
    const groups = [
      { selector: '.stat-item', cap: 4, variant: 'zoom' },
      { selector: '.tour-card', cap: 4, variant: '' },
      { selector: '.gallery-item', cap: 3, variant: 'zoom' },
      { selector: '.faq-item', cap: 5, variant: 'alternate' },
      { selector: '.journey-step > li', cap: 1, variant: 'left' }
    ];

    // 그룹이 아닌 단독 요소는 기본 효과
    const singles = $$([
      'main > section:not(#hero) > h2',
      'main > section:not(#hero) > p',
      '.compare-table',
      '.booking-form fieldset:not(.radio-group)',
      '.booking-form > button'
    ].join(','));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // 화면에 들어왔거나, 이미 화면 위로 지나간(예: 새로고침 후 스크롤 복원) 요소는 보이게 한다
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    function prepare(el, index, cap, variant) {
      el.classList.add('reveal');
      el.style.setProperty('--i', String(index % cap));
      if (variant === 'alternate') el.classList.add(index % 2 === 0 ? 'reveal--left' : 'reveal--right');
      else if (variant) el.classList.add(`reveal--${variant}`);
      observer.observe(el);
    }

    groups.forEach(({ selector, cap, variant }) => {
      $$(selector).forEach((el, index) => prepare(el, index, cap, variant));
    });
    singles.forEach((el) => prepare(el, 0, 1, ''));
  }


  /* ========================================================================
     5. 수치 카운트업 — about 의 .stat-number
     화면에 처음 보일 때 0 에서 목표값까지 증가. 쉼표 표기는 유지하고 단위(명·회·km·년)는
     HTML 에 따로 있으므로 숫자만 바꾼다.
     ======================================================================== */
  function initCountUp() {
    const numbers = $$('.stat-number');
    if (numbers.length === 0 || !('IntersectionObserver' in window) || prefersReducedMotion()) return;

    const DURATION = 1800; // ms
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function animate(el) {
      const original = el.dataset.target;
      const target = parseInt(original.replace(/\D/g, ''), 10);
      const useComma = original.includes(',');
      const format = (n) => (useComma ? n.toLocaleString('en-US') : String(n));
      const start = performance.now();

      function tick(now) {
        const progress = clamp((now - start) / DURATION, 0, 1);
        el.textContent = format(Math.round(target * easeOutCubic(progress)));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    numbers.forEach((el) => {
      el.dataset.target = el.textContent.trim(); // 원래 값을 기억해 두고
      el.textContent = '0';                       // 화면에는 0 부터 보여 준다
      observer.observe(el);
    });
  }


  /* ========================================================================
     6. 현재 섹션 표시 — 스크롤 위치에 맞는 내비게이션 메뉴를 활성화
     화면 위에서 약 40% 지점의 가는 띠를 지나는 섹션을 "현재 섹션"으로 본다.
     ======================================================================== */
  function initActiveNav() {
    if (!('IntersectionObserver' in window)) return;

    const links = $$('#main-navigation a[href^="#"]');
    // 메뉴가 따로 없는 섹션은 가까운 메뉴로 연결 (상품 비교표 → 투어 상품)
    const alias = { compare: 'tours' };

    function setActive(sectionId) {
      const key = alias[sectionId] || sectionId;
      links.forEach((a) => {
        const active = a.getAttribute('href') === `#${key}`;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-40% 0px -59% 0px' });

    $$('main > section').forEach((section) => observer.observe(section));
  }


  /* ========================================================================
     7. 부드러운 앵커 이동 — 고정 헤더 높이만큼 보정
     ======================================================================== */
  function scrollToId(id) {
    const target = id === 'page-wrapper' || id === 'hero' ? null : document.getElementById(id);
    let top = 0;

    if (target) {
      // 섹션 위쪽 여백(padding)만큼은 건너뛰고, 제목이 헤더 바로 아래 오도록 맞춘다
      const padTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
      top = target.getBoundingClientRect().top + window.scrollY + padTop - getHeaderHeight() - 24;
    }

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });

    // 키보드·스크린리더 사용자를 위해 도착한 곳으로 포커스 이동
    const focusTarget = target || document.getElementById('page-wrapper');
    if (focusTarget) {
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
    }
  }

  function initSmoothAnchors() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || link.getAttribute('href').length < 2) return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;

      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      if (id !== 'page-wrapper' && !document.getElementById(id)) return;

      event.preventDefault();
      scrollToId(id);
      history.pushState(null, '', `#${id}`);
    });
  }


  /* ========================================================================
     8. 모바일 메뉴 — 열고 닫기, aria-expanded 갱신
     ======================================================================== */
  function initMobileMenu() {
    const nav = $('#main-navigation');
    const button = $('.nav-toggle', nav || document);
    if (!nav || !button) return;

    const desktopQuery = window.matchMedia('(min-width: 901px)');

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }

    button.addEventListener('click', () => {
      setOpen(button.getAttribute('aria-expanded') !== 'true');
    });

    // 메뉴 안의 링크를 누르면 자동으로 닫힘
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    // 메뉴 바깥을 누르거나 Esc 를 누르면 닫힘
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        button.focus();
      }
    });

    // 화면이 데스크톱 폭이 되면 열린 상태를 정리
    desktopQuery.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }


  /* ========================================================================
     9. 예약 폼 검증과 접수 확인창
     - 제출 시 모든 항목을 검사하고, 잘못된 입력 아래에 오류 메시지를 표시한다.
     - JS 가 없으면 novalidate 가 붙지 않아 브라우저 기본 검증이 그대로 동작한다.
     - 통과하면 실제 전송 없이 <dialog> 확인창을 띄운다.
     ======================================================================== */
  function initBookingForm() {
    const form = $('.booking-form');
    if (!form) return;
    form.noValidate = true;

    // 정원: 상품 비교표(#compare)의 "정원" 행과 같은 값이어야 한다
    const MAX_BY_TOUR = { suborbital: 6, orbital: 6, moon: 4, deepspace: 4 };
    const TOUR_NAMES = { moon: '달 플라이바이', deepspace: '딥스페이스 관측' };

    const todayString = () => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    // 항목별 검사 규칙: 오류가 있으면 메시지를, 통과하면 빈 문자열을 돌려준다
    const rules = {
      'applicant-name'(v) {
        v = v.trim();
        if (!v) return '이름을 입력해 주세요.';
        if (v.length < 2) return '이름은 2자 이상 입력해 주세요.';
        return '';
      },
      'applicant-email'(v) {
        v = v.trim();
        if (!v) return '이메일을 입력해 주세요.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return '이메일 형식이 올바르지 않습니다. (예: example@email.com)';
        return '';
      },
      'applicant-phone'(v) {
        v = v.trim();
        if (!v) return '연락처를 입력해 주세요.';
        if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v)) return '연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)';
        return '';
      },
      'applicant-birth'(v) {
        if (!v) return '생년월일을 선택해 주세요.';
        if (v >= todayString()) return '생년월일은 오늘보다 이전 날짜여야 합니다.';
        if (v < '1900-01-01') return '생년월일을 다시 확인해 주세요.';
        return '';
      },
      'tour-select'(v) {
        return v ? '' : '희망 투어를 선택해 주세요.';
      },
      'departure-date'(v) {
        if (!v) return '출발 희망일을 선택해 주세요.';
        if (v <= todayString()) return '출발 희망일은 내일 이후 날짜여야 합니다.';
        return '';
      },
      'passenger-count'(v) {
        if (v === '') return '탑승 인원을 입력해 주세요.';
        const n = Number(v);
        if (!Number.isInteger(n)) return '탑승 인원은 정수로 입력해 주세요.';
        if (n < 1 || n > 6) return '탑승 인원은 1명에서 6명 사이여야 합니다.';
        const tour = form.elements['tour-select'].value;
        if (MAX_BY_TOUR[tour] && n > MAX_BY_TOUR[tour]) {
          return `${TOUR_NAMES[tour] || '선택한 투어'}의 정원은 ${MAX_BY_TOUR[tour]}명입니다.`;
        }
        return '';
      },
      'zerog-experience'(v) {
        return v ? '' : '무중력 경험 여부를 선택해 주세요.';
      },
      'agree-terms'(v) {
        return v ? '' : '약관에 동의해야 신청할 수 있습니다.';
      }
    };

    // 항목의 현재 값을 가져온다 (라디오는 선택된 값, 체크박스는 체크 여부)
    function getValue(name) {
      const field = form.elements[name];
      if (name === 'agree-terms') return field.checked;
      if (name === 'zerog-experience') return field.value; // RadioNodeList
      return field.value;
    }

    // 오류 메시지가 놓일 곳: 보통은 입력이 든 <p>, 라디오는 그룹 fieldset
    function getHost(name) {
      const field = form.elements[name];
      const control = name === 'zerog-experience' ? field[0] : field;
      return name === 'zerog-experience' ? control.closest('fieldset') : control.closest('p');
    }

    function setError(name, message) {
      const field = form.elements[name];
      const controls = name === 'zerog-experience' ? Array.from(field) : [field];
      const host = getHost(name);
      const errorId = `error-${name}`;
      let error = document.getElementById(errorId);

      if (message) {
        if (!error) {
          error = document.createElement('p');
          error.className = 'field-error';
          error.id = errorId;
          error.setAttribute('role', 'alert');
          host.appendChild(error);
        }
        error.textContent = message;
      } else if (error) {
        error.remove();
      }

      controls.forEach((control) => {
        control.classList.toggle('is-invalid', Boolean(message));
        control.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (message) control.setAttribute('aria-describedby', errorId);
        else control.removeAttribute('aria-describedby');
      });
      if (name === 'zerog-experience') host.classList.toggle('is-invalid', Boolean(message));
    }

    function validateField(name) {
      const message = rules[name](getValue(name));
      setError(name, message);
      return !message;
    }

    function clearAllErrors() {
      Object.keys(rules).forEach((name) => setError(name, ''));
    }

    // 입력 중·이동 중에 바로 알려 주기 (이미 오류가 있는 항목은 고치는 즉시 다시 검사)
    form.addEventListener('input', (event) => {
      const name = event.target.name;
      if (rules[name] && event.target.classList.contains('is-invalid')) validateField(name);
    });

    form.addEventListener('change', (event) => {
      const name = event.target.name;
      if (!rules[name]) return;
      validateField(name);
      // 투어를 바꾸면 정원이 달라지므로 인원도 다시 확인
      if (name === 'tour-select' && form.elements['passenger-count'].value !== '') validateField('passenger-count');
    });

    form.addEventListener('focusout', (event) => {
      const el = event.target;
      if (!rules[el.name] || el.type === 'radio' || el.type === 'checkbox') return;
      validateField(el.name);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const invalid = Object.keys(rules).filter((name) => !validateField(name));
      if (invalid.length > 0) {
        // 첫 번째 오류 입력으로 이동
        const first = form.elements[invalid[0]];
        const control = invalid[0] === 'zerog-experience' ? first[0] : first;
        control.focus({ preventScroll: true });
        const top = control.getBoundingClientRect().top + window.scrollY - getHeaderHeight() - 90;
        window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        return;
      }

      showConfirmation();
    });

    // 접수 확인창: 입력값은 textContent 로만 넣어 HTML 이 해석되지 않게 한다
    function showConfirmation() {
      const tourSelect = form.elements['tour-select'];
      const rows = [
        ['신청자', form.elements['applicant-name'].value.trim()],
        ['희망 투어', tourSelect.options[tourSelect.selectedIndex].text],
        ['출발 희망일', form.elements['departure-date'].value.replace(/-/g, '. ')],
        ['탑승 인원', `${form.elements['passenger-count'].value}명`]
      ];

      const dialog = document.createElement('dialog');
      dialog.className = 'booking-dialog';
      dialog.setAttribute('aria-labelledby', 'booking-dialog-title');

      const icon = document.createElement('div');
      icon.className = 'booking-dialog-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '✓';

      const title = document.createElement('h3');
      title.id = 'booking-dialog-title';
      title.textContent = '예약 신청이 접수되었습니다';

      const message = document.createElement('p');
      message.textContent = '담당 매니저가 영업일 기준 2일 이내에 연락드립니다. (과제용 가상 사이트로 실제 접수되지는 않습니다.)';

      const list = document.createElement('dl');
      rows.forEach(([label, value]) => {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        list.append(dt, dd);
      });

      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '확인';

      dialog.append(icon, title, message, list, close);
      document.body.appendChild(dialog);

      close.addEventListener('click', () => dialog.close());
      // 어두운 바깥 영역을 눌러도 닫힘
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        dialog.remove();
        form.reset();
        clearAllErrors();
      });

      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }


  /* ========================================================================
     10. hero 별 배경 — canvas 로 반짝이며 천천히 움직이는 별 + 나선 은하 + 워프
     - 별 좌표는 0~1 비율로 저장해 두어, 화면 크기가 바뀌어도 별이 다시 뿌려지지 않는다.
     - 나선 은하: 로그 나선 팔 4개 + 밝은 중심(bulge) + 성긴 바깥(halo) 입자 약 4,000개(모바일 2,000개).
       천천히 회전하고, 마우스(터치) 근처 입자는 밀려났다가 돌아온다. 스크롤하면 확대되고 기울어진다.
       프레임이 느려지면 입자 수를 자동으로 줄인다. 2D canvas 만 쓴다(WebGL·라이브러리 없음).
     - 스크롤 속도(dy/dt)에 비례해 별이 세로로 길게 늘어나며 빠르게 지나가고(워프),
       멈추면 천천히 원래 점으로 돌아온다.
     - 탭이 안 보이거나 hero 가 화면 밖이면 계산하지 않는다. 모션 줄이기면 정지된 별 한 장면만 그린다.
     - 별 그리기는 1번의 프레임 루프에 등록된 step 으로 돌아간다.
     ======================================================================== */
  function initStarfield() {
    const host = $('.hero-background');
    if (!host) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const TINTS = ['255,255,255', '255,255,255', '255,255,255', '170,215,255', '255,226,190'];
    let width = 0;
    let height = 0;
    let stars = [];
    let meteors = [];
    let clock = 0;
    let nextMeteorIn = 4;
    let heroVisible = true;
    let warp = 0;       // 0(점) ~ 1(가장 길게 늘어남)
    let warpDir = 1;    // 스크롤 방향: 아래로 내리면 별은 위로 흐르고 꼬리는 아래로 길어진다

    // --- 나선 은하 설정 ---
    const isSmall = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches; // 모바일·터치 기기는 처음부터 절반
    const GALAXY_MAX = isSmall ? 2000 : 4000;
    const GALAXY_MIN = 800;
    const PUSH_RADIUS = isSmall ? 80 : 120; // 마우스가 입자를 밀어내는 반경(px)
    // 색: 흰색, 청록(포인트색), 하늘색, 중심부의 옅은 따뜻한 흰색 / 밝기 단계(알파)
    const GAL_COLORS = ['255,255,255', '95,212,232', '150,200,255', '255,236,214'];
    const GAL_ALPHAS = [0.2, 0.36, 0.58, 0.88];
    let galaxy = null;
    let galaxyActive = GALAXY_MAX; // 지금 그리는 입자 수 (느려지면 줄어든다)
    let frameAvg = 16;             // 프레임 시간(ms)의 이동 평균
    let slowTime = 0;              // 20ms 를 넘는 상태가 이어진 시간(초)
    const pointer = { x: 0, y: 0, active: false };

    function starCount() {
      return clamp(Math.round((width * height) / 3600), 90, 420);
    }

    function createStars() {
      stars = Array.from({ length: starCount() }, () => {
        const size = 0.35 + Math.pow(Math.random(), 3) * 1.6; // 작은 별이 훨씬 많게
        return {
          x: Math.random(),
          y: Math.random(),
          size,
          alpha: 0.35 + Math.random() * 0.65,
          twinkleSpeed: 0.6 + Math.random() * 2.2,
          phase: Math.random() * Math.PI * 2,
          drift: 2 + size * 5, // 큰 별(가까운 별)이 더 빨리 흐른다 (px/초)
          tint: TINTS[Math.floor(Math.random() * TINTS.length)]
        };
      });
    }

    // 은하 입자 만들기: 좌표는 반지름 1 인 원판 안의 값(-1~1)으로 저장하고, 그릴 때 화면 크기로 늘린다
    function createGalaxy() {
      const ARMS = 4;      // 나선 팔 개수
      const WIND = 0.5;    // 로그 나선의 감김 정도 (클수록 팔이 덜 감긴다)
      const K = 9;         // 바깥으로 갈수록 각도가 변하는 속도
      const n = GALAXY_MAX;
      const g = {
        x: new Float32Array(n), y: new Float32Array(n), size: new Float32Array(n),
        ox: new Float32Array(n), oy: new Float32Array(n), // 마우스에 밀려난 정도(px)
        disturbed: false, lists: [], styles: []
      };
      const buckets = Array.from({ length: GAL_COLORS.length * GAL_ALPHAS.length }, () => []);
      // 정규분포 비슷한 난수: 균등 난수 3개의 합 (중심극한정리), 대략 -1 ~ 1
      const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

      for (let i = 0; i < n; i++) {
        const roll = Math.random();
        let r;
        let theta;
        let color;

        if (roll < 0.7) {
          // 나선 팔: 로그 나선 θ = ln(1 + K·r) / WIND, 팔마다 2π/ARMS 만큼 돌려 놓는다. 안쪽에 몰리도록 r 을 거듭제곱
          r = 0.02 + Math.pow(Math.random(), 1.7) * 0.98;
          const arm = Math.floor(Math.random() * ARMS);
          theta = (arm * 2 * Math.PI) / ARMS + Math.log(1 + r * K) / WIND + gauss() * (0.16 + 0.3 * r);
          const c = Math.random();
          color = c < 0.4 ? 0 : c < 0.75 ? 1 : 2;
        } else if (roll < 0.9) {
          // 중심부(bulge): 가운데에 촘촘하게 뭉친 입자
          r = Math.min(Math.abs(gauss()) * 0.22, 0.45);
          theta = Math.random() * Math.PI * 2;
          color = Math.random() < 0.5 ? 3 : 0;
        } else {
          // 바깥 후광(halo): 팔과 상관없이 성기게 흩어진 입자
          r = 0.15 + Math.random() * 0.85;
          theta = Math.random() * Math.PI * 2;
          color = Math.random() < 0.5 ? 0 : 2;
        }

        g.x[i] = r * Math.cos(theta);
        g.y[i] = r * Math.sin(theta);
        g.size[i] = (0.9 + Math.pow(Math.random(), 3) * 1.8) * (isSmall ? 1.2 : 1);

        // 중심에 가까울수록 밝게
        const brightness = clamp(0.95 - r * 0.85 + (Math.random() - 0.5) * 0.35, 0.05, 0.999);
        const level = Math.floor(brightness * GAL_ALPHAS.length);
        buckets[color * GAL_ALPHAS.length + level].push(i);
      }

      // 같은 색·밝기끼리 묶어 두면 fillStyle 을 버킷마다 한 번만 바꾸면 된다 (입자마다 바꾸면 느리다)
      g.lists = buckets.map((list) => Int32Array.from(list));
      g.styles = [];
      GAL_COLORS.forEach((c) => GAL_ALPHAS.forEach((a) => g.styles.push(`rgba(${c},${a})`)));
      galaxy = g;
    }

    // 은하 그리기. dt === 0 이면 정지된 한 장면(회전·마우스 반응 없음)
    function drawGalaxy(dt) {
      if (!galaxy) return;
      const g = galaxy;
      const animate = dt > 0;

      // 스크롤하면 커지고(zoom) 더 누워(flat) 비스듬히 기울어진다(tilt)
      const p = clamp(view.y / Math.max(cache.heroHeight, 1), 0, 1);
      const zoom = 1 + p * 0.9;
      const flat = 0.58 - p * 0.28;
      const tilt = -0.38 - p * 0.5;
      const spin = clock * 0.05; // 회전각(rad). clock 은 애니메이션 중에만 증가한다

      // 회전(spin) → 납작하게(flat) → 기울이기(tilt) → 확대를 한 번에 합친 2×2 행렬: 입자마다 곱셈 4번이면 된다
      const ca = Math.cos(tilt);
      const sa = Math.sin(tilt);
      const cd = Math.cos(spin);
      const sd = Math.sin(spin);
      const radius = Math.min(width, height * 1.5) * (isSmall ? 0.66 : 0.62) * zoom;
      const m11 = (ca * cd - sa * flat * sd) * radius;
      const m12 = (-ca * sd - sa * flat * cd) * radius;
      const m21 = (sa * cd + ca * flat * sd) * radius;
      const m22 = (-sa * sd + ca * flat * cd) * radius;
      const cx = width * (isSmall ? 0.5 : 0.8);
      const cy = height * (isSmall ? 0.1 : 0.36);

      // 마우스(터치) 위치: hero 는 문서 맨 위에 있으므로 canvas 좌표 = (clientX, clientY + scrollY)
      const pointerOn = animate && pointer.active;
      const my = pointer.y + view.y;
      const track = animate && (pointerOn || g.disturbed);
      const decay = Math.exp(-dt * 2.4); // 밀려난 입자가 원래 자리로 돌아오는 속도
      const pushRadius2 = PUSH_RADIUS * PUSH_RADIUS;
      let maxOffset = 0;

      // 워프 중에는 입자도 스크롤 방향으로 길어진다
      const stretch = warp > 0.04 ? warp * 12 : 0;

      ctx.globalCompositeOperation = 'lighter'; // 겹칠수록 밝아져 중심부가 빛난다

      // 중심부의 은은한 광휘: 같은 기울기로 납작하게 눌러 은하 면과 맞춘다
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.scale(1, flat);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.4);
      glow.addColorStop(0, 'rgba(190,235,255,0.34)');
      glow.addColorStop(0.45, 'rgba(95,212,232,0.12)');
      glow.addColorStop(1, 'rgba(95,212,232,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-radius * 0.4, -radius * 0.4, radius * 0.8, radius * 0.8);
      ctx.restore();

      for (let b = 0; b < g.lists.length; b++) {
        const list = g.lists[b];
        ctx.fillStyle = g.styles[b];
        for (let k = 0; k < list.length; k++) {
          const i = list[k];
          if (i >= galaxyActive) continue; // 성능 때문에 줄인 입자는 건너뜀

          const x0 = g.x[i];
          const y0 = g.y[i];
          let sx = cx + m11 * x0 + m12 * y0;
          let sy = cy + m21 * x0 + m22 * y0;

          if (track) {
            let ox = g.ox[i];
            let oy = g.oy[i];
            if (pointerOn) {
              const dx = sx + ox - pointer.x;
              const dy = sy + oy - my;
              const d2 = dx * dx + dy * dy;
              if (d2 < pushRadius2) {
                const d = Math.sqrt(d2) + 0.001;
                const f = 1 - d / PUSH_RADIUS;     // 가까울수록 세게 (0~1)
                const push = (f * f * dt * 260) / d;
                ox += dx * push;
                oy += dy * push;
              }
            }
            ox *= decay;
            oy *= decay;
            g.ox[i] = ox;
            g.oy[i] = oy;
            sx += ox;
            sy += oy;
            const offset = ox * ox + oy * oy;
            if (offset > maxOffset) maxOffset = offset;
          }

          const size = g.size[i];
          ctx.fillRect(sx, stretch && warpDir < 0 ? sy - stretch : sy, size, size + stretch);
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // 다 돌아올 때까지만 오프셋 계산을 계속한다
      if (track) g.disturbed = pointerOn || maxOffset > 0.01;
    }

    // 프레임이 느리면(20ms 초과가 1.2초 이어지면) 입자를 25% 줄인다 (최소 800개)
    function adaptGalaxyQuality(dt) {
      frameAvg += (dt * 1000 - frameAvg) * 0.1;
      if (frameAvg > 20) {
        slowTime += dt;
        if (slowTime > 1.2 && galaxyActive > GALAXY_MIN) {
          galaxyActive = Math.max(GALAXY_MIN, Math.floor(galaxyActive * 0.75));
          canvas.dataset.particles = String(galaxyActive);
          slowTime = 0;
          frameAvg = 16;
        }
      } else {
        slowTime = Math.max(0, slowTime - dt);
      }
    }

    function resize() {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 화면 넓이에 비해 별 수가 너무 달라졌을 때만 다시 만든다
      if (stars.length === 0 || Math.abs(starCount() - stars.length) / stars.length > 0.25) createStars();

      if (!isRunning()) draw(0, 0);
    }

    function spawnMeteor() {
      const angle = Math.PI * (0.16 + Math.random() * 0.1);
      const speed = 520 + Math.random() * 300;
      meteors.push({
        x: width * (0.1 + Math.random() * 0.7),
        y: height * Math.random() * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.9
      });
    }

    function draw(dt, dy) {
      ctx.clearRect(0, 0, width, height);

      // 스크롤 속도 → 워프 세기: 빨라질 때는 빠르게 반응하고, 멈추면 천천히 돌아온다
      if (dt > 0) {
        const speed = Math.abs(dy) / dt; // px/초
        const target = clamp(speed / 1800, 0, 1);
        warp += (target - warp) * (1 - Math.exp(-dt * (target > warp ? 16 : 2.4)));
        if (dy !== 0) warpDir = dy > 0 ? 1 : -1;
      }
      const streaking = warp > 0.04;

      drawGalaxy(dt); // 별보다 먼저(뒤에) 그린다

      for (const s of stars) {
        // 천천히 왼쪽으로 흐르고, 화면 끝에서 반대편으로 다시 들어온다
        s.x -= (s.drift * dt) / width;
        if (s.x < -0.01) s.x += 1.02;

        // 스크롤하면 가까운(큰) 별일수록 더 많이 밀려난다 (시차)
        if (dy !== 0) {
          s.y -= (dy * (0.15 + s.size * 0.3)) / height;
          if (s.y < 0) s.y += 1;
          else if (s.y > 1) s.y -= 1;
        }

        const twinkle = 0.62 + 0.38 * Math.sin(clock * s.twinkleSpeed + s.phase);
        const a = s.alpha * twinkle;
        const px = s.x * width;
        const py = s.y * height;

        if (streaking) {
          // 워프: 점 대신 세로 선. 큰 별일수록 길다
          const length = warp * (18 + s.size * 80);
          ctx.strokeStyle = `rgba(${s.tint},${Math.min(a + warp * 0.3, 1).toFixed(3)})`;
          ctx.lineWidth = Math.max(s.size * 0.9, 0.6);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + warpDir * length);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${s.tint},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, s.size, 0, Math.PI * 2);
          ctx.fill();

          // 큰 별에는 은은한 번짐을 한 겹 더
          if (s.size > 1.3) {
            ctx.fillStyle = `rgba(${s.tint},${(a * 0.16).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(px, py, s.size * 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 가끔 지나가는 별똥별
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const fade = 1 - m.life / m.maxLife;
        if (fade <= 0) {
          meteors.splice(i, 1);
          continue;
        }
        const tail = 0.12; // 꼬리 길이(초 단위 이동 거리)
        const gradient = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
        gradient.addColorStop(0, `rgba(220,240,255,${(0.9 * fade).toFixed(3)})`);
        gradient.addColorStop(1, 'rgba(220,240,255,0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
        ctx.stroke();
      }
    }

    // 보일 때만 움직인다: 탭이 보이고, hero 가 화면 안에 있고, 모션 줄이기가 꺼져 있을 때
    const isRunning = () => heroVisible && !document.hidden && !prefersReducedMotion();

    // 프레임 루프에 등록되는 step: 움직이는 동안 true 를 돌려주면 루프가 계속 돈다
    steps.push((dt, dy, motion) => {
      if (!motion || !heroVisible || document.hidden) return false;
      clock += dt;
      adaptGalaxyQuality(dt);
      nextMeteorIn -= dt;
      if (nextMeteorIn <= 0) {
        spawnMeteor();
        nextMeteorIn = 6 + Math.random() * 7;
      }
      draw(dt, dy);
      return true;
    });

    function sync() {
      if (isRunning()) requestFrame();
      else {
        warp = 0;
        draw(0, 0); // 멈춘 상태에서는 정지된 별 한 장면
      }
    }

    // 마우스·터치 위치: hero 가 화면 밖일 때는 step 이 멈춰 있으므로 값만 기억해 둔다
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { pointer.active = false; });

    const onTouch = (event) => {
      if (prefersReducedMotion() || event.touches.length === 0) return;
      pointer.x = event.touches[0].clientX;
      pointer.y = event.touches[0].clientY;
      pointer.active = true;
    };
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', () => { pointer.active = false; }, { passive: true });
    window.addEventListener('touchcancel', () => { pointer.active = false; }, { passive: true });

    createGalaxy();
    canvas.dataset.particles = String(galaxyActive);

    new ResizeObserver(resize).observe(host);
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        heroVisible = entries[entries.length - 1].isIntersecting;
        sync();
      }).observe(host);
    }

    resize();
    sync();
  }


  /* ========================================================================
     11. hero 제목 — 글자 단위로 차례로 떠오른다
     - 원문은 h2 의 aria-label 로 보존하고, 쪼갠 글자는 aria-hidden 으로 가려 스크린리더가 한 글자씩 읽지 않게 한다.
     - 띄어쓰기 단위(.word)로 묶어, 줄이 바뀔 때 단어 중간에서 끊기지 않게 한다.
     - 모션 줄이기가 켜져 있으면 쪼개지 않고 그대로 둔다.
     ======================================================================== */
  function initHeroTitle() {
    const title = $('.hero-title');
    if (!title || !hero || prefersReducedMotion()) return;

    const text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.textContent = '';

    const wrapper = document.createElement('span');
    wrapper.setAttribute('aria-hidden', 'true');

    let index = 0;
    const words = text.split(' ');
    words.forEach((wordText, wordIndex) => {
      const word = document.createElement('span');
      word.className = 'word';
      Array.from(wordText).forEach((letter) => {
        const char = document.createElement('span');
        char.className = 'char';
        char.textContent = letter;
        char.style.setProperty('--i', String(index++));
        word.appendChild(char);
      });
      wrapper.appendChild(word);
      if (wordIndex < words.length - 1) wrapper.appendChild(document.createTextNode(' '));
    });

    title.appendChild(wrapper);
    title.classList.add('is-split');
    hero.classList.add('hero-intro');

    // 시작 상태가 한 번 그려진 뒤에 클래스를 바꿔야 전환이 실제로 재생된다
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
  }


  /* ========================================================================
     12. 여행 과정 로켓 — 진행선 끝에 붙어 스크롤에 따라 내려간다
     SVG 를 코드로 직접 그린 것이며 외부 이미지는 쓰지 않는다.
     위치는 3-2 의 --journey-fill 값을 CSS 가 그대로 쓰므로 여기서 따로 계산하지 않는다.
     ======================================================================== */
  function initJourneyRocket() {
    if (!journey || prefersReducedMotion()) return;

    const rocket = document.createElement('span');
    rocket.className = 'journey-rocket';
    rocket.setAttribute('aria-hidden', 'true');
    // 위쪽을 향한 로켓: 불꽃 / 동체 / 창문 / 날개 (CSS 에서 180도 돌려 아래로 향하게 함)
    rocket.innerHTML =
      '<svg viewBox="0 0 24 40" focusable="false">' +
      '<path class="rocket-flame" d="M8.5 29 Q12 42 15.5 29 Z" fill="#ffb072"/>' +
      '<path d="M7 24 L2 33 L7.5 30.5 Z M17 24 L22 33 L16.5 30.5 Z" fill="#5fd4e8"/>' +
      '<path d="M12 1 C17.5 7 18.5 16 17.5 29 H6.5 C5.5 16 6.5 7 12 1 Z" fill="#e8eef8"/>' +
      '<circle cx="12" cy="14" r="3.2" fill="#3b8ff0" stroke="#07142e" stroke-width="1"/>' +
      '</svg>';

    journey.appendChild(rocket);
    journeyState.rocket = rocket;
  }


  /* ========================================================================
     13. 갤러리 라이트박스 — 사진을 크게 보고 이전/다음으로 넘긴다
     - 오버레이는 createElement 로 만들어 body 에 붙인다.
     - 열면 포커스를 오버레이로 옮기고, 닫으면 눌렀던 사진 링크로 되돌린다.
     - 이전/다음 버튼, 닫기 버튼, 바깥 클릭, Esc, 좌우 방향키, 터치 스와이프를 지원한다.
     - JS 가 없으면 사진 링크는 그냥 원본 이미지 파일로 이동한다.
     ======================================================================== */
  function initLightbox() {
    const links = $$('.gallery-item .gallery-link');
    if (links.length === 0) return;

    let current = -1;
    let opener = null;

    // 오버레이 구성: 닫기 / 이전 / 다음 / 번호 / 사진 + 설명
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.hidden = true;
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '갤러리 사진 크게 보기');

    function makeButton(className, label, symbol) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `lightbox-btn ${className}`;
      button.setAttribute('aria-label', label);
      button.textContent = symbol;
      return button;
    }

    const closeButton = makeButton('lightbox-close', '닫기', '×');
    const prevButton = makeButton('lightbox-prev', '이전 사진', '‹');
    const nextButton = makeButton('lightbox-next', '다음 사진', '›');

    const counter = document.createElement('span');
    counter.className = 'lightbox-count';
    counter.setAttribute('aria-live', 'polite');

    const figure = document.createElement('figure');
    figure.className = 'lightbox-figure';
    const image = document.createElement('img');
    image.className = 'lightbox-img';
    const caption = document.createElement('figcaption');
    caption.className = 'lightbox-caption';
    figure.append(image, caption);

    overlay.append(closeButton, prevButton, nextButton, counter, figure);
    document.body.appendChild(overlay);

    function show(index) {
      current = (index + links.length) % links.length;
      const link = links[current];
      const thumb = $('img', link);
      const figcaption = $('figcaption', link.closest('figure'));

      image.src = link.getAttribute('href');
      image.alt = thumb ? thumb.alt : '';
      caption.textContent = figcaption ? figcaption.textContent.trim() : '';
      counter.textContent = `${current + 1} / ${links.length}`;

      // 이전·다음 사진을 미리 받아 두어 넘길 때 기다리지 않게 한다
      [current - 1, current + 1].forEach((i) => {
        new Image().src = links[(i + links.length) % links.length].getAttribute('href');
      });
    }

    function open(index, trigger) {
      opener = trigger;
      overlay.hidden = false;
      root.classList.add('lightbox-open');
      show(index);
      requestAnimationFrame(() => overlay.classList.add('is-open')); // 페이드 인
      overlay.focus();
    }

    function close() {
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      root.classList.remove('lightbox-open');
      if (opener) opener.focus(); // 눌렀던 사진으로 포커스 복귀
      opener = null;
    }

    links.forEach((link, index) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        open(index, link);
      });
    });

    closeButton.addEventListener('click', close);
    prevButton.addEventListener('click', () => show(current - 1));
    nextButton.addEventListener('click', () => show(current + 1));

    // 사진·설명·버튼이 아닌 어두운 바깥을 누르면 닫힘
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target === figure) close();
    });

    document.addEventListener('keydown', (event) => {
      if (overlay.hidden) return;

      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft') show(current - 1);
      else if (event.key === 'ArrowRight') show(current + 1);
      else if (event.key === 'Tab') {
        // 포커스가 오버레이 밖으로 나가지 않도록 세 버튼 사이에서만 순환
        const focusable = [closeButton, prevButton, nextButton];
        const index = focusable.indexOf(document.activeElement);
        event.preventDefault();
        const next = event.shiftKey ? index - 1 : index + 1;
        focusable[(next + focusable.length) % focusable.length].focus();
      }
    });

    // 터치 스와이프: 좌우로 쓸어 넘기기
    let touchStartX = 0;
    overlay.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    overlay.addEventListener('touchend', (event) => {
      const diff = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) show(current + (diff < 0 ? 1 : -1));
    }, { passive: true });
  }


  /* ========================================================================
     14. 실행
     ======================================================================== */
  steps.push(stepChrome, stepJourney, stepHeroParallax, stepHud);

  initHud();
  initReveal();
  initCountUp();
  initActiveNav();
  initSmoothAnchors();
  initMobileMenu();
  initBookingForm();
  initHeroTitle();
  initJourneyRocket();
  initStarfield();
  initLightbox();

  // 스크롤이 일어날 때만 프레임 루프를 깨운다
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('load', scheduleMeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);

  // 이미지 로딩 등으로 본문 높이가 바뀌면 측정값을 다시 잡는다
  const content = $('#content');
  if (content && 'ResizeObserver' in window) new ResizeObserver(scheduleMeasure).observe(content);

  measure();
})();
