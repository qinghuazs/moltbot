---
title: 出站会话镜像重构（Issue #1520）
description: 记录出站会话镜像重构的笔记、决策、测试与待办。
---

# 出站会话镜像重构（Issue #1520）

## 状态
- 进行中。
- Core 与插件渠道路由已更新以支持出站镜像。
- Gateway send 在省略 sessionKey 时会推导目标会话。

## 背景
出站发送被镜像到*当前*代理会话（工具会话 key），而不是目标渠道会话。入站路由使用渠道或 peer 会话 key，因此出站回复落在错误会话里，且首次联系人往往没有会话条目。

## 目标
- 将出站消息镜像到目标渠道会话 key。
- 出站时若缺失会话条目则创建。
- 线程与主题范围与入站会话 key 对齐。
- 覆盖 core 渠道与内置扩展。

## 实现概要
- 新增出站会话路由辅助：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey`（dmScope + identityLinks）构建目标 sessionKey。
  - `ensureOutboundSessionEntry` 通过 `recordSessionMetaFromInbound` 写入最小 `MsgContext`。
- `runMessageAction`（send）推导目标 sessionKey 并传给 `executeSendAction` 进行镜像。
- `message-tool` 不再直接镜像；只从当前会话 key 解析 agentId。
- 插件发送路径通过 `appendAssistantMessageToSessionTranscript` 使用推导的 sessionKey 进行镜像。
- Gateway send 在未提供 sessionKey 时推导目标 session key（默认代理），并确保会话条目存在。

## 线程与主题处理
- Slack：replyTo/threadId -> `resolveThreadSessionKeys`（后缀）。
- Discord：threadId/replyTo -> `resolveThreadSessionKeys` 且 `useSuffix=false` 以匹配入站（线程 channel id 已限定会话）。
- Telegram：topic ID 通过 `buildTelegramGroupPeerId` 映射到 `chatId:topic:<id>`。

## 覆盖的扩展
- Matrix、MS Teams、Mattermost、BlueBubbles、Nextcloud Talk、Zalo、Zalo Personal、Nostr、Tlon。
- 说明：
  - Mattermost 目标现在会去掉 `@` 以用于 DM 会话 key 路由。
  - Zalo Personal 对 1:1 目标使用 DM peer kind（仅当存在 `group:` 时为群）。
  - BlueBubbles 群目标会去掉 `chat_*` 前缀以匹配入站会话 key。
  - Slack 自动线程镜像以不区分大小写匹配 channel id。
  - Gateway send 会在镜像前将提供的 session key 转为小写。

## 决策
- **Gateway send 会话推导：**若提供 `sessionKey` 则使用；若省略，则基于目标与默认代理推导，并镜像到该会话。
- **会话条目创建：**始终用 `recordSessionMetaFromInbound`，并对齐入站格式中的 `Provider/From/To/ChatType/AccountId/Originating*`。
- **目标规范化：**出站路由优先使用已解析目标（`resolveChannelTarget` 之后）
- **会话 key 大小写：**写入与迁移时统一小写。

## 新增或更新测试
- `src/infra/outbound/outbound-session.test.ts`
  - Slack 线程会话 key。
  - Telegram 主题会话 key。
  - Discord 的 dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 从会话 key 推导 agentId（不传入 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 省略 sessionKey 时推导会话 key 并创建会话条目。

## 待办
- 语音通话插件使用自定义 `voice:<phone>` 会话 key。此处的出站映射尚未标准化；若 message-tool 需支持语音通话发送，请添加显式映射。
- 确认是否有外部插件使用内置集合之外的非标准 `From/To` 格式。

## 变更文件
- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- 测试：
  - `src/infra/outbound/outbound-session.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`
