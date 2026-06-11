import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getDatabase, ref, push, update, remove, onValue, query, orderByChild
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// ── Firebase 초기화 ───────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDscuUnN0jysELtD0TSYat9m0tK3GpyHr4",
  authDomain: "c1ggun-todo-firebase.firebaseapp.com",
  projectId: "c1ggun-todo-firebase",
  storageBucket: "c1ggun-todo-firebase.firebasestorage.app",
  messagingSenderId: "13329124940",
  appId: "1:13329124940:web:d9110549e06e1dbfed2ee9",
  databaseURL: "https://c1ggun-todo-firebase-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app      = initializeApp(firebaseConfig);
const db       = getDatabase(app);
const todosRef = ref(db, 'todos');

// ── 상태 ──────────────────────────────────────────────────
let todos     = [];
let filter    = 'all';
let editingId = null;

// ── 유틸 ──────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 렌더링 ────────────────────────────────────────────────
function render() {
  const list    = document.getElementById('todoList');
  const summary = document.getElementById('summary');

  const visible = todos.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'done')   return t.done;
    return true;
  });

  if (visible.length === 0) {
    list.innerHTML = `
      <li class="empty-state">
        <span class="emoji">🗒️</span>
        ${filter === 'done' ? '완료된 할일이 없습니다.' : '할일이 없습니다. 추가해보세요!'}
      </li>`;
  } else {
    list.innerHTML = '';
    visible.forEach(todo => {
      const li = document.createElement('li');
      li.className  = 'todo-item';
      li.dataset.id = todo.id;

      const isEditing = editingId === todo.id;

      li.innerHTML = `
        <input type="checkbox" class="todo-check" ${todo.done ? 'checked' : ''} />
        ${isEditing
          ? `<input type="text" class="todo-edit-input" value="${escHtml(todo.text)}" />`
          : `<span class="todo-text${todo.done ? ' done' : ''}">${escHtml(todo.text)}</span>`
        }
        ${isEditing
          ? `<button class="btn-icon btn-save" title="저장">💾</button>`
          : `<button class="btn-icon btn-edit" title="수정">✏️</button>`
        }
        <button class="btn-icon btn-delete" title="삭제">🗑️</button>
      `;

      list.appendChild(li);
    });
  }

  const total = todos.length;
  const done  = todos.filter(t => t.done).length;
  summary.textContent = total ? `총 ${total}개 · 완료 ${done}개 · 미완료 ${total - done}개` : '';
}

// ── Realtime Database CRUD ────────────────────────────────
async function addTodo() {
  const input = document.getElementById('todoInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';  // await 전에 먼저 비워서 중복 호출 방지
  input.focus();
  await push(todosRef, { text, done: false, createdAt: Date.now() });
}

async function toggleTodo(id, done) {
  await update(ref(db, `todos/${id}`), { done });
}

async function saveTodo(id, text) {
  await update(ref(db, `todos/${id}`), { text });
}

async function deleteTodo(id) {
  await remove(ref(db, `todos/${id}`));
}

// ── 실시간 리스너 ─────────────────────────────────────────
const q = query(todosRef, orderByChild('createdAt'));
onValue(q, snapshot => {
  const data = snapshot.val() || {};
  todos = Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.createdAt - a.createdAt);
  render();
});

// ── 이벤트 위임 ───────────────────────────────────────────
document.getElementById('todoList').addEventListener('click', e => {
  const li = e.target.closest('.todo-item');
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.classList.contains('todo-check')) {
    toggleTodo(id, e.target.checked);
    return;
  }

  if (e.target.classList.contains('btn-edit')) {
    editingId = id;
    render();
    li.querySelector('.todo-edit-input')?.focus();
    return;
  }

  if (e.target.classList.contains('btn-save')) {
    commitEdit(li, id);
    return;
  }

  if (e.target.classList.contains('btn-delete')) {
    if (editingId === id) editingId = null;
    deleteTodo(id);
    return;
  }
});

document.getElementById('todoList').addEventListener('keydown', e => {
  const li = e.target.closest('.todo-item');
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.classList.contains('todo-edit-input')) {
    if (e.key === 'Enter')  { commitEdit(li, id); }
    if (e.key === 'Escape') { editingId = null; render(); }
  }
});

function commitEdit(li, id) {
  const input = li.querySelector('.todo-edit-input');
  const text  = input?.value.trim();
  if (text) saveTodo(id, text);
  editingId = null;
  render();
}

document.getElementById('addBtn').addEventListener('click', addTodo);
document.getElementById('todoInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.isComposing) addTodo();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    editingId = null;
    render();
  });
});
