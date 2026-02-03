/**
 * 日志工具模块
 * 提供带子系统前缀解析的日志函数，支持不同级别的日志输出
 */
import { danger, info, logVerboseConsole, success, warn } from "./globals.js";
import { getLogger } from "./logging/logger.js";
import { createSubsystemLogger } from "./logging/subsystem.js";
import { defaultRuntime, type RuntimeEnv } from "./runtime.js";

/** 子系统前缀正则表达式，匹配格式如 "subsystem: message" */
const subsystemPrefixRe = /^([a-z][a-z0-9-]{1,20}):\s+(.*)$/i;

/**
 * 从消息中分离子系统前缀
 * @param message - 原始消息
 * @returns 子系统和剩余消息，无前缀返回 null
 */
function splitSubsystem(message: string) {
  const match = message.match(subsystemPrefixRe);
  if (!match) return null;
  const [, subsystem, rest] = match;
  return { subsystem, rest };
}

/**
 * 输出信息级别日志
 * 支持子系统前缀自动路由
 * @param message - 日志消息
 * @param runtime - 运行时环境
 */
export function logInfo(message: string, runtime: RuntimeEnv = defaultRuntime) {
  const parsed = runtime === defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    createSubsystemLogger(parsed.subsystem).info(parsed.rest);
    return;
  }
  runtime.log(info(message));
  getLogger().info(message);
}

/**
 * 输出警告级别日志
 * @param message - 日志消息
 * @param runtime - 运行时环境
 */
export function logWarn(message: string, runtime: RuntimeEnv = defaultRuntime) {
  const parsed = runtime === defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    createSubsystemLogger(parsed.subsystem).warn(parsed.rest);
    return;
  }
  runtime.log(warn(message));
  getLogger().warn(message);
}

/**
 * 输出成功级别日志
 * @param message - 日志消息
 * @param runtime - 运行时环境
 */
export function logSuccess(message: string, runtime: RuntimeEnv = defaultRuntime) {
  const parsed = runtime === defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    createSubsystemLogger(parsed.subsystem).info(parsed.rest);
    return;
  }
  runtime.log(success(message));
  getLogger().info(message);
}

/**
 * 输出错误级别日志
 * @param message - 日志消息
 * @param runtime - 运行时环境
 */
export function logError(message: string, runtime: RuntimeEnv = defaultRuntime) {
  const parsed = runtime === defaultRuntime ? splitSubsystem(message) : null;
  if (parsed) {
    createSubsystemLogger(parsed.subsystem).error(parsed.rest);
    return;
  }
  runtime.error(danger(message));
  getLogger().error(message);
}

/**
 * 输出调试级别日志
 * 始终写入文件日志（受级别过滤），仅在 verbose 模式下输出到控制台
 * @param message - 日志消息
 */
export function logDebug(message: string) {
  // 始终写入文件日志（受级别过滤）；仅在 verbose 模式下输出到控制台
  getLogger().debug(message);
  logVerboseConsole(message);
}
