/**
 * 消息队列配置类型定义
 *
 * 定义消息队列的模式（steer/followup/collect/queue/interrupt 等）、
 * 丢弃策略和按 Provider 分组的队列模式配置。
 */

/** 队列模式 */
export type QueueMode =
  | "steer"
  | "followup"
  | "collect"
  | "steer-backlog"
  | "steer+backlog"
  | "queue"
  | "interrupt";
export type QueueDropPolicy = "old" | "new" | "summarize";

export type QueueModeByProvider = {
  whatsapp?: QueueMode;
  telegram?: QueueMode;
  discord?: QueueMode;
  googlechat?: QueueMode;
  slack?: QueueMode;
  signal?: QueueMode;
  imessage?: QueueMode;
  msteams?: QueueMode;
  webchat?: QueueMode;
};
