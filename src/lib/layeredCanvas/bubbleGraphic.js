import seedrandom from "seedrandom";
import { QuickHull } from "./quickHull.js"

export function drawBubble(context, seed, rect, patternName) {
    switch (patternName) {
        case 'rounded':
            drawRoundedBubble(context, seed, rect);
            break;
        case 'square':
            drawSquareBubble(context, seed, rect);
            break;
        case 'ellipse':
            drawEllipseBubble(context, seed, rect);
            break;
        case 'strokes':
            drawStrokesBubble(context, seed, rect);
            break;
        default:
            throw new Error(`Unknown bubble pattern: ${patternName}, candidates are "rounded", "square", "ellipse", "strokes"`);
    }
}

function drawRoundedBubble(context, seed, rect) {
    const [x, y, w, h] = rect;
    const rw = w / 2;
    const rh = h / 2;
    const x1 = x + rw;
    const x2 = x + w - rw;
    const y1 = y + rh;
    const y2 = y + h - rh;

    // fill path and stroke frame
    context.beginPath();
    context.moveTo(x1, y);
    context.lineTo(x2, y);
    context.quadraticCurveTo(x + w, y, x + w, y1);
    context.lineTo(x + w, y2);
    context.quadraticCurveTo(x + w, y + h, x2, y + h);
    context.lineTo(x1, y + h);
    context.quadraticCurveTo(x, y + h, x, y2);
    context.lineTo(x, y1);
    context.quadraticCurveTo(x, y, x1, y);
    context.fill();
    context.stroke();
}

function drawSquareBubble(context, seed, rect) {
    const [x, y, w, h] = rect;

    // fill
    context.fillRect(x, y, w, h);
    context.strokeRect(x, y, w, h);
}

function drawEllipseBubble(context, seed, rect) {
    const [x, y, w, h] = rect;

    // fill
    context.beginPath();
    context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
}

function drawStrokesBubble(context, seed, rect) {
    const rng = seedrandom(seed);
    const rawPoints = generateRandomPoints(rng, rect, 10);
    const cookedPoints = QuickHull(rawPoints.map(p => ({x: p[0], y: p[1]})));
    const points = cookedPoints.map(p => [p.x, p.y]);

    context.fillStyle = 'white';
    context.beginPath();
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (i === 0) {
            context.moveTo(p[0], p[1]);
        } else {
            context.lineTo(p[0], p[1]);
        }
    }
    context.closePath();
    context.fill();

    context.beginPath();
    for (let i = 0; i < points.length; i++) {
        const p0 = points[i];
        const p1 = points[(i + 1) % points.length];

        const [q0, q1] = extendLineSegment(p0, p1, 1.1);

        context.moveTo(q0[0], q0[1]);
        context.lineTo(q1[0], q1[1]);
    }

    context.closePath();
    context.stroke();
}

function extendLineSegment(p0, p1, extensionFactor) {
    const [dx, dy] = [p1[0] - p0[0], p1[1] - p0[1]];
  
    const q0 = [p1[0] - dx * extensionFactor, p1[1] - dy * extensionFactor];
    const q1 = [p0[0] + dx * extensionFactor, p0[1] + dy * extensionFactor];
    return [q0, q1];
}
  
function generateRandomPoints(rng, rect, numPoints) {
    const c = [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
    const hw = rect[2] / 2;
    const hh = rect[3] / 2;
    const r = Math.sqrt(hw ** 2 + hh ** 2);

    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints + (rng() - 0.5) / (numPoints*2)) * 2 * Math.PI;
        
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);

        // calculate length to collision with left fence or right fence
        const p = superellipsePoint(hw, hh, 3, angle);
        points.push([c[0] + p[0], c[1] + p[1]]);
    }

    return points;
}

function superellipsePoint(a, b, n, theta) {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const x = a * Math.sign(cosTheta) * Math.pow(Math.abs(cosTheta), 2 / n);
    const y = b * Math.sign(sinTheta) * Math.pow(Math.abs(sinTheta), 2 / n);
    return [x, y];
  }