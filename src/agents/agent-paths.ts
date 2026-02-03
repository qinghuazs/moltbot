/**
 * Agent 路径解析模块
 * 提供 Agent 目录路径的解析和环境变量设置功能
 */
import path from "node:path";

import { resolveStateDir } from "../config/paths.js";
import { DEFAULT_AGENT_ID } from "../routing/session-key.js";
import { resolveUserPath } from "../utils.js";

/**
 * 解析 Moltbot Agent 目录路径
 * 优先使用环境变量覆盖，否则使用默认路径
 * @returns Agent 目录的绝对路径
 */
export function resolveMoltbotAgentDir(): string {
  // 检查环境变量覆盖
  const override =
    process.env.CLAWDBOT_AGENT_DIR?.trim() || process.env.PI_CODING_AGENT_DIR?.trim();
  if (override) return resolveUserPath(override);
  // 使用默认路径：~/.clawdbot/agents/<agentId>/agent
  const defaultAgentDir = path.join(resolveStateDir(), "agents", DEFAULT_AGENT_ID, "agent");
  return resolveUserPath(defaultAgentDir);
}

/**
 * 确保 Agent 环境变量已设置
 * 如果未设置，则自动设置为解析后的目录路径
 * @returns Agent 目录路径
 */
export function ensureMoltbotAgentEnv(): string {
  const dir = resolveMoltbotAgentDir();
  if (!process.env.CLAWDBOT_AGENT_DIR) process.env.CLAWDBOT_AGENT_DIR = dir;
  if (!process.env.PI_CODING_AGENT_DIR) process.env.PI_CODING_AGENT_DIR = dir;
  return dir;
}
