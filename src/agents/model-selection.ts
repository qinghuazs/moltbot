/**
 * 模型选择模块
 *
 * 该模块负责解析和选择 AI 模型，包括：
 * - 模型引用解析（provider/model 格式）
 * - 模型别名索引构建
 * - 模型白名单管理
 * - 默认模型配置解析
 * - 思考级别配置
 *
 * @module agents/model-selection
 */

import type { MoltbotConfig } from "../config/config.js";
import type { ModelCatalogEntry } from "./model-catalog.js";
import { normalizeGoogleModelId } from "./models-config.providers.js";
import { resolveAgentModelPrimary } from "./agent-scope.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "./defaults.js";

/** 模型引用类型，包含提供商和模型名称 */
export type ModelRef = {
  /** 提供商标识 */
  provider: string;
  /** 模型名称 */
  model: string;
};

/** 思考级别类型，控制模型的推理深度 */
export type ThinkLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

/** 模型别名索引，用于快速查找模型别名 */
export type ModelAliasIndex = {
  /** 按别名查找 */
  byAlias: Map<string, { alias: string; ref: ModelRef }>;
  /** 按模型键查找别名列表 */
  byKey: Map<string, string[]>;
};

/**
 * 标准化别名键
 * 转换为小写并去除空白
 */
function normalizeAliasKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 生成模型键
 * @param provider - 提供商标识
 * @param model - 模型名称
 * @returns 格式为 "provider/model" 的键
 */
export function modelKey(provider: string, model: string) {
  return `${provider}/${model}`;
}

/**
 * 标准化提供商 ID
 * 处理别名和变体（如 z.ai -> zai）
 */
export function normalizeProviderId(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "z.ai" || normalized === "z-ai") return "zai";
  if (normalized === "opencode-zen") return "opencode";
  if (normalized === "qwen") return "qwen-portal";
  return normalized;
}

/**
 * 检查是否为 CLI 提供商
 * CLI 提供商通过外部 CLI 工具调用模型
 */
export function isCliProvider(provider: string, cfg?: MoltbotConfig): boolean {
  const normalized = normalizeProviderId(provider);
  if (normalized === "claude-cli") return true;
  if (normalized === "codex-cli") return true;
  const backends = cfg?.agents?.defaults?.cliBackends ?? {};
  return Object.keys(backends).some((key) => normalizeProviderId(key) === normalized);
}

/**
 * 标准化 Anthropic 模型 ID
 * 处理简写形式（如 opus-4.5 -> claude-opus-4-5）
 */
function normalizeAnthropicModelId(model: string): string {
  const trimmed = model.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower === "opus-4.5") return "claude-opus-4-5";
  if (lower === "sonnet-4.5") return "claude-sonnet-4-5";
  return trimmed;
}

/**
 * 根据提供商标准化模型 ID
 */
function normalizeProviderModelId(provider: string, model: string): string {
  if (provider === "anthropic") return normalizeAnthropicModelId(model);
  if (provider === "google") return normalizeGoogleModelId(model);
  return model;
}

/**
 * 解析模型引用字符串
 * 支持 "provider/model" 和 "model"（使用默认提供商）格式
 *
 * @param raw - 原始字符串
 * @param defaultProvider - 默认提供商
 * @returns 模型引用，无效时返回 null
 */
export function parseModelRef(raw: string, defaultProvider: string): ModelRef | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const slash = trimmed.indexOf("/");
  if (slash === -1) {
    const provider = normalizeProviderId(defaultProvider);
    const model = normalizeProviderModelId(provider, trimmed);
    return { provider, model };
  }
  const providerRaw = trimmed.slice(0, slash).trim();
  const provider = normalizeProviderId(providerRaw);
  const model = trimmed.slice(slash + 1).trim();
  if (!provider || !model) return null;
  const normalizedModel = normalizeProviderModelId(provider, model);
  return { provider, model: normalizedModel };
}

/**
 * 构建模型别名索引
 * 从配置中提取所有模型别名，用于快速查找
 *
 * @param params.cfg - 配置对象
 * @param params.defaultProvider - 默认提供商
 * @returns 模型别名索引
 */
export function buildModelAliasIndex(params: {
  cfg: MoltbotConfig;
  defaultProvider: string;
}): ModelAliasIndex {
  const byAlias = new Map<string, { alias: string; ref: ModelRef }>();
  const byKey = new Map<string, string[]>();

  const rawModels = params.cfg.agents?.defaults?.models ?? {};
  for (const [keyRaw, entryRaw] of Object.entries(rawModels)) {
    const parsed = parseModelRef(String(keyRaw ?? ""), params.defaultProvider);
    if (!parsed) continue;
    const alias = String((entryRaw as { alias?: string } | undefined)?.alias ?? "").trim();
    if (!alias) continue;
    const aliasKey = normalizeAliasKey(alias);
    byAlias.set(aliasKey, { alias, ref: parsed });
    const key = modelKey(parsed.provider, parsed.model);
    const existing = byKey.get(key) ?? [];
    existing.push(alias);
    byKey.set(key, existing);
  }

  return { byAlias, byKey };
}

/**
 * 从字符串解析模型引用
 * 支持别名查找和直接解析
 *
 * @param params.raw - 原始字符串
 * @param params.defaultProvider - 默认提供商
 * @param params.aliasIndex - 别名索引（可选）
 * @returns 模型引用和别名，无效时返回 null
 */
export function resolveModelRefFromString(params: {
  raw: string;
  defaultProvider: string;
  aliasIndex?: ModelAliasIndex;
}): { ref: ModelRef; alias?: string } | null {
  const trimmed = params.raw.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("/")) {
    const aliasKey = normalizeAliasKey(trimmed);
    const aliasMatch = params.aliasIndex?.byAlias.get(aliasKey);
    if (aliasMatch) {
      return { ref: aliasMatch.ref, alias: aliasMatch.alias };
    }
  }
  const parsed = parseModelRef(trimmed, params.defaultProvider);
  if (!parsed) return null;
  return { ref: parsed };
}

/**
 * 解析配置中的模型引用
 * 从 agents.defaults.model 配置中获取主模型
 *
 * @param params.cfg - 配置对象
 * @param params.defaultProvider - 默认提供商
 * @param params.defaultModel - 默认模型
 * @returns 模型引用
 */
export function resolveConfiguredModelRef(params: {
  cfg: MoltbotConfig;
  defaultProvider: string;
  defaultModel: string;
}): ModelRef {
  const rawModel = (() => {
    const raw = params.cfg.agents?.defaults?.model as { primary?: string } | string | undefined;
    if (typeof raw === "string") return raw.trim();
    return raw?.primary?.trim() ?? "";
  })();
  if (rawModel) {
    const trimmed = rawModel.trim();
    const aliasIndex = buildModelAliasIndex({
      cfg: params.cfg,
      defaultProvider: params.defaultProvider,
    });
    if (!trimmed.includes("/")) {
      const aliasKey = normalizeAliasKey(trimmed);
      const aliasMatch = aliasIndex.byAlias.get(aliasKey);
      if (aliasMatch) return aliasMatch.ref;

      // Default to anthropic if no provider is specified, but warn as this is deprecated.
      console.warn(
        `[moltbot] Model "${trimmed}" specified without provider. Falling back to "anthropic/${trimmed}". Please use "anthropic/${trimmed}" in your config.`,
      );
      return { provider: "anthropic", model: trimmed };
    }

    const resolved = resolveModelRefFromString({
      raw: trimmed,
      defaultProvider: params.defaultProvider,
      aliasIndex,
    });
    if (resolved) return resolved.ref;
  }
  return { provider: params.defaultProvider, model: params.defaultModel };
}

/**
 * 解析代理的默认模型
 * 支持代理级别的模型覆盖
 *
 * @param params.cfg - 配置对象
 * @param params.agentId - 代理 ID（可选）
 * @returns 模型引用
 */
export function resolveDefaultModelForAgent(params: {
  cfg: MoltbotConfig;
  agentId?: string;
}): ModelRef {
  const agentModelOverride = params.agentId
    ? resolveAgentModelPrimary(params.cfg, params.agentId)
    : undefined;
  const cfg =
    agentModelOverride && agentModelOverride.length > 0
      ? {
          ...params.cfg,
          agents: {
            ...params.cfg.agents,
            defaults: {
              ...params.cfg.agents?.defaults,
              model: {
                ...(typeof params.cfg.agents?.defaults?.model === "object"
                  ? params.cfg.agents.defaults.model
                  : undefined),
                primary: agentModelOverride,
              },
            },
          },
        }
      : params.cfg;
  return resolveConfiguredModelRef({
    cfg,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });
}

/**
 * 构建允许的模型集合
 * 基于配置中的模型白名单和目录
 *
 * @param params.cfg - 配置对象
 * @param params.catalog - 模型目录
 * @param params.defaultProvider - 默认提供商
 * @param params.defaultModel - 默认模型（可选）
 * @returns 允许的模型集合信息
 */
export function buildAllowedModelSet(params: {
  cfg: MoltbotConfig;
  catalog: ModelCatalogEntry[];
  defaultProvider: string;
  defaultModel?: string;
}): {
  allowAny: boolean;
  allowedCatalog: ModelCatalogEntry[];
  allowedKeys: Set<string>;
} {
  const rawAllowlist = (() => {
    const modelMap = params.cfg.agents?.defaults?.models ?? {};
    return Object.keys(modelMap);
  })();
  const allowAny = rawAllowlist.length === 0;
  const defaultModel = params.defaultModel?.trim();
  const defaultKey =
    defaultModel && params.defaultProvider
      ? modelKey(params.defaultProvider, defaultModel)
      : undefined;
  const catalogKeys = new Set(params.catalog.map((entry) => modelKey(entry.provider, entry.id)));

  if (allowAny) {
    if (defaultKey) catalogKeys.add(defaultKey);
    return {
      allowAny: true,
      allowedCatalog: params.catalog,
      allowedKeys: catalogKeys,
    };
  }

  const allowedKeys = new Set<string>();
  const configuredProviders = (params.cfg.models?.providers ?? {}) as Record<string, unknown>;
  for (const raw of rawAllowlist) {
    const parsed = parseModelRef(String(raw), params.defaultProvider);
    if (!parsed) continue;
    const key = modelKey(parsed.provider, parsed.model);
    const providerKey = normalizeProviderId(parsed.provider);
    if (isCliProvider(parsed.provider, params.cfg)) {
      allowedKeys.add(key);
    } else if (catalogKeys.has(key)) {
      allowedKeys.add(key);
    } else if (configuredProviders[providerKey] != null) {
      // Explicitly configured providers should be allowlist-able even when
      // they don't exist in the curated model catalog.
      allowedKeys.add(key);
    }
  }

  if (defaultKey) {
    allowedKeys.add(defaultKey);
  }

  const allowedCatalog = params.catalog.filter((entry) =>
    allowedKeys.has(modelKey(entry.provider, entry.id)),
  );

  if (allowedCatalog.length === 0 && allowedKeys.size === 0) {
    if (defaultKey) catalogKeys.add(defaultKey);
    return {
      allowAny: true,
      allowedCatalog: params.catalog,
      allowedKeys: catalogKeys,
    };
  }

  return { allowAny: false, allowedCatalog, allowedKeys };
}

/** 模型引用状态信息 */
export type ModelRefStatus = {
  /** 模型键 */
  key: string;
  /** 是否在目录中 */
  inCatalog: boolean;
  /** 是否允许任意模型 */
  allowAny: boolean;
  /** 是否被允许 */
  allowed: boolean;
};

/**
 * 获取模型引用的状态
 * 检查模型是否在目录中以及是否被允许
 */
export function getModelRefStatus(params: {
  cfg: MoltbotConfig;
  catalog: ModelCatalogEntry[];
  ref: ModelRef;
  defaultProvider: string;
  defaultModel?: string;
}): ModelRefStatus {
  const allowed = buildAllowedModelSet({
    cfg: params.cfg,
    catalog: params.catalog,
    defaultProvider: params.defaultProvider,
    defaultModel: params.defaultModel,
  });
  const key = modelKey(params.ref.provider, params.ref.model);
  return {
    key,
    inCatalog: params.catalog.some((entry) => modelKey(entry.provider, entry.id) === key),
    allowAny: allowed.allowAny,
    allowed: allowed.allowAny || allowed.allowedKeys.has(key),
  };
}

/**
 * 解析并验证允许的模型引用
 * 检查模型是否在白名单中
 *
 * @param params.cfg - 配置对象
 * @param params.catalog - 模型目录
 * @param params.raw - 原始模型字符串
 * @param params.defaultProvider - 默认提供商
 * @param params.defaultModel - 默认模型（可选）
 * @returns 模型引用或错误信息
 */
export function resolveAllowedModelRef(params: {
  cfg: MoltbotConfig;
  catalog: ModelCatalogEntry[];
  raw: string;
  defaultProvider: string;
  defaultModel?: string;
}):
  | { ref: ModelRef; key: string }
  | {
      error: string;
    } {
  const trimmed = params.raw.trim();
  if (!trimmed) return { error: "invalid model: empty" };

  const aliasIndex = buildModelAliasIndex({
    cfg: params.cfg,
    defaultProvider: params.defaultProvider,
  });
  const resolved = resolveModelRefFromString({
    raw: trimmed,
    defaultProvider: params.defaultProvider,
    aliasIndex,
  });
  if (!resolved) return { error: `invalid model: ${trimmed}` };

  const status = getModelRefStatus({
    cfg: params.cfg,
    catalog: params.catalog,
    ref: resolved.ref,
    defaultProvider: params.defaultProvider,
    defaultModel: params.defaultModel,
  });
  if (!status.allowed) {
    return { error: `model not allowed: ${status.key}` };
  }

  return { ref: resolved.ref, key: status.key };
}

/**
 * 解析思考级别默认值
 * 根据模型能力确定默认的思考深度
 *
 * @param params.cfg - 配置对象
 * @param params.provider - 提供商
 * @param params.model - 模型名称
 * @param params.catalog - 模型目录（可选）
 * @returns 思考级别
 */
export function resolveThinkingDefault(params: {
  cfg: MoltbotConfig;
  provider: string;
  model: string;
  catalog?: ModelCatalogEntry[];
}): ThinkLevel {
  const configured = params.cfg.agents?.defaults?.thinkingDefault;
  if (configured) return configured;
  const candidate = params.catalog?.find(
    (entry) => entry.provider === params.provider && entry.id === params.model,
  );
  if (candidate?.reasoning) return "low";
  return "off";
}

/**
 * Resolve the model configured for Gmail hook processing.
 * Returns null if hooks.gmail.model is not set.
 */
export function resolveHooksGmailModel(params: {
  cfg: MoltbotConfig;
  defaultProvider: string;
}): ModelRef | null {
  const hooksModel = params.cfg.hooks?.gmail?.model;
  if (!hooksModel?.trim()) return null;

  const aliasIndex = buildModelAliasIndex({
    cfg: params.cfg,
    defaultProvider: params.defaultProvider,
  });

  const resolved = resolveModelRefFromString({
    raw: hooksModel,
    defaultProvider: params.defaultProvider,
    aliasIndex,
  });

  return resolved?.ref ?? null;
}
