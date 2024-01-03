import seedrandom from "seedrandom";
import { QuickHull } from "../geometry/quickHull"
import * as paper from 'paper';
import { debumpPointsAroundIndex, tailCoordToWorldCoord, jitterDistances } from "../geometry/bubbleGeometry";
import { color2string, generateRandomAngles, generateSuperEllipsePoints, subdividePointsWithBump, findNearestIndex, findNearestAngleIndex } from "../geometry/bubbleGeometry";
import { clamp, magnitude2D, perpendicular2D, normalize2D, rotate2D, projectionScalingFactor2D } from "../geometry/geometry";
import { PaperOffset } from 'paperjs-offset'
import type { Vector } from "../geometry/geometry";

export function drawBubble(context, seed, size, shape, opts) {
  seed = opts.randomSeed ?? 0;

  switch (shape) {
    case "rounded":
      drawRoundedBubble(context, seed, size, opts);
      break;
    case "square":
      drawSquareBubble(context, seed, size, opts);
      break;
    case "ellipse":
      drawEllipseBubble(context, seed, size, opts);
      break;
    case "concentration":
      drawConcentrationBubble(context, seed, size, opts);
      break;
    case "polygon":
      drawPolygonBubble(context, seed, size, opts);
      break;
    case "strokes":
      drawStrokesBubble(context, seed, size, opts);
      break;
    case "double-strokes":
      drawDoubleStrokesBubble(context, seed, size, opts);
      break;
    case "harsh":
      drawHarshBubble(context, seed, size, opts);
      break;
    case "shout":
      drawShoutBubble(context, seed, size, opts);
      break;
    case "soft":
      drawSoftBubble(context, seed, size, opts);
      break;
    case "heart":
      drawHeartBubble(context, seed, size, opts);
      break;
    case "diamond":
      drawDiamondBubble(context, seed, size, opts);
      break;
    case "arrow":
      drawArrowBubble(context, seed, size, opts);
      break;
    case "motion-lines":
      drawMotionLinesBubble(context, seed, size, opts);
      break;
    case "speed-lines":
      drawSpeedLinesBubble(context, seed, size, opts);
      break;
    case "ellipse-mind":
    drawEllipseMindBubble(context, seed, size, opts);
      break;
    case "soft-mind":
      drawSoftMindBubble(context, seed, size, opts);
      break;
    case "rounded-mind":
      drawRoundedMindBubble(context, seed, size, opts);
      break;
    case "none":
      break;
    default:
      throw new Error(
        `Unknown bubble : ${shape}`
      );
  }
}

function drawConcentrationBubble(context, seed, size, opts) {
  const [w, h] = size;

  if (context.bubbleDrawMethod === "fill") {
    context.save();
    context.translate(0, 0);
    context.scale(w / 2, h / 2);

    context.lineWidth = 1 / Math.min(w, h);
    // draw n radial line
    const n = opts.lineCount;
    context.save();
    const gradient = context.createRadialGradient(0, 0, 1, 0, 0, opts.lineLength);
    const color = context.strokeStyle;
    const color0 = new paper.Color(color); // わざとstrokeStyleを使う
    const color1 = new paper.Color(color);
    color0.alpha = 0;
    gradient.addColorStop(0.0, color2string(color1));
    gradient.addColorStop(1.0, color2string(color0));
    context.strokeStyle = gradient;
    context.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (i * 2 * Math.PI) / n;
      const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
      const [lx, ly] = [dx * opts.lineLength, dy * opts.lineLength];
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
    context.ellipse(0, 0, w*0.5, h*0.5, 0, 0, 2 * Math.PI);
    context.clip();
  } else {  // stroke
    // do nothing;
  }
}

function drawStrokesBubble(context, seed, size, opts) {
    drawStrokesBubbleAux(context, seed, size, opts, false);
}

function drawDoubleStrokesBubble(context, seed, size, opts) {
    drawStrokesBubbleAux(context, seed, size, opts, true);
}

function drawStrokesBubbleAux(context, seed, size, opts, double) {
  const rng = seedrandom(seed);
  const rawPoints = generateSuperEllipsePoints(size, generateRandomAngles(rng, opts.vertexCount, opts.angleJitter), opts.superEllipse);
  const points = QuickHull(rawPoints);

  if (context.bubbleDrawMethod == "fill" || context.bubbleDrawMethod == "clip") {
    const path = new paper.Path();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) {
        path.moveTo(p as Vector);
      } else {
        path.lineTo(p as Vector);
      }
    }
    path.closed = true;

    if (context.bubbleDrawMethod === "fill") {
      const expanded = PaperOffset.offset(path, context.shapeExpand);
      const path2d = new Path2D(expanded.pathData);
      context.fill(path2d);
    } else { // clip
      const path2d = new Path2D(path.pathData);
      context.clip(path2d);
    }
  } else {
    const color = context.strokeStyle;
    for (let i = 0; i < points.length; i++) {
      context.beginPath();
      const p0 = points[i];
      const p1 = points[(i + 1) % points.length];

      const [q0, q1] = extendLineSegment(p0, p1, opts.overRun);

      const gradient = context.createLinearGradient(...q0, ...q1);
      const color0 = new paper.Color(color); // わざとstrokeStyleを使う
      const color1 = new paper.Color(color);
      color0.alpha = 0;
      gradient.addColorStop(0, color2string(color0));
      gradient.addColorStop(0.15, color2string(color1));
      gradient.addColorStop(0.85, color2string(color1));
      gradient.addColorStop(1, color2string(color0));
      context.strokeStyle = gradient;

      context.moveTo(q0[0], q0[1]);
      context.lineTo(q1[0], q1[1]);

      if (double) {
        const dist = Math.min(size[0], size[1]) * opts.interval;

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
      context.stroke();
    }
  }
}

function drawMotionLinesBubble(context, seed, size, opts) {
  const [x, y, w, h] = sizeToRect(size);

  if (context.bubbleDrawMethod === "fill") {
    const rng = seedrandom(seed);

    context.save();

    context.beginPath();
    context.rect(x, y, w, h);
    context.clip();

    context.lineWidth = 1;
    // draw n parallel line
    const n = opts.lineCount;
    const icd = opts?.focalPoint ?? [0, 0];
    const rangeVector = opts?.focalRange ?? [0, Math.hypot(w/2, h/2) * 0.25];
    const range = Math.hypot(rangeVector[0], rangeVector[1]);
    const [ox, oy, od] = [0, 0, Math.hypot(w/2, h/2)]; // 外円
    const [ix, iy, id] = [icd[0], icd[1], range]; // 内円

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
      const angle = (i * 2 * Math.PI) / n + (rng() - 0.5) * opts.angleJitter;
      const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
      const sdr = id * (1 + rng() * opts.startJitter);
      //const sdr = id + rng() * 40;
      const p0 = [ix, iy];
      const p1 = [ox + dx * od, oy + dy * od];
      const v: Vector = [p1[0] - p0[0], p1[1] - p0[1]];
      const length = Math.hypot(...v);
      const p2 = [p0[0] + v[0] * sdr / length, p0[1] + v[1] * sdr / length];
      const lw = opts.lineWidth * 0.1;
      const [q0, q1] = [perpendicular2D(v, lw), perpendicular2D(v, -lw)];
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

function drawSpeedLinesBubble(context, seed, size, opts) {
  const [x, y, w, h] = sizeToRect(size);

  if (context.bubbleDrawMethod === "fill") {
    const rng = seedrandom(seed);

    context.save();

    context.beginPath();
    context.rect(x, y, w, h);
    context.clip();

    const tailTip = opts?.tailTip ?? [0, 0];
    const tailMid = tailCoordToWorldCoord([0,0], tailTip, opts?.tailMid ?? [0, 0]);
  
    const length = Math.hypot(w, h);
    const angle = Math.atan2(tailTip[1], tailTip[0]);
    context.rotate(angle);

    function calculateNormalizedPosition([fx,fy]) {
      const v0: Vector = [length*0.5, 0];
      const [nx, ny] = rotate2D(v0, angle);
      const psf = 0.5 - projectionScalingFactor2D([fx, fy], [nx, ny]) * 0.5;
      return clamp(psf);
    }

    context.lineWidth = 1;
    const n = opts.lineCount;

    const psf0 = clamp(0.5 - magnitude2D(tailTip) / length);
    const psf1 = calculateNormalizedPosition(tailMid);

    // 線を描く
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) / n * length - length/2 + rng() * length * opts.laneJitter;
      const lx = - length * 0.5 + (rng() - 0.5) * w * opts.startJitter;
      const lw = h * opts.lineWidth * 0.01 * (rng() + 0.5);

      // グラデーション
      const gradient = context.createLinearGradient(lx+length, y, lx, y);
      const color0 = new paper.Color(context.strokeStyle); // わざとstrokeStyleを使う
      const color1 = new paper.Color(context.strokeStyle);
      color0.alpha = 0;
      gradient.addColorStop(psf0, color2string(color0));
      gradient.addColorStop(psf1, color2string(color1));
      gradient.addColorStop(1.0, color2string(color1));
      context.fillStyle = gradient;

      context.beginPath();
      context.moveTo(lx, y-lw);
      context.lineTo(lx+length, y);
      context.lineTo(lx, y+lw);
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
paper.setup([1,1]); // creates a virtual canvas
paper.view.autoUpdate = false; // disables drawing any shape automatically

export function getPath(shape, size, opts, seed): paper.Path {
  seed = opts.randomSeed ?? 0;

  const startTime = performance.now();
  try {
    switch (shape) {
      case 'square':
        return getSquarePath(size, opts, seed);
      case 'ellipse':
        return getEllipsePath(size, opts, seed);
      case 'polygon':
        return getPolygonPath(size, opts, seed);
      case 'rounded':
        return getRoundedPath(size, opts, seed);
      case 'harsh':
        return getHarshPath(size, opts, seed);
      case 'shout':
        return getShoutPath(size, opts, seed);
      case 'soft':
        return getSoftPath(size, opts, seed);
      case 'heart':
        return getHeartPath(size, opts, seed);
      case 'diamond':
        return getDiamondPath(size, opts, seed);
      case 'arrow':
        return getArrowPath(size, opts, seed);
      case 'ellipse-mind':
        return getEllipseMindPath(size, opts, seed);
      case 'soft-mind':
        return getSoftMindPath(size, opts, seed);
      case 'rounded-mind':
        return getRoundedMindPath(size, opts, seed);
    }

    return null;
  }
  finally {
    // console.log(`getPath(${shape}, ${r}, ${opts}) took ${performance.now() - startTime} ms`);
  }
}

export function drawPath(context, unified, opts) {
  context.beginPath();
  switch(context.bubbleDrawMethod) {
    case 'fill':
      if (opts?.shapeExpand && 0 < opts?.shapeExpand) {
        let expansion = Math.min(unified.bounds.width, unified.bounds.height) * opts.shapeExpand;
        let path = PaperOffset.offset(unified, expansion);
        context.fill(new Path2D(path.pathData));
      } else {
        context.fill(new Path2D(unified.pathData));
      }
      break;
    case 'stroke':
      context.stroke(new Path2D(unified.pathData));
      break;
    case 'clip':
      context.clip(new Path2D(unified.pathData));
      break;
  }
}

function sizeToRect(size): [number, number, number, number] {
  return [-size[0]*0.5, -size[1]*0.5, size[0], size[1]];
}

function halfSize(size) {
  return [size[0] * 0.5, size[1] * 0.5];
}

function getSquarePath(size, opts, seed) {
  const path = new paper.Path.Rectangle(sizeToRect(size));
  return addTrivialTail(path, size, opts);
}

function getEllipsePath(size, opts, seed) {
  const path = new paper.Path.Ellipse({center: [0, 0], radius: halfSize(size)});
  return addTrivialTail(path, size, opts);
}

function getRoundedPath(size, opts, seed) {
  const [x0, y0, w, h] = sizeToRect(size);
  const [x1, y1] = [0, 0];
  const [x2, y2] = [x0 + w, y0 + h];
  const [sx, sy] = [opts.xStraight * w * 0.5, opts.yStraight * h * 0.5];

  const path = new paper.Path();
  path.moveTo([x1 + sx, y0]);
  path.lineTo([x1 - sx, y0]);
  path.quadraticCurveTo([x0, y0], [x0, y1-sy]);
  path.lineTo([x0, y1+sy]);
  path.quadraticCurveTo([x0, y2], [x1-sx, y2]);
  path.lineTo([x1+sx, y2]);
  path.quadraticCurveTo([x2, y2], [x2, y1+sy]);
  path.lineTo([x2, y1-sy]);
  path.quadraticCurveTo([x2, y0], [x1+sx, y0]);
  path.closed = true;

  return addTrivialTail(path, size, opts);
}

function getHarshPath(size, opts, seed) {
  const rng = seedrandom(seed);

  let points;
  if (opts?.tailTip && opts.tailTip[0] !== 0 && opts.tailTip[1] !== 0) {
    const angles = generateRandomAngles(rng, opts.bumpCount, opts.angleJitter);
    const focusAngle = Math.atan2(opts.tailTip[1], opts.tailTip[0]);
    const rawPoints = generateSuperEllipsePoints(size, angles, opts.superEllipse);
    points = subdividePointsWithBump(size, rawPoints, opts.bumpDepth);
    const v: Vector = [opts.tailTip[0], opts.tailTip[1]];
    const tailIndex = findNearestIndex(points, v);
    points[tailIndex] = v;
  } else {

    let angles = generateRandomAngles(rng, opts.bumpCount, opts.angleJitter);
    const rawPoints = generateSuperEllipsePoints(size, angles, opts.superEllipse);
    points = subdividePointsWithBump(size, rawPoints, opts.bumpDepth);
  }

  const path = new paper.Path();
  path.addSegments(points);
  path.closed = true;

  return path;
}

function getShoutPath(size, opts, seed) {
  const bump = opts.bumpSharp;
  const rng = seedrandom(seed);
  let points;
  if (opts?.tailTip && opts.tailTip[0] !== 0 && opts.tailTip[1] !== 0) {
    const angles = generateRandomAngles(rng, opts.bumpCount, opts.angleJitter);
    const focusAngle = Math.atan2(opts.tailTip[1], opts.tailTip[0]);
    const tailIndex = findNearestAngleIndex(angles, focusAngle);
    points = generateSuperEllipsePoints(size, angles, opts.superEllipse);
    points = subdividePointsWithBump(size, points, bump);
    points = jitterDistances(rng, points, bump, opts.depthJitter);
    points = debumpPointsAroundIndex(points, 0.5 - opts.bumpSharp, tailIndex * 2);
    points[tailIndex * 2] = opts.tailTip;
  } else {
    const angles = generateRandomAngles(rng, opts.bumpCount, opts.angleJitter);
    points = generateSuperEllipsePoints(size, angles, opts.superEllipse);
    points = subdividePointsWithBump(size, points, bump);
    points = jitterDistances(rng, points, bump, opts.depthJitter);
  }

  const path = new paper.Path();
  path.moveTo(points[0]);
  for (let i = 0; i < points.length; i += 2) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[(i + 2) % points.length];
    path.quadraticCurveTo(p1, p2);
  }
  path.closed = true;

  return path;
}

function getSoftPath(size, opts, seed) {
  const rng = seedrandom(seed);
  const rawPoints = generateSuperEllipsePoints(size, generateRandomAngles(rng, opts.bumpCount, opts.angleJitter), opts.superEllipse);
  const points = subdividePointsWithBump(size, rawPoints, -opts.bumpDepth);

  const path = new paper.Path();
  path.moveTo(points[0]);
  for (let i = 0; i < points.length; i += 2) {
    const p1 = points[i + 1];
    const p2 = points[(i + 2) % points.length];
    path.quadraticCurveTo(p1, p2);
  }
  path.closed = true;

  return addTrivialTail(path, size, opts);
}

function getHeartPath(size, opts, seed) {
  const [w, h] = size;
  const [x, y] = [0, 0];

  const h1 = h * -0.58;
  const h2 = h * -0.35;
  const h3 = h * -0.1;
  const h4 = h * 0.1;
  const h5 = h * 0.35;
  const h6 = h * 0.5;

  const path = new paper.Path();

  path.moveTo([x, y + h2]);
  path.cubicCurveTo([- 0.1 * w, h1], [- 0.5 * w, h1], [- 0.5 * w, h3]);
  path.cubicCurveTo([- 0.5 * w, h4], [- 0.3 * w, h5], [  0,       h6]);
  path.cubicCurveTo([  0.3 * w, h5], [  0.5 * w, h4], [  0.5 * w, h3]);
  path.cubicCurveTo([  0.5 * w, h1], [  0.1 * w, h1], [  0,       h2]);
  path.closed = true;
  
  return path;
}

function getDiamondPath(size, opts, seed) {
  const [x0, y0, w, h] = sizeToRect(size);

  const path = new paper.Path();

  path.moveTo([0, y0]);
  path.lineTo([x0, 0]);
  path.lineTo([0, y0 + h]);
  path.lineTo([x0 + w, 0]);
  path.closed = true;

  return path;
}

function getArrowPath(size, opts, seed) {
  const [x0, y0, w, h] = sizeToRect(size);

  const { shaftWidth, headLength } = opts;
  const actualHalfShaftWidth = shaftWidth * w * 0.5;

  const path = new paper.Path();
  const y1 = y0 + h * headLength;
  const x1 = x0 + w * 0.5 - actualHalfShaftWidth;
  const x2 = x0 + w * 0.5 + actualHalfShaftWidth;

  path.moveTo([0, y0]);
  path.lineTo([x0, y1]);
  path.lineTo([x1, y1]);
  path.lineTo([x1, y0+h]);
  path.lineTo([x2, y0+h]);
  path.lineTo([x2, y1]);
  path.lineTo([x0+w, y1]);
  path.lineTo([0, y0]);
  path.closed = true;

  return path;
  
}

function getEllipseMindPath(size, opts, seed) {
  const newOpts = {...opts};
  newOpts.tailTip = [0,0];
  newOpts.tailMid = [0.5,0];
  const path = getEllipsePath(size, newOpts, seed);
  const path2 = addMind(path, seed, size, opts, newOpts);
  return path2;
}

function getSoftMindPath(size, opts, seed) {
  const newOpts = {...opts};
  newOpts.tailTip = [0,0];
  newOpts.tailMid = [0.5,0];
  const path = getSoftPath(size, newOpts, seed);
  const path2 = addMind(path, seed, size, opts, newOpts);
  return path2;
}

function getRoundedMindPath(size, opts, seed) {
  const newOpts = {...opts};
  newOpts.tailTip = [0,0];
  newOpts.tailMid = [0.5,0];
  const path = getRoundedPath(size, newOpts, seed);
  const path2 = addMind(path, seed, size, opts, newOpts);
  return path2;
}

function getCloudPath(size, opts, seed, vertexCount, superEllipseN, bumpFactor) {
  const rng = seedrandom(seed);
  const rawPoints = generateSuperEllipsePoints(size, generateRandomAngles(rng, vertexCount), superEllipseN);
  const points = subdividePointsWithBump(size, rawPoints, -bumpFactor);

  const path = new paper.Path();
  path.moveTo(points[0]);
  for (let i = 0; i < points.length; i += 2) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[(i + 2) % points.length];
    path.quadraticCurveTo(p1, p2);
  }
  path.closed = true;

  //return path;
  return addTrivialTail(path, size, opts);
}

function addTrivialTail(path, size, opts) {
  if (opts?.tailTip) {
    const v = opts.tailTip;
    const m = opts.tailMid;
    if (v[0] === 0 && v[1] === 0) {
      // do nothing
    } else {
      if (!opts?.extract) {
        return path.unite(makeTrivialTailPath(size, m, v));
      } else {
        return path.subtract(makeExtractTailPath(size, m, v, opts.extractWidth));
      }
    }
  }

  return path;
}

function makeTrivialTailPath(size, m, v) {
  const a = size[0] * size[1];
  const l = Math.max(50000, Math.hypot(v[0], v[1]) ** 2);
  const vd1 = normalize2D(perpendicular2D(v), a * 35 / l);
  const vd2 = normalize2D(perpendicular2D(v, -1), a * 35 / l);
  const vt1: Vector = [v[0] - vd1[0], v[1] - vd1[1]];
  const vt2: Vector = [v[0] - vd2[0], v[1] - vd2[1]];
  const v0 = v;
  const v1 = vd1;
  const v2 = vd2;
  const m1 = tailCoordToWorldCoord(v1, vt1, m);
  const m2 = tailCoordToWorldCoord(v2, vt2, m);
  const tail = new paper.Path();
  tail.moveTo(v1);
  tail.curveTo(m1, v0);
  tail.curveTo(m2, v2);
  tail.closed = true;
  return tail;
}

function makeExtractTailPath(size, m, p, w) {
  const q = tailCoordToWorldCoord([0,0], p, m);
  const v: Vector = [p[0] - q[0], p[1] - q[1]];
  const l = Math.hypot(p[0], p[1]);
  const vd = normalize2D(perpendicular2D(v), l * w);
  const vt1: Vector = [p[0] + vd[0], p[1] + vd[1]];
  const vt2: Vector = [p[0] - vd[0], p[1] - vd[1]];
  const tail = new paper.Path();
  tail.moveTo(q);
  tail.lineTo(vt1);
  tail.lineTo(vt2);
  tail.closed = true;
  return tail;
}

function getPolygonPath(size, opts, seed) {
  const rng = seedrandom(seed);
  const angles = generateRandomAngles(rng, opts.vertexCount, opts.angleJitter);
  const rawPoints = generateSuperEllipsePoints(size, angles, opts.superEllipse);
  const points: any = QuickHull(rawPoints); // 型定義不足でコンパイルエラーが出るのでworkaround

  const path = new paper.Path();
  path.addSegments(points);
  path.closed = true;

  return addTrivialTail(path, size, opts);
}

function drawEllipseBubble(context, seed, size, opts) {
  const path = getEllipsePath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawSquareBubble(context, seed, size, opts) {
  const path = getSquarePath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawPolygonBubble(context, seed, size, opts) {
  const path = getPolygonPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawRoundedBubble(context, seed, size, opts) {
  const path = getRoundedPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawHarshBubble(context, seed, size, opts) {
  const path = getHarshPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawShoutBubble(context, seed, size, opts) {
  const path = getShoutPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawSoftBubble(context, seed, size, opts) {
  const path = getSoftPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawHeartBubble(context, seed, size, opts) {
  const path = getHeartPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawDiamondBubble(context, seed, size, opts) {
  const path = getDiamondPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawArrowBubble(context, seed, size, opts) {
  const path = getArrowPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawEllipseMindBubble(context, seed, size, opts) {
  const path = getEllipseMindPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawSoftMindBubble(context, seed, size, opts) {
  const path = getSoftMindPath(size, opts, seed);
  drawPath(context, path, opts);
}

function drawRoundedMindBubble(context, seed, size, opts) {
  const path = getRoundedMindPath(size, opts, seed);
  drawPath(context, path, opts);
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

function addMind(path, seed, size, opts, newOpts) {
  const trail = [[0.97, 0.04], [0.8, 0.05], [0.6, 0.08], [0.3, 0.12]];
  const m = tailCoordToWorldCoord([0,0], opts.tailTip, opts.tailMid);
  const s = opts.tailTip;
  const v = [s[0] - m[0], s[1] - m[1]];
  const r = Math.min(size[0], size[1]) * 0.5;
  for (let t of trail) {
    const p = [m[0] + t[0] * v[0], m[1] + t[0] * v[1]];
    const rt = r * t[1] * 2;
    const path2 = getCloudPath([rt,rt], newOpts, seed, 6, 2, 0.15);
    path2.translate(p);
    path = path.unite(path2);
  }
  return path;
}
