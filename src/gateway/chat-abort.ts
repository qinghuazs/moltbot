/**
 * 聊天中止模块
 *
 * 提供聊天会话的中止控制功能，包括：
 * - 管理活跃聊天的 AbortController
 * - 处理 /stop 命令
 * - 按会话或运行 ID 中止聊天
 */

import { isAbortTrigger } from "../auto-reply/reply/abort.js";

/**
 * 聊天中止控制器条目
 */
export type ChatAbortControllerEntry = {
  /** 中止控制器 */
  controller: AbortController;
  /** 会话 ID */
  sessionId: string;
  /** 会话键 */
  sessionKey: string;
  /** 开始时间戳 */
  startedAtMs: number;
  /** 过期时间戳 */
  expiresAtMs: number;
};

/**
 * 检查文本是否为停止命令
 */
export function isChatStopCommandText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return trimmed.toLowerCase() === "/stop" || isAbortTrigger(trimmed);
}

/**
 * 计算聊天运行的过期时间
 */
export function resolveChatRunExpiresAtMs(params: {
  now: number;
  timeoutMs: number;
  graceMs?: number;
  minMs?: number;
  maxMs?: number;
}): number {
  const { now, timeoutMs, graceMs = 60_000, minMs = 2 * 60_000, maxMs = 24 * 60 * 60_000 } = params;
  const boundedTimeoutMs = Math.max(0, timeoutMs);
  const target = now + boundedTimeoutMs + graceMs;
  const min = now + minMs;
  const max = now + maxMs;
  return Math.min(max, Math.max(min, target));
}

/**
 * 聊天中止操作接口
 */
export type ChatAbortOps = {
  chatAbortControllers: Map<string, ChatAbortControllerEntry>;
  chatRunBuffers: Map<string, string>;
  chatDeltaSentAt: Map<string, number>;
  chatAbortedRuns: Map<string, number>;
  removeChatRun: (
    sessionId: string,
    clientRunId: string,
    sessionKey?: string,
  ) => { sessionKey: string; clientRunId: string } | undefined;
  agentRunSeq: Map<string, number>;
  broadcast: (event: string, payload: unknown, opts?: { dropIfSlow?: boolean }) => void;
  nodeSendToSession: (sessionKey: string, event: string, payload: unknown) => void;
};

/**
 * 广播聊天已中止事件
 */
function broadcastChatAborted(
  ops: ChatAbortOps,
  params: {
    runId: string;
    sessionKey: string;
    stopReason?: string;
  },
) {
  const { runId, sessionKey, stopReason } = params;
  const payload = {
    runId,
    sessionKey,
    seq: (ops.agentRunSeq.get(runId) ?? 0) + 1,
    state: "aborted" as const,
    stopReason,
  };
  ops.broadcast("chat", payload);
  ops.nodeSendToSession(sessionKey, "chat", payload);
}

/**
 * 按运行 ID 中止聊天
 */
export function abortChatRunById(
  ops: ChatAbortOps,
  params: {
    runId: string;
    sessionKey: string;
    stopReason?: string;
  },
): { aborted: boolean } {
  const { runId, sessionKey, stopReason } = params;
  const active = ops.chatAbortControllers.get(runId);
  if (!active) return { aborted: false };
  if (active.sessionKey !== sessionKey) return { aborted: false };

  ops.chatAbortedRuns.set(runId, Date.now());
  active.controller.abort();
  ops.chatAbortControllers.delete(runId);
  ops.chatRunBuffers.delete(runId);
  ops.chatDeltaSentAt.delete(runId);
  ops.removeChatRun(runId, runId, sessionKey);
  broadcastChatAborted(ops, { runId, sessionKey, stopReason });
  return { aborted: true };
}

/**
 * 按会话键中止所有聊天
 */
export function abortChatRunsForSessionKey(
  ops: ChatAbortOps,
  params: {
    sessionKey: string;
    stopReason?: string;
  },
): { aborted: boolean; runIds: string[] } {
  const { sessionKey, stopReason } = params;
  const runIds: string[] = [];
  for (const [runId, active] of ops.chatAbortControllers) {
    if (active.sessionKey !== sessionKey) continue;
    const res = abortChatRunById(ops, { runId, sessionKey, stopReason });
    if (res.aborted) runIds.push(runId);
  }
  return { aborted: runIds.length > 0, runIds };
}
