/**
 * ACP 类型定义模块
 * 定义 ACP 会话和服务器选项的类型
 */
import type { SessionId } from "@agentclientprotocol/sdk";

import { VERSION } from "../version.js";

/** ACP 会话类型 */
export type AcpSession = {
  /** 会话 ID */
  sessionId: SessionId;
  /** 会话键 */
  sessionKey: string;
  /** 工作目录 */
  cwd: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 中止控制器 */
  abortController: AbortController | null;
  /** 活动运行 ID */
  activeRunId: string | null;
};

/** ACP 服务器选项类型 */
export type AcpServerOptions = {
  /** Gateway URL */
  gatewayUrl?: string;
  /** Gateway 令牌 */
  gatewayToken?: string;
  /** Gateway 密码 */
  gatewayPassword?: string;
  /** 默认会话键 */
  defaultSessionKey?: string;
  /** 默认会话标签 */
  defaultSessionLabel?: string;
  /** 是否要求已存在的会话 */
  requireExistingSession?: boolean;
  /** 是否重置会话 */
  resetSession?: boolean;
  /** 是否添加工作目录前缀 */
  prefixCwd?: boolean;
  /** 是否启用详细输出 */
  verbose?: boolean;
};

/** ACP 代理信息 */
export const ACP_AGENT_INFO = {
  name: "moltbot-acp",
  title: "Moltbot ACP Gateway",
  version: VERSION,
};
