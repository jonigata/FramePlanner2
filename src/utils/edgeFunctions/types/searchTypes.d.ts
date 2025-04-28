import { z } from 'zod';

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(20),
  type: z.enum(['all', 'works', 'profiles']).optional().default('all')
});

export const SearchResultItemSchema = z.object({
  type: z.enum(['work', 'profile']),
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  username: z.string().optional(),
  display_name: z.string().optional(),
  thumbnail_url: z.string().optional(),
  created_at: z.string()
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  has_more: z.boolean()
});

export const AdjacentWorkRequestSchema = z.object({
  query: z.string().min(1).max(100),
  workId: z.string()
});

/**
 * nextWorkId: 指定workIdより新しい（created_atが大きい＝降順で前に並ぶ）workId
 * prevWorkId: 指定workIdより古い（created_atが小さい＝降順で次に並ぶ）workId
 */
export const AdjacentWorkResponseSchema = z.object({
  nextWorkId: z.string().nullable(), // created_at > target（新しい方、降順で前）
  prevWorkId: z.string().nullable()  // created_at < target（古い方、降順で次）
});
