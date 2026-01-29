---
summary: "子代理：生成隔离的 agent 运行并向请求者聊天回传结果"
read_when:
  - 想通过 agent 做后台/并行任务
  - 修改 sessions_spawn 或子代理工具策略
---

# 子代理

子代理是在现有 agent 运行中生成的后台 agent 任务。它们运行在自己的会话中（`agent:<agentId>:subagent:<uuid>`），完成后会**宣布**结果到请求者聊天渠道。

## 斜杠命令

使用 `/subagents` 查看或控制**当前会话**的子代理运行：
- `/subagents list`
- `/subagents stop <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`

`/subagents info` 显示运行元数据（状态、时间戳、会话 id、转录路径、清理策略）。

主要目标：
- 并行化“研究/长任务/慢工具”而不阻塞主运行。
- 默认隔离子代理（会话隔离 + 可选沙箱）。
- 工具表面尽量不易误用：子代理默认**不**带会话工具。
- 避免嵌套扩散：子代理不能再生成子代理。

成本提示：每个子代理有**自己的**上下文与 token 用量。重任务或重复任务可给子代理设置更便宜的模型，主 agent 继续用高质量模型。
可通过 `agents.defaults.subagents.model` 或按 agent 覆盖来配置。

## 工具

使用 `sessions_spawn`：
- 启动子代理运行（`deliver: false`，全局通道：`subagent`）
- 然后执行 announce 步骤，并将 announce 回复回传到请求者聊天渠道
- 默认模型：继承调用者，除非设置 `agents.defaults.subagents.model`（或 `agents.list[].subagents.model`）；显式 `sessions_spawn.model` 优先

工具参数：
- `task`（必填）
- `label?`（可选）
- `agentId?`（可选；允许时可用其他 agent id 运行）
- `model?`（可选；覆盖子代理模型；无效值会被跳过，子代理改用默认模型，并在工具结果里警告）
- `thinking?`（可选；覆盖子代理思考级别）
- `runTimeoutSeconds?`（默认 `0`；设置后超时会中止子代理）
- `cleanup?`（`delete|keep`，默认 `keep`）

Allowlist：
- `agents.list[].subagents.allowAgents`：允许通过 `agentId` 指定的 agent id 列表（`["*"]` 表示任意）。默认仅允许请求者 agent。

发现：
- 使用 `agents_list` 查看当前允许用于 `sessions_spawn` 的 agent id。

自动归档：
- 子代理会话在 `agents.defaults.subagents.archiveAfterMinutes`（默认 60）后自动归档。
- 归档通过 `sessions.delete` 实现，并将转录文件重命名为 `*.deleted.<timestamp>`（同目录）。
- `cleanup: "delete"` 会在 announce 后立刻归档（仍保留转录文件，通过重命名）。
- 自动归档为尽力而为；Gateway 重启会丢失待处理的计时器。
- `runTimeoutSeconds` **不会**触发归档，仅中止运行；会话会保留直到自动归档。

## 认证

子代理认证按 **agent id** 解析，而非会话类型：
- 子代理会话 key 为 `agent:<agentId>:subagent:<uuid>`。
- 认证存储从该 agent 的 `agentDir` 读取。
- 主 agent 的认证配置会作为**回退**合并；子代理配置优先覆盖冲突。

注意：合并为叠加式，主配置始终可作为回退。目前不支持完全隔离认证。

## Announce

子代理通过 announce 步骤回报：
- Announce 步骤在子代理会话内执行（非请求者会话）。
- 若子代理回复 `ANNOUNCE_SKIP`，不会发送任何消息。
- 否则 announce 回复会通过后续 `agent` 调用投递到请求者聊天渠道（`deliver=true`）。
- Announce 会尽量保留线程/主题路由（Slack 线程、Telegram 主题、Matrix 线程）。
- Announce 消息使用稳定模板：
  - `Status:` 来自运行结果（`success`、`error`、`timeout` 或 `unknown`）。
  - `Result:` 来自 announce 步骤的摘要（缺失则为 `(not available)`）。
  - `Notes:` 错误细节与其他上下文。
- `Status` 不由模型输出推断，而来自运行时结果信号。

Announce payload 末尾包含统计行（即使被包装）：
- 运行时长（如 `runtime 5m12s`）
- Token 用量（输入/输出/总计）
- 若配置了模型价格（`models.providers.*.models[].cost`）则包含预估成本
- `sessionKey`、`sessionId` 与转录路径（方便主 agent 用 `sessions_history` 或直接查文件）

## 工具策略（子代理工具）

默认子代理**拥有除会话工具外的所有工具**：
- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

可通过配置覆盖：

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1
      }
    }
  },
  tools: {
    subagents: {
      tools: {
        // deny 优先
        deny: ["gateway", "cron"],
        // 若设置 allow，则为 allow-only（deny 仍优先）
        // allow: ["read", "exec", "process"]
      }
    }
  }
}
```

## 并发

子代理使用专用进程内队列通道：
- 通道名：`subagent`
- 并发数：`agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话并停止其生成的子代理运行。

## 限制

- 子代理 announce 为**尽力而为**。Gateway 重启会丢失待回传的 announce。
- 子代理与主进程共享资源；`maxConcurrent` 应作为安全阀。
- `sessions_spawn` 始终非阻塞：立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
