"""
Kármán Line — 탑승 준비 체크리스트 (웹프로그램03)

FastAPI + SQLite 로 만든 CRUD 웹 애플리케이션.
  - Create : POST   /api/todos
  - Read   : GET    /api/todos (검색·필터·정렬), GET /api/todos/{id}, GET /api/summary
  - Update : PUT    /api/todos/{id} (전체 수정), PATCH /api/todos/{id} (일부 수정)
  - Delete : DELETE /api/todos/{id}

실행:  uvicorn main:app --reload
화면:  http://127.0.0.1:8000        API 문서: http://127.0.0.1:8000/docs
"""
import sqlite3
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "todos.db"

# 웹프로그램02 의 "여행 과정"(상담 → 신체검사 → 사전 훈련 → 발사)에 맞춘 네 단계
Stage = Literal["apply", "exam", "training", "final"]
Priority = Literal["high", "normal", "low"]


# ---------------------------------------------------------------------------
# 데이터 모양 (Pydantic) — 요청이 들어올 때 자동으로 검사된다
# ---------------------------------------------------------------------------
class TodoIn(BaseModel):
    """추가(Create)·전체 수정(Update)할 때 받는 값"""
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=100)
    memo: str = Field(default="", max_length=500)
    stage: Stage = "apply"
    priority: Priority = "normal"
    due_date: date | None = None
    done: bool = False


class TodoPatch(BaseModel):
    """일부만 고칠 때(완료 체크, 단계 이동 등) 받는 값 — 보낸 항목만 바뀐다"""
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=100)
    memo: str | None = Field(default=None, max_length=500)
    stage: Stage | None = None
    priority: Priority | None = None
    due_date: date | None = None
    done: bool | None = None


class Todo(TodoIn):
    """돌려주는 값"""
    id: int
    created_at: str


# ---------------------------------------------------------------------------
# 데이터베이스 (SQLite)
# ---------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    memo       TEXT    NOT NULL DEFAULT '',
    stage      TEXT    NOT NULL DEFAULT 'apply',
    priority   TEXT    NOT NULL DEFAULT 'normal',
    due_date   TEXT,
    done       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
)
"""

# 처음 실행할 때 한 번만 넣는 예시 항목: (제목, 메모, 단계, 우선순위, 마감까지 남은 날, 완료)
SAMPLES = [
    ("탑승 상담 예약하기", "담당 매니저와 상담 일정을 잡습니다.", "apply", "high", 2, True),
    ("투어 상품 비교하고 고르기", "비교표를 보고 고도와 일정을 정합니다.", "apply", "normal", 5, True),
    ("신청서 제출하기", "이름, 연락처, 출발 희망일을 작성합니다.", "apply", "high", 7, False),
    ("건강 설문서 작성하기", "병력과 복용 중인 약을 적습니다.", "exam", "normal", -2, False),
    ("지정 병원에서 정밀 검진 받기", "심전도와 혈액 검사가 포함됩니다.", "exam", "high", 14, False),
    ("시력·치아 검사 결과 제출하기", "", "exam", "low", 16, False),
    ("기초 체력 훈련 시작하기", "주 3회, 유산소 위주로 진행합니다.", "training", "normal", 21, True),
    ("비상 탈출 교육 영상 시청", "", "training", "low", 25, False),
    ("무중력 적응 훈련 등록하기", "3일 과정입니다.", "training", "normal", 30, False),
    ("여권과 동의서류 준비하기", "만료일이 6개월 이상 남았는지 확인합니다.", "final", "high", 40, False),
    ("가족 비상 연락처 등록하기", "", "final", "normal", 42, False),
]


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = connect()
    try:
        conn.execute(SCHEMA)
        # user_version 이 0 이면 처음 실행이다. 예시 항목은 이때 한 번만 넣는다.
        if conn.execute("PRAGMA user_version").fetchone()[0] == 0:
            today = date.today()
            conn.executemany(
                "INSERT INTO todos (title, memo, stage, priority, due_date, done) VALUES (?,?,?,?,?,?)",
                [(t, m, s, p, (today + timedelta(days=d)).isoformat(), int(x)) for t, m, s, p, d, x in SAMPLES],
            )
            conn.execute("PRAGMA user_version = 1")
        conn.commit()
    finally:
        conn.close()


def get_db():
    """요청마다 연결을 열고, 끝나면 닫는다 (FastAPI 의존성)"""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def row_to_todo(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "memo": row["memo"],
        "stage": row["stage"],
        "priority": row["priority"],
        "due_date": row["due_date"],
        "done": bool(row["done"]),
        "created_at": row["created_at"],
    }


# ---------------------------------------------------------------------------
# 앱 만들기
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Kármán Line 탑승 준비 체크리스트", version="1.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")


# ---------------------------------------------------------------------------
# Read — 목록 (검색·필터·정렬)
# ---------------------------------------------------------------------------
PRIORITY_RANK = "CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END"
SORTS = {  # 정렬 이름 → ORDER BY (사용자 입력을 SQL 에 직접 넣지 않으려고 미리 정해 둔다)
    "due": f"done, due_date IS NULL, due_date, {PRIORITY_RANK}, id",
    "priority": f"done, {PRIORITY_RANK}, due_date IS NULL, due_date, id",
    "recent": "id DESC",
}


@app.get("/api/todos", response_model=list[Todo], tags=["Read"], summary="목록 보기 (검색·필터·정렬)")
def list_todos(
    q: str = Query("", max_length=100, description="제목·메모 검색어"),
    stage: Stage | None = None,
    priority: Priority | None = None,
    status: Literal["all", "open", "done"] = "all",
    sort: Literal["due", "priority", "recent"] = "due",
    db: sqlite3.Connection = Depends(get_db),
):
    where, params = [], []
    q = q.strip()
    if q:
        like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        where.append("(title LIKE ? ESCAPE '\\' OR memo LIKE ? ESCAPE '\\')")
        params += [like, like]
    if stage:
        where.append("stage = ?")
        params.append(stage)
    if priority:
        where.append("priority = ?")
        params.append(priority)
    if status != "all":
        where.append("done = ?")
        params.append(1 if status == "done" else 0)

    sql = "SELECT * FROM todos"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY " + SORTS[sort]
    return [row_to_todo(r) for r in db.execute(sql, params).fetchall()]


@app.get("/api/summary", tags=["Read"], summary="진행률 요약")
def summary(db: sqlite3.Connection = Depends(get_db)):
    today = date.today().isoformat()
    row = db.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done,"
        " COALESCE(SUM(CASE WHEN done = 0 AND due_date < ? THEN 1 ELSE 0 END), 0) AS overdue FROM todos",
        (today,),
    ).fetchone()
    stages = {s: {"total": 0, "done": 0} for s in ("apply", "exam", "training", "final")}
    for r in db.execute("SELECT stage, COUNT(*) AS total, SUM(done) AS done FROM todos GROUP BY stage"):
        stages[r["stage"]] = {"total": r["total"], "done": r["done"] or 0}
    total, done = row["total"], row["done"]
    return {
        "total": total,
        "done": done,
        "open": total - done,
        "overdue": row["overdue"],
        "percent": round(done / total * 100) if total else 0,
        "stages": stages,
    }


def get_or_404(db: sqlite3.Connection, todo_id: int) -> sqlite3.Row:
    row = db.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="해당 항목을 찾을 수 없습니다.")
    return row


@app.get("/api/todos/{todo_id}", response_model=Todo, tags=["Read"], summary="항목 하나 보기")
def read_todo(todo_id: int, db: sqlite3.Connection = Depends(get_db)):
    return row_to_todo(get_or_404(db, todo_id))


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------
@app.post("/api/todos", response_model=Todo, status_code=201, tags=["Create"], summary="항목 추가")
def create_todo(body: TodoIn, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        "INSERT INTO todos (title, memo, stage, priority, due_date, done) VALUES (?,?,?,?,?,?)",
        (body.title, body.memo, body.stage, body.priority,
         body.due_date.isoformat() if body.due_date else None, int(body.done)),
    )
    db.commit()
    return row_to_todo(get_or_404(db, cur.lastrowid))


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------
@app.put("/api/todos/{todo_id}", response_model=Todo, tags=["Update"], summary="항목 전체 수정")
def update_todo(todo_id: int, body: TodoIn, db: sqlite3.Connection = Depends(get_db)):
    get_or_404(db, todo_id)
    db.execute(
        "UPDATE todos SET title=?, memo=?, stage=?, priority=?, due_date=?, done=? WHERE id=?",
        (body.title, body.memo, body.stage, body.priority,
         body.due_date.isoformat() if body.due_date else None, int(body.done), todo_id),
    )
    db.commit()
    return row_to_todo(get_or_404(db, todo_id))


@app.patch("/api/todos/{todo_id}", response_model=Todo, tags=["Update"], summary="항목 일부 수정 (완료 체크·단계 이동)")
def patch_todo(todo_id: int, body: TodoPatch, db: sqlite3.Connection = Depends(get_db)):
    get_or_404(db, todo_id)
    changes = body.model_dump(exclude_unset=True)  # 보낸 항목만 골라낸다
    if "due_date" in changes and changes["due_date"] is not None:
        changes["due_date"] = changes["due_date"].isoformat()
    if "done" in changes and changes["done"] is not None:
        changes["done"] = int(changes["done"])
    if changes:
        # 컬럼 이름은 Pydantic 모델에 정의된 값만 오므로 안전하다. 값은 ? 로 따로 넘긴다.
        sets = ", ".join(f"{col} = ?" for col in changes)
        db.execute(f"UPDATE todos SET {sets} WHERE id = ?", [*changes.values(), todo_id])
        db.commit()
    return row_to_todo(get_or_404(db, todo_id))


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------
@app.delete("/api/todos/{todo_id}", status_code=204, tags=["Delete"], summary="항목 삭제")
def delete_todo(todo_id: int, db: sqlite3.Connection = Depends(get_db)):
    get_or_404(db, todo_id)
    db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    db.commit()
    return Response(status_code=204)
