// NLP QUEST · Main Projector Display Engine
// Real-time animated leaderboards with dedicated Girls' and Boys' Top 5 rankings.

const socket = io();
let P = null;
let lastPhase = null;

Sound.paint($('#muteBtn'));
$('#muteBtn').onclick = () => Sound.toggle($('#muteBtn'));

// Fullscreen toggle
$('#fsBtn').onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
};

document.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') {
    $('#fsBtn').click();
  }
});

// Socket connection
socket.on('connect', () => {
  socket.emit('public:join');
});

socket.on('public', p => {
  P = p;
  syncClock(p);
  renderProjector();
});

// Phase labels mapping
const ROUND_INFO = {
  lobby: { num: 'LOBBY', name: 'WAITING FOR TEAMS' },
  r1: { num: 'ROUND 01', name: 'PICTURE CONNECT' },
  r1done: { num: 'ROUND 01 COMPLETE', name: 'INTERMISSION' },
  r2: { num: 'ROUND 02', name: 'HANGMAN ARENA' },
  final: { num: 'CHAMPIONSHIP', name: 'FINAL RESULTS' }
};

function renderProjector() {
  if (!P) return;

  const info = ROUND_INFO[P.phase] || ROUND_INFO.lobby;
  $('#roundNum').textContent = info.num;
  $('#roundName').textContent = info.name;

  // Sound jingle on round transitions
  if (lastPhase && lastPhase !== P.phase) {
    Sound.jingle();
  }
  lastPhase = P.phase;

  // Status indicators
  const isLive = (P.phase === 'r1' || P.phase === 'r2') && !P.paused;
  $('#livePill').classList.toggle('hidden', !isLive);
  $('#pausedBanner').classList.toggle('hidden', !P.paused);

  // Switch between Dual Boards and Final Podium
  if (P.phase === 'final') {
    $('#dualBoards').classList.add('hidden');
    $('#finalPodium').classList.remove('hidden');
    renderFinalPodium();
  } else {
    $('#dualBoards').classList.remove('hidden');
    $('#finalPodium').classList.add('hidden');
    renderBoard($('#girlsBoard'), P.girlsTop5, 'girls');
    renderBoard($('#boysBoard'), P.boysTop5, 'boys');
  }

  // Activity Ticker
  renderTicker();

  // Footer Stats
  renderFooter();
}

// Keyed absolute positioning for smooth 300-500ms sliding rank transitions
function renderBoard(container, teams, category) {
  const rowH = 70;
  const gap = 12;
  const totalH = 5 * (rowH + gap);
  container.style.height = totalH + 'px';

  if (!teams || teams.length === 0) {
    container.innerHTML = `<div class="board-empty"><span>No ${category} teams ranked yet</span><small class="muted">Waiting for scores to appear…</small></div>`;
    return;
  }

  // Clean empty state if present
  const emptyEl = container.querySelector('.board-empty');
  if (emptyEl) emptyEl.remove();

  const currentIds = new Set();

  teams.forEach((team, index) => {
    currentIds.add(team.id);
    let row = container.querySelector(`[data-id="${CSS.escape(team.id)}"]`);

    if (!row) {
      row = document.createElement('div');
      row.className = 'team-row';
      row.dataset.id = team.id;
      // Start below then slide into place
      row.style.top = (5 * (rowH + gap)) + 'px';
      container.appendChild(row);
      void row.offsetWidth; // force reflow for smooth enter
    }

    // Check if team recently gained points (within last 3.5 seconds)
    const recentlyScored = team.lastGainAt && (P.serverNow - team.lastGainAt) < 3500;
    const rankClass = `rank-${index + 1}`;
    row.className = `team-row ${rankClass} ${recentlyScored ? 'just-scored' : ''}`;
    row.style.top = (index * (rowH + gap)) + 'px';

    const rankBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
    const scoreVal = P.phase === 'r1' ? team.score1 : team.total;

    row.innerHTML = `
      <div class="rk-badge">${rankBadge}</div>
      <div class="tm-info">
        <span class="tm-name">${esc(team.name)}</span>
        ${recentlyScored && team.lastGain > 0 ? `<span class="pts-gain-tag">+${team.lastGain}</span>` : ''}
      </div>
      <div class="tm-solved-count">${getSolvedBadge(team)}</div>
      <div class="tm-score">${scoreVal}</div>
    `;
  });

  // Remove rows no longer in top 5
  for (const child of [...container.children]) {
    if (child.dataset.id && !currentIds.has(child.dataset.id)) {
      child.remove();
    }
  }
}

function getSolvedBadge(team) {
  if (P.phase === 'r1' && team.r1) {
    return `${team.r1.solved}/${team.r1.total || 15} solved`;
  }
  if (P.phase === 'r2' && team.r2) {
    return `${team.r2.solved}/${team.r2.total || 25} words`;
  }
  if (team.r1 || team.r2) {
    const totalSolved = (team.r1?.solved || 0) + (team.r2?.solved || 0);
    return `${totalSolved} solved`;
  }
  return '0 solved';
}

function renderTicker() {
  const feed = P.feed || [];
  if (feed.length === 0) {
    $('#tickerFeed').textContent = 'Arena is ready. Waiting for questions to be solved…';
    return;
  }
  const latest = feed[0];
  const catBadge = latest.category ? `[${latest.category.toUpperCase()}] ` : '';
  const ptsBadge = latest.pts > 0 ? ` (+${latest.pts} pts)` : '';
  $('#tickerFeed').textContent = `⚡ ${catBadge}${latest.team} — ${latest.label}${ptsBadge}`;
}

function renderFooter() {
  $('#sTeams').textContent = P.activeTeamsCount || P.teams.length;
  $('#sSolved').textContent = P.questionsSolvedCount || 0;
  const pct = Math.min(100, Math.max(0, P.roundProgress || 0));
  $('#sProgressText').textContent = `${pct}%`;
  $('#sBar').style.width = `${pct}%`;
}

function renderFinalPodium() {
  const cardsContainer = $('#podiumCards');
  const girlsChamp = P.girlsTop5[0];
  const boysChamp = P.boysTop5[0];
  const overallChamp = P.overallTop10[0];

  cardsContainer.innerHTML = `
    <!-- Girls Champion -->
    <div class="podium-card ${overallChamp?.id === girlsChamp?.id ? 'winner' : ''}">
      <div class="podium-icon">🌸 🥇</div>
      <div class="podium-category">GIRLS' LEAGUE CHAMPION</div>
      <div class="podium-name">${esc(girlsChamp?.name || 'To be determined')}</div>
      <div class="podium-score">${girlsChamp?.total || 0} PTS</div>
    </div>

    <!-- Overall Champion -->
    <div class="podium-card winner">
      <div class="podium-icon">🏆 👑</div>
      <div class="podium-category">ARENA GRAND CHAMPION</div>
      <div class="podium-name">${esc(overallChamp?.name || 'To be determined')}</div>
      <div class="podium-score">${overallChamp?.total || 0} PTS</div>
    </div>

    <!-- Boys Champion -->
    <div class="podium-card ${overallChamp?.id === boysChamp?.id ? 'winner' : ''}">
      <div class="podium-icon">⚡ 🥇</div>
      <div class="podium-category">BOYS' LEAGUE CHAMPION</div>
      <div class="podium-name">${esc(boysChamp?.name || 'To be determined')}</div>
      <div class="podium-score">${boysChamp?.total || 0} PTS</div>
    </div>
  `;
}

// Timer countdown tick
setInterval(() => {
  const timerEl = $('#timer');
  if (!P) return;

  const ms = (P.phase === 'r1' || P.phase === 'r2') ? remainingMs(P) : null;
  timerEl.classList.toggle('hidden', ms === null);

  if (ms !== null) {
    timerEl.textContent = (P.paused ? '⏸ ' : '') + fmt(ms);
    timerEl.classList.toggle('low', ms < 60000 && !P.paused);
  }
}, 250);

