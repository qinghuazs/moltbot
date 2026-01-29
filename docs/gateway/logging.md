---
summary: "日志出口、文件日志、WS 日志样式与控制台格式"
read_when:
  - 修改日志输出或格式
  - 排查 CLI 或网关输出
---

# 日志

面向用户的概览（CLI + Control UI + 配置）请见 [/logging](/logging)。

Moltbot 有两类日志“出口”：

- **控制台输出**（终端/调试 UI 中看到的内容）。
- **文件日志**（JSON 行），由网关日志器写入。

## 文件日志器

- 默认滚动日志目录在 `/tmp/moltbot/`（每天一个文件）：`moltbot-YYYY-MM-DD.log`
  - 日期使用网关主机本地时区。
- 日志路径与级别可在 `~/.clawdbot/moltbot.json` 中配置：
  - `logging.file`
  - `logging.level`

文件格式为每行一个 JSON 对象。

Control UI 的 Logs 标签页会通过网关（`logs.tail`）尾随此文件。
CLI 也可这样做：

```bash
moltbot logs --follow
```

**Verbose 与日志级别**

- **文件日志**仅由 `logging.level` 控制。
- `--verbose` 只影响 **控制台输出**（以及 WS 日志样式），**不会** 提升文件日志级别。
- 如需把 verbose 才有的细节写入文件日志，将 `logging.level` 设为 `debug` 或 `trace`。

## 控制台捕获

CLI 会捕获 `console.log/info/warn/error/debug/trace` 并写入文件日志，同时仍输出到 stdout/stderr。

可独立调整控制台可见度：

- `logging.consoleLevel`（默认 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`）

## 工具摘要脱敏

Verbose 工具摘要（例如 `🛠️ Exec: ...`）会在进入控制台输出前屏蔽敏感令牌。
该功能 **仅作用于工具摘要**，不会改动文件日志。

- `logging.redactSensitive`：`off` | `tools`（默认 `tools`）
- `logging.redactPatterns`：正则字符串数组（覆盖默认值）
  - 使用原始正则字符串（自动 `gi`），或 `/pattern/flags` 以自定义 flags。
  - 命中内容会被遮蔽：保留前 6 + 后 4 个字符（长度 >= 18），否则输出 `***`。
  - 默认覆盖常见 key 赋值、CLI flags、JSON 字段、Bearer 头、PEM 块与常见 token 前缀。

## Gateway WebSocket 日志

网关会以两种模式打印 WebSocket 协议日志：

- **普通模式（无 `--verbose`）**：只打印“有价值”的 RPC 结果：
  - 错误（`ok=false`）
  - 慢调用（默认阈值：`>= 50ms`）
  - 解析错误
- **Verbose 模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`moltbot gateway` 支持按网关切换样式：

- `--ws-log auto`（默认）：普通模式优化；verbose 使用紧凑输出
- `--ws-log compact`：verbose 时使用紧凑输出（成对请求/响应）
- `--ws-log full`：verbose 时输出完整逐帧元信息
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
# 优化模式（仅错误/慢调用）
moltbot gateway

# 显示全部 WS 流量（成对）
moltbot gateway --verbose --ws-log compact

# 显示全部 WS 流量（完整元信息）
moltbot gateway --verbose --ws-log full
```

## 控制台格式（子系统日志）

控制台格式化器 **感知 TTY**，输出统一的前缀行。
子系统日志器让输出分组且易扫描。

行为：

- **每行带子系统前缀**（如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（每个子系统固定颜色）+ 级别颜色
- **当输出是 TTY 或环境像富终端时使用颜色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），并尊重 `NO_COLOR`
- **缩短子系统前缀**：去掉前导 `gateway/` + `channels/`，保留最后 2 段（例如 `whatsapp/outbound`）
- **按子系统的子日志器**（自动前缀 + 结构化字段 `{ subsystem }`）
- **`logRaw()`** 用于 QR/UX 输出（无前缀，无格式化）
- **控制台样式**（如 `pretty | compact | json`）
- **控制台日志级别** 与文件日志级别分离（当 `logging.level` 为 `debug`/`trace` 时，文件仍保留完整细节）
- **WhatsApp 消息正文** 仅以 `debug` 级别记录（用 `--verbose` 才可见）

这既保持了文件日志稳定，又让交互输出更易扫描。
