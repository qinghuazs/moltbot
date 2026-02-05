/**
 * 网关客户端模块
 *
 * 提供与 Moltbot 网关服务器通信的 WebSocket 客户端实现，包括：
 * - 自动重连和指数退避
 * - 设备身份认证和令牌管理
 * - TLS 指纹验证
 * - 心跳检测和连接健康监控
 */

import { randomUUID } from "node:crypto";
import { WebSocket, type ClientOptions, type CertMeta } from "ws";
import { normalizeFingerprint } from "../infra/tls/fingerprint.js";
import { rawDataToString } from "../infra/ws.js";
import { logDebug, logError } from "../logger.js";
import type { DeviceIdentity } from "../infra/device-identity.js";
import {
  loadOrCreateDeviceIdentity,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
} from "../infra/device-identity.js";
import {
  clearDeviceAuthToken,
  loadDeviceAuthToken,
  storeDeviceAuthToken,
} from "../infra/device-auth-store.js";
import {
  GATEWAY_CLIENT_MODES,
  GATEWAY_CLIENT_NAMES,
  type GatewayClientMode,
  type GatewayClientName,
} from "../utils/message-channel.js";
import { buildDeviceAuthPayload } from "./device-auth.js";
import {
  type ConnectParams,
  type EventFrame,
  type HelloOk,
  PROTOCOL_VERSION,
  type RequestFrame,
  validateEventFrame,
  validateRequestFrame,
  validateResponseFrame,
} from "./protocol/index.js";

/**
 * 待处理请求的回调
 */
type Pending = {
  /** 成功回调 */
  resolve: (value: unknown) => void;
  /** 失败回调 */
  reject: (err: unknown) => void;
  /** 是否期望最终响应（而非仅确认） */
  expectFinal: boolean;
};

/**
 * 网关客户端配置选项
 */
export type GatewayClientOptions = {
  /** WebSocket 连接 URL（默认 ws://127.0.0.1:18789） */
  url?: string;
  /** 认证令牌 */
  token?: string;
  /** 认证密码 */
  password?: string;
  /** 客户端实例 ID */
  instanceId?: string;
  /** 客户端名称标识 */
  clientName?: GatewayClientName;
  /** 客户端显示名称 */
  clientDisplayName?: string;
  /** 客户端版本 */
  clientVersion?: string;
  /** 运行平台 */
  platform?: string;
  /** 客户端模式 */
  mode?: GatewayClientMode;
  /** 角色（如 operator） */
  role?: string;
  /** 权限范围 */
  scopes?: string[];
  /** 客户端能力 */
  caps?: string[];
  /** 支持的命令 */
  commands?: string[];
  /** 权限映射 */
  permissions?: Record<string, boolean>;
  /** PATH 环境变量 */
  pathEnv?: string;
  /** 设备身份信息 */
  deviceIdentity?: DeviceIdentity;
  /** 最小协议版本 */
  minProtocol?: number;
  /** 最大协议版本 */
  maxProtocol?: number;
  /** TLS 证书指纹（用于验证服务器） */
  tlsFingerprint?: string;
  /** 事件回调 */
  onEvent?: (evt: EventFrame) => void;
  /** 连接成功回调 */
  onHelloOk?: (hello: HelloOk) => void;
  /** 连接错误回调 */
  onConnectError?: (err: Error) => void;
  /** 连接关闭回调 */
  onClose?: (code: number, reason: string) => void;
  /** 序列号间隙回调 */
  onGap?: (info: { expected: number; received: number }) => void;
};

/**
 * 网关关闭代码说明映射
 */
export const GATEWAY_CLOSE_CODE_HINTS: Readonly<Record<number, string>> = {
  1000: "normal closure",
  1006: "abnormal closure (no close frame)",
  1008: "policy violation",
  1012: "service restart",
};

/**
 * 获取网关关闭代码的描述
 */
export function describeGatewayCloseCode(code: number): string | undefined {
  return GATEWAY_CLOSE_CODE_HINTS[code];
}

/**
 * 网关 WebSocket 客户端
 *
 * 提供与网关服务器的持久连接，支持：
 * - 自动重连（指数退避）
 * - 设备身份认证
 * - 请求/响应模式
 * - 心跳检测
 */
export class GatewayClient {
  /** WebSocket 连接实例 */
  private ws: WebSocket | null = null;
  /** 客户端配置 */
  private opts: GatewayClientOptions;
  /** 待处理请求映射 */
  private pending = new Map<string, Pending>();
  /** 重连退避时间（毫秒） */
  private backoffMs = 1000;
  /** 是否已关闭 */
  private closed = false;
  /** 最后接收的序列号 */
  private lastSeq: number | null = null;
  /** 连接挑战 nonce */
  private connectNonce: string | null = null;
  /** 是否已发送连接请求 */
  private connectSent = false;
  /** 连接定时器 */
  private connectTimer: NodeJS.Timeout | null = null;
  /** 最后心跳时间戳（用于检测静默停滞） */
  private lastTick: number | null = null;
  /** 心跳间隔（毫秒） */
  private tickIntervalMs = 30_000;
  /** 心跳检测定时器 */
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(opts: GatewayClientOptions) {
    this.opts = {
      ...opts,
      deviceIdentity: opts.deviceIdentity ?? loadOrCreateDeviceIdentity(),
    };
  }

  start() {
    if (this.closed) return;
    const url = this.opts.url ?? "ws://127.0.0.1:18789";
    if (this.opts.tlsFingerprint && !url.startsWith("wss://")) {
      this.opts.onConnectError?.(new Error("gateway tls fingerprint requires wss:// gateway url"));
      return;
    }
    // Allow node screen snapshots and other large responses.
    const wsOptions: ClientOptions = {
      maxPayload: 25 * 1024 * 1024,
    };
    if (url.startsWith("wss://") && this.opts.tlsFingerprint) {
      wsOptions.rejectUnauthorized = false;
      wsOptions.checkServerIdentity = ((_host: string, cert: CertMeta) => {
        const fingerprintValue =
          typeof cert === "object" && cert && "fingerprint256" in cert
            ? ((cert as { fingerprint256?: string }).fingerprint256 ?? "")
            : "";
        const fingerprint = normalizeFingerprint(
          typeof fingerprintValue === "string" ? fingerprintValue : "",
        );
        const expected = normalizeFingerprint(this.opts.tlsFingerprint ?? "");
        if (!expected) {
          return new Error("gateway tls fingerprint missing");
        }
        if (!fingerprint) {
          return new Error("gateway tls fingerprint unavailable");
        }
        if (fingerprint !== expected) {
          return new Error("gateway tls fingerprint mismatch");
        }
        return undefined;
      }) as any;
    }
    this.ws = new WebSocket(url, wsOptions);

    this.ws.on("open", () => {
      if (url.startsWith("wss://") && this.opts.tlsFingerprint) {
        const tlsError = this.validateTlsFingerprint();
        if (tlsError) {
          this.opts.onConnectError?.(tlsError);
          this.ws?.close(1008, tlsError.message);
          return;
        }
      }
      this.queueConnect();
    });
    this.ws.on("message", (data) => this.handleMessage(rawDataToString(data)));
    this.ws.on("close", (code, reason) => {
      const reasonText = rawDataToString(reason);
      this.ws = null;
      this.flushPendingErrors(new Error(`gateway closed (${code}): ${reasonText}`));
      this.scheduleReconnect();
      this.opts.onClose?.(code, reasonText);
    });
    this.ws.on("error", (err) => {
      logDebug(`gateway client error: ${String(err)}`);
      if (!this.connectSent) {
        this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  stop() {
    this.closed = true;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.flushPendingErrors(new Error("gateway client stopped"));
  }

  private sendConnect() {
    if (this.connectSent) return;
    this.connectSent = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    const role = this.opts.role ?? "operator";
    const storedToken = this.opts.deviceIdentity
      ? loadDeviceAuthToken({ deviceId: this.opts.deviceIdentity.deviceId, role })?.token
      : null;
    const authToken = storedToken ?? this.opts.token ?? undefined;
    const canFallbackToShared = Boolean(storedToken && this.opts.token);
    const auth =
      authToken || this.opts.password
        ? {
            token: authToken,
            password: this.opts.password,
          }
        : undefined;
    const signedAtMs = Date.now();
    const nonce = this.connectNonce ?? undefined;
    const scopes = this.opts.scopes ?? ["operator.admin"];
    const device = (() => {
      if (!this.opts.deviceIdentity) return undefined;
      const payload = buildDeviceAuthPayload({
        deviceId: this.opts.deviceIdentity.deviceId,
        clientId: this.opts.clientName ?? GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
        clientMode: this.opts.mode ?? GATEWAY_CLIENT_MODES.BACKEND,
        role,
        scopes,
        signedAtMs,
        token: authToken ?? null,
        nonce,
      });
      const signature = signDevicePayload(this.opts.deviceIdentity.privateKeyPem, payload);
      return {
        id: this.opts.deviceIdentity.deviceId,
        publicKey: publicKeyRawBase64UrlFromPem(this.opts.deviceIdentity.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce,
      };
    })();
    const params: ConnectParams = {
      minProtocol: this.opts.minProtocol ?? PROTOCOL_VERSION,
      maxProtocol: this.opts.maxProtocol ?? PROTOCOL_VERSION,
      client: {
        id: this.opts.clientName ?? GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
        displayName: this.opts.clientDisplayName,
        version: this.opts.clientVersion ?? "dev",
        platform: this.opts.platform ?? process.platform,
        mode: this.opts.mode ?? GATEWAY_CLIENT_MODES.BACKEND,
        instanceId: this.opts.instanceId,
      },
      caps: Array.isArray(this.opts.caps) ? this.opts.caps : [],
      commands: Array.isArray(this.opts.commands) ? this.opts.commands : undefined,
      permissions:
        this.opts.permissions && typeof this.opts.permissions === "object"
          ? this.opts.permissions
          : undefined,
      pathEnv: this.opts.pathEnv,
      auth,
      role,
      scopes,
      device,
    };

    void this.request<HelloOk>("connect", params)
      .then((helloOk) => {
        const authInfo = helloOk?.auth;
        if (authInfo?.deviceToken && this.opts.deviceIdentity) {
          storeDeviceAuthToken({
            deviceId: this.opts.deviceIdentity.deviceId,
            role: authInfo.role ?? role,
            token: authInfo.deviceToken,
            scopes: authInfo.scopes ?? [],
          });
        }
        this.backoffMs = 1000;
        this.tickIntervalMs =
          typeof helloOk.policy?.tickIntervalMs === "number"
            ? helloOk.policy.tickIntervalMs
            : 30_000;
        this.lastTick = Date.now();
        this.startTickWatch();
        this.opts.onHelloOk?.(helloOk);
      })
      .catch((err) => {
        if (canFallbackToShared && this.opts.deviceIdentity) {
          clearDeviceAuthToken({
            deviceId: this.opts.deviceIdentity.deviceId,
            role,
          });
        }
        this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
        const msg = `gateway connect failed: ${String(err)}`;
        if (this.opts.mode === GATEWAY_CLIENT_MODES.PROBE) logDebug(msg);
        else logError(msg);
        this.ws?.close(1008, "connect failed");
      });
  }

  private handleMessage(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (validateEventFrame(parsed)) {
        const evt = parsed as EventFrame;
        if (evt.event === "connect.challenge") {
          const payload = evt.payload as { nonce?: unknown } | undefined;
          const nonce = payload && typeof payload.nonce === "string" ? payload.nonce : null;
          if (nonce) {
            this.connectNonce = nonce;
            this.sendConnect();
          }
          return;
        }
        const seq = typeof evt.seq === "number" ? evt.seq : null;
        if (seq !== null) {
          if (this.lastSeq !== null && seq > this.lastSeq + 1) {
            this.opts.onGap?.({ expected: this.lastSeq + 1, received: seq });
          }
          this.lastSeq = seq;
        }
        if (evt.event === "tick") {
          this.lastTick = Date.now();
        }
        this.opts.onEvent?.(evt);
        return;
      }
      if (validateResponseFrame(parsed)) {
        const pending = this.pending.get(parsed.id);
        if (!pending) return;
        // If the payload is an ack with status accepted, keep waiting for final.
        const payload = parsed.payload as { status?: unknown } | undefined;
        const status = payload?.status;
        if (pending.expectFinal && status === "accepted") {
          return;
        }
        this.pending.delete(parsed.id);
        if (parsed.ok) pending.resolve(parsed.payload);
        else pending.reject(new Error(parsed.error?.message ?? "unknown error"));
      }
    } catch (err) {
      logDebug(`gateway client parse error: ${String(err)}`);
    }
  }

  private queueConnect() {
    this.connectNonce = null;
    this.connectSent = false;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      this.sendConnect();
    }, 750);
  }

  private scheduleReconnect() {
    if (this.closed) return;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    setTimeout(() => this.start(), delay).unref();
  }

  private flushPendingErrors(err: Error) {
    for (const [, p] of this.pending) {
      p.reject(err);
    }
    this.pending.clear();
  }

  private startTickWatch() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    const interval = Math.max(this.tickIntervalMs, 1000);
    this.tickTimer = setInterval(() => {
      if (this.closed) return;
      if (!this.lastTick) return;
      const gap = Date.now() - this.lastTick;
      if (gap > this.tickIntervalMs * 2) {
        this.ws?.close(4000, "tick timeout");
      }
    }, interval);
  }

  private validateTlsFingerprint(): Error | null {
    if (!this.opts.tlsFingerprint || !this.ws) return null;
    const expected = normalizeFingerprint(this.opts.tlsFingerprint);
    if (!expected) return new Error("gateway tls fingerprint missing");
    const socket = (
      this.ws as WebSocket & {
        _socket?: { getPeerCertificate?: () => { fingerprint256?: string } };
      }
    )._socket;
    if (!socket || typeof socket.getPeerCertificate !== "function") {
      return new Error("gateway tls fingerprint unavailable");
    }
    const cert = socket.getPeerCertificate();
    const fingerprint = normalizeFingerprint(cert?.fingerprint256 ?? "");
    if (!fingerprint) return new Error("gateway tls fingerprint unavailable");
    if (fingerprint !== expected) return new Error("gateway tls fingerprint mismatch");
    return null;
  }

  async request<T = unknown>(
    method: string,
    params?: unknown,
    opts?: { expectFinal?: boolean },
  ): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }
    const id = randomUUID();
    const frame: RequestFrame = { type: "req", id, method, params };
    if (!validateRequestFrame(frame)) {
      throw new Error(
        `invalid request frame: ${JSON.stringify(validateRequestFrame.errors, null, 2)}`,
      );
    }
    const expectFinal = opts?.expectFinal === true;
    const p = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        expectFinal,
      });
    });
    this.ws.send(JSON.stringify(frame));
    return p;
  }
}
