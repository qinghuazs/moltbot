/**
 * 会话标签模块
 *
 * 该模块提供会话标签的解析和验证功能。
 *
 * @module sessions/session-label
 */

/** 会话标签最大长度 */
export const SESSION_LABEL_MAX_LENGTH = 64;

/** 解析后的会话标签类型 */
export type ParsedSessionLabel = { ok: true; label: string } | { ok: false; error: string };

/**
 * 解析会话标签
 *
 * @param raw - 原始标签值
 * @returns 解析结果
 */
export function parseSessionLabel(raw: unknown): ParsedSessionLabel {
  if (typeof raw !== "string") {
    return { ok: false, error: "invalid label: must be a string" };
  }
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "invalid label: empty" };
  if (trimmed.length > SESSION_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      error: `invalid label: too long (max ${SESSION_LABEL_MAX_LENGTH})`,
    };
  }
  return { ok: true, label: trimmed };
}
