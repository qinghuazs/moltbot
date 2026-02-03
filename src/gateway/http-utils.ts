/**
 * HTTP 工具模块
 * 提供 HTTP 请求头解析、Agent ID 解析、会话键解析等功能
 */
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

import { buildAgentMainSessionKey, normalizeAgentId } from "../routing/session-key.js";

/**
 * 获取请求头值
 * @param req - HTTP 请求对象
 * @param name - 请求头名称
 * @returns 请求头值
 */
export function getHeader(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

/**
 * 获取 Bearer Token
 * @param req - HTTP 请求对象
 * @returns Bearer Token
 */
export function getBearerToken(req: IncomingMessage): string | undefined {
  const raw = getHeader(req, "authorization")?.trim() ?? "";
  if (!raw.toLowerCase().startsWith("bearer ")) return undefined;
  const token = raw.slice(7).trim();
  return token || undefined;
}

/**
 * 从请求头解析 Agent ID
 * @param req - HTTP 请求对象
 * @returns Agent ID
 */
export function resolveAgentIdFromHeader(req: IncomingMessage): string | undefined {
  const raw =
    getHeader(req, "x-moltbot-agent-id")?.trim() || getHeader(req, "x-moltbot-agent")?.trim() || "";
  if (!raw) return undefined;
  return normalizeAgentId(raw);
}

/**
 * 从模型名称解析 Agent ID
 * 支持格式：moltbot:<agentId> 或 agent:<agentId>
 * @param model - 模型名称
 * @returns Agent ID
 */
export function resolveAgentIdFromModel(model: string | undefined): string | undefined {
  const raw = model?.trim();
  if (!raw) return undefined;

  const m =
    raw.match(/^moltbot[:/](?<agentId>[a-z0-9][a-z0-9_-]{0,63})$/i) ??
    raw.match(/^agent:(?<agentId>[a-z0-9][a-z0-9_-]{0,63})$/i);
  const agentId = m?.groups?.agentId;
  if (!agentId) return undefined;
  return normalizeAgentId(agentId);
}

/**
 * 解析请求的 Agent ID
 * 优先从请求头获取，否则从模型名称获取，默认返回 "main"
 * @param params - 参数
 * @returns Agent ID
 */
export function resolveAgentIdForRequest(params: {
  req: IncomingMessage;
  model: string | undefined;
}): string {
  const fromHeader = resolveAgentIdFromHeader(params.req);
  if (fromHeader) return fromHeader;

  const fromModel = resolveAgentIdFromModel(params.model);
  return fromModel ?? "main";
}

/**
 * 解析会话键
 * 优先使用显式指定的会话键，否则根据用户和前缀生成
 * @param params - 参数
 * @returns 会话键
 */
export function resolveSessionKey(params: {
  req: IncomingMessage;
  agentId: string;
  user?: string | undefined;
  prefix: string;
}): string {
  const explicit = getHeader(params.req, "x-moltbot-session-key")?.trim();
  if (explicit) return explicit;

  const user = params.user?.trim();
  const mainKey = user ? `${params.prefix}-user:${user}` : `${params.prefix}:${randomUUID()}`;
  return buildAgentMainSessionKey({ agentId: params.agentId, mainKey });
}
