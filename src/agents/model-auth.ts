/**
 * 模型认证模块
 *
 * 该模块负责解析和管理模型提供商的认证信息，包括：
 * - API 密钥解析（从配置、环境变量、认证存储）
 * - OAuth 令牌管理
 * - AWS SDK 认证链
 * - 认证模式检测
 *
 * @module agents/model-auth
 */

import path from "node:path";

import { type Api, getEnvApiKey, type Model } from "@mariozechner/pi-ai";
import type { MoltbotConfig } from "../config/config.js";
import type { ModelProviderAuthMode, ModelProviderConfig } from "../config/types.js";
import { getShellEnvAppliedKeys } from "../infra/shell-env.js";
import { formatCliCommand } from "../cli/command-format.js";
import {
  type AuthProfileStore,
  ensureAuthProfileStore,
  listProfilesForProvider,
  resolveApiKeyForProfile,
  resolveAuthProfileOrder,
  resolveAuthStorePathForDisplay,
} from "./auth-profiles.js";
import { normalizeProviderId } from "./model-selection.js";

export { ensureAuthProfileStore, resolveAuthProfileOrder } from "./auth-profiles.js";

/** AWS Bedrock Bearer Token 环境变量名 */
const AWS_BEARER_ENV = "AWS_BEARER_TOKEN_BEDROCK";
/** AWS Access Key ID 环境变量名 */
const AWS_ACCESS_KEY_ENV = "AWS_ACCESS_KEY_ID";
/** AWS Secret Access Key 环境变量名 */
const AWS_SECRET_KEY_ENV = "AWS_SECRET_ACCESS_KEY";
/** AWS Profile 环境变量名 */
const AWS_PROFILE_ENV = "AWS_PROFILE";

/**
 * 解析提供商配置
 * 支持标准化的提供商 ID 匹配
 */
function resolveProviderConfig(
  cfg: MoltbotConfig | undefined,
  provider: string,
): ModelProviderConfig | undefined {
  const providers = cfg?.models?.providers ?? {};
  const direct = providers[provider] as ModelProviderConfig | undefined;
  if (direct) return direct;
  const normalized = normalizeProviderId(provider);
  if (normalized === provider) {
    const matched = Object.entries(providers).find(
      ([key]) => normalizeProviderId(key) === normalized,
    );
    return matched?.[1] as ModelProviderConfig | undefined;
  }
  return (
    (providers[normalized] as ModelProviderConfig | undefined) ??
    (Object.entries(providers).find(([key]) => normalizeProviderId(key) === normalized)?.[1] as
      | ModelProviderConfig
      | undefined)
  );
}

/**
 * 获取自定义提供商的 API 密钥
 * @param cfg - 配置对象
 * @param provider - 提供商标识
 * @returns API 密钥，未配置时返回 undefined
 */
export function getCustomProviderApiKey(
  cfg: MoltbotConfig | undefined,
  provider: string,
): string | undefined {
  const entry = resolveProviderConfig(cfg, provider);
  const key = entry?.apiKey?.trim();
  return key || undefined;
}

/**
 * 解析提供商的认证模式覆盖配置
 * @returns 认证模式，未配置时返回 undefined
 */
function resolveProviderAuthOverride(
  cfg: MoltbotConfig | undefined,
  provider: string,
): ModelProviderAuthMode | undefined {
  const entry = resolveProviderConfig(cfg, provider);
  const auth = entry?.auth;
  if (auth === "api-key" || auth === "aws-sdk" || auth === "oauth" || auth === "token") {
    return auth;
  }
  return undefined;
}

/**
 * 解析环境变量来源标签
 * 区分 shell 环境和进程环境
 */
function resolveEnvSourceLabel(params: {
  applied: Set<string>;
  envVars: string[];
  label: string;
}): string {
  const shellApplied = params.envVars.some((envVar) => params.applied.has(envVar));
  const prefix = shellApplied ? "shell env: " : "env: ";
  return `${prefix}${params.label}`;
}

/**
 * 解析 AWS SDK 认证使用的环境变量名
 * @param env - 环境变量对象
 * @returns 使用的环境变量名，未配置时返回 undefined
 */
export function resolveAwsSdkEnvVarName(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env[AWS_BEARER_ENV]?.trim()) return AWS_BEARER_ENV;
  if (env[AWS_ACCESS_KEY_ENV]?.trim() && env[AWS_SECRET_KEY_ENV]?.trim()) {
    return AWS_ACCESS_KEY_ENV;
  }
  if (env[AWS_PROFILE_ENV]?.trim()) return AWS_PROFILE_ENV;
  return undefined;
}

/**
 * 解析 AWS SDK 认证信息
 * 支持 Bearer Token、Access Key 和 Profile 三种方式
 */
function resolveAwsSdkAuthInfo(): { mode: "aws-sdk"; source: string } {
  const applied = new Set(getShellEnvAppliedKeys());
  if (process.env[AWS_BEARER_ENV]?.trim()) {
    return {
      mode: "aws-sdk",
      source: resolveEnvSourceLabel({
        applied,
        envVars: [AWS_BEARER_ENV],
        label: AWS_BEARER_ENV,
      }),
    };
  }
  if (process.env[AWS_ACCESS_KEY_ENV]?.trim() && process.env[AWS_SECRET_KEY_ENV]?.trim()) {
    return {
      mode: "aws-sdk",
      source: resolveEnvSourceLabel({
        applied,
        envVars: [AWS_ACCESS_KEY_ENV, AWS_SECRET_KEY_ENV],
        label: `${AWS_ACCESS_KEY_ENV} + ${AWS_SECRET_KEY_ENV}`,
      }),
    };
  }
  if (process.env[AWS_PROFILE_ENV]?.trim()) {
    return {
      mode: "aws-sdk",
      source: resolveEnvSourceLabel({
        applied,
        envVars: [AWS_PROFILE_ENV],
        label: AWS_PROFILE_ENV,
      }),
    };
  }
  return { mode: "aws-sdk", source: "aws-sdk default chain" };
}

/** 已解析的提供商认证信息 */
export type ResolvedProviderAuth = {
  /** API 密钥 */
  apiKey?: string;
  /** 认证配置 ID */
  profileId?: string;
  /** 认证来源描述 */
  source: string;
  /** 认证模式 */
  mode: "api-key" | "oauth" | "token" | "aws-sdk";
};

/**
 * 解析提供商的 API 密钥
 *
 * 按以下优先级查找：
 * 1. 指定的 profileId
 * 2. 认证配置存储中的配置（按顺序）
 * 3. 环境变量
 * 4. 配置文件中的自定义密钥
 * 5. AWS SDK 默认链（仅 Bedrock）
 *
 * @param params.provider - 提供商标识
 * @param params.cfg - 配置对象
 * @param params.profileId - 指定的配置 ID
 * @param params.preferredProfile - 首选配置
 * @param params.store - 认证存储
 * @param params.agentDir - 代理目录
 * @returns 解析后的认证信息
 */
export async function resolveApiKeyForProvider(params: {
  provider: string;
  cfg?: MoltbotConfig;
  profileId?: string;
  preferredProfile?: string;
  store?: AuthProfileStore;
  agentDir?: string;
}): Promise<ResolvedProviderAuth> {
  const { provider, cfg, profileId, preferredProfile } = params;
  const store = params.store ?? ensureAuthProfileStore(params.agentDir);

  if (profileId) {
    const resolved = await resolveApiKeyForProfile({
      cfg,
      store,
      profileId,
      agentDir: params.agentDir,
    });
    if (!resolved) {
      throw new Error(`No credentials found for profile "${profileId}".`);
    }
    const mode = store.profiles[profileId]?.type;
    return {
      apiKey: resolved.apiKey,
      profileId,
      source: `profile:${profileId}`,
      mode: mode === "oauth" ? "oauth" : mode === "token" ? "token" : "api-key",
    };
  }

  const authOverride = resolveProviderAuthOverride(cfg, provider);
  if (authOverride === "aws-sdk") {
    return resolveAwsSdkAuthInfo();
  }

  const order = resolveAuthProfileOrder({
    cfg,
    store,
    provider,
    preferredProfile,
  });
  for (const candidate of order) {
    try {
      const resolved = await resolveApiKeyForProfile({
        cfg,
        store,
        profileId: candidate,
        agentDir: params.agentDir,
      });
      if (resolved) {
        const mode = store.profiles[candidate]?.type;
        return {
          apiKey: resolved.apiKey,
          profileId: candidate,
          source: `profile:${candidate}`,
          mode: mode === "oauth" ? "oauth" : mode === "token" ? "token" : "api-key",
        };
      }
    } catch {}
  }

  const envResolved = resolveEnvApiKey(provider);
  if (envResolved) {
    return {
      apiKey: envResolved.apiKey,
      source: envResolved.source,
      mode: envResolved.source.includes("OAUTH_TOKEN") ? "oauth" : "api-key",
    };
  }

  const customKey = getCustomProviderApiKey(cfg, provider);
  if (customKey) {
    return { apiKey: customKey, source: "models.json", mode: "api-key" };
  }

  const normalized = normalizeProviderId(provider);
  if (authOverride === undefined && normalized === "amazon-bedrock") {
    return resolveAwsSdkAuthInfo();
  }

  if (provider === "openai") {
    const hasCodex = listProfilesForProvider(store, "openai-codex").length > 0;
    if (hasCodex) {
      throw new Error(
        'No API key found for provider "openai". You are authenticated with OpenAI Codex OAuth. Use openai-codex/gpt-5.2 (ChatGPT OAuth) or set OPENAI_API_KEY for openai/gpt-5.2.',
      );
    }
  }

  const authStorePath = resolveAuthStorePathForDisplay(params.agentDir);
  const resolvedAgentDir = path.dirname(authStorePath);
  throw new Error(
    [
      `No API key found for provider "${provider}".`,
      `Auth store: ${authStorePath} (agentDir: ${resolvedAgentDir}).`,
      `Configure auth for this agent (${formatCliCommand("moltbot agents add <id>")}) or copy auth-profiles.json from the main agentDir.`,
    ].join(" "),
  );
}

/** 环境变量 API 密钥解析结果 */
export type EnvApiKeyResult = { apiKey: string; source: string };

/** 模型认证模式类型 */
export type ModelAuthMode = "api-key" | "oauth" | "token" | "mixed" | "aws-sdk" | "unknown";

/**
 * 从环境变量解析 API 密钥
 * 支持各提供商特定的环境变量名
 *
 * @param provider - 提供商标识
 * @returns API 密钥和来源，未找到时返回 null
 */
export function resolveEnvApiKey(provider: string): EnvApiKeyResult | null {
  const normalized = normalizeProviderId(provider);
  const applied = new Set(getShellEnvAppliedKeys());
  const pick = (envVar: string): EnvApiKeyResult | null => {
    const value = process.env[envVar]?.trim();
    if (!value) return null;
    const source = applied.has(envVar) ? `shell env: ${envVar}` : `env: ${envVar}`;
    return { apiKey: value, source };
  };

  if (normalized === "github-copilot") {
    return pick("COPILOT_GITHUB_TOKEN") ?? pick("GH_TOKEN") ?? pick("GITHUB_TOKEN");
  }

  if (normalized === "anthropic") {
    return pick("ANTHROPIC_OAUTH_TOKEN") ?? pick("ANTHROPIC_API_KEY");
  }

  if (normalized === "chutes") {
    return pick("CHUTES_OAUTH_TOKEN") ?? pick("CHUTES_API_KEY");
  }

  if (normalized === "zai") {
    return pick("ZAI_API_KEY") ?? pick("Z_AI_API_KEY");
  }

  if (normalized === "google-vertex") {
    const envKey = getEnvApiKey(normalized);
    if (!envKey) return null;
    return { apiKey: envKey, source: "gcloud adc" };
  }

  if (normalized === "opencode") {
    return pick("OPENCODE_API_KEY") ?? pick("OPENCODE_ZEN_API_KEY");
  }

  if (normalized === "qwen-portal") {
    return pick("QWEN_OAUTH_TOKEN") ?? pick("QWEN_PORTAL_API_KEY");
  }

  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    groq: "GROQ_API_KEY",
    deepgram: "DEEPGRAM_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    xai: "XAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    "vercel-ai-gateway": "AI_GATEWAY_API_KEY",
    moonshot: "MOONSHOT_API_KEY",
    "kimi-code": "KIMICODE_API_KEY",
    minimax: "MINIMAX_API_KEY",
    synthetic: "SYNTHETIC_API_KEY",
    venice: "VENICE_API_KEY",
    mistral: "MISTRAL_API_KEY",
    opencode: "OPENCODE_API_KEY",
  };
  const envVar = envMap[normalized];
  if (!envVar) return null;
  return pick(envVar);
}

/**
 * 解析提供商的认证模式
 * 检测使用的是 API 密钥、OAuth、Token 还是 AWS SDK
 *
 * @param provider - 提供商标识
 * @param cfg - 配置对象
 * @param store - 认证存储
 * @returns 认证模式，未知时返回 undefined
 */
export function resolveModelAuthMode(
  provider?: string,
  cfg?: MoltbotConfig,
  store?: AuthProfileStore,
): ModelAuthMode | undefined {
  const resolved = provider?.trim();
  if (!resolved) return undefined;

  const authOverride = resolveProviderAuthOverride(cfg, resolved);
  if (authOverride === "aws-sdk") return "aws-sdk";

  const authStore = store ?? ensureAuthProfileStore();
  const profiles = listProfilesForProvider(authStore, resolved);
  if (profiles.length > 0) {
    const modes = new Set(
      profiles
        .map((id) => authStore.profiles[id]?.type)
        .filter((mode): mode is "api_key" | "oauth" | "token" => Boolean(mode)),
    );
    const distinct = ["oauth", "token", "api_key"].filter((k) =>
      modes.has(k as "oauth" | "token" | "api_key"),
    );
    if (distinct.length >= 2) return "mixed";
    if (modes.has("oauth")) return "oauth";
    if (modes.has("token")) return "token";
    if (modes.has("api_key")) return "api-key";
  }

  if (authOverride === undefined && normalizeProviderId(resolved) === "amazon-bedrock") {
    return "aws-sdk";
  }

  const envKey = resolveEnvApiKey(resolved);
  if (envKey?.apiKey) {
    return envKey.source.includes("OAUTH_TOKEN") ? "oauth" : "api-key";
  }

  if (getCustomProviderApiKey(cfg, resolved)) return "api-key";

  return "unknown";
}

/**
 * 获取模型的 API 密钥
 * 便捷方法，从模型对象中提取提供商并解析认证
 *
 * @param params.model - 模型对象
 * @param params.cfg - 配置对象
 * @param params.profileId - 指定的配置 ID
 * @param params.preferredProfile - 首选配置
 * @param params.store - 认证存储
 * @param params.agentDir - 代理目录
 * @returns 解析后的认证信息
 */
export async function getApiKeyForModel(params: {
  model: Model<Api>;
  cfg?: MoltbotConfig;
  profileId?: string;
  preferredProfile?: string;
  store?: AuthProfileStore;
  agentDir?: string;
}): Promise<ResolvedProviderAuth> {
  return resolveApiKeyForProvider({
    provider: params.model.provider,
    cfg: params.cfg,
    profileId: params.profileId,
    preferredProfile: params.preferredProfile,
    store: params.store,
    agentDir: params.agentDir,
  });
}

/**
 * 要求 API 密钥存在
 * 如果认证信息中没有 API 密钥则抛出错误
 *
 * @param auth - 认证信息
 * @param provider - 提供商标识（用于错误消息）
 * @returns API 密钥
 * @throws 如果没有 API 密钥
 */
export function requireApiKey(auth: ResolvedProviderAuth, provider: string): string {
  const key = auth.apiKey?.trim();
  if (key) return key;
  throw new Error(`No API key resolved for provider "${provider}" (auth mode: ${auth.mode}).`);
}
