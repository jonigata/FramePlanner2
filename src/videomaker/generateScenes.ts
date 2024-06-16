import { renderAtTime, buildTimeTable } from './renderProgram';
import { buildBookRenderer, type DisplayProgramEntry } from './buildProgram';
import { createVideoWithImages, type Scene } from './generateMovieFile';
import type { Book } from '../bookeditor/book';
import { type FrameElement, VideoMedia } from '../lib/layeredCanvas/dataModels/frameTree';
import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';

export async function buildMovie(program: DisplayProgramEntry[], width: number, height: number, moveDuration: number, standardWait: number, book: Book) {

  const {timeTable} = buildTimeTable(program, moveDuration, standardWait);

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

  function getBubbleProgram(bubbles: Bubble[]): number[] {
    const program = [];
    for (const bubble of bubbles) {
      if (0 < bubble.appearanceDelay) {
        program.push(bubble.appearanceDelay);
      }
    }
    return program.sort();
  }

  let time = 0;
  for (const e of program) {
    const frameStart = time + 0.001;
    if (isVideo(e.layout.element)) {
      while (time < frameStart + standardWait + e.residenceTime) {
        await render(time);
        time += 1 / fps;
      }
    } else {
      await render(time);
      const bubbleProgram = getBubbleProgram(e.bubbles);
      if (0 < bubbleProgram.length) {
        for (const bubbleTime of bubbleProgram) {
          await render(time + bubbleTime + 0.001);
        }
      }
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

