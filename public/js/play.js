const socket = io();
const pid = localStorage.getItem('att-pid') || (() => { const id = 'p' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('att-pid', id); return id; })();
let joined = localStorage.getItem('att-joined') === '1';
let pub = null, view = null;
let r1 = { qid: null, draft: [], seq: null };
let r2 = { qid: null, seq: null, revealed: new Set() };
const pick = { dept: localStorage.getItem('att-dept') || '', section: localStorage.getItem('att-sec') || '' };

Sound.paint($('#mute'));
$('#mute').onclick = () => Sound.toggle($('#mute'));

function show(id) {
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('hidden', v.id !== id);
  $('#hud').classList.toggle('hidden', id === 'v-join' || id === 'v-pin');
}

// ---------- connection ----------
socket.on('connect', () => {
  socket.emit('public:join');
  if (joined) socket.emit('player:resume', { pid }, res => { if (res?.error) { joined = false; localStorage.removeItem('att-joined'); startJoin(); } });
  else startJoin();
});
socket.on('public', p => {
  const first = !pub; pub = p; syncClock(p);
  if (first || $('#arenaGrid').children.length !== p.config.depts.length || $('#secRow').children.length !== p.config.sections.length) buildJoin();
  if (view) { renderHud(); if (view.phase === 'lobby') renderLobby(); if (document.querySelector('#v-result:not(.hidden)')) renderResult(); }
});
socket.on('kicked', () => { joined = false; localStorage.removeItem('att-joined'); view = null; setPin(''); startJoin(); toast('The host reset the game — enter the new PIN.'); });
socket.on('pinChanged', () => { if (!joined) { setPin(''); startJoin(); } });

// ---------- game PIN ----------
let gamePin = sessionStorage.getItem('att-gpin') || '';
function setPin(p) { gamePin = p; p ? sessionStorage.setItem('att-gpin', p) : sessionStorage.removeItem('att-gpin'); }
function startJoin() { show(gamePin ? 'v-join' : 'v-pin'); if (!gamePin) setTimeout(() => $('#pinInput').focus(), 50); }
$('#pinInput').oninput = e => { e.target.value = e.target.value.replace(/D/g, '').slice(0, 6); };
$('#pinForm').onsubmit = e => {
  e.preventDefault(); Sound.click();
  const p = $('#pinInput').value;
  socket.emit('pin:check', p, res => {
    if (res?.ok) { $('#pinErr').textContent = ''; setPin(p); Sound.good(); startJoin(); return; }
    $('#pinErr').textContent = res?.error || 'Wrong PIN'; Sound.bad();
    const c = $('#pinForm'); c.classList.remove('no'); void c.offsetWidth; c.classList.add('no');
  });
};

// ---------- join ----------
function buildJoin() {
  const depts = pub.config.depts;
  $('#arenaGrid').innerHTML = depts.map(d => {
    const m = arenaMeta(d, depts);
    return `<button type="button" class="arena-tile" role="radio" aria-checked="${pick.dept === d}" data-d="${esc(d)}" style="--ac:${m.color}"><span class="ai">${m.icon}</span><b>${esc(d)}</b><small>ARENA</small></button>`;
  }).join('');
  const secs = pub.config.sections;
  $('#secStep').classList.toggle('hidden', !secs.length); $('#secRow').classList.toggle('hidden', !secs.length);
  if (!secs.includes(pick.section)) pick.section = '';
  $('#secRow').innerHTML = secs.map(s => `<button type="button" class="sec-chip" role="radio" aria-checked="${pick.section === s}" data-s="${esc(s)}">${esc(s)}</button>`).join('');
  if (!depts.includes(pick.dept)) pick.dept = '';
  $('#jName').value ||= localStorage.getItem('att-name') || '';
  paintCard();
}
$('#arenaGrid').onclick = e => { const b = e.target.closest('.arena-tile'); if (!b) return; Sound.click(); pick.dept = b.dataset.d; for (const t of $('#arenaGrid').children) t.setAttribute('aria-checked', t === b); paintCard(); };
$('#secRow').onclick = e => { const b = e.target.closest('.sec-chip'); if (!b) return; Sound.click(); pick.section = b.dataset.s; for (const t of $('#secRow').children) t.setAttribute('aria-checked', t === b); paintCard(); };
$('#jName').oninput = paintCard;
function paintCard() {
  const name = $('#jName').value.trim();
  $('#pcName').textContent = name || 'Your name';
  $('#pcAva').textContent = name ? initials(name) : '?';
  const m = pick.dept ? arenaMeta(pick.dept, pub?.config.depts) : null;
  $('#pcArena').textContent = pick.dept ? `${m.icon} ${pick.dept} ARENA${pick.section ? ' · Section ' + pick.section : ''}` : 'Choose an arena';
  $('#pc').style.setProperty('--ac', m ? m.color : '#5778D4');
  const needSec = pub?.config.sections.length;
  $('#enterBtn').disabled = !(name.length >= 2 && pick.dept && (!needSec || pick.section));
}
$('#joinForm').onsubmit = e => {
  e.preventDefault(); Sound.click();
  const data = { pid, name: $('#jName').value, dept: pick.dept, section: pick.section, pin: gamePin };
  $('#enterBtn').disabled = true;
  socket.emit('player:join', data, res => {
    paintCard();
    if (res?.badPin) { setPin(''); toast(res.error); return startJoin(); }
    if (res?.error) return $('#jErr').textContent = res.error;
    $('#jErr').textContent = ''; joined = true;
    localStorage.setItem('att-joined', '1'); localStorage.setItem('att-name', data.name.trim());
    localStorage.setItem('att-dept', data.dept); localStorage.setItem('att-sec', data.section);
    splash(data.dept);
  });
};
function splash(dept) {
  const m = arenaMeta(dept, pub?.config.depts), el = $('#splash');
  el.style.setProperty('--ac', m.color);
  el.innerHTML = `<div><div class="si">${m.icon}</div><div class="st">WELCOME TO THE</div><div class="sn">${esc(dept)} ARENA</div><div class="ss">Get ready, ${esc($('#jName').value.trim())}!</div></div>`;
  el.classList.remove('hidden'); Sound.jingle();
  setTimeout(() => el.classList.add('hidden'), 1900);
}
$('#leave').onclick = () => { socket.emit('player:leave'); joined = false; localStorage.removeItem('att-joined'); view = null; startJoin(); };

// ---------- my state ----------
socket.on('me', v => {
  const prevPhase = view?.phase;
  view = v; syncClock(v);
  $('#paused').classList.toggle('hidden', !v.paused);
  $('#roundLabel').textContent = { lobby: `${v.me.dept} ARENA · LOBBY`, r1: 'ROUND 01 · PICTURE CONNECT', r1done: 'ROUND 1 COMPLETE', r2: 'ROUND 02 · HANGMAN', final: 'FINAL RESULTS' }[v.phase];
  if (prevPhase && prevPhase !== v.phase) Sound.jingle();
  renderHud();
  if (v.phase === 'lobby') return renderLobby();
  if (v.phase === 'r1' && v.r1 && !v.r1.done) return renderR1();
  if (v.phase === 'r2' && v.r2 && !v.r2.done) return renderR2();
  renderResult();
});

function ranks() {
  if (!pub || !view) return {};
  const all = pub.players, me = all.find(p => p.id === view.me.id); if (!me) return {};
  const arena = all.filter(p => p.dept === me.dept);
  const by = k => (a, b) => b[k] - a[k];
  const pos = (list, k) => list.filter(p => p[k] > me[k]).length + 1;
  return { arena: pos(arena, view.phase === 'r1' || view.phase === 'r1done' ? 'score1' : 'total'), arenaN: arena.length,
    overall: pos(all, 'total'), overallN: all.length, me, sorted: all.slice().sort(by('total')) };
}

let lastScore = null;
function renderHud() {
  const total = view.me.score1 + view.me.score2;
  countTo($('#hudScore'), total);
  if (lastScore !== null && total > lastScore) {
    const g = $('#gainPop'); g.textContent = '+' + (total - lastScore); g.classList.remove('hidden');
    g.style.animation = 'none'; void g.offsetWidth; g.style.animation = '';
  }
  lastScore = total;
  $('#hudStreak').classList.toggle('hidden', view.me.streak < 2);
  $('#hudStreakN').textContent = view.me.streak;
  const r = ranks();
  const inR1 = view.phase === 'r1' || view.phase === 'r1done' || view.phase === 'lobby';
  $('#hudRank').textContent = r.arena ? (inR1 ? `#${r.arena} in ${view.me.dept}` : `#${r.overall} overall`) : '#–';
}

function renderLobby() {
  show('v-lobby');
  const m = arenaMeta(view.me.dept, pub?.config.depts);
  $('#lArena').style.setProperty('--ac', m.color);
  $('#lArena').innerHTML = `<div class="ai">${m.icon}</div><b>${esc(view.me.dept)} ARENA</b><small>YOU'RE IN!</small>`;
  $('#lMe').innerHTML = `${avatar(view.me.name, 'lg')}<b>${esc(view.me.name)}</b><span class="pill">${esc(view.me.label)}</span>`;
  const mates = (pub?.players || []).filter(p => p.dept === view.me.dept);
  $('#lMatesTitle').textContent = `${mates.length} PLAYER${mates.length === 1 ? '' : 'S'} IN ${view.me.dept} ARENA`;
  $('#lMates').innerHTML = mates.map(p => `<span class="mate ${p.id === view.me.id ? 'me' : ''}">${avatar(p.name, 'sm')}${esc(p.name)}</span>`).join('');
}

function renderResult() {
  show('v-result');
  const v = view, r = ranks(), ph = v.phase;
  const roundDone = (ph === 'r1' && v.r1?.done) || (ph === 'r2' && v.r2?.done);
  const medal = n => n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : n <= 5 ? '🏅' : '🎉';
  let title, sub, rankHtml = '';
  if (ph === 'final') {
    title = r.overall <= 5 ? `You're in the TOP 5!` : 'Game complete!';
    sub = `Final result for ${v.me.name} · ${v.me.label}`;
    rankHtml = `<div><span>OVERALL</span><b>#${r.overall}</b><span>of ${r.overallN}</span></div><div class="alt"><span>IN ${esc(v.me.dept)}</span><b>#${r.arena}</b><span>of ${r.arenaN}</span></div>`;
    $('#resMedal').textContent = medal(r.overall);
  } else if (ph === 'r1done' || (ph === 'r1' && roundDone)) {
    title = roundDone && ph === 'r1' ? 'All pictures done!' : 'Round 1 complete!';
    sub = 'Your score carries into Round 2 — Hangman, everyone vs everyone.';
    rankHtml = `<div><span>IN ${esc(v.me.dept)} ARENA</span><b>#${r.arena || '–'}</b><span>of ${r.arenaN || '–'}</span></div>`;
    $('#resMedal').textContent = medal(r.arena || 99);
  } else {
    title = 'All words done!'; sub = 'Brilliant! Waiting for the round to end.';
    rankHtml = `<div><span>OVERALL</span><b>#${r.overall || '–'}</b><span>of ${r.overallN || '–'}</span></div>`;
    $('#resMedal').textContent = '🎯';
  }
  $('#resTitle').textContent = title; $('#resSub').textContent = sub;
  $('#resRank').innerHTML = rankHtml;
  $('#resScores').innerHTML = `<div><span>ROUND 1</span><b>${v.me.score1}</b></div><div><span>ROUND 2</span><b>${v.me.score2}</b></div><div><span>TOTAL</span><b>${v.me.score1 + v.me.score2}</b></div><div><span>BEST STREAK</span><b>🔥${v.me.best}</b></div>`;
}

// ---------- feedback ----------
function feedback(good, title, sub) {
  const el = $('#fb');
  el.className = 'feedback ' + (good ? 'good' : 'bad');
  el.innerHTML = `${good ? '✓ ' : '✗ '}${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
  el.classList.remove('hidden'); void el.offsetWidth;
  clearTimeout(el._h); el._h = setTimeout(() => el.classList.add('hidden'), 2200);
}
function stageMap(el, d) {
  el.innerHTML = Array.from({ length: d.total }, (_, i) => `<i class="${i < d.res.length ? (d.res[i] ? 'ok' : 'no') : i === d.idx ? 'cur' : ''}"></i>`).join('');
}

// ---------- keyboards ----------
const ROWS = 'QWERTYUIOPASDFGHJKLZXCVBNM';
function buildKbd(el, onKey, extra) {
  el.innerHTML = [...ROWS].map(c => `<button data-k="${c}" aria-label="${c}">${c}</button>`).join('') + (extra || '');
  el.onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) { Sound.click(); onKey(b.dataset.k); } };
  el.onmousedown = e => e.preventDefault(); // tapping a key must not steal focus (Enter/Space would re-press it)
}

// ---------- ROUND 1 ----------
buildKbd($('#r1Kbd'), k => r1Key(k), '<button data-k="BACK" class="wide2" aria-label="Backspace">⌫</button><button data-k="CLEAR" class="wide2" aria-label="Clear">Clear</button>');
const r1Total = () => view.r1.q.words.reduce((a, b) => a + b, 0);
function r1Key(k) {
  if (!view?.r1?.q || view.paused) return;
  if (k === 'BACK') r1.draft.pop();
  else if (k === 'CLEAR') r1.draft = [];
  else if (k === 'ENTER') return r1Submit();
  else if (/^[A-Z]$/.test(k) && r1.draft.length < r1Total()) r1.draft.push(k);
  paintSlots();
}
function shakeSlots() { $('#r1Slots').classList.remove('no'); void $('#r1Slots').offsetWidth; $('#r1Slots').classList.add('no'); }
function r1Submit() {
  if (r1.draft.length !== r1Total()) { shakeSlots(); return toast('Fill every letter first'); }
  socket.emit('r1:submit', r1.draft.join(''));
}
$('#r1Submit').onclick = r1Submit;
$('#r1HintBtn').onclick = () => { Sound.click(); socket.emit('r1:hint'); };
$('#r1Skip').onclick = () => { if (confirm('Skip this picture? You score 0 for it.')) socket.emit('r1:skip'); };

function paintSlots() {
  const q = view.r1.q; let i = 0;
  $('#r1Slots').innerHTML = q.words.map(n => `<div class="w">${Array.from({ length: n }, () => {
    const c = r1.draft[i], cur = i === r1.draft.length; i++;
    return `<div class="slot ${c ? 'f' : ''} ${cur ? 'cur' : ''}">${c || ''}</div>`;
  }).join('')}</div>`).join('');
  $('#r1Slots').setAttribute('aria-label', `${r1.draft.length} of ${r1Total()} letters entered`);
}

function renderR1() {
  show('v-r1');
  const d = view.r1, q = d.q;
  if (r1.seq !== null && d.seq !== r1.seq && d.last) {
    const L = d.last;
    if (L.ok) { Sound.good(); feedback(true, `${L.answer}  +${L.pts}`, L.firstTry ? 'First-try bonus!' : 'Nice!'); }
    else if (L.out || L.skipped) { Sound.bad(); feedback(false, `Answer: ${L.answer}`, L.skipped ? 'Skipped' : 'Out of attempts'); }
    else { Sound.bad(); feedback(false, 'Not quite', `${L.left} attempt${L.left === 1 ? '' : 's'} left`); shakeSlots(); r1.draft = []; }
  }
  r1.seq = d.seq;
  stageMap($('#r1Map'), d);
  $('#r1Count').textContent = `${d.idx + 1} / ${d.total}`;
  $('#r1Unit').textContent = `UNIT ${ROMAN[q.unit]} · ${q.unitName.toUpperCase()}`;
  $('#r1Tag').textContent = q.tag;
  if (r1.qid !== q.id) {
    r1.qid = q.id; r1.draft = [];
    $('#r1Pics').innerHTML = q.pics.map((p, i) => `<div class="pic" role="img" aria-label="Picture clue ${i + 1}">${p}</div>`).join('');
  }
  paintSlots();
  $('#r1Hint').classList.toggle('hidden', !q.hint); $('#r1Hint').textContent = q.hint ? '💡 ' + q.hint : '';
  $('#r1HintBtn').disabled = !!q.hint;
  const left = q.maxAttempts - q.attempts;
  const worth = (q.hint ? 60 : 100) + (q.attempts === 0 ? 20 : 0);
  $('#r1Att').innerHTML = `<span>Tries: ${'🎯'.repeat(left)}${'⚪'.repeat(q.attempts)}</span><span class="pts">worth ★ ${worth}</span>`;
}

// ---------- ROUND 2 ----------
buildKbd($('#r2Kbd'), k => socket.emit('r2:guess', k));
$('#r2HintBtn').onclick = () => { Sound.click(); socket.emit('r2:hint'); };
$('#r2Skip').onclick = () => { if (confirm('Skip this word? You score 0 for it.')) socket.emit('r2:next', true); };
$('#r2Next').onclick = () => { Sound.click(); socket.emit('r2:next'); };

function renderR2() {
  show('v-r2');
  const d = view.r2, q = d.q;
  const newQ = r2.qid !== q.id;
  if (newQ) { r2.qid = q.id; r2.revealed = new Set(); }
  if (r2.seq !== null && d.seq !== r2.seq && d.last) {
    const L = d.last;
    if (L.ok) { Sound.good(); feedback(true, `${L.answer}  +${L.pts}`, 'Word complete!'); }
    else if (L.skipped) feedback(false, `Answer: ${L.answer}`, 'Skipped');
    else { Sound.bad(); feedback(false, `Answer: ${L.answer}`, 'Out of lives — no points'); }
  }
  r2.seq = d.seq;
  stageMap($('#r2Map'), d);
  $('#r2Count').textContent = `${d.idx + 1} / ${d.total}`;
  $('#r2Unit').textContent = `UNIT ${ROMAN[q.unit]} · ${q.unitName.toUpperCase()}`;
  $('#r2Diff').textContent = q.difficulty === 'easy' ? 'EASY' : 'INTERMEDIATE';
  $('#r2Clue').textContent = q.clue;
  const left = q.maxWrong - q.wrong;
  $('#r2Lives').innerHTML = Array.from({ length: q.maxWrong }, (_, i) => `<span class="h ${i >= left ? 'gone' : ''}">❤️</span>`).join('') +
    `<span>${q.status === 'playing' ? `${left} ${left === 1 ? 'life' : 'lives'} · worth ★ ${100 + 10 * left - (q.hint ? 20 : 0)}` : q.status === 'won' ? '🎉 Solved!' : '😮 Out of lives'}</span>`;
  const svg = $('#hang');
  for (let i = 1; i <= 6; i++) svg.querySelector('.p' + i).classList.toggle('on', q.wrong >= i);
  svg.classList.toggle('lost', q.status === 'lost'); svg.classList.toggle('won', q.status === 'won');

  const words = []; let cur = [];
  q.pattern.forEach((c, i) => { if (c === ' ') { words.push(cur); cur = []; } else cur.push([c, i]); }); words.push(cur);
  const wasGuessed = new Set(q.guessed);
  $('#r2Word').innerHTML = words.map(w => `<div class="w">${w.map(([c, i]) => {
    const isNew = c !== '_' && !r2.revealed.has(i); if (c !== '_') r2.revealed.add(i);
    const cls = c === '_' ? '' : (q.status === 'lost' && !wasGuessed.has(c) ? 'f miss-l' : 'f' + (isNew && !newQ ? ' rev' : ''));
    return `<div class="slot ${cls}">${c === '_' ? '' : c}</div>`;
  }).join('')}</div>`).join('');
  $('#r2Word').className = 'word ' + (q.status !== 'playing' ? q.status : '');
  $('#r2Word').setAttribute('aria-label', q.pattern.map(c => c === '_' ? 'blank' : c === ' ' ? 'space' : c).join(' '));

  const ans = new Set(q.pattern.filter(c => /[A-Z]/.test(c)));
  for (const b of $('#r2Kbd').querySelectorAll('button')) {
    const k = b.dataset.k, g = wasGuessed.has(k);
    b.className = g ? (ans.has(k) ? 'hit' : 'miss') : '';
    b.disabled = g || q.status !== 'playing';
    b.setAttribute('aria-label', k + (g ? (ans.has(k) ? ' correct' : ' wrong') : ''));
  }
  $('#r2HintBtn').disabled = !q.hintable;
  $('#r2Actions').classList.toggle('hidden', q.status !== 'playing');
  $('#r2NextWrap').classList.toggle('hidden', q.status === 'playing');
  $('#r2Next').textContent = d.idx + 1 >= d.total ? 'FINISH ROUND ✓' : 'NEXT WORD →';
}

// physical keyboard
document.addEventListener('keydown', e => {
  if (e.target.closest?.('input,select,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toUpperCase();
  const inGame = (view?.phase === 'r1' && view.r1?.q) || (view?.phase === 'r2' && view.r2?.q);
  // A focused button would also "click" on Enter/Space — handle the key once, here.
  if (inGame && e.target.tagName === 'BUTTON' && (k === 'ENTER' || k === ' ')) e.preventDefault();
  if (e.repeat) return;
  if (view?.paused) return;
  if (view?.phase === 'r1' && view.r1?.q) {
    if (k === 'BACKSPACE') r1Key('BACK'); else if (k === 'ENTER') r1Key('ENTER'); else if (/^[A-Z]$/.test(k)) r1Key(k); else return;
    e.preventDefault();
  } else if (view?.phase === 'r2' && view.r2?.q) {
    if (/^[A-Z]$/.test(k) && view.r2.q.status === 'playing') socket.emit('r2:guess', k);
    else if (k === 'ENTER' && view.r2.q.status !== 'playing') socket.emit('r2:next');
  }
});

// timer
setInterval(() => {
  const t = $('#timer'), v = view;
  const ms = v && (v.phase === 'r1' || v.phase === 'r2') ? remainingMs(v) : null;
  t.classList.toggle('hidden', ms === null);
  if (ms !== null) { t.textContent = (v.paused ? '⏸ ' : '⏱ ') + fmt(ms); t.classList.toggle('low', ms < 60000); }
}, 250);
