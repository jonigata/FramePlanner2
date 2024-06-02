import { FrameElement, calculatePhysicalLayout, collectLeaves, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import type { Context } from "./servantContext";
import { frameExamples, aiTemplates } from '../lib/layeredCanvas/tools/frameExamples'
import { newPage } from "../bookeditor/book";
import type * as Storyboard from './storyboard';
import { trapezoidBoundingRect } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import { newPageProperty } from '../bookeditor/bookStore';
import { get } from "svelte/store";

export function makePage(context: Context, storyboard: Storyboard.Storyboard) {
  console.log(JSON.stringify(storyboard));
  const paperSize = get(newPageProperty).paperSize;

  for (const storyboardPage of storyboard.pages) {
    let sample = null;
    if (storyboard.format === "4koma" && storyboardPage.panels.length === 4) {
      sample = frameExamples[3];
    } else {
      sample = aiTemplates[storyboardPage.panels.length - 2];
    }
    const frameTree = FrameElement.compile(sample.frameTree);
    const bubbles = sample.bubbles.map(b => Bubble.compile(paperSize, b));

    const page = newPage(frameTree, bubbles);
    page.paperSize = paperSize;
    const paperLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    const leaves = collectLeaves(page.frameTree);
    for (let i = 0; i < leaves.length; i++) {
      console.log(leaves[i].pseudo);
    }

    storyboardPage.panels.forEach((panel: Storyboard.Panel, index: number) => {
      if (index < leaves.length) {
        const leaf = leaves[index];
        leaf.prompt = panel.composition;

        const layout = findLayoutOf(paperLayout, leaf);
        const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
        const n = panel.bubbles.length;
        panel.bubbles.forEach((b: Storyboard.Bubble, i:number) => {
          if (!b.owner || !b.speech) { 
            // do nothing
          } else {
            const bubble = new Bubble();
            bubble.text = b.speech.replace(/\\n/g, '\n');
            bubble.n_fontSize = 0.03;
            bubble.initOptions();
            const cc: Vector = [x0 + w * (n - i) / (n+1), y0 + h / 2];
            if (index % 2 == 0) {
              cc[0] += w*0.25; 
            } else {
              cc[0] -= w*0.25;
            }
            bubble.setPhysicalCenter(page.paperSize, cc);
            const size = bubble.calculateFitSize(paperSize);
            bubble.setPhysicalSize(paperSize, size);
            page.bubbles.push(bubble);
          }
        })
      }
    });

    context.book.pages.push(page);
  }
}
