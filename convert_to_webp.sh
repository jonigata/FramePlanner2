#!/bin/bash

# 指定されたディレクトリ内のすべてのPNGファイルをWebP形式に変換するスクリプト
# 変換後、元のPNGファイルは削除します

# 使用方法を表示する関数
show_usage() {
  echo "使用方法: $0 [ディレクトリパス]"
  echo "例: $0 src/assets"
  echo "引数が指定されない場合、デフォルトで src/assets ディレクトリが使用されます"
}

# 引数チェック
TARGET_DIR="src/assets"  # デフォルト値

if [ $# -eq 1 ]; then
  if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    show_usage
    exit 0
  fi
  TARGET_DIR="$1"
fi

# 指定されたディレクトリが存在するか確認
if [ ! -d "$TARGET_DIR" ]; then
  echo "エラー: 指定されたディレクトリ '$TARGET_DIR' が存在しません"
  show_usage
  exit 1
fi

# cwebpコマンドのパス
CWEBP="/home/linuxbrew/.linuxbrew/bin/cwebp"

# 変換カウンター
converted=0
failed=0

echo "ディレクトリ '$TARGET_DIR' 内のPNGファイルをWebP形式に変換します..."

# 指定されたディレクトリ内のすべてのPNGファイルを検索して処理
find "$TARGET_DIR" -type f -name "*.png" | while read png_file; do
  # 出力ファイル名（拡張子をwebpに変更）
  webp_file="${png_file%.png}.webp"
  
  echo "変換中: $png_file -> $webp_file"
  
  # cwebpを使用してPNGファイルをWebP形式に変換
  # -q 90: 品質を90%に設定（0-100の範囲、高いほど品質が良い）
  # -m 6: 圧縮メソッドを6に設定（0-6の範囲、高いほど圧縮率が良いが処理時間が長くなる）
  $CWEBP -q 90 -m 6 "$png_file" -o "$webp_file"
  
  # 変換結果を確認
  if [ $? -eq 0 ]; then
    echo "✓ 変換成功: $webp_file"
    # 元のPNGファイルを削除
    rm "$png_file"
    echo "  元のファイルを削除しました: $png_file"
    ((converted++))
  else
    echo "✗ 変換失敗: $png_file"
    # 変換に失敗した場合、WebPファイルが作成されていれば削除
    if [ -f "$webp_file" ]; then
      rm "$webp_file"
    fi
    ((failed++))
  fi
done

echo "-------------------------------------"
echo "変換完了！"
echo "対象ディレクトリ: $TARGET_DIR"
echo "変換成功: $converted ファイル"
echo "変換失敗: $failed ファイル"
echo "-------------------------------------"