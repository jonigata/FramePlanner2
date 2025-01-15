import { z } from "zod";
import { invoke } from "./utils/edgeFunctions/edgeFunctions";
import { type TransformTextRequest, TransformTextResponseSchema } from "./utils/edgeFunctions/types/transformTextTypes.d"
import { type TextToImageRequest, TextToImageResponseSchema } from "./utils/edgeFunctions/types/imagingTypes.d";
import { type OutPaintRequest, OutPaintResponseSchema } from "./utils/edgeFunctions/types/imagingTypes.d";
import { type RemoveBgRequest, RemoveBgResponseSchema } from "./utils/edgeFunctions/types/imagingTypes.d";
import { type ImagingStatusRequest, ImagingStatusResponseSchema } from "./utils/edgeFunctions/types/imagingTypes.d";
import { EraseFileResponseSchema, GetDownloadUrlResponseSchema, GetUploadUrlResponseSchema } from "$protocolTypes/cloudFileTypes.d";
import { CheckUsernameAvailableResponseSchema, GetProfileResponseSchema, RecordPublicationResponseSchema, type RecordPublicationRequest } from "./utils/edgeFunctions/types/snsTypes.d";
import { UpdateProfileResponseSchema, type UpdateProfileRequest } from "./utils/edgeFunctions/types/snsTypes.d";
import { Notebook, Characters } from "$bookTypes/notebook";
import { Storyboard } from "$bookTypes/storyboard";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { developmentFlag } from "./utils/developmentFlagStore";
import { get as storeGet } from "svelte/store";
import { createImageFromBlob } from './lib/layeredCanvas/tools/imageUtil';

export let supabase: SupabaseClient;

export function initializeSupabase() {
  let supabaseUrl = "http://localhost:54321";
  let supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.gpZggwJtk1lUvFnttnL1yLgrXxfZbPf2mWiWUHMntLg";

  if (!storeGet(developmentFlag)) {
    supabaseUrl = "https://gajoxnktxfjazbkajlkm.supabase.co";
     supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdham94bmt0eGZqYXpia2FqbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0Nzk1OTcsImV4cCI6MjA1MTA1NTU5N30.pXMpN0F2lu9P5TJ9yts8XVGEGzpHmyWkBU4TaRMtnXc";
  }

  supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {realtime: {},}  
  );
}

export async function transformText(req: TransformTextRequest) {
  return await invoke("charged/utilities/transform", req, TransformTextResponseSchema);
}

export async function text2Image(req: TextToImageRequest) {
  return await invoke("charged/imaging/t2i", req, TextToImageResponseSchema);
}

export async function imagingStatus(req: ImagingStatusRequest) {
  return await invoke("charged/imaging/status", req, ImagingStatusResponseSchema);
}

export async function outPaint(req: OutPaintRequest) {
  return await invoke("charged/imaging/outpaint", req, OutPaintResponseSchema);
}

export async function removeBg(req: RemoveBgRequest) {
  return await invoke("charged/imaging/removebg", req, RemoveBgResponseSchema);
}

export async function adviseTheme(req: Notebook) {
  return await invoke("charged/advise/theme", req, z.string());
}

export async function adviseCharacters(notebook: Notebook) {
  return await invoke("charged/advise/characters", notebook, Characters);
}

export async function advisePlot(notebook: Notebook, instruction: string) {
  return await invoke("charged/advise/plot", { notebook, instruction }, z.string());
}

export async function adviseScenario(req: Notebook) {
  return await invoke("charged/advise/scenario", req, z.string());
}

export async function adviseCritique(req: Notebook) {
  return await invoke("charged/advise/critique", req, z.string());
}

export async function adviseStoryboard(req: Notebook) {
  return await invoke("charged/advise/storyboard", req, Storyboard);
}

export async function getUploadUrl(filename: string) {
  return await invoke("cloudstorage/getuploadurl", { filename }, GetUploadUrlResponseSchema);
}

export async function getDownloadUrl(filename: string) {
  return await invoke("cloudstorage/getdownloadurl", { filename }, GetDownloadUrlResponseSchema);
}

export async function eraseFile(filename: string) {
  return await invoke("cloudstorage/eraseFile", { filename }, EraseFileResponseSchema);
}

export async function getPublishUrl(filename: string) {
  return await invoke("publishing/getpublishurl", { filename }, GetUploadUrlResponseSchema);
}

export async function getTransportUrl(filename: string) {
  return await invoke("publishing/gettransporturl", { filename }, GetUploadUrlResponseSchema);
}

export async function checkUsernameAvailable(username: string) {
  return await invoke("sns/profile/checkusernameavailable", { username }, CheckUsernameAvailableResponseSchema);
}

export async function updateProfile(profile: UpdateProfileRequest) {
  return await invoke("sns/profile/updateprofile", profile, UpdateProfileResponseSchema);
}

export async function getMyProfile() {
  return await invoke("sns/profile/getmyprofile", {}, GetProfileResponseSchema);
}

export async function recordPublication(req: RecordPublicationRequest) {
  return await invoke("sns/publication/recordpublication", req, RecordPublicationResponseSchema);
}

export async function notifyShare(text: string) {
}

export async function pollImagingStatus(mode: string, request_id: string) {
  let images: string[] | undefined;
  while (!images) {
    const status = await imagingStatus({mode, request_id});
    console.log(status);
    switch (status.status) {
      case "IN_QUEUE":
      await new Promise(resolve => setTimeout(resolve, 1000));
        break;  
      case "IN_PROGRESS":
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      case "COMPLETED":
        images = status.result!;
        break;
    } 
  }

  const imageElements: HTMLImageElement[] = await Promise.all(images.map(async imageUrl => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const image = await createImageFromBlob(blob);
    return image;
  }));

  return imageElements;
}
