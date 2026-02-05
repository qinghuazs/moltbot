/**
 * Slack 消息发送模块
 *
 * 该模块提供向 Slack 用户或频道发送消息的功能，支持：
 * - 文本消息发送（支持 Markdown 格式转换为 Slack mrkdwn）
 * - 媒体文件上传
 * - 消息分块（超长消息自动拆分）
 * - 线程回复
 *
 * @module slack/send
 */

import { type FilesUploadV2Arguments, type WebClient } from "@slack/web-api";

import {
  chunkMarkdownTextWithMode,
  resolveChunkMode,
  resolveTextChunkLimit,
} from "../auto-reply/chunk.js";
import { loadConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import { loadWebMedia } from "../web/media.js";
import type { SlackTokenSource } from "./accounts.js";
import { resolveSlackAccount } from "./accounts.js";
import { createSlackWebClient } from "./client.js";
import { markdownToSlackMrkdwnChunks } from "./format.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { parseSlackTarget } from "./targets.js";
import { resolveSlackBotToken } from "./token.js";

/** Slack 单条消息文本长度限制（字符数） */
const SLACK_TEXT_LIMIT = 4000;

/**
 * Slack 消息接收者类型
 * - user: 用户 ID，用于私信
 * - channel: 频道 ID，用于频道消息
 */
type SlackRecipient =
  | {
      kind: "user";
      id: string;
    }
  | {
      kind: "channel";
      id: string;
    };

/**
 * Slack 消息发送选项
 */
type SlackSendOpts = {
  /** 显式指定的 Bot Token */
  token?: string;
  /** Slack 账户 ID */
  accountId?: string;
  /** 要上传的媒体文件 URL */
  mediaUrl?: string;
  /** 自定义 WebClient 实例 */
  client?: WebClient;
  /** 线程时间戳，用于回复特定线程 */
  threadTs?: string;
};

/**
 * Slack 消息发送结果
 */
export type SlackSendResult = {
  /** 发送的消息 ID（时间戳格式） */
  messageId: string;
  /** 目标频道 ID */
  channelId: string;
};

/**
 * 解析并验证 Slack Bot Token
 *
 * 按优先级尝试获取 token：显式指定 > 账户配置 > 环境变量
 *
 * @param params - Token 解析参数
 * @param params.explicit - 显式指定的 token
 * @param params.accountId - 账户 ID，用于错误提示
 * @param params.fallbackToken - 备用 token
 * @param params.fallbackSource - 备用 token 来源
 * @returns 有效的 Bot Token
 * @throws 当无法获取有效 token 时抛出错误
 */
function resolveToken(params: {
  explicit?: string;
  accountId: string;
  fallbackToken?: string;
  fallbackSource?: SlackTokenSource;
}) {
  const explicit = resolveSlackBotToken(params.explicit);
  if (explicit) return explicit;
  const fallback = resolveSlackBotToken(params.fallbackToken);
  if (!fallback) {
    logVerbose(
      `slack send: missing bot token for account=${params.accountId} explicit=${Boolean(
        params.explicit,
      )} source=${params.fallbackSource ?? "unknown"}`,
    );
    throw new Error(
      `Slack bot token missing for account "${params.accountId}" (set channels.slack.accounts.${params.accountId}.botToken or SLACK_BOT_TOKEN for default).`,
    );
  }
  return fallback;
}

/**
 * 解析消息接收者字符串
 *
 * @param raw - 原始接收者字符串（用户 ID 或频道 ID）
 * @returns 解析后的接收者对象
 * @throws 当接收者为空时抛出错误
 */
function parseRecipient(raw: string): SlackRecipient {
  const target = parseSlackTarget(raw);
  if (!target) {
    throw new Error("Recipient is required for Slack sends");
  }
  return { kind: target.kind, id: target.id };
}

/**
 * 解析频道 ID
 *
 * 对于用户类型的接收者，会自动打开私信频道
 *
 * @param client - Slack WebClient 实例
 * @param recipient - 消息接收者
 * @returns 频道 ID 和是否为私信的标识
 * @throws 当无法打开私信频道时抛出错误
 */
async function resolveChannelId(
  client: WebClient,
  recipient: SlackRecipient,
): Promise<{ channelId: string; isDm?: boolean }> {
  if (recipient.kind === "channel") {
    return { channelId: recipient.id };
  }
  const response = await client.conversations.open({ users: recipient.id });
  const channelId = response.channel?.id;
  if (!channelId) {
    throw new Error("Failed to open Slack DM channel");
  }
  return { channelId, isDm: true };
}

/**
 * 上传文件到 Slack
 *
 * 使用 Slack files.uploadV2 API 上传媒体文件
 *
 * @param params - 上传参数
 * @param params.client - Slack WebClient 实例
 * @param params.channelId - 目标频道 ID
 * @param params.mediaUrl - 媒体文件 URL
 * @param params.caption - 可选的文件说明
 * @param params.threadTs - 可选的线程时间戳
 * @param params.maxBytes - 可选的最大文件大小限制
 * @returns 上传后的文件 ID
 */
async function uploadSlackFile(params: {
  client: WebClient;
  channelId: string;
  mediaUrl: string;
  caption?: string;
  threadTs?: string;
  maxBytes?: number;
}): Promise<string> {
  const {
    buffer,
    contentType: _contentType,
    fileName,
  } = await loadWebMedia(params.mediaUrl, params.maxBytes);
  const basePayload = {
    channel_id: params.channelId,
    file: buffer,
    filename: fileName,
    ...(params.caption ? { initial_comment: params.caption } : {}),
    // Note: filetype is deprecated in files.uploadV2, Slack auto-detects from file content
  };
  const payload: FilesUploadV2Arguments = params.threadTs
    ? { ...basePayload, thread_ts: params.threadTs }
    : basePayload;
  const response = await params.client.files.uploadV2(payload);
  const parsed = response as {
    files?: Array<{ id?: string; name?: string }>;
    file?: { id?: string; name?: string };
  };
  const fileId =
    parsed.files?.[0]?.id ??
    parsed.file?.id ??
    parsed.files?.[0]?.name ??
    parsed.file?.name ??
    "unknown";
  return fileId;
}

/**
 * 向 Slack 发送消息
 *
 * 主要的消息发送函数，支持：
 * - 纯文本消息
 * - 带媒体附件的消息
 * - 超长消息自动分块
 * - 线程回复
 * - Markdown 到 Slack mrkdwn 格式转换
 *
 * @param to - 接收者（用户 ID 或频道 ID）
 * @param message - 消息内容（支持 Markdown 格式）
 * @param opts - 发送选项
 * @returns 发送结果，包含消息 ID 和频道 ID
 * @throws 当消息和媒体都为空时抛出错误
 *
 * @example
 * ```typescript
 * // 发送简单文本消息
 * await sendMessageSlack("C1234567890", "Hello, Slack!");
 *
 * // 发送带媒体的消息
 * await sendMessageSlack("U1234567890", "Check this out!", {
 *   mediaUrl: "https://example.com/image.png"
 * });
 * ```
 */
export async function sendMessageSlack(
  to: string,
  message: string,
  opts: SlackSendOpts = {},
): Promise<SlackSendResult> {
  const trimmedMessage = message?.trim() ?? "";
  if (!trimmedMessage && !opts.mediaUrl) {
    throw new Error("Slack send requires text or media");
  }
  const cfg = loadConfig();
  const account = resolveSlackAccount({
    cfg,
    accountId: opts.accountId,
  });
  const token = resolveToken({
    explicit: opts.token,
    accountId: account.accountId,
    fallbackToken: account.botToken,
    fallbackSource: account.botTokenSource,
  });
  const client = opts.client ?? createSlackWebClient(token);
  const recipient = parseRecipient(to);
  const { channelId } = await resolveChannelId(client, recipient);
  const textLimit = resolveTextChunkLimit(cfg, "slack", account.accountId);
  const chunkLimit = Math.min(textLimit, SLACK_TEXT_LIMIT);
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "slack",
    accountId: account.accountId,
  });
  const chunkMode = resolveChunkMode(cfg, "slack", account.accountId);
  const markdownChunks =
    chunkMode === "newline"
      ? chunkMarkdownTextWithMode(trimmedMessage, chunkLimit, chunkMode)
      : [trimmedMessage];
  const chunks = markdownChunks.flatMap((markdown) =>
    markdownToSlackMrkdwnChunks(markdown, chunkLimit, { tableMode }),
  );
  if (!chunks.length && trimmedMessage) chunks.push(trimmedMessage);
  const mediaMaxBytes =
    typeof account.config.mediaMaxMb === "number"
      ? account.config.mediaMaxMb * 1024 * 1024
      : undefined;

  let lastMessageId = "";
  if (opts.mediaUrl) {
    const [firstChunk, ...rest] = chunks;
    lastMessageId = await uploadSlackFile({
      client,
      channelId,
      mediaUrl: opts.mediaUrl,
      caption: firstChunk,
      threadTs: opts.threadTs,
      maxBytes: mediaMaxBytes,
    });
    for (const chunk of rest) {
      const response = await client.chat.postMessage({
        channel: channelId,
        text: chunk,
        thread_ts: opts.threadTs,
      });
      lastMessageId = response.ts ?? lastMessageId;
    }
  } else {
    for (const chunk of chunks.length ? chunks : [""]) {
      const response = await client.chat.postMessage({
        channel: channelId,
        text: chunk,
        thread_ts: opts.threadTs,
      });
      lastMessageId = response.ts ?? lastMessageId;
    }
  }

  return {
    messageId: lastMessageId || "unknown",
    channelId,
  };
}
