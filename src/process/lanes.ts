/**
 * 命令通道枚举
 * 定义不同类型的命令执行通道
 */
export const enum CommandLane {
  /** 主通道 */
  Main = "main",
  /** 定时任务通道 */
  Cron = "cron",
  /** 子代理通道 */
  Subagent = "subagent",
  /** 嵌套命令通道 */
  Nested = "nested",
}
