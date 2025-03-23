import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const FAVICON_SIZES = [16, 32, 48, 64, 128, 192, 512];
const SOURCE_FAVICON = 'favicon.png';
const OUTPUT_DIR = 'public/favicons';

async function generateFavicons() {
  try {
    // ディレクトリが存在することを確認
    try {
      await fs.access(OUTPUT_DIR);
    } catch (error) {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      console.log(`ディレクトリを作成しました: ${OUTPUT_DIR}`);
    }

    // 各サイズのファビコンを生成
    for (const size of FAVICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `favicon-${size}x${size}.png`);
      
      await sharp(SOURCE_FAVICON)
        .resize(size, size)
        .toFile(outputPath);
      
      console.log(`生成しました: ${outputPath}`);
    }

    // Apple Touch Iconを生成（180x180）
    await sharp(SOURCE_FAVICON)
      .resize(180, 180)
      .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));
    
    console.log('生成しました: apple-touch-icon.png');

    console.log('すべてのファビコンの生成が完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

generateFavicons();