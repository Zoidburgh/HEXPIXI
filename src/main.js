// ============================================================================
// HEXUKI - PixiJS Cyberpunk UI (ENHANCED)
// ============================================================================

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { GlowFilter } from '@pixi/filter-glow';
import { BlurFilter } from 'pixi.js';
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
        player1: 0xff66b3,  // Brighter pink for better contrast
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

// Scoring lanes - diagonal chains for each player
// Player 1: Down-right diagonals (\)
const PLAYER1_CHAINS = [
    [0, 2, 5],           // Lane 1
    [1, 4, 7, 10],       // Lane 2
    [3, 6, 9, 12, 15],   // Lane 3 (center diagonal)
    [8, 11, 14, 17],     // Lane 4
    [13, 16, 18]         // Lane 5
];

// Player 2: Down-left diagonals (/)
const PLAYER2_CHAINS = [
    [0, 1, 3],           // Lane 1
    [2, 4, 6, 8],        // Lane 2
    [5, 7, 9, 11, 13],   // Lane 3 (center diagonal)
    [10, 12, 14, 16],    // Lane 4
    [15, 17, 18]         // Lane 5
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

// Flash container for grid line flashes (renders BEHIND board)
const flashContainer = new PIXI.Container();
flashContainer.blendMode = PIXI.BLEND_MODES.ADD; // Additive blending for luminous effect
app.stage.addChild(flashContainer);

const boardContainer = new PIXI.Container();
boardContainer.x = app.screen.width / 2;
boardContainer.y = app.screen.height / 2;
app.stage.addChild(boardContainer);

const particleContainer = new PIXI.Container();
app.stage.addChild(particleContainer);

const hexGraphics = [];
const tileTexts = [];
const hexData = []; // Store additional data per hex
const validMoveGlowGraphics = []; // Store glow graphics for valid moves
let lastHighlightedPlayer = null; // Track last player to debounce glow updates

// ============================================================================
// FPS COUNTER
// ============================================================================

const fpsText = new PIXI.Text('FPS: 60', {
    fontFamily: 'monospace',
    fontSize: 16,
    fill: 0x00ff00,
    stroke: 0x000000,
    strokeThickness: 2
});
fpsText.x = app.screen.width - 80;
fpsText.y = app.screen.height - 30;
app.stage.addChild(fpsText);

let lastTime = performance.now();
let frames = 0;
let fps = 60;

app.ticker.add(() => {
    frames++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        fpsText.text = `FPS: ${fps}`;
        frames = 0;
        lastTime = currentTime;

        // Color based on performance
        if (fps >= 55) {
            fpsText.style.fill = 0x00ff00; // Green
        } else if (fps >= 30) {
            fpsText.style.fill = 0xffff00; // Yellow
        } else {
            fpsText.style.fill = 0xff0000; // Red
        }
    }
});

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Log active graphics counts periodically for performance monitoring
function logPerformanceMetrics() {
    const glowCount = validMoveGlowGraphics.filter(g => g !== null).length;
    const flashCount = flashManager.activeFlashes.length;
    const beamCount = activeBeams.length;
    const tilesPlaced = hexData.filter(h => !h.isEmpty).length;

    console.log(`📊 Performance: Glows=${glowCount} Flashes=${flashCount} Beams=${beamCount} Tiles=${tilesPlaced}/19`);
}

// Log metrics every 10 seconds
setInterval(logPerformanceMetrics, 10000);

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
// GRID LINE FLASH SYSTEM - Subliminal Energy
// ============================================================================

const flashManager = {
    activeFlashes: [],
    flashPool: [], // Object pool for reusing Graphics
    preferredOrientation: 'horizontal', // 'horizontal' or 'vertical'
    orientationSwitchInterval: null,
    scanSweepInterval: null,

    // Grid alignment settings
    gridSize: 100, // Lines snap to 100px grid
    boardCenterX: 0, // Will be set in init
    boardCenterY: 0,
    boardRadius: 400, // Approximate radius of hex board

    // Get flash from pool or create new one
    getFlashFromPool() {
        if (this.flashPool.length > 0) {
            return this.flashPool.pop();
        }
        return new PIXI.Graphics();
    },

    // Return flash to pool for reuse
    returnFlashToPool(flash) {
        // Kill any ongoing animations (including glow pulses)
        gsap.killTweensOf(flash);
        if (flash.filters) {
            flash.filters.forEach(filter => gsap.killTweensOf(filter));
        }

        flash.clear();
        flash.filters = [];
        flash.alpha = 0;
        if (this.flashPool.length < 50) { // Max pool size
            this.flashPool.push(flash);
        } else {
            flash.destroy();
        }
    },

    // Create a single flash line that moves across screen
    createFlash() {
        const flash = this.getFlashFromPool();

        // Determine depth layer: 20% near, 60% mid, 20% far
        const depthRoll = Math.random();
        let depthLayer;
        if (depthRoll < 0.2) {
            depthLayer = 'near'; // Brighter, sharper, slower
        } else if (depthRoll < 0.8) {
            depthLayer = 'mid'; // Normal
        } else {
            depthLayer = 'far'; // Dimmer, softer, faster
        }

        // Favor the preferred orientation (90% of the time, 10% variation)
        const usePreferred = Math.random() > 0.1;
        const isHorizontal = usePreferred ? (this.preferredOrientation === 'horizontal') : (Math.random() > 0.5);

        // Base line width varies by depth (thickest ones further reduced)
        const baseLineWidth = depthLayer === 'near' ? (1.2 + Math.random() * 1.2) :
                              depthLayer === 'mid' ? (1.0 + Math.random() * 1.2) :
                              (0.8 + Math.random() * 1.0);

        // Dramatic length variance: 60% short, 30% medium, 10% long (bigger overall)
        const lengthRoll = Math.random();
        let lineLength;
        if (lengthRoll < 0.6) {
            lineLength = 200 + Math.random() * 400; // 200-600px short
        } else if (lengthRoll < 0.9) {
            lineLength = 600 + Math.random() * 600; // 600-1200px medium
        } else {
            lineLength = 1200 + Math.random() * 1300; // 1200-2500px long
        }

        // Color selection: yellow/gold cyberpunk tones that complement dark background
        // 50% amber, 20% gold, 15% warm brown, 15% orange
        const colorRoll = Math.random();
        let flashColor, flashColor2, shouldGlow, isGradient;

        if (colorRoll < 0.2) {
            flashColor = 0x3a2f0f; // Dark amber - subtle glow
            shouldGlow = true;
            isGradient = Math.random() > 0.85; // 15% chance gradient to gold
            flashColor2 = isGradient ? 0x4a3a10 : flashColor;
        } else if (colorRoll < 0.35) {
            flashColor = 0x4a3a10; // Dark gold - subtle glow
            shouldGlow = true;
            isGradient = Math.random() > 0.85; // 15% chance gradient to amber
            flashColor2 = isGradient ? 0x3a2f0f : flashColor;
        } else if (colorRoll < 0.5) {
            flashColor = 0x2a2215; // Dark warm brown-gold - no glow
            shouldGlow = false;
            isGradient = false;
            flashColor2 = flashColor;
        } else {
            flashColor = 0x2a2410; // Very dark gold - rarely glow
            shouldGlow = Math.random() > 0.9; // Only 10% chance
            isGradient = Math.random() > 0.9; // 10% chance gradient to orange
            flashColor2 = isGradient ? 0x3a2510 : flashColor;
        }

        // Draw tapered line with gradient alpha (multiple segments)
        const segments = 7;
        const segmentLength = lineLength / segments;

        // Helper to interpolate between two colors
        const lerpColor = (color1, color2, t) => {
            const r1 = (color1 >> 16) & 0xFF;
            const g1 = (color1 >> 8) & 0xFF;
            const b1 = color1 & 0xFF;
            const r2 = (color2 >> 16) & 0xFF;
            const g2 = (color2 >> 8) & 0xFF;
            const b2 = color2 & 0xFF;

            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);

            return (r << 16) | (g << 8) | b;
        };

        // Draw each segment with improved taper, thickness variation, and directional fade
        for (let i = 0; i < segments; i++) {
            const t = i / (segments - 1); // 0 to 1

            // Better taper curve - exponential fade for smoother transition
            const centerDist = Math.abs(t * 2 - 1); // 0 at center, 1 at ends
            const alphaCurve = 1 - centerDist;
            const segmentAlpha = Math.pow(alphaCurve, 2.5); // More organic exponential fade

            // Directional fade - trail effect (front solid, back fades faster)
            const trailFade = 1 - (t * 0.3); // Front 100%, back 70%
            const finalAlpha = segmentAlpha * trailFade;

            // Vary thickness along length - thicker in middle
            const thicknessCurve = 1 - Math.pow(centerDist, 1.8); // Bulge in middle
            const segmentWidth = baseLineWidth * (0.5 + thicknessCurve * 0.5); // 50-100% of base

            // Interpolate color if gradient
            const segmentColor = isGradient ? lerpColor(flashColor, flashColor2, t) : flashColor;

            flash.lineStyle(segmentWidth, segmentColor, finalAlpha);

            if (isHorizontal) {
                const x1 = -lineLength / 2 + i * segmentLength;
                const x2 = x1 + segmentLength;
                flash.moveTo(x1, 0);
                flash.lineTo(x2, 0);
            } else {
                const y1 = -lineLength / 2 + i * segmentLength;
                const y2 = y1 + segmentLength;
                flash.moveTo(0, y1);
                flash.lineTo(0, y2);
            }
        }

        // Start position and end position for movement
        // EDGE-FOCUSED: Bias spawning toward screen edges (top 20%, bottom 20%, left 20%, right 20%)
        let startX, startY, endX, endY;

        if (isHorizontal) {
            // Move horizontally across screen
            // Bias Y position toward top/bottom edges
            let yPos;
            const edgeBias = Math.random();
            if (edgeBias < 0.4) { // 40% top edge
                yPos = Math.random() * (app.screen.height * 0.25);
            } else if (edgeBias < 0.8) { // 40% bottom edge
                yPos = app.screen.height * 0.75 + Math.random() * (app.screen.height * 0.25);
            } else { // 20% middle
                yPos = app.screen.height * 0.25 + Math.random() * (app.screen.height * 0.5);
            }

            // GRID ALIGNMENT: Snap to grid
            yPos = Math.round(yPos / this.gridSize) * this.gridSize;

            startX = -lineLength;
            startY = yPos;
            endX = app.screen.width + lineLength;
            endY = yPos;
        } else {
            // Move vertically across screen
            // Bias X position toward left/right edges
            let xPos;
            const edgeBias = Math.random();
            if (edgeBias < 0.4) { // 40% left edge
                xPos = Math.random() * (app.screen.width * 0.25);
            } else if (edgeBias < 0.8) { // 40% right edge
                xPos = app.screen.width * 0.75 + Math.random() * (app.screen.width * 0.25);
            } else { // 20% middle
                xPos = app.screen.width * 0.25 + Math.random() * (app.screen.width * 0.5);
            }

            // GRID ALIGNMENT: Snap to grid
            xPos = Math.round(xPos / this.gridSize) * this.gridSize;

            startX = xPos;
            startY = -lineLength;
            endX = xPos;
            endY = app.screen.height + lineLength;
        }

        flash.x = startX;
        flash.y = startY;
        flash.alpha = 0;

        // Varied speed based on depth layer for atmospheric perspective (faster across all layers)
        let moveDuration;
        if (depthLayer === 'near') {
            moveDuration = 1.2 + Math.random() * 0.8; // 1.2-2.0 seconds (slowest, closest)
        } else if (depthLayer === 'mid') {
            moveDuration = 0.8 + Math.random() * 0.6; // 0.8-1.4 seconds (medium)
        } else {
            moveDuration = 0.5 + Math.random() * 0.5; // 0.5-1.0 seconds (fastest, farthest)
        }

        // Apply filters based on depth layer, speed, and color
        const filters = [];

        // Soft edges - add blur to all lines based on depth
        const softEdgeBlur = new BlurFilter();
        if (depthLayer === 'near') {
            softEdgeBlur.blur = 1; // Sharper
        } else if (depthLayer === 'mid') {
            softEdgeBlur.blur = 1.5; // Medium soft
        } else {
            softEdgeBlur.blur = 2.5; // Softer, atmospheric
        }
        filters.push(softEdgeBlur);

        // Add glow only to player-colored lines - BOLD GLOW
        if (shouldGlow) {
            const glowStrength = depthLayer === 'near' ? 2.0 : depthLayer === 'mid' ? 1.5 : 1.0;
            const glow = new GlowFilter({
                distance: 15,
                outerStrength: glowStrength,
                innerStrength: 0.8,
                color: flashColor,
                quality: 0.3
            });
            filters.push(glow);
        }

        // Add motion blur to fast-moving lines
        if (moveDuration < 1.5) {
            const blurStrength = (1.5 - moveDuration) * 2; // Faster = more blur
            const motionBlur = new BlurFilter();
            motionBlur.blurX = isHorizontal ? blurStrength : 0;
            motionBlur.blurY = isHorizontal ? 0 : blurStrength;
            filters.push(motionBlur);
        }

        flash.filters = filters;

        flashContainer.addChild(flash);
        this.activeFlashes.push(flash);

        // Animate movement all the way off screen with organic easing
        gsap.to(flash, {
            x: endX,
            y: endY,
            duration: moveDuration,
            ease: 'power1.inOut', // Organic movement - gentle acceleration/deceleration
            onUpdate: () => {
                // FADE NEAR BOARD CENTER: Calculate distance from board center
                const dx = flash.x - this.boardCenterX;
                const dy = flash.y - this.boardCenterY;
                const distanceFromBoard = Math.sqrt(dx * dx + dy * dy);

                // If within board radius, fade out
                if (distanceFromBoard < this.boardRadius) {
                    const fadeRatio = distanceFromBoard / this.boardRadius; // 0 at center, 1 at edge
                    flash.alpha = targetAlpha * fadeRatio; // Fade more as closer to center
                } else {
                    flash.alpha = targetAlpha; // Full opacity outside board area
                }
            },
            onComplete: () => {
                flashContainer.removeChild(flash);
                // Return to pool instead of destroying
                this.returnFlashToPool(flash);
                // Remove from active flashes
                const index = this.activeFlashes.indexOf(flash);
                if (index > -1) this.activeFlashes.splice(index, 1);
            }
        });

        // Quick fade in at start, stay visible until off screen
        // Opacity varies by depth layer - BOLD VISIBILITY
        let targetAlpha;
        if (depthLayer === 'near') {
            targetAlpha = shouldGlow ? 0.65 : 0.50; // Very bright
        } else if (depthLayer === 'mid') {
            targetAlpha = shouldGlow ? 0.50 : 0.40; // Bright
        } else {
            targetAlpha = shouldGlow ? 0.40 : 0.30; // Visible
        }

        gsap.to(flash, {
            alpha: targetAlpha,
            duration: 0.03,
            ease: 'power2.out'
        });

        // Add bold pulsing to glowing lines
        if (shouldGlow && filters.length > 0) {
            const glowFilter = filters.find(f => f instanceof GlowFilter);
            if (glowFilter) {
                const baseStrength = glowFilter.outerStrength;
                // Bold pulse: vary glow strength ±30% over 2-3 seconds
                gsap.to(glowFilter, {
                    outerStrength: baseStrength * 1.3,
                    duration: 2 + Math.random() * 1,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });
            }
        }
    },

    // Trigger a burst of 1-2 flashes (reduced for performance)
    triggerFlashBurst() {
        // PERFORMANCE: Limit concurrent flashes to prevent accumulation
        if (this.activeFlashes.length > 10) {
            console.warn('⚠️ Flash limit reached, skipping burst');
            return;
        }

        const flashCount = 1 + Math.floor(Math.random() * 2); // 1-2 flashes

        for (let i = 0; i < flashCount; i++) {
            // Stagger slightly for more organic feel
            setTimeout(() => {
                this.createFlash();
            }, i * 60); // 60ms between each flash in the burst
        }
    },

    // Switch between horizontal and vertical orientations
    switchOrientation() {
        this.preferredOrientation = this.preferredOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        console.log(`🔄 Flash orientation switched to: ${this.preferredOrientation}`);
    },

    // SCAN SWEEP EFFECT: Edge-only scanner that morphs into wave
    createScanSweep(edge = null, color = 0xFFD700, segments = 100) {
        // Choose which edge: 0=top, 1=right, 2=bottom, 3=left
        // If edge not specified, choose randomly
        if (edge === null) {
            edge = Math.floor(Math.random() * 4);
        }

        const scanLine = new PIXI.Graphics();
        const scanColor = color; // Use provided color or default gold
        const scanWidth = 1.5;

        let isHorizontal, lineX, lineY, lineLength;

        if (edge === 0) { // Top edge - horizontal
            isHorizontal = true;
            lineX = 0;
            lineY = 50;
            lineLength = app.screen.width;
        } else if (edge === 1) { // Right edge - vertical
            isHorizontal = false;
            lineX = app.screen.width - 50;
            lineY = 0;
            lineLength = app.screen.height;
        } else if (edge === 2) { // Bottom edge - horizontal
            isHorizontal = true;
            lineX = 0;
            lineY = app.screen.height - 50;
            lineLength = app.screen.width;
        } else { // Left edge - vertical
            isHorizontal = false;
            lineX = 50;
            lineY = 0;
            lineLength = app.screen.height;
        }

        scanLine.x = lineX;
        scanLine.y = lineY;

        // Smooth glow + motion blur for trail effect
        const scanGlow = new GlowFilter({
            distance: 15,
            outerStrength: 2,
            innerStrength: 0.8,
            color: scanColor,
            quality: 0.4
        });
        const motionBlur = new BlurFilter();
        motionBlur.blurX = isHorizontal ? 40 : 0;
        motionBlur.blurY = isHorizontal ? 0 : 40;
        scanLine.filters = [scanGlow, motionBlur];

        scanLine.alpha = 0;
        flashContainer.addChild(scanLine);

        // Flash straight then morph to fast-moving wave as it fades quickly
        const totalDuration = 0.5; // Much faster overall
        const straightDuration = 0.1; // Quick flash
        let startTime = Date.now();

        const animateWave = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = elapsed / totalDuration;

            if (progress >= 1) {
                flashContainer.removeChild(scanLine);
                scanLine.destroy();
                return;
            }

            // Clear and redraw the line as a wave
            scanLine.clear();
            scanLine.lineStyle(scanWidth, scanColor, 1);

            // Start as straight line, then morph to wave
            const morphProgress = Math.max(0, (elapsed - straightDuration) / (totalDuration - straightDuration));
            const maxAmplitude = 9.6; // 68% smaller
            const waveAmplitude = maxAmplitude * Math.min(1, morphProgress * 2); // Quick morph

            // Fast-moving wave phase offset
            const waveSpeed = 10; // Speed of wave movement
            const phaseOffset = elapsed * waveSpeed;

            const waveFrequency = 3;
            // segments passed as parameter

            if (isHorizontal) {
                // Draw horizontal wave
                scanLine.moveTo(-100, 0);
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const x = -100 + t * (lineLength + 200);
                    const y = Math.sin((t * Math.PI * 2 * waveFrequency) + phaseOffset) * waveAmplitude;
                    scanLine.lineTo(x, y);
                }
            } else {
                // Draw vertical wave
                scanLine.moveTo(0, -100);
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const y = -100 + t * (lineLength + 200);
                    const x = Math.sin((t * Math.PI * 2 * waveFrequency) + phaseOffset) * waveAmplitude;
                    scanLine.lineTo(x, y);
                }
            }

            // Overall fade out with blink effect
            let envelope;
            if (elapsed < straightDuration) {
                envelope = 1; // Bright flash
            } else {
                // Fade with rapid blink
                const fadeProgress = (elapsed - straightDuration) / (totalDuration - straightDuration);
                const baseFade = 1 - fadeProgress;
                const blinkFrequency = 8; // Rapid blinks
                const blink = Math.sin(elapsed * Math.PI * 2 * blinkFrequency) * 0.5 + 0.5;
                envelope = baseFade * (0.5 + blink * 0.5); // Combine fade with blink
            }
            scanLine.alpha = envelope * 0.85;

            requestAnimationFrame(animateWave);
        };

        requestAnimationFrame(animateWave);

        console.log(`⚡ Edge scan: ${['top', 'right', 'bottom', 'left'][edge]}`);
    },

    // PLAYER TILE SCAN WAVES: Random 2-edge scan waves in player color on tile placement
    createPlayerTileScanWaves(player) {
        // Get player's glow color
        const playerColor = player === 1 ? COLORS.glow.player1 : COLORS.glow.player2;

        // Randomly choose horizontal (top+bottom) OR vertical (left+right)
        const isHorizontal = Math.random() > 0.5;
        const edges = isHorizontal ? [0, 2] : [3, 1]; // [top, bottom] or [left, right]

        // Trigger 2 opposing edges with staggering
        // Reduced segments (60 instead of 100) for lighter performance
        edges.forEach((edge, i) => {
            setTimeout(() => {
                this.createScanSweep(edge, playerColor, 60);
            }, i * 80); // 80ms stagger for more dramatic cascading
        });

        const direction = isHorizontal ? 'horizontal (top+bottom)' : 'vertical (left+right)';
        console.log(`🎆 Player ${player} tile scan waves: ${direction}`);
    },

    // DIAGONAL GRID HIGHLIGHT SWEEP: Reveal the underlying grid structure
    gridHighlight: null,
    gridSweepActive: false,

    createGridHighlight() {
        // Create grid graphics if not already created
        if (!this.gridHighlight) {
            this.gridHighlight = new PIXI.Graphics();
            this.gridHighlight.alpha = 0;

            // Add slight blur for softer look
            const blur = new PIXI.filters.BlurFilter();
            blur.blur = 1.5;
            this.gridHighlight.filters = [blur];

            flashContainer.addChild(this.gridHighlight); // Add to flash layer (behind board)
        }

        // Clear and redraw grid - simple solid lines
        this.gridHighlight.clear();

        const gridSize = 100; // Match flash grid spacing
        const width = app.screen.width;
        const height = app.screen.height;
        const lineWidth = 1.5; // Thicker than pencil thin
        const flashColor = 0xFFD700; // Bright gold

        this.gridHighlight.lineStyle(lineWidth, flashColor, 0.7); // Consistent thickness and opacity

        // Draw vertical grid lines
        for (let x = 0; x <= width; x += gridSize) {
            this.gridHighlight.moveTo(x, 0);
            this.gridHighlight.lineTo(x, height);
        }

        // Draw horizontal grid lines
        for (let y = 0; y <= height; y += gridSize) {
            this.gridHighlight.moveTo(0, y);
            this.gridHighlight.lineTo(width, y);
        }

        return this.gridHighlight;
    },

    triggerDiagonalGridSweep() {
        // PERFORMANCE: Skip if sweep already active
        if (this.gridSweepActive) {
            console.warn('⚠️ Grid sweep skipped - already active');
            return;
        }

        this.gridSweepActive = true;

        // Create/update grid graphics
        const grid = this.createGridHighlight();

        // Pick random corner: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
        const corner = Math.floor(Math.random() * 4);
        const cornerNames = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

        console.log(`🌐 Grid sweep from ${cornerNames[corner]} corner`);

        // Animate diagonal wave
        const timeline = gsap.timeline({
            onComplete: () => {
                this.gridSweepActive = false;
            }
        });

        // Fade in with diagonal sweep feel (fast reveal)
        timeline.to(grid, {
            alpha: 0.4,
            duration: 0.7,
            ease: 'power2.out'
        });

        // Hold visible
        timeline.to(grid, {
            alpha: 0.4,
            duration: 0.5
        });

        // Fade out
        timeline.to(grid, {
            alpha: 0,
            duration: 0.8,
            ease: 'power2.in'
        });
    },

    // Start the flash system (call from init)
    start() {
        // Set board center position (center of screen)
        this.boardCenterX = app.screen.width / 2;
        this.boardCenterY = app.screen.height / 2;

        // Trigger flash bursts less frequently (100% reduction = half as often): every 240-800ms
        const scheduleNextBurst = () => {
            const delay = 240 + Math.random() * 560; // ~240-800ms between bursts
            setTimeout(() => {
                this.triggerFlashBurst();
                scheduleNextBurst(); // Schedule next one
            }, delay);
        };

        scheduleNextBurst();

        // Switch orientation every 10 seconds
        this.orientationSwitchInterval = setInterval(() => {
            this.switchOrientation();
        }, 10000); // 10 seconds

        // SCAN SWEEP: Trigger every 10-15 seconds
        const scheduleScanSweep = () => {
            const delay = 10000 + Math.random() * 5000; // 10-15 seconds
            setTimeout(() => {
                this.createScanSweep();
                scheduleScanSweep(); // Schedule next one
            }, delay);
        };

        // Start first scan sweep after 5 seconds
        setTimeout(() => {
            this.createScanSweep();
            scheduleScanSweep();
        }, 5000);

        // DIAGONAL GRID SWEEP: Trigger every 12-25 seconds
        const scheduleGridSweep = () => {
            const delay = 12000 + Math.random() * 13000; // 12-25 seconds
            setTimeout(() => {
                this.triggerDiagonalGridSweep();
                scheduleGridSweep(); // Schedule next one
            }, delay);
        };

        // Start first grid sweep after 8 seconds
        setTimeout(() => {
            this.triggerDiagonalGridSweep();
            scheduleGridSweep();
        }, 8000);
    }
};

// ============================================================================
// TILE INVENTORY MANAGER - Curved continuous bar display
// ============================================================================

const tileInventoryManager = {
    player1Tiles: [],  // Array of tile data
    player2Tiles: [],  // Array of tile data
    player1Bar: null,  // Continuous bar graphic
    player2Bar: null,  // Continuous bar graphic
    selectedTile: null,  // Currently selected tile {player, value, segment}
    tileContainer: null,

    init() {
        // Create container for all tile graphics
        this.tileContainer = new PIXI.Container();
        app.stage.addChild(this.tileContainer);
    },

    // Create and display tiles as a curved continuous bar
    displayTiles(player, tileValues) {
        const isPlayer1 = player === 1;
        const tiles = isPlayer1 ? this.player1Tiles : this.player2Tiles;

        // Clear existing
        tiles.length = 0;
        if (isPlayer1 && this.player1Bar) {
            this.tileContainer.removeChild(this.player1Bar);
            this.player1Bar.destroy();
        } else if (!isPlayer1 && this.player2Bar) {
            this.tileContainer.removeChild(this.player2Bar);
            this.player2Bar.destroy();
        }

        // Sort tiles with lowest at top
        // Player 1 (left side) needs reverse order, Player 2 (right side) needs normal order
        const sortedTileValues = isPlayer1
            ? [...tileValues].sort((a, b) => b - a)  // Descending for player 1
            : [...tileValues].sort((a, b) => a - b); // Ascending for player 2

        // Player colors
        const color = isPlayer1 ? COLORS.tile.player1 : COLORS.tile.player2;
        const glowColor = isPlayer1 ? COLORS.glow.player1 : COLORS.glow.player2;

        // Create curved bar container
        const barContainer = new PIXI.Container();

        // Arc parameters - curves around side of board
        const centerX = app.screen.width / 2;
        const centerY = app.screen.height / 2;
        const arcRadius = 420; // Distance from center
        const segmentAngle = Math.PI / 15; // Angle per segment (~12 degrees - taller boxes)
        const totalAngle = segmentAngle * sortedTileValues.length;
        const startAngle = isPlayer1
            ? Math.PI - totalAngle / 2  // Left side, curved around
            : -totalAngle / 2;          // Right side, curved around

        const barWidth = 103.68; // Width of bar (radial thickness)
        const segmentGap = 3.456; // Gap between segments (one more 20% bigger!)

        sortedTileValues.forEach((value, index) => {
            const angle = startAngle + (index * segmentAngle);
            const nextAngle = angle + segmentAngle - (segmentGap / arcRadius);

            // Calculate arc segment positions
            const innerRadius = arcRadius - barWidth / 2;
            const outerRadius = arcRadius + barWidth / 2;

            // Create segment graphic
            const segment = new PIXI.Graphics();

            // Draw arc segment
            segment.beginFill(color, 0.3);
            segment.lineStyle(5.184, glowColor, 0.6); // Line thickness (one more 20% bigger!)

            // Draw outer arc
            segment.arc(0, 0, outerRadius, angle, nextAngle);
            // Draw line to inner arc
            segment.lineTo(
                innerRadius * Math.cos(nextAngle),
                innerRadius * Math.sin(nextAngle)
            );
            // Draw inner arc (reverse direction)
            segment.arc(0, 0, innerRadius, nextAngle, angle, true);
            segment.closePath();
            segment.endFill();

            // Add number text
            const midAngle = (angle + nextAngle) / 2;
            const textRadius = arcRadius;
            const text = new PIXI.Text(value.toString(), {
                fontFamily: 'Saira',
                fontSize: 62.208, // One more 20% bigger!
                fill: 0xffffff,
                fontWeight: '700'
            });
            text.anchor.set(0.5);
            text.x = textRadius * Math.cos(midAngle);
            text.y = textRadius * Math.sin(midAngle);
            segment.addChild(text);

            // Make interactive
            segment.eventMode = 'static';
            segment.cursor = 'pointer';
            segment.tileValue = value;
            segment.tilePlayer = player;
            segment.tileIndex = index;

            // Click handler
            segment.on('pointerdown', () => {
                if (gameState.currentPlayer === player && !gameState.gameOver) {
                    this.selectTile(player, value, segment);
                }
            });

            // Hover effects
            segment.on('pointerover', () => {
                if (gameState.currentPlayer === player && !gameState.gameOver) {
                    segment.clear();
                    segment.beginFill(color, 0.5); // Brighter on hover
                    segment.lineStyle(5.184, glowColor, 1); // One more 20% bigger line!
                    segment.arc(0, 0, outerRadius, angle, nextAngle);
                    segment.lineTo(innerRadius * Math.cos(nextAngle), innerRadius * Math.sin(nextAngle));
                    segment.arc(0, 0, innerRadius, nextAngle, angle, true);
                    segment.closePath();
                    segment.endFill();
                }
            });

            segment.on('pointerout', () => {
                if (this.selectedTile?.segment !== segment) {
                    segment.clear();
                    segment.beginFill(color, 0.3);
                    segment.lineStyle(5.184, glowColor, 0.6); // One more 20% bigger line!
                    segment.arc(0, 0, outerRadius, angle, nextAngle);
                    segment.lineTo(innerRadius * Math.cos(nextAngle), innerRadius * Math.sin(nextAngle));
                    segment.arc(0, 0, innerRadius, nextAngle, angle, true);
                    segment.closePath();
                    segment.endFill();
                }
            });

            barContainer.addChild(segment);

            // Store tile data
            tiles.push({
                value: value,
                segment: segment,
                player: player,
                index: index,
                angle: midAngle,
                innerRadius,
                outerRadius,
                startAngle: angle,
                endAngle: nextAngle
            });
        });

        // Position bar container
        barContainer.x = centerX;
        barContainer.y = centerY;

        this.tileContainer.addChild(barContainer);

        if (isPlayer1) {
            this.player1Bar = barContainer;
        } else {
            this.player2Bar = barContainer;
        }

        console.log(`🎲 Displayed ${sortedTileValues.length} tiles for Player ${player} as curved bar (lowest to highest)`);
    },

    selectTile(player, value, segment) {
        // Deselect if clicking same tile
        if (this.selectedTile?.segment === segment) {
            this.deselectTile();
            return;
        }

        // Deselect previous tile
        if (this.selectedTile) {
            // Restore previous segment appearance
            const prev = this.selectedTile;
            const tiles = prev.player === 1 ? this.player1Tiles : this.player2Tiles;
            const tileData = tiles.find(t => t.segment === prev.segment);
            if (tileData) {
                this.redrawSegment(prev.segment, prev.player, tileData, false);
            }
        }

        // Select new tile
        this.selectedTile = { player, value, segment };

        // Highlight selected segment
        const tiles = player === 1 ? this.player1Tiles : this.player2Tiles;
        const tileData = tiles.find(t => t.segment === segment);
        if (tileData) {
            this.redrawSegment(segment, player, tileData, true);
        }

        // Valid hexes are already highlighted passively (no need to call here)

        console.log(`✓ Selected tile: ${value} for Player ${player}`);
    },

    redrawSegment(segment, player, tileData, selected) {
        const color = player === 1 ? COLORS.tile.player1 : COLORS.tile.player2;
        const glowColor = player === 1 ? COLORS.glow.player1 : COLORS.glow.player2;

        segment.clear();
        segment.beginFill(color, selected ? 0.7 : 0.3);
        segment.lineStyle(selected ? 10.368 : 5.184, glowColor, selected ? 1 : 0.6); // One more 20% bigger!
        segment.arc(0, 0, tileData.outerRadius, tileData.startAngle, tileData.endAngle);
        segment.lineTo(
            tileData.innerRadius * Math.cos(tileData.endAngle),
            tileData.innerRadius * Math.sin(tileData.endAngle)
        );
        segment.arc(0, 0, tileData.innerRadius, tileData.endAngle, tileData.startAngle, true);
        segment.closePath();
        segment.endFill();
    },

    deselectTile() {
        if (!this.selectedTile) return;

        // Restore appearance
        const tiles = this.selectedTile.player === 1 ? this.player1Tiles : this.player2Tiles;
        const tileData = tiles.find(t => t.segment === this.selectedTile.segment);
        if (tileData) {
            this.redrawSegment(this.selectedTile.segment, this.selectedTile.player, tileData, false);
        }

        this.selectedTile = null;

        // Valid hexes stay highlighted (passive glow, no need to clear)

        // Hide the preview cursor when tile is deselected
        tilePreviewCursor.hide();

        console.log('✗ Tile deselected');
    },

    // PASSIVE GLOW: Highlight all valid hexes for current player (always on)
    highlightValidHexes() {
        if (!gameState.wasmEngine) return;

        // Clear previous highlights first
        this.clearHexHighlights();

        const validMoves = gameState.wasmEngine.getAllValidMoves();
        const currentPlayer = gameState.currentPlayer;
        const glowColor = currentPlayer === 1 ? COLORS.glow.player1 : COLORS.glow.player2;

        validMoves.forEach(move => {
            const hexGraphic = hexGraphics[move.hexId];
            const hexIndex = HEX_POSITIONS.findIndex(p => p.id === move.hexId);
            const pos = HEX_POSITIONS[hexIndex];

            if (hexGraphic && hexData[hexIndex] && hexData[hexIndex].isEmpty && pos) {
                // Clean up any existing glow first (safety check)
                if (validMoveGlowGraphics[hexIndex]) {
                    gsap.killTweensOf(validMoveGlowGraphics[hexIndex]);
                    if (validMoveGlowGraphics[hexIndex].parent) {
                        boardContainer.removeChild(validMoveGlowGraphics[hexIndex]);
                    }
                    validMoveGlowGraphics[hexIndex].destroy({ children: true, texture: true, baseTexture: true });
                    validMoveGlowGraphics[hexIndex] = null;
                }

                // Create a custom glow graphic - simple hexagon outline
                const glowGraphic = new PIXI.Graphics();

                // Draw multiple concentric hexagon outlines for glow effect
                for (let layer = 0; layer < 3; layer++) {
                    const layerSize = HEX_SIZE + (layer * 3); // Each layer 3px bigger
                    const alpha = 0.8 - (layer * 0.15); // Fade out each layer (0.8, 0.65, 0.5)

                    glowGraphic.lineStyle(2.5, glowColor, alpha);

                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i;
                        const px = layerSize * Math.cos(angle);
                        const py = layerSize * Math.sin(angle);

                        if (i === 0) {
                            glowGraphic.moveTo(px, py);
                        } else {
                            glowGraphic.lineTo(px, py);
                        }
                    }
                    glowGraphic.closePath();
                }

                // Position the glow at the hex position
                glowGraphic.x = pos.x;
                glowGraphic.y = pos.y;
                glowGraphic.pivot.set(0, 0);
                glowGraphic.alpha = 0.6; // Start at moderate alpha

                // Add to board container (behind hexes)
                boardContainer.addChildAt(glowGraphic, 0);

                // Store reference
                validMoveGlowGraphics[hexIndex] = glowGraphic;
                hexData[hexIndex].hasValidMoveGlow = true;

                // Pulse animation - gentle fade
                gsap.to(glowGraphic, {
                    alpha: 0.85,
                    duration: 1.2,
                    yoyo: true,
                    repeat: -1,
                    ease: 'sine.inOut'
                });
            }
        });
    },

    clearHexHighlights() {
        validMoveGlowGraphics.forEach((glowGraphic, index) => {
            if (glowGraphic) {
                // CRITICAL: Kill animations FIRST to prevent orphaned tweens
                gsap.killTweensOf(glowGraphic);

                // Remove from container
                if (glowGraphic.parent) {
                    boardContainer.removeChild(glowGraphic);
                }

                // Destroy the graphic completely
                glowGraphic.destroy({ children: true, texture: true, baseTexture: true });

                // Clear reference
                validMoveGlowGraphics[index] = null;
            }
        });

        // Force clear the array completely to prevent memory leaks
        validMoveGlowGraphics.length = 0;

        // Clear the markers
        hexData.forEach(data => {
            if (data) {
                data.hasValidMoveGlow = false;
            }
        });
    },

    vaporizeAndShrink(selectedTile) {
        const { player, value, segment } = selectedTile;
        const glowColor = player === 1 ? COLORS.glow.player1 : COLORS.glow.player2;
        const color = player === 1 ? COLORS.tile.player1 : COLORS.tile.player2;

        // Find the tile data to get its angle and radius
        const tiles = player === 1 ? this.player1Tiles : this.player2Tiles;
        const tileData = tiles.find(t => t.segment === segment);

        if (!tileData) {
            console.error('Could not find tile data for vaporize animation');
            this.removeTile(player, value);
            return;
        }

        // Calculate the segment's center position on the arc
        const bar = player === 1 ? this.player1Bar : this.player2Bar;
        const arcRadius = (tileData.innerRadius + tileData.outerRadius) / 2;
        const localX = arcRadius * Math.cos(tileData.angle);
        const localY = arcRadius * Math.sin(tileData.angle);
        const globalPos = bar.toGlobal(new PIXI.Point(localX, localY));

        // Cyberpunk vaporize effect - segment dissolves with digital glitch
        // Flash bright then fade out
        segment.alpha = 1;
        gsap.to(segment, {
            alpha: 1.5,
            duration: 0.05,
            ease: 'power2.out',
            onComplete: () => {
                gsap.to(segment, {
                    alpha: 0,
                    duration: 0.2,
                    ease: 'power2.in'
                });
            }
        });

        // Digital particle explosion - mix of shapes and sizes
        // PERFORMANCE: Scale down particles based on board fullness
        const tilesPlaced = hexData.filter(h => !h.isEmpty).length;
        const particleScale = Math.max(0.3, 1 - (tilesPlaced / 19) * 0.7); // 35 → 11 as board fills
        const particleCount = Math.floor(35 * particleScale);
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();

            // Mix of squares and circles for digital/glitch feel
            const isSquare = Math.random() > 0.6;
            const size = 2 + Math.random() * 4;

            particle.beginFill(glowColor, 0.95);
            if (isSquare) {
                particle.drawRect(-size/2, -size/2, size, size);
            } else {
                particle.drawCircle(0, 0, size);
            }
            particle.endFill();

            // Add glow to particles
            const particleGlow = new GlowFilter({
                distance: 6,
                outerStrength: 2,
                innerStrength: 0.5,
                color: glowColor,
                quality: 0.3
            });
            particle.filters = [particleGlow];

            particle.x = globalPos.x;
            particle.y = globalPos.y;
            app.stage.addChild(particle);

            // Random burst direction with some variance
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 100;
            const targetX = particle.x + Math.cos(angle) * speed;
            const targetY = particle.y + Math.sin(angle) * speed;

            // Some particles fade faster (layered effect)
            const duration = 0.3 + Math.random() * 0.25;

            // Animate particle burst with slight rotation for energy feel
            gsap.to(particle, {
                x: targetX,
                y: targetY,
                alpha: 0,
                rotation: (Math.random() - 0.5) * Math.PI,
                duration: duration,
                ease: 'power2.out',
                onComplete: () => {
                    app.stage.removeChild(particle);
                    particle.destroy();
                }
            });

            // Slight scale animation for more life
            gsap.to(particle.scale, {
                x: 0.3,
                y: 0.3,
                duration: duration,
                ease: 'power1.in'
            });
        }

        // Immediately start closing the gap (no delay)
        this.smoothCloseGap(player, selectedTile);
    },

    smoothCloseGap(player, selectedTile) {
        const tiles = player === 1 ? this.player1Tiles : this.player2Tiles;

        // Find the SPECIFIC tile instance that was selected (not just by value)
        const tileIndex = tiles.findIndex(t => t.segment === selectedTile.segment);

        if (tileIndex === -1) {
            console.error('Could not find tile to remove');
            return;
        }

        // Get the values of remaining tiles (remove only this specific instance)
        const newTileValues = tiles.filter((_, i) => i !== tileIndex).map(t => t.value);

        // Instant rebuild - no fade, just rebuild immediately
        this.displayTiles(player, newTileValues);
    },

    removeTile(player, value) {
        // This is a fallback if vaporizeAndShrink isn't called
        const tiles = player === 1 ? this.player1Tiles : this.player2Tiles;
        const newTileValues = tiles.filter(t => t.value !== value).map(t => t.value);
        this.displayTiles(player, newTileValues);
        console.log(`🗑️ Removed tile ${value} from Player ${player}`);
    },

    updateOpacity() {
        const activePlayer = gameState.currentPlayer;

        if (this.player1Bar) {
            gsap.to(this.player1Bar, {
                alpha: activePlayer === 1 ? 1 : 0.4,
                duration: 0.3
            });
        }

        if (this.player2Bar) {
            gsap.to(this.player2Bar, {
                alpha: activePlayer === 2 ? 1 : 0.4,
                duration: 0.3
            });
        }
    }
};

// ============================================================================
// TILE PREVIEW CURSOR - Ghost preview when hovering hexes
// ============================================================================

const tilePreviewCursor = {
    previewGraphic: null,
    currentHex: null,

    init() {
        // Create a ghost preview graphic (will be updated with selected tile)
        this.previewGraphic = new PIXI.Container();
        this.previewGraphic.alpha = 0;  // Hidden by default
        this.previewGraphic.eventMode = 'none';  // Don't intercept pointer events
        boardContainer.addChild(this.previewGraphic);  // Add to board container for proper positioning
    },

    show(hexGraphic, tileValue, player) {
        if (!this.previewGraphic) return;

        // Kill any existing animations to prevent conflicts
        gsap.killTweensOf(this.previewGraphic);

        // Clear previous preview
        this.previewGraphic.removeChildren();

        // Get hex position
        const hexPos = HEX_POSITIONS.find(p => hexGraphics[p.id] === hexGraphic);
        if (!hexPos) return;

        // Position preview at hex
        this.previewGraphic.x = hexPos.x;
        this.previewGraphic.y = hexPos.y;

        // Create ghost tile appearance - just the number, no hex outline
        const color = player === 1 ? COLORS.tile.player1 : COLORS.tile.player2;

        // Add tile number only (no hex shape)
        const text = new PIXI.Text(tileValue.toString(), {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 72.657,
            fill: 0xffffff,
            fontWeight: '700'
        });
        text.anchor.set(0.5);

        this.previewGraphic.addChild(text);

        // Fade in
        gsap.to(this.previewGraphic, {
            alpha: 0.6,
            duration: 0.15
        });

        this.currentHex = hexGraphic;
    },

    hide() {
        if (!this.previewGraphic) return;

        // Kill any existing animations to prevent conflicts
        gsap.killTweensOf(this.previewGraphic);

        gsap.to(this.previewGraphic, {
            alpha: 0,
            duration: 0.15,
            onComplete: () => {
                this.previewGraphic.removeChildren();
            }
        });

        this.currentHex = null;
    }
};

// ============================================================================
// HEX RENDERING
// ============================================================================

// Helper: Create RGB split effect for glitch animation
function createRGBSplitEffect(x, y, size) {
    const splits = [];
    const colors = [0xff0000, 0x00ff00, 0x0000ff]; // Red, Green, Blue
    const offsets = [
        { x: -3, y: -2 },
        { x: 2, y: 3 },
        { x: -2, y: 2 }
    ];

    colors.forEach((color, i) => {
        const split = new PIXI.Graphics();
        split.lineStyle(2, color, 0.5);
        split.beginFill(color, 0.15);

        for (let j = 0; j < 6; j++) {
            const angle = (Math.PI / 3) * j;
            const px = size * Math.cos(angle);
            const py = size * Math.sin(angle);

            if (j === 0) {
                split.moveTo(px, py);
            } else {
                split.lineTo(px, py);
            }
        }

        split.closePath();
        split.endFill();
        split.x = x + offsets[i].x;
        split.y = y + offsets[i].y;
        split.alpha = 0;

        splits.push(split);
    });

    return splits;
}

// Helper: Create static noise effect
function createStaticNoise(x, y, size) {
    const noise = new PIXI.Graphics();

    // Random white lines and dots
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * size * 0.8;
        const x1 = Math.cos(angle) * dist;
        const y1 = Math.sin(angle) * dist;
        const x2 = x1 + (Math.random() - 0.5) * 20;
        const y2 = y1 + (Math.random() - 0.5) * 20;

        noise.lineStyle(Math.random() * 2 + 0.5, 0xffffff, Math.random() * 0.8);
        noise.moveTo(x1, y1);
        noise.lineTo(x2, y2);
    }

    noise.x = x;
    noise.y = y;
    noise.alpha = 0;

    return noise;
}

// Animate hex appearance with glitch effect
function animateHexAppearance(hex, pos, delay) {
    // Start hidden
    hex.alpha = 0;
    hex.scale.set(0.8);

    // Phase 1: RGB Split Pre-Glitch
    const rgbSplits = createRGBSplitEffect(pos.x, pos.y, HEX_SIZE);
    rgbSplits.forEach(split => boardContainer.addChild(split));

    gsap.to(rgbSplits, {
        alpha: 0.6,
        duration: 0.1,
        delay: delay,
        stagger: 0.02,
        ease: 'power2.in'
    });

    // Phase 2: Solidify - hex fades in
    gsap.to(hex, {
        alpha: 1,
        duration: 0.2,
        delay: delay + 0.15,
        ease: 'power2.out'
    });

    gsap.to(hex.scale, {
        x: 1.05,
        y: 1.05,
        duration: 0.15,
        delay: delay + 0.15,
        ease: 'back.out(2)',
        onComplete: () => {
            gsap.to(hex.scale, {
                x: 1,
                y: 1,
                duration: 0.1,
                ease: 'power2.inOut'
            });
        }
    });

    // Cleanup RGB splits
    gsap.to(rgbSplits, {
        alpha: 0,
        x: pos.x,
        y: pos.y,
        duration: 0.15,
        delay: delay + 0.15,
        ease: 'power2.in',
        onComplete: () => {
            rgbSplits.forEach(split => {
                boardContainer.removeChild(split);
                split.destroy();
            });
        }
    });
}

function createHexagon(x, y, size, color, strokeColor) {
    const hex = new PIXI.Graphics();

    // Draw hexagon centered perfectly at (0,0)
    hex.lineStyle(3, strokeColor, 1);
    hex.beginFill(color, 1);

    // Use flat-top hexagon with precise centering
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

    // Position the hex
    hex.x = x;
    hex.y = y;

    // Explicitly set pivot to exact center (0,0) where hexagon was drawn
    hex.pivot.set(0, 0);

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
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 72.657,
            fontWeight: '700',
            fill: 0xffffff,
            align: 'center'
        });
        text.anchor.set(0.5, 0.5); // Center both horizontally and vertically
        text.x = pos.x;
        text.y = pos.y - 3; // Slight upward adjustment for better centering
        text.visible = false;

        boardContainer.addChild(text);
        tileTexts[index] = text;

        // Calculate delay based on distance from center (hex 9)
        const centerPos = HEX_POSITIONS[9]; // Center hex
        const dx = pos.x - centerPos.x;
        const dy = pos.y - centerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = (distance / 100) * 0.08; // ~50-80ms per "ring"

        // Trigger glitch animation
        animateHexAppearance(hex, pos, delay);
    });

    // Scanning effects disabled for performance
    // startScanningEffects();

    console.log('✓ Board created with', HEX_POSITIONS.length, 'hexes - loading animation started');
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

// Helper: Calculate neighboring hex indices based on actual distance
function getNeighbors(index) {
    const pos = HEX_POSITIONS[index];
    const neighbors = [];
    // Use hex width as the threshold - should cover all 6 neighbors
    const maxDistance = HEX_WIDTH * 1.2;

    HEX_POSITIONS.forEach((otherPos, otherIndex) => {
        if (otherIndex === index) return; // Skip self

        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If distance is within one hex width, it's a neighbor
        if (distance > 0 && distance < maxDistance) {
            neighbors.push(otherIndex);
        }
    });

    return neighbors;
}

// Helper: Get scoring lanes affected by tile placement at hexId
function getAffectedLanes(hexId, player) {
    const chains = player === 1 ? PLAYER1_CHAINS : PLAYER2_CHAINS;
    const affectedLanes = [];

    chains.forEach((chain, laneIndex) => {
        if (chain.includes(hexId)) {
            affectedLanes.push({
                laneIndex,
                hexIds: chain,
                startHexIndex: chain.indexOf(hexId)
            });
        }
    });

    return affectedLanes;
}

// Animate ripple effect down scoring lanes
function animateScoringLaneRipple(lane, startHexId, player) {
    const glowColor = player === 1 ? COLORS.glow.player1 : COLORS.glow.player2;
    const { hexIds, startHexIndex } = lane;

    // Ripple forward (toward end of lane)
    rippleInDirection(hexIds, startHexIndex, 1, glowColor);

    // Ripple backward (toward start of lane)
    rippleInDirection(hexIds, startHexIndex, -1, glowColor);
}

function rippleInDirection(hexIds, startIndex, direction, glowColor) {
    // Get hex positions for this direction
    const beamHexIds = [];
    let i = startIndex;

    while (i >= 0 && i < hexIds.length) {
        beamHexIds.push(hexIds[i]);
        i += direction;
    }

    // Only create beam if there are at least 2 hexes
    if (beamHexIds.length >= 2) {
        createEnergyBeam(beamHexIds, glowColor);
    }
}

// Track active beams for performance monitoring
const activeBeams = [];

function createEnergyBeam(hexIds, glowColor) {
    // PERFORMANCE: Limit concurrent beams to prevent accumulation
    if (activeBeams.length >= 6) {
        console.warn('⚠️ Beam limit reached, skipping beam');
        return;
    }

    // Get positions for all hexes in the beam
    const positions = hexIds.map(id => HEX_POSITIONS.find(p => p.id === id)).filter(p => p);
    if (positions.length < 2) return;

    // Create the beam line
    const beam = new PIXI.Graphics();

    // Track this beam
    activeBeams.push(beam);

    // Add glow effect for energy beam (reduced quality for performance)
    const beamGlow = new GlowFilter({
        distance: 15,
        outerStrength: 2.0,
        innerStrength: 0.6,
        color: glowColor,
        quality: 0.3
    });
    beam.filters = [beamGlow];
    beam.alpha = 0.4;  // More transparent to not overpower tiles
    boardContainer.addChild(beam);

    // Function to draw beam at a specific progress (0 to 1)
    const drawBeam = (progress) => {
        beam.clear();
        beam.lineStyle(4, glowColor, 0.8);  // Thinner and slightly transparent line

        // Calculate how many positions to draw based on progress
        const numPositions = positions.length;
        const targetIndex = Math.min(numPositions - 1, progress * (numPositions - 1));
        const fullSegments = Math.floor(targetIndex);
        const partialProgress = targetIndex - fullSegments;

        // Draw full segments
        for (let i = 0; i <= fullSegments; i++) {
            const pos = positions[i];
            if (i === 0) {
                beam.moveTo(pos.x, pos.y);
            } else {
                beam.lineTo(pos.x, pos.y);
            }
        }

        // Draw partial segment if needed
        if (partialProgress > 0 && fullSegments < numPositions - 1) {
            const currentPos = positions[fullSegments];
            const nextPos = positions[fullSegments + 1];
            const partialX = currentPos.x + (nextPos.x - currentPos.x) * partialProgress;
            const partialY = currentPos.y + (nextPos.y - currentPos.y) * partialProgress;
            beam.lineTo(partialX, partialY);
        }
    };

    // Animate beam extending from 0 to 1
    const animState = { progress: 0 };
    let lastDrawnProgress = -1;
    const extendTween = gsap.to(animState, {
        progress: 1,
        duration: 0.15,
        ease: 'power2.out',
        onUpdate: () => {
            // Throttle redraws - only redraw if progress changed significantly
            if (Math.abs(animState.progress - lastDrawnProgress) > 0.1) {
                drawBeam(animState.progress);
                lastDrawnProgress = animState.progress;
            }
        },
        onComplete: () => {
            // Draw final state
            drawBeam(1);

            // Fade out smoothly
            const fadeTween = gsap.to(beam, {
                alpha: 0,
                duration: 0.6,
                ease: 'sine.in',
                onComplete: () => {
                    // Kill any remaining tweens
                    gsap.killTweensOf(beam);
                    gsap.killTweensOf(animState);

                    // Remove from active beams tracking
                    const beamIndex = activeBeams.indexOf(beam);
                    if (beamIndex > -1) activeBeams.splice(beamIndex, 1);

                    // Destroy filters first
                    if (beam.filters) {
                        beam.filters.forEach(filter => {
                            if (filter.destroy) filter.destroy();
                        });
                        beam.filters = null;
                    }

                    // Clear graphics
                    beam.clear();

                    // Remove and destroy
                    boardContainer.removeChild(beam);
                    beam.destroy({ children: true, texture: true, baseTexture: true });
                }
            });
        }
    });
}

function onHexHover(hex, index, isOver) {
    if (gameState.gameOver || !hexData[index].isEmpty) return;

    hexData[index].isHovered = isOver;
    const pos = HEX_POSITIONS[index];

    if (isOver) {
        // Check if this is a valid move
        const isValidMove = hexData[index].hasValidMoveGlow;

        // If a tile is selected but this is not a valid move, show error shake
        if (tileInventoryManager.selectedTile && !isValidMove) {
            // INVALID MOVE: Quick rotation shake animation around center axis
            gsap.killTweensOf(hex);
            gsap.killTweensOf(hex.scale);
            gsap.killTweensOf(hex, 'rotation');

            const shakeRotation = 0.1; // Rotation amount in radians (~5.7 degrees)
            gsap.timeline()
                .to(hex, { rotation: shakeRotation, duration: 0.05, ease: 'power2.out' })
                .to(hex, { rotation: -shakeRotation, duration: 0.05, ease: 'power2.inOut' })
                .to(hex, { rotation: shakeRotation * 0.5, duration: 0.05, ease: 'power2.inOut' })
                .to(hex, { rotation: 0, duration: 0.05, ease: 'power2.in' });

            return; // Don't apply hover effects
        }

        // If no tile selected, or not a valid move, don't apply hover effects
        if (!isValidMove) {
            return;
        }

        // VALID MOVE: Apply hover effects
        // Kill breathing animation
        gsap.killTweensOf(hex.scale);

        // Add subtle glow filter - match current player's color
        const glowColor = gameState.currentPlayer === 1 ? COLORS.glow.player1 : COLORS.glow.player2;

        // Boost the glow on hover
        if (hexData[index].hasValidMoveGlow && validMoveGlowGraphics[index]) {
            const glowGraphic = validMoveGlowGraphics[index];
            gsap.killTweensOf(glowGraphic);
            gsap.to(glowGraphic, {
                alpha: 1.0,  // Brighter on hover
                duration: 0.2,
                ease: 'power2.out'
            });
        }

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

        // Reset pivot to (0,0) after redraw (hexagon is centered at origin)
        hex.pivot.set(0, 0);

        // RIPPLE EFFECT - DISABLED (will reactivate later)
        // const neighbors = getNeighbors(index);
        // neighbors.forEach((neighborIndex, i) => {
        //     const neighborHex = hexGraphics[neighborIndex];
        //     if (neighborHex && hexData[neighborIndex].isEmpty) {
        //         // Stagger the ripple effect
        //         setTimeout(() => {
        //             // Very subtle neighbor glow (less intense than main hex)
        //             const neighborGlow = new GlowFilter({
        //                 distance: 7.2,
        //                 outerStrength: 0.96,
        //                 innerStrength: 0.36,
        //                 color: glowColor,
        //                 quality: 0.3
        //             });
        //             neighborHex.filters = [neighborGlow];
        //
        //             // Very subtle scale pulse
        //             gsap.to(neighborHex.scale, {
        //                 x: 1.036,
        //                 y: 1.036,
        //                 duration: 0.2,
        //                 ease: 'power2.out',
        //                 onComplete: () => {
        //                     gsap.to(neighborHex.scale, {
        //                         x: 1,
        //                         y: 1,
        //                         duration: 0.2,
        //                         ease: 'power2.in'
        //                     });
        //                 }
        //             });
        //
        //             // Fade glow out with cascading effect
        //             gsap.to(neighborGlow, {
        //                 outerStrength: 0,
        //                 duration: 0.2,
        //                 delay: 0.15 + (i * 0.05), // Cascading fade delay
        //                 ease: 'power2.out',
        //                 onComplete: () => {
        //                     if (hexData[neighborIndex].isEmpty && !hexData[neighborIndex].isHovered) {
        //                         neighborHex.filters = [];
        //                     }
        //                 }
        //             });
        //         }, i * 30); // Stagger by 30ms per neighbor
        //     }
        // });

        // Particle effects disabled for performance
        // particleManager.startHoverEmitter(hex.hexId, pos.x, pos.y);

        // SHOW TILE PREVIEW if a tile is selected AND this is a valid move
        if (tileInventoryManager.selectedTile && isValidMove) {
            tilePreviewCursor.show(
                hex,
                tileInventoryManager.selectedTile.value,
                tileInventoryManager.selectedTile.player
            );
        }

    } else {
        // Return to normal - restore glow pulse
        if (hexData[index].hasValidMoveGlow && validMoveGlowGraphics[index]) {
            const glowGraphic = validMoveGlowGraphics[index];
            gsap.killTweensOf(glowGraphic);
            // Set back to base alpha, then resume pulse
            glowGraphic.alpha = 0.6;
            gsap.to(glowGraphic, {
                alpha: 0.85,
                duration: 1.2,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut'
            });
        }

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

        // Reset pivot to (0,0) after redraw (hexagon is centered at origin)
        hex.pivot.set(0, 0);

        // Stop particles
        particleManager.stopHoverEmitter(hex.hexId);

        // Hide preview when leaving hex
        tilePreviewCursor.hide();
    }
}

function onHexClick(hex, index) {
    if (gameState.gameOver || !hexData[index].isEmpty) return;

    const hexId = hex.hexId;
    const pos = HEX_POSITIONS[index];

    // CHECK: Do we have a tile selected?
    if (!tileInventoryManager.selectedTile) {
        console.log('❌ No tile selected - please select a tile first');
        return;
    }

    const selectedTile = tileInventoryManager.selectedTile;

    // Validate: Can only place your own tile on your own turn
    if (selectedTile.player !== gameState.currentPlayer) {
        console.log('❌ Cannot place opponent\'s tile');
        return;
    }

    console.log('Hex clicked:', hexId, 'with tile', selectedTile.value);

    // Validate move with WASM engine
    if (gameState.wasmEngine) {
        const validMoves = gameState.wasmEngine.getAllValidMoves();
        const isValidMove = validMoves.some(move =>
            move.hexId === hexId && move.tileValue === selectedTile.value
        );

        if (!isValidMove) {
            console.log('❌ Invalid move');
            return;
        }

        // Make move in WASM engine
        gameState.wasmEngine.makeMove(hexId, selectedTile.value);
    }

    // INSTANT FEEDBACK: Player-colored ripple ring on placement
    const ringColor = gameState.currentPlayer === 1 ? COLORS.glow.player1 : COLORS.glow.player2;
    const ring = new PIXI.Graphics();
    ring.lineStyle(3, ringColor, 1);
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

    // Place tile with the selected value (instant)
    placeTile(hexId, index, gameState.currentPlayer, selectedTile.value);

    // SCORING LANE RIPPLE: Animate ripple down affected scoring lanes for BOTH players
    // Player 1 lanes
    const player1Lanes = getAffectedLanes(hexId, 1);
    player1Lanes.forEach(lane => {
        animateScoringLaneRipple(lane, hexId, 1);
    });

    // Player 2 lanes
    const player2Lanes = getAffectedLanes(hexId, 2);
    player2Lanes.forEach(lane => {
        animateScoringLaneRipple(lane, hexId, 2);
    });

    // CYBERPUNK FEEDBACK: Trigger 4-edge scan waves in player color
    flashManager.createPlayerTileScanWaves(gameState.currentPlayer);

    // SIMULTANEOUSLY: Vaporize tile from player box with particles and smooth shrink
    tileInventoryManager.vaporizeAndShrink(selectedTile);

    // Deselect tile
    tileInventoryManager.deselectTile();

    // Hide preview cursor
    tilePreviewCursor.hide();

    // Switch player
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;

    // Update tile opacity for new turn
    tileInventoryManager.updateOpacity();

    // Update valid hex highlights for new player (debounced)
    if (lastHighlightedPlayer !== gameState.currentPlayer) {
        lastHighlightedPlayer = gameState.currentPlayer;
        tileInventoryManager.highlightValidHexes();
    }

    updateUI();
}

function placeTile(hexId, index, player, value) {
    gameState.board[hexId] = { player, value };
    hexData[index].isEmpty = false;
    hexData[index].hasValidMoveGlow = false;

    // Remove glow graphic if it exists
    if (validMoveGlowGraphics[index]) {
        gsap.killTweensOf(validMoveGlowGraphics[index]);
        if (validMoveGlowGraphics[index].parent) {
            boardContainer.removeChild(validMoveGlowGraphics[index]);
        }
        validMoveGlowGraphics[index].destroy({ children: true, texture: true, baseTexture: true });
        validMoveGlowGraphics[index] = null;
    }

    // Stop hover effects
    particleManager.stopHoverEmitter(hexId);

    // Update hex appearance
    const hex = hexGraphics[index];

    // Kill all animations and reset scale
    gsap.killTweensOf(hex);
    gsap.killTweensOf(hex.scale);
    hex.scale.set(1);
    const pos = HEX_POSITIONS[index];

    // Determine colors based on player (0 = neutral/starting tile)
    let playerColor, glowColor, fillOpacity;
    if (player === 0) {
        // Neutral/starting tile - yellow/gold theme (darker for better contrast)
        playerColor = 0xB8860B;  // Dark goldenrod - better contrast with white text
        glowColor = 0xFFD700;    // Bright gold glow
        fillOpacity = 0.85;      // Much more opaque so hex is visible
    } else if (player === 1) {
        playerColor = COLORS.hex.player1;
        glowColor = COLORS.glow.player1;
        fillOpacity = 0.3;
    } else {
        playerColor = COLORS.hex.player2;
        glowColor = COLORS.glow.player2;
        fillOpacity = 0.3;
    }

    hex.clear();

    // Ensure position and pivot are correct
    hex.x = pos.x;
    hex.y = pos.y;
    hex.pivot.set(0, 0);

    // Consistent edge width for all tiles
    const edgeWidth = 4;
    const edgeAlpha = 1;

    hex.lineStyle(edgeWidth, glowColor, edgeAlpha);
    hex.beginFill(playerColor, fillOpacity);

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

    // Subtle glow filter (reduced quality for performance on full board)
    const glow = new GlowFilter({
        distance: player === 0 ? 15 : 12,  // Stronger glow for neutral
        outerStrength: player === 0 ? 2 : 1.5,
        innerStrength: player === 0 ? 1 : 0.8,
        color: glowColor,
        quality: 0.3  // Lower quality for static tiles - 70% performance gain
    });
    hex.filters = [glow];

    // Show tile value with enhanced animation
    const text = tileTexts[index];
    text.text = value.toString();

    // Update text style (must modify style object directly)
    text.style.fill = 0xffffff;  // White text for all tiles
    text.style.stroke = 0x152d42;  // Medium-dark navy blue
    text.style.strokeThickness = 6;  // Thick border for visibility

    text.visible = true;

    console.log(`📝 Placed tile ${value} at index ${index}, text visible: ${text.visible}, text: "${text.text}"`);

    // Add subtle dark glow to text for extra depth (reduced quality for performance)
    const textGlow = new GlowFilter({
        distance: 8,
        outerStrength: 1.5,
        innerStrength: 0.5,
        color: 0x1a2f43,  // Even darker navy-grey for depth
        quality: 0.2  // Very low quality for text - stroke provides most contrast
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
        console.log('Loading game engine...');
        // Use JavaScript engine directly
        if (typeof HexukiGameEngineAsymmetric !== 'undefined') {
            gameState.wasmEngine = new HexukiGameEngineAsymmetric();
            console.log('✓ Game engine loaded successfully (JavaScript)');
        } else {
            // Fallback to WASM if available
            gameState.wasmEngine = await HexukiWasm();
            if (gameState.wasmEngine.initialize) {
                gameState.wasmEngine.initialize();
            }
            console.log('✓ Game engine loaded successfully (WASM)');
        }
        return true;
    } catch (err) {
        console.error('Failed to load game engine:', err);
        console.log('Game will run in demo mode without engine');
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

    // Wait for fonts to load
    try {
        await document.fonts.load('700 62px Saira');
        console.log('✓ Fonts loaded');
    } catch (e) {
        console.warn('⚠️ Font loading timeout, continuing anyway');
    }

    // Create board
    createBoard();

    // Initialize tile systems
    tileInventoryManager.init();
    tilePreviewCursor.init();

    // Start subliminal grid flashes
    flashManager.start();

    // Load WASM engine
    await loadWASMEngine();

    // Sync visual board with WASM engine state
    if (gameState.wasmEngine) {
        const engineState = gameState.wasmEngine.getState();

        // Wait for board animation to complete, then place starting tile
        setTimeout(() => {
            // Display the starting tile (center hex should have value 1)
            engineState.board.forEach((hexData, arrayIndex) => {
                if (hexData.value !== null) {
                    // Find the hex in hexGraphics by ID
                    const hexGraphicIndex = HEX_POSITIONS.findIndex(pos => pos.id === hexData.id);

                    console.log(`🔍 Found starting tile: value=${hexData.value}, id=${hexData.id}, graphicIndex=${hexGraphicIndex}`);

                    if (hexGraphicIndex !== -1) {
                        // Place the starting tile visually
                        placeTile(hexData.id, hexGraphicIndex, 0, hexData.value); // 0 = neutral
                        console.log(`🎯 Starting tile ${hexData.value} placed at hex ${hexData.id} (graphic index ${hexGraphicIndex})`);
                    }
                }
            });
        }, 1600); // Wait for board glitch animation to finish

        // Display player tiles from WASM engine
        tileInventoryManager.displayTiles(1, engineState.player1Tiles);
        tileInventoryManager.displayTiles(2, engineState.player2Tiles);
        tileInventoryManager.updateOpacity();

        // Highlight valid hexes for the starting player (passive glow)
        setTimeout(() => {
            tileInventoryManager.highlightValidHexes();
        }, 1700); // Wait for board animation to complete

        console.log('🎲 Player 1 tiles:', engineState.player1Tiles);
        console.log('🎲 Player 2 tiles:', engineState.player2Tiles);
    }

    // Add ESC key listener for tile deselection
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            tileInventoryManager.deselectTile();
            tilePreviewCursor.hide();
            console.log('⌨️ ESC pressed - tile deselected');
        }
    });

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
    console.log('🎮 Select a tile from your inventory, then click a hex to place it');
    console.log('⌨️  Press ESC to deselect a tile');
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
