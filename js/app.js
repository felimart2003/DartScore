/* ============================================
   DartScore — Main Entry Point
   ============================================ */

import { $, gameScreen, rulesModal, avatarModal, setupScreen, switchScreen } from './dom.js';
import { initSetup, renderSetupPlayers, startGame } from './setup.js';
import { initGame, submitTurn } from './game.js';
import { resizeDartboard } from './board.js';

// Initialize event listeners
initSetup();
initGame();

// Render initial setup state
renderSetupPlayers();

// ==================== RULES MODAL ====================

$('#help-btn').addEventListener('click', () => rulesModal.classList.add('open'));
$('#close-rules').addEventListener('click', () => rulesModal.classList.remove('open'));
rulesModal.addEventListener('click', (e) => { if (e.target === rulesModal) rulesModal.classList.remove('open'); });

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
        $('#undo-dart-btn').click();
    }
    if (e.key === 'Escape') {
        $('#clear-round-btn').click();
    }
});

// ==================== WINDOW RESIZE ====================

window.addEventListener('resize', () => {
    if (gameScreen.classList.contains('active')) {
        resizeDartboard();
    }
});
