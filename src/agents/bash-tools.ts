/**
 * Bash 工具模块
 *
 * 该模块导出 Bash 命令执行和进程管理相关的工具，
 * 用于代理执行 shell 命令和管理后台进程。
 *
 * @module agents/bash-tools
 */

export type {
  BashSandboxConfig,
  ExecElevatedDefaults,
  ExecToolDefaults,
  ExecToolDetails,
} from "./bash-tools.exec.js";
export { createExecTool, execTool } from "./bash-tools.exec.js";
export type { ProcessToolDefaults } from "./bash-tools.process.js";
export { createProcessTool, processTool } from "./bash-tools.process.js";
