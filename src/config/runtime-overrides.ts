/**
 * 运行时配置覆盖模块
 *
 * 提供运行时（内存中）的配置覆盖机制，用于 /debug 命令等场景。
 * 覆盖值不会持久化到磁盘，仅在当前进程生命周期内有效。
 * 覆盖值通过深度合并应用到配置对象上。
 */
import { parseConfigPath, setConfigValueAtPath, unsetConfigValueAtPath } from "./config-paths.js";
import type { MoltbotConfig } from "./types.js";

type OverrideTree = Record<string, unknown>;

let overrides: OverrideTree = {};

function mergeOverrides(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) return override;
  const next: OverrideTree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    next[key] = mergeOverrides((base as OverrideTree)[key], value);
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/** 获取当前所有运行时覆盖值 */
export function getConfigOverrides(): OverrideTree {
  return overrides;
}

/** 清除所有运行时覆盖值 */
export function resetConfigOverrides(): void {
  overrides = {};
}

/** 设置运行时配置覆盖值 */
export function setConfigOverride(
  pathRaw: string,
  value: unknown,
): {
  ok: boolean;
  error?: string;
} {
  const parsed = parseConfigPath(pathRaw);
  if (!parsed.ok || !parsed.path) {
    return { ok: false, error: parsed.error ?? "Invalid path." };
  }
  setConfigValueAtPath(overrides, parsed.path, value);
  return { ok: true };
}

/** 删除运行时配置覆盖值 */
export function unsetConfigOverride(pathRaw: string): {
  ok: boolean;
  removed: boolean;
  error?: string;
} {
  const parsed = parseConfigPath(pathRaw);
  if (!parsed.ok || !parsed.path) {
    return {
      ok: false,
      removed: false,
      error: parsed.error ?? "Invalid path.",
    };
  }
  const removed = unsetConfigValueAtPath(overrides, parsed.path);
  return { ok: true, removed };
}

/** 将运行时覆盖值深度合并到配置对象中 */
export function applyConfigOverrides(cfg: MoltbotConfig): MoltbotConfig {
  if (!overrides || Object.keys(overrides).length === 0) return cfg;
  return mergeOverrides(cfg, overrides) as MoltbotConfig;
}
