---
summary: "代理循环的生命周期、流与等待语义"
read_when:
  - 你需要精确了解代理循环或生命周期事件
---
# Agent Loop（Moltbot）

代理循环是一次完整的“真实”代理运行：输入 → 上下文组装 → 模型推理 →
工具执行 → 流式回复 → 持久化。它是将消息转化为动作与最终回复的权威路径，同时保持会话状态一致。

在 Moltbot 中，一个循环对应某个会话的单次串行运行，会在模型思考、调用工具与输出流时发出生命周期与流事件。本文解释该真实循环的端到端连接方式。

## 入口
- Gateway RPC：`agent` 与 `agent.wait`。
- CLI：`agent` 命令。

## 工作方式（高层）
1) `agent` RPC 校验参数，解析会话（sessionKey/sessionId），持久化会话元数据，并立即返回 `{ runId, acceptedAt }`。
2) `agentCommand` 运行代理：
   - 解析模型与 thinking/verbose 默认值
   - 加载技能快照
   - 调用 `runEmbeddedPiAgent`（pi-agent-core 运行时）
   - 如果嵌入循环未发出，则补发 **lifecycle end/error**
3) `runEmbeddedPiAgent`：
   - 通过按会话与全局队列串行化运行
   - 解析模型与认证配置并构建 pi 会话
   - 订阅 pi 事件并流式输出 assistant 与 tool 增量
   - 强制超时，超过即中止运行
   - 返回 payload 与用量元数据
4) `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 Moltbot `agent` 流：
   - tool 事件 => `stream: "tool"`
   - assistant 增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）
5) `agent.wait` 使用 `waitForAgentJob`：
   - 等待 `runId` 的 **lifecycle end/error**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队与并发
- 运行按会话 key（会话通道）串行，可选再经过全局通道。
- 这可避免工具与会话竞态，并保证会话历史一致。
- 消息渠道可选择队列模式（collect/steer/followup），并接入该通道系统。
  见 [Command Queue](/concepts/queue)。

## 会话与工作区准备
- 解析并创建工作区；沙箱运行可能重定向到沙箱工作区根目录。
- 加载技能（或复用快照），并注入到环境与提示词中。
- 解析 bootstrap/context 文件并注入到系统提示词报告。
- 获取会话写锁；在开始流式输出前打开并准备 `SessionManager`。

## 提示词组装与系统提示词
- 系统提示词由 Moltbot 基础提示词、技能提示词、bootstrap 上下文与每次运行覆盖构建而成。
- 强制模型特定限制与压缩预留 token。
- 见 [System prompt](/concepts/system-prompt) 了解模型看到的内容。

## Hook 点（可拦截位置）
Moltbot 有两套 hook 系统：
- **内部 hooks**（Gateway hooks）：用于命令与生命周期事件的事件驱动脚本。
- **插件 hooks**：代理与工具生命周期及 gateway 管线内的扩展点。

### 内部 hooks（Gateway hooks）
- **`agent:bootstrap`**：在系统提示词最终确定前构建 bootstrap 文件时运行。
  用于添加或移除 bootstrap 上下文文件。
- **命令 hooks**：`/new`、`/reset`、`/stop` 等命令事件（见 Hooks 文档）。

设置与示例见 [Hooks](/hooks)。

### 插件 hooks（代理与 gateway 生命周期）
这些在代理循环或 gateway 管线中运行：
- **`before_agent_start`**：在运行开始前注入上下文或覆盖系统提示词。
- **`agent_end`**：完成后检查最终消息列表与运行元数据。
- **`before_compaction` / `after_compaction`**：观察或标注压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数或结果。
- **`tool_result_persist`**：在写入会话记录前同步转换工具结果。
- **`message_received` / `message_sending` / `message_sent`**：入站与出站消息 hooks。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：gateway 生命周期事件。

Hook API 与注册细节见 [Plugins](/plugin#plugin-hooks)。

## 流式输出与部分回复
- assistant 增量由 pi-agent-core 流出，并作为 `assistant` 事件发送。
- 块式流可在 `text_end` 或 `message_end` 输出部分回复。
- 推理流可作为独立流或块式回复输出。
- 分块与块式行为见 [Streaming](/concepts/streaming)。

## 工具执行与消息工具
- 工具 start/update/end 事件会在 `tool` 流中发出。
- 工具结果在记录或发送前会进行大小与图像载荷清理。
- 会跟踪消息工具发送以抑制重复的 assistant 确认。

## 回复整形与抑制
- 最终 payload 由以下内容组成：
  - assistant 文本（以及可选推理）
  - 内联工具摘要（当 verbose 且允许时）
  - 模型错误时的 assistant 错误文本
- `NO_REPLY` 被视为静默 token，并从输出 payload 中过滤。
- 消息工具重复项会从最终 payload 列表中移除。
- 若没有可渲染 payload 且工具出错，则会发出回退的工具错误回复
  （除非消息工具已经发送了用户可见回复）。

## 压缩与重试
- 自动压缩会发出 `compaction` 流事件，并可能触发重试。
- 重试时会重置内存缓冲与工具摘要，避免重复输出。
- 压缩管线见 [Compaction](/concepts/compaction)。

## 事件流（当前）
- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（`agentCommand` 会兜底）
- `assistant`：pi-agent-core 的增量流
- `tool`：pi-agent-core 的工具事件流

## 聊天渠道处理
- assistant 增量会缓冲为聊天 `delta` 消息。
- 聊天 `final` 会在 **lifecycle end/error** 时发出。

## 超时
- `agent.wait` 默认 30 秒（仅等待）。可通过 `timeoutMs` 参数覆盖。
- 代理运行时：`agents.defaults.timeoutSeconds` 默认 600 秒；在 `runEmbeddedPiAgent` 中强制执行中止计时器。

## 可提前结束的情况
- 代理超时（中止）
- AbortSignal（取消）
- Gateway 断开或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止代理）
