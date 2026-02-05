/**
 * 启动文件模块
 *
 * 提供 agent 启动时加载上下文文件的功能，包括：
 * - 加载工作目录中的启动文件
 * - 按会话过滤启动文件
 * - 应用钩子覆盖
 * - 构建嵌入式上下文文件
 */

import type { MoltbotConfig } from "../config/config.js";
import { applyBootstrapHookOverrides } from "./bootstrap-hooks.js";
import {
  filterBootstrapFilesForSession,
  loadWorkspaceBootstrapFiles,
  type WorkspaceBootstrapFile,
} from "./workspace.js";
import { buildBootstrapContextFiles, resolveBootstrapMaxChars } from "./pi-embedded-helpers.js";
import type { EmbeddedContextFile } from "./pi-embedded-helpers.js";

/**
 * 创建启动警告函数
 * 为警告消息添加会话标签
 */
export function makeBootstrapWarn(params: {
  sessionLabel: string;
  warn?: (message: string) => void;
}): ((message: string) => void) | undefined {
  if (!params.warn) return undefined;
  return (message: string) => params.warn?.(`${message} (sessionKey=${params.sessionLabel})`);
}

/**
 * 解析运行时的启动文件
 *
 * 加载工作目录中的启动文件，按会话过滤，并应用钩子覆盖。
 */
export async function resolveBootstrapFilesForRun(params: {
  workspaceDir: string;
  config?: MoltbotConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
}): Promise<WorkspaceBootstrapFile[]> {
  const sessionKey = params.sessionKey ?? params.sessionId;
  const bootstrapFiles = filterBootstrapFilesForSession(
    await loadWorkspaceBootstrapFiles(params.workspaceDir),
    sessionKey,
  );
  return applyBootstrapHookOverrides({
    files: bootstrapFiles,
    workspaceDir: params.workspaceDir,
    config: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    agentId: params.agentId,
  });
}

/**
 * 解析运行时的启动上下文
 *
 * 加载启动文件并构建嵌入式上下文文件。
 *
 * @returns 启动文件列表和上下文文件列表
 */
export async function resolveBootstrapContextForRun(params: {
  workspaceDir: string;
  config?: MoltbotConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  warn?: (message: string) => void;
}): Promise<{
  bootstrapFiles: WorkspaceBootstrapFile[];
  contextFiles: EmbeddedContextFile[];
}> {
  const bootstrapFiles = await resolveBootstrapFilesForRun(params);
  const contextFiles = buildBootstrapContextFiles(bootstrapFiles, {
    maxChars: resolveBootstrapMaxChars(params.config),
    warn: params.warn,
  });
  return { bootstrapFiles, contextFiles };
}
