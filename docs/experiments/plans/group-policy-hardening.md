---
summary: "Telegram 允许列表加固：前缀与空白规范化"
read_when:
  - 回顾 Telegram 允许列表历史变更
---
# Telegram 允许列表加固

**日期**：2026-01-05  
**状态**：完成  
**PR**：#216

## 概要

Telegram 允许列表现在以不区分大小写的方式接受 `telegram:` 与 `tg:` 前缀，并容忍意外空白。这样可让入站允许列表校验与出站发送的规范化保持一致。

## 变更内容

- 前缀 `telegram:` 与 `tg:` 视为等价（不区分大小写）。
- 允许列表条目会被 trim，空条目忽略。

## 示例

以下都被视为同一个 ID：

- `telegram:123456`
- `TG:123456`
- ` tg:123456 `

## 意义

从日志或聊天 ID 复制时常带前缀或空白。规范化可避免在决定是否回复私聊或群聊时出现误判。

## 相关文档

- [Group Chats](/concepts/groups)
- [Telegram Provider](/channels/telegram)
