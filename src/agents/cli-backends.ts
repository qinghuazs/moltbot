/**
 * CLI 后端配置模块
 *
 * 该模块负责管理 CLI 后端的配置，包括：
 * - Claude CLI 后端
 * - Codex CLI 后端
 * - 自定义 CLI 后端
 *
 * @module agents/cli-backends
 */

import type { MoltbotConfig } from "../config/config.js";
import type { CliBackendConfig } from "../config/types.js";
import { normalizeProviderId } from "./model-selection.js";

/** 已解析的 CLI 后端 */
export type ResolvedCliBackend = {
  /** 后端 ID */
  id: string;
  /** 后端配置 */
  config: CliBackendConfig;
};

/** Claude 模型别名映射 */
const CLAUDE_MODEL_ALIASES: Record<string, string> = {
  opus: "opus",
  "opus-4.5": "opus",
  "opus-4": "opus",
  "claude-opus-4-5": "opus",
  "claude-opus-4": "opus",
  sonnet: "sonnet",
  "sonnet-4.5": "sonnet",
  "sonnet-4.1": "sonnet",
  "sonnet-4.0": "sonnet",
  "claude-sonnet-4-5": "sonnet",
  "claude-sonnet-4-1": "sonnet",
  "claude-sonnet-4-0": "sonnet",
  haiku: "haiku",
  "haiku-3.5": "haiku",
  "claude-haiku-3-5": "haiku",
};

/** 默认 Claude CLI 后端配置 */
const DEFAULT_CLAUDE_BACKEND: CliBackendConfig = {
  command: "claude",
  args: ["-p", "--output-format", "json", "--dangerously-skip-permissions"],
  resumeArgs: [
    "-p",
    "--output-format",
    "json",
    "--dangerously-skip-permissions",
    "--resume",
    "{sessionId}",
  ],
  output: "json",
  input: "arg",
  modelArg: "--model",
  modelAliases: CLAUDE_MODEL_ALIASES,
  sessionArg: "--session-id",
  sessionMode: "always",
  sessionIdFields: ["session_id", "sessionId", "conversation_id", "conversationId"],
  systemPromptArg: "--append-system-prompt",
  systemPromptMode: "append",
  systemPromptWhen: "first",
  clearEnv: ["ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY_OLD"],
  serialize: true,
};

/** 默认 Codex CLI 后端配置 */
const DEFAULT_CODEX_BACKEND: CliBackendConfig = {
  command: "codex",
  args: ["exec", "--json", "--color", "never", "--sandbox", "read-only", "--skip-git-repo-check"],
  resumeArgs: [
    "exec",
    "resume",
    "{sessionId}",
    "--color",
    "never",
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
  ],
  output: "jsonl",
  resumeOutput: "text",
  input: "arg",
  modelArg: "--model",
  sessionIdFields: ["thread_id"],
  sessionMode: "existing",
  imageArg: "--image",
  imageMode: "repeat",
  serialize: true,
};

/**
 * 标准化后端键名
 */
function normalizeBackendKey(key: string): string {
  return normalizeProviderId(key);
}

/**
 * 从配置中选择后端配置
 */
function pickBackendConfig(
  config: Record<string, CliBackendConfig>,
  normalizedId: string,
): CliBackendConfig | undefined {
  for (const [key, entry] of Object.entries(config)) {
    if (normalizeBackendKey(key) === normalizedId) return entry;
  }
  return undefined;
}

/**
 * 合并后端配置
 */
function mergeBackendConfig(base: CliBackendConfig, override?: CliBackendConfig): CliBackendConfig {
  if (!override) return { ...base };
  return {
    ...base,
    ...override,
    args: override.args ?? base.args,
    env: { ...base.env, ...override.env },
    modelAliases: { ...base.modelAliases, ...override.modelAliases },
    clearEnv: Array.from(new Set([...(base.clearEnv ?? []), ...(override.clearEnv ?? [])])),
    sessionIdFields: override.sessionIdFields ?? base.sessionIdFields,
    sessionArgs: override.sessionArgs ?? base.sessionArgs,
    resumeArgs: override.resumeArgs ?? base.resumeArgs,
  };
}

/**
 * 解析所有 CLI 后端 ID
 *
 * @param cfg - 配置对象
 * @returns 后端 ID 集合
 */
export function resolveCliBackendIds(cfg?: MoltbotConfig): Set<string> {
  const ids = new Set<string>([
    normalizeBackendKey("claude-cli"),
    normalizeBackendKey("codex-cli"),
  ]);
  const configured = cfg?.agents?.defaults?.cliBackends ?? {};
  for (const key of Object.keys(configured)) {
    ids.add(normalizeBackendKey(key));
  }
  return ids;
}

/**
 * 解析 CLI 后端配置
 *
 * @param provider - 提供商标识
 * @param cfg - 配置对象
 * @returns 已解析的后端配置，未找到返回 null
 */
export function resolveCliBackendConfig(
  provider: string,
  cfg?: MoltbotConfig,
): ResolvedCliBackend | null {
  const normalized = normalizeBackendKey(provider);
  const configured = cfg?.agents?.defaults?.cliBackends ?? {};
  const override = pickBackendConfig(configured, normalized);

  if (normalized === "claude-cli") {
    const merged = mergeBackendConfig(DEFAULT_CLAUDE_BACKEND, override);
    const command = merged.command?.trim();
    if (!command) return null;
    return { id: normalized, config: { ...merged, command } };
  }
  if (normalized === "codex-cli") {
    const merged = mergeBackendConfig(DEFAULT_CODEX_BACKEND, override);
    const command = merged.command?.trim();
    if (!command) return null;
    return { id: normalized, config: { ...merged, command } };
  }

  if (!override) return null;
  const command = override.command?.trim();
  if (!command) return null;
  return { id: normalized, config: { ...override, command } };
}
