export function *translate(p, f) {
    let dragStart = p;

    while (p = yield) {
        const dragOffset = [p[0] - dragStart[0], p[1] - dragStart[1]];
        f(dragOffset);
    }
}

export function *scale(p, f) {
    let dragStart = p;

    while (p = yield) {
        const dragOffset = [p[0] - dragStart[0], p[1] - dragStart[1]];
        let xScale = 1 + dragOffset[0] / canvas.width;
        let yScale = 1 + dragOffset[0] / canvas.height;
        f([xScale, yScale]);
    }
}
