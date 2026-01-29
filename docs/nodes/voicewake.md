---
summary: "全局语音唤醒词（由 Gateway 统一管理）及其在节点间的同步方式"
read_when:
  - 修改语音唤醒词行为或默认值
  - 增加需要唤醒词同步的新节点平台
---
# 语音唤醒（全局唤醒词）

Moltbot 将**唤醒词作为 Gateway 统一管理的全局列表**。

- **没有按节点自定义唤醒词**。
- **任何节点或应用 UI 都可编辑**该列表；变更由 Gateway 持久化并广播给所有人。
- 每个设备仍保留自己的**语音唤醒启用/禁用**开关（本地 UX 与权限不同）。

## 存储位置（Gateway 主机）

唤醒词存储在 gateway 机器：

- `~/.clawdbot/settings/voicewake.json`

格式：

```json
{ "triggers": ["clawd", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## 协议

### 方法

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` 参数 `{ triggers: string[] }` → `{ triggers: string[] }`

说明：
- 触发词会做规范化（去空格、移除空值）。空列表会回退到默认值。
- 出于安全考虑会强制数量与长度限制。

### 事件

- `voicewake.changed` payload `{ triggers: string[] }`

接收者：
- 所有 WebSocket 客户端（macOS 应用、WebChat 等）
- 所有已连接节点（iOS/Android），并在节点连接时作为初始“当前状态”推送。

## 客户端行为

### macOS 应用

- 使用全局列表进行 `VoiceWakeRuntime` 触发检测。
- 在 Voice Wake 设置中编辑 “Trigger words” 会调用 `voicewake.set`，并依赖广播保持其他客户端同步。

### iOS 节点

- 使用全局列表进行 `VoiceWakeManager` 触发检测。
- 在设置中编辑 Wake Words 会调用 `voicewake.set`（通过 Gateway WS），并保持本地检测及时更新。

### Android 节点

- 在设置中提供 Wake Words 编辑器。
- 通过 Gateway WS 调用 `voicewake.set`，使编辑结果全局同步。
