---
summary: "Moltbot 如何构建 prompt 上下文并报告 token 使用与成本"
read_when:
  - 解释 token 使用、成本或上下文窗口
  - 排查上下文增长或压缩行为
---
# Token 使用与成本

Moltbot 跟踪 **token** 而非字符。token 与模型有关，但大多数 OpenAI 风格模型的英文平均约 4 个字符/Token。

## 系统提示如何构建

Moltbot 每次运行都会拼装系统提示，包含：

- 工具列表与简短说明
- Skills 列表（仅元数据；指令按需用 `read` 加载）
- 自更新说明
- 工作区 + 启动文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 在新会话时加载）。大文件会按 `agents.defaults.bootstrapMaxChars` 截断（默认：20000）。
- 时间（UTC + 用户时区）
- 回复标签 + 心跳行为
- 运行时元信息（host/OS/model/thinking）

完整拆分见 [System Prompt](/concepts/system-prompt)。

## 上下文窗口包含哪些内容

模型收到的所有内容都会计入上下文限制：

- 系统提示（以上所有部分）
- 对话历史（用户 + assistant 消息）
- 工具调用与工具结果
- 附件/转录（图片、音频、文件）
- 压缩摘要与裁剪产物
- Provider 包装或安全头（不可见但仍计入）

查看注入文件、工具、skills 与系统提示大小的实际拆分，可用 `/context list` 或 `/context detail`。见 [Context](/concepts/context)。

## 如何查看当前 token 使用

在聊天中使用：

- `/status` → **富 emoji 状态卡**，包含会话模型、上下文使用、最近回复的输入/输出 tokens、以及 **估算成本**（仅 API key 模式）。
- `/usage off|tokens|full` → 为每条回复附加 **逐条使用量 footer**。
  - 会话内持久化（存储为 `responseUsage`）。
  - OAuth 认证 **隐藏成本**（仅显示 tokens）。
- `/usage cost` → 从 Moltbot 会话日志显示本地成本汇总。

其他界面：

- **TUI/Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `moltbot status --usage` 与 `moltbot channels list` 显示 provider 额度窗口（非逐条成本）。

## 成本估算（何时显示）

成本来自模型定价配置：

```
models.providers.<provider>.models[].cost
```

这些是 **每 100 万 tokens 的美元价格**，包含 `input`、`output`、`cacheRead`、`cacheWrite`。若缺失定价，Moltbot 仅显示 tokens。OAuth token 永不显示美元成本。

## 缓存 TTL 与裁剪影响

Provider 的 prompt caching 仅在缓存 TTL 窗口内有效。Moltbot 可选 **cache-ttl 裁剪**：当 cache TTL 过期后，它会裁剪会话并重置缓存窗口，使后续请求复用新缓存的上下文，而不是重新缓存完整历史。这能在会话空闲超过 TTL 时降低 cache 写入成本。

在 [Gateway configuration](/gateway/configuration) 中配置，并在 [Session pruning](/concepts/session-pruning) 查看行为细节。

心跳可在空闲间隙保持缓存 **温热**。若模型缓存 TTL 为 `1h`，将心跳间隔设为略小于它（如 `55m`）可避免重新缓存完整提示，从而降低 cache 写入成本。

对于 Anthropic 的 API 定价，cache read 比输入 tokens 便宜得多，而 cache write 的计费倍率更高。最新费率与 TTL 倍率见 Anthropic 的 prompt caching 定价文档：
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### 示例：用心跳保持 1h 缓存温热

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-5"
    models:
      "anthropic/claude-opus-4-5":
        params:
          cacheControlTtl: "1h"
    heartbeat:
      every: "55m"
```

## 降低 token 压力的技巧

- 用 `/compact` 总结长会话。
- 在流程里裁剪较大的工具输出。
- 保持技能描述简短（技能列表会注入到 prompt）。
- 对冗长、探索性工作优先使用小模型。

技能列表带来的精确开销公式见 [Skills](/tools/skills)。
