/**
 * 会话键工具模块
 * 提供会话键的解析和类型判断功能
 */

/** 解析后的 Agent 会话键类型 */
export type ParsedAgentSessionKey = {
  /** Agent ID */
  agentId: string;
  /** 剩余部分 */
  rest: string;
};

/**
 * 解析 Agent 会话键
 * 格式：agent:<agentId>:<rest>
 * @param sessionKey - 会话键
 * @returns 解析结果，无效返回 null
 */
export function parseAgentSessionKey(
  sessionKey: string | undefined | null,
): ParsedAgentSessionKey | null {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(":").filter(Boolean);
  if (parts.length < 3) return null;
  if (parts[0] !== "agent") return null;
  const agentId = parts[1]?.trim();
  const rest = parts.slice(2).join(":");
  if (!agentId || !rest) return null;
  return { agentId, rest };
}

/**
 * 检查是否为子代理会话键
 * @param sessionKey - 会话键
 * @returns 是否为子代理会话键
 */
export function isSubagentSessionKey(sessionKey: string | undefined | null): boolean {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return false;
  if (raw.toLowerCase().startsWith("subagent:")) return true;
  const parsed = parseAgentSessionKey(raw);
  return Boolean((parsed?.rest ?? "").toLowerCase().startsWith("subagent:"));
}

/**
 * 检查是否为 ACP 会话键
 * @param sessionKey - 会话键
 * @returns 是否为 ACP 会话键
 */
export function isAcpSessionKey(sessionKey: string | undefined | null): boolean {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return false;
  const normalized = raw.toLowerCase();
  if (normalized.startsWith("acp:")) return true;
  const parsed = parseAgentSessionKey(raw);
  return Boolean((parsed?.rest ?? "").toLowerCase().startsWith("acp:"));
}

/** 线程会话标记 */
const THREAD_SESSION_MARKERS = [":thread:", ":topic:"];

/**
 * 解析线程父会话键
 * @param sessionKey - 会话键
 * @returns 父会话键，无效返回 null
 */
export function resolveThreadParentSessionKey(
  sessionKey: string | undefined | null,
): string | null {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  let idx = -1;
  for (const marker of THREAD_SESSION_MARKERS) {
    const candidate = normalized.lastIndexOf(marker);
    if (candidate > idx) idx = candidate;
  }
  if (idx <= 0) return null;
  const parent = raw.slice(0, idx).trim();
  return parent ? parent : null;
}
