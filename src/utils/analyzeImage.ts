interface AlphaStats {
  max: number;
  min: number;
  mean: number;
  pixelsAboveThreshold: number;
  totalPixels: number;
}

export function analyzeImageAlpha(imageElement: HTMLImageElement, threshold: number = 128): Promise<AlphaStats> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Unable to create canvas context'));
      return;
    }

    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let max = 0;
    let min = 255;
    let sum = 0;
    let pixelsAboveThreshold = 0;
    const totalPixels = canvas.width * canvas.height;

    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i];

      max = Math.max(max, alpha);
      min = Math.min(min, alpha);
      sum += alpha;

      if (alpha >= threshold) {
        pixelsAboveThreshold++;
      }
    }

    const mean = sum / totalPixels;

    resolve({
      max,
      min,
      mean,
      pixelsAboveThreshold,
      totalPixels
    });
  });
}

class WebGLTextureAnalyzer {
  private gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  analyzeRGBA32FTextureAlpha(texture: WebGLTexture, width: number, height: number, alphaThreshold: number = 0.5): AlphaStats {
    // フレームバッファを作成
    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    // テクスチャをフレームバッファにアタッチ
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);

    // ピクセルデータを読み取り
    const pixels = new Float32Array(width * height * 4);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.FLOAT, pixels);

    // フレームバッファをクリーンアップ
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.deleteFramebuffer(framebuffer);

    // 統計を計算
    let max = 0;
    let min = 1;
    let sum = 0;
    let pixelsAboveThreshold = 0;
    const totalPixels = width * height;

    for (let i = 3; i < pixels.length; i += 4) {
      const alpha = pixels[i]; // W成分（4番目の成分）をアルファ値として使用
      max = Math.max(max, alpha);
      min = Math.min(min, alpha);
      sum += alpha;
      if (alpha >= alphaThreshold) {
        pixelsAboveThreshold++;
      }
    }

    return {
      max,
      min,
      mean: sum / totalPixels,
      pixelsAboveThreshold,
      totalPixels
    };
  }
}

// 使用例
export function analyzeWebGLTextureRGBA32FAlpha(
  gl: WebGLRenderingContext, 
  texture: WebGLTexture, 
  width: number, 
  height: number,
  alphaThreshold: number = 0.5
): AlphaStats {
  const analyzer = new WebGLTextureAnalyzer(gl);
  const stats = analyzer.analyzeRGBA32FTextureAlpha(texture, width, height, alphaThreshold);
  console.log('RGBA32Fテクスチャのアルファ統計:', stats);
  return stats;
}