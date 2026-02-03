/**
 * 环境变量处理模块
 * 提供环境变量的规范化、日志记录和布尔值解析功能
 */
import { createSubsystemLogger } from "../logging/subsystem.js";
import { parseBooleanValue } from "../utils/boolean.js";

const log = createSubsystemLogger("env");
/** 已记录的环境变量集合，避免重复日志 */
const loggedEnv = new Set<string>();

/** 接受的环境变量选项类型 */
type AcceptedEnvOption = {
  /** 环境变量键名 */
  key: string;
  /** 描述 */
  description: string;
  /** 值（可选，默认从 process.env 读取） */
  value?: string;
  /** 是否脱敏显示 */
  redact?: boolean;
};

/**
 * 格式化环境变量值用于日志显示
 * @param value - 原始值
 * @param redact - 是否脱敏
 * @returns 格式化后的值
 */
function formatEnvValue(value: string, redact?: boolean): string {
  if (redact) return "<redacted>";
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 160) return singleLine;
  return `${singleLine.slice(0, 160)}…`;
}

/**
 * 记录接受的环境变量选项
 * 仅在非测试环境且变量有值时记录，每个变量只记录一次
 * @param option - 环境变量选项
 */
export function logAcceptedEnvOption(option: AcceptedEnvOption): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return;
  if (loggedEnv.has(option.key)) return;
  const rawValue = option.value ?? process.env[option.key];
  if (!rawValue || !rawValue.trim()) return;
  loggedEnv.add(option.key);
  log.info(`env: ${option.key}=${formatEnvValue(rawValue, option.redact)} (${option.description})`);
}

/**
 * 规范化 ZAI 环境变量
 * 将 Z_AI_API_KEY 映射到 ZAI_API_KEY
 */
export function normalizeZaiEnv(): void {
  if (!process.env.ZAI_API_KEY?.trim() && process.env.Z_AI_API_KEY?.trim()) {
    process.env.ZAI_API_KEY = process.env.Z_AI_API_KEY;
  }
}

/**
 * 检查环境变量值是否为真值
 * @param value - 环境变量值
 * @returns 是否为真值
 */
export function isTruthyEnvValue(value?: string): boolean {
  return parseBooleanValue(value) === true;
}

/**
 * 规范化所有环境变量
 */
export function normalizeEnv(): void {
  normalizeZaiEnv();
}
