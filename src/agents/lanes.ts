/**
 * Agent 通道常量模块
 * 导出 Agent 使用的命令通道常量
 */
import { CommandLane } from "../process/lanes.js";

/** 嵌套命令通道 */
export const AGENT_LANE_NESTED = CommandLane.Nested;
/** 子代理命令通道 */
export const AGENT_LANE_SUBAGENT = CommandLane.Subagent;
