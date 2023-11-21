export async function generateImages(url, imageRequest) {
  url = removeLastSlash(url);
  try {
    const { positive, negative, width, height, samplingSteps, cfgScale, batchSize, batchCount, alwaysonScripts, samplerName } = imageRequest;
    const payload = {
      prompt: positive,
      negative_prompt: negative,
      steps: samplingSteps,
      cfg_scale: cfgScale,
      batch_size: batchSize,
      n_iter: batchCount,
      width: width,
      height: height,
      alwayson_scripts: alwaysonScripts,
      sampler_name: samplerName,
      save_images: false,
    };
    console.log(payload);

    const response = await fetch(`${url}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw `${url}: ${response.status} ${response.statusText}`;
    }

    const data = await response.json();
    const images = data.images;

    const imgs = [];
    for (let i of images) {
        const img = document.createElement('img');
        img.src = "data:image/png;base64," + i;
        imgs.push(img);
    }
    return imgs;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function getProgression(url) {
  url = removeLastSlash(url);
  try {
    const response = await fetch(`${url}/sdapi/v1/progress`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

export async function getControlNetModuleList(url) {

}

export async function getControlNetModelList(url) {
  
}

function removeLastSlash(url) {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
}