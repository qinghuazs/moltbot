/**
 * 终端主题模块
 * 提供统一的终端颜色主题，基于 Lobster 调色板
 */
import chalk, { Chalk } from "chalk";

import { LOBSTER_PALETTE } from "./palette.js";

/** 检查是否强制启用颜色 */
const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

/** 基础 Chalk 实例，根据环境变量决定是否启用颜色 */
const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

/** 十六进制颜色辅助函数 */
const hex = (value: string) => baseChalk.hex(value);

/** 终端主题对象 */
export const theme = {
  /** 强调色 */
  accent: hex(LOBSTER_PALETTE.accent),
  /** 亮强调色 */
  accentBright: hex(LOBSTER_PALETTE.accentBright),
  /** 暗强调色 */
  accentDim: hex(LOBSTER_PALETTE.accentDim),
  /** 信息色 */
  info: hex(LOBSTER_PALETTE.info),
  /** 成功色 */
  success: hex(LOBSTER_PALETTE.success),
  /** 警告色 */
  warn: hex(LOBSTER_PALETTE.warn),
  /** 错误色 */
  error: hex(LOBSTER_PALETTE.error),
  /** 静音色 */
  muted: hex(LOBSTER_PALETTE.muted),
  /** 标题样式 */
  heading: baseChalk.bold.hex(LOBSTER_PALETTE.accent),
  /** 命令样式 */
  command: hex(LOBSTER_PALETTE.accentBright),
  /** 选项样式 */
  option: hex(LOBSTER_PALETTE.warn),
} as const;

/**
 * 检查是否启用富文本输出
 * @returns 是否支持颜色
 */
export const isRich = () => Boolean(baseChalk.level > 0);

/**
 * 条件着色函数
 * @param rich - 是否启用富文本
 * @param color - 颜色函数
 * @param value - 要着色的值
 * @returns 着色后的字符串
 */
export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;
