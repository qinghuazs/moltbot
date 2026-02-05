/**
 * 诊断标志模块
 *
 * 提供诊断标志的解析和匹配功能，用于：
 * - 启用/禁用特定的诊断功能
 * - 支持通配符匹配（如 "agent.*"）
 * - 从配置和环境变量中读取标志
 */

import type { MoltbotConfig } from "../config/config.js";

/** 诊断标志环境变量名 */
const DIAGNOSTICS_ENV = "CLAWDBOT_DIAGNOSTICS";

/**
 * 规范化标志名称
 */
function normalizeFlag(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 解析环境变量中的标志
 */
function parseEnvFlags(raw?: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const lowered = trimmed.toLowerCase();
  if (["0", "false", "off", "none"].includes(lowered)) return [];
  if (["1", "true", "all", "*"].includes(lowered)) return ["*"];
  return trimmed
    .split(/[,\s]+/)
    .map(normalizeFlag)
    .filter(Boolean);
}

/**
 * 去重标志列表
 */
function uniqueFlags(flags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const flag of flags) {
    const normalized = normalizeFlag(flag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/**
 * 解析诊断标志
 *
 * 从配置和环境变量中读取并合并诊断标志。
 */
export function resolveDiagnosticFlags(
  cfg?: MoltbotConfig,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const configFlags = Array.isArray(cfg?.diagnostics?.flags) ? cfg?.diagnostics?.flags : [];
  const envFlags = parseEnvFlags(env[DIAGNOSTICS_ENV]);
  return uniqueFlags([...configFlags, ...envFlags]);
}

/**
 * 检查标志是否匹配已启用的标志列表
 *
 * 支持通配符匹配：
 * - "*" 或 "all" 匹配所有
 * - "prefix.*" 匹配 prefix 及其子标志
 * - "prefix*" 匹配以 prefix 开头的标志
 */
export function matchesDiagnosticFlag(flag: string, enabledFlags: string[]): boolean {
  const target = normalizeFlag(flag);
  if (!target) return false;
  for (const raw of enabledFlags) {
    const enabled = normalizeFlag(raw);
    if (!enabled) continue;
    if (enabled === "*" || enabled === "all") return true;
    if (enabled.endsWith(".*")) {
      const prefix = enabled.slice(0, -2);
      if (target === prefix || target.startsWith(`${prefix}.`)) return true;
    }
    if (enabled.endsWith("*")) {
      const prefix = enabled.slice(0, -1);
      if (target.startsWith(prefix)) return true;
    }
    if (enabled === target) return true;
  }
  return false;
}

/**
 * 检查诊断标志是否启用
 */
export function isDiagnosticFlagEnabled(
  flag: string,
  cfg?: MoltbotConfig,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const flags = resolveDiagnosticFlags(cfg, env);
  return matchesDiagnosticFlag(flag, flags);
}
