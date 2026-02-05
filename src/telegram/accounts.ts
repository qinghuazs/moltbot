/**
 * Telegram 账户管理模块
 *
 * 本模块提供 Telegram 多账户配置的管理功能，包括：
 * - 账户 ID 列表获取
 * - 账户配置解析和合并
 * - 令牌解析（支持环境变量、配置文件、令牌文件）
 * - 默认账户选择
 * - 启用账户过滤
 *
 * 支持多 Bot 账户场景，每个账户可以有独立的配置和令牌。
 *
 * @module telegram/accounts
 */

import type { MoltbotConfig } from "../config/config.js";
import type { TelegramAccountConfig } from "../config/types.js";
import { isTruthyEnvValue } from "../infra/env.js";
import { listBoundAccountIds, resolveDefaultAgentBoundAccountId } from "../routing/bindings.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";
import { resolveTelegramToken } from "./token.js";

/**
 * 调试日志输出函数
 * 仅在 CLAWDBOT_DEBUG_TELEGRAM_ACCOUNTS 环境变量启用时输出
 */
const debugAccounts = (...args: unknown[]) => {
  if (isTruthyEnvValue(process.env.CLAWDBOT_DEBUG_TELEGRAM_ACCOUNTS)) {
    console.warn("[telegram:accounts]", ...args);
  }
};

/**
 * 已解析的 Telegram 账户信息
 */
export type ResolvedTelegramAccount = {
  /** 账户 ID */
  accountId: string;
  /** 是否启用 */
  enabled: boolean;
  /** 账户名称（可选） */
  name?: string;
  /** Bot 令牌 */
  token: string;
  /** 令牌来源：环境变量、令牌文件、配置或无 */
  tokenSource: "env" | "tokenFile" | "config" | "none";
  /** 账户配置 */
  config: TelegramAccountConfig;
};

/**
 * 列出配置文件中定义的账户 ID
 *
 * @param cfg - Moltbot 配置对象
 * @returns 账户 ID 数组
 */
function listConfiguredAccountIds(cfg: MoltbotConfig): string[] {
  const accounts = cfg.channels?.telegram?.accounts;
  if (!accounts || typeof accounts !== "object") return [];
  const ids = new Set<string>();
  for (const key of Object.keys(accounts)) {
    if (!key) continue;
    ids.add(normalizeAccountId(key));
  }
  return [...ids];
}

/**
 * 列出所有 Telegram 账户 ID
 * 合并配置文件中定义的账户和路由绑定的账户
 *
 * @param cfg - Moltbot 配置对象
 * @returns 排序后的账户 ID 数组，如果为空则返回默认账户
 */
export function listTelegramAccountIds(cfg: MoltbotConfig): string[] {
  const ids = Array.from(
    new Set([...listConfiguredAccountIds(cfg), ...listBoundAccountIds(cfg, "telegram")]),
  );
  debugAccounts("listTelegramAccountIds", ids);
  if (ids.length === 0) return [DEFAULT_ACCOUNT_ID];
  return ids.sort((a, b) => a.localeCompare(b));
}

/**
 * 解析默认 Telegram 账户 ID
 * 优先使用路由绑定的默认账户，否则使用配置中的第一个账户
 *
 * @param cfg - Moltbot 配置对象
 * @returns 默认账户 ID
 */
export function resolveDefaultTelegramAccountId(cfg: MoltbotConfig): string {
  const boundDefault = resolveDefaultAgentBoundAccountId(cfg, "telegram");
  if (boundDefault) return boundDefault;
  const ids = listTelegramAccountIds(cfg);
  if (ids.includes(DEFAULT_ACCOUNT_ID)) return DEFAULT_ACCOUNT_ID;
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}

/**
 * 解析指定账户的配置
 * 支持直接匹配和标准化后匹配
 *
 * @param cfg - Moltbot 配置对象
 * @param accountId - 账户 ID
 * @returns 账户配置，如果不存在则返回 undefined
 */
function resolveAccountConfig(
  cfg: MoltbotConfig,
  accountId: string,
): TelegramAccountConfig | undefined {
  const accounts = cfg.channels?.telegram?.accounts;
  if (!accounts || typeof accounts !== "object") return undefined;
  const direct = accounts[accountId] as TelegramAccountConfig | undefined;
  if (direct) return direct;
  const normalized = normalizeAccountId(accountId);
  const matchKey = Object.keys(accounts).find((key) => normalizeAccountId(key) === normalized);
  return matchKey ? (accounts[matchKey] as TelegramAccountConfig | undefined) : undefined;
}

/**
 * 合并 Telegram 账户配置
 * 将全局 Telegram 配置与账户特定配置合并，账户配置优先
 *
 * @param cfg - Moltbot 配置对象
 * @param accountId - 账户 ID
 * @returns 合并后的账户配置
 */
function mergeTelegramAccountConfig(cfg: MoltbotConfig, accountId: string): TelegramAccountConfig {
  const { accounts: _ignored, ...base } = (cfg.channels?.telegram ??
    {}) as TelegramAccountConfig & { accounts?: unknown };
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}

/**
 * 解析 Telegram 账户
 *
 * 根据账户 ID 解析完整的账户信息，包括配置、令牌和启用状态。
 * 如果未指定账户 ID，会尝试使用默认账户或有有效令牌的账户。
 *
 * @param params - 解析参数
 * @param params.cfg - Moltbot 配置对象
 * @param params.accountId - 账户 ID（可选）
 * @returns 已解析的账户信息
 */
export function resolveTelegramAccount(params: {
  cfg: MoltbotConfig;
  accountId?: string | null;
}): ResolvedTelegramAccount {
  const hasExplicitAccountId = Boolean(params.accountId?.trim());
  const baseEnabled = params.cfg.channels?.telegram?.enabled !== false;

  const resolve = (accountId: string) => {
    const merged = mergeTelegramAccountConfig(params.cfg, accountId);
    const accountEnabled = merged.enabled !== false;
    const enabled = baseEnabled && accountEnabled;
    const tokenResolution = resolveTelegramToken(params.cfg, { accountId });
    debugAccounts("resolve", {
      accountId,
      enabled,
      tokenSource: tokenResolution.source,
    });
    return {
      accountId,
      enabled,
      name: merged.name?.trim() || undefined,
      token: tokenResolution.token,
      tokenSource: tokenResolution.source,
      config: merged,
    } satisfies ResolvedTelegramAccount;
  };

  const normalized = normalizeAccountId(params.accountId);
  const primary = resolve(normalized);
  if (hasExplicitAccountId) return primary;
  if (primary.tokenSource !== "none") return primary;

  // If accountId is omitted, prefer a configured account token over failing on
  // the implicit "default" account. This keeps env-based setups working while
  // making config-only tokens work for things like heartbeats.
  const fallbackId = resolveDefaultTelegramAccountId(params.cfg);
  if (fallbackId === primary.accountId) return primary;
  const fallback = resolve(fallbackId);
  if (fallback.tokenSource === "none") return primary;
  return fallback;
}

/**
 * 列出所有已启用的 Telegram 账户
 *
 * @param cfg - Moltbot 配置对象
 * @returns 已启用账户的数组
 */
export function listEnabledTelegramAccounts(cfg: MoltbotConfig): ResolvedTelegramAccount[] {
  return listTelegramAccountIds(cfg)
    .map((accountId) => resolveTelegramAccount({ cfg, accountId }))
    .filter((account) => account.enabled);
}
