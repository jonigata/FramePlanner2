import seedrandom from "seedrandom";
import { QuickHull } from "./quickHull.js"
import * as paper from 'paper';
import { debumpPointsAroundIndex, tailCoordToWorldCoord, focusAnglesAroundIndex } from "./bubbleGeometry.js";
import { add2D, perpendicular2D, normalize2D, circularAngleToEllipseAngle } from "./geometry.js";
import { generateRandomAngles, generateSuperEllipsePoints, movePointsToRectCenter, subdividePointsWithBump, findNearestIndex, findNearestAngleIndex } from "./bubbleGeometry.js";

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
    case "motion-lines":
      drawMotionLinesBubble(context, seed, rect, opts);
      break;
    case "none":
      break;
    default:
      throw new Error(
        `Unknown bubble : ${shape}`
      );
  }
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
  const rawPoints = generateSuperEllipsePoints(rect, generateRandomAngles(rng, 10));
  const cookedPoints = QuickHull(rawPoints.map((p) => ({ x: p[0], y: p[1] })));
  const points = movePointsToRectCenter(cookedPoints.map((p) => [p.x, p.y]), rect);

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

function drawMotionLinesBubble(context, seed, rect, opts) {
  const [x, y, w, h] = rect;
  const [cx, cy] = [x + w / 2, y + h / 2];

  function color2string(c) {
    function f(x) { return Math.floor(x * 255); }
    return `rgba(${f(c.red)}, ${f(c.green)}, ${f(c.blue)}, ${c.alpha})`    
  }

  if (context.bubbleDrawMethod === "fill") {
    const rng = seedrandom(seed);

    context.save();

    context.beginPath();
    context.rect(x, y, w, h);
    context.clip();

    // context.lineWidth = 1 / Math.min(w, h);
    context.lineWidth = 1;
    // draw n radial line
    const n = 200;
    const icd = opts?.focalPoint ?? [0, 0];
    const rangeVector = opts?.focalRange ?? [0, Math.hypot(w/2, h/2) * 0.25];
    const range = Math.hypot(rangeVector[0], rangeVector[1]);
    const [ox, oy, od] = [cx, cy, Math.hypot(w/2, h/2)]; // 外円
    const [ix, iy, id] = [cx + icd[0], cy + icd[1], range]; // 内円

    // グラデーション
    const gradient = context.createRadialGradient(ix, iy, id, ox, oy, od);
    const color0 = new paper.Color(context.strokeStyle); // わざとstrokeStyleを使う
    const color1 = new paper.Color(context.strokeStyle);
    color0.alpha = 0;
    gradient.addColorStop(0.0, color2string(color0));
    gradient.addColorStop(0.2, color2string(color1));
    gradient.addColorStop(1.0, color2string(color1));
    context.fillStyle = gradient;

    // 線を描く
    for (let i = 0; i < n; i++) {
      const angle = (i * 2 * Math.PI) / n + (rng() - 0.5) * 0.05;
      const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
      const sdr = id + rng() * 40;
      const p0 = [ix, iy];
      const p1 = [ox + dx * od, oy + dy * od];
      const v = [p1[0] - p0[0], p1[1] - p0[1]];
      const length = Math.hypot(...v);
      const p2 = [p0[0] + v[0] * sdr / length, p0[1] + v[1] * sdr / length];
      const [q0, q1] = [perpendicular2D(v, 0.005), perpendicular2D(v, -0.005)];
      context.beginPath();
      context.moveTo(p2[0], p2[1]);
      context.lineTo(p1[0] + q0[0], p1[1] + q0[1]);
      context.lineTo(p1[0] + q1[0], p1[1] + q1[1]);
      context.closePath();
      context.fill();
    }

    context.restore();
  } else {  // stroke, clip
    // do nothing;
  }
}

function extendLineSegment(p0, p1, extensionFactor) {
    const [dx, dy] = [p1[0] - p0[0], p1[1] - p0[1]];
  
    const q0 = [p1[0] - dx * extensionFactor, p1[1] - dy * extensionFactor];
    const q1 = [p0[0] + dx * extensionFactor, p0[1] + dy * extensionFactor];
    return [q0, q1];
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
    case 'soft':
      return getSoftPath(r, opts, seed);
    case 'heart':
      return getHeartPath(r, opts, seed);
    case 'diamond':
      return getDiamondPath(r, opts, seed);
  }
  return null;
}

export function drawPath(context, unified) {
  context.beginPath();
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

  return addTrivialTail(path, [x, y, w, h], opts);
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

  let points;
  if (opts?.tailTip && opts.tailTip[0] !== 0 && opts.tailTip[1] !== 0) {
    let angles = generateRandomAngles(rng, 10);
    const focusAngle = Math.atan2(opts.tailTip[1], opts.tailTip[0]);
    angles = focusAnglesAroundIndex(angles, focusAngle, 0.7);
    const rawPoints = generateSuperEllipsePoints(r, angles);
    points = movePointsToRectCenter(subdividePointsWithBump(rawPoints, bump), r);
    const [cx, cy] = [r[0] + r[2] / 2, r[1] + r[3] / 2];
    const v = [cx + opts.tailTip[0], cy + opts.tailTip[1]];
    const tailIndex = findNearestIndex(points, v);
    points[tailIndex] = v;
  } else {
    let angles = generateRandomAngles(rng, 10);
    const rawPoints = generateSuperEllipsePoints(r, angles);
    points = movePointsToRectCenter(subdividePointsWithBump(rawPoints, bump), r);
  }

  const path = new paper.Path();
  path.addSegments(points);
  path.closed = true;

  return path;
}

function getHarshCurvePath(r, opts, seed) {
  let bump = Math.min(r[2], r[3]) / 10;
  const rng = seedrandom(seed);
  let points;
  if (opts?.tailTip && opts.tailTip[0] !== 0 && opts.tailTip[1] !== 0) {
    const rawAngles = generateRandomAngles(rng, 12, 0.2);
    const focusAngle = Math.atan2(opts.tailTip[1], opts.tailTip[0]);
    const angles = rawAngles.map(x => circularAngleToEllipseAngle(r[2]*0.5, r[3]*0.5, x));
    console.log("angle", rawAngles, angles);
    const tailIndex = findNearestAngleIndex(rawAngles, focusAngle);
    const rawPoints = generateSuperEllipsePoints(r, angles);
    points = debumpPointsAroundIndex(subdividePointsWithBump(rawPoints, bump), 1.7, tailIndex * 2);
    points[tailIndex * 2] = opts.tailTip;
  } else {
    const rawAngles = generateRandomAngles(rng, 12, 0.2);
    const rawPoints = generateSuperEllipsePoints(r, rawAngles);
    points = subdividePointsWithBump(rawPoints, bump);
  }

  points = movePointsToRectCenter(points, r)

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

function getSoftPath(r, opts, seed) {
  const bump = Math.min(r[2], r[3]) / 30;
  const rng = seedrandom(seed);
  const rawPoints = generateSuperEllipsePoints(r, generateRandomAngles(rng, 12));
  const points = movePointsToRectCenter(subdividePointsWithBump(rawPoints, -bump), r);

  const path = new paper.Path();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length; i += 2) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[(i + 2) % points.length];
    path.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
  }
  path.closed = true;

  //return path;
  return addTrivialTail(path, r, opts);
}

function getHeartPath(r, opts, seed) {
  const [x0, y0, w, h] = r
  const [x, y] = [x0 + w*0.5, y0 + h*0.5];

  const h1 = h * -0.58;
  const h2 = h * -0.35;
  const h3 = h * -0.1;
  const h4 = h * 0.1;
  const h5 = h * 0.35;
  const h6 = h * 0.5;

  const path = new paper.Path();

  path.moveTo(x, y + h2);
  path.cubicCurveTo(x - 0.1 * w, y + h1, x - 0.5 * w, y + h1, x - 0.5 * w, y + h3);
  path.cubicCurveTo(x - 0.5 * w, y + h4, x - 0.3 * w, y + h5, x, y + h6);
  path.cubicCurveTo(x + 0.3 * w, y + h5, x + 0.5 * w, y + h4, x + 0.5 * w, y + h3);
  path.cubicCurveTo(x + 0.5 * w, y + h1, x + 0.1 * w, y + h1, x, y + h2);
  path.closed = true;
  
  return path;
}

function getDiamondPath(r, opts, seed) {
  const [x0, y0, w, h] = r;
  const [x, y] = [x0 + w*0.5, y0 + h*0.5];

  const path = new paper.Path();

  path.moveTo(x, y0);
  path.lineTo(x0, y);
  path.lineTo(x, y0 + h);
  path.lineTo(x0 + w, y);
  path.closed = true;

  return path;
}

function addTrivialTail(path, r, opts) {
  if (opts?.tailTip) {
    const v = opts.tailTip;
    const m = opts.tailMid;
    if (v[0] === 0 && v[1] === 0) {
      // do nothing
    } else {
      return path.unite(makeTrivialTailPath(r, m, v));
    }
  }

  return path;
}

function makeTrivialTailPath(r, m, v) {
  const c = [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const a = r[2] * r[3];
  const l = Math.max(50000, Math.hypot(v[0], v[1]) ** 2);
  const vd1 = normalize2D(perpendicular2D(v), a * 35 / l);
  const vd2 = normalize2D(perpendicular2D(v, -1), a * 35 / l);
  const vt1 = [v[0] - vd1[0], v[1] - vd1[1]];
  const vt2 = [v[0] - vd2[0], v[1] - vd2[1]];
  const v0 = add2D(c, v);
  const v1 = add2D(c, vd1);
  const v2 = add2D(c, vd2);
  const m1 = tailCoordToWorldCoord(v1, vt1, m);
  const m2 = tailCoordToWorldCoord(v2, vt2, m);
  const tail = new paper.Path();
  tail.moveTo(v1);
  tail.curveTo(m1, v0);
  tail.curveTo(m2, v2);
  tail.closed = true;
  return tail;
}

function getPolygonPath(r, opts, seed) {
  const rng = seedrandom(seed);
  const angles = generateRandomAngles(rng, 10);
  const rawPoints = generateSuperEllipsePoints(r, angles);
  const cookedPoints = QuickHull(rawPoints.map((p) => ({ x: p[0], y: p[1] })));
  const points = movePointsToRectCenter(cookedPoints.map((p) => [p.x, p.y]), r);

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

function drawSoftBubble(context, seed, rect, opts) {
  const path = getSoftPath(rect, opts, seed);
  drawPath(context, path);
}

function drawHeartBubble(context, seed, rect, opts) {
  const path = getHeartPath(rect, opts, seed);
  drawPath(context, path);
}

function drawDiamondBubble(context, seed, rect, opts) {
  const path = getDiamondPath(rect, opts, seed);
  drawPath(context, path);
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

