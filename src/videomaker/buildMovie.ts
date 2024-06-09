import { renderAtTime, createTimeTable } from './videoPlayer';
import { buildBookRenderer, type DisplayProgramEntry } from './renderBook';
import { createVideoWithImages, type Scene } from './renderMovie';
import type { Book } from '../bookeditor/book';

export async function buildMovie(program: DisplayProgramEntry[], width: number, height: number, moveDuration: number, standardWait: number, book: Book) {

  const {timeTable} = createTimeTable(program, moveDuration, standardWait);

  const scenes: Scene[] = [];

  function render(time: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const {arrayLayer, layeredCanvas} = buildBookRenderer(canvas, book);
    renderAtTime(
      layeredCanvas,
      arrayLayer,
      timeTable,
      time,
      moveDuration,
      standardWait);
    const scene = {
      key: time,
      canvas: layeredCanvas.viewport.canvas
    }
    scenes.push(scene);
  }

  let time = 0;
  for (const e of program) {
    // 停止絵
    render(time);
    time += standardWait + e.residenceTime;

    // 移動絵
    const start = time;
    while (time < start + moveDuration) {
      render(time);
      time += 1 / 30;
    }
    time = start + moveDuration;
  }

  const url = await createVideoWithImages(width, height, 30, time, scenes);
  console.log(url);
  return url;
}

