/**
 * Discord 消息发送模块
 *
 * 该模块提供了向 Discord 发送消息的核心功能，包括：
 * - 文本消息发送（支持 Markdown 表格转换）
 * - 媒体文件发送（图片、视频等）
 * - 贴纸发送
 * - 投票发送
 *
 * @module discord/send.outbound
 */

import type { RequestClient } from "@buape/carbon";
import { Routes } from "discord-api-types/v10";
import { resolveChunkMode } from "../auto-reply/chunk.js";
import { loadConfig } from "../config/config.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { convertMarkdownTables } from "../markdown/tables.js";
import type { RetryConfig } from "../infra/retry.js";
import type { PollInput } from "../polls.js";
import { resolveDiscordAccount } from "./accounts.js";
import {
  buildDiscordSendError,
  createDiscordClient,
  normalizeDiscordPollInput,
  normalizeStickerIds,
  parseAndResolveRecipient,
  resolveChannelId,
  sendDiscordMedia,
  sendDiscordText,
} from "./send.shared.js";
import type { DiscordSendResult } from "./send.types.js";

/**
 * Discord 消息发送选项
 */
type DiscordSendOpts = {
  /** Discord Bot Token */
  token?: string;
  /** 账户 ID（多账户场景） */
  accountId?: string;
  /** 媒体文件 URL */
  mediaUrl?: string;
  /** 是否输出详细日志 */
  verbose?: boolean;
  /** 自定义 REST 客户端 */
  rest?: RequestClient;
  /** 回复的消息 ID */
  replyTo?: string;
  /** 重试配置 */
  retry?: RetryConfig;
  /** 嵌入内容数组 */
  embeds?: unknown[];
};

/**
 * 发送 Discord 消息
 *
 * 支持发送纯文本消息或带媒体附件的消息。
 * 自动处理 Markdown 表格转换和消息分块。
 *
 * @param to - 目标（频道 ID、用户 ID 或 Discord URL）
 * @param text - 消息文本内容
 * @param opts - 发送选项
 * @returns 发送结果（包含消息 ID 和频道 ID）
 * @throws {DiscordSendError} 发送失败时抛出
 */
export async function sendMessageDiscord(
  to: string,
  text: string,
  opts: DiscordSendOpts = {},
): Promise<DiscordSendResult> {
  const cfg = loadConfig();
  const accountInfo = resolveDiscordAccount({
    cfg,
    accountId: opts.accountId,
  });
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "discord",
    accountId: accountInfo.accountId,
  });
  const chunkMode = resolveChunkMode(cfg, "discord", accountInfo.accountId);
  const textWithTables = convertMarkdownTables(text ?? "", tableMode);
  const { token, rest, request } = createDiscordClient(opts, cfg);
  const recipient = await parseAndResolveRecipient(to, opts.accountId);
  const { channelId } = await resolveChannelId(rest, recipient, request);
  let result: { id: string; channel_id: string } | { id: string | null; channel_id: string };
  try {
    if (opts.mediaUrl) {
      result = await sendDiscordMedia(
        rest,
        channelId,
        textWithTables,
        opts.mediaUrl,
        opts.replyTo,
        request,
        accountInfo.config.maxLinesPerMessage,
        opts.embeds,
        chunkMode,
      );
    } else {
      result = await sendDiscordText(
        rest,
        channelId,
        textWithTables,
        opts.replyTo,
        request,
        accountInfo.config.maxLinesPerMessage,
        opts.embeds,
        chunkMode,
      );
    }
  } catch (err) {
    throw await buildDiscordSendError(err, {
      channelId,
      rest,
      token,
      hasMedia: Boolean(opts.mediaUrl),
    });
  }

  recordChannelActivity({
    channel: "discord",
    accountId: accountInfo.accountId,
    direction: "outbound",
  });
  return {
    messageId: result.id ? String(result.id) : "unknown",
    channelId: String(result.channel_id ?? channelId),
  };
}

/**
 * 发送 Discord 贴纸消息
 *
 * 向指定频道发送一个或多个贴纸，可选附带文本内容。
 *
 * @param to - 目标（频道 ID、用户 ID 或 Discord URL）
 * @param stickerIds - 贴纸 ID 数组（最多 3 个）
 * @param opts - 发送选项
 * @param opts.content - 可选的文本内容
 * @returns 发送结果（包含消息 ID 和频道 ID）
 */
export async function sendStickerDiscord(
  to: string,
  stickerIds: string[],
  opts: DiscordSendOpts & { content?: string } = {},
): Promise<DiscordSendResult> {
  const cfg = loadConfig();
  const { rest, request } = createDiscordClient(opts, cfg);
  const recipient = await parseAndResolveRecipient(to, opts.accountId);
  const { channelId } = await resolveChannelId(rest, recipient, request);
  const content = opts.content?.trim();
  const stickers = normalizeStickerIds(stickerIds);
  const res = (await request(
    () =>
      rest.post(Routes.channelMessages(channelId), {
        body: {
          content: content || undefined,
          sticker_ids: stickers,
        },
      }) as Promise<{ id: string; channel_id: string }>,
    "sticker",
  )) as { id: string; channel_id: string };
  return {
    messageId: res.id ? String(res.id) : "unknown",
    channelId: String(res.channel_id ?? channelId),
  };
}

/**
 * 发送 Discord 投票消息
 *
 * 向指定频道发送一个投票，可选附带文本内容。
 *
 * @param to - 目标（频道 ID、用户 ID 或 Discord URL）
 * @param poll - 投票配置（问题、选项、时长等）
 * @param opts - 发送选项
 * @param opts.content - 可选的文本内容
 * @returns 发送结果（包含消息 ID 和频道 ID）
 */
export async function sendPollDiscord(
  to: string,
  poll: PollInput,
  opts: DiscordSendOpts & { content?: string } = {},
): Promise<DiscordSendResult> {
  const cfg = loadConfig();
  const { rest, request } = createDiscordClient(opts, cfg);
  const recipient = await parseAndResolveRecipient(to, opts.accountId);
  const { channelId } = await resolveChannelId(rest, recipient, request);
  const content = opts.content?.trim();
  const payload = normalizeDiscordPollInput(poll);
  const res = (await request(
    () =>
      rest.post(Routes.channelMessages(channelId), {
        body: {
          content: content || undefined,
          poll: payload,
        },
      }) as Promise<{ id: string; channel_id: string }>,
    "poll",
  )) as { id: string; channel_id: string };
  return {
    messageId: res.id ? String(res.id) : "unknown",
    channelId: String(res.channel_id ?? channelId),
  };
}
