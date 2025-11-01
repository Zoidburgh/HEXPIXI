// ============================================================================
// HEXUKI - PixiJS Cyberpunk UI (ENHANCED)
// ============================================================================

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { GlowFilter } from '@pixi/filter-glow';
// import * as particles from '@pixi/particle-emitter'; // Disabled for now

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const HEX_SIZE = 58.5; // 45 * 1.3 = 30% bigger
const HEX_SPACING = 1.15; // Spacing multiplier to add gaps between hexes
const HEX_WIDTH = HEX_SIZE * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
const HEX_HORIZ = HEX_WIDTH * 0.75 * HEX_SPACING; // Horizontal spacing
const HEX_VERT = HEX_HEIGHT * HEX_SPACING; // Vertical spacing

// Cyberpunk colors
const COLORS = {
    background: 0x0a0e27,
    hex: {
        empty: 0x1a1f3a,
        emptyStroke: 0x2d3561,
        hover: 0x3d4677,
        hoverGlow: 0x00d9ff, // Bright cyan for hover glow
        player1: 0xff006e,  // Hot magenta
        player2: 0x0d47a1,  // Cyberpunk blue
    },
    glow: {
        player1: 0xff006e,
        player2: 0x00d9ff,
    },
    tile: {
        player1: 0xff006e,
        player2: 0x0d47a1,
    }
};

// Hex positions - ORIGINAL orientation with proper spacing
const HEX_POSITIONS = [
    {id: 0, x: 0, y: -HEX_VERT * 2},
    {id: 1, x: -HEX_HORIZ, y: -HEX_VERT * 1.5},
    {id: 2, x: HEX_HORIZ, y: -HEX_VERT * 1.5},
    {id: 3, x: -HEX_HORIZ * 2, y: -HEX_VERT},
    {id: 4, x: 0, y: -HEX_VERT},
    {id: 5, x: HEX_HORIZ * 2, y: -HEX_VERT},
    {id: 6, x: -HEX_HORIZ, y: -HEX_VERT * 0.5},
    {id: 7, x: HEX_HORIZ, y: -HEX_VERT * 0.5},
    {id: 8, x: -HEX_HORIZ * 2, y: 0},
    {id: 9, x: 0, y: 0}, // Center
    {id: 10, x: HEX_HORIZ * 2, y: 0},
    {id: 11, x: -HEX_HORIZ, y: HEX_VERT * 0.5},
    {id: 12, x: HEX_HORIZ, y: HEX_VERT * 0.5},
    {id: 13, x: -HEX_HORIZ * 2, y: HEX_VERT},
    {id: 14, x: 0, y: HEX_VERT},
    {id: 15, x: HEX_HORIZ * 2, y: HEX_VERT},
    {id: 16, x: -HEX_HORIZ, y: HEX_VERT * 1.5},
    {id: 17, x: HEX_HORIZ, y: HEX_VERT * 1.5},
    {id: 18, x: 0, y: HEX_VERT * 2}
];

// ============================================================================
// GAME STATE
// ============================================================================

let gameState = {
    board: new Array(19).fill(null),
    currentPlayer: 1,
    scores: { p1: 0, p2: 0 },
    gameOver: false,
    wasmEngine: null
};

// ============================================================================
// PIXI APPLICATION SETUP
// ============================================================================

console.log('🎮 Initializing HEXUKI PixiJS Cyberpunk UI...');

const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: COLORS.background,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});

// Add canvas to container
const gameContainer = document.getElementById('game-container');
console.log('App view type:', typeof app.view, app.view);
console.log('App canvas type:', typeof app.canvas, app.canvas);
gameContainer.appendChild(app.view || app.canvas);
const canvas = app.view || app.canvas;
canvas.id = 'pixi-canvas';

// Debug logging
console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
console.log('Screen dimensions:', app.screen.width, 'x', app.screen.height);

// ============================================================================
// CONTAINERS
// ============================================================================

const boardContainer = new PIXI.Container();
boardContainer.x = app.screen.width / 2;
boardContainer.y = app.screen.height / 2;
app.stage.addChild(boardContainer);

const particleContainer = new PIXI.Container();
app.stage.addChild(particleContainer);

const hexGraphics = [];
const tileTexts = [];
const hexData = []; // Store additional data per hex

// ============================================================================
// PARTICLE SYSTEM (DISABLED FOR PERFORMANCE)
// ============================================================================

// Particle system temporarily disabled
const particleManager = {
    startHoverEmitter: () => {},
    stopHoverEmitter: () => {},
    clickBurst: () => {}
};

// ============================================================================
// HEX RENDERING
// ============================================================================

function createHexagon(x, y, size, color, strokeColor) {
    const hex = new PIXI.Graphics();

    // Set position first
    hex.x = x;
    hex.y = y;

    // Draw hexagon centered at origin (0,0) so pivot works correctly
    hex.lineStyle(3, strokeColor, 1);
    hex.beginFill(color, 1);

    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = size * Math.cos(angle);
        const py = size * Math.sin(angle);

        if (i === 0) {
            hex.moveTo(px, py);
        } else {
            hex.lineTo(px, py);
        }
    }

    hex.closePath();
    hex.endFill();

    return hex;
}

function createBoard() {
    HEX_POSITIONS.forEach((pos, index) => {
        const hex = createHexagon(
            pos.x,
            pos.y,
            HEX_SIZE,
            COLORS.hex.empty,
            COLORS.hex.emptyStroke
        );

        hex.eventMode = 'static';
        hex.cursor = 'pointer';
        hex.hexId = pos.id;
        hex.pivot.set(0, 0);

        // Store original position for animations
        hexData[index] = {
            originalX: pos.x,
            originalY: pos.y,
            isHovered: false,
            isEmpty: true
        };

        // Hover effects
        hex.on('pointerover', () => onHexHover(hex, index, true));
        hex.on('pointerout', () => onHexHover(hex, index, false));
        hex.on('pointerdown', () => onHexClick(hex, index));

        boardContainer.addChild(hex);
        hexGraphics[index] = hex;

        // Add tile number text
        const text = new PIXI.Text('', {
            fontFamily: 'Space Grotesk, monospace',
            fontSize: 45,
            fontWeight: '700',
            fill: 0xffffff,
            align: 'center'
        });
        text.anchor.set(0.5);
        text.x = pos.x;
        text.y = pos.y;
        text.visible = false;

        boardContainer.addChild(text);
        tileTexts[index] = text;

        // Show immediately - no animation
        hex.alpha = 1;
        hex.scale.set(1);
    });

    // Scanning effects disabled for performance
    // startScanningEffects();

    console.log('✓ Board created with', HEX_POSITIONS.length, 'hexes');
}

// ============================================================================
// VISUAL EFFECTS
// ============================================================================

function startBreathingAnimation(hex, index) {
    // Very subtle pulse - will be killed on hover/placement
    gsap.to(hex.scale, {
        x: 1.02,
        y: 1.02,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });
}

function startScanningEffects() {
    // Create scanning shimmer overlay
    const scanTimeline = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    HEX_POSITIONS.forEach((pos, index) => {
        const createScan = () => {
            if (!hexData[index].isEmpty) return;

            const hex = hexGraphics[index];
            const scan = new PIXI.Graphics();
            scan.beginFill(COLORS.hex.hoverGlow, 0);
            scan.drawCircle(pos.x, pos.y, HEX_SIZE);
            scan.endFill();
            boardContainer.addChild(scan);

            gsap.to(scan, {
                alpha: 0.3,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    gsap.to(scan, {
                        alpha: 0,
                        duration: 0.4,
                        ease: 'power2.out',
                        onComplete: () => {
                            boardContainer.removeChild(scan);
                            scan.destroy();
                        }
                    });
                }
            });
        };

        scanTimeline.add(createScan, index * 0.08);
    });
}

// ============================================================================
// INTERACTION HANDLERS
// ============================================================================

function onHexHover(hex, index, isOver) {
    if (gameState.gameOver || !hexData[index].isEmpty) return;

    hexData[index].isHovered = isOver;
    const pos = HEX_POSITIONS[index];

    if (isOver) {
        // Kill breathing animation
        gsap.killTweensOf(hex.scale);

        // Clean hover - scale and glow only
        gsap.to(hex.scale, {
            x: 1.1,
            y: 1.1,
            duration: 0.25,
            ease: 'power2.out'
        });

        // Add subtle glow filter
        const glowColor = gameState.currentPlayer === 1 ? COLORS.glow.player2 : COLORS.glow.player1;
        const glow = new GlowFilter({
            distance: 10,
            outerStrength: 1.5,
            innerStrength: 0.5,
            color: glowColor,
            quality: 0.5
        });
        hex.filters = [glow];

        // Redraw with hover color (centered at origin)
        hex.clear();
        hex.lineStyle(3, glowColor, 1); // Keep consistent stroke width
        hex.beginFill(COLORS.hex.hover, 1);

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = HEX_SIZE * Math.cos(angle);
            const py = HEX_SIZE * Math.sin(angle);

            if (i === 0) {
                hex.moveTo(px, py);
            } else {
                hex.lineTo(px, py);
            }
        }
        hex.closePath();
        hex.endFill();

        // Particle effects disabled for performance
        // particleManager.startHoverEmitter(hex.hexId, pos.x, pos.y);

    } else {
        // Return to normal
        gsap.to(hex.scale, {
            x: 1,
            y: 1,
            duration: 0.25,
            ease: 'power2.out'
        });

        // Remove filters
        hex.filters = [];

        // Redraw with normal colors (centered at origin)
        hex.clear();
        hex.lineStyle(3, COLORS.hex.emptyStroke, 1);
        hex.beginFill(COLORS.hex.empty, 1);

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = HEX_SIZE * Math.cos(angle);
            const py = HEX_SIZE * Math.sin(angle);

            if (i === 0) {
                hex.moveTo(px, py);
            } else {
                hex.lineTo(px, py);
            }
        }
        hex.closePath();
        hex.endFill();

        // Stop particles
        particleManager.stopHoverEmitter(hex.hexId);
    }
}

function onHexClick(hex, index) {
    if (gameState.gameOver || !hexData[index].isEmpty) return;

    const hexId = hex.hexId;
    const pos = HEX_POSITIONS[index];

    console.log('Hex clicked:', hexId);

    // Place tile immediately (no conflicting animation)
    placeTile(hexId, index, gameState.currentPlayer, Math.floor(Math.random() * 9) + 1);

    // Switch player
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    updateUI();
}

function placeTile(hexId, index, player, value) {
    gameState.board[hexId] = { player, value };
    hexData[index].isEmpty = false;

    // Stop hover effects
    particleManager.stopHoverEmitter(hexId);

    // Update hex appearance
    const hex = hexGraphics[index];

    // Kill all animations and reset scale
    gsap.killTweensOf(hex);
    gsap.killTweensOf(hex.scale);
    hex.scale.set(1);
    const pos = HEX_POSITIONS[index];
    const playerColor = player === 1 ? COLORS.hex.player1 : COLORS.hex.player2;
    const glowColor = player === 1 ? COLORS.glow.player1 : COLORS.glow.player2;

    hex.clear();
    hex.lineStyle(3, glowColor, 1); // Keep same stroke width as empty hexes
    hex.beginFill(playerColor, 0.3);

    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = HEX_SIZE * Math.cos(angle);
        const py = HEX_SIZE * Math.sin(angle);

        if (i === 0) {
            hex.moveTo(px, py);
        } else {
            hex.lineTo(px, py);
        }
    }

    hex.closePath();
    hex.endFill();

    // Subtle glow filter
    const glow = new GlowFilter({
        distance: 12,
        outerStrength: 1.5,
        innerStrength: 0.8,
        color: glowColor,
        quality: 0.5
    });
    hex.filters = [glow];

    // Show tile value with enhanced animation
    const text = tileTexts[index];
    text.text = value.toString();
    text.style.fill = 0xffffff;
    text.visible = true;

    // Add glow to text
    const textGlow = new GlowFilter({
        distance: 10,
        outerStrength: 1,
        color: glowColor,
        quality: 0.3
    });
    text.filters = [textGlow];

    // Subtle scale animation
    text.scale.set(0.7);
    gsap.to(text.scale, {
        x: 1,
        y: 1,
        duration: 0.3,
        ease: 'power2.out'
    });

    // Particle burst on placement disabled for performance
    // particleManager.clickBurst(pos.x, pos.y);
}

function updateUI() {
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
        turnIndicator.textContent = `Player ${gameState.currentPlayer}'s Turn`;
    }

    const p1Score = document.getElementById('p1-score');
    const p2Score = document.getElementById('p2-score');
    if (p1Score) p1Score.textContent = gameState.scores.p1;
    if (p2Score) p2Score.textContent = gameState.scores.p2;
}

// ============================================================================
// WASM ENGINE INTEGRATION
// ============================================================================

async function loadWASMEngine() {
    try {
        console.log('Loading WASM engine...');
        gameState.wasmEngine = await HexukiWasm();
        gameState.wasmEngine.initialize();
        console.log('✓ WASM engine loaded successfully');
        return true;
    } catch (err) {
        console.error('Failed to load WASM engine:', err);
        console.log('Game will run in demo mode without AI');
        return false;
    }
}

// ============================================================================
// WINDOW RESIZE HANDLER
// ============================================================================

function onResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    boardContainer.x = app.screen.width / 2;
    boardContainer.y = app.screen.height / 2;
}

window.addEventListener('resize', onResize);

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('🚀 Starting HEXUKI...');

    // Hide loading screen
    const loadingElement = document.getElementById('loading');
    const uiOverlay = document.getElementById('ui-overlay');

    // Create board
    createBoard();

    // Load WASM engine
    await loadWASMEngine();

    // Show UI
    if (loadingElement) {
        gsap.to(loadingElement, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                loadingElement.style.display = 'none';
            }
        });
    }

    if (uiOverlay) {
        uiOverlay.style.display = 'block';
        gsap.from(uiOverlay, {
            opacity: 0,
            y: -20,
            duration: 0.5,
            delay: 0.3
        });
    }

    updateUI();

    console.log('✅ HEXUKI initialized successfully!');
    console.log('🎮 Click any hex to place a tile');
    console.log('⚡ Cyberpunk energy mode ACTIVATED!');
}

// Start the game
init();

// Expose for debugging
window.hexukiGame = {
    app,
    gameState,
    placeTile,
    updateUI,
    particleManager
};
