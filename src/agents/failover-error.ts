/**
 * 故障转移错误模块
 *
 * 提供 LLM 调用失败时的错误分类和故障转移支持，包括：
 * - 识别可重试的错误类型（超时、限流、认证等）
 * - 将普通错误转换为故障转移错误
 * - 提供错误描述和状态码映射
 */

import { classifyFailoverReason, type FailoverReason } from "./pi-embedded-helpers.js";

/** 超时提示正则 */
const TIMEOUT_HINT_RE = /timeout|timed out|deadline exceeded|context deadline exceeded/i;
/** 中止超时正则 */
const ABORT_TIMEOUT_RE = /request was aborted|request aborted/i;

/**
 * 故障转移错误
 *
 * 表示可以触发故障转移的错误，包含错误原因和上下文信息。
 */
export class FailoverError extends Error {
  /** 故障转移原因 */
  readonly reason: FailoverReason;
  /** 提供商 */
  readonly provider?: string;
  /** 模型 */
  readonly model?: string;
  /** 配置 ID */
  readonly profileId?: string;
  /** HTTP 状态码 */
  readonly status?: number;
  /** 错误代码 */
  readonly code?: string;

  constructor(
    message: string,
    params: {
      reason: FailoverReason;
      provider?: string;
      model?: string;
      profileId?: string;
      status?: number;
      code?: string;
      cause?: unknown;
    },
  ) {
    super(message, { cause: params.cause });
    this.name = "FailoverError";
    this.reason = params.reason;
    this.provider = params.provider;
    this.model = params.model;
    this.profileId = params.profileId;
    this.status = params.status;
    this.code = params.code;
  }
}

/**
 * 检查是否为故障转移错误
 */
export function isFailoverError(err: unknown): err is FailoverError {
  return err instanceof FailoverError;
}

/**
 * 根据故障转移原因解析 HTTP 状态码
 */
export function resolveFailoverStatus(reason: FailoverReason): number | undefined {
  switch (reason) {
    case "billing":
      return 402;
    case "rate_limit":
      return 429;
    case "auth":
      return 401;
    case "timeout":
      return 408;
    case "format":
      return 400;
    default:
      return undefined;
  }
}

function getStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const candidate =
    (err as { status?: unknown; statusCode?: unknown }).status ??
    (err as { statusCode?: unknown }).statusCode;
  if (typeof candidate === "number") return candidate;
  if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
    return Number(candidate);
  }
  return undefined;
}

function getErrorName(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  return "name" in err ? String(err.name) : "";
}

function getErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const candidate = (err as { code?: unknown }).code;
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  return trimmed ? trimmed : undefined;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "number" || typeof err === "boolean" || typeof err === "bigint") {
    return String(err);
  }
  if (typeof err === "symbol") return err.description ?? "";
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

function hasTimeoutHint(err: unknown): boolean {
  if (!err) return false;
  if (getErrorName(err) === "TimeoutError") return true;
  const message = getErrorMessage(err);
  return Boolean(message && TIMEOUT_HINT_RE.test(message));
}

/**
 * 检查是否为超时错误
 */
export function isTimeoutError(err: unknown): boolean {
  if (hasTimeoutHint(err)) return true;
  if (!err || typeof err !== "object") return false;
  if (getErrorName(err) !== "AbortError") return false;
  const message = getErrorMessage(err);
  if (message && ABORT_TIMEOUT_RE.test(message)) return true;
  const cause = "cause" in err ? (err as { cause?: unknown }).cause : undefined;
  const reason = "reason" in err ? (err as { reason?: unknown }).reason : undefined;
  return hasTimeoutHint(cause) || hasTimeoutHint(reason);
}

/**
 * 从错误中解析故障转移原因
 */
export function resolveFailoverReasonFromError(err: unknown): FailoverReason | null {
  if (isFailoverError(err)) return err.reason;

  const status = getStatusCode(err);
  if (status === 402) return "billing";
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status === 408) return "timeout";

  const code = (getErrorCode(err) ?? "").toUpperCase();
  if (["ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNRESET", "ECONNABORTED"].includes(code)) {
    return "timeout";
  }
  if (isTimeoutError(err)) return "timeout";

  const message = getErrorMessage(err);
  if (!message) return null;
  return classifyFailoverReason(message);
}

/**
 * 描述故障转移错误
 */
export function describeFailoverError(err: unknown): {
  message: string;
  reason?: FailoverReason;
  status?: number;
  code?: string;
} {
  if (isFailoverError(err)) {
    return {
      message: err.message,
      reason: err.reason,
      status: err.status,
      code: err.code,
    };
  }
  const message = getErrorMessage(err) || String(err);
  return {
    message,
    reason: resolveFailoverReasonFromError(err) ?? undefined,
    status: getStatusCode(err),
    code: getErrorCode(err),
  };
}

/**
 * 将普通错误转换为故障转移错误
 *
 * 如果错误可以被识别为可重试的类型，则转换为 FailoverError。
 */
export function coerceToFailoverError(
  err: unknown,
  context?: {
    provider?: string;
    model?: string;
    profileId?: string;
  },
): FailoverError | null {
  if (isFailoverError(err)) return err;
  const reason = resolveFailoverReasonFromError(err);
  if (!reason) return null;

  const message = getErrorMessage(err) || String(err);
  const status = getStatusCode(err) ?? resolveFailoverStatus(reason);
  const code = getErrorCode(err);

  return new FailoverError(message, {
    reason,
    provider: context?.provider,
    model: context?.model,
    profileId: context?.profileId,
    status,
    code,
    cause: err instanceof Error ? err : undefined,
  });
}
