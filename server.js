// ANALYSIS THE TEXTS — LAN multiplayer game server.
// Every player plays individually inside their department "arena" (CSE Arena, AIDS Arena …).
// All scoring happens here; clients only send intents (guess, submit, hint).
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const { UNITS, CONNECT, HANGMAN } = require('./questions');
const { ILLUSTRATIONS } = require('./illustrations');

const PORT = Number(process.env.PORT) || 3000;
const HOST_PIN = process.env.HOST_PIN || '2468';
const SAVE_FILE = process.env.STATE_FILE || path.join(__dirname, 'data', 'state.json');
const MAX_WRONG = 6;
const R1_MAX_ATTEMPTS = 3;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000 });

// ---------- helpers ----------
const letters = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const byId = (bank, id) => bank.find(q => q.id === id);
const now = () => Date.now();
const rid = () => Math.random().toString(36).slice(2, 10);

// Picture cards carry small captions ("DENDROGRAM", "REGRESSION LINE"…) that give answers away — strip them.
const PICS = Object.fromEntries(Object.entries(ILLUSTRATIONS).map(([id, cards]) =>
  [id, cards.map(svg => svg.replace(/<text\b[^>]*y="130"[^>]*>[\s\S]*?<\/text>/g, ''))]));

// Real Wi-Fi/Ethernet first; virtual adapters (VirtualBox, VMware, Hyper-V, WSL, Docker) last.
function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces()))
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254.')) {
      const virtual = /virtual|vbox|vmware|vethernet|hyper-v|wsl|docker|loopback|bluetooth|tailscale|zerotier/i.test(name) || n.address.startsWith('192.168.56.');
      out.push({ ip: n.address, score: virtual ? 1 : /wi-?fi|wlan|ethernet|eth|end/i.test(name) ? 3 : 2 });
    }
  return out.sort((a, b) => b.score - a.score).map(x => x.ip);
}

function pickPerUnit(bank, perUnit, exclude = new Set()) {
  const ids = [];
  for (const u of Object.keys(UNITS)) {
    const pool = shuffle(bank.filter(q => q.unit == u && !exclude.has(letters(q.answer))));
    ids.push(...pool.slice(0, perUnit).map(q => q.id));
  }
  return ids;
}

// Easy → intermediate, shuffled within each difficulty, per player (so neighbours see different questions).
function playerOrder(bank, ids) {
  const qs = ids.map(id => byId(bank, id));
  return [...shuffle(qs.filter(q => q.difficulty === 'easy')), ...shuffle(qs.filter(q => q.difficulty !== 'easy'))].map(q => q.id);
}

// ---------- state ----------
function freshState(keep) {
  return {
    phase: 'lobby',               // lobby | r1 | r1done | r2 | final
    paused: false,
    endsAt: null,                 // ms timestamp while running
    remainingMs: null,            // while paused
    config: keep?.config || {
      r1Minutes: 10, r2Minutes: 15, r1PerUnit: 3, r2PerUnit: 5,
      depts: ['CSE', 'IT', 'AIDS', 'AIML', 'ECE', 'EEE', 'BME', 'MECH', 'CIVIL'],
      sections: ['A', 'B', 'C'],
    },
    r1Ids: [], r2Ids: [],
    players: {},                  // pid (secret, kept by the browser) -> player
    feed: [],                     // recent scoring events for the ticker
    gamePin: keep?.gamePin || newGamePin(), // Kahoot-style code players type to join
  };
}

let S = freshState();
try { if (fs.existsSync(SAVE_FILE)) S = Object.assign(freshState(), JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'))); } catch (e) { console.warn('Could not load saved state:', e.message); }
if (!S.players || S.teams) { S.players = S.players || {}; delete S.teams; }
for (const p of Object.values(S.players)) p.online = false;
if (!S.gamePin) S.gamePin = newGamePin();
function newGamePin() { return String(100000 + Math.floor(Math.random() * 900000)); }
const isLocal = addr => /^(::1|127\.|::ffff:127\.)/.test(addr || '');

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(SAVE_FILE), { recursive: true });
    fs.writeFile(SAVE_FILE, JSON.stringify(S), () => {});
  }, 400);
}

function newPlayer(pid, name, dept, section) {
  return { pid, id: rid(), name, dept, section, online: true, joinedAt: now(),
    score1: 0, score2: 0, lastGain: 0, lastGainAt: 0, streak: 0, best: 0, r1: null, r2: null };
}
function initRound1(p) {
  p.r1 = { order: playerOrder(CONNECT, S.r1Ids), idx: 0, attempts: 0, hint: false, solved: 0, done: false, last: null, seq: 0, res: [] };
}
function initRound2(p) {
  p.r2 = { order: playerOrder(HANGMAN, S.r2Ids), idx: 0, guessed: [], wrong: 0, hint: false, status: 'playing', solved: 0, done: false, last: null, seq: 0, res: [] };
}
const label = p => p.section ? `${p.dept} · ${p.section}` : p.dept;
const running = () => (S.phase === 'r1' || S.phase === 'r2') && !S.paused && S.endsAt && now() < S.endsAt;

function addPoints(p, round, pts, what) {
  if (round === 1) p.score1 += pts; else p.score2 += pts;
  if (pts > 0) {
    p.lastGain = pts; p.lastGainAt = now();
    p.streak++; p.best = Math.max(p.best, p.streak);
    S.feed.unshift({ t: now(), name: p.name, dept: p.dept, pts, label: what, streak: p.streak });
    S.feed = S.feed.slice(0, 14);
  }
}
const breakStreak = p => { p.streak = 0; };

// ---------- views ----------
function publicPlayer(p) {
  return { id: p.id, name: p.name, dept: p.dept, section: p.section, online: p.online,
    score1: p.score1, score2: p.score2, total: p.score1 + p.score2, lastGain: p.lastGain, lastGainAt: p.lastGainAt, streak: p.streak,
    r1: p.r1 ? { idx: p.r1.idx, solved: p.r1.solved, done: p.r1.done, total: p.r1.order.length } : null,
    r2: p.r2 ? { idx: p.r2.idx, solved: p.r2.solved, done: p.r2.done, total: p.r2.order.length } : null };
}
function publicView() {
  return {
    phase: S.phase, paused: S.paused, endsAt: S.endsAt, remainingMs: S.remainingMs, serverNow: now(),
    config: { depts: S.config.depts, sections: S.config.sections, r1Minutes: S.config.r1Minutes, r2Minutes: S.config.r2Minutes },
    players: Object.values(S.players).map(publicPlayer), feed: S.feed,
  };
}

function playerView(p) {
  const base = { phase: S.phase, paused: S.paused, endsAt: S.endsAt, remainingMs: S.remainingMs, serverNow: now(),
    me: { id: p.id, name: p.name, dept: p.dept, section: p.section, label: label(p), score1: p.score1, score2: p.score2, streak: p.streak, best: p.best } };
  if (S.phase === 'r1' && p.r1) {
    const r = p.r1, q = byId(CONNECT, r.order[r.idx]);
    base.r1 = { idx: r.idx, total: r.order.length, done: r.done, solved: r.solved, last: r.last, seq: r.seq, res: r.res || [],
      q: q && !r.done ? { id: q.id, unit: q.unit, unitName: UNITS[q.unit], tag: q.tag, pics: PICS[q.id] || [], difficulty: q.difficulty,
        words: q.answer.split(' ').map(w => w.length), attempts: r.attempts, maxAttempts: R1_MAX_ATTEMPTS,
        hint: r.hint ? q.hint : null } : null };
  }
  if (S.phase === 'r2' && p.r2) {
    const r = p.r2, q = byId(HANGMAN, r.order[r.idx]);
    const show = r.status !== 'playing';
    base.r2 = { idx: r.idx, total: r.order.length, done: r.done, solved: r.solved, last: r.last, seq: r.seq, res: r.res || [],
      q: q && !r.done ? { id: q.id, unit: q.unit, unitName: UNITS[q.unit], clue: q.clue, difficulty: q.difficulty,
        pattern: [...q.answer].map(c => c === ' ' ? ' ' : (show || r.guessed.includes(c)) ? c : '_'),
        guessed: r.guessed, wrong: r.wrong, maxWrong: MAX_WRONG, hint: r.hint, status: r.status,
        hintable: !r.hint && r.status === 'playing' && new Set(letters(q.answer).split('').filter(c => !r.guessed.includes(c))).size > 1,
        answer: show ? q.answer : null } : null };
  }
  return base;
}

let pubTimer = null;
function broadcast(pids) {
  for (const pid of pids || Object.keys(S.players)) if (S.players[pid]) io.to('p:' + pid).emit('me', playerView(S.players[pid]));
  if (!pubTimer) pubTimer = setTimeout(() => { pubTimer = null; io.to('public').emit('public', publicView()); }, 120);
  save();
}

// ---------- round control ----------
function startRound(n) {
  const mins = n === 1 ? S.config.r1Minutes : S.config.r2Minutes;
  if (n === 1) {
    S.r1Ids = pickPerUnit(CONNECT, S.config.r1PerUnit);
    Object.values(S.players).forEach(initRound1);
  } else {
    const used = new Set(CONNECT.map(q => letters(q.answer))); // never reuse any picture answer
    S.r2Ids = pickPerUnit(HANGMAN, S.config.r2PerUnit, used);
    Object.values(S.players).forEach(p => { initRound2(p); p.streak = 0; });
  }
  S.phase = n === 1 ? 'r1' : 'r2';
  S.paused = false; S.remainingMs = null;
  S.endsAt = now() + mins * 60000;
  S.feed.unshift({ t: now(), sys: true, label: n === 1 ? 'Round 1 · Picture Connect started' : 'Round 2 · Hangman started' });
  broadcast();
}

function endRound() {
  if (S.phase === 'r1') S.phase = 'r1done';
  else if (S.phase === 'r2') S.phase = 'final';
  S.endsAt = null; S.paused = false; S.remainingMs = null;
  broadcast();
}

setInterval(() => {
  if (!(S.phase === 'r1' || S.phase === 'r2') || S.paused) return;
  // End early once everyone still connected has finished (a closed laptop must not block the round).
  const ps = Object.values(S.players).filter(p => p.online);
  if (S.endsAt && now() >= S.endsAt) endRound();
  else if (ps.length && ps.every(p => (S.phase === 'r1' ? p.r1 : p.r2)?.done)) endRound();
}, 1000);

// ---------- gameplay ----------
function r1Submit(p, guess) {
  const r = p.r1; if (!r || r.done) return;
  const q = byId(CONNECT, r.order[r.idx]);
  if (letters(guess).length !== letters(q.answer).length) return;
  r.attempts++;
  if (letters(guess) === letters(q.answer)) {
    const pts = (r.hint ? 60 : 100) + (r.attempts === 1 ? 20 : 0);
    addPoints(p, 1, pts, r.attempts === 1 ? 'Picture solved · first try' : 'Picture solved');
    r.solved++; r.res.push(1);
    r.last = { ok: true, answer: q.answer, pts, firstTry: r.attempts === 1 };
    r1Next(p);
  } else if (r.attempts >= R1_MAX_ATTEMPTS) {
    breakStreak(p); r.res.push(0);
    r.last = { ok: false, out: true, answer: q.answer, pts: 0 };
    r1Next(p);
  } else {
    r.last = { ok: false, pts: 0, left: R1_MAX_ATTEMPTS - r.attempts };
  }
  r.seq++;
}
function r1Next(p) {
  const r = p.r1;
  r.idx++; r.attempts = 0; r.hint = false;
  if (r.idx >= r.order.length) r.done = true;
}

function r2Guess(p, ch) {
  const r = p.r2; if (!r || r.done || r.status !== 'playing') return;
  ch = letters(ch).slice(0, 1); if (!ch || r.guessed.includes(ch)) return;
  const q = byId(HANGMAN, r.order[r.idx]);
  r.guessed.push(ch);
  const need = new Set(letters(q.answer));
  if (!need.has(ch)) r.wrong++;
  if ([...need].every(c => r.guessed.includes(c))) {
    const pts = Math.max(0, 100 + 10 * (MAX_WRONG - r.wrong) - (r.hint ? 20 : 0));
    addPoints(p, 2, pts, `Word solved · ${MAX_WRONG - r.wrong} ${MAX_WRONG - r.wrong === 1 ? 'life' : 'lives'} left`);
    r.solved++; r.status = 'won'; r.res.push(1);
    r.last = { ok: true, answer: q.answer, pts }; r.seq++;
  } else if (r.wrong >= MAX_WRONG) {
    breakStreak(p);
    r.status = 'lost'; r.res.push(0);
    r.last = { ok: false, answer: q.answer, pts: 0 }; r.seq++;
  }
}
function r2Hint(p) {
  const r = p.r2; if (!r || r.done || r.status !== 'playing' || r.hint) return;
  const q = byId(HANGMAN, r.order[r.idx]);
  const missing = [...new Set(letters(q.answer))].filter(c => !r.guessed.includes(c));
  if (missing.length <= 1) return; // a hint can't finish the word
  r.hint = true;
  r.guessed.push(missing[Math.floor(Math.random() * missing.length)]);
}
function r2Next(p, skip) {
  const r = p.r2; if (!r || r.done) return;
  if (r.status === 'playing' && !skip) return;
  if (r.status === 'playing') { breakStreak(p); r.res.push(0); r.last = { ok: false, answer: byId(HANGMAN, r.order[r.idx]).answer, pts: 0, skipped: true }; r.seq++; }
  r.idx++; r.guessed = []; r.wrong = 0; r.hint = false; r.status = 'playing';
  if (r.idx >= r.order.length) r.done = true;
}

// ---------- sockets ----------
io.on('connection', socket => {
  let me = null, isHost = false;

  let pinTries = 0;
  socket.on('public:join', () => { socket.join('public'); socket.emit('public', publicView()); });

  // Step 1 of joining: check the game PIN shown on the projector.
  socket.on('pin:check', (pin, ack) => {
    if (++pinTries > 20) return ack?.({ error: 'Too many tries — ask the host.' });
    const ok = String(pin || '').replace(/\D/g, '') === S.gamePin;
    ack?.(ok ? { ok: true } : { error: 'That PIN is not right. Check the projector.' });
  });

  socket.on('player:join', ({ pid, name, dept, section, pin }, ack) => {
    if (String(pin || '').replace(/\D/g, '') !== S.gamePin && !S.players[pid]) return ack?.({ error: 'Game PIN expired — enter the new PIN.', badPin: true });
    name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
    dept = String(dept || '').toUpperCase(); section = String(section || '').toUpperCase();
    if (!pid || typeof pid !== 'string' || pid.length > 64) return ack?.({ error: 'Reload the page and try again.' });
    if (name.length < 2) return ack?.({ error: 'Enter your name (at least 2 letters).' });
    if (!S.config.depts.includes(dept)) return ack?.({ error: 'Choose your department arena.' });
    if (S.config.sections.length && !S.config.sections.includes(section)) return ack?.({ error: 'Choose your section.' });
    if (S.phase === 'final') return ack?.({ error: 'The game has finished.' });
    const old = S.players[pid];
    const p = old ? Object.assign(old, { name, dept, section, online: true }) : newPlayer(pid, name, dept, section);
    S.players[pid] = p;
    if (!p.r1 && (S.phase === 'r1' || S.phase === 'r1done')) initRound1(p);
    if (!p.r2 && S.phase === 'r2') initRound2(p);
    bind(pid);
    ack?.({ ok: true, arena: dept });
    broadcast([pid]);
  });

  socket.on('player:resume', ({ pid }, ack) => {
    if (!S.players[pid]) return ack?.({ error: 'unknown' });
    S.players[pid].online = true;
    bind(pid);
    ack?.({ ok: true });
    broadcast([pid]);
  });

  function bind(pid) {
    me = S.players[pid];
    socket.data.pid = pid;
    socket.rooms.forEach(r => r.startsWith('p:') && socket.leave(r));
    socket.join('p:' + pid);
    socket.emit('me', playerView(me));
  }

  const act = fn => arg => {
    if (!me || !S.players[me.pid] || !running()) return;
    fn(me, arg);
    broadcast([me.pid]);
  };
  socket.on('r1:submit', act((p, g) => S.phase === 'r1' && r1Submit(p, String(g || ''))));
  socket.on('r1:hint', act(p => { if (S.phase === 'r1' && p.r1 && !p.r1.done) p.r1.hint = true; }));
  socket.on('r1:skip', act(p => { if (S.phase === 'r1' && p.r1 && !p.r1.done) { breakStreak(p); const q = byId(CONNECT, p.r1.order[p.r1.idx]); p.r1.last = { ok: false, skipped: true, answer: q.answer, pts: 0 }; p.r1.seq++; p.r1.res.push(0); r1Next(p); } }));
  socket.on('r2:guess', act((p, c) => S.phase === 'r2' && r2Guess(p, String(c || ''))));
  socket.on('r2:hint', act(p => S.phase === 'r2' && r2Hint(p)));
  socket.on('r2:next', act((p, skip) => S.phase === 'r2' && r2Next(p, !!skip)));

  socket.on('player:leave', () => {
    if (!me) return;
    if (S.phase === 'lobby') delete S.players[me.pid]; else me.online = false;
    socket.leave('p:' + me.pid); me = null; socket.data.pid = null;
    broadcast([]);
  });

  // ---- host ----
  socket.on('host:auth', (pin, ack) => {
    isHost = String(pin) === HOST_PIN;
    if (isHost) { socket.join('public'); socket.emit('public', publicView()); }
    ack?.({ ok: isHost, gamePin: isHost ? S.gamePin : undefined });
  });
  // The projector runs on the host laptop itself, so it may read the PIN without unlocking the dock.
  socket.on('host:pin', ack => ack?.(isHost || isLocal(socket.handshake.address) ? { gamePin: S.gamePin } : {}));
  socket.on('host:newPin', (_, ack) => {
    if (!isHost) return ack?.({ error: 'Not authorised' });
    S.gamePin = newGamePin(); save();
    io.to('public').emit('pinChanged');
    ack?.({ ok: true, gamePin: S.gamePin });
  });
  const host = fn => (arg, ack) => { if (!isHost) return ack?.({ error: 'Not authorised' }); const r = fn(arg); broadcast(); ack?.(r || { ok: true }); };
  socket.on('host:start', host(n => {
    if (n === 2 && S.phase !== 'r1done') return { error: 'Finish Round 1 first' };
    if (n !== 2 && S.phase !== 'lobby') return { error: 'Round 1 already started' };
    startRound(n === 2 ? 2 : 1);
  }));
  socket.on('host:end', host(() => endRound()));
  socket.on('host:pause', host(() => {
    if (!running()) return { error: 'Nothing running' };
    S.paused = true; S.remainingMs = S.endsAt - now(); S.endsAt = null;
  }));
  socket.on('host:resume', host(() => {
    if (!S.paused) return { error: 'Not paused' };
    S.paused = false; S.endsAt = now() + S.remainingMs; S.remainingMs = null;
  }));
  socket.on('host:addTime', host(mins => {
    const ms = (Number(mins) || 1) * 60000;
    if (S.paused) S.remainingMs += ms; else if (S.endsAt) S.endsAt += ms;
  }));
  socket.on('host:config', host(c => {
    const list = s => String(s || '').toUpperCase().split(',').map(x => x.trim()).filter(Boolean);
    if (c.depts && list(c.depts).length) S.config.depts = list(c.depts);
    if (c.sections !== undefined) S.config.sections = list(c.sections);
    if (c.r1Minutes) S.config.r1Minutes = Math.max(1, Math.min(60, Number(c.r1Minutes)));
    if (c.r2Minutes) S.config.r2Minutes = Math.max(1, Math.min(60, Number(c.r2Minutes)));
  }));
  const findPub = id => Object.values(S.players).find(p => p.id === id);
  socket.on('host:adjust', host(({ id, delta }) => {
    const p = findPub(id); if (!p) return { error: 'No such player' };
    const d = Math.round(Number(delta) || 0);
    if (S.phase === 'r2' || S.phase === 'final') p.score2 += d; else p.score1 += d;
    if (d > 0) { p.lastGain = d; p.lastGainAt = now(); }
  }));
  socket.on('host:remove', host(id => {
    const p = findPub(id); if (!p) return { error: 'No such player' };
    delete S.players[p.pid];
    io.to('p:' + p.pid).emit('kicked');
  }));
  socket.on('host:reset', host(mode => {
    const keep = mode === 'keepPlayers' ? Object.values(S.players) : [];
    S = freshState(keep.length ? S : { config: S.config }); // wiping everything also issues a new game PIN
    io.to('public').emit('pinChanged');
    for (const p of keep) S.players[p.pid] = Object.assign(newPlayer(p.pid, p.name, p.dept, p.section), { id: p.id, online: p.online });
    if (!keep.length) io.emit('kicked');
  }));

  socket.on('disconnect', () => {
    const pid = socket.data.pid;
    if (!pid || !S.players[pid]) return;
    setTimeout(() => {
      const still = [...io.sockets.sockets.values()].some(s => s.connected && s.data.pid === pid);
      if (!still && S.players[pid]) { S.players[pid].online = false; broadcast([]); }
    }, 50);
  });
});

// ---------- http ----------
app.use(express.static(path.join(__dirname, 'public')));
app.get(['/host', '/projector'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/api/info', (req, res) => {
  const ips = lanAddresses();
  res.json({ url: `http://${ips[0] || 'localhost'}:${PORT}`, ips: ips.map(ip => `${ip}:${PORT}`) });
});
app.get('/api/export.csv', (req, res) => {
  if (req.query.pin !== HOST_PIN) return res.status(403).send('Forbidden');
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const rows = Object.values(S.players).sort((a, b) => (b.score1 + b.score2) - (a.score1 + a.score2));
  const csv = ['Rank,Name,Department,Section,Round 1,Round 2,Total,R1 Solved,R2 Solved,Best Streak']
    .concat(rows.map((p, i) => [i + 1, q(p.name), p.dept, p.section || '', p.score1, p.score2, p.score1 + p.score2,
      p.r1?.solved || 0, p.r2?.solved || 0, p.best].join(',')))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="analysis-the-texts-results.csv"');
  res.send(csv);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  ANALYSIS THE TEXTS is running\n');
  console.log(`  Host + projector : http://localhost:${PORT}/host   (press H for controls, PIN ${HOST_PIN})`);
  for (const ip of lanAddresses()) console.log(`  Players join     : http://${ip}:${PORT}/`);
  console.log('');
});
