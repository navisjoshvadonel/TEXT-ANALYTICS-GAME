// NLP QUEST — LAN multiplayer game server
// Clean architecture with authoritative server-side scoring, Girls' & Boys' dual leaderboards,
// full host control panel, and dedicated projector screen.

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const { Server } = require('socket.io');
const { UNITS, CONNECT, HANGMAN } = require('./questions');
const { ILLUSTRATIONS } = require('./illustrations');

const PORT = Number(process.env.PORT) || 3000;
const HOST_PIN = process.env.HOST_PIN || '2468';
const SAVE_FILE = path.join(__dirname, 'data', 'nlp_quest_state.json');
const MAX_WRONG = 6;
const R1_MAX_ATTEMPTS = 3;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 20000
});

// ---------- Helpers ----------
const letters = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
const shuffle = a => {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const byId = (bank, id) => bank.find(q => q.id === id);
const now = () => Date.now();

function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) out.push(n.address);
    }
  }
  return out;
}

// Selects questions maintaining equal unit distribution (e.g. 3 per unit for R1, 5 per unit for R2)
function pickPerUnit(bank, perUnit, exclude = new Set()) {
  const ids = [];
  for (const u of Object.keys(UNITS)) {
    const pool = shuffle(bank.filter(q => q.unit == u && !exclude.has(letters(q.answer))));
    ids.push(...pool.slice(0, perUnit).map(q => q.id));
  }
  return ids;
}

// Shuffled difficulty-based ordering for teams
function teamOrder(bank, ids) {
  const qs = ids.map(id => byId(bank, id)).filter(Boolean);
  return [
    ...shuffle(qs.filter(q => q.difficulty === 'easy')),
    ...shuffle(qs.filter(q => q.difficulty !== 'easy'))
  ].map(q => q.id);
}

// ---------- Initial State ----------
function freshState(keep) {
  return {
    phase: 'lobby', // lobby | r1 | r1done | r2 | final
    paused: false,
    endsAt: null,
    remainingMs: null,
    roundStartedAt: null,
    config: keep?.config || {
      r1Minutes: 10,
      r2Minutes: 15,
      r1PerUnit: 3,
      r2PerUnit: 5,
    },
    r1Ids: [],
    r2Ids: [],
    teams: {},
    players: {},
    feed: [] // recent scoring activity
  };
}

let S = freshState();

// Preset starter teams
const PRESET_TEAMS = [
  { id: 'team-alpha', name: 'Team Alpha', category: 'girls' },
  { id: 'team-luna',  name: 'Team Luna',  category: 'girls' },
  { id: 'team-iris',  name: 'Team Iris',  category: 'girls' },
  { id: 'team-bloom', name: 'Team Bloom', category: 'girls' },
  { id: 'team-echo',  name: 'Team Echo',  category: 'girls' },
  { id: 'team-nova',   name: 'Team Nova',   category: 'boys' },
  { id: 'team-orbit',  name: 'Team Orbit',  category: 'boys' },
  { id: 'team-pixel',  name: 'Team Pixel',  category: 'boys' },
  { id: 'team-spark',  name: 'Team Spark',  category: 'boys' },
  { id: 'team-vertex', name: 'Team Vertex', category: 'boys' },
];

function seedPresetTeams() {
  PRESET_TEAMS.forEach(p => {
    if (!S.teams[p.id]) {
      S.teams[p.id] = createTeam(p.name, p.category, p.id);
    }
  });
}

function loadSavedState() {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      S = Object.assign(freshState(), data);
      console.log(`Loaded state with ${Object.keys(S.teams).length} teams.`);
    } else {
      seedPresetTeams();
    }
  } catch (e) {
    console.warn('Could not load saved state, seeding presets:', e.message);
    seedPresetTeams();
  }
}
loadSavedState();

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(SAVE_FILE), { recursive: true });
      fs.writeFile(SAVE_FILE, JSON.stringify(S), () => {});
    } catch (e) {
      console.error('Save error:', e);
    }
  }, 300);
}

function createTeam(name, category = 'girls', customId = null) {
  const cleanCat = category.toLowerCase() === 'boys' ? 'boys' : 'girls';
  const id = customId || 't_' + Math.random().toString(36).slice(2, 9);
  return {
    id,
    name: String(name || 'Team').trim().slice(0, 28),
    category: cleanCat,
    score1: 0,
    score2: 0,
    lastGain: 0,
    lastGainAt: 0,
    r1: null,
    r2: null,
    createdAt: now()
  };
}

function initRound1(team) {
  team.r1 = {
    order: teamOrder(CONNECT, S.r1Ids),
    idx: 0,
    attempts: 0,
    hint: false,
    solved: 0,
    done: false,
    last: null,
    seq: 0
  };
}

function initRound2(team) {
  team.r2 = {
    order: teamOrder(HANGMAN, S.r2Ids),
    idx: 0,
    guessed: [],
    wrong: 0,
    hint: false,
    status: 'playing', // playing | won | lost
    solved: 0,
    done: false,
    last: null,
    seq: 0
  };
}

const isRunning = () => (S.phase === 'r1' || S.phase === 'r2') && !S.paused && S.endsAt && now() < S.endsAt;

function addPoints(team, round, pts, label) {
  if (round === 1) team.score1 += pts;
  else team.score2 += pts;

  if (pts > 0) {
    team.lastGain = pts;
    team.lastGainAt = now();
    S.feed.unshift({
      t: now(),
      team: team.name,
      category: team.category,
      pts,
      label
    });
    S.feed = S.feed.slice(0, 16);
  }
}

// ---------- Public / Projector View ----------
function publicView() {
  const allTeams = Object.values(S.teams).map(t => {
    const players = Object.values(S.players).filter(p => p.teamId === t.id);
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      score1: t.score1,
      score2: t.score2,
      total: t.score1 + t.score2,
      lastGain: t.lastGain,
      lastGainAt: t.lastGainAt,
      online: players.filter(p => p.online).length,
      members: players.map(p => ({ name: p.name, role: p.role, online: p.online })),
      r1: t.r1 ? { idx: t.r1.idx, solved: t.r1.solved, done: t.r1.done, total: t.r1.order.length } : null,
      r2: t.r2 ? { idx: t.r2.idx, solved: t.r2.solved, done: t.r2.done, total: t.r2.order.length } : null,
    };
  });

  const sortDesc = (a, b) => (b.total - a.total) || (b.score1 - a.score1) || a.name.localeCompare(b.name);

  const girlsRanked = allTeams.filter(t => t.category === 'girls').sort(sortDesc);
  const boysRanked = allTeams.filter(t => t.category === 'boys').sort(sortDesc);
  const overallRanked = allTeams.slice().sort(sortDesc);

  // Overall statistics
  const totalQuestionsSolved = allTeams.reduce((sum, t) => {
    return sum + (t.r1?.solved || 0) + (t.r2?.solved || 0);
  }, 0);

  let roundProgressPercent = 0;
  if (S.phase === 'r1') {
    const totalPossible = allTeams.length * (S.r1Ids.length || 15);
    const solvedNow = allTeams.reduce((sum, t) => sum + (t.r1?.idx || 0), 0);
    roundProgressPercent = totalPossible > 0 ? Math.min(100, Math.round((solvedNow / totalPossible) * 100)) : 0;
  } else if (S.phase === 'r2') {
    const totalPossible = allTeams.length * (S.r2Ids.length || 25);
    const solvedNow = allTeams.reduce((sum, t) => sum + (t.r2?.idx || 0), 0);
    roundProgressPercent = totalPossible > 0 ? Math.min(100, Math.round((solvedNow / totalPossible) * 100)) : 0;
  } else if (S.phase === 'r1done' || S.phase === 'final') {
    roundProgressPercent = 100;
  }

  return {
    phase: S.phase,
    paused: S.paused,
    endsAt: S.endsAt,
    remainingMs: S.remainingMs,
    serverNow: now(),
    config: S.config,
    teams: allTeams,
    girlsTop5: girlsRanked.slice(0, 5),
    boysTop5: boysRanked.slice(0, 5),
    overallTop10: overallRanked.slice(0, 10),
    activeTeamsCount: allTeams.filter(t => t.online > 0).length,
    totalTeamsCount: allTeams.length,
    questionsSolvedCount: totalQuestionsSolved,
    roundProgress: roundProgressPercent,
    feed: S.feed,
    units: UNITS
  };
}

// ---------- Team View ----------
function teamView(team) {
  const players = Object.values(S.players).filter(p => p.teamId === team.id);
  const base = {
    phase: S.phase,
    paused: S.paused,
    endsAt: S.endsAt,
    remainingMs: S.remainingMs,
    serverNow: now(),
    team: {
      id: team.id,
      name: team.name,
      category: team.category,
      score1: team.score1,
      score2: team.score2,
      total: team.score1 + team.score2
    },
    members: players.map(p => ({ name: p.name, role: p.role, online: p.online }))
  };

  // Round 1 payload
  if (S.phase === 'r1' && team.r1) {
    const r = team.r1;
    const q = byId(CONNECT, r.order[r.idx]);
    base.r1 = {
      idx: r.idx,
      total: r.order.length,
      done: r.done,
      solved: r.solved,
      last: r.last,
      seq: r.seq,
      q: q && !r.done ? {
        id: q.id,
        unit: q.unit,
        unitName: UNITS[q.unit],
        topic: q.topic,
        tag: q.tag,
        difficulty: q.difficulty,
        illustrations: ILLUSTRATIONS[q.id] || [],
        pictureIdea: q.pictureIdea,
        words: q.answer.split(' ').map(w => w.length),
        attempts: r.attempts,
        maxAttempts: R1_MAX_ATTEMPTS,
        hint: r.hint ? q.hint : null
      } : null
    };
  }

  // Round 2 payload
  if (S.phase === 'r2' && team.r2) {
    const r = team.r2;
    const q = byId(HANGMAN, r.order[r.idx]);
    const show = r.status !== 'playing';
    base.r2 = {
      idx: r.idx,
      total: r.order.length,
      done: r.done,
      solved: r.solved,
      last: r.last,
      seq: r.seq,
      q: q && !r.done ? {
        id: q.id,
        unit: q.unit,
        unitName: UNITS[q.unit],
        clue: q.clue,
        difficulty: q.difficulty,
        pattern: [...q.answer].map(c => c === ' ' ? ' ' : (show || r.guessed.includes(c)) ? c : '_'),
        guessed: r.guessed,
        wrong: r.wrong,
        maxWrong: MAX_WRONG,
        hint: r.hint,
        status: r.status,
        answer: show ? q.answer : null
      } : null
    };
  }

  return base;
}

let pubTimer = null;
function broadcast(teamIds) {
  const ids = teamIds || Object.keys(S.teams);
  for (const id of ids) {
    if (S.teams[id]) {
      io.to('team:' + id).emit('team', teamView(S.teams[id]));
    }
  }
  if (!pubTimer) {
    pubTimer = setTimeout(() => {
      pubTimer = null;
      io.to('public').emit('public', publicView());
    }, 100);
  }
  save();
}

// ---------- Round Control ----------
function startRound(n) {
  const mins = n === 1 ? S.config.r1Minutes : S.config.r2Minutes;
  if (n === 1) {
    S.r1Ids = pickPerUnit(CONNECT, S.config.r1PerUnit);
    Object.values(S.teams).forEach(initRound1);
  } else {
    // Exclude any Round 1 answers from Hangman pool
    const used = new Set(S.r1Ids.map(id => letters(byId(CONNECT, id).answer)));
    CONNECT.forEach(q => used.add(letters(q.answer)));
    S.r2Ids = pickPerUnit(HANGMAN, S.config.r2PerUnit, used);
    Object.values(S.teams).forEach(initRound2);
  }

  S.phase = n === 1 ? 'r1' : 'r2';
  S.paused = false;
  S.remainingMs = null;
  S.roundStartedAt = now();
  S.endsAt = now() + mins * 60000;
  S.feed.unshift({
    t: now(),
    team: 'NLP QUEST ARENA',
    category: '',
    pts: 0,
    label: n === 1 ? 'Round 1 (Picture Connect) Started!' : 'Round 2 (Hangman) Started!'
  });
  broadcast();
}

function endRound() {
  if (S.phase === 'r1') S.phase = 'r1done';
  else if (S.phase === 'r2') S.phase = 'final';
  S.endsAt = null;
  S.paused = false;
  S.remainingMs = null;
  broadcast();
}

// Heartbeat check for timer and auto-round-end
setInterval(() => {
  if ((S.phase === 'r1' || S.phase === 'r2') && !S.paused && S.endsAt && now() >= S.endsAt) {
    endRound();
  } else if (
    (S.phase === 'r1' || S.phase === 'r2') &&
    Object.values(S.teams).length > 0 &&
    Object.values(S.teams).every(t => (S.phase === 'r1' ? t.r1 : t.r2)?.done)
  ) {
    endRound();
  }
}, 1000);

// ---------- Gameplay Actions ----------
function r1Submit(team, guess) {
  const r = team.r1;
  if (!r || r.done) return;
  const q = byId(CONNECT, r.order[r.idx]);
  if (!q) return;

  const ok = letters(guess) === letters(q.answer);
  r.attempts++;

  if (ok) {
    // Scoring: without hint +100, with hint +60, first attempt +20
    const pts = (r.hint ? 60 : 100) + (r.attempts === 1 ? 20 : 0);
    addPoints(team, 1, pts, q.answer);
    r.solved++;
    r.last = { ok: true, answer: q.answer, pts, firstTry: r.attempts === 1 };
    r1Next(team);
  } else if (r.attempts >= R1_MAX_ATTEMPTS) {
    r.last = { ok: false, out: true, answer: q.answer, pts: 0 };
    r1Next(team);
  } else {
    r.last = { ok: false, pts: 0, left: R1_MAX_ATTEMPTS - r.attempts };
  }
  r.seq++;
}

function r1Next(team) {
  const r = team.r1;
  r.idx++;
  r.attempts = 0;
  r.hint = false;
  if (r.idx >= r.order.length) r.done = true;
}

function r2Guess(team, ch) {
  const r = team.r2;
  if (!r || r.done || r.status !== 'playing') return;
  ch = letters(ch).slice(0, 1);
  if (!ch || r.guessed.includes(ch)) return;

  const q = byId(HANGMAN, r.order[r.idx]);
  if (!q) return;

  r.guessed.push(ch);
  const need = new Set(letters(q.answer));

  if (!need.has(ch)) {
    r.wrong++;
  }

  // Check victory
  if ([...need].every(c => r.guessed.includes(c))) {
    // Scoring: +100 for word, +10 for each unused incorrect attempt, -20 if hint used
    const pts = Math.max(0, 100 + 10 * (MAX_WRONG - r.wrong) - (r.hint ? 20 : 0));
    addPoints(team, 2, pts, q.answer);
    r.solved++;
    r.status = 'won';
    r.last = { ok: true, answer: q.answer, pts, unusedTries: MAX_WRONG - r.wrong };
    r.seq++;
  } else if (r.wrong >= MAX_WRONG) {
    r.status = 'lost';
    r.last = { ok: false, answer: q.answer, pts: 0 };
    r.seq++;
  }
}

function r2Hint(team) {
  const r = team.r2;
  if (!r || r.done || r.status !== 'playing' || r.hint) return;
  const q = byId(HANGMAN, r.order[r.idx]);
  if (!q) return;

  const missing = [...new Set(letters(q.answer))].filter(c => !r.guessed.includes(c));
  if (missing.length <= 1) return; // hint shouldn't completely finish word

  r.hint = true;
  // Reveal one unrevealed letter
  const revealChar = missing[Math.floor(Math.random() * missing.length)];
  r.guessed.push(revealChar);
}

function r2Next(team, skip) {
  const r = team.r2;
  if (!r || r.done) return;
  if (r.status === 'playing' && !skip) return;

  if (r.status === 'playing') {
    r.last = { ok: false, answer: byId(HANGMAN, r.order[r.idx]).answer, pts: 0, skipped: true };
    r.seq++;
  }

  r.idx++;
  r.guessed = [];
  r.wrong = 0;
  r.hint = false;
  r.status = 'playing';
  if (r.idx >= r.order.length) r.done = true;
}

// ---------- Socket IO Events ----------
io.on('connection', socket => {
  let player = null;
  let isHost = false;

  socket.on('public:join', () => {
    socket.join('public');
    socket.emit('public', publicView());
  });

  // Player joins with team selection / creation
  socket.on('player:join', ({ pid, name, teamId, newTeamName, category, role }, ack) => {
    name = String(name || '').trim().slice(0, 24);
    if (!pid || !name) return ack?.({ error: 'Please enter your name.' });
    if (S.phase === 'final') return ack?.({ error: 'The match has already concluded.' });

    let tid = teamId;
    if (newTeamName) {
      // Create new team
      const t = createTeam(newTeamName, category || 'girls');
      S.teams[t.id] = t;
      tid = t.id;
      if (S.phase === 'r1' || S.phase === 'r1done') initRound1(t);
      if (S.phase === 'r2') initRound2(t);
    }

    if (!tid || !S.teams[tid]) {
      return ack?.({ error: 'Please select or create a team.' });
    }

    S.players[pid] = {
      pid,
      name,
      teamId: tid,
      role: role || 'Member',
      online: true
    };

    bindPlayer(pid);
    ack?.({ ok: true, teamId: tid, teamName: S.teams[tid].name });
    broadcast([tid]);
  });

  socket.on('player:resume', ({ pid }, ack) => {
    if (!S.players[pid] || !S.teams[S.players[pid].teamId]) {
      return ack?.({ error: 'Session expired' });
    }
    S.players[pid].online = true;
    bindPlayer(pid);
    ack?.({
      ok: true,
      name: S.players[pid].name,
      team: S.teams[S.players[pid].teamId]
    });
    broadcast([player.teamId]);
  });

  function bindPlayer(pid) {
    player = S.players[pid];
    socket.data.pid = pid;
    socket.rooms.forEach(r => r.startsWith('team:') && socket.leave(r));
    socket.join('team:' + player.teamId);
    socket.emit('team', teamView(S.teams[player.teamId]));
  }

  const act = fn => (arg) => {
    if (!player || !isRunning()) return;
    const team = S.teams[player.teamId];
    if (!team) return;
    fn(team, arg);
    broadcast([team.id]);
  };

  socket.on('r1:submit', act((t, g) => S.phase === 'r1' && r1Submit(t, String(g || ''))));
  socket.on('r1:hint', act(t => { if (S.phase === 'r1' && t.r1 && !t.r1.done) t.r1.hint = true; }));
  socket.on('r1:skip', act(t => {
    if (S.phase === 'r1' && t.r1 && !t.r1.done) {
      const q = byId(CONNECT, t.r1.order[t.r1.idx]);
      t.r1.last = { ok: false, skipped: true, answer: q.answer, pts: 0 };
      t.r1.seq++;
      r1Next(t);
    }
  }));

  socket.on('r2:guess', act((t, c) => S.phase === 'r2' && r2Guess(t, String(c || ''))));
  socket.on('r2:hint', act(t => S.phase === 'r2' && r2Hint(t)));
  socket.on('r2:next', act((t, skip) => S.phase === 'r2' && r2Next(t, !!skip)));

  socket.on('player:leave', () => {
    if (!player) return;
    const tid = player.teamId;
    delete S.players[player.pid];
    player = null;
    socket.rooms.forEach(r => r.startsWith('team:') && socket.leave(r));
    broadcast([tid]);
  });

  // ---------- Host Actions ----------
  socket.on('host:auth', (pin, ack) => {
    isHost = String(pin) === HOST_PIN;
    if (isHost) {
      socket.join('public');
      socket.emit('public', publicView());
    }
    ack?.({ ok: isHost });
  });

  const host = fn => (arg, ack) => {
    if (!isHost) return ack?.({ error: 'Unauthorized: invalid host credentials' });
    const res = fn(arg);
    broadcast();
    ack?.(res || { ok: true });
  };

  socket.on('host:start', host(n => startRound(n === 2 ? 2 : 1)));
  socket.on('host:end', host(() => endRound()));
  socket.on('host:pause', host(() => {
    if (!isRunning()) return { error: 'No active round is currently running.' };
    S.paused = true;
    S.remainingMs = S.endsAt - now();
    S.endsAt = null;
  }));
  socket.on('host:resume', host(() => {
    if (!S.paused) return { error: 'Round is not paused.' };
    S.paused = false;
    S.endsAt = now() + (S.remainingMs || 0);
    S.remainingMs = null;
  }));
  socket.on('host:addTime', host(mins => {
    const ms = (Number(mins) || 1) * 60000;
    if (S.paused) S.remainingMs = (S.remainingMs || 0) + ms;
    else if (S.endsAt) S.endsAt += ms;
  }));
  socket.on('host:addTeam', host(({ name, category }) => {
    if (!name) return { error: 'Team name is required.' };
    const t = createTeam(name, category || 'girls');
    S.teams[t.id] = t;
    if (S.phase === 'r1' || S.phase === 'r1done') initRound1(t);
    if (S.phase === 'r2') initRound2(t);
  }));
  socket.on('host:toggleCategory', host(teamId => {
    const t = S.teams[teamId];
    if (!t) return { error: 'Team not found' };
    t.category = t.category === 'girls' ? 'boys' : 'girls';
  }));
  socket.on('host:seedPresets', host(() => {
    seedPresetTeams();
  }));
  socket.on('host:adjust', host(({ teamId, delta, reason }) => {
    const t = S.teams[teamId];
    if (!t) return { error: 'Team not found' };
    const d = Math.round(Number(delta) || 0);
    if (S.phase === 'r2' || S.phase === 'final') t.score2 += d;
    else t.score1 += d;
    if (d > 0) {
      t.lastGain = d;
      t.lastGainAt = now();
      S.feed.unshift({
        t: now(),
        team: t.name,
        category: t.category,
        pts: d,
        label: reason || 'Host Bonus'
      });
      S.feed = S.feed.slice(0, 16);
    }
  }));
  socket.on('host:removeTeam', host(teamId => {
    delete S.teams[teamId];
    for (const [pid, p] of Object.entries(S.players)) {
      if (p.teamId === teamId) delete S.players[pid];
    }
    io.to('team:' + teamId).emit('kicked');
  }));
  socket.on('host:reset', host(mode => {
    const keepTeams = mode === 'keepTeams' ? S.teams : null;
    const players = mode === 'keepTeams' ? S.players : {};
    S = freshState(S);
    if (keepTeams) {
      for (const t of Object.values(keepTeams)) {
        S.teams[t.id] = createTeam(t.name, t.category, t.id);
      }
      S.players = players;
    } else {
      seedPresetTeams();
      io.emit('kicked');
    }
  }));

  socket.on('disconnect', () => {
    if (player && S.players[player.pid]) {
      const pid = player.pid;
      setTimeout(() => {
        const stillConnected = [...io.sockets.sockets.values()].some(s => s.connected && s.data.pid === pid);
        if (!stillConnected && S.players[pid]) {
          S.players[pid].online = false;
          broadcast([S.players[pid].teamId]);
        }
      }, 50);
    }
  });
});

// ---------- HTTP Routes ----------
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/info', async (req, res) => {
  const ips = lanAddresses();
  const url = `http://${ips[0] || 'localhost'}:${PORT}/`;
  res.json({
    url,
    ips,
    qr: await QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      color: { dark: '#242936', light: '#00000000' }
    })
  });
});

app.get('/api/questions', (req, res) => {
  res.json({ units: UNITS, connect: CONNECT, hangman: HANGMAN });
});

app.get('/api/export.csv', (req, res) => {
  if (req.query.pin !== HOST_PIN) return res.status(403).send('Forbidden: invalid PIN');
  const rows = Object.values(S.teams).sort((a, b) => (b.score1 + b.score2) - (a.score1 + a.score2));
  const csv = [
    'Rank,Team,Category,Round 1 (Picture Connect),Round 2 (Hangman),Total Points,R1 Solved,R2 Solved,Members'
  ].concat(
    rows.map((t, i) => [
      i + 1,
      `"${t.name.replace(/"/g, '""')}"`,
      t.category.toUpperCase(),
      t.score1,
      t.score2,
      t.score1 + t.score2,
      t.r1?.solved || 0,
      t.r2?.solved || 0,
      `"${Object.values(S.players).filter(p => p.teamId === t.id).map(p => p.name.replace(/"/g, "'")).join('; ')}"`
    ].join(','))
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="nlp-quest-leaderboard.csv"');
  res.send(csv);
});

// Redirects & shortcuts
app.get('/projector', (req, res) => res.sendFile(path.join(__dirname, 'public', 'projector.html')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n======================================================');
  console.log('  🎮 NLP QUEST — INTERACTIVE LEARNING ARENA IS LIVE');
  console.log('======================================================');
  console.log(`  🖥️  Main Projector  : http://localhost:${PORT}/projector.html`);
  console.log(`  🎛️  Host Dashboard  : http://localhost:${PORT}/host.html  (PIN: ${HOST_PIN})`);
  for (const ip of lanAddresses()) {
    console.log(`  📱  Student Play    : http://${ip}:${PORT}/`);
  }
  console.log('======================================================\n');
});
