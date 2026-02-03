/**
 * 网络工具模块
 * 提供 IP 地址解析、绑定地址解析、代理检测等网络相关功能
 */
import net from "node:net";

import { pickPrimaryTailnetIPv4, pickPrimaryTailnetIPv6 } from "../infra/tailnet.js";

/**
 * 检查是否为回环地址
 * @param ip - IP 地址
 * @returns 是否为回环地址
 */
export function isLoopbackAddress(ip: string | undefined): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip === "::1") return true;
  if (ip.startsWith("::ffff:127.")) return true;
  return false;
}

/**
 * 规范化 IPv4 映射地址
 * @param ip - IP 地址
 * @returns 规范化后的地址
 */
function normalizeIPv4MappedAddress(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.slice("::ffff:".length);
  return ip;
}

/**
 * 规范化 IP 地址
 * @param ip - IP 地址
 * @returns 规范化后的地址
 */
function normalizeIp(ip: string | undefined): string | undefined {
  const trimmed = ip?.trim();
  if (!trimmed) return undefined;
  return normalizeIPv4MappedAddress(trimmed.toLowerCase());
}

/**
 * 去除可选的端口号
 * @param ip - IP 地址（可能包含端口）
 * @returns 纯 IP 地址
 */
function stripOptionalPort(ip: string): string {
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end !== -1) return ip.slice(1, end);
  }
  if (net.isIP(ip)) return ip;
  const lastColon = ip.lastIndexOf(":");
  if (lastColon > -1 && ip.includes(".") && ip.indexOf(":") === lastColon) {
    const candidate = ip.slice(0, lastColon);
    if (net.isIP(candidate) === 4) return candidate;
  }
  return ip;
}

/**
 * 解析 X-Forwarded-For 头中的客户端 IP
 * @param forwardedFor - X-Forwarded-For 头值
 * @returns 客户端 IP
 */
export function parseForwardedForClientIp(forwardedFor?: string): string | undefined {
  const raw = forwardedFor?.split(",")[0]?.trim();
  if (!raw) return undefined;
  return normalizeIp(stripOptionalPort(raw));
}

/**
 * 解析 X-Real-IP 头
 * @param realIp - X-Real-IP 头值
 * @returns 客户端 IP
 */
function parseRealIp(realIp?: string): string | undefined {
  const raw = realIp?.trim();
  if (!raw) return undefined;
  return normalizeIp(stripOptionalPort(raw));
}

/**
 * 检查是否为受信任的代理地址
 * @param ip - IP 地址
 * @param trustedProxies - 受信任的代理列表
 * @returns 是否为受信任的代理
 */
export function isTrustedProxyAddress(ip: string | undefined, trustedProxies?: string[]): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized || !trustedProxies || trustedProxies.length === 0) return false;
  return trustedProxies.some((proxy) => normalizeIp(proxy) === normalized);
}

/**
 * 解析网关客户端 IP
 * 考虑代理头和受信任代理列表
 * @param params - 参数
 * @returns 客户端 IP
 */
export function resolveGatewayClientIp(params: {
  remoteAddr?: string;
  forwardedFor?: string;
  realIp?: string;
  trustedProxies?: string[];
}): string | undefined {
  const remote = normalizeIp(params.remoteAddr);
  if (!remote) return undefined;
  if (!isTrustedProxyAddress(remote, params.trustedProxies)) return remote;
  return parseForwardedForClientIp(params.forwardedFor) ?? parseRealIp(params.realIp) ?? remote;
}

/**
 * 检查是否为本地网关地址
 * @param ip - IP 地址
 * @returns 是否为本地网关地址
 */
export function isLocalGatewayAddress(ip: string | undefined): boolean {
  if (isLoopbackAddress(ip)) return true;
  if (!ip) return false;
  const normalized = normalizeIPv4MappedAddress(ip.trim().toLowerCase());
  const tailnetIPv4 = pickPrimaryTailnetIPv4();
  if (tailnetIPv4 && normalized === tailnetIPv4.toLowerCase()) return true;
  const tailnetIPv6 = pickPrimaryTailnetIPv6();
  if (tailnetIPv6 && ip.trim().toLowerCase() === tailnetIPv6.toLowerCase()) return true;
  return false;
}

/**
 * Resolves gateway bind host with fallback strategy.
 *
 * Modes:
 * - loopback: 127.0.0.1 (rarely fails, but handled gracefully)
 * - lan: always 0.0.0.0 (no fallback)
 * - tailnet: Tailnet IPv4 if available, else loopback
 * - auto: Loopback if available, else 0.0.0.0
 * - custom: User-specified IP, fallback to 0.0.0.0 if unavailable
 *
 * @returns The bind address to use (never null)
 */
export async function resolveGatewayBindHost(
  bind: import("../config/config.js").GatewayBindMode | undefined,
  customHost?: string,
): Promise<string> {
  const mode = bind ?? "loopback";

  if (mode === "loopback") {
    // 127.0.0.1 rarely fails, but handle gracefully
    if (await canBindToHost("127.0.0.1")) return "127.0.0.1";
    return "0.0.0.0"; // extreme fallback
  }

  if (mode === "tailnet") {
    const tailnetIP = pickPrimaryTailnetIPv4();
    if (tailnetIP && (await canBindToHost(tailnetIP))) return tailnetIP;
    if (await canBindToHost("127.0.0.1")) return "127.0.0.1";
    return "0.0.0.0";
  }

  if (mode === "lan") {
    return "0.0.0.0";
  }

  if (mode === "custom") {
    const host = customHost?.trim();
    if (!host) return "0.0.0.0"; // invalid config → fall back to all

    if (isValidIPv4(host) && (await canBindToHost(host))) return host;
    // Custom IP failed → fall back to LAN
    return "0.0.0.0";
  }

  if (mode === "auto") {
    if (await canBindToHost("127.0.0.1")) return "127.0.0.1";
    return "0.0.0.0";
  }

  return "0.0.0.0";
}

/**
 * Test if we can bind to a specific host address.
 * Creates a temporary server, attempts to bind, then closes it.
 *
 * @param host - The host address to test
 * @returns True if we can successfully bind to this address
 */
export async function canBindToHost(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = net.createServer();
    testServer.once("error", () => {
      resolve(false);
    });
    testServer.once("listening", () => {
      testServer.close();
      resolve(true);
    });
    // Use port 0 to let OS pick an available port for testing
    testServer.listen(0, host);
  });
}

export async function resolveGatewayListenHosts(
  bindHost: string,
  opts?: { canBindToHost?: (host: string) => Promise<boolean> },
): Promise<string[]> {
  if (bindHost !== "127.0.0.1") return [bindHost];
  const canBind = opts?.canBindToHost ?? canBindToHost;
  if (await canBind("::1")) return [bindHost, "::1"];
  return [bindHost];
}

/**
 * Validate if a string is a valid IPv4 address.
 *
 * @param host - The string to validate
 * @returns True if valid IPv4 format
 */
function isValidIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const n = parseInt(part, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255 && part === String(n);
  });
}

export function isLoopbackHost(host: string): boolean {
  return isLoopbackAddress(host);
}
