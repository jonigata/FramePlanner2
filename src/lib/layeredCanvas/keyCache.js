export const keyDownFlags = {};

export function initializeKeyCache(canvas, consume) {
    function getCanvasPosition(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return [x, y];
    }
      
    let mouseCursor = [-1, -1];
    function isMouseOnCanvas() {
        var rect = canvas.getBoundingClientRect();
        var f = 0 <= mouseCursor[0] && mouseCursor[0] <= rect.width && 0 <= mouseCursor[1] && mouseCursor[1] <= rect.height;
        return f;
    }
      
    canvas.addEventListener('mousemove', (event) => {
        mouseCursor = getCanvasPosition(event);
    });
    canvas.addEventListener('mouseleave', (event) => {
        mouseCursor = [-1, -1];
    });
    document.addEventListener("keydown", (event) => { 
        if (!isMouseOnCanvas()) {return;}
        let code = event.code;
        if (code == "MetaLeft") { code = "ControlLeft"; }
        if (code == "MetaRight") { code = "ControlRight"; }
        if (!consume(code)) {return;}
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
