import { renderAtTime, createTimeTable } from './videoPlayer';
import { buildBookRenderer, type DisplayProgramEntry } from './renderBook';
import { createVideoWithImages, type Scene } from './renderMovie';
import type { Book } from '../bookeditor/book';
import { type FrameElement, VideoMedia } from '../lib/layeredCanvas/dataModels/frameTree';

export async function buildMovie(program: DisplayProgramEntry[], width: number, height: number, moveDuration: number, standardWait: number, book: Book) {

  const {timeTable} = createTimeTable(program, moveDuration, standardWait);

  const scenes: Scene[] = [];

  async function render(time: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const {arrayLayer, layeredCanvas} = buildBookRenderer(canvas, book);
    await renderAtTime(
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

  const fps = 24; // LUMAに合わせた

  function isVideo(frameTree: FrameElement) {
    for (const film of frameTree.filmStack.films) {
      if (film.media instanceof VideoMedia) {
        return true;
      }
    }
    return false;
  }

  let time = 0;
  for (const e of program) {
    // 停止絵
    const frameStart = time;
    if (isVideo(e.layout.element)) {
      while (time < frameStart + standardWait + e.residenceTime) {
        await render(time);
        time += 1 / fps;
      }
    } else {
      render(time);
    }
    time = frameStart + standardWait + e.residenceTime;

    // 移動絵
    const moveStart = time;
    while (time < moveStart + moveDuration) {
      await render(time);
      time += 1 / fps;
    }
    time = moveStart + moveDuration;
  }

  const url = await createVideoWithImages(width, height, fps, time, scenes);
  console.log(url);
  return url;
}

