/**
 * 配置环境变量收集模块
 *
 * 从 MoltbotConfig 中提取 env 配置段的环境变量键值对，
 * 用于在配置加载时注入到 process.env 中。
 */
import type { MoltbotConfig } from "./types.js";

/**
 * 从配置对象中收集环境变量
 *
 * 优先收集 env.vars 中的显式变量定义，
 * 然后收集 env 段下的其他字符串值（跳过 shellEnv 和 vars 子段）。
 *
 * @param cfg - Moltbot 配置对象
 * @returns 环境变量键值对映射
 */
export function collectConfigEnvVars(cfg?: MoltbotConfig): Record<string, string> {
  const envConfig = cfg?.env;
  if (!envConfig) return {};

  const entries: Record<string, string> = {};

  if (envConfig.vars) {
    for (const [key, value] of Object.entries(envConfig.vars)) {
      if (!value) continue;
      entries[key] = value;
    }
  }

  for (const [key, value] of Object.entries(envConfig)) {
    if (key === "shellEnv" || key === "vars") continue;
    if (typeof value !== "string" || !value.trim()) continue;
    entries[key] = value;
  }

  return entries;
}
