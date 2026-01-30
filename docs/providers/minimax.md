---
summary: "在 Moltbot 中使用 MiniMax M2.1"
read_when:
  - 想在 Moltbot 中使用 MiniMax 模型
  - 需要 MiniMax 设置指南
---
# MiniMax

MiniMax 是一家 AI 公司，构建 **M2/M2.1** 模型家族。当前面向编码的版本是 **MiniMax M2.1**（2025-12-23），适用于真实复杂任务。

来源：[MiniMax M2.1 release note](https://www.minimax.io/news/minimax-m21)

## 模型概览（M2.1）

MiniMax 在 M2.1 中强调以下改进：

- 更强的**多语言编码**（Rust、Java、Go、C++、Kotlin、Objective-C、TS/JS）。
- 更好的**Web/应用开发**与审美输出质量（含原生移动端）。
- 改进**复合指令**处理，用于办公类流程，基于交错思考与约束执行。
- **更精简的回复**，更低 token 消耗与更快迭代。
- 更强的**工具或代理框架**兼容与上下文管理（Claude Code、Droid/Factory AI、Cline、Kilo Code、Roo Code、BlackBox）。
- 更高质量的**对话与技术写作**输出。

## MiniMax M2.1 与 MiniMax M2.1 Lightning

- **速度：**Lightning 是定价文档中的“快速”版本。
- **成本：**定价显示输入成本相同，但 Lightning 的输出成本更高。
- **Coding 计划路由：**Lightning 后端在 MiniMax Coding Plan 中不可直接使用。MiniMax 会将多数请求自动路由到 Lightning，但在流量高峰时回退到常规 M2.1 后端。

## 选择方案

### MiniMax M2.1（推荐）

**适合：**使用 Anthropic 兼容 API 的托管 MiniMax。

通过 CLI 配置：
- 运行 `moltbot configure`
- 选择 **Model/auth**
- 选择 **MiniMax M2.1**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.1",
            name: "MiniMax M2.1",
            reasoning: false,
            input: ["text"],
            cost: { input: 15, output: 60, cacheRead: 2, cacheWrite: 10 },
            contextWindow: 200000,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

### MiniMax M2.1 作为回退（Opus 为主）

**适合：**主模型保持 Opus 4.5，回退到 MiniMax M2.1。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "minimax/MiniMax-M2.1": { alias: "minimax" }
      },
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: ["minimax/MiniMax-M2.1"]
      }
    }
  }
}
```

### 可选：通过 LM Studio 本地运行（手动）

**适合：**使用 LM Studio 本地推理。
我们在高性能硬件（如桌面或服务器）上使用 LM Studio 本地服务器测试 MiniMax M2.1 表现良好。

通过 `moltbot.json` 手动配置：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.1-gs32" },
      models: { "lmstudio/minimax-m2.1-gs32": { alias: "Minimax" } }
    }
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

## 使用 `moltbot configure` 配置

通过交互向导配置 MiniMax，无需编辑 JSON：

1) 运行 `moltbot configure`。
2) 选择 **Model/auth**。
3) 选择 **MiniMax M2.1**。
4) 提示时选择默认模型。

## 配置选项

- `models.providers.minimax.baseUrl`：推荐 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 可选用于 OpenAI 兼容 payload。
- `models.providers.minimax.api`：推荐 `anthropic-messages`；`openai-completions` 可选用于 OpenAI 兼容 payload。
- `models.providers.minimax.apiKey`：MiniMax API key（`MINIMAX_API_KEY`）。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：为允许列表中的模型设置别名。
- `models.mode`：如果要与内置模型并存，保持 `merge`。

## 说明

- 模型引用格式为 `minimax/<model>`。
- Coding Plan 用量 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan key）。
- 若需精确成本跟踪，请更新 `models.json` 中的价格。
- MiniMax Coding Plan 返佣链接（9 折）：https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link
- 提供商规则见 [/concepts/model-providers](/concepts/model-providers)。
- 使用 `moltbot models list` 和 `moltbot models set minimax/MiniMax-M2.1` 切换。

## 故障排查

### “Unknown model: minimax/MiniMax-M2.1”

通常意味着**未配置 MiniMax provider**（没有 provider 条目且未找到 MiniMax 认证或环境变量 key）。该检测的修复在 **2026.1.12**（撰写时未发布）。可通过以下方式修复：
- 升级到 **2026.1.12**（或从源码 `main` 运行），然后重启 gateway。
- 运行 `moltbot configure` 并选择 **MiniMax M2.1**，或
- 手动添加 `models.providers.minimax` 区块，或
- 设置 `MINIMAX_API_KEY`（或 MiniMax 认证配置），以便注入 provider。

确保模型 id **区分大小写**：
- `minimax/MiniMax-M2.1`
- `minimax/MiniMax-M2.1-lightning`

然后重新检查：
```bash
moltbot models list
```
