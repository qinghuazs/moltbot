/**
 * Signal RPC 客户端模块
 *
 * 本模块提供与 signal-cli 守护进程通信的 JSON-RPC 客户端功能，
 * 包括 RPC 请求发送、健康检查和 SSE 事件流处理。
 *
 * @module signal/client
 */

import { randomUUID } from "node:crypto";

import { resolveFetch } from "../infra/fetch.js";

/**
 * Signal RPC 请求配置选项
 */
export type SignalRpcOptions = {
  /** signal-cli 守护进程的基础 URL */
  baseUrl: string;
  /** 请求超时时间（毫秒） */
  timeoutMs?: number;
};

/**
 * Signal RPC 错误响应结构
 */
export type SignalRpcError = {
  /** 错误代码 */
  code?: number;
  /** 错误消息 */
  message?: string;
  /** 附加错误数据 */
  data?: unknown;
};

/**
 * Signal RPC 响应结构
 * @template T 响应结果的类型
 */
export type SignalRpcResponse<T> = {
  /** JSON-RPC 版本号 */
  jsonrpc?: string;
  /** 请求成功时的结果 */
  result?: T;
  /** 请求失败时的错误信息 */
  error?: SignalRpcError;
  /** 请求 ID */
  id?: string | number | null;
};

/**
 * Signal SSE（Server-Sent Events）事件结构
 */
export type SignalSseEvent = {
  /** 事件类型 */
  event?: string;
  /** 事件数据 */
  data?: string;
  /** 事件 ID */
  id?: string;
};

/** 默认请求超时时间：10 秒 */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * 规范化基础 URL
 *
 * 处理 URL 格式，确保包含协议前缀并移除尾部斜杠。
 *
 * @param url - 原始 URL 字符串
 * @returns 规范化后的 URL
 * @throws 当 URL 为空时抛出错误
 */
function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Signal base URL is required");
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  return `http://${trimmed}`.replace(/\/+$/, "");
}

/**
 * 带超时的 fetch 请求
 *
 * 封装原生 fetch，添加超时控制功能。
 *
 * @param url - 请求 URL
 * @param init - fetch 请求配置
 * @param timeoutMs - 超时时间（毫秒）
 * @returns fetch 响应
 * @throws 当 fetch 不可用或请求超时时抛出错误
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const fetchImpl = resolveFetch();
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 发送 Signal JSON-RPC 请求
 *
 * 向 signal-cli 守护进程发送 JSON-RPC 2.0 格式的请求。
 *
 * @template T 响应结果的类型
 * @param method - RPC 方法名
 * @param params - 方法参数
 * @param opts - RPC 配置选项
 * @returns 请求结果
 * @throws 当响应为空或包含错误时抛出错误
 */
export async function signalRpcRequest<T = unknown>(
  method: string,
  params: Record<string, unknown> | undefined,
  opts: SignalRpcOptions,
): Promise<T> {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const id = randomUUID();
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method,
    params,
    id,
  });
  const res = await fetchWithTimeout(
    `${baseUrl}/api/v1/rpc`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  if (res.status === 201) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    throw new Error(`Signal RPC empty response (status ${res.status})`);
  }
  const parsed = JSON.parse(text) as SignalRpcResponse<T>;
  if (parsed.error) {
    const code = parsed.error.code ?? "unknown";
    const msg = parsed.error.message ?? "Signal RPC error";
    throw new Error(`Signal RPC ${code}: ${msg}`);
  }
  return parsed.result as T;
}

/**
 * 检查 Signal 守护进程健康状态
 *
 * 向 signal-cli 守护进程发送健康检查请求，验证服务是否正常运行。
 *
 * @param baseUrl - signal-cli 守护进程的基础 URL
 * @param timeoutMs - 请求超时时间（毫秒），默认 10 秒
 * @returns 健康检查结果，包含状态码和错误信息
 */
export async function signalCheck(
  baseUrl: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ ok: boolean; status?: number | null; error?: string | null }> {
  const normalized = normalizeBaseUrl(baseUrl);
  try {
    const res = await fetchWithTimeout(`${normalized}/api/v1/check`, { method: "GET" }, timeoutMs);
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, error: null };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 流式接收 Signal SSE 事件
 *
 * 建立与 signal-cli 守护进程的 SSE 连接，实时接收消息事件。
 * 支持按账户过滤事件，并通过回调函数处理每个事件。
 *
 * @param params - 流式事件参数
 * @param params.baseUrl - signal-cli 守护进程的基础 URL
 * @param params.account - 可选的 Signal 账户标识
 * @param params.abortSignal - 可选的中止信号，用于取消连接
 * @param params.onEvent - 事件处理回调函数
 * @throws 当 fetch 不可用或 SSE 连接失败时抛出错误
 */
export async function streamSignalEvents(params: {
  baseUrl: string;
  account?: string;
  abortSignal?: AbortSignal;
  onEvent: (event: SignalSseEvent) => void;
}): Promise<void> {
  const baseUrl = normalizeBaseUrl(params.baseUrl);
  const url = new URL(`${baseUrl}/api/v1/events`);
  if (params.account) url.searchParams.set("account", params.account);

  const fetchImpl = resolveFetch();
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }
  const res = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "text/event-stream" },
    signal: params.abortSignal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Signal SSE failed (${res.status} ${res.statusText || "error"})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  /** 数据缓冲区，用于处理跨块的行 */
  let buffer = "";
  /** 当前正在解析的事件 */
  let currentEvent: SignalSseEvent = {};

  /**
   * 刷新当前事件
   * 当遇到空行时调用，将累积的事件数据发送给回调函数
   */
  const flushEvent = () => {
    if (!currentEvent.data && !currentEvent.event && !currentEvent.id) return;
    params.onEvent({
      event: currentEvent.event,
      data: currentEvent.data,
      id: currentEvent.id,
    });
    currentEvent = {};
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let lineEnd = buffer.indexOf("\n");
    while (lineEnd !== -1) {
      let line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);

      if (line === "") {
        flushEvent();
        lineEnd = buffer.indexOf("\n");
        continue;
      }
      if (line.startsWith(":")) {
        lineEnd = buffer.indexOf("\n");
        continue;
      }
      const [rawField, ...rest] = line.split(":");
      const field = rawField.trim();
      const rawValue = rest.join(":");
      const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
      if (field === "event") {
        currentEvent.event = value;
      } else if (field === "data") {
        currentEvent.data = currentEvent.data ? `${currentEvent.data}\n${value}` : value;
      } else if (field === "id") {
        currentEvent.id = value;
      }
      lineEnd = buffer.indexOf("\n");
    }
  }

  flushEvent();
}
