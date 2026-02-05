/**
 * Discord 模块入口
 *
 * 该模块作为 Discord 功能的主入口，导出核心功能：
 * - monitorDiscordProvider: Discord 消息监听提供者
 * - sendMessageDiscord: 发送文本/媒体消息
 * - sendPollDiscord: 发送投票消息
 *
 * @module discord
 */

/** Discord 消息监听提供者 */
export { monitorDiscordProvider } from "./monitor.js";

/** 发送 Discord 消息和投票 */
export { sendMessageDiscord, sendPollDiscord } from "./send.js";
