/**
 * 出站消息投递模块
 *
 * 该模块负责将消息投递到各种渠道（WhatsApp、Telegram、Discord 等），
 * 支持：
 * - 文本消息分块投递
 * - 媒体消息投递
 * - Signal 富文本格式
 * - 渠道适配器插件系统
 * - 会话转录镜像
 *
 * @module infra/outbound/deliver
 */

import {
  chunkByParagraph,
  chunkMarkdownTextWithMode,
  resolveChunkMode,
  resolveTextChunkLimit,
} from "../../auto-reply/chunk.js";
import type { ReplyPayload } from "../../auto-reply/types.js";
import { resolveChannelMediaMaxBytes } from "../../channels/plugins/media-limits.js";
import { loadChannelOutboundAdapter } from "../../channels/plugins/outbound/load.js";
import type { ChannelOutboundAdapter } from "../../channels/plugins/types.js";
import type { MoltbotConfig } from "../../config/config.js";
import { resolveMarkdownTableMode } from "../../config/markdown-tables.js";
import type { sendMessageDiscord } from "../../discord/send.js";
import type { sendMessageIMessage } from "../../imessage/send.js";
import { markdownToSignalTextChunks, type SignalTextStyleRange } from "../../signal/format.js";
import { sendMessageSignal } from "../../signal/send.js";
import type { sendMessageSlack } from "../../slack/send.js";
import type { sendMessageTelegram } from "../../telegram/send.js";
import type { sendMessageWhatsApp } from "../../web/outbound.js";
import {
  appendAssistantMessageToSessionTranscript,
  resolveMirroredTranscriptText,
} from "../../config/sessions.js";
import type { NormalizedOutboundPayload } from "./payloads.js";
import { normalizeReplyPayloadsForDelivery } from "./payloads.js";
import type { OutboundChannel } from "./targets.js";

export type { NormalizedOutboundPayload } from "./payloads.js";
export { normalizeOutboundPayloads } from "./payloads.js";

/** Matrix 消息发送函数类型 */
type SendMatrixMessage = (
  to: string,
  text: string,
  opts?: { mediaUrl?: string; replyToId?: string; threadId?: string; timeoutMs?: number },
) => Promise<{ messageId: string; roomId: string }>;

/** 出站消息发送依赖注入接口 */
export type OutboundSendDeps = {
  /** WhatsApp 发送函数 */
  sendWhatsApp?: typeof sendMessageWhatsApp;
  /** Telegram 发送函数 */
  sendTelegram?: typeof sendMessageTelegram;
  /** Discord 发送函数 */
  sendDiscord?: typeof sendMessageDiscord;
  /** Slack 发送函数 */
  sendSlack?: typeof sendMessageSlack;
  /** Signal 发送函数 */
  sendSignal?: typeof sendMessageSignal;
  /** iMessage 发送函数 */
  sendIMessage?: typeof sendMessageIMessage;
  /** Matrix 发送函数 */
  sendMatrix?: SendMatrixMessage;
  /** MS Teams 发送函数 */
  sendMSTeams?: (
    to: string,
    text: string,
    opts?: { mediaUrl?: string },
  ) => Promise<{ messageId: string; conversationId: string }>;
};

/** 出站消息投递结果 */
export type OutboundDeliveryResult = {
  /** 投递渠道 */
  channel: Exclude<OutboundChannel, "none">;
  /** 消息 ID */
  messageId: string;
  /** 聊天 ID（可选） */
  chatId?: string;
  /** 频道 ID（可选） */
  channelId?: string;
  /** 房间 ID（可选，Matrix） */
  roomId?: string;
  /** 会话 ID（可选，MS Teams） */
  conversationId?: string;
  /** 时间戳（可选） */
  timestamp?: number;
  /** JID（可选，WhatsApp） */
  toJid?: string;
  /** 投票 ID（可选） */
  pollId?: string;
  /** 渠道特定元数据，避免核心类型频繁变更 */
  meta?: Record<string, unknown>;
};

/** 文本分块函数类型 */
type Chunker = (text: string, limit: number) => string[];

/** 渠道处理器接口 */
type ChannelHandler = {
  /** 分块函数 */
  chunker: Chunker | null;
  /** 分块模式：纯文本或 Markdown */
  chunkerMode?: "text" | "markdown";
  /** 文本分块限制 */
  textChunkLimit?: number;
  /** 发送完整负载（可选） */
  sendPayload?: (payload: ReplyPayload) => Promise<OutboundDeliveryResult>;
  /** 发送文本消息 */
  sendText: (text: string) => Promise<OutboundDeliveryResult>;
  /** 发送媒体消息 */
  sendMedia: (caption: string, mediaUrl: string) => Promise<OutboundDeliveryResult>;
};

/**
 * 检查中止信号，如果已中止则抛出错误
 * @param abortSignal - 中止信号
 */
function throwIfAborted(abortSignal?: AbortSignal): void {
  if (abortSignal?.aborted) {
    throw new Error("Outbound delivery aborted");
  }
}

/**
 * 创建渠道处理器
 * 渠道对接：出站投递委托给插件的 outbound 适配器
 */
async function createChannelHandler(params: {
  cfg: MoltbotConfig;
  channel: Exclude<OutboundChannel, "none">;
  to: string;
  accountId?: string;
  replyToId?: string | null;
  threadId?: string | number | null;
  deps?: OutboundSendDeps;
  gifPlayback?: boolean;
}): Promise<ChannelHandler> {
  const outbound = await loadChannelOutboundAdapter(params.channel);
  if (!outbound?.sendText || !outbound?.sendMedia) {
    throw new Error(`Outbound not configured for channel: ${params.channel}`);
  }
  const handler = createPluginHandler({
    outbound,
    cfg: params.cfg,
    channel: params.channel,
    to: params.to,
    accountId: params.accountId,
    replyToId: params.replyToId,
    threadId: params.threadId,
    deps: params.deps,
    gifPlayback: params.gifPlayback,
  });
  if (!handler) {
    throw new Error(`Outbound not configured for channel: ${params.channel}`);
  }
  return handler;
}

/**
 * 创建插件处理器
 * 封装插件的出站适配器为统一的处理器接口
 */
function createPluginHandler(params: {
  outbound?: ChannelOutboundAdapter;
  cfg: MoltbotConfig;
  channel: Exclude<OutboundChannel, "none">;
  to: string;
  accountId?: string;
  replyToId?: string | null;
  threadId?: string | number | null;
  deps?: OutboundSendDeps;
  gifPlayback?: boolean;
}): ChannelHandler | null {
  const outbound = params.outbound;
  if (!outbound?.sendText || !outbound?.sendMedia) return null;
  const sendText = outbound.sendText;
  const sendMedia = outbound.sendMedia;
  const chunker = outbound.chunker ?? null;
  const chunkerMode = outbound.chunkerMode;
  return {
    chunker,
    chunkerMode,
    textChunkLimit: outbound.textChunkLimit,
    sendPayload: outbound.sendPayload
      ? async (payload) =>
          outbound.sendPayload!({
            cfg: params.cfg,
            to: params.to,
            text: payload.text ?? "",
            mediaUrl: payload.mediaUrl,
            accountId: params.accountId,
            replyToId: params.replyToId,
            threadId: params.threadId,
            gifPlayback: params.gifPlayback,
            deps: params.deps,
            payload,
          })
      : undefined,
    sendText: async (text) =>
      sendText({
        cfg: params.cfg,
        to: params.to,
        text,
        accountId: params.accountId,
        replyToId: params.replyToId,
        threadId: params.threadId,
        gifPlayback: params.gifPlayback,
        deps: params.deps,
      }),
    sendMedia: async (caption, mediaUrl) =>
      sendMedia({
        cfg: params.cfg,
        to: params.to,
        text: caption,
        mediaUrl,
        accountId: params.accountId,
        replyToId: params.replyToId,
        threadId: params.threadId,
        gifPlayback: params.gifPlayback,
        deps: params.deps,
      }),
  };
}

/**
 * 投递出站消息负载
 *
 * 将消息负载投递到指定渠道，支持：
 * - 文本消息自动分块
 * - 媒体消息投递
 * - Signal 富文本格式
 * - 会话转录镜像
 * - 中止信号处理
 *
 * @param params.cfg - 配置对象
 * @param params.channel - 目标渠道
 * @param params.to - 接收者标识
 * @param params.accountId - 账户 ID（可选）
 * @param params.payloads - 消息负载列表
 * @param params.replyToId - 回复消息 ID（可选）
 * @param params.threadId - 线程 ID（可选）
 * @param params.deps - 依赖注入（可选）
 * @param params.gifPlayback - GIF 播放模式（可选）
 * @param params.abortSignal - 中止信号（可选）
 * @param params.bestEffort - 尽力投递模式（可选）
 * @param params.onError - 错误回调（可选）
 * @param params.onPayload - 负载回调（可选）
 * @param params.mirror - 会话镜像配置（可选）
 * @returns 投递结果列表
 */
export async function deliverOutboundPayloads(params: {
  cfg: MoltbotConfig;
  channel: Exclude<OutboundChannel, "none">;
  to: string;
  accountId?: string;
  payloads: ReplyPayload[];
  replyToId?: string | null;
  threadId?: string | number | null;
  deps?: OutboundSendDeps;
  gifPlayback?: boolean;
  abortSignal?: AbortSignal;
  bestEffort?: boolean;
  onError?: (err: unknown, payload: NormalizedOutboundPayload) => void;
  onPayload?: (payload: NormalizedOutboundPayload) => void;
  mirror?: {
    sessionKey: string;
    agentId?: string;
    text?: string;
    mediaUrls?: string[];
  };
}): Promise<OutboundDeliveryResult[]> {
  const { cfg, channel, to, payloads } = params;
  const accountId = params.accountId;
  const deps = params.deps;
  const abortSignal = params.abortSignal;
  const sendSignal = params.deps?.sendSignal ?? sendMessageSignal;
  const results: OutboundDeliveryResult[] = [];
  const handler = await createChannelHandler({
    cfg,
    channel,
    to,
    deps,
    accountId,
    replyToId: params.replyToId,
    threadId: params.threadId,
    gifPlayback: params.gifPlayback,
  });
  const textLimit = handler.chunker
    ? resolveTextChunkLimit(cfg, channel, accountId, {
        fallbackLimit: handler.textChunkLimit,
      })
    : undefined;
  const chunkMode = handler.chunker ? resolveChunkMode(cfg, channel, accountId) : "length";
  const isSignalChannel = channel === "signal";
  const signalTableMode = isSignalChannel
    ? resolveMarkdownTableMode({ cfg, channel: "signal", accountId })
    : "code";
  const signalMaxBytes = isSignalChannel
    ? resolveChannelMediaMaxBytes({
        cfg,
        resolveChannelLimitMb: ({ cfg, accountId }) =>
          cfg.channels?.signal?.accounts?.[accountId]?.mediaMaxMb ??
          cfg.channels?.signal?.mediaMaxMb,
        accountId,
      })
    : undefined;

  const sendTextChunks = async (text: string) => {
    throwIfAborted(abortSignal);
    if (!handler.chunker || textLimit === undefined) {
      results.push(await handler.sendText(text));
      return;
    }
    if (chunkMode === "newline") {
      const mode = handler.chunkerMode ?? "text";
      const blockChunks =
        mode === "markdown"
          ? chunkMarkdownTextWithMode(text, textLimit, "newline")
          : chunkByParagraph(text, textLimit);

      if (!blockChunks.length && text) blockChunks.push(text);
      for (const blockChunk of blockChunks) {
        const chunks = handler.chunker(blockChunk, textLimit);
        if (!chunks.length && blockChunk) chunks.push(blockChunk);
        for (const chunk of chunks) {
          throwIfAborted(abortSignal);
          results.push(await handler.sendText(chunk));
        }
      }
      return;
    }
    const chunks = handler.chunker(text, textLimit);
    for (const chunk of chunks) {
      throwIfAborted(abortSignal);
      results.push(await handler.sendText(chunk));
    }
  };

  const sendSignalText = async (text: string, styles: SignalTextStyleRange[]) => {
    throwIfAborted(abortSignal);
    return {
      channel: "signal" as const,
      ...(await sendSignal(to, text, {
        maxBytes: signalMaxBytes,
        accountId: accountId ?? undefined,
        textMode: "plain",
        textStyles: styles,
      })),
    };
  };

  const sendSignalTextChunks = async (text: string) => {
    throwIfAborted(abortSignal);
    let signalChunks =
      textLimit === undefined
        ? markdownToSignalTextChunks(text, Number.POSITIVE_INFINITY, {
            tableMode: signalTableMode,
          })
        : markdownToSignalTextChunks(text, textLimit, { tableMode: signalTableMode });
    if (signalChunks.length === 0 && text) {
      signalChunks = [{ text, styles: [] }];
    }
    for (const chunk of signalChunks) {
      throwIfAborted(abortSignal);
      results.push(await sendSignalText(chunk.text, chunk.styles));
    }
  };

  const sendSignalMedia = async (caption: string, mediaUrl: string) => {
    throwIfAborted(abortSignal);
    const formatted = markdownToSignalTextChunks(caption, Number.POSITIVE_INFINITY, {
      tableMode: signalTableMode,
    })[0] ?? {
      text: caption,
      styles: [],
    };
    return {
      channel: "signal" as const,
      ...(await sendSignal(to, formatted.text, {
        mediaUrl,
        maxBytes: signalMaxBytes,
        accountId: accountId ?? undefined,
        textMode: "plain",
        textStyles: formatted.styles,
      })),
    };
  };
  const normalizedPayloads = normalizeReplyPayloadsForDelivery(payloads);
  for (const payload of normalizedPayloads) {
    const payloadSummary: NormalizedOutboundPayload = {
      text: payload.text ?? "",
      mediaUrls: payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []),
      channelData: payload.channelData,
    };
    try {
      throwIfAborted(abortSignal);
      params.onPayload?.(payloadSummary);
      if (handler.sendPayload && payload.channelData) {
        results.push(await handler.sendPayload(payload));
        continue;
      }
      if (payloadSummary.mediaUrls.length === 0) {
        if (isSignalChannel) {
          await sendSignalTextChunks(payloadSummary.text);
        } else {
          await sendTextChunks(payloadSummary.text);
        }
        continue;
      }

      let first = true;
      for (const url of payloadSummary.mediaUrls) {
        throwIfAborted(abortSignal);
        const caption = first ? payloadSummary.text : "";
        first = false;
        if (isSignalChannel) {
          results.push(await sendSignalMedia(caption, url));
        } else {
          results.push(await handler.sendMedia(caption, url));
        }
      }
    } catch (err) {
      if (!params.bestEffort) throw err;
      params.onError?.(err, payloadSummary);
    }
  }
  if (params.mirror && results.length > 0) {
    const mirrorText = resolveMirroredTranscriptText({
      text: params.mirror.text,
      mediaUrls: params.mirror.mediaUrls,
    });
    if (mirrorText) {
      await appendAssistantMessageToSessionTranscript({
        agentId: params.mirror.agentId,
        sessionKey: params.mirror.sessionKey,
        text: mirrorText,
      });
    }
  }
  return results;
}
