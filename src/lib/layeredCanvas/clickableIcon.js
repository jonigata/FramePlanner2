export class ClickableIcon {
    constructor(src, position, size) {
        this.src = new URL(`../../assets/${src}`, import.meta.url).href;
        this.position = position;
        this.size = size;
        this.image = new Image();
        this.image.src = this.src;
    }

    render(ctx) {
        ctx.save();
        ctx.shadowColor = "white";
        ctx.shadowBlur = 5;
        ctx.drawImage(this.image, this.position[0], this.position[1], this.size[0], this.size[1]);
        ctx.restore();
    }

    contains(point) {
        const x = this.position[0];
        const y = this.position[1];
        const w = this.size[0];
        const h = this.size[1];
        const f = x <= point[0] && point[0] <= x + w && y <= point[1] && point[1] <= y + h;
        return f;
    }
}