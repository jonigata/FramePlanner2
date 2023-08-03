// crc32
// CRC32を初期化
function initCrc32Table() {
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[i] = c;
    }
    return crcTable;
}
  
// データのCRC32を計算
function getCrc32(data, crc = 0) {
    const crcTable = initCrc32Table();
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
  
function stringToUint8Array(str) {
    var arr = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
    }
    return arr;
}
  
function base64ToUint8Array(base64Str) {
    return stringToUint8Array(atob(base64Str));
}

function visitPng(png, type) {
    var dataLength;
    var chunkType;
    var nextChunkPos;
    var Signature = String.fromCharCode(137, 80, 78, 71, 13, 10, 26, 10);
    var rpos = 0;

    // シグネチャの確認
    if (String.fromCharCode.apply(null, png.subarray(rpos, rpos += 8)) !== Signature) {
        throw new Error('invalid signature');
    }

    // チャンクの探索
    while (rpos < png.length) {
        dataLength = (
            (png[rpos++] << 24) |
            (png[rpos++] << 16) |
            (png[rpos++] << 8) |
            (png[rpos++])
        ) >>> 0;

        nextChunkPos = rpos + dataLength + 8;

        chunkType = String.fromCharCode.apply(null, png.subarray(rpos, rpos += 4));

        if (chunkType === type) {
            return [rpos - 8, dataLength, nextChunkPos];
        }

        rpos = nextChunkPos;
    }
}

function createChunk(type, data) {
    var dataLength = data.length;
    var chunk = new Uint8Array(4 + 4 + dataLength + 4);
    type = stringToUint8Array(type);
    var pos = 0;

    // length
    chunk[pos++] = (dataLength >> 24) & 0xff;
    chunk[pos++] = (dataLength >> 16) & 0xff;
    chunk[pos++] = (dataLength >> 8) & 0xff;
    chunk[pos++] = (dataLength) & 0xff;

    // type
    chunk[pos++] = type[0];
    chunk[pos++] = type[1];
    chunk[pos++] = type[2];
    chunk[pos++] = type[3];

    // data
    for (let i = 0; i < dataLength; ++i) {
        chunk[pos++] = data[i];
    }

    //crc
    initCrc32Table();
    let crc = getCrc32(type);
    crc = getCrc32(data, crc);
    chunk[pos++] = (crc >> 24) & 0xff;
    chunk[pos++] = (crc >> 16) & 0xff;
    chunk[pos++] = (crc >> 8) & 0xff;
    chunk[pos++] = (crc) & 0xff;

    return chunk;
}

function insertChunk(destBuffer, sourceBuffer, rpos, chunk) {
    var pos = 0;

    // IDAT チャンクの前までコピー
    destBuffer.set(sourceBuffer.subarray(0, rpos), pos);
    pos += rpos;

    // hoGe チャンクをコピー
    destBuffer.set(chunk, pos);
    pos += chunk.length;

    // IDAT チャンク以降をコピー
    destBuffer.set(sourceBuffer.subarray(rpos), pos);
}
  
function mergeCanvasWithPose(canvas, keyword, content) {
    const canvasUrl = canvas.toDataURL();
  
    var insertion = stringToUint8Array(`${keyword}\0${content}`);
    var chunk = createChunk("tEXt", insertion);
    var sourceBuffer = base64ToUint8Array(canvasUrl.split(',')[1]);
    var destBuffer = new Uint8Array(sourceBuffer.length + insertion.length + 12);
  
    var [rpos, dataLength, nextChunkPos] = visitPng(sourceBuffer, "IHDR");
    insertChunk(destBuffer, sourceBuffer, nextChunkPos, chunk);
  
    var blob = new Blob([destBuffer], {type: "image/png"});
    var url = URL.createObjectURL(blob);
    console.log("saving canvas with pose");
    return url;  
}

export function saveCanvas(canvas, filename, jsonData) {
    var url = mergeCanvasWithPose(canvas, "comicframe", JSON.stringify(jsonData));

    const createEl = document.createElement('a');
    createEl.href = url;

    // This is the name of our downloaded file
    createEl.download = filename;

    createEl.click();
    createEl.remove();
}

export async function copyCanvasToClipboard(canvas) {
  try {
    // CanvasをBlobとして取得する
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));

    // BlobをClipboardItemとしてクリップボードに書き込む
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);

    console.log("Canvas content copied to clipboard.");
  } catch (err) {
    console.error("Failed to copy canvas content to clipboard:", err);
  }
}

export function imageToBase64(imgElement) {
    let canvas = document.createElement("canvas");
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    canvas.getContext("2d").drawImage(imgElement, 0, 0);

    let base64Image = canvas.toDataURL("image/png");
    console.log(base64Image); // base64エンコードされた画像データ    
    return base64Image;
}

export function makeFilename(ext) {
  function zeropadding(n) {
    return n < 10 ? "0" + n : n;
  }

  const date = new Date();
  const filename = `comic-${date.toLocaleDateString('sv-SE')}-${zeropadding(date.getHours())}-${zeropadding(date.getMinutes())}-${zeropadding(date.getSeconds())}.${ext}`;
  return filename;
}
