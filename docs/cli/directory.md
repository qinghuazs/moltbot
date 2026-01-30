---
summary: "`moltbot directory` CLI 参考（self、peers、groups）"
read_when:
  - 您想查找频道的联系人/群组/自身 ID
  - 您正在开发频道目录适配器
---

# `moltbot directory`

支持目录功能的频道的目录查询（联系人/peers、群组和"我"）。

## 通用参数
- `--channel <name>`：频道 id/别名（配置多个频道时必需；只配置一个时自动选择）
- `--account <id>`：账户 id（默认：频道默认值）
- `--json`：输出 JSON

## 说明
- `directory` 旨在帮助您找到可以粘贴到其他命令中的 ID（特别是 `moltbot message send --target ...`）。
- 对于许多频道，结果是基于配置的（允许列表/已配置的群组），而不是实时的提供商目录。
- 默认输出是用制表符分隔的 `id`（有时还有 `name`）；使用 `--json` 进行脚本处理。

## 与 `message send` 配合使用

```bash
moltbot directory peers list --channel slack --query "U0"
moltbot message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按频道）

- WhatsApp：`+15551234567`（私聊），`1234567890-1234567890@g.us`（群组）
- Telegram：`@username` 或数字聊天 id；群组是数字 id
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix（插件）：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams（插件）：`user:<id>` 和 `conversation:<id>`
- Zalo（插件）：用户 id（Bot API）
- Zalo Personal / `zalouser`（插件）：来自 `zca` 的线程 id（私聊/群组）（`me`、`friend list`、`group list`）

## Self（"我"）

```bash
moltbot directory self --channel zalouser
```

## Peers（联系人/用户）

```bash
moltbot directory peers list --channel zalouser
moltbot directory peers list --channel zalouser --query "name"
moltbot directory peers list --channel zalouser --limit 50
```

## 群组

```bash
moltbot directory groups list --channel zalouser
moltbot directory groups list --channel zalouser --query "work"
moltbot directory groups members --channel zalouser --group-id <id>
```
