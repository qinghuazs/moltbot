/**
 * Slack 类型定义模块
 *
 * 该模块定义了 Slack 事件和数据结构的 TypeScript 类型，
 * 用于处理来自 Slack Events API 的消息和事件。
 *
 * @module slack/types
 */

/**
 * Slack 文件对象
 *
 * 表示 Slack 消息中附带的文件信息
 */
export type SlackFile = {
  /** 文件唯一标识符 */
  id?: string;
  /** 文件名 */
  name?: string;
  /** MIME 类型 */
  mimetype?: string;
  /** 文件大小（字节） */
  size?: number;
  /** 私有访问 URL（需要认证） */
  url_private?: string;
  /** 私有下载 URL（需要认证） */
  url_private_download?: string;
};

/**
 * Slack 消息事件
 *
 * 当用户在频道或私信中发送消息时触发的事件
 */
export type SlackMessageEvent = {
  /** 事件类型，固定为 "message" */
  type: "message";
  /** 发送消息的用户 ID */
  user?: string;
  /** 如果是机器人发送的消息，则为机器人 ID */
  bot_id?: string;
  /** 消息子类型（如 message_changed、message_deleted 等） */
  subtype?: string;
  /** 发送者用户名 */
  username?: string;
  /** 消息文本内容 */
  text?: string;
  /** 消息时间戳（也作为消息 ID） */
  ts?: string;
  /** 线程父消息时间戳（如果是线程回复） */
  thread_ts?: string;
  /** 事件时间戳 */
  event_ts?: string;
  /** 线程父消息的发送者 ID */
  parent_user_id?: string;
  /** 消息所在频道 ID */
  channel: string;
  /** 频道类型：im=私信, mpim=多人私信, channel=公开频道, group=私有频道 */
  channel_type?: "im" | "mpim" | "channel" | "group";
  /** 消息附带的文件列表 */
  files?: SlackFile[];
};

/**
 * Slack 应用提及事件
 *
 * 当用户在消息中 @提及 机器人时触发的事件
 */
export type SlackAppMentionEvent = {
  /** 事件类型，固定为 "app_mention" */
  type: "app_mention";
  /** 发送消息的用户 ID */
  user?: string;
  /** 如果是机器人发送的消息，则为机器人 ID */
  bot_id?: string;
  /** 发送者用户名 */
  username?: string;
  /** 消息文本内容 */
  text?: string;
  /** 消息时间戳（也作为消息 ID） */
  ts?: string;
  /** 线程父消息时间戳（如果是线程回复） */
  thread_ts?: string;
  /** 事件时间戳 */
  event_ts?: string;
  /** 线程父消息的发送者 ID */
  parent_user_id?: string;
  /** 消息所在频道 ID */
  channel: string;
  /** 频道类型：im=私信, mpim=多人私信, channel=公开频道, group=私有频道 */
  channel_type?: "im" | "mpim" | "channel" | "group";
};
