/**
 * Web 渠道（WhatsApp Web）统一导出模块
 * 将原本 900+ 行的模块拆分为多个小模块，保持职责单一且易于测试
 */

// 自动回复相关
export {
  DEFAULT_WEB_MEDIA_BYTES, // 默认 Web 媒体字节限制
  HEARTBEAT_PROMPT, // 心跳提示
  HEARTBEAT_TOKEN, // 心跳令牌
  monitorWebChannel, // 监控 Web 渠道
  resolveHeartbeatRecipients, // 解析心跳接收者
  runWebHeartbeatOnce, // 执行一次 Web 心跳
  type WebChannelStatus, // Web 渠道状态类型
  type WebMonitorTuning, // Web 监控调优类型
} from "./web/auto-reply.js";

// 入站消息处理
export {
  extractMediaPlaceholder, // 提取媒体占位符
  extractText, // 提取文本
  monitorWebInbox, // 监控 Web 收件箱
  type WebInboundMessage, // Web 入站消息类型
  type WebListenerCloseReason, // Web 监听器关闭原因类型
} from "./web/inbound.js";

// 登录相关
export { loginWeb } from "./web/login.js";

// 媒体处理
export { loadWebMedia, optimizeImageToJpeg } from "./web/media.js";

// 出站消息发送
export { sendMessageWhatsApp } from "./web/outbound.js";

// 会话管理
export {
  createWaSocket, // 创建 WhatsApp Socket
  formatError, // 格式化错误
  getStatusCode, // 获取状态码
  logoutWeb, // Web 登出
  logWebSelfId, // 记录 Web 自身 ID
  pickWebChannel, // 选择 Web 渠道
  WA_WEB_AUTH_DIR, // WhatsApp Web 认证目录
  waitForWaConnection, // 等待 WhatsApp 连接
  webAuthExists, // 检查 Web 认证是否存在
} from "./web/session.js";
