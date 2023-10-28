import { writable } from "svelte/store";

// drafter: 原案を出力する 引数：お題
// storyboarder: 原案を入力としてネームを出力する 引数：ページ数、ページあたりのコマ数
// generator: ネームを入力としてFramePlannerのページを生成する 引数：なし
export type WeaverNodeType = 'drafter' | 'storyboarder' | 'generator';

// draft: 原案、formatless text
// storyboard: ネーム、json
export type WeaverDataType = 'draft' | 'storyboard';

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

export type WeaverArgType = 'largetext' | 'text' | 'number';

export class WeaverArg {
  type: WeaverArgType;
  name: string;
  label: string;
  value: any;

  constructor(type: WeaverArgType, name: string, label: string, value: any) {
    this.type = type;
    this.name = name;
    this.label = label;
    this.value = value;
  }
}

export class WeaverNode {
  type: WeaverNodeType;
  id: string;
  label: string;
  injectors: WeaverAnchor[];
  extractors: WeaverAnchor[];
  executor: (w: WeaverNode) => any;
  validator: (w: WeaverNode) => string;
  args: WeaverArg[];
  data: any = null;

  constructor(
    type: WeaverNodeType, id: string, label: string, 
    injectors: WeaverAnchor[], extractors: WeaverAnchor[], 
    executor: (w: WeaverNode) => any, 
    validator: (w: WeaverNode) => string,
    args: WeaverArg[]) {
    this.type = type;
    this.id = id;
    this.label = label;
    this.injectors = [...injectors];
    this.extractors = [...extractors];
    this.args = args;
    this.executor = executor;
    this.validator = validator;

    this.injectors.forEach((anchor) => {anchor.node = this;});
    this.extractors.forEach((anchor) => {anchor.node = this;});
  }

  run() {
    this.data = this.executor(this);
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

  get filled() {
    return this.data != null;
  }

  get inputReady() {
    return this.injectors.every((a) => a.opposite && a.opposite.node.filled);
  }

  get ready() {
    return this.validate() === null;
  }

  get links() {
    return this.injectors.concat(this.extractors).filter(a => a.opposite).map(a => a.opposite.node.id);
  }

}

export const weaverRefreshToken = writable(false);
