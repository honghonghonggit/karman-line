/* ==========================================================================
   Kármán Line — main.js (Report03)
   구성
   0. 공통 준비        1. 헤더·맨 위로·여행 과정 (스크롤 한 곳에서 처리)
   2. 스크롤 등장 효과  3. 수치 카운트업      4. 현재 섹션 표시
   5. 부드러운 앵커 이동 6. 모바일 메뉴       7. 예약 폼 검증과 접수 확인창
   8. hero 별 배경(canvas)  9. 실행
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
  const getHeaderHeight = () => (header ? header.offsetHeight : 0);


  /* ========================================================================
     1. 스크롤 처리 — 헤더 배경 전환, 맨 위로 버튼, 여행 과정 강조
     scroll 이벤트는 매우 자주 발생하므로 requestAnimationFrame으로
     화면 갱신 주기마다 한 번만 계산한다.
     ======================================================================== */
  const topButton = $('.back-to-top');
  const journey = $('.journey-step');
  const journeySteps = journey ? $$(':scope > li', journey) : [];

  // 헤더: 조금만 스크롤해도 반투명 블러 배경으로 전환
  function updateHeader() {
    root.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  // 맨 위로 가기 버튼: 한 화면 정도 내려오면 표시
  function updateTopButton() {
    if (topButton) {
      topButton.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
    }
  }

  // 여행 과정: 화면 중앙선이 각 단계의 번호 원을 지날 때마다 차례로 강조하고 진행 선을 채운다
  function updateJourney() {
    if (!journey || journeySteps.length === 0) return;

    const line = window.innerHeight * 0.55; // 기준선 (화면 위에서 55% 지점)
    const first = journeySteps[0];
    const last = journeySteps[journeySteps.length - 1];

    // 번호 원의 반지름만큼 내려간 곳이 원의 중심
    const circleSize = parseFloat(getComputedStyle(first, '::before').height) || 44;
    const half = circleSize / 2;

    // 진행 선은 첫 원의 중심에서 마지막 원의 중심까지
    const trackLength = last.offsetTop - first.offsetTop;
    const startY = first.getBoundingClientRect().top + half;
    const fill = clamp(line - startY, 0, trackLength);

    journey.style.setProperty('--journey-track', `${trackLength}px`);
    journey.style.setProperty('--journey-fill', `${fill}px`);

    let activeIndex = -1;
    journeySteps.forEach((li, index) => {
      if (li.getBoundingClientRect().top + half <= line) activeIndex = index;
    });

    journeySteps.forEach((li, index) => {
      li.classList.toggle('is-active', index === activeIndex);
      li.classList.toggle('is-passed', index < activeIndex);
    });
  }

  let scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollTicking = false;
      updateHeader();
      updateTopButton();
      updateJourney();
    });
  }

  function initScrollEffects() {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }


  /* ========================================================================
     2. 스크롤 등장 효과 — IntersectionObserver
     화면에 들어오면 .is-visible 을 붙여 페이드 + 슬라이드업.
     (.reveal 도 JS가 붙이므로, JS가 없으면 처음부터 보인다.)
     ======================================================================== */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;

    const targets = $$([
      'main > section:not(#hero) > h2',
      'main > section:not(#hero) > p',
      '.stat-item',
      '.tour-card',
      '.compare-table',
      '.gallery-item',
      '.faq-item',
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

    targets.forEach((el) => {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }


  /* ========================================================================
     3. 수치 카운트업 — about 의 .stat-number
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
     4. 현재 섹션 표시 — 스크롤 위치에 맞는 내비게이션 메뉴를 활성화
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
     5. 부드러운 앵커 이동 — 고정 헤더 높이만큼 보정
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
     6. 모바일 메뉴 — 열고 닫기, aria-expanded 갱신
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
     7. 예약 폼 검증과 접수 확인창
     - 제출 시 모든 항목을 검사하고, 잘못된 입력 아래에 오류 메시지를 표시한다.
     - JS 가 없으면 novalidate 가 붙지 않아 브라우저 기본 검증이 그대로 동작한다.
     - 통과하면 실제 전송 없이 <dialog> 확인창을 띄운다.
     ======================================================================== */
  function initBookingForm() {
    const form = $('.booking-form');
    if (!form) return;
    form.noValidate = true;

    const MAX_BY_TOUR = { suborbital: 6, orbital: 6, moon: 4, deepspace: 4 }; // 비교표의 정원과 동일
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
     8. hero 별 배경 — canvas 로 반짝이며 천천히 움직이는 별
     - 별 좌표는 0~1 비율로 저장해 두어, 화면 크기가 바뀌어도 별이 다시 뿌려지지 않는다.
     - 탭이 안 보이거나 hero 가 화면 밖이면 애니메이션을 멈춘다.
     - 모션 줄이기 설정이면 움직이지 않는 별 한 장면만 그린다.
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
    let frameId = 0;
    let lastTime = 0;
    let clock = 0;
    let nextMeteorIn = 4;
    let running = false;
    let heroVisible = true;

    function createStars() {
      const count = clamp(Math.round((width * height) / 3600), 90, 420);
      stars = Array.from({ length: count }, () => {
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

    function resize() {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 화면 넓이에 비해 별 수가 너무 달라졌을 때만 다시 만든다
      const wanted = clamp(Math.round((width * height) / 3600), 90, 420);
      if (stars.length === 0 || Math.abs(wanted - stars.length) / stars.length > 0.25) createStars();

      if (!running) draw(0);
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

    function draw(dt) {
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        // 천천히 왼쪽으로 흐르고, 화면 끝에서 반대편으로 다시 들어온다
        s.x -= (s.drift * dt) / width;
        if (s.x < -0.01) s.x += 1.02;

        const twinkle = 0.62 + 0.38 * Math.sin(clock * s.twinkleSpeed + s.phase);
        const a = s.alpha * twinkle;
        const px = s.x * width;
        const py = s.y * height;

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

    function frame(now) {
      frameId = requestAnimationFrame(frame);
      const dt = Math.min((now - lastTime) / 1000, 0.05); // 탭 복귀 직후의 큰 간격은 잘라 낸다
      lastTime = now;
      clock += dt;

      nextMeteorIn -= dt;
      if (nextMeteorIn <= 0) {
        spawnMeteor();
        nextMeteorIn = 6 + Math.random() * 7;
      }
      draw(dt);
    }

    function start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      frameId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frameId);
    }

    // 보일 때만 움직인다: 탭이 보이고, hero 가 화면 안에 있고, 모션 줄이기가 꺼져 있을 때
    function syncRunning() {
      if (heroVisible && !document.hidden && !prefersReducedMotion()) start();
      else {
        stop();
        draw(0);
      }
    }

    new ResizeObserver(resize).observe(host);
    document.addEventListener('visibilitychange', syncRunning);
    motionQuery.addEventListener('change', syncRunning);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        heroVisible = entries[entries.length - 1].isIntersecting;
        syncRunning();
      }).observe(host);
    }

    resize();
    syncRunning();
  }


  /* ========================================================================
     9. 실행
     ======================================================================== */
  initScrollEffects();
  initReveal();
  initCountUp();
  initActiveNav();
  initSmoothAnchors();
  initMobileMenu();
  initBookingForm();
  initStarfield();
})();
