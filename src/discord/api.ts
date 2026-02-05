/**
 * Discord API 客户端模块
 *
 * 该模块提供了与 Discord REST API 交互的底层功能，包括：
 * - 带重试机制的 API 请求
 * - 速率限制（429）处理
 * - 错误解析和格式化
 *
 * @module discord/api
 */

import { resolveFetch } from "../infra/fetch.js";
import { resolveRetryConfig, retryAsync, type RetryConfig } from "../infra/retry.js";

/** Discord API v10 基础 URL */
const DISCORD_API_BASE = "https://discord.com/api/v10";

/** Discord API 重试默认配置 */
const DISCORD_API_RETRY_DEFAULTS = {
  /** 最大重试次数 */
  attempts: 3,
  /** 最小重试延迟（毫秒） */
  minDelayMs: 500,
  /** 最大重试延迟（毫秒） */
  maxDelayMs: 30_000,
  /** 抖动系数（用于避免重试风暴） */
  jitter: 0.1,
};

/**
 * Discord API 错误响应载荷
 *
 * 表示 Discord API 返回的错误信息结构。
 */
type DiscordApiErrorPayload = {
  /** 错误消息 */
  message?: string;
  /** 速率限制重试等待时间（秒） */
  retry_after?: number;
  /** 错误代码 */
  code?: number;
  /** 是否为全局速率限制 */
  global?: boolean;
};

/**
 * 解析 Discord API 错误响应载荷
 *
 * @param text - 响应文本
 * @returns 解析后的错误载荷，解析失败返回 null
 */
function parseDiscordApiErrorPayload(text: string): DiscordApiErrorPayload | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const payload = JSON.parse(trimmed);
    if (payload && typeof payload === "object") return payload as DiscordApiErrorPayload;
  } catch {
    return null;
  }
  return null;
}

/**
 * 从响应中解析重试等待时间
 *
 * 优先从响应体中获取 retry_after 字段，其次从 Retry-After 响应头获取。
 *
 * @param text - 响应文本
 * @param response - HTTP 响应对象
 * @returns 重试等待时间（秒），无法解析时返回 undefined
 */
function parseRetryAfterSeconds(text: string, response: Response): number | undefined {
  const payload = parseDiscordApiErrorPayload(text);
  const retryAfter =
    payload && typeof payload.retry_after === "number" && Number.isFinite(payload.retry_after)
      ? payload.retry_after
      : undefined;
  if (retryAfter !== undefined) return retryAfter;
  const header = response.headers.get("Retry-After");
  if (!header) return undefined;
  const parsed = Number(header);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * 格式化重试等待时间为可读字符串
 *
 * @param value - 等待时间（秒）
 * @returns 格式化后的字符串（如 "1.5s"），无效值返回 undefined
 */
function formatRetryAfterSeconds(value: number | undefined): string | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined;
  const rounded = value < 10 ? value.toFixed(1) : Math.round(value).toString();
  return `${rounded}s`;
}

/**
 * 格式化 Discord API 错误文本
 *
 * 将 API 错误响应转换为人类可读的错误消息。
 *
 * @param text - 响应文本
 * @returns 格式化后的错误消息，空响应返回 undefined
 */
function formatDiscordApiErrorText(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const payload = parseDiscordApiErrorPayload(trimmed);
  if (!payload) {
    const looksJson = trimmed.startsWith("{") && trimmed.endsWith("}");
    return looksJson ? "unknown error" : trimmed;
  }
  const message =
    typeof payload.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : "unknown error";
  const retryAfter = formatRetryAfterSeconds(
    typeof payload.retry_after === "number" ? payload.retry_after : undefined,
  );
  return retryAfter ? `${message} (retry after ${retryAfter})` : message;
}

/**
 * Discord API 错误类
 *
 * 表示 Discord API 调用失败时的错误，包含 HTTP 状态码和重试信息。
 */
export class DiscordApiError extends Error {
  /** HTTP 状态码 */
  status: number;
  /** 速率限制重试等待时间（秒） */
  retryAfter?: number;

  /**
   * 创建 Discord API 错误实例
   *
   * @param message - 错误消息
   * @param status - HTTP 状态码
   * @param retryAfter - 重试等待时间（秒）
   */
  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * Discord API 请求选项
 */
export type DiscordFetchOptions = {
  /** 重试配置 */
  retry?: RetryConfig;
  /** 请求标签（用于日志） */
  label?: string;
};

/**
 * 发送 Discord API 请求
 *
 * 封装了带重试机制的 Discord API GET 请求，自动处理速率限制。
 *
 * @template T - 响应数据类型
 * @param path - API 路径（如 "/users/@me"）
 * @param token - Discord Bot Token
 * @param fetcher - 可选的自定义 fetch 实现
 * @param options - 请求选项
 * @returns 解析后的响应数据
 * @throws {DiscordApiError} API 调用失败时抛出
 */
export async function fetchDiscord<T>(
  path: string,
  token: string,
  fetcher: typeof fetch = fetch,
  options?: DiscordFetchOptions,
): Promise<T> {
  const fetchImpl = resolveFetch(fetcher);
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }

  const retryConfig = resolveRetryConfig(DISCORD_API_RETRY_DEFAULTS, options?.retry);
  return retryAsync(
    async () => {
      const res = await fetchImpl(`${DISCORD_API_BASE}${path}`, {
        headers: { Authorization: `Bot ${token}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const detail = formatDiscordApiErrorText(text);
        const suffix = detail ? `: ${detail}` : "";
        const retryAfter = res.status === 429 ? parseRetryAfterSeconds(text, res) : undefined;
        throw new DiscordApiError(
          `Discord API ${path} failed (${res.status})${suffix}`,
          res.status,
          retryAfter,
        );
      }
      return (await res.json()) as T;
    },
    {
      ...retryConfig,
      label: options?.label ?? path,
      shouldRetry: (err) => err instanceof DiscordApiError && err.status === 429,
      retryAfterMs: (err) =>
        err instanceof DiscordApiError && typeof err.retryAfter === "number"
          ? err.retryAfter * 1000
          : undefined,
    },
  );
}
