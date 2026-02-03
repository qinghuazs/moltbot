/**
 * HTTP 通用工具模块
 * 提供 HTTP 响应发送、SSE 流式响应等通用功能
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import { readJsonBody } from "./hooks.js";

/**
 * 发送 JSON 响应
 * @param res - HTTP 响应对象
 * @param status - HTTP 状态码
 * @param body - 响应体
 */
export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/**
 * 发送纯文本响应
 * @param res - HTTP 响应对象
 * @param status - HTTP 状态码
 * @param body - 响应体
 */
export function sendText(res: ServerResponse, status: number, body: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(body);
}

/**
 * 发送 405 方法不允许响应
 * @param res - HTTP 响应对象
 * @param allow - 允许的方法
 */
export function sendMethodNotAllowed(res: ServerResponse, allow = "POST") {
  res.setHeader("Allow", allow);
  sendText(res, 405, "Method Not Allowed");
}

/**
 * 发送 401 未授权响应
 * @param res - HTTP 响应对象
 */
export function sendUnauthorized(res: ServerResponse) {
  sendJson(res, 401, {
    error: { message: "Unauthorized", type: "unauthorized" },
  });
}

/**
 * 发送 400 无效请求响应
 * @param res - HTTP 响应对象
 * @param message - 错误消息
 */
export function sendInvalidRequest(res: ServerResponse, message: string) {
  sendJson(res, 400, {
    error: { message, type: "invalid_request_error" },
  });
}

/**
 * 读取 JSON 请求体，失败时发送错误响应
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param maxBytes - 最大字节数
 * @returns 解析后的 JSON 对象，失败返回 undefined
 */
export async function readJsonBodyOrError(
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes: number,
): Promise<unknown> {
  const body = await readJsonBody(req, maxBytes);
  if (!body.ok) {
    sendInvalidRequest(res, body.error);
    return undefined;
  }
  return body.value;
}

/**
 * 写入 SSE 流结束标记
 * @param res - HTTP 响应对象
 */
export function writeDone(res: ServerResponse) {
  res.write("data: [DONE]\n\n");
}

/**
 * 设置 SSE 流式响应头
 * @param res - HTTP 响应对象
 */
export function setSseHeaders(res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}
