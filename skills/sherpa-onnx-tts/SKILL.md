---
name: sherpa-onnx-tts
description: 通过 sherpa-onnx 进行本地文本转语音（离线，无云）
metadata: {"moltbot":{"emoji":"🗣️","os":["darwin","linux","win32"],"requires":{"env":["SHERPA_ONNX_RUNTIME_DIR","SHERPA_ONNX_MODEL_DIR"]},"install":[{"id":"download-runtime-macos","kind":"download","os":["darwin"],"url":"https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-osx-universal2-shared.tar.bz2","archive":"tar.bz2","extract":true,"stripComponents":1,"targetDir":"~/.clawdbot/tools/sherpa-onnx-tts/runtime","label":"Download sherpa-onnx runtime (macOS)"},{"id":"download-runtime-linux-x64","kind":"download","os":["linux"],"url":"https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-linux-x64-shared.tar.bz2","archive":"tar.bz2","extract":true,"stripComponents":1,"targetDir":"~/.clawdbot/tools/sherpa-onnx-tts/runtime","label":"Download sherpa-onnx runtime (Linux x64)"},{"id":"download-runtime-win-x64","kind":"download","os":["win32"],"url":"https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-win-x64-shared.tar.bz2","archive":"tar.bz2","extract":true,"stripComponents":1,"targetDir":"~/.clawdbot/tools/sherpa-onnx-tts/runtime","label":"Download sherpa-onnx runtime (Windows x64)"},{"id":"download-model-lessac","kind":"download","url":"https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-high.tar.bz2","archive":"tar.bz2","extract":true,"targetDir":"~/.clawdbot/tools/sherpa-onnx-tts/models","label":"Download Piper en_US lessac (high)"}]}}
---

# sherpa-onnx-tts

使用 sherpa-onnx 离线 CLI 进行本地 TTS。

## 安装

1) 为你的操作系统下载运行时（解压到 `~/.clawdbot/tools/sherpa-onnx-tts/runtime`）
2) 下载语音模型（解压到 `~/.clawdbot/tools/sherpa-onnx-tts/models`）

更新 `~/.clawdbot/moltbot.json`：

```json5
{
  skills: {
    entries: {
      "sherpa-onnx-tts": {
        env: {
          SHERPA_ONNX_RUNTIME_DIR: "~/.clawdbot/tools/sherpa-onnx-tts/runtime",
          SHERPA_ONNX_MODEL_DIR: "~/.clawdbot/tools/sherpa-onnx-tts/models/vits-piper-en_US-lessac-high"
        }
      }
    }
  }
}
```

包装器位于此技能文件夹中。直接运行它，或将包装器添加到 PATH：

```bash
export PATH="{baseDir}/bin:$PATH"
```

## 使用

```bash
{baseDir}/bin/sherpa-onnx-tts -o ./tts.wav "Hello from local TTS."
```

注意：
- 如果你想要另一个语音，从 sherpa-onnx `tts-models` 发布中选择不同的模型。
- 如果模型目录有多个 `.onnx` 文件，设置 `SHERPA_ONNX_MODEL_FILE` 或传递 `--model-file`。
- 你还可以传递 `--tokens-file` 或 `--data-dir` 来覆盖默认值。
- Windows：运行 `node {baseDir}\\bin\\sherpa-onnx-tts -o tts.wav "Hello from local TTS."`
