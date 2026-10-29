// NLP QUEST · Host Control Panel Engine

const socket = io();
let P = null;
let currentPin = sessionStorage.getItem('att-pin') || '';
let isAuthed = false;
let questionsData = null;
let adjustingTeamId = null;

Sound.paint($('#muteBtn'));
$('#muteBtn').onclick = () => Sound.toggle($('#muteBtn'));

// Check authentication
socket.on('connect', () => {
  socket.emit('public:join');
  if (currentPin) {
    tryAuth(currentPin, true);
  }
});

function tryAuth(pin, silent = false) {
  socket.emit('host:auth', pin, res => {
    if (res?.ok) {
      isAuthed = true;
      currentPin = pin;
      sessionStorage.setItem('att-pin', pin);
      $('#loginGate').classList.add('hidden');
      $('#hostDashboard').classList.remove('hidden');
      $('#pinErr').textContent = '';
      $('#btnExportCsv').href = `/api/export.csv?pin=${encodeURIComponent(pin)}`;
      loadQuestions();
    } else {
      isAuthed = false;
      if (!silent) {
        $('#pinErr').textContent = 'Incorrect PIN. Default is 2468.';
      }
    }
  });
}

$('#pinForm').onsubmit = e => {
  e.preventDefault();
  const pin = $('#pinInput').value.trim();
  if (pin) tryAuth(pin);
};

socket.on('public', p => {
  P = p;
  syncClock(p);
  if (isAuthed) {
    renderHost();
  }
});

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    const pane = document.getElementById(btn.dataset.tab);
    if (pane) pane.classList.remove('hidden');
  };
});

// Render Host Dashboard
function renderHost() {
  if (!P) return;

  // Command bar status
  const phaseNames = {
    lobby: 'LOBBY (TEAMS JOINING)',
    r1: 'ROUND 01: PICTURE CONNECT',
    r1done: 'ROUND 01 FINISHED',
    r2: 'ROUND 02: HANGMAN',
    final: 'MATCH CONCLUDED'
  };
  $('#phaseDisplay').textContent = phaseNames[P.phase] || P.phase.toUpperCase();
  $('#tabTeamCount').textContent = P.teams.length;

  // Start / Next round buttons
  $('#btnStart1').classList.toggle('hidden', P.phase === 'r1' || P.phase === 'r2');
  $('#btnStart2').classList.toggle('hidden', P.phase !== 'r1done');
  $('#btnPause').classList.toggle('hidden', P.paused || (P.phase !== 'r1' && P.phase !== 'r2'));
  $('#btnResume').classList.toggle('hidden', !P.paused || (P.phase !== 'r1' && P.phase !== 'r2'));

  renderTeamsTable();
}

function renderTeamsTable() {
  const tbody = $('#teamsTbody');
  const filter = ($('#teamFilter').value || '').toLowerCase();

  const sortedTeams = P.teams.slice().sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const filtered = sortedTeams.filter(t => t.name.toLowerCase().includes(filter));

  tbody.innerHTML = filtered.map((t, idx) => {
    const isGirls = t.category === 'girls';
    const catLabel = isGirls ? '🌸 Girls' : '⚡ Boys';
    const catClass = isGirls ? 'girls' : 'boys';

    return `
      <tr>
        <td><b>${idx + 1}</b></td>
        <td>
          <b>${esc(t.name)}</b>
          <small class="muted" style="display:block;">${t.members.map(m => m.name).join(', ') || 'No members yet'}</small>
        </td>
        <td>
          <button class="pill cat-pill ${catClass}" onclick="toggleTeamCategory('${t.id}')" title="Click to switch category">
            ${catLabel} ⇄
          </button>
        </td>
        <td>${t.online > 0 ? `🟢 ${t.online} online` : '⚪ 0'}</td>
        <td>${t.r1 ? `${t.r1.solved} / ${t.r1.total}` : '—'}</td>
        <td>${t.r2 ? `${t.r2.solved} / ${t.r2.total}` : '—'}</td>
        <td>${t.score1}</td>
        <td>${t.score2}</td>
        <td><b style="color:var(--blue-d); font-size:16px;">${t.total}</b></td>
        <td>
          <div class="adjust-btn-group">
            <button class="adj-btn" onclick="quickAdjust('${t.id}', 10)">+10</button>
            <button class="adj-btn" onclick="quickAdjust('${t.id}', 20)">+20</button>
            <button class="adj-btn" onclick="quickAdjust('${t.id}', -10)">-10</button>
            <button class="adj-btn" onclick="openAdjustModal('${t.id}', '${esc(t.name)}')">Custom</button>
          </div>
        </td>
        <td>
          <button class="btn red sm" onclick="removeTeam('${t.id}', '${esc(t.name)}')">Remove</button>
        </td>
      </tr>
    `;
  }).join('');
}

$('#teamFilter').oninput = renderTeamsTable;

// Global host actions triggered from table buttons
window.toggleTeamCategory = (teamId) => {
  socket.emit('host:toggleCategory', teamId, res => {
    if (res?.error) toast(res.error);
    else toast('Category toggled');
  });
};

window.quickAdjust = (teamId, delta) => {
  socket.emit('host:adjust', { teamId, delta, reason: `Host adjustment (${delta > 0 ? '+' : ''}${delta})` }, res => {
    if (res?.error) toast(res.error);
    else toast(`Adjusted points: ${delta > 0 ? '+' : ''}${delta}`);
  });
};

window.openAdjustModal = (teamId, teamName) => {
  adjustingTeamId = teamId;
  $('#adjustTeamName').textContent = teamName;
  $('#adjustDelta').value = '';
  $('#adjustReason').value = '';
  $('#adjustModal').showModal();
};

window.removeTeam = (teamId, teamName) => {
  if (confirm(`Are you sure you want to remove ${teamName} from the arena?`)) {
    socket.emit('host:removeTeam', teamId, res => {
      if (res?.error) toast(res.error);
      else toast(`Removed ${teamName}`);
    });
  }
};

$('#adjustCancel').onclick = () => $('#adjustModal').close();
$('#adjustForm').onsubmit = (e) => {
  e.preventDefault();
  const delta = Number($('#adjustDelta').value);
  const reason = $('#adjustReason').value.trim();
  if (adjustingTeamId && delta) {
    socket.emit('host:adjust', { teamId: adjustingTeamId, delta, reason }, res => {
      $('#adjustModal').close();
      if (res?.error) toast(res.error);
      else toast('Points updated');
    });
  }
};

// Match Flow Controls
$('#btnStart1').onclick = () => {
  if (confirm('Start Round 1: Picture Connect (15 questions)?')) {
    socket.emit('host:start', 1);
  }
};

$('#btnStart2').onclick = () => {
  if (confirm('Start Round 2: Hangman (25 questions)?')) {
    socket.emit('host:start', 2);
  }
};

$('#btnPause').onclick = () => socket.emit('host:pause');
$('#btnResume').onclick = () => socket.emit('host:resume');
$('#btnAdd1').onclick = () => socket.emit('host:addTime', 1);
$('#btnAdd3').onclick = () => socket.emit('host:addTime', 3);
$('#btnEnd').onclick = () => {
  if (confirm('Are you sure you want to end the current round?')) {
    socket.emit('host:end');
  }
};

// Tab 2: Add / Seed Teams
$('#addTeamForm').onsubmit = e => {
  e.preventDefault();
  const name = $('#newTeamName').value.trim();
  const category = document.querySelector('input[name="newTeamCat"]:checked').value;
  if (!name) return;

  socket.emit('host:addTeam', { name, category }, res => {
    if (res?.error) return toast(res.error);
    $('#newTeamName').value = '';
    toast(`Team "${name}" created!`);
    // Switch to teams tab
    document.querySelector('.tab-btn[data-tab="tabTeams"]').click();
  });
};

$('#btnSeedPresets').onclick = () => {
  if (confirm('Seed the 10 syllabus starter teams into the arena?')) {
    socket.emit('host:seedPresets', {}, () => {
      toast('10 starter teams seeded successfully!');
      document.querySelector('.tab-btn[data-tab="tabTeams"]').click();
    });
  }
};

// Tab 3: Question Banks Browser
function loadQuestions() {
  if (questionsData) return;
  fetch('/api/questions')
    .then(r => r.json())
    .then(data => {
      questionsData = data;
      renderQuestionsTables();
    })
    .catch(() => {});
}

function renderQuestionsTables() {
  if (!questionsData) return;

  // Round 1 Connect
  $('#r1QTableBody').innerHTML = questionsData.connect.map(q => `
    <tr>
      <td><b>${q.id}</b></td>
      <td>Unit ${ROMAN[q.unit]}</td>
      <td><b style="color:var(--blue-d);">${q.answer}</b></td>
      <td>${esc(q.pictureIdea || '')}</td>
      <td class="muted">${esc(q.hint)}</td>
      <td><span class="pill sm ${q.difficulty === 'easy' ? 'mint' : 'yellow'}">${q.difficulty.toUpperCase()}</span></td>
    </tr>
  `).join('');

  // Round 2 Hangman
  $('#r2QTableBody').innerHTML = questionsData.hangman.map(q => `
    <tr>
      <td><b>${q.id}</b></td>
      <td>Unit ${ROMAN[q.unit]}</td>
      <td><b style="color:var(--blue-d);">${q.answer}</b></td>
      <td>${esc(q.clue)}</td>
      <td><span class="pill sm ${q.difficulty === 'easy' ? 'mint' : 'yellow'}">${q.difficulty.toUpperCase()}</span></td>
    </tr>
  `).join('');
}

// Tab 4: Reset & Config
$('#btnResetKeep').onclick = () => {
  if (confirm('Start a new match while keeping all registered teams? Scores will reset to 0.')) {
    socket.emit('host:reset', 'keepTeams', () => toast('New match started with existing teams'));
  }
};

$('#btnResetAll').onclick = () => {
  if (confirm('⚠️ WARNING: This will wipe all teams, players, and scores. Proceed?')) {
    socket.emit('host:reset', 'wipeAll', () => toast('Arena reset to factory default'));
  }
};

// Timer update
setInterval(() => {
  if (!P) return;
  const ms = (P.phase === 'r1' || P.phase === 'r2') ? remainingMs(P) : null;
  $('#timerDisplay').textContent = ms !== null ? ((P.paused ? '⏸ ' : '') + fmt(ms)) : '--:--';
}, 250);
