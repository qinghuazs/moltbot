/**
 * Signal 消息发送模块
 *
 * 本模块提供通过 Signal 发送消息的核心功能，
 * 支持文本消息、媒体附件、输入状态和已读回执。
 *
 * @module signal/send
 */

import { loadConfig } from "../config/config.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { mediaKindFromMime } from "../media/constants.js";
import { saveMediaBuffer } from "../media/store.js";
import { loadWebMedia } from "../web/media.js";
import { resolveSignalAccount } from "./accounts.js";
import { signalRpcRequest } from "./client.js";
import { markdownToSignalText, type SignalTextStyleRange } from "./format.js";

/**
 * Signal 消息发送配置选项
 */
export type SignalSendOpts = {
  /** signal-cli 守护进程的基础 URL */
  baseUrl?: string;
  /** Signal 账户标识（电话号码） */
  account?: string;
  /** 账户配置 ID */
  accountId?: string;
  /** 媒体附件 URL */
  mediaUrl?: string;
  /** 媒体文件最大字节数 */
  maxBytes?: number;
  /** 请求超时时间（毫秒） */
  timeoutMs?: number;
  /** 文本模式：markdown 或纯文本 */
  textMode?: "markdown" | "plain";
  /** 文本样式范围列表 */
  textStyles?: SignalTextStyleRange[];
};

/**
 * Signal 消息发送结果
 */
export type SignalSendResult = {
  /** 消息 ID（通常为时间戳字符串） */
  messageId: string;
  /** 消息时间戳 */
  timestamp?: number;
};

/**
 * Signal RPC 请求的基础配置选项
 */
export type SignalRpcOpts = Pick<SignalSendOpts, "baseUrl" | "account" | "accountId" | "timeoutMs">;

/**
 * Signal 回执类型
 */
export type SignalReceiptType = "read" | "viewed";

/**
 * Signal 消息目标类型
 * 支持三种目标：电话号码、群组 ID 或用户名
 */
type SignalTarget =
  | { type: "recipient"; recipient: string }
  | { type: "group"; groupId: string }
  | { type: "username"; username: string };

/**
 * 解析消息目标字符串
 *
 * 支持以下格式：
 * - 电话号码：+1234567890
 * - 群组：group:GROUP_ID
 * - 用户名：username:USERNAME 或 u:USERNAME
 * - 带前缀：signal:+1234567890
 *
 * @param raw - 原始目标字符串
 * @returns 解析后的目标对象
 * @throws 当目标为空时抛出错误
 */
function parseTarget(raw: string): SignalTarget {
  let value = raw.trim();
  if (!value) throw new Error("Signal recipient is required");
  const lower = value.toLowerCase();
  if (lower.startsWith("signal:")) {
    value = value.slice("signal:".length).trim();
  }
  const normalized = value.toLowerCase();
  if (normalized.startsWith("group:")) {
    return { type: "group", groupId: value.slice("group:".length).trim() };
  }
  if (normalized.startsWith("username:")) {
    return {
      type: "username",
      username: value.slice("username:".length).trim(),
    };
  }
  if (normalized.startsWith("u:")) {
    return { type: "username", username: value.trim() };
  }
  return { type: "recipient", recipient: value };
}

/**
 * Signal 目标参数结构
 * 用于构建 RPC 请求参数
 */
type SignalTargetParams = {
  /** 接收者电话号码列表 */
  recipient?: string[];
  /** 群组 ID */
  groupId?: string;
  /** 用户名列表 */
  username?: string[];
};

/**
 * Signal 目标类型允许列表
 * 用于控制哪些目标类型可用
 */
type SignalTargetAllowlist = {
  /** 是否允许电话号码目标 */
  recipient?: boolean;
  /** 是否允许群组目标 */
  group?: boolean;
  /** 是否允许用户名目标 */
  username?: boolean;
};

/**
 * 构建目标参数
 *
 * 根据目标类型和允许列表构建 RPC 请求参数。
 *
 * @param target - 解析后的目标对象
 * @param allow - 允许的目标类型
 * @returns 目标参数对象，如果目标类型不允许则返回 null
 */
function buildTargetParams(
  target: SignalTarget,
  allow: SignalTargetAllowlist,
): SignalTargetParams | null {
  if (target.type === "recipient") {
    if (!allow.recipient) return null;
    return { recipient: [target.recipient] };
  }
  if (target.type === "group") {
    if (!allow.group) return null;
    return { groupId: target.groupId };
  }
  if (target.type === "username") {
    if (!allow.username) return null;
    return { username: [target.username] };
  }
  return null;
}

/**
 * 解析 Signal RPC 上下文
 *
 * 从配置和选项中解析出 baseUrl 和 account 信息。
 *
 * @param opts - RPC 配置选项
 * @param accountInfo - 可选的已解析账户信息
 * @returns 包含 baseUrl 和 account 的上下文对象
 * @throws 当无法确定 baseUrl 时抛出错误
 */
function resolveSignalRpcContext(
  opts: SignalRpcOpts,
  accountInfo?: ReturnType<typeof resolveSignalAccount>,
) {
  const hasBaseUrl = Boolean(opts.baseUrl?.trim());
  const hasAccount = Boolean(opts.account?.trim());
  const resolvedAccount =
    accountInfo ||
    (!hasBaseUrl || !hasAccount
      ? resolveSignalAccount({
          cfg: loadConfig(),
          accountId: opts.accountId,
        })
      : undefined);
  const baseUrl = opts.baseUrl?.trim() || resolvedAccount?.baseUrl;
  if (!baseUrl) {
    throw new Error("Signal base URL is required");
  }
  const account = opts.account?.trim() || resolvedAccount?.config.account?.trim();
  return { baseUrl, account };
}

/**
 * 解析媒体附件
 *
 * 从 URL 加载媒体文件并保存到本地，返回可用于 Signal 发送的路径。
 *
 * @param mediaUrl - 媒体文件 URL
 * @param maxBytes - 最大文件大小（字节）
 * @returns 包含本地路径和内容类型的对象
 */
async function resolveAttachment(
  mediaUrl: string,
  maxBytes: number,
): Promise<{ path: string; contentType?: string }> {
  const media = await loadWebMedia(mediaUrl, maxBytes);
  const saved = await saveMediaBuffer(
    media.buffer,
    media.contentType ?? undefined,
    "outbound",
    maxBytes,
  );
  return { path: saved.path, contentType: saved.contentType };
}

/**
 * 发送 Signal 消息
 *
 * 向指定目标发送文本消息，支持 Markdown 格式化和媒体附件。
 * 自动处理文本样式转换和附件上传。
 *
 * @param to - 消息目标（电话号码、群组 ID 或用户名）
 * @param text - 消息文本内容
 * @param opts - 发送配置选项
 * @returns 发送结果，包含消息 ID 和时间戳
 * @throws 当消息为空且无附件时抛出错误
 *
 * @example
 * ```typescript
 * const result = await sendMessageSignal(
 *   "+1234567890",
 *   "Hello, **world**!",
 *   { textMode: "markdown" }
 * );
 * console.log(`Message sent: ${result.messageId}`);
 * ```
 */
export async function sendMessageSignal(
  to: string,
  text: string,
  opts: SignalSendOpts = {},
): Promise<SignalSendResult> {
  const cfg = loadConfig();
  const accountInfo = resolveSignalAccount({
    cfg,
    accountId: opts.accountId,
  });
  const { baseUrl, account } = resolveSignalRpcContext(opts, accountInfo);
  const target = parseTarget(to);
  let message = text ?? "";
  let messageFromPlaceholder = false;
  let textStyles: SignalTextStyleRange[] = [];
  const textMode = opts.textMode ?? "markdown";
  const maxBytes = (() => {
    if (typeof opts.maxBytes === "number") return opts.maxBytes;
    if (typeof accountInfo.config.mediaMaxMb === "number") {
      return accountInfo.config.mediaMaxMb * 1024 * 1024;
    }
    if (typeof cfg.agents?.defaults?.mediaMaxMb === "number") {
      return cfg.agents.defaults.mediaMaxMb * 1024 * 1024;
    }
    return 8 * 1024 * 1024;
  })();

  let attachments: string[] | undefined;
  if (opts.mediaUrl?.trim()) {
    const resolved = await resolveAttachment(opts.mediaUrl.trim(), maxBytes);
    attachments = [resolved.path];
    const kind = mediaKindFromMime(resolved.contentType ?? undefined);
    if (!message && kind) {
      // Avoid sending an empty body when only attachments exist.
      message = kind === "image" ? "<media:image>" : `<media:${kind}>`;
      messageFromPlaceholder = true;
    }
  }

  if (message.trim() && !messageFromPlaceholder) {
    if (textMode === "plain") {
      textStyles = opts.textStyles ?? [];
    } else {
      const tableMode = resolveMarkdownTableMode({
        cfg,
        channel: "signal",
        accountId: accountInfo.accountId,
      });
      const formatted = markdownToSignalText(message, { tableMode });
      message = formatted.text;
      textStyles = formatted.styles;
    }
  }

  if (!message.trim() && (!attachments || attachments.length === 0)) {
    throw new Error("Signal send requires text or media");
  }

  const params: Record<string, unknown> = { message };
  if (textStyles.length > 0) {
    params["text-style"] = textStyles.map(
      (style) => `${style.start}:${style.length}:${style.style}`,
    );
  }
  if (account) params.account = account;
  if (attachments && attachments.length > 0) {
    params.attachments = attachments;
  }

  const targetParams = buildTargetParams(target, {
    recipient: true,
    group: true,
    username: true,
  });
  if (!targetParams) {
    throw new Error("Signal recipient is required");
  }
  Object.assign(params, targetParams);

  const result = await signalRpcRequest<{ timestamp?: number }>("send", params, {
    baseUrl,
    timeoutMs: opts.timeoutMs,
  });
  const timestamp = result?.timestamp;
  return {
    messageId: timestamp ? String(timestamp) : "unknown",
    timestamp,
  };
}

/**
 * 发送 Signal 输入状态指示
 *
 * 向指定目标发送"正在输入"状态，让对方知道你正在编写消息。
 *
 * @param to - 消息目标（电话号码或群组 ID）
 * @param opts - RPC 配置选项，可包含 stop 参数停止输入状态
 * @returns 是否成功发送
 */
export async function sendTypingSignal(
  to: string,
  opts: SignalRpcOpts & { stop?: boolean } = {},
): Promise<boolean> {
  const { baseUrl, account } = resolveSignalRpcContext(opts);
  const targetParams = buildTargetParams(parseTarget(to), {
    recipient: true,
    group: true,
  });
  if (!targetParams) return false;
  const params: Record<string, unknown> = { ...targetParams };
  if (account) params.account = account;
  if (opts.stop) params.stop = true;
  await signalRpcRequest("sendTyping", params, {
    baseUrl,
    timeoutMs: opts.timeoutMs,
  });
  return true;
}

/**
 * 发送 Signal 已读回执
 *
 * 向消息发送者发送已读或已查看回执，表明消息已被阅读。
 *
 * @param to - 原消息发送者（仅支持电话号码）
 * @param targetTimestamp - 目标消息的时间戳
 * @param opts - RPC 配置选项，可指定回执类型（read 或 viewed）
 * @returns 是否成功发送
 */
export async function sendReadReceiptSignal(
  to: string,
  targetTimestamp: number,
  opts: SignalRpcOpts & { type?: SignalReceiptType } = {},
): Promise<boolean> {
  if (!Number.isFinite(targetTimestamp) || targetTimestamp <= 0) return false;
  const { baseUrl, account } = resolveSignalRpcContext(opts);
  const targetParams = buildTargetParams(parseTarget(to), {
    recipient: true,
  });
  if (!targetParams) return false;
  const params: Record<string, unknown> = {
    ...targetParams,
    targetTimestamp,
    type: opts.type ?? "read",
  };
  if (account) params.account = account;
  await signalRpcRequest("sendReceipt", params, {
    baseUrl,
    timeoutMs: opts.timeoutMs,
  });
  return true;
}
