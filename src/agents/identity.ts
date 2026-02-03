/**
 * Agent 身份配置模块
 * 提供 Agent 身份、消息前缀、响应前缀等配置的解析功能
 */
import type { MoltbotConfig, HumanDelayConfig, IdentityConfig } from "../config/config.js";
import { resolveAgentConfig } from "./agent-scope.js";

/** 默认确认反应表情 */
const DEFAULT_ACK_REACTION = "👀";

/**
 * 解析 Agent 身份配置
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @returns 身份配置，未配置返回 undefined
 */
export function resolveAgentIdentity(
  cfg: MoltbotConfig,
  agentId: string,
): IdentityConfig | undefined {
  return resolveAgentConfig(cfg, agentId)?.identity;
}

/**
 * 解析确认反应表情
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @returns 确认反应表情
 */
export function resolveAckReaction(cfg: MoltbotConfig, agentId: string): string {
  const configured = cfg.messages?.ackReaction;
  if (configured !== undefined) return configured.trim();
  const emoji = resolveAgentIdentity(cfg, agentId)?.emoji?.trim();
  return emoji || DEFAULT_ACK_REACTION;
}

/**
 * 解析身份名称前缀（带方括号）
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @returns 名称前缀，如 "[名称]"，未配置返回 undefined
 */
export function resolveIdentityNamePrefix(cfg: MoltbotConfig, agentId: string): string | undefined {
  const name = resolveAgentIdentity(cfg, agentId)?.name?.trim();
  if (!name) return undefined;
  return `[${name}]`;
}

/**
 * 解析身份名称（不带方括号，用于模板上下文）
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @returns 身份名称，未配置返回 undefined
 */
export function resolveIdentityName(cfg: MoltbotConfig, agentId: string): string | undefined {
  return resolveAgentIdentity(cfg, agentId)?.name?.trim() || undefined;
}

/**
 * 解析消息前缀
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @param opts - 选项（configured: 已配置值, hasAllowFrom: 是否有允许来源, fallback: 回退值）
 * @returns 消息前缀
 */
export function resolveMessagePrefix(
  cfg: MoltbotConfig,
  agentId: string,
  opts?: { configured?: string; hasAllowFrom?: boolean; fallback?: string },
): string {
  const configured = opts?.configured ?? cfg.messages?.messagePrefix;
  if (configured !== undefined) return configured;

  const hasAllowFrom = opts?.hasAllowFrom === true;
  if (hasAllowFrom) return "";

  return resolveIdentityNamePrefix(cfg, agentId) ?? opts?.fallback ?? "[moltbot]";
}

/**
 * 解析响应前缀
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @returns 响应前缀，未配置返回 undefined
 */
export function resolveResponsePrefix(cfg: MoltbotConfig, agentId: string): string | undefined {
  const configured = cfg.messages?.responsePrefix;
  if (configured !== undefined) {
    if (configured === "auto") {
      return resolveIdentityNamePrefix(cfg, agentId);
    }
    return configured;
  }
  return undefined;
}

/**
 * 解析有效的消息配置
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @param opts - 选项
 * @returns 消息前缀和响应前缀配置
 */
export function resolveEffectiveMessagesConfig(
  cfg: MoltbotConfig,
  agentId: string,
  opts?: { hasAllowFrom?: boolean; fallbackMessagePrefix?: string },
): { messagePrefix: string; responsePrefix?: string } {
  return {
    messagePrefix: resolveMessagePrefix(cfg, agentId, {
      hasAllowFrom: opts?.hasAllowFrom,
      fallback: opts?.fallbackMessagePrefix,
    }),
    responsePrefix: resolveResponsePrefix(cfg, agentId),
  };
}

/**
 * 解析人类延迟配置
 * @param cfg - Moltbot 配置
 * @param agentId - Agent ID
 * @returns 人类延迟配置，未配置返回 undefined
 */
export function resolveHumanDelayConfig(
  cfg: MoltbotConfig,
  agentId: string,
): HumanDelayConfig | undefined {
  const defaults = cfg.agents?.defaults?.humanDelay;
  const overrides = resolveAgentConfig(cfg, agentId)?.humanDelay;
  if (!defaults && !overrides) return undefined;
  return {
    mode: overrides?.mode ?? defaults?.mode,
    minMs: overrides?.minMs ?? defaults?.minMs,
    maxMs: overrides?.maxMs ?? defaults?.maxMs,
  };
}
