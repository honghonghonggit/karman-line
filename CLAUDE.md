# Kármán Line — 우주 관광 기업 홈페이지 (HTML 단계)

## 프로젝트 개요

대학 웹프로그래밍 수업 과제(Report02)로 제작하는 가상 우주 관광 기업 **Kármán Line**의 홈페이지다.
스크롤형 **원페이지** 구조이며, 이번 단계에서는 **HTML 마크업만** 작성한다.
이후 과제에서 같은 파일에 CSS와 JavaScript를 단계적으로 추가할 예정이므로, 지금은 그 확장을 염두에 둔 **구조 설계와 클래스 네이밍**이 핵심이다.

- 회사명: Kármán Line (카르만 라인)
- 슬로건: 고도 100km, 우주가 시작되는 곳
- 컨셉: 고도별 우주 관광 상품을 판매하는 민간 우주 여행사

---

## 절대 규칙 (반드시 지킬 것)

1. **CSS 금지** — `<style>` 태그, `style` 속성, 외부 CSS 링크(`<link rel="stylesheet">`) 모두 사용하지 않는다.
2. **JavaScript 금지** — `<script>` 태그, `onclick` 등 인라인 이벤트 속성을 사용하지 않는다.
3. **외부 라이브러리·CDN 금지** — 폰트, 아이콘, 프레임워크 등 어떤 외부 리소스도 불러오지 않는다.
4. 결과물은 **브라우저 기본 스타일 그대로** 렌더링되는 흰 페이지가 정상이다. 보기 좋게 만들려고 스타일을 넣지 말 것.
5. 언어는 **한국어**(`<html lang="ko">`), 인코딩은 **UTF-8**.
6. 과제 결과물이므로 **교재 수준의 기본 HTML 태그** 위주로 작성한다. 과도하게 현학적인 마크업은 피한다.

> 이번 단계의 평가 포인트는 화려함이 아니라 **시맨틱 태그를 목적에 맞게 썼는가**, **영역 분할이 논리적인가**, **나중에 스타일을 입힐 준비가 되어 있는가** 세 가지다.

---

## 파일 구조

```
karman-line/
├── index.html          ← 작성 대상 (유일한 HTML 파일)
├── images/             ← NASA 이미지 라이브러리에서 받은 우주 사진 11장
│   └── CREDITS.md      ← 파일별 NASA ID·원본 URL·크레딧 정리표
└── CLAUDE.md
```

### 이미지 처리 방침

- 이미지는 **NASA Image and Video Library**(images.nasa.gov)에서 받아 `images/`에 넣어 두었다. NASA가 직접 제작한 이미지만 사용하며, 가로 1600px 이하·파일당 약 500KB 이하로 리사이즈해 두었다.
- 파일별 NASA ID, 원본 URL, 크레딧은 `images/CREDITS.md`에 정리되어 있다. 이미지를 교체하거나 추가하면 이 표도 함께 갱신하고, 갤러리 `figcaption`과 푸터의 출처 문구도 실제 크레딧에 맞춘다.
- `<img>` 태그는 아래 파일명을 기준으로 상대 경로(`images/파일명.jpg`)로 작성한다.
  - `hero-earth.jpg` (지구 지평선)
  - `tour-suborbital.jpg` / `tour-orbital.jpg` / `tour-moon.jpg` / `tour-deepspace.jpg`
  - `gallery-01.jpg` ~ `gallery-06.jpg`
- 모든 `<img>`에는 의미 있는 `alt` 속성을 반드시 넣는다.
- 히어로 배경의 별·성운처럼 **분위기를 만드는 요소는 이미지로 넣지 않는다**. 다음 과제에서 CSS·JS로 직접 그릴 예정이므로, 해당 자리에는 클래스만 부여한 빈 컨테이너를 둔다.

---

## 페이지 구조

교재 종합예제의 `page-wrapper` 뼈대를 따르되, 내용은 우주 관광으로 구성한다.
섹션 순서는 **지구 → 우주 깊은 곳으로 멀어지는 흐름**으로 배치한다. 나중에 스크롤 효과를 붙였을 때 "스크롤 = 우주로 올라가는 여정"이 되도록 하기 위함이다.

```
div#page-wrapper
├── header#main-header
├── nav#main-navigation
├── main#content
│   ├── section#hero
│   ├── section#about
│   ├── section#tours
│   ├── section#compare
│   ├── section#journey
│   ├── section#gallery
│   ├── section#faq
│   └── section#booking
└── footer#main-footer
```

### header#main-header
- `<hgroup>` 안에 `<h1 class="master-title">Kármán Line</h1>`, `<h2 class="master-description">고도 100km, 우주가 시작되는 곳</h2>`.

### nav#main-navigation
- `ul.outer-menu` > `li.outer-menu-item` 구조.
- 메뉴 항목: 소개(`#about`), 투어 상품(`#tours`), 여행 과정(`#journey`), 갤러리(`#gallery`), FAQ(`#faq`), 예약(`#booking`).
- **투어 상품 항목만** 하위 메뉴(`ul.inner-menu`)를 중첩해 네 가지 상품으로 연결한다. 다음 과제에서 드롭다운으로 만들 자리다.
- 링크는 모두 페이지 내 앵커(`href="#섹션id"`).

### section#hero
- 대표 문구(`h2`)와 짧은 소개 문장(`p`), `a.btn-primary`로 `#booking` 연결.
- `div.hero-background` 를 빈 컨테이너로 두어 이후 별·은하 그래픽 자리를 확보한다.
- `hero-earth.jpg` 이미지 1장 사용.

### section#about
- 회사 소개 문단 2~3개.
- 주요 수치는 `ul.stat-list` > `li.stat-item` 구조로, 숫자는 `strong.stat-number`로 감싼다(이후 JS 카운트업 대상).
  - 누적 탑승객 1,240명 / 무사고 비행 87회 / 최고 도달 고도 384,400km / 설립 2031년

### section#tours
- 상품 4개를 각각 `<article class="tour-card">`로 작성. 고도 순으로 배치한다.
  1. **카르만 라인 체험** — 고도 100km, 15분 무중력, 훈련 3일
  2. **궤도 호텔 3일** — 고도 400km, 지구 궤도 숙박
  3. **달 플라이바이** — 고도 384,400km, 달 뒷면 통과, 6일
  4. **딥스페이스 관측** — 라그랑주점 관측 투어, 성운·심우주 관측
- 각 카드 내부: `figure > img + figcaption`, `h3.tour-title`, `p.tour-summary`, `ul.tour-feature` (포함 사항 3~4개), `p.tour-price`.
- 각 `article`에 `id`를 부여해 네비게이션 하위 메뉴와 연결한다(`tour-suborbital`, `tour-orbital`, `tour-moon`, `tour-deepspace`).

### section#compare
- `<table class="compare-table">`로 네 상품 비교.
- `<caption>`, `<thead>`(`th scope="col"`), `<tbody>`(각 행 첫 칸은 `th scope="row"`) 구조를 지킨다.
- 비교 항목: 고도 / 총 소요 기간 / 사전 훈련 기간 / 정원 / 가격.

### section#journey
- 신청부터 귀환까지의 과정을 `<ol class="journey-step">`으로 작성.
- 단계: 상담 및 신청 → 신체검사 → 사전 훈련 → 발사 → 우주 체류 → 귀환 및 수료.
- 각 `li` 안에 `h3`와 설명 `p`. 이후 스티키 스크롤 효과를 적용할 영역이다.

### section#gallery
- `figure.gallery-item` 6개를 나열. 각 `figure`는 `img` + `figcaption`을 갖는다.
- `figcaption`에는 사진 설명과 출처(예: NASA)를 함께 적는다.

### section#faq
- `<details class="faq-item">` + `<summary>` 조합으로 질문·답변 5개.
- 질문 예시: 특별한 신체 조건이 필요한가 / 훈련은 얼마나 힘든가 / 취소·환불 규정 / 동반 탑승 가능 여부 / 안전 기록.

### section#booking
- `<form class="booking-form">` (action/method는 `#` 및 생략 가능, 실제 전송 기능 없음).
- `<fieldset>`과 `<legend>`으로 **신청자 정보 / 여행 정보 / 추가 요청** 세 묶음으로 나눈다.
- 모든 입력 요소에 `<label for="...">`를 연결하고, 다양한 입력 타입을 사용한다.
  - 이름(`text`), 이메일(`email`), 연락처(`tel`), 생년월일(`date`)
  - 희망 투어(`select`), 출발 희망일(`date`), 탑승 인원(`number`), 무중력 경험 여부(`radio`)
  - 요청사항(`textarea`), 약관 동의(`checkbox`), 전송(`submit`)
- 필수 항목에는 `required`, 적절한 `placeholder`를 넣는다.

### footer#main-footer
- `<address>`로 회사 주소·연락처, 저작권 문구, 이미지 출처 안내.
- 과제용 가상 기업임을 밝히는 한 줄 문구를 포함한다.

---

## 작성 규칙

- **들여쓰기 2칸**, 태그 중첩을 눈으로 따라갈 수 있게 일관되게 정렬한다.
- 각 주요 영역 앞에 `<!-- 헤더 -->` 같은 **한국어 주석**을 달아 구획을 표시한다(교재 예제와 동일한 방식).
- `class` 이름은 `tour-card`, `stat-item`처럼 **소문자 하이픈 케이스**로 통일한다.
- 페이지에 단 하나뿐인 구조 영역은 `id`, 반복되는 요소는 `class`를 쓴다.
- 본문 텍스트는 로렘 입숨 대신 **실제 한국어 문장**으로 채운다. 가상 기업이지만 내용은 그럴듯하고 진지한 톤으로 쓴다.
- 분량은 한 섹션당 문단 1~3개 수준. 과하게 길게 쓰지 않는다.

---

## 작업 완료 후 확인

- [ ] `<style>`, `style=`, `<script>`, 외부 링크가 하나도 없는가
- [ ] 모든 `img`에 `alt`이 있는가
- [ ] 모든 폼 입력에 `label`이 연결되어 있는가
- [ ] 네비게이션 링크가 실제 섹션 `id`와 전부 일치하는가
- [ ] 브라우저에서 열었을 때 콘솔 오류 없이 위에서 아래로 내용이 읽히는가
