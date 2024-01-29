import type { Page } from '../../bookeditor/book';
import { renderPageToBlob, renderPageToDataUrl } from './renderPage';

export async function postToAiPictors(page: Page): Promise<void> {
  const dataUrl = await renderPageToDataUrl(page);
  const blob = new Blob([dataUrl], { type: "text/plain" });
  const formData = new FormData();
  formData.append("imageData", blob);

  const response = await fetch(
    "https://www.aipictors.com/wp-content/themes/AISite/post-img-cache.php",
    {
      method: 'POST',
      body: formData
    });

  console.log("postToAiPictors:2");
  if (response.ok) {
    console.log("postToAiPictors:3");
    const data = await response.json();
    console.log(data);
    if (data.result === "success") {
      console.log("postToAiPictors:4");
      const nanoid = data.nanoid;
      console.log("nanoid:", nanoid);
      const newTabUrl = `https://www.aipictors.com/post/?cache=${nanoid}`;
      window.open(newTabUrl, "_blank");
    } else if (data.result === "oversize") {
        throw "画像サイズが大きいです。";
    } else if (data.result === "noimage") {
      throw "空の画像が送信されました。";
    } else {
      throw "エラーが発生しました。";
    }
    console.log("postToAiPictors:5");
  } else {
    throw "リクエストが失敗しました。";
  }
}
