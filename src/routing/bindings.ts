/**
 * 路由绑定模块
 * 提供 Agent 绑定配置的解析和查询功能
 */
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { normalizeChatChannelId } from "../channels/registry.js";
import type { MoltbotConfig } from "../config/config.js";
import type { AgentBinding } from "../config/types.agents.js";
import { normalizeAccountId, normalizeAgentId } from "./session-key.js";

/**
 * 规范化绑定渠道 ID
 * @param raw - 原始渠道 ID
 * @returns 规范化后的渠道 ID
 */
function normalizeBindingChannelId(raw?: string | null): string | null {
  const normalized = normalizeChatChannelId(raw);
  if (normalized) return normalized;
  const fallback = (raw ?? "").trim().toLowerCase();
  return fallback || null;
}

/**
 * 列出所有绑定配置
 * @param cfg - Moltbot 配置
 * @returns 绑定配置列表
 */
export function listBindings(cfg: MoltbotConfig): AgentBinding[] {
  return Array.isArray(cfg.bindings) ? cfg.bindings : [];
}

/**
 * 列出指定渠道的所有绑定账户 ID
 * @param cfg - Moltbot 配置
 * @param channelId - 渠道 ID
 * @returns 账户 ID 列表
 */
export function listBoundAccountIds(cfg: MoltbotConfig, channelId: string): string[] {
  const normalizedChannel = normalizeBindingChannelId(channelId);
  if (!normalizedChannel) return [];
  const ids = new Set<string>();
  for (const binding of listBindings(cfg)) {
    if (!binding || typeof binding !== "object") continue;
    const match = binding.match;
    if (!match || typeof match !== "object") continue;
    const channel = normalizeBindingChannelId(match.channel);
    if (!channel || channel !== normalizedChannel) continue;
    const accountId = typeof match.accountId === "string" ? match.accountId.trim() : "";
    if (!accountId || accountId === "*") continue;
    ids.add(normalizeAccountId(accountId));
  }
  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

/**
 * 解析默认 Agent 绑定的账户 ID
 * @param cfg - Moltbot 配置
 * @param channelId - 渠道 ID
 * @returns 账户 ID，未找到返回 null
 */
export function resolveDefaultAgentBoundAccountId(
  cfg: MoltbotConfig,
  channelId: string,
): string | null {
  const normalizedChannel = normalizeBindingChannelId(channelId);
  if (!normalizedChannel) return null;
  const defaultAgentId = normalizeAgentId(resolveDefaultAgentId(cfg));
  for (const binding of listBindings(cfg)) {
    if (!binding || typeof binding !== "object") continue;
    if (normalizeAgentId(binding.agentId) !== defaultAgentId) continue;
    const match = binding.match;
    if (!match || typeof match !== "object") continue;
    const channel = normalizeBindingChannelId(match.channel);
    if (!channel || channel !== normalizedChannel) continue;
    const accountId = typeof match.accountId === "string" ? match.accountId.trim() : "";
    if (!accountId || accountId === "*") continue;
    return normalizeAccountId(accountId);
  }
  return null;
}

/**
 * 构建渠道账户绑定映射
 * @param cfg - Moltbot 配置
 * @returns 渠道 -> Agent -> 账户列表 的映射
 */
export function buildChannelAccountBindings(cfg: MoltbotConfig) {
  const map = new Map<string, Map<string, string[]>>();
  for (const binding of listBindings(cfg)) {
    if (!binding || typeof binding !== "object") continue;
    const match = binding.match;
    if (!match || typeof match !== "object") continue;
    const channelId = normalizeBindingChannelId(match.channel);
    if (!channelId) continue;
    const accountId = typeof match.accountId === "string" ? match.accountId.trim() : "";
    if (!accountId || accountId === "*") continue;
    const agentId = normalizeAgentId(binding.agentId);
    const byAgent = map.get(channelId) ?? new Map<string, string[]>();
    const list = byAgent.get(agentId) ?? [];
    const normalizedAccountId = normalizeAccountId(accountId);
    if (!list.includes(normalizedAccountId)) list.push(normalizedAccountId);
    byAgent.set(agentId, list);
    map.set(channelId, byAgent);
  }
  return map;
}

/**
 * 解析首选账户 ID
 * @param params - 参数
 * @returns 首选账户 ID
 */
export function resolvePreferredAccountId(params: {
  accountIds: string[];
  defaultAccountId: string;
  boundAccounts: string[];
}): string {
  if (params.boundAccounts.length > 0) return params.boundAccounts[0];
  return params.defaultAccountId;
}
