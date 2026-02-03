/**
 * 错误处理工具模块
 * 提供错误码提取、错误消息格式化等功能
 */

/**
 * 从错误对象中提取错误码
 * @param err - 错误对象
 * @returns 错误码字符串，无法提取返回 undefined
 */
export function extractErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string") return code;
  if (typeof code === "number") return String(code);
  return undefined;
}

/**
 * 格式化错误消息
 * 将各种类型的错误转换为可读字符串
 * @param err - 错误对象
 * @returns 格式化后的错误消息
 */
export function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name || "Error";
  }
  if (typeof err === "string") return err;
  if (typeof err === "number" || typeof err === "boolean" || typeof err === "bigint") {
    return String(err);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return Object.prototype.toString.call(err);
  }
}

/**
 * 格式化未捕获的错误
 * 对于配置错误只显示消息，其他错误显示完整堆栈
 * @param err - 错误对象
 * @returns 格式化后的错误信息
 */
export function formatUncaughtError(err: unknown): string {
  // 配置错误只显示消息，不显示堆栈
  if (extractErrorCode(err) === "INVALID_CONFIG") {
    return formatErrorMessage(err);
  }
  if (err instanceof Error) {
    return err.stack ?? err.message ?? err.name;
  }
  return formatErrorMessage(err);
}
