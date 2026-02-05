/**
 * Slack WebClient 工厂模块
 *
 * 该模块提供创建和配置 Slack WebClient 实例的功能，
 * 包含默认的重试策略配置。
 *
 * @module slack/client
 */

import { type RetryOptions, type WebClientOptions, WebClient } from "@slack/web-api";

/**
 * Slack API 默认重试配置
 *
 * 使用指数退避策略处理临时性错误：
 * - 最多重试 2 次
 * - 退避因子为 2（每次重试等待时间翻倍）
 * - 最小等待 500ms，最大等待 3000ms
 * - 启用随机化以避免请求风暴
 */
export const SLACK_DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 2,
  factor: 2,
  minTimeout: 500,
  maxTimeout: 3000,
  randomize: true,
};

/**
 * 解析 Slack WebClient 配置选项
 *
 * 合并用户提供的选项与默认重试配置
 *
 * @param options - 用户提供的 WebClient 选项
 * @returns 合并后的完整配置选项
 */
export function resolveSlackWebClientOptions(options: WebClientOptions = {}): WebClientOptions {
  return {
    ...options,
    retryConfig: options.retryConfig ?? SLACK_DEFAULT_RETRY_OPTIONS,
  };
}

/**
 * 创建 Slack WebClient 实例
 *
 * 使用提供的 token 和选项创建一个配置好的 WebClient 实例，
 * 自动应用默认的重试策略。
 *
 * @param token - Slack Bot Token 或 User Token
 * @param options - 可选的 WebClient 配置选项
 * @returns 配置好的 WebClient 实例
 *
 * @example
 * ```typescript
 * const client = createSlackWebClient("xoxb-your-bot-token");
 * await client.chat.postMessage({
 *   channel: "C1234567890",
 *   text: "Hello!"
 * });
 * ```
 */
export function createSlackWebClient(token: string, options: WebClientOptions = {}) {
  return new WebClient(token, resolveSlackWebClientOptions(options));
}
