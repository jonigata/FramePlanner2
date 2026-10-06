import { get } from 'svelte/store';
import { executeProcessAndNotify } from '../utils/executeProcessAndNotify';
import { generateImage, isContentsPolicyViolationError, supportsRefImages, getRefMaxForMode, getRefRangeForMode } from '../utils/feathralImaging';
import { toastStore } from '@skeletonlabs/skeleton';
import { _ } from 'svelte-i18n';
import { image2Video, pollMediaStatus } from '../supabase';
import { mainBookFileSystem } from '../filemanager/fileManagerStore';
import { saveRequest } from '../filemanager/warehouse';
import { fitCanvasToRange } from '../lib/layeredCanvas/tools/imageUtil';
import type { Media } from '../lib/layeredCanvas/dataModels/media';
import type { MediaItem, TimelineItem, MessageItem } from './timelineTypes';
import type { ImagingModel, ImageToVideoModel, ImageToVideoRequest } from '$protocolTypes/imagingTypes';
import type { Writable } from 'svelte/store';
import {
  DEFAULT_BACKGROUND,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_COUNT,
  DEFAULT_VIDEO_SOURCE_MAX,
  VIDEO_NOTIFICATION_THRESHOLD_MS,
  composeGenerationPrompt,
} from './constants';
import {
  createPlaceholderMediaItems,
  hydratePlaceholdersWithCanvases,
  hydratePlaceholdersWithVideos,
  removeMediaItems as removeTimelineMediaItems,
} from './timelineActions';
import { pickVideoAspectRatio, pickVideoDuration, pickVideoResolution } from '../generator/videoModelConfig';
import type { ObjectUrlHandle } from './objectUrlManager';
import type { AllocateId } from './types';

interface GenerationDeps {
  getTimelineItems(): TimelineItem[];
  setTimelineItems(items: TimelineItem[]): void;
  getSelectedImageItems(): MediaItem[];
  getHasSelectedImages(): boolean;
  getGenerationType(): 'image' | 'video';
  isDraftEmpty(): boolean;
  isPromptRequired(): boolean;
  getDraft(): string;
  getStyle(): string;
  getApplyStyle(): boolean;
  getImagingModel(): ImagingModel;
  getIsGenerating(): boolean;
  setIsGenerating(value: boolean): void;
  getImageWidth(): number;
  getImageHeight(): number;
  getBatchCount(): number;
  getAngleEditValues(): AngleEditValues;
  objectUrls: ObjectUrlHandle;
  allocateId: AllocateId;
  ensureMediaItemMedia: (item: MediaItem) => Promise<Media>;
  appendMessage: (sender: 'user' | 'bot', content: string) => Promise<MessageItem>;
  videoModelStore: Writable<ImageToVideoModel>;
}

type AngleEditValues = {
  horizontalAngle: number;
  verticalAngle: number;
  zoom: number;
};

const ANGLE_EDIT_MODE: ImagingModel = 'qwen-image-edit/multiple-angles';

export function createGenerationActions(deps: GenerationDeps) {
  async function handleModelButtonClick() {
    if (deps.getIsGenerating() || deps.isDraftEmpty()) return;

    const promptRequired = deps.isPromptRequired();
    const generationPrompt = composeGenerationPrompt(deps.getDraft());
    if (promptRequired && !generationPrompt) return;

    const currentMode = deps.getImagingModel();
    const requiresReference = getRefRangeForMode(currentMode).min > 0;
    const timelinePrompt = (!promptRequired && currentMode === ANGLE_EDIT_MODE)
      ? get(_)('frame.actions.angleEdit')
      : generationPrompt;

    if (deps.getGenerationType() === 'video' && !deps.getHasSelectedImages()) {
      toastStore.trigger({ message: '動画生成には画像を選択してください。', timeout: 2500 });
      return;
    }

    if (requiresReference && !deps.getHasSelectedImages()) {
      toastStore.trigger({ message: get(_)('dolphinRoom.disable.needImageForMode'), timeout: 2500 });
      return;
    }

    const selection = [...deps.getSelectedImageItems()];
    const promptMessage = await deps.appendMessage('user', timelinePrompt);

    if (!promptMessage) return;

    if (deps.getGenerationType() === 'video') {
      await handleGenerateVideo(generationPrompt, promptMessage.id, selection);
    } else if (selection.length > 0) {
      await handleEditSelected(generationPrompt, promptMessage.id, selection);
    } else {
      await handleGenerateNew(generationPrompt, promptMessage.id);
    }
  }

  async function handleGenerateNew(prompt: string, promptId: number) {
    deps.setIsGenerating(true);
    const batchCount = deps.getBatchCount();
    const { placeholders, timelineItems } = createPlaceholderMediaItems({
      timelineItems: deps.getTimelineItems(),
      count: batchCount,
      allocateId: deps.allocateId,
      promptId,
      model: deps.getImagingModel(),
    });
    deps.setTimelineItems(timelineItems);
    try {
      const style = deps.getApplyStyle() ? deps.getStyle() : '';
      const fullPrompt = style ? `${style}${'\n'}${prompt}` : prompt;
      const imageSize = { width: deps.getImageWidth(), height: deps.getImageHeight() };
      const canvases = await executeProcessAndNotify(
        5000,
        get(_)("generator.imageGenerated"),
        async () => await generateImage(fullPrompt, imageSize, deps.getImagingModel(), batchCount, DEFAULT_BACKGROUND, [], { kind: 'none' }, false),
        (r) => r.length > 0,
      );

      deps.setTimelineItems(await hydratePlaceholdersWithCanvases({
        timelineItems: deps.getTimelineItems(),
        placeholders,
        canvases,
        promptId,
        allocateId: deps.allocateId,
        objectUrls: deps.objectUrls,
      }));
    } catch (error) {
      if (isContentsPolicyViolationError(error)) {
        // エラー通知は generateImage 側で行われる
      } else {
        console.error('画像生成に失敗しました', error);
        toastStore.trigger({ message: '画像生成に失敗しました。', timeout: 3000 });
      }
      deps.setTimelineItems(removeTimelineMediaItems({
        timelineItems: deps.getTimelineItems(),
        targets: placeholders,
        objectUrls: deps.objectUrls,
      }));
    } finally {
      deps.setIsGenerating(false);
    }
  }

  async function handleEditSelected(prompt: string, promptId: number, selectedItems: MediaItem[]) {
    if (selectedItems.length === 0) {
      toastStore.trigger({ message: '編集には画像を選択してください。', timeout: 2500 });
      return;
    }

    const imagingMode = deps.getImagingModel();

    if (!supportsRefImages(imagingMode)) {
      toastStore.trigger({ message: 'このモードは参照画像に対応していません。', timeout: 2500 });
      return;
    }

    const refMax = Math.max(0, getRefMaxForMode(imagingMode));
    if (refMax === 0) {
      toastStore.trigger({ message: '参照画像の上限により編集を実行できません。', timeout: 2500 });
      return;
    }

    const limitedItems = selectedItems.slice(0, refMax);
    deps.setIsGenerating(true);
    const batchCount = deps.getBatchCount();
    const { placeholders, timelineItems } = createPlaceholderMediaItems({
      timelineItems: deps.getTimelineItems(),
      count: batchCount,
      allocateId: deps.allocateId,
      promptId,
      model: imagingMode,
    });
    deps.setTimelineItems(timelineItems);
    try {
      const medias = await Promise.all(limitedItems.map((item) => deps.ensureMediaItemMedia(item)));
      const canvasesForRefs = medias
        .filter((media) => media.type === 'image')
        .map((media) => media.drawSourceCanvas);

      if (canvasesForRefs.length === 0) {
        toastStore.trigger({ message: '参照画像を取得できませんでした。', timeout: 2500 });
        deps.setTimelineItems(removeTimelineMediaItems({
          timelineItems: deps.getTimelineItems(),
          targets: placeholders,
          objectUrls: deps.objectUrls,
        }));
        return;
      }

      const referenceUrls = canvasesForRefs.map((canvas) => canvas.toDataURL('image/png'));
      const baseCanvas = canvasesForRefs[0];
      const imageSize = baseCanvas
        ? { width: baseCanvas.width || DEFAULT_IMAGE_SIZE.width, height: baseCanvas.height || DEFAULT_IMAGE_SIZE.height }
        : DEFAULT_IMAGE_SIZE;

      const style = deps.getApplyStyle() ? deps.getStyle() : '';
      const fullPrompt = style ? `${style}${'\n'}${prompt}` : prompt;
      const isAngleMode = imagingMode === ANGLE_EDIT_MODE;
      const angleValues = deps.getAngleEditValues();
      const option = isAngleMode
        ? {
            kind: 'angle' as const,
            angle: {
              horizontal_angle: angleValues.horizontalAngle,
              vertical_angle: angleValues.verticalAngle,
              zoom: angleValues.zoom,
            },
          }
        : { kind: 'none' as const };
      // 先頭の選択画像そのものを編集する操作なので精密編集を要求する
      const canvases = await executeProcessAndNotify(
        5000,
        get(_)("generator.imageGenerated"),
        async () =>
          await generateImage(fullPrompt, imageSize, imagingMode, batchCount, 'auto', referenceUrls, option, true),
        (r) => r.length > 0,
      );

      deps.setTimelineItems(await hydratePlaceholdersWithCanvases({
        timelineItems: deps.getTimelineItems(),
        placeholders,
        canvases,
        promptId,
        allocateId: deps.allocateId,
        objectUrls: deps.objectUrls,
      }));
    } catch (error) {
      if (isContentsPolicyViolationError(error)) {
        // エラー通知は generateImage 側で行われる
      } else {
        console.error('画像編集に失敗しました', error);
        toastStore.trigger({ message: '画像編集に失敗しました。', timeout: 3000 });
      }
      deps.setTimelineItems(removeTimelineMediaItems({
        timelineItems: deps.getTimelineItems(),
        targets: placeholders,
        objectUrls: deps.objectUrls,
      }));
    } finally {
      deps.setIsGenerating(false);
    }
  }

  async function handleGenerateVideo(prompt: string, promptId: number, selectedItems: MediaItem[]) {
    if (selectedItems.length === 0) {
      toastStore.trigger({ message: '動画生成には画像を選択してください。', timeout: 2500 });
      return;
    }

    const baseItem = selectedItems[0];
    deps.setIsGenerating(true);
    const videoModelName = get(deps.videoModelStore);
    const { placeholders, timelineItems } = createPlaceholderMediaItems({
      timelineItems: deps.getTimelineItems(),
      count: DEFAULT_VIDEO_COUNT,
      allocateId: deps.allocateId,
      promptId,
      kind: 'video',
      model: videoModelName,
    });
    deps.setTimelineItems(timelineItems);
    try {
      const baseMedia = await deps.ensureMediaItemMedia(baseItem).catch((error) => {
        console.error('Failed to load base media for video generation', error);
        return null;
      });
      if (!baseMedia || baseMedia.type !== 'image') {
        toastStore.trigger({ message: '動画生成には画像メディアが必要です。', timeout: 2500 });
        deps.setTimelineItems(removeTimelineMediaItems({
          timelineItems: deps.getTimelineItems(),
          targets: placeholders,
          objectUrls: deps.objectUrls,
        }));
        return;
      }

      const resizedCanvas = fitCanvasToRange(baseMedia.drawSourceCanvas, { max: DEFAULT_VIDEO_SOURCE_MAX });
      const model = get(deps.videoModelStore);
      const style = deps.getApplyStyle() ? deps.getStyle() : '';
      const fullPrompt = style ? `${style}\n${prompt}` : prompt;
      const request: ImageToVideoRequest = {
        prompt: fullPrompt,
        imageUrl: resizedCanvas.toDataURL('image/png'),
        duration: pickVideoDuration(model),
        aspectRatio: pickVideoAspectRatio(model, resizedCanvas.width, resizedCanvas.height),
        resolution: pickVideoResolution(model),
        model,
      };

      const { requestId, model: resolvedModel } = await image2Video(request);
      const fileSystem = get(mainBookFileSystem);
      if (fileSystem) {
        await saveRequest(fileSystem, 'video', "imagetovideo", requestId, resolvedModel);
      }

      toastStore.trigger({ message: '動画生成を開始しました。完了までしばらくお待ちください。', timeout: 3500 });

      const pollResult = await executeProcessAndNotify(
        VIDEO_NOTIFICATION_THRESHOLD_MS,
        get(_)("generator.videoGenerated"),
        async () => await pollMediaStatus({ mediaType: 'video', action: 'imagetovideo', requestId, model: resolvedModel }),
      );

      deps.setTimelineItems(await hydratePlaceholdersWithVideos({
        timelineItems: deps.getTimelineItems(),
        placeholders,
        pollResult,
        promptId,
        allocateId: deps.allocateId,
        objectUrls: deps.objectUrls,
      }));
    } catch (error) {
      if (isContentsPolicyViolationError(error)) {
        // エラー通知は generateImage 側で行われる
      } else {
        console.error('動画生成に失敗しました', error);
        toastStore.trigger({ message: '動画生成に失敗しました。', timeout: 3000 });
      }
      deps.setTimelineItems(removeTimelineMediaItems({
        timelineItems: deps.getTimelineItems(),
        targets: placeholders,
        objectUrls: deps.objectUrls,
      }));
    } finally {
      deps.setIsGenerating(false);
    }
  }

  return {
    handleModelButtonClick,
  };
}
