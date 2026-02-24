/* ============================================
   DARTSCORE - Application Logic
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

// ==================== STATE ====================
let state = {
    startingScore: 301,
    checkoutRule: 'below-zero',
    players: [],
    currentPlayerIndex: 0,
    round: 1,
    darts: [],
    currentMultiplier: 1,
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

    // Name input listeners
    playerList.querySelectorAll('.player-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            setupPlayers[+e.target.dataset.index].name = e.target.value;
            if (advancedOpen) renderHandicaps();
        });
    });

    // Avatar button listeners
    playerList.querySelectorAll('.player-avatar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            editingAvatarIndex = +e.currentTarget.dataset.index;
            openAvatarModal();
        });
    });

    // Remove button listeners
    playerList.querySelectorAll('.remove-player-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = +e.currentTarget.dataset.index;
            setupPlayers.splice(idx, 1);
            setupPlayers.forEach((p, i) => p.color = PLAYER_COLORS[i % PLAYER_COLORS.length]);
            renderSetupPlayers();
        });
    });

    addPlayerBtn.style.display = setupPlayers.length >= 8 ? 'none' : 'flex';

    // Update handicap list if visible
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
}

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

// Custom score input
$('#custom-score-input').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (val && val >= 2) {
        state.startingScore = val;
    }
    if (advancedOpen) renderHandicaps();
});

// Checkout selection
$$('.checkout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.checkout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.checkoutRule = btn.dataset.checkout;
    });
});

// ==================== START GAME ====================
startGameBtn.addEventListener('click', startGame);

function startGame() {
    // Read custom score if needed
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
        };
    });
    state.currentPlayerIndex = 0;
    state.round = 1;
    state.darts = [];
    state.currentMultiplier = 1;
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
    state.currentMultiplier = 1;

    $$('.mult-btn').forEach(b => b.classList.remove('active'));
    $$('.mult-btn')[0].classList.add('active');

    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
    updateDartActionButtons();
    updateCurrentPlayerIndicator();
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
            const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : '';
            return d.value === 0 ? 'Miss' : `${prefix}${d.value}`;
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

// ==================== INPUT HANDLING ====================

// Multiplier buttons
$$('.mult-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.mult-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentMultiplier = +btn.dataset.mult;
    });
});

// Number pad
$$('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (state.darts.length >= 3 || state.gameOver) return;

        const value = +btn.dataset.num;
        let multiplier = state.currentMultiplier;

        // Triple bull isn't possible, cap at double
        if (value === 25 && multiplier === 3) multiplier = 2;
        if (value === 0) multiplier = 1;

        const score = value * multiplier;
        state.darts.push({ value, multiplier, score });

        if (navigator.vibrate) navigator.vibrate(15);

        updateDartTracker();
        updateScoreDisplay();
        updateSubmitButton();
        updateDartActionButtons();

        if (state.darts.length === 3) submitTurnBtn.focus();
    });
});

// ==================== UNDO DART ====================
undoDartBtn.addEventListener('click', () => {
    if (state.darts.length === 0) return;
    state.darts.pop();
    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
    updateDartActionButtons();
});

// ==================== CLEAR ROUND ====================
clearRoundBtn.addEventListener('click', () => {
    if (state.darts.length === 0) return;
    state.darts = [];
    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
    updateDartActionButtons();
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

    // Save to history for undo
    state.history.push({
        playerIndex: state.currentPlayerIndex,
        scoreBeforeTurn,
        darts: [...state.darts],
        round: state.round,
        wasBust: isBust,
    });

    if (isBust) {
        bustAnimation();
        state.scoreHistory[state.currentPlayerIndex].push(scoreBeforeTurn);
    } else {
        // Valid turn
        player.score = newScore;
        player.turns++;
        player.totalScored += turnTotal;
        player.dartsThrown += state.darts.length;
        if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;

        state.scoreHistory[state.currentPlayerIndex].push(newScore);

        // Check win
        const won = checkWin(newScore);
        if (won && !player.finished) {
            player.finished = true;
            player.finishOrder = state.winners.length;
            state.winners.push(state.currentPlayerIndex);

            renderPlayerCards();
            updateSeeResultsBtn();
            showWinnerBanner(state.currentPlayerIndex);
            return; // Don't advance — banner handles it
        }
    }

    advanceToNextPlayer();
}

function checkWin(newScore) {
    if (state.checkoutRule === 'below-zero') {
        return newScore < 0;
    }
    return newScore === 0;
}

function checkBust(newScore, darts) {
    if (state.checkoutRule === 'below-zero') return false;

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
        // Safety net — all finished
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

    // Determine if all players have finished
    const activePlayers = state.players.filter(p => !p.finished);
    const allFinished = activePlayers.length === 0;

    // Show/hide buttons
    $('#banner-dismiss-btn').style.display = allFinished ? 'none' : 'inline-block';
    $('#banner-see-results-btn').style.display = 'inline-block';

    // Mini confetti
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

// Continue Playing button
$('#banner-dismiss-btn').addEventListener('click', () => {
    winnerBanner.style.display = 'none';
    advanceToNextPlayer();
});

// See Results button (from banner)
$('#banner-see-results-btn').addEventListener('click', () => {
    winnerBanner.style.display = 'none';
    finishGame();
});

// See Results button (from header)
seeResultsHeaderBtn.addEventListener('click', () => {
    finishGame();
});

// ==================== UNDO LAST SUBMITTED TURN ====================
$('#undo-btn').addEventListener('click', () => {
    if (state.history.length === 0) return;

    // If on finish screen, go back to game
    if (finishScreen.classList.contains('active')) {
        switchScreen(gameScreen);
    }

    const last = state.history.pop();
    const player = state.players[last.playerIndex];

    // Un-finish player if this was their winning turn
    if (player.finished) {
        player.finished = false;
        player.finishOrder = -1;
        state.winners = state.winners.filter(w => w !== last.playerIndex);
        state.gameOver = false;
    }

    // Revert score
    player.score = last.scoreBeforeTurn;

    // Remove last score history entry
    if (state.scoreHistory[last.playerIndex].length > 1) {
        state.scoreHistory[last.playerIndex].pop();
    }

    // Revert stats only if it wasn't a bust
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
    const checkoutLabel = state.checkoutRule === 'below-zero' ? 'Below Zero' :
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
            <div class="lb-score">${p.finished ? (state.checkoutRule === 'below-zero' ? p.score : '0') : p.score}</div>
        `;
        lbEl.appendChild(card);
    });

    // ---- Chart ----
    drawScoreChart();

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

    // Background
    ctx.fillStyle = '#1a2234';
    ctx.fillRect(0, 0, W, H);

    // Grid
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

    // Zero line
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

    // X-axis labels
    ctx.fillStyle = '#5a6478';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < maxLen; i++) {
        if (maxLen > 20 && i % Math.ceil(maxLen / 12) !== 0 && i !== maxLen - 1) continue;
        ctx.fillText(i, toX(i), H - pad.bottom + 14);
    }

    // Player lines
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

        // Dots
        data.forEach((val, i) => {
            const x = toX(i);
            const y = toY(val);
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    // Legend
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

// ==================== INIT ====================
renderSetupPlayers();
state.startingScore = 301;
state.checkoutRule = 'below-zero';
