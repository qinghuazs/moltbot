/**
 * 网关服务器常量模块
 *
 * 定义网关 WebSocket 服务器的各种限制和超时常量
 */

/** 最大入站帧大小（512KB） */
export const MAX_PAYLOAD_BYTES = 512 * 1024;
/** 每连接发送缓冲区限制（1.5MB） */
export const MAX_BUFFERED_BYTES = 1.5 * 1024 * 1024;

/** 默认聊天历史消息最大字节数（6MB） */
const DEFAULT_MAX_CHAT_HISTORY_MESSAGES_BYTES = 6 * 1024 * 1024;
let maxChatHistoryMessagesBytes = DEFAULT_MAX_CHAT_HISTORY_MESSAGES_BYTES;

/** 获取聊天历史消息最大字节数 */
export const getMaxChatHistoryMessagesBytes = () => maxChatHistoryMessagesBytes;

/** 设置聊天历史消息最大字节数（仅用于测试） */
export const __setMaxChatHistoryMessagesBytesForTest = (value?: number) => {
  if (!process.env.VITEST && process.env.NODE_ENV !== "test") return;
  if (value === undefined) {
    maxChatHistoryMessagesBytes = DEFAULT_MAX_CHAT_HISTORY_MESSAGES_BYTES;
    return;
  }
  if (Number.isFinite(value) && value > 0) {
    maxChatHistoryMessagesBytes = value;
  }
};

/** 默认握手超时时间（10秒） */
export const DEFAULT_HANDSHAKE_TIMEOUT_MS = 10_000;

/** 获取握手超时时间 */
export const getHandshakeTimeoutMs = () => {
  if (process.env.VITEST && process.env.CLAWDBOT_TEST_HANDSHAKE_TIMEOUT_MS) {
    const parsed = Number(process.env.CLAWDBOT_TEST_HANDSHAKE_TIMEOUT_MS);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_HANDSHAKE_TIMEOUT_MS;
};

/** 心跳间隔（30秒） */
export const TICK_INTERVAL_MS = 30_000;
/** 健康状态刷新间隔（60秒） */
export const HEALTH_REFRESH_INTERVAL_MS = 60_000;
/** 去重缓存 TTL（5分钟） */
export const DEDUPE_TTL_MS = 5 * 60_000;
/** 去重缓存最大条目数 */
export const DEDUPE_MAX = 1000;
