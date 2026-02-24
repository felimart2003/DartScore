/* ============================================
   DARTSCORE - Application Logic
   Interactive Dartboard · Hotspots · Handicaps
   ============================================ */

// ==================== AVATARS ====================
const AVATARS = [
    '🎯', '🏹', '🦅', '🐉', '🔥', '⚡',
    '🌟', '💎', '🎪', '🎭', '🃏', '🎲',
    '🐺', '🦁', '🐻', '🦊', '🐯', '🦈',
    '👑', '🗡️', '🛡️', '⚔️', '🏆', '🎖️',
    '🚀', '💫', '🌙', '☀️', '🌊', '🍀',
    '😎', '🤠', '👻', '🤖', '👽', '🧙',
    '🎸', '🎵', '🎮', '🕹️', '🏀', '⚽',
];

const PLAYER_COLORS = [
    '#00e5ff', '#f87171', '#34d399', '#fbbf24',
    '#a78bfa', '#fb923c', '#f472b6', '#38bdf8',
];

// ==================== DARTBOARD CONSTANTS ====================
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const RING = {
    BULL_INNER: 0.06,
    BULL_OUTER: 0.16,
    TRIPLE_INNER: 0.52,
    TRIPLE_OUTER: 0.60,
    DOUBLE_INNER: 0.88,
    DOUBLE_OUTER: 1.0,
    NUMBER_RING: 1.12,
};

const BOARD_COLORS = {
    darkArea:   '#1a1e30',
    lightArea:  '#c8bc96',
    redRing:    '#d93c47',
    greenRing:  '#2d8a4e',
    greenBull:  '#2d8a4e',
    redBull:    '#d93c47',
    wire:       '#7a8899',
    wireThin:   '#6a7888',
    boardBg:    '#111827',
    numColor:   '#b0b8c8',
};

const CHECKOUT_DESCRIPTIONS = {
    'zero-or-less': 'Score reaches zero or below to win. No bust possible.',
    'straight': 'Must reach exactly zero. Going below zero is a bust.',
    'double': 'Must finish on a double at exactly zero. Going below zero or to 1 is a bust.',
};

// ==================== STATE ====================
let state = {
    startingScore: 301,
    checkoutRule: 'zero-or-less',
    players: [],
    currentPlayerIndex: 0,
    round: 1,
    darts: [],
    history: [],
    gameOver: false,
    winners: [],
    scoreHistory: [],
};

// ==================== DOM REFS ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const setupScreen       = $('#setup-screen');
const gameScreen        = $('#game-screen');
const finishScreen      = $('#finish-screen');
const playerList        = $('#player-list');
const addPlayerBtn      = $('#add-player-btn');
const startGameBtn      = $('#start-game-btn');
const playersContainer  = $('#players-container');
const scoreDisplay      = $('#score-display');
const currentPlayerName = $('#current-player-name');
const currentAvatar     = $('#current-avatar');
const submitTurnBtn     = $('#submit-turn-btn');
const roundNum          = $('#round-num');
const gameModeLabel     = $('#game-mode-label');
const helpBtn           = $('#help-btn');
const rulesModal        = $('#rules-modal');
const avatarModal       = $('#avatar-modal');
const avatarGrid        = $('#avatar-grid');
const undoDartBtn       = $('#undo-dart-btn');
const clearRoundBtn     = $('#clear-round-btn');
const winnerBanner      = $('#winner-banner');
const seeResultsHeaderBtn = $('#see-results-header-btn');
const dartboardCanvas   = $('#dartboard-canvas');
const dartboardContainer = $('#dartboard-container');
const magnifier         = $('#magnifier');
const magnifierCanvas   = $('#magnifier-canvas');
const magnifierLabel    = $('#magnifier-label');
const missBtn           = $('#miss-btn');

// ==================== BOARD STATE ====================
let boardSize = 0;
let boardCenterX = 0;
let boardCenterY = 0;
let boardRadius = 0;
let boardDPR = 1;
let offscreenBoard = null;
let boardActive = false;
let currentHit = null;

// ==================== SETUP PLAYERS ====================
let setupPlayers = [
    { name: '', avatar: '🎯', color: PLAYER_COLORS[0], handicap: 0 },
    { name: '', avatar: '🏹', color: PLAYER_COLORS[1], handicap: 0 },
];

let editingAvatarIndex = null;
let advancedOpen = false;

function renderSetupPlayers() {
    playerList.innerHTML = '';
    setupPlayers.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-entry';
        div.innerHTML = `
            <button class="player-avatar-btn" data-index="${i}" title="Choose avatar">${p.avatar}</button>
            <input class="player-name-input" type="text" placeholder="Player ${i + 1}"
                   value="${p.name}" data-index="${i}" maxlength="16" autocomplete="off">
            <div class="player-color-dot" style="background:${p.color}"></div>
            ${setupPlayers.length > 1 ? `
            <button class="remove-player-btn" data-index="${i}" title="Remove player">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>` : ''}
        `;
        playerList.appendChild(div);
    });

    playerList.querySelectorAll('.player-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            setupPlayers[+e.target.dataset.index].name = e.target.value;
            if (advancedOpen) renderHandicaps();
        });
    });

    playerList.querySelectorAll('.player-avatar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            editingAvatarIndex = +e.currentTarget.dataset.index;
            openAvatarModal();
        });
    });

    playerList.querySelectorAll('.remove-player-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = +e.currentTarget.dataset.index;
            setupPlayers.splice(idx, 1);
            setupPlayers.forEach((p, i) => p.color = PLAYER_COLORS[i % PLAYER_COLORS.length]);
            renderSetupPlayers();
        });
    });

    addPlayerBtn.style.display = setupPlayers.length >= 8 ? 'none' : 'flex';
    if (advancedOpen) renderHandicaps();
}

addPlayerBtn.addEventListener('click', () => {
    if (setupPlayers.length >= 8) return;
    const idx = setupPlayers.length;
    const usedAvatars = setupPlayers.map(p => p.avatar);
    const nextAvatar = AVATARS.find(a => !usedAvatars.includes(a)) || AVATARS[idx % AVATARS.length];
    setupPlayers.push({
        name: '',
        avatar: nextAvatar,
        color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
        handicap: 0,
    });
    renderSetupPlayers();
});

// ==================== ADVANCED SETTINGS TOGGLE ====================
const toggleAdvancedBtn = $('#toggle-advanced-btn');
const advancedSettings = $('#advanced-settings');

toggleAdvancedBtn.addEventListener('click', () => {
    advancedOpen = !advancedOpen;
    toggleAdvancedBtn.classList.toggle('open', advancedOpen);
    advancedSettings.classList.toggle('open', advancedOpen);
    if (advancedOpen) renderHandicaps();
});

// ==================== HANDICAPS ====================
function getBaseScore() {
    const activeMode = document.querySelector('.mode-btn.active');
    if (activeMode && activeMode.dataset.score === 'custom') {
        const val = parseInt($('#custom-score-input').value);
        return (val && val >= 2) ? val : state.startingScore;
    }
    return state.startingScore;
}

function renderHandicaps() {
    const list = $('#handicap-list');
    list.innerHTML = '';
    const baseScore = getBaseScore();

    setupPlayers.forEach((p, i) => {
        const name = p.name || `Player ${i + 1}`;
        const effective = baseScore + p.handicap;
        const entry = document.createElement('div');
        entry.className = 'handicap-entry';
        entry.innerHTML = `
            <span class="handicap-avatar">${p.avatar}</span>
            <span class="handicap-name">${name}</span>
            <div class="handicap-controls">
                <button class="handicap-btn" data-index="${i}" data-dir="-1">−</button>
                <span class="handicap-value ${p.handicap > 0 ? 'positive' : p.handicap < 0 ? 'negative' : ''}">${p.handicap > 0 ? '+' : ''}${p.handicap}</span>
                <button class="handicap-btn" data-index="${i}" data-dir="1">+</button>
            </div>
            <span class="handicap-effective">${effective}</span>
            <button class="handicap-reset-btn ${p.handicap !== 0 ? 'visible' : ''}" data-index="${i}" title="Reset">✕</button>
        `;
        list.appendChild(entry);
    });

    list.querySelectorAll('.handicap-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = +e.currentTarget.dataset.index;
            const dir = +e.currentTarget.dataset.dir;
            setupPlayers[idx].handicap += dir * 10;
            setupPlayers[idx].handicap = Math.max(-9990, Math.min(9990, setupPlayers[idx].handicap));
            renderHandicaps();
        });
    });

    list.querySelectorAll('.handicap-reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = +e.currentTarget.dataset.index;
            setupPlayers[idx].handicap = 0;
            renderHandicaps();
        });
    });
}

// Clear all handicaps button
$('#clear-handicaps-btn').addEventListener('click', () => {
    setupPlayers.forEach(p => p.handicap = 0);
    renderHandicaps();
});

// ==================== MODE SELECTION ====================
$$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const customRow = $('#custom-score-row');
        if (btn.dataset.score === 'custom') {
            customRow.style.display = 'block';
            $('#custom-score-input').focus();
        } else {
            customRow.style.display = 'none';
            state.startingScore = +btn.dataset.score;
        }
        if (advancedOpen) renderHandicaps();
    });
});

$('#custom-score-input').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (val && val >= 2) {
        state.startingScore = val;
    }
    if (advancedOpen) renderHandicaps();
});

// ==================== CHECKOUT SELECTION ====================
$$('.checkout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.checkout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.checkoutRule = btn.dataset.checkout;
        $('#checkout-hint').textContent = CHECKOUT_DESCRIPTIONS[state.checkoutRule] || '';
    });
});

// ==================== START GAME ====================
startGameBtn.addEventListener('click', startGame);

function startGame() {
    const activeMode = document.querySelector('.mode-btn.active');
    if (activeMode && activeMode.dataset.score === 'custom') {
        const val = parseInt($('#custom-score-input').value);
        if (!val || val < 2) {
            $('#custom-score-input').style.borderColor = 'var(--red)';
            $('#custom-score-input').focus();
            setTimeout(() => { $('#custom-score-input').style.borderColor = ''; }, 1500);
            return;
        }
        state.startingScore = val;
    }

    state.players = setupPlayers.map((p, i) => {
        const playerStart = state.startingScore + p.handicap;
        return {
            name: p.name || `Player ${i + 1}`,
            avatar: p.avatar,
            color: p.color,
            score: playerStart,
            startingScore: playerStart,
            turns: 0,
            totalScored: 0,
            highestTurn: 0,
            dartsThrown: 0,
            finished: false,
            finishOrder: -1,
            dartHits: [],
        };
    });
    state.currentPlayerIndex = 0;
    state.round = 1;
    state.darts = [];
    state.history = [];
    state.gameOver = false;
    state.winners = [];
    state.scoreHistory = state.players.map(p => [p.startingScore]);

    gameModeLabel.textContent = state.startingScore;
    roundNum.textContent = '1';

    winnerBanner.style.display = 'none';
    seeResultsHeaderBtn.style.display = 'none';
    switchScreen(gameScreen);
    renderPlayerCards();
    resetTurnInput();

    requestAnimationFrame(() => {
        resizeDartboard();
    });
}

// ==================== AVATAR MODAL ====================
function openAvatarModal() {
    avatarGrid.innerHTML = '';
    AVATARS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'avatar-option';
        if (editingAvatarIndex !== null && setupPlayers[editingAvatarIndex].avatar === emoji) {
            btn.classList.add('selected');
        }
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
            if (editingAvatarIndex !== null) {
                setupPlayers[editingAvatarIndex].avatar = emoji;
                renderSetupPlayers();
            }
            avatarModal.classList.remove('open');
        });
        avatarGrid.appendChild(btn);
    });
    avatarModal.classList.add('open');
}

$('#close-avatar').addEventListener('click', () => avatarModal.classList.remove('open'));
avatarModal.addEventListener('click', (e) => { if (e.target === avatarModal) avatarModal.classList.remove('open'); });

// ==================== RULES MODAL ====================
helpBtn.addEventListener('click', () => rulesModal.classList.add('open'));
$('#close-rules').addEventListener('click', () => rulesModal.classList.remove('open'));
rulesModal.addEventListener('click', (e) => { if (e.target === rulesModal) rulesModal.classList.remove('open'); });

// ==================== SCREEN SWITCHING ====================
function switchScreen(target) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    target.classList.add('active');
}

// ==================== GAME RENDERING ====================
function renderPlayerCards() {
    playersContainer.innerHTML = '';
    state.players.forEach((p, i) => {
        const card = document.createElement('div');
        let cls = 'player-card';
        if (i === state.currentPlayerIndex) cls += ' active';
        if (p.finished) cls += ' finished-player';
        card.className = cls;
        card.dataset.index = i;

        const avg = p.turns > 0 ? Math.round(p.totalScored / p.turns) : 0;

        let badge = '';
        if (p.finished) {
            const label = p.finishOrder === 0 ? '🏆 1st' : p.finishOrder === 1 ? '🥈 2nd' : p.finishOrder === 2 ? '🥉 3rd' : `#${p.finishOrder + 1}`;
            badge = `<div class="card-winner-badge">${label}</div>`;
        }

        card.innerHTML = `
            <div class="card-avatar" style="border-color:${i === state.currentPlayerIndex ? p.color : 'var(--border)'}">
                ${p.avatar}
            </div>
            <div class="card-name">${p.name}</div>
            <div class="card-score">${p.score}</div>
            <div class="card-last-score">${p.turns > 0 ? `Avg: ${avg}` : '—'}</div>
            ${badge}
        `;
        playersContainer.appendChild(card);
    });

    const activeCard = playersContainer.querySelector('.player-card.active');
    if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function resetTurnInput() {
    state.darts = [];
    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
    updateDartActionButtons();
    updateCurrentPlayerIndicator();
    drawDartboard();
}

function updateCurrentPlayerIndicator() {
    const player = state.players[state.currentPlayerIndex];
    currentPlayerName.textContent = player.name;
    currentAvatar.textContent = player.avatar;
    currentAvatar.style.borderColor = player.color;
}

function updateDartTracker() {
    for (let i = 1; i <= 3; i++) {
        const dot = $(`#dart-${i}`);
        dot.className = 'dart-dot';
        if (i <= state.darts.length) {
            dot.classList.add('thrown');
        } else if (i === state.darts.length + 1) {
            dot.classList.add('current');
        }
    }

    const dartScoresEl = $('#dart-scores');
    if (state.darts.length > 0) {
        dartScoresEl.textContent = state.darts.map(d => {
            if (d.value === 0) return 'Miss';
            const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : '';
            return `${prefix}${d.value}`;
        }).join(' + ');
    } else {
        dartScoresEl.textContent = '';
    }
}

function updateScoreDisplay() {
    const turnTotal = state.darts.reduce((sum, d) => sum + d.score, 0);
    scoreDisplay.textContent = turnTotal;
    scoreDisplay.style.color = '';
    scoreDisplay.classList.remove('score-pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('score-pop');
}

function updateSubmitButton() {
    submitTurnBtn.disabled = state.darts.length === 0;
    if (state.darts.length === 3) {
        submitTurnBtn.textContent = 'Submit Turn';
    } else if (state.darts.length > 0) {
        submitTurnBtn.textContent = `Submit Turn (${state.darts.length}/3)`;
    } else {
        submitTurnBtn.textContent = 'Submit Turn';
    }
}

function updateDartActionButtons() {
    undoDartBtn.disabled = state.darts.length === 0;
    clearRoundBtn.disabled = state.darts.length === 0;
}

// ==================== DARTBOARD RENDERING ====================

function resizeDartboard() {
    const container = dartboardContainer;
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width - 4, rect.height - 4);
    if (size <= 0) return;

    boardDPR = window.devicePixelRatio || 1;
    boardSize = size;
    boardCenterX = size / 2;
    boardCenterY = size / 2;
    boardRadius = size * 0.42;

    dartboardCanvas.style.width = size + 'px';
    dartboardCanvas.style.height = size + 'px';
    dartboardCanvas.width = Math.round(size * boardDPR);
    dartboardCanvas.height = Math.round(size * boardDPR);

    buildOffscreenBoard();
    drawDartboard();
}

function buildOffscreenBoard() {
    offscreenBoard = document.createElement('canvas');
    offscreenBoard.width = dartboardCanvas.width;
    offscreenBoard.height = dartboardCanvas.height;
    const ctx = offscreenBoard.getContext('2d');
    ctx.scale(boardDPR, boardDPR);
    drawBoardGraphics(ctx, boardCenterX, boardCenterY, boardRadius);
}

function drawBoardGraphics(ctx, cx, cy, R) {
    // Background
    ctx.fillStyle = BOARD_COLORS.boardBg;
    ctx.fillRect(0, 0, boardSize, boardSize);

    const segAngle = Math.PI * 2 / 20;

    // Draw segments from outside to inside
    // Double ring
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? BOARD_COLORS.redRing : BOARD_COLORS.greenRing;
        drawSegment(ctx, cx, cy, R * RING.DOUBLE_INNER, R * RING.DOUBLE_OUTER, startA, endA, color);
    }

    // Outer single
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? BOARD_COLORS.darkArea : BOARD_COLORS.lightArea;
        drawSegment(ctx, cx, cy, R * RING.TRIPLE_OUTER, R * RING.DOUBLE_INNER, startA, endA, color);
    }

    // Triple ring
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? BOARD_COLORS.redRing : BOARD_COLORS.greenRing;
        drawSegment(ctx, cx, cy, R * RING.TRIPLE_INNER, R * RING.TRIPLE_OUTER, startA, endA, color);
    }

    // Inner single
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? BOARD_COLORS.darkArea : BOARD_COLORS.lightArea;
        drawSegment(ctx, cx, cy, R * RING.BULL_OUTER, R * RING.TRIPLE_INNER, startA, endA, color);
    }

    // Outer bull
    ctx.beginPath();
    ctx.arc(cx, cy, R * RING.BULL_OUTER, 0, Math.PI * 2);
    ctx.fillStyle = BOARD_COLORS.greenBull;
    ctx.fill();

    // Inner bull
    ctx.beginPath();
    ctx.arc(cx, cy, R * RING.BULL_INNER, 0, Math.PI * 2);
    ctx.fillStyle = BOARD_COLORS.redBull;
    ctx.fill();

    // Wire lines - ring boundaries
    const wireRings = [RING.BULL_INNER, RING.BULL_OUTER, RING.TRIPLE_INNER, RING.TRIPLE_OUTER, RING.DOUBLE_INNER, RING.DOUBLE_OUTER];
    wireRings.forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * r, 0, Math.PI * 2);
        ctx.strokeStyle = BOARD_COLORS.wire;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    });

    // Wire lines - segment separators
    for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + i * segAngle - segAngle / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * R * RING.BULL_OUTER, cy + Math.sin(angle) * R * RING.BULL_OUTER);
        ctx.lineTo(cx + Math.cos(angle) * R * RING.DOUBLE_OUTER, cy + Math.sin(angle) * R * RING.DOUBLE_OUTER);
        ctx.strokeStyle = BOARD_COLORS.wireThin;
        ctx.lineWidth = 0.6;
        ctx.stroke();
    }

    // Numbers
    const numFontSize = Math.max(9, R * 0.11);
    ctx.font = `bold ${numFontSize}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = BOARD_COLORS.numColor;

    for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + i * segAngle;
        const nr = R * RING.NUMBER_RING;
        const x = cx + Math.cos(angle) * nr;
        const y = cy + Math.sin(angle) * nr;
        ctx.fillText(BOARD_ORDER[i], x, y);
    }
}

function drawSegment(ctx, cx, cy, innerR, outerR, startAngle, endAngle, fillColor) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
}

function drawDartboard(highlightSegIndex, highlightRing) {
    if (!offscreenBoard) return;
    const ctx = dartboardCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(offscreenBoard, 0, 0);

    ctx.scale(boardDPR, boardDPR);

    // Draw highlight
    if (highlightSegIndex !== undefined && highlightSegIndex !== null) {
        drawHighlight(ctx, boardCenterX, boardCenterY, boardRadius, highlightSegIndex, highlightRing);
    }

    // Draw current turn darts
    drawTurnDarts(ctx, boardCenterX, boardCenterY, boardRadius);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawHighlight(ctx, cx, cy, R, segIndex, ring) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#00e5ff';

    const segAngle = Math.PI * 2 / 20;

    if (ring === 'inner-bull') {
        ctx.beginPath();
        ctx.arc(cx, cy, R * RING.BULL_INNER, 0, Math.PI * 2);
        ctx.fill();
    } else if (ring === 'outer-bull') {
        ctx.beginPath();
        ctx.arc(cx, cy, R * RING.BULL_OUTER, 0, Math.PI * 2);
        ctx.arc(cx, cy, R * RING.BULL_INNER, Math.PI * 2, 0, true);
        ctx.fill();
    } else if (ring === 'miss') {
        // No highlight for miss
    } else {
        let innerR, outerR;
        if (ring === 'inner-single') { innerR = RING.BULL_OUTER; outerR = RING.TRIPLE_INNER; }
        else if (ring === 'triple') { innerR = RING.TRIPLE_INNER; outerR = RING.TRIPLE_OUTER; }
        else if (ring === 'outer-single') { innerR = RING.TRIPLE_OUTER; outerR = RING.DOUBLE_INNER; }
        else if (ring === 'double') { innerR = RING.DOUBLE_INNER; outerR = RING.DOUBLE_OUTER; }
        else { ctx.restore(); return; }

        const startA = -Math.PI / 2 + segIndex * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        drawSegment(ctx, cx, cy, R * innerR, R * outerR, startA, endA, '#00e5ff');
    }

    ctx.restore();
}

function drawTurnDarts(ctx, cx, cy, R) {
    state.darts.forEach(d => {
        if (d.normX == null) return;
        const x = cx + d.normX * R;
        const y = cy + d.normY * R;

        ctx.save();
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    });
}

// ==================== HIT DETECTION ====================
function getHitFromPosition(canvasX, canvasY) {
    const dx = canvasX - boardCenterX;
    const dy = canvasY - boardCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normDist = dist / boardRadius;

    if (normDist > RING.DOUBLE_OUTER) {
        return { value: 0, multiplier: 1, score: 0, ring: 'miss', segIndex: -1 };
    }

    if (normDist <= RING.BULL_INNER) {
        return { value: 25, multiplier: 2, score: 50, ring: 'inner-bull', segIndex: -1 };
    }

    if (normDist <= RING.BULL_OUTER) {
        return { value: 25, multiplier: 1, score: 25, ring: 'outer-bull', segIndex: -1 };
    }

    // Determine segment
    let angle = Math.atan2(dy, dx);
    angle += Math.PI / 2; // Shift so top = 0
    angle += Math.PI / 20; // Offset by half-segment
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;

    const segIndex = Math.floor(angle / (Math.PI * 2 / 20)) % 20;
    const value = BOARD_ORDER[segIndex];

    let multiplier, ring;
    if (normDist <= RING.TRIPLE_INNER) { multiplier = 1; ring = 'inner-single'; }
    else if (normDist <= RING.TRIPLE_OUTER) { multiplier = 3; ring = 'triple'; }
    else if (normDist <= RING.DOUBLE_INNER) { multiplier = 1; ring = 'outer-single'; }
    else { multiplier = 2; ring = 'double'; }

    return { value, multiplier, score: value * multiplier, ring, segIndex };
}

function getHitLabel(hit) {
    if (!hit || hit.ring === 'miss') return 'MISS';
    if (hit.ring === 'inner-bull') return 'BULL · 50';
    if (hit.ring === 'outer-bull') return '25';
    const prefix = hit.multiplier === 3 ? 'T' : hit.multiplier === 2 ? 'D' : '';
    return `${prefix}${hit.value} · ${hit.score}`;
}

// ==================== DARTBOARD INTERACTION ====================
function getCanvasPos(e) {
    const rect = dartboardCanvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    };
}

dartboardCanvas.addEventListener('pointerdown', onBoardPointerDown);
dartboardCanvas.addEventListener('pointermove', onBoardPointerMove);
dartboardCanvas.addEventListener('pointerup', onBoardPointerUp);
dartboardCanvas.addEventListener('pointercancel', onBoardPointerCancel);

function onBoardPointerDown(e) {
    if (state.darts.length >= 3 || state.gameOver) return;
    e.preventDefault();
    dartboardCanvas.setPointerCapture(e.pointerId);
    boardActive = true;

    const pos = getCanvasPos(e);
    currentHit = getHitFromPosition(pos.x, pos.y);
    drawDartboard(currentHit.segIndex, currentHit.ring);
    showMagnifier(e, pos, currentHit);
}

function onBoardPointerMove(e) {
    if (!boardActive) return;
    e.preventDefault();

    const pos = getCanvasPos(e);
    currentHit = getHitFromPosition(pos.x, pos.y);
    drawDartboard(currentHit.segIndex, currentHit.ring);
    updateMagnifier(e, pos, currentHit);
}

function onBoardPointerUp(e) {
    if (!boardActive) return;
    e.preventDefault();
    boardActive = false;
    hideMagnifier();

    const pos = getCanvasPos(e);
    const hit = getHitFromPosition(pos.x, pos.y);
    registerDart(hit, pos);
}

function onBoardPointerCancel(e) {
    boardActive = false;
    hideMagnifier();
    currentHit = null;
    drawDartboard();
}

function registerDart(hit, canvasPos) {
    if (state.darts.length >= 3 || state.gameOver) return;

    const normX = (canvasPos.x - boardCenterX) / boardRadius;
    const normY = (canvasPos.y - boardCenterY) / boardRadius;

    state.darts.push({
        value: hit.value,
        multiplier: hit.multiplier,
        score: hit.score,
        ring: hit.ring,
        normX: hit.ring === 'miss' ? null : normX,
        normY: hit.ring === 'miss' ? null : normY,
    });

    if (navigator.vibrate) navigator.vibrate(15);

    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
    updateDartActionButtons();
    drawDartboard();

    if (state.darts.length === 3) submitTurnBtn.focus();
}

// ==================== MISS BUTTON ====================
missBtn.addEventListener('click', () => {
    if (state.darts.length >= 3 || state.gameOver) return;
    registerDart(
        { value: 0, multiplier: 1, score: 0, ring: 'miss', segIndex: -1 },
        { x: boardCenterX, y: boardCenterY }
    );
});

// ==================== MAGNIFIER ====================
function showMagnifier(e, canvasPos, hit) {
    magnifier.style.display = 'flex';
    positionMagnifier(e);
    drawMagnifierContent(canvasPos);
    magnifierLabel.textContent = getHitLabel(hit);
    magnifierLabel.style.color = hit.ring === 'miss' ? '#f87171' : '#00e5ff';
}

function updateMagnifier(e, canvasPos, hit) {
    positionMagnifier(e);
    drawMagnifierContent(canvasPos);
    magnifierLabel.textContent = getHitLabel(hit);
    magnifierLabel.style.color = hit.ring === 'miss' ? '#f87171' : '#00e5ff';
}

function hideMagnifier() {
    magnifier.style.display = 'none';
    currentHit = null;
    drawDartboard();
}

function positionMagnifier(e) {
    const containerRect = dartboardContainer.getBoundingClientRect();
    const magWidth = 130;
    const magHeight = 155;
    const px = e.clientX - containerRect.left;
    const py = e.clientY - containerRect.top;

    let left = px - magWidth / 2;
    let top = py - magHeight - 30;

    if (top < -10) {
        top = py + 40;
    }

    left = Math.max(-10, Math.min(containerRect.width - magWidth + 10, left));

    magnifier.style.left = left + 'px';
    magnifier.style.top = top + 'px';
}

function drawMagnifierContent(canvasPos) {
    const magSize = 130;
    const zoom = 2.5;
    const sourceSize = magSize / zoom;

    magnifierCanvas.width = Math.round(magSize * boardDPR);
    magnifierCanvas.height = Math.round(magSize * boardDPR);
    magnifierCanvas.style.width = magSize + 'px';
    magnifierCanvas.style.height = magSize + 'px';

    const magCtx = magnifierCanvas.getContext('2d');
    const internalMagSize = magSize * boardDPR;
    const center = internalMagSize / 2;

    magCtx.clearRect(0, 0, internalMagSize, internalMagSize);

    // Clip to circle
    magCtx.save();
    magCtx.beginPath();
    magCtx.arc(center, center, center, 0, Math.PI * 2);
    magCtx.clip();

    // Source area from main canvas (in internal pixels)
    const sourceR = (sourceSize / 2) * boardDPR;
    const sx = canvasPos.x * boardDPR - sourceR;
    const sy = canvasPos.y * boardDPR - sourceR;
    const sSize = sourceR * 2;

    magCtx.drawImage(dartboardCanvas, sx, sy, sSize, sSize, 0, 0, internalMagSize, internalMagSize);

    // Crosshair
    magCtx.strokeStyle = 'rgba(255,255,255,0.7)';
    magCtx.lineWidth = 1.5 * boardDPR;
    magCtx.beginPath();
    magCtx.moveTo(center - 10 * boardDPR, center);
    magCtx.lineTo(center + 10 * boardDPR, center);
    magCtx.moveTo(center, center - 10 * boardDPR);
    magCtx.lineTo(center, center + 10 * boardDPR);
    magCtx.stroke();

    // Center dot
    magCtx.fillStyle = 'rgba(0, 229, 255, 0.9)';
    magCtx.beginPath();
    magCtx.arc(center, center, 2.5 * boardDPR, 0, Math.PI * 2);
    magCtx.fill();

    magCtx.restore();

    // Border circle (outside clip)
    magCtx.strokeStyle = '#00e5ff';
    magCtx.lineWidth = 2.5 * boardDPR;
    magCtx.beginPath();
    magCtx.arc(center, center, center - 1.5 * boardDPR, 0, Math.PI * 2);
    magCtx.stroke();
}

// ==================== UNDO DART ====================
undoDartBtn.addEventListener('click', () => {
    if (state.darts.length === 0) return;
    state.darts.pop();
    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
    updateDartActionButtons();
    drawDartboard();
});

// ==================== CLEAR ROUND ====================
clearRoundBtn.addEventListener('click', () => {
    if (state.darts.length === 0) return;
    state.darts = [];
    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
    updateDartActionButtons();
    drawDartboard();
});

// ==================== SUBMIT TURN ====================
submitTurnBtn.addEventListener('click', submitTurn);

function submitTurn() {
    if (state.darts.length === 0 || state.gameOver) return;

    const player = state.players[state.currentPlayerIndex];
    const turnTotal = state.darts.reduce((sum, d) => sum + d.score, 0);
    const scoreBeforeTurn = player.score;
    const newScore = player.score - turnTotal;

    const isBust = checkBust(newScore, state.darts);

    // Track dart hits for hotspots
    const hitsToAdd = state.darts.filter(d => d.normX != null).map(d => ({
        normX: d.normX,
        normY: d.normY,
        value: d.value,
        multiplier: d.multiplier,
        score: d.score,
        ring: d.ring,
    }));

    // Save to history for undo
    state.history.push({
        playerIndex: state.currentPlayerIndex,
        scoreBeforeTurn,
        darts: [...state.darts],
        round: state.round,
        wasBust: isBust,
        hitsAdded: hitsToAdd.length,
    });

    if (isBust) {
        bustAnimation();
        state.scoreHistory[state.currentPlayerIndex].push(scoreBeforeTurn);
        // Still track dart hits even on bust
        player.dartHits.push(...hitsToAdd);
    } else {
        player.score = newScore;
        player.turns++;
        player.totalScored += turnTotal;
        player.dartsThrown += state.darts.length;
        if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;
        player.dartHits.push(...hitsToAdd);

        state.scoreHistory[state.currentPlayerIndex].push(newScore);

        const won = checkWin(newScore);
        if (won && !player.finished) {
            player.finished = true;
            player.finishOrder = state.winners.length;
            state.winners.push(state.currentPlayerIndex);

            renderPlayerCards();
            updateSeeResultsBtn();
            showWinnerBanner(state.currentPlayerIndex);
            return;
        }
    }

    advanceToNextPlayer();
}

function checkWin(newScore) {
    if (state.checkoutRule === 'zero-or-less') {
        return newScore <= 0;
    }
    return newScore === 0;
}

function checkBust(newScore, darts) {
    if (state.checkoutRule === 'zero-or-less') return false;

    if (state.checkoutRule === 'straight') {
        return newScore < 0;
    }

    if (state.checkoutRule === 'double') {
        if (newScore < 0) return true;
        if (newScore === 1) return true;
        if (newScore === 0) {
            const lastDart = darts[darts.length - 1];
            if (lastDart.multiplier !== 2) return true;
        }
    }

    return false;
}

function bustAnimation() {
    const activeCard = playersContainer.querySelector('.player-card.active');
    if (activeCard) {
        activeCard.classList.add('bust');
        setTimeout(() => activeCard.classList.remove('bust'), 600);
    }
    scoreDisplay.textContent = 'BUST';
    scoreDisplay.style.color = 'var(--red)';
    setTimeout(() => { scoreDisplay.style.color = ''; }, 800);
}

function advanceToNextPlayer() {
    const totalPlayers = state.players.length;
    const activePlayers = state.players.filter(p => !p.finished);

    if (activePlayers.length === 0) {
        state.gameOver = true;
        return;
    }

    let next = (state.currentPlayerIndex + 1) % totalPlayers;
    let attempts = 0;
    while (state.players[next].finished && attempts < totalPlayers) {
        next = (next + 1) % totalPlayers;
        attempts++;
    }

    state.currentPlayerIndex = next;
    recalcRound();
    renderPlayerCards();
    resetTurnInput();
}

function recalcRound() {
    const totalTurns = state.history.length;
    state.round = Math.floor(totalTurns / state.players.length) + 1;
    roundNum.textContent = state.round;
}

function updateSeeResultsBtn() {
    seeResultsHeaderBtn.style.display = state.winners.length > 0 ? 'flex' : 'none';
}

// ==================== WINNER BANNER ====================
function showWinnerBanner(playerIndex) {
    const player = state.players[playerIndex];
    $('#banner-winner-avatar').textContent = player.avatar;
    $('#banner-winner-name').textContent = player.name;

    const activePlayers = state.players.filter(p => !p.finished);
    const allFinished = activePlayers.length === 0;

    $('#banner-dismiss-btn').style.display = allFinished ? 'none' : 'inline-block';
    $('#banner-see-results-btn').style.display = 'inline-block';

    const confettiEl = $('#banner-confetti');
    confettiEl.innerHTML = '';
    const colors = ['#00e5ff', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#f472b6'];
    for (let i = 0; i < 40; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = '-10px';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 6 + 4) + 'px';
        piece.style.height = (Math.random() * 6 + 4) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        piece.style.animationDelay = (Math.random() * 1) + 's';
        confettiEl.appendChild(piece);
    }

    winnerBanner.style.display = 'flex';
}

$('#banner-dismiss-btn').addEventListener('click', () => {
    winnerBanner.style.display = 'none';
    advanceToNextPlayer();
});

$('#banner-see-results-btn').addEventListener('click', () => {
    winnerBanner.style.display = 'none';
    finishGame();
});

seeResultsHeaderBtn.addEventListener('click', () => {
    finishGame();
});

// ==================== UNDO LAST SUBMITTED TURN ====================
$('#undo-btn').addEventListener('click', () => {
    if (state.history.length === 0) return;

    if (finishScreen.classList.contains('active')) {
        switchScreen(gameScreen);
        requestAnimationFrame(() => resizeDartboard());
    }

    const last = state.history.pop();
    const player = state.players[last.playerIndex];

    if (player.finished) {
        player.finished = false;
        player.finishOrder = -1;
        state.winners = state.winners.filter(w => w !== last.playerIndex);
        state.gameOver = false;
    }

    player.score = last.scoreBeforeTurn;

    if (state.scoreHistory[last.playerIndex].length > 1) {
        state.scoreHistory[last.playerIndex].pop();
    }

    // Remove dart hits
    if (last.hitsAdded > 0) {
        player.dartHits.splice(-last.hitsAdded);
    }

    if (!last.wasBust) {
        const turnTotal = last.darts.reduce((sum, d) => sum + d.score, 0);
        player.turns = Math.max(0, player.turns - 1);
        player.totalScored = Math.max(0, player.totalScored - turnTotal);
        player.dartsThrown = Math.max(0, player.dartsThrown - last.darts.length);
    }

    state.currentPlayerIndex = last.playerIndex;
    recalcRound();

    winnerBanner.style.display = 'none';
    updateSeeResultsBtn();
    renderPlayerCards();
    resetTurnInput();
});

// ==================== BACK TO SETUP ====================
$('#back-btn').addEventListener('click', () => {
    if (state.history.length > 0) {
        if (!confirm('Leave current game? Progress will be lost.')) return;
    }
    winnerBanner.style.display = 'none';
    switchScreen(setupScreen);
});

// ==================== FINISH GAME ====================
function finishGame() {
    state.gameOver = true;
    winnerBanner.style.display = 'none';

    renderFinishScreen();
    switchScreen(finishScreen);
}

function renderFinishScreen() {
    const checkoutLabel = state.checkoutRule === 'zero-or-less' ? 'Zero or Less' :
                          state.checkoutRule === 'straight' ? 'Straight Out' : 'Double Out';
    $('#finish-meta').textContent = `${state.startingScore} · ${checkoutLabel} · ${state.round} rounds`;

    // ---- Leaderboard ----
    const sorted = state.players.map((p, i) => ({ ...p, originalIndex: i }));
    sorted.sort((a, b) => {
        if (a.finished && b.finished) return a.finishOrder - b.finishOrder;
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        return a.score - b.score;
    });

    const lbEl = $('#finish-leaderboard');
    lbEl.innerHTML = '';
    sorted.forEach((p, rank) => {
        const avg = p.turns > 0 ? (p.totalScored / p.turns).toFixed(1) : '0';
        const isWinner = rank === 0 && p.finished;
        const card = document.createElement('div');
        card.className = `lb-card${isWinner ? ' lb-winner' : ''}`;
        card.innerHTML = `
            <div class="lb-rank ${rank < 3 ? 'rank-' + (rank + 1) : ''}">${rank + 1}</div>
            <div class="lb-avatar" style="border-color:${isWinner ? 'var(--gold)' : p.color}">${p.avatar}</div>
            <div class="lb-info">
                <div class="lb-name">${p.name}</div>
                <div class="lb-sub">${p.turns} turns · Avg ${avg}${p.startingScore !== state.startingScore ? ' · Start ' + p.startingScore : ''}</div>
            </div>
            <div class="lb-score">${p.finished ? (state.checkoutRule === 'zero-or-less' ? p.score : '0') : p.score}</div>
        `;
        lbEl.appendChild(card);
    });

    // ---- Chart ----
    drawScoreChart();

    // ---- Hotspots ----
    renderHotspots();

    // ---- Detailed stats ----
    const statsEl = $('#finish-detailed-stats');
    statsEl.innerHTML = '<h3 class="finish-section-title">Player Statistics</h3>';
    state.players.forEach((p, i) => {
        const avg = p.turns > 0 ? (p.totalScored / p.turns).toFixed(1) : '0';
        const dartAvg = p.dartsThrown > 0 ? (p.totalScored / p.dartsThrown).toFixed(1) : '0';
        const card = document.createElement('div');
        card.className = 'player-stats-card';
        card.innerHTML = `
            <div class="psc-header">
                <div class="psc-avatar" style="border-color:${p.color}">${p.avatar}</div>
                <div class="psc-name">${p.name}</div>
            </div>
            <div class="psc-grid">
                <div class="psc-stat">
                    <div class="psc-stat-value">${p.score}</div>
                    <div class="psc-stat-label">Final Score</div>
                </div>
                <div class="psc-stat">
                    <div class="psc-stat-value">${p.turns}</div>
                    <div class="psc-stat-label">Turns</div>
                </div>
                <div class="psc-stat">
                    <div class="psc-stat-value">${avg}</div>
                    <div class="psc-stat-label">Avg / Turn</div>
                </div>
                <div class="psc-stat">
                    <div class="psc-stat-value">${p.highestTurn}</div>
                    <div class="psc-stat-label">Best Turn</div>
                </div>
                <div class="psc-stat">
                    <div class="psc-stat-value">${p.dartsThrown}</div>
                    <div class="psc-stat-label">Darts</div>
                </div>
                <div class="psc-stat">
                    <div class="psc-stat-value">${dartAvg}</div>
                    <div class="psc-stat-label">Per Dart</div>
                </div>
            </div>
        `;
        statsEl.appendChild(card);
    });
}

// ==================== HOTSPOT VISUALIZATION ====================
function renderHotspots() {
    const carousel = $('#hotspot-carousel');
    const dotsContainer = $('#hotspot-dots');
    const section = $('#finish-hotspots-section');
    carousel.innerHTML = '';
    dotsContainer.innerHTML = '';

    // Check if any player has dart hits
    const hasHits = state.players.some(p => p.dartHits.length > 0);
    if (!hasHits) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';

    const hotspotSize = 220;
    const dpr = window.devicePixelRatio || 1;

    state.players.forEach((player, pIdx) => {
        const slide = document.createElement('div');
        slide.className = 'hotspot-slide';

        slide.innerHTML = `
            <div class="hotspot-player-info">
                <span class="hotspot-avatar">${player.avatar}</span>
                <span class="hotspot-name">${player.name}</span>
                <span class="hotspot-dart-count">(${player.dartHits.length} darts)</span>
            </div>
            <div class="hotspot-canvas-wrap">
                <canvas width="${hotspotSize * dpr}" height="${hotspotSize * dpr}"
                        style="width:${hotspotSize}px;height:${hotspotSize}px;"></canvas>
            </div>
        `;
        carousel.appendChild(slide);

        const canvas = slide.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const hcx = hotspotSize / 2;
        const hcy = hotspotSize / 2;
        const hR = hotspotSize * 0.42;

        // Draw mini dartboard (dimmed)
        drawMiniBoard(ctx, hcx, hcy, hR, hotspotSize);

        // Draw dart hits
        drawHotspotDots(ctx, hcx, hcy, hR, player.dartHits, player.color);

        // Dot indicator
        const dot = document.createElement('button');
        dot.className = 'hotspot-dot' + (pIdx === 0 ? ' active' : '');
        dot.dataset.index = pIdx;
        dot.addEventListener('click', () => {
            const slideEl = carousel.children[pIdx];
            slideEl.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        });
        dotsContainer.appendChild(dot);
    });

    // Update dots on scroll
    carousel.addEventListener('scroll', () => {
        const scrollLeft = carousel.scrollLeft;
        const slideWidth = carousel.children[0]?.offsetWidth || 1;
        const activeIdx = Math.round(scrollLeft / slideWidth);
        dotsContainer.querySelectorAll('.hotspot-dot').forEach((d, i) => {
            d.classList.toggle('active', i === activeIdx);
        });
    });
}

function drawMiniBoard(ctx, cx, cy, R, size) {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, size, size);

    const segAngle = Math.PI * 2 / 20;

    // Double ring
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? 'rgba(217,60,71,0.35)' : 'rgba(45,138,78,0.35)';
        drawSegment(ctx, cx, cy, R * RING.DOUBLE_INNER, R * RING.DOUBLE_OUTER, startA, endA, color);
    }

    // Outer single
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? 'rgba(26,30,48,0.6)' : 'rgba(200,188,150,0.2)';
        drawSegment(ctx, cx, cy, R * RING.TRIPLE_OUTER, R * RING.DOUBLE_INNER, startA, endA, color);
    }

    // Triple ring
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? 'rgba(217,60,71,0.35)' : 'rgba(45,138,78,0.35)';
        drawSegment(ctx, cx, cy, R * RING.TRIPLE_INNER, R * RING.TRIPLE_OUTER, startA, endA, color);
    }

    // Inner single
    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const color = (i % 2 === 0) ? 'rgba(26,30,48,0.6)' : 'rgba(200,188,150,0.2)';
        drawSegment(ctx, cx, cy, R * RING.BULL_OUTER, R * RING.TRIPLE_INNER, startA, endA, color);
    }

    // Bulls
    ctx.beginPath();
    ctx.arc(cx, cy, R * RING.BULL_OUTER, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(45,138,78,0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, R * RING.BULL_INNER, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(217,60,71,0.35)';
    ctx.fill();

    // Wire lines (subtle)
    const wireRings = [RING.BULL_INNER, RING.BULL_OUTER, RING.TRIPLE_INNER, RING.TRIPLE_OUTER, RING.DOUBLE_INNER, RING.DOUBLE_OUTER];
    wireRings.forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(122,136,153,0.25)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + i * segAngle - segAngle / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * R * RING.BULL_OUTER, cy + Math.sin(angle) * R * RING.BULL_OUTER);
        ctx.lineTo(cx + Math.cos(angle) * R * RING.DOUBLE_OUTER, cy + Math.sin(angle) * R * RING.DOUBLE_OUTER);
        ctx.strokeStyle = 'rgba(122,136,153,0.2)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
    }

    // Numbers (small)
    const numFontSize = Math.max(7, R * 0.10);
    ctx.font = `bold ${numFontSize}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(176,184,200,0.5)';

    for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + i * segAngle;
        const nr = R * RING.NUMBER_RING;
        const x = cx + Math.cos(angle) * nr;
        const y = cy + Math.sin(angle) * nr;
        ctx.fillText(BOARD_ORDER[i], x, y);
    }
}

function drawHotspotDots(ctx, cx, cy, R, hits, color) {
    if (hits.length === 0) return;

    hits.forEach(hit => {
        const x = cx + hit.normX * R;
        const y = cy + hit.normY * R;

        // Glow
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();

        // Solid dot
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
    });
}

// ==================== CHART (pure canvas) ====================
function drawScoreChart() {
    const canvas = $('#score-chart');
    const ctx = canvas.getContext('2d');

    const maxLen = Math.max(...state.scoreHistory.map(h => h.length));
    if (maxLen <= 1) {
        canvas.width = 0;
        canvas.height = 0;
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    const containerWidth = canvas.parentElement.clientWidth - 24;
    const W = Math.max(maxLen * 50, containerWidth, 300);
    const H = 220;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const pad = { top: 20, right: 16, bottom: 30, left: 44 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const allScores = state.scoreHistory.flat();
    const minScore = Math.min(0, ...allScores);
    const maxScore = Math.max(...allScores);
    const scoreRange = maxScore - minScore || 1;

    const xStep = chartW / (maxLen - 1);

    function toX(i) { return pad.left + i * xStep; }
    function toY(val) { return pad.top + chartH - ((val - minScore) / scoreRange) * chartH; }

    ctx.fillStyle = '#1a2234';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#2a3550';
    ctx.lineWidth = 0.5;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const val = minScore + (scoreRange / gridLines) * i;
        const y = toY(val);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.stroke();

        ctx.fillStyle = '#5a6478';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(val), pad.left - 5, y + 3);
    }

    if (minScore < 0) {
        const zeroY = toY(0);
        ctx.strokeStyle = 'rgba(248,113,113,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.left, zeroY);
        ctx.lineTo(W - pad.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.fillStyle = '#5a6478';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < maxLen; i++) {
        if (maxLen > 20 && i % Math.ceil(maxLen / 12) !== 0 && i !== maxLen - 1) continue;
        ctx.fillText(i, toX(i), H - pad.bottom + 14);
    }

    state.players.forEach((player, pIdx) => {
        const data = state.scoreHistory[pIdx];
        if (data.length < 2) return;

        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 6;

        ctx.beginPath();
        data.forEach((val, i) => {
            const x = toX(i);
            const y = toY(val);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        data.forEach((val, i) => {
            const x = toX(i);
            const y = toY(val);
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    const legendY = pad.top - 6;
    let legendX = pad.left;
    state.players.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(legendX, legendY - 5, 8, 8);
        ctx.fillStyle = '#8892a8';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, legendX + 12, legendY + 2);
        legendX += ctx.measureText(p.name).width + 26;
    });
}

// ==================== FINISH SCREEN ACTIONS ====================
$('#finish-rematch-btn').addEventListener('click', () => startGame());
$('#finish-new-game-btn').addEventListener('click', () => switchScreen(setupScreen));

// ==================== KEYBOARD SUPPORT ====================
document.addEventListener('keydown', (e) => {
    if (rulesModal.classList.contains('open') || avatarModal.classList.contains('open')) {
        if (e.key === 'Escape') {
            rulesModal.classList.remove('open');
            avatarModal.classList.remove('open');
        }
        return;
    }

    if (!gameScreen.classList.contains('active')) return;

    if (e.key === 'Enter') submitTurn();

    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        $('#undo-btn').click();
    }

    if (e.key === 'Backspace' && !e.ctrlKey) {
        e.preventDefault();
        undoDartBtn.click();
    }

    if (e.key === 'Escape') {
        clearRoundBtn.click();
    }
});

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', () => {
    if (gameScreen.classList.contains('active')) {
        resizeDartboard();
    }
});

// ==================== INIT ====================
renderSetupPlayers();
state.startingScore = 301;
state.checkoutRule = 'zero-or-less';
