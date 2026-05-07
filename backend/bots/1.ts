import { Game } from "../game.ts";
import { moduloAngle } from "../../shared/utils.ts";
import type { Beetle, Ruby } from "../../shared/types.ts";

/**
 * Constants & Weights 
 * These can be tuned to change the bot's "personality"
 */
const MAX_SIZE = 4;
const MAP_SIZE = 67;
const DASH_ANGLE_THRESHOLD = 0.25; // Radians

const WEIGHTS = {
    RUBY: 120,      // Critical for survival/score
    BACKSTAB: 55,   // Incentive to hit others from behind
    AVOID_HEAD: 70, // Penalty for head-on collisions
    POINT: 2,       // Low-priority filler
    WALL_PUSH: 90,  // High priority near the edge
};

/**
 * The core decision-making function
 */
export function updateBot(game: Game, beetle: Beetle) {
    let desireX = 0;
    let desireY = 0;
    const sizeRatio = beetle.size / MAX_SIZE;

    // --- 1. SURVIVAL: AVOID THE WORLD EDGE ---
    const distFromCenter = Math.sqrt(beetle.x ** 2 + beetle.y ** 2);
    const edgeLimit = MAP_SIZE - beetle.size;
    if (distFromCenter > edgeLimit * 0.75) {
        // Exponential push back to center as we approach the wall
        const wallUrgency = Math.pow(distFromCenter / edgeLimit, 5);
        desireX -= (beetle.x / distFromCenter) * WEIGHTS.WALL_PUSH * wallUrgency;
        desireY -= (beetle.y / distFromCenter) * WEIGHTS.WALL_PUSH * wallUrgency;
    }

    // --- 2. SURVIVAL & SCORE: RUBY SEEKING ---
    game.rubys.forEach(ruby => {
        if (ruby.protectionTicks > 10) return; // Wait until it's "edible"
        const dx = ruby.x - beetle.x;
        const dy = ruby.y - beetle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // As beetle size grows, rubies become exponentially more desirable
        const urgency = WEIGHTS.RUBY * (1 + Math.pow(sizeRatio, 2) * 3);
        desireX += (dx / dist) * (urgency / (dist / 15 + 1));
        desireY += (dy / dist) * (urgency / (dist / 15 + 1));
    });

    // --- 3. COMBAT: BACKSTAB VS. EVADE ---
    game.beetles.forEach(other => {
        if (other.id === beetle.id) return;
        const dx = other.x - beetle.x;
        const dy = other.y - beetle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 30) return; // Ignore distant threats

        // Check if we are behind the other beetle
        const otherFacingX = Math.cos(other.angle);
        const otherFacingY = Math.sin(other.angle);
        const toUsX = -dx / dist;
        const toUsY = -dy / dist;
        
        // Dot product: 1 = they are facing away (back is open), -1 = they face us
        const backstabQuality = (otherFacingX * toUsX + otherFacingY * toUsY);

        if (backstabQuality > 0.3) {
            // Target is vulnerable! Go for the hit.
            desireX += (dx / dist) * WEIGHTS.BACKSTAB * backstabQuality;
            desireY += (dy / dist) * WEIGHTS.BACKSTAB * backstabQuality;
        } else {
            // Head-on risk. Veer away to avoid mutual size increase.
            desireX -= (dx / dist) * WEIGHTS.AVOID_HEAD * (1 - dist / 30);
            desireY -= (dy / dist) * WEIGHTS.AVOID_HEAD * (1 - dist / 30);
        }
    });

    // --- 4. GROWTH: EAT POINTS ---
    game.points.forEach(pos => {
        const dx = pos[0] - beetle.x;
        const dy = pos[1] - beetle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
            desireX += (dx / dist) * WEIGHTS.POINT;
            desireY += (dy / dist) * WEIGHTS.POINT;
        }
    });

    // --- 5. EXECUTION: SET ANGLE & DASH ---
    beetle.targetAngle = Math.atan2(desireY, desireX);

    // Dashing Logic: Only dash if lined up and pursuing a high-value target (Ruby/Backstab)
    const angleDiff = Math.abs(moduloAngle(beetle.targetAngle - beetle.angle));
    const isLinedUp = angleDiff < DASH_ANGLE_THRESHOLD;
    const desireMagnitude = Math.sqrt(desireX**2 + desireY**2);

    // Only dash if we have a strong reason (desire > threshold) and aren't about to die from dash size cost
    if (isLinedUp && desireMagnitude > 60 && sizeRatio < 0.9) {
        beetle.clicked = true;
    } else {
        beetle.clicked = false;
    }
}
