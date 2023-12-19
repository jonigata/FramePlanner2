import { Layer } from "../system/layeredCanvas";

// 動作確認用

export class SampleLayer extends Layer {
  constructor() {
    super();
  }

  render(ctx: CanvasRenderingContext2D): void {
    // 中央に三角形
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.lineTo(0, 100);
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.fill();
    
  }
}