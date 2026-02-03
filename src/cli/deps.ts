/**
 * CLI 依赖注入模块
 * 提供各渠道消息发送函数的依赖注入，便于测试和模块化
 */
import { logWebSelfId, sendMessageWhatsApp } from "../channels/web/index.js";
import { sendMessageDiscord } from "../discord/send.js";
import { sendMessageIMessage } from "../imessage/send.js";
import type { OutboundSendDeps } from "../infra/outbound/deliver.js";
import { sendMessageSignal } from "../signal/send.js";
import { sendMessageSlack } from "../slack/send.js";
import { sendMessageTelegram } from "../telegram/send.js";

/** CLI 依赖类型定义 */
export type CliDeps = {
  /** WhatsApp 消息发送函数 */
  sendMessageWhatsApp: typeof sendMessageWhatsApp;
  /** Telegram 消息发送函数 */
  sendMessageTelegram: typeof sendMessageTelegram;
  /** Discord 消息发送函数 */
  sendMessageDiscord: typeof sendMessageDiscord;
  /** Slack 消息发送函数 */
  sendMessageSlack: typeof sendMessageSlack;
  /** Signal 消息发送函数 */
  sendMessageSignal: typeof sendMessageSignal;
  /** iMessage 消息发送函数 */
  sendMessageIMessage: typeof sendMessageIMessage;
};

/**
 * 创建默认 CLI 依赖
 * @returns 包含所有渠道发送函数的依赖对象
 */
export function createDefaultDeps(): CliDeps {
  return {
    sendMessageWhatsApp,
    sendMessageTelegram,
    sendMessageDiscord,
    sendMessageSlack,
    sendMessageSignal,
    sendMessageIMessage,
  };
}

/**
 * 创建出站发送依赖
 * 将 CLI 依赖转换为出站投递模块所需的依赖格式
 * 提供商对接：添加新的出站发送依赖时需扩展此映射
 * @param deps - CLI 依赖
 * @returns 出站发送依赖
 */
export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return {
    sendWhatsApp: deps.sendMessageWhatsApp,
    sendTelegram: deps.sendMessageTelegram,
    sendDiscord: deps.sendMessageDiscord,
    sendSlack: deps.sendMessageSlack,
    sendSignal: deps.sendMessageSignal,
    sendIMessage: deps.sendMessageIMessage,
  };
}

export { logWebSelfId };
