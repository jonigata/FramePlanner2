// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { z } from "zod";

export const TextToImageRequestSchema = z.object({
  prompt: z.string(),
  image_size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  num_images: z.number(),
  mode: z.string(),
});
export type TextToImageRequest = z.infer<typeof TextToImageRequestSchema>;

export const TextToImageResponseSchema = z.object({
  images: z.array(z.string().describe("base64 encoded image")),
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
  images: z.array(z.string().describe("base64 encoded image")),
});
export type OutPaintResponse = z.infer<typeof OutPaintResponseSchema>;

export const RemoveBgRequestSchema = z.object({
  dataUrl: z.string(),
});
export type RemoveBgRequest = z.infer<typeof RemoveBgRequestSchema>;

export const RemoveBgResponseSchema = z.object({
  dataUrl: z.string(),
});
export type RemoveBgResponse = z.infer<typeof RemoveBgResponseSchema>;


