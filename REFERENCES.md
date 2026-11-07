# 참고 출처 (REFERENCES)

> **교재와 이 사이트의 차이**: 교재(HTML5 웹 프로그래밍 입문)의 종합예제2는 `float` 기반 레이아웃을, 종합예제3은 jQuery를 사용합니다.
> 이 사이트는 같은 구조(헤더·내비게이션·드롭다운·라이트박스)를 **CSS Grid/Flexbox와 순수 JavaScript**로 다시 구현했고, 라이브러리는 쓰지 않았습니다.

사용 위치는 `index.html`(HTML), `css/style.css`(CSS), `js/main.js`(JS)를 기준으로 적었습니다.
교재에 근거가 있는 항목은 쪽수를 적고, 교재 범위를 벗어나는 기법은 MDN Web Docs(developer.mozilla.org) 주소를 적었습니다.

## 1. 교재에 근거가 있는 항목

| 기법 | 어디에 썼는가 | 교재 근거 |
| --- | --- | --- |
| 문서 객체 생성과 추가 (`createElement`, `append`) | 고도 계기판, 갤러리 라이트박스 오버레이, 여행 과정 로켓, hero 제목 글자 쪼개기, 별 canvas, 폼 오류 메시지, 접수 확인창을 JS가 만들어 문서에 붙임 | Ch12 p.431 |
| 라이트박스 | 갤러리 사진 확대 보기 (이전/다음, 닫기, 바깥 클릭, Esc, 방향키) | Ch12 p.438, Ch14 p.488·492 |
| 미디어 쿼리와 반응형 | 1280px·1100px·900px·700px·480px 구간별 레이아웃, 모바일 햄버거 메뉴 | Ch8 |
| 드롭다운 메뉴 | 투어 상품의 `ul.inner-menu` hover/focus 드롭다운 (교재는 jQuery, 여기서는 CSS만 사용) | 종합예제2 p.286, 종합예제3 p.455 |

## 2. JavaScript (교재 범위 밖)

| 기법 | 어디에 썼는가 | 참고 출처 |
| --- | --- | --- |
| IntersectionObserver | 스크롤 등장 효과, 수치 카운트업, 현재 섹션 내비 표시, hero가 화면 밖일 때 별 계산 중지 | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API |
| requestAnimationFrame | 헤더·여행 과정·hero 패럴랙스·고도 계기판·워프 별을 한 루프에서 계산, 카운트업 | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame |
| 스크롤 위치 연동 (`scrollY`, scroll 이벤트) | 고도 계기판 보간, 워프 속도(스크롤 거리/시간), 패럴랙스, 여행 과정 진행선과 로켓 | https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY |
| `offsetTop` / `offsetParent` 로 위치 측정 후 캐시 | 매 프레임 레이아웃을 읽지 않도록 위치를 한 번 재서 저장 (등장 효과의 변형에 영향받지 않음) | https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetTop |
| Canvas 2D API | hero 별 배경(반짝임·흐름·별똥별·워프 선)과 나선 은하(WebGL 없이 2D canvas만 사용) | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial |
| 로그 나선 (수학) | hero 나선 은하의 팔: 각도 θ = ln(1 + K·r) / b 로 반지름 r 에 따라 각도를 정하고, 팔마다 2π/4 씩 돌려 놓음 | https://en.wikipedia.org/wiki/Logarithmic_spiral |
| 파티클 시스템 | hero 은하 입자 약 4,000개(모바일 2,000개): 입자마다 위치·크기·밝기를 갖고 프레임마다 갱신. 중심은 촘촘하게(r을 거듭제곱), 가장자리는 성기게 | https://en.wikipedia.org/wiki/Particle_system , https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations |
| 마우스·터치 반응 (`pointermove`, `touchmove`) | 포인터 가까이의 입자를 거리에 비례해 밀어내고, 지수 감쇠(`Math.exp(-dt*k)`)로 천천히 제자리로 되돌림 | https://developer.mozilla.org/en-US/docs/Web/API/Element/pointermove_event , https://developer.mozilla.org/en-US/docs/Web/API/Touch_events |
| 회전 행렬 | 회전 → 납작하게(기울어진 원판) → 기울이기 → 확대를 2×2 행렬 하나로 합쳐 입자마다 곱셈 4번으로 위치 계산 | https://en.wikipedia.org/wiki/Rotation_matrix |
| 타입 배열 (`Float32Array`, `Int32Array`) | 입자 수천 개의 좌표·크기·밀려난 거리를 가볍게 저장 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray |
| `globalCompositeOperation = 'lighter'` | 입자가 겹칠수록 밝아지게 해 은하 중심이 빛나는 효과 | https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation |
| `createRadialGradient()` | 은하 중심부의 은은한 광휘 | https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createRadialGradient |
| `devicePixelRatio` 상한 2 | 고해상도 화면에서도 canvas 픽셀 수가 과하게 늘지 않도록 제한 | https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio |
| 균등 난수의 합으로 정규분포 근사 | 나선 팔의 폭(퍼짐)을 팔 중심에 몰리게 하는 난수 (난수 3개의 합) | https://en.wikipedia.org/wiki/Irwin%E2%80%93Hall_distribution |
| 프레임 시간 기반 적응형 품질 | 프레임이 20ms 를 넘는 상태가 1.2초 이어지면 입자 수를 25%씩 줄임(최소 800개) | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame |
| ResizeObserver | 화면 크기 변화에 맞춘 canvas 크기 조정, 본문 높이가 바뀔 때 위치 재측정 | https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver |
| Page Visibility API (`visibilitychange`) | 탭이 안 보일 때 별 애니메이션 정지 | https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API |
| `matchMedia()` | `prefers-reduced-motion` 확인, 데스크톱 폭 전환 감지 | https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia |
| 인라인 SVG (`<svg>`, `<path>`) | 여행 과정 로켓을 이미지 파일 없이 코드로 그림 | https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial |
| `window.scrollTo()` 의 `behavior: 'smooth'` | 앵커 부드러운 스크롤(고정 헤더 높이 보정), 폼 오류 위치로 이동 | https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo |
| `history.pushState()` | 부드러운 스크롤 후 주소창의 `#섹션id` 갱신 | https://developer.mozilla.org/en-US/docs/Web/API/History/pushState |
| `<dialog>` 와 `showModal()` | 예약 접수 확인창(포커스 가두기·Esc 닫기 기본 제공) | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog |
| 터치 이벤트 (`touchstart`, `touchend`) | 라이트박스 좌우 스와이프 | https://developer.mozilla.org/en-US/docs/Web/API/Touch_events |
| `Number.prototype.toLocaleString()` | 고도 계기판·카운트업 숫자의 쉼표 표시 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString |
| `dataset` (data-* 속성) | 카운트업 목표값 보관 | https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset |
| `novalidate` / 폼 검증 | 브라우저 기본 검증 대신 직접 만든 오류 메시지 표시 | https://developer.mozilla.org/en-US/docs/Web/HTML/Attribute/novalidate |

## 3. CSS (교재 범위 밖)

| 기법 | 어디에 썼는가 | 참고 출처 |
| --- | --- | --- |
| CSS Grid | 투어 카드(4/2/1열), 갤러리 격자, 통계 수치, 예약 폼 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout |
| Flexbox | 헤더·내비게이션, hero, 계기판, 라이트박스 정렬 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout |
| `backdrop-filter` | 스크롤 후 반투명 블러 헤더, 드롭다운·모바일 메뉴, 계기판, 라이트박스 배경 | https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter |
| `prefers-reduced-motion` | 애니메이션 감소 설정 시 전환·등장·패럴랙스·로켓·글자 등장 제거 | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
| CSS 변수 (custom properties) | `:root`의 색상·폰트·간격, JS가 넘기는 값(`--journey-fill`, `--hero-p`, `--hud-p`, 등장 순서 `--i`) | https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties |
| `calc()` + 변수 | 등장 지연 `calc(var(--i) * 0.08s)`, 패럴랙스·계기판 위치 계산 | https://developer.mozilla.org/en-US/docs/Web/CSS/calc |
| `translate` · `scale` · `rotate` (개별 변환 속성) | 등장 효과·패럴랙스·로켓을 카드 hover의 `transform`과 충돌 없이 분리 | https://developer.mozilla.org/en-US/docs/Web/CSS/translate |
| `isolation: isolate` / `z-index` (쌓임 맥락) | 여행 과정에서 진행선 < 로켓 < 번호 원 순서로 겹침 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context |
| `position: fixed` | 상단 고정 헤더, 고도 계기판, 맨 위로 버튼, 라이트박스 | https://developer.mozilla.org/en-US/docs/Web/CSS/position |
| `@keyframes` / `animation` | 로켓 불꽃 일렁임, FAQ·확인창 등장 | https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes |
| `cubic-bezier()` (튀어나오는 곡선) | 확대 등장(zoom)에서 끝에 살짝 넘쳤다 돌아오는 느낌 | https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function |
| `filter: blur()` | hero 소개 문장·버튼의 흐림 해제 등장 | https://developer.mozilla.org/en-US/docs/Web/CSS/filter |
| `will-change` | hero 지구 사진의 확대 패럴랙스 | https://developer.mozilla.org/en-US/docs/Web/CSS/will-change |
| `clamp()` | 제목·숫자·여백이 화면 폭에 맞게 부드럽게 변하는 크기 | https://developer.mozilla.org/en-US/docs/Web/CSS/clamp |
| `aspect-ratio` / `object-fit` | 카드·갤러리 이미지의 비율 통일, 라이트박스 사진 맞춤 | https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio , https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit |
| `mix-blend-mode: screen` + `mask-image` | hero 지구 사진의 검은 부분을 없애 별 배경 위에 빛나는 띠만 겹침 | https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode , https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image |
| `background-clip: text` | hero 제목·큰 숫자의 그라데이션 글자색 | https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip |
| `:has()` / `:where()` | 하위 메뉴 화살표·폼 한 줄 항목 지정 / 카드 안 기본 여백을 명시도 0으로 설정 | https://developer.mozilla.org/en-US/docs/Web/CSS/:has , https://developer.mozilla.org/en-US/docs/Web/CSS/:where |
| CSS 카운터 (`counter-increment`) | 여행 과정 단계 번호 원 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters |
| `position: sticky` | 모바일 비교표의 첫 열 고정 | https://developer.mozilla.org/en-US/docs/Web/CSS/position |
| `svh` / `dvh` 단위 | 모바일 주소창을 고려한 hero 높이, 라이트박스·메뉴 패널 높이 | https://developer.mozilla.org/en-US/docs/Web/CSS/length |
| `text-wrap: balance` | hero 제목의 줄 길이 균형 | https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap |
| `accent-color` / `color-scheme` | 라디오·체크박스 색, 날짜 선택기 등 기본 UI의 다크 테마 | https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color , https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme |

## 4. 접근성·설계 방식

| 기법 | 어디에 썼는가 | 참고 출처 |
| --- | --- | --- |
| `aria-label` + `aria-hidden` | hero 제목을 글자로 쪼개도 스크린리더가 원문을 한 번에 읽도록 원문을 `aria-label`로 보존 | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label |
| `role="dialog"` / `aria-modal` / 포커스 관리 | 라이트박스: 열면 오버레이로 포커스 이동, Tab 순환, 닫으면 눌렀던 사진으로 복귀 | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/dialog_role |
| `aria-expanded` / `aria-controls` | 모바일 햄버거 버튼의 열림 상태 | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded |
| `aria-current`, `aria-invalid`, `role="alert"` | 현재 섹션 메뉴, 폼 오류 입력과 오류 메시지 | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid |
| 점진적 향상 (`html.js` 클래스) | JS가 꺼져 있어도 모든 내용이 보이도록, 숨김 효과는 JS가 붙인 `js` 클래스가 있을 때만 적용. 갤러리 사진은 JS가 없으면 원본 이미지로 이동하는 일반 링크 | https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement |

## 5. 웹폰트

| 폰트 | 용도 | 출처 |
| --- | --- | --- |
| Noto Sans KR (400·500·700) | 본문·한글 제목 | https://fonts.google.com/noto/specimen/Noto+Sans+KR |
| Space Grotesk (400·500·700) | 영문 제목·큰 숫자 | https://fonts.google.com/specimen/Space+Grotesk |
