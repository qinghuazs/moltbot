---
summary: "Zalo 机器人支持状态、能力与配置"
read_when:
  - 在处理 Zalo 功能或 webhook 时
---
# Zalo（Bot API）

状态：实验性。仅支持私聊；Zalo 文档称群聊即将支持。

## 需要插件
Zalo 作为插件提供，不随核心安装包附带。
- 通过 CLI 安装：`moltbot plugins install @moltbot/zalo`
- 或在引导中选择 **Zalo** 并确认安装
- 详情：见 [插件](/plugin)

## 快速上手（新手）
1) 安装 Zalo 插件：
   - 源码检出：`moltbot plugins install ./extensions/zalo`
   - npm（若已发布）：`moltbot plugins install @moltbot/zalo`
   - 或在引导中选择 **Zalo** 并确认安装
2) 设置 token：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置：`channels.zalo.botToken: "..."`。
3) 重启 gateway（或完成引导）。
4) 私聊默认配对；首次联系时批准配对码。

最小配置：
```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing"
    }
  }
}
```

## 这是什么
Zalo 是面向越南的消息应用；其 Bot API 允许 Gateway 运行 1:1 机器人。
适用于需要确定性路由回 Zalo 的支持或通知场景。
- Gateway 持有的 Zalo Bot API 渠道。
- 确定性路由：回复回到 Zalo；模型不会选择渠道。
- 私聊共享 agent 主会话。
- 群聊尚不支持（Zalo 文档称“coming soon”）。

## 设置（快速路径）

### 1) 创建 bot token（Zalo Bot Platform）
1) 打开 **https://bot.zaloplatforms.com** 并登录。
2) 创建新 bot 并配置设置。
3) 复制 bot token（格式：`12345689:abc-xyz`）。

### 2) 配置 token（env 或 config）
示例：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing"
    }
  }
}
```

环境变量：`ZALO_BOT_TOKEN=...`（仅默认账号）。

多账号支持：使用 `channels.zalo.accounts` 为每个账号配置 token 与可选 `name`。

3) 重启 gateway。解析到 token 后 Zalo 即启动（env 或 config）。
4) 私聊默认配对；首次联系机器人时批准配对码。

## 工作方式（行为）
- 入站消息会规范化为共享渠道信封，带媒体占位符。
- 回复总是回到同一 Zalo 聊天。
- 默认长轮询；配置 `channels.zalo.webhookUrl` 可用 webhook。

## 限制
- 出站文本按 2000 字符分块（Zalo API 限制）。
- 媒体下载/上传上限由 `channels.zalo.mediaMaxMb` 控制（默认 5）。
- 由于 2000 字符限制，流式默认被阻止。

## 访问控制（私聊）

### 私聊访问
- 默认：`channels.zalo.dmPolicy = "pairing"`。陌生发送者收到配对码；未批准前消息被忽略（码 1 小时过期）。
- 批准方式：
  - `moltbot pairing list zalo`
  - `moltbot pairing approve zalo <CODE>`
- 配对是默认令牌交换方式。详情：见 [配对](/start/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（无用户名查找）。

## 长轮询 vs webhook
- 默认：长轮询（无需公网 URL）。
- Webhook 模式：设置 `channels.zalo.webhookUrl` 与 `channels.zalo.webhookSecret`。
  - secret 长度必须 8–256 字符。
  - webhook URL 必须是 HTTPS。
  - Zalo 通过 `X-Bot-Api-Secret-Token` 头验证事件。
  - Gateway 在 `channels.zalo.webhookPath` 处理 webhook（默认使用 webhook URL 的路径）。

**注意：** Zalo API 文档说明 getUpdates（轮询）与 webhook 互斥。

## 支持的消息类型
- **文本消息**：完全支持，按 2000 字符分块。
- **图片消息**：下载并处理入站图片；通过 `sendPhoto` 发送。
- **贴纸**：记录但不做完整处理（不触发 agent 回复）。
- **不支持类型**：仅记录（例如来自受保护用户的消息）。

## 能力
| 功能 | 状态 |
|---------|--------|
| 私聊 | ✅ 支持 |
| 群聊 | ❌ 即将支持（Zalo 文档） |
| 媒体（图片） | ✅ 支持 |
| 反应 | ❌ 不支持 |
| 线程 | ❌ 不支持 |
| 投票 | ❌ 不支持 |
| 原生命令 | ❌ 不支持 |
| 流式 | ⚠️ 禁用（2000 字符限制） |

## 投递目标（CLI/cron）
- 目标使用 chat id。
- 示例：`moltbot message send --channel zalo --target 123456789 --message "hi"`。

## 故障排查

**机器人不回复：**
- 检查 token 是否有效：`moltbot channels status --probe`
- 确认发送者已获批准（配对或 allowFrom）
- 查看 gateway 日志：`moltbot logs --follow`

**Webhook 收不到事件：**
- 确保 webhook URL 使用 HTTPS
- 确认 secret 长度为 8–256 字符
- 确认 gateway HTTP 端点在配置路径可达
- 确认未启用 getUpdates 轮询（两者互斥）

## 配置参考（Zalo）
完整配置：见 [配置](/gateway/configuration)

Provider 选项：
- `channels.zalo.enabled`：启用/禁用渠道启动。
- `channels.zalo.botToken`：Zalo Bot Platform token。
- `channels.zalo.tokenFile`：从文件读取 token。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私聊 allowlist（用户 ID）。`open` 需包含 `"*"`。向导会要求数字 ID。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（需 HTTPS）。
- `channels.zalo.webhookSecret`：webhook secret（8–256 字符）。
- `channels.zalo.webhookPath`：gateway HTTP 服务器的 webhook 路径。
- `channels.zalo.proxy`：API 请求代理 URL。

多账号选项：
- `channels.zalo.accounts.<id>.botToken`：按账号 token。
- `channels.zalo.accounts.<id>.tokenFile`：按账号 token 文件。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账号。
- `channels.zalo.accounts.<id>.dmPolicy`：按账号 DM 策略。
- `channels.zalo.accounts.<id>.allowFrom`：按账号 allowlist。
- `channels.zalo.accounts.<id>.webhookUrl`：按账号 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：按账号 webhook secret。
- `channels.zalo.accounts.<id>.webhookPath`：按账号 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`：按账号代理 URL。
