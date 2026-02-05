/**
 * Signal CLI 守护进程管理模块
 *
 * 本模块提供 signal-cli 守护进程的启动和管理功能，
 * 包括进程生成、日志分类和生命周期控制。
 *
 * @module signal/daemon
 */

import { spawn } from "node:child_process";
import type { RuntimeEnv } from "../runtime.js";

/**
 * Signal 守护进程启动配置选项
 */
export type SignalDaemonOpts = {
  /** signal-cli 可执行文件路径 */
  cliPath: string;
  /** Signal 账户标识（电话号码） */
  account?: string;
  /** HTTP 服务监听主机 */
  httpHost: string;
  /** HTTP 服务监听端口 */
  httpPort: number;
  /** 消息接收模式：启动时接收或手动接收 */
  receiveMode?: "on-start" | "manual";
  /** 是否忽略附件 */
  ignoreAttachments?: boolean;
  /** 是否忽略动态/故事 */
  ignoreStories?: boolean;
  /** 是否发送已读回执 */
  sendReadReceipts?: boolean;
  /** 运行时环境，用于日志输出 */
  runtime?: RuntimeEnv;
};

/**
 * Signal 守护进程句柄
 * 用于控制已启动的守护进程
 */
export type SignalDaemonHandle = {
  /** 进程 ID */
  pid?: number;
  /** 停止守护进程的方法 */
  stop: () => void;
};

/**
 * 分类 signal-cli 日志行的严重级别
 *
 * signal-cli 通常将所有日志写入 stderr，此函数根据内容判断日志级别。
 *
 * @param line - 日志行内容
 * @returns 日志级别："log" 表示普通日志，"error" 表示错误，null 表示空行
 */
export function classifySignalCliLogLine(line: string): "log" | "error" | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // signal-cli commonly writes all logs to stderr; treat severity explicitly.
  if (/\b(ERROR|WARN|WARNING)\b/.test(trimmed)) return "error";
  // Some signal-cli failures are not tagged with WARN/ERROR but should still be surfaced loudly.
  if (/\b(FAILED|SEVERE|EXCEPTION)\b/i.test(trimmed)) return "error";
  return "log";
}

/**
 * 构建守护进程启动参数
 *
 * 根据配置选项生成 signal-cli daemon 命令的参数列表。
 *
 * @param opts - 守护进程配置选项
 * @returns 命令行参数数组
 */
function buildDaemonArgs(opts: SignalDaemonOpts): string[] {
  const args: string[] = [];
  if (opts.account) {
    args.push("-a", opts.account);
  }
  args.push("daemon");
  args.push("--http", `${opts.httpHost}:${opts.httpPort}`);
  args.push("--no-receive-stdout");

  if (opts.receiveMode) {
    args.push("--receive-mode", opts.receiveMode);
  }
  if (opts.ignoreAttachments) args.push("--ignore-attachments");
  if (opts.ignoreStories) args.push("--ignore-stories");
  if (opts.sendReadReceipts) args.push("--send-read-receipts");

  return args;
}

/**
 * 启动 Signal CLI 守护进程
 *
 * 生成一个新的 signal-cli daemon 子进程，配置 HTTP API 服务，
 * 并设置日志输出处理。返回一个句柄用于控制进程生命周期。
 *
 * @param opts - 守护进程配置选项
 * @returns 守护进程句柄，包含 PID 和停止方法
 *
 * @example
 * ```typescript
 * const handle = spawnSignalDaemon({
 *   cliPath: "/usr/local/bin/signal-cli",
 *   account: "+1234567890",
 *   httpHost: "127.0.0.1",
 *   httpPort: 8080,
 * });
 *
 * // 稍后停止守护进程
 * handle.stop();
 * ```
 */
export function spawnSignalDaemon(opts: SignalDaemonOpts): SignalDaemonHandle {
  const args = buildDaemonArgs(opts);
  const child = spawn(opts.cliPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = opts.runtime?.log ?? (() => {});
  const error = opts.runtime?.error ?? (() => {});

  child.stdout?.on("data", (data) => {
    for (const line of data.toString().split(/\r?\n/)) {
      const kind = classifySignalCliLogLine(line);
      if (kind === "log") log(`signal-cli: ${line.trim()}`);
      else if (kind === "error") error(`signal-cli: ${line.trim()}`);
    }
  });
  child.stderr?.on("data", (data) => {
    for (const line of data.toString().split(/\r?\n/)) {
      const kind = classifySignalCliLogLine(line);
      if (kind === "log") log(`signal-cli: ${line.trim()}`);
      else if (kind === "error") error(`signal-cli: ${line.trim()}`);
    }
  });
  child.on("error", (err) => {
    error(`signal-cli spawn error: ${String(err)}`);
  });

  return {
    pid: child.pid ?? undefined,
    stop: () => {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
    },
  };
}
