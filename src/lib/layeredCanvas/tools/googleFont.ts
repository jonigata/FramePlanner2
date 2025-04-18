const loadedGoogleFonts = new Set();

export async function loadGoogleFontForCanvas(family: string, weights = ['400']) {
  try {
    // 既存のフォント読み込み処理
    await loadGoogleFont(family, weights);
    
    // document.fonts.readyで待機
    await document.fonts.ready;
    
    // 各ウェイトについてCanvas対応を確認
    const checks = weights.map(weight => checkCanvasFontAvailable(family, weight));
    await Promise.all(checks);
    
    console.log(`Font "${family}" is fully loaded and ready for Canvas use`);
  } catch (error) {
    console.error(`Failed to load font "${family}" for Canvas:`, error);
    throw error;
  }
}

export async function loadGoogleFont(family: string, weights = ['400']) {
  try {
    const key = `${family}-${weights.join('-')}`;
    if (loadedGoogleFonts.has(key)) return;
 
    const familyParam = family.replace(/\s+/g, '+');
    const weightsParam = weights.join(';');
    const url = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightsParam}&display=swap`;
 
    const response = await fetch(url, {
      headers: { 'User-Agent': navigator.userAgent }
    });
    
    const css = await response.text();
    const fontUrlMatches = Array.from(css.matchAll(/src: url\((.+?)\) format\('woff2'\)/g));
    
    if (!fontUrlMatches.length) {
      throw new Error('No font URLs found in CSS');
    }
 
    const loadPromises = fontUrlMatches.map(match => {
      const fontUrl = match[1];
      const cssBlock = css.substring(0, match.index).split('}').slice(-1)[0];
      const weightMatch = cssBlock.match(/font-weight: (\d+)/);
      const weight = weightMatch ? weightMatch[1] : '400';
 
      const font = new FontFace(family, `url(${fontUrl})`, {
        weight,
        style: 'normal'
      });
 
      return font.load().then(loadedFace => {
        document.fonts.add(loadedFace);
        return loadedFace;
      });
    });
 
    await Promise.all(loadPromises);
    await document.fonts.ready;
    loadedGoogleFonts.add(key);
 
  } catch (error) {
    console.error(`Failed to load font "${family}":`, error);
    throw error;
  }
}

export async function checkCanvasFontAvailable(family: string, weight = '400', maxRetries = 20, interval = 50) {
  const testString = 'あいうえおABCDE12345';
  const fontSize = '24px';
  
  function measureWidth() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // テスト対象のフォントで描画
    ctx.font = `${weight} ${fontSize} "${family}"`;
    const targetWidth = ctx.measureText(testString).width;
    
    // フォールバックフォントで描画
    ctx.font = `${weight} ${fontSize} serif`;
    const fallbackWidth = ctx.measureText(testString).width;
    
    return targetWidth !== fallbackWidth;
  }

  for (let i = 0; i < maxRetries; i++) {
    if (measureWidth()) {
      console.log(`Font "${family}" ${weight} is ready for Canvas`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for font "${family}" ${weight} to be ready for Canvas`);
}
