/**
 * 去重缓存模块
 *
 * 提供基于时间和大小限制的去重缓存，用于：
 * - 消息去重
 * - 请求去重
 * - 事件去重
 */

/**
 * 去重缓存接口
 */
export type DedupeCache = {
  /**
   * 检查键是否已存在
   * @param key - 要检查的键
   * @param now - 当前时间戳（默认 Date.now()）
   * @returns 如果键已存在返回 true，否则返回 false 并添加该键
   */
  check: (key: string | undefined | null, now?: number) => boolean;
  /** 清空缓存 */
  clear: () => void;
  /** 获取缓存大小 */
  size: () => number;
};

/**
 * 去重缓存配置选项
 */
type DedupeCacheOptions = {
  /** 条目过期时间（毫秒） */
  ttlMs: number;
  /** 最大缓存条目数 */
  maxSize: number;
};

/**
 * 创建去重缓存
 *
 * 使用 LRU 策略管理缓存条目，支持 TTL 过期和大小限制。
 *
 * @param options - 缓存配置
 * @returns 去重缓存实例
 */
export function createDedupeCache(options: DedupeCacheOptions): DedupeCache {
  const ttlMs = Math.max(0, options.ttlMs);
  const maxSize = Math.max(0, Math.floor(options.maxSize));
  const cache = new Map<string, number>();

  /** 更新条目时间戳（移到末尾以实现 LRU） */
  const touch = (key: string, now: number) => {
    cache.delete(key);
    cache.set(key, now);
  };

  /** 清理过期和超量条目 */
  const prune = (now: number) => {
    const cutoff = ttlMs > 0 ? now - ttlMs : undefined;
    if (cutoff !== undefined) {
      for (const [entryKey, entryTs] of cache) {
        if (entryTs < cutoff) {
          cache.delete(entryKey);
        }
      }
    }
    if (maxSize <= 0) {
      cache.clear();
      return;
    }
    while (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  };

  return {
    check: (key, now = Date.now()) => {
      if (!key) return false;
      const existing = cache.get(key);
      if (existing !== undefined && (ttlMs <= 0 || now - existing < ttlMs)) {
        touch(key, now);
        return true;
      }
      touch(key, now);
      prune(now);
      return false;
    },
    clear: () => {
      cache.clear();
    },
    size: () => cache.size,
  };
}
