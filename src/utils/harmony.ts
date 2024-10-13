export class ColorHarmonyGenerator {
  baseColor: number[];
  alpha: string;

  constructor(baseColor: string) {
    this.baseColor = this.hexToHSL(baseColor);
    this.alpha = baseColor.slice(7);
  }

  hexToHSL(hex: string) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  }

  HSLToHex(h: number, s: number, l: number) {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;
    let r, g, b;

    if (0 <= h && h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (60 <= h && h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (120 <= h && h < 180) {
      [r, g, b] = [0, c, x];
    } else if (180 <= h && h < 240) {
      [r, g, b] = [0, x, c];
    } else if (240 <= h && h < 300) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }

    r = Math.round((r + m) * 255)
      .toString(16)
      .padStart(2, "0");
    g = Math.round((g + m) * 255)
      .toString(16)
      .padStart(2, "0");
    b = Math.round((b + m) * 255)
      .toString(16)
      .padStart(2, "0");

    return `#${r}${g}${b}${this.alpha}`;
  }

  generateHarmony() {
    let [h, s, l] = this.baseColor;
    return {
      base: this.HSLToHex(h, s, l),
      complementary: this.HSLToHex((h + 180) % 360, s, l),
      analogous1: this.HSLToHex((h + 30) % 360, s, l),
      analogous2: this.HSLToHex((h + 330) % 360, s, l),
      triadic1: this.HSLToHex((h + 120) % 360, s, l),
      triadic2: this.HSLToHex((h + 240) % 360, s, l),
      splitComplementary1: this.HSLToHex((h + 150) % 360, s, l),
      splitComplementary2: this.HSLToHex((h + 210) % 360, s, l),
    };
  }
}
