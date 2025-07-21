// このモジュールはFramePlanner側で定義してコピーしているので、
// FramePlannerSupabaseで変更してはだめ

import type { ImagingMode, ImageToVideoModel, Padding, TextEditModel } from "$protocolTypes/imagingTypes";

export function calculateT2iCost(mode: ImagingMode, imageSize: { width: number; height: number }): number {
    const pixels = imageSize.width * imageSize.height;
    // 1Charge = $0.01として
    // fal.aiの160%くらい
    const costs: { [key: string]: number } = {
        "schnell": 1,
        "pro": 8,
        "chibi": 7,
        "comibg": 7,
        "manga": 7,
        "gpt-image-1/low": 2,
        "gpt-image-1/medium": 7,
        "gpt-image-1/high": 30,
    };
    let cost = costs[mode];
    cost = Math.ceil(cost * pixels / (1024 * 1024));
    return cost;
}

export function culculateI2vCost(model: ImageToVideoModel, duration: string): number {
    switch (model) {
        case "kling":
            return 125;
        case "FramePack":
            return parseInt(duration) * 5;
    }
    return 0;
}

export function calculateOutPaintingCost(size: { width: number; height: number }, padding: Padding) {
    if (padding.left === 0 && padding.right === 0 && padding.top === 0 && padding.bottom === 0) {
        return 0;
    }

    const w = size.width + padding.left + padding.right;
    const h = size.height + padding.top + padding.bottom;

    // outpainting costの算出
    // $0.05 per mega pixel (1feathral ≒ $0.01)
    const pixels = w * h;
    return Math.ceil(pixels / (1024 * 1024) * 8);
}

export function calculateInPaintingCost(size: { width: number; height: number }) {
    // inpainting costの算出
    // $0.05 per mega pixel (1feathral ≒ $0.01)
    const pixels = size.width * size.height;
    return Math.ceil(pixels / (1024 * 1024) * 8);
}

export function calculateTextEditCost(model: TextEditModel, imageSize: { width: number; height: number }): number {
    // 固定値
    switch (model) {
        case 'kontext/pro':
            return 6;
        case 'kontext/max':
            return 13;
    }

    // 画像サイズから計算
    const pixels = imageSize.width * imageSize.height;

    let costPerMegapixel = 0;
    switch (model) {
        case 'kontext/inscene':
            costPerMegapixel = 7;
            break;
        case 'gpt-image-1/low':
            costPerMegapixel = 2;
            break;
        case 'gpt-image-1/medium':
            costPerMegapixel = 7;
            break;
        case 'gpt-image-1/high':
            costPerMegapixel = 30;
            break;
        default:
            throw new Error("Invalid model for text edit cost calculation");
    }

    return Math.ceil(pixels / (1024 * 1024) * costPerMegapixel);
}
