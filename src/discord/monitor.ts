/**
 * Discord 消息监听模块
 *
 * 该模块作为 Discord 消息监听功能的统一导出入口，聚合了以下子模块：
 * - 允许列表配置和权限检查
 * - 消息事件监听器注册
 * - 消息处理器创建
 * - 原生命令处理
 * - 消息线程管理
 *
 * @module discord/monitor
 */

// ============================================================================
// 允许列表和权限相关导出
// ============================================================================

export type {
  /** Discord 允许列表配置类型 */
  DiscordAllowList,
  /** Discord 频道配置解析结果类型 */
  DiscordChannelConfigResolved,
  /** Discord 服务器条目解析结果类型 */
  DiscordGuildEntryResolved,
} from "./monitor/allow-list.js";
export {
  /** 检查是否匹配允许列表 */
  allowListMatches,
  /** 检查群组是否被策略允许 */
  isDiscordGroupAllowedByPolicy,
  /** 标准化允许列表配置 */
  normalizeDiscordAllowList,
  /** 标准化 Discord 标识符 */
  normalizeDiscordSlug,
  /** 解析频道配置 */
  resolveDiscordChannelConfig,
  /** 解析频道配置（带回退） */
  resolveDiscordChannelConfigWithFallback,
  /** 检查命令是否被授权 */
  resolveDiscordCommandAuthorized,
  /** 解析服务器条目配置 */
  resolveDiscordGuildEntry,
  /** 检查是否需要 @提及 */
  resolveDiscordShouldRequireMention,
  /** 解析群组私信允许策略 */
  resolveGroupDmAllow,
  /** 检查是否应发送反应通知 */
  shouldEmitDiscordReactionNotification,
} from "./monitor/allow-list.js";

// ============================================================================
// 消息监听器相关导出
// ============================================================================

export type {
  /** Discord 消息事件类型 */
  DiscordMessageEvent,
  /** Discord 消息处理器类型 */
  DiscordMessageHandler,
} from "./monitor/listeners.js";
export {
  /** 注册 Discord 消息监听器 */
  registerDiscordListener,
} from "./monitor/listeners.js";

// ============================================================================
// 消息处理相关导出
// ============================================================================

/** 创建 Discord 消息处理器 */
export { createDiscordMessageHandler } from "./monitor/message-handler.js";

/** 构建 Discord 媒体消息载荷 */
export { buildDiscordMediaPayload } from "./monitor/message-utils.js";

/** 创建 Discord 原生命令处理器 */
export { createDiscordNativeCommand } from "./monitor/native-command.js";

// ============================================================================
// 监听提供者相关导出
// ============================================================================

export type {
  /** Discord 监听选项类型 */
  MonitorDiscordOpts,
} from "./monitor/provider.js";
export {
  /** Discord 消息监听提供者 */
  monitorDiscordProvider,
} from "./monitor/provider.js";

// ============================================================================
// 消息线程相关导出
// ============================================================================

/** 解析 Discord 回复目标 */
export { resolveDiscordReplyTarget, sanitizeDiscordThreadName } from "./monitor/threading.js";
