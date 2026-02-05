/**
 * Webhook 钩子模块
 *
 * 提供 HTTP Webhook 端点功能，允许外部系统触发 agent 操作，包括：
 * - 钩子配置解析和验证
 * - 请求认证（Bearer token、header、query）
 * - JSON 请求体解析
 * - agent 调用负载规范化
 */

import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { listChannelPlugins } from "../channels/plugins/index.js";
import type { ChannelId } from "../channels/plugins/types.js";
import type { MoltbotConfig } from "../config/config.js";
import { normalizeMessageChannel } from "../utils/message-channel.js";
import { type HookMappingResolved, resolveHookMappings } from "./hooks-mapping.js";

/** 默认钩子路径 */
const DEFAULT_HOOKS_PATH = "/hooks";
/** 默认最大请求体大小 */
const DEFAULT_HOOKS_MAX_BODY_BYTES = 256 * 1024;

/**
 * 解析后的钩子配置
 */
export type HooksConfigResolved = {
  /** 基础路径 */
  basePath: string;
  /** 认证令牌 */
  token: string;
  /** 最大请求体大小 */
  maxBodyBytes: number;
  /** 路由映射 */
  mappings: HookMappingResolved[];
};

/**
 * 解析钩子配置
 */
export function resolveHooksConfig(cfg: MoltbotConfig): HooksConfigResolved | null {
  if (cfg.hooks?.enabled !== true) return null;
  const token = cfg.hooks?.token?.trim();
  if (!token) {
    throw new Error("hooks.enabled requires hooks.token");
  }
  const rawPath = cfg.hooks?.path?.trim() || DEFAULT_HOOKS_PATH;
  const withSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const trimmed = withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
  if (trimmed === "/") {
    throw new Error("hooks.path may not be '/'");
  }
  const maxBodyBytes =
    cfg.hooks?.maxBodyBytes && cfg.hooks.maxBodyBytes > 0
      ? cfg.hooks.maxBodyBytes
      : DEFAULT_HOOKS_MAX_BODY_BYTES;
  const mappings = resolveHookMappings(cfg.hooks);
  return {
    basePath: trimmed,
    token,
    maxBodyBytes,
    mappings,
  };
}

/**
 * 钩子令牌提取结果
 */
export type HookTokenResult = {
  token: string | undefined;
  fromQuery: boolean;
};

/**
 * 从请求中提取钩子令牌
 *
 * 按优先级检查：Authorization header > X-Moltbot-Token header > query 参数
 */
export function extractHookToken(req: IncomingMessage, url: URL): HookTokenResult {
  const auth =
    typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return { token, fromQuery: false };
  }
  const headerToken =
    typeof req.headers["x-moltbot-token"] === "string" ? req.headers["x-moltbot-token"].trim() : "";
  if (headerToken) return { token: headerToken, fromQuery: false };
  const queryToken = url.searchParams.get("token");
  if (queryToken) return { token: queryToken.trim(), fromQuery: true };
  return { token: undefined, fromQuery: false };
}

/**
 * 读取 JSON 请求体
 */
export async function readJsonBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  return await new Promise((resolve) => {
    let done = false;
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      if (done) return;
      total += chunk.length;
      if (total > maxBytes) {
        done = true;
        resolve({ ok: false, error: "payload too large" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      const raw = Buffer.concat(chunks).toString("utf-8").trim();
      if (!raw) {
        resolve({ ok: true, value: {} });
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        resolve({ ok: true, value: parsed });
      } catch (err) {
        resolve({ ok: false, error: String(err) });
      }
    });
    req.on("error", (err) => {
      if (done) return;
      done = true;
      resolve({ ok: false, error: String(err) });
    });
  });
}

/**
 * 规范化请求头
 */
export function normalizeHookHeaders(req: IncomingMessage) {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      headers[key.toLowerCase()] = value.join(", ");
    }
  }
  return headers;
}

/**
 * 规范化唤醒负载
 */
export function normalizeWakePayload(
  payload: Record<string, unknown>,
):
  | { ok: true; value: { text: string; mode: "now" | "next-heartbeat" } }
  | { ok: false; error: string } {
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) return { ok: false, error: "text required" };
  const mode = payload.mode === "next-heartbeat" ? "next-heartbeat" : "now";
  return { ok: true, value: { text, mode } };
}

/**
 * 钩子 agent 调用负载
 */
export type HookAgentPayload = {
  message: string;
  name: string;
  wakeMode: "now" | "next-heartbeat";
  sessionKey: string;
  deliver: boolean;
  channel: HookMessageChannel;
  to?: string;
  model?: string;
  thinking?: string;
  timeoutSeconds?: number;
};

const listHookChannelValues = () => ["last", ...listChannelPlugins().map((plugin) => plugin.id)];

export type HookMessageChannel = ChannelId | "last";

const getHookChannelSet = () => new Set<string>(listHookChannelValues());
export const getHookChannelError = () => `channel must be ${listHookChannelValues().join("|")}`;

export function resolveHookChannel(raw: unknown): HookMessageChannel | null {
  if (raw === undefined) return "last";
  if (typeof raw !== "string") return null;
  const normalized = normalizeMessageChannel(raw);
  if (!normalized || !getHookChannelSet().has(normalized)) return null;
  return normalized as HookMessageChannel;
}

export function resolveHookDeliver(raw: unknown): boolean {
  return raw !== false;
}

/**
 * 规范化 agent 调用负载
 */
export function normalizeAgentPayload(
  payload: Record<string, unknown>,
  opts?: { idFactory?: () => string },
):
  | {
      ok: true;
      value: HookAgentPayload;
    }
  | { ok: false; error: string } {
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) return { ok: false, error: "message required" };
  const nameRaw = payload.name;
  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : "Hook";
  const wakeMode = payload.wakeMode === "next-heartbeat" ? "next-heartbeat" : "now";
  const sessionKeyRaw = payload.sessionKey;
  const idFactory = opts?.idFactory ?? randomUUID;
  const sessionKey =
    typeof sessionKeyRaw === "string" && sessionKeyRaw.trim()
      ? sessionKeyRaw.trim()
      : `hook:${idFactory()}`;
  const channel = resolveHookChannel(payload.channel);
  if (!channel) return { ok: false, error: getHookChannelError() };
  const toRaw = payload.to;
  const to = typeof toRaw === "string" && toRaw.trim() ? toRaw.trim() : undefined;
  const modelRaw = payload.model;
  const model = typeof modelRaw === "string" && modelRaw.trim() ? modelRaw.trim() : undefined;
  if (modelRaw !== undefined && !model) {
    return { ok: false, error: "model required" };
  }
  const deliver = resolveHookDeliver(payload.deliver);
  const thinkingRaw = payload.thinking;
  const thinking =
    typeof thinkingRaw === "string" && thinkingRaw.trim() ? thinkingRaw.trim() : undefined;
  const timeoutRaw = payload.timeoutSeconds;
  const timeoutSeconds =
    typeof timeoutRaw === "number" && Number.isFinite(timeoutRaw) && timeoutRaw > 0
      ? Math.floor(timeoutRaw)
      : undefined;
  return {
    ok: true,
    value: {
      message,
      name,
      wakeMode,
      sessionKey,
      deliver,
      channel,
      to,
      model,
      thinking,
      timeoutSeconds,
    },
  };
}
