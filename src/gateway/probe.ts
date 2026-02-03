/**
 * 网关探测模块
 * 提供网关连接探测和健康检查功能
 */
import { randomUUID } from "node:crypto";

import type { SystemPresence } from "../infra/system-presence.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.js";
import { GatewayClient } from "./client.js";

/** 网关探测认证信息 */
export type GatewayProbeAuth = {
  /** 令牌 */
  token?: string;
  /** 密码 */
  password?: string;
};

/** 网关探测关闭信息 */
export type GatewayProbeClose = {
  /** 关闭代码 */
  code: number;
  /** 关闭原因 */
  reason: string;
  /** 提示信息 */
  hint?: string;
};

/** 网关探测结果 */
export type GatewayProbeResult = {
  /** 是否成功 */
  ok: boolean;
  /** 探测 URL */
  url: string;
  /** 连接延迟（毫秒） */
  connectLatencyMs: number | null;
  /** 错误信息 */
  error: string | null;
  /** 关闭信息 */
  close: GatewayProbeClose | null;
  /** 健康状态 */
  health: unknown;
  /** 状态信息 */
  status: unknown;
  /** 系统存在信息 */
  presence: SystemPresence[] | null;
  /** 配置快照 */
  configSnapshot: unknown;
};

/**
 * 格式化错误信息
 * @param err - 错误对象
 * @returns 错误消息字符串
 */
function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * 探测网关
 * 连接到网关并获取健康状态、状态信息等
 * @param opts - 探测选项
 * @returns 探测结果
 */
export async function probeGateway(opts: {
  url: string;
  auth?: GatewayProbeAuth;
  timeoutMs: number;
}): Promise<GatewayProbeResult> {
  const startedAt = Date.now();
  const instanceId = randomUUID();
  let connectLatencyMs: number | null = null;
  let connectError: string | null = null;
  let close: GatewayProbeClose | null = null;

  return await new Promise<GatewayProbeResult>((resolve) => {
    let settled = false;
    const settle = (result: Omit<GatewayProbeResult, "url">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.stop();
      resolve({ url: opts.url, ...result });
    };

    const client = new GatewayClient({
      url: opts.url,
      token: opts.auth?.token,
      password: opts.auth?.password,
      clientName: GATEWAY_CLIENT_NAMES.CLI,
      clientVersion: "dev",
      mode: GATEWAY_CLIENT_MODES.PROBE,
      instanceId,
      onConnectError: (err) => {
        connectError = formatError(err);
      },
      onClose: (code, reason) => {
        close = { code, reason };
      },
      onHelloOk: async () => {
        connectLatencyMs = Date.now() - startedAt;
        try {
          const [health, status, presence, configSnapshot] = await Promise.all([
            client.request("health"),
            client.request("status"),
            client.request("system-presence"),
            client.request("config.get", {}),
          ]);
          settle({
            ok: true,
            connectLatencyMs,
            error: null,
            close,
            health,
            status,
            presence: Array.isArray(presence) ? (presence as SystemPresence[]) : null,
            configSnapshot,
          });
        } catch (err) {
          settle({
            ok: false,
            connectLatencyMs,
            error: formatError(err),
            close,
            health: null,
            status: null,
            presence: null,
            configSnapshot: null,
          });
        }
      },
    });

    const timer = setTimeout(
      () => {
        settle({
          ok: false,
          connectLatencyMs,
          error: connectError ? `connect failed: ${connectError}` : "timeout",
          close,
          health: null,
          status: null,
          presence: null,
          configSnapshot: null,
        });
      },
      Math.max(250, opts.timeoutMs),
    );

    client.start();
  });
}
