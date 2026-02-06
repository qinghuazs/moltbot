/**
 * 原生命令解析模块
 *
 * 解析各渠道（Discord、Telegram、Slack 等）是否启用原生命令和原生技能命令。
 * 支持三种设置模式：true（强制启用）、false（强制禁用）、"auto"（按渠道启发式判断）。
 * 默认情况下 Discord 和 Telegram 启用，Slack 禁用。
 */
import type { ChannelId } from "../channels/plugins/types.js";
import { normalizeChannelId } from "../channels/plugins/index.js";
import type { NativeCommandsSetting } from "./types.js";

/** 按渠道 ID 判断 "auto" 模式下的默认值 */
function resolveAutoDefault(providerId?: ChannelId): boolean {
  const id = normalizeChannelId(providerId);
  if (!id) return false;
  if (id === "discord" || id === "telegram") return true;
  if (id === "slack") return false;
  return false;
}

/**
 * 解析原生技能命令是否启用
 *
 * 优先使用渠道级设置，若未定义则回退到全局设置，
 * 若仍未定义则按渠道启发式判断。
 */
export function resolveNativeSkillsEnabled(params: {
  providerId: ChannelId;
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) return true;
  if (setting === false) return false;
  return resolveAutoDefault(providerId);
}

/**
 * 解析原生命令是否启用
 *
 * 逻辑同 resolveNativeSkillsEnabled，用于常规原生命令。
 */
export function resolveNativeCommandsEnabled(params: {
  providerId: ChannelId;
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) return true;
  if (setting === false) return false;
  // auto or undefined -> heuristic
  return resolveAutoDefault(providerId);
}

/** 判断原生命令是否被显式禁用（区别于 "auto" 或未设置） */
export function isNativeCommandsExplicitlyDisabled(params: {
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerSetting, globalSetting } = params;
  if (providerSetting === false) return true;
  if (providerSetting === undefined) return globalSetting === false;
  return false;
}
