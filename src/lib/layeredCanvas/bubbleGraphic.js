import seedrandom from "seedrandom";
import { claim_text, xlink_attr } from "svelte/internal";
import { QuickHull } from "./quickHull.js"

export function drawBubble(context, seed, rect, patternName) {
  switch (patternName) {
    case "rounded":
      drawRoundedBubble(context, seed, rect);
      break;
    case "square":
      drawSquareBubble(context, seed, rect);
      break;
    case "ellipse":
      drawEllipseBubble(context, seed, rect);
      break;
    case "concentration":
      drawConcentrationBubble(context, seed, rect);
      break;
    case "polygon":
      drawPolygonBubble(context, seed, rect);
      break;
    case "strokes":
      drawStrokesBubble(context, seed, rect);
      break;
    case "double-strokes":
      drawDoubleStrokesBubble(context, seed, rect);
      break;
    case "harsh":
      drawHarshBubble(context, seed, rect);
      break;
    case "harsh-curve":
      drawHarshCurveBubble(context, seed, rect);
      break;
    case "soft":
      drawSoftBubble(context, seed, rect);
      break;
    case "none":
      break;
    default:
      throw new Error(
        `Unknown bubble pattern: ${patternName}, candidates are "rounded", "square", "ellipse", "strokes"`
      );
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

function drawHarshBubble(context, seed, rect) {
  const bump = Math.min(rect[2], rect[3]) / 10;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 10);
  const points = subdividedPointsWithBump(rawPoints, bump);

  function makePath() {
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
  }

  makePath();
  context.fill();

  makePath();
  context.stroke();
}

function drawPoints(context, points, color) {
  context.save();
  context.strokeStyle = color;
  context.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // draw circle
    context.moveTo(p[0], p[1]);
    context.arc(p[0], p[1], 2, 0, 2 * Math.PI);
  }
  context.stroke();
  context.restore();
}

function drawHarshCurveBubble(context, seed, rect) {
  const bump = Math.min(rect[2], rect[3]) / 10;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 12);

  // drawPoints(context, rawPoints, 'red');

  const points = subdividedPointsWithBump(rawPoints, bump);
  // drawPoints(context, points, 'blue');

  function makePath() {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 0; i < points.length; i += 2) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const p2 = points[(i + 2) % points.length];
      context.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    }
    context.closePath();
  }

  makePath();
  context.fill();

  makePath();
  context.stroke();
}

function drawSoftBubble(context, seed, rect) {
  const bump = Math.min(rect[2], rect[3]) / 15;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 12);
  const points = subdividedPointsWithBump(rawPoints, -bump);

  function makePath() {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 0; i < points.length; i += 2) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const p2 = points[(i + 2) % points.length];
      context.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    }
    context.closePath();
  }

  makePath();
  context.fill();

  makePath();
  context.stroke();
}

function subdivideSegmentWithBump(p1, p2, bump) {
  const q = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  const [dx, dy] = [p2[0] - p1[0], p2[1] - p1[1]];
  const [nx, ny] = [-dy, dx];
  const [mx, my] = [
    nx / Math.sqrt(nx * nx + ny * ny),
    ny / Math.sqrt(nx * nx + ny * ny),
  ];
  const [qx, qy] = [q[0] + mx * bump, q[1] + my * bump];
  return [qx, qy];
}

function subdividedPointsWithBump(points, bump) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    result.push(p1);
    result.push(subdivideSegmentWithBump(p1, p2, bump));
  }
  return result;
}

function drawEllipseBubble(context, seed, rect) {
  const [x, y, w, h] = rect;

  context.beginPath();
  context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
}

function drawConcentrationBubble(context, seed, rect) {
  const [x, y, w, h] = rect;
  const [cx, cy] = [x + w / 2, y + h / 2];

  context.save();
  context.translate(cx, cy);
  context.scale(w / 2, h / 2);

  context.lineWidth = 1 / Math.min(w, h);
  // draw n radial line
  const n = 200;
  context.save();
  const gradient = context.createRadialGradient(0, 0, 1, 0, 0, 1.15);
  gradient.addColorStop(0.0, "rgba(0,0,0,1)");
  gradient.addColorStop(1.0, "rgba(0,0,0,0)");
  context.strokeStyle = gradient;
  context.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (i * 2 * Math.PI) / n;
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    const [lx, ly] = [dx * 1.15, dy * 1.15];
    context.moveTo(0, 0);
    context.lineTo(lx, ly);
  }
  context.closePath();
  context.stroke();
  context.restore();

  context.beginPath();
  context.ellipse(0, 0, 1, 1, 0, 0, 2 * Math.PI);
  context.fill();
  context.restore();
}

function drawPolygonBubble(context, seed, rect, double) {
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 10);
  const cookedPoints = QuickHull(rawPoints.map((p) => ({ x: p[0], y: p[1] })));
  const points = cookedPoints.map((p) => [p.x, p.y]);

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
  context.stroke();
}

function drawStrokesBubble(context, seed, rect) {
    drawStrokesBubbleAux(context, seed, rect, false);
}

function drawDoubleStrokesBubble(context, seed, rect) {
    drawStrokesBubbleAux(context, seed, rect, true);
}

function drawStrokesBubbleAux(context, seed, rect, double) {
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 10);
  const cookedPoints = QuickHull(rawPoints.map((p) => ({ x: p[0], y: p[1] })));
  const points = cookedPoints.map((p) => [p.x, p.y]);

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

  const dist = Math.min(rect[2], rect[3]) / 60;

  context.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];

    const [q0, q1] = extendLineSegment(p0, p1, 1.1);

    context.moveTo(q0[0], q0[1]);
    context.lineTo(q1[0], q1[1]);

    if (double) {
        const [dx, dy] = [p1[0] - p0[0], p1[1] - p0[1]];
        const [nx, ny] = [-dy, dx];
        const [mx, my] = [
        nx / Math.sqrt(nx * nx + ny * ny),
        ny / Math.sqrt(nx * nx + ny * ny),
        ];
        const [qx, qy] = [q0[0] + mx * dist, q0[1] + my * dist];
        const [rx, ry] = [q1[0] + mx * dist, q1[1] + my * dist];

        context.moveTo(qx, qy);
        context.lineTo(rx, ry);
    }
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
        const angleJitter = (rng() - 0.5) / (numPoints * 2);
        // const angleJitter = 0;
        const angle = (i / numPoints + angleJitter) * 2 * Math.PI;
        
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
