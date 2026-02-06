/**
 * 端口默认值模块
 *
 * 定义网关及相关服务的默认端口号，并提供基于网关端口的派生端口计算。
 * 各服务端口通过固定偏移量从网关端口派生，确保端口分配的一致性。
 */

/** 端口范围类型 */
export type PortRange = { start: number; end: number };

function isValidPort(port: number): boolean {
  return Number.isFinite(port) && port > 0 && port <= 65535;
}

function clampPort(port: number, fallback: number): number {
  return isValidPort(port) ? port : fallback;
}

function derivePort(base: number, offset: number, fallback: number): number {
  return clampPort(base + offset, fallback);
}

export const DEFAULT_BRIDGE_PORT = 18790;
export const DEFAULT_BROWSER_CONTROL_PORT = 18791;
export const DEFAULT_CANVAS_HOST_PORT = 18793;
export const DEFAULT_BROWSER_CDP_PORT_RANGE_START = 18800;
export const DEFAULT_BROWSER_CDP_PORT_RANGE_END = 18899;

export function deriveDefaultBridgePort(gatewayPort: number): number {
  return derivePort(gatewayPort, 1, DEFAULT_BRIDGE_PORT);
}

export function deriveDefaultBrowserControlPort(gatewayPort: number): number {
  return derivePort(gatewayPort, 2, DEFAULT_BROWSER_CONTROL_PORT);
}

export function deriveDefaultCanvasHostPort(gatewayPort: number): number {
  return derivePort(gatewayPort, 4, DEFAULT_CANVAS_HOST_PORT);
}

export function deriveDefaultBrowserCdpPortRange(browserControlPort: number): PortRange {
  const start = derivePort(browserControlPort, 9, DEFAULT_BROWSER_CDP_PORT_RANGE_START);
  const end = clampPort(
    start + (DEFAULT_BROWSER_CDP_PORT_RANGE_END - DEFAULT_BROWSER_CDP_PORT_RANGE_START),
    DEFAULT_BROWSER_CDP_PORT_RANGE_END,
  );
  if (end < start) return { start, end: start };
  return { start, end };
}
