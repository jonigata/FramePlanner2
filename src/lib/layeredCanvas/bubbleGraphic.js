import seedrandom from "seedrandom";
import { QuickHull } from "./quickHull.js"

export const bubbleOptionSets = {
  "rounded": {},
  "square": {},
  "ellipse": {"angleVector": {hint: "しっぽ",icon:"tail"}},
  "concentration": {},
  "polygon": {},
  "strokes": {},
  "double-strokes": {},
  "harsh": {"angleVector": {hint: "しっぽ",icon:"tail"}},
  "harsh-curve": {"angleVector": {hint: "しっぽ",icon:"tail"}},
  "soft": {"angleVector": {hint: "しっぽ",icon:"tail"}},
  "none": {},
};

export function drawBubble(context, seed, rect, patternName, opts) {
  switch (patternName) {
    case "rounded":
      drawRoundedBubble(context, seed, rect, opts);
      break;
    case "square":
      drawSquareBubble(context, seed, rect, opts);
      break;
    case "ellipse":
      drawEllipseBubble(context, seed, rect, opts);
      break;
    case "concentration":
      drawConcentrationBubble(context, seed, rect, opts);
      break;
    case "polygon":
      drawPolygonBubble(context, seed, rect, opts);
      break;
    case "strokes":
      drawStrokesBubble(context, seed, rect, opts);
      break;
    case "double-strokes":
      drawDoubleStrokesBubble(context, seed, rect, opts);
      break;
    case "harsh":
      drawHarshBubble(context, seed, rect, opts);
      break;
    case "harsh-curve":
      drawHarshCurveBubble(context, seed, rect, opts);
      break;
    case "soft":
      drawSoftBubble(context, seed, rect, opts);
      break;
    case "none":
      break;
    default:
      throw new Error(
        `Unknown bubble pattern: ${patternName}`
      );
  }
}

function drawRoundedBubble(context, seed, rect, opts) {
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
  finishTrivialPath(context);
}

function drawSquareBubble(context, seed, rect, opts) {
  const [x, y, w, h] = rect;

  // fill
  context.beginPath();
  context.rect(x, y, w, h);
  finishTrivialPath(context);
}

function drawHarshBubble(context, seed, rect, opts) {
  const bump = Math.min(rect[2], rect[3]) / 10;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 10);
  const points = subdividedPointsWithBump(rawPoints, bump, -1, 0);
  if (opts?.angleVector) {
    const [cx, cy] = [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
    const v = [cx + opts.angleVector[0], cy + opts.angleVector[1]];
    const tailIndex = getNearestIndex(points, v);
    points[tailIndex] = v;
  }

  function makePath() {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) {
        context.moveTo(p[0], p[1]);
      } else {
        context.lineTo(p[0], p[1]);
      }
    }
    context.lineTo(points[0][0], points[0][1]);
  }

  context.beginPath();
  makePath();
  finishTrivialPath(context);
}

function drawPoints(context, points, color, opts) {
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

function drawHarshCurveBubble(context, seed, rect, opts) {
  let bump = Math.min(rect[2], rect[3]) / 10;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 12);
  let points;
  if (opts?.angleVector) {
    const [cx, cy] = [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
    const v = [cx + opts.angleVector[0], cy + opts.angleVector[1]];
    const tailIndex = getNearestIndex(rawPoints, v);
    rawPoints[tailIndex] = v;
    points = subdividedPointsWithBump(rawPoints, bump, tailIndex, bump*2);
  } else {
    points = subdividedPointsWithBump(rawPoints, bump);
  }

  function makePath() {
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 0; i < points.length; i += 2) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const p2 = points[(i + 2) % points.length];
      context.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    }
  }

  context.beginPath();
  makePath();
  finishTrivialPath(context);
}

function drawSoftBubble(context, seed, rect, opts) {
  const bump = Math.min(rect[2], rect[3]) / 15;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 16);
  let points;
  if (opts?.angleVector) {
    const [cx, cy] = [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
    const v = [cx + opts.angleVector[0], cy + opts.angleVector[1]];
    const tailIndex = getNearestIndex(rawPoints, v);
    rawPoints[tailIndex] = v;
    points = subdividedPointsWithBump(rawPoints, -bump, tailIndex, bump);
  } else {
    points = subdividedPointsWithBump(rawPoints, -bump, -1, 0);
  }

  function makePath() {
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 0; i < points.length; i += 2) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const p2 = points[(i + 2) % points.length];
      context.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    }
  }

  context.beginPath();
  makePath();
  finishTrivialPath(context);
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

function subdividedPointsWithBump(points, bump, tailIndex, tailBump) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const p1 = points[i];
    const p2 = points[next];
    result.push(p1);
    result.push(subdivideSegmentWithBump(
      p1, p2, next === tailIndex || i === tailIndex ? tailBump : bump));
  }
  return result;
}

function drawEllipseBubble(context, seed, rect, opts) {
  const [x, y, w, h] = rect
  const [w2, h2] = [w / 2, h / 2];
  const [cx, cy] = [x + w2, y + h2];

  let startAngle = 0;
  let endAngle = 2 * Math.PI;
  let tail = [0,0];

  if (opts?.angleVector) {
    const angleVector = opts.angleVector;
    if (angleVector[0] === 0 && angleVector[1] === 0) {
      // do nothing
    } else {
      const theta = vectorToEllipseAngle(w2, h2, angleVector[0], angleVector[1]);
      startAngle = theta + Math.PI / 32;
      endAngle = theta - Math.PI / 32;
      tail = [cx + opts.angleVector[0], cy + opts.angleVector[1]];
    }
  }

  context.beginPath();
  context.ellipse(cx, cy, w2, h2, 0, startAngle, endAngle);
  if (opts?.angleVector) {
    context.lineTo(...tail);
  }
  context.closePath();
  finishTrivialPath(context);
}

function vectorToEllipseAngle(rx, ry, vx, vy) {
  const length = Math.sqrt(vx * vx + vy * vy);
  
  const normalizedVx = vx / length;
  const normalizedVy = vy / length;

  const ellipseX = rx * ry * normalizedVx / Math.sqrt(ry * ry * normalizedVx * normalizedVx + rx * rx * normalizedVy * normalizedVy);
  const ellipseY = rx * ry * normalizedVy / Math.sqrt(ry * ry * normalizedVx * normalizedVx + rx * rx * normalizedVy * normalizedVy);

  const ellipseAngle = Math.atan2(ellipseY / ry, ellipseX / rx);
  return ellipseAngle;
}

function drawConcentrationBubble(context, seed, rect, opts) {
  const [x, y, w, h] = rect;
  const [cx, cy] = [x + w / 2, y + h / 2];

  if (context.bubbleDrawMethod === "fill") {
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
      context.moveTo(dx, dy);
      context.lineTo(lx, ly);
    }
    context.closePath();
    context.stroke();
    context.restore();

    context.beginPath();
    context.ellipse(0, 0, 1, 1, 0, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  } else if (context.bubbleDrawMethod === "clip") {
    context.beginPath();
    context.ellipse(cx, cy, w*0.5, h*0.5, 0, 0, 2 * Math.PI);
    context.clip();
  } else {  // stroke
    // do nothing;
  }
}

function drawPolygonBubble(context, seed, rect, opts) {
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
  finishTrivialPath(context);
}

function drawStrokesBubble(context, seed, rect, opts) {
    drawStrokesBubbleAux(context, seed, rect, false);
}

function drawDoubleStrokesBubble(context, seed, rect, opts) {
    drawStrokesBubbleAux(context, seed, rect, true);
}

function drawStrokesBubbleAux(context, seed, rect, double) {
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, rect, 10);
  const cookedPoints = QuickHull(rawPoints.map((p) => ({ x: p[0], y: p[1] })));
  const points = cookedPoints.map((p) => [p.x, p.y]);

  if (context.bubbleDrawMethod == "fill" || context.bubbleDrawMethod == "clip") {
    context.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) {
        context.moveTo(p[0], p[1]);
      } else {
        context.lineTo(p[0], p[1]);
      }
    }
    finishTrivialPath(context);
  } else {
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
    context.stroke();
  }
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

function finishTrivialPath(context) {
  switch(context.bubbleDrawMethod) {
    case 'fill':
      context.fill();
      break;
    case 'stroke':
      context.stroke();
      break;
    case 'clip':
      context.clip();
      break;
  }
}

function getNearestIndex(points, v) {
  let minDist = Infinity;
  let minIndex = -1;
  for (let i = 0; i < points.length; i++) {
    const dist = Math.hypot(points[i][0] - v[0], points[i][1] - v[1]);
    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
    }
  }
  return minIndex;
}
