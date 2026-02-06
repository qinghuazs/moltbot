/**
 * 缓存工具模块
 *
 * 提供缓存 TTL（生存时间）解析、缓存启用判断和文件修改时间获取等通用工具函数。
 */
import fs from "node:fs";

/**
 * 解析缓存 TTL（毫秒）
 *
 * 优先使用环境变量值，若无效则使用默认值。
 *
 * @param params.envValue - 环境变量中的 TTL 字符串
 * @param params.defaultTtlMs - 默认 TTL（毫秒）
 * @returns 解析后的 TTL 毫秒数
 */
export function resolveCacheTtlMs(params: {
  envValue: string | undefined;
  defaultTtlMs: number;
}): number {
  const { envValue, defaultTtlMs } = params;
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return defaultTtlMs;
}

/** 判断缓存是否启用（TTL > 0 表示启用） */
export function isCacheEnabled(ttlMs: number): boolean {
  return ttlMs > 0;
}

/** 获取文件的最后修改时间（毫秒），文件不存在时返回 undefined */
export function getFileMtimeMs(filePath: string): number | undefined {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return undefined;
  }
}
