# 참고 출처 (REFERENCES)

교재(HTML5 웹 프로그래밍 입문)의 범위를 벗어나는 기법을 정리한 표입니다.
출처는 모두 MDN Web Docs(developer.mozilla.org)이며, 사용 위치는 `css/style.css`(CSS), `js/main.js`(JS), `index.html`(HTML)을 기준으로 적었습니다.

## JavaScript

| 기법 | 어디에 썼는가 | 참고 출처 |
| --- | --- | --- |
| IntersectionObserver | 스크롤 등장 효과(`initReveal`), 수치 카운트업(`initCountUp`), 현재 섹션 내비 표시(`initActiveNav`), hero가 화면 밖일 때 별 애니메이션 정지 | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API |
| requestAnimationFrame | scroll 이벤트 처리 묶기, 카운트업, 별 애니메이션 루프 | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame |
| Canvas 2D API | hero 별 배경(반짝임·흐름·별똥별) | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial |
| ResizeObserver | 화면 크기가 바뀔 때 canvas 크기 조정 | https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver |
| Page Visibility API (`visibilitychange`) | 탭이 안 보일 때 별 애니메이션 정지 | https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API |
| `matchMedia()` | `prefers-reduced-motion` 확인, 모바일 메뉴의 데스크톱 폭 전환 감지 | https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia |
| `window.scrollTo()` 의 `behavior: 'smooth'` | 앵커 부드러운 스크롤(고정 헤더 높이 보정), 폼 오류 위치로 이동 | https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo |
| `history.pushState()` | 부드러운 스크롤 후 주소창의 `#섹션id` 갱신 | https://developer.mozilla.org/en-US/docs/Web/API/History/pushState |
| `<dialog>` 와 `showModal()` | 예약 접수 확인창(포커스 가두기·Esc 닫기 기본 제공) | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog |
| `dataset` (data-* 속성) | 카운트업 목표값 보관 | https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset |
| `novalidate` / 폼 검증 | 브라우저 기본 검증 대신 직접 만든 오류 메시지 표시 | https://developer.mozilla.org/en-US/docs/Web/HTML/Attribute/novalidate |

## CSS

| 기법 | 어디에 썼는가 | 참고 출처 |
| --- | --- | --- |
| `backdrop-filter` | 스크롤 후 반투명 블러 헤더, 드롭다운·모바일 메뉴, 맨 위로 버튼, 확인창 배경 | https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter |
| `prefers-reduced-motion` | 애니메이션 감소 설정 시 전환·등장 효과·hover 이동 제거 | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
| CSS 변수 (custom properties) | `:root`의 색상·폰트·간격 관리, JS가 넘기는 여행 과정 진행 값(`--journey-fill`) | https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties |
| CSS Grid | 투어 카드(4/2/1열), 갤러리 격자, 통계 수치, 예약 폼 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout |
| `clamp()` | 제목·숫자·여백이 화면 폭에 맞게 부드럽게 변하는 크기 | https://developer.mozilla.org/en-US/docs/Web/CSS/clamp |
| `aspect-ratio` / `object-fit` | 카드·갤러리 이미지의 비율 통일과 잘라내기 | https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio , https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit |
| `mix-blend-mode: screen` + `mask-image` | 히어로의 지구 사진에서 검은 부분을 없애 별 배경 위에 빛나는 띠만 겹침 | https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode , https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image |
| `background-clip: text` | 히어로 제목·큰 숫자의 그라데이션 글자색 | https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip |
| `translate` (개별 변환 속성) | 스크롤 등장 효과가 카드 hover의 `transform`과 충돌하지 않도록 분리 | https://developer.mozilla.org/en-US/docs/Web/CSS/translate |
| `:has()` | 하위 메뉴가 있는 항목의 화살표, 폼의 한 줄 전체 항목 지정 | https://developer.mozilla.org/en-US/docs/Web/CSS/:has |
| `:where()` | 카드 안 요소의 기본 여백을 명시도 0으로 설정해 다른 규칙이 덮어쓸 수 있게 함 | https://developer.mozilla.org/en-US/docs/Web/CSS/:where |
| CSS 카운터 (`counter-increment`) | 여행 과정 단계 번호 원 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_counter_styles/Using_CSS_counters |
| `position: sticky` | 모바일 비교표의 첫 열 고정 | https://developer.mozilla.org/en-US/docs/Web/CSS/position |
| `@keyframes` | FAQ 답변·확인창이 나타나는 애니메이션 | https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes |
| `svh` / `dvh` 단위 | 모바일 주소창을 고려한 히어로 높이, 메뉴 패널 높이 | https://developer.mozilla.org/en-US/docs/Web/CSS/length |
| `text-wrap: balance` | 히어로 제목의 줄 길이 균형 | https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap |
| `accent-color` / `color-scheme` | 라디오·체크박스 색, 날짜 선택기 등 기본 UI의 다크 테마 | https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color , https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme |

## 접근성·설계 방식

| 기법 | 어디에 썼는가 | 참고 출처 |
| --- | --- | --- |
| `aria-expanded` / `aria-controls` | 모바일 햄버거 버튼의 열림 상태 | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded |
| `aria-current`, `aria-invalid`, `role="alert"` | 현재 섹션 메뉴, 폼 오류 입력과 오류 메시지 | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid |
| 점진적 향상 (`html.js` 클래스) | JS가 꺼져 있어도 모든 내용이 보이도록, 숨김 효과는 JS가 붙인 `js` 클래스가 있을 때만 적용 | https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement |

## 웹폰트

| 폰트 | 용도 | 출처 |
| --- | --- | --- |
| Noto Sans KR | 본문·한글 제목 | https://fonts.google.com/noto/specimen/Noto+Sans+KR |
| Space Grotesk | 영문 제목·큰 숫자 | https://fonts.google.com/specimen/Space+Grotesk |
