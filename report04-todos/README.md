# 탑승 준비 체크리스트 (웹프로그램03)

FastAPI + SQLite 로 만든 Todos 웹 애플리케이션입니다. (Create / Read / Update / Delete 모두 구현)

## 실행 방법
    pip install -r requirements.txt
    python -m uvicorn main:app --reload

브라우저에서 http://127.0.0.1:8000 을 열면 화면이, http://127.0.0.1:8000/docs 에서 API 문서가 보입니다.
처음 실행하면 todos.db 가 자동으로 만들어지고 예시 항목이 들어갑니다. (지우면 초기화)

## 구성
- main.py : FastAPI 서버, SQLite 저장, REST API
- static/index.html, css/style.css, js/app.js, js/starfield.js : 화면
- 디자인과 별 배경은 웹프로그램02(Kármán Line 홈페이지)의 CSS·JS를 가져와 고친 것입니다.
