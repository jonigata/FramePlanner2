// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { z } from "zod";

export const ImagingBackgroundSchema = z.enum(["auto", "opaque", "transparent"]);
export type ImagingBackground = z.infer<typeof ImagingBackgroundSchema>;

export const ImagingActionSchema = z.enum([
  "texttoimage", 
  "imagetovideo", 
  "inpaint", 
  "outpaint", 
  "vision", 
  "upscale", 
  "removebg", 
  "eraser", 
  "layerize",
  "textmask", 
  "texteraser", 
]);
export type ImagingAction = z.infer<typeof ImagingActionSchema>;

export const ImagingModelSchema = z.enum([
  "schnell",
  "pro",
  "chibi",
  "manga",
  "comibg",
  "gpt-image-1/low",
  "gpt-image-1/medium",
  "gpt-image-1/high",
  "gpt-image-1.5/low",
  "gpt-image-1.5/medium",
  "gpt-image-1.5/high",
  "gpt-image-2/low",
  "gpt-image-2/medium",
  "gpt-image-2/high",
  "qwen-image",
  "qwen-image-2",
  "qwen-image-2/pro",
  "kontext/pro",
  "kontext/max",
  "kontext/inscene",
  "nano-banana",
  "nano-banana-pro",
  "nano-banana-2",
  "chrono-edit",
  "seedream/v4",
  "seedream/v4.5",
  "seedream/v5-lite",
  "qwen-image-edit/multiple-angles",
  "flux-2-dev",
  "flux-2-pro",
  "flux-2-flex",
  "flux-2-klein",
  "z-image",
  "kling-image/o1",
]);
export type ImagingModel = z.infer<typeof ImagingModelSchema>;

export const ImagingProviderSchema = z.enum(["flux", "gpt-image-1", "gpt-image-1.5", "gpt-image-2", "qwen", "seedream", "decart"]);
export type ImagingProvider = z.infer<typeof ImagingProviderSchema>;

const AngleSchema = z.object({
  horizontal_angle: z.number(), // 0-360°
  vertical_angle: z.number(),   // -30～90°
  zoom: z.number(),             // 0-10, default: 5
});
const TextToImageOptionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("none"),
  }),
  z.object({
    kind: z.literal("angle"),
    angle: AngleSchema,
  }),
]);
export type TextToImageOption = z.infer<typeof TextToImageOptionSchema>;

const BaseTextToImageRequestSchema = z.object({
  provider: ImagingProviderSchema,
  prompt: z.string(),
  imageSize: z.object({
    width: z.number(),
    height: z.number(),
  }),
  numImages: z.number(),
  model: ImagingModelSchema,
  background: ImagingBackgroundSchema,
  option: TextToImageOptionSchema,
  // TextEdit 用の参照画像を Imaging にも許容
  imageDataUrls: z.array(z.string()),
});

export const TextToImageRequestSchema = BaseTextToImageRequestSchema;

export type TextToImageRequest = z.infer<typeof TextToImageRequestSchema>;

export const TextToImageResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type TextToImageResponse = z.infer<typeof TextToImageResponseSchema>;

export const PaddingSchema = z.object({
  top: z.number(),
  bottom: z.number(),
  left: z.number(),
  right: z.number(),
});
export type Padding = z.infer<typeof PaddingSchema>;

export const OutPaintRequestSchema = z.object({
  dataUrl: z.string(),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  padding: PaddingSchema,
});
export type OutPaintRequest = z.infer<typeof OutPaintRequestSchema>;

export const OutPaintResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type OutPaintResponse = z.infer<typeof OutPaintResponseSchema>;

export const RemoveBgRequestSchema = z.object({
  dataUrl: z.string(),
});
export type RemoveBgRequest = z.infer<typeof RemoveBgRequestSchema>;

export const RemoveBgResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type RemoveBgResponse = z.infer<typeof RemoveBgResponseSchema>;

export const ImageToVideoModelSchema = z.enum([
  "kling", 
  "FramePack", 
  "seedance/pro", 
  "seedance/lite", 
  "wan/v2.2-a14b/turbo",
  "wan-25-preview/image-to-video",
  "decart/lucy-14b",
  "minimax/hailuo-2.3-fast/standard/image-to-video",
  "failure"
]);
export type ImageToVideoModel = z.infer<typeof ImageToVideoModelSchema>;

export const ImageToVideoResolutionSchema = z.enum(["480p", "720p", "1080p"]);
export type ImageToVideoResolution = z.infer<typeof ImageToVideoResolutionSchema>;

export const ImageToVideoRequestSchema = z.object({
  prompt: z.string(),
  imageUrl: z.string(),
  duration: z.enum(["1", "2", "3", "4", "5", "6", "10"]),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]),
  resolution: ImageToVideoResolutionSchema,
  model: ImageToVideoModelSchema,
});
export type ImageToVideoRequest = z.infer<typeof ImageToVideoRequestSchema>;

export const ImageToVideoResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type ImageToVideoResponse = z.infer<typeof ImageToVideoResponseSchema>;

export const VisionRequestSchema = z.object({
  dataUrl: z.string(),
  prompt: z.string(),
});
export type VisionRequest = z.infer<typeof VisionRequestSchema>;

export const VisionResponseSchema = z.object({
  text: z.string().describe('In japanese.'),
});
export type VisionResponse = z.infer<typeof VisionResponseSchema>;

export const UpscaleRequestSchema = z.object({
  dataUrl: z.string(),
  scale: z.enum(["2x", "4x"]),
  provider: z.enum(["standard"]),
});
export type UpscaleRequest = z.infer<typeof UpscaleRequestSchema>;

export const UpscaleResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type UpscaleResponse = z.infer<typeof UpscaleResponseSchema>;

export const EraserRequestSchema = z.object({
  maskDataUrl: z.string(),
  imageDataUrl: z.string(),
});
export type EraserRequest = z.infer<typeof EraserRequestSchema>;

export const EraserResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type EraserResponse = z.infer<typeof EraserResponseSchema>;

export const InPaintRequestSchema = z.object({
  maskDataUrl: z.string(),
  imageDataUrl: z.string(),
  prompt: z.string(),
});
export type InPaintRequest = z.infer<typeof InPaintRequestSchema>;

export const InPaintResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type InPaintResponse = z.infer<typeof InPaintResponseSchema>;

export const TextMaskRequestSchema = z.object({
  dataUrl: z.string(),
});
export type TextMaskRequest = z.infer<typeof TextMaskRequestSchema>;

export const TextMaskResponseSchema = z.object({
  boxes:z.array(z.object({
    box_2d: z.object({
      x0: z.number(),
      y0: z.number(),
      x1: z.number(),
      y1: z.number(),
    }),
    text: z.string(),
    char_height: z.number(),
    orientation: z.enum(["horizontal", "vertical"]),
  }))
});
export type TextMaskResponse = z.infer<typeof TextMaskResponseSchema>;

export const TextEraserRequestSchema = z.object({
  imageDataUrl: z.string(),
});
export type TextEraserRequest = z.infer<typeof TextEraserRequestSchema>;

export const TextEraserResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type TextEraserResponse = z.infer<typeof TextEraserResponseSchema>;

export const LayerizeRequestSchema = z.object({
  dataUrl: z.string(),
  numLayers: z.number().min(1).max(4),
});
export type LayerizeRequest = z.infer<typeof LayerizeRequestSchema>;

export const LayerizeResponseSchema = z.object({
  requestId: z.string().describe("request id"),
  model: z.string().describe("model name"),
});
export type LayerizeResponse = z.infer<typeof LayerizeResponseSchema>;

export const ImagingStatusRequestSchema = z.object({
  action: ImagingActionSchema,
  requestId: z.string(),
  model: z.string(),
});
export type ImagingStatusRequest = z.infer<typeof ImagingStatusRequestSchema>;

export const ImagingStatusResponseSchema = z.object({
  status: z.string(),
  result: z.array(z.string()).optional(),
});
export type ImagingStatusResponse = z.infer<typeof ImagingStatusResponseSchema>;

