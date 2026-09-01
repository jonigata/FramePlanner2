import { z } from "zod";
import { invoke } from "./utils/edgeFunctions/edgeFunctions";
import { type TransformTextRequest, TransformTextRequestSchema, TransformTextResponseSchema } from "./utils/edgeFunctions/types/transformTextTypes.d"
import {
  type ImagingAction,
  type ImageToVideoRequest, ImageToVideoRequestSchema, ImageToVideoResponseSchema,
  type TextToImageRequest, TextToImageRequestSchema, TextToImageResponseSchema,
  type OutPaintRequest, OutPaintRequestSchema, OutPaintResponseSchema,
  type RemoveBgRequest, RemoveBgRequestSchema, RemoveBgResponseSchema,
  type EraserRequest, EraserRequestSchema, EraserResponseSchema,
  type UpscaleRequest, UpscaleRequestSchema, UpscaleResponseSchema,
  type ImagingStatusRequest, ImagingStatusRequestSchema, ImagingStatusResponseSchema,
  type VisionRequest, VisionRequestSchema, VisionResponseSchema,
  type InPaintRequest, InPaintRequestSchema, InPaintResponseSchema,
  type TextMaskRequest, TextMaskRequestSchema, TextMaskResponseSchema,
  type TextEraserRequest, TextEraserRequestSchema, TextEraserResponseSchema,
  type LayerizeRequest, LayerizeRequestSchema, LayerizeResponseSchema,
} from "./utils/edgeFunctions/types/imagingTypes.d";
import { EraseFileResponseSchema, GetDownloadUrlResponseSchema, GetUploadUrlResponseSchema } from "$protocolTypes/cloudFileTypes.d";
import { type ListMaterialsRequest, ListMaterialsRequestSchema, ListMaterialsResponseSchema, type RecordMaterialRequest, RecordMaterialRequestSchema, RecordMaterialResponseSchema } from "$protocolTypes/materialTypes.d";
import { type ListActorsRequest, ListActorsRequestSchema, ListActorsResponseSchema, type RecordActorRequest, RecordActorRequestSchema, RecordActorResponseSchema } from "./utils/edgeFunctions/types/actorTypes.d";
import { NotebookRequestSchema, NotebookWithInstructionRequestSchema, type NotebookRequest, type NotebookWithInstructionRequest, AdviseThemeRequestSchema, type AdviseThemeRequest, AdviseThemeResponseSchema, type AdviseThemeResponse, AdvisePageGenerationResponseSchema } from "$protocolTypes/adviseTypes.d";
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

// TextEdit は TextToImage に統合（imageDataUrls の数で分岐）
export async function textEdit(req: TextToImageRequest) {
  return await invoke("charged/imaging/t2i", req, TextToImageRequestSchema, TextToImageResponseSchema);
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

export async function textMask(req: TextMaskRequest) {
  return await invoke("charged/imaging/textmask", req, TextMaskRequestSchema, TextMaskResponseSchema);
}

export async function textEraser(req: TextEraserRequest) {
  return await invoke("charged/imaging/texteraser", req, TextEraserRequestSchema, TextEraserResponseSchema);
}

export async function layerize(req: LayerizeRequest) {
  return await invoke("charged/imaging/layerize", req, LayerizeRequestSchema, LayerizeResponseSchema);
}

export async function adviseTheme(req: AdviseThemeRequest) {
  return await invoke("charged/advise/theme", req, AdviseThemeRequestSchema, AdviseThemeResponseSchema);
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

export async function advisePageGeneration(req: NotebookRequest) {
  return await invoke("charged/advise/pageGeneration", req, NotebookRequestSchema, AdvisePageGenerationResponseSchema);
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

export async function getMaterialsUrl(filename: string) {
  return await invoke("publishing/getmaterialsurl", { filename }, GetUploadUrlRequestSchema, GetUploadUrlResponseSchema);
}

export async function getActorsUrl(filename: string) {
  return await invoke("publishing/getactorsurl", { filename }, GetUploadUrlRequestSchema, GetUploadUrlResponseSchema);
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

export async function recordMaterial(req: RecordMaterialRequest) {
  return await invoke("tools/recordmaterial", req, RecordMaterialRequestSchema, RecordMaterialResponseSchema);
}

export async function listMaterials(req: ListMaterialsRequest) {
  return await invoke("tools/listmaterials", req, ListMaterialsRequestSchema, ListMaterialsResponseSchema);
}

export async function recordActor(req: RecordActorRequest) {
  return await invoke("tools/recordactor", req, RecordActorRequestSchema, RecordActorResponseSchema);
}

export async function listActors(req: ListActorsRequest) {
  return await invoke("tools/listactors", req, ListActorsRequestSchema, ListActorsResponseSchema);
}

export async function notifyShare(text: string) {
}

export async function pollMediaStatus(mediaReference: { mediaType: 'image' | 'video', action: ImagingAction, requestId: string, model: string }) {
  const isVideo = mediaReference.mediaType === 'video';
  let interval = isVideo && mediaReference.model != 'failure' ? 10000 : 1000;
  console.log("pollMediaStatus", mediaReference, interval);

  if (mediaReference.model.startsWith('gpt')) {
    interval = 5000;
  }

  // 最初の10回は上記 interval を維持し、以後は徐々に遅くする（上限あり）
  // 実効インターバル = interval（runResilientTask側の待機） + 追加待機（こちらで付与）
  let pollCount = 0;
  const maxInterval = isVideo ? 60000 : 20000; // 合計インターバルの上限
  const growth = 1.1; // 緩やかな増加率

  // タブが非表示になったことを追跡し、復帰時に即座にポーリングするため
  let wasHidden = false;
  const trackVisibility = () => {
    if (document.hidden) {
      wasHidden = true;
    }
  };
  document.addEventListener('visibilitychange', trackVisibility);

  const waitVisibleOrTimeout = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
      // API呼出中にタブが非表示→表示に戻った場合、即座にresolve
      if (wasHidden && !document.hidden) {
        wasHidden = false;
        console.log(`[DIAG pollMedia] extraWait(${ms}ms) → wasHiddenスキップ`);
        resolve();
        return;
      }
      console.log(`[DIAG pollMedia] extraWait(${ms}ms) 開始, hidden=${document.hidden}`);

      let timerId: number | null = null;
      let finished = false;

      const cleanup = () => {
        if (finished) return;
        finished = true;
        if (timerId !== null) clearTimeout(timerId);
        document.removeEventListener('visibilitychange', onVisibility);
        resolve();
      };

      const onVisibility = () => {
        if (!document.hidden) {
          wasHidden = false;
          console.log(`[DIAG pollMedia] extraWait(${ms}ms) → タブ復帰で即resolve`);
          cleanup();
        } else if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
          console.log(`[DIAG pollMedia] extraWait(${ms}ms) → タブ非表示でタイマー停止`);
        }
      };

      document.addEventListener('visibilitychange', onVisibility);

      if (!document.hidden) {
        timerId = window.setTimeout(() => {
          console.log(`[DIAG pollMedia] extraWait(${ms}ms) → タイマー満了`);
          cleanup();
        }, ms);
      }
    });

  async function* doIt() {
    console.log("doit");
    let urls: string[] | undefined;
    while (!urls) {
      console.log(`[DIAG pollMedia] poll実行 ${new Date().toLocaleTimeString()}`);
      const status = await imagingStatus(mediaReference);
      console.log(status);
      switch (status.status) {
      case "IN_QUEUE":
        // ポーリング回数をカウントし、11回目以降は追加待機を入れる
        pollCount += 1;
        if (pollCount > 10) {
          const factor = Math.pow(growth, pollCount - 10);
          const target = Math.min(Math.round(interval * factor), maxInterval);
          const extra = Math.max(0, target - interval);
          if (extra > 0) {
            await waitVisibleOrTimeout(extra);
          }
        }
        yield;
        break;
      case "IN_PROGRESS":
        pollCount += 1;
        if (pollCount > 10) {
          const factor = Math.pow(growth, pollCount - 10);
          const target = Math.min(Math.round(interval * factor), maxInterval);
          const extra = Math.max(0, target - interval);
          if (extra > 0) {
            await waitVisibleOrTimeout(extra);
          }
        }
        yield;
        break;
      case "COMPLETED":
        urls = status.result;
        console.log("[DEBUG pollMediaStatus] COMPLETED, urls:", urls);
        break;
      default:
        console.warn("[DEBUG pollMediaStatus] Unhandled status:", status.status, status);
        break;
      }
    }
    return urls;
  }

  const urls = await runResilientTask(
    doIt, 
    (error) => { 
      console.log("polling error", error);
      // ZodError は不正なレスポンススキーマ等の恒久的エラーとみなし、再試行せず即座に伝播
      if (error instanceof z.ZodError) {
        throw error;
      }
      if (error instanceof FunctionsHttpError) {
        const code = error.context?.status;
        if (code === 422 || code === 404 || code === 401 || code === 500) {
          throw error;
        }
      }
      return true;
    }, 
    {interval});
  document.removeEventListener('visibilitychange', trackVisibility);

  const fetchStart = performance.now();
  console.log("[DIAG pollMedia] COMPLETED → fetch開始", urls.length, "件");

  // たまにfetchが失敗することがあるので、指数バックオフでリトライ
  const retryDelays = [1000, 4000, 16000]; // 1秒、4秒、16秒後にリトライ

  async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < retryDelays.length) {
          const delay = retryDelays[attempt];
          console.log(`[DEBUG pollMediaStatus] Fetch failed, retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  const mediaResources: (HTMLCanvasElement | HTMLVideoElement)[] = await Promise.all(
    urls.map(async (url: string, i: number) => {
      return await fetchWithRetry(async () => {
        console.log(`[DEBUG pollMediaStatus] Fetching image ${i}:`, url.substring(0, 100));
        const response = await fetch(url);
        console.log(`[DEBUG pollMediaStatus] Fetch response ${i}:`, response.status, response.ok);
        if (!response.ok) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
        const blob = await response.blob();
        console.log(`[DEBUG pollMediaStatus] Blob ${i}:`, blob.size, blob.type);
        if (isVideo) {
          const video = await createVideoFromBlob(blob);
          return video;
        } else {
          const image = await createCanvasFromBlob(blob);
          console.log(`[DEBUG pollMediaStatus] Canvas ${i}:`, image.width, image.height);
          return image;
        }
      });
    }));

  console.log(`[DIAG pollMedia] fetch完了 ${(performance.now() - fetchStart).toFixed(0)}ms, ${mediaResources.length}件`);
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
