/**
 * 消息模板和上下文模块
 * 定义消息上下文类型和模板处理功能
 */
import type { ChannelId } from "../channels/plugins/types.js";
import type { StickerMetadata } from "../telegram/bot/types.js";
import type { InternalMessageChannel } from "../utils/message-channel.js";
import type { CommandArgs } from "./commands-registry.types.js";
import type {
  MediaUnderstandingDecision,
  MediaUnderstandingOutput,
} from "../media-understanding/types.js";

/** 有效的消息渠道类型（用于路由） */
export type OriginatingChannelType = ChannelId | InternalMessageChannel;

/** 消息上下文类型 */
export type MsgContext = {
  /** 消息正文 */
  Body?: string;
  /**
   * Agent 提示正文（可能包含信封/历史/上下文）。优先用于提示塑形。
   * 应使用真实换行符（`\n`），而非转义的 `\\n`。
   */
  BodyForAgent?: string;
  /**
   * 不含结构上下文（历史、发送者标签）的原始消息正文。
   * CommandBody 的旧版别名。如未设置则回退到 Body。
   */
  RawBody?: string;
  /**
   * 优先用于命令检测；RawBody 被视为旧版别名。
   */
  CommandBody?: string;
  /**
   * 命令解析正文。设置时优先于 CommandBody/RawBody。
   * 应为"干净"文本（无历史/发送者上下文）。
   */
  BodyForCommands?: string;
  /** 命令参数 */
  CommandArgs?: CommandArgs;
  /** 发送者 */
  From?: string;
  /** 接收者 */
  To?: string;
  /** 会话键 */
  SessionKey?: string;
  /** 提供商账户 ID（多账户） */
  AccountId?: string;
  /** 父会话键 */
  ParentSessionKey?: string;
  /** 消息 SID */
  MessageSid?: string;
  /** 提供商特定的完整消息 ID（当 MessageSid 是缩短别名时） */
  MessageSidFull?: string;
  /** 消息 SID 列表 */
  MessageSids?: string[];
  /** 第一个消息 SID */
  MessageSidFirst?: string;
  /** 最后一个消息 SID */
  MessageSidLast?: string;
  /** 回复目标 ID */
  ReplyToId?: string;
  /** 提供商特定的完整回复目标 ID（当 ReplyToId 是缩短别名时） */
  ReplyToIdFull?: string;
  /** 回复目标正文 */
  ReplyToBody?: string;
  /** 回复目标发送者 */
  ReplyToSender?: string;
  /** 回复是否为引用 */
  ReplyToIsQuote?: boolean;
  /** 转发来源 */
  ForwardedFrom?: string;
  /** 转发来源类型 */
  ForwardedFromType?: string;
  /** 转发来源 ID */
  ForwardedFromId?: string;
  /** 转发来源用户名 */
  ForwardedFromUsername?: string;
  /** 转发来源标题 */
  ForwardedFromTitle?: string;
  /** 转发来源签名 */
  ForwardedFromSignature?: string;
  /** 转发日期 */
  ForwardedDate?: number;
  /** 线程起始正文 */
  ThreadStarterBody?: string;
  /** 线程标签 */
  ThreadLabel?: string;
  /** 媒体路径 */
  MediaPath?: string;
  /** 媒体 URL */
  MediaUrl?: string;
  /** 媒体类型 */
  MediaType?: string;
  /** 媒体目录 */
  MediaDir?: string;
  /** 媒体路径列表 */
  MediaPaths?: string[];
  /** 媒体 URL 列表 */
  MediaUrls?: string[];
  /** 媒体类型列表 */
  MediaTypes?: string[];
  /** Telegram 贴纸元数据（表情、集合名、文件 ID、缓存描述） */
  Sticker?: StickerMetadata;
  /** 输出目录 */
  OutputDir?: string;
  /** 输出基础名 */
  OutputBase?: string;
  /** 媒体位于不同机器时的远程主机（用于 SCP，如 moltbot@192.168.64.3） */
  MediaRemoteHost?: string;
  /** 转录文本 */
  Transcript?: string;
  /** 媒体理解输出 */
  MediaUnderstanding?: MediaUnderstandingOutput[];
  /** 媒体理解决策 */
  MediaUnderstandingDecisions?: MediaUnderstandingDecision[];
  /** 链接理解 */
  LinkUnderstanding?: string[];
  /** 提示 */
  Prompt?: string;
  /** 最大字符数 */
  MaxChars?: number;
  ChatType?: string;
  /** Human label for envelope headers (conversation label, not sender). */
  ConversationLabel?: string;
  GroupSubject?: string;
  /** Human label for channel-like group conversations (e.g. #general, #support). */
  GroupChannel?: string;
  GroupSpace?: string;
  GroupMembers?: string;
  GroupSystemPrompt?: string;
  SenderName?: string;
  SenderId?: string;
  SenderUsername?: string;
  SenderTag?: string;
  SenderE164?: string;
  Timestamp?: number;
  /** Provider label (e.g. whatsapp, telegram). */
  Provider?: string;
  /** Provider surface label (e.g. discord, slack). Prefer this over `Provider` when available. */
  Surface?: string;
  WasMentioned?: boolean;
  CommandAuthorized?: boolean;
  CommandSource?: "text" | "native";
  CommandTargetSessionKey?: string;
  /** Thread identifier (Telegram topic id or Matrix thread event id). */
  MessageThreadId?: string | number;
  /** Telegram forum supergroup marker. */
  IsForum?: boolean;
  /**
   * Originating channel for reply routing.
   * When set, replies should be routed back to this provider
   * instead of using lastChannel from the session.
   */
  OriginatingChannel?: OriginatingChannelType;
  /**
   * Originating destination for reply routing.
   * The chat/channel/user ID where the reply should be sent.
   */
  OriginatingTo?: string;
  /**
   * Messages from hooks to be included in the response.
   * Used for hook confirmation messages like "Session context saved to memory".
   */
  HookMessages?: string[];
};

export type FinalizedMsgContext = Omit<MsgContext, "CommandAuthorized"> & {
  /**
   * Always set by finalizeInboundContext().
   * Default-deny: missing/undefined becomes false.
   */
  CommandAuthorized: boolean;
};

export type TemplateContext = MsgContext & {
  BodyStripped?: string;
  SessionId?: string;
  IsNewSession?: string;
};

function formatTemplateValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "symbol" || typeof value === "function") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (entry == null) return [];
        if (typeof entry === "string") return [entry];
        if (typeof entry === "number" || typeof entry === "boolean" || typeof entry === "bigint") {
          return [String(entry)];
        }
        return [];
      })
      .join(",");
  }
  if (typeof value === "object") {
    return "";
  }
  return "";
}

// Simple {{Placeholder}} interpolation using inbound message context.
export function applyTemplate(str: string | undefined, ctx: TemplateContext) {
  if (!str) return "";
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = ctx[key as keyof TemplateContext];
    return formatTemplateValue(value);
  });
}
