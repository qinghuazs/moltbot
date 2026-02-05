/**
 * Telegram Webhook 服务模块
 *
 * 本模块提供 Telegram Bot Webhook 模式的服务器实现，包括：
 * - HTTP 服务器创建和监听
 * - Webhook 回调处理
 * - 健康检查端点
 * - 诊断日志和心跳
 * - 优雅关闭支持
 *
 * Webhook 模式相比轮询模式具有更低的延迟和更好的资源利用率，
 * 适用于生产环境部署。
 *
 * @module telegram/webhook
 */

import { createServer } from "node:http";

import { webhookCallback } from "grammy";
import type { MoltbotConfig } from "../config/config.js";
import { isDiagnosticsEnabled } from "../infra/diagnostic-events.js";
import { formatErrorMessage } from "../infra/errors.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import {
  logWebhookError,
  logWebhookProcessed,
  logWebhookReceived,
  startDiagnosticHeartbeat,
  stopDiagnosticHeartbeat,
} from "../logging/diagnostic.js";
import { resolveTelegramAllowedUpdates } from "./allowed-updates.js";
import { createTelegramBot } from "./bot.js";
import { withTelegramApiErrorLogging } from "./api-logging.js";

/**
 * 启动 Telegram Webhook 服务器
 *
 * 创建 HTTP 服务器监听 Telegram 的 Webhook 推送，并自动向 Telegram API 注册 Webhook URL。
 * 支持健康检查端点、诊断日志和优雅关闭。
 *
 * @param opts - Webhook 服务器配置选项
 * @param opts.token - Telegram Bot 令牌（必需）
 * @param opts.accountId - 账户 ID（用于多账户场景）
 * @param opts.config - Moltbot 配置对象
 * @param opts.path - Webhook 路径，默认 "/telegram-webhook"
 * @param opts.port - 监听端口，默认 8787
 * @param opts.host - 监听主机，默认 "0.0.0.0"
 * @param opts.secret - Webhook 密钥（用于验证请求来源）
 * @param opts.runtime - 运行时环境
 * @param opts.fetch - 自定义 fetch 实现（用于代理等场景）
 * @param opts.abortSignal - 中止信号（用于优雅关闭）
 * @param opts.healthPath - 健康检查路径，默认 "/healthz"
 * @param opts.publicUrl - 公开 URL（用于 Webhook 注册）
 * @returns 包含 server、bot 和 stop 函数的对象
 */
export async function startTelegramWebhook(opts: {
  token: string;
  accountId?: string;
  config?: MoltbotConfig;
  path?: string;
  port?: number;
  host?: string;
  secret?: string;
  runtime?: RuntimeEnv;
  fetch?: typeof fetch;
  abortSignal?: AbortSignal;
  healthPath?: string;
  publicUrl?: string;
}) {
  const path = opts.path ?? "/telegram-webhook";
  const healthPath = opts.healthPath ?? "/healthz";
  const port = opts.port ?? 8787;
  const host = opts.host ?? "0.0.0.0";
  const runtime = opts.runtime ?? defaultRuntime;
  const diagnosticsEnabled = isDiagnosticsEnabled(opts.config);
  const bot = createTelegramBot({
    token: opts.token,
    runtime,
    proxyFetch: opts.fetch,
    config: opts.config,
    accountId: opts.accountId,
  });
  const handler = webhookCallback(bot, "http", {
    secretToken: opts.secret,
  });

  if (diagnosticsEnabled) {
    startDiagnosticHeartbeat();
  }

  const server = createServer((req, res) => {
    if (req.url === healthPath) {
      res.writeHead(200);
      res.end("ok");
      return;
    }
    if (req.url !== path || req.method !== "POST") {
      res.writeHead(404);
      res.end();
      return;
    }
    const startTime = Date.now();
    if (diagnosticsEnabled) {
      logWebhookReceived({ channel: "telegram", updateType: "telegram-post" });
    }
    const handled = handler(req, res);
    if (handled && typeof (handled as Promise<void>).catch === "function") {
      void (handled as Promise<void>)
        .then(() => {
          if (diagnosticsEnabled) {
            logWebhookProcessed({
              channel: "telegram",
              updateType: "telegram-post",
              durationMs: Date.now() - startTime,
            });
          }
        })
        .catch((err) => {
          const errMsg = formatErrorMessage(err);
          if (diagnosticsEnabled) {
            logWebhookError({
              channel: "telegram",
              updateType: "telegram-post",
              error: errMsg,
            });
          }
          runtime.log?.(`webhook handler failed: ${errMsg}`);
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
    }
  });

  const publicUrl =
    opts.publicUrl ?? `http://${host === "0.0.0.0" ? "localhost" : host}:${port}${path}`;

  await withTelegramApiErrorLogging({
    operation: "setWebhook",
    runtime,
    fn: () =>
      bot.api.setWebhook(publicUrl, {
        secret_token: opts.secret,
        allowed_updates: resolveTelegramAllowedUpdates(),
      }),
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  runtime.log?.(`webhook listening on ${publicUrl}`);

  const shutdown = () => {
    server.close();
    void bot.stop();
    if (diagnosticsEnabled) {
      stopDiagnosticHeartbeat();
    }
  };
  if (opts.abortSignal) {
    opts.abortSignal.addEventListener("abort", shutdown, { once: true });
  }

  return { server, bot, stop: shutdown };
}
