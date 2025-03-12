# 基于Cloudflare Worker的AI壁纸生成脚本

## worker-1： text2img-easy.js
-  "DS-8-CF": "@cf/lykon/dreamshaper-8-lcm"
-  "SD-XL-Bash-CF": "@cf/stabilityai/stable-diffusion-xl-base-1.0"
-  "SD-XL-Lightning-CF": "@cf/bytedance/stable-diffusion-xl-lightning"
-  "FLUX.1-Schnell-CF": "@cf/black-forest-labs/flux-1-schnell"
-  "SF-Kolors": "Kwai-Kolors/Kolors"
 
 五种可选文生图模型，默认SD-XL-Bash-CF，推荐FLUX.1-Schnell-CF 效果最好，但有每日使用限制

 使用示例：https://xxxxxxxxxxxxx/?model=FLUX.1-Schnell-CF&width=720&height=1280&prompt=cat
 
 部署该脚本需要绑定Workers AI，不依赖wallpaper.js，可独立使用。

 SF_TOKEN为硅基流动平台的api token，需要提前申请，不使用可不填写。

## worker-2： wallpaper.js
 替换脚本内文生图服务路径为text2img-easy.js部署路径
