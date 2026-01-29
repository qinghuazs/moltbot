---
summary: "调试工具：watch 模式、原始模型流与 reasoning 泄漏追踪"
read_when:
  - 需要检查 reasoning 是否泄漏到原始输出
  - 想在迭代时用 watch 模式运行 Gateway
  - 需要可复现的调试流程
---

# 调试

本页介绍流式输出的调试助手，尤其是 provider 把 reasoning 混入正常文本的情况。

## 运行时调试覆盖

在聊天中用 `/debug` 设置 **仅运行时** 的配置覆盖（内存中，不写盘）。
`/debug` 默认关闭；通过 `commands.debug: true` 启用。
当需要切换冷门设置但不想编辑 `moltbot.json` 时很有用。

示例：

```
/debug show
/debug set messages.responsePrefix="[moltbot]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 会清空所有覆盖并回到磁盘配置。

## Gateway watch 模式

快速迭代时，用文件监视器运行 gateway：

```bash
pnpm gateway:watch --force
```

等价于：

```bash
tsx watch src/entry.ts gateway --force
```

将 gateway CLI 选项写在 `gateway:watch` 之后，会在每次重启时传入。

## Dev profile + dev gateway（--dev）

使用 dev profile 隔离状态，得到安全、可抛弃的调试环境。有 **两个** `--dev`：

- **全局 `--dev`（profile）**：把状态隔离到 `~/.clawdbot-dev`，默认网关端口 `19001`（派生端口随之偏移）。
- **`gateway --dev`**：当缺少配置/工作区时自动创建默认配置 + 工作区（并跳过 BOOTSTRAP.md）。

推荐流程（dev profile + dev bootstrap）：

```bash
pnpm gateway:dev
CLAWDBOT_PROFILE=dev moltbot tui
```

如果尚未全局安装，可使用 `pnpm moltbot ...`。

它会做的事：

1) **Profile 隔离**（全局 `--dev`）
   - `CLAWDBOT_PROFILE=dev`
   - `CLAWDBOT_STATE_DIR=~/.clawdbot-dev`
   - `CLAWDBOT_CONFIG_PATH=~/.clawdbot-dev/moltbot.json`
   - `CLAWDBOT_GATEWAY_PORT=19001`（browser/canvas 也会偏移）

2) **Dev bootstrap**（`gateway --dev`）
   - 若配置缺失则写入最小配置（`gateway.mode=local`，bind loopback）。
   - 设置 `agent.workspace` 为 dev 工作区。
   - 设置 `agent.skipBootstrap=true`（不加载 BOOTSTRAP.md）。
   - 若工作区缺失则创建并写入：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认身份：**C3‑PO**（协议机器人）。
   - dev 模式跳过通道 provider（`CLAWDBOT_SKIP_CHANNELS=1`）。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是 **全局** profile 标志，可能被某些 runner 吃掉。
若需要显式写出，使用环境变量形式：

```bash
CLAWDBOT_PROFILE=dev moltbot gateway --dev --reset
```

`--reset` 会清空配置、凭据、会话与 dev 工作区（使用 `trash` 而不是 `rm`），然后重建默认 dev 设置。

提示：如果非 dev 的 gateway 已在运行（launchd/systemd），先停掉：

```bash
moltbot gateway stop
```

## 原始流日志（Moltbot）

Moltbot 可记录 **原始 assistant 流**（在任何过滤/格式化之前）。
这是检查 reasoning 是否以纯文本 delta 输出（或作为独立思考块）的最佳方式。

通过 CLI 启用：

```bash
pnpm gateway:watch --force --raw-stream
```

可选路径覆盖：

```bash
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.clawdbot/logs/raw-stream.jsonl
```

等价环境变量：

```bash
CLAWDBOT_RAW_STREAM=1
CLAWDBOT_RAW_STREAM_PATH=~/.clawdbot/logs/raw-stream.jsonl
```

默认文件：

`~/.clawdbot/logs/raw-stream.jsonl`

## 原始 chunk 日志（pi-mono）

要捕获解析成块之前的 **原始 OpenAI 兼容 chunks**，pi-mono 提供单独 logger：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：仅使用 pi-mono 的 `openai-completions` provider 时才会输出。

## 安全提示

- 原始流日志可能包含完整 prompt、工具输出与用户数据。
- 日志仅在本地保存，调试后请删除。
- 分享日志前务必脱敏机密与 PII。
