// ============================================================
//  STATE
// ============================================================
const state = {
  mode: 'work',
  durations: { work: 25, short: 5, long: 15 },
  totalSeconds: 25 * 60,
  remaining: 25 * 60,
  running: false,
  interval: null,
  sessions: 4,       // completed pomodoros (out of 4 = long break cycle)
  completedPomos: 3, // dots display
  soundOn: true,
};

const kanjiNums = ['零','一','二','三','四','五','六','七','八','九'];

// ============================================================
//  AUDIO (Web Audio API — no external files needed)
// ============================================================
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep(freq = 440, type = 'square', duration = 0.15, vol = 0.12) {
  if (!state.soundOn) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function chime() {
  setTimeout(() => beep(392, 'square', 0.1, 0.15), 0);
  setTimeout(() => beep(523, 'square', 0.1, 0.15), 100);
  setTimeout(() => beep(659, 'square', 0.1, 0.15), 200);
  setTimeout(() => beep(784, 'square', 0.1, 0.15), 300);
  setTimeout(() => beep(1046, 'square', 0.3, 0.15), 400);
}

function tickSound() {
  beep(220, 'square', 0.04, 0.04);
}

// ============================================================
//  TIMER LOGIC
// ============================================================
function setMode(btn) {
  if (state.running) return;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.mode = btn.dataset.mode;
  const mins = state.durations[state.mode];
  state.totalSeconds = mins * 60;
  state.remaining = state.totalSeconds;
  renderTimer();
  renderProgress();
  beep(330, 'square', 0.08);
}

function toggleTimer() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  state.running ? pauseTimer() : startTimer();
}

function startTimer() {
  state.running = true;
  document.getElementById('startBtn').style.backgroundImage = "url('assets/btn-pause.png')";
  document.getElementById('startBtn').classList.add('paused');
  document.getElementById('timerDisplay').classList.add('running');
  beep(440, 'square', 0.1);

  state.interval = setInterval(() => {
    state.remaining--;
    if (state.remaining % 60 === 0) tickSound();
    renderTimer();
    renderProgress();
    if (state.remaining <= 0) onComplete();
  }, 1000);
}

function pauseTimer() {
  state.running = false;
  clearInterval(state.interval);
  document.getElementById('startBtn').style.backgroundImage = "url('assets/btn-start.png')";
  document.getElementById('startBtn').classList.remove('paused');
  document.getElementById('timerDisplay').classList.remove('running');
  beep(330, 'square', 0.08);
}

function resetTimer() {
  pauseTimer();
  state.remaining = state.totalSeconds;
  renderTimer();
  renderProgress();
  beep(220, 'square', 0.1);
}

function onComplete() {
  pauseTimer();
  chime();

  if (state.mode === 'work') {
    state.completedPomos = Math.min(state.completedPomos + 1, 4);
    state.sessions++;
    renderDots();
    renderSessionCount();
    showToast('focus complete');
    // auto-suggest break
    setTimeout(() => {
      const next = state.completedPomos >= 4 ? 'long' : 'short';
      const nextBtn = document.querySelector(`[data-mode="${next}"]`);
      if (nextBtn) setMode(nextBtn);
      if (state.completedPomos >= 4) state.completedPomos = 0;
    }, 2000);
  } else {
    showToast('rest done');
    setTimeout(() => {
      const workBtn = document.querySelector('[data-mode="work"]');
      if (workBtn) setMode(workBtn);
    }, 2000);
  }
}

// ============================================================
//  RENDER
// ============================================================
function renderTimer() {
  const m = Math.floor(state.remaining / 60).toString().padStart(2, '0');
  const s = (state.remaining % 60).toString().padStart(2, '0');
  document.getElementById('timerDisplay').textContent = `${m}:${s}`;
}

function renderProgress() {
  const pct = ((state.totalSeconds - state.remaining) / state.totalSeconds) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
}

function renderDots() {
  const dots = document.getElementById('pomoDots');
  dots.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'pomo-dot' + (i < state.completedPomos ? ' done' : '');
    dots.appendChild(d);
  }
}

function renderSessionCount() {
  document.getElementById('sessionNum').textContent = state.sessions;
  const k = kanjiNums[Math.min(state.sessions, kanjiNums.length - 1)];
  document.getElementById('sessionKanji').textContent = k;
}

// ============================================================
//  SETTINGS
// ============================================================
function toggleSettings() {
  const drawer = document.getElementById('settingsDrawer');
  drawer.classList.toggle('open');
  beep(330, 'square', 0.06);
}

function applySettings() {
  state.durations.work  = parseInt(document.getElementById('setWork').value)  || 25;
  state.durations.short = parseInt(document.getElementById('setShort').value) || 5;
  state.durations.long  = parseInt(document.getElementById('setLong').value)  || 15;

  
  const activeBtn = document.querySelector('.mode-btn.active');
  if (activeBtn) {
    activeBtn.dataset.minutes = state.durations[state.mode];
    state.totalSeconds = state.durations[state.mode] * 60;
    state.remaining    = state.totalSeconds;
    renderTimer();
    renderProgress();
  }

  toggleSettings();
  showToast('settings saved');
  beep(440, 'square', 0.1);
}


const tasks = [];

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ text, done: false, id: Date.now() });
  input.value = '';
  renderTasks();
  beep(392, 'square', 0.06);
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; beep(t.done ? 523 : 392, 'square', 0.06); }
  renderTasks();
}

function deleteTask(id) {
  const i = tasks.findIndex(t => t.id === id);
  if (i !== -1) tasks.splice(i, 1);
  renderTasks();
  beep(220, 'square', 0.06);
}

function renderTasks() {
  const list = document.getElementById('taskList');
  const empty = document.getElementById('taskEmpty');

  if (tasks.length === 0) {
    list.innerHTML = '';
    list.appendChild(empty);
    return;
  }

  list.innerHTML = '';
  tasks.forEach(t => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.done ? ' done' : '');
    item.innerHTML = `
      <div class="task-check"></div>
      <div class="task-text">${escHtml(t.text)}</div>
      <button class="task-del" onclick="event.stopPropagation(); deleteTask(${t.id})">×</button>
    `;
    item.addEventListener('click', () => toggleTask(t.id));
    list.appendChild(item);
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function toggleSound() {
  state.soundOn = !state.soundOn;
  const btn = document.getElementById('soundBtn');
  btn.textContent = state.soundOn ? '♪ ON' : '♪ OFF';
  btn.classList.toggle('muted', !state.soundOn);
}


function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}


renderDots();
renderSessionCount();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/POMObyte/sw.js');
}
