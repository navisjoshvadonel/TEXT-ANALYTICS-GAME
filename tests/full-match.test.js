// End-to-end match test: starts a real server on a spare port with its own state file,
// plays a full game with simulated players and checks every rule. Run with: npm test
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { io } = require('socket.io-client');
const { CONNECT, HANGMAN, UNITS } = require('../questions');
const { ILLUSTRATIONS } = require('../illustrations');

const PORT = 3999, URL = `http://localhost:${PORT}`, PIN = '2468';
const STATE = path.join(os.tmpdir(), `att-test-${Date.now()}.json`);
const L = s => s.toUpperCase().replace(/[^A-Z]/g, '');
const wait = ms => new Promise(r => setTimeout(r, ms));
let failures = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { failures++; console.log('  ✗ ' + msg); } };
const section = t => console.log('\n• ' + t);

let srv;
function startServer() {
  return new Promise((resolve, reject) => {
    srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT, STATE_FILE: STATE }, stdio: ['ignore', 'pipe', 'pipe'] });
    srv.stdout.on('data', d => String(d).includes('is running') && resolve());
    srv.stderr.on('data', d => { console.error(String(d)); });
    srv.on('exit', c => c && reject(new Error('server exited ' + c)));
  });
}
const stopServer = () => new Promise(r => { srv.once('exit', r); srv.kill(); });

const emit = (s, ev, arg) => new Promise(r => s.emit(ev, arg, r));
function client() {
  const s = io(URL, { forceNew: true, transports: ['websocket'] });
  s.me = null; s.pub = null;
  s.on('me', v => (s.me = v));
  s.on('public', v => (s.pub = v));
  return new Promise(r => s.on('connect', () => r(s)));
}
const until = async (fn, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await wait(20); } return false; };

(async () => {
  // ---------- static content checks ----------
  section('Question bank & pictures');
  for (const u of Object.keys(UNITS)) {
    ok(CONNECT.filter(q => q.unit == u).length >= 3, `unit ${u} has ≥3 picture questions`);
    ok(HANGMAN.filter(q => q.unit == u).length >= 5, `unit ${u} has ≥5 hangman words`);
  }
  const answers = [...CONNECT, ...HANGMAN].map(q => L(q.answer));
  ok(new Set(answers).size === answers.length, 'no duplicate answers across rounds');
  for (const q of [...CONNECT, ...HANGMAN]) ok(/^[A-Z ]+$/.test(q.answer), `${q.id} answer only letters/spaces`);
  for (const q of CONNECT) {
    ok((ILLUSTRATIONS[q.id] || []).length === 4, `${q.id} has 4 pictures`);
    // only the words a player can actually read on the cards
    const pics = [...(ILLUSTRATIONS[q.id] || []).join(' ').matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]).join(' ').toUpperCase();
    for (const w of q.answer.split(' ').filter(w => w.length > 3)) ok(!pics.includes(w), `${q.id} pictures do not spell "${w}"`);
    for (const w of q.answer.split(' ').filter(w => w.length > 3)) ok(!q.hint.toUpperCase().includes(w), `${q.id} hint does not contain "${w}"`);
  }
  for (const q of HANGMAN) for (const w of q.answer.split(' ').filter(w => w.length > 2)) ok(!q.clue.toUpperCase().includes(w), `${q.id} clue does not contain "${w}"`);

  await startServer();
  const host = await client();
  ok((await emit(host, 'host:auth', 'nope')).ok === false, 'wrong host PIN rejected');
  const auth = await emit(host, 'host:auth', PIN);
  ok(auth.ok && /^\d{6}$/.test(auth.gamePin), 'host PIN accepted, game PIN is 6 digits');
  const GAME = auth.gamePin;

  // ---------- joining ----------
  section('Joining with game PIN');
  const probe = await client();
  ok((await emit(probe, 'pin:check', '000000')).error, 'wrong game PIN rejected');
  ok((await emit(probe, 'pin:check', GAME)).ok, 'right game PIN accepted');
  ok((await emit(probe, 'player:join', { pid: 'x1', name: 'Cheat', dept: 'CSE', section: 'A', pin: '111111' })).error, 'join without valid PIN rejected');
  ok((await emit(probe, 'player:join', { pid: 'x1', name: 'A', dept: 'CSE', section: 'A', pin: GAME })).error, 'one-letter name rejected');
  ok((await emit(probe, 'player:join', { pid: 'x1', name: 'Bob', dept: 'XYZ', section: 'A', pin: GAME })).error, 'unknown department rejected');
  ok((await emit(probe, 'player:join', { pid: 'x1', name: 'Bob', dept: 'CSE', section: 'Z', pin: GAME })).error, 'unknown section rejected');
  probe.close();

  const depts = ['CSE', 'IT', 'AIDS', 'AIML', 'ECE', 'EEE', 'BME', 'MECH', 'CIVIL'];
  const players = [];
  for (let i = 0; i < 60; i++) {
    const s = await client();
    const res = await emit(s, 'player:join', { pid: 'pid-' + i, name: 'Player ' + i, dept: depts[i % 9], section: 'ABC'[i % 3], pin: GAME });
    ok(res.ok, `player ${i} joins`);
    players.push(s);
  }
  await until(() => host.pub?.players.length === 60);
  ok(host.pub.players.length === 60, '60 players visible on projector');
  ok(!JSON.stringify(host.pub).includes('pid-'), 'projector data never exposes secret player ids');
  ok(new Set(host.pub.players.map(p => p.dept)).size === 9, 'all 9 arenas represented');

  // ---------- round 1 ----------
  section('Round 1 · Picture Connect');
  ok((await emit(host, 'host:start', 2)).error, 'cannot start Round 2 before Round 1');
  ok((await emit(host, 'host:start', 1)).ok, 'Round 1 starts');
  await until(() => players.every(p => p.me?.r1?.q));
  const p0 = players[0];
  const seen = new Set();
  ok(p0.me.r1.total === 15, 'each player gets 15 pictures');
  // order: easy first, then intermediate
  const ans = id => CONNECT.find(q => q.id === id).answer;
  const leak = v => { const q = v.r1.q; return JSON.stringify({ ...q, pics: undefined }).toUpperCase().includes(L(ans(q.id))); };
  ok(!leak(p0.me), 'question payload does not contain the answer');
  ok(p0.me.r1.q.pics.length === 4, 'question has 4 pictures');
  ok(p0.me.r1.q.words.reduce((a, b) => a + b, 0) === L(ans(p0.me.r1.q.id)).length, 'answer slots match answer length');

  // scripted player 0: test every scoring rule
  const r1Score = () => p0.me.me.score1;
  const step = async (fn, cond) => { const seq = p0.me.r1.seq, idx = p0.me.r1.idx; fn(); await until(() => p0.me.r1.seq !== seq || p0.me.r1.idx !== idx || (cond && cond())); };
  let qid = p0.me.r1.q.id; seen.add(qid);
  await step(() => p0.emit('r1:submit', ans(qid)));
  ok(r1Score() === 120, `correct first try = 120 (got ${r1Score()})`);
  qid = p0.me.r1.q.id; seen.add(qid);
  p0.emit('r1:hint'); await until(() => p0.me.r1.q.hint);
  ok(!!p0.me.r1.q.hint, 'hint text revealed');
  await step(() => p0.emit('r1:submit', ans(qid)));
  ok(r1Score() === 120 + 80, `hint + first try = 80 (total ${r1Score()})`);
  qid = p0.me.r1.q.id; seen.add(qid);
  const wrong = 'Q'.repeat(L(ans(qid)).length);
  await step(() => p0.emit('r1:submit', wrong));
  ok(p0.me.r1.last.left === 2 && p0.me.r1.q.id === qid, 'wrong answer keeps question, 2 tries left');
  await step(() => p0.emit('r1:submit', ans(qid).toLowerCase()));
  ok(r1Score() === 300, `lower-case correct answer on 2nd try = 100 (total ${r1Score()})`);
  ok(p0.me.me.streak === 3, 'streak counts 3 in a row');
  qid = p0.me.r1.q.id; seen.add(qid);
  const short = await (async () => { const seq = p0.me.r1.seq; p0.emit('r1:submit', 'AB'); await wait(150); return p0.me.r1.seq === seq; })();
  ok(short, 'answer of wrong length is ignored (no attempt used)');
  for (let i = 0; i < 3; i++) await step(() => p0.emit('r1:submit', 'Q'.repeat(L(ans(qid)).length)));
  ok(p0.me.r1.idx === 4 && r1Score() === 300 && p0.me.me.streak === 0, '3 wrong attempts → 0 points, next question, streak reset');
  qid = p0.me.r1.q.id; seen.add(qid);
  await step(() => p0.emit('r1:skip'));
  ok(p0.me.r1.idx === 5 && r1Score() === 300, 'skip → 0 points, next question');

  // pause blocks play
  ok((await emit(host, 'host:pause')).ok, 'host pauses');
  qid = p0.me.r1.q.id;
  p0.emit('r1:submit', ans(qid)); await wait(200);
  ok(r1Score() === 300 && p0.me.paused, 'answers are blocked while paused');
  ok((await emit(host, 'host:resume')).ok, 'host resumes');
  await until(() => !p0.me.paused);
  // finish player 0
  while (!p0.me.r1.done) { const id = p0.me.r1.q.id; seen.add(id); await step(() => p0.emit('r1:submit', ans(id)), () => p0.me.r1.done); }
  ok(seen.size === 15, 'player 0 saw 15 different pictures');
  const units = [...seen].map(id => CONNECT.find(q => q.id === id).unit);
  ok(Object.keys(UNITS).every(u => units.filter(x => x == u).length === 3), '3 pictures from every unit');
  ok(p0.me.me.score1 === 300 + 10 * 120, `player 0 Round 1 score = 1500 (got ${p0.me.me.score1})`);

  // everyone else plays quickly with mixed accuracy
  await Promise.all(players.slice(1).map(async (s, i) => {
    let guard = 0;
    while (s.me.r1 && !s.me.r1.done && guard++ < 60) {
      const id = s.me.r1.q.id, seq = s.me.r1.seq;
      s.emit('r1:submit', (i + guard) % 3 ? ans(id) : 'Z'.repeat(L(ans(id)).length));
      await until(() => !s.me?.r1 || s.me.r1.done || s.me.r1.seq !== seq);
    }
  }));
  ok(players.every(s => s.me.r1.done), 'all players can finish Round 1');
  await until(() => host.pub?.phase === 'r1done', 3000);
  ok(host.pub.phase === 'r1done', 'round 1 auto-ends when everyone finished');

  // ---------- round 2 ----------
  section('Round 2 · Hangman (individual)');
  const r1Totals = Object.fromEntries(players.map((s, i) => [i, s.me.me.score1]));
  ok((await emit(host, 'host:start', 2)).ok, 'Round 2 starts');
  await until(() => players.every(p => p.me?.r2?.q));
  ok(p0.me.r2.total === 25, 'each player gets 25 words');
  ok(p0.me.r2.q.answer === null && !p0.me.r2.q.pattern.some(c => /[A-Z]/.test(c)), 'word hidden at start');
  const hans = id => HANGMAN.find(q => q.id === id).answer;
  const r2seen = new Set();
  const guessWord = async (s, letters) => { for (const c of letters) { const g = s.me.r2.q.guessed.length; s.emit('r2:guess', c); await until(() => s.me.r2.q.guessed.length !== g || s.me.r2.q.status !== 'playing'); if (s.me.r2.q.status !== 'playing') break; } };
  // perfect word
  let h = p0.me.r2.q.id; r2seen.add(h);
  ok(p0.me.r2.q.pattern.filter(c => c === ' ').length === hans(h).split(' ').length - 1, 'spaces shown as gaps, not blanks');
  await guessWord(p0, [...new Set(L(hans(h)))]);
  ok(p0.me.r2.q.status === 'won' && p0.me.me.score2 === 160, `perfect word = 160 (got ${p0.me.me.score2})`);
  ok(p0.me.r2.q.answer === hans(h), 'answer revealed after solving');
  p0.emit('r2:next'); await until(() => p0.me.r2.idx === 1);
  // one wrong + hint
  h = p0.me.r2.q.id; r2seen.add(h);
  const absent = [...'ZQXJVKWYBFGP'].find(c => !L(hans(h)).includes(c));
  await guessWord(p0, [absent]);
  ok(p0.me.r2.q.wrong === 1, 'wrong letter costs a life');
  const before = p0.me.r2.q.guessed.length;
  if (p0.me.r2.q.hintable) { p0.emit('r2:hint'); await until(() => p0.me.r2.q.guessed.length > before); ok(p0.me.r2.q.hint, 'hint reveals a letter'); }
  await guessWord(p0, [...new Set(L(hans(h)))].filter(c => !p0.me.r2.q.guessed.includes(c)));
  const exp2 = 100 + 50 - (p0.me.r2.q.hint ? 20 : 0);
  ok(p0.me.me.score2 === 160 + exp2, `1 wrong${p0.me.r2.q.hint ? ' + hint' : ''} = ${exp2} (total ${p0.me.me.score2})`);
  p0.me.r2.q.guessed.includes(absent) && p0.emit('r2:guess', absent); await wait(100);
  ok(p0.me.me.score2 === 160 + exp2, 'repeat guess after solving changes nothing');
  p0.emit('r2:next'); await until(() => p0.me.r2.idx === 2);
  // lose a word
  h = p0.me.r2.q.id; r2seen.add(h);
  const misses = [...'ZQXJVKWYBFGPMHDU'].filter(c => !L(hans(h)).includes(c)).slice(0, 6);
  await guessWord(p0, misses);
  ok(p0.me.r2.q.status === 'lost' && p0.me.me.score2 === 160 + exp2, 'six wrong letters → lost, 0 points');
  ok(p0.me.r2.q.answer === hans(h), 'answer revealed after losing');
  p0.emit('r2:guess', [...L(hans(h))][0]); await wait(100);
  ok(p0.me.r2.q.status === 'lost', 'no guessing after a lost word');
  p0.emit('r2:next'); await until(() => p0.me.r2.idx === 3);
  // skip
  h = p0.me.r2.q.id; r2seen.add(h);
  p0.emit('r2:next'); await wait(150);
  ok(p0.me.r2.idx === 3, '"next" without skip does nothing while playing');
  p0.emit('r2:next', true); await until(() => p0.me.r2.idx === 4);
  ok(p0.me.r2.idx === 4, 'skip moves on');
  // finish p0
  while (!p0.me.r2.done) { h = p0.me.r2.q.id; r2seen.add(h); await guessWord(p0, [...new Set(L(hans(h)))]); const i = p0.me.r2.idx; p0.emit('r2:next'); await until(() => p0.me.r2.idx !== i || p0.me.r2.done); }
  ok(r2seen.size === 25, 'player 0 saw 25 different words');
  const r2units = [...r2seen].map(id => HANGMAN.find(q => q.id === id).unit);
  ok(Object.keys(UNITS).every(u => r2units.filter(x => x == u).length === 5), '5 words from every unit');
  ok([...r2seen].every(id => !CONNECT.some(c => L(c.answer) === L(hans(id)))), 'no Round 1 answer appears in Round 2');
  ok(p0.me.me.score1 === r1Totals[0], 'Round 1 score carried into Round 2 unchanged');

  // a player whose tab closes must not block the round from ending
  players[59].close();
  await Promise.all(players.slice(1, 59).map(async (s, i) => {
    let guard = 0;
    while (s.me.r2 && !s.me.r2.done && guard++ < 40) {
      const id = s.me.r2.q.id; const i0 = s.me.r2.idx;
      const ls = i % 2 ? [...new Set(L(hans(id)))] : [...'ZQXJVKWYBF'];
      for (const c of ls) { if (s.me.r2.q?.status !== 'playing') break; s.emit('r2:guess', c); await wait(5); }
      await until(() => s.me.r2.q?.status !== 'playing', 1000);
      s.emit('r2:next', true); await until(() => s.me.r2.idx !== i0 || s.me.r2.done);
    }
  }));
  await until(() => host.pub?.phase === 'final', 4000);
  ok(host.pub.phase === 'final', 'Round 2 auto-ends when every connected player has finished (offline player ignored)');

  // ---------- final ----------
  section('Final results');
  const ranked = host.pub.players.slice().sort((a, b) => b.total - a.total);
  ok(ranked.every(p => p.total === p.score1 + p.score2), 'total = Round 1 + Round 2 for every player');
  const csv = await (await fetch(`${URL}/api/export.csv?pin=${PIN}`)).text();
  ok(csv.trim().split('\n').length === 61, 'CSV has header + 60 rows');
  ok((await fetch(`${URL}/api/export.csv?pin=0`)).status === 403, 'CSV needs host PIN');
  ok((await emit(players[1], 'player:join', { pid: 'late', name: 'Late', dept: 'CSE', section: 'A', pin: GAME })).error, 'cannot join after the game is over');

  // ---------- persistence ----------
  section('Restart safety');
  await wait(700);
  const snapshot = JSON.stringify(ranked.map(p => [p.id, p.total]));
  players.forEach(s => s.close()); host.close();
  await stopServer(); await startServer();
  const host2 = await client(); await emit(host2, 'host:auth', PIN); await until(() => host2.pub);
  ok(host2.pub.phase === 'final', 'phase survives a server restart');
  ok(JSON.stringify(host2.pub.players.slice().sort((a, b) => b.total - a.total).map(p => [p.id, p.total])) === snapshot, 'all scores survive a server restart');
  const back = await client();
  ok((await emit(back, 'player:resume', { pid: 'pid-0' })).ok, 'player can resume after restart');
  await until(() => back.me);
  ok(back.me?.me.score1 === r1Totals[0], 'resumed player sees their score');

  // ---------- reset ----------
  section('Host reset');
  await emit(host2, 'host:reset', 'keepPlayers'); await until(() => host2.pub.phase === 'lobby');
  ok(host2.pub.players.length === 60 && host2.pub.players.every(p => p.total === 0), 'new match keeps players, zeroes scores');
  const oldPin = (await emit(host2, 'host:auth', PIN)).gamePin;
  await emit(host2, 'host:reset', 'all'); await wait(200);
  const newPin = (await emit(host2, 'host:auth', PIN)).gamePin;
  ok(host2.pub.players.length === 0 && newPin !== oldPin, 'wipe removes everyone and issues a new game PIN');

  back.close(); host2.close(); await stopServer();
  fs.rmSync(STATE, { force: true });
  console.log(`\n${failures ? '✗' : '✓'} ${passes} checks passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch(async e => { console.error(e); try { await stopServer(); } catch {} process.exit(1); });
