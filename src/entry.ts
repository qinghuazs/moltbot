#!/usr/bin/env node
/**
 * Moltbot CLI 入口点
 * 负责进程初始化、实验性警告抑制、Windows 参数规范化和 CLI 配置文件处理
 */
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { applyCliProfileEnv, parseCliProfileArgs } from "./cli/profile.js";
import { isTruthyEnvValue } from "./infra/env.js";
import { installProcessWarningFilter } from "./infra/warnings.js";
import { attachChildProcessBridge } from "./process/child-process-bridge.js";

// 设置进程标题
process.title = "moltbot";
// 安装进程警告过滤器
installProcessWarningFilter();

// 处理 --no-color 参数
if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
}

// 用于抑制 Node.js 实验性功能警告的标志
const EXPERIMENTAL_WARNING_FLAG = "--disable-warning=ExperimentalWarning";

/**
 * 检查 NODE_OPTIONS 中是否已抑制实验性警告
 * @param nodeOptions - NODE_OPTIONS 环境变量值
 * @returns 是否已抑制
 */
function hasExperimentalWarningSuppressed(nodeOptions: string): boolean {
  if (!nodeOptions) return false;
  return nodeOptions.includes(EXPERIMENTAL_WARNING_FLAG) || nodeOptions.includes("--no-warnings");
}

/**
 * 确保实验性警告被抑制
 * 如果未抑制，则重新生成进程并添加抑制标志
 * @returns 如果重新生成了进程返回 true，父进程应停止继续执行
 */
function ensureExperimentalWarningSuppressed(): boolean {
  if (isTruthyEnvValue(process.env.CLAWDBOT_NO_RESPAWN)) return false;
  if (isTruthyEnvValue(process.env.CLAWDBOT_NODE_OPTIONS_READY)) return false;
  const nodeOptions = process.env.NODE_OPTIONS ?? "";
  if (hasExperimentalWarningSuppressed(nodeOptions)) return false;

  // 标记已处理，避免无限循环
  process.env.CLAWDBOT_NODE_OPTIONS_READY = "1";
  process.env.NODE_OPTIONS = `${nodeOptions} ${EXPERIMENTAL_WARNING_FLAG}`.trim();

  // 使用新的 NODE_OPTIONS 重新生成子进程
  const child = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: process.env,
  });

  // 附加子进程桥接器以处理信号转发
  attachChildProcessBridge(child);

  // 处理子进程退出
  child.once("exit", (code, signal) => {
    if (signal) {
      process.exitCode = 1;
      return;
    }
    process.exit(code ?? 1);
  });

  // 处理子进程错误
  child.once("error", (error) => {
    console.error(
      "[moltbot] Failed to respawn CLI:",
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
    process.exit(1);
  });

  // 父进程不应继续运行 CLI
  return true;
}

/**
 * 规范化 Windows 平台的命令行参数
 * 处理 Windows 特有的路径格式和控制字符问题
 * @param argv - 原始参数数组
 * @returns 规范化后的参数数组
 */
function normalizeWindowsArgv(argv: string[]): string[] {
  if (process.platform !== "win32") return argv;
  if (argv.length < 2) return argv;

  // 移除控制字符
  const stripControlChars = (value: string): string => {
    let out = "";
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      if (code >= 32 && code !== 127) {
        out += value[i];
      }
    }
    return out;
  };

  // 规范化单个参数
  const normalizeArg = (value: string): string =>
    stripControlChars(value)
      .replace(/^['"]+|['"]+$/g, "")
      .trim();

  // 规范化候选路径
  const normalizeCandidate = (value: string): string =>
    normalizeArg(value).replace(/^\\\\\\?\\/, "");

  const execPath = normalizeCandidate(process.execPath);
  const execPathLower = execPath.toLowerCase();
  const execBase = path.basename(execPath).toLowerCase();

  // 检查是否为可执行文件路径
  const isExecPath = (value: string | undefined): boolean => {
    if (!value) return false;
    const lower = normalizeCandidate(value).toLowerCase();
    return (
      lower === execPathLower ||
      path.basename(lower) === execBase ||
      lower.endsWith("\\node.exe") ||
      lower.endsWith("/node.exe") ||
      lower.includes("node.exe")
    );
  };

  // 移除重复的可执行文件路径参数
  const next = [...argv];
  for (let i = 1; i <= 3 && i < next.length; ) {
    if (isExecPath(next[i])) {
      next.splice(i, 1);
      continue;
    }
    i += 1;
  }
  const filtered = next.filter((arg, index) => index === 0 || !isExecPath(arg));
  if (filtered.length < 3) return filtered;
  const cleaned = [...filtered];
  for (let i = 2; i < cleaned.length; ) {
    const arg = cleaned[i];
    if (!arg || arg.startsWith("-")) {
      i += 1;
      continue;
    }
    if (isExecPath(arg)) {
      cleaned.splice(i, 1);
      continue;
    }
    break;
  }
  return cleaned;
}

// 规范化 Windows 参数
process.argv = normalizeWindowsArgv(process.argv);

// 如果未重新生成进程，则继续执行 CLI
if (!ensureExperimentalWarningSuppressed()) {
  // 解析 CLI 配置文件参数
  const parsed = parseCliProfileArgs(process.argv);
  if (!parsed.ok) {
    // 保持简单；Commander 会在我们剥离标志后处理丰富的帮助/错误信息
    console.error(`[moltbot] ${parsed.error}`);
    process.exit(2);
  }

  // 如果指定了配置文件，应用配置文件环境变量
  if (parsed.profile) {
    applyCliProfileEnv({ profile: parsed.profile });
    // 保持 Commander 和临时 argv 检查一致
    process.argv = parsed.argv;
  }

  // 动态导入并运行 CLI
  import("./cli/run-main.js")
    .then(({ runCli }) => runCli(process.argv))
    .catch((error) => {
      console.error(
        "[moltbot] Failed to start CLI:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exitCode = 1;
    });
}
