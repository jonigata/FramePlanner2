import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { getHaiku } from "../lib/layeredCanvas/tools/haiku";
import type { Context } from "./servantContext";

type Parameters = { [key: string]: any };

function getPaperSize(context: Context) {
  return context.book.pages[context.pageIndex].paperSize;
}

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIError";
  }
}

export class AIArgumentError extends AIError {
    constructor(message: string) {
    super(`引数の問題: ${message}`);
    this.name = "AIArgumentError";
  }
}

type CreateBubbleArgs = {
  text: string;
  position: Vector;
}

function createBubble(context: Context, params: Parameters) {
  const args = params as CreateBubbleArgs;
  console.log("createBubble", args);
  if (args.text == null) {
    throw new AIArgumentError("テキストが空です");
  } else if (args.text === "") {
    args.text = getHaiku();
  }
  if (args.position == null || args.position.length !== 2 || 
      typeof args.position[0] !== "number" || typeof args.position[1] !== "number") {
    throw new AIArgumentError("positionが不正です");
  }
  const paperSize = getPaperSize(context);
  const bubble = new Bubble();
  bubble.text = args.text;
  bubble.initOptions();
  // bubble.forceEnoughSize(paperSize);
  bubble.setPhysicalCenter(paperSize, [paperSize[0] * args.position[0], paperSize[1] * args.position[1]]);
  const size = bubble.calculateFitSize(paperSize);
  bubble.setPhysicalSize(paperSize, size);
  console.log(bubble);
  context.book.pages[context.pageIndex].bubbles.push(bubble);
}

export type FunctionCalling = {
  tool: string;
  parameters: Parameters;
}

type Servant = (context: Context, parameters: Parameters) => void;

// 関数の定義に基づいて関数を動的に呼び出す関数
export function callServant(context: Context, funcalls: FunctionCalling[]) {
  const servants: { [key: string]: Servant } = {
    "createBubble": createBubble,
  }

  for (const funcall of funcalls) {
    const servant = servants[funcall.tool];
    if (servant == null) {
      throw new AIError(`関数${funcall.tool}は存在しません`);
    }
    servant(context, funcall.parameters);
  }
}
