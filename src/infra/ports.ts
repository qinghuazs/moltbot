/**
 * 端口管理模块
 * 提供端口可用性检查、端口占用诊断和错误处理功能
 */
import net from "node:net";
import { danger, info, shouldLogVerbose, warn } from "../globals.js";
import { logDebug } from "../logger.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { formatPortDiagnostics } from "./ports-format.js";
import { inspectPortUsage } from "./ports-inspect.js";
import type { PortListener, PortListenerKind, PortUsage, PortUsageStatus } from "./ports-types.js";

/**
 * 端口被占用错误类
 */
class PortInUseError extends Error {
  /** 端口号 */
  port: number;
  /** 详细信息 */
  details?: string;

  constructor(port: number, details?: string) {
    super(`Port ${port} is already in use.`);
    this.name = "PortInUseError";
    this.port = port;
    this.details = details;
  }
}

/**
 * 检查是否为 Node.js 错误对象
 * @param err - 错误对象
 * @returns 是否为 ErrnoException
 */
function isErrno(err: unknown): err is NodeJS.ErrnoException {
  return Boolean(err && typeof err === "object" && "code" in err);
}

/**
 * 描述端口占用者信息
 * @param port - 端口号
 * @returns 占用者描述，端口空闲返回 undefined
 */
export async function describePortOwner(port: number): Promise<string | undefined> {
  const diagnostics = await inspectPortUsage(port);
  if (diagnostics.listeners.length === 0) return undefined;
  return formatPortDiagnostics(diagnostics).join("\n");
}

/**
 * 确保端口可用
 * 通过尝试监听端口来检测 EADDRINUSE 错误
 * @param port - 端口号
 * @throws PortInUseError 如果端口被占用
 */
export async function ensurePortAvailable(port: number): Promise<void> {
  // 提前检测 EADDRINUSE 并提供友好的错误消息
  try {
    await new Promise<void>((resolve, reject) => {
      const tester = net
        .createServer()
        .once("error", (err) => reject(err))
        .once("listening", () => {
          tester.close(() => resolve());
        })
        .listen(port);
    });
  } catch (err) {
    if (isErrno(err) && err.code === "EADDRINUSE") {
      const details = await describePortOwner(port);
      throw new PortInUseError(port, details);
    }
    throw err;
  }
}

/**
 * 处理端口错误
 * 为 EADDRINUSE 提供统一的错误消息和可选的占用者详情
 * @param err - 错误对象
 * @param port - 端口号
 * @param context - 上下文描述
 * @param runtime - 运行时环境
 */
export async function handlePortError(
  err: unknown,
  port: number,
  context: string,
  runtime: RuntimeEnv = defaultRuntime,
): Promise<never> {
  // 为 EADDRINUSE 提供统一的消息和可选的占用者详情
  if (err instanceof PortInUseError || (isErrno(err) && err.code === "EADDRINUSE")) {
    const details = err instanceof PortInUseError ? err.details : await describePortOwner(port);
    runtime.error(danger(`${context} failed: port ${port} is already in use.`));
    if (details) {
      runtime.error(info("Port listener details:"));
      runtime.error(details);
      // 检测是否是另一个 moltbot 实例
      if (/moltbot|src\/index\.ts|dist\/index\.js/.test(details)) {
        runtime.error(
          warn(
            "It looks like another moltbot instance is already running. Stop it or pick a different port.",
          ),
        );
      }
    }
    runtime.error(
      info("Resolve by stopping the process using the port or passing --port <free-port>."),
    );
    runtime.exit(1);
  }
  runtime.error(danger(`${context} failed: ${String(err)}`));
  if (shouldLogVerbose()) {
    const stdout = (err as { stdout?: string })?.stdout;
    const stderr = (err as { stderr?: string })?.stderr;
    if (stdout?.trim()) logDebug(`stdout: ${stdout.trim()}`);
    if (stderr?.trim()) logDebug(`stderr: ${stderr.trim()}`);
  }
  return runtime.exit(1);
}

export { PortInUseError };
export type { PortListener, PortListenerKind, PortUsage, PortUsageStatus };
export { buildPortHints, classifyPortListener, formatPortDiagnostics } from "./ports-format.js";
export { inspectPortUsage } from "./ports-inspect.js";
