/**
 * Gateway 调用模块
 * 提供与 Gateway 服务器通信的客户端功能，包括连接建立、认证和 RPC 调用
 */
import { randomUUID } from "node:crypto";
import type { MoltbotConfig } from "../config/config.js";
import {
  loadConfig,
  resolveConfigPath,
  resolveGatewayPort,
  resolveStateDir,
} from "../config/config.js";
import { pickPrimaryTailnetIPv4 } from "../infra/tailnet.js";
import { loadOrCreateDeviceIdentity } from "../infra/device-identity.js";
import {
  GATEWAY_CLIENT_MODES,
  GATEWAY_CLIENT_NAMES,
  type GatewayClientMode,
  type GatewayClientName,
} from "../utils/message-channel.js";
import { loadGatewayTlsRuntime } from "../infra/tls/gateway.js";
import { GatewayClient } from "./client.js";
import { PROTOCOL_VERSION } from "./protocol/index.js";

/** Gateway 调用选项 */
export type CallGatewayOptions = {
  /** Gateway URL（可选，覆盖配置） */
  url?: string;
  /** 认证令牌 */
  token?: string;
  /** 认证密码 */
  password?: string;
  /** TLS 证书指纹 */
  tlsFingerprint?: string;
  /** Moltbot 配置 */
  config?: MoltbotConfig;
  /** RPC 方法名 */
  method: string;
  /** RPC 参数 */
  params?: unknown;
  /** 是否期望最终响应 */
  expectFinal?: boolean;
  /** 超时毫秒数 */
  timeoutMs?: number;
  /** 客户端名称 */
  clientName?: GatewayClientName;
  /** 客户端显示名称 */
  clientDisplayName?: string;
  /** 客户端版本 */
  clientVersion?: string;
  /** 平台标识 */
  platform?: string;
  /** 客户端模式 */
  mode?: GatewayClientMode;
  /** 实例 ID */
  instanceId?: string;
  /** 最小协议版本 */
  minProtocol?: number;
  /** 最大协议版本 */
  maxProtocol?: number;
  /**
   * 覆盖连接错误详情中显示的配置路径
   * 不影响配置加载；调用者仍通过 opts.token/password/env/config 控制认证
   */
  configPath?: string;
};

/** Gateway 连接详情 */
export type GatewayConnectionDetails = {
  /** 连接 URL */
  url: string;
  /** URL 来源说明 */
  urlSource: string;
  /** 绑定详情 */
  bindDetail?: string;
  /** 远程回退说明 */
  remoteFallbackNote?: string;
  /** 完整消息 */
  message: string;
};

/**
 * 构建 Gateway 连接详情
 * 根据配置和选项确定连接 URL 及相关信息
 * @param options - 选项
 * @returns 连接详情对象
 */
export function buildGatewayConnectionDetails(
  options: { config?: MoltbotConfig; url?: string; configPath?: string } = {},
): GatewayConnectionDetails {
  const config = options.config ?? loadConfig();
  const configPath =
    options.configPath ?? resolveConfigPath(process.env, resolveStateDir(process.env));
  const isRemoteMode = config.gateway?.mode === "remote";
  const remote = isRemoteMode ? config.gateway?.remote : undefined;
  const tlsEnabled = config.gateway?.tls?.enabled === true;
  const localPort = resolveGatewayPort(config);
  const tailnetIPv4 = pickPrimaryTailnetIPv4();
  const bindMode = config.gateway?.bind ?? "loopback";
  const preferTailnet = bindMode === "tailnet" && !!tailnetIPv4;
  const scheme = tlsEnabled ? "wss" : "ws";
  const localUrl =
    preferTailnet && tailnetIPv4
      ? `${scheme}://${tailnetIPv4}:${localPort}`
      : `${scheme}://127.0.0.1:${localPort}`;
  const urlOverride =
    typeof options.url === "string" && options.url.trim().length > 0
      ? options.url.trim()
      : undefined;
  const remoteUrl =
    typeof remote?.url === "string" && remote.url.trim().length > 0 ? remote.url.trim() : undefined;
  const remoteMisconfigured = isRemoteMode && !urlOverride && !remoteUrl;
  const url = urlOverride || remoteUrl || localUrl;
  const urlSource = urlOverride
    ? "cli --url"
    : remoteUrl
      ? "config gateway.remote.url"
      : remoteMisconfigured
        ? "missing gateway.remote.url (fallback local)"
        : preferTailnet && tailnetIPv4
          ? `local tailnet ${tailnetIPv4}`
          : "local loopback";
  const remoteFallbackNote = remoteMisconfigured
    ? "Warn: gateway.mode=remote but gateway.remote.url is missing; set gateway.remote.url or switch gateway.mode=local."
    : undefined;
  const bindDetail = !urlOverride && !remoteUrl ? `Bind: ${bindMode}` : undefined;
  const message = [
    `Gateway target: ${url}`,
    `Source: ${urlSource}`,
    `Config: ${configPath}`,
    bindDetail,
    remoteFallbackNote,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    url,
    urlSource,
    bindDetail,
    remoteFallbackNote,
    message,
  };
}

/**
 * 调用 Gateway RPC 方法
 * 建立 WebSocket 连接，发送请求并等待响应
 * @param opts - 调用选项
 * @returns RPC 响应结果
 */
export async function callGateway<T = unknown>(opts: CallGatewayOptions): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const config = opts.config ?? loadConfig();
  const isRemoteMode = config.gateway?.mode === "remote";
  const remote = isRemoteMode ? config.gateway?.remote : undefined;
  const urlOverride =
    typeof opts.url === "string" && opts.url.trim().length > 0 ? opts.url.trim() : undefined;
  const remoteUrl =
    typeof remote?.url === "string" && remote.url.trim().length > 0 ? remote.url.trim() : undefined;

  // 检查远程模式配置是否正确
  if (isRemoteMode && !urlOverride && !remoteUrl) {
    const configPath =
      opts.configPath ?? resolveConfigPath(process.env, resolveStateDir(process.env));
    throw new Error(
      [
        "gateway remote mode misconfigured: gateway.remote.url missing",
        `Config: ${configPath}`,
        "Fix: set gateway.remote.url, or set gateway.mode=local.",
      ].join("\n"),
    );
  }

  // 解析认证信息
  const authToken = config.gateway?.auth?.token;
  const authPassword = config.gateway?.auth?.password;
  const connectionDetails = buildGatewayConnectionDetails({
    config,
    url: urlOverride,
    ...(opts.configPath ? { configPath: opts.configPath } : {}),
  });
  const url = connectionDetails.url;

  // 处理 TLS 配置
  const useLocalTls =
    config.gateway?.tls?.enabled === true && !urlOverride && !remoteUrl && url.startsWith("wss://");
  const tlsRuntime = useLocalTls ? await loadGatewayTlsRuntime(config.gateway?.tls) : undefined;
  const remoteTlsFingerprint =
    isRemoteMode && !urlOverride && remoteUrl && typeof remote?.tlsFingerprint === "string"
      ? remote.tlsFingerprint.trim()
      : undefined;
  const overrideTlsFingerprint =
    typeof opts.tlsFingerprint === "string" ? opts.tlsFingerprint.trim() : undefined;
  const tlsFingerprint =
    overrideTlsFingerprint ||
    remoteTlsFingerprint ||
    (tlsRuntime?.enabled ? tlsRuntime.fingerprintSha256 : undefined);

  // 解析令牌
  const token =
    (typeof opts.token === "string" && opts.token.trim().length > 0
      ? opts.token.trim()
      : undefined) ||
    (isRemoteMode
      ? typeof remote?.token === "string" && remote.token.trim().length > 0
        ? remote.token.trim()
        : undefined
      : process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() ||
        (typeof authToken === "string" && authToken.trim().length > 0
          ? authToken.trim()
          : undefined));

  // 解析密码
  const password =
    (typeof opts.password === "string" && opts.password.trim().length > 0
      ? opts.password.trim()
      : undefined) ||
    process.env.CLAWDBOT_GATEWAY_PASSWORD?.trim() ||
    (isRemoteMode
      ? typeof remote?.password === "string" && remote.password.trim().length > 0
        ? remote.password.trim()
        : undefined
      : typeof authPassword === "string" && authPassword.trim().length > 0
        ? authPassword.trim()
        : undefined);

  // 格式化关闭错误消息
  const formatCloseError = (code: number, reason: string) => {
    const reasonText = reason?.trim() || "no close reason";
    const hint =
      code === 1006 ? "abnormal closure (no close frame)" : code === 1000 ? "normal closure" : "";
    const suffix = hint ? ` ${hint}` : "";
    return `gateway closed (${code}${suffix}): ${reasonText}\n${connectionDetails.message}`;
  };

  // 格式化超时错误消息
  const formatTimeoutError = () =>
    `gateway timeout after ${timeoutMs}ms\n${connectionDetails.message}`;

  // 执行 RPC 调用
  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    let ignoreClose = false;

    const stop = (err?: Error, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(value as T);
    };

    // 创建 Gateway 客户端
    const client = new GatewayClient({
      url,
      token,
      password,
      tlsFingerprint,
      instanceId: opts.instanceId ?? randomUUID(),
      clientName: opts.clientName ?? GATEWAY_CLIENT_NAMES.CLI,
      clientDisplayName: opts.clientDisplayName,
      clientVersion: opts.clientVersion ?? "dev",
      platform: opts.platform,
      mode: opts.mode ?? GATEWAY_CLIENT_MODES.CLI,
      role: "operator",
      scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
      deviceIdentity: loadOrCreateDeviceIdentity(),
      minProtocol: opts.minProtocol ?? PROTOCOL_VERSION,
      maxProtocol: opts.maxProtocol ?? PROTOCOL_VERSION,
      onHelloOk: async () => {
        try {
          const result = await client.request<T>(opts.method, opts.params, {
            expectFinal: opts.expectFinal,
          });
          ignoreClose = true;
          stop(undefined, result);
          client.stop();
        } catch (err) {
          ignoreClose = true;
          client.stop();
          stop(err as Error);
        }
      },
      onClose: (code, reason) => {
        if (settled || ignoreClose) return;
        ignoreClose = true;
        client.stop();
        stop(new Error(formatCloseError(code, reason)));
      },
    });

    // 设置超时定时器
    const timer = setTimeout(() => {
      ignoreClose = true;
      client.stop();
      stop(new Error(formatTimeoutError()));
    }, timeoutMs);

    // 启动客户端
    client.start();
  });
}

/**
 * 生成随机幂等键
 * @returns UUID 字符串
 */
export function randomIdempotencyKey() {
  return randomUUID();
}
