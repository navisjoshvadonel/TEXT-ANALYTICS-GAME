// Host + projector in one screen. The board is always visible; controls live in a hideable dock (press H).
const socket = io();
let P = null, authed = false, lastPhase = null, seenFeed = 0;

Sound.paint($('#mute'));
$('#mute').onclick = () => Sound.toggle($('#mute'));

socket.on('connect', () => {
  socket.emit('public:join');
  const pin = sessionStorage.getItem('att-pin');
  if (pin) auth(pin, true);
  loadPin();
});
socket.on('public', p => { P = p; syncClock(p); render(); });
socket.on('pinChanged', loadPin);

// Game PIN: readable straight away on the host laptop; from another PC only after unlocking the dock.
let gamePin = '';
function loadPin() { socket.emit('host:pin', res => showPin(res?.gamePin)); }
function showPin(p) {
  gamePin = p || '';
  $('#gamePin').innerHTML = gamePin ? [...gamePin].map(d => `<span>${d}</span>`).join('') : '<span style="font-size:.4em;letter-spacing:0">Unlock host controls (H) to show PIN</span>';
  $('#pinChipVal').textContent = gamePin;
  if (P) render();
}

fetch('/api/info').then(r => r.json()).then(i => {
  $('#url').textContent = i.url;
  if (i.ips.length > 1) $('#urlAlt').textContent = 'or ' + i.ips.slice(1).join(' · ');
});

// ---------- render ----------
const PHASE = {
  lobby: ['LOBBY', 'Players are joining', 'p-lobby'],
  r1: ['ROUND 01', 'Picture Connect · Arena battle', 'p-r1'],
  r1done: ['ROUND 01 · COMPLETE', 'Arena results', 'p-r1'],
  r2: ['ROUND 02', 'Hangman · Everyone vs everyone', 'p-r2'],
  final: ['FINAL', 'Champions', 'p-final'],
};
const meta = d => arenaMeta(d, P.config.depts);
const tagd = d => `<span class="tagd" style="--ac:${meta(d).color}">${esc(d)}</span>`;

function render() {
  const [num, name, sec] = PHASE[P.phase];
  $('#roundNum').textContent = num; $('#roundName').textContent = name;
  for (const s of document.querySelectorAll('.phase')) s.classList.toggle('hidden', s.id !== sec);
  $('#pinChip').classList.toggle('hidden', !gamePin || P.phase === 'lobby' || P.phase === 'final');
  if (lastPhase && lastPhase !== P.phase) Sound.jingle();
  lastPhase = P.phase;
  $('#pausedBanner').classList.toggle('hidden', !P.paused);
  $('#live').classList.toggle('hidden', !(P.phase === 'r1' || P.phase === 'r2') || P.paused);
  $('#r1Banner').classList.toggle('hidden', P.phase !== 'r1done');

  if (P.phase === 'lobby') renderLobby();
  if (P.phase === 'r1' || P.phase === 'r1done') renderR1();
  if (P.phase === 'r2') renderR2();
  if (P.phase === 'final') renderFinal();
  renderStats();
  if (authed) renderDock();
}

function arenas() {
  const g = {};
  for (const p of P.players) (g[p.dept] ||= []).push(p);
  const order = d => { const i = P.config.depts.indexOf(d); return i < 0 ? 99 : i; };
  return Object.entries(g).sort((a, b) => order(a[0]) - order(b[0]))
    .map(([dept, ps]) => ({ dept, players: ps, sum1: ps.reduce((a, p) => a + p.score1, 0), sumT: ps.reduce((a, p) => a + p.total, 0) }))
    .map(a => ({ ...a, avg1: Math.round(a.sum1 / a.players.length), avgT: Math.round(a.sumT / a.players.length) }));
}

// ---------- lobby ----------
function renderLobby() {
  countTo($('#joinCount'), P.players.length);
  $('#lobbyEmpty').classList.toggle('hidden', P.players.length > 0);
  const box = $('#lobbyArenas'), keep = new Set();
  for (const a of arenas()) {
    keep.add(a.dept);
    let card = box.querySelector(`[data-dept="${CSS.escape(a.dept)}"]`);
    if (!card) {
      const m = meta(a.dept);
      card = document.createElement('div'); card.className = 'la'; card.dataset.dept = a.dept; card.style.setProperty('--ac', m.color);
      card.innerHTML = `<div class="la-h"><span class="ai">${m.icon}</span><b>${esc(a.dept)} ARENA</b><span class="n"></span></div><div class="la-body"></div>`;
      box.append(card);
    }
    card.querySelector('.n').textContent = a.players.length;
    const body = card.querySelector('.la-body'), have = new Set([...body.children].map(c => c.dataset.id));
    for (const p of a.players.slice().sort((x, y) => x.name.localeCompare(y.name))) {
      let c = body.querySelector(`[data-id="${CSS.escape(p.id)}"]`);
      if (!c) { c = document.createElement('span'); c.className = 'chip'; c.dataset.id = p.id; c.innerHTML = `${avatar(p.name, 'sm')}${esc(p.name)}${p.section ? ` <small class="muted">${esc(p.section)}</small>` : ''}`; body.append(c); if (have.size) Sound.click(); }
      c.classList.toggle('off', !p.online); have.delete(p.id);
    }
    for (const id of have) body.querySelector(`[data-id="${CSS.escape(id)}"]`)?.remove();
  }
  for (const c of [...box.children]) if (!keep.has(c.dataset.dept)) c.remove();
}

// Keyed, absolutely-positioned rows so rank changes slide smoothly.
function board(el, items, rowFn, rowH = 52, gap = 8, cls = 'row') {
  el.style.setProperty('--rh', rowH + 'px');
  el.style.height = (items.length * (rowH + gap)) + 'px';
  const keep = new Set();
  items.forEach((t, i) => {
    const key = t.id || t.dept;
    let r = el.querySelector(`[data-id="${CSS.escape(key)}"]`);
    if (!r) { r = document.createElement('div'); r.dataset.id = key; r.style.top = (items.length * (rowH + gap)) + 'px'; el.append(r); void r.offsetWidth; }
    r.innerHTML = rowFn(t, i);
    r.style.top = (i * (rowH + gap)) + 'px';
    if (cls === 'row') {
      const hot = t.lastGainAt && (P.serverNow - t.lastGainAt) < 4000;
      r.className = 'row' + (hot ? ' hot' : '') + (i === 0 ? ' r1st' : i === 1 ? ' r2nd' : i === 2 ? ' r3rd' : '');
    } else r.className = cls + (i === 0 ? ' lead' : '');
    keep.add(key);
  });
  for (const r of [...el.children]) if (!keep.has(r.dataset.id)) r.remove();
}
const rankSort = key => (a, b) => b[key] - a[key] || a.name.localeCompare(b.name);
const gainTag = t => `<span class="gain">+${t.lastGain}</span>${t.streak >= 3 ? `<span class="fire">🔥${t.streak}</span>` : ''}`;
const nameCell = (p, withDept) => `<span class="nm">${avatar(p.name)}<em>${esc(p.name)}</em>${withDept ? tagd(p.dept) : ''}${gainTag(p)}</span>`;

// Arena bars; with many arenas they flow into two columns (rank 1 left, 2 right, …) to save height.
function race(el, list, key, rowH, cols = 1) {
  const items = list.slice().sort((a, b) => b[key] - a[key]);
  const max = Math.max(1, ...items.map(a => a[key]));
  board(el, items, a => {
    const m = meta(a.dept);
    return `<span class="rn">${m.icon} ${esc(a.dept)}</span><span class="track"><span class="fill" style="--ac:${m.color};width:${Math.max(2, a[key] / max * 100)}%"></span></span><span class="rv">${a[key]}</span>`;
  }, rowH, 6, 'race-row');
  if (cols < 2) return;
  const order = items.map(a => a.dept);
  el.style.height = Math.ceil(items.length / 2) * (rowH + 6) + 'px';
  for (const r of el.children) {
    const i = order.indexOf(r.dataset.id);
    r.style.top = Math.floor(i / 2) * (rowH + 6) + 'px';
    r.style.left = i % 2 ? 'calc(50% + 14px)' : '0'; r.style.right = i % 2 ? '0' : 'calc(50% + 14px)';
  }
}

// ---------- round 1 ----------
function renderR1() {
  const list = arenas();
  const twoCol = list.length > 4;
  race($('#race1'), list, 'avg1', Math.max(22, Math.min(40, Math.floor(innerHeight * 0.2 / Math.max(twoCol ? Math.ceil(list.length / 2) : list.length, 1)) - 6)), twoCol ? 2 : 1);
  const grid = $('#arenaGrid'), keep = new Set();
  // Show as many players per arena as fit, so every arena card stays on screen however many departments join.
  const cols = Math.max(1, Math.floor((grid.clientWidth + 16) / 296));
  const rows = Math.ceil(list.length / cols) || 1;
  const cardH = (grid.clientHeight - 12 * (rows - 1)) / rows;
  const perCard = Math.max(1, Math.min(5, Math.floor((cardH - 58) / 38)));
  for (const a of list) {
    keep.add(a.dept);
    let card = grid.querySelector(`[data-dept="${CSS.escape(a.dept)}"]`);
    if (!card) {
      const m = meta(a.dept);
      card = document.createElement('div'); card.className = 'card arena'; card.dataset.dept = a.dept; card.style.setProperty('--ac', m.color);
      card.innerHTML = `<div class="arena-h"><span>${m.icon}</span><b>${esc(a.dept)} ARENA</b><span class="info"></span></div><div class="board"></div>`;
      grid.append(card);
    }
    const top = a.players.slice().sort(rankSort('score1'));
    card.querySelector('.info').textContent = P.phase === 'r1done' && top[0] ? `👑 ${top[0].name.toUpperCase()}` : `${a.players.length} PLAYER${a.players.length === 1 ? '' : 'S'}`;
    board(card.querySelector('.board'), top.slice(0, perCard), (p, i) =>
      `<span class="rk">${i + 1}</span>${nameCell(p)}<span class="sc">${p.score1}</span>`, 34, 4);
  }
  for (const c of [...grid.children]) if (!keep.has(c.dataset.dept)) c.remove();
  board($('#top5'), P.players.slice().sort(rankSort('score1')).slice(0, 5),
    (p, i) => `<span class="rk">${i + 1}</span>${nameCell(p, true)}<span class="sc">${p.score1}</span>`, 42, 6);
  renderFeed($('#feed1'));
}

// ---------- round 2 ----------
function renderR2() {
  const el = $('#overall'), items = P.players.slice().sort(rankSort('total')).slice(0, 10);
  const avail = el.closest('.card').clientHeight - 100;
  const rh = Math.max(40, Math.min(64, Math.floor(avail / Math.max(items.length, 1)) - 8));
  board(el, items, (p, i) =>
    `<span class="rk">${i + 1}</span>${nameCell(p)}<span>${tagd(p.dept)}${p.section ? ` <small class="muted">${esc(p.section)}</small>` : ''}</span><span class="sub">${p.score1}</span><span class="sub">${p.score2}</span><span class="sc">${p.total}</span>`, rh, 8);
  const list = arenas();
  race($('#race2'), list, 'avgT', Math.max(18, Math.min(34, Math.floor(innerHeight * 0.22 / Math.max(list.length, 1)) - 6)));
  renderFeed($('#feed2'));
}

// ---------- final ----------
function renderFinal() {
  const s = P.players.slice().sort(rankSort('total'));
  const slots = [3, 1, 0, 2, 4].map(i => [s[i], i]).filter(x => x[0]);
  const sig = slots.map(([p]) => p.id + p.total).join() + '|' + arenas().map(a => a.dept + a.sumT).join();
  if ($('#p-final').dataset.sig === sig) return;
  $('#p-final').dataset.sig = sig;
  $('#podium').innerHTML = slots.map(([p, i]) => `<div class="pod g${i + 1}" style="animation-delay:${(4 - i) * 0.35}s">
      <div class="crown">${['👑', '🥈', '🥉', '', ''][i]}</div>
      ${avatar(p.name, 'xl')}
      <div class="pn">${esc(p.name)}</div>
      <div class="pd">${tagd(p.dept)}${p.section ? `<small class="muted">Sec ${esc(p.section)}</small>` : ''}</div>
      <div class="block"><span class="pr">${i + 1}</span><span class="ps">${p.total} pts</span></div>
    </div>`).join('');
  const depts = arenas().sort((a, b) => b.avgT - a.avgT);
  $('#deptLeaders').innerHTML = depts.map((a, i) => {
    const m = meta(a.dept), champ = a.players.slice().sort(rankSort('total'))[0];
    return `<div class="dl ${i === 0 ? 'top' : ''}" style="--ac:${m.color};animation-delay:${2 + i * 0.12}s">
      <div class="dl-h"><span class="ai">${m.icon}</span><b>${esc(a.dept)}</b><span>#${i + 1} ARENA</span></div>
      <div class="dl-b">${avatar(champ.name, 'lg')}<div class="who"><small>DEPARTMENT LEADER</small><b>${esc(champ.name)}</b><span>${champ.section ? 'Section ' + esc(champ.section) : '&nbsp;'}</span></div><div class="pts">${champ.total}</div></div>
      <div class="dl-f"><span>${a.players.length} PLAYER${a.players.length === 1 ? '' : 'S'}</span><span>${i === 0 ? '👑 TOP · ' : ''}AVG ${a.avgT}</span></div>
    </div>`;
  }).join('');
}

function renderFeed(el) {
  el.innerHTML = P.feed.slice(0, 9).map(f => f.sys
    ? `<li class="sys">${esc(f.label)}</li>`
    : `<li>${avatar(f.name, 'sm')}<span class="ft"><b>${esc(f.name)} ${tagd(f.dept)}</b><small>${esc(f.label)}${f.streak >= 3 ? ` · 🔥${f.streak} streak` : ''}</small></span><em>+${f.pts}</em></li>`).join('');
  if (P.feed[0] && P.feed[0].t > seenFeed) { if (seenFeed && !P.feed[0].sys) Sound.click(); seenFeed = P.feed[0].t; }
}

function renderStats() {
  $('#sPlayers').textContent = P.players.length;
  $('#sOnline').textContent = P.players.filter(p => p.online).length;
  $('#sArenas').textContent = new Set(P.players.map(p => p.dept)).size;
  countTo($('#sSolved'), P.players.reduce((a, p) => a + (p.r1?.solved || 0) + (p.r2?.solved || 0), 0));
  const key = P.phase === 'r2' ? 'r2' : 'r1';
  const pct = r => r ? (r.done ? 100 : r.idx / r.total * 100) : 0;
  const prog = P.phase === 'lobby' ? 0 : (P.phase === 'final' || P.phase === 'r1done') ? 100 :
    P.players.length ? P.players.reduce((a, p) => a + pct(p[key]), 0) / P.players.length : 0;
  $('#sBar').style.width = prog + '%';
}

setInterval(() => {
  if (!P) return;
  const ms = (P.phase === 'r1' || P.phase === 'r2') ? remainingMs(P) : null, t = $('#timer');
  t.classList.toggle('hidden', ms === null);
  if (ms !== null) { t.textContent = (P.paused ? '⏸ ' : '⏱ ') + fmt(ms); t.classList.toggle('low', ms < 60000); }
  P.serverNow = Date.now() + clockOffset; // let "hot" highlights fade
  for (const r of document.querySelectorAll('.row.hot')) {
    const p = P.players.find(x => x.id === r.dataset.id);
    if (!p || P.serverNow - p.lastGainAt > 4000) r.classList.remove('hot');
  }
}, 250);
addEventListener('resize', () => { if (P) { $('#p-final').dataset.sig = ''; render(); } });

// ---------- host dock ----------
function auth(pin, silent) {
  socket.emit('host:auth', pin, res => {
    authed = !!res?.ok;
    if (authed) { sessionStorage.setItem('att-pin', pin); if (res.gamePin) showPin(res.gamePin); $('#login').classList.add('hidden'); $('#controls').classList.remove('hidden'); if (P) { renderDock(); fillSettings(); } }
    else { sessionStorage.removeItem('att-pin'); if (!silent) toast('Wrong PIN'); }
  });
}
$('#pinBtn').onclick = () => auth($('#pin').value);
$('#pin').onkeydown = e => e.key === 'Enter' && auth($('#pin').value);
const toggleDock = () => { $('#dock').classList.toggle('hidden'); if (!authed) $('#pin').focus(); };
$('#dockToggle').onclick = toggleDock;
$('#cHide').onclick = toggleDock;
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'h' && !e.target.closest?.('input')) toggleDock(); });

const cmd = (ev, arg, confirmMsg) => () => {
  if (confirmMsg && !confirm(confirmMsg)) return;
  socket.emit(ev, arg, res => res?.error ? toast(res.error) : Sound.click());
};
$('#cStart1').onclick = cmd('host:start', 1);
$('#cStart2').onclick = cmd('host:start', 2);
$('#cPause').onclick = cmd('host:pause');
$('#cResume').onclick = cmd('host:resume');
$('#cAdd').onclick = cmd('host:addTime', 1);
$('#cEnd').onclick = cmd('host:end', null, 'End the current round now?');
$('#rKeep').onclick = cmd('host:reset', 'keepPlayers', 'Start a new match? All scores reset, players stay joined.');
$('#rAll').onclick = cmd('host:reset', 'all', 'Wipe EVERYTHING (all players and scores)?');
$('#cNewPin').onclick = () => { if (confirm('Generate a new game PIN? Players already in stay in; new joiners need the new PIN.')) socket.emit('host:newPin', null, res => res?.error ? toast(res.error) : toast('New PIN: ' + res.gamePin)); };
$('#cExport').onclick = () => location.href = '/api/export.csv?pin=' + encodeURIComponent(sessionStorage.getItem('att-pin'));
$('#cPlayers').onclick = () => { $('#panelPlayers').classList.toggle('hidden'); $('#panelSettings').classList.add('hidden'); renderDock(); };
$('#cSettings').onclick = () => { $('#panelSettings').classList.toggle('hidden'); $('#panelPlayers').classList.add('hidden'); fillSettings(); };
$('#pSearch').oninput = () => renderDock();
$('#sSave').onclick = () => socket.emit('host:config', { depts: $('#sDepts').value, sections: $('#sSecs').value, r1Minutes: $('#sR1').value, r2Minutes: $('#sR2').value }, () => toast('Settings saved'));

function fillSettings() {
  if (!P) return;
  $('#sDepts').value = P.config.depts.join(', '); $('#sSecs').value = P.config.sections.join(', ');
  $('#sR1').value = P.config.r1Minutes; $('#sR2').value = P.config.r2Minutes;
}

function renderDock() {
  if (!P) return;
  const ph = P.phase, run = ph === 'r1' || ph === 'r2';
  $('#dockState').textContent = { lobby: `Lobby · ${P.players.length} joined`, r1: 'Round 1', r1done: 'R1 finished', r2: 'Round 2', final: 'Finished' }[ph] + (P.paused ? ' · paused' : '');
  $('#cStart1').classList.toggle('hidden', ph !== 'lobby');
  $('#cStart2').classList.toggle('hidden', ph !== 'r1done');
  $('#cPause').classList.toggle('hidden', !run || P.paused);
  $('#cResume').classList.toggle('hidden', !run || !P.paused);
  $('#cAdd').classList.toggle('hidden', !run);
  $('#cEnd').classList.toggle('hidden', !run);
  $('#cEnd').textContent = ph === 'r2' ? '■ End & show champions' : '■ End round';
  if ($('#panelPlayers').classList.contains('hidden') || document.activeElement?.closest('#playerRows')) return;
  const q = $('#pSearch').value.trim().toLowerCase();
  const rows = P.players.slice().sort(rankSort('total')).filter(p => !q || p.name.toLowerCase().includes(q) || p.dept.toLowerCase().includes(q));
  $('#playerRows').innerHTML = rows.map(p => `<tr data-id="${esc(p.id)}">
    <td><b>${esc(p.name)}</b></td><td>${esc(p.dept)}${p.section ? ' · ' + esc(p.section) : ''}</td><td>${p.online ? '🟢' : '⚪'}</td>
    <td>${p.score1}</td><td>${p.score2}</td><td><b>${p.total}</b></td>
    <td><input type="number" placeholder="±pts" aria-label="Points to add for ${esc(p.name)}"> <button class="btn ghost sm" data-a="adj">Apply</button></td>
    <td><button class="btn red sm" data-a="rm">Remove</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">No players</td></tr>';
}
$('#playerRows').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const tr = b.closest('tr'), id = tr.dataset.id, name = tr.querySelector('b').textContent;
  if (b.dataset.a === 'adj') { const d = Number(tr.querySelector('input').value); if (d) socket.emit('host:adjust', { id, delta: d }, () => { b.blur(); toast(`Adjusted ${name}`); }); }
  if (b.dataset.a === 'rm' && confirm(`Remove ${name}? They will be sent back to the join screen.`)) socket.emit('host:remove', id);
};
