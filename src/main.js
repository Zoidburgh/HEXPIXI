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

const HEX_SIZE = 68.445; // 76.05 * 0.9 = 10% smaller
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
// CRT GLITCH EFFECTS SYSTEM
// ============================================================================

const glitchContainer = new PIXI.Container();
glitchContainer.zIndex = 10000; // On top of everything
app.stage.addChild(glitchContainer);

// CRT Glitch manager
const glitchManager = {
    isGlitching: false,
    lastGlitch: Date.now(),

    // Random horizontal scan line glitch
    scanLineGlitch() {
        if (this.isGlitching) return;
        this.isGlitching = true;

        const numLines = Math.floor(Math.random() * 3) + 1; // 1-3 glitch lines
        const glitchLines = [];

        for (let i = 0; i < numLines; i++) {
            const y = Math.random() * app.screen.height;
            const height = Math.random() * 4 + 2; // 2-6px height
            const offset = (Math.random() - 0.5) * 10; // ±5px horizontal offset

            const line = new PIXI.Graphics();
            line.beginFill(0x00ffff, 0.3); // Cyan tint
            line.drawRect(0, y, app.screen.width, height);
            line.endFill();
            line.x = offset;

            glitchContainer.addChild(line);
            glitchLines.push(line);
        }

        // Remove after brief duration
        setTimeout(() => {
            glitchLines.forEach(line => {
                glitchContainer.removeChild(line);
                line.destroy();
            });
            this.isGlitching = false;
        }, 50 + Math.random() * 100); // 50-150ms duration
    },

    // Screen flicker effect
    screenFlicker() {
        if (this.isGlitching) return;
        this.isGlitching = true;

        const flash = new PIXI.Graphics();
        const flashColor = Math.random() > 0.5 ? 0x00ffff : 0xffffff; // Cyan or white
        flash.beginFill(flashColor, 0.15);
        flash.drawRect(0, 0, app.screen.width, app.screen.height);
        flash.endFill();

        glitchContainer.addChild(flash);

        gsap.to(flash, {
            alpha: 0,
            duration: 0.05,
            onComplete: () => {
                glitchContainer.removeChild(flash);
                flash.destroy();
                this.isGlitching = false;
            }
        });
    },

    // RGB channel separation effect
    rgbSplitGlitch() {
        if (this.isGlitching) return;
        this.isGlitching = true;

        // Create colored offset overlays
        const rChannel = new PIXI.Graphics();
        rChannel.beginFill(0xff0000, 0.1);
        rChannel.drawRect(0, 0, app.screen.width, app.screen.height);
        rChannel.endFill();
        rChannel.x = Math.random() * 6 - 3; // ±3px

        const bChannel = new PIXI.Graphics();
        bChannel.beginFill(0x0000ff, 0.1);
        bChannel.drawRect(0, 0, app.screen.width, app.screen.height);
        bChannel.endFill();
        bChannel.x = Math.random() * 6 - 3; // ±3px (opposite direction)

        glitchContainer.addChild(rChannel);
        glitchContainer.addChild(bChannel);

        // Flicker and remove
        setTimeout(() => {
            glitchContainer.removeChild(rChannel);
            glitchContainer.removeChild(bChannel);
            rChannel.destroy();
            bChannel.destroy();
            this.isGlitching = false;
        }, 30 + Math.random() * 50); // 30-80ms duration
    },

    // Random trigger system
    randomGlitch() {
        const now = Date.now();
        const timeSinceLastGlitch = now - this.lastGlitch;

        // Don't glitch too frequently
        if (timeSinceLastGlitch < 2000) return;

        // Random chance to trigger (5% per check)
        if (Math.random() > 0.05) return;

        this.lastGlitch = now;

        // Pick random glitch type
        const glitchType = Math.floor(Math.random() * 3);
        switch (glitchType) {
            case 0:
                this.scanLineGlitch();
                break;
            case 1:
                this.screenFlicker();
                break;
            case 2:
                this.rgbSplitGlitch();
                break;
        }
    },

    // Start the glitch system
    start() {
        // Check for random glitches every second
        setInterval(() => this.randomGlitch(), 1000);
        console.log('✓ CRT glitch system activated');
    }
};

// ============================================================================
// BACKGROUND AMBIANCE SYSTEM
// ============================================================================

const backgroundContainer = new PIXI.Container();
backgroundContainer.zIndex = -100; // Behind everything
app.stage.addChild(backgroundContainer);

// Background ambiance manager
const ambianceManager = {
    gridLines: [],
    mistParticles: [],

    // Create animated hexagonal grid pattern
    createHexGrid() {
        const gridGraphics = new PIXI.Graphics();
        gridGraphics.lineStyle(1, 0x667eea, 0.08); // Very subtle purple-blue lines

        // Draw large hex grid pattern
        const gridSize = 150;
        const rows = Math.ceil(app.screen.height / gridSize) + 2;
        const cols = Math.ceil(app.screen.width / gridSize) + 2;

        for (let row = -1; row < rows; row++) {
            for (let col = -1; col < cols; col++) {
                const x = col * gridSize * 1.5;
                const y = row * gridSize * Math.sqrt(3) + (col % 2) * gridSize * Math.sqrt(3) / 2;

                // Draw hexagon outline
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const px = x + gridSize * Math.cos(angle);
                    const py = y + gridSize * Math.sin(angle);

                    if (i === 0) {
                        gridGraphics.moveTo(px, py);
                    } else {
                        gridGraphics.lineTo(px, py);
                    }
                }
                gridGraphics.closePath();
            }
        }

        backgroundContainer.addChild(gridGraphics);

        // Animate grid slowly
        gsap.to(gridGraphics, {
            alpha: 0.05,
            duration: 4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        gsap.to(gridGraphics, {
            rotation: Math.PI / 12, // Slow rotation
            duration: 60,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        console.log('✓ Background hex grid created');
    },

    // Create pulsing radial gradient overlay
    createRadialGradient() {
        const gradientGraphics = new PIXI.Graphics();

        // Create radial gradient effect (approximated with circles)
        const centerX = app.screen.width / 2;
        const centerY = app.screen.height / 2;
        const maxRadius = Math.max(app.screen.width, app.screen.height);

        // Multiple circles to simulate gradient
        for (let i = 0; i < 5; i++) {
            const radius = maxRadius * (0.3 + i * 0.2);
            const alpha = 0.02 - i * 0.003; // Fading outward
            gradientGraphics.beginFill(0x667eea, alpha);
            gradientGraphics.drawCircle(centerX, centerY, radius);
            gradientGraphics.endFill();
        }

        backgroundContainer.addChild(gradientGraphics);

        // Pulsing animation
        gsap.to(gradientGraphics, {
            alpha: 0.7,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        console.log('✓ Radial gradient overlay created');
    },

    // Create floating mist particles
    createMistParticles() {
        const numParticles = 20;

        for (let i = 0; i < numParticles; i++) {
            const particle = new PIXI.Graphics();
            const size = Math.random() * 40 + 20;

            particle.beginFill(0x00d9ff, 0.02);
            particle.drawCircle(0, 0, size);
            particle.endFill();

            particle.x = Math.random() * app.screen.width;
            particle.y = Math.random() * app.screen.height;

            backgroundContainer.addChild(particle);
            this.mistParticles.push(particle);

            // Animate particle floating
            const duration = Math.random() * 20 + 15; // 15-35 seconds
            const targetX = Math.random() * app.screen.width;
            const targetY = Math.random() * app.screen.height;

            gsap.to(particle, {
                x: targetX,
                y: targetY,
                duration: duration,
                ease: 'none',
                repeat: -1,
                yoyo: true
            });

            // Pulsing opacity
            gsap.to(particle, {
                alpha: Math.random() * 0.3 + 0.1,
                duration: Math.random() * 3 + 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        }

        console.log('✓ Mist particles created');
    },

    // Initialize all ambiance effects
    init() {
        this.createHexGrid();
        this.createRadialGradient();
        this.createMistParticles();
        console.log('✓ Background ambiance system activated');
    }
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
            fontSize: 63.18,
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

// Helper: Get neighboring hex indices (hexagonal grid neighbors)
const HEX_NEIGHBORS = {
    0: [1, 2],
    1: [0, 2, 3, 4, 6],
    2: [0, 1, 4, 5, 7],
    3: [1, 4, 6, 8],
    4: [1, 2, 3, 5, 6, 7, 9],
    5: [2, 4, 7, 10],
    6: [1, 3, 4, 8, 9, 11],
    7: [2, 4, 5, 9, 10, 12],
    8: [3, 6, 9, 11, 13],
    9: [4, 6, 7, 8, 10, 11, 12, 14], // Center
    10: [5, 7, 9, 12, 15],
    11: [6, 8, 9, 13, 14, 16],
    12: [7, 9, 10, 14, 15, 17],
    13: [8, 11, 14, 16],
    14: [9, 11, 12, 13, 15, 16, 17, 18],
    15: [10, 12, 14, 17],
    16: [11, 13, 14, 18],
    17: [12, 14, 15, 18],
    18: [14, 16, 17]
};

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

        // INTENSE double-glow filter (tight inner + diffuse outer)
        const glowColor = gameState.currentPlayer === 1 ? COLORS.glow.player2 : COLORS.glow.player1;

        // Inner tight glow
        const glowInner = new GlowFilter({
            distance: 8,
            outerStrength: 3.0,
            innerStrength: 1.5,
            color: glowColor,
            quality: 0.6
        });

        // Outer diffuse glow
        const glowOuter = new GlowFilter({
            distance: 20,
            outerStrength: 2.0,
            innerStrength: 0,
            color: glowColor,
            quality: 0.4
        });

        hex.filters = [glowInner, glowOuter];

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

        // RIPPLE EFFECT - Highlight neighboring hexes
        const neighbors = HEX_NEIGHBORS[index] || [];
        neighbors.forEach((neighborIndex, i) => {
            const neighborHex = hexGraphics[neighborIndex];
            if (neighborHex && hexData[neighborIndex].isEmpty) {
                // Stagger the ripple effect
                setTimeout(() => {
                    // Subtle neighbor glow
                    const neighborGlow = new GlowFilter({
                        distance: 8,
                        outerStrength: 1.5,
                        innerStrength: 0.5,
                        color: glowColor,
                        quality: 0.3
                    });
                    neighborHex.filters = [neighborGlow];

                    // Subtle scale pulse
                    gsap.to(neighborHex.scale, {
                        x: 1.05,
                        y: 1.05,
                        duration: 0.2,
                        ease: 'power2.out',
                        onComplete: () => {
                            gsap.to(neighborHex.scale, {
                                x: 1,
                                y: 1,
                                duration: 0.2,
                                ease: 'power2.in'
                            });
                        }
                    });

                    // Fade glow out
                    gsap.to(neighborGlow, {
                        outerStrength: 0,
                        duration: 0.4,
                        delay: 0.2,
                        onComplete: () => {
                            if (hexData[neighborIndex].isEmpty && !hexData[neighborIndex].isHovered) {
                                neighborHex.filters = [];
                            }
                        }
                    });
                }, i * 30); // Stagger by 30ms per neighbor
            }
        });

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

    // DRAMATIC CLICK FLASH EFFECT
    const flash = new PIXI.Graphics();
    flash.beginFill(0xffffff, 0.6); // Bright white flash
    flash.drawCircle(0, 0, HEX_SIZE * 3); // Large radius
    flash.x = pos.x;
    flash.y = pos.y;
    boardContainer.addChild(flash);

    // Radial burst animation
    gsap.to(flash.scale, {
        x: 2,
        y: 2,
        duration: 0.3,
        ease: 'power2.out'
    });

    gsap.to(flash, {
        alpha: 0,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
            boardContainer.removeChild(flash);
            flash.destroy();
        }
    });

    // Additional cyan ripple ring
    const ring = new PIXI.Graphics();
    ring.lineStyle(3, 0x00d9ff, 1);
    ring.drawCircle(0, 0, HEX_SIZE);
    ring.x = pos.x;
    ring.y = pos.y;
    boardContainer.addChild(ring);

    gsap.to(ring.scale, {
        x: 3,
        y: 3,
        duration: 0.5,
        ease: 'power2.out'
    });

    gsap.to(ring, {
        alpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
            boardContainer.removeChild(ring);
            ring.destroy();
        }
    });

    // Place tile immediately (no conflicting animation)
    placeTile(hexId, index, gameState.currentPlayer, Math.floor(Math.random() * 9) + 1);

    // Switch player
    const oldPlayer = gameState.currentPlayer;
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;

    // TURN TRANSITION EFFECT
    const transitionColor = oldPlayer === 1 ? COLORS.hex.player1 : COLORS.hex.player2;
    const transitionOverlay = new PIXI.Graphics();
    transitionOverlay.beginFill(transitionColor, 0.15);
    transitionOverlay.drawRect(-app.screen.width, -app.screen.height, app.screen.width * 3, app.screen.height * 3);
    transitionOverlay.endFill();
    glitchContainer.addChild(transitionOverlay);

    // Pulse transition
    gsap.to(transitionOverlay, {
        alpha: 0,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => {
            glitchContainer.removeChild(transitionOverlay);
            transitionOverlay.destroy();
        }
    });

    // Brief screen flicker on turn change
    setTimeout(() => {
        glitchManager.screenFlicker();
    }, 150);

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

    // INTENSE double-glow filter for placed tiles
    const glowInner = new GlowFilter({
        distance: 12,
        outerStrength: 3.5,
        innerStrength: 2.0,
        color: glowColor,
        quality: 0.6
    });

    const glowOuter = new GlowFilter({
        distance: 25,
        outerStrength: 2.5,
        innerStrength: 0,
        color: glowColor,
        quality: 0.4
    });

    hex.filters = [glowInner, glowOuter];

    // Show tile value with enhanced animation
    const text = tileTexts[index];
    text.text = value.toString();
    text.style.fill = 0xffffff;
    text.visible = true;

    // Add INTENSE glow to text
    const textGlow = new GlowFilter({
        distance: 15,
        outerStrength: 2.5,
        innerStrength: 1.0,
        color: glowColor,
        quality: 0.5
    });
    text.filters = [textGlow];

    // DRAMATIC bounce + rotation animation
    text.scale.set(0.5);
    text.rotation = -0.2; // Start tilted

    // Bounce scale with overshoot
    gsap.to(text.scale, {
        x: 1.3,
        y: 1.3,
        duration: 0.2,
        ease: 'back.out(3)',
        onComplete: () => {
            gsap.to(text.scale, {
                x: 1,
                y: 1,
                duration: 0.15,
                ease: 'power2.out'
            });
        }
    });

    // Rotation wobble
    gsap.to(text, {
        rotation: 0.1,
        duration: 0.15,
        ease: 'power2.out',
        onComplete: () => {
            gsap.to(text, {
                rotation: 0,
                duration: 0.15,
                ease: 'elastic.out(1, 0.5)'
            });
        }
    });

    // Continuous pulsing glow animation on placed tiles
    // Pulse both the glow filter strength and hex scale
    gsap.to(glowInner, {
        outerStrength: 4.5,
        innerStrength: 2.5,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to(glowOuter, {
        outerStrength: 3.5,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    // Subtle hex breathing
    gsap.to(hex.scale, {
        x: 1.03,
        y: 1.03,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    // Text glow pulse
    gsap.to(textGlow, {
        outerStrength: 3.5,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
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

    // Initialize background ambiance
    ambianceManager.init();

    // Create board
    createBoard();

    // Start CRT glitch effects
    glitchManager.start();

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
