/**
 * 网关认证模块
 *
 * 本模块负责处理网关的身份验证逻辑，支持多种认证方式：
 * - Token 认证：使用预共享令牌
 * - Password 认证：使用密码
 * - Tailscale 认证：通过 Tailscale 网络身份验证
 *
 * 提供时序安全的字符串比较，防止时序攻击。
 */
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { GatewayAuthConfig, GatewayTailscaleMode } from "../config/config.js";
import { readTailscaleWhoisIdentity, type TailscaleWhoisIdentity } from "../infra/tailscale.js";
import { isTrustedProxyAddress, parseForwardedForClientIp, resolveGatewayClientIp } from "./net.js";

/** 已解析的网关认证模式 */
export type ResolvedGatewayAuthMode = "token" | "password";

/** 已解析的网关认证配置 */
export type ResolvedGatewayAuth = {
  /** 认证模式 */
  mode: ResolvedGatewayAuthMode;
  /** 认证令牌 */
  token?: string;
  /** 认证密码 */
  password?: string;
  /** 是否允许 Tailscale 认证 */
  allowTailscale: boolean;
};

/** 网关认证结果 */
export type GatewayAuthResult = {
  /** 认证是否成功 */
  ok: boolean;
  /** 使用的认证方法 */
  method?: "token" | "password" | "tailscale" | "device-token";
  /** 认证用户标识 */
  user?: string;
  /** 失败原因 */
  reason?: string;
};

/** 连接认证凭证 */
type ConnectAuth = {
  token?: string;
  password?: string;
};

/** Tailscale 用户信息 */
type TailscaleUser = {
  /** 登录名 */
  login: string;
  /** 显示名称 */
  name: string;
  /** 头像 URL */
  profilePic?: string;
};

/** Tailscale whois 查询函数类型 */
type TailscaleWhoisLookup = (ip: string) => Promise<TailscaleWhoisIdentity | null>;

/**
 * 时序安全的字符串比较
 *
 * 使用恒定时间比较防止时序攻击。
 *
 * @param a - 第一个字符串
 * @param b - 第二个字符串
 * @returns 两个字符串是否相等
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * 规范化登录名
 *
 * @param login - 原始登录名
 * @returns 去除空白并转为小写的登录名
 */
function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

/**
 * 检查是否为回环地址
 *
 * @param ip - IP 地址
 * @returns 是否为回环地址（localhost）
 */
function isLoopbackAddress(ip: string | undefined): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip === "::1") return true;
  if (ip.startsWith("::ffff:127.")) return true;
  return false;
}

/**
 * 从 Host 头提取主机名
 *
 * @param hostHeader - HTTP Host 头值
 * @returns 主机名（不含端口）
 */
function getHostName(hostHeader?: string): string {
  const host = (hostHeader ?? "").trim().toLowerCase();
  if (!host) return "";
  // 处理 IPv6 地址格式 [::1]:port
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end !== -1) return host.slice(1, end);
  }
  const [name] = host.split(":");
  return name ?? "";
}

/**
 * 获取 HTTP 头的单个值
 *
 * @param value - 头值（可能是字符串或字符串数组）
 * @returns 单个字符串值
 */
function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 解析 Tailscale 代理请求的客户端 IP
 *
 * @param req - HTTP 请求对象
 * @returns 客户端 IP 地址
 */
function resolveTailscaleClientIp(req?: IncomingMessage): string | undefined {
  if (!req) return undefined;
  const forwardedFor = headerValue(req.headers?.["x-forwarded-for"]);
  return forwardedFor ? parseForwardedForClientIp(forwardedFor) : undefined;
}

/**
 * 解析请求的客户端 IP
 *
 * @param req - HTTP 请求对象
 * @param trustedProxies - 可信代理列表
 * @returns 客户端 IP 地址
 */
function resolveRequestClientIp(
  req?: IncomingMessage,
  trustedProxies?: string[],
): string | undefined {
  if (!req) return undefined;
  return resolveGatewayClientIp({
    remoteAddr: req.socket?.remoteAddress ?? "",
    forwardedFor: headerValue(req.headers?.["x-forwarded-for"]),
    realIp: headerValue(req.headers?.["x-real-ip"]),
    trustedProxies,
  });
}

/**
 * 检查是否为本地直接请求
 *
 * 判断请求是否来自本地且未经过代理转发。
 *
 * @param req - HTTP 请求对象
 * @param trustedProxies - 可信代理列表
 * @returns 是否为本地直接请求
 */
export function isLocalDirectRequest(req?: IncomingMessage, trustedProxies?: string[]): boolean {
  if (!req) return false;
  const clientIp = resolveRequestClientIp(req, trustedProxies) ?? "";
  if (!isLoopbackAddress(clientIp)) return false;

  const host = getHostName(req.headers?.host);
  const hostIsLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const hostIsTailscaleServe = host.endsWith(".ts.net");

  // 检查是否有代理转发头
  const hasForwarded = Boolean(
    req.headers?.["x-forwarded-for"] ||
    req.headers?.["x-real-ip"] ||
    req.headers?.["x-forwarded-host"],
  );

  const remoteIsTrustedProxy = isTrustedProxyAddress(req.socket?.remoteAddress, trustedProxies);
  return (hostIsLocal || hostIsTailscaleServe) && (!hasForwarded || remoteIsTrustedProxy);
}

/**
 * 从请求头获取 Tailscale 用户信息
 *
 * @param req - HTTP 请求对象
 * @returns Tailscale 用户信息，如果不存在则返回 null
 */
function getTailscaleUser(req?: IncomingMessage): TailscaleUser | null {
  if (!req) return null;
  const login = req.headers["tailscale-user-login"];
  if (typeof login !== "string" || !login.trim()) return null;
  const nameRaw = req.headers["tailscale-user-name"];
  const profilePic = req.headers["tailscale-user-profile-pic"];
  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : login.trim();
  return {
    login: login.trim(),
    name,
    profilePic: typeof profilePic === "string" && profilePic.trim() ? profilePic.trim() : undefined,
  };
}

/**
 * 检查请求是否包含 Tailscale 代理头
 *
 * @param req - HTTP 请求对象
 * @returns 是否包含 Tailscale 代理头
 */
function hasTailscaleProxyHeaders(req?: IncomingMessage): boolean {
  if (!req) return false;
  return Boolean(
    req.headers["x-forwarded-for"] &&
    req.headers["x-forwarded-proto"] &&
    req.headers["x-forwarded-host"],
  );
}

/**
 * 检查是否为 Tailscale 代理请求
 *
 * Tailscale 代理请求来自本地回环地址且包含代理头。
 *
 * @param req - HTTP 请求对象
 * @returns 是否为 Tailscale 代理请求
 */
function isTailscaleProxyRequest(req?: IncomingMessage): boolean {
  if (!req) return false;
  return isLoopbackAddress(req.socket?.remoteAddress) && hasTailscaleProxyHeaders(req);
}

/**
 * 解析并验证 Tailscale 用户身份
 *
 * 通过 whois 查询验证请求头中的用户信息是否与实际 Tailscale 身份匹配。
 *
 * @param params - 验证参数
 * @returns 验证结果，包含用户信息或失败原因
 */
async function resolveVerifiedTailscaleUser(params: {
  req?: IncomingMessage;
  tailscaleWhois: TailscaleWhoisLookup;
}): Promise<{ ok: true; user: TailscaleUser } | { ok: false; reason: string }> {
  const { req, tailscaleWhois } = params;
  // 检查请求头中是否有 Tailscale 用户信息
  const tailscaleUser = getTailscaleUser(req);
  if (!tailscaleUser) {
    return { ok: false, reason: "tailscale_user_missing" };
  }
  // 验证是否为 Tailscale 代理请求
  if (!isTailscaleProxyRequest(req)) {
    return { ok: false, reason: "tailscale_proxy_missing" };
  }
  // 获取客户端 IP 进行 whois 查询
  const clientIp = resolveTailscaleClientIp(req);
  if (!clientIp) {
    return { ok: false, reason: "tailscale_whois_failed" };
  }
  // 执行 whois 查询验证身份
  const whois = await tailscaleWhois(clientIp);
  if (!whois?.login) {
    return { ok: false, reason: "tailscale_whois_failed" };
  }
  // 验证登录名是否匹配
  if (normalizeLogin(whois.login) !== normalizeLogin(tailscaleUser.login)) {
    return { ok: false, reason: "tailscale_user_mismatch" };
  }
  return {
    ok: true,
    user: {
      login: whois.login,
      name: whois.name ?? tailscaleUser.name,
      profilePic: tailscaleUser.profilePic,
    },
  };
}

/**
 * 解析网关认证配置
 *
 * 从配置和环境变量中解析认证设置。
 *
 * @param params - 解析参数
 * @returns 已解析的认证配置
 */
export function resolveGatewayAuth(params: {
  authConfig?: GatewayAuthConfig | null;
  env?: NodeJS.ProcessEnv;
  tailscaleMode?: GatewayTailscaleMode;
}): ResolvedGatewayAuth {
  const authConfig = params.authConfig ?? {};
  const env = params.env ?? process.env;
  // 从配置或环境变量获取令牌和密码
  const token = authConfig.token ?? env.CLAWDBOT_GATEWAY_TOKEN ?? undefined;
  const password = authConfig.password ?? env.CLAWDBOT_GATEWAY_PASSWORD ?? undefined;
  // 确定认证模式：有密码则用密码模式，否则用令牌模式
  const mode: ResolvedGatewayAuth["mode"] = authConfig.mode ?? (password ? "password" : "token");
  // Tailscale 认证仅在 serve 模式且非密码模式时允许
  const allowTailscale =
    authConfig.allowTailscale ?? (params.tailscaleMode === "serve" && mode !== "password");
  return {
    mode,
    token,
    password,
    allowTailscale,
  };
}

/**
 * 断言网关认证已正确配置
 *
 * 如果认证配置不完整则抛出错误。
 *
 * @param auth - 已解析的认证配置
 * @throws 如果认证配置不完整
 */
export function assertGatewayAuthConfigured(auth: ResolvedGatewayAuth): void {
  if (auth.mode === "token" && !auth.token) {
    // 如果允许 Tailscale 认证，则令牌可以为空
    if (auth.allowTailscale) return;
    throw new Error(
      "gateway auth mode is token, but no token was configured (set gateway.auth.token or CLAWDBOT_GATEWAY_TOKEN)",
    );
  }
  if (auth.mode === "password" && !auth.password) {
    throw new Error("gateway auth mode is password, but no password was configured");
  }
}

/**
 * 授权网关连接
 *
 * 验证连接请求的身份，支持多种认证方式：
 * 1. Tailscale 认证（如果启用且非本地直接请求）
 * 2. Token 认证
 * 3. Password 认证
 *
 * @param params - 授权参数
 * @returns 认证结果
 */
export async function authorizeGatewayConnect(params: {
  auth: ResolvedGatewayAuth;
  connectAuth?: ConnectAuth | null;
  req?: IncomingMessage;
  trustedProxies?: string[];
  tailscaleWhois?: TailscaleWhoisLookup;
}): Promise<GatewayAuthResult> {
  const { auth, connectAuth, req, trustedProxies } = params;
  const tailscaleWhois = params.tailscaleWhois ?? readTailscaleWhoisIdentity;
  const localDirect = isLocalDirectRequest(req, trustedProxies);

  // 尝试 Tailscale 认证（仅对非本地直接请求）
  if (auth.allowTailscale && !localDirect) {
    const tailscaleCheck = await resolveVerifiedTailscaleUser({
      req,
      tailscaleWhois,
    });
    if (tailscaleCheck.ok) {
      return {
        ok: true,
        method: "tailscale",
        user: tailscaleCheck.user.login,
      };
    }
  }

  // Token 认证模式
  if (auth.mode === "token") {
    if (!auth.token) {
      return { ok: false, reason: "token_missing_config" };
    }
    if (!connectAuth?.token) {
      return { ok: false, reason: "token_missing" };
    }
    // 使用时序安全比较防止时序攻击
    if (!safeEqual(connectAuth.token, auth.token)) {
      return { ok: false, reason: "token_mismatch" };
    }
    return { ok: true, method: "token" };
  }

  // Password 认证模式
  if (auth.mode === "password") {
    const password = connectAuth?.password;
    if (!auth.password) {
      return { ok: false, reason: "password_missing_config" };
    }
    if (!password) {
      return { ok: false, reason: "password_missing" };
    }
    // 使用时序安全比较防止时序攻击
    if (!safeEqual(password, auth.password)) {
      return { ok: false, reason: "password_mismatch" };
    }
    return { ok: true, method: "password" };
  }

  return { ok: false, reason: "unauthorized" };
}
