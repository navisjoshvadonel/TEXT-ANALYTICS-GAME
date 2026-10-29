// Shared helpers: sound (WebAudio, no files), toast, timer, escaping.
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const Sound = {
  muted: localStorage.getItem('att-muted') === '1',
  ctx: null,
  tone(freq, dur = .12, type = 'sine', vol = .08, delay = 0) {
    if (this.muted) return;
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + .02);
    } catch {}
  },
  click() { this.tone(520, .05, 'triangle', .05); },
  good() { [523, 659, 784].forEach((f, i) => this.tone(f, .18, 'sine', .07, i * .08)); },
  bad() { this.tone(220, .18, 'triangle', .06); this.tone(185, .22, 'triangle', .05, .1); },
  jingle() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .3, 'sine', .06, i * .13)); },
  toggle(btn) { this.muted = !this.muted; localStorage.setItem('att-muted', this.muted ? '1' : '0'); this.paint(btn); },
  paint(btn) { if (btn) { btn.textContent = this.muted ? '🔇' : '🔊'; btn.setAttribute('aria-label', this.muted ? 'Unmute' : 'Mute'); } },
};

function toast(msg, ms = 2200) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}

// Server clock offset so every screen shows the same countdown.
let clockOffset = 0;
function syncClock(view) { if (view.serverNow) clockOffset = view.serverNow - Date.now(); }
function remainingMs(view) {
  if (view.paused) return view.remainingMs || 0;
  if (!view.endsAt) return null;
  return Math.max(0, view.endsAt - (Date.now() + clockOffset));
}
const fmt = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

// Arena (department) identity — icon + colour, consistent on every screen.
const ARENA_ICONS = { CSE: '💻', IT: '🌐', AIDS: '🤖', AIML: '🧠', ECE: '📡', EEE: '⚡', BME: '🫀', MECH: '⚙️', CIVIL: '🏗️', CSBS: '📊', CHEM: '⚗️', BIOTECH: '🧬' };
const ARENA_COLORS = ['#5778D4', '#3f9c7e', '#e07a6b', '#c98a12', '#8b6fd6', '#2f9bb3', '#d46fa5', '#e08a3c', '#5d6b85'];
function arenaMeta(dept, depts) {
  const i = Math.max(0, (depts || []).indexOf(dept));
  let h = 0; for (const c of dept || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { icon: ARENA_ICONS[dept] || '🎯', color: ARENA_COLORS[(depts && depts.includes(dept) ? i : h) % ARENA_COLORS.length] };
}
const AVATAR_COLORS = ['#5778D4', '#3f9c7e', '#e07a6b', '#c98a12', '#8b6fd6', '#2f9bb3', '#d46fa5', '#e08a3c'];
function initials(name) { const w = String(name || '?').trim().split(/\s+/); return ((w[0]?.[0] || '?') + (w[1]?.[0] || '')).toUpperCase(); }
function avatar(name, cls = '') {
  let h = 0; for (const c of String(name)) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return `<span class="ava ${cls}" style="--ac:${AVATAR_COLORS[h % AVATAR_COLORS.length]}" aria-hidden="true">${esc(initials(name))}</span>`;
}
// Smoothly count a number up/down inside an element.
function countTo(el, to) {
  const from = Number(el.dataset.v ?? to); el.dataset.v = to;
  if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
  const t0 = performance.now(), d = 600;
  const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
