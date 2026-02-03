/**
 * 全局状态和工具函数模块
 * 管理全局 verbose 模式、yes 模式，以及提供主题化的日志输出函数
 */
import { getLogger, isFileLogLevelEnabled } from "./logging/logger.js";
import { theme } from "./terminal/theme.js";

/** 全局 verbose（详细输出）模式标志 */
let globalVerbose = false;
/** 全局 yes（自动确认）模式标志 */
let globalYes = false;

/**
 * 设置全局 verbose 模式
 * @param v - 是否启用
 */
export function setVerbose(v: boolean) {
  globalVerbose = v;
}

/**
 * 获取当前 verbose 模式状态
 * @returns 是否启用 verbose 模式
 */
export function isVerbose() {
  return globalVerbose;
}

/**
 * 检查是否应该输出 verbose 日志
 * 当全局 verbose 启用或文件日志级别包含 debug 时返回 true
 * @returns 是否应该输出 verbose 日志
 */
export function shouldLogVerbose() {
  return globalVerbose || isFileLogLevelEnabled("debug");
}

/**
 * 输出 verbose 级别日志
 * 同时写入文件日志和控制台（如果启用）
 * @param message - 日志消息
 */
export function logVerbose(message: string) {
  if (!shouldLogVerbose()) return;
  try {
    getLogger().debug({ message }, "verbose");
  } catch {
    // 忽略日志器错误以避免中断 verbose 打印
  }
  if (!globalVerbose) return;
  console.log(theme.muted(message));
}

/**
 * 仅输出到控制台的 verbose 日志
 * @param message - 日志消息
 */
export function logVerboseConsole(message: string) {
  if (!globalVerbose) return;
  console.log(theme.muted(message));
}

/**
 * 设置全局 yes 模式（自动确认所有提示）
 * @param v - 是否启用
 */
export function setYes(v: boolean) {
  globalYes = v;
}

/**
 * 获取当前 yes 模式状态
 * @returns 是否启用 yes 模式
 */
export function isYes() {
  return globalYes;
}

// 导出主题化的日志格式函数
/** 成功消息格式化 */
export const success = theme.success;
/** 警告消息格式化 */
export const warn = theme.warn;
/** 信息消息格式化 */
export const info = theme.info;
/** 错误/危险消息格式化 */
export const danger = theme.error;
