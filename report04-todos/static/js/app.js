/* ==========================================================================
   탑승 준비 체크리스트 — 화면 동작 (웹프로그램03)
   서버(FastAPI)의 API 를 fetch 로 불러서 CRUD 를 처리한다.
     Create  POST   /api/todos          Read   GET /api/todos, /api/summary
     Update  PUT / PATCH /api/todos/id  Delete DELETE /api/todos/id
   화면 요소는 웹프로그램02 의 갤러리처럼 createElement 로 만든다(innerHTML 안 씀).
   ========================================================================== */
(() => {
  'use strict';

  const STAGES = [
    { key: 'apply', no: '01', name: '신청·상담', hint: '상품을 고르고 신청서를 냅니다' },
    { key: 'exam', no: '02', name: '신체검사', hint: '우주 비행에 적합한지 확인합니다' },
    { key: 'training', no: '03', name: '사전 훈련', hint: '무중력과 비상 상황에 대비합니다' },
    { key: 'final', no: '04', name: '최종 점검', hint: '서류와 준비물을 마지막으로 확인합니다' }
  ];
  const PRIORITY = { high: '높음', normal: '보통', low: '낮음' };

  const $ = (sel, root = document) => root.querySelector(sel);
  const state = {
    items: [],
    filters: { q: '', status: 'all', priority: '', sort: 'due' },
    editingId: null,
    firstRender: true
  };

  /* ---------- 작은 도구들 ---------- */

  // 요소 만들기: el('div', {class: 'a', onclick: fn}, '글자', 자식요소...)
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  let toastTimer = 0;
  function toast(message, isError = false) {
    const box = $('#toast');
    box.textContent = message;
    box.classList.toggle('error', isError);
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
  }

  async function api(path, options = {}) {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) {
      let message = '요청을 처리하지 못했습니다.';
      try {
        const data = await res.json();
        if (typeof data.detail === 'string') message = data.detail;
        else if (Array.isArray(data.detail)) message = '입력한 내용을 다시 확인해 주세요.';
      } catch (e) { /* 본문이 없으면 기본 문구 */ }
      throw new Error(message);
    }
    return res.status === 204 ? null : res.json();
  }

  // 'YYYY-MM-DD' 를 그 날 0시(내 시간대)로 바꾼다. new Date('2026-12-01') 은 UTC 라 하루 어긋날 수 있다.
  function parseDate(text) {
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // 마감일 표시: {text, cls}
  function dueInfo(item) {
    if (!item.due_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseDate(item.due_date);
    const diff = Math.round((due - today) / 86400000);
    const md = `${due.getMonth() + 1}/${due.getDate()}`;
    if (item.done) return { text: `마감 ${md}`, cls: '' };
    if (diff < 0) return { text: `${-diff}일 지남 · ${md}`, cls: 'overdue' };
    if (diff === 0) return { text: `오늘 마감 · ${md}`, cls: 'soon' };
    if (diff <= 3) return { text: `D-${diff} · ${md}`, cls: 'soon' };
    return { text: `D-${diff} · ${md}`, cls: '' };
  }

  /* ---------- 서버에서 불러오기 (Read) ---------- */

  async function load() {
    const f = state.filters;
    const params = new URLSearchParams({ status: f.status, sort: f.sort });
    if (f.q) params.set('q', f.q);
    if (f.priority) params.set('priority', f.priority);
    try {
      const [items, summary] = await Promise.all([api(`/api/todos?${params}`), api('/api/summary')]);
      state.items = items;
      renderBoard();
      renderSummary(summary);
    } catch (err) {
      toast('서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인해 주세요.', true);
    }
  }

  /* ---------- 진행률 요약 ---------- */

  let shownPercent = 0;
  function countTo(node, from, to) {
    // 웹프로그램02 의 카운트업과 같은 방식: requestAnimationFrame 으로 숫자를 올린다
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
      node.textContent = to;
      return;
    }
    const start = performance.now();
    const duration = 900;
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      node.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderSummary(s) {
    $('#ring-bar').style.strokeDashoffset = String(326.73 * (1 - s.percent / 100));
    countTo($('#percent'), shownPercent, s.percent);
    shownPercent = s.percent;
    $('.ring').setAttribute('aria-label', `전체 진행률 ${s.percent}%`);
    $('#stat-total').textContent = s.total;
    $('#stat-done').textContent = s.done;
    $('#stat-open').textContent = s.open;
    const overdue = $('#stat-overdue');
    overdue.textContent = s.overdue;
    overdue.classList.toggle('has', s.overdue > 0);

    // 각 단계의 진행 막대
    STAGES.forEach((st) => {
      const info = s.stages[st.key] || { total: 0, done: 0 };
      const bar = $(`.column[data-stage="${st.key}"] .column-progress i`);
      if (bar) bar.style.width = info.total ? `${(info.done / info.total) * 100}%` : '0';
      const count = $(`.column[data-stage="${st.key}"] .column-count`);
      if (count) count.textContent = `${info.done}/${info.total}`;
    });
  }

  /* ---------- 보드 그리기 ---------- */

  function renderCard(item, j) {
    const due = dueInfo(item);
    const checkbox = el('input', { type: 'checkbox', 'aria-label': `${item.title} 완료`, dataset: { action: 'toggle' } });
    checkbox.checked = item.done;
    return el('article', { class: `card${item.done ? ' is-done' : ''}${state.firstRender ? ' enter' : ''}`, draggable: 'true', dataset: { id: item.id }, style: `--j:${j}` },
      el('label', { class: 'check' }, checkbox, el('span', { class: 'box' })),
      el('h3', { class: 'card-title' }, item.title),
      item.memo ? el('p', { class: 'card-memo' }, item.memo) : null,
      el('div', { class: 'card-meta' },
        el('span', { class: `chip p-${item.priority}` }, `우선순위 ${PRIORITY[item.priority]}`),
        due ? el('span', { class: `chip due ${due.cls}` }, due.text) : null),
      el('div', { class: 'card-actions' },
        el('button', { type: 'button', class: 'icon-btn', dataset: { action: 'edit' }, 'aria-label': `${item.title} 수정` }, '수정'),
        el('button', { type: 'button', class: 'icon-btn danger', dataset: { action: 'delete' }, 'aria-label': `${item.title} 삭제` }, '삭제')));
  }

  function renderBoard() {
    const board = $('#board');
    board.replaceChildren(...STAGES.map((st, i) => {
      const items = state.items.filter((it) => it.stage === st.key);
      const body = el('div', { class: 'column-body', dataset: { stage: st.key } },
        items.length ? items.map((it, j) => renderCard(it, j)) : el('p', { class: 'empty' }, '이 단계에 항목이 없습니다.'));
      return el('section', { class: 'column', dataset: { stage: st.key }, style: `--i:${i}`, 'aria-label': st.name },
        el('div', { class: 'column-head' },
          el('div', { class: 'column-title' },
            el('span', { class: 'step-no' }, st.no),
            el('h2', {}, st.name),
            el('span', { class: 'column-count' }, '0/0')),
          el('p', { class: 'column-hint' }, st.hint),
          el('div', { class: 'column-progress' }, el('i'))),
        body,
        el('button', { type: 'button', class: 'column-add', dataset: { action: 'add', stage: st.key } }, '+ 이 단계에 추가'));
    }));
    state.firstRender = false;
  }

  /* ---------- 추가·수정 창 (Create / Update) ---------- */

  const editDialog = $('#edit-dialog');
  const form = $('#edit-form');

  function fillStageOptions() {
    $('#e-stage').replaceChildren(...STAGES.map((st) => el('option', { value: st.key }, `${st.no}. ${st.name}`)));
  }

  function setTitleError(show) {
    $('#e-title-error').hidden = !show;
    $('#e-title').closest('.field').classList.toggle('invalid', show);
    $('#e-title').setAttribute('aria-invalid', show ? 'true' : 'false');
  }

  function openEditor(item, stage) {
    state.editingId = item ? item.id : null;
    $('#edit-title').textContent = item ? '항목 수정' : '항목 추가';
    $('#e-title').value = item ? item.title : '';
    $('#e-stage').value = item ? item.stage : stage || 'apply';
    $('#e-priority').value = item ? item.priority : 'normal';
    $('#e-due').value = item && item.due_date ? item.due_date : '';
    $('#e-memo').value = item ? item.memo : '';
    $('#e-memo-count').textContent = $('#e-memo').value.length;
    setTitleError(false);
    editDialog.showModal();
    $('#e-title').focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = $('#e-title').value.trim();
    if (!title) { setTitleError(true); $('#e-title').focus(); return; }
    setTitleError(false);

    const body = {
      title,
      stage: $('#e-stage').value,
      priority: $('#e-priority').value,
      due_date: $('#e-due').value || null,
      memo: $('#e-memo').value.trim()
    };
    const submit = $('#edit-submit');
    submit.disabled = true;
    try {
      if (state.editingId === null) {
        await api('/api/todos', { method: 'POST', body: JSON.stringify(body) });
        toast('항목을 추가했습니다.');
      } else {
        const current = state.items.find((it) => it.id === state.editingId);
        await api(`/api/todos/${state.editingId}`, { method: 'PUT', body: JSON.stringify({ ...body, done: current ? current.done : false }) });
        toast('항목을 수정했습니다.');
      }
      editDialog.close();
      await load();
    } catch (err) {
      toast(err.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  $('#e-title').addEventListener('input', () => { if ($('#e-title').value.trim()) setTitleError(false); });
  $('#e-memo').addEventListener('input', () => { $('#e-memo-count').textContent = $('#e-memo').value.length; });
  $('#edit-cancel').addEventListener('click', () => editDialog.close());
  // 창 바깥(어두운 부분)을 누르면 닫는다
  [editDialog, $('#confirm-dialog')].forEach((dlg) => dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }));

  /* ---------- 삭제 (Delete) ---------- */

  const confirmDialog = $('#confirm-dialog');
  let deleteId = null;

  function askDelete(item) {
    deleteId = item.id;
    $('#confirm-text').textContent = `"${item.title}" 항목이 사라지며 되돌릴 수 없습니다.`;
    confirmDialog.showModal();
  }

  confirmDialog.addEventListener('close', async () => {
    if (confirmDialog.returnValue !== 'ok' || deleteId === null) { deleteId = null; return; }
    const id = deleteId;
    deleteId = null;
    try {
      await api(`/api/todos/${id}`, { method: 'DELETE' });
      toast('항목을 삭제했습니다.');
      await load();
    } catch (err) {
      toast(err.message, true);
    }
  });

  /* ---------- 보드 안의 클릭·체크·끌어놓기 ---------- */

  const board = $('#board');
  const itemOf = (node) => state.items.find((it) => it.id === Number(node.closest('.card').dataset.id));

  async function patch(id, changes, message) {
    try {
      await api(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      if (message) toast(message);
      await load();
    } catch (err) {
      toast(err.message, true);
      await load();
    }
  }

  board.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.dataset.action === 'toggle') return;
    if (button.dataset.action === 'add') return openEditor(null, button.dataset.stage);
    const item = itemOf(button);
    if (!item) return;
    if (button.dataset.action === 'edit') openEditor(item);
    if (button.dataset.action === 'delete') askDelete(item);
  });

  board.addEventListener('change', (event) => {
    if (event.target.dataset.action !== 'toggle') return;
    const item = itemOf(event.target);
    patch(item.id, { done: event.target.checked }, event.target.checked ? '완료로 표시했습니다.' : '진행 중으로 되돌렸습니다.');
  });

  // 끌어서 다른 단계로 옮기기 (HTML5 드래그 앤 드롭)
  let dragId = null;
  board.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    dragId = Number(card.dataset.id);
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(dragId));
  });
  board.addEventListener('dragend', () => {
    dragId = null;
    board.querySelectorAll('.dragging, .drop-target').forEach((n) => n.classList.remove('dragging', 'drop-target'));
  });
  board.addEventListener('dragover', (event) => {
    const column = event.target.closest('.column');
    if (!column || dragId === null) return;
    event.preventDefault();
    column.classList.add('drop-target');
  });
  board.addEventListener('dragleave', (event) => {
    const column = event.target.closest('.column');
    if (column && !column.contains(event.relatedTarget)) column.classList.remove('drop-target');
  });
  board.addEventListener('drop', (event) => {
    const column = event.target.closest('.column');
    if (!column || dragId === null) return;
    event.preventDefault();
    const item = state.items.find((it) => it.id === dragId);
    column.classList.remove('drop-target');
    if (item && item.stage !== column.dataset.stage) {
      const stage = STAGES.find((s) => s.key === column.dataset.stage);
      patch(item.id, { stage: column.dataset.stage }, `"${stage.name}" 단계로 옮겼습니다.`);
    }
  });

  /* ---------- 검색·필터 ---------- */

  let searchTimer = 0;
  $('#f-q').addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.filters.q = event.target.value.trim(); load(); }, 250);
  });
  [['#f-status', 'status'], ['#f-priority', 'priority'], ['#f-sort', 'sort']].forEach(([sel, key]) => {
    $(sel).addEventListener('change', (event) => { state.filters[key] = event.target.value; load(); });
  });
  $('#toolbar').addEventListener('submit', (event) => event.preventDefault());
  $('#btn-add').addEventListener('click', () => openEditor(null));

  /* ---------- 시작 ---------- */
  fillStageOptions();
  load();
})();
