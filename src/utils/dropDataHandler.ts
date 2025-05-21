import { handleDataTransfer, excludeTextFiles } from "../lib/layeredCanvas/tools/fileUtil";
import { createCanvasFromBlob } from '../lib/layeredCanvas/tools/imageUtil';

/**
 * Svelte Action: dropDataHandler
 * 
 * Usage:
 *   use:dropDataHandler={callback}
 * 
 * callback: (result: any) => void
 *   - drop時やCtrl+V時にhandleDataTransferの返り値を受け取る
 *   - Ctrl+Vは「当該nodeの上にマウスがある」時のみ発動
 *     - pasteイベントはフォーカスがないと受け取れないのでOSファイル自体は拾えない
 *      （一旦開いてから画像をコピーしたものであれば受け取れる）
 */
export function dropDataHandler(node: HTMLElement, callback: (result: (HTMLCanvasElement | HTMLVideoElement | string)[]) => void) {
  // dragover handler
  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  // drop handler
  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!ev.dataTransfer) return;
    const mediaResources = await handleDataTransfer(ev.dataTransfer);
    callback(mediaResources);
  }

  // マウスオーバーフラグ
  let isOver = false;
  function onMouseEnter() { isOver = true; }
  function onMouseLeave() { isOver = false; }

  // window keydown handler (Ctrl+V)
  async function onWindowKeyDown(e: KeyboardEvent) {
    console.log("keydown", e, isOver);
    if (!isOver) return;
    if (e.ctrlKey && e.key === "v") {
      // クリップボードから画像を取得
      // ファイルは拾えない
      const items = await navigator.clipboard.read();
      const canvases = [];
      for (let item of items) {
        for (let type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const canvas = await createCanvasFromBlob(blob);
            canvases.push(canvas);
          }
        }
      }
      callback(canvases);
    }
  }

  node.addEventListener("dragover", onDragOver);
  node.addEventListener("drop", onDrop);
  node.addEventListener("mouseenter", onMouseEnter);
  node.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("keydown", onWindowKeyDown);

  // フォーカスを受け取れるようにtabindexを設定
  if (!node.hasAttribute("tabindex")) {
    node.setAttribute("tabindex", "0");
  }

  return {
    destroy() {
      node.removeEventListener("dragover", onDragOver);
      node.removeEventListener("drop", onDrop);
      node.removeEventListener("mouseenter", onMouseEnter);
      node.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("keydown", onWindowKeyDown);
    }
  };
}