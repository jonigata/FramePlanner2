import { FrameElement, calculatePhysicalLayout, collectLeaves, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import { frameExamples, aiTemplates } from '../lib/layeredCanvas/tools/frameExamples'
import { newPage } from "../bookeditor/book";
import type * as Storyboard from './storyboard';
import { trapezoidBoundingRect } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import { newPageProperty } from '../bookeditor/bookStore';
import { get } from "svelte/store";
import parseColor from 'color-parse';

function whitenColor(s: string, ratio: number): string {
  const c = parseColor(s);
  if (ratio < 0 || ratio > 1) {
    throw new Error("Ratio must be between 0 and 1");
  }
  
  // 白との混合
  const r = Math.round(c.values[0] * (1 - ratio) + 255 * ratio);
  const g = Math.round(c.values[1] * (1 - ratio) + 255 * ratio);
  const b = Math.round(c.values[2] * (1 - ratio) + 255 * ratio);

  // hexで返す
  return "#" + 
    r.toString(16).padStart(2, '0') + 
    g.toString(16).padStart(2, '0') + 
    b.toString(16).padStart(2, '0');
}

export function makePagesFromStoryboard(storyboard: Storyboard.Storyboard) {
  console.log(JSON.stringify(storyboard));
  const paperSize = get(newPageProperty).paperSize;

  const pages = [];
  for (const storyboardPage of storyboard.pages) {
    let sample = null;
    if (storyboard.format === "4koma" && storyboardPage.panels.length === 4) {
      sample = frameExamples[3];
    } else {
      sample = aiTemplates[storyboardPage.panels.length - 2];
    }
    console.log(storyboardPage.panels.length - 2, sample);
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

            bubble.fontFamily = "源暎エムゴ"
            bubble.n_outlineWidth = 0.005;
            bubble.outlineColor = '#ffffff';
            bubble.fillColor = whitenColor(b.color, 0.85);
            bubble.optionContext['shapeExpand'] = 0.06;

            page.bubbles.push(bubble);
          }
        })
      }
    });

    page.source = storyboardPage;
    pages.push(page);
  }
  return pages;
}
