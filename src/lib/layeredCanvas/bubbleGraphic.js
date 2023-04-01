import seedrandom from "seedrandom";
import { QuickHull } from "./quickHull.js"
import * as paper from 'paper';

export const bubbleOptionSets = {
  "rounded": {link: {hint:"結合", icon:"unite"}, angleVector: {hint: "しっぽ",icon:"tail"}},
  "square": {link: {hint:"結合", icon:"unite"}, angleVector: {hint: "しっぽ",icon:"tail"}},
  "ellipse": {link: {hint:"結合", icon:"unite"}, angleVector: {hint: "しっぽ",icon:"tail"}},
  "concentration": {},
  "polygon": {link: {hint:"結合", icon:"unite"}, angleVector: {hint: "しっぽ",icon:"tail"}},
  "strokes": {},
  "double-strokes": {},
  "harsh": {link: {hint:"結合", icon:"unite"}, angleVector: {hint: "しっぽ",icon:"tail"}},
  "harsh-curve": {link: {hint:"結合", icon:"unite"}, angleVector: {hint: "しっぽ",icon:"tail"}},
  "soft": {"angleVector": {hint: "しっぽ",icon:"tail"}},
  "heart" : {},
  "diamond": {},
  "none": {},
};

export function drawBubble(context, seed, rect, shape, opts) {
  switch (shape) {
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
    case "heart":
      drawHeartBubble(context, seed, rect, opts);
      break;
    case "diamond":
      drawDiamondBubble(context, seed, rect, opts);
      break;
    case "none":
      break;
    default:
      throw new Error(
        `Unknown bubble : ${shape}`
      );
  }
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

function drawHeartBubble(context, seed, rect, opts) {
  const [x0, y0, w, h] = rect
  const [x, y] = [x0 + w*0.5, y0 + h*0.5];

  const h1 = h * -0.58;
  const h2 = h * -0.35;
  const h3 = h * -0.1;
  const h4 = h * 0.1;
  const h5 = h * 0.35;
  const h6 = h * 0.5;

  context.beginPath();
  context.moveTo(x, y + h2);
  context.bezierCurveTo(x - 0.1 * w, y + h1, x - 0.5 * w, y + h1, x - 0.5 * w, y + h3);
  context.bezierCurveTo(x - 0.5 * w, y + h4, x - 0.3 * w, y + h5, x, y + h6);
  context.bezierCurveTo(x + 0.3 * w, y + h5, x + 0.5 * w, y + h4, x + 0.5 * w, y + h3);
  context.bezierCurveTo(x + 0.5 * w, y + h1, x + 0.1 * w, y + h1, x, y + h2);
  finishTrivialPath(context);
}

function drawDiamondBubble(context, seed, rect, opts) {
  const [x0, y0, w, h] = rect
  const [x, y] = [x0 + w*0.5, y0 + h*0.5];

  context.beginPath();
  context.moveTo(x, y0);
  context.lineTo(x0, y);
  context.lineTo(x, y0 + h);
  context.lineTo(x0 + w, y);
  context.closePath();
  finishTrivialPath(context);
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

// https://github.com/paperjs/paper.js/issues/1889
paper.setup(new paper.Size(1, 1)); // creates a virtual canvas
paper.view.autoUpdate = false; // disables drawing any shape automatically

export function getPath(shape, r, opts, seed) {
  switch (shape) {
    case 'square':
      return getSquarePath(r, opts, seed);
    case 'ellipse':
      return getEllipsePath(r, opts, seed);
    case 'polygon':
      return getPolygonPath(r, opts, seed);
    case 'rounded':
      return getRoundedPath(r, opts, seed);
    case 'harsh':
      return getHarshPath(r, opts, seed);
    case 'harsh-curve':
      return getHarshCurvePath(r, opts, seed);
  }
  return null;
}

export function drawPath(context, unified) {
  const path = new Path2D(unified.pathData);
  switch(context.bubbleDrawMethod) {
    case 'fill':
      context.fill(path);
      break;
    case 'stroke':
      context.stroke(path);
      break;
    case 'clip':
      context.clip(path);
      break;
  }
}

function getEllipsePath([x, y, w, h], opts, seed) {
  const [w2, h2] = [w / 2, h / 2];
  const [cx, cy] = [x + w2, y + h2];

  const path = new paper.Path.Ellipse({center: [cx, cy], radius: [w2, h2]});

  if (opts?.angleVector) {
    const v = opts.angleVector;
    if (v[0] === 0 && v[1] === 0) {
      // do nothing
    } else {
      const theta = vectorToEllipseAngle(w2, h2, v[0], v[1]);
      const theta0 = theta - Math.PI / 24;
      const theta1 = theta + Math.PI / 24;
      const p0 = [cx + w2 * Math.cos(theta0), cy + h2 * Math.sin(theta0)];
      const p1 = [cx + w2 * Math.cos(theta1), cy + h2 * Math.sin(theta1)];
      const tail = new paper.Path();
      tail.addSegments([p0, p1, [cx + v[0], cy + v[1]]]);

      tail.closed = true;
      return path.unite(tail);
    }
  }

  return path;
}

function perpendicular([x, y]) {
  return [-y, x];
}

function normalize([x, y], n=1) {
  const l = Math.hypot(x, y);
  return [n * x / l, n * y / l];
}

function append([x, y], [dx, dy]) {
  return [x + dx, y + dy];
}

function getSquarePath(r, opts, seed) {
  const path = new paper.Path.Rectangle(...r);
  return addTrivialTail(path, r, opts);
}

function getRoundedPath(r, opts, seed) {
  const [x, y, w, h] = r;
  const [w2, h2] = [w / 2, h / 2];
  const [x1, y1] = [x + w2, y + h2];
  const [x2, y2] = [x + w - w2, y + h - h2];

  const path = new paper.Path();
  path.moveTo(x1, y);
  path.lineTo(x2, y);
  path.quadraticCurveTo(x + w, y, x + w, y1);
  path.lineTo(x + w, y2);
  path.quadraticCurveTo(x + w, y + h, x2, y + h);
  path.lineTo(x1, y + h);
  path.quadraticCurveTo(x, y + h, x, y2);
  path.lineTo(x, y1);
  path.quadraticCurveTo(x, y, x1, y);
  path.closed = true;

  return addTrivialTail(path, r, opts);
}

function getHarshPath(r, opts, seed) {
  const bump = Math.min(r[2], r[3]) / 10;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, r, 10);
  const points = subdividedPointsWithBump(rawPoints, bump, -1, 0);
  if (opts?.angleVector) {
    const [cx, cy] = [r[0] + r[2] / 2, r[1] + r[3] / 2];
    const v = [cx + opts.angleVector[0], cy + opts.angleVector[1]];
    const tailIndex = getNearestIndex(points, v);
    points[tailIndex] = v;
  }

  const path = new paper.Path();
  path.addSegments(points);
  path.closed = true;

  return path;
}

function getHarshCurvePath(r, opts, seed) {
  let bump = Math.min(r[2], r[3]) / 10;
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, r, 12);
  let points;
  if (opts?.angleVector) {
    const [cx, cy] = [r[0] + r[2] / 2, r[1] + r[3] / 2];
    const v = [cx + opts.angleVector[0], cy + opts.angleVector[1]];
    const tailIndex = getNearestIndex(rawPoints, v);
    rawPoints[tailIndex] = v;
    points = subdividedPointsWithBump(rawPoints, bump, tailIndex, bump*2);
  } else {
    points = subdividedPointsWithBump(rawPoints, bump);
  }

  const path = new paper.Path();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length; i += 2) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[(i + 2) % points.length];
    path.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
  }
  path.closed = true;

  return path;
}

function addTrivialTail(path, r, opts) {
  if (opts?.angleVector) {
    const v = opts.angleVector;
    if (v[0] === 0 && v[1] === 0) {
      // do nothing
    } else {
      const c = [r[0] + r[2] / 2, r[1] + r[3] / 2];
      return path.unite(makeTrivialTailPath(c, v));
    }
  }

  return path;
}

function makeTrivialTailPath(c, v) {
  const l = Math.hypot(v[0], v[1]);
  const v0 = normalize(perpendicular(v), l * 0.2);
  const v1 = normalize(perpendicular(v).map(x => -x), l * 0.2);
  const tail = new paper.Path();
  tail.addSegments([append(c, v0), append(c, v1), append(c, v)]);
  tail.closed = true;
  return tail;
}

function getPolygonPath(r, opts, seed) {
  const rng = seedrandom(seed);
  const rawPoints = generateRandomPoints(rng, r, 10);
  const cookedPoints = QuickHull(rawPoints.map((p) => ({ x: p[0], y: p[1] })));
  const points = cookedPoints.map((p) => [p.x, p.y]);

  const path = new paper.Path();
  path.addSegments(points);
  path.closed = true;

  return addTrivialTail(path, r, opts);
}

function drawEllipseBubble(context, seed, rect, opts) {
  const path = getEllipsePath(rect, opts, seed);
  drawPath(context, path);
}

function drawSquareBubble(context, seed, rect, opts) {
  const path = getSquarePath(rect, opts, seed);
  drawPath(context, path);
}

function drawPolygonBubble(context, seed, rect, opts) {
  const path = getPolygonPath(rect, opts, seed);
  drawPath(context, path);
}

function drawRoundedBubble(context, seed, rect, opts) {
  const path = getRoundedPath(rect, opts, seed);
  drawPath(context, path);
}

function drawHarshBubble(context, seed, rect, opts) {
  const path = getHarshPath(rect, opts, seed);
  drawPath(context, path);
}

function drawHarshCurveBubble(context, seed, rect, opts) {
  const path = getHarshCurvePath(rect, opts, seed);
  drawPath(context, path);
}

