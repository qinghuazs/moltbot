/**
 * 代理目录管理模块
 *
 * 检测多代理配置中是否存在重复的 agentDir（代理工作目录），
 * 防止多个代理共享同一目录导致认证/会话状态冲突和令牌失效。
 */
import os from "node:os";
import path from "node:path";
import { DEFAULT_AGENT_ID, normalizeAgentId } from "../routing/session-key.js";
import { resolveUserPath } from "../utils.js";
import { resolveStateDir } from "./paths.js";
import type { MoltbotConfig } from "./types.js";

/** 重复代理目录信息 */
export type DuplicateAgentDir = {
  /** 共享的目录路径 */
  agentDir: string;
  /** 使用该目录的代理 ID 列表 */
  agentIds: string[];
};

/** 重复代理目录错误，包含冲突详情 */
export class DuplicateAgentDirError extends Error {
  readonly duplicates: DuplicateAgentDir[];

  constructor(duplicates: DuplicateAgentDir[]) {
    super(formatDuplicateAgentDirError(duplicates));
    this.name = "DuplicateAgentDirError";
    this.duplicates = duplicates;
  }
}

/** 规范化代理目录路径（macOS/Windows 不区分大小写） */
function canonicalizeAgentDir(agentDir: string): string {
  const resolved = path.resolve(agentDir);
  if (process.platform === "darwin" || process.platform === "win32") {
    return resolved.toLowerCase();
  }
  return resolved;
}

/** 从配置中收集所有被引用的代理 ID（包括 agents.list 和 bindings） */
function collectReferencedAgentIds(cfg: MoltbotConfig): string[] {
  const ids = new Set<string>();

  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents?.list : [];
  const defaultAgentId =
    agents.find((agent) => agent?.default)?.id ?? agents[0]?.id ?? DEFAULT_AGENT_ID;
  ids.add(normalizeAgentId(defaultAgentId));

  for (const entry of agents) {
    if (entry?.id) ids.add(normalizeAgentId(entry.id));
  }

  const bindings = cfg.bindings;
  if (Array.isArray(bindings)) {
    for (const binding of bindings) {
      const id = binding?.agentId;
      if (typeof id === "string" && id.trim()) {
        ids.add(normalizeAgentId(id));
      }
    }
  }

  return [...ids];
}

/** 解析代理的实际工作目录（优先使用配置中的 agentDir，否则使用默认路径） */
function resolveEffectiveAgentDir(
  cfg: MoltbotConfig,
  agentId: string,
  deps?: { env?: NodeJS.ProcessEnv; homedir?: () => string },
): string {
  const id = normalizeAgentId(agentId);
  const configured = Array.isArray(cfg.agents?.list)
    ? cfg.agents?.list.find((agent) => normalizeAgentId(agent.id) === id)?.agentDir
    : undefined;
  const trimmed = configured?.trim();
  if (trimmed) return resolveUserPath(trimmed);
  const root = resolveStateDir(deps?.env ?? process.env, deps?.homedir ?? os.homedir);
  return path.join(root, "agents", id, "agent");
}

/**
 * 查找配置中重复的代理目录
 *
 * 遍历所有被引用的代理 ID，解析其工作目录，
 * 返回多个代理共享同一目录的冲突列表。
 */
export function findDuplicateAgentDirs(
  cfg: MoltbotConfig,
  deps?: { env?: NodeJS.ProcessEnv; homedir?: () => string },
): DuplicateAgentDir[] {
  const byDir = new Map<string, { agentDir: string; agentIds: string[] }>();

  for (const agentId of collectReferencedAgentIds(cfg)) {
    const agentDir = resolveEffectiveAgentDir(cfg, agentId, deps);
    const key = canonicalizeAgentDir(agentDir);
    const entry = byDir.get(key);
    if (entry) {
      entry.agentIds.push(agentId);
    } else {
      byDir.set(key, { agentDir, agentIds: [agentId] });
    }
  }

  return [...byDir.values()].filter((v) => v.agentIds.length > 1);
}

/** 格式化重复代理目录的错误信息，包含修复建议 */
export function formatDuplicateAgentDirError(dups: DuplicateAgentDir[]): string {
  const lines: string[] = [
    "Duplicate agentDir detected (multi-agent config).",
    "Each agent must have a unique agentDir; sharing it causes auth/session state collisions and token invalidation.",
    "",
    "Conflicts:",
    ...dups.map((d) => `- ${d.agentDir}: ${d.agentIds.map((id) => `"${id}"`).join(", ")}`),
    "",
    "Fix: remove the shared agents.list[].agentDir override (or give each agent its own directory).",
    "If you want to share credentials, copy auth-profiles.json instead of sharing the entire agentDir.",
  ];
  return lines.join("\n");
}
