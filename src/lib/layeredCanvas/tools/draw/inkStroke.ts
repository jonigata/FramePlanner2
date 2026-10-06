import paper from 'paper';
import seedrandom from "seedrandom";

// フキダシの線をペン描き風に描画する
// 線を一定幅のstrokeではなく、太さが変化する塗り図形(円+台形の和集合)として描く
// - handDrawn: 筆圧の揺らぎ、位置のブレ、線の分割・継ぎ目のはみ出し、抜き
// - inkPool: 描き始め・止め・角でのインク溜まり

export type InkStrokeOptions = {
  handDrawn: number;
  inkPool: number;
  seed: number;
};

// paper.Pathの型定義ではlength等が解決されないため必要な部分だけ定義する
type SimplePath = {
  length: number;
  closed: boolean;
  getPointAt(offset: number): paper.Point | null;
  getTangentAt(offset: number): paper.Point | null;
};

type Sample = { x: number; y: number; tx: number; ty: number; corner: number };

const cache = new WeakMap<paper.PathItem, { key: string; path: Path2D }>();

export function drawInkStroke(ctx: CanvasRenderingContext2D, item: paper.PathItem, lineWidth: number, options: InkStrokeOptions) {
  if (lineWidth <= 0) { return; }
  const b = item.bounds;
  const key = `${lineWidth}:${options.handDrawn}:${options.inkPool}:${options.seed}:${b.x}:${b.y}:${b.width}:${b.height}`;
  let entry = cache.get(item);
  if (!entry || entry.key !== key) {
    entry = { key, path: buildInkPath(item, lineWidth, options) };
    cache.set(item, entry);
  }
  const fillStyle = ctx.fillStyle;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill(entry.path, 'nonzero');
  ctx.fillStyle = fillStyle;
}

function collectPaths(item: paper.PathItem): SimplePath[] {
  if (item instanceof paper.CompoundPath) {
    return (item.children as paper.PathItem[]).flatMap(c => collectPaths(c));
  }
  return [item as unknown as SimplePath];
}

function buildInkPath(item: paper.PathItem, lineWidth: number, options: InkStrokeOptions): Path2D {
  const rng = seedrandom(`ink:${options.seed}`);
  const path2d = new Path2D();
  for (const p of collectPaths(item)) {
    if (p.length <= 0) { continue; }
    buildPathStrokes(path2d, item, p, lineWidth, options, rng);
  }
  return path2d;
}

function buildPathStrokes(out: Path2D, whole: paper.PathItem, path: SimplePath, lineWidth: number, options: InkStrokeOptions, rng: () => number) {
  const { handDrawn, inkPool } = options;
  const L = path.length;
  const closed = path.closed;

  const n = Math.max(24, Math.min(2000, Math.ceil(L / (lineWidth * 0.35))));
  const step = L / n;
  const sampleCount = closed ? n : n + 1;
  const samples: Sample[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const s = Math.min(i * step, L);
    const pt = path.getPointAt(s);
    const t = path.getTangentAt(s);
    if (!pt || !t) { continue; }
    samples.push({ x: pt.x, y: pt.y, tx: t.x, ty: t.y, corner: 0 });
  }
  const count = samples.length;
  if (count < 2) { return; }
  const at = (i: number) => closed ? samples[((i % count) + count) % count] : samples[Math.max(0, Math.min(count - 1, i))];

  // 角らしさ: 前後の接線のなす角
  const window = Math.max(1, Math.round(lineWidth * 1.5 / step));
  for (let i = 0; i < count; i++) {
    const a = at(i - window);
    const c = at(i + window);
    const dot = Math.max(-1, Math.min(1, a.tx * c.tx + a.ty * c.ty));
    samples[i].corner = Math.min(1, Math.acos(dot) / (Math.PI * 0.5));
  }

  // 塗りの外側を向く法線の符号を決める
  const mid = samples[Math.floor(count / 2)];
  const probe = new paper.Point(mid.x + mid.ty * lineWidth, mid.y - mid.tx * lineWidth);
  const outwardSign = whole.contains(probe) ? -1 : 1;

  // ストローク分割
  const strokeCount = closed && 0 < handDrawn && lineWidth * 40 < L && rng() < 0.6 ? 2 : 1;
  const start = closed ? rng() * L : 0;
  const bounds: number[] = [start];
  for (let j = 1; j < strokeCount; j++) {
    bounds.push(start + L * (j + (rng() - 0.5) * 0.3) / strokeCount);
  }
  bounds.push(start + L);

  for (let j = 0; j < strokeCount; j++) {
    const overlapIn = closed ? handDrawn * lineWidth * (1 + rng() * 3) : 0;
    const overlapOut = closed ? handDrawn * lineWidth * (1 + rng() * 3) : 0;
    const i0 = Math.round((bounds[j] - overlapIn) / step);
    const i1 = Math.round((bounds[j + 1] + overlapOut) / step);
    const D = (i1 - i0) * step;
    if (D <= 0) { continue; }

    const pressure = makeNoise(rng);
    const wobble = makeNoise(rng);
    const endsWithPool = rng() < 0.5;
    const startPool = inkPool * (0.5 + rng() * 0.4);
    const endPool = endsWithPool ? inkPool * (0.3 + rng() * 0.4) : 0;
    const taperLen = endsWithPool ? 0 : Math.min(handDrawn, 1) * lineWidth * 8;
    const blobLen = lineWidth * 1.2;

    const pts: { x: number; y: number; r: number }[] = [];
    for (let i = i0; i <= i1; i++) {
      const sm = at(i);
      const d = (i - i0) * step;
      const e = D - d;

      // 筆圧は強くしても線が消えない程度に飽和させる
      let w = lineWidth * (1 + 0.3 * Math.tanh(handDrawn) * pressure(d / (lineWidth * 30)));
      const pool = inkPool * 0.5 * sm.corner * sm.corner
        + startPool * Math.exp(-((d / blobLen) ** 2))
        + endPool * Math.exp(-((e / blobLen) ** 2));
      w *= 1 + Math.min(pool, 1.2);
      if (0 < taperLen && e < taperLen) {
        w *= 0.2 + 0.8 * smoothstep(e / taperLen);
      }

      // 位置のブレと、継ぎ目付近で外側へ逃げる動き
      let offset = handDrawn * lineWidth * 0.3 * wobble(d / (lineWidth * 40));
      if (0 < overlapIn && d < overlapIn) {
        offset += handDrawn * lineWidth * 0.6 * (1 - d / overlapIn) ** 2;
      }
      if (0 < overlapOut && e < overlapOut) {
        offset += handDrawn * lineWidth * 0.6 * (1 - e / overlapOut) ** 2;
      }
      const nx = sm.ty * outwardSign;
      const ny = -sm.tx * outwardSign;
      pts.push({ x: sm.x + nx * offset, y: sm.y + ny * offset, r: w * 0.5 });
    }
    addVariableWidthPolyline(out, pts);
  }
}

// 各点の円と、隣接点間の台形を全て正の向きで追加する(nonzeroで和集合になる)
function addVariableWidthPolyline(out: Path2D, pts: { x: number; y: number; r: number }[]) {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    out.moveTo(p.x + p.r, p.y);
    out.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
    if (i == 0) { continue; }
    const q = pts[i - 1];
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) { continue; }
    const nx = -dy / len;
    const ny = dx / len;
    // q+n*rq -> p+n*rp -> p-n*rp -> q-n*rq は y-down座標で正の向き
    const quad: [number, number][] = [
      [q.x + nx * q.r, q.y + ny * q.r],
      [p.x + nx * p.r, p.y + ny * p.r],
      [p.x - nx * p.r, p.y - ny * p.r],
      [q.x - nx * q.r, q.y - ny * q.r],
    ];
    if (signedArea(quad) < 0) { quad.reverse(); }
    out.moveTo(quad[0][0], quad[0][1]);
    for (let k = 1; k < 4; k++) { out.lineTo(quad[k][0], quad[k][1]); }
    out.closePath();
  }
}

function signedArea(poly: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    a += x0 * y1 - x1 * y0;
  }
  return a;
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

// 1次元バリューノイズ [-1, 1]
function makeNoise(rng: () => number): (x: number) => number {
  const size = 64;
  const table: number[] = [];
  for (let i = 0; i < size; i++) { table.push(rng() * 2 - 1); }
  const offset = rng() * size;
  return (x: number) => {
    const v = x + offset;
    const i = Math.floor(v);
    const f = v - i;
    const a = table[((i % size) + size) % size];
    const b = table[(((i + 1) % size) + size) % size];
    const t = (1 - Math.cos(f * Math.PI)) * 0.5;
    return a + (b - a) * t;
  };
}
