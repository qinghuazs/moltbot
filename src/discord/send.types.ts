/**
 * Discord 发送功能类型定义模块
 *
 * 该模块定义了 Discord 消息发送、频道管理、服务器管理等操作所需的类型。
 * 包括错误类、常量定义以及各种操作的参数和返回值类型。
 *
 * @module discord/send.types
 */

import type { RequestClient } from "@buape/carbon";

import type { RetryConfig } from "../infra/retry.js";

/**
 * Discord 发送错误类
 *
 * 用于表示 Discord API 调用失败时的错误信息，
 * 包含错误类型、频道 ID 和缺失权限等详细信息。
 */
export class DiscordSendError extends Error {
  /** 错误类型：缺少权限或私信被阻止 */
  kind?: "missing-permissions" | "dm-blocked";
  /** 发生错误的频道 ID */
  channelId?: string;
  /** 缺失的权限列表 */
  missingPermissions?: string[];

  /**
   * 创建 Discord 发送错误实例
   * @param message - 错误消息
   * @param opts - 可选的错误详情
   */
  constructor(message: string, opts?: Partial<DiscordSendError>) {
    super(message);
    this.name = "DiscordSendError";
    if (opts) Object.assign(this, opts);
  }

  override toString() {
    return this.message;
  }
}

// ============================================================================
// 常量定义
// ============================================================================

/** Discord 表情文件大小上限（256 KB） */
export const DISCORD_MAX_EMOJI_BYTES = 256 * 1024;

/** Discord 贴纸文件大小上限（512 KB） */
export const DISCORD_MAX_STICKER_BYTES = 512 * 1024;

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 消息发送结果
 *
 * 包含发送成功后返回的消息 ID 和频道 ID。
 */
export type DiscordSendResult = {
  /** 发送的消息 ID */
  messageId: string;
  /** 目标频道 ID */
  channelId: string;
};

/**
 * 反应操作选项
 *
 * 用于配置反应相关 API 调用的参数。
 */
export type DiscordReactOpts = {
  /** Discord Bot Token */
  token?: string;
  /** 账户 ID（多账户场景） */
  accountId?: string;
  /** 自定义 REST 客户端 */
  rest?: RequestClient;
  /** 是否输出详细日志 */
  verbose?: boolean;
  /** 重试配置 */
  retry?: RetryConfig;
};

/**
 * 反应用户信息
 *
 * 表示对消息添加反应的用户基本信息。
 */
export type DiscordReactionUser = {
  /** 用户 ID */
  id: string;
  /** 用户名 */
  username?: string;
  /** 用户标签（如 username#1234） */
  tag?: string;
};

/**
 * 反应摘要信息
 *
 * 包含某个表情反应的统计信息和参与用户列表。
 */
export type DiscordReactionSummary = {
  /** 表情信息 */
  emoji: { id?: string | null; name?: string | null; raw: string };
  /** 反应数量 */
  count: number;
  /** 参与反应的用户列表 */
  users: DiscordReactionUser[];
};

/**
 * 频道权限摘要
 *
 * 包含频道的权限信息和类型。
 */
export type DiscordPermissionsSummary = {
  /** 频道 ID */
  channelId: string;
  /** 服务器 ID（私信频道为空） */
  guildId?: string;
  /** 权限列表 */
  permissions: string[];
  /** 原始权限位字符串 */
  raw: string;
  /** 是否为私信频道 */
  isDm: boolean;
  /** 频道类型编号 */
  channelType?: number;
};

// ============================================================================
// 消息操作类型
// ============================================================================

/**
 * 消息查询参数
 *
 * 用于读取频道历史消息时的分页和过滤参数。
 */
export type DiscordMessageQuery = {
  /** 返回消息数量上限 */
  limit?: number;
  /** 获取此消息 ID 之前的消息 */
  before?: string;
  /** 获取此消息 ID 之后的消息 */
  after?: string;
  /** 获取此消息 ID 附近的消息 */
  around?: string;
};

/**
 * 消息编辑参数
 *
 * 用于编辑已发送消息的内容。
 */
export type DiscordMessageEdit = {
  /** 新的消息内容 */
  content?: string;
};

/**
 * 创建子区（帖子）参数
 *
 * 用于在频道中创建新的子区/帖子。
 */
export type DiscordThreadCreate = {
  /** 关联的消息 ID（可选，用于从消息创建子区） */
  messageId?: string;
  /** 子区名称 */
  name: string;
  /** 自动归档时间（分钟） */
  autoArchiveMinutes?: number;
};

/**
 * 子区列表查询参数
 *
 * 用于获取服务器或频道的子区列表。
 */
export type DiscordThreadList = {
  /** 服务器 ID */
  guildId: string;
  /** 频道 ID（可选，限定特定频道） */
  channelId?: string;
  /** 是否包含已归档的子区 */
  includeArchived?: boolean;
  /** 分页游标 */
  before?: string;
  /** 返回数量上限 */
  limit?: number;
};

/**
 * 消息搜索查询参数
 *
 * 用于在服务器中搜索消息。
 */
export type DiscordSearchQuery = {
  /** 服务器 ID */
  guildId: string;
  /** 搜索内容关键词 */
  content: string;
  /** 限定搜索的频道 ID 列表 */
  channelIds?: string[];
  /** 限定搜索的作者 ID 列表 */
  authorIds?: string[];
  /** 返回结果数量上限 */
  limit?: number;
};

// ============================================================================
// 服务器管理类型
// ============================================================================

/**
 * 角色变更参数
 *
 * 用于为成员添加或移除角色。
 */
export type DiscordRoleChange = {
  /** 服务器 ID */
  guildId: string;
  /** 目标用户 ID */
  userId: string;
  /** 角色 ID */
  roleId: string;
};

/**
 * 管理操作目标参数
 *
 * 用于踢出、封禁等管理操作的基础参数。
 */
export type DiscordModerationTarget = {
  /** 服务器 ID */
  guildId: string;
  /** 目标用户 ID */
  userId: string;
  /** 操作原因（会记录在审计日志中） */
  reason?: string;
};

/**
 * 禁言操作目标参数
 *
 * 继承自管理操作目标，增加禁言时长配置。
 */
export type DiscordTimeoutTarget = DiscordModerationTarget & {
  /** 禁言结束时间（ISO 8601 格式） */
  until?: string;
  /** 禁言时长（分钟） */
  durationMinutes?: number;
};

// ============================================================================
// 表情和贴纸类型
// ============================================================================

/**
 * 表情上传参数
 *
 * 用于向服务器上传自定义表情。
 */
export type DiscordEmojiUpload = {
  /** 服务器 ID */
  guildId: string;
  /** 表情名称 */
  name: string;
  /** 表情图片 URL */
  mediaUrl: string;
  /** 可使用该表情的角色 ID 列表（可选） */
  roleIds?: string[];
};

/**
 * 贴纸上传参数
 *
 * 用于向服务器上传自定义贴纸。
 */
export type DiscordStickerUpload = {
  /** 服务器 ID */
  guildId: string;
  /** 贴纸名称 */
  name: string;
  /** 贴纸描述 */
  description: string;
  /** 贴纸标签（用于搜索） */
  tags: string;
  /** 贴纸图片 URL */
  mediaUrl: string;
};

// ============================================================================
// 频道管理类型
// ============================================================================

/**
 * 创建频道参数
 *
 * 用于在服务器中创建新频道。
 */
export type DiscordChannelCreate = {
  /** 服务器 ID */
  guildId: string;
  /** 频道名称 */
  name: string;
  /** 频道类型（0=文字, 2=语音, 4=分类等） */
  type?: number;
  /** 父分类频道 ID */
  parentId?: string;
  /** 频道主题/描述 */
  topic?: string;
  /** 频道位置排序 */
  position?: number;
  /** 是否为 NSFW 频道 */
  nsfw?: boolean;
};

/**
 * 编辑频道参数
 *
 * 用于修改现有频道的属性。
 */
export type DiscordChannelEdit = {
  /** 目标频道 ID */
  channelId: string;
  /** 新的频道名称 */
  name?: string;
  /** 新的频道主题 */
  topic?: string;
  /** 新的位置排序 */
  position?: number;
  /** 新的父分类 ID（null 表示移出分类） */
  parentId?: string | null;
  /** 是否为 NSFW 频道 */
  nsfw?: boolean;
  /** 慢速模式间隔（秒） */
  rateLimitPerUser?: number;
};

/**
 * 移动频道参数
 *
 * 用于调整频道在服务器中的位置。
 */
export type DiscordChannelMove = {
  /** 服务器 ID */
  guildId: string;
  /** 目标频道 ID */
  channelId: string;
  /** 新的父分类 ID（null 表示移出分类） */
  parentId?: string | null;
  /** 新的位置排序 */
  position?: number;
};

/**
 * 设置频道权限覆盖参数
 *
 * 用于为特定角色或用户设置频道权限覆盖。
 */
export type DiscordChannelPermissionSet = {
  /** 目标频道 ID */
  channelId: string;
  /** 目标角色或用户 ID */
  targetId: string;
  /** 目标类型：0=角色, 1=用户 */
  targetType: 0 | 1;
  /** 允许的权限位 */
  allow?: string;
  /** 拒绝的权限位 */
  deny?: string;
};
