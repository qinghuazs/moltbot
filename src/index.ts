#!/usr/bin/env node
/**
 * Moltbot 主入口模块
 * 初始化环境、加载配置、构建 CLI 程序并导出公共 API
 */
import process from "node:process";
import { fileURLToPath } from "node:url";

import { getReplyFromConfig } from "./auto-reply/reply.js";
import { applyTemplate } from "./auto-reply/templating.js";
import { monitorWebChannel } from "./channel-web.js";
import { createDefaultDeps } from "./cli/deps.js";
import { promptYesNo } from "./cli/prompt.js";
import { waitForever } from "./cli/wait.js";
import { loadConfig } from "./config/config.js";
import {
  deriveSessionKey,
  loadSessionStore,
  resolveSessionKey,
  resolveStorePath,
  saveSessionStore,
} from "./config/sessions.js";
import { ensureBinary } from "./infra/binaries.js";
import { loadDotEnv } from "./infra/dotenv.js";
import { normalizeEnv } from "./infra/env.js";
import { isMainModule } from "./infra/is-main.js";
import { ensureMoltbotCliOnPath } from "./infra/path-env.js";
import {
  describePortOwner,
  ensurePortAvailable,
  handlePortError,
  PortInUseError,
} from "./infra/ports.js";
import { assertSupportedRuntime } from "./infra/runtime-guard.js";
import { formatUncaughtError } from "./infra/errors.js";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.js";
import { enableConsoleCapture } from "./logging.js";
import { runCommandWithTimeout, runExec } from "./process/exec.js";
import { assertWebChannel, normalizeE164, toWhatsappJid } from "./utils.js";

// 加载 .env 环境变量文件
loadDotEnv({ quiet: true });
// 规范化环境变量
normalizeEnv();
// 确保 moltbot CLI 在 PATH 中
ensureMoltbotCliOnPath();

// 捕获所有控制台输出到结构化日志，同时保持 stdout/stderr 行为
enableConsoleCapture();

// 在执行任何工作前强制检查最低支持的运行时版本
assertSupportedRuntime();

import { buildProgram } from "./cli/program.js";

// 构建 CLI 程序
const program = buildProgram();

// 导出公共 API
export {
  assertWebChannel,
  applyTemplate,
  createDefaultDeps,
  deriveSessionKey,
  describePortOwner,
  ensureBinary,
  ensurePortAvailable,
  getReplyFromConfig,
  handlePortError,
  loadConfig,
  loadSessionStore,
  monitorWebChannel,
  normalizeE164,
  PortInUseError,
  promptYesNo,
  resolveSessionKey,
  resolveStorePath,
  runCommandWithTimeout,
  runExec,
  saveSessionStore,
  toWhatsappJid,
  waitForever,
};

// 检查是否为主模块（直接运行而非被导入）
const isMain = isMainModule({
  currentFile: fileURLToPath(import.meta.url),
});

if (isMain) {
  // 全局错误处理器，防止未处理的 rejection/exception 导致静默崩溃
  // 这些处理器会记录错误并优雅退出，而不是无痕崩溃
  installUnhandledRejectionHandler();

  process.on("uncaughtException", (error) => {
    console.error("[moltbot] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  // 解析命令行参数并执行
  void program.parseAsync(process.argv).catch((err) => {
    console.error("[moltbot] CLI failed:", formatUncaughtError(err));
    process.exit(1);
  });
}
