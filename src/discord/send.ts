/**
 * Discord 消息发送模块
 *
 * 该模块作为 Discord 发送功能的统一导出入口，聚合了以下子模块：
 * - 频道管理（创建、编辑、删除、移动频道及权限设置）
 * - 表情和贴纸（上传表情、贴纸，列出服务器表情）
 * - 服务器管理（成员管理、角色操作、计划事件等）
 * - 消息操作（发送、编辑、删除、搜索、置顶消息等）
 * - 反应操作（添加、移除反应，获取权限信息）
 *
 * @module discord/send
 */

// ============================================================================
// 频道管理相关导出
// ============================================================================

export {
  /** 创建 Discord 频道 */
  createChannelDiscord,
  /** 删除 Discord 频道 */
  deleteChannelDiscord,
  /** 编辑 Discord 频道属性 */
  editChannelDiscord,
  /** 移动 Discord 频道位置 */
  moveChannelDiscord,
  /** 移除频道权限覆盖 */
  removeChannelPermissionDiscord,
  /** 设置频道权限覆盖 */
  setChannelPermissionDiscord,
} from "./send.channels.js";

// ============================================================================
// 表情和贴纸相关导出
// ============================================================================

export {
  /** 列出服务器所有表情 */
  listGuildEmojisDiscord,
  /** 上传自定义表情到服务器 */
  uploadEmojiDiscord,
  /** 上传贴纸到服务器 */
  uploadStickerDiscord,
} from "./send.emojis-stickers.js";

// ============================================================================
// 服务器管理相关导出
// ============================================================================

export {
  /** 为成员添加角色 */
  addRoleDiscord,
  /** 封禁服务器成员 */
  banMemberDiscord,
  /** 创建计划事件 */
  createScheduledEventDiscord,
  /** 获取频道详细信息 */
  fetchChannelInfoDiscord,
  /** 获取成员详细信息 */
  fetchMemberInfoDiscord,
  /** 获取角色详细信息 */
  fetchRoleInfoDiscord,
  /** 获取语音频道状态 */
  fetchVoiceStatusDiscord,
  /** 踢出服务器成员 */
  kickMemberDiscord,
  /** 列出服务器所有频道 */
  listGuildChannelsDiscord,
  /** 列出服务器计划事件 */
  listScheduledEventsDiscord,
  /** 移除成员角色 */
  removeRoleDiscord,
  /** 禁言服务器成员 */
  timeoutMemberDiscord,
} from "./send.guild.js";

// ============================================================================
// 消息操作相关导出
// ============================================================================

export {
  /** 创建消息子区（帖子） */
  createThreadDiscord,
  /** 删除消息 */
  deleteMessageDiscord,
  /** 编辑消息内容 */
  editMessageDiscord,
  /** 获取单条消息详情 */
  fetchMessageDiscord,
  /** 列出频道置顶消息 */
  listPinsDiscord,
  /** 列出频道子区列表 */
  listThreadsDiscord,
  /** 置顶消息 */
  pinMessageDiscord,
  /** 读取频道历史消息 */
  readMessagesDiscord,
  /** 搜索服务器消息 */
  searchMessagesDiscord,
  /** 取消置顶消息 */
  unpinMessageDiscord,
} from "./send.messages.js";

// ============================================================================
// 消息发送相关导出
// ============================================================================

/** 发送文本/媒体消息到 Discord */
export { sendMessageDiscord, sendPollDiscord, sendStickerDiscord } from "./send.outbound.js";

// ============================================================================
// 反应操作相关导出
// ============================================================================

export {
  /** 获取频道权限摘要 */
  fetchChannelPermissionsDiscord,
  /** 获取消息的反应列表 */
  fetchReactionsDiscord,
  /** 为消息添加反应 */
  reactMessageDiscord,
  /** 移除自己的所有反应 */
  removeOwnReactionsDiscord,
  /** 移除指定反应 */
  removeReactionDiscord,
} from "./send.reactions.js";

// ============================================================================
// 类型定义导出
// ============================================================================

export type {
  /** 创建频道的参数类型 */
  DiscordChannelCreate,
  /** 编辑频道的参数类型 */
  DiscordChannelEdit,
  /** 移动频道的参数类型 */
  DiscordChannelMove,
  /** 设置频道权限的参数类型 */
  DiscordChannelPermissionSet,
  /** 上传表情的参数类型 */
  DiscordEmojiUpload,
  /** 编辑消息的参数类型 */
  DiscordMessageEdit,
  /** 消息查询的参数类型 */
  DiscordMessageQuery,
  /** 管理操作目标的参数类型 */
  DiscordModerationTarget,
  /** 权限摘要的返回类型 */
  DiscordPermissionsSummary,
  /** 反应摘要的返回类型 */
  DiscordReactionSummary,
  /** 反应用户信息类型 */
  DiscordReactionUser,
  /** 反应操作的选项类型 */
  DiscordReactOpts,
  /** 角色变更的参数类型 */
  DiscordRoleChange,
  /** 搜索查询的参数类型 */
  DiscordSearchQuery,
  /** 发送消息的结果类型 */
  DiscordSendResult,
  /** 上传贴纸的参数类型 */
  DiscordStickerUpload,
  /** 创建子区的参数类型 */
  DiscordThreadCreate,
  /** 子区列表查询的参数类型 */
  DiscordThreadList,
  /** 禁言操作目标的参数类型 */
  DiscordTimeoutTarget,
} from "./send.types.js";

/** Discord 发送错误类 */
export { DiscordSendError } from "./send.types.js";
