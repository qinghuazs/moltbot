/**
 * 进程执行模块
 * 提供带超时和日志的命令执行功能
 */
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { danger, shouldLogVerbose } from "../globals.js";
import { logDebug, logError } from "../logger.js";
import { resolveCommandStdio } from "./spawn-utils.js";

const execFileAsync = promisify(execFile);

/**
 * 简单的 Promise 包装的 execFile，支持可选的详细日志
 * @param command - 命令
 * @param args - 参数数组
 * @param opts - 超时毫秒数或选项对象
 * @returns stdout 和 stderr
 */
export async function runExec(
  command: string,
  args: string[],
  opts: number | { timeoutMs?: number; maxBuffer?: number } = 10_000,
): Promise<{ stdout: string; stderr: string }> {
  const options =
    typeof opts === "number"
      ? { timeout: opts, encoding: "utf8" as const }
      : {
          timeout: opts.timeoutMs,
          maxBuffer: opts.maxBuffer,
          encoding: "utf8" as const,
        };
  try {
    const { stdout, stderr } = await execFileAsync(command, args, options);
    if (shouldLogVerbose()) {
      if (stdout.trim()) logDebug(stdout.trim());
      if (stderr.trim()) logError(stderr.trim());
    }
    return { stdout, stderr };
  } catch (err) {
    if (shouldLogVerbose()) {
      logError(danger(`Command failed: ${command} ${args.join(" ")}`));
    }
    throw err;
  }
}

/** Spawn 执行结果类型 */
export type SpawnResult = {
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
  /** 退出码 */
  code: number | null;
  /** 信号 */
  signal: NodeJS.Signals | null;
  /** 是否被终止 */
  killed: boolean;
};

/** 命令选项类型 */
export type CommandOptions = {
  /** 超时毫秒数 */
  timeoutMs: number;
  /** 工作目录 */
  cwd?: string;
  /** 标准输入内容 */
  input?: string;
  /** 环境变量 */
  env?: NodeJS.ProcessEnv;
  /** Windows 逐字参数 */
  windowsVerbatimArguments?: boolean;
};

/**
 * 带超时的命令执行
 * @param argv - 命令和参数数组
 * @param optionsOrTimeout - 超时毫秒数或选项对象
 * @returns 执行结果
 */
export async function runCommandWithTimeout(
  argv: string[],
  optionsOrTimeout: number | CommandOptions,
): Promise<SpawnResult> {
  const options: CommandOptions =
    typeof optionsOrTimeout === "number" ? { timeoutMs: optionsOrTimeout } : optionsOrTimeout;
  const { timeoutMs, cwd, input, env } = options;
  const { windowsVerbatimArguments } = options;
  const hasInput = input !== undefined;

  // 检查是否应该抑制 npm fund 消息
  const shouldSuppressNpmFund = (() => {
    const cmd = path.basename(argv[0] ?? "");
    if (cmd === "npm" || cmd === "npm.cmd" || cmd === "npm.exe") return true;
    if (cmd === "node" || cmd === "node.exe") {
      const script = argv[1] ?? "";
      return script.includes("npm-cli.js");
    }
    return false;
  })();

  // 解析环境变量
  const resolvedEnv = env ? { ...process.env, ...env } : { ...process.env };
  if (shouldSuppressNpmFund) {
    if (resolvedEnv.NPM_CONFIG_FUND == null) resolvedEnv.NPM_CONFIG_FUND = "false";
    if (resolvedEnv.npm_config_fund == null) resolvedEnv.npm_config_fund = "false";
  }

  // 使用继承的 stdin（TTY）以便 `pi` 等工具在需要时保持交互
  const stdio = resolveCommandStdio({ hasInput, preferInherit: true });
  const child = spawn(argv[0], argv.slice(1), {
    stdio,
    cwd,
    env: resolvedEnv,
    windowsVerbatimArguments,
  });

  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    // 设置超时定时器
    const timer = setTimeout(() => {
      if (typeof child.kill === "function") {
        child.kill("SIGKILL");
      }
    }, timeoutMs);

    if (hasInput && child.stdin) {
      child.stdin.write(input ?? "");
      child.stdin.end();
    }

    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code, signal, killed: child.killed });
    });
  });
}
