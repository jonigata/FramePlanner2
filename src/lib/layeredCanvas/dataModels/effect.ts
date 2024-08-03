import { ulid } from 'ulid';
import { Media, ImageMedia } from './media';
import { Computron, JFACompute, FloatField } from 'fastsdf';
import parseColor from 'color-parse';

let jfa: JFACompute;
async function init() {
  const c = new Computron();
  await c.init();

  jfa = new JFACompute(c);
  await jfa.init();
}
init();

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

  decompile(): any {
    throw new Error("Not implemented");
  }

  static compile(markUp: any) {
    switch (markUp.tag) {
      case "OutlineEffect":
        const p = markUp.properties;
        return new OutlineEffect(p.color, p.width, p.sharp);
      default:
        throw new Error("Unknown effect tag: " + markUp.tag);
    }
  }
}

export class OutlineEffect extends Effect {
  rawDistanceField: FloatField;

  constructor(public color: string, public width: number, public sharp: number) {
    super();
  }

  clone(): Effect {
    return new OutlineEffect(this.color, this.width, this.sharp);
  }

  async apply(inputMedia: Media): Promise<Media> { 

    if (this.inputMedia != inputMedia) {
      const inputCanvas = (inputMedia as ImageMedia).canvas;

      const plainImage = FloatField.createFromImageOrCanvas(inputCanvas);
      const seedMap = JFACompute.createJFASeedMap(plainImage, 0.5, false);
      this.rawDistanceField = await jfa.compute(seedMap);
      this.inputMedia = inputMedia;
    } else {
    }

    const inputCanvas = (inputMedia as ImageMedia).canvas;

    // 入力自体へんかしている
    const baseWidth = Math.max(inputMedia.naturalWidth, inputMedia.naturalHeight);
    const width = this.width * baseWidth;

    const c = parseColor(this.color);
    const color = {r: c.values[0] / 255, g: c.values[1] / 255, b: c.values[2] / 255};
    const dull = 1.0 - this.sharp;
    const f = (t: number) => dull <= t ? 1 : t * (1.0 / dull);
    const distanceField = JFACompute.generateDistanceField(
      this.rawDistanceField, color, width, f);

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = inputCanvas.width;
    targetCanvas.height = inputCanvas.height;
    const ctx = targetCanvas.getContext('2d');
    ctx.drawImage(inputCanvas, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(distanceField.toCanvas(), 0, 0);

    this.outputMedia = new ImageMedia(targetCanvas);
    return this.outputMedia;
  }

  decompile(): any {
    return {
      color: this.color,
      width: this.width,
      sharp: this.sharp,
    };
  }
}

