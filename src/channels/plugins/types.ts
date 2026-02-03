/**
 * 渠道插件类型导出模块
 * 聚合并导出所有渠道插件相关的类型定义
 */
import type { ChannelMessageActionName as ChannelMessageActionNameFromList } from "./message-action-names.js";

export { CHANNEL_MESSAGE_ACTION_NAMES } from "./message-action-names.js";

/** 渠道消息动作名称类型 */
export type ChannelMessageActionName = ChannelMessageActionNameFromList;

export type {
  ChannelAuthAdapter,
  ChannelCommandAdapter,
  ChannelConfigAdapter,
  ChannelDirectoryAdapter,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelResolverAdapter,
  ChannelElevatedAdapter,
  ChannelGatewayAdapter,
  ChannelGatewayContext,
  ChannelGroupAdapter,
  ChannelHeartbeatAdapter,
  ChannelLoginWithQrStartResult,
  ChannelLoginWithQrWaitResult,
  ChannelLogoutContext,
  ChannelLogoutResult,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelPairingAdapter,
  ChannelSecurityAdapter,
  ChannelSetupAdapter,
  ChannelStatusAdapter,
} from "./types.adapters.js";
export type {
  ChannelAccountSnapshot,
  ChannelAccountState,
  ChannelAgentPromptAdapter,
  ChannelAgentTool,
  ChannelAgentToolFactory,
  ChannelCapabilities,
  ChannelDirectoryEntry,
  ChannelDirectoryEntryKind,
  ChannelGroupContext,
  ChannelHeartbeatDeps,
  ChannelId,
  ChannelLogSink,
  ChannelMentionAdapter,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessagingAdapter,
  ChannelMeta,
  ChannelOutboundTargetMode,
  ChannelPollContext,
  ChannelPollResult,
  ChannelSecurityContext,
  ChannelSecurityDmPolicy,
  ChannelSetupInput,
  ChannelStatusIssue,
  ChannelStreamingAdapter,
  ChannelThreadingAdapter,
  ChannelThreadingContext,
  ChannelThreadingToolContext,
  ChannelToolSend,
} from "./types.core.js";

export type { ChannelPlugin } from "./types.plugin.js";
