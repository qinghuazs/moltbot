/**
 * Discord 连接探测模块
 *
 * 该模块提供了 Discord Bot 连接状态检测功能，包括：
 * - Token 有效性验证
 * - Bot 用户信息获取
 * - 应用程序权限标志解析
 * - 特权意图（Privileged Intents）状态检查
 *
 * @module discord/probe
 */

import { resolveFetch } from "../infra/fetch.js";
import { normalizeDiscordToken } from "./token.js";

/** Discord API v10 基础 URL */
const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Discord 探测结果
 *
 * 包含 Token 验证结果、Bot 信息和应用程序配置。
 */
export type DiscordProbe = {
  /** 探测是否成功 */
  ok: boolean;
  /** HTTP 状态码（失败时） */
  status?: number | null;
  /** 错误信息（失败时） */
  error?: string | null;
  /** 探测耗时（毫秒） */
  elapsedMs: number;
  /** Bot 用户信息 */
  bot?: { id?: string | null; username?: string | null };
  /** 应用程序配置摘要 */
  application?: DiscordApplicationSummary;
};

/**
 * 特权意图状态
 *
 * - "enabled": 已启用
 * - "limited": 受限（需要验证）
 * - "disabled": 已禁用
 */
export type DiscordPrivilegedIntentStatus = "enabled" | "limited" | "disabled";

/**
 * 特权意图摘要
 *
 * 包含三种特权意图的启用状态。
 */
export type DiscordPrivilegedIntentsSummary = {
  /** 消息内容意图状态 */
  messageContent: DiscordPrivilegedIntentStatus;
  /** 服务器成员意图状态 */
  guildMembers: DiscordPrivilegedIntentStatus;
  /** 在线状态意图状态 */
  presence: DiscordPrivilegedIntentStatus;
};

/**
 * 应用程序配置摘要
 *
 * 包含应用程序 ID、标志位和特权意图状态。
 */
export type DiscordApplicationSummary = {
  /** 应用程序 ID */
  id?: string | null;
  /** 应用程序标志位 */
  flags?: number | null;
  /** 特权意图状态摘要 */
  intents?: DiscordPrivilegedIntentsSummary;
};

// ============================================================================
// 应用程序标志位常量
// ============================================================================

/** 在线状态网关意图（已启用） */
const DISCORD_APP_FLAG_GATEWAY_PRESENCE = 1 << 12;
/** 在线状态网关意图（受限） */
const DISCORD_APP_FLAG_GATEWAY_PRESENCE_LIMITED = 1 << 13;
/** 服务器成员网关意图（已启用） */
const DISCORD_APP_FLAG_GATEWAY_GUILD_MEMBERS = 1 << 14;
/** 服务器成员网关意图（受限） */
const DISCORD_APP_FLAG_GATEWAY_GUILD_MEMBERS_LIMITED = 1 << 15;
/** 消息内容网关意图（已启用） */
const DISCORD_APP_FLAG_GATEWAY_MESSAGE_CONTENT = 1 << 18;
/** 消息内容网关意图（受限） */
const DISCORD_APP_FLAG_GATEWAY_MESSAGE_CONTENT_LIMITED = 1 << 19;

/**
 * 从应用程序标志位解析特权意图状态
 *
 * @param flags - 应用程序标志位
 * @returns 特权意图状态摘要
 */
export function resolveDiscordPrivilegedIntentsFromFlags(
  flags: number,
): DiscordPrivilegedIntentsSummary {
  // 辅助函数：根据启用位和受限位判断状态
  const resolve = (enabledBit: number, limitedBit: number) => {
    if ((flags & enabledBit) !== 0) return "enabled";
    if ((flags & limitedBit) !== 0) return "limited";
    return "disabled";
  };
  return {
    presence: resolve(DISCORD_APP_FLAG_GATEWAY_PRESENCE, DISCORD_APP_FLAG_GATEWAY_PRESENCE_LIMITED),
    guildMembers: resolve(
      DISCORD_APP_FLAG_GATEWAY_GUILD_MEMBERS,
      DISCORD_APP_FLAG_GATEWAY_GUILD_MEMBERS_LIMITED,
    ),
    messageContent: resolve(
      DISCORD_APP_FLAG_GATEWAY_MESSAGE_CONTENT,
      DISCORD_APP_FLAG_GATEWAY_MESSAGE_CONTENT_LIMITED,
    ),
  };
}

/**
 * 获取 Discord 应用程序配置摘要
 *
 * 调用 OAuth2 应用程序 API 获取应用程序信息和特权意图状态。
 *
 * @param token - Discord Bot Token
 * @param timeoutMs - 请求超时时间（毫秒）
 * @param fetcher - 可选的自定义 fetch 实现
 * @returns 应用程序配置摘要，失败时返回 undefined
 */
export async function fetchDiscordApplicationSummary(
  token: string,
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
): Promise<DiscordApplicationSummary | undefined> {
  const normalized = normalizeDiscordToken(token);
  if (!normalized) return undefined;
  try {
    const res = await fetchWithTimeout(
      `${DISCORD_API_BASE}/oauth2/applications/@me`,
      timeoutMs,
      fetcher,
      {
        Authorization: `Bot ${normalized}`,
      },
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as { id?: string; flags?: number };
    const flags =
      typeof json.flags === "number" && Number.isFinite(json.flags) ? json.flags : undefined;
    return {
      id: json.id ?? null,
      flags: flags ?? null,
      intents:
        typeof flags === "number" ? resolveDiscordPrivilegedIntentsFromFlags(flags) : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * 带超时的 HTTP 请求
 *
 * @param url - 请求 URL
 * @param timeoutMs - 超时时间（毫秒）
 * @param fetcher - fetch 实现
 * @param headers - 请求头
 * @returns HTTP 响应
 * @throws 超时或网络错误时抛出异常
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  fetcher: typeof fetch,
  headers?: HeadersInit,
): Promise<Response> {
  const fetchImpl = resolveFetch(fetcher);
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 探测 Discord Bot 连接状态
 *
 * 验证 Token 有效性并获取 Bot 用户信息。
 * 可选地获取应用程序配置以检查特权意图状态。
 *
 * @param token - Discord Bot Token
 * @param timeoutMs - 请求超时时间（毫秒）
 * @param opts - 探测选项
 * @param opts.fetcher - 可选的自定义 fetch 实现
 * @param opts.includeApplication - 是否包含应用程序配置信息
 * @returns 探测结果
 */
export async function probeDiscord(
  token: string,
  timeoutMs: number,
  opts?: { fetcher?: typeof fetch; includeApplication?: boolean },
): Promise<DiscordProbe> {
  const started = Date.now();
  const fetcher = opts?.fetcher ?? fetch;
  const includeApplication = opts?.includeApplication === true;
  const normalized = normalizeDiscordToken(token);
  const result: DiscordProbe = {
    ok: false,
    status: null,
    error: null,
    elapsedMs: 0,
  };
  if (!normalized) {
    return {
      ...result,
      error: "missing token",
      elapsedMs: Date.now() - started,
    };
  }
  try {
    const res = await fetchWithTimeout(`${DISCORD_API_BASE}/users/@me`, timeoutMs, fetcher, {
      Authorization: `Bot ${normalized}`,
    });
    if (!res.ok) {
      result.status = res.status;
      result.error = `getMe failed (${res.status})`;
      return { ...result, elapsedMs: Date.now() - started };
    }
    const json = (await res.json()) as { id?: string; username?: string };
    result.ok = true;
    result.bot = {
      id: json.id ?? null,
      username: json.username ?? null,
    };
    if (includeApplication) {
      result.application =
        (await fetchDiscordApplicationSummary(normalized, timeoutMs, fetcher)) ?? undefined;
    }
    return { ...result, elapsedMs: Date.now() - started };
  } catch (err) {
    return {
      ...result,
      status: err instanceof Response ? err.status : result.status,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - started,
    };
  }
}

/**
 * 获取 Discord 应用程序 ID
 *
 * 调用 OAuth2 应用程序 API 获取应用程序 ID。
 *
 * @param token - Discord Bot Token
 * @param timeoutMs - 请求超时时间（毫秒）
 * @param fetcher - 可选的自定义 fetch 实现
 * @returns 应用程序 ID，失败时返回 undefined
 */
export async function fetchDiscordApplicationId(
  token: string,
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
): Promise<string | undefined> {
  const normalized = normalizeDiscordToken(token);
  if (!normalized) return undefined;
  try {
    const res = await fetchWithTimeout(
      `${DISCORD_API_BASE}/oauth2/applications/@me`,
      timeoutMs,
      fetcher,
      {
        Authorization: `Bot ${normalized}`,
      },
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as { id?: string };
    return json.id ?? undefined;
  } catch {
    return undefined;
  }
}
