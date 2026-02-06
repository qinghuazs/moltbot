/**
 * 配置默认值应用模块
 *
 * 为 MoltbotConfig 的各个配置段填充默认值，包括：
 * - 消息确认反应范围
 * - 会话主键
 * - Talk API 密钥
 * - 模型定义（成本、上下文窗口、最大令牌数等）
 * - 代理并发限制
 * - 日志脱敏
 * - 上下文裁剪和心跳
 * - 压缩模式
 *
 * 所有 apply* 函数均为纯函数，返回新的配置对象（不修改原对象）。
 */
import { DEFAULT_CONTEXT_TOKENS } from "../agents/defaults.js";
import { parseModelRef } from "../agents/model-selection.js";
import { resolveTalkApiKey } from "./talk.js";
import type { MoltbotConfig } from "./types.js";
import { DEFAULT_AGENT_MAX_CONCURRENT, DEFAULT_SUBAGENT_MAX_CONCURRENT } from "./agent-limits.js";
import type { ModelDefinitionConfig } from "./types.models.js";

type WarnState = { warned: boolean };

let defaultWarnState: WarnState = { warned: false };

/** Anthropic 认证模式类型 */
type AnthropicAuthDefaultsMode = "api_key" | "oauth";

/** 默认模型别名映射（简短名称 -> 完整 provider/model ID） */
const DEFAULT_MODEL_ALIASES: Readonly<Record<string, string>> = {
  // Anthropic (pi-ai catalog uses "latest" ids without date suffix)
  opus: "anthropic/claude-opus-4-5",
  sonnet: "anthropic/claude-sonnet-4-5",

  // OpenAI
  gpt: "openai/gpt-5.2",
  "gpt-mini": "openai/gpt-5-mini",

  // Google Gemini (3.x are preview ids in the catalog)
  gemini: "google/gemini-3-pro-preview",
  "gemini-flash": "google/gemini-3-flash-preview",
};

/** 默认模型成本（全部为 0） */
const DEFAULT_MODEL_COST: ModelDefinitionConfig["cost"] = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};
/** 默认模型输入类型 */
const DEFAULT_MODEL_INPUT: ModelDefinitionConfig["input"] = ["text"];
/** 默认模型最大输出令牌数 */
const DEFAULT_MODEL_MAX_TOKENS = 8192;

type ModelDefinitionLike = Partial<ModelDefinitionConfig> &
  Pick<ModelDefinitionConfig, "id" | "name">;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function resolveModelCost(
  raw?: Partial<ModelDefinitionConfig["cost"]>,
): ModelDefinitionConfig["cost"] {
  return {
    input: typeof raw?.input === "number" ? raw.input : DEFAULT_MODEL_COST.input,
    output: typeof raw?.output === "number" ? raw.output : DEFAULT_MODEL_COST.output,
    cacheRead: typeof raw?.cacheRead === "number" ? raw.cacheRead : DEFAULT_MODEL_COST.cacheRead,
    cacheWrite:
      typeof raw?.cacheWrite === "number" ? raw.cacheWrite : DEFAULT_MODEL_COST.cacheWrite,
  };
}

function resolveAnthropicDefaultAuthMode(cfg: MoltbotConfig): AnthropicAuthDefaultsMode | null {
  const profiles = cfg.auth?.profiles ?? {};
  const anthropicProfiles = Object.entries(profiles).filter(
    ([, profile]) => profile?.provider === "anthropic",
  );

  const order = cfg.auth?.order?.anthropic ?? [];
  for (const profileId of order) {
    const entry = profiles[profileId];
    if (!entry || entry.provider !== "anthropic") continue;
    if (entry.mode === "api_key") return "api_key";
    if (entry.mode === "oauth" || entry.mode === "token") return "oauth";
  }

  const hasApiKey = anthropicProfiles.some(([, profile]) => profile?.mode === "api_key");
  const hasOauth = anthropicProfiles.some(
    ([, profile]) => profile?.mode === "oauth" || profile?.mode === "token",
  );
  if (hasApiKey && !hasOauth) return "api_key";
  if (hasOauth && !hasApiKey) return "oauth";

  if (process.env.ANTHROPIC_OAUTH_TOKEN?.trim()) return "oauth";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "api_key";
  return null;
}

function resolvePrimaryModelRef(raw?: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const aliasKey = trimmed.toLowerCase();
  return DEFAULT_MODEL_ALIASES[aliasKey] ?? trimmed;
}

export type SessionDefaultsOptions = {
  warn?: (message: string) => void;
  warnState?: WarnState;
};

/** 应用消息默认值（设置确认反应范围为 "group-mentions"） */
export function applyMessageDefaults(cfg: MoltbotConfig): MoltbotConfig {
  const messages = cfg.messages;
  const hasAckScope = messages?.ackReactionScope !== undefined;
  if (hasAckScope) return cfg;

  const nextMessages = messages ? { ...messages } : {};
  nextMessages.ackReactionScope = "group-mentions";
  return {
    ...cfg,
    messages: nextMessages,
  };
}

/** 应用会话默认值（强制 mainKey 为 "main"，忽略自定义值并发出警告） */
export function applySessionDefaults(
  cfg: MoltbotConfig,
  options: SessionDefaultsOptions = {},
): MoltbotConfig {
  const session = cfg.session;
  if (!session || session.mainKey === undefined) return cfg;

  const trimmed = session.mainKey.trim();
  const warn = options.warn ?? console.warn;
  const warnState = options.warnState ?? defaultWarnState;

  const next: MoltbotConfig = {
    ...cfg,
    session: { ...session, mainKey: "main" },
  };

  if (trimmed && trimmed !== "main" && !warnState.warned) {
    warnState.warned = true;
    warn('session.mainKey is ignored; main session is always "main".');
  }

  return next;
}

/** 应用 Talk API 密钥默认值（从环境变量中解析） */
export function applyTalkApiKey(config: MoltbotConfig): MoltbotConfig {
  const resolved = resolveTalkApiKey();
  if (!resolved) return config;
  const existing = config.talk?.apiKey?.trim();
  if (existing) return config;
  return {
    ...config,
    talk: {
      ...config.talk,
      apiKey: resolved,
    },
  };
}

/**
 * 应用模型定义默认值
 *
 * 为每个模型填充缺失的 reasoning、input、cost、contextWindow、maxTokens 字段，
 * 并为已知模型自动添加别名。
 */
export function applyModelDefaults(cfg: MoltbotConfig): MoltbotConfig {
  let mutated = false;
  let nextCfg = cfg;

  const providerConfig = nextCfg.models?.providers;
  if (providerConfig) {
    const nextProviders = { ...providerConfig };
    for (const [providerId, provider] of Object.entries(providerConfig)) {
      const models = provider.models;
      if (!Array.isArray(models) || models.length === 0) continue;
      let providerMutated = false;
      const nextModels = models.map((model) => {
        const raw = model as ModelDefinitionLike;
        let modelMutated = false;

        const reasoning = typeof raw.reasoning === "boolean" ? raw.reasoning : false;
        if (raw.reasoning !== reasoning) modelMutated = true;

        const input = raw.input ?? [...DEFAULT_MODEL_INPUT];
        if (raw.input === undefined) modelMutated = true;

        const cost = resolveModelCost(raw.cost);
        const costMutated =
          !raw.cost ||
          raw.cost.input !== cost.input ||
          raw.cost.output !== cost.output ||
          raw.cost.cacheRead !== cost.cacheRead ||
          raw.cost.cacheWrite !== cost.cacheWrite;
        if (costMutated) modelMutated = true;

        const contextWindow = isPositiveNumber(raw.contextWindow)
          ? raw.contextWindow
          : DEFAULT_CONTEXT_TOKENS;
        if (raw.contextWindow !== contextWindow) modelMutated = true;

        const defaultMaxTokens = Math.min(DEFAULT_MODEL_MAX_TOKENS, contextWindow);
        const maxTokens = isPositiveNumber(raw.maxTokens) ? raw.maxTokens : defaultMaxTokens;
        if (raw.maxTokens !== maxTokens) modelMutated = true;

        if (!modelMutated) return model;
        providerMutated = true;
        return {
          ...raw,
          reasoning,
          input,
          cost,
          contextWindow,
          maxTokens,
        } as ModelDefinitionConfig;
      });

      if (!providerMutated) continue;
      nextProviders[providerId] = { ...provider, models: nextModels };
      mutated = true;
    }

    if (mutated) {
      nextCfg = {
        ...nextCfg,
        models: {
          ...nextCfg.models,
          providers: nextProviders,
        },
      };
    }
  }

  const existingAgent = nextCfg.agents?.defaults;
  if (!existingAgent) return mutated ? nextCfg : cfg;
  const existingModels = existingAgent.models ?? {};
  if (Object.keys(existingModels).length === 0) return mutated ? nextCfg : cfg;

  const nextModels: Record<string, { alias?: string }> = {
    ...existingModels,
  };

  for (const [alias, target] of Object.entries(DEFAULT_MODEL_ALIASES)) {
    const entry = nextModels[target];
    if (!entry) continue;
    if (entry.alias !== undefined) continue;
    nextModels[target] = { ...entry, alias };
    mutated = true;
  }

  if (!mutated) return cfg;

  return {
    ...nextCfg,
    agents: {
      ...nextCfg.agents,
      defaults: { ...existingAgent, models: nextModels },
    },
  };
}

/** 应用代理并发限制默认值 */
export function applyAgentDefaults(cfg: MoltbotConfig): MoltbotConfig {
  const agents = cfg.agents;
  const defaults = agents?.defaults;
  const hasMax =
    typeof defaults?.maxConcurrent === "number" && Number.isFinite(defaults.maxConcurrent);
  const hasSubMax =
    typeof defaults?.subagents?.maxConcurrent === "number" &&
    Number.isFinite(defaults.subagents.maxConcurrent);
  if (hasMax && hasSubMax) return cfg;

  let mutated = false;
  const nextDefaults = defaults ? { ...defaults } : {};
  if (!hasMax) {
    nextDefaults.maxConcurrent = DEFAULT_AGENT_MAX_CONCURRENT;
    mutated = true;
  }

  const nextSubagents = defaults?.subagents ? { ...defaults.subagents } : {};
  if (!hasSubMax) {
    nextSubagents.maxConcurrent = DEFAULT_SUBAGENT_MAX_CONCURRENT;
    mutated = true;
  }

  if (!mutated) return cfg;

  return {
    ...cfg,
    agents: {
      ...agents,
      defaults: {
        ...nextDefaults,
        subagents: nextSubagents,
      },
    },
  };
}

/** 应用日志脱敏默认值（默认对工具输出进行脱敏） */
export function applyLoggingDefaults(cfg: MoltbotConfig): MoltbotConfig {
  const logging = cfg.logging;
  if (!logging) return cfg;
  if (logging.redactSensitive) return cfg;
  return {
    ...cfg,
    logging: {
      ...logging,
      redactSensitive: "tools",
    },
  };
}

/**
 * 应用上下文裁剪默认值
 *
 * 根据 Anthropic 认证模式（API Key 或 OAuth）设置：
 * - 上下文裁剪模式（cache-ttl）和 TTL
 * - 心跳间隔（API Key: 30m, OAuth: 1h）
 * - API Key 模式下为 Anthropic 模型启用缓存控制 TTL
 */
export function applyContextPruningDefaults(cfg: MoltbotConfig): MoltbotConfig {
  const defaults = cfg.agents?.defaults;
  if (!defaults) return cfg;

  const authMode = resolveAnthropicDefaultAuthMode(cfg);
  if (!authMode) return cfg;

  let mutated = false;
  const nextDefaults = { ...defaults };
  const contextPruning = defaults.contextPruning ?? {};
  const heartbeat = defaults.heartbeat ?? {};

  if (defaults.contextPruning?.mode === undefined) {
    nextDefaults.contextPruning = {
      ...contextPruning,
      mode: "cache-ttl",
      ttl: defaults.contextPruning?.ttl ?? "1h",
    };
    mutated = true;
  }

  if (defaults.heartbeat?.every === undefined) {
    nextDefaults.heartbeat = {
      ...heartbeat,
      every: authMode === "oauth" ? "1h" : "30m",
    };
    mutated = true;
  }

  if (authMode === "api_key") {
    const nextModels = defaults.models ? { ...defaults.models } : {};
    let modelsMutated = false;

    for (const [key, entry] of Object.entries(nextModels)) {
      const parsed = parseModelRef(key, "anthropic");
      if (!parsed || parsed.provider !== "anthropic") continue;
      const current = entry ?? {};
      const params = (current as { params?: Record<string, unknown> }).params ?? {};
      if (typeof params.cacheControlTtl === "string") continue;
      nextModels[key] = {
        ...(current as Record<string, unknown>),
        params: { ...params, cacheControlTtl: "1h" },
      };
      modelsMutated = true;
    }

    const primary = resolvePrimaryModelRef(defaults.model?.primary ?? undefined);
    if (primary) {
      const parsedPrimary = parseModelRef(primary, "anthropic");
      if (parsedPrimary?.provider === "anthropic") {
        const key = `${parsedPrimary.provider}/${parsedPrimary.model}`;
        const entry = nextModels[key];
        const current = entry ?? {};
        const params = (current as { params?: Record<string, unknown> }).params ?? {};
        if (typeof params.cacheControlTtl !== "string") {
          nextModels[key] = {
            ...(current as Record<string, unknown>),
            params: { ...params, cacheControlTtl: "1h" },
          };
          modelsMutated = true;
        }
      }
    }

    if (modelsMutated) {
      nextDefaults.models = nextModels;
      mutated = true;
    }
  }

  if (!mutated) return cfg;

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: nextDefaults,
    },
  };
}

/** 应用压缩模式默认值（默认为 "safeguard" 模式） */
export function applyCompactionDefaults(cfg: MoltbotConfig): MoltbotConfig {
  const defaults = cfg.agents?.defaults;
  if (!defaults) return cfg;
  const compaction = defaults?.compaction;
  if (compaction?.mode) return cfg;

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...defaults,
        compaction: {
          ...compaction,
          mode: "safeguard",
        },
      },
    },
  };
}

export function resetSessionDefaultsWarningForTests() {
  defaultWarnState = { warned: false };
}
