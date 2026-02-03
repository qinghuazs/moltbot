/**
 * 定时任务类型定义模块
 * 定义定时任务系统的所有类型，包括调度、负载、状态等
 */
import type { ChannelId } from "../channels/plugins/types.js";

/** 定时调度类型 */
export type CronSchedule =
  | { kind: "at"; atMs: number } // 指定时间点
  | { kind: "every"; everyMs: number; anchorMs?: number } // 固定间隔
  | { kind: "cron"; expr: string; tz?: string }; // Cron 表达式

/** 定时任务会话目标 */
export type CronSessionTarget = "main" | "isolated";
/** 定时任务唤醒模式 */
export type CronWakeMode = "next-heartbeat" | "now";

/** 定时任务消息渠道 */
export type CronMessageChannel = ChannelId | "last";

/** 定时任务负载类型 */
export type CronPayload =
  | { kind: "systemEvent"; text: string } // 系统事件
  | {
      kind: "agentTurn"; // Agent 轮次
      /** 消息内容 */
      message: string;
      /** 可选的模型覆盖（provider/model 或别名） */
      model?: string;
      /** 思考级别 */
      thinking?: string;
      /** 超时秒数 */
      timeoutSeconds?: number;
      /** 是否允许不安全的外部内容 */
      allowUnsafeExternalContent?: boolean;
      /** 是否投递 */
      deliver?: boolean;
      /** 投递渠道 */
      channel?: CronMessageChannel;
      /** 投递目标 */
      to?: string;
      /** 是否尽力投递 */
      bestEffortDeliver?: boolean;
    };

/** 定时任务负载补丁类型（用于部分更新） */
export type CronPayloadPatch =
  | { kind: "systemEvent"; text?: string }
  | {
      kind: "agentTurn";
      message?: string;
      model?: string;
      thinking?: string;
      timeoutSeconds?: number;
      allowUnsafeExternalContent?: boolean;
      deliver?: boolean;
      channel?: CronMessageChannel;
      to?: string;
      bestEffortDeliver?: boolean;
    };

/** 定时任务隔离配置 */
export type CronIsolation = {
  /** 发布到主会话的前缀 */
  postToMainPrefix?: string;
  /**
   * 隔离运行后发布回主会话的内容
   * - summary: 小型状态/摘要行（默认）
   * - full: Agent 的最终文本输出（可选截断）
   */
  postToMainMode?: "summary" | "full";
  /** postToMainMode="full" 时的最大字符数。默认：8000 */
  postToMainMaxChars?: number;
};

/** 定时任务状态 */
export type CronJobState = {
  /** 下次运行时间 */
  nextRunAtMs?: number;
  /** 正在运行的时间 */
  runningAtMs?: number;
  /** 上次运行时间 */
  lastRunAtMs?: number;
  /** 上次状态 */
  lastStatus?: "ok" | "error" | "skipped";
  /** 上次错误 */
  lastError?: string;
  /** 上次持续时间 */
  lastDurationMs?: number;
};

/** 定时任务定义 */
export type CronJob = {
  /** 任务 ID */
  id: string;
  /** Agent ID */
  agentId?: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 运行后是否删除 */
  deleteAfterRun?: boolean;
  /** 创建时间 */
  createdAtMs: number;
  /** 更新时间 */
  updatedAtMs: number;
  /** 调度配置 */
  schedule: CronSchedule;
  /** 会话目标 */
  sessionTarget: CronSessionTarget;
  /** 唤醒模式 */
  wakeMode: CronWakeMode;
  /** 负载 */
  payload: CronPayload;
  /** 隔离配置 */
  isolation?: CronIsolation;
  /** 状态 */
  state: CronJobState;
};

export type CronStoreFile = {
  version: 1;
  jobs: CronJob[];
};

export type CronJobCreate = Omit<CronJob, "id" | "createdAtMs" | "updatedAtMs" | "state"> & {
  state?: Partial<CronJobState>;
};

export type CronJobPatch = Partial<Omit<CronJob, "id" | "createdAtMs" | "state" | "payload">> & {
  payload?: CronPayloadPatch;
  state?: Partial<CronJobState>;
};
