// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { z } from "zod";

export const IsSuspendedRequestSchema = z.object({
  username: z.string(),
});
export type IsSuspendedRequest = z.infer<typeof IsSuspendedRequestSchema>;

export const IsSuspendedResponseSchema = z.object({
  is_suspended: z.boolean(),
});
export type IsSuspendedResponse = z.infer<typeof IsSuspendedResponseSchema>;

export const CheckUsernameAvailableRequestSchema = z.object({
  username: z.string(),
});
export type CheckUsernameAvailableRequest = z.infer<typeof CheckUsernameAvailableRequestSchema>;

export const CheckUsernameAvailableResponseSchema = z.object({
  is_available: z.boolean(),
  reason: z.string(),
});
export type CheckUsernameAvailableResponse = z.infer<typeof CheckUsernameAvailableResponseSchema>;

export const UpdateProfileRequestSchema = z.object({
  username: z.string().min(1),
  display_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  bio: z.string(),
  related_url: z.string(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const UpdateProfileResponseSchema = z.object({
  success: z.boolean(),
});
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;

export const GetProfileRequestSchema = z.object({
  username: z.string(),
});
export type GetProfileRequest = z.infer<typeof GetProfileRequestSchema>;

export const GetProfileResponseSchema = z.object({
  username: z.string(),
  display_name: z.string(),
  email: z.string(),
  bio: z.string(),
  related_url: z.string(),
  is_admin: z.boolean(),
}).nullable();
export type GetProfileResponse = z.infer<typeof GetProfileResponseSchema>;


export const RecordPublicationRequestSchema = z.object({
  title: z.string(),
  description: z.string(),
  cover_url: z.string(),
  content_url: z.string(),
  thumbnail_url: z.string(),
  socialcard_url: z.string().nullable(),
  related_url: z.string().nullable(),
  is_public: z.boolean(),
});
export type RecordPublicationRequest = z.infer<typeof RecordPublicationRequestSchema>;

export const RecordPublicationResponseSchema = z.object({
  id: z.string(),
});
export type RecordPublicationResponse = z.infer<typeof RecordPublicationResponseSchema>;

export const UpdatePublicationRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  is_public: z.boolean(),
  related_url: z.string(),
});
export type UpdatePublicationRequest = z.infer<typeof UpdatePublicationRequestSchema>;

export const UpdatePublicationResponseSchema = z.object({});
export type UpdatePublicationResponse = z.infer<typeof UpdatePublicationResponseSchema>;

export const CommentRequestSchema = z.object({
  id: z.string(),
  content: z.string(),
});
export type CommentRequest = z.infer<typeof CommentRequestSchema>;

export const CommentResponseSchema = z.object({});
export type CommentResponse = z.infer<typeof CommentResponseSchema>;

export const SetFavRequestSchema = z.object({
  id: z.string(),
  is_fav: z.boolean(),
});
export type SetFavRequest = z.infer<typeof SetFavRequestSchema>;

export const SetFavResponseSchema = z.object({});
export type SetFavResponse = z.infer<typeof SetFavResponseSchema>;

export const GetCommentsRequestSchema = z.object({
  id: z.string(),
});
export type GetCommentsRequest = z.infer<typeof GetCommentsRequestSchema>;

export const GetCommentsResponseSchema = z.object(
  {
    comments: z.array(z.object({
      id: z.string(),
      author_username: z.string(),
      author_display_name: z.string(),
      content: z.string(),
      created_at: z.string(),
    }))
  });
export type GetCommentsResponse = z.infer<typeof GetCommentsResponseSchema>;

export const AdminSuspendUserRequestSchema = z.object({
  username: z.string(),
  is_suspended: z.boolean(),
});
export type AdminSuspendUserRequest = z.infer<typeof AdminSuspendUserRequestSchema>;

export const AdminSuspendUserResponseSchema = z.object({});
export type AdminSuspendUserResponse = z.infer<typeof AdminSuspendUserResponseSchema>;

export const AdminSuspendPublicationRequestSchema = z.object({
  id: z.string(),
  is_suspended: z.boolean(),
});
export type AdminSuspendPublicationRequest = z.infer<typeof AdminSuspendPublicationRequestSchema>;

export const AdminSuspendPublicationResponseSchema = z.object({});
export type AdminSuspendPublicationResponse = z.infer<typeof AdminSuspendPublicationResponseSchema>;

export const AdminSendMailRequestSchema = z.object({
  username: z.string(),
  title: z.string(),
  content: z.string(),
});
export type AdminSendMailRequest = z.infer<typeof AdminSendMailRequestSchema>;

export const AdminSendMailResponseSchema = z.object({});
export type AdminSendMailResponse = z.infer<typeof AdminSendMailResponseSchema>;

export const GetMailsRequestSchema = z.object({});
export type GetMailsRequest = z.infer<typeof GetMailsRequestSchema>;

export const GetMailsResponseSchema = z.object({
  mails: z.array(z.object({
    id: z.string(),
    sender_username: z.string(),
    sender_display_name: z.string(),
    title: z.string(),
    content: z.string(),
    created_at: z.string(),
  })),
});
export type GetMailsResponse = z.infer<typeof GetMailsResponseSchema>;

export const GetInboxRequestSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});
export type GetInboxRequest = z.infer<typeof GetInboxRequestSchema>;

export const GetInboxResponseSchema = z.object({
  inboxes: z.array(z.object({
    id: z.string(),
    created_at: z.string(),
    sender_username: z.string().nullable(),
    sender_display_name: z.string().nullable(),
    title: z.string(),
    content: z.string(),
    read_at: z.string().nullable()
  })),
  total: z.number(),
  hasMore: z.boolean()
});
export type GetInboxResponse = z.infer<typeof GetInboxResponseSchema>;

export const ReadMailRequestSchema = z.object({
  id: z.string(),
});
export type ReadMailRequest = z.infer<typeof ReadMailRequestSchema>;

export const ReadMailResponseSchema = z.object({});
export type ReadMailResponse = z.infer<typeof ReadMailResponseSchema>;
