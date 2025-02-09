import { type Layer, LayerBase, sequentializePointer, type Picked } from "../system/layeredCanvas";
import { type Vector } from '../tools/geometry/geometry';
import { type Layout, calculatePhysicalLayout, findLayoutAt } from "../dataModels/frameTree";
import type { FocusKeeper } from "../tools/focusKeeper";
import { keyDownFlags } from "../system/keyCache";

export class ViewerLayer extends LayerBase {
  private selected: Layout | null = null;

  constructor(
    private frameTree: any,
    private onFocus: (layout: Layout | null) => void,
    private focusKeeper: FocusKeeper,
  ) {
    super();
    focusKeeper.subscribe(this.changeFocus.bind(this));
  }

  calculateRootLayout(): Layout {
    return calculatePhysicalLayout(this.frameTree, this.getPaperSize(), [0, 0]);
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.interactable) { return; }
    if (depth !== 0) { return; }

    // クリック可能な領域を可視化(デバッグ用)
    const layout = this.calculateRootLayout();
    this.renderLayoutRecursive(ctx, layout);
  }

  private renderLayoutRecursive(ctx: CanvasRenderingContext2D, layout: Layout): void {
    // レイアウトの境界を描画
    ctx.strokeStyle = 'rgba(0, 200, 200, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...layout.corners.topLeft);
    ctx.lineTo(...layout.corners.topRight);
    ctx.lineTo(...layout.corners.bottomRight);
    ctx.lineTo(...layout.corners.bottomLeft);
    ctx.closePath();
    ctx.stroke();

    // 子レイアウトを再帰的に描画
    layout.children?.forEach(child => {
      this.renderLayoutRecursive(ctx, child);
    });
  }

  pick(point: Vector): Picked[] {
    const layout = this.calculateRootLayout();
    const layouts = this.findClickableLayouts(layout, point);
    return layouts.map(layout => ({
      selected: false,
      action: () => this.handleClick(layout),
    }));
  }

  private findClickableLayouts(layout: Layout, point: Vector): Layout[] {
    const found = findLayoutAt(layout, point, 0);
    return found ? [found] : [];
  }

  private handleClick(layout: Layout): void {
    console.log('Clicked layout:', layout);
    this.selectLayout(layout);
  }

  acceptDepths(): number[] {
    return [0];
  }

  accepts(point: Vector, button: number, depth: number): any {
    if (!this.interactable) { return null; }
    if (depth !== 0) { return null; }
    if (keyDownFlags["Space"]) { return null; }

    const layout = this.calculateRootLayout();
    const clickedLayout = findLayoutAt(layout, point, 0);
    console.log('Clicked layout:', clickedLayout);
    
    if (clickedLayout) {
      return { action: "click", layout: clickedLayout };
    }
    this.selectLayout(null);
    return null;
  }

  async *pointer(p: Vector, payload: any) {
    if (payload.action === "click") {
      this.handleClick(payload.layout);
    }
  }

  async keyDown(_position: Vector, event: KeyboardEvent): Promise<boolean> {
    if (event.code === "Escape") {
      this.selectLayout(null);
      return true;
    }
    return false;
  }

  changeFocus(layer: Layer | null) {
    console.log('changeFocus:', layer);
    if (layer !== this) {
      // フォーカスが他のレイヤーに移った場合のみ処理
      this.onFocus(null);
      this.redraw();
    }
  }

  selectLayout(layout: Layout | null): void {
    if (layout === this.selected) { return; }
    this.selected = layout;
    this.stopVideo(layout);
    this.startVideo(layout);
    this.onFocus(layout);
    // フォーカスの変更を通知
    this.focusKeeper.setFocus(layout ? this : null);
    this.redraw();
  }

  videoRedrawFrameId: number | undefined;
  stopVideo(layout: Layout | null) {
    if (this.videoRedrawFrameId !== undefined) {
      cancelAnimationFrame(this.videoRedrawFrameId);
      this.videoRedrawFrameId = undefined;
    }
    if (layout) {
      for (const film of layout.element.filmStack.films) {
        film.media.player?.pause();
      }
    }
  }

  startVideo(layout: Layout | null) {
    if (!layout) { return; }

    let playFlag = false;
    for (const film of layout.element.filmStack.films) {
      if (film.media.player) {
        playFlag = true;
        film.media.player.play();
      }
    }
    if (playFlag) {
      const redraw = () => {
        this.redraw();  // 毎フレーム描画
        this.videoRedrawFrameId = requestAnimationFrame(redraw);
      };

      this.videoRedrawFrameId = requestAnimationFrame(redraw);
    }
  }

  get interactable(): boolean { return this.mode == null; }
}

sequentializePointer(ViewerLayer);