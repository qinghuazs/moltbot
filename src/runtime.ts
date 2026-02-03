/**
 * 运行时环境模块
 * 提供标准化的日志输出和进程退出接口，支持测试时的模拟
 */
import { clearActiveProgressLine } from "./terminal/progress-line.js";

/** 运行时环境接口 */
export type RuntimeEnv = {
  /** 标准输出日志函数 */
  log: typeof console.log;
  /** 错误输出日志函数 */
  error: typeof console.error;
  /** 进程退出函数 */
  exit: (code: number) => never;
};

/**
 * 默认运行时环境
 * 在输出前清除活动的进度行，确保输出不被覆盖
 */
export const defaultRuntime: RuntimeEnv = {
  log: (...args: Parameters<typeof console.log>) => {
    clearActiveProgressLine();
    console.log(...args);
  },
  error: (...args: Parameters<typeof console.error>) => {
    clearActiveProgressLine();
    console.error(...args);
  },
  exit: (code) => {
    process.exit(code);
    throw new Error("unreachable"); // 满足测试时的模拟需求
  },
};
