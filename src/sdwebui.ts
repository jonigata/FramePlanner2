export async function generateImages(url, imageRequest) {
  try {
    const { positive, negative, width, height, samplingSteps, cfgScale, batchSize, batchCount } = imageRequest;
    const payload = {
      prompt: positive,
      negative_prompt: negative,
      steps: samplingSteps,
      cfg_scale: cfgScale,
      batch_size: batchSize,
      n_iter: batchCount,
      width: width,
      height: height
    };
  
    const response = await fetch(`${url}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw `${url}: ${response.status} ${response.statusText}`;
    }

    const data = await response.json();
    console.log(data);
    const images = data.images;

    const imgs = [];
    for (let i of images) {
        const png_payload = {
            image: "data:image/png;base64," + i
        };

        // Display the image
        const img = document.createElement('img');
        img.src = png_payload.image;
        imgs.push(img);
    }
    return imgs;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function getProgression(url) {
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