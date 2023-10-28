import { writable } from "svelte/store";

export type WeaverDataType = 'draft' | 'storyboard';
// draft: 原案、formatless text
// storyboard: ネーム、json

export type WeaverNodeType = 'drafter' | 'storyboarder' | 'generator';
// drafter: 原案を出力する 引数：お題
// storyboarder: 原案を入力としてネームを出力する 引数：ページ数、ページあたりのコマ数
// generator: ネームを入力としてFramePlannerのページを生成する 引数：なし

export type WeaverArgType = 'largetext' | 'text' | 'number';
export type WeaverFormalArg = {
  type: WeaverArgType;
  name: string;
  label: string;
}
export type WeaverActualArg = any;

export class WeaverNode {
  type: WeaverNodeType;
  id: string;
  label: string;
  inputs: WeaverDataType[];
  outputs: WeaverDataType[];
  injector: WeaverNode[];
  extractor: WeaverNode[];
  executor: (w: WeaverNode) => any;
  validator: (w: WeaverNode) => string;
  formalArgs: WeaverFormalArg[];
  actualArgs: WeaverActualArg[];
  data: any = null;
  linkTo: string[] = [];

  constructor(
    type: WeaverNodeType, id: string, label: string, 
    inputs: WeaverDataType[], outputs: WeaverDataType[], 
    formalArgs: WeaverFormalArg[],
    executor: (w: WeaverNode) => any, 
    validator: (w: WeaverNode) => string,
    linkTo: string[]) {
    this.type = type;
    this.id = id;
    this.label = label;
    this.inputs = [...inputs];
    this.outputs = [...outputs];
    this.injector = Array.from({length: inputs.length}, () => null);
    this.extractor = Array.from({length: outputs.length}, () => null);
    this.formalArgs = formalArgs;
    this.actualArgs = Array.from({length: formalArgs.length}, () => null);
    this.executor = executor;
    this.validator = validator;
    this.linkTo = linkTo;
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

  get filled() {
    return this.data != null;
  }

  get inputReady() {
    return this.injector.every((node) => node != null && node.filled);
  }

  get ready() {
    return this.validate() === null;
  }

  get args() {
    return this.formalArgs.map((arg, i) => {
      return {
        ...arg,
        value: this.actualArgs[i],
      }
    });
  }

}

export const weaverRefreshToken = writable(false);
