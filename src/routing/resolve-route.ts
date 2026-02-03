/**
 * 路由解析模块
 * 提供 Agent 路由解析功能，根据渠道、账户、对等方等信息确定目标 Agent
 */
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { MoltbotConfig } from "../config/config.js";
import { listBindings } from "./bindings.js";
import {
  buildAgentMainSessionKey,
  buildAgentPeerSessionKey,
  DEFAULT_ACCOUNT_ID,
  DEFAULT_MAIN_KEY,
  normalizeAgentId,
  sanitizeAgentId,
} from "./session-key.js";

/** 路由对等方类型 */
export type RoutePeerKind = "dm" | "group" | "channel";

/** 路由对等方 */
export type RoutePeer = {
  /** 对等方类型 */
  kind: RoutePeerKind;
  /** 对等方 ID */
  id: string;
};

/** Agent 路由解析输入 */
export type ResolveAgentRouteInput = {
  /** Moltbot 配置 */
  cfg: MoltbotConfig;
  /** 渠道 */
  channel: string;
  /** 账户 ID */
  accountId?: string | null;
  /** 对等方 */
  peer?: RoutePeer | null;
  /** Guild ID（Discord） */
  guildId?: string | null;
  /** Team ID（Slack） */
  teamId?: string | null;
};

/** 解析后的 Agent 路由 */
export type ResolvedAgentRoute = {
  /** Agent ID */
  agentId: string;
  /** 渠道 */
  channel: string;
  /** 账户 ID */
  accountId: string;
  /** 内部会话键，用于持久化和并发控制 */
  sessionKey: string;
  /** 便捷别名，用于直接聊天折叠 */
  mainSessionKey: string;
  /** 匹配描述，用于调试/日志 */
  matchedBy:
    | "binding.peer"
    | "binding.guild"
    | "binding.team"
    | "binding.account"
    | "binding.channel"
    | "default";
};

export { DEFAULT_ACCOUNT_ID, DEFAULT_AGENT_ID } from "./session-key.js";

/**
 * 规范化令牌（小写）
 */
function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * 规范化 ID（保留大小写）
 */
function normalizeId(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * 规范化账户 ID
 */
function normalizeAccountId(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : DEFAULT_ACCOUNT_ID;
}

/**
 * 检查账户 ID 是否匹配
 */
function matchesAccountId(match: string | undefined, actual: string): boolean {
  const trimmed = (match ?? "").trim();
  if (!trimmed) return actual === DEFAULT_ACCOUNT_ID;
  if (trimmed === "*") return true;
  return trimmed === actual;
}

/**
 * 构建 Agent 会话键
 * @param params - 参数
 * @returns 会话键
 */
export function buildAgentSessionKey(params: {
  agentId: string;
  channel: string;
  accountId?: string | null;
  peer?: RoutePeer | null;
  /** DM 会话范围 */
  dmScope?: "main" | "per-peer" | "per-channel-peer" | "per-account-channel-peer";
  identityLinks?: Record<string, string[]>;
}): string {
  const channel = normalizeToken(params.channel) || "unknown";
  const peer = params.peer;
  return buildAgentPeerSessionKey({
    agentId: params.agentId,
    mainKey: DEFAULT_MAIN_KEY,
    channel,
    accountId: params.accountId,
    peerKind: peer?.kind ?? "dm",
    peerId: peer ? normalizeId(peer.id) || "unknown" : null,
    dmScope: params.dmScope,
    identityLinks: params.identityLinks,
  });
}

/**
 * 列出配置中的所有 Agent
 */
function listAgents(cfg: MoltbotConfig) {
  const agents = cfg.agents?.list;
  return Array.isArray(agents) ? agents : [];
}

/**
 * 选择第一个存在的 Agent ID
 */
function pickFirstExistingAgentId(cfg: MoltbotConfig, agentId: string): string {
  const trimmed = (agentId ?? "").trim();
  if (!trimmed) return sanitizeAgentId(resolveDefaultAgentId(cfg));
  const normalized = normalizeAgentId(trimmed);
  const agents = listAgents(cfg);
  if (agents.length === 0) return sanitizeAgentId(trimmed);
  const match = agents.find((agent) => normalizeAgentId(agent.id) === normalized);
  if (match?.id?.trim()) return sanitizeAgentId(match.id.trim());
  return sanitizeAgentId(resolveDefaultAgentId(cfg));
}

/**
 * 检查渠道是否匹配
 */
function matchesChannel(
  match: { channel?: string | undefined } | undefined,
  channel: string,
): boolean {
  const key = normalizeToken(match?.channel);
  if (!key) return false;
  return key === channel;
}

/**
 * 检查对等方是否匹配
 */
function matchesPeer(
  match: { peer?: { kind?: string; id?: string } | undefined } | undefined,
  peer: RoutePeer,
): boolean {
  const m = match?.peer;
  if (!m) return false;
  const kind = normalizeToken(m.kind);
  const id = normalizeId(m.id);
  if (!kind || !id) return false;
  return kind === peer.kind && id === peer.id;
}

/**
 * 检查 Guild 是否匹配
 */
function matchesGuild(
  match: { guildId?: string | undefined } | undefined,
  guildId: string,
): boolean {
  const id = normalizeId(match?.guildId);
  if (!id) return false;
  return id === guildId;
}

/**
 * 检查 Team 是否匹配
 */
function matchesTeam(match: { teamId?: string | undefined } | undefined, teamId: string): boolean {
  const id = normalizeId(match?.teamId);
  if (!id) return false;
  return id === teamId;
}

/**
 * 解析 Agent 路由
 * 根据输入参数匹配绑定配置，确定目标 Agent
 * @param input - 路由解析输入
 * @returns 解析后的 Agent 路由
 */
export function resolveAgentRoute(input: ResolveAgentRouteInput): ResolvedAgentRoute {
  const channel = normalizeToken(input.channel);
  const accountId = normalizeAccountId(input.accountId);
  const peer = input.peer ? { kind: input.peer.kind, id: normalizeId(input.peer.id) } : null;
  const guildId = normalizeId(input.guildId);
  const teamId = normalizeId(input.teamId);

  const bindings = listBindings(input.cfg).filter((binding) => {
    if (!binding || typeof binding !== "object") return false;
    if (!matchesChannel(binding.match, channel)) return false;
    return matchesAccountId(binding.match?.accountId, accountId);
  });

  const dmScope = input.cfg.session?.dmScope ?? "main";
  const identityLinks = input.cfg.session?.identityLinks;

  const choose = (agentId: string, matchedBy: ResolvedAgentRoute["matchedBy"]) => {
    const resolvedAgentId = pickFirstExistingAgentId(input.cfg, agentId);
    const sessionKey = buildAgentSessionKey({
      agentId: resolvedAgentId,
      channel,
      accountId,
      peer,
      dmScope,
      identityLinks,
    }).toLowerCase();
    const mainSessionKey = buildAgentMainSessionKey({
      agentId: resolvedAgentId,
      mainKey: DEFAULT_MAIN_KEY,
    }).toLowerCase();
    return {
      agentId: resolvedAgentId,
      channel,
      accountId,
      sessionKey,
      mainSessionKey,
      matchedBy,
    };
  };

  if (peer) {
    const peerMatch = bindings.find((b) => matchesPeer(b.match, peer));
    if (peerMatch) return choose(peerMatch.agentId, "binding.peer");
  }

  if (guildId) {
    const guildMatch = bindings.find((b) => matchesGuild(b.match, guildId));
    if (guildMatch) return choose(guildMatch.agentId, "binding.guild");
  }

  if (teamId) {
    const teamMatch = bindings.find((b) => matchesTeam(b.match, teamId));
    if (teamMatch) return choose(teamMatch.agentId, "binding.team");
  }

  const accountMatch = bindings.find(
    (b) =>
      b.match?.accountId?.trim() !== "*" && !b.match?.peer && !b.match?.guildId && !b.match?.teamId,
  );
  if (accountMatch) return choose(accountMatch.agentId, "binding.account");

  const anyAccountMatch = bindings.find(
    (b) =>
      b.match?.accountId?.trim() === "*" && !b.match?.peer && !b.match?.guildId && !b.match?.teamId,
  );
  if (anyAccountMatch) return choose(anyAccountMatch.agentId, "binding.channel");

  return choose(resolveDefaultAgentId(input.cfg), "default");
}
