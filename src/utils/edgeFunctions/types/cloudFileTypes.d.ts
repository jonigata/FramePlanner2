// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { z } from "zod";

const FileRequestSchema = z.object({
  filename: z.string(),
});

export const GetUploadUrlRequestSchema = z.object({
  filename: z.string(),
  test: z.boolean().optional(),
});
export type GetUploadUrlRequest = z.infer<typeof GetUploadUrlRequestSchema>;

export const GetUploadUrlResponseSchema = z.object({
  apiUrl: z.string(),
  url: z.string(),
  token: z.string(),
  filename: z.string(),
});
export type GetUploadUrlResponse = z.infer<typeof GetUploadUrlResponseSchema>;

export const GetDownloadUrlRequestSchema = FileRequestSchema;
export type GetDownloadUrlRequest = z.infer<typeof GetDownloadUrlRequestSchema>;

export const GetDownloadUrlResponseSchema = z.object({
  url: z.string(),
});
export type GetDownloadUrlResponse = z.infer<typeof GetDownloadUrlResponseSchema>;

export const EraseFileRequestSchema = FileRequestSchema;
export type EraseFileRequest = z.infer<typeof EraseFileRequestSchema>;

export const EraseFileResponseSchema = z.object({
  success: z.boolean(),
});
export type EraseFileResponse = z.infer<typeof EraseFileResponseSchema>;
