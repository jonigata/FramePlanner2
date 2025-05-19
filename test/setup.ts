import 'fake-indexeddb/auto';

declare global {
  export interface Console {
    tag(tag: string, ...args: any[]): void;
    snapshot(obj: any): void;
  }
}

console.tag = function(tag, color, ...args) {
  // console.log(`%c${tag}`, `color:white; background-color:${color}; padding:2px 4px; border-radius:4px;`, ...args);
  // console.trace();
}

if (!HTMLImageElement.prototype.decode) {
  HTMLImageElement.prototype.decode = async function () {
    return Promise.resolve();
  };
}

HTMLCanvasElement.prototype.getContext = function (contextId: '2d' | 'bitmaprenderer' | 'webgl' | 'webgl2', options?: any): CanvasRenderingContext2D | ImageBitmapRenderingContext | WebGLRenderingContext | null {
  if (contextId === '2d') {
    return {
      canvas: this,
      fillRect: () => {},
      fillText: () => {},
      getContextAttributes: () => ({}),
      getImageData: () => ({ data: new Uint8ClampedArray() }),
      putImageData: () => {},
      drawImage: () => {},
      globalAlpha: 1.0,
      globalCompositeOperation: 'source-over',
      // Add other properties and methods as needed
    } as unknown as CanvasRenderingContext2D;
  } else if (contextId === 'bitmaprenderer') {
    return {
      canvas: this,
      transferFromImageBitmap: (bitmap: ImageBitmap | null) => {}
    } as unknown as ImageBitmapRenderingContext;
  } else if (contextId === 'webgl' || contextId === 'webgl2') {
    return {
      canvas: this,
      // Add WebGLRenderingContext properties and methods as needed
    } as unknown as WebGLRenderingContext;
  }
  return null;
} as any;

if (!URL.createObjectURL) {
  let counter = 0;
  URL.createObjectURL = () => `blob:dummy-url-${counter++}`;
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => {};
}
