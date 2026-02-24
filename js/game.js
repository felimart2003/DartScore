/* ============================================
   Game Screen: Logic, Rendering & Interaction
   ============================================ */

import { state, board } from './state.js';
import {
    $, playersContainer, scoreDisplay, currentPlayerName, currentAvatar,
    submitTurnBtn, roundNum, undoDartBtn, clearRoundBtn, winnerBanner,
    seeResultsHeaderBtn, dartboardCanvas, dartboardContainer,
    magnifier, magnifierLabel, missBtn, gameScreen, finishScreen,
    setupScreen, switchScreen
} from './dom.js';
import { resizeDartboard, drawDartboard, getHitFromPosition, getHitLabel, drawMagnifierContent, getCanvasPos } from './board.js';
import { renderFinishScreen } from './stats.js';

// ==================== PLAYER CARDS ====================

export function renderPlayerCards() {
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

// ==================== TURN INPUT ====================

export function resetTurnInput() {
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

// ==================== BOARD INTERACTION ====================

function onBoardPointerDown(e) {
    if (state.darts.length >= 3 || state.gameOver) return;
    e.preventDefault();
    dartboardCanvas.setPointerCapture(e.pointerId);
    board.active = true;

    const pos = getCanvasPos(e);
    board.currentHit = getHitFromPosition(pos.x, pos.y);
    drawDartboard(board.currentHit.segIndex, board.currentHit.ring);
    showMagnifier(e, pos, board.currentHit);
}

function onBoardPointerMove(e) {
    if (!board.active) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    board.currentHit = getHitFromPosition(pos.x, pos.y);
    drawDartboard(board.currentHit.segIndex, board.currentHit.ring);
    updateMagnifierView(e, pos, board.currentHit);
}

function onBoardPointerUp(e) {
    if (!board.active) return;
    e.preventDefault();
    board.active = false;
    hideMagnifier();

    const pos = getCanvasPos(e);
    const hit = getHitFromPosition(pos.x, pos.y);
    registerDart(hit, pos);
}

function onBoardPointerCancel() {
    board.active = false;
    hideMagnifier();
    board.currentHit = null;
    drawDartboard();
}

function registerDart(hit, canvasPos) {
    if (state.darts.length >= 3 || state.gameOver) return;

    const normX = (canvasPos.x - board.centerX) / board.radius;
    const normY = (canvasPos.y - board.centerY) / board.radius;

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

// ==================== MAGNIFIER ====================

function showMagnifier(e, canvasPos, hit) {
    magnifier.style.display = 'flex';
    positionMagnifier(e);
    drawMagnifierContent(canvasPos);
    magnifierLabel.textContent = getHitLabel(hit);
    magnifierLabel.style.color = hit.ring === 'miss' ? '#f87171' : '#00e5ff';
}

function updateMagnifierView(e, canvasPos, hit) {
    positionMagnifier(e);
    drawMagnifierContent(canvasPos);
    magnifierLabel.textContent = getHitLabel(hit);
    magnifierLabel.style.color = hit.ring === 'miss' ? '#f87171' : '#00e5ff';
}

function hideMagnifier() {
    magnifier.style.display = 'none';
    board.currentHit = null;
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

    if (top < -10) top = py + 40;
    left = Math.max(-10, Math.min(containerRect.width - magWidth + 10, left));

    magnifier.style.left = left + 'px';
    magnifier.style.top = top + 'px';
}

// ==================== TURN SUBMISSION ====================

export function submitTurn() {
    if (state.darts.length === 0 || state.gameOver) return;

    const player = state.players[state.currentPlayerIndex];
    const turnTotal = state.darts.reduce((sum, d) => sum + d.score, 0);
    const scoreBeforeTurn = player.score;
    const newScore = player.score - turnTotal;

    const isBust = checkBust(newScore, state.darts);

    const hitsToAdd = state.darts.filter(d => d.normX != null).map(d => ({
        normX: d.normX, normY: d.normY,
        value: d.value, multiplier: d.multiplier, score: d.score, ring: d.ring,
    }));

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
    if (state.checkoutRule === 'zero-or-less') return newScore <= 0;
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

export function finishGame() {
    state.gameOver = true;
    winnerBanner.style.display = 'none';
    renderFinishScreen();
    switchScreen(finishScreen);
}

// ==================== UNDO LAST SUBMITTED TURN ====================

function undoLastTurn() {
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
}

// ==================== INITIALIZE GAME EVENTS ====================

export function initGame() {
    // Board pointer events
    dartboardCanvas.addEventListener('pointerdown', onBoardPointerDown);
    dartboardCanvas.addEventListener('pointermove', onBoardPointerMove);
    dartboardCanvas.addEventListener('pointerup', onBoardPointerUp);
    dartboardCanvas.addEventListener('pointercancel', onBoardPointerCancel);

    // Miss button
    missBtn.addEventListener('click', () => {
        if (state.darts.length >= 3 || state.gameOver) return;
        registerDart(
            { value: 0, multiplier: 1, score: 0, ring: 'miss', segIndex: -1 },
            { x: board.centerX, y: board.centerY }
        );
    });

    // Undo dart
    undoDartBtn.addEventListener('click', () => {
        if (state.darts.length === 0) return;
        state.darts.pop();
        updateDartTracker();
        updateScoreDisplay();
        updateSubmitButton();
        updateDartActionButtons();
        drawDartboard();
    });

    // Clear round
    clearRoundBtn.addEventListener('click', () => {
        if (state.darts.length === 0) return;
        state.darts = [];
        updateDartTracker();
        updateScoreDisplay();
        updateSubmitButton();
        updateDartActionButtons();
        drawDartboard();
    });

    // Submit turn
    submitTurnBtn.addEventListener('click', submitTurn);

    // Banner buttons
    $('#banner-dismiss-btn').addEventListener('click', () => {
        winnerBanner.style.display = 'none';
        advanceToNextPlayer();
    });

    $('#banner-see-results-btn').addEventListener('click', () => {
        winnerBanner.style.display = 'none';
        finishGame();
    });

    seeResultsHeaderBtn.addEventListener('click', () => finishGame());

    // Undo last turn
    $('#undo-btn').addEventListener('click', undoLastTurn);

    // Back to setup
    $('#back-btn').addEventListener('click', () => {
        if (state.history.length > 0) {
            if (!confirm('Leave current game? Progress will be lost.')) return;
        }
        winnerBanner.style.display = 'none';
        switchScreen(setupScreen);
    });
}
