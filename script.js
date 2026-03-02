// ── STATE ──
const STORAGE_KEY = 'taskflow_tasks_v1';
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let filter = 'all';
let searchTerm = '';

// ── DOM REFS ──
const taskListEl   = document.getElementById('task-list');
const taskInput    = document.getElementById('task-input');
const searchInput  = document.getElementById('search-input');
const prioritySel  = document.getElementById('priority-sel');
const addBtn       = document.getElementById('add-btn');
const totalCount   = document.getElementById('total-count');
const doneCount    = document.getElementById('done-count');
const pendingCount = document.getElementById('pending-count');
const progressFill = document.getElementById('progress-fill');
const progressPct  = document.getElementById('progress-pct');
const filterBtns   = document.querySelectorAll('.filter-btn');
const themeToggle  = document.getElementById('theme-toggle');

// ── HELPERS ──
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'acum';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}z ago`;
}

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── STATS ──
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total ? Math.round(done / total * 100) : 0;

  totalCount.textContent    = total;
  doneCount.textContent     = done;
  pendingCount.textContent  = pending;
  progressFill.style.width  = pct + '%';
  progressPct.textContent   = pct + '%';
}

// ── RENDER ──
function render() {
  updateStats();

  const filtered = tasks.filter(t => {
    // Filtrare după search
    if (searchTerm && !t.text.toLowerCase().includes(searchTerm)) return false;
    // Filtrare după tab
    if (filter === 'all')    return true;
    if (filter === 'active') return !t.done;
    if (filter === 'done')   return t.done;
    return t.priority === filter;
  });

  taskListEl.innerHTML = '';

  if (filtered.length === 0) {
    taskListEl.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📋</div>
        <h3>Nicio sarcină</h3>
        <p>Adaugă prima ta sarcină mai sus.</p>
      </div>`;
    return;
  }

  filtered.forEach(t => {
    const item = document.createElement('div');
    item.className = `task-item p-${t.priority}${t.done ? ' done' : ''}`;
    item.dataset.id = t.id;

    const badgeClass = { high: 'badge-high', med: 'badge-med', low: 'badge-low' }[t.priority];
    const badgeLabel = { high: 'Înaltă', med: 'Medie', low: 'Scăzută' }[t.priority];

    item.innerHTML = `
      <label class="check-wrap">
        <input type="checkbox" ${t.done ? 'checked' : ''}>
        <span class="checkmark"></span>
      </label>
      <span class="task-text" data-id="${t.id}">${escHtml(t.text)}</span>
      <span class="priority-badge ${badgeClass}">${badgeLabel}</span>
      <span class="task-meta">${timeAgo(t.created)}</span>
      <button class="edit-btn" title="Editează">✏️</button>
      <button class="del-btn" title="Șterge">✕</button>
    `;

    item.querySelector('input[type=checkbox]').addEventListener('change', () => toggleDone(t.id));
    item.querySelector('.del-btn').addEventListener('click', () => deleteTask(t.id));
    item.querySelector('.edit-btn').addEventListener('click', () => editTask(t.id));

    taskListEl.appendChild(item);
  });
}

// ── ACTIONS ──
function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    taskInput.style.borderColor = 'var(--accent2)';
    setTimeout(() => taskInput.style.borderColor = '', 800);
    return;
  }
  tasks.unshift({
    id: genId(),
    text,
    priority: prioritySel.value,
    done: false,
    created: Date.now()
  });
  taskInput.value = '';
  taskInput.focus();
  save();
  render();
}

function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); render(); }
}

function deleteTask(id) {
  const el = taskListEl.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.style.transition = 'opacity 0.25s, transform 0.25s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    }, 250);
  }
}

function editTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;

  const item = taskListEl.querySelector(`[data-id="${id}"]`);
  const textSpan = item.querySelector('.task-text');
  const oldText = t.text;

  // Înlocuiește textul cu un input inline
  textSpan.innerHTML = `<input class="inline-edit" type="text" value="${escHtml(oldText)}" maxlength="200">`;
  const input = textSpan.querySelector('.inline-edit');
  input.focus();
  input.select();

  function commitEdit() {
    const newText = input.value.trim();
    if (newText && newText !== oldText) {
      t.text = newText;
      save();
    }
    render();
  }

  input.addEventListener('blur', commitEdit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { t.text = oldText; render(); }
  });
}

// ── EVENTS ──
addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

searchInput.addEventListener('input', e => {
  searchTerm = e.target.value.toLowerCase();
  render();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

document.getElementById('mark-all-done').addEventListener('click', () => {
  tasks.forEach(t => t.done = true);
  save(); render();
});

document.getElementById('clear-done').addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  save(); render();
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  themeToggle.textContent = isLight ? '🌙 Mod Dark' : '☀️ Mod Light';
});

// ── SEED DATA (first run) ──
if (tasks.length === 0) {
  tasks = [
    { id: genId(), text: 'Revizuiește documentele proiectului', priority: 'high', done: false, created: Date.now() - 3600000 * 2 },
    { id: genId(), text: 'Trimite raportul săptămânal echipei', priority: 'med', done: false, created: Date.now() - 3600000 * 5 },
    { id: genId(), text: 'Actualizează dependențele npm', priority: 'low', done: true, created: Date.now() - 86400000 },
    { id: genId(), text: 'Planifică ședința de sprint', priority: 'high', done: false, created: Date.now() - 1800000 },
    { id: genId(), text: 'Backup baza de date', priority: 'med', done: true, created: Date.now() - 86400000 * 2 },
  ];
  save();
}

render();