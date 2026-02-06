/**
 * 代理并发限制模块
 *
 * 定义代理（agent）和子代理（subagent）的默认最大并发数，
 * 并提供从配置中解析实际并发限制的工具函数。
 */
import type { MoltbotConfig } from "./types.js";

/** 主代理默认最大并发数 */
export const DEFAULT_AGENT_MAX_CONCURRENT = 4;
/** 子代理默认最大并发数 */
export const DEFAULT_SUBAGENT_MAX_CONCURRENT = 8;

/**
 * 解析主代理最大并发数
 *
 * 从配置中读取 agents.defaults.maxConcurrent，若无效则返回默认值。
 * 最小值为 1。
 */
export function resolveAgentMaxConcurrent(cfg?: MoltbotConfig): number {
  const raw = cfg?.agents?.defaults?.maxConcurrent;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  return DEFAULT_AGENT_MAX_CONCURRENT;
}

/**
 * 解析子代理最大并发数
 *
 * 从配置中读取 agents.defaults.subagents.maxConcurrent，若无效则返回默认值。
 * 最小值为 1。
 */
export function resolveSubagentMaxConcurrent(cfg?: MoltbotConfig): number {
  const raw = cfg?.agents?.defaults?.subagents?.maxConcurrent;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  return DEFAULT_SUBAGENT_MAX_CONCURRENT;
}
