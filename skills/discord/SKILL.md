---
name: discord
description: Use when you need to control Discord from Moltbot via the discord tool: send messages, react, post or upload stickers, upload emojis, run polls, manage threads/pins/search, create/edit/delete channels and categories, fetch permissions or member/role/channel info, or handle moderation actions in Discord DMs or channels.
metadata: {"moltbot":{"emoji":"🎮","requires":{"config":["channels.discord"]}}}
---

# Discord 操作

## 概述

使用 `discord` 来管理消息、反应、线程、投票和审核。您可以通过 `discord.actions.*` 禁用组（默认启用，除了角色/审核）。该工具使用为 Moltbot 配置的机器人令牌。

## 需要收集的输入

- 对于反应：`channelId`、`messageId` 和一个 `emoji`。
- 对于 fetchMessage：`guildId`、`channelId`、`messageId`，或像 `https://discord.com/channels/<guildId>/<channelId>/<messageId>` 这样的 `messageLink`。
- 对于贴纸/投票/发送消息：一个 `to` 目标（`channel:<id>` 或 `user:<id>`）。可选的 `content` 文本。
- 投票还需要一个 `question` 加上 2-10 个 `answers`。
- 对于媒体：`mediaUrl`，本地文件使用 `file:///path`，远程文件使用 `https://...`。
- 对于表情符号上传：`guildId`、`name`、`mediaUrl`，可选的 `roleIds`（限制 256KB，PNG/JPG/GIF）。
- 对于贴纸上传：`guildId`、`name`、`description`、`tags`、`mediaUrl`（限制 512KB，PNG/APNG/Lottie JSON）。

消息上下文行包含您可以直接重用的 `discord message id` 和 `channel` 字段。

**注意：** `sendMessage` 使用 `to: "channel:<id>"` 格式，而不是 `channelId`。其他操作如 `react`、`readMessages`、`editMessage` 直接使用 `channelId`。
**注意：** `fetchMessage` 接受消息 ID 或完整链接，如 `https://discord.com/channels/<guildId>/<channelId>/<messageId>`。

## 操作

### 对消息做出反应

```json
{
  "action": "react",
  "channelId": "123",
  "messageId": "456",
  "emoji": "✅"
}
```

### 列出反应 + 用户

```json
{
  "action": "reactions",
  "channelId": "123",
  "messageId": "456",
  "limit": 100
}
```

### 发送贴纸

```json
{
  "action": "sticker",
  "to": "channel:123",
  "stickerIds": ["9876543210"],
  "content": "Nice work!"
}
```

- 每条消息最多 3 个贴纸 ID。
- `to` 可以是 `user:<id>` 用于私信。

### 上传自定义表情符号

```json
{
  "action": "emojiUpload",
  "guildId": "999",
  "name": "party_blob",
  "mediaUrl": "file:///tmp/party.png",
  "roleIds": ["222"]
}
```

- 表情符号图片必须是 PNG/JPG/GIF 且 <= 256KB。
- `roleIds` 是可选的；省略则表情符号对所有人可用。

### 上传贴纸

```json
{
  "action": "stickerUpload",
  "guildId": "999",
  "name": "moltbot_wave",
  "description": "Moltbot waving hello",
  "tags": "👋",
  "mediaUrl": "file:///tmp/wave.png"
}
```

- 贴纸需要 `name`、`description` 和 `tags`。
- 上传必须是 PNG/APNG/Lottie JSON 且 <= 512KB。

### 创建投票

```json
{
  "action": "poll",
  "to": "channel:123",
  "question": "Lunch?",
  "answers": ["Pizza", "Sushi", "Salad"],
  "allowMultiselect": false,
  "durationHours": 24,
  "content": "Vote now"
}
```

- `durationHours` 默认为 24；最多 32 天（768 小时）。

### 检查机器人对频道的权限

```json
{
  "action": "permissions",
  "channelId": "123"
}
```

## 尝试的想法

- 用 ✅/⚠️ 反应来标记状态更新。
- 为发布决策或会议时间发布快速投票。
- 在成功部署后发送庆祝贴纸。
- 为发布时刻上传新的表情符号/贴纸。
- 在团队频道中运行每周"优先级检查"投票。
- 当用户的请求完成时，私信贴纸作为确认。

## 操作门控

使用 `discord.actions.*` 禁用操作组：
- `reactions`（反应 + 反应列表 + 表情符号列表）
- `stickers`、`polls`、`permissions`、`messages`、`threads`、`pins`、`search`
- `emojiUploads`、`stickerUploads`
- `memberInfo`、`roleInfo`、`channelInfo`、`voiceStatus`、`events`
- `roles`（角色添加/移除，默认 `false`）
- `channels`（频道/类别创建/编辑/删除/移动，默认 `false`）
- `moderation`（超时/踢出/封禁，默认 `false`）
### 读取最近消息

```json
{
  "action": "readMessages",
  "channelId": "123",
  "limit": 20
}
```

### 获取单条消息

```json
{
  "action": "fetchMessage",
  "guildId": "999",
  "channelId": "123",
  "messageId": "456"
}
```

```json
{
  "action": "fetchMessage",
  "messageLink": "https://discord.com/channels/999/123/456"
}
```

### 发送/编辑/删除消息

```json
{
  "action": "sendMessage",
  "to": "channel:123",
  "content": "Hello from Moltbot"
}
```

**带媒体附件：**

```json
{
  "action": "sendMessage",
  "to": "channel:123",
  "content": "Check out this audio!",
  "mediaUrl": "file:///tmp/audio.mp3"
}
```

- `to` 使用格式 `channel:<id>` 或 `user:<id>` 用于私信（不是 `channelId`！）
- `mediaUrl` 支持本地文件（`file:///path/to/file`）和远程 URL（`https://...`）
- 可选的 `replyTo` 带消息 ID 来回复特定消息

```json
{
  "action": "editMessage",
  "channelId": "123",
  "messageId": "456",
  "content": "Fixed typo"
}
```

```json
{
  "action": "deleteMessage",
  "channelId": "123",
  "messageId": "456"
}
```

### 线程

```json
{
  "action": "threadCreate",
  "channelId": "123",
  "name": "Bug triage",
  "messageId": "456"
}
```

```json
{
  "action": "threadList",
  "guildId": "999"
}
```

```json
{
  "action": "threadReply",
  "channelId": "777",
  "content": "Replying in thread"
}
```

### 置顶

```json
{
  "action": "pinMessage",
  "channelId": "123",
  "messageId": "456"
}
```

```json
{
  "action": "listPins",
  "channelId": "123"
}
```

### 搜索消息

```json
{
  "action": "searchMessages",
  "guildId": "999",
  "content": "release notes",
  "channelIds": ["123", "456"],
  "limit": 10
}
```

### 成员 + 角色信息

```json
{
  "action": "memberInfo",
  "guildId": "999",
  "userId": "111"
}
```

```json
{
  "action": "roleInfo",
  "guildId": "999"
}
```

### 列出可用的自定义表情符号

```json
{
  "action": "emojiList",
  "guildId": "999"
}
```

### 角色更改（默认禁用）

```json
{
  "action": "roleAdd",
  "guildId": "999",
  "userId": "111",
  "roleId": "222"
}
```

### 频道信息

```json
{
  "action": "channelInfo",
  "channelId": "123"
}
```

```json
{
  "action": "channelList",
  "guildId": "999"
}
```

### 频道管理（默认禁用）

创建、编辑、删除和移动频道和类别。通过 `discord.actions.channels: true` 启用。

**创建文本频道：**

```json
{
  "action": "channelCreate",
  "guildId": "999",
  "name": "general-chat",
  "type": 0,
  "parentId": "888",
  "topic": "General discussion"
}
```

- `type`：Discord 频道类型整数（0 = 文本，2 = 语音，4 = 类别；支持其他值）
- `parentId`：要嵌套在下面的类别 ID（可选）
- `topic`、`position`、`nsfw`：可选

**创建类别：**

```json
{
  "action": "categoryCreate",
  "guildId": "999",
  "name": "Projects"
}
```

**编辑频道：**

```json
{
  "action": "channelEdit",
  "channelId": "123",
  "name": "new-name",
  "topic": "Updated topic"
}
```

- 支持 `name`、`topic`、`position`、`parentId`（null 表示从类别中移除）、`nsfw`、`rateLimitPerUser`

**移动频道：**

```json
{
  "action": "channelMove",
  "guildId": "999",
  "channelId": "123",
  "parentId": "888",
  "position": 2
}
```

- `parentId`：目标类别（null 表示移动到顶级）

**删除频道：**

```json
{
  "action": "channelDelete",
  "channelId": "123"
}
```

**编辑/删除类别：**

```json
{
  "action": "categoryEdit",
  "categoryId": "888",
  "name": "Renamed Category"
}
```

```json
{
  "action": "categoryDelete",
  "categoryId": "888"
}
```

### 语音状态

```json
{
  "action": "voiceStatus",
  "guildId": "999",
  "userId": "111"
}
```

### 计划事件

```json
{
  "action": "eventList",
  "guildId": "999"
}
```

### 审核（默认禁用）

```json
{
  "action": "timeout",
  "guildId": "999",
  "userId": "111",
  "durationMinutes": 10
}
```

## Discord 写作风格指南

**保持对话式！** Discord 是聊天平台，不是文档。

### 要做的
- 简短、有力的消息（1-3 句话最佳）
- 多个快速回复 > 一堵文字墙
- 使用表情符号表达语调/强调 🦞
- 小写随意风格也可以
- 将信息分解为易消化的块
- 匹配对话的能量

### 不要做的
- 不要使用 markdown 表格（Discord 将它们渲染为难看的原始 `| text |`）
- 不要在随意聊天中使用 `## 标题`（使用 **粗体** 或大写进行强调）
- 避免多段落论文
- 不要过度解释简单的事情
- 跳过"我很乐意帮助！"这样的废话

### 有效的格式
- **粗体** 用于强调
- `代码` 用于技术术语
- 列表用于多个项目
- > 引用用于引用
- 将多个链接包装在 `<>` 中以抑制嵌入

### 示例转换

❌ 不好：
```
我很乐意帮助您！这里是可用版本控制策略的全面概述：

## 语义版本控制
Semver 使用 MAJOR.MINOR.PATCH 格式，其中...

## 日历版本控制
CalVer 使用基于日期的版本，如...
```

✅ 好：
```
版本控制选项：semver (1.2.3)、calver (2026.01.04) 或 yolo（永远 `latest`）。什么适合您的发布节奏？
```
