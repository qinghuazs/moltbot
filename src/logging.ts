/**
 * 日志系统统一导出模块
 * 聚合并导出所有日志相关的函数、类型和常量
 */
import {
  enableConsoleCapture,
  getConsoleSettings,
  getResolvedConsoleSettings,
  routeLogsToStderr,
  setConsoleSubsystemFilter,
  setConsoleTimestampPrefix,
  shouldLogSubsystemToConsole,
} from "./logging/console.js";
import type { ConsoleLoggerSettings, ConsoleStyle } from "./logging/console.js";
import { ALLOWED_LOG_LEVELS, levelToMinLevel, normalizeLogLevel } from "./logging/levels.js";
import type { LogLevel } from "./logging/levels.js";
import {
  DEFAULT_LOG_DIR,
  DEFAULT_LOG_FILE,
  getChildLogger,
  getLogger,
  getResolvedLoggerSettings,
  isFileLogLevelEnabled,
  resetLogger,
  setLoggerOverride,
  toPinoLikeLogger,
} from "./logging/logger.js";
import type { LoggerResolvedSettings, LoggerSettings, PinoLikeLogger } from "./logging/logger.js";
import {
  createSubsystemLogger,
  createSubsystemRuntime,
  runtimeForLogger,
  stripRedundantSubsystemPrefixForConsole,
} from "./logging/subsystem.js";
import type { SubsystemLogger } from "./logging/subsystem.js";

// 导出控制台日志相关函数
export {
  enableConsoleCapture, // 启用控制台捕获
  getConsoleSettings, // 获取控制台设置
  getResolvedConsoleSettings, // 获取解析后的控制台设置
  routeLogsToStderr, // 将日志路由到 stderr
  setConsoleSubsystemFilter, // 设置控制台子系统过滤器
  setConsoleTimestampPrefix, // 设置控制台时间戳前缀
  shouldLogSubsystemToConsole, // 检查子系统是否应输出到控制台
  ALLOWED_LOG_LEVELS, // 允许的日志级别列表
  levelToMinLevel, // 日志级别转最小级别
  normalizeLogLevel, // 规范化日志级别
  DEFAULT_LOG_DIR, // 默认日志目录
  DEFAULT_LOG_FILE, // 默认日志文件
  getChildLogger, // 获取子日志器
  getLogger, // 获取日志器
  getResolvedLoggerSettings, // 获取解析后的日志器设置
  isFileLogLevelEnabled, // 检查文件日志级别是否启用
  resetLogger, // 重置日志器
  setLoggerOverride, // 设置日志器覆盖
  toPinoLikeLogger, // 转换为 Pino 风格日志器
  createSubsystemLogger, // 创建子系统日志器
  createSubsystemRuntime, // 创建子系统运行时
  runtimeForLogger, // 获取日志器的运行时
  stripRedundantSubsystemPrefixForConsole, // 移除冗余的子系统前缀
};

// 导出类型定义
export type {
  ConsoleLoggerSettings, // 控制台日志器设置类型
  ConsoleStyle, // 控制台样式类型
  LogLevel, // 日志级别类型
  LoggerResolvedSettings, // 日志器解析设置类型
  LoggerSettings, // 日志器设置类型
  PinoLikeLogger, // Pino 风格日志器类型
  SubsystemLogger, // 子系统日志器类型
};
