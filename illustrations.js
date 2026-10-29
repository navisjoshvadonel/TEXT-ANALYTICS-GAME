// Round 1 — Picture Connect clue cards.
// Each answer has 4 concrete picture clues (a scene, a pun, a diagram, an example) that together point to the term.
// Cards never spell the answer. Pure inline SVG (+ system emoji glyphs), so it works fully offline.

const C = {
  blue: '#5778D4', blueD: '#3A58AB', blueL: '#E6ECFB',
  mint: '#5DBB9C', mintD: '#2F8C6E', mintL: '#E3F5EE',
  yel: '#F3C969', yelD: '#C79727', yelL: '#FEF5DD',
  cor: '#E78474', corD: '#C45746', corL: '#FDE9E5',
  pur: '#8B6FD6', purL: '#EFEAFB',
  ink: '#2A3042', slate: '#7A8094', line: '#DCE0E8', bg: '#FFFFFF',
};
const F = `font-family="Nunito,'Segoe UI',sans-serif" font-weight="800"`;

const card = (body, bg = C.bg) =>
  `<svg viewBox="0 0 160 140" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img">` +
  `<rect width="160" height="140" rx="14" fill="${bg}"/>${body}</svg>`;
const emoji = (x, y, size, ch) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${ch}</text>`;
const word = (x, y, w, txt, fill, stroke, size = 11, color = C.ink) =>
  `<rect x="${x}" y="${y}" width="${w}" height="22" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
  `<text x="${x + w / 2}" y="${y + 15.5}" text-anchor="middle" ${F} font-size="${size}" fill="${color}">${txt}</text>`;
const label = (x, y, txt, size = 11, color = C.ink, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" ${F} font-size="${size}" fill="${color}">${txt}</text>`;
const arrow = (x1, y1, x2, y2, color = C.slate, w = 2.5) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
  const p1 = [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)], p2 = [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${p1} L${x2},${y2} L${p2}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const page = (x, y, w, h, lines = 4, accent = C.blue) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#fff" stroke="${C.line}" stroke-width="2"/>`;
  for (let i = 0; i < lines; i++) s += `<rect x="${x + 7}" y="${y + 9 + i * 9}" width="${(w - 14) * (i % 2 ? .7 : 1)}" height="4" rx="2" fill="${i ? C.line : accent}"/>`;
  return s;
};
const face = (x, y, r, color, mood) => {
  const mouth = mood === 'happy' ? `M${x - r * .45},${y + r * .2} Q${x},${y + r * .7} ${x + r * .45},${y + r * .2}`
    : mood === 'sad' ? `M${x - r * .45},${y + r * .5} Q${x},${y + r * .05} ${x + r * .45},${y + r * .5}`
    : `M${x - r * .4},${y + r * .35} L${x + r * .4},${y + r * .35}`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>` + dot(x - r * .35, y - r * .2, r * .11, C.ink) + dot(x + r * .35, y - r * .2, r * .11, C.ink) +
    `<path d="${mouth}" fill="none" stroke="${C.ink}" stroke-width="${r * .12}" stroke-linecap="round"/>`;
};
const person = (x, y, color, s = 1) => `<circle cx="${x}" cy="${y - 14 * s}" r="${9 * s}" fill="${color}"/><path d="M${x - 15 * s},${y + 14 * s} Q${x - 15 * s},${y - 2 * s} ${x},${y - 2 * s} Q${x + 15 * s},${y - 2 * s} ${x + 15 * s},${y + 14 * s} Z" fill="${color}"/>`;

const ILLUSTRATIONS = {
  // ---------- UNIT I ----------
  C01: [ // TOKENIZATION
    card(word(10, 40, 34, 'I', C.blueL, C.blue) + word(48, 40, 46, 'love', C.blueL, C.blue) + word(98, 40, 50, 'NLP', C.blueL, C.blue) +
      `<line x1="46" y1="30" x2="46" y2="72" stroke="${C.cor}" stroke-width="2" stroke-dasharray="4 3"/><line x1="96" y1="30" x2="96" y2="72" stroke="${C.cor}" stroke-width="2" stroke-dasharray="4 3"/>` +
      emoji(46, 92, 26, '✂️') + emoji(96, 92, 26, '✂️')),
    card(`<rect x="14" y="22" width="132" height="26" rx="7" fill="${C.yelL}" stroke="${C.yelD}" stroke-width="2"/>` + label(80, 40, 'Text is fun!', 13) +
      arrow(80, 54, 80, 72) + word(10, 80, 38, 'Text', C.mintL, C.mint) + word(52, 80, 26, 'is', C.mintL, C.mint) + word(82, 80, 34, 'fun', C.mintL, C.mint) + word(120, 80, 22, '!', C.mintL, C.mint)),
    card(`<circle cx="80" cy="68" r="40" fill="${C.yel}" stroke="${C.yelD}" stroke-width="5"/><circle cx="80" cy="68" r="29" fill="none" stroke="${C.yelD}" stroke-width="2" stroke-dasharray="5 4"/>` +
      label(80, 77, '1', 30, C.yelD) + emoji(130, 24, 18, '🎮'), C.yelL),
    card(word(14, 18, 40, 'I', C.purL, C.pur) + word(14, 58, 40, 'love', C.purL, C.pur) + word(14, 98, 40, 'NLP', C.purL, C.pur) +
      arrow(60, 29, 92, 29) + arrow(60, 69, 92, 69) + arrow(60, 109, 92, 109) +
      `<rect x="100" y="18" width="40" height="22" rx="11" fill="${C.pur}"/><rect x="100" y="58" width="40" height="22" rx="11" fill="${C.pur}"/><rect x="100" y="98" width="40" height="22" rx="11" fill="${C.pur}"/>` +
      label(120, 33.5, '#1', 12, '#fff') + label(120, 73.5, '#2', 12, '#fff') + label(120, 113.5, '#3', 12, '#fff')),
  ],
  C02: [ // CHUNKING
    card(`<g transform="rotate(-8 80 70)">` +
      [0, 1, 2].map(i => `<rect x="${22 + i * 40}" y="38" width="36" height="28" rx="4" fill="#7B4A2E"/><rect x="${26 + i * 40}" y="42" width="28" height="20" rx="3" fill="#94603F"/>`).join('') +
      `<g transform="translate(14 14) rotate(14 120 92)"><rect x="102" y="78" width="36" height="28" rx="4" fill="#7B4A2E"/><rect x="106" y="82" width="28" height="20" rx="3" fill="#94603F"/></g></g>` +
      emoji(36, 108, 20, '💥')),
    card(word(6, 30, 30, 'the', '#fff', C.line, 10) + word(38, 30, 30, 'big', '#fff', C.line, 10) + word(70, 30, 30, 'dog', '#fff', C.line, 10) + word(110, 30, 44, 'barks', '#fff', C.line, 10) +
      `<path d="M8 60 L8 68 L98 68 L98 60" fill="none" stroke="${C.mint}" stroke-width="3"/><path d="M112 60 L112 68 L152 68 L152 60" fill="none" stroke="${C.cor}" stroke-width="3"/>` +
      `<rect x="30" y="78" width="46" height="24" rx="12" fill="${C.mint}"/>` + label(53, 94, 'NP', 13, '#fff') +
      `<rect x="109" y="78" width="46" height="24" rx="12" fill="${C.cor}"/>` + label(132, 94, 'VP', 13, '#fff')),
    card(`<rect x="10" y="20" width="140" height="100" rx="10" fill="${C.blueL}"/>` +
      [[18, 30, C.mint], [58, 30, C.mint], [98, 30, C.cor], [18, 74, C.yel], [58, 74, C.yel], [98, 74, C.yel]].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="36" height="36" rx="8" fill="${c}"/>`).join('') +
      `<rect x="14" y="26" width="84" height="44" rx="10" fill="none" stroke="${C.mintD}" stroke-width="2.5" stroke-dasharray="5 3"/>` +
      `<rect x="14" y="70" width="124" height="44" rx="10" fill="none" stroke="${C.yelD}" stroke-width="2.5" stroke-dasharray="5 3"/>`),
    card(`<path d="M28 44 h28 a10 10 0 1 1 20 0 h28 v28 a10 10 0 1 0 0 20 v28 h-76 z" fill="${C.blue}"/>` +
      `<path d="M104 44 h28 v76 h-28 v-28 a10 10 0 1 1 0 -20 z" fill="${C.mint}" transform="translate(6 0)"/>` + emoji(80, 26, 18, '🧩')),
  ],
  C03: [ // PARSING
    card(dot(80, 22, 13, C.blue) + label(80, 27, 'S', 13, '#fff') +
      `<path d="M80 35 L42 58 M80 35 L118 58 M42 70 L24 98 M42 70 L60 98 M118 70 L118 98" stroke="${C.slate}" stroke-width="2.5"/>` +
      dot(42, 64, 12, C.mint) + label(42, 68.5, 'NP', 10, '#fff') + dot(118, 64, 12, C.cor) + label(118, 68.5, 'VP', 10, '#fff') +
      word(8, 100, 34, 'The', C.mintL, C.mint, 10) + word(45, 100, 34, 'cat', C.mintL, C.mint, 10) + word(100, 100, 36, 'sat', C.corL, C.cor, 10)),
    card(`<rect x="34" y="18" width="92" height="104" rx="8" fill="${C.cor}"/><rect x="42" y="18" width="84" height="104" rx="6" fill="${C.corL}"/>` +
      label(84, 48, 'Grammar', 14, C.corD) + `<line x1="54" y1="60" x2="114" y2="60" stroke="${C.cor}" stroke-width="3"/>` +
      label(84, 82, 'N  V  ADJ', 11, C.slate) + label(84, 102, 'S → NP VP', 11, C.slate)),
    card(page(14, 30, 92, 64, 5) + `<circle cx="102" cy="82" r="24" fill="${C.blueL}88" stroke="${C.blue}" stroke-width="5"/><line x1="119" y1="99" x2="142" y2="122" stroke="${C.blue}" stroke-width="9" stroke-linecap="round"/>` +
      label(96, 79, 'N', 12, C.blueD) + label(110, 92, 'V', 12, C.corD)),
    card(word(10, 96, 42, 'Dogs', C.yelL, C.yelD) + word(58, 96, 42, 'chase', C.yelL, C.yelD) + word(106, 96, 44, 'cats', C.yelL, C.yelD) +
      `<path d="M31 92 L31 70 M79 92 L79 70 M128 92 L128 70" stroke="${C.slate}" stroke-width="2"/>` +
      word(14, 46, 34, 'noun', C.mint, C.mint, 10, '#fff') + word(62, 46, 34, 'verb', C.cor, C.cor, 10, '#fff') + word(111, 46, 34, 'noun', C.mint, C.mint, 10, '#fff') +
      label(80, 30, 'who · does · what?', 11, C.slate)),
  ],
  // ---------- UNIT II ----------
  C04: [ // DECISION TREE
    card(`<path d="M80 50 L80 128" stroke="${C.slate}" stroke-width="5"/><path d="M80 128 L40 128 M80 128 L120 128" stroke="${C.line}" stroke-width="4"/>` +
      `<path d="M86 30 h50 l12 11 l-12 11 h-50 z" fill="${C.mint}"/>` + label(110, 46, 'YES', 12, '#fff') +
      `<path d="M74 58 h-50 l-12 11 l12 11 h50 z" fill="${C.cor}"/>` + label(48, 74, 'NO', 12, '#fff') + emoji(80, 106, 22, '🚶')),
    card(`<path d="M80 18 L110 40 L80 62 L50 40 Z" fill="${C.yel}"/>` + label(80, 45, '?', 16, C.ink) +
      `<path d="M58 52 L34 84 M102 52 L126 84" stroke="${C.slate}" stroke-width="2.5"/>` + label(38, 66, 'yes', 10, C.mintD) + label(124, 66, 'no', 10, C.corD) +
      `<rect x="10" y="86" width="48" height="26" rx="6" fill="${C.mint}"/>` + label(34, 103, 'SPAM', 10, '#fff') +
      `<rect x="102" y="86" width="48" height="26" rx="6" fill="${C.blue}"/>` + label(126, 103, 'INBOX', 10, '#fff')),
    card(`<rect x="72" y="80" width="16" height="44" rx="4" fill="#8A5A3B"/><path d="M80 92 L58 76 M80 100 L104 82" stroke="#8A5A3B" stroke-width="6" stroke-linecap="round"/>` +
      dot(80, 50, 32, C.mint) + dot(52, 66, 20, C.mintD) + dot(110, 66, 20, C.mintD) + dot(80, 34, 18, '#7ccdb2')),
    card(`<rect x="56" y="14" width="48" height="24" rx="6" fill="${C.ink}"/>` + label(80, 30, 'age > 18?', 9, '#fff') +
      `<path d="M80 38 L40 62 M80 38 L120 62 M40 82 L22 104 M40 82 L58 104" stroke="${C.slate}" stroke-width="2"/>` +
      `<rect x="18" y="60" width="44" height="22" rx="6" fill="${C.blue}"/>` + label(40, 75, 'likes?', 9, '#fff') +
      `<rect x="98" y="62" width="44" height="22" rx="11" fill="${C.cor}"/>` + label(120, 77, '🍃', 11) +
      `<rect x="2" y="104" width="38" height="22" rx="11" fill="${C.mint}"/><rect x="42" y="104" width="38" height="22" rx="11" fill="${C.mint}"/>` + label(21, 119, '🍃', 11) + label(61, 119, '🍃', 11)),
  ],
  C05: [ // NAIVE BAYES
    card(emoji(80, 66, 72, '👶') + emoji(126, 30, 22, '❓'), C.yelL),
    card(`<path d="M0 92 Q20 84 40 92 T80 92 T120 92 T160 92 V140 H0 Z" fill="${C.blue}"/><path d="M0 104 Q20 96 40 104 T80 104 T120 104 T160 104 V140 H0 Z" fill="${C.blueD}"/>` +
      `<path d="M0 92 Q30 60 70 88 L0 92 Z" fill="${C.mint}"/><path d="M160 92 Q130 54 92 88 L160 92 Z" fill="${C.mintD}"/>` + emoji(80, 74, 30, '⛵') + emoji(126, 26, 22, '☀️'), '#EAF4FF'),
    card(`<rect x="22" y="44" width="50" height="50" rx="10" fill="#fff" stroke="${C.cor}" stroke-width="3" transform="rotate(-10 47 69)"/>` + dot(36, 58, 5, C.cor) + dot(47, 69, 5, C.cor) + dot(58, 80, 5, C.cor) +
      `<rect x="88" y="40" width="50" height="50" rx="10" fill="#fff" stroke="${C.blue}" stroke-width="3" transform="rotate(12 113 65)"/>` + dot(102, 54, 5, C.blue) + dot(124, 54, 5, C.blue) + dot(102, 76, 5, C.blue) + dot(124, 76, 5, C.blue) +
      label(80, 122, 'P = 1/6', 13, C.slate)),
    card(emoji(30, 70, 34, '📧') + arrow(52, 62, 84, 40) + arrow(52, 78, 84, 100) +
      `<rect x="88" y="22" width="64" height="34" rx="8" fill="${C.corL}" stroke="${C.cor}" stroke-width="2"/>` + label(120, 37, 'SPAM', 11, C.corD) + label(120, 50, '92%', 11, C.corD) +
      `<rect x="88" y="84" width="64" height="34" rx="8" fill="${C.mintL}" stroke="${C.mint}" stroke-width="2"/>` + label(120, 99, 'NOT SPAM', 10, C.mintD) + label(120, 112, '8%', 11, C.mintD)),
  ],
  C06: [ // LOGISTIC REGRESSION
    card(emoji(80, 64, 70, '🚚') + `<rect x="0" y="108" width="160" height="32" fill="${C.line}"/><path d="M0 124 H160" stroke="#fff" stroke-width="3" stroke-dasharray="12 10"/>` + emoji(132, 26, 22, '📦'), C.yelL),
    card(`<path d="M24 20 V112 H148" fill="none" stroke="${C.ink}" stroke-width="2.5"/>` + label(16, 28, '1', 11) + label(16, 114, '0', 11) +
      `<path d="M28 108 C76 108 72 26 144 24" fill="none" stroke="${C.cor}" stroke-width="5" stroke-linecap="round"/>` +
      `<line x1="24" y1="66" x2="148" y2="66" stroke="${C.slate}" stroke-width="1.5" stroke-dasharray="4 4"/>` + label(126, 62, '0.5', 10, C.slate)),
    card(`<circle cx="80" cy="66" r="44" fill="${C.purL}"/>` + `<path d="M104 42 A34 34 0 1 0 112 80" fill="none" stroke="${C.pur}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M98 30 L106 44 L90 46" fill="none" stroke="${C.pur}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` + emoji(80, 66, 26, '⏪')),
    card(`<rect x="12" y="34" width="62" height="70" rx="12" fill="${C.mintL}" stroke="${C.mint}" stroke-width="2.5"/>` + emoji(43, 60, 30, '✅') + label(43, 94, 'PASS = 1', 10, C.mintD) +
      `<rect x="86" y="34" width="62" height="70" rx="12" fill="${C.corL}" stroke="${C.cor}" stroke-width="2.5"/>` + emoji(117, 60, 30, '❌') + label(117, 94, 'FAIL = 0', 10, C.corD) +
      label(80, 124, 'study hours → ?', 11, C.slate)),
  ],
  // ---------- UNIT III ----------
  C07: [ // CLUSTERING
    card(emoji(80, 70, 80, '🍇'), C.purL),
    card([[22, 30], [60, 98], [130, 40], [92, 22], [36, 110], [118, 108], [80, 62], [140, 84], [20, 70], [100, 86], [52, 44]].map(([x, y], i) => dot(x, y, 7, [C.blue, C.cor, C.mint, C.yel][i % 4])).join('') + emoji(140, 18, 16, '❓')),
    card(`<circle cx="44" cy="46" r="28" fill="${C.blueL}" stroke="${C.blue}" stroke-width="2" stroke-dasharray="5 3"/><circle cx="116" cy="46" r="28" fill="${C.corL}" stroke="${C.cor}" stroke-width="2" stroke-dasharray="5 3"/><circle cx="80" cy="104" r="28" fill="${C.mintL}" stroke="${C.mint}" stroke-width="2" stroke-dasharray="5 3"/>` +
      [[36, 40], [50, 52], [44, 34], [54, 40]].map(([x, y]) => dot(x, y, 6, C.blue)).join('') + [[108, 40], [124, 50], [116, 34], [110, 54]].map(([x, y]) => dot(x, y, 6, C.cor)).join('') + [[72, 100], [88, 108], [80, 94], [86, 98]].map(([x, y]) => dot(x, y, 6, C.mint)).join('')),
    card(`<rect width="160" height="140" rx="14" fill="#1F2540"/>` + [[50, 50, 3], [58, 44, 2], [44, 58, 2.5], [62, 56, 2], [54, 62, 1.8], [112, 86, 3], [120, 80, 2], [104, 92, 2.2], [118, 96, 1.8], [126, 90, 2], [24, 112, 1.2], [140, 24, 1.2], [90, 20, 1]].map(([x, y, r]) => dot(x, y, r, '#FFE9A8')).join('') +
      `<circle cx="53" cy="53" r="18" fill="none" stroke="#FFE9A855" stroke-width="1.5"/><circle cx="115" cy="88" r="18" fill="none" stroke="#FFE9A855" stroke-width="1.5"/>`, '#1F2540'),
  ],
  C08: [ // K MEANS
    card(`<rect x="36" y="22" width="88" height="62" rx="10" fill="${C.ink}"/>` + label(80, 66, 'k = 3', 26, '#fff') +
      `<rect x="48" y="96" width="18" height="18" rx="4" fill="${C.blue}"/><rect x="71" y="96" width="18" height="18" rx="4" fill="${C.cor}"/><rect x="94" y="96" width="18" height="18" rx="4" fill="${C.mint}"/>`),
    card([[[30, 38], [44, 30], [40, 50], [24, 52]], [[112, 34], [126, 44], [118, 26], [132, 30]], [[70, 104], [86, 112], [80, 96], [94, 102]]].map((g, i) => {
      const c = [C.blue, C.cor, C.mint][i], cx = g.reduce((a, p) => a + p[0], 0) / 4, cy = g.reduce((a, p) => a + p[1], 0) / 4;
      return g.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${cx}" y2="${cy}" stroke="${c}" stroke-width="1.5" opacity=".6"/>` + dot(x, y, 5, c)).join('') +
        `<path d="M${cx - 7},${cy - 7} L${cx + 7},${cy + 7} M${cx + 7},${cy - 7} L${cx - 7},${cy + 7}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`;
    }).join('')),
    card(label(80, 46, '2 + 4 + 6', 18, C.ink) + `<line x1="34" y1="58" x2="126" y2="58" stroke="${C.ink}" stroke-width="3"/>` + label(80, 84, '3', 20) +
      `<rect x="44" y="96" width="72" height="30" rx="15" fill="${C.yel}"/>` + label(80, 117, 'avg = 4', 14, C.ink), C.yelL),
    card(`<circle cx="80" cy="70" r="46" fill="#fff" stroke="${C.cor}" stroke-width="6"/><circle cx="80" cy="70" r="30" fill="none" stroke="${C.cor}" stroke-width="6"/>` + dot(80, 70, 11, C.cor) + emoji(118, 34, 30, '🎯')),
  ],
  C09: [ // HIERARCHICAL CLUSTERING
    card(`<path d="M20 116 V86 H44 V116 M32 86 V60 H72 V116 M52 60 V36 H124 M104 116 V80 H140 V116 M122 80 V36" fill="none" stroke="${C.blue}" stroke-width="3.5" stroke-linejoin="round"/>` +
      [20, 44, 72, 104, 140].map(x => dot(x, 118, 6, C.cor)).join('') + dot(88, 36, 7, C.ink)),
    card(person(80, 34, C.pur, .8) + `<path d="M80 50 V60 M40 60 H120 M40 60 V70 M120 60 V70" stroke="${C.slate}" stroke-width="2.5" fill="none"/>` +
      person(40, 86, C.blue, .7) + person(120, 86, C.cor, .7) + `<path d="M120 100 V108 M100 108 H140 M100 108 V114 M140 108 V114" stroke="${C.slate}" stroke-width="2" fill="none"/>` +
      dot(100, 122, 6, C.mint) + dot(140, 122, 6, C.mint)),
    card(emoji(80, 74, 76, '🪆') + emoji(132, 30, 26, '🪆') + emoji(140, 54, 16, '🪆'), C.corL),
    card(`<rect x="8" y="12" width="144" height="118" rx="12" fill="${C.blueL}" stroke="${C.blue}" stroke-width="2"/>` +
      `<rect x="16" y="22" width="64" height="98" rx="10" fill="${C.mintL}" stroke="${C.mint}" stroke-width="2"/><rect x="88" y="22" width="56" height="98" rx="10" fill="${C.corL}" stroke="${C.cor}" stroke-width="2"/>` +
      `<rect x="22" y="30" width="52" height="38" rx="8" fill="#fff" stroke="${C.mintD}" stroke-width="2"/>` + dot(36, 49, 6, C.mintD) + dot(56, 49, 6, C.mintD) + dot(36, 92, 6, C.mint) + dot(58, 100, 6, C.mint) +
      dot(104, 50, 6, C.cor) + dot(126, 62, 6, C.cor) + dot(112, 96, 6, C.cor)),
  ],
  // ---------- UNIT IV ----------
  C10: [ // TOPIC MODELLING
    card(emoji(52, 64, 54, '📰') + emoji(110, 78, 54, '📰') + emoji(132, 26, 20, '📚')),
    card(page(12, 18, 64, 104, 0) +
      `<rect x="20" y="28" width="30" height="6" rx="3" fill="${C.blue}"/><rect x="20" y="40" width="46" height="6" rx="3" fill="${C.cor}"/><rect x="20" y="52" width="22" height="6" rx="3" fill="${C.mint}"/><rect x="20" y="64" width="40" height="6" rx="3" fill="${C.blue}"/><rect x="20" y="76" width="34" height="6" rx="3" fill="${C.cor}"/><rect x="20" y="88" width="44" height="6" rx="3" fill="${C.blue}"/>` +
      `<circle cx="120" cy="34" r="20" fill="${C.blue}"/>` + emoji(120, 34, 20, '⚽') + `<circle cx="120" cy="78" r="20" fill="${C.cor}"/>` + emoji(120, 78, 20, '🏛️') + `<circle cx="120" cy="118" r="14" fill="${C.mint}"/>` + emoji(120, 118, 14, '🔬')),
    card(`<circle cx="80" cy="70" r="46" fill="${C.blue}"/><path d="M80 70 L80 24 A46 46 0 0 1 124 82 Z" fill="${C.cor}"/><path d="M80 70 L124 82 A46 46 0 0 1 58 110 Z" fill="${C.mint}"/>` +
      `<circle cx="80" cy="70" r="18" fill="#fff"/>` + emoji(80, 70, 18, '📄') + label(28, 22, '50%', 11, C.blueD) + label(140, 30, '30%', 11, C.corD) + label(130, 128, '20%', 11, C.mintD)),
    card(`<rect x="22" y="28" width="116" height="84" rx="10" fill="#fff" stroke="${C.line}" stroke-width="2"/>` +
      word(32, 38, 44, 'goal', C.blueL, C.blue, 10) + word(82, 38, 46, 'match', C.blueL, C.blue, 10) + word(32, 66, 44, 'vote', C.corL, C.cor, 10) + word(82, 66, 46, 'party', C.corL, C.cor, 10) +
      label(80, 104, '→ hidden themes', 11, C.slate) + emoji(136, 26, 24, '🔍')),
  ],
  C11: [ // IMAGE ANNOTATION
    card(`<rect x="14" y="16" width="132" height="108" rx="8" fill="#BFE3F7"/><rect x="14" y="92" width="132" height="32" fill="#8FD18A"/>` + dot(124, 34, 10, C.yel) +
      emoji(66, 76, 46, '🐕') + `<rect x="38" y="46" width="58" height="58" rx="3" fill="none" stroke="${C.cor}" stroke-width="3"/>` +
      `<rect x="38" y="32" width="38" height="16" rx="3" fill="${C.cor}"/>` + label(57, 44, 'dog', 11, '#fff')),
    card(emoji(80, 68, 76, '📷'), C.blueL),
    card(`<rect x="20" y="20" width="96" height="76" rx="6" fill="#fff" stroke="${C.line}" stroke-width="2"/>` + emoji(68, 58, 40, '🐈') +
      `<rect x="70" y="80" width="78" height="40" rx="6" fill="${C.yel}" transform="rotate(-6 109 100)"/>` + label(109, 104, 'cat, sofa', 12, C.ink) + emoji(140, 26, 26, '✏️')),
    card(`<rect x="14" y="14" width="132" height="84" rx="8" fill="#FCE3B8"/>` + emoji(58, 56, 40, '🚲') + emoji(110, 52, 40, '👧') +
      `<rect x="14" y="104" width="132" height="24" rx="6" fill="${C.ink}"/>` + label(80, 120, '“a girl with a bike”', 11, '#fff')),
  ],
  C12: [ // COLLABORATIVE FILTERING
    card(person(46, 62, C.blue) + person(114, 62, C.mint) + `<path d="M64 56 Q80 40 96 56" fill="none" stroke="${C.cor}" stroke-width="3" stroke-dasharray="4 3"/>` +
      emoji(46, 104, 18, '🍿') + emoji(114, 104, 18, '🍿') + emoji(80, 30, 20, '🤝')),
    card(`<rect x="16" y="20" width="128" height="100" rx="8" fill="#fff" stroke="${C.line}" stroke-width="2"/>` +
      `<line x1="16" y1="53" x2="144" y2="53" stroke="${C.line}" stroke-width="2"/><line x1="16" y1="86" x2="144" y2="86" stroke="${C.line}" stroke-width="2"/><line x1="58" y1="20" x2="58" y2="120" stroke="${C.line}" stroke-width="2"/><line x1="101" y1="20" x2="101" y2="120" stroke="${C.line}" stroke-width="2"/>` +
      [[37, 41, '⭐'], [80, 41, '⭐'], [122, 41, '👎'], [37, 74, '⭐'], [80, 74, '⭐'], [37, 108, '👎']].map(([x, y, e]) => emoji(x, y, 18, e)).join('') +
      `<circle cx="122" cy="74" r="14" fill="${C.yel}"/>` + label(122, 80, '?', 16)),
    card(`<path d="M20 26 H140 L94 78 V120 L66 108 V78 Z" fill="${C.blue}"/>` + [[36, 16], [60, 12], [84, 18], [108, 12], [128, 16]].map(([x, y], i) => emoji(x, y, 14, ['🎬', '📺', '🎵', '🎮', '📚'][i])).join('') +
      emoji(80, 130, 16, '🎬')),
    card(`<rect x="12" y="26" width="136" height="88" rx="10" fill="${C.ink}"/>` + label(80, 46, 'People like you', 12, '#fff') + label(80, 61, 'also watched…', 12, '#ffffffbb') +
      [28, 66, 104].map((x, i) => `<rect x="${x}" y="70" width="30" height="36" rx="5" fill="${[C.cor, C.blue, C.mint][i]}"/>` + emoji(x + 15, 88, 16, ['🦖', '🚀', '🧙'][i])).join('')),
  ],
  // ---------- UNIT V ----------
  C13: [ // PAGERANK
    card(page(60, 50, 40, 46, 3, C.yel) + [[18, 18], [118, 14], [14, 104], [124, 106]].map(([x, y]) => page(x, y, 26, 26, 2)).join('') +
      arrow(44, 34, 62, 52) + arrow(118, 30, 98, 52) + arrow(40, 112, 62, 92) + arrow(124, 114, 98, 92)),
    card(`<rect x="58" y="44" width="44" height="84" rx="4" fill="${C.yel}"/><rect x="12" y="70" width="44" height="58" rx="4" fill="#C9D1E8"/><rect x="104" y="88" width="44" height="40" rx="4" fill="#E2B48F"/>` +
      label(80, 74, '1', 26, '#fff') + label(34, 96, '2', 22, '#fff') + label(126, 112, '3', 20, '#fff') + page(66, 14, 28, 26, 2) + page(20, 42, 26, 24, 2) + page(112, 60, 26, 24, 2)),
    card(`<rect x="14" y="16" width="132" height="24" rx="12" fill="#fff" stroke="${C.blue}" stroke-width="2"/>` + emoji(130, 28, 13, '🔍') + `<rect x="24" y="24" width="60" height="8" rx="4" fill="${C.line}"/>` +
      `<rect x="14" y="48" width="132" height="24" rx="6" fill="${C.yelL}" stroke="${C.yelD}" stroke-width="2"/>` + label(26, 64.5, '1', 12, C.yelD) + `<rect x="38" y="56" width="90" height="7" rx="3.5" fill="${C.yelD}"/>` +
      `<rect x="14" y="78" width="132" height="20" rx="6" fill="#fff" stroke="${C.line}" stroke-width="2"/>` + label(26, 92, '2', 11, C.slate) + `<rect x="38" y="85" width="74" height="6" rx="3" fill="${C.line}"/>` +
      `<rect x="14" y="104" width="132" height="20" rx="6" fill="#fff" stroke="${C.line}" stroke-width="2"/>` + label(26, 118, '3', 11, C.slate) + `<rect x="38" y="111" width="62" height="6" rx="3" fill="${C.line}"/>`),
    card(emoji(80, 66, 70, '🔗') + emoji(30, 30, 24, '🌐') + emoji(132, 110, 24, '🌐'), C.blueL),
  ],
  C14: [ // SENTIMENT ANALYSIS
    card(face(80, 70, 42, C.yel, 'happy'), C.mintL),
    card(face(80, 70, 42, '#F6B3A7', 'sad'), C.corL),
    card(`<path d="M16 18 H144 a8 8 0 0 1 8 8 V82 a8 8 0 0 1 -8 8 H54 L36 110 V90 H16 a8 8 0 0 1 -8 -8 V26 a8 8 0 0 1 8 -8 Z" fill="#fff" stroke="${C.blue}" stroke-width="2.5"/>` +
      label(80, 46, '“Battery life is', 12) + label(80, 62, 'terrible!”', 12) + label(80, 80, '★☆☆☆☆', 13, C.yelD) + emoji(126, 116, 28, '🤔')),
    card(`<path d="M24 100 A56 56 0 0 1 136 100" fill="none" stroke="${C.line}" stroke-width="16"/>` +
      `<path d="M24 100 A56 56 0 0 1 52 52" fill="none" stroke="${C.cor}" stroke-width="16"/><path d="M108 52 A56 56 0 0 1 136 100" fill="none" stroke="${C.mint}" stroke-width="16"/>` +
      `<line x1="80" y1="100" x2="116" y2="66" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>` + dot(80, 100, 8, C.ink) +
      label(26, 126, '−', 18, C.corD) + label(80, 128, '0', 14, C.slate) + label(134, 126, '+', 18, C.mintD)),
  ],
  C15: [ // TEXT VISUALIZATION
    card(label(80, 62, 'learning', 26, C.blue) + label(46, 32, 'data', 18, C.cor) + label(118, 34, 'model', 15, C.mintD) + label(42, 92, 'topic', 18, C.yelD) +
      label(110, 96, 'words', 16, C.pur) + label(80, 120, 'insight', 13, C.slate) + label(132, 120, 'nlp', 11, C.corD)),
    card(`<path d="M22 18 V118 H146" fill="none" stroke="${C.ink}" stroke-width="2.5"/>` +
      [[34, 90, C.blue, 'data'], [64, 70, C.cor, 'word'], [94, 50, C.mint, 'model'], [124, 30, C.yel, 'nlp']].map(([x, h, c, w]) => `<rect x="${x}" y="${118 - h}" width="22" height="${h}" rx="3" fill="${c}"/>` + label(x + 11, 132, w, 9, C.slate)).join('')),
    card(emoji(80, 70, 80, '👁️'), C.blueL),
    card(page(10, 30, 50, 66, 5) + arrow(66, 63, 92, 63, C.slate, 3) +
      `<rect x="98" y="26" width="54" height="74" rx="8" fill="#fff" stroke="${C.line}" stroke-width="2"/>` +
      `<circle cx="125" cy="54" r="18" fill="${C.blue}"/><path d="M125 54 L125 36 A18 18 0 0 1 141 62 Z" fill="${C.yel}"/>` +
      `<rect x="106" y="80" width="8" height="12" fill="${C.mint}"/><rect x="118" y="76" width="8" height="16" fill="${C.cor}"/><rect x="130" y="82" width="8" height="10" fill="${C.blue}"/>`),
  ],
};

if (typeof module !== 'undefined' && module.exports) module.exports = { ILLUSTRATIONS };
