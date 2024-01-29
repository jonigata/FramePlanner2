export const keyDownFlags = {};

export function initializeKeyCache(canvas: HTMLCanvasElement, consume: (code: string) => boolean) {
  if (canvas["keyCacheInitialized"]) { return; }
  canvas["keyCacheInitialized"] = true;

  function getCanvasPosition(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return [x, y];
  }

  let mouseCursor = [-1, -1];
  function isMouseOnCanvas() {
    var rect = canvas.getBoundingClientRect();

    // カーソルの座標がキャンバスの範囲内にあるかをチェック
    var isInCanvas =
      0 <= mouseCursor[0] - rect.left &&
      mouseCursor[0] - rect.left <= rect.width &&
      0 <= mouseCursor[1] - rect.top &&
      mouseCursor[1] - rect.top <= rect.height;

    // カーソルの座標に最前面の要素がキャンバスかどうかをチェック
    if (isInCanvas) {
      var elementAtCursor = document.elementFromPoint(
        mouseCursor[0],
        mouseCursor[1]
      );
      return elementAtCursor === canvas;
    }

    return false;
  }

  canvas.addEventListener("mousemove", (event) => {
    mouseCursor = getCanvasPosition(event);
  });
  canvas.addEventListener("mouseleave", (event) => {
    mouseCursor = [-1, -1];
  });
  document.addEventListener("keydown", (event) => {
    if (!isMouseOnCanvas()) {
      return;
    }
    let code = event.code;
    if (code == "MetaLeft") {
      code = "ControlLeft";
    }
    if (code == "MetaRight") {
      code = "ControlRight";
    }
    if (!consume(code)) {
      return;
    }
    keyDownFlags[code] = true;
    event.preventDefault();
  });
  document.addEventListener("keyup", (event) => {
    keyDownFlags[event.code] = false;
    event.preventDefault();
  });
  canvas.addEventListener("mouseleave", (event) => {
    for (let key in keyDownFlags) {
      delete keyDownFlags[key];
    }
  });
}
