# FramePlanner

マンガの枠組みをツリー構造のデータ(JSON)で定義して、その中で各コマをウィンドウのように扱って絵を配置できるツールです。

## 操作・機能

https://user-images.githubusercontent.com/128374/227374915-7b2a48c0-270c-411e-b584-427322663537.mp4

https://user-images.githubusercontent.com/128374/227375161-c7eb2511-1c06-4746-8ee6-7eec095deb06.mp4

https://user-images.githubusercontent.com/128374/227375169-74fbdb1f-0aa0-4926-94f9-4674b680e473.mp4

## インストール方法

以下の手順に従って、FramePlanner2をインストールして開発サーバーを起動します。
（WSL2、ubuntu22前提）

1.このリポジトリをクローン:
```bash
git clone https://github.com/jonigata/FramePlanner2.git
```
2.ディレクトリに移動:
```bash
cd FramePlanner2
```
3.必要な依存関係をインストール:
```bash
npm install
```
4.開発サーバーを起動:
```bash
npm run dev
```
5.ブラウザでアプリケーションにアクセス:
```
http://localhost:5173
```

## フキダシの追加方法

1. src/lib/layeredCanvas/bubbleGraphic.jsに関数を追加
2. src/lib/layeredCanvas/bubbleGraphic.jsのdrawBubbleにエントリを追加
3. src/BubbleChooser.svelteの真ん中あたりに形状が列挙してある場所があるので、そこに追加

## ライセンス
MIT

ユーザーが制作したコンテンツに関しては一切関知しません。