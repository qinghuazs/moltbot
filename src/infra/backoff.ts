/**
 * 退避策略模块
 * 提供指数退避计算和可中断的延迟功能
 */
import { setTimeout as delay } from "node:timers/promises";

/** 退避策略配置类型 */
export type BackoffPolicy = {
  /** 初始延迟毫秒数 */
  initialMs: number;
  /** 最大延迟毫秒数 */
  maxMs: number;
  /** 指数因子 */
  factor: number;
  /** 抖动系数（0-1） */
  jitter: number;
};

/**
 * 计算退避延迟时间
 * @param policy - 退避策略
 * @param attempt - 当前尝试次数
 * @returns 延迟毫秒数
 */
export function computeBackoff(policy: BackoffPolicy, attempt: number) {
  const base = policy.initialMs * policy.factor ** Math.max(attempt - 1, 0);
  const jitter = base * policy.jitter * Math.random();
  return Math.min(policy.maxMs, Math.round(base + jitter));
}

/**
 * 可中断的延迟函数
 * @param ms - 延迟毫秒数
 * @param abortSignal - 中止信号
 * @throws 如果被中止则抛出 "aborted" 错误
 */
export async function sleepWithAbort(ms: number, abortSignal?: AbortSignal) {
  if (ms <= 0) return;
  try {
    await delay(ms, undefined, { signal: abortSignal });
  } catch (err) {
    if (abortSignal?.aborted) {
      throw new Error("aborted");
    }
    throw err;
  }
}
