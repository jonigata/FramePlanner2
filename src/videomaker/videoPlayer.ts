import type { DisplayProgramEntry } from './renderBook';

export type PlayerEntry = {
  time: number,
  entry: DisplayProgramEntry,
}

export function createTimeTable(program: DisplayProgramEntry[], moveDuration: number, standardWait: number): { timeTable: PlayerEntry[], totalTime: number } {
  const timeTable: PlayerEntry[] = [];
  let time = 0;
  for (const entry of program) {
    timeTable.push({ time, entry });
    time += standardWait + entry.residenceTime;
    time += moveDuration;
  }
  return { timeTable, totalTime: time };
}

function findEntry(timeTable: PlayerEntry[], time: number): number {
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

export function renderAtTime(render: (index: number, normalizedTime: number) => void, timeTable: PlayerEntry[], cursor: number, moveDuration: number, standardWait: number): void {
  const index = findEntry(timeTable, cursor);
  const te = timeTable[index];
  const moveStart = te.time + standardWait + te.entry.residenceTime;
  if (cursor < moveStart) {
    // 静止中
    render(index, 0);
  } else {
    // 移動中
    render(index, easeOut((cursor - moveStart) / moveDuration));
  }
}
