import { LayerBase } from "../system/layeredCanvas";

// 動作確認用

export class SampleLayer extends LayerBase {
  constructor() {
    super();
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (depth !== 0) { return; }
    
    // 中央に三角形
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.lineTo(0, 100);
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.fill();
    
  }

  renderDepths(): number[] { return [0]; }
}