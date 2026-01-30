---
summary: "用于入站语音消息的 Deepgram 转写"
read_when:
  - 想为音频附件启用 Deepgram 语音转写
  - 需要一个快速 Deepgram 配置示例
---
# Deepgram（音频转写）

Deepgram 是语音转文字 API。在 Moltbot 中用于**入站音频或语音消息的转写**，由 `tools.media.audio` 提供。

启用后，Moltbot 会将音频文件上传到 Deepgram，并把转写注入回复管线（`{{Transcript}}` + `[Audio]` 块）。这**不是流式**；使用预录音转写端点。

网站：https://deepgram.com  
文档：https://developers.deepgram.com

## 快速开始

1) 设置 API key：
```
DEEPGRAM_API_KEY=dg_...
```

2) 启用提供商：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }]
      }
    }
  }
}
```

## 选项

- `model`：Deepgram 模型 ID（默认：`nova-3`）
- `language`：语言提示（可选）
- `tools.media.audio.providerOptions.deepgram.detect_language`：启用语言检测（可选）
- `tools.media.audio.providerOptions.deepgram.punctuate`：启用标点（可选）
- `tools.media.audio.providerOptions.deepgram.smart_format`：启用智能格式化（可选）

带语言示例：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [
          { provider: "deepgram", model: "nova-3", language: "en" }
        ]
      }
    }
  }
}
```

带 Deepgram 选项示例：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        providerOptions: {
          deepgram: {
            detect_language: true,
            punctuate: true,
            smart_format: true
          }
        },
        models: [{ provider: "deepgram", model: "nova-3" }]
      }
    }
  }
}
```

## 说明

- 认证遵循标准 provider 认证顺序；`DEEPGRAM_API_KEY` 是最简单路径。
- 使用代理时，可通过 `tools.media.audio.baseUrl` 与 `tools.media.audio.headers` 覆盖端点或 headers。
- 输出遵循与其它提供商一致的音频规则（大小上限、超时、转写注入）。
