import { type Layer, LayerBase, sequentializePointer, type Picked } from "../system/layeredCanvas";
import { type Vector, subtract2D } from '../tools/geometry/geometry';
import { type Layout, calculatePhysicalLayout, findLayoutAt } from "../dataModels/frameTree";
import type { FocusKeeper } from "../tools/focusKeeper";
import { keyDownFlags } from "../system/keyCache";
import { ClickableIcon } from "../tools/draw/clickableIcon";

export class ViewerLayer extends LayerBase {
  private selected: Layout | null = null;
  private playIcon: ClickableIcon;

  constructor(
    private frameTree: any,
    private onFocus: (layout: Layout | null) => void,
    private focusKeeper: FocusKeeper,
  ) {
    super();

    this.playIcon = new ClickableIcon(["viewerLayer/play.webp"],[32,32],[1,1],"再生", () => true, () => this.paper.matrix);

    focusKeeper.subscribe(this.changeFocus.bind(this));
  }

  calculateRootLayout(): Layout {
    return calculatePhysicalLayout(this.frameTree, this.getPaperSize(), [0, 0]);
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (depth !== 0) { return; }

    const layout = this.calculateRootLayout();

    if (this.interactable) { 
      // クリック可能な領域を可視化(デバッグ用)
      this.renderLayoutRecursive(ctx, layout);
      this.renderPlayButtons(ctx, layout);
    } else {
      this.renderPlayButtons(ctx, layout);
    }
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

  private renderPlayButtons(ctx: CanvasRenderingContext2D, layout: Layout): void {
    if (this.hasVideo(layout)) {
      // 再生ボタンを描画
      this.playIcon.position = subtract2D(layout.corners.bottomRight, [8,8]);
      this.playIcon.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.playIcon.render(ctx);
    }

    // 子レイアウトを再帰的に描画
    layout.children?.forEach(child => {
      this.renderPlayButtons(ctx, child);
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
    this.selectLayout(layout);
  }

  acceptDepths(): number[] {
    return [0];
  }

  accepts(point: Vector, button: number, depth: number): any {
    // if (!this.interactable) { return null; }　// 破壊的ではないので敢えて無視
    if (depth !== 0) { return null; }
    if (keyDownFlags["Space"]) { return null; }

    const layout = this.calculateRootLayout();
    const clickedLayout = findLayoutAt(layout, point, 0);
    
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
    if (layer !== this) {
      // フォーカスが他のレイヤーに移った場合のみ処理
      this.onFocus(null);
      this.redraw();
    }
  }

  selectLayout(layout: Layout | null): void {
    if (layout === this.selected) { return; }
    this.stopVideo(this.selected);
    this.selected = layout;
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

  hasVideo(layout: Layout | null): boolean {
    if (!layout) { return false; }
    if (layout.element.filmStack) {
      for (const film of layout.element.filmStack.films) {
        if (film.media.player) {
          return true;
        }
      }
    }
    return false;
  }

  get interactable(): boolean { return this.mode == null; }
}

sequentializePointer(ViewerLayer);