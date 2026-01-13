1. 目的: 既存Web版のフキダシ合成機能をiPhoneで最小提供する。
2. 実装方針: SvelteアプリをViteビルドし、Capacitor iOSでWKWebViewラップする。
3. Capacitor導入: `npm i @capacitor/core @capacitor/cli`→`npx cap init`→`npx cap add ios`→`npx cap sync`。
4. iOS実行: `npm run build`後に`npx cap open ios`でXcodeから実機/シミュ起動。
5. 入力: 写真ライブラリ/ファイルから任意画像を1枚読み込める。
6. 編集UI: 画像上にフキダシを追加・移動・拡大縮小・回転できる。
7. フキダシ種類: 既存`renderBubble.ts`相当の形状/スタイルを最低3種提供する。
8. フキダシUI: 形状選択ボタン列、塗り/線色2種、線幅スライダー、削除ボタン。
9. スタイル: 文字入力なしの無地フキダシのみ（最小要件）。
10. 出力: 合成結果をPNGで生成し、共有シート/写真へ保存できる。
11. 保存品質: 端末解像度に合わせて原寸出力し、背景透過はしない。
12. 画面構成/非機能: 画像選択 → 編集 → 書き出しの1画面フロー、オフライン動作でクラウド送信なし。
