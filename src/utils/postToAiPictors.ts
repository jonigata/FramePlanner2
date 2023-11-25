export async function postToAiPictors(dataUrl: string, onError: (message:string)=>void): Promise<void> {
  try {
    console.log("postToAiPictors:1");
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
      if (data.result === "success") {
        console.log("postToAiPictors:4");
        const nanoid = data.nanoid;
        console.log("nanoid:", nanoid);
        const newTabUrl = `https://www.aipictors.com/post/?cache=${nanoid}`;
        window.open(newTabUrl, "_blank");
      } else if (data.result === "oversize") {
        onError("画像サイズが大きいです。");
      } else if (data.result === "noimage") {
        onError("空の画像が送信されました。");
      } else {
        onError("エラーが発生しました。");
      }
      console.log("postToAiPictors:5");
    } else {
      onError("リクエストが失敗しました。");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
