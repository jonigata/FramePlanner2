import type { Page as ExPage } from "./hiruma";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { calculatePhysicalLayout, findLayoutOf } from "../lib/layeredCanvas/dataModels/frameTree";
import { ulid } from 'ulid';
import type { Page as InPage } from "../bookeditor/book";
import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';

export function createPage(source: ExPage, imagePromptPrefix: string): InPage {
  console.log("source", source);
  const root = {
    bgColor: source.background_color,
    column: [],
    height: 100,
  }
  const bubbles: Bubble[] = [];

  // 内部形式だと、col/rowは親の形を表していて、(だから単数形)
  // 外部形式だと、cols/rowsは子の形を表している（だから複数形）
  // なのでsourceとは一見逆に見える
  for (const sourceRow of source.rows) {
    const row = {
      row: [],
      height: sourceRow.height_ratio * 100, // 別にそのままでも問題ないが、なんとなく
    }
    for (const sourceCol of sourceRow.cols) {
      const col = {
        width: sourceCol.width_ratio * 100, // 別にそのままでも問題ないが、なんとなく
        semantics: sourceCol.panel_index.toString(),
      }
      row.row.push(col);
    }
    root.column.push(row);
  }
  console.log("root", root)

  const target: InPage = {
    id: ulid(),
    frameTree: FrameElement.compile(root),
    bubbles: [], 
    paperSize: [source.page_width, source.page_height],
    paperColor: source.background_color,
    frameColor: source.border_color,
    frameWidth: source.border_width,
  }
  const layout = calculatePhysicalLayout(target.frameTree, target.paperSize, [0,0]);

  for (const sourceRow of source.rows) {
    for (const sourceCol of sourceRow.cols) {
      const element = FrameElement.findElement(target.frameTree, e => e.semantics == sourceCol.panel_index.toString());
      const layoutlet = findLayoutOf(layout, element);
      const [x, y] = layoutlet.rawOrigin;
      const [w, h] = layoutlet.rawSize;
  
      for (const quote of sourceCol.quotes) {
        const b = {
          n_p0: [0, 0],
          n_p1: [0.2, 0.2],
          text: quote.text,
          shape: quote.style == "normal" ? "ellipse" : "square",
          direction: "v",
          autoNewline: false,
          embedded: true,
        }
        let [bx, by] = [0.5, 0.5];
        if (quote.position_x != null && quote.position_y != null) { 
          bx = quote.position_x;
          by = quote.position_y;
        } else {
          switch(quote.position_x_rough) {
            case "left":
              bx = 0.1;
              break;
            case "center":
              bx = 0.5;
              break;
            case "right":
              bx = 0.9;
              break;
          }
        }
        console.log(quote.text, x, y, w, h, [bx, by], [x + w - w * bx, y + h * by]);
        const cb = Bubble.compile(target.paperSize, b)
        cb.setPhysicalCenter(target.paperSize, [x + w * bx, y + h * by]);
        target.bubbles.push(cb);
      }
    }
  }


  return target;
}

