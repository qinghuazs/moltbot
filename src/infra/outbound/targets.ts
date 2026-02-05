/**
 * 出站目标解析模块
 *
 * 该模块负责解析和管理消息出站目标，包括：
 * - 会话投递目标解析
 * - 心跳投递目标解析
 * - 渠道目标验证
 * - 发送者上下文解析
 *
 * @module infra/outbound/targets
 */

import { getChannelPlugin, normalizeChannelId } from "../../channels/plugins/index.js";
import { formatCliCommand } from "../../cli/command-format.js";
import type { ChannelId, ChannelOutboundTargetMode } from "../../channels/plugins/types.js";
import type { MoltbotConfig } from "../../config/config.js";
import type { SessionEntry } from "../../config/sessions.js";
import type { AgentDefaultsConfig } from "../../config/types.agent-defaults.js";
import { deliveryContextFromSession } from "../../utils/delivery-context.js";
import type {
  DeliverableMessageChannel,
  GatewayMessageChannel,
} from "../../utils/message-channel.js";
import {
  INTERNAL_MESSAGE_CHANNEL,
  isDeliverableMessageChannel,
  normalizeMessageChannel,
} from "../../utils/message-channel.js";
import { missingTargetError } from "./target-errors.js";

/** 出站渠道类型，可投递渠道或无 */
export type OutboundChannel = DeliverableMessageChannel | "none";

/** 心跳目标类型，可以是渠道或 "last"（使用上次渠道） */
export type HeartbeatTarget = OutboundChannel | "last";

/** 出站目标信息 */
export type OutboundTarget = {
  /** 目标渠道 */
  channel: OutboundChannel;
  /** 接收者标识 */
  to?: string;
  /** 目标解析原因 */
  reason?: string;
  /** 账户 ID */
  accountId?: string;
  /** 上次使用的渠道 */
  lastChannel?: DeliverableMessageChannel;
  /** 上次使用的账户 ID */
  lastAccountId?: string;
};

/** 心跳发送者上下文 */
export type HeartbeatSenderContext = {
  /** 发送者标识 */
  sender: string;
  /** 提供商渠道 */
  provider?: DeliverableMessageChannel;
  /** 允许的发送者列表 */
  allowFrom: string[];
};

/** 出站目标解析结果 */
export type OutboundTargetResolution = { ok: true; to: string } | { ok: false; error: Error };

/** 会话投递目标信息 */
export type SessionDeliveryTarget = {
  /** 目标渠道 */
  channel?: DeliverableMessageChannel;
  /** 接收者标识 */
  to?: string;
  /** 账户 ID */
  accountId?: string;
  /** 线程 ID */
  threadId?: string | number;
  /** 目标模式 */
  mode: ChannelOutboundTargetMode;
  /** 上次使用的渠道 */
  lastChannel?: DeliverableMessageChannel;
  /** 上次使用的接收者 */
  lastTo?: string;
  /** 上次使用的账户 ID */
  lastAccountId?: string;
  /** 上次使用的线程 ID */
  lastThreadId?: string | number;
};

/**
 * 解析会话投递目标
 * 从会话条目和请求参数中确定投递目标
 *
 * @param params.entry - 会话条目
 * @param params.requestedChannel - 请求的渠道
 * @param params.explicitTo - 显式指定的接收者
 * @param params.explicitThreadId - 显式指定的线程 ID
 * @param params.fallbackChannel - 备用渠道
 * @param params.allowMismatchedLastTo - 是否允许不匹配的上次接收者
 * @param params.mode - 目标模式
 * @returns 会话投递目标
 */
export function resolveSessionDeliveryTarget(params: {
  entry?: SessionEntry;
  requestedChannel?: GatewayMessageChannel | "last";
  explicitTo?: string;
  explicitThreadId?: string | number;
  fallbackChannel?: DeliverableMessageChannel;
  allowMismatchedLastTo?: boolean;
  mode?: ChannelOutboundTargetMode;
}): SessionDeliveryTarget {
  const context = deliveryContextFromSession(params.entry);
  const lastChannel =
    context?.channel && isDeliverableMessageChannel(context.channel) ? context.channel : undefined;
  const lastTo = context?.to;
  const lastAccountId = context?.accountId;
  const lastThreadId = context?.threadId;

  const rawRequested = params.requestedChannel ?? "last";
  const requested = rawRequested === "last" ? "last" : normalizeMessageChannel(rawRequested);
  const requestedChannel =
    requested === "last"
      ? "last"
      : requested && isDeliverableMessageChannel(requested)
        ? requested
        : undefined;

  const explicitTo =
    typeof params.explicitTo === "string" && params.explicitTo.trim()
      ? params.explicitTo.trim()
      : undefined;
  const explicitThreadId =
    params.explicitThreadId != null && params.explicitThreadId !== ""
      ? params.explicitThreadId
      : undefined;

  let channel = requestedChannel === "last" ? lastChannel : requestedChannel;
  if (!channel && params.fallbackChannel && isDeliverableMessageChannel(params.fallbackChannel)) {
    channel = params.fallbackChannel;
  }

  let to = explicitTo;
  if (!to && lastTo) {
    if (channel && channel === lastChannel) {
      to = lastTo;
    } else if (params.allowMismatchedLastTo) {
      to = lastTo;
    }
  }

  const accountId = channel && channel === lastChannel ? lastAccountId : undefined;
  const threadId = channel && channel === lastChannel ? lastThreadId : undefined;
  const mode = params.mode ?? (explicitTo ? "explicit" : "implicit");

  return {
    channel,
    to,
    accountId,
    threadId: explicitThreadId ?? threadId,
    mode,
    lastChannel,
    lastTo,
    lastAccountId,
    lastThreadId,
  };
}

/**
 * 解析出站目标
 * 渠道对接：优先使用插件的 outbound.resolveTarget + allowFrom 来标准化目标
 *
 * @param params.channel - 目标渠道
 * @param params.to - 接收者标识
 * @param params.allowFrom - 允许的发送者列表
 * @param params.cfg - 配置对象
 * @param params.accountId - 账户 ID
 * @param params.mode - 目标模式
 * @returns 解析结果
 */
export function resolveOutboundTarget(params: {
  channel: GatewayMessageChannel;
  to?: string;
  allowFrom?: string[];
  cfg?: MoltbotConfig;
  accountId?: string | null;
  mode?: ChannelOutboundTargetMode;
}): OutboundTargetResolution {
  if (params.channel === INTERNAL_MESSAGE_CHANNEL) {
    return {
      ok: false,
      error: new Error(
        `Delivering to WebChat is not supported via \`${formatCliCommand("moltbot agent")}\`; use WhatsApp/Telegram or run with --deliver=false.`,
      ),
    };
  }

  const plugin = getChannelPlugin(params.channel as ChannelId);
  if (!plugin) {
    return {
      ok: false,
      error: new Error(`Unsupported channel: ${params.channel}`),
    };
  }

  const allowFrom =
    params.allowFrom ??
    (params.cfg && plugin.config.resolveAllowFrom
      ? plugin.config.resolveAllowFrom({
          cfg: params.cfg,
          accountId: params.accountId ?? undefined,
        })
      : undefined);

  const resolveTarget = plugin.outbound?.resolveTarget;
  if (resolveTarget) {
    return resolveTarget({
      cfg: params.cfg,
      to: params.to,
      allowFrom,
      accountId: params.accountId ?? undefined,
      mode: params.mode ?? "explicit",
    });
  }

  const trimmed = params.to?.trim();
  if (trimmed) {
    return { ok: true, to: trimmed };
  }
  const hint = plugin.messaging?.targetResolver?.hint;
  return {
    ok: false,
    error: missingTargetError(plugin.meta.label ?? params.channel, hint),
  };
}

/**
 * 解析心跳投递目标
 * 确定心跳消息应该发送到哪个渠道和接收者
 *
 * @param params.cfg - 配置对象
 * @param params.entry - 会话条目
 * @param params.heartbeat - 心跳配置
 * @returns 出站目标
 */
export function resolveHeartbeatDeliveryTarget(params: {
  cfg: MoltbotConfig;
  entry?: SessionEntry;
  heartbeat?: AgentDefaultsConfig["heartbeat"];
}): OutboundTarget {
  const { cfg, entry } = params;
  const heartbeat = params.heartbeat ?? cfg.agents?.defaults?.heartbeat;
  const rawTarget = heartbeat?.target;
  let target: HeartbeatTarget = "last";
  if (rawTarget === "none" || rawTarget === "last") {
    target = rawTarget;
  } else if (typeof rawTarget === "string") {
    const normalized = normalizeChannelId(rawTarget);
    if (normalized) target = normalized;
  }

  if (target === "none") {
    const base = resolveSessionDeliveryTarget({ entry });
    return {
      channel: "none",
      reason: "target-none",
      accountId: undefined,
      lastChannel: base.lastChannel,
      lastAccountId: base.lastAccountId,
    };
  }

  const resolvedTarget = resolveSessionDeliveryTarget({
    entry,
    requestedChannel: target === "last" ? "last" : target,
    explicitTo: heartbeat?.to,
    mode: "heartbeat",
  });

  if (!resolvedTarget.channel || !resolvedTarget.to) {
    return {
      channel: "none",
      reason: "no-target",
      accountId: resolvedTarget.accountId,
      lastChannel: resolvedTarget.lastChannel,
      lastAccountId: resolvedTarget.lastAccountId,
    };
  }

  const resolved = resolveOutboundTarget({
    channel: resolvedTarget.channel,
    to: resolvedTarget.to,
    cfg,
    accountId: resolvedTarget.accountId,
    mode: "heartbeat",
  });
  if (!resolved.ok) {
    return {
      channel: "none",
      reason: "no-target",
      accountId: resolvedTarget.accountId,
      lastChannel: resolvedTarget.lastChannel,
      lastAccountId: resolvedTarget.lastAccountId,
    };
  }

  let reason: string | undefined;
  const plugin = getChannelPlugin(resolvedTarget.channel as ChannelId);
  if (plugin?.config.resolveAllowFrom) {
    const explicit = resolveOutboundTarget({
      channel: resolvedTarget.channel,
      to: resolvedTarget.to,
      cfg,
      accountId: resolvedTarget.accountId,
      mode: "explicit",
    });
    if (explicit.ok && explicit.to !== resolved.to) {
      reason = "allowFrom-fallback";
    }
  }

  return {
    channel: resolvedTarget.channel,
    to: resolved.to,
    reason,
    accountId: resolvedTarget.accountId,
    lastChannel: resolvedTarget.lastChannel,
    lastAccountId: resolvedTarget.lastAccountId,
  };
}

/**
 * 解析心跳发送者 ID
 * 从允许列表和投递目标中确定发送者标识
 */
function resolveHeartbeatSenderId(params: {
  allowFrom: Array<string | number>;
  deliveryTo?: string;
  lastTo?: string;
  provider?: string | null;
}) {
  const { allowFrom, deliveryTo, lastTo, provider } = params;
  const candidates = [
    deliveryTo?.trim(),
    provider && deliveryTo ? `${provider}:${deliveryTo}` : undefined,
    lastTo?.trim(),
    provider && lastTo ? `${provider}:${lastTo}` : undefined,
  ].filter((val): val is string => Boolean(val?.trim()));

  const allowList = allowFrom
    .map((entry) => String(entry))
    .filter((entry) => entry && entry !== "*");
  if (allowFrom.includes("*")) {
    return candidates[0] ?? "heartbeat";
  }
  if (candidates.length > 0 && allowList.length > 0) {
    const matched = candidates.find((candidate) => allowList.includes(candidate));
    if (matched) return matched;
  }
  if (candidates.length > 0 && allowList.length === 0) {
    return candidates[0];
  }
  if (allowList.length > 0) return allowList[0];
  return candidates[0] ?? "heartbeat";
}

/**
 * 解析心跳发送者上下文
 * 确定心跳消息的发送者信息和允许列表
 *
 * @param params.cfg - 配置对象
 * @param params.entry - 会话条目
 * @param params.delivery - 投递目标
 * @returns 心跳发送者上下文
 */
export function resolveHeartbeatSenderContext(params: {
  cfg: MoltbotConfig;
  entry?: SessionEntry;
  delivery: OutboundTarget;
}): HeartbeatSenderContext {
  const provider =
    params.delivery.channel !== "none" ? params.delivery.channel : params.delivery.lastChannel;
  const allowFrom = provider
    ? (getChannelPlugin(provider)?.config.resolveAllowFrom?.({
        cfg: params.cfg,
        accountId:
          provider === params.delivery.lastChannel ? params.delivery.lastAccountId : undefined,
      }) ?? [])
    : [];

  const sender = resolveHeartbeatSenderId({
    allowFrom,
    deliveryTo: params.delivery.to,
    lastTo: params.entry?.lastTo,
    provider,
  });

  return { sender, provider, allowFrom };
}
