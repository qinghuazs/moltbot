/**
 * 渠道能力解析模块
 *
 * 解析各消息渠道（Telegram、Discord 等）的能力配置（capabilities），
 * 支持按账户级别和渠道级别的能力覆盖。
 * 能力配置可以是字符串数组（如 ["inlineButtons"]）或对象格式。
 */
import { normalizeChannelId } from "../channels/plugins/index.js";
import { normalizeAccountId } from "../routing/session-key.js";
import type { MoltbotConfig } from "./config.js";
import type { TelegramCapabilitiesConfig } from "./types.telegram.js";

type CapabilitiesConfig = TelegramCapabilitiesConfig;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

function normalizeCapabilities(capabilities: CapabilitiesConfig | undefined): string[] | undefined {
  // Handle object-format capabilities (e.g., { inlineButtons: "dm" }) gracefully.
  // Channel-specific handlers (like resolveTelegramInlineButtonsScope) process these separately.
  if (!isStringArray(capabilities)) return undefined;
  const normalized = capabilities.map((entry) => entry.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function resolveAccountCapabilities(params: {
  cfg?: { accounts?: Record<string, { capabilities?: CapabilitiesConfig }> } & {
    capabilities?: CapabilitiesConfig;
  };
  accountId?: string | null;
}): string[] | undefined {
  const cfg = params.cfg;
  if (!cfg) return undefined;
  const normalizedAccountId = normalizeAccountId(params.accountId);

  const accounts = cfg.accounts;
  if (accounts && typeof accounts === "object") {
    const direct = accounts[normalizedAccountId];
    if (direct) {
      return normalizeCapabilities(direct.capabilities) ?? normalizeCapabilities(cfg.capabilities);
    }
    const matchKey = Object.keys(accounts).find(
      (key) => key.toLowerCase() === normalizedAccountId.toLowerCase(),
    );
    const match = matchKey ? accounts[matchKey] : undefined;
    if (match) {
      return normalizeCapabilities(match.capabilities) ?? normalizeCapabilities(cfg.capabilities);
    }
  }

  return normalizeCapabilities(cfg.capabilities);
}

/**
 * 解析指定渠道的能力列表
 *
 * 按优先级查找：渠道配置 > 账户级配置 > 渠道默认配置。
 *
 * @param params.cfg - Moltbot 配置对象
 * @param params.channel - 渠道 ID（如 "telegram"）
 * @param params.accountId - 可选的账户 ID
 * @returns 能力字符串数组，或 undefined
 */
export function resolveChannelCapabilities(params: {
  cfg?: Partial<MoltbotConfig>;
  channel?: string | null;
  accountId?: string | null;
}): string[] | undefined {
  const cfg = params.cfg;
  const channel = normalizeChannelId(params.channel);
  if (!cfg || !channel) return undefined;

  const channelsConfig = cfg.channels as Record<string, unknown> | undefined;
  const channelConfig = (channelsConfig?.[channel] ?? (cfg as Record<string, unknown>)[channel]) as
    | {
        accounts?: Record<string, { capabilities?: CapabilitiesConfig }>;
        capabilities?: CapabilitiesConfig;
      }
    | undefined;
  return resolveAccountCapabilities({
    cfg: channelConfig,
    accountId: params.accountId,
  });
}
