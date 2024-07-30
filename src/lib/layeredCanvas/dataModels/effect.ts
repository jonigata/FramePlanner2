import { ulid } from 'ulid';
import { Media, ImageMedia } from './media';
import { generateDF } from 'fastsdf';
import parseColor from 'color-parse';

export class Effect {
  ulid: string;
  inputMedia: Media;
  outputMedia: Media;

  constructor() {
    this.ulid = ulid();
    this.inputMedia = null;
  }

  get tag(): string {
    return this.constructor.name;
  }

  clone(): Effect {
    throw new Error("Not implemented");
  }

  cleanInput() {
    this.inputMedia = null;
  }

  setOutputDirty() {
    this.outputMedia = null;
  }

  async apply(inputMedia: Media): Promise<Media> { 
    throw new Error("Not implemented");
  }
}

export class OutlineEffect extends Effect {
  color: string;
  width: number;

  constructor(color: string, width: number) {
    super();
    this.color = color;
    this.width = width;
  }

  clone(): Effect {
    return new OutlineEffect(this.color, this.width);
  }

  async apply(inputMedia: Media): Promise<Media> { 
    console.log("apply");
    // TODO: inputMediaが変わっているときだけNNを作成する
    if (this.inputMedia == inputMedia) {
      // 入力は変化してない
      if (this.outputMedia) {
        return this.outputMedia;
      }
      const inputCanvas = (inputMedia as ImageMedia).canvas;

      const baseWidth = Math.max(inputCanvas.width, inputCanvas.height);
      const width = this.width * baseWidth;
      console.log(width, baseWidth, this.width);
  
      const c = parseColor(this.color);
      const f = (t: number) => 0.1 <= t ? 1 : t * 10;
      const dfCanvas: HTMLCanvasElement = await generateDF(
        inputCanvas, {r: c.values[0] / 255, g: c.values[1] / 255, b: c.values[2] / 255}, 0.5, false, width, f);
  
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = inputCanvas.width;
      targetCanvas.height = inputCanvas.height;
      const ctx = targetCanvas.getContext('2d');
      ctx.drawImage(inputCanvas, 0, 0);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(dfCanvas, 0, 0);
  
      this.outputMedia = new ImageMedia(targetCanvas);
      return this.outputMedia;
    } else {
      // 入力自体へんかしている
      const inputCanvas = (inputMedia as ImageMedia).canvas;

      const baseWidth = Math.max(inputCanvas.width, inputCanvas.height);
      const width = this.width * baseWidth;
      console.log(width, baseWidth, this.width);
  
      const c = parseColor(this.color);
      const f = (t: number) => 0.1 <= t ? 1 : t * 10;
      const dfCanvas: HTMLCanvasElement = await generateDF(
        inputCanvas, {r: c.values[0] / 255, g: c.values[1] / 255, b: c.values[2] / 255}, 0.5, false, width, f);
  
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = inputCanvas.width;
      targetCanvas.height = inputCanvas.height;
      const ctx = targetCanvas.getContext('2d');
      ctx.drawImage(inputCanvas, 0, 0);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(dfCanvas, 0, 0);
  
      this.outputMedia = new ImageMedia(targetCanvas);
      return this.outputMedia;
    }
  }
}

