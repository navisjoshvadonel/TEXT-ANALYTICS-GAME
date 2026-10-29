// Automated test for Single Player (Solo Host) Mode
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const http = require('http');
const { CONNECT, HANGMAN, UNITS } = require('../questions');
const { ILLUSTRATIONS } = require('../illustrations');

const PORT = 4001;
const STATE = path.join(os.tmpdir(), `att-solo-test-${Date.now()}.json`);
const clean = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '');

let srv;
function startServer() {
  return new Promise((resolve, reject) => {
    srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: { ...process.env, PORT, STATE_FILE: STATE },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    srv.stdout.on('data', d => String(d).includes('is running') && resolve());
    srv.stderr.on('data', d => console.error(String(d)));
    srv.on('exit', c => c && reject(new Error('server exited ' + c)));
  });
}
const stopServer = () => new Promise(r => { srv.once('exit', r); srv.kill(); });

function getJson(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${endpoint}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

let passes = 0, fails = 0;
const ok = (cond, msg) => {
  if (cond) {
    passes++;
    console.log('  ✓ ' + msg);
  } else {
    fails++;
    console.error('  ✗ ' + msg);
  }
};

async function run() {
  console.log('\n• Testing Single Player (Solo Host) Mode Endpoint & Data Integrity');
  await startServer();

  try {
    const data = await getJson('/api/solo-data');

    // 1. Check units
    ok(Object.keys(data.units).length === 5, 'Solo data contains 5 units');
    for (let u = 1; u <= 5; u++) {
      ok(typeof data.units[u] === 'string' && data.units[u].length > 0, `Unit ${u} has valid name: ${data.units[u]}`);
    }

    // 2. Check Round 1 Connect questions
    ok(data.connect.length === 15, 'Connect has exactly 15 questions');
    for (let u = 1; u <= 5; u++) {
      const uQs = data.connect.filter(q => q.unit === u);
      ok(uQs.length === 3, `Unit ${u} has 3 Picture Connect questions`);
    }

    // 3. Check Picture Clues
    let picCount = 0;
    for (const q of data.connect) {
      const pics = data.pics[q.id];
      ok(pics && pics.length >= 2, `Question ${q.id} (${q.answer}) has at least 2 clue SVGs`);
      // Check that answer is stripped from clue text
      const leaked = pics.some(svg => svg.includes(`>${q.answer}<`));
      ok(!leaked, `Question ${q.id} clue SVGs do not leak the answer text`);
      picCount += pics ? pics.length : 0;
    }
    ok(picCount >= 30, `Total clue SVGs generated: ${picCount}`);

    // 4. Check Round 2 Hangman questions
    ok(data.hangman.length === 25, 'Hangman has exactly 25 questions');
    for (let u = 1; u <= 5; u++) {
      const uQs = data.hangman.filter(q => q.unit === u);
      ok(uQs.length === 5, `Unit ${u} has 5 Hangman questions`);
    }

    // 5. Check no overlap between Connect and Hangman
    const cSet = new Set(data.connect.map(q => clean(q.answer)));
    const hSet = new Set(data.hangman.map(q => clean(q.answer)));
    let overlaps = 0;
    for (const a of cSet) {
      if (hSet.has(a)) overlaps++;
    }
    ok(overlaps === 0, 'Zero overlap between Picture Connect answers and Hangman answers');

    // 6. Simulate PickPerUnitSolo logic
    function pickPerUnitSolo(bank, perUnit) {
      const result = [];
      for (let u = 1; u <= 5; u++) {
        const list = bank.filter(q => q.unit == u);
        const easy = list.filter(q => q.difficulty === 'easy');
        const mid = list.filter(q => q.difficulty !== 'easy');
        result.push(...[...easy, ...mid].slice(0, perUnit));
      }
      return result;
    }

    const r1List = pickPerUnitSolo(data.connect, 3);
    const r2List = pickPerUnitSolo(data.hangman, 5);
    ok(r1List.length === 15, 'Solo Round 1 generates exactly 15 questions');
    ok(r2List.length === 25, 'Solo Round 2 generates exactly 25 questions');

    console.log(`\nResults: ${passes} passed, ${fails} failed`);
    if (fails > 0) process.exit(1);
  } finally {
    await stopServer();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

