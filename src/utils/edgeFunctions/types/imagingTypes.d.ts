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
  request_id: z.string().describe("request id"),
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
  request_id: z.string().describe("request id"),
});
export type OutPaintResponse = z.infer<typeof OutPaintResponseSchema>;

export const RemoveBgRequestSchema = z.object({
  dataUrl: z.string(),
});
export type RemoveBgRequest = z.infer<typeof RemoveBgRequestSchema>;

export const RemoveBgResponseSchema = z.object({
  request_id: z.string().describe("request id"),
});
export type RemoveBgResponse = z.infer<typeof RemoveBgResponseSchema>;

export const ImagingStatusRequestSchema = z.object({
  mode: z.string(),
  request_id: z.string(),
});
export type ImagingStatusRequest = z.infer<typeof ImagingStatusRequestSchema>;

export const ImagingStatusResponseSchema = z.object({
  status: z.string(),
  result: z.array(z.string()).optional(),
});
export type ImagingStatusResponse = z.infer<typeof ImagingStatusResponseSchema>;