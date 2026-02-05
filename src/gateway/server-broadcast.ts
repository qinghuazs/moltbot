/**
 * 网关广播模块
 *
 * 提供向所有连接的 WebSocket 客户端广播事件的功能，包括：
 * - 基于权限范围的事件过滤
 * - 慢消费者检测和处理
 * - 事件序列号管理
 */

import type { GatewayWsClient } from "./server/ws-types.js";
import { MAX_BUFFERED_BYTES } from "./server-constants.js";
import { logWs, summarizeAgentEventForWsLog } from "./ws-log.js";

/** 管理员权限范围 */
const ADMIN_SCOPE = "operator.admin";
/** 审批权限范围 */
const APPROVALS_SCOPE = "operator.approvals";
/** 配对权限范围 */
const PAIRING_SCOPE = "operator.pairing";

/**
 * 事件权限范围映射
 * 定义哪些事件需要哪些权限范围
 */
const EVENT_SCOPE_GUARDS: Record<string, string[]> = {
  "exec.approval.requested": [APPROVALS_SCOPE],
  "exec.approval.resolved": [APPROVALS_SCOPE],
  "device.pair.requested": [PAIRING_SCOPE],
  "device.pair.resolved": [PAIRING_SCOPE],
  "node.pair.requested": [PAIRING_SCOPE],
  "node.pair.resolved": [PAIRING_SCOPE],
};

/**
 * 检查客户端是否有接收指定事件的权限
 */
function hasEventScope(client: GatewayWsClient, event: string): boolean {
  const required = EVENT_SCOPE_GUARDS[event];
  if (!required) return true;
  const role = client.connect.role ?? "operator";
  if (role !== "operator") return false;
  const scopes = Array.isArray(client.connect.scopes) ? client.connect.scopes : [];
  if (scopes.includes(ADMIN_SCOPE)) return true;
  return required.some((scope) => scopes.includes(scope));
}

/**
 * 创建网关广播器
 *
 * @param params.clients - 已连接的客户端集合
 * @returns 广播器对象
 */
export function createGatewayBroadcaster(params: { clients: Set<GatewayWsClient> }) {
  let seq = 0;
  const broadcast = (
    event: string,
    payload: unknown,
    opts?: {
      dropIfSlow?: boolean;
      stateVersion?: { presence?: number; health?: number };
    },
  ) => {
    const eventSeq = ++seq;
    const frame = JSON.stringify({
      type: "event",
      event,
      payload,
      seq: eventSeq,
      stateVersion: opts?.stateVersion,
    });
    const logMeta: Record<string, unknown> = {
      event,
      seq: eventSeq,
      clients: params.clients.size,
      dropIfSlow: opts?.dropIfSlow,
      presenceVersion: opts?.stateVersion?.presence,
      healthVersion: opts?.stateVersion?.health,
    };
    if (event === "agent") {
      Object.assign(logMeta, summarizeAgentEventForWsLog(payload));
    }
    logWs("out", "event", logMeta);
    for (const c of params.clients) {
      if (!hasEventScope(c, event)) continue;
      const slow = c.socket.bufferedAmount > MAX_BUFFERED_BYTES;
      if (slow && opts?.dropIfSlow) continue;
      if (slow) {
        try {
          c.socket.close(1008, "slow consumer");
        } catch {
          /* ignore */
        }
        continue;
      }
      try {
        c.socket.send(frame);
      } catch {
        /* ignore */
      }
    }
  };
  return { broadcast };
}
