/**
 * 渠道活动追踪模块
 *
 * 记录各渠道的最后入站和出站活动时间，用于：
 * - 渠道健康状态监控
 * - 活动统计
 * - 调试和诊断
 */

import type { ChannelId } from "../channels/plugins/types.js";

/** 活动方向 */
export type ChannelDirection = "inbound" | "outbound";

/**
 * 活动记录条目
 */
type ActivityEntry = {
  /** 最后入站时间 */
  inboundAt: number | null;
  /** 最后出站时间 */
  outboundAt: number | null;
};

/** 活动记录存储 */
const activity = new Map<string, ActivityEntry>();

/**
 * 生成活动记录键
 */
function keyFor(channel: ChannelId, accountId: string) {
  return `${channel}:${accountId || "default"}`;
}

/**
 * 确保活动记录条目存在
 */
function ensureEntry(channel: ChannelId, accountId: string): ActivityEntry {
  const key = keyFor(channel, accountId);
  const existing = activity.get(key);
  if (existing) return existing;
  const created: ActivityEntry = { inboundAt: null, outboundAt: null };
  activity.set(key, created);
  return created;
}

/**
 * 记录渠道活动
 *
 * @param params.channel - 渠道 ID
 * @param params.accountId - 账户 ID
 * @param params.direction - 活动方向（入站/出站）
 * @param params.at - 活动时间戳（默认当前时间）
 */
export function recordChannelActivity(params: {
  channel: ChannelId;
  accountId?: string | null;
  direction: ChannelDirection;
  at?: number;
}) {
  const at = typeof params.at === "number" ? params.at : Date.now();
  const accountId = params.accountId?.trim() || "default";
  const entry = ensureEntry(params.channel, accountId);
  if (params.direction === "inbound") entry.inboundAt = at;
  if (params.direction === "outbound") entry.outboundAt = at;
}

/**
 * 获取渠道活动记录
 */
export function getChannelActivity(params: {
  channel: ChannelId;
  accountId?: string | null;
}): ActivityEntry {
  const accountId = params.accountId?.trim() || "default";
  return (
    activity.get(keyFor(params.channel, accountId)) ?? {
      inboundAt: null,
      outboundAt: null,
    }
  );
}

/**
 * 重置活动记录（仅用于测试）
 */
export function resetChannelActivityForTest() {
  activity.clear();
}
