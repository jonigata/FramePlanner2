import { type Layer, LayerBase, sequentializePointer, type Picked } from "../system/layeredCanvas";
import { type Vector, subtract2D } from '../tools/geometry/geometry';
import { type Layout, type FrameElement, calculatePhysicalLayout, findLayoutAt } from "../dataModels/frameTree";
import { Bubble } from "../dataModels/bubble";
import type { FocusKeeper } from "../tools/focusKeeper";
import { keyDownFlags } from "../system/keyCache";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { type FilmStack } from "../dataModels/film";

export class ViewerLayer extends LayerBase {
  private selected: Layout | Bubble | null = null;
  private playIcon: ClickableIcon;

  constructor(
    private frameTree: FrameElement,
    private bubbles: Bubble[],
    private onFocus: (target: Layout | Bubble | null) => void,
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
    if (depth === 0) {
      const layout = this.calculateRootLayout();

      if (this.interactable) { 
        // クリック可能な領域を可視化(デバッグ用)
        this.renderLayoutRecursive(ctx, layout);
      }
      this.renderFramePlayButtons(ctx, layout);
    }
    if (depth === 1) {
      this.renderBubblePlayButtons(ctx);
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

  private renderFramePlayButtons(ctx: CanvasRenderingContext2D, layout: Layout): void {
    if (this.hasVideo(layout?.element.filmStack)) {
      // 再生ボタンを描画
      this.playIcon.position = subtract2D(layout.corners.bottomRight, [8,8]);
      this.playIcon.pivot = [1, 1];      
      this.playIcon.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.playIcon.render(ctx);
    }

    // 子レイアウトを再帰的に描画
    layout.children?.forEach(child => {
      this.renderFramePlayButtons(ctx, child);
    });
  }

  private renderBubblePlayButtons(ctx: CanvasRenderingContext2D): void {
    for (const bubble of this.bubbles) {
      if (this.hasVideo(bubble.filmStack)) {
        const paperSize = this.getPaperSize();
        const [x0, y0, w, h] = bubble.getPhysicalRect(paperSize);
        const p: Vector = [x0 + w / 2, y0];

        // 再生ボタンを描画
        this.playIcon.position = p;
        this.playIcon.pivot = [0.5, 0];
        this.playIcon.shadowColor = "rgba(0, 0, 0, 0.5)";
        this.playIcon.render(ctx);
      }
    }
  }

  private handleClick(target: Layout | Bubble): void {
    this.selectTarget(target);
  }

  acceptDepths(): number[] {
    return [0];
  }

  accepts(point: Vector, button: number, depth: number): any {
    // if (!this.interactable) { return null; }　// 破壊的ではないので敢えて無視
    if (keyDownFlags["Space"]) { return null; }

    if (depth === 1) {
      for (const bubble of this.bubbles) {
        const paperSize = this.getPaperSize();
        if (bubble.contains(paperSize, point)) {
          return { action: "click", layout: bubble };
        }
      }
      return null;
    } else {
      const layout = this.calculateRootLayout();
      const clickedLayout = findLayoutAt(layout, point, 0);
      
      if (clickedLayout) {
        return { action: "click", layout: clickedLayout };
      }
      this.selectTarget(null);
      return null;
    }
  }

  async *pointer(p: Vector, payload: any) {
    if (payload.action === "click") {
      this.handleClick(payload.layout);
    }
  }

  async keyDown(_position: Vector, event: KeyboardEvent): Promise<boolean> {
    if (event.code === "Escape") {
      this.selectTarget(null);
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

  selectTarget(target: Layout | Bubble | null): void {
    if (target === this.selected) { return; }
    this.stopVideo(this.selected);
    this.selected = target;
    this.startVideo(target);
    this.onFocus(target);
    // フォーカスの変更を通知
    this.focusKeeper.setFocus(target ? this : null);
    this.redraw();
  }

  videoRedrawFrameId: number | undefined;
  stopVideo(target: Layout | Bubble | null) {
    if (this.videoRedrawFrameId !== undefined) {
      cancelAnimationFrame(this.videoRedrawFrameId);
      this.videoRedrawFrameId = undefined;
    }
    if (target) {
      const filmStack = this.getFilmStack(target);
      for (const film of filmStack.films) {
        film.media.player?.pause();
      }
    }
  }

  startVideo(target: Layout | Bubble | null) {
    if (!target) { return; }

    let playFlag = false;
    const filmStack = this.getFilmStack(target);
    for (const film of filmStack.films) {
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

  getFilmStack(target: Layout | Bubble): FilmStack {
    if (target instanceof Bubble) {
      return target.filmStack;
    } else {
      return target.element.filmStack;
    }
  }

  hasVideo(filmStack: FilmStack): boolean {
    for (const film of filmStack.films) {
      if (film.media.player) {
        return true;
      }
    }
    return false;
  }

  get interactable(): boolean { return this.mode == null; }
}

sequentializePointer(ViewerLayer);