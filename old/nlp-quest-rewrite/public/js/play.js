// NLP QUEST · Student Gameplay Engine

const socket = io();
const pid = localStorage.getItem('nq-pid') || (() => {
  const id = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('nq-pid', id);
  return id;
})();

let hasJoined = localStorage.getItem('nq-joined') === '1';
let pubData = null;
let viewData = null;

let r1State = { qid: null, draft: [], seq: null };
let r2State = { qid: null, seq: null, revealedIndices: new Set() };

// Mute / Sound Setup
Sound.paint($('#muteBtn'));
$('#muteBtn').onclick = () => Sound.toggle($('#muteBtn'));

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('hidden', v.id !== viewId);
  });
}

// Socket Connection & Resume
socket.on('connect', () => {
  socket.emit('public:join');
  if (hasJoined) {
    socket.emit('player:resume', { pid }, res => {
      if (res?.error) {
        hasJoined = false;
        localStorage.removeItem('nq-joined');
        showView('v-join');
      }
    });
  } else {
    showView('v-join');
  }
});

socket.on('public', p => {
  pubData = p;
  syncClock(p);
  populateJoinTeams();
  if (viewData && (viewData.phase === 'r1done' || viewData.phase === 'final')) {
    renderWaitRoom();
  }
});

socket.on('kicked', () => {
  hasJoined = false;
  localStorage.removeItem('nq-joined');
  viewData = null;
  $('#teamChip').classList.add('hidden');
  $('#scoreChip').classList.add('hidden');
  showView('v-join');
  toast('The arena was reset by the host. Please rejoin!');
});

// ---------- Join Form Logic ----------
function populateJoinTeams() {
  if (!pubData) return;
  const teamSelect = $('#jTeamSelect');
  const selectedCat = document.querySelector('input[name="jCat"]:checked')?.value || 'girls';

  const matchingTeams = pubData.teams.filter(t => t.category === selectedCat);
  const currentVal = teamSelect.value;

  teamSelect.innerHTML = matchingTeams.length > 0
    ? matchingTeams.map(t => `<option value="${t.id}">${esc(t.name)} (${t.members.length} members)</option>`).join('')
    : '<option value="">No teams in this league yet</option>';

  if (currentVal && matchingTeams.some(t => t.id === currentVal)) {
    teamSelect.value = currentVal;
  }
}

// Category change updates team select options
document.querySelectorAll('input[name="jCat"]').forEach(radio => {
  radio.onchange = () => populateJoinTeams();
});

// Mode Toggle: Existing Team vs Create New Team
$('#btnModeExisting').onclick = () => {
  $('#btnModeExisting').classList.add('active');
  $('#btnModeNew').classList.remove('active');
  $('#wrapExistingTeam').classList.remove('hidden');
  $('#wrapNewTeam').classList.add('hidden');
  $('#jTeamSelect').required = true;
  $('#jNewTeamName').required = false;
};

$('#btnModeNew').onclick = () => {
  $('#btnModeNew').classList.add('active');
  $('#btnModeExisting').classList.remove('active');
  $('#wrapExistingTeam').classList.add('hidden');
  $('#wrapNewTeam').classList.remove('hidden');
  $('#jTeamSelect').required = false;
  $('#jNewTeamName').required = true;
};

$('#joinForm').onsubmit = e => {
  e.preventDefault();
  Sound.click();

  const name = $('#jName').value.trim();
  const category = document.querySelector('input[name="jCat"]:checked').value;
  const isNewMode = $('#btnModeNew').classList.contains('active');
  const teamId = isNewMode ? null : $('#jTeamSelect').value;
  const newTeamName = isNewMode ? $('#jNewTeamName').value.trim() : null;
  const role = $('#jRole').value;

  if (!isNewMode && !teamId) {
    return toast('Please select an existing team or create a new one');
  }

  const payload = { pid, name, teamId, newTeamName, category, role };

  socket.emit('player:join', payload, res => {
    if (res?.error) {
      $('#jErr').textContent = res.error;
      return;
    }
    $('#jErr').textContent = '';
    hasJoined = true;
    localStorage.setItem('nq-joined', '1');
    localStorage.setItem('nq-name', name);
  });
};

$('#leaveBtn').onclick = () => {
  if (confirm('Leave your squad and switch teams?')) {
    socket.emit('player:leave');
    hasJoined = false;
    localStorage.removeItem('nq-joined');
    viewData = null;
    $('#teamChip').classList.add('hidden');
    $('#scoreChip').classList.add('hidden');
    showView('v-join');
  }
};

// ---------- Server State Sync ----------
socket.on('team', v => {
  const prevPhase = viewData?.phase;
  viewData = v;
  syncClock(v);

  // Update top bar chips
  $('#teamChip').textContent = v.team.name;
  $('#teamChip').classList.remove('hidden');
  $('#scoreChip').textContent = `${v.team.total} PTS`;
  $('#scoreChip').classList.remove('hidden');

  $('#paused').classList.toggle('hidden', !v.paused);

  const phaseLabels = {
    lobby: 'LOBBY',
    r1: 'ROUND 01 · PICTURE CONNECT',
    r1done: 'ROUND 01 COMPLETE',
    r2: 'ROUND 02 · HANGMAN',
    final: 'FINAL CHAMPIONSHIP'
  };
  $('#roundLabel').textContent = phaseLabels[v.phase] || 'NLP QUEST';

  if (prevPhase && prevPhase !== v.phase) {
    Sound.jingle();
  }

  if (v.phase === 'r1' && v.r1) {
    return v.r1.done ? renderDoneScreen(1) : renderRound1();
  }
  if (v.phase === 'r2' && v.r2) {
    return v.r2.done ? renderDoneScreen(2) : renderRound2();
  }

  renderWaitRoom();
});

// ---------- View 2: Lobby Wait Room ----------
function renderWaitRoom() {
  const v = viewData;
  if (!v) return;

  showView('v-wait');
  $('#wTeam').textContent = v.team.name;
  const isGirls = v.team.category === 'girls';
  $('#wCat').textContent = isGirls ? '🌸 GIRLS\' LEAGUE' : '⚡ BOYS\' LEAGUE';
  $('#wCat').className = `team-cat-pill ${isGirls ? 'pill-girls' : 'pill-boys'}`;

  const titles = {
    lobby: ['Squad Ready!', 'Waiting for the host to launch Round 1: Picture Connect.'],
    r1done: ['Round 1 Complete!', 'Great work! Round 2: Hangman will begin shortly.'],
    final: ['Arena Tournament Complete! 🏆', 'Check the main projector screen for the champion awards.']
  };
  const t = titles[v.phase] || ['Get Ready', 'Waiting for next round…'];
  $('#wTitle').textContent = t[0];
  $('#wSub').textContent = t[1];

  $('#wMembers').innerHTML = v.members.map(m => `
    <li>
      <span>${m.online ? '🟢' : '⚪'} ${esc(m.name)}</span>
      <small class="muted">${esc(m.role || 'Member')}</small>
    </li>
  `).join('');

  $('#wScores').innerHTML = v.phase === 'lobby' ? '' : `
    <div><span>ROUND 1</span><b>${v.team.score1}</b></div>
    <div><span>ROUND 2</span><b>${v.team.score2}</b></div>
    <div><span>TOTAL</span><b>${v.team.total}</b></div>
  `;

  $('#leaveBtn').classList.toggle('hidden', v.phase !== 'lobby');
}

function renderDoneScreen(roundNum) {
  showView('v-done');
  $('#dTitle').textContent = `Round ${roundNum} Finished for Your Squad!`;
  $('#dSub').textContent = roundNum === 1
    ? 'All 15 picture connections solved! Take a breather while other teams finish.'
    : 'All Hangman terms completed! Watch the live projector screen for the final standings.';

  $('#dScores').innerHTML = `
    <div><span>ROUND 1</span><b>${viewData.team.score1}</b></div>
    <div><span>ROUND 2</span><b>${viewData.team.score2}</b></div>
    <div><span>TOTAL</span><b>${viewData.team.total}</b></div>
  `;
}

// ---------- View 3: Round 1 — Picture Connect ----------
const ROWS_KBD = 'QWERTYUIOPASDFGHJKLZXCVBNM';

function setupVirtualKeyboard(container, onKeyAction, extraButtons = '') {
  container.innerHTML = [...ROWS_KBD].map(c => `<button data-key="${c}">${c}</button>`).join('') + extraButtons;
  container.onclick = e => {
    const btn = e.target.closest('button');
    if (btn && !btn.disabled) {
      Sound.click();
      onKeyAction(btn.dataset.key);
    }
  };
}

setupVirtualKeyboard(
  $('#r1Kbd'),
  k => handleR1Key(k),
  `<button data-key="BACK" class="wide-btn" aria-label="Backspace">⌫ Back</button>
   <button data-key="CLEAR" class="wide-btn" aria-label="Clear">Clear</button>`
);

function getR1WordLengths() {
  return viewData?.r1?.q?.words || [];
}
function getR1TotalLetters() {
  return getR1WordLengths().reduce((sum, n) => sum + n, 0);
}

function handleR1Key(k) {
  if (!viewData?.r1?.q || viewData.paused) return;
  const totalSlots = getR1TotalLetters();

  if (k === 'BACK') {
    r1State.draft.pop();
  } else if (k === 'CLEAR') {
    r1State.draft = [];
  } else if (k === 'ENTER') {
    return submitR1Answer();
  } else if (/^[A-Z]$/.test(k) && r1State.draft.length < totalSlots) {
    r1State.draft.push(k);
  }
  paintR1Slots();
}

function submitR1Answer() {
  if (r1State.draft.length !== getR1TotalLetters()) {
    triggerShakeR1();
    return toast('Please fill in every letter slot first');
  }
  socket.emit('r1:submit', r1State.draft.join(''));
}

function triggerShakeR1() {
  const el = $('#r1Slots');
  el.classList.remove('shake-no');
  void el.offsetWidth;
  el.classList.add('shake-no');
}

$('#r1Submit').onclick = submitR1Answer;
$('#r1HintBtn').onclick = () => {
  Sound.click();
  socket.emit('r1:hint');
};
$('#r1Skip').onclick = () => {
  if (confirm('Skip this question? You will score 0 points for it.')) {
    socket.emit('r1:skip');
  }
};

function paintR1Slots() {
  const q = viewData?.r1?.q;
  if (!q) return;

  let charIndex = 0;
  $('#r1Slots').innerHTML = q.words.map(len => `
    <div class="word-group">
      ${Array.from({ length: len }, () => {
        const char = r1State.draft[charIndex];
        const isCurrent = charIndex === r1State.draft.length;
        charIndex++;
        return `<div class="slot ${char ? 'f' : ''} ${isCurrent ? 'cur' : ''}">${char || ''}</div>`;
      }).join('')}
    </div>
  `).join('');
}

function renderRound1() {
  showView('v-r1');
  const d = viewData.r1;
  const q = d.q;

  // Process server feedback on previous submission
  if (r1State.seq !== null && d.seq !== r1State.seq && d.last) {
    const L = d.last;
    if (L.ok) {
      Sound.good();
      $('#r1Slots').classList.add('correct');
      triggerFeedback(true, `${L.answer} (+${L.pts} pts)`, L.firstTry ? '⚡ First-Attempt Bonus (+20)!' : 'Correct Connection!');
    } else if (L.out || L.skipped) {
      Sound.bad();
      triggerFeedback(false, `Answer: ${L.answer}`, L.skipped ? 'Skipped' : 'Out of attempts (0 pts)');
    } else {
      Sound.bad();
      triggerShakeR1();
      triggerFeedback(false, 'Not quite right!', `${L.left} attempt${L.left === 1 ? '' : 's'} remaining`);
    }
  }
  r1State.seq = d.seq;

  // Counters & Tags
  $('#r1Count').textContent = `Question ${d.idx + 1} / ${d.total}`;
  $('#r1Bar').style.width = `${(d.idx / d.total) * 100}%`;
  $('#r1Unit').textContent = `UNIT ${ROMAN[q.unit]} · ${q.unitName.toUpperCase()}`;
  $('#r1Tag').textContent = q.tag;

  // Render 4 Visual Illustration Cards if changed
  if (r1State.qid !== q.id) {
    r1State.qid = q.id;
    r1State.draft = [];
    $('#r1Slots').classList.remove('correct');
    $('#r1Slots').classList.remove('shake-no');

    $('#r1Pics').innerHTML = (q.illustrations || []).map(svgStr => `
      <div class="pic-card">${svgStr}</div>
    `).join('');
  }

  paintR1Slots();

  // Hint display
  $('#r1Hint').classList.toggle('hidden', !q.hint);
  $('#r1Hint').textContent = q.hint ? `💡 HINT: ${q.hint}` : '';
  $('#r1HintBtn').disabled = !!q.hint;

  // Attempts info
  const attemptsLeft = q.maxAttempts - q.attempts;
  const ptsPossible = (q.hint ? 60 : 100) + (q.attempts === 0 ? 20 : 0);
  $('#r1Att').textContent = `Attempts left: ${attemptsLeft} · Potential points: ${ptsPossible} pts`;
}

// ---------- View 4: Round 2 — Hangman ----------
setupVirtualKeyboard($('#r2Kbd'), k => {
  socket.emit('r2:guess', k);
});

$('#r2HintBtn').onclick = () => {
  Sound.click();
  socket.emit('r2:hint');
};
$('#r2Skip').onclick = () => {
  if (confirm('Skip this word? You will score 0 points for it.')) {
    socket.emit('r2:next', true);
  }
};
$('#r2Next').onclick = () => {
  Sound.click();
  socket.emit('r2:next');
};

function renderRound2() {
  showView('v-r2');
  const d = viewData.r2;
  const q = d.q;

  const isNewQuestion = r2State.qid !== q.id;
  if (isNewQuestion) {
    r2State.qid = q.id;
    r2State.revealedIndices = new Set();
  }

  // Handle server feedback
  if (r2State.seq !== null && d.seq !== r2State.seq && d.last) {
    const L = d.last;
    if (L.ok) {
      Sound.good();
      triggerFeedback(true, `${L.answer} (+${L.pts} pts)`, `Word Complete! (+${L.unusedTries * 10} unused attempts bonus)`);
    } else if (L.skipped) {
      triggerFeedback(false, `Answer: ${L.answer}`, 'Skipped word (0 pts)');
    } else {
      Sound.bad();
      triggerFeedback(false, `Answer: ${L.answer}`, 'Out of tries (0 pts)');
    }
  }
  r2State.seq = d.seq;

  // Counters & Tags
  $('#r2Count').textContent = `Word ${d.idx + 1} / ${d.total}`;
  $('#r2Bar').style.width = `${(d.idx / d.total) * 100}%`;
  $('#r2Unit').textContent = `UNIT ${ROMAN[q.unit]} · ${q.unitName.toUpperCase()}`;
  $('#r2Diff').textContent = q.difficulty === 'easy' ? 'EASY' : 'INTERMEDIATE';

  // Clue & Lives
  $('#r2Clue').textContent = q.clue;
  const triesLeft = q.maxWrong - q.wrong;
  $('#r2Lives').textContent = q.status === 'playing'
    ? `${'❤️'.repeat(triesLeft)}${'🤍'.repeat(q.wrong)}  (${triesLeft} tries remaining)`
    : q.status === 'won' ? '🎉 Word Solved!' : '😮 Out of tries';

  // Progressive Mascot SVG Drawing (6 stages)
  const svg = $('#hangSvg');
  for (let i = 1; i <= 6; i++) {
    const part = svg.querySelector(`.hm-p${i}`);
    if (part) {
      part.classList.toggle('on', q.wrong >= i);
    }
  }
  svg.classList.toggle('won', q.status === 'won');

  // Word Slots with Letter Flip Animation
  const words = [];
  let currentWord = [];
  q.pattern.forEach((char, idx) => {
    if (char === ' ') {
      words.push(currentWord);
      currentWord = [];
    } else {
      currentWord.push([char, idx]);
    }
  });
  words.push(currentWord);

  $('#r2Word').innerHTML = words.map(w => `
    <div class="word-group">
      ${w.map(([char, idx]) => {
        const isLetter = char !== '_';
        const isNewlyRevealed = isLetter && !r2State.revealedIndices.has(idx);
        if (isLetter) r2State.revealedIndices.add(idx);
        return `<div class="slot ${isLetter ? 'f' : ''} ${isNewlyRevealed && !isNewQuestion ? 'flip' : ''}">${isLetter ? char : ''}</div>`;
      }).join('')}
    </div>
  `).join('');

  // Keyboard Buttons Hit / Miss State
  const guessedSet = new Set(q.guessed || []);
  const answerLetters = new Set(q.pattern.filter(c => /[A-Z]/.test(c)));

  document.querySelectorAll('#r2Kbd button').forEach(btn => {
    const char = btn.dataset.key;
    const isGuessed = guessedSet.has(char);
    btn.className = isGuessed ? (answerLetters.has(char) ? 'hit' : 'miss') : '';
    btn.disabled = isGuessed || q.status !== 'playing';
  });

  $('#r2HintBtn').disabled = q.hint || q.status !== 'playing';
  $('#r2Actions').classList.toggle('hidden', q.status !== 'playing');
  $('#r2NextWrap').classList.toggle('hidden', q.status === 'playing');
  $('#r2Next').textContent = d.idx + 1 >= d.total ? 'Finish Hangman Round ✓' : 'Next Word →';
}

// ---------- Physical Keyboard Input ----------
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toUpperCase();

  if (viewData?.phase === 'r1' && viewData.r1?.q) {
    if (key === 'BACKSPACE') handleR1Key('BACK');
    else if (key === 'ENTER') handleR1Key('ENTER');
    else if (/^[A-Z]$/.test(key)) handleR1Key(key);
    else return;
    e.preventDefault();
  } else if (viewData?.phase === 'r2' && viewData.r2?.q) {
    if (/^[A-Z]$/.test(key) && viewData.r2.q.status === 'playing') {
      socket.emit('r2:guess', key);
    } else if (key === 'ENTER' && viewData.r2.q.status !== 'playing') {
      socket.emit('r2:next');
    }
  }
});

// Toast / Notification Banners
function triggerFeedback(isSuccess, title, subtitle) {
  const el = $('#fb');
  el.className = `feedback-banner ${isSuccess ? 'good' : 'bad'}`;
  el.innerHTML = `${isSuccess ? '✓ ' : '✗ '} <span>${esc(title)}</span> ${subtitle ? `<small style="display:block;font-size:12px;opacity:0.9;">${esc(subtitle)}</small>` : ''}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2400);
}

// Timer countdown tick
setInterval(() => {
  const timerEl = $('#timer');
  if (!viewData) return;

  const ms = (viewData.phase === 'r1' || viewData.phase === 'r2') ? remainingMs(viewData) : null;
  timerEl.classList.toggle('hidden', ms === null);

  if (ms !== null) {
    timerEl.textContent = (viewData.paused ? '⏸ ' : '⏱ ') + fmt(ms);
    timerEl.classList.toggle('low', ms < 60000 && !viewData.paused);
  }
}, 250);
