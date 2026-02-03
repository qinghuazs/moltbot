/**
 * 渠道插件注册表模块
 * 管理渠道插件的注册、查找和配置
 *
 * 此模块是"重量级"的（插件可能导入渠道监控、Web 登录等）。
 * 共享代码路径（回复流程、命令认证、沙箱解释）应依赖 `src/channels/dock.ts`，
 * 仅在执行边界调用 `getChannelPlugin()`。
 *
 * 渠道插件由插件加载器注册（extensions/ 或配置的路径）。
 */
import { CHAT_CHANNEL_ORDER, type ChatChannelId, normalizeAnyChannelId } from "../registry.js";
import type { ChannelId, ChannelPlugin } from "./types.js";
import { requireActivePluginRegistry } from "../../plugins/runtime.js";

/**
 * 列出所有插件渠道
 * @returns 渠道插件数组
 */
function listPluginChannels(): ChannelPlugin[] {
  const registry = requireActivePluginRegistry();
  return registry.channels.map((entry) => entry.plugin);
}

/**
 * 去重渠道列表
 * @param channels - 渠道插件数组
 * @returns 去重后的渠道插件数组
 */
function dedupeChannels(channels: ChannelPlugin[]): ChannelPlugin[] {
  const seen = new Set<string>();
  const resolved: ChannelPlugin[] = [];
  for (const plugin of channels) {
    const id = String(plugin.id).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    resolved.push(plugin);
  }
  return resolved;
}

/**
 * 列出所有渠道插件（已排序）
 * @returns 排序后的渠道插件数组
 */
export function listChannelPlugins(): ChannelPlugin[] {
  const combined = dedupeChannels(listPluginChannels());
  return combined.sort((a, b) => {
    const indexA = CHAT_CHANNEL_ORDER.indexOf(a.id as ChatChannelId);
    const indexB = CHAT_CHANNEL_ORDER.indexOf(b.id as ChatChannelId);
    const orderA = a.meta.order ?? (indexA === -1 ? 999 : indexA);
    const orderB = b.meta.order ?? (indexB === -1 ? 999 : indexB);
    if (orderA !== orderB) return orderA - orderB;
    return a.id.localeCompare(b.id);
  });
}

/**
 * 根据 ID 获取渠道插件
 * @param id - 渠道 ID
 * @returns 渠道插件，未找到返回 undefined
 */
export function getChannelPlugin(id: ChannelId): ChannelPlugin | undefined {
  const resolvedId = String(id).trim();
  if (!resolvedId) return undefined;
  return listChannelPlugins().find((plugin) => plugin.id === resolvedId);
}

/**
 * 规范化渠道 ID
 * 渠道对接：保持输入规范化集中在 src/channels/registry.ts
 * 调用前必须初始化插件注册表
 * @param raw - 原始渠道 ID
 * @returns 规范化后的渠道 ID
 */
export function normalizeChannelId(raw?: string | null): ChannelId | null {
  return normalizeAnyChannelId(raw);
}

// 目录配置导出
export {
  listDiscordDirectoryGroupsFromConfig,
  listDiscordDirectoryPeersFromConfig,
  listSlackDirectoryGroupsFromConfig,
  listSlackDirectoryPeersFromConfig,
  listTelegramDirectoryGroupsFromConfig,
  listTelegramDirectoryPeersFromConfig,
  listWhatsAppDirectoryGroupsFromConfig,
  listWhatsAppDirectoryPeersFromConfig,
} from "./directory-config.js";

// 渠道配置导出
export {
  applyChannelMatchMeta,
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatch,
  resolveChannelEntryMatchWithFallback,
  resolveChannelMatchConfig,
  resolveNestedAllowlistDecision,
  type ChannelEntryMatch,
  type ChannelMatchSource,
} from "./channel-config.js";

// 允许列表匹配导出
export {
  formatAllowlistMatchMeta,
  type AllowlistMatch,
  type AllowlistMatchSource,
} from "./allowlist-match.js";

// 类型导出
export type { ChannelId, ChannelPlugin } from "./types.js";
