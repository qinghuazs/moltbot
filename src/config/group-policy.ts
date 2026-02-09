/**
 * 群组策略模块
 *
 * 解析各消息渠道的群组访问控制策略，包括：
 * - 群组白名单（allowlist）：配置了 groups 时启用，仅允许列出的群组
 * - 通配符 "*" 群组：允许所有群组
 * - 群组级 requireMention 设置：是否需要 @提及 才响应
 * - 群组级工具策略：按群组和发送者控制工具权限
 * - 发送者级工具策略：按发送者 ID/用户名/E164 匹配
 */
import type { ChannelId } from "../channels/plugins/types.js";
import { normalizeAccountId } from "../routing/session-key.js";
import type { MoltbotConfig } from "./config.js";
import type { GroupToolPolicyBySenderConfig, GroupToolPolicyConfig } from "./types.tools.js";

export type GroupPolicyChannel = ChannelId;

export type ChannelGroupConfig = {
  requireMention?: boolean;
  tools?: GroupToolPolicyConfig;
  toolsBySender?: GroupToolPolicyBySenderConfig;
};

/** 群组策略解析结果 */
export type ChannelGroupPolicy = {
  /** 是否启用了群组白名单 */
  allowlistEnabled: boolean;
  /** 当前群组是否被允许 */
  allowed: boolean;
  /** 当前群组的配置 */
  groupConfig?: ChannelGroupConfig;
  /** 通配符 "*" 群组的默认配置 */
  defaultConfig?: ChannelGroupConfig;
};

type ChannelGroups = Record<string, ChannelGroupConfig>;

export type GroupToolPolicySender = {
  senderId?: string | null;
  senderName?: string | null;
  senderUsername?: string | null;
  senderE164?: string | null;
};

function normalizeSenderKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutAt.toLowerCase();
}

/**
 * 按发送者解析工具策略
 *
 * 按优先级匹配：senderId > senderE164 > senderUsername > senderName > 通配符 "*"
 */
export function resolveToolsBySender(
  params: {
    toolsBySender?: GroupToolPolicyBySenderConfig;
  } & GroupToolPolicySender,
): GroupToolPolicyConfig | undefined {
  const toolsBySender = params.toolsBySender;
  if (!toolsBySender) return undefined;
  const entries = Object.entries(toolsBySender);
  if (entries.length === 0) return undefined;

  const normalized = new Map<string, GroupToolPolicyConfig>();
  let wildcard: GroupToolPolicyConfig | undefined;
  for (const [rawKey, policy] of entries) {
    if (!policy) continue;
    const key = normalizeSenderKey(rawKey);
    if (!key) continue;
    if (key === "*") {
      wildcard = policy;
      continue;
    }
    if (!normalized.has(key)) {
      normalized.set(key, policy);
    }
  }

  const candidates: string[] = [];
  const pushCandidate = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    candidates.push(trimmed);
  };
  pushCandidate(params.senderId);
  pushCandidate(params.senderE164);
  pushCandidate(params.senderUsername);
  pushCandidate(params.senderName);

  for (const candidate of candidates) {
    const key = normalizeSenderKey(candidate);
    if (!key) continue;
    const match = normalized.get(key);
    if (match) return match;
  }
  return wildcard;
}

function resolveChannelGroups(
  cfg: MoltbotConfig,
  channel: GroupPolicyChannel,
  accountId?: string | null,
): ChannelGroups | undefined {
  const normalizedAccountId = normalizeAccountId(accountId);
  const channelConfig = cfg.channels?.[channel] as
    | {
        accounts?: Record<string, { groups?: ChannelGroups }>;
        groups?: ChannelGroups;
      }
    | undefined;
  if (!channelConfig) return undefined;
  const accountGroups =
    channelConfig.accounts?.[normalizedAccountId]?.groups ??
    channelConfig.accounts?.[
      Object.keys(channelConfig.accounts ?? {}).find(
        (key) => key.toLowerCase() === normalizedAccountId.toLowerCase(),
      ) ?? ""
    ]?.groups;
  return accountGroups ?? channelConfig.groups;
}

/**
 * 解析群组的访问控制策略
 *
 * 判断指定群组是否在白名单中，并返回群组级和默认级配置。
 */
export function resolveChannelGroupPolicy(params: {
  cfg: MoltbotConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
}): ChannelGroupPolicy {
  const { cfg, channel } = params;
  const groups = resolveChannelGroups(cfg, channel, params.accountId);
  const allowlistEnabled = Boolean(groups && Object.keys(groups).length > 0);
  const normalizedId = params.groupId?.trim();
  const groupConfig = normalizedId && groups ? groups[normalizedId] : undefined;
  const defaultConfig = groups?.["*"];
  const allowAll = allowlistEnabled && Boolean(groups && Object.hasOwn(groups, "*"));
  const allowed =
    !allowlistEnabled ||
    allowAll ||
    (normalizedId ? Boolean(groups && Object.hasOwn(groups, normalizedId)) : false);
  return {
    allowlistEnabled,
    allowed,
    groupConfig,
    defaultConfig,
  };
}

/**
 * 解析群组的 requireMention 设置
 *
 * 优先级：群组配置 > 默认配置 > 渠道级覆盖 > 默认 true
 */
export function resolveChannelGroupRequireMention(params: {
  cfg: MoltbotConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
  requireMentionOverride?: boolean;
  overrideOrder?: "before-config" | "after-config";
}): boolean {
  const { requireMentionOverride, overrideOrder = "after-config" } = params;
  const { groupConfig, defaultConfig } = resolveChannelGroupPolicy(params);
  const configMention =
    typeof groupConfig?.requireMention === "boolean"
      ? groupConfig.requireMention
      : typeof defaultConfig?.requireMention === "boolean"
        ? defaultConfig.requireMention
        : undefined;

  if (overrideOrder === "before-config" && typeof requireMentionOverride === "boolean") {
    return requireMentionOverride;
  }
  if (typeof configMention === "boolean") return configMention;
  if (overrideOrder !== "before-config" && typeof requireMentionOverride === "boolean") {
    return requireMentionOverride;
  }
  return true;
}

/**
 * 解析群组的工具策略
 *
 * 按优先级查找：群组发送者策略 > 群组工具策略 > 默认发送者策略 > 默认工具策略
 */
export function resolveChannelGroupToolsPolicy(
  params: {
    cfg: MoltbotConfig;
    channel: GroupPolicyChannel;
    groupId?: string | null;
    accountId?: string | null;
  } & GroupToolPolicySender,
): GroupToolPolicyConfig | undefined {
  const { groupConfig, defaultConfig } = resolveChannelGroupPolicy(params);
  const groupSenderPolicy = resolveToolsBySender({
    toolsBySender: groupConfig?.toolsBySender,
    senderId: params.senderId,
    senderName: params.senderName,
    senderUsername: params.senderUsername,
    senderE164: params.senderE164,
  });
  if (groupSenderPolicy) return groupSenderPolicy;
  if (groupConfig?.tools) return groupConfig.tools;
  const defaultSenderPolicy = resolveToolsBySender({
    toolsBySender: defaultConfig?.toolsBySender,
    senderId: params.senderId,
    senderName: params.senderName,
    senderUsername: params.senderUsername,
    senderE164: params.senderE164,
  });
  if (defaultSenderPolicy) return defaultSenderPolicy;
  if (defaultConfig?.tools) return defaultConfig.tools;
  return undefined;
}
