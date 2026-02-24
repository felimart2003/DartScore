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
    startingScore: 501,
    checkoutRule: 'double',
    players: [],
    currentPlayerIndex: 0,
    round: 1,
    darts: [],           // current turn darts: [{value, multiplier, score}]
    currentMultiplier: 1,
    history: [],         // undo stack: [{playerIndex, scoreBeforeTurn, darts}]
    gameOver: false,
};

// ==================== DOM REFS ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const setupScreen = $('#setup-screen');
const gameScreen = $('#game-screen');
const winnerScreen = $('#winner-screen');
const playerList = $('#player-list');
const addPlayerBtn = $('#add-player-btn');
const startGameBtn = $('#start-game-btn');
const playersContainer = $('#players-container');
const scoreDisplay = $('#score-display');
const currentPlayerName = $('#current-player-name');
const currentAvatar = $('#current-avatar');
const submitTurnBtn = $('#submit-turn-btn');
const roundNum = $('#round-num');
const gameModeLabel = $('#game-mode-label');
const helpBtn = $('#help-btn');
const rulesModal = $('#rules-modal');
const avatarModal = $('#avatar-modal');
const avatarGrid = $('#avatar-grid');

// ==================== SETUP ====================

let setupPlayers = [
    { name: '', avatar: '🎯', color: PLAYER_COLORS[0] },
    { name: '', avatar: '🏹', color: PLAYER_COLORS[1] },
];

let editingAvatarIndex = null;

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
            ${setupPlayers.length > 2 ? `
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
            renderSetupPlayers();
        });
    });

    // Toggle add btn
    addPlayerBtn.style.display = setupPlayers.length >= 8 ? 'none' : 'flex';
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
    });
    renderSetupPlayers();
});

// Mode selection
$$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.startingScore = +btn.dataset.score;
    });
});

// Checkout selection
$$('.checkout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.checkout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.checkoutRule = btn.dataset.checkout;
    });
});

// Start game
startGameBtn.addEventListener('click', startGame);

function startGame() {
    state.players = setupPlayers.map((p, i) => ({
        name: p.name || `Player ${i + 1}`,
        avatar: p.avatar,
        color: p.color,
        score: state.startingScore,
        turns: 0,
        totalScored: 0,
        highestTurn: 0,
        dartsThrown: 0,
    }));
    state.currentPlayerIndex = 0;
    state.round = 1;
    state.darts = [];
    state.currentMultiplier = 1;
    state.history = [];
    state.gameOver = false;

    gameModeLabel.textContent = state.startingScore;
    roundNum.textContent = '1';

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
avatarModal.addEventListener('click', (e) => {
    if (e.target === avatarModal) avatarModal.classList.remove('open');
});

// ==================== RULES MODAL ====================
helpBtn.addEventListener('click', () => rulesModal.classList.add('open'));
$('#close-rules').addEventListener('click', () => rulesModal.classList.remove('open'));
rulesModal.addEventListener('click', (e) => {
    if (e.target === rulesModal) rulesModal.classList.remove('open');
});

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
        card.className = `player-card${i === state.currentPlayerIndex ? ' active' : ''}`;
        card.dataset.index = i;

        const avg = p.turns > 0 ? Math.round(p.totalScored / p.turns) : 0;

        card.innerHTML = `
            <div class="card-avatar" style="border-color:${i === state.currentPlayerIndex ? p.color : 'var(--border)'}">
                ${p.avatar}
            </div>
            <div class="card-name">${p.name}</div>
            <div class="card-score">${p.score}</div>
            <div class="card-last-score">${p.turns > 0 ? `Avg: ${avg}` : '—'}</div>
        `;
        playersContainer.appendChild(card);
    });

    // Scroll active card into view
    const activeCard = playersContainer.querySelector('.player-card.active');
    if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function resetTurnInput() {
    state.darts = [];
    state.currentMultiplier = 1;

    // Reset multiplier buttons
    $$('.mult-btn').forEach(b => b.classList.remove('active'));
    $$('.mult-btn')[0].classList.add('active');

    updateDartTracker();
    updateScoreDisplay();
    updateSubmitButton();
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
    scoreDisplay.classList.remove('score-pop');
    void scoreDisplay.offsetWidth; // reflow
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

        // Bull special: 25 single or 50 double, no triple
        if (value === 25 && multiplier === 3) {
            multiplier = 2; // triple bull -> treat as double bull (50)
        }

        // Miss
        if (value === 0) {
            multiplier = 1;
        }

        const score = value * multiplier;

        state.darts.push({ value, multiplier, score });

        // Haptic feedback on mobile
        if (navigator.vibrate) navigator.vibrate(15);

        updateDartTracker();
        updateScoreDisplay();
        updateSubmitButton();

        // Auto-submit after 3 darts
        if (state.darts.length === 3) {
            submitTurnBtn.focus();
        }
    });
});

// Submit turn
submitTurnBtn.addEventListener('click', submitTurn);

function submitTurn() {
    if (state.darts.length === 0 || state.gameOver) return;

    const player = state.players[state.currentPlayerIndex];
    const turnTotal = state.darts.reduce((sum, d) => sum + d.score, 0);
    const scoreBeforeTurn = player.score;
    const newScore = player.score - turnTotal;

    // Save to history for undo
    state.history.push({
        playerIndex: state.currentPlayerIndex,
        scoreBeforeTurn: scoreBeforeTurn,
        darts: [...state.darts],
        round: state.round,
    });

    // Check bust
    const isBust = checkBust(newScore, state.darts);

    if (isBust) {
        // Bust - score reverts
        bustAnimation();
    } else if (newScore === 0) {
        // Winner!
        player.score = 0;
        player.turns++;
        player.totalScored += turnTotal;
        player.dartsThrown += state.darts.length;
        if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;

        renderPlayerCards();
        showWinner(state.currentPlayerIndex);
        return;
    } else {
        // Valid turn
        player.score = newScore;
        player.turns++;
        player.totalScored += turnTotal;
        player.dartsThrown += state.darts.length;
        if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;
    }

    // Next player
    advanceToNextPlayer();
}

function checkBust(newScore, darts) {
    if (newScore < 0) return true;

    if (state.checkoutRule === 'double') {
        // Can't finish on 1 with double out
        if (newScore === 1) return true;
        // If exactly 0, last dart must be a double
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
    // Show bust text briefly on score display
    scoreDisplay.textContent = 'BUST';
    scoreDisplay.style.color = 'var(--red)';
    setTimeout(() => {
        scoreDisplay.style.color = '';
    }, 800);
}

function advanceToNextPlayer() {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

    // Check if we've wrapped around to start new round
    if (state.currentPlayerIndex === 0) {
        state.round++;
        roundNum.textContent = state.round;
    }

    renderPlayerCards();
    resetTurnInput();
}

// ==================== UNDO ====================
$('#undo-btn').addEventListener('click', () => {
    if (state.history.length === 0 || state.gameOver) return;

    const last = state.history.pop();
    state.players[last.playerIndex].score = last.scoreBeforeTurn;
    
    // Revert stats
    const turnTotal = last.darts.reduce((sum, d) => sum + d.score, 0);
    const player = state.players[last.playerIndex];
    // Only revert stats if this wasn't a bust (player stats wouldn't have been updated for busts)
    // We check if current player index has changed from last entry
    if (state.currentPlayerIndex !== last.playerIndex) {
        player.turns = Math.max(0, player.turns - 1);
        player.totalScored = Math.max(0, player.totalScored - turnTotal);
        player.dartsThrown = Math.max(0, player.dartsThrown - last.darts.length);
        // highestTurn is hard to revert perfectly, leave it
    }

    state.currentPlayerIndex = last.playerIndex;
    state.round = last.round;
    roundNum.textContent = state.round;

    renderPlayerCards();
    resetTurnInput();
});

// ==================== BACK TO SETUP ====================
$('#back-btn').addEventListener('click', () => {
    if (state.history.length > 0) {
        if (!confirm('Leave current game? Progress will be lost.')) return;
    }
    switchScreen(setupScreen);
});

// ==================== WINNER ====================
function showWinner(playerIndex) {
    state.gameOver = true;
    const player = state.players[playerIndex];

    $('#winner-name').textContent = player.name;
    $('#winner-avatar').textContent = player.avatar;

    const avg = player.turns > 0 ? (player.totalScored / player.turns).toFixed(1) : 0;

    $('#winner-stats').innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${player.turns}</div>
            <div class="stat-label">Rounds</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${avg}</div>
            <div class="stat-label">Avg / Turn</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${player.highestTurn}</div>
            <div class="stat-label">Best Turn</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${player.dartsThrown}</div>
            <div class="stat-label">Darts</div>
        </div>
    `;

    switchScreen(winnerScreen);
    launchConfetti();
}

$('#rematch-btn').addEventListener('click', () => {
    // Same players, reset scores
    startGame();
});

$('#new-game-btn').addEventListener('click', () => {
    switchScreen(setupScreen);
});

// ==================== CONFETTI ====================
function launchConfetti() {
    const canvas = $('#confetti-canvas');
    canvas.innerHTML = '';
    const colors = ['#00e5ff', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#f472b6'];

    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = -10 + 'px';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 8 + 5) + 'px';
        piece.style.height = (Math.random() * 8 + 5) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
        piece.style.animationDelay = (Math.random() * 1.5) + 's';
        canvas.appendChild(piece);
    }

    // Clean up confetti after animation
    setTimeout(() => { canvas.innerHTML = ''; }, 5000);
}

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

    // Number keys 0-9
    if (e.key >= '0' && e.key <= '9') {
        // This is a simple shortcut; for 10-20 and bull we rely on clicks
    }

    if (e.key === 'Enter') {
        submitTurn();
    }

    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        $('#undo-btn').click();
    }
});

// ==================== INIT ====================
renderSetupPlayers();

// Set default starting score
state.startingScore = 501;
