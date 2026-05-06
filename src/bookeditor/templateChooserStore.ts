import { createAsyncStore } from "../utils/asyncStore";

export type FrameLayoutSample = {
  templateName: string; // 組み込みは "standard"/"4koma"/...、ユーザー定義は "custom"
  frameTree: any;
  bubbles: any[];
};

export const triggerTemplateChoice = createAsyncStore<FrameLayoutSample | null>();
