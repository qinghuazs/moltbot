/**
 * 消息渠道工具模块
 * 提供消息渠道的规范化、识别和能力检测功能
 */
import {
  CHANNEL_IDS,
  listChatChannelAliases,
  normalizeChatChannelId,
} from "../channels/registry.js";
import type { ChannelId } from "../channels/plugins/types.js";
import {
  GATEWAY_CLIENT_MODES,
  GATEWAY_CLIENT_NAMES,
  type GatewayClientMode,
  type GatewayClientName,
  normalizeGatewayClientMode,
  normalizeGatewayClientName,
} from "../gateway/protocol/client-info.js";
import { getActivePluginRegistry } from "../plugins/runtime.js";

/** 内部消息渠道常量 */
export const INTERNAL_MESSAGE_CHANNEL = "webchat" as const;
/** 内部消息渠道类型 */
export type InternalMessageChannel = typeof INTERNAL_MESSAGE_CHANNEL;

/** 支持 Markdown 的渠道集合 */
const MARKDOWN_CAPABLE_CHANNELS = new Set<string>([
  "slack",
  "telegram",
  "signal",
  "discord",
  "googlechat",
  "tui",
  INTERNAL_MESSAGE_CHANNEL,
]);

// 导出 Gateway 客户端相关
export { GATEWAY_CLIENT_NAMES, GATEWAY_CLIENT_MODES };
export type { GatewayClientName, GatewayClientMode };
export { normalizeGatewayClientName, normalizeGatewayClientMode };

/** Gateway 客户端信息类型 */
type GatewayClientInfoLike = {
  mode?: string | null;
  id?: string | null;
};

/**
 * 检查是否为 Gateway CLI 客户端
 * @param client - 客户端信息
 * @returns 是否为 CLI 客户端
 */
export function isGatewayCliClient(client?: GatewayClientInfoLike | null): boolean {
  return normalizeGatewayClientMode(client?.mode) === GATEWAY_CLIENT_MODES.CLI;
}

/**
 * 检查是否为内部消息渠道
 * @param raw - 原始渠道字符串
 * @returns 是否为内部消息渠道
 */
export function isInternalMessageChannel(raw?: string | null): raw is InternalMessageChannel {
  return normalizeMessageChannel(raw) === INTERNAL_MESSAGE_CHANNEL;
}

/**
 * 检查是否为 Webchat 客户端
 * @param client - 客户端信息
 * @returns 是否为 Webchat 客户端
 */
export function isWebchatClient(client?: GatewayClientInfoLike | null): boolean {
  const mode = normalizeGatewayClientMode(client?.mode);
  if (mode === GATEWAY_CLIENT_MODES.WEBCHAT) return true;
  return normalizeGatewayClientName(client?.id) === GATEWAY_CLIENT_NAMES.WEBCHAT_UI;
}

/**
 * 规范化消息渠道
 * 支持内置渠道和插件渠道
 * @param raw - 原始渠道字符串
 * @returns 规范化后的渠道 ID
 */
export function normalizeMessageChannel(raw?: string | null): string | undefined {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === INTERNAL_MESSAGE_CHANNEL) return INTERNAL_MESSAGE_CHANNEL;
  const builtIn = normalizeChatChannelId(normalized);
  if (builtIn) return builtIn;
  // 检查插件渠道
  const registry = getActivePluginRegistry();
  const pluginMatch = registry?.channels.find((entry) => {
    if (entry.plugin.id.toLowerCase() === normalized) return true;
    return (entry.plugin.meta.aliases ?? []).some(
      (alias) => alias.trim().toLowerCase() === normalized,
    );
  });
  return pluginMatch?.plugin.id ?? normalized;
}

/**
 * 列出插件渠道 ID
 * @returns 插件渠道 ID 数组
 */
const listPluginChannelIds = (): string[] => {
  const registry = getActivePluginRegistry();
  if (!registry) return [];
  return registry.channels.map((entry) => entry.plugin.id);
};

/**
 * 列出插件渠道别名
 * @returns 插件渠道别名数组
 */
const listPluginChannelAliases = (): string[] => {
  const registry = getActivePluginRegistry();
  if (!registry) return [];
  return registry.channels.flatMap((entry) => entry.plugin.meta.aliases ?? []);
};

export const listDeliverableMessageChannels = (): ChannelId[] =>
  Array.from(new Set([...CHANNEL_IDS, ...listPluginChannelIds()]));

export type DeliverableMessageChannel = ChannelId;

export type GatewayMessageChannel = DeliverableMessageChannel | InternalMessageChannel;

export const listGatewayMessageChannels = (): GatewayMessageChannel[] => [
  ...listDeliverableMessageChannels(),
  INTERNAL_MESSAGE_CHANNEL,
];

export const listGatewayAgentChannelAliases = (): string[] =>
  Array.from(new Set([...listChatChannelAliases(), ...listPluginChannelAliases()]));

export type GatewayAgentChannelHint = GatewayMessageChannel | "last";

export const listGatewayAgentChannelValues = (): string[] =>
  Array.from(
    new Set([...listGatewayMessageChannels(), "last", ...listGatewayAgentChannelAliases()]),
  );

export function isGatewayMessageChannel(value: string): value is GatewayMessageChannel {
  return listGatewayMessageChannels().includes(value as GatewayMessageChannel);
}

export function isDeliverableMessageChannel(value: string): value is DeliverableMessageChannel {
  return listDeliverableMessageChannels().includes(value as DeliverableMessageChannel);
}

export function resolveGatewayMessageChannel(
  raw?: string | null,
): GatewayMessageChannel | undefined {
  const normalized = normalizeMessageChannel(raw);
  if (!normalized) return undefined;
  return isGatewayMessageChannel(normalized) ? normalized : undefined;
}

export function resolveMessageChannel(
  primary?: string | null,
  fallback?: string | null,
): string | undefined {
  return normalizeMessageChannel(primary) ?? normalizeMessageChannel(fallback);
}

export function isMarkdownCapableMessageChannel(raw?: string | null): boolean {
  const channel = normalizeMessageChannel(raw);
  if (!channel) return false;
  return MARKDOWN_CAPABLE_CHANNELS.has(channel);
}
