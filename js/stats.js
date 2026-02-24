/* ============================================
   Finish Screen: Leaderboard, Chart, Hotspots
   ============================================ */

import { state } from './state.js';
import { $ } from './dom.js';
import { drawMiniBoard, drawHotspotDots } from './board.js';

export function renderFinishScreen() {
    const checkoutLabel = state.checkoutRule === 'zero-or-less' ? 'Zero or Less' :
                          state.checkoutRule === 'straight' ? 'Straight Out' : 'Double Out';
    $('#finish-meta').textContent = `${state.startingScore} · ${checkoutLabel} · ${state.round} rounds`;

    renderLeaderboard();
    drawScoreChart();
    renderHotspots();
    renderDetailedStats();
    renderGameLog();
}

// ==================== LEADERBOARD ====================

function renderLeaderboard() {
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
}

// ==================== SCORE CHART ====================

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
    const toX = (i) => pad.left + i * xStep;
    const toY = (val) => pad.top + chartH - ((val - minScore) / scoreRange) * chartH;

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
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        data.forEach((val, i) => {
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(toX(i), toY(val), 2.5, 0, Math.PI * 2);
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

// ==================== HOTSPOTS ====================

function renderHotspots() {
    const carousel = $('#hotspot-carousel');
    const dotsContainer = $('#hotspot-dots');
    const section = $('#finish-hotspots-section');
    carousel.innerHTML = '';
    dotsContainer.innerHTML = '';

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
        drawMiniBoard(ctx, hcx, hcy, hR, hotspotSize);
        drawHotspotDots(ctx, hcx, hcy, hR, player.dartHits, player.color);

        const dot = document.createElement('button');
        dot.className = 'hotspot-dot' + (pIdx === 0 ? ' active' : '');
        dot.dataset.index = pIdx;
        dot.addEventListener('click', () => {
            carousel.children[pIdx].scrollIntoView({ behavior: 'smooth', inline: 'center' });
        });
        dotsContainer.appendChild(dot);
    });

    carousel.addEventListener('scroll', () => {
        const scrollLeft = carousel.scrollLeft;
        const slideWidth = carousel.children[0]?.offsetWidth || 1;
        const activeIdx = Math.round(scrollLeft / slideWidth);
        dotsContainer.querySelectorAll('.hotspot-dot').forEach((d, i) => {
            d.classList.toggle('active', i === activeIdx);
        });
    });
}

// ==================== DETAILED STATS ====================

function renderDetailedStats() {
    const statsEl = $('#finish-detailed-stats');
    statsEl.innerHTML = '<h3 class="finish-section-title">Player Statistics</h3>';

    state.players.forEach((p) => {
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

// ==================== GAME LOG ====================

function formatDart(d) {
    if (d.value === 0) return 'Miss';
    const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : '';
    return `${prefix}${d.value}`;
}

function renderGameLog() {
    const logEl = $('#game-log');
    const section = $('#finish-game-log-section');
    logEl.innerHTML = '';

    if (state.history.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';

    let currentRound = 0;
    state.history.forEach(entry => {
        if (entry.round !== currentRound) {
            currentRound = entry.round;
            const header = document.createElement('div');
            header.className = 'log-round-header';
            header.textContent = `ROUND ${currentRound}`;
            logEl.appendChild(header);
        }

        const player = state.players[entry.playerIndex];
        const dartsStr = entry.darts.map(formatDart).join(' + ');
        const turnTotal = entry.darts.reduce((s, d) => s + d.score, 0);
        const scoreAfter = entry.wasBust ? entry.scoreBeforeTurn : entry.scoreBeforeTurn - turnTotal;

        const row = document.createElement('div');
        row.className = 'log-entry';
        row.innerHTML = `
            <span class="log-player" style="color:${player.color}">${player.avatar}</span>
            <span class="log-darts">${dartsStr} = ${turnTotal}</span>
            ${entry.wasBust
                ? '<span class="log-result log-bust">BUST</span>'
                : `<span class="log-result">${entry.scoreBeforeTurn} → ${scoreAfter}</span>`
            }
        `;
        logEl.appendChild(row);
    });
}

// ==================== SHARE / COPY RESULTS ====================

export function generateShareText() {
    const checkoutLabel = state.checkoutRule === 'zero-or-less' ? 'Zero or Less' :
                          state.checkoutRule === 'straight' ? 'Straight Out' : 'Double Out';

    const lines = [];
    lines.push('🎯 DartScore');
    lines.push(`${state.startingScore} · ${checkoutLabel} · ${state.round} rounds`);
    lines.push('');

    // Leaderboard
    const sorted = state.players.map((p, i) => ({ ...p, originalIndex: i }));
    sorted.sort((a, b) => {
        if (a.finished && b.finished) return a.finishOrder - b.finishOrder;
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        return a.score - b.score;
    });

    const medals = ['🏆', '🥈', '🥉'];
    sorted.forEach((p, rank) => {
        const medal = rank < 3 ? medals[rank] : `#${rank + 1}`;
        const avg = p.turns > 0 ? (p.totalScored / p.turns).toFixed(1) : '0';
        const finalScore = p.finished ? (state.checkoutRule === 'zero-or-less' ? p.score : 0) : p.score;
        lines.push(`${medal} ${p.name} ${p.avatar}  ${finalScore} pts  (${p.turns} turns · avg ${avg})`);
    });

    lines.push('');

    // Turn-by-turn log
    if (state.history.length > 0) {
        lines.push('📋 Game Log');
        let currentRound = 0;
        state.history.forEach(entry => {
            if (entry.round !== currentRound) {
                currentRound = entry.round;
                lines.push(`— Round ${currentRound} —`);
            }
            const player = state.players[entry.playerIndex];
            const dartsStr = entry.darts.map(formatDart).join(' + ');
            const turnTotal = entry.darts.reduce((s, d) => s + d.score, 0);

            if (entry.wasBust) {
                lines.push(`  ${player.avatar} ${player.name}: ${dartsStr} = ${turnTotal} BUST`);
            } else {
                const scoreAfter = entry.scoreBeforeTurn - turnTotal;
                lines.push(`  ${player.avatar} ${player.name}: ${dartsStr} = ${turnTotal} (${entry.scoreBeforeTurn}→${scoreAfter})`);
            }
        });
    }

    return lines.join('\n');
}

export function copyResults() {
    const text = generateShareText();
    navigator.clipboard.writeText(text).then(() => {
        const btn = $('#finish-share-btn');
        const orig = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><path d="M20 6L9 17l-5-5"/></svg>Copied!`;
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = orig;
        }, 2000);
    });
}
