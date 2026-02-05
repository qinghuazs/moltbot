/**
 * Telegram 消息发送模块
 *
 * 本模块提供 Telegram 消息发送的核心功能，包括：
 * - 发送文本消息（支持 Markdown 和 HTML 格式）
 * - 发送媒体消息（图片、视频、音频、文档、GIF 动画）
 * - 发送贴纸消息
 * - 消息表情回应
 * - 消息删除和编辑
 * - 内联键盘按钮支持
 * - 论坛话题和消息回复线程支持
 *
 * @module telegram/send
 */

import type {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  ReactionType,
  ReactionTypeEmoji,
} from "@grammyjs/types";
import { type ApiClientOptions, Bot, HttpError, InputFile } from "grammy";
import { loadConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { withTelegramApiErrorLogging } from "./api-logging.js";
import { formatErrorMessage, formatUncaughtError } from "../infra/errors.js";
import { isDiagnosticFlagEnabled } from "../infra/diagnostic-flags.js";
import type { RetryConfig } from "../infra/retry.js";
import { createTelegramRetryRunner } from "../infra/retry-policy.js";
import { redactSensitiveText } from "../logging/redact.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { mediaKindFromMime } from "../media/constants.js";
import { isGifMedia } from "../media/mime.js";
import { loadWebMedia } from "../web/media.js";
import { type ResolvedTelegramAccount, resolveTelegramAccount } from "./accounts.js";
import { resolveTelegramFetch } from "./fetch.js";
import { makeProxyFetch } from "./proxy.js";
import { renderTelegramHtmlText } from "./format.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { isRecoverableTelegramNetworkError } from "./network-errors.js";
import { splitTelegramCaption } from "./caption.js";
import { recordSentMessage } from "./sent-message-cache.js";
import { parseTelegramTarget, stripTelegramInternalPrefixes } from "./targets.js";
import { resolveTelegramVoiceSend } from "./voice.js";
import { buildTelegramThreadParams } from "./bot/helpers.js";

/**
 * Telegram 消息发送选项
 */
type TelegramSendOpts = {
  /** Bot 令牌（可选，默认从配置读取） */
  token?: string;
  /** 账户 ID（用于多账户场景） */
  accountId?: string;
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** 媒体文件 URL */
  mediaUrl?: string;
  /** 媒体文件最大字节数 */
  maxBytes?: number;
  /** Bot API 实例（可选，用于复用连接） */
  api?: Bot["api"];
  /** 重试配置 */
  retry?: RetryConfig;
  /** 文本格式模式：markdown 或 html */
  textMode?: "markdown" | "html";
  /** 纯文本内容（用于 HTML 解析失败时的回退） */
  plainText?: string;
  /** 将音频作为语音消息发送（语音气泡），默认为 false */
  asVoice?: boolean;
  /** 静默发送消息（无通知），默认为 false */
  silent?: boolean;
  /** 要回复的消息 ID（用于消息线程） */
  replyToMessageId?: number;
  /** Telegram reply_parameters 的引用文本 */
  quoteText?: string;
  /** 论坛话题线程 ID（用于论坛超级群组） */
  messageThreadId?: number;
  /** 内联键盘按钮（回复标记） */
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
};

/**
 * Telegram 消息发送结果
 */
type TelegramSendResult = {
  /** 发送的消息 ID */
  messageId: string;
  /** 聊天 ID */
  chatId: string;
};

/**
 * Telegram 表情回应选项
 */
type TelegramReactionOpts = {
  /** Bot 令牌 */
  token?: string;
  /** 账户 ID */
  accountId?: string;
  /** Bot API 实例 */
  api?: Bot["api"];
  /** 是否移除回应 */
  remove?: boolean;
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** 重试配置 */
  retry?: RetryConfig;
};

/** 匹配 Telegram HTML 解析错误的正则表达式 */
const PARSE_ERR_RE = /can't parse entities|parse entities|find end of the entity/i;
/** 诊断日志记录器 */
const diagLogger = createSubsystemLogger("telegram/diagnostic");

/**
 * 创建 Telegram HTTP 错误日志记录器
 * @param cfg - 配置对象
 * @returns 日志记录函数，当诊断标志未启用时返回空函数
 */
function createTelegramHttpLogger(cfg: ReturnType<typeof loadConfig>) {
  const enabled = isDiagnosticFlagEnabled("telegram.http", cfg);
  if (!enabled) {
    return () => {};
  }
  return (label: string, err: unknown) => {
    if (!(err instanceof HttpError)) return;
    const detail = redactSensitiveText(formatUncaughtError(err.error ?? err));
    diagLogger.warn(`telegram http error (${label}): ${detail}`);
  };
}

/**
 * 解析 Telegram 客户端配置选项
 * 根据账户配置设置代理、网络和超时参数
 *
 * @param account - 已解析的 Telegram 账户配置
 * @returns API 客户端选项，如果无需特殊配置则返回 undefined
 */
function resolveTelegramClientOptions(
  account: ResolvedTelegramAccount,
): ApiClientOptions | undefined {
  const proxyUrl = account.config.proxy?.trim();
  const proxyFetch = proxyUrl ? makeProxyFetch(proxyUrl) : undefined;
  const fetchImpl = resolveTelegramFetch(proxyFetch, {
    network: account.config.network,
  });
  const timeoutSeconds =
    typeof account.config.timeoutSeconds === "number" &&
    Number.isFinite(account.config.timeoutSeconds)
      ? Math.max(1, Math.floor(account.config.timeoutSeconds))
      : undefined;
  return fetchImpl || timeoutSeconds
    ? {
        ...(fetchImpl ? { fetch: fetchImpl as unknown as ApiClientOptions["fetch"] } : {}),
        ...(timeoutSeconds ? { timeoutSeconds } : {}),
      }
    : undefined;
}

/**
 * 解析 Bot 令牌
 * 优先使用显式传入的令牌，否则从账户配置中获取
 *
 * @param explicit - 显式传入的令牌
 * @param params - 包含账户 ID 和令牌的参数对象
 * @returns 解析后的令牌字符串
 * @throws 当令牌缺失时抛出错误
 */
function resolveToken(explicit: string | undefined, params: { accountId: string; token: string }) {
  if (explicit?.trim()) return explicit.trim();
  if (!params.token) {
    throw new Error(
      `Telegram bot token missing for account "${params.accountId}" (set channels.telegram.accounts.${params.accountId}.botToken/tokenFile or TELEGRAM_BOT_TOKEN for default).`,
    );
  }
  return params.token.trim();
}

/**
 * 标准化聊天 ID
 * 处理各种格式的聊天标识符，包括：
 * - 内部前缀（如 telegram:、telegram:group:）
 * - t.me 链接
 * - @用户名
 * - 数字 ID
 *
 * @param to - 原始聊天标识符
 * @returns 标准化后的聊天 ID
 * @throws 当接收者为空时抛出错误
 */
function normalizeChatId(to: string): string {
  const trimmed = to.trim();
  if (!trimmed) throw new Error("Recipient is required for Telegram sends");

  // Common internal prefixes that sometimes leak into outbound sends.
  // - ctx.To uses `telegram:<id>`
  // - group sessions often use `telegram:group:<id>`
  let normalized = stripTelegramInternalPrefixes(trimmed);

  // Accept t.me links for public chats/channels.
  // (Invite links like `t.me/+...` are not resolvable via Bot API.)
  const m =
    /^https?:\/\/t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized) ??
    /^t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized);
  if (m?.[1]) normalized = `@${m[1]}`;

  if (!normalized) throw new Error("Recipient is required for Telegram sends");
  if (normalized.startsWith("@")) return normalized;
  if (/^-?\d+$/.test(normalized)) return normalized;

  // If the user passed a username without `@`, assume they meant a public chat/channel.
  if (/^[A-Za-z0-9_]{5,}$/i.test(normalized)) return `@${normalized}`;

  return normalized;
}

/**
 * 标准化消息 ID
 * 将字符串或数字格式的消息 ID 转换为整数
 *
 * @param raw - 原始消息 ID（字符串或数字）
 * @returns 整数格式的消息 ID
 * @throws 当消息 ID 无效或缺失时抛出错误
 */
function normalizeMessageId(raw: string | number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      throw new Error("Message id is required for Telegram actions");
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error("Message id is required for Telegram actions");
}

/**
 * 构建内联键盘标记
 * 将按钮数组转换为 Telegram InlineKeyboardMarkup 格式
 *
 * @param buttons - 按钮二维数组，每个按钮包含 text 和 callback_data
 * @returns InlineKeyboardMarkup 对象，如果无有效按钮则返回 undefined
 */
export function buildInlineKeyboard(
  buttons?: TelegramSendOpts["buttons"],
): InlineKeyboardMarkup | undefined {
  if (!buttons?.length) return undefined;
  const rows = buttons
    .map((row) =>
      row
        .filter((button) => button?.text && button?.callback_data)
        .map(
          (button): InlineKeyboardButton => ({
            text: button.text,
            callback_data: button.callback_data,
          }),
        ),
    )
    .filter((row) => row.length > 0);
  if (rows.length === 0) return undefined;
  return { inline_keyboard: rows };
}

/**
 * 发送 Telegram 消息
 *
 * 支持发送文本消息和媒体消息（图片、视频、音频、文档、GIF）。
 * 自动处理：
 * - Markdown/HTML 格式转换
 * - 媒体文件下载和发送
 * - 长文本分割（媒体标题超限时）
 * - HTML 解析失败时的纯文本回退
 * - 论坛话题和消息回复线程
 * - 内联键盘按钮
 *
 * @param to - 目标聊天 ID 或用户名
 * @param text - 消息文本内容
 * @param opts - 发送选项
 * @returns 包含 messageId 和 chatId 的发送结果
 * @throws 当消息为空或发送失败时抛出错误
 */
export async function sendMessageTelegram(
  to: string,
  text: string,
  opts: TelegramSendOpts = {},
): Promise<TelegramSendResult> {
  const cfg = loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const token = resolveToken(opts.token, account);
  const target = parseTelegramTarget(to);
  const chatId = normalizeChatId(target.chatId);
  // Use provided api or create a new Bot instance. The nullish coalescing
  // operator ensures api is always defined (Bot.api is always non-null).
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  const mediaUrl = opts.mediaUrl?.trim();
  const replyMarkup = buildInlineKeyboard(opts.buttons);

  // Build optional params for forum topics and reply threading.
  // Only include these if actually provided to keep API calls clean.
  const messageThreadId =
    opts.messageThreadId != null ? opts.messageThreadId : target.messageThreadId;
  const threadIdParams = buildTelegramThreadParams(messageThreadId);
  const threadParams: Record<string, unknown> = threadIdParams ? { ...threadIdParams } : {};
  const quoteText = opts.quoteText?.trim();
  if (opts.replyToMessageId != null) {
    if (quoteText) {
      threadParams.reply_parameters = {
        message_id: Math.trunc(opts.replyToMessageId),
        quote: quoteText,
      };
    } else {
      threadParams.reply_to_message_id = Math.trunc(opts.replyToMessageId);
    }
  }
  const hasThreadParams = Object.keys(threadParams).length > 0;
  const request = createTelegramRetryRunner({
    retry: opts.retry,
    configRetry: account.config.retry,
    verbose: opts.verbose,
    shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" }),
  });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    withTelegramApiErrorLogging({
      operation: label ?? "request",
      fn: () => request(fn, label),
    }).catch((err) => {
      logHttpError(label ?? "request", err);
      throw err;
    });
  const wrapChatNotFound = (err: unknown) => {
    if (!/400: Bad Request: chat not found/i.test(formatErrorMessage(err))) return err;
    return new Error(
      [
        `Telegram send failed: chat not found (chat_id=${chatId}).`,
        "Likely: bot not started in DM, bot removed from group/channel, group migrated (new -100… id), or wrong bot token.",
        `Input was: ${JSON.stringify(to)}.`,
      ].join(" "),
    );
  };

  const textMode = opts.textMode ?? "markdown";
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
  });
  const renderHtmlText = (value: string) => renderTelegramHtmlText(value, { textMode, tableMode });

  // Resolve link preview setting from config (default: enabled).
  const linkPreviewEnabled = account.config.linkPreview ?? true;
  const linkPreviewOptions = linkPreviewEnabled ? undefined : { is_disabled: true };

  const sendTelegramText = async (
    rawText: string,
    params?: Record<string, unknown>,
    fallbackText?: string,
  ) => {
    const htmlText = renderHtmlText(rawText);
    const baseParams = params ? { ...params } : {};
    if (linkPreviewOptions) {
      baseParams.link_preview_options = linkPreviewOptions;
    }
    const hasBaseParams = Object.keys(baseParams).length > 0;
    const sendParams = {
      parse_mode: "HTML" as const,
      ...baseParams,
      ...(opts.silent === true ? { disable_notification: true } : {}),
    };
    const res = await requestWithDiag(
      () => api.sendMessage(chatId, htmlText, sendParams),
      "message",
    ).catch(async (err) => {
      // Telegram rejects malformed HTML (e.g., unsupported tags or entities).
      // When that happens, fall back to plain text so the message still delivers.
      const errText = formatErrorMessage(err);
      if (PARSE_ERR_RE.test(errText)) {
        if (opts.verbose) {
          console.warn(`telegram HTML parse failed, retrying as plain text: ${errText}`);
        }
        const fallback = fallbackText ?? rawText;
        const plainParams = hasBaseParams ? baseParams : undefined;
        return await requestWithDiag(
          () =>
            plainParams
              ? api.sendMessage(chatId, fallback, plainParams)
              : api.sendMessage(chatId, fallback),
          "message-plain",
        ).catch((err2) => {
          throw wrapChatNotFound(err2);
        });
      }
      throw wrapChatNotFound(err);
    });
    return res;
  };

  if (mediaUrl) {
    const media = await loadWebMedia(mediaUrl, opts.maxBytes);
    const kind = mediaKindFromMime(media.contentType ?? undefined);
    const isGif = isGifMedia({
      contentType: media.contentType,
      fileName: media.fileName,
    });
    const fileName = media.fileName ?? (isGif ? "animation.gif" : inferFilename(kind)) ?? "file";
    const file = new InputFile(media.buffer, fileName);
    const { caption, followUpText } = splitTelegramCaption(text);
    const htmlCaption = caption ? renderHtmlText(caption) : undefined;
    // If text exceeds Telegram's caption limit, send media without caption
    // then send text as a separate follow-up message.
    const needsSeparateText = Boolean(followUpText);
    // When splitting, put reply_markup only on the follow-up text (the "main" content),
    // not on the media message.
    const baseMediaParams = {
      ...(hasThreadParams ? threadParams : {}),
      ...(!needsSeparateText && replyMarkup ? { reply_markup: replyMarkup } : {}),
    };
    const mediaParams = {
      caption: htmlCaption,
      ...(htmlCaption ? { parse_mode: "HTML" as const } : {}),
      ...baseMediaParams,
      ...(opts.silent === true ? { disable_notification: true } : {}),
    };
    let result:
      | Awaited<ReturnType<typeof api.sendPhoto>>
      | Awaited<ReturnType<typeof api.sendVideo>>
      | Awaited<ReturnType<typeof api.sendAudio>>
      | Awaited<ReturnType<typeof api.sendVoice>>
      | Awaited<ReturnType<typeof api.sendAnimation>>
      | Awaited<ReturnType<typeof api.sendDocument>>;
    if (isGif) {
      result = await requestWithDiag(
        () => api.sendAnimation(chatId, file, mediaParams),
        "animation",
      ).catch((err) => {
        throw wrapChatNotFound(err);
      });
    } else if (kind === "image") {
      result = await requestWithDiag(() => api.sendPhoto(chatId, file, mediaParams), "photo").catch(
        (err) => {
          throw wrapChatNotFound(err);
        },
      );
    } else if (kind === "video") {
      result = await requestWithDiag(() => api.sendVideo(chatId, file, mediaParams), "video").catch(
        (err) => {
          throw wrapChatNotFound(err);
        },
      );
    } else if (kind === "audio") {
      const { useVoice } = resolveTelegramVoiceSend({
        wantsVoice: opts.asVoice === true, // default false (backward compatible)
        contentType: media.contentType,
        fileName,
        logFallback: logVerbose,
      });
      if (useVoice) {
        result = await requestWithDiag(
          () => api.sendVoice(chatId, file, mediaParams),
          "voice",
        ).catch((err) => {
          throw wrapChatNotFound(err);
        });
      } else {
        result = await requestWithDiag(
          () => api.sendAudio(chatId, file, mediaParams),
          "audio",
        ).catch((err) => {
          throw wrapChatNotFound(err);
        });
      }
    } else {
      result = await requestWithDiag(
        () => api.sendDocument(chatId, file, mediaParams),
        "document",
      ).catch((err) => {
        throw wrapChatNotFound(err);
      });
    }
    const mediaMessageId = String(result?.message_id ?? "unknown");
    const resolvedChatId = String(result?.chat?.id ?? chatId);
    if (result?.message_id) {
      recordSentMessage(chatId, result.message_id);
    }
    recordChannelActivity({
      channel: "telegram",
      accountId: account.accountId,
      direction: "outbound",
    });

    // If text was too long for a caption, send it as a separate follow-up message.
    // Use HTML conversion so markdown renders like captions.
    if (needsSeparateText && followUpText) {
      const textParams =
        hasThreadParams || replyMarkup
          ? {
              ...threadParams,
              ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            }
          : undefined;
      const textRes = await sendTelegramText(followUpText, textParams);
      // Return the text message ID as the "main" message (it's the actual content).
      return {
        messageId: String(textRes?.message_id ?? mediaMessageId),
        chatId: resolvedChatId,
      };
    }

    return { messageId: mediaMessageId, chatId: resolvedChatId };
  }

  if (!text || !text.trim()) {
    throw new Error("Message must be non-empty for Telegram sends");
  }
  const textParams =
    hasThreadParams || replyMarkup
      ? {
          ...threadParams,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }
      : undefined;
  const res = await sendTelegramText(text, textParams, opts.plainText);
  const messageId = String(res?.message_id ?? "unknown");
  if (res?.message_id) {
    recordSentMessage(chatId, res.message_id);
  }
  recordChannelActivity({
    channel: "telegram",
    accountId: account.accountId,
    direction: "outbound",
  });
  return { messageId, chatId: String(res?.chat?.id ?? chatId) };
}

/**
 * 为 Telegram 消息添加表情回应
 *
 * @param chatIdInput - 聊天 ID
 * @param messageIdInput - 消息 ID
 * @param emoji - 表情符号
 * @param opts - 回应选项（可设置 remove: true 移除回应）
 * @returns 操作成功标志
 * @throws 当 Bot API 不支持回应功能时抛出错误
 */
export async function reactMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  emoji: string,
  opts: TelegramReactionOpts = {},
): Promise<{ ok: true }> {
  const cfg = loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const token = resolveToken(opts.token, account);
  const chatId = normalizeChatId(String(chatIdInput));
  const messageId = normalizeMessageId(messageIdInput);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  const request = createTelegramRetryRunner({
    retry: opts.retry,
    configRetry: account.config.retry,
    verbose: opts.verbose,
    shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" }),
  });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    withTelegramApiErrorLogging({
      operation: label ?? "request",
      fn: () => request(fn, label),
    }).catch((err) => {
      logHttpError(label ?? "request", err);
      throw err;
    });
  const remove = opts.remove === true;
  const trimmedEmoji = emoji.trim();
  // Build the reaction array. We cast emoji to the grammY union type since
  // Telegram validates emoji server-side; invalid emojis fail gracefully.
  const reactions: ReactionType[] =
    remove || !trimmedEmoji
      ? []
      : [{ type: "emoji", emoji: trimmedEmoji as ReactionTypeEmoji["emoji"] }];
  if (typeof api.setMessageReaction !== "function") {
    throw new Error("Telegram reactions are unavailable in this bot API.");
  }
  await requestWithDiag(() => api.setMessageReaction(chatId, messageId, reactions), "reaction");
  return { ok: true };
}

/**
 * Telegram 消息删除选项
 */
type TelegramDeleteOpts = {
  /** Bot 令牌 */
  token?: string;
  /** 账户 ID */
  accountId?: string;
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** Bot API 实例 */
  api?: Bot["api"];
  /** 重试配置 */
  retry?: RetryConfig;
};

/**
 * 删除 Telegram 消息
 *
 * @param chatIdInput - 聊天 ID
 * @param messageIdInput - 要删除的消息 ID
 * @param opts - 删除选项
 * @returns 操作成功标志
 */
export async function deleteMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  opts: TelegramDeleteOpts = {},
): Promise<{ ok: true }> {
  const cfg = loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const token = resolveToken(opts.token, account);
  const chatId = normalizeChatId(String(chatIdInput));
  const messageId = normalizeMessageId(messageIdInput);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  const request = createTelegramRetryRunner({
    retry: opts.retry,
    configRetry: account.config.retry,
    verbose: opts.verbose,
    shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" }),
  });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    withTelegramApiErrorLogging({
      operation: label ?? "request",
      fn: () => request(fn, label),
    }).catch((err) => {
      logHttpError(label ?? "request", err);
      throw err;
    });
  await requestWithDiag(() => api.deleteMessage(chatId, messageId), "deleteMessage");
  logVerbose(`[telegram] Deleted message ${messageId} from chat ${chatId}`);
  return { ok: true };
}

/**
 * Telegram 消息编辑选项
 */
type TelegramEditOpts = {
  /** Bot 令牌 */
  token?: string;
  /** 账户 ID */
  accountId?: string;
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** Bot API 实例 */
  api?: Bot["api"];
  /** 重试配置 */
  retry?: RetryConfig;
  /** 文本格式模式 */
  textMode?: "markdown" | "html";
  /** 内联键盘按钮（传空数组可移除按钮） */
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
  /** 可选的配置注入，避免调用全局 loadConfig()（提高可测试性） */
  cfg?: ReturnType<typeof loadConfig>;
};

/**
 * 编辑 Telegram 消息
 *
 * 支持编辑消息文本和内联键盘按钮。
 * 当 HTML 解析失败时自动回退到纯文本。
 *
 * @param chatIdInput - 聊天 ID
 * @param messageIdInput - 要编辑的消息 ID
 * @param text - 新的消息文本
 * @param opts - 编辑选项
 * @returns 包含操作结果、messageId 和 chatId 的对象
 */
export async function editMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  text: string,
  opts: TelegramEditOpts = {},
): Promise<{ ok: true; messageId: string; chatId: string }> {
  const cfg = opts.cfg ?? loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const token = resolveToken(opts.token, account);
  const chatId = normalizeChatId(String(chatIdInput));
  const messageId = normalizeMessageId(messageIdInput);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  const request = createTelegramRetryRunner({
    retry: opts.retry,
    configRetry: account.config.retry,
    verbose: opts.verbose,
  });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    withTelegramApiErrorLogging({
      operation: label ?? "request",
      fn: () => request(fn, label),
    }).catch((err) => {
      logHttpError(label ?? "request", err);
      throw err;
    });

  const textMode = opts.textMode ?? "markdown";
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
  });
  const htmlText = renderTelegramHtmlText(text, { textMode, tableMode });

  // Reply markup semantics:
  // - buttons === undefined → don't send reply_markup (keep existing)
  // - buttons is [] (or filters to empty) → send { inline_keyboard: [] } (remove)
  // - otherwise → send built inline keyboard
  const shouldTouchButtons = opts.buttons !== undefined;
  const builtKeyboard = shouldTouchButtons ? buildInlineKeyboard(opts.buttons) : undefined;
  const replyMarkup = shouldTouchButtons ? (builtKeyboard ?? { inline_keyboard: [] }) : undefined;

  const editParams: Record<string, unknown> = {
    parse_mode: "HTML",
  };
  if (replyMarkup !== undefined) {
    editParams.reply_markup = replyMarkup;
  }

  await requestWithDiag(
    () => api.editMessageText(chatId, messageId, htmlText, editParams),
    "editMessage",
  ).catch(async (err) => {
    // Telegram rejects malformed HTML. Fall back to plain text.
    const errText = formatErrorMessage(err);
    if (PARSE_ERR_RE.test(errText)) {
      if (opts.verbose) {
        console.warn(`telegram HTML parse failed, retrying as plain text: ${errText}`);
      }
      const plainParams: Record<string, unknown> = {};
      if (replyMarkup !== undefined) {
        plainParams.reply_markup = replyMarkup;
      }
      return await requestWithDiag(
        () =>
          Object.keys(plainParams).length > 0
            ? api.editMessageText(chatId, messageId, text, plainParams)
            : api.editMessageText(chatId, messageId, text),
        "editMessage-plain",
      );
    }
    throw err;
  });

  logVerbose(`[telegram] Edited message ${messageId} in chat ${chatId}`);
  return { ok: true, messageId: String(messageId), chatId };
}

/**
 * 根据媒体类型推断默认文件名
 *
 * @param kind - 媒体类型（image、video、audio 或其他）
 * @returns 默认文件名
 */
function inferFilename(kind: ReturnType<typeof mediaKindFromMime>) {
  switch (kind) {
    case "image":
      return "image.jpg";
    case "video":
      return "video.mp4";
    case "audio":
      return "audio.ogg";
    default:
      return "file.bin";
  }
}

/**
 * Telegram 贴纸发送选项
 */
type TelegramStickerOpts = {
  /** Bot 令牌 */
  token?: string;
  /** 账户 ID */
  accountId?: string;
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** Bot API 实例 */
  api?: Bot["api"];
  /** 重试配置 */
  retry?: RetryConfig;
  /** 要回复的消息 ID（用于消息线程） */
  replyToMessageId?: number;
  /** 论坛话题线程 ID（用于论坛超级群组） */
  messageThreadId?: number;
};

/**
 * 发送 Telegram 贴纸
 *
 * 通过 file_id 发送贴纸到指定聊天。
 * 支持论坛话题和消息回复线程。
 *
 * @param to - 目标聊天 ID 或用户名（如 "123456789" 或 "@username"）
 * @param fileId - 贴纸的 Telegram file_id
 * @param opts - 发送选项
 * @returns 包含 messageId 和 chatId 的发送结果
 * @throws 当 file_id 为空时抛出错误
 */
export async function sendStickerTelegram(
  to: string,
  fileId: string,
  opts: TelegramStickerOpts = {},
): Promise<TelegramSendResult> {
  if (!fileId?.trim()) {
    throw new Error("Telegram sticker file_id is required");
  }

  const cfg = loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const token = resolveToken(opts.token, account);
  const target = parseTelegramTarget(to);
  const chatId = normalizeChatId(target.chatId);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;

  const messageThreadId =
    opts.messageThreadId != null ? opts.messageThreadId : target.messageThreadId;
  const threadIdParams = buildTelegramThreadParams(messageThreadId);
  const threadParams: Record<string, number> = threadIdParams ? { ...threadIdParams } : {};
  if (opts.replyToMessageId != null) {
    threadParams.reply_to_message_id = Math.trunc(opts.replyToMessageId);
  }
  const hasThreadParams = Object.keys(threadParams).length > 0;

  const request = createTelegramRetryRunner({
    retry: opts.retry,
    configRetry: account.config.retry,
    verbose: opts.verbose,
  });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    request(fn, label).catch((err) => {
      logHttpError(label ?? "request", err);
      throw err;
    });

  const wrapChatNotFound = (err: unknown) => {
    if (!/400: Bad Request: chat not found/i.test(formatErrorMessage(err))) return err;
    return new Error(
      [
        `Telegram send failed: chat not found (chat_id=${chatId}).`,
        "Likely: bot not started in DM, bot removed from group/channel, group migrated (new -100… id), or wrong bot token.",
        `Input was: ${JSON.stringify(to)}.`,
      ].join(" "),
    );
  };

  const stickerParams = hasThreadParams ? threadParams : undefined;

  const result = await requestWithDiag(
    () => api.sendSticker(chatId, fileId.trim(), stickerParams),
    "sticker",
  ).catch((err) => {
    throw wrapChatNotFound(err);
  });

  const messageId = String(result?.message_id ?? "unknown");
  const resolvedChatId = String(result?.chat?.id ?? chatId);
  if (result?.message_id) {
    recordSentMessage(chatId, result.message_id);
  }
  recordChannelActivity({
    channel: "telegram",
    accountId: account.accountId,
    direction: "outbound",
  });

  return { messageId, chatId: resolvedChatId };
}
