---
name: openai-image-gen
description: 通过 OpenAI Images API 批量生成图像。随机提示采样器 + `index.html` 画廊。
homepage: https://platform.openai.com/docs/api-reference/images
metadata: {"moltbot":{"emoji":"🖼️","requires":{"bins":["python3"],"env":["OPENAI_API_KEY"]},"primaryEnv":"OPENAI_API_KEY","install":[{"id":"python-brew","kind":"brew","formula":"python","bins":["python3"],"label":"Install Python (brew)"}]}}
---

# OpenAI 图像生成

生成一些"随机但有结构"的提示并通过 OpenAI Images API 渲染它们。

## 运行

```bash
python3 {baseDir}/scripts/gen.py
open ~/Projects/tmp/openai-image-gen-*/index.html  # 如果 ~/Projects/tmp 存在；否则 ./tmp/...
```

有用的标志：

```bash
# GPT 图像模型及各种选项
python3 {baseDir}/scripts/gen.py --count 16 --model gpt-image-1
python3 {baseDir}/scripts/gen.py --prompt "ultra-detailed studio photo of a lobster astronaut" --count 4
python3 {baseDir}/scripts/gen.py --size 1536x1024 --quality high --out-dir ./out/images
python3 {baseDir}/scripts/gen.py --model gpt-image-1.5 --background transparent --output-format webp

# DALL-E 3（注意：count 自动限制为 1）
python3 {baseDir}/scripts/gen.py --model dall-e-3 --quality hd --size 1792x1024 --style vivid
python3 {baseDir}/scripts/gen.py --model dall-e-3 --style natural --prompt "serene mountain landscape"

# DALL-E 2
python3 {baseDir}/scripts/gen.py --model dall-e-2 --size 512x512 --count 4
```

## 模型特定参数

不同模型支持不同的参数值。脚本会根据模型自动选择适当的默认值。

### 尺寸

- **GPT 图像模型**（`gpt-image-1`、`gpt-image-1-mini`、`gpt-image-1.5`）：`1024x1024`、`1536x1024`（横向）、`1024x1536`（纵向）或 `auto`
  - 默认：`1024x1024`
- **dall-e-3**：`1024x1024`、`1792x1024` 或 `1024x1792`
  - 默认：`1024x1024`
- **dall-e-2**：`256x256`、`512x512` 或 `1024x1024`
  - 默认：`1024x1024`

### 质量

- **GPT 图像模型**：`auto`、`high`、`medium` 或 `low`
  - 默认：`high`
- **dall-e-3**：`hd` 或 `standard`
  - 默认：`standard`
- **dall-e-2**：仅 `standard`
  - 默认：`standard`

### 其他显著差异

- **dall-e-3** 一次只支持生成 1 张图像（`n=1`）。使用此模型时脚本自动将 count 限制为 1。
- **GPT 图像模型**支持额外参数：
  - `--background`：`transparent`、`opaque` 或 `auto`（默认）
  - `--output-format`：`png`（默认）、`jpeg` 或 `webp`
  - 注意：`stream` 和 `moderation` 可通过 API 使用但尚未在此脚本中实现
- **dall-e-3** 有 `--style` 参数：`vivid`（超现实、戏剧性）或 `natural`（更自然）

## 输出

- `*.png`、`*.jpeg` 或 `*.webp` 图像（输出格式取决于模型 + `--output-format`）
- `prompts.json`（提示 → 文件映射）
- `index.html`（缩略图画廊）
