/**
 * 渠道工具模块
 *
 * 提供渠道相关的工具和操作查询功能，包括：
 * - 列出渠道支持的消息操作
 * - 聚合渠道提供的 agent 工具
 * - 解析渠道消息工具提示
 */

import { getChannelDock } from "../channels/dock.js";
import { getChannelPlugin, listChannelPlugins } from "../channels/plugins/index.js";
import { normalizeAnyChannelId } from "../channels/registry.js";
import type {
  ChannelAgentTool,
  ChannelMessageActionName,
  ChannelPlugin,
} from "../channels/plugins/types.js";
import type { MoltbotConfig } from "../config/config.js";
import { defaultRuntime } from "../runtime.js";

/**
 * Get the list of supported message actions for a specific channel.
 * Returns an empty array if channel is not found or has no actions configured.
 */
export function listChannelSupportedActions(params: {
  cfg?: MoltbotConfig;
  channel?: string;
}): ChannelMessageActionName[] {
  if (!params.channel) return [];
  const plugin = getChannelPlugin(params.channel as Parameters<typeof getChannelPlugin>[0]);
  if (!plugin?.actions?.listActions) return [];
  const cfg = params.cfg ?? ({} as MoltbotConfig);
  return runPluginListActions(plugin, cfg);
}

/**
 * Get the list of all supported message actions across all configured channels.
 */
export function listAllChannelSupportedActions(params: {
  cfg?: MoltbotConfig;
}): ChannelMessageActionName[] {
  const actions = new Set<ChannelMessageActionName>();
  for (const plugin of listChannelPlugins()) {
    if (!plugin.actions?.listActions) continue;
    const cfg = params.cfg ?? ({} as MoltbotConfig);
    const channelActions = runPluginListActions(plugin, cfg);
    for (const action of channelActions) {
      actions.add(action);
    }
  }
  return Array.from(actions);
}

/**
 * 列出渠道提供的 agent 工具
 *
 * 聚合所有渠道插件提供的工具（如登录工具等）。
 */
export function listChannelAgentTools(params: { cfg?: MoltbotConfig }): ChannelAgentTool[] {
  // Channel docking: aggregate channel-owned tools (login, etc.).
  const tools: ChannelAgentTool[] = [];
  for (const plugin of listChannelPlugins()) {
    const entry = plugin.agentTools;
    if (!entry) continue;
    const resolved = typeof entry === "function" ? entry(params) : entry;
    if (Array.isArray(resolved)) tools.push(...resolved);
  }
  return tools;
}

/**
 * 解析渠道消息工具提示
 *
 * 获取特定渠道的消息工具使用提示。
 */
export function resolveChannelMessageToolHints(params: {
  cfg?: MoltbotConfig;
  channel?: string | null;
  accountId?: string | null;
}): string[] {
  const channelId = normalizeAnyChannelId(params.channel);
  if (!channelId) return [];
  const dock = getChannelDock(channelId);
  const resolve = dock?.agentPrompt?.messageToolHints;
  if (!resolve) return [];
  const cfg = params.cfg ?? ({} as MoltbotConfig);
  return (resolve({ cfg, accountId: params.accountId }) ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const loggedListActionErrors = new Set<string>();

function runPluginListActions(
  plugin: ChannelPlugin,
  cfg: MoltbotConfig,
): ChannelMessageActionName[] {
  if (!plugin.actions?.listActions) return [];
  try {
    const listed = plugin.actions.listActions({ cfg });
    return Array.isArray(listed) ? listed : [];
  } catch (err) {
    logListActionsError(plugin.id, err);
    return [];
  }
}

function logListActionsError(pluginId: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const key = `${pluginId}:${message}`;
  if (loggedListActionErrors.has(key)) return;
  loggedListActionErrors.add(key);
  const stack = err instanceof Error && err.stack ? err.stack : null;
  const details = stack ?? message;
  defaultRuntime.error?.(`[channel-tools] ${pluginId}.actions.listActions failed: ${details}`);
}

export const __testing = {
  resetLoggedListActionErrors() {
    loggedListActionErrors.clear();
  },
};
