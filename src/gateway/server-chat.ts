/**
 * 网关聊天模块
 *
 * 该模块处理网关的聊天功能，包括：
 * - 聊天运行注册表管理
 * - 代理事件处理
 * - WebChat 广播
 * - 心跳可见性控制
 *
 * @module gateway/server-chat
 */

import { normalizeVerboseLevel } from "../auto-reply/thinking.js";
import { loadConfig } from "../config/config.js";
import { type AgentEventPayload, getAgentRunContext } from "../infra/agent-events.js";
import { resolveHeartbeatVisibility } from "../infra/heartbeat-visibility.js";
import { loadSessionEntry } from "./session-utils.js";
import { formatForLog } from "./ws-log.js";

/**
 * 检查是否应该抑制心跳运行的 WebChat 广播
 * 当运行是心跳且 showOk 为 false 时返回 true
 */
function shouldSuppressHeartbeatBroadcast(runId: string): boolean {
  const runContext = getAgentRunContext(runId);
  if (!runContext?.isHeartbeat) return false;

  try {
    const cfg = loadConfig();
    const visibility = resolveHeartbeatVisibility({ cfg, channel: "webchat" });
    return !visibility.showOk;
  } catch {
    // Default to suppressing if we can't load config
    return true;
  }
}

/** 聊天运行条目 */
export type ChatRunEntry = {
  /** 会话键 */
  sessionKey: string;
  /** 客户端运行 ID */
  clientRunId: string;
};

/** 聊天运行注册表接口 */
export type ChatRunRegistry = {
  /** 添加运行条目 */
  add: (sessionId: string, entry: ChatRunEntry) => void;
  /** 查看队首条目 */
  peek: (sessionId: string) => ChatRunEntry | undefined;
  /** 移除并返回队首条目 */
  shift: (sessionId: string) => ChatRunEntry | undefined;
  /** 移除指定条目 */
  remove: (sessionId: string, clientRunId: string, sessionKey?: string) => ChatRunEntry | undefined;
  /** 清空所有条目 */
  clear: () => void;
};

/**
 * 创建聊天运行注册表
 * 管理每个会话的运行队列
 */
export function createChatRunRegistry(): ChatRunRegistry {
  const chatRunSessions = new Map<string, ChatRunEntry[]>();

  const add = (sessionId: string, entry: ChatRunEntry) => {
    const queue = chatRunSessions.get(sessionId);
    if (queue) {
      queue.push(entry);
    } else {
      chatRunSessions.set(sessionId, [entry]);
    }
  };

  const peek = (sessionId: string) => chatRunSessions.get(sessionId)?.[0];

  const shift = (sessionId: string) => {
    const queue = chatRunSessions.get(sessionId);
    if (!queue || queue.length === 0) return undefined;
    const entry = queue.shift();
    if (!queue.length) chatRunSessions.delete(sessionId);
    return entry;
  };

  const remove = (sessionId: string, clientRunId: string, sessionKey?: string) => {
    const queue = chatRunSessions.get(sessionId);
    if (!queue || queue.length === 0) return undefined;
    const idx = queue.findIndex(
      (entry) =>
        entry.clientRunId === clientRunId && (sessionKey ? entry.sessionKey === sessionKey : true),
    );
    if (idx < 0) return undefined;
    const [entry] = queue.splice(idx, 1);
    if (!queue.length) chatRunSessions.delete(sessionId);
    return entry;
  };

  const clear = () => {
    chatRunSessions.clear();
  };

  return { add, peek, shift, remove, clear };
}

/** 聊天运行状态 */
export type ChatRunState = {
  /** 运行注册表 */
  registry: ChatRunRegistry;
  /** 文本缓冲区 */
  buffers: Map<string, string>;
  /** 增量发送时间戳 */
  deltaSentAt: Map<string, number>;
  /** 已中止的运行 */
  abortedRuns: Map<string, number>;
  /** 清空所有状态 */
  clear: () => void;
};

/**
 * 创建聊天运行状态
 * 管理聊天运行的所有状态数据
 */
export function createChatRunState(): ChatRunState {
  const registry = createChatRunRegistry();
  const buffers = new Map<string, string>();
  const deltaSentAt = new Map<string, number>();
  const abortedRuns = new Map<string, number>();

  const clear = () => {
    registry.clear();
    buffers.clear();
    deltaSentAt.clear();
    abortedRuns.clear();
  };

  return {
    registry,
    buffers,
    deltaSentAt,
    abortedRuns,
    clear,
  };
}

/** 聊天事件广播函数类型 */
export type ChatEventBroadcast = (
  event: string,
  payload: unknown,
  opts?: { dropIfSlow?: boolean },
) => void;

/** 节点发送到会话函数类型 */
export type NodeSendToSession = (sessionKey: string, event: string, payload: unknown) => void;

/** 代理事件处理器选项 */
export type AgentEventHandlerOptions = {
  /** 广播函数 */
  broadcast: ChatEventBroadcast;
  /** 节点发送到会话函数 */
  nodeSendToSession: NodeSendToSession;
  /** 代理运行序列号映射 */
  agentRunSeq: Map<string, number>;
  /** 聊天运行状态 */
  chatRunState: ChatRunState;
  /** 解析运行 ID 对应的会话键 */
  resolveSessionKeyForRun: (runId: string) => string | undefined;
  /** 清除代理运行上下文 */
  clearAgentRunContext: (runId: string) => void;
};

/**
 * 创建代理事件处理器
 * 处理代理运行过程中的各种事件
 */
export function createAgentEventHandler({
  broadcast,
  nodeSendToSession,
  agentRunSeq,
  chatRunState,
  resolveSessionKeyForRun,
  clearAgentRunContext,
}: AgentEventHandlerOptions) {
  const emitChatDelta = (sessionKey: string, clientRunId: string, seq: number, text: string) => {
    chatRunState.buffers.set(clientRunId, text);
    const now = Date.now();
    const last = chatRunState.deltaSentAt.get(clientRunId) ?? 0;
    if (now - last < 150) return;
    chatRunState.deltaSentAt.set(clientRunId, now);
    const payload = {
      runId: clientRunId,
      sessionKey,
      seq,
      state: "delta" as const,
      message: {
        role: "assistant",
        content: [{ type: "text", text }],
        timestamp: now,
      },
    };
    // Suppress webchat broadcast for heartbeat runs when showOk is false
    if (!shouldSuppressHeartbeatBroadcast(clientRunId)) {
      broadcast("chat", payload, { dropIfSlow: true });
    }
    nodeSendToSession(sessionKey, "chat", payload);
  };

  const emitChatFinal = (
    sessionKey: string,
    clientRunId: string,
    seq: number,
    jobState: "done" | "error",
    error?: unknown,
  ) => {
    const text = chatRunState.buffers.get(clientRunId)?.trim() ?? "";
    chatRunState.buffers.delete(clientRunId);
    chatRunState.deltaSentAt.delete(clientRunId);
    if (jobState === "done") {
      const payload = {
        runId: clientRunId,
        sessionKey,
        seq,
        state: "final" as const,
        message: text
          ? {
              role: "assistant",
              content: [{ type: "text", text }],
              timestamp: Date.now(),
            }
          : undefined,
      };
      // Suppress webchat broadcast for heartbeat runs when showOk is false
      if (!shouldSuppressHeartbeatBroadcast(clientRunId)) {
        broadcast("chat", payload);
      }
      nodeSendToSession(sessionKey, "chat", payload);
      return;
    }
    const payload = {
      runId: clientRunId,
      sessionKey,
      seq,
      state: "error" as const,
      errorMessage: error ? formatForLog(error) : undefined,
    };
    broadcast("chat", payload);
    nodeSendToSession(sessionKey, "chat", payload);
  };

  const shouldEmitToolEvents = (runId: string, sessionKey?: string) => {
    const runContext = getAgentRunContext(runId);
    const runVerbose = normalizeVerboseLevel(runContext?.verboseLevel);
    if (runVerbose) return runVerbose === "on";
    if (!sessionKey) return false;
    try {
      const { cfg, entry } = loadSessionEntry(sessionKey);
      const sessionVerbose = normalizeVerboseLevel(entry?.verboseLevel);
      if (sessionVerbose) return sessionVerbose === "on";
      const defaultVerbose = normalizeVerboseLevel(cfg.agents?.defaults?.verboseDefault);
      return defaultVerbose === "on";
    } catch {
      return false;
    }
  };

  return (evt: AgentEventPayload) => {
    const chatLink = chatRunState.registry.peek(evt.runId);
    const sessionKey = chatLink?.sessionKey ?? resolveSessionKeyForRun(evt.runId);
    const clientRunId = chatLink?.clientRunId ?? evt.runId;
    const isAborted =
      chatRunState.abortedRuns.has(clientRunId) || chatRunState.abortedRuns.has(evt.runId);
    // Include sessionKey so Control UI can filter tool streams per session.
    const agentPayload = sessionKey ? { ...evt, sessionKey } : evt;
    const last = agentRunSeq.get(evt.runId) ?? 0;
    if (evt.stream === "tool" && !shouldEmitToolEvents(evt.runId, sessionKey)) {
      agentRunSeq.set(evt.runId, evt.seq);
      return;
    }
    if (evt.seq !== last + 1) {
      broadcast("agent", {
        runId: evt.runId,
        stream: "error",
        ts: Date.now(),
        sessionKey,
        data: {
          reason: "seq gap",
          expected: last + 1,
          received: evt.seq,
        },
      });
    }
    agentRunSeq.set(evt.runId, evt.seq);
    broadcast("agent", agentPayload);

    const lifecyclePhase =
      evt.stream === "lifecycle" && typeof evt.data?.phase === "string" ? evt.data.phase : null;

    if (sessionKey) {
      nodeSendToSession(sessionKey, "agent", agentPayload);
      if (!isAborted && evt.stream === "assistant" && typeof evt.data?.text === "string") {
        emitChatDelta(sessionKey, clientRunId, evt.seq, evt.data.text);
      } else if (!isAborted && (lifecyclePhase === "end" || lifecyclePhase === "error")) {
        if (chatLink) {
          const finished = chatRunState.registry.shift(evt.runId);
          if (!finished) {
            clearAgentRunContext(evt.runId);
            return;
          }
          emitChatFinal(
            finished.sessionKey,
            finished.clientRunId,
            evt.seq,
            lifecyclePhase === "error" ? "error" : "done",
            evt.data?.error,
          );
        } else {
          emitChatFinal(
            sessionKey,
            evt.runId,
            evt.seq,
            lifecyclePhase === "error" ? "error" : "done",
            evt.data?.error,
          );
        }
      } else if (isAborted && (lifecyclePhase === "end" || lifecyclePhase === "error")) {
        chatRunState.abortedRuns.delete(clientRunId);
        chatRunState.abortedRuns.delete(evt.runId);
        chatRunState.buffers.delete(clientRunId);
        chatRunState.deltaSentAt.delete(clientRunId);
        if (chatLink) {
          chatRunState.registry.remove(evt.runId, clientRunId, sessionKey);
        }
      }
    }

    if (lifecyclePhase === "end" || lifecyclePhase === "error") {
      clearAgentRunContext(evt.runId);
    }
  };
}
