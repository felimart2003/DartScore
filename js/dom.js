/* ============================================
   DOM Element References & Utilities
   ============================================ */

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

// Screens
export const setupScreen  = $('#setup-screen');
export const gameScreen   = $('#game-screen');
export const finishScreen = $('#finish-screen');

// Setup
export const playerList   = $('#player-list');
export const addPlayerBtn = $('#add-player-btn');
export const startGameBtn = $('#start-game-btn');

// Game header
export const roundNum              = $('#round-num');
export const gameModeLabel         = $('#game-mode-label');
export const checkoutRuleLabel     = $('#checkout-rule-label');
export const seeResultsHeaderBtn   = $('#see-results-header-btn');

// Player display
export const playersContainer = $('#players-container');

// Score input
export const scoreDisplay      = $('#score-display');
export const currentPlayerName = $('#current-player-name');
export const currentAvatar     = $('#current-avatar');
export const submitTurnBtn     = $('#submit-turn-btn');
export const undoDartBtn       = $('#undo-dart-btn');
export const clearRoundBtn     = $('#clear-round-btn');

// Dartboard
export const dartboardCanvas    = $('#dartboard-canvas');
export const dartboardContainer = $('#dartboard-container');
export const magnifier          = $('#magnifier');
export const magnifierCanvas    = $('#magnifier-canvas');
export const magnifierLabel     = $('#magnifier-label');
export const missBtn            = $('#miss-btn');

// Winner banner
export const winnerBanner = $('#winner-banner');

// Modals
export const helpBtn     = $('#help-btn');
export const rulesModal  = $('#rules-modal');
export const avatarModal = $('#avatar-modal');
export const avatarGrid  = $('#avatar-grid');

/** Switch to a target screen, hiding all others */
export function switchScreen(target) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    target.classList.add('active');
    // Help FAB only visible on setup screen
    const fab = $('#help-btn');
    if (fab) fab.style.display = (target === $('#setup-screen')) ? 'flex' : 'none';
}
