export async function makeWhiteImage(w, h) {
  console.log("makeWhiteImage", w, h);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  img.src = canvas.toDataURL();
  await img.decode();
  console.log("image", img.width, img.height, img.naturalWidth, img.naturalHeight);
  return img;
}

