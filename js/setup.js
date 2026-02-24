/* ============================================
   Setup Screen: Players, Modes, Handicaps
   ============================================ */

import { AVATARS, PLAYER_COLORS, CHECKOUT_DESCRIPTIONS } from './constants.js';
import { state, setup } from './state.js';
import {
    $, $$, playerList, addPlayerBtn, avatarModal, avatarGrid,
    gameScreen, switchScreen, gameModeLabel, checkoutRuleLabel, roundNum, winnerBanner,
    seeResultsHeaderBtn, startGameBtn
} from './dom.js';
import { renderPlayerCards, resetTurnInput } from './game.js';
import { resizeDartboard } from './board.js';

// ==================== RENDER PLAYER LIST ====================

export function renderSetupPlayers() {
    playerList.innerHTML = '';
    setup.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-entry';
        div.innerHTML = `
            <button class="player-avatar-btn" data-index="${i}" title="Choose avatar">${p.avatar}</button>
            <input class="player-name-input" type="text" placeholder="Player ${i + 1}"
                   value="${p.name}" data-index="${i}" maxlength="16" autocomplete="off">
            <div class="player-color-dot" style="background:${p.color}"></div>
            ${setup.players.length > 1 ? `
            <button class="remove-player-btn" data-index="${i}" title="Remove player">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>` : ''}
        `;
        playerList.appendChild(div);
    });

    playerList.querySelectorAll('.player-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            setup.players[+e.target.dataset.index].name = e.target.value;
            if (setup.advancedOpen) renderHandicaps();
        });
    });

    playerList.querySelectorAll('.player-avatar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setup.editingAvatarIndex = +e.currentTarget.dataset.index;
            openAvatarModal();
        });
    });

    playerList.querySelectorAll('.remove-player-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = +e.currentTarget.dataset.index;
            setup.players.splice(idx, 1);
            setup.players.forEach((p, i) => p.color = PLAYER_COLORS[i % PLAYER_COLORS.length]);
            renderSetupPlayers();
        });
    });

    addPlayerBtn.style.display = setup.players.length >= 8 ? 'none' : 'flex';
    if (setup.advancedOpen) renderHandicaps();
}

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

    setup.players.forEach((p, i) => {
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
            setup.players[idx].handicap += dir * 10;
            setup.players[idx].handicap = Math.max(-9990, Math.min(9990, setup.players[idx].handicap));
            renderHandicaps();
        });
    });

    list.querySelectorAll('.handicap-reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setup.players[+e.currentTarget.dataset.index].handicap = 0;
            renderHandicaps();
        });
    });
}

// ==================== AVATAR MODAL ====================

function openAvatarModal() {
    avatarGrid.innerHTML = '';
    AVATARS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'avatar-option';
        if (setup.editingAvatarIndex !== null && setup.players[setup.editingAvatarIndex].avatar === emoji) {
            btn.classList.add('selected');
        }
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
            if (setup.editingAvatarIndex !== null) {
                setup.players[setup.editingAvatarIndex].avatar = emoji;
                renderSetupPlayers();
            }
            avatarModal.classList.remove('open');
        });
        avatarGrid.appendChild(btn);
    });
    avatarModal.classList.add('open');
}

// ==================== START GAME ====================

export function startGame() {
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

    state.players = setup.players.map((p, i) => {
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
    const checkoutLabels = { 'zero-or-less': 'Zero or Less', 'straight': 'Straight Out', 'double': 'Double Out' };
    checkoutRuleLabel.textContent = checkoutLabels[state.checkoutRule] || state.checkoutRule;
    roundNum.textContent = '1';
    winnerBanner.style.display = 'none';
    seeResultsHeaderBtn.style.display = 'none';

    switchScreen(gameScreen);
    renderPlayerCards();
    resetTurnInput();
    requestAnimationFrame(() => resizeDartboard());
}

// ==================== INITIALIZE SETUP EVENTS ====================

export function initSetup() {
    // Add player
    addPlayerBtn.addEventListener('click', () => {
        if (setup.players.length >= 8) return;
        const idx = setup.players.length;
        const usedAvatars = setup.players.map(p => p.avatar);
        const nextAvatar = AVATARS.find(a => !usedAvatars.includes(a)) || AVATARS[idx % AVATARS.length];
        setup.players.push({
            name: '',
            avatar: nextAvatar,
            color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
            handicap: 0,
        });
        renderSetupPlayers();
    });

    // Advanced settings toggle
    const toggleBtn = $('#toggle-advanced-btn');
    const advancedPanel = $('#advanced-settings');
    toggleBtn.addEventListener('click', () => {
        setup.advancedOpen = !setup.advancedOpen;
        toggleBtn.classList.toggle('open', setup.advancedOpen);
        advancedPanel.classList.toggle('open', setup.advancedOpen);
        if (setup.advancedOpen) renderHandicaps();
    });

    // Clear all handicaps
    $('#clear-handicaps-btn').addEventListener('click', () => {
        setup.players.forEach(p => p.handicap = 0);
        renderHandicaps();
    });

    // Mode buttons
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
            if (setup.advancedOpen) renderHandicaps();
        });
    });

    // Custom score input
    $('#custom-score-input').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val && val >= 2) state.startingScore = val;
        if (setup.advancedOpen) renderHandicaps();
    });

    // Checkout buttons
    $$('.checkout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.checkout-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.checkoutRule = btn.dataset.checkout;
            $('#checkout-hint').textContent = CHECKOUT_DESCRIPTIONS[state.checkoutRule] || '';
        });
    });

    // Start game
    startGameBtn.addEventListener('click', startGame);

    // Avatar modal close
    $('#close-avatar').addEventListener('click', () => avatarModal.classList.remove('open'));
    avatarModal.addEventListener('click', (e) => { if (e.target === avatarModal) avatarModal.classList.remove('open'); });
}
