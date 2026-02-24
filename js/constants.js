/* ============================================
   Constants & Configuration
   ============================================ */

export const AVATARS = [
    '🎯', '🏹', '🦅', '🐉', '🔥', '⚡',
    '🌟', '💎', '🎪', '🎭', '🃏', '🎲',
    '🐺', '🦁', '🐻', '🦊', '🐯', '🦈',
    '👑', '🗡️', '🛡️', '⚔️', '🏆', '🎖️',
    '🚀', '💫', '🌙', '☀️', '🌊', '🍀',
    '😎', '🤠', '👻', '🤖', '👽', '🧙',
    '🎸', '🎵', '🎮', '🕹️', '🏀', '⚽',
];

export const PLAYER_COLORS = [
    '#00e5ff', '#f87171', '#34d399', '#fbbf24',
    '#a78bfa', '#fb923c', '#f472b6', '#38bdf8',
];

/** Clockwise sector order starting from the top (12 o'clock) */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Ring boundaries as a fraction of board radius */
export const RING = {
    BULL_INNER:   0.06,
    BULL_OUTER:   0.16,
    TRIPLE_INNER: 0.52,
    TRIPLE_OUTER: 0.60,
    DOUBLE_INNER: 0.88,
    DOUBLE_OUTER: 1.0,
    NUMBER_RING:  1.12,
};

export const BOARD_COLORS = {
    darkArea:  '#1a1e30',
    lightArea: '#c8bc96',
    redRing:   '#d93c47',
    greenRing: '#2d8a4e',
    greenBull: '#2d8a4e',
    redBull:   '#d93c47',
    wire:      '#7a8899',
    wireThin:  '#6a7888',
    boardBg:   '#111827',
    numColor:  '#b0b8c8',
};

export const CHECKOUT_DESCRIPTIONS = {
    'zero-or-less': 'Score reaches zero or below to win. No bust possible.',
    'straight':     'Must reach exactly zero. Going below zero is a bust.',
    'double':       'Must finish on a double at exactly zero. Going below zero or to 1 is a bust.',
};
