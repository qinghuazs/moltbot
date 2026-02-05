/**
 * 模型故障转移模块
 *
 * 该模块提供模型调用的故障转移机制，当主模型调用失败时，
 * 自动尝试备用模型。支持：
 * - 文本模型故障转移
 * - 图像模型故障转移
 * - 认证配置冷却检测
 * - 错误分类和重试策略
 *
 * @module agents/model-fallback
 */

import type { MoltbotConfig } from "../config/config.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "./defaults.js";
import {
  coerceToFailoverError,
  describeFailoverError,
  isFailoverError,
  isTimeoutError,
} from "./failover-error.js";
import {
  buildModelAliasIndex,
  modelKey,
  parseModelRef,
  resolveConfiguredModelRef,
  resolveModelRefFromString,
} from "./model-selection.js";
import type { FailoverReason } from "./pi-embedded-helpers.js";
import {
  ensureAuthProfileStore,
  isProfileInCooldown,
  resolveAuthProfileOrder,
} from "./auth-profiles.js";

/** 模型候选项，包含提供商和模型名称 */
type ModelCandidate = {
  provider: string;
  model: string;
};

/** 故障转移尝试记录 */
type FallbackAttempt = {
  /** 提供商标识 */
  provider: string;
  /** 模型名称 */
  model: string;
  /** 错误信息 */
  error: string;
  /** 故障原因分类 */
  reason?: FailoverReason;
  /** HTTP 状态码 */
  status?: number;
  /** 错误代码 */
  code?: string;
};

/**
 * 检查错误是否为用户主动中止
 * @param err - 错误对象
 * @returns 是否为中止错误
 */
function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if (isFailoverError(err)) return false;
  const name = "name" in err ? String(err.name) : "";
  // Only treat explicit AbortError names as user aborts.
  // Message-based checks (e.g., "aborted") can mask timeouts and skip fallback.
  return name === "AbortError";
}

/**
 * 判断是否应该重新抛出中止错误
 * 用户主动中止时不应进行故障转移
 */
function shouldRethrowAbort(err: unknown): boolean {
  return isAbortError(err) && !isTimeoutError(err);
}

/**
 * 构建允许的模型键集合
 * 基于配置中的模型白名单
 */
function buildAllowedModelKeys(
  cfg: MoltbotConfig | undefined,
  defaultProvider: string,
): Set<string> | null {
  const rawAllowlist = (() => {
    const modelMap = cfg?.agents?.defaults?.models ?? {};
    return Object.keys(modelMap);
  })();
  if (rawAllowlist.length === 0) return null;
  const keys = new Set<string>();
  for (const raw of rawAllowlist) {
    const parsed = parseModelRef(String(raw ?? ""), defaultProvider);
    if (!parsed) continue;
    keys.add(modelKey(parsed.provider, parsed.model));
  }
  return keys.size > 0 ? keys : null;
}

/**
 * 解析图像模型故障转移候选列表
 * 包括主模型和配置的备用模型
 */
function resolveImageFallbackCandidates(params: {
  cfg: MoltbotConfig | undefined;
  defaultProvider: string;
  modelOverride?: string;
}): ModelCandidate[] {
  const aliasIndex = buildModelAliasIndex({
    cfg: params.cfg ?? {},
    defaultProvider: params.defaultProvider,
  });
  const allowlist = buildAllowedModelKeys(params.cfg, params.defaultProvider);
  const seen = new Set<string>();
  const candidates: ModelCandidate[] = [];

  const addCandidate = (candidate: ModelCandidate, enforceAllowlist: boolean) => {
    if (!candidate.provider || !candidate.model) return;
    const key = modelKey(candidate.provider, candidate.model);
    if (seen.has(key)) return;
    if (enforceAllowlist && allowlist && !allowlist.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };

  const addRaw = (raw: string, enforceAllowlist: boolean) => {
    const resolved = resolveModelRefFromString({
      raw: String(raw ?? ""),
      defaultProvider: params.defaultProvider,
      aliasIndex,
    });
    if (!resolved) return;
    addCandidate(resolved.ref, enforceAllowlist);
  };

  if (params.modelOverride?.trim()) {
    addRaw(params.modelOverride, false);
  } else {
    const imageModel = params.cfg?.agents?.defaults?.imageModel as
      | { primary?: string }
      | string
      | undefined;
    const primary = typeof imageModel === "string" ? imageModel.trim() : imageModel?.primary;
    if (primary?.trim()) addRaw(primary, false);
  }

  const imageFallbacks = (() => {
    const imageModel = params.cfg?.agents?.defaults?.imageModel as
      | { fallbacks?: string[] }
      | string
      | undefined;
    if (imageModel && typeof imageModel === "object") {
      return imageModel.fallbacks ?? [];
    }
    return [];
  })();

  for (const raw of imageFallbacks) {
    addRaw(raw, true);
  }

  return candidates;
}

/**
 * 解析文本模型故障转移候选列表
 * 包括主模型、配置的备用模型和默认模型
 */
function resolveFallbackCandidates(params: {
  cfg: MoltbotConfig | undefined;
  provider: string;
  model: string;
  /** Optional explicit fallbacks list; when provided (even empty), replaces agents.defaults.model.fallbacks. */
  fallbacksOverride?: string[];
}): ModelCandidate[] {
  const primary = params.cfg
    ? resolveConfiguredModelRef({
        cfg: params.cfg,
        defaultProvider: DEFAULT_PROVIDER,
        defaultModel: DEFAULT_MODEL,
      })
    : null;
  const defaultProvider = primary?.provider ?? DEFAULT_PROVIDER;
  const defaultModel = primary?.model ?? DEFAULT_MODEL;
  const provider = String(params.provider ?? "").trim() || defaultProvider;
  const model = String(params.model ?? "").trim() || defaultModel;
  const aliasIndex = buildModelAliasIndex({
    cfg: params.cfg ?? {},
    defaultProvider,
  });
  const allowlist = buildAllowedModelKeys(params.cfg, defaultProvider);
  const seen = new Set<string>();
  const candidates: ModelCandidate[] = [];

  const addCandidate = (candidate: ModelCandidate, enforceAllowlist: boolean) => {
    if (!candidate.provider || !candidate.model) return;
    const key = modelKey(candidate.provider, candidate.model);
    if (seen.has(key)) return;
    if (enforceAllowlist && allowlist && !allowlist.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };

  addCandidate({ provider, model }, false);

  const modelFallbacks = (() => {
    if (params.fallbacksOverride !== undefined) return params.fallbacksOverride;
    const model = params.cfg?.agents?.defaults?.model as
      | { fallbacks?: string[] }
      | string
      | undefined;
    if (model && typeof model === "object") return model.fallbacks ?? [];
    return [];
  })();

  for (const raw of modelFallbacks) {
    const resolved = resolveModelRefFromString({
      raw: String(raw ?? ""),
      defaultProvider,
      aliasIndex,
    });
    if (!resolved) continue;
    addCandidate(resolved.ref, true);
  }

  if (params.fallbacksOverride === undefined && primary?.provider && primary.model) {
    addCandidate({ provider: primary.provider, model: primary.model }, false);
  }

  return candidates;
}

/**
 * 使用模型故障转移机制执行操作
 *
 * 当主模型调用失败时，自动尝试备用模型。
 * 支持认证配置冷却检测，跳过处于冷却期的提供商。
 *
 * @param params.cfg - 配置对象
 * @param params.provider - 主提供商
 * @param params.model - 主模型
 * @param params.agentDir - 代理目录（可选）
 * @param params.fallbacksOverride - 显式备用列表（可选）
 * @param params.run - 执行函数
 * @param params.onError - 错误回调（可选）
 * @returns 执行结果、使用的模型信息和尝试记录
 */
export async function runWithModelFallback<T>(params: {
  cfg: MoltbotConfig | undefined;
  provider: string;
  model: string;
  agentDir?: string;
  /** Optional explicit fallbacks list; when provided (even empty), replaces agents.defaults.model.fallbacks. */
  fallbacksOverride?: string[];
  run: (provider: string, model: string) => Promise<T>;
  onError?: (attempt: {
    provider: string;
    model: string;
    error: unknown;
    attempt: number;
    total: number;
  }) => void | Promise<void>;
}): Promise<{
  result: T;
  provider: string;
  model: string;
  attempts: FallbackAttempt[];
}> {
  const candidates = resolveFallbackCandidates({
    cfg: params.cfg,
    provider: params.provider,
    model: params.model,
    fallbacksOverride: params.fallbacksOverride,
  });
  const authStore = params.cfg
    ? ensureAuthProfileStore(params.agentDir, { allowKeychainPrompt: false })
    : null;
  const attempts: FallbackAttempt[] = [];
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i] as ModelCandidate;
    if (authStore) {
      const profileIds = resolveAuthProfileOrder({
        cfg: params.cfg,
        store: authStore,
        provider: candidate.provider,
      });
      const isAnyProfileAvailable = profileIds.some((id) => !isProfileInCooldown(authStore, id));

      if (profileIds.length > 0 && !isAnyProfileAvailable) {
        // All profiles for this provider are in cooldown; skip without attempting
        attempts.push({
          provider: candidate.provider,
          model: candidate.model,
          error: `Provider ${candidate.provider} is in cooldown (all profiles unavailable)`,
          reason: "rate_limit",
        });
        continue;
      }
    }
    try {
      const result = await params.run(candidate.provider, candidate.model);
      return {
        result,
        provider: candidate.provider,
        model: candidate.model,
        attempts,
      };
    } catch (err) {
      if (shouldRethrowAbort(err)) throw err;
      const normalized =
        coerceToFailoverError(err, {
          provider: candidate.provider,
          model: candidate.model,
        }) ?? err;
      if (!isFailoverError(normalized)) throw err;

      lastError = normalized;
      const described = describeFailoverError(normalized);
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        error: described.message,
        reason: described.reason,
        status: described.status,
        code: described.code,
      });
      await params.onError?.({
        provider: candidate.provider,
        model: candidate.model,
        error: normalized,
        attempt: i + 1,
        total: candidates.length,
      });
    }
  }

  if (attempts.length <= 1 && lastError) throw lastError;
  const summary =
    attempts.length > 0
      ? attempts
          .map(
            (attempt) =>
              `${attempt.provider}/${attempt.model}: ${attempt.error}${
                attempt.reason ? ` (${attempt.reason})` : ""
              }`,
          )
          .join(" | ")
      : "unknown";
  throw new Error(`All models failed (${attempts.length || candidates.length}): ${summary}`, {
    cause: lastError instanceof Error ? lastError : undefined,
  });
}

/**
 * 使用图像模型故障转移机制执行操作
 *
 * 专门用于图像生成任务的故障转移，
 * 当主图像模型失败时自动尝试备用模型。
 *
 * @param params.cfg - 配置对象
 * @param params.modelOverride - 模型覆盖（可选）
 * @param params.run - 执行函数
 * @param params.onError - 错误回调（可选）
 * @returns 执行结果、使用的模型信息和尝试记录
 */
export async function runWithImageModelFallback<T>(params: {
  cfg: MoltbotConfig | undefined;
  modelOverride?: string;
  run: (provider: string, model: string) => Promise<T>;
  onError?: (attempt: {
    provider: string;
    model: string;
    error: unknown;
    attempt: number;
    total: number;
  }) => void | Promise<void>;
}): Promise<{
  result: T;
  provider: string;
  model: string;
  attempts: FallbackAttempt[];
}> {
  const candidates = resolveImageFallbackCandidates({
    cfg: params.cfg,
    defaultProvider: DEFAULT_PROVIDER,
    modelOverride: params.modelOverride,
  });
  if (candidates.length === 0) {
    throw new Error(
      "No image model configured. Set agents.defaults.imageModel.primary or agents.defaults.imageModel.fallbacks.",
    );
  }

  const attempts: FallbackAttempt[] = [];
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i] as ModelCandidate;
    try {
      const result = await params.run(candidate.provider, candidate.model);
      return {
        result,
        provider: candidate.provider,
        model: candidate.model,
        attempts,
      };
    } catch (err) {
      if (shouldRethrowAbort(err)) throw err;
      lastError = err;
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        error: err instanceof Error ? err.message : String(err),
      });
      await params.onError?.({
        provider: candidate.provider,
        model: candidate.model,
        error: err,
        attempt: i + 1,
        total: candidates.length,
      });
    }
  }

  if (attempts.length <= 1 && lastError) throw lastError;
  const summary =
    attempts.length > 0
      ? attempts
          .map((attempt) => `${attempt.provider}/${attempt.model}: ${attempt.error}`)
          .join(" | ")
      : "unknown";
  throw new Error(`All image models failed (${attempts.length || candidates.length}): ${summary}`, {
    cause: lastError instanceof Error ? lastError : undefined,
  });
}
