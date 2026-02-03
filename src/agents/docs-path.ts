/**
 * 文档路径解析模块
 * 提供 Moltbot 文档目录路径的解析功能
 */
import fs from "node:fs";
import path from "node:path";

import { resolveMoltbotPackageRoot } from "../infra/moltbot-root.js";

/**
 * 解析 Moltbot 文档路径
 * 优先使用工作区目录，否则使用包根目录
 * @param params - 解析参数
 * @param params.workspaceDir - 工作区目录
 * @param params.argv1 - 命令行参数
 * @param params.cwd - 当前工作目录
 * @param params.moduleUrl - 模块 URL
 * @returns 文档目录路径，未找到返回 null
 */
export async function resolveMoltbotDocsPath(params: {
  workspaceDir?: string;
  argv1?: string;
  cwd?: string;
  moduleUrl?: string;
}): Promise<string | null> {
  const workspaceDir = params.workspaceDir?.trim();
  if (workspaceDir) {
    const workspaceDocs = path.join(workspaceDir, "docs");
    if (fs.existsSync(workspaceDocs)) return workspaceDocs;
  }

  const packageRoot = await resolveMoltbotPackageRoot({
    cwd: params.cwd,
    argv1: params.argv1,
    moduleUrl: params.moduleUrl,
  });
  if (!packageRoot) return null;

  const packageDocs = path.join(packageRoot, "docs");
  return fs.existsSync(packageDocs) ? packageDocs : null;
}
