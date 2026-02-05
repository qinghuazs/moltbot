/**
 * Telegram Bot 核心模块
 *
 * 本模块提供 Telegram Bot 的核心功能实现，包括：
 * - Bot 实例创建和配置
 * - 消息处理中间件
 * - 更新去重和序列化
 * - 原生命令注册
 * - 表情回应处理
 * - 群组和论坛话题支持
 * - 会话管理和路由
 *
 * 基于 grammY 框架构建，支持轮询和 Webhook 两种模式。
 *
 * @module telegram/bot
 */

// @ts-nocheck
import { sequentialize } from "@grammyjs/runner";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import type { ApiClientOptions } from "grammy";
import { Bot, webhookCallback } from "grammy";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { isControlCommandMessage } from "../auto-reply/command-detection.js";
import { resolveTextChunkLimit } from "../auto-reply/chunk.js";
import { DEFAULT_GROUP_HISTORY_LIMIT, type HistoryEntry } from "../auto-reply/reply/history.js";
import {
  isNativeCommandsExplicitlyDisabled,
  resolveNativeCommandsEnabled,
  resolveNativeSkillsEnabled,
} from "../config/commands.js";
import type { MoltbotConfig, ReplyToMode } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import {
  resolveChannelGroupPolicy,
  resolveChannelGroupRequireMention,
} from "../config/group-policy.js";
import { loadSessionStore, resolveStorePath } from "../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../globals.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { formatUncaughtError } from "../infra/errors.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { getChildLogger } from "../logging.js";
import { withTelegramApiErrorLogging } from "./api-logging.js";
import { resolveAgentRoute } from "../routing/resolve-route.js";
import { resolveThreadSessionKeys } from "../routing/session-key.js";
import type { RuntimeEnv } from "../runtime.js";
import { resolveTelegramAccount } from "./accounts.js";
import {
  buildTelegramGroupPeerId,
  resolveTelegramForumThreadId,
  resolveTelegramStreamMode,
} from "./bot/helpers.js";
import type { TelegramContext, TelegramMessage } from "./bot/types.js";
import { registerTelegramHandlers } from "./bot-handlers.js";
import { createTelegramMessageProcessor } from "./bot-message.js";
import { registerTelegramNativeCommands } from "./bot-native-commands.js";
import {
  buildTelegramUpdateKey,
  createTelegramUpdateDedupe,
  resolveTelegramUpdateId,
  type TelegramUpdateKeyContext,
} from "./bot-updates.js";
import { resolveTelegramFetch } from "./fetch.js";
import { wasSentByBot } from "./sent-message-cache.js";

/**
 * Telegram Bot 创建选项
 */
export type TelegramBotOptions = {
  /** Bot 令牌（必需） */
  token: string;
  /** 账户 ID（用于多账户场景） */
  accountId?: string;
  /** 运行时环境 */
  runtime?: RuntimeEnv;
  /** 是否要求 @提及才响应（群组中） */
  requireMention?: boolean;
  /** 私聊允许列表（用户 ID 或用户名） */
  allowFrom?: Array<string | number>;
  /** 群组允许列表（群组 ID 或用户名） */
  groupAllowFrom?: Array<string | number>;
  /** 媒体文件最大大小（MB） */
  mediaMaxMb?: number;
  /** 回复模式 */
  replyToMode?: ReplyToMode;
  /** 自定义 fetch 实现（用于代理） */
  proxyFetch?: typeof fetch;
  /** Moltbot 配置对象 */
  config?: MoltbotConfig;
  /** 更新偏移量配置（用于轮询模式） */
  updateOffset?: {
    /** 上次处理的更新 ID */
    lastUpdateId?: number | null;
    /** 更新 ID 回调函数 */
    onUpdateId?: (updateId: number) => void | Promise<void>;
  };
};

/**
 * 获取 Telegram 更新的序列化键
 *
 * 用于确保同一聊天/话题的消息按顺序处理，避免并发问题。
 * 控制命令使用单独的序列化键以获得更高优先级。
 *
 * @param ctx - Telegram 上下文对象
 * @returns 序列化键字符串
 */
export function getTelegramSequentialKey(ctx: {
  chat?: { id?: number };
  message?: TelegramMessage;
  update?: {
    message?: TelegramMessage;
    edited_message?: TelegramMessage;
    callback_query?: { message?: TelegramMessage };
    message_reaction?: { chat?: { id?: number } };
  };
}): string {
  // Handle reaction updates
  const reaction = ctx.update?.message_reaction;
  if (reaction?.chat?.id) {
    return `telegram:${reaction.chat.id}`;
  }
  const msg =
    ctx.message ??
    ctx.update?.message ??
    ctx.update?.edited_message ??
    ctx.update?.callback_query?.message;
  const chatId = msg?.chat?.id ?? ctx.chat?.id;
  const rawText = msg?.text ?? msg?.caption;
  const botUsername = (ctx as { me?: { username?: string } }).me?.username;
  if (
    rawText &&
    isControlCommandMessage(rawText, undefined, botUsername ? { botUsername } : undefined)
  ) {
    if (typeof chatId === "number") return `telegram:${chatId}:control`;
    return "telegram:control";
  }
  const isGroup = msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
  const messageThreadId = msg?.message_thread_id;
  const isForum = (msg?.chat as { is_forum?: boolean } | undefined)?.is_forum;
  const threadId = isGroup
    ? resolveTelegramForumThreadId({ isForum, messageThreadId })
    : messageThreadId;
  if (typeof chatId === "number") {
    return threadId != null ? `telegram:${chatId}:topic:${threadId}` : `telegram:${chatId}`;
  }
  return "telegram:unknown";
}

/**
 * 创建 Telegram Bot 实例
 *
 * 初始化并配置 Telegram Bot，包括：
 * - API 客户端配置（代理、超时等）
 * - 中间件链（节流、序列化、错误处理）
 * - 更新去重机制
 * - 原生命令注册
 * - 消息处理器
 * - 表情回应处理
 *
 * @param opts - Bot 创建选项
 * @returns 配置完成的 grammY Bot 实例
 */
export function createTelegramBot(opts: TelegramBotOptions) {
  const runtime: RuntimeEnv = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code: number): never => {
      throw new Error(`exit ${code}`);
    },
  };
  const cfg = opts.config ?? loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const telegramCfg = account.config;

  const fetchImpl = resolveTelegramFetch(opts.proxyFetch, {
    network: telegramCfg.network,
  });
  const shouldProvideFetch = Boolean(fetchImpl);
  const timeoutSeconds =
    typeof telegramCfg?.timeoutSeconds === "number" && Number.isFinite(telegramCfg.timeoutSeconds)
      ? Math.max(1, Math.floor(telegramCfg.timeoutSeconds))
      : undefined;
  const client: ApiClientOptions | undefined =
    shouldProvideFetch || timeoutSeconds
      ? {
          ...(shouldProvideFetch && fetchImpl
            ? { fetch: fetchImpl as unknown as ApiClientOptions["fetch"] }
            : {}),
          ...(timeoutSeconds ? { timeoutSeconds } : {}),
        }
      : undefined;

  const bot = new Bot(opts.token, client ? { client } : undefined);
  bot.api.config.use(apiThrottler());
  bot.use(sequentialize(getTelegramSequentialKey));
  bot.catch((err) => {
    runtime.error?.(danger(`telegram bot error: ${formatUncaughtError(err)}`));
  });

  // Catch all errors from bot middleware to prevent unhandled rejections
  bot.catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    runtime.error?.(danger(`telegram bot error: ${message}`));
  });

  const recentUpdates = createTelegramUpdateDedupe();
  let lastUpdateId =
    typeof opts.updateOffset?.lastUpdateId === "number" ? opts.updateOffset.lastUpdateId : null;

  const recordUpdateId = (ctx: TelegramUpdateKeyContext) => {
    const updateId = resolveTelegramUpdateId(ctx);
    if (typeof updateId !== "number") return;
    if (lastUpdateId !== null && updateId <= lastUpdateId) return;
    lastUpdateId = updateId;
    void opts.updateOffset?.onUpdateId?.(updateId);
  };

  const shouldSkipUpdate = (ctx: TelegramUpdateKeyContext) => {
    const updateId = resolveTelegramUpdateId(ctx);
    if (typeof updateId === "number" && lastUpdateId !== null) {
      if (updateId <= lastUpdateId) return true;
    }
    const key = buildTelegramUpdateKey(ctx);
    const skipped = recentUpdates.check(key);
    if (skipped && key && shouldLogVerbose()) {
      logVerbose(`telegram dedupe: skipped ${key}`);
    }
    return skipped;
  };

  const rawUpdateLogger = createSubsystemLogger("gateway/channels/telegram/raw-update");
  const MAX_RAW_UPDATE_CHARS = 8000;
  const MAX_RAW_UPDATE_STRING = 500;
  const MAX_RAW_UPDATE_ARRAY = 20;
  const stringifyUpdate = (update: unknown) => {
    const seen = new WeakSet<object>();
    return JSON.stringify(update ?? null, (key, value) => {
      if (typeof value === "string" && value.length > MAX_RAW_UPDATE_STRING) {
        return `${value.slice(0, MAX_RAW_UPDATE_STRING)}...`;
      }
      if (Array.isArray(value) && value.length > MAX_RAW_UPDATE_ARRAY) {
        return [
          ...value.slice(0, MAX_RAW_UPDATE_ARRAY),
          `...(${value.length - MAX_RAW_UPDATE_ARRAY} more)`,
        ];
      }
      if (value && typeof value === "object") {
        const obj = value as object;
        if (seen.has(obj)) return "[Circular]";
        seen.add(obj);
      }
      return value;
    });
  };

  bot.use(async (ctx, next) => {
    if (shouldLogVerbose()) {
      try {
        const raw = stringifyUpdate(ctx.update);
        const preview =
          raw.length > MAX_RAW_UPDATE_CHARS ? `${raw.slice(0, MAX_RAW_UPDATE_CHARS)}...` : raw;
        rawUpdateLogger.debug(`telegram update: ${preview}`);
      } catch (err) {
        rawUpdateLogger.debug(`telegram update log failed: ${String(err)}`);
      }
    }
    await next();
    recordUpdateId(ctx);
  });

  const historyLimit = Math.max(
    0,
    telegramCfg.historyLimit ??
      cfg.messages?.groupChat?.historyLimit ??
      DEFAULT_GROUP_HISTORY_LIMIT,
  );
  const groupHistories = new Map<string, HistoryEntry[]>();
  const textLimit = resolveTextChunkLimit(cfg, "telegram", account.accountId);
  const dmPolicy = telegramCfg.dmPolicy ?? "pairing";
  const allowFrom = opts.allowFrom ?? telegramCfg.allowFrom;
  const groupAllowFrom =
    opts.groupAllowFrom ??
    telegramCfg.groupAllowFrom ??
    (telegramCfg.allowFrom && telegramCfg.allowFrom.length > 0
      ? telegramCfg.allowFrom
      : undefined) ??
    (opts.allowFrom && opts.allowFrom.length > 0 ? opts.allowFrom : undefined);
  const replyToMode = opts.replyToMode ?? telegramCfg.replyToMode ?? "first";
  const streamMode = resolveTelegramStreamMode(telegramCfg);
  const nativeEnabled = resolveNativeCommandsEnabled({
    providerId: "telegram",
    providerSetting: telegramCfg.commands?.native,
    globalSetting: cfg.commands?.native,
  });
  const nativeSkillsEnabled = resolveNativeSkillsEnabled({
    providerId: "telegram",
    providerSetting: telegramCfg.commands?.nativeSkills,
    globalSetting: cfg.commands?.nativeSkills,
  });
  const nativeDisabledExplicit = isNativeCommandsExplicitlyDisabled({
    providerSetting: telegramCfg.commands?.native,
    globalSetting: cfg.commands?.native,
  });
  const useAccessGroups = cfg.commands?.useAccessGroups !== false;
  const ackReactionScope = cfg.messages?.ackReactionScope ?? "group-mentions";
  const mediaMaxBytes = (opts.mediaMaxMb ?? telegramCfg.mediaMaxMb ?? 5) * 1024 * 1024;
  const logger = getChildLogger({ module: "telegram-auto-reply" });
  let botHasTopicsEnabled: boolean | undefined;
  const resolveBotTopicsEnabled = async (ctx?: TelegramContext) => {
    const fromCtx = ctx?.me as { has_topics_enabled?: boolean } | undefined;
    if (typeof fromCtx?.has_topics_enabled === "boolean") {
      botHasTopicsEnabled = fromCtx.has_topics_enabled;
      return botHasTopicsEnabled;
    }
    if (typeof botHasTopicsEnabled === "boolean") return botHasTopicsEnabled;
    try {
      const me = (await withTelegramApiErrorLogging({
        operation: "getMe",
        runtime,
        fn: () => bot.api.getMe(),
      })) as { has_topics_enabled?: boolean };
      botHasTopicsEnabled = Boolean(me?.has_topics_enabled);
    } catch (err) {
      logVerbose(`telegram getMe failed: ${String(err)}`);
      botHasTopicsEnabled = false;
    }
    return botHasTopicsEnabled;
  };
  const resolveGroupPolicy = (chatId: string | number) =>
    resolveChannelGroupPolicy({
      cfg,
      channel: "telegram",
      accountId: account.accountId,
      groupId: String(chatId),
    });
  const resolveGroupActivation = (params: {
    chatId: string | number;
    agentId?: string;
    messageThreadId?: number;
    sessionKey?: string;
  }) => {
    const agentId = params.agentId ?? resolveDefaultAgentId(cfg);
    const sessionKey =
      params.sessionKey ??
      `agent:${agentId}:telegram:group:${buildTelegramGroupPeerId(params.chatId, params.messageThreadId)}`;
    const storePath = resolveStorePath(cfg.session?.store, { agentId });
    try {
      const store = loadSessionStore(storePath);
      const entry = store[sessionKey];
      if (entry?.groupActivation === "always") return false;
      if (entry?.groupActivation === "mention") return true;
    } catch (err) {
      logVerbose(`Failed to load session for activation check: ${String(err)}`);
    }
    return undefined;
  };
  const resolveGroupRequireMention = (chatId: string | number) =>
    resolveChannelGroupRequireMention({
      cfg,
      channel: "telegram",
      accountId: account.accountId,
      groupId: String(chatId),
      requireMentionOverride: opts.requireMention,
      overrideOrder: "after-config",
    });
  const resolveTelegramGroupConfig = (chatId: string | number, messageThreadId?: number) => {
    const groups = telegramCfg.groups;
    if (!groups) return { groupConfig: undefined, topicConfig: undefined };
    const groupKey = String(chatId);
    const groupConfig = groups[groupKey] ?? groups["*"];
    const topicConfig =
      messageThreadId != null ? groupConfig?.topics?.[String(messageThreadId)] : undefined;
    return { groupConfig, topicConfig };
  };

  const processMessage = createTelegramMessageProcessor({
    bot,
    cfg,
    account,
    telegramCfg,
    historyLimit,
    groupHistories,
    dmPolicy,
    allowFrom,
    groupAllowFrom,
    ackReactionScope,
    logger,
    resolveGroupActivation,
    resolveGroupRequireMention,
    resolveTelegramGroupConfig,
    runtime,
    replyToMode,
    streamMode,
    textLimit,
    opts,
    resolveBotTopicsEnabled,
  });

  registerTelegramNativeCommands({
    bot,
    cfg,
    runtime,
    accountId: account.accountId,
    telegramCfg,
    allowFrom,
    groupAllowFrom,
    replyToMode,
    textLimit,
    useAccessGroups,
    nativeEnabled,
    nativeSkillsEnabled,
    nativeDisabledExplicit,
    resolveGroupPolicy,
    resolveTelegramGroupConfig,
    shouldSkipUpdate,
    opts,
  });

  // Handle emoji reactions to messages
  bot.on("message_reaction", async (ctx) => {
    try {
      const reaction = ctx.messageReaction;
      if (!reaction) return;
      if (shouldSkipUpdate(ctx)) return;

      const chatId = reaction.chat.id;
      const messageId = reaction.message_id;
      const user = reaction.user;

      // Resolve reaction notification mode (default: "own")
      const reactionMode = telegramCfg.reactionNotifications ?? "own";
      if (reactionMode === "off") return;
      if (user?.is_bot) return;
      if (reactionMode === "own" && !wasSentByBot(chatId, messageId)) return;

      // Detect added reactions
      const oldEmojis = new Set(
        reaction.old_reaction
          .filter((r): r is { type: "emoji"; emoji: string } => r.type === "emoji")
          .map((r) => r.emoji),
      );
      const addedReactions = reaction.new_reaction
        .filter((r): r is { type: "emoji"; emoji: string } => r.type === "emoji")
        .filter((r) => !oldEmojis.has(r.emoji));

      if (addedReactions.length === 0) return;

      // Build sender label
      const senderName = user
        ? [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username
        : undefined;
      const senderUsername = user?.username ? `@${user.username}` : undefined;
      let senderLabel = senderName;
      if (senderName && senderUsername) {
        senderLabel = `${senderName} (${senderUsername})`;
      } else if (!senderName && senderUsername) {
        senderLabel = senderUsername;
      }
      if (!senderLabel && user?.id) {
        senderLabel = `id:${user.id}`;
      }
      senderLabel = senderLabel || "unknown";

      // Extract forum thread info (similar to message processing)
      const messageThreadId = (reaction as any).message_thread_id;
      const isForum = (reaction.chat as any).is_forum === true;
      const resolvedThreadId = resolveTelegramForumThreadId({
        isForum,
        messageThreadId,
      });

      // Resolve agent route for session
      const isGroup = reaction.chat.type === "group" || reaction.chat.type === "supergroup";
      const peerId = isGroup ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : String(chatId);
      const route = resolveAgentRoute({
        cfg,
        channel: "telegram",
        accountId: account.accountId,
        peer: { kind: isGroup ? "group" : "dm", id: peerId },
      });
      const baseSessionKey = route.sessionKey;
      // DMs: use raw messageThreadId for thread sessions (not resolvedThreadId which is for forums)
      const dmThreadId = !isGroup ? messageThreadId : undefined;
      const threadKeys =
        dmThreadId != null
          ? resolveThreadSessionKeys({ baseSessionKey, threadId: String(dmThreadId) })
          : null;
      const sessionKey = threadKeys?.sessionKey ?? baseSessionKey;

      // Enqueue system event for each added reaction
      for (const r of addedReactions) {
        const emoji = r.emoji;
        const text = `Telegram reaction added: ${emoji} by ${senderLabel} on msg ${messageId}`;
        enqueueSystemEvent(text, {
          sessionKey: sessionKey,
          contextKey: `telegram:reaction:add:${chatId}:${messageId}:${user?.id ?? "anon"}:${emoji}`,
        });
        logVerbose(`telegram: reaction event enqueued: ${text}`);
      }
    } catch (err) {
      runtime.error?.(danger(`telegram reaction handler failed: ${String(err)}`));
    }
  });

  registerTelegramHandlers({
    cfg,
    accountId: account.accountId,
    bot,
    opts,
    runtime,
    mediaMaxBytes,
    telegramCfg,
    groupAllowFrom,
    resolveGroupPolicy,
    resolveTelegramGroupConfig,
    shouldSkipUpdate,
    processMessage,
    logger,
  });

  return bot;
}

/**
 * 创建 Telegram Webhook 回调处理器
 *
 * 用于将 grammY Bot 实例包装为 HTTP 请求处理器，
 * 适用于 Express、Fastify 等 Web 框架集成。
 *
 * @param bot - grammY Bot 实例
 * @param path - Webhook 路径，默认 "/telegram-webhook"
 * @returns 包含 path 和 handler 的对象
 */
export function createTelegramWebhookCallback(bot: Bot, path = "/telegram-webhook") {
  return { path, handler: webhookCallback(bot, "http") };
}
