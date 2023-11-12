import { writable } from "svelte/store";
import { type Page, newPage, commitPage } from "../pageStore";
import { FrameElement, calculatePhysicalLayout, collectLeaves, findLayoutOf, makeTrapezoidRect } from '../lib/layeredCanvas/frameTree.js';
import { Bubble } from '../lib/layeredCanvas/bubble';
import { measureVerticalText } from '../lib/layeredCanvas/verticalText';
import { aiTemplates } from '../lib/layeredCanvas/frameExamples';

// drafter: 原案を出力する 引数：お題
// storyboarder: 原案を入力としてネームを出力する 引数：ページ数、ページあたりのコマ数
// generator: ネームを入力としてFramePlannerのページを生成する 引数：なし
export type WeaverNodeType = 'drafter' | 'storyboarder' | 'generator';

// draft: 原案、formatless text
// storyboard: ネーム、json
export type WeaverDataType = 'draft' | 'storyboard';

export const weaverNodeInputType: { [key: string]: WeaverDataType } = {
  'storyboarder': 'draft',
  'generator': 'storyboard',
}

export const weaverNodeOutputType = {
  'drafter': 'draft',
  'storyboarder': 'storyboard',
}

export class WeaverAnchor {
  id: string;
  type: WeaverDataType;
  opposite: WeaverAnchor = null;
  node: WeaverNode = null;

  constructor(id: string, type: WeaverDataType) {
    this.id = id;
    this.type = type;
  }
}

export type WeaverArgType = 'largetext' | 'smalltext' | 'number' | 'boolean';

export class WeaverArg {
  type: WeaverArgType;
  name: string;
  label: string;
  supplemental: boolean;
  value: any;

  constructor(type: WeaverArgType, name: string, label: string, supplemental: boolean, value: any) {
    this.type = type;
    this.name = name;
    this.label = label;
    this.supplemental = supplemental;
    this.value = value;
  }
}

export type ExecuteOptions = { [key: string]: any };

export class WeaverNode {
  type: WeaverNodeType;
  id: string;
  label: string;
  injectors: WeaverAnchor[];
  extractors: WeaverAnchor[];
  executor: (w: WeaverNode, opts: ExecuteOptions) => Promise<any>;
  validator: (w: WeaverNode) => string;
  args: WeaverArg[];
  data: any = null;
  waiting: boolean = false;
  initialPosition: {x:number, y:number} = {x:0, y:0};

  constructor(
    type: WeaverNodeType, id: string, label: string, 
    injectors: WeaverAnchor[], extractors: WeaverAnchor[], 
    executor: (w: WeaverNode, opts: ExecuteOptions) => Promise<any>, 
    validator: (w: WeaverNode) => string,
    args: WeaverArg[],
    initialPosition: {x:number, y:number}) {
    this.type = type;
    this.id = id;
    this.label = label;
    this.injectors = [...injectors];
    this.extractors = [...extractors];
    this.executor = executor;
    this.validator = validator;
    this.args = args;
    this.initialPosition = initialPosition;

    this.injectors.forEach((anchor) => {anchor.node = this;});
    this.extractors.forEach((anchor) => {anchor.node = this;});
  }

  async run(opts: ExecuteOptions) {
    this.data = await this.executor(this, opts);
    console.log(this.data);
  }

  reset() {
    this.data = null;
  }

  validateArgs(): string {
    return this.validator(this);
  }

  validate(): string | null {
    let s = '';
    if (!this.inputReady) {
      s += '入力が不足しています\n';
    }
    s += this.validateArgs();
    if (s === '') { return null; }
    return s;
  }

  getAnchor(id: string): WeaverAnchor {
    return this.injectors.concat(this.extractors).find((anchor) => anchor.id === id);
  }

  connect(thisAnchorId: string, thatAnchor: WeaverAnchor) {
    const thisAnchor = this.getAnchor(thisAnchorId);
    thisAnchor.opposite = thatAnchor;
    thatAnchor.opposite = thisAnchor;
  }

  disconnect(thisAnchorId: string) {
    console.log('disconnect');
    const thisAnchor = this.getAnchor(thisAnchorId);
    if (!thisAnchor.opposite) { return; }
    thisAnchor.opposite.opposite = null;
    thisAnchor.opposite = null;
  }

  getInput(index: number) {
    return this.injectors[index].opposite.node.data;
  }

  get filled() {
    return this.data != null;
  }

  get inputReady() {
    return this.injectors.every((a) => a.opposite && a.opposite.node.filled);
  }

  get ready() {
    return this.validate() === null;
  }

  get outputs() {
    return this.extractors.filter(a => a.opposite).map(a => a.opposite.node.id);
  }

  get state() {
    if (this.waiting) { return 'waiting'; }
    if (this.filled) { return 'filled'; }
    if (this.inputReady) { return 'ready'; }
    return 'empty';
  }

}

export const weaverRefreshToken = writable(false);

export function createPage(source: any, imagePromptPrefix: string): Page {
  const page = newPage("ai-", 2);
  const n = source.scenes.length;
  page.frameTree = FrameElement.compile(aiTemplates[n - 2]); // ページ数に応じたテンプレ
  pourScenario(page, source, imagePromptPrefix);
  commitPage(page, page.frameTree, page.bubbles, null);
  return page;
}

function pourScenario(page: Page, s: any, imagePromptPrefix: string) { // TODO: 型が雑
  const paperLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  console.log(page.frameTree);
  const leaves = collectLeaves(page.frameTree);
  s.scenes.forEach((scene: any, index: number) => {
    const leaf = leaves[index];
    leaf.prompt = `${imagePromptPrefix} ${scene.imagePrompt}`;

    const layout = findLayoutOf(paperLayout, leaf);
    const r = makeTrapezoidRect(layout.corners);
    const c = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
    const n = scene.bubbles.length;
    scene.bubbles.forEach((b:any, i:number) => {
      const bubble = new Bubble();
      bubble.text = b[1];
      bubble.initOptions();
      const cc = [r[0] + (r[2] - r[0]) * (n - i) / (n+1), (r[1] + r[3]) / 2];
      bubble.move(cc);
      calculateFitBubbleSize(bubble);
      page.bubbles.push(bubble);
    })
  });
}

function calculateFitBubbleSize(bubble: Bubble) {
  const baselineSkip = bubble.fontSize * 1.5;
  const charSkip = bubble.fontSize;
  let size =[0,0];
  const m = measureVerticalText(null, Infinity, bubble.text, baselineSkip, charSkip, false);
  size = [Math.floor(m.width*1.2), Math.floor(m.height*1.4)];
  bubble.size = size;
  bubble.forceEnoughSize();
}

type NodePack = {
  id: string,
  data: any,
  args: {name: string, value: any}[]
}

export function packNode(node: WeaverNode): NodePack {
  const result: NodePack = {
    id: node.id,
    data: node.data,
    args: node.args.map((arg) => { return { name: arg.name, value: arg.value}; })
  };
  return result;
}

export function unpackNode(node: WeaverNode, pack: NodePack): void {
  for (let arg of pack.args) {
    node.args.find((a) => a.name === arg.name).value = arg.value;
  }
  node.data = pack.data;
}