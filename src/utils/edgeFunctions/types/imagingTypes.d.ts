// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { z } from "zod";

export const ImagingBackgroundSchema = z.enum(["opaque", "transparent"]);
export type ImagingBackground = z.infer<typeof ImagingBackgroundSchema>;

export const ImagingModeSchema = z.enum(["schnell", "pro", "chibi", "manga", "gpt-image-1/low", "gpt-image-1/medium", "gpt-image-1/high"]);
export type ImagingMode = "schnell" | "pro" | "chibi" | "manga" | "gpt-image-1/low" | "gpt-image-1/medium" | "gpt-image-1/high";

export const ImagingProviderSchema = z.enum(["flux", "gpt-image-1"]);
export type ImagingProvider = z.infer<typeof ImagingProvider>;

export const TextToImageRequestSchema = z.object({
  provider: ImagingProviderSchema,
  prompt: z.string(),
  imageSize: z.object({
    width: z.number(),
    height: z.number(),
  }),
  numImages: z.number(),
  mode: ImagingModeSchema,
  background: ImagingBackgroundSchema,
});
export type TextToImageRequest = z.infer<typeof TextToImageRequestSchema>;

export const TextToImageResponseSchema = z.object({
  requestId: z.string().describe("request id"),
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
});
export type OutPaintResponse = z.infer<typeof OutPaintResponseSchema>;

export const RemoveBgRequestSchema = z.object({
  dataUrl: z.string(),
});
export type RemoveBgRequest = z.infer<typeof RemoveBgRequestSchema>;

export const RemoveBgResponseSchema = z.object({
  requestId: z.string().describe("request id"),
});
export type RemoveBgResponse = z.infer<typeof RemoveBgResponseSchema>;

export const ImagingStatusRequestSchema = z.object({
  mode: z.string(),
  requestId: z.string(),
});
export type ImagingStatusRequest = z.infer<typeof ImagingStatusRequestSchema>;

export const ImagingStatusResponseSchema = z.object({
  status: z.string(),
  result: z.array(z.string()).optional(),
});
export type ImagingStatusResponse = z.infer<typeof ImagingStatusResponseSchema>;

export const ImageToVideoModelSchema = z.enum(["kling", "FramePack"]);
export type ImageToVideoModel = z.infer<typeof ImageToVideoModelSchema>;

export const ImageToVideoRequestSchema = z.object({
  prompt: z.string(),
  imageUrl: z.string(),
  duration: z.enum(["1", "2", "3", "4", "5", "10"]),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]),
  model: ImageToVideoModelSchema,
});
export type ImageToVideoRequest = z.infer<typeof ImageToVideoRequestSchema>;

export const ImageToVideoResponseSchema = z.object({
  requestId: z.string().describe("request id"),
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
});
export type UpscaleResponse = z.infer<typeof UpscaleResponseSchema>;

export const EraserRequestSchema = z.object({
  maskDataUrl: z.string(),
  imageDataUrl: z.string(),
});
export type EraserRequest = z.infer<typeof EraserRequestSchema>;

export const EraserResponseSchema = z.object({
  requestId: z.string().describe("request id"),
});
export type EraserResponse = z.infer<typeof EraserResponseSchema>;


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
    mask: z.string(),
    text: z.string(),
  }))
});
export type TextMaskResponse = z.infer<typeof TextMaskResponseSchema>;
