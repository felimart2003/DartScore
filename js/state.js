/* ============================================
   Shared Application State
   ============================================ */

import { PLAYER_COLORS } from './constants.js';

/** Active game state */
export const state = {
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

/** Setup screen player configuration */
export const setup = {
    players: [
        { name: '', avatar: '🎯', color: PLAYER_COLORS[0], handicap: 0 },
        { name: '', avatar: '🏹', color: PLAYER_COLORS[1], handicap: 0 },
    ],
    editingAvatarIndex: null,
    advancedOpen: false,
};

/** Dartboard canvas rendering state */
export const board = {
    size: 0,
    centerX: 0,
    centerY: 0,
    radius: 0,
    dpr: 1,
    offscreen: null,
    active: false,
    currentHit: null,
};
