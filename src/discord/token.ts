/**
 * Discord Token 解析模块
 *
 * 该模块负责从配置文件和环境变量中解析 Discord Bot Token，
 * 支持多账户配置和 Token 格式标准化。
 *
 * @module discord/token
 */

import type { MoltbotConfig } from "../config/config.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";

/**
 * Token 来源类型
 *
 * - "env": 来自环境变量 DISCORD_BOT_TOKEN
 * - "config": 来自配置文件
 * - "none": 未找到 Token
 */
export type DiscordTokenSource = "env" | "config" | "none";

/**
 * Token 解析结果
 *
 * 包含解析后的 Token 值和来源信息。
 */
export type DiscordTokenResolution = {
  /** 解析后的 Token（未找到时为空字符串） */
  token: string;
  /** Token 来源 */
  source: DiscordTokenSource;
};

/**
 * 标准化 Discord Token
 *
 * 移除 Token 前后的空白字符，并去除可能存在的 "Bot " 前缀。
 *
 * @param raw - 原始 Token 字符串
 * @returns 标准化后的 Token，无效输入返回 undefined
 */
export function normalizeDiscordToken(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // 移除可能存在的 "Bot " 前缀（不区分大小写）
  return trimmed.replace(/^Bot\s+/i, "");
}

/**
 * 解析 Discord Token
 *
 * 按以下优先级查找 Token：
 * 1. 指定账户的配置（channels.discord.accounts[accountId].token）
 * 2. 默认账户的配置（channels.discord.accounts[default].token）
 * 3. 全局 Discord 配置（channels.discord.token）
 * 4. 环境变量（DISCORD_BOT_TOKEN）
 *
 * 注意：非默认账户不会回退到环境变量。
 *
 * @param cfg - Moltbot 配置对象
 * @param opts - 解析选项
 * @param opts.accountId - 账户 ID（可选）
 * @param opts.envToken - 自定义环境变量值（可选，用于测试）
 * @returns Token 解析结果
 */
export function resolveDiscordToken(
  cfg?: MoltbotConfig,
  opts: { accountId?: string | null; envToken?: string | null } = {},
): DiscordTokenResolution {
  const accountId = normalizeAccountId(opts.accountId);
  const discordCfg = cfg?.channels?.discord;
  const accountCfg =
    accountId !== DEFAULT_ACCOUNT_ID
      ? discordCfg?.accounts?.[accountId]
      : discordCfg?.accounts?.[DEFAULT_ACCOUNT_ID];
  const accountToken = normalizeDiscordToken(accountCfg?.token ?? undefined);
  if (accountToken) return { token: accountToken, source: "config" };

  const allowEnv = accountId === DEFAULT_ACCOUNT_ID;
  const configToken = allowEnv ? normalizeDiscordToken(discordCfg?.token ?? undefined) : undefined;
  if (configToken) return { token: configToken, source: "config" };

  const envToken = allowEnv
    ? normalizeDiscordToken(opts.envToken ?? process.env.DISCORD_BOT_TOKEN)
    : undefined;
  if (envToken) return { token: envToken, source: "env" };

  return { token: "", source: "none" };
}
