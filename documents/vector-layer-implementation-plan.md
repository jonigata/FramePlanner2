# ベクトルレイヤー実装計画

## 概要

FramePlannerに集中線などのベクトルグラフィックスを扱うレイヤー機能を追加する実装計画です。

## 現状分析

### 現在のメディアシステム
- **サポートされているメディアタイプ**: `image` (HTMLCanvasElement), `video` (HTMLVideoElement)
- **除外されているフォーマット**: SVG (fileUtil.tsで明示的にスキップ)
- **保存形式**: Canvas/VideoデータまたはRemoteMediaReference

### 既存のアーキテクチャ
1. **Film/FilmStackシステム**
   - 個々のメディアを`Film`クラスで管理
   - 変形（スケール、回転、位置）をサポート
   - エフェクトシステムを保有

2. **レイヤーシステム**
   - Paper/Layer アーキテクチャ
   - 各レイヤーが独自のレンダリング/イベント処理を実装
   - Paper.jsを一部で使用（InlinePainterLayer等）

## 実装案

### 推奨案: 新しいMediaタイプとして実装

#### 1. MediaTypeの拡張
```typescript
// media.ts
export type MediaType = 'image' | 'video' | 'vector';  // 'vector'を追加
```

#### 2. VectorMediaクラスの作成
```typescript
export class VectorMedia extends MediaBase {
  private vectorData: VectorData;
  private cachedCanvas: HTMLCanvasElement | undefined;
  
  constructor(vectorData: VectorData | RemoteMediaReference) {
    super();
    // 実装
  }
  
  get drawSource(): HTMLCanvasElement {
    // ベクターデータをCanvasにレンダリングして返す
  }
}
```

#### 3. ベクターデータ構造
```typescript
export interface VectorData {
  type: 'concentration-lines' | 'speed-lines' | 'custom-path';
  parameters: {
    // 集中線の場合
    center?: Vector;
    lineCount?: number;
    innerRadius?: number;
    outerRadius?: number;
    lineWidth?: number;
    color?: string;
    // カスタムパスの場合
    paths?: Path2D[];
    svgData?: string;
  };
}
```

#### 4. 集中線生成ユーティリティ
```typescript
export function generateConcentrationLines(params: ConcentrationLineParams): VectorData {
  // 集中線のパスデータを生成
  return {
    type: 'concentration-lines',
    parameters: {
      center: params.center,
      lineCount: params.lineCount || 30,
      innerRadius: params.innerRadius || 100,
      outerRadius: params.outerRadius || 400,
      lineWidth: params.lineWidth || 2,
      color: params.color || '#000000'
    }
  };
}
```

## 実装ステップ

### フェーズ1: 基盤整備
1. `MediaType`に`'vector'`を追加
2. `VectorMedia`クラスの基本実装
3. `buildMedia`関数でVectorMediaをサポート

### フェーズ2: レンダリング実装
1. ベクターデータのCanvas描画機能
2. 集中線の描画アルゴリズム実装
3. キャッシュ機構の実装（パフォーマンス向上）

### フェーズ3: UI統合
1. 集中線ツールの追加
2. パラメータ調整UI
3. プレビュー機能

### フェーズ4: 保存/読み込み
1. ベクターデータのシリアライズ
2. fileManagerStoreでの保存処理
3. 読み込み時の復元処理

## 利点

1. **既存システムとの互換性**: Film/FilmStackシステムをそのまま活用
2. **柔軟性**: 他のベクター要素（効果線、トーン等）も追加可能
3. **パフォーマンス**: ベクターデータは軽量で、必要時にのみラスタライズ
4. **編集可能性**: パラメータベースなので後から調整可能

## 技術的考慮事項

### レンダリング
- Canvas 2D APIのPath2Dを使用
- 高解像度ディスプレイ対応（devicePixelRatio考慮）
- アンチエイリアシング設定

### 保存形式
- ベクターデータはJSONとして保存
- 既存のenvelopeシステムに統合
- 後方互換性の維持

### パフォーマンス
- 描画結果のキャッシュ
- 変更があった場合のみ再レンダリング
- 大量の線を効率的に描画

## 今後の拡張可能性

1. **追加のベクター効果**
   - スピード線
   - 放射線
   - 幾何学パターン
   - カスタムブラシ

2. **インポート/エクスポート**
   - SVGファイルのインポート
   - ベクターデータのエクスポート

3. **アニメーション**
   - ベクターパラメータのアニメーション
   - モーションエフェクト

## 実装優先順位

1. **高**: 基本的な集中線機能
2. **中**: パラメータ調整UI
3. **低**: 追加のベクター効果

この実装により、FramePlannerはより豊富な表現力を持つマンガ制作ツールとなります。