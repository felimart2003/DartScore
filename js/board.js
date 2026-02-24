/* ============================================
   Dartboard Rendering & Hit Detection
   ============================================ */

import { BOARD_ORDER, RING, BOARD_COLORS } from './constants.js';
import { state, board } from './state.js';
import { dartboardCanvas, dartboardContainer, magnifierCanvas } from './dom.js';

// ==================== SEGMENT DRAWING ====================

export function drawSegment(ctx, cx, cy, innerR, outerR, startAngle, endAngle, fillColor) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
}

// ==================== BOARD SIZING ====================

export function resizeDartboard() {
    const rect = dartboardContainer.getBoundingClientRect();
    const size = Math.min(rect.width - 4, rect.height - 4);
    if (size <= 0) return;

    board.dpr = window.devicePixelRatio || 1;
    board.size = size;
    board.centerX = size / 2;
    board.centerY = size / 2;
    board.radius = size * 0.42;

    dartboardCanvas.style.width = size + 'px';
    dartboardCanvas.style.height = size + 'px';
    dartboardCanvas.width = Math.round(size * board.dpr);
    dartboardCanvas.height = Math.round(size * board.dpr);

    buildOffscreenBoard();
    drawDartboard();
}

function buildOffscreenBoard() {
    board.offscreen = document.createElement('canvas');
    board.offscreen.width = dartboardCanvas.width;
    board.offscreen.height = dartboardCanvas.height;
    const ctx = board.offscreen.getContext('2d');
    ctx.scale(board.dpr, board.dpr);
    drawBoardGraphics(ctx, board.centerX, board.centerY, board.radius);
}

function drawBoardGraphics(ctx, cx, cy, R) {
    ctx.fillStyle = BOARD_COLORS.boardBg;
    ctx.fillRect(0, 0, board.size, board.size);

    const segAngle = Math.PI * 2 / 20;

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

    // Wire: ring boundaries
    const wireRings = [RING.BULL_INNER, RING.BULL_OUTER, RING.TRIPLE_INNER, RING.TRIPLE_OUTER, RING.DOUBLE_INNER, RING.DOUBLE_OUTER];
    wireRings.forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * r, 0, Math.PI * 2);
        ctx.strokeStyle = BOARD_COLORS.wire;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    });

    // Wire: segment separators
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
        ctx.fillText(BOARD_ORDER[i], cx + Math.cos(angle) * nr, cy + Math.sin(angle) * nr);
    }
}

// ==================== BOARD DRAWING ====================

export function drawDartboard(highlightSegIndex, highlightRing) {
    if (!board.offscreen) return;
    const ctx = dartboardCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(board.offscreen, 0, 0);
    ctx.scale(board.dpr, board.dpr);

    if (highlightSegIndex !== undefined && highlightSegIndex !== null) {
        drawHighlight(ctx, board.centerX, board.centerY, board.radius, highlightSegIndex, highlightRing);
    }

    drawTurnDarts(ctx, board.centerX, board.centerY, board.radius);
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
    } else if (ring !== 'miss') {
        let innerR, outerR;
        if (ring === 'inner-single')      { innerR = RING.BULL_OUTER;   outerR = RING.TRIPLE_INNER; }
        else if (ring === 'triple')       { innerR = RING.TRIPLE_INNER; outerR = RING.TRIPLE_OUTER; }
        else if (ring === 'outer-single') { innerR = RING.TRIPLE_OUTER; outerR = RING.DOUBLE_INNER; }
        else if (ring === 'double')       { innerR = RING.DOUBLE_INNER; outerR = RING.DOUBLE_OUTER; }
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

export function getHitFromPosition(canvasX, canvasY) {
    const dx = canvasX - board.centerX;
    const dy = canvasY - board.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normDist = dist / board.radius;

    if (normDist > RING.DOUBLE_OUTER) {
        return { value: 0, multiplier: 1, score: 0, ring: 'miss', segIndex: -1 };
    }
    if (normDist <= RING.BULL_INNER) {
        return { value: 25, multiplier: 2, score: 50, ring: 'inner-bull', segIndex: -1 };
    }
    if (normDist <= RING.BULL_OUTER) {
        return { value: 25, multiplier: 1, score: 25, ring: 'outer-bull', segIndex: -1 };
    }

    let angle = Math.atan2(dy, dx);
    angle += Math.PI / 2;
    angle += Math.PI / 20;
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;

    const segIndex = Math.floor(angle / (Math.PI * 2 / 20)) % 20;
    const value = BOARD_ORDER[segIndex];

    let multiplier, ring;
    if (normDist <= RING.TRIPLE_INNER)      { multiplier = 1; ring = 'inner-single'; }
    else if (normDist <= RING.TRIPLE_OUTER) { multiplier = 3; ring = 'triple'; }
    else if (normDist <= RING.DOUBLE_INNER) { multiplier = 1; ring = 'outer-single'; }
    else                                    { multiplier = 2; ring = 'double'; }

    return { value, multiplier, score: value * multiplier, ring, segIndex };
}

export function getHitLabel(hit) {
    if (!hit || hit.ring === 'miss') return 'MISS';
    if (hit.ring === 'inner-bull') return 'BULL · 50';
    if (hit.ring === 'outer-bull') return '25';
    const prefix = hit.multiplier === 3 ? 'T' : hit.multiplier === 2 ? 'D' : '';
    return `${prefix}${hit.value} · ${hit.score}`;
}

/** Convert pointer event to canvas-local coordinates */
export function getCanvasPos(e) {
    const rect = dartboardCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ==================== MAGNIFIER DRAWING ====================

export function drawMagnifierContent(canvasPos) {
    const magSize = 130;
    const zoom = 2.5;
    const sourceSize = magSize / zoom;

    magnifierCanvas.width = Math.round(magSize * board.dpr);
    magnifierCanvas.height = Math.round(magSize * board.dpr);
    magnifierCanvas.style.width = magSize + 'px';
    magnifierCanvas.style.height = magSize + 'px';

    const magCtx = magnifierCanvas.getContext('2d');
    const internalMagSize = magSize * board.dpr;
    const center = internalMagSize / 2;
    magCtx.clearRect(0, 0, internalMagSize, internalMagSize);

    // Clip to circle
    magCtx.save();
    magCtx.beginPath();
    magCtx.arc(center, center, center, 0, Math.PI * 2);
    magCtx.clip();

    // Source area
    const sourceR = (sourceSize / 2) * board.dpr;
    const sx = canvasPos.x * board.dpr - sourceR;
    const sy = canvasPos.y * board.dpr - sourceR;
    const sSize = sourceR * 2;
    magCtx.drawImage(dartboardCanvas, sx, sy, sSize, sSize, 0, 0, internalMagSize, internalMagSize);

    // Crosshair
    magCtx.strokeStyle = 'rgba(255,255,255,0.7)';
    magCtx.lineWidth = 1.5 * board.dpr;
    magCtx.beginPath();
    magCtx.moveTo(center - 10 * board.dpr, center);
    magCtx.lineTo(center + 10 * board.dpr, center);
    magCtx.moveTo(center, center - 10 * board.dpr);
    magCtx.lineTo(center, center + 10 * board.dpr);
    magCtx.stroke();

    // Center dot
    magCtx.fillStyle = 'rgba(0, 229, 255, 0.9)';
    magCtx.beginPath();
    magCtx.arc(center, center, 2.5 * board.dpr, 0, Math.PI * 2);
    magCtx.fill();

    magCtx.restore();

    // Outer border
    magCtx.strokeStyle = '#00e5ff';
    magCtx.lineWidth = 2.5 * board.dpr;
    magCtx.beginPath();
    magCtx.arc(center, center, center - 1.5 * board.dpr, 0, Math.PI * 2);
    magCtx.stroke();
}

// ==================== MINI BOARD (for hotspot visualization) ====================

export function drawMiniBoard(ctx, cx, cy, R, size) {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, size, size);

    const segAngle = Math.PI * 2 / 20;

    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        drawSegment(ctx, cx, cy, R * RING.DOUBLE_INNER, R * RING.DOUBLE_OUTER, startA, endA,
            (i % 2 === 0) ? 'rgba(217,60,71,0.35)' : 'rgba(45,138,78,0.35)');
    }

    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        drawSegment(ctx, cx, cy, R * RING.TRIPLE_OUTER, R * RING.DOUBLE_INNER, startA, endA,
            (i % 2 === 0) ? 'rgba(26,30,48,0.6)' : 'rgba(200,188,150,0.2)');
    }

    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        drawSegment(ctx, cx, cy, R * RING.TRIPLE_INNER, R * RING.TRIPLE_OUTER, startA, endA,
            (i % 2 === 0) ? 'rgba(217,60,71,0.35)' : 'rgba(45,138,78,0.35)');
    }

    for (let i = 0; i < 20; i++) {
        const startA = -Math.PI / 2 + i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        drawSegment(ctx, cx, cy, R * RING.BULL_OUTER, R * RING.TRIPLE_INNER, startA, endA,
            (i % 2 === 0) ? 'rgba(26,30,48,0.6)' : 'rgba(200,188,150,0.2)');
    }

    ctx.beginPath();
    ctx.arc(cx, cy, R * RING.BULL_OUTER, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(45,138,78,0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, R * RING.BULL_INNER, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(217,60,71,0.35)';
    ctx.fill();

    [RING.BULL_INNER, RING.BULL_OUTER, RING.TRIPLE_INNER, RING.TRIPLE_OUTER, RING.DOUBLE_INNER, RING.DOUBLE_OUTER].forEach(r => {
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

    const numFontSize = Math.max(7, R * 0.10);
    ctx.font = `bold ${numFontSize}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(176,184,200,0.5)';

    for (let i = 0; i < 20; i++) {
        const angle = -Math.PI / 2 + i * segAngle;
        const nr = R * RING.NUMBER_RING;
        ctx.fillText(BOARD_ORDER[i], cx + Math.cos(angle) * nr, cy + Math.sin(angle) * nr);
    }
}

export function drawHotspotDots(ctx, cx, cy, R, hits, color) {
    if (hits.length === 0) return;

    hits.forEach(hit => {
        const x = cx + hit.normX * R;
        const y = cy + hit.normY * R;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
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
