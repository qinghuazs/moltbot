/**
 * 启动钩子模块
 *
 * 提供 agent 启动时的钩子处理功能，允许通过钩子自定义启动文件列表。
 */

import type { MoltbotConfig } from "../config/config.js";
import { createInternalHookEvent, triggerInternalHook } from "../hooks/internal-hooks.js";
import type { AgentBootstrapHookContext } from "../hooks/internal-hooks.js";
import { resolveAgentIdFromSessionKey } from "../routing/session-key.js";
import type { WorkspaceBootstrapFile } from "./workspace.js";

/**
 * 应用启动钩子覆盖
 *
 * 触发 agent.bootstrap 钩子，允许钩子修改启动文件列表。
 *
 * @param params.files - 原始启动文件列表
 * @param params.workspaceDir - 工作目录
 * @param params.config - 配置对象
 * @param params.sessionKey - 会话键
 * @param params.sessionId - 会话 ID
 * @param params.agentId - Agent ID
 * @returns 可能被钩子修改后的启动文件列表
 */
export async function applyBootstrapHookOverrides(params: {
  files: WorkspaceBootstrapFile[];
  workspaceDir: string;
  config?: MoltbotConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
}): Promise<WorkspaceBootstrapFile[]> {
  const sessionKey = params.sessionKey ?? params.sessionId ?? "unknown";
  const agentId =
    params.agentId ??
    (params.sessionKey ? resolveAgentIdFromSessionKey(params.sessionKey) : undefined);
  const context: AgentBootstrapHookContext = {
    workspaceDir: params.workspaceDir,
    bootstrapFiles: params.files,
    cfg: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    agentId,
  };
  const event = createInternalHookEvent("agent", "bootstrap", sessionKey, context);
  await triggerInternalHook(event);
  const updated = (event.context as AgentBootstrapHookContext).bootstrapFiles;
  return Array.isArray(updated) ? updated : params.files;
}
