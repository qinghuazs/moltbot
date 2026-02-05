/**
 * 系统事件队列模块
 *
 * 提供轻量级的内存队列，用于存储需要在下一次提示中前置的系统事件。
 * 特点：
 * - 事件是临时的，不持久化
 * - 按会话键隔离
 * - 自动去重连续相同事件
 * - 限制最大事件数量
 */

/** 系统事件类型 */
export type SystemEvent = { text: string; ts: number };

/** 最大事件数量 */
const MAX_EVENTS = 20;

/**
 * 会话队列
 */
type SessionQueue = {
  /** 事件队列 */
  queue: SystemEvent[];
  /** 最后一条事件文本（用于去重） */
  lastText: string | null;
  /** 最后的上下文键 */
  lastContextKey: string | null;
};

/** 会话队列映射 */
const queues = new Map<string, SessionQueue>();

/**
 * 系统事件选项
 */
type SystemEventOptions = {
  sessionKey: string;
  contextKey?: string | null;
};

function requireSessionKey(key?: string | null): string {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (!trimmed) {
    throw new Error("system events require a sessionKey");
  }
  return trimmed;
}

function normalizeContextKey(key?: string | null): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

/**
 * 检查系统事件上下文是否已变更
 */
export function isSystemEventContextChanged(
  sessionKey: string,
  contextKey?: string | null,
): boolean {
  const key = requireSessionKey(sessionKey);
  const existing = queues.get(key);
  const normalized = normalizeContextKey(contextKey);
  return normalized !== (existing?.lastContextKey ?? null);
}

/**
 * 入队系统事件
 */
export function enqueueSystemEvent(text: string, options: SystemEventOptions) {
  const key = requireSessionKey(options?.sessionKey);
  const entry =
    queues.get(key) ??
    (() => {
      const created: SessionQueue = {
        queue: [],
        lastText: null,
        lastContextKey: null,
      };
      queues.set(key, created);
      return created;
    })();
  const cleaned = text.trim();
  if (!cleaned) return;
  entry.lastContextKey = normalizeContextKey(options?.contextKey);
  if (entry.lastText === cleaned) return; // skip consecutive duplicates
  entry.lastText = cleaned;
  entry.queue.push({ text: cleaned, ts: Date.now() });
  if (entry.queue.length > MAX_EVENTS) entry.queue.shift();
}

/**
 * 排空系统事件条目（返回完整事件对象）
 */
export function drainSystemEventEntries(sessionKey: string): SystemEvent[] {
  const key = requireSessionKey(sessionKey);
  const entry = queues.get(key);
  if (!entry || entry.queue.length === 0) return [];
  const out = entry.queue.slice();
  entry.queue.length = 0;
  entry.lastText = null;
  entry.lastContextKey = null;
  queues.delete(key);
  return out;
}

/**
 * 排空系统事件（仅返回文本）
 */
export function drainSystemEvents(sessionKey: string): string[] {
  return drainSystemEventEntries(sessionKey).map((event) => event.text);
}

/**
 * 查看系统事件（不移除）
 */
export function peekSystemEvents(sessionKey: string): string[] {
  const key = requireSessionKey(sessionKey);
  return queues.get(key)?.queue.map((e) => e.text) ?? [];
}

/**
 * 检查是否有待处理的系统事件
 */
export function hasSystemEvents(sessionKey: string) {
  const key = requireSessionKey(sessionKey);
  return (queues.get(key)?.queue.length ?? 0) > 0;
}

/**
 * 重置系统事件（仅用于测试）
 */
export function resetSystemEventsForTest() {
  queues.clear();
}
