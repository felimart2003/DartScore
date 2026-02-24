# 🎯 DartScore

A premium dart scoring web app featuring an interactive canvas dartboard with press-and-hold magnifier, real-time multiplayer scoring, and detailed game analytics — all built with zero dependencies.

## Features

- **Interactive Dartboard** — Canvas-rendered board with touch/mouse precision aiming and a magnifier loupe for accurate dart placement
- **1–8 Players** — Full multiplayer with customizable emoji avatars and player colors
- **Multiple Game Modes** — 301, 501, 701, or custom starting scores
- **Checkout Rules** — Zero or Less, Straight Out, and Double Out
- **Handicap System** — Adjustable starting scores to level the playing field
- **Live Score Tracking** — Per-turn scoring with undo support (single dart or full turn)
- **Game Analytics** — Score progression chart, dart hotspot heatmaps, per-player detailed stats (averages, high turns, checkout %, darts per leg)
- **Game History** — Full turn-by-turn log with Wordle-style copy-to-clipboard sharing
- **Responsive Design** — Mobile-first layout that transforms into a three-panel desktop experience
- **Keyboard Shortcuts** — Submit, undo, and clear via keyboard on desktop
- **Dark Cyber Theme** — Neon accents, glassmorphism cards, and smooth animations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Markup** | Semantic HTML5 |
| **Styling** | CSS3 — Custom Properties, Grid, Flexbox, `@media` responsive breakpoints |
| **Logic** | Vanilla JavaScript — ES Modules (8 files, strict dependency chain) |
| **Graphics** | Canvas API — dartboard, magnifier, score chart, hotspot visualization |
| **Fonts** | Google Fonts — Orbitron (display) + Inter (body) |
| **Dependencies** | None. Zero build step. |

## Getting Started

ES Modules require a local server (no `file://` protocol).

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/DartScore.git
cd DartScore

# Serve (pick one)
python -m http.server 8080
# or
npx serve .
```

Open **http://localhost:8080** in your browser.

## Project Structure

```
DartScore/
├── index.html          Single-page app — all screens & modals
├── styles.css          Complete styling with mobile + desktop layouts
├── js/
│   ├── app.js          Entry point — imports, global listeners, keyboard shortcuts
│   ├── constants.js    Board geometry, colors, avatars, ring definitions
│   ├── state.js        Shared mutable state (game, setup, board)
│   ├── dom.js          DOM references, $ helpers, switchScreen()
│   ├── board.js        Dartboard rendering, hit detection, magnifier, mini-boards
│   ├── game.js         Turn logic, bust rules, pointer events, winner banner
│   ├── setup.js        Setup screen, player management, handicaps, avatar modal
│   └── stats.js        Finish screen, leaderboard, chart, hotspots, game log, share
└── README.md
```

## Architecture

Modules follow a strict unidirectional dependency chain — no circular imports:

```
constants → state → dom → board → stats → game → setup → app
```

State is managed through three shared objects (`state`, `setup`, `board`) — simple mutation that any importing module can read and write. The dartboard is rendered entirely via the Canvas API with dynamic resizing based on container bounds, so it adapts automatically to any layout.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Submit turn |
| **Backspace** | Undo last dart |
| **Escape** | Clear all darts this round |
| **Ctrl + Z** | Undo last submitted turn |

## Desktop vs Mobile

The app detects viewport width via CSS `@media (min-width: 900px)` and transforms entirely through CSS — no JavaScript layout branching.

| | Mobile | Desktop |
|-|--------|---------|
| **Game layout** | Vertical stack | Three-panel grid (sidebar · dartboard · controls) |
| **Player cards** | Horizontal scroll | Vertical sidebar |
| **Dartboard** | Compact, centered | Large with radial glow |
| **Hotspots** | Swipeable carousel | All visible at once |
| **Score controls** | Below board | Right panel with keyboard hints |

## License

MIT
