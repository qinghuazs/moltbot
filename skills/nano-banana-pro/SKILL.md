---
name: nano-banana-pro
description: 通过 Gemini 3 Pro Image（Nano Banana Pro）生成或编辑图像。
homepage: https://ai.google.dev/
metadata: {"moltbot":{"emoji":"🍌","requires":{"bins":["uv"],"env":["GEMINI_API_KEY"]},"primaryEnv":"GEMINI_API_KEY","install":[{"id":"uv-brew","kind":"brew","formula":"uv","bins":["uv"],"label":"Install uv (brew)"}]}}
---

# Nano Banana Pro（Gemini 3 Pro Image）

使用捆绑脚本生成或编辑图像。

生成
```bash
uv run {baseDir}/scripts/generate_image.py --prompt "your image description" --filename "output.png" --resolution 1K
```

编辑（单张图像）
```bash
uv run {baseDir}/scripts/generate_image.py --prompt "edit instructions" --filename "output.png" -i "/path/in.png" --resolution 2K
```

多图像合成（最多 14 张图像）
```bash
uv run {baseDir}/scripts/generate_image.py --prompt "combine these into one scene" --filename "output.png" -i img1.png -i img2.png -i img3.png
```

API 密钥
- `GEMINI_API_KEY` 环境变量
- 或在 `~/.clawdbot/moltbot.json` 中设置 `skills."nano-banana-pro".apiKey` / `skills."nano-banana-pro".env.GEMINI_API_KEY`

注意
- 分辨率：`1K`（默认）、`2K`、`4K`。
- 文件名使用时间戳：`yyyy-mm-dd-hh-mm-ss-name.png`。
- 脚本会打印 `MEDIA:` 行，供 Moltbot 在支持的聊天提供商上自动附加。
- 不要读取图像；只报告保存路径。
