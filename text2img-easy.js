
// 配置
const CONFIG = {
  CF_ENV: null,
  CF_TRANSLATE_MODEL: "@cf/qwen/qwen1.5-14b-chat-awq",  // 使用的cf ai模型
  SF_TOKEN:"sk-xxxxxxxxxxxxxxx",
  IMAGE_EXPIRATION: 60 * 30 // 图片在 KV 中的过期时间（秒），这里设置为 30 分钟
}

async function getTranslationPrompt(prompt) {
  const requestBody = {
    messages: [
      {
        role: "system",
        content: `你是一个多语言翻译专家，如果下面文字包含中文，请翻译为英文并直接输出结果, 如果是其他语言一律处理为英文结果`
      },
      { role: "user", content: prompt }
    ],
    model: ""
  };

  return await getCloudflarePrompt(CONFIG.CF_TRANSLATE_MODEL, requestBody);
}

async function getExpandPrompt(prompt) {
  const requestBody = {
    messages: [
      {
        role: "system",
        content: `你需要扩写用于图像生成的提示词，为输入的提示词添加更多细节、完善上下文或指定元素以使其更加生动和具体。下面是具体的要求：

        1. 识别核心要素：确定原始提示词的关键组成部分。这些通常包括主题、动作、场景设定和情感基调。
        2. 丰富具体细节：为每个要素增添描述性的细节。可以考虑运用五感描写（视觉、听觉、嗅觉、触觉、味觉），以及色彩、质地和情感等元素。
        3. 构建场景背景：通过描绘环境、时间或背景元素来搭建场景。这有助于营造一个更加沉浸式的体验。
        4. 运用修饰词强化效果：使用形容词来生动描述名词，用副词来精确修饰动词。这样可以让提示词更加引人入胜。
        5. 融入动作与互动：在适当的情况下，描述场景中正在发生的事件、角色之间的互动方式，或者弥漫其中的情感氛围。
        6. 保持整体连贯：确保扩展后的提示词自然流畅，并始终围绕原始创意展开。
        7. 输出英语提示词
        
        以下是提示词扩展示例。
        原始提示：“日出时的森林。”
        扩展提示："In the heart of an ancient forest, the first light of dawn filters through the dense canopy, casting a golden glow on the dewy moss-covered ground. Tall, towering trees, their bark rough and weathered, stand like silent sentinels as a soft mist curls around their roots. The air is crisp and filled with the earthy scent of pine needles, and the distant call of a waking bird echoes through the tranquil morning."
        `
      },
      { role: "user", content: prompt }
    ],
    model: ""
  };

  return await getCloudflarePrompt(CONFIG.CF_TRANSLATE_MODEL, requestBody);
}

// 从Cloudflare获取提示词
async function getCloudflarePrompt(model, requestBody) {
  const response = await postRequestEnv(model, requestBody);
  // console.log(response);
  return response.response;
}

// 调用ai env
async function postRequestEnv(model, jsonBody) {
  const response = await CONFIG.CF_ENV.AI.run(model, jsonBody);

  return response;
}

// 发送POST请求
async function postSfRequest(model, prompt, height, width) {

  const options = {
    method: 'POST',
    headers: {Authorization: 'Bearer '+CONFIG.SF_TOKEN, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      image_size: `${width}x${height}`,
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5
    })
  };

  const apiUrl = `https://api.siliconflow.cn/v1/images/generations`;
  const response = await fetch(apiUrl, options);
  const result = await response.json();
 
  const imageUrl = result.data[0].url;
  // 获取图像数据并转为流
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
 
  return imageResponse.body;
}

// 返回 ArrayBuffer
async function streamToArrayBuffer(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
  }
  return result.buffer; 
}

async function returnImg(requestUrl, response, imgurl) {
  if(imgurl=='1'){
    const imageBuffer = await streamToArrayBuffer(response);
    const key = `image_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await CONFIG.CF_ENV.IMAGE_KV.put(key, imageBuffer, {
      expirationTtl: CONFIG.IMAGE_EXPIRATION,
      metadata: { contentType: 'image/png' }
    });

     // 返回 JSON 格式的 Response       
    const imageUrl = `${new URL(requestUrl).origin}/image/${key}`;       
    return new Response(imageUrl, { 
      headers: { "content-type": "application/text" }       
    });
  }else{

    return new Response(response, {
      headers: { "content-type": "image/png"}
    });
  }
}

// 处理图片请求
async function handleImageRequest(request) {
  const url = new URL(request.url);
  const key = url.pathname.split('/').pop();
  const imageData = await CONFIG.CF_ENV.IMAGE_KV.get(key, 'arrayBuffer');
 
  if (!imageData) {
    return new Response('Image not found', { status: 404 });
  }

  return new Response(imageData, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=604800',
    },
  });
}

export default {
  
  async fetch(request, env) {
    CONFIG.CF_ENV=env;

    const url = new URL(request.url);
    if (url.pathname.startsWith('/image/')) {
      return handleImageRequest(request);
    }
     
    // 1. 获取并验证prompt参数
    const prompt = url.searchParams.get('prompt');
    if (!prompt) {
      return new Response('Missing prompt parameter. Example: ?model=SD-XL-Bash-CF&prompt=cyberpunk+cat', {
        status: 400,
        headers: { 'content-type': 'text/plain' }
      });
    }

    // 2. 获取并验证model参数
    const model = url.searchParams.get('model') || 'SD-XL-Bash-CF'; // 设置默认模型
    const height = url.searchParams.get('height') || '1024'; // 设置高
    const width = url.searchParams.get('width') || '1024'; // 设置宽
    const expand = url.searchParams.get('expand') || '0'; // 是否拓展提示词
    const imgurl = url.searchParams.get('imgurl') || '0'; // 是否返回图片链接
    const modelMap = {
      "DS-8-CF": "@cf/lykon/dreamshaper-8-lcm",
      "SD-XL-Bash-CF": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      "SD-XL-Lightning-CF": "@cf/bytedance/stable-diffusion-xl-lightning",
      "FLUX.1-Schnell-CF": "@cf/black-forest-labs/flux-1-schnell",
      "SF-Kolors": "Kwai-Kolors/Kolors",
      "SF-FLUX-schnell": "black-forest-labs/FLUX.1-schnell",
      "SF-SD-35large": "stabilityai/stable-diffusion-3-5-large"
    };

    if (!modelMap[model]) {
      return new Response(
        `Invalid model. Available models: ${Object.keys(modelMap).join(', ')}`,
        { status: 400, headers: { 'content-type': 'text/plain' } }
      );
    }

    // 3. 执行AI推理
    const tprompt = expand=='1' ? await getExpandPrompt(prompt) : await getTranslationPrompt(prompt);

    if(model.startsWith("SF-")){
      const response = await postSfRequest(modelMap[model], tprompt, parseInt(height), parseInt(width));
      return returnImg(request.url, response, imgurl);
    }

    // console.log(tprompt)
    const jsonBody = { prompt: tprompt, width: parseInt(width), height: parseInt(height) };
    // console.log(jsonBody);
    const response = await postRequestEnv(
      modelMap[model], // 动态选择模型
      jsonBody
    );

    // console.log(response);
    if(model != 'FLUX.1-Schnell-CF'){
      // 4. 返回图像结果
      return returnImg(request.url, response, imgurl);
    }else{
      // Convert from base64 string
      const binaryString = atob(response.image);
      // Create byte representation
      const img = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
      return returnImg(request.url, img, imgurl);
    }  
    
  },
} 
