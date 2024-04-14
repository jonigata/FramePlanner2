import { FrameElement, calculatePhysicalLayout, collectLeaves, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import type { Context } from "./servantContext";
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples'
import { type Page, newPage, commitBook } from "../bookeditor/book";
import type * as Storyboard from '../weaver/storyboard';
import { trapezoidBoundingRect } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import { newPageProperty } from '../bookeditor/bookStore';
import { get } from "svelte/store";

export function makePage(context: Context, storyboard: Storyboard.Storyboard) {
  const paperSize = get(newPageProperty).paperSize;

  for (const storyboardPage of storyboard.pages) {
    const sample = frameExamples[3];
    const frameTree = FrameElement.compile(sample.frameTree);
    const bubbles = sample.bubbles.map(b => Bubble.compile(paperSize, b));

    const page = newPage(frameTree, bubbles);
    page.paperSize = paperSize;
    const paperLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    const leaves = collectLeaves(page.frameTree);
    for (let i = 0; i < leaves.length; i++) {
      console.log(leaves[i].pseudo);
    }

    console.log(storyboardPage);
    storyboardPage.panels.forEach((panel: Storyboard.Panel, index: number) => {
      if (index < leaves.length) {
        const leaf = leaves[index];
        leaf.prompt = panel.composition;

        const layout = findLayoutOf(paperLayout, leaf);
        const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
        const n = panel.bubbles.length;
        panel.bubbles.forEach((b: Storyboard.Bubble, i:number) => {
          const bubble = new Bubble();
          bubble.text = b.speech.replace(/\\n/g, '\n');
          bubble.setPhysicalFontSize(page.paperSize, 44);
          bubble.initOptions();
          const cc: Vector = [x0 + w * (n - i) / (n+1), y0 + h / 2];
          bubble.setPhysicalCenter(page.paperSize, cc);
          const size = bubble.calculateFitSize(paperSize);
          bubble.setPhysicalSize(paperSize, size);
          page.bubbles.push(bubble);
        })
      }
    });

    context.book.pages.push(page);
  }
}
