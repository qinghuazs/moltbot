/**
 * 重试机制模块
 * 提供带指数退避和抖动的异步重试功能
 */

/** 重试配置类型 */
export type RetryConfig = {
  /** 最大尝试次数 */
  attempts?: number;
  /** 最小延迟毫秒数 */
  minDelayMs?: number;
  /** 最大延迟毫秒数 */
  maxDelayMs?: number;
  /** 抖动系数（0-1） */
  jitter?: number;
};

/** 重试信息类型 */
export type RetryInfo = {
  /** 当前尝试次数 */
  attempt: number;
  /** 最大尝试次数 */
  maxAttempts: number;
  /** 延迟毫秒数 */
  delayMs: number;
  /** 错误对象 */
  err: unknown;
  /** 标签 */
  label?: string;
};

/** 重试选项类型 */
export type RetryOptions = RetryConfig & {
  /** 标签（用于日志） */
  label?: string;
  /** 判断是否应该重试的函数 */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** 从错误中提取重试延迟的函数 */
  retryAfterMs?: (err: unknown) => number | undefined;
  /** 重试时的回调函数 */
  onRetry?: (info: RetryInfo) => void;
};

/** 默认重试配置 */
const DEFAULT_RETRY_CONFIG = {
  attempts: 3,
  minDelayMs: 300,
  maxDelayMs: 30_000,
  jitter: 0,
};

/** 异步延迟 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 将值转换为有限数字 */
const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** 限制数值范围 */
const clampNumber = (value: unknown, fallback: number, min?: number, max?: number) => {
  const next = asFiniteNumber(value);
  if (next === undefined) return fallback;
  const floor = typeof min === "number" ? min : Number.NEGATIVE_INFINITY;
  const ceiling = typeof max === "number" ? max : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(next, floor), ceiling);
};

/**
 * 解析重试配置
 * 合并默认配置和覆盖配置
 * @param defaults - 默认配置
 * @param overrides - 覆盖配置
 * @returns 完整的重试配置
 */
export function resolveRetryConfig(
  defaults: Required<RetryConfig> = DEFAULT_RETRY_CONFIG,
  overrides?: RetryConfig,
): Required<RetryConfig> {
  const attempts = Math.max(1, Math.round(clampNumber(overrides?.attempts, defaults.attempts, 1)));
  const minDelayMs = Math.max(
    0,
    Math.round(clampNumber(overrides?.minDelayMs, defaults.minDelayMs, 0)),
  );
  const maxDelayMs = Math.max(
    minDelayMs,
    Math.round(clampNumber(overrides?.maxDelayMs, defaults.maxDelayMs, 0)),
  );
  const jitter = clampNumber(overrides?.jitter, defaults.jitter, 0, 1);
  return { attempts, minDelayMs, maxDelayMs, jitter };
}

/**
 * 应用抖动到延迟时间
 * @param delayMs - 基础延迟
 * @param jitter - 抖动系数
 * @returns 应用抖动后的延迟
 */
function applyJitter(delayMs: number, jitter: number): number {
  if (jitter <= 0) return delayMs;
  const offset = (Math.random() * 2 - 1) * jitter;
  return Math.max(0, Math.round(delayMs * (1 + offset)));
}

/**
 * 异步重试函数
 * 支持指数退避、抖动和自定义重试条件
 * @param fn - 要重试的异步函数
 * @param attemptsOrOptions - 尝试次数或重试选项
 * @param initialDelayMs - 初始延迟毫秒数
 * @returns 函数执行结果
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  attemptsOrOptions: number | RetryOptions = 3,
  initialDelayMs = 300,
): Promise<T> {
  // 简单模式：只传入尝试次数
  if (typeof attemptsOrOptions === "number") {
    const attempts = Math.max(1, Math.round(attemptsOrOptions));
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i === attempts - 1) break;
        const delay = initialDelayMs * 2 ** i;
        await sleep(delay);
      }
    }
    throw lastErr ?? new Error("Retry failed");
  }

  // 高级模式：传入完整选项
  const options = attemptsOrOptions;

  const resolved = resolveRetryConfig(DEFAULT_RETRY_CONFIG, options);
  const maxAttempts = resolved.attempts;
  const minDelayMs = resolved.minDelayMs;
  const maxDelayMs =
    Number.isFinite(resolved.maxDelayMs) && resolved.maxDelayMs > 0
      ? resolved.maxDelayMs
      : Number.POSITIVE_INFINITY;
  const jitter = resolved.jitter;
  const shouldRetry = options.shouldRetry ?? (() => true);
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts || !shouldRetry(err, attempt)) break;

      // 计算延迟时间
      const retryAfterMs = options.retryAfterMs?.(err);
      const hasRetryAfter = typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs);
      const baseDelay = hasRetryAfter
        ? Math.max(retryAfterMs, minDelayMs)
        : minDelayMs * 2 ** (attempt - 1);
      let delay = Math.min(baseDelay, maxDelayMs);
      delay = applyJitter(delay, jitter);
      delay = Math.min(Math.max(delay, minDelayMs), maxDelayMs);

      // 触发重试回调
      options.onRetry?.({
        attempt,
        maxAttempts,
        delayMs: delay,
        err,
        label: options.label,
      });
      await sleep(delay);
    }
  }

  throw lastErr ?? new Error("Retry failed");
}
