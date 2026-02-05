/**
 * 节点 Shell 命令模块
 *
 * 该模块提供跨平台的 shell 命令构建功能，
 * 根据目标平台选择合适的 shell 执行器。
 *
 * @module infra/node-shell
 */

/**
 * 构建节点 Shell 命令
 *
 * 根据平台选择合适的 shell：
 * - Windows: cmd.exe
 * - 其他: /bin/sh
 *
 * @param command - 要执行的命令
 * @param platform - 目标平台（可选）
 * @returns 命令参数数组
 */
export function buildNodeShellCommand(command: string, platform?: string | null) {
  const normalized = String(platform ?? "")
    .trim()
    .toLowerCase();
  if (normalized.startsWith("win")) {
    return ["cmd.exe", "/d", "/s", "/c", command];
  }
  return ["/bin/sh", "-lc", command];
}
