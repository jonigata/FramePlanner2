import { z } from "zod";
import { invoke } from "./utils/edgeFunctions/edgeFunctions";
import { type TransformTextRequest, TransformTextRequestSchema, TransformTextResponseSchema } from "./utils/edgeFunctions/types/transformTextTypes.d"
import {
  type ImageToVideoRequest, ImageToVideoRequestSchema, ImageToVideoResponseSchema,
  type TextToImageRequest, TextToImageRequestSchema, TextToImageResponseSchema,
  type OutPaintRequest, OutPaintRequestSchema, OutPaintResponseSchema,
  type RemoveBgRequest, RemoveBgRequestSchema, RemoveBgResponseSchema,
  type EraserRequest, EraserRequestSchema, EraserResponseSchema,
  type UpscaleRequest, UpscaleRequestSchema, UpscaleResponseSchema,
  type ImagingStatusRequest, ImagingStatusRequestSchema, ImagingStatusResponseSchema,
  type VisionRequest, VisionRequestSchema, VisionResponseSchema,
  type InPaintRequest, InPaintRequestSchema, InPaintResponseSchema,
  type TextEditRequest, TextEditRequestSchema, TextEditResponseSchema,
} from "./utils/edgeFunctions/types/imagingTypes.d";
import { EraseFileResponseSchema, GetDownloadUrlResponseSchema, GetUploadUrlResponseSchema } from "$protocolTypes/cloudFileTypes.d";
import { NotebookRequestSchema, NotebookWithInstructionRequestSchema, type NotebookRequest, type NotebookWithInstructionRequest, AdviseThemeResponseSchema, type AdviseThemeResponse } from "$protocolTypes/adviseTypes.d";
import { FunctionsHttpError } from '@supabase/supabase-js'

// リクエストスキーマの定義
const GetUploadUrlRequestSchema = z.object({ filename: z.string() });
const GetDownloadUrlRequestSchema = z.object({ filename: z.string() });
const EraseFileRequestSchema = z.object({ filename: z.string() });

import {
  CheckUsernameAvailableRequestSchema, CheckUsernameAvailableResponseSchema,
  GetProfileRequestSchema, GetProfileResponseSchema,
  RecordPublicationRequestSchema, RecordPublicationResponseSchema, type RecordPublicationRequest
} from "./utils/edgeFunctions/types/snsTypes.d";
import {
  UpdateProfileRequestSchema, UpdateProfileResponseSchema, type UpdateProfileRequest
} from "./utils/edgeFunctions/types/snsTypes.d";


import { CharactersBaseSchema } from "$bookTypes/notebook";
import { StoryboardSchema } from "$bookTypes/storyboard";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { developmentFlag } from "./utils/developmentFlagStore";
import { get as storeGet } from "svelte/store";
import { createCanvasFromBlob, createVideoFromBlob } from './lib/layeredCanvas/tools/imageUtil';
import { runResilientTask } from "./utils/resilientTask";

export let supabase: SupabaseClient;

export function initializeSupabase() {
  let supabaseUrl = "http://localhost:54321";
  let supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

  if (!storeGet(developmentFlag)) {
    supabaseUrl = "https://khjwscwgloxxmpzenxln.supabase.co";
    supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoandzY3dnbG94eG1wemVueGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0OTQxNzAsImV4cCI6MjA1NzA3MDE3MH0.e5V-hhSQCW2WLlyn70QDSsftyVGtdrlXnvTR8Jtsiiw";
  }

  supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      realtime: {
      }
    }  
  );
}

export async function transformText(req: TransformTextRequest) {
  return await invoke("charged/utilities/transform", req, TransformTextRequestSchema, TransformTextResponseSchema);
}

export async function text2Image(req: TextToImageRequest) {
  return await invoke("charged/imaging/t2i", req, TextToImageRequestSchema, TextToImageResponseSchema);
}

export async function image2Video(req: ImageToVideoRequest) {
  return await invoke("charged/imaging/i2v", req, ImageToVideoRequestSchema, ImageToVideoResponseSchema);
}

export async function imagingStatus(req: ImagingStatusRequest) {
  return await invoke("charged/imaging/status", req, ImagingStatusRequestSchema, ImagingStatusResponseSchema);
}

export async function outPaint(req: OutPaintRequest) {
  return await invoke("charged/imaging/outpaint", req, OutPaintRequestSchema, OutPaintResponseSchema);
}

export async function inPaint(req: InPaintRequest) {
  return await invoke("charged/imaging/inpaint", req, InPaintRequestSchema, InPaintResponseSchema);
}

export async function textEdit(req: InPaintRequest) {
  return await invoke("charged/imaging/textedit", req, TextEditRequestSchema, TextEditResponseSchema);
}

export async function removeBg(req: RemoveBgRequest) {
  return await invoke("charged/imaging/removebg", req, RemoveBgRequestSchema, RemoveBgResponseSchema);
}

export async function eraser(req: EraserRequest) {
  return await invoke("charged/imaging/eraser", req, EraserRequestSchema, EraserResponseSchema);
}

export async function upscale(req: UpscaleRequest) {
  return await invoke("charged/imaging/upscale", req, UpscaleRequestSchema, UpscaleResponseSchema);
}

export async function adviseTheme(req: NotebookRequest) {
  return await invoke("charged/advise/theme", req, NotebookRequestSchema, AdviseThemeResponseSchema);
}

export async function adviseCharacters(req: NotebookRequest) {
  return await invoke("charged/advise/characters", req, NotebookRequestSchema, CharactersBaseSchema);
}

export async function advisePlot(req: NotebookWithInstructionRequest) {
  return await invoke("charged/advise/plot", req, NotebookWithInstructionRequestSchema, z.string());
}

export async function adviseScenario(req: NotebookRequest) {
  return await invoke("charged/advise/scenario", req, NotebookRequestSchema, z.string());
}

export async function adviseCritique(req: NotebookRequest) {
  return await invoke("charged/advise/critique", req, NotebookRequestSchema, z.string());
}

export async function adviseStoryboard(req: NotebookRequest) {
  return await invoke("charged/advise/storyboard", req, NotebookRequestSchema, StoryboardSchema);
}

export async function getUploadUrl(filename: string) {
  return await invoke("cloudstorage/getuploadurl", { filename }, GetUploadUrlRequestSchema, GetUploadUrlResponseSchema);
}

export async function getDownloadUrl(filename: string) {
  return await invoke("cloudstorage/getdownloadurl", { filename }, GetDownloadUrlRequestSchema, GetDownloadUrlResponseSchema);
}

export async function eraseFile(filename: string) {
  return await invoke("cloudstorage/eraseFile", { filename }, EraseFileRequestSchema, EraseFileResponseSchema);
}

export async function getPublishUrl(filename: string) {
  return await invoke("publishing/getpublishurl", { filename }, GetUploadUrlRequestSchema, GetUploadUrlResponseSchema);
}

export async function getTransportUrl(filename: string) {
  return await invoke("publishing/gettransporturl", { filename }, GetUploadUrlRequestSchema, GetUploadUrlResponseSchema);
}

export async function checkUsernameAvailable(username: string) {
  return await invoke("sns/profile/checkusernameavailable", { username }, CheckUsernameAvailableRequestSchema, CheckUsernameAvailableResponseSchema);
}

export async function updateProfile(profile: UpdateProfileRequest) {
  return await invoke("sns/profile/updateprofile", profile, UpdateProfileRequestSchema, UpdateProfileResponseSchema);
}

export async function getMyProfile() {
  return await invoke("sns/profile/getmyprofile", {}, z.object({}), GetProfileResponseSchema);
}

export async function recordPublication(req: RecordPublicationRequest) {
  return await invoke("sns/publication/recordpublication", req, RecordPublicationRequestSchema, RecordPublicationResponseSchema);
}

export async function notifyShare(text: string) {
}

export async function pollMediaStatus(mediaReference: { mediaType: 'image' | 'video', mode: string, requestId: string}) {
  const isVideo = mediaReference.mediaType === 'video';
  let interval = isVideo ? 10000 : 1000;

  if (mediaReference.mode.startsWith('gpt')) {
    interval = 5000;
  }

  async function* doIt() {
    let urls: string[] | undefined;
    while (!urls) {
      const status = await imagingStatus(mediaReference);
      console.log(status);
      switch (status.status) {
      case "IN_QUEUE":
        yield;
        break;
      case "IN_PROGRESS":
        yield;
        break;
      case "COMPLETED":
        urls = status.result;
        break;
      } 
    }
    return urls;
  }

  const urls = await runResilientTask(
    doIt, 
    (error) => { 
      if (error instanceof FunctionsHttpError) {
        if (error.context.status === 422) {
          throw error;
        }
      }
      return true;
    }, 
    {interval});

  const mediaResources: (HTMLCanvasElement | HTMLVideoElement)[] = await Promise.all(
    urls.map(async url => {
      const response = await fetch(url);
      const blob = await response.blob();
      if (isVideo) {
        const video = await createVideoFromBlob(blob);
        return video;
      } else {
        const image = await createCanvasFromBlob(blob);
        return image;
      }
    }));

  return { urls, mediaResources };
}

export async function recognizeImage(req: VisionRequest) {
  return await invoke("charged/utilities/vision", req, VisionRequestSchema, VisionResponseSchema);
}

const ContactRequestSchema = z.object({
  message: z.string(),
});
const ContactResponseSchema = z.object({
  message: z.string(),
});
type ContactRequest = z.infer<typeof ContactRequestSchema>;

export async function contact(req: ContactRequest) {
  return await invoke("contact/contact", req, ContactRequestSchema, ContactResponseSchema);
}
