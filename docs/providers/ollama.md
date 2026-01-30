---
summary: "使用 Ollama（本地 LLM 运行时）运行 Moltbot"
read_when:
  - 想通过 Ollama 使用本地模型
  - 需要 Ollama 设置与配置指南
---
# Ollama

Ollama 是本地 LLM 运行时，可轻松在机器上运行开源模型。Moltbot 集成了 Ollama 的 OpenAI 兼容 API，并在设置 `OLLAMA_API_KEY`（或认证配置）且未显式定义 `models.providers.ollama` 时，**自动发现支持工具的模型**。

## 快速开始

1) 安装 Ollama：https://ollama.ai

2) 拉取模型：

```bash
ollama pull llama3.3
# 或
ollama pull qwen2.5-coder:32b
# 或
ollama pull deepseek-r1:32b
```

3) 为 Moltbot 启用 Ollama（任意值即可；Ollama 不要求真实 key）：

```bash
# 设置环境变量
export OLLAMA_API_KEY="ollama-local"

# 或在配置中设置
moltbot config set models.providers.ollama.apiKey "ollama-local"
```

4) 使用 Ollama 模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/llama3.3" }
    }
  }
}
```

## 模型发现（隐式 provider）

当设置了 `OLLAMA_API_KEY`（或认证配置），且**未**定义 `models.providers.ollama` 时，Moltbot 会从本地 Ollama 实例 `http://127.0.0.1:11434` 发现模型：

- 查询 `/api/tags` 与 `/api/show`
- 仅保留报告 `tools` 能力的模型
- 当模型报告 `thinking` 时标记为 `reasoning`
- 从 `model_info["<arch>.context_length"]` 读取 `contextWindow`
- 将 `maxTokens` 设为上下文窗口的 10 倍
- 将成本全部设为 `0`

这样无需手动写模型条目，同时保持与 Ollama 能力一致。

查看可用模型：

```bash
ollama list
moltbot models list
```

新增模型只需拉取：

```bash
ollama pull mistral
```

新模型会自动发现并可用。

如果显式设置 `models.providers.ollama`，则会跳过自动发现，需手动定义模型（见下）。

## 配置

### 基础设置（隐式发现）

最简单的启用方式是环境变量：

```bash
export OLLAMA_API_KEY="ollama-local"
```

### 显式设置（手动模型）

以下场景使用显式配置：
- Ollama 运行在其它主机或端口。
- 需要强制特定上下文窗口或模型列表。
- 想包含未报告工具支持的模型。

```json5
{
  models: {
    providers: {
      ollama: {
        // 使用包含 /v1 的主机以适配 OpenAI 兼容 API
        baseUrl: "http://ollama-host:11434/v1",
        apiKey: "ollama-local",
        api: "openai-completions",
        models: [
          {
            id: "llama3.3",
            name: "Llama 3.3",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

若已设置 `OLLAMA_API_KEY`，可在 provider 条目中省略 `apiKey`，Moltbot 会用于可用性检查。

### 自定义 base URL（显式配置）

若 Ollama 运行在不同主机或端口（显式配置会禁用自动发现，因此需手动定义模型）：

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434/v1"
      }
    }
  }
}
```

### 模型选择

配置完成后，所有 Ollama 模型都可用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/llama3.3",
        fallback: ["ollama/qwen2.5-coder:32b"]
      }
    }
  }
}
```

## 高级

### 推理模型

当 Ollama 在 `/api/show` 报告 `thinking` 时，Moltbot 会标记为推理模型：

```bash
ollama pull deepseek-r1:32b
```

### 模型成本

Ollama 在本地运行且免费，因此所有模型成本设为 $0。

### 上下文窗口

对自动发现的模型，Moltbot 优先使用 Ollama 报告的上下文窗口，否则默认 `8192`。你可以在显式 provider 配置中覆盖 `contextWindow` 与 `maxTokens`。

## 故障排查

### 未检测到 Ollama

确认 Ollama 正在运行，并设置了 `OLLAMA_API_KEY`（或认证配置），且**未**定义显式 `models.providers.ollama`：

```bash
ollama serve
```

并确认 API 可访问：

```bash
curl http://localhost:11434/api/tags
```

### 无可用模型

Moltbot 仅自动发现报告工具支持的模型。若未列出你的模型：
- 拉取支持工具的模型，或
- 在 `models.providers.ollama` 中显式定义该模型。

添加模型：

```bash
ollama list  # 查看已安装
ollama pull llama3.3  # 拉取模型
```
