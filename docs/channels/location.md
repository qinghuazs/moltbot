---
summary: "渠道入站位置解析（Telegram + WhatsApp）与上下文字段"
read_when:
  - 添加或修改渠道位置解析
  - 在 agent 提示或工具中使用位置上下文字段
---

# 渠道位置解析

Moltbot 会将聊天渠道共享的位置规范化为：
- 追加到入站正文的可读文本，以及
- 自动回复上下文 payload 中的结构化字段。

当前支持：
- **Telegram**（位置 pin + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（带 `geo_uri` 的 `m.location`）

## 文本格式
位置会被渲染为易读行且不带括号：

- Pin：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- 实时共享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

若渠道包含 caption/comment，会追加在下一行：
```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文字段
当包含位置时，会在 `ctx` 中添加这些字段：
- `LocationLat`（number）
- `LocationLon`（number）
- `LocationAccuracy`（number，米；可选）
- `LocationName`（string；可选）
- `LocationAddress`（string；可选）
- `LocationSource`（`pin | place | live`）
- `LocationIsLive`（boolean）

## 渠道说明
- **Telegram**：venue 映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 与 `liveLocationMessage.caption` 会作为 caption 追加。
- **Matrix**：`geo_uri` 解析为 pin 位置；忽略海拔，`LocationIsLive` 始终为 false。
