/**
 * 定时任务配置类型定义
 *
 * 定义定时任务（cron）的配置结构。
 */

/** 定时任务配置 */
export type CronConfig = {
  enabled?: boolean;
  store?: string;
  maxConcurrentRuns?: number;
};
