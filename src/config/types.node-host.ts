/**
 * Node Host 配置类型定义
 *
 * 定义远程节点主机（node-host）的配置结构，
 * 包括浏览器代理设置和主机连接参数。
 */

/** 浏览器代理配置 */
export type NodeHostBrowserProxyConfig = {
  /** Enable the browser proxy on the node host (default: true). */
  enabled?: boolean;
  /** Optional allowlist of profile names exposed via the proxy. */
  allowProfiles?: string[];
};

export type NodeHostConfig = {
  /** Browser proxy settings for node hosts. */
  browserProxy?: NodeHostBrowserProxyConfig;
};
