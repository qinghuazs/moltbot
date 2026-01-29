---
summary: "CLI 后端：通过本地 AI CLI 的纯文本兜底"
read_when:
  - 当 API 提供方失败时需要可靠兜底
  - 运行 Claude Code CLI 或其他本地 AI CLI 并希望复用
  - 需要一个纯文本、无工具但支持会话和图片的路径
---
# CLI 后端（兜底运行时）

当 API 提供方宕机、限流或临时异常时，Moltbot 可运行 **本地 AI CLI** 作为 **纯文本兜底**。这是刻意保守的：

- **禁用工具**（不进行工具调用）。
- **文本输入 → 文本输出**（可靠）。
- **支持会话**（后续对话保持一致）。
- **可传图片**（若 CLI 接受图片路径）。

这是一个 **安全网** 而非主路径。用于在不依赖外部 API 的情况下确保“始终可用”的文本回复。

## 入门快速开始

无需配置即可使用 Claude Code CLI（Moltbot 内置默认）：

```bash
moltbot agent --message "hi" --model claude-cli/opus-4.5
```

Codex CLI 也可直接使用：

```bash
moltbot agent --message "hi" --model codex-cli/gpt-5.2-codex
```

若你的 gateway 运行在 launchd/systemd 且 PATH 很精简，补充命令路径即可：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude"
        }
      }
    }
  }
}
```

这样就可以了。不需要额外 key 或认证配置（CLI 自身的认证除外）。

## 作为 fallback 使用

将 CLI 后端加入 fallback 列表，只在主模型失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: [
          "claude-cli/opus-4.5"
        ]
      },
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "claude-cli/opus-4.5": {}
      }
    }
  }
}
```

说明：
- 若使用 `agents.defaults.models`（allowlist），必须包含 `claude-cli/...`。
- 主提供方失败（认证、限流、超时）时，Moltbot 会尝试 CLI 后端。

## 配置概览

所有 CLI 后端位于：

```
agents.defaults.cliBackends
```

每个条目以 **provider id** 为键（如 `claude-cli`、`my-cli`）。
该 id 会成为 model 引用的左侧：

```
<provider>/<model>
```

### 配置示例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude"
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-5": "opus",
            "claude-sonnet-4-5": "sonnet"
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true
        }
      }
    }
  }
}
```

## 工作原理

1) **按 provider 前缀选择后端**（`claude-cli/...`）。
2) **构建系统提示**（使用 Moltbot prompt + 工作区上下文）。
3) **执行 CLI**，带 session id（若支持）以保持历史一致。
4) **解析输出**（JSON 或纯文本）并返回最终文本。
5) **持久化 session id**（按后端），使后续会话复用同一 CLI 会话。

## 会话

- 若 CLI 支持会话，设置 `sessionArg`（如 `--session-id`）或
  `sessionArgs`（当 session id 需要插入多个参数时使用占位符 `{sessionId}`）。
- 若 CLI 使用 **resume 子命令** 且参数不同，设置
  `resumeArgs`（恢复时替换 `args`）并可选 `resumeOutput`
  （用于非 JSON 的恢复输出）。
- `sessionMode`：
  - `always`：总是发送 session id（若无存储则生成新 UUID）。
  - `existing`：仅在已有存储时发送 session id。
  - `none`：从不发送 session id。

## 图片（透传）

若 CLI 接受图片路径，设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

Moltbot 会把 base64 图片写入临时文件。若设置 `imageArg`，路径会作为 CLI 参数传递。若未设置，Moltbot 会把文件路径追加到 prompt（路径注入），对可从纯路径自动加载本地文件的 CLI 也足够（Claude Code CLI 行为）。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + session id。
- `output: "jsonl"` 解析 JSONL 流（Codex CLI `--json`）并提取最后一条 agent 消息与 `thread_id`（若存在）。
- `output: "text"` 将 stdout 作为最终响应。

输入模式：
- `input: "arg"`（默认）将 prompt 作为 CLI 最后一个参数。
- `input: "stdin"` 通过 stdin 发送 prompt。
- 若 prompt 很长且设置了 `maxPromptArgChars`，会改用 stdin。

## 默认值（内置）

Moltbot 内置 `claude-cli` 默认值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--dangerously-skip-permissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--dangerously-skip-permissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

Moltbot 也内置 `codex-cli` 默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

只有在需要时才覆盖（常见：使用绝对 `command` 路径）。

## 限制

- **无 Moltbot 工具**（CLI 后端不会收到工具调用）。部分 CLI 可能仍会运行自身工具。
- **无流式**（收集输出后再返回）。
- **结构化输出** 依赖 CLI 的 JSON 格式。
- **Codex CLI 会话** 的恢复输出是纯文本（非 JSONL），结构化程度低于首次 `--json` 运行。Moltbot 会话仍可正常工作。

## 排障

- **找不到 CLI**：将 `command` 设为完整路径。
- **模型名错误**：用 `modelAliases` 将 `provider/model` 映射到 CLI 的模型名。
- **会话不连续**：确保设置 `sessionArg` 且 `sessionMode` 不是 `none`（Codex CLI 当前无法以 JSON 输出恢复）。
- **图片被忽略**：设置 `imageArg`（并确认 CLI 支持文件路径）。
