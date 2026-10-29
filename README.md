# ANALYSIS THE TEXTS

A two-round NLP / Text Analytics game played on the lab LAN. **Every player plays solo for their department arena.**

1. **Join (Kahoot-style):** the player opens the address shown on the projector and types the **6-digit game PIN**. Then they type their name, pick their department arena (CSE, IT, AIDS, BME …) and pick their section. A "Welcome to CSE Arena" splash appears and the player is in.
2. **Lobby (projector):** the join address, a big game PIN, and every arena with the players who have joined.
3. **Round 1 – Picture Connect (15 questions, 3 per unit):** the projector shows the arena battle (average points per player), the top players inside each arena, the Round 1 top 5 and a live feed.
4. **Round 2 – Hangman (25 words, never repeating Round 1 answers):** individual scoring. Round 1 points carry over, and everyone is ranked on one overall leaderboard.
5. **Final:** a **top-5 podium** (name and department) and the **department leaders** (the best player of every department, with arenas ranked).

## Run it

1. Install Node.js 18+ on the host laptop (once).
2. Double-click `start.bat` (or run `npm install` once, then `npm start`).
3. On the projector, open **http://localhost:3000/host**. Do not double-click the HTML files: they only work when the server serves them.
4. Press **H** (or the ⚙ button at the bottom right) to open the host controls. The host PIN is **2468** (this is not the game PIN).
5. Players type the address shown on the projector (for example `http://10.223.113.107:3000`) into a browser on a lab PC, then enter the game PIN.

If players can't connect:
- Make sure they are on the same Wi-Fi/LAN as the host laptop.
- Allow Node.js through Windows Firewall for Private networks.
- Try the "or …" address shown under the main one.

To change the host PIN or port, run: `set HOST_PIN=9999 && set PORT=8080 && node server.js`

## Host flow

Lobby → **Start Round 1** → (Pause / Resume / +1 min / End round) → Round 1 results → **Start Round 2** → **End & show champions** → **⬇ CSV**.

- **🔄 New PIN**: issue a fresh game PIN. Players already in stay in; new joiners need the new PIN. During the rounds the PIN stays in the projector header for late joiners.
- **Players** panel: search for a player, adjust their score (±) or remove them.
- **Settings** panel: change the department and section lists and the round lengths, and start a new match (keep players) or wipe everything.
- A round ends by itself when its timer runs out or when every player has finished.
- The game state is saved to `data/state.json`. If the server or projector restarts, the game resumes where it stopped.
  Players who refresh go straight back in.

## Scoring (calculated on the server only)

| Round 1 | | Round 2 | |
|---|---|---|---|
| Correct, no hint | +100 | Word completed | +100 |
| Correct with hint | +60 | Each life left (of 6) | +10 |
| First-attempt bonus | +20 | Reveal-a-letter hint | −20 |
| 3 wrong attempts / skip | 0 | Out of lives / skip | 0 |

Streaks 🔥 (correct answers in a row) are shown for fun. They don't change the score.
Arenas are ranked by **average points per player**, so a small department can beat a big one.

## Editing questions

- `questions.js` holds the question banks. Add more entries, and each match picks a set number per unit.
- `illustrations.js` holds the SVG picture cards for each Round 1 question.

## Testing

`npm test` starts a private server on port 3999 (with its own save file) and plays a full 60-player match. It checks:
- the PIN rules
- every scoring rule
- the question mix per unit, and no repeats between rounds
- that the pictures and clues don't give answers away
- automatic round endings
- the CSV export
- that the game survives a server restart
- both host resets
