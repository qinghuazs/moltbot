/**
 * 出站消息负载处理模块
 *
 * 该模块负责处理和标准化出站消息负载，包括：
 * - 解析回复指令
 * - 合并媒体 URL
 * - 标准化负载格式
 * - 格式化日志输出
 *
 * @module infra/outbound/payloads
 */

import { parseReplyDirectives } from "../../auto-reply/reply/reply-directives.js";
import { isRenderablePayload } from "../../auto-reply/reply/reply-payloads.js";
import type { ReplyPayload } from "../../auto-reply/types.js";

/** 标准化的出站负载类型 */
export type NormalizedOutboundPayload = {
  /** 文本内容 */
  text: string;
  /** 媒体 URL 列表 */
  mediaUrls: string[];
  /** 渠道特定数据 */
  channelData?: Record<string, unknown>;
};

/** JSON 格式的出站负载类型 */
export type OutboundPayloadJson = {
  /** 文本内容 */
  text: string;
  /** 单个媒体 URL（兼容旧格式） */
  mediaUrl: string | null;
  /** 媒体 URL 列表 */
  mediaUrls?: string[];
  /** 渠道特定数据 */
  channelData?: Record<string, unknown>;
};

/**
 * 合并多个媒体 URL 列表
 * 去重并保持顺序
 */
function mergeMediaUrls(...lists: Array<Array<string | undefined> | undefined>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const entry of list) {
      const trimmed = entry?.trim();
      if (!trimmed) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      merged.push(trimmed);
    }
  }
  return merged;
}

/**
 * 标准化回复负载用于投递
 * 解析指令、合并媒体、过滤无效负载
 *
 * @param payloads - 原始负载列表
 * @returns 标准化后的负载列表
 */
export function normalizeReplyPayloadsForDelivery(payloads: ReplyPayload[]): ReplyPayload[] {
  return payloads.flatMap((payload) => {
    const parsed = parseReplyDirectives(payload.text ?? "");
    const explicitMediaUrls = payload.mediaUrls ?? parsed.mediaUrls;
    const explicitMediaUrl = payload.mediaUrl ?? parsed.mediaUrl;
    const mergedMedia = mergeMediaUrls(
      explicitMediaUrls,
      explicitMediaUrl ? [explicitMediaUrl] : undefined,
    );
    const hasMultipleMedia = (explicitMediaUrls?.length ?? 0) > 1;
    const resolvedMediaUrl = hasMultipleMedia ? undefined : explicitMediaUrl;
    const next: ReplyPayload = {
      ...payload,
      text: parsed.text ?? "",
      mediaUrls: mergedMedia.length ? mergedMedia : undefined,
      mediaUrl: resolvedMediaUrl,
      replyToId: payload.replyToId ?? parsed.replyToId,
      replyToTag: payload.replyToTag || parsed.replyToTag,
      replyToCurrent: payload.replyToCurrent || parsed.replyToCurrent,
      audioAsVoice: Boolean(payload.audioAsVoice || parsed.audioAsVoice),
    };
    if (parsed.isSilent && mergedMedia.length === 0) return [];
    if (!isRenderablePayload(next)) return [];
    return [next];
  });
}

/**
 * 标准化出站负载
 * 转换为统一的内部格式
 *
 * @param payloads - 原始负载列表
 * @returns 标准化后的负载列表
 */
export function normalizeOutboundPayloads(payloads: ReplyPayload[]): NormalizedOutboundPayload[] {
  return normalizeReplyPayloadsForDelivery(payloads)
    .map((payload) => {
      const channelData = payload.channelData;
      const normalized: NormalizedOutboundPayload = {
        text: payload.text ?? "",
        mediaUrls: payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []),
      };
      if (channelData && Object.keys(channelData).length > 0) {
        normalized.channelData = channelData;
      }
      return normalized;
    })
    .filter(
      (payload) =>
        payload.text ||
        payload.mediaUrls.length > 0 ||
        Boolean(payload.channelData && Object.keys(payload.channelData).length > 0),
    );
}

/**
 * 标准化出站负载为 JSON 格式
 * 用于 API 响应和序列化
 *
 * @param payloads - 原始负载列表
 * @returns JSON 格式的负载列表
 */
export function normalizeOutboundPayloadsForJson(payloads: ReplyPayload[]): OutboundPayloadJson[] {
  return normalizeReplyPayloadsForDelivery(payloads).map((payload) => ({
    text: payload.text ?? "",
    mediaUrl: payload.mediaUrl ?? null,
    mediaUrls: payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : undefined),
    channelData: payload.channelData,
  }));
}

/**
 * 格式化出站负载为日志字符串
 *
 * @param payload - 标准化的负载
 * @returns 格式化的日志字符串
 */
export function formatOutboundPayloadLog(payload: NormalizedOutboundPayload): string {
  const lines: string[] = [];
  if (payload.text) lines.push(payload.text.trimEnd());
  for (const url of payload.mediaUrls) lines.push(`MEDIA:${url}`);
  return lines.join("\n");
}
