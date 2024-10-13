import { FrameElement, calculatePhysicalLayout, collectLeaves, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import { newPage } from "../bookeditor/book";
import type * as Storyboard from './storyboard';
import { trapezoidBoundingRect } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import { newPageProperty } from '../bookeditor/bookStore';
import { get } from "svelte/store";
import parseColor from 'color-parse';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';

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
  console.log(storyboard.format);
  const paperSize = get(newPageProperty).paperSize;

  const pages = [];
  for (const storyboardPage of storyboard.pages) {
    console.log(storyboardPage.layout);

    let sample: ConvertedLayout | null = null;
    if (storyboard.format == '4koma') {
      sample = frameExamples[3];
    } else {
      sample = makePageTemplateFromLightLayout(storyboardPage.layout);
    }
    console.log(sample);
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

        const layout = findLayoutOf(paperLayout, leaf)!;
        const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
        const n = panel.bubbles.length;
        panel.bubbles.forEach((b: Storyboard.Bubble, i:number) => {
          console.log(b);
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
            size[0] *= 1.1;
            size[1] *= 1.1;
            bubble.setPhysicalSize(paperSize, size);

            bubble.shape = b.shape;
            bubble.fontFamily = "源暎エムゴ"
            bubble.n_outlineWidth = 0.005;
            bubble.outlineColor = '#ffffff';
            bubble.fillColor = whitenColor(b.color, 0.85);
            bubble.optionContext['shapeExpand'] = 0.06;

            // ３つ以上のピリオドが連続している場合、……に変換
            bubble.text = bubble.text.replace(/\.{3,}/g, '……');

            bubble.initOptions();

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

interface FrameTreeNode {
  visibility?: number;
  width?: number;
  height?: number;
  column?: FrameTreeNode[];
  row?: FrameTreeNode[];
  divider?: { spacing: number };
  bgColor?: string;
}

interface ConvertedLayout {
  frameTree: FrameTreeNode;
  bubbles: any[]; // bubbles の型は提供されていないため any[] としています
}

export function makePageTemplateFromLightLayout(layout: Storyboard.LayoutPage): ConvertedLayout {
  const convertedLayout: ConvertedLayout = {
    frameTree: {
      bgColor: "white",
      row: [],
      height: 100
    },
    bubbles: []
  };

  // 左右の余白を追加
  convertedLayout.frameTree.row!.push({ visibility: 0, width: 3 });

  // 各行を変換
  const centerColumn: FrameTreeNode = {
    width: 94,
    column: []
  };

  // 上下の余白を追加
  centerColumn.column!.push({ visibility: 0, height: 3 });

  layout.rows.forEach((row: Storyboard.LayoutRow, rowIndex: number) => {
    const convertedRow: FrameTreeNode = {
      row: [],
      height: Math.round(row.ratio * 100)
    };
    if (rowIndex < layout.rows.length - 1) {
      // 最後の行以外にdividerを追加
      convertedRow.divider = { spacing: 3 };
    }

    // 各列を変換
    row.columns.forEach((column: Storyboard.LayoutColumn, columnIndex: number) => {
      const convertedColumn: FrameTreeNode = {
        width: Math.round(column.ratio * 100)
      };
      if (columnIndex < row.columns.length - 1) {
        // 最後の列以外にdividerを追加
        convertedColumn.divider = { spacing: 2 };
      }      

      convertedRow.row!.push(convertedColumn);
    });

    centerColumn.column!.push(convertedRow);
  });

  // 上下の余白を追加
  centerColumn.column!.push({ visibility: 0, height: 3 });

  convertedLayout.frameTree.row!.push(centerColumn);

  // 左右の余白を追加
  convertedLayout.frameTree.row!.push({ visibility: 0, width: 3 });

  return convertedLayout;
}
