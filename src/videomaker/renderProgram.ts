import type { DisplayProgramEntry } from './buildProgram';
import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';

export type TimeTableEntry = {
  time: number,
  entry: DisplayProgramEntry,
}

export function buildTimeTable(program: DisplayProgramEntry[], moveDuration: number, standardWait: number): { timeTable: TimeTableEntry[], totalTime: number } {
  const timeTable: TimeTableEntry[] = [];
  let time = 0;
  for (const entry of program) {
    timeTable.push({ time, entry });
    time += standardWait + entry.residenceTime;
    time += moveDuration;
  }
  return { timeTable, totalTime: time };
}

function findEntry(timeTable: TimeTableEntry[], time: number): number {
  // 要するにlower_bound
  let low = 0;
  let high = timeTable.length - 1;

  while (low < high) {
    let mid = Math.floor((low + high + 1) / 2);
    if (timeTable[mid].time > time) {
      high = mid - 1;
    } else {
      low = mid;
    }
  }

  return low;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2);
}

export async function cue(timeTable: TimeTableEntry[]): Promise<void> {
  for (const tt of timeTable) {
    const filmStack = tt.entry.layout.element.filmStack;
    for (const film of filmStack.films) {
      await film.media.player?.seek(0);
    }
  }
}

export async function renderAtTime(layeredCanvas: LayeredCanvas, arrayLayer: ArrayLayer, timeTable: TimeTableEntry[], cursor: number, moveDuration: number, standardWait: number, standardScale: number): Promise<void> {
  async function render(index: number, seekTime: number, normalizedPositionTime: number): Promise<void> {
    const v = layeredCanvas.viewport;
    const e0 = timeTable[index].entry;
    const p = arrayLayer.array.childPositionToParentPosition(e0.pageNumber, e0.position);
    const currScale = e0.scale * standardScale;
    const currTranslate: Vector = [-p[0] * currScale, -p[1] * currScale];
    if (normalizedPositionTime == 0 || index == timeTable.length - 1) {
      v.translate = currTranslate;
      v.scale = currScale;
    } else {
      const e1 = timeTable[index + 1].entry;
      const p1 = arrayLayer.array.childPositionToParentPosition(e1.pageNumber, e1.position);
      const nextScale = e1.scale * standardScale;
      const nextTranslate = [-p1[0] * nextScale, -p1[1] * nextScale];
      const [dx, dy] = [nextTranslate[0] - currTranslate[0], nextTranslate[1] - currTranslate[1]];
      v.translate = [currTranslate[0] + dx * normalizedPositionTime, currTranslate[1] + dy * normalizedPositionTime];
      v.scale = currScale + (nextScale - currScale) * normalizedPositionTime;
    }
    v.dirty = true;

    async function seek(index: number, seekTime: number) {
      const tt = timeTable[index];
      const filmStack = tt.entry.layout.element.filmStack;
      for (const film of filmStack.films) {
        await film.media.player?.seek(seekTime);
      }
    }

    // bubblesの表示設定
    // まだなら非表示、すぎてたら表示
    for (let i = 0 ; i < timeTable.length; i++) {
      const tt = timeTable[i];
      const bubbles = tt.entry.bubbles;
      if (i < index) {
        for (const b of bubbles) {
          b.hidesText = false;
        }
      } else if (i == index) {
        for (const b of bubbles) {
          if (b.appearanceDelay == 0) {
            b.hidesText = false;
          } else {
            b.hidesText = seekTime < (b.appearanceDelay ?? 0);
          }
        }
      } else {
        for (const b of bubbles) {
          if (b.appearanceDelay == 0) {
            b.hidesText = false;
          } else {
            b.hidesText = true;
          }
        }
      }
    }

    // VideoMediaの時刻設定
    await seek(index, seekTime);
    if (index < timeTable.length - 1 && 0 < normalizedPositionTime) {
      await seek(index + 1, 0);
    }
  
    layeredCanvas.render();
  }

  const index = findEntry(timeTable, cursor);
  const te = timeTable[index];

  const moveStart = te.time + standardWait + te.entry.residenceTime;
  if (cursor < moveStart) {
    // 静止中
    await render(index, cursor - te.time, 0);
  } else {
    // 移動中
    await render(index, cursor - te.time, easeOut((cursor - moveStart) / moveDuration));
  }
}
