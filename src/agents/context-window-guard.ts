/**
 * 上下文窗口守卫模块
 *
 * 提供上下文窗口大小的解析和验证功能，用于：
 * - 从多个来源解析上下文窗口大小
 * - 检测过小的上下文窗口并发出警告
 * - 阻止使用过小的上下文窗口
 */

import type { MoltbotConfig } from "../config/config.js";

/** 上下文窗口硬性最小值（token 数） */
export const CONTEXT_WINDOW_HARD_MIN_TOKENS = 16_000;
/** 上下文窗口警告阈值（token 数） */
export const CONTEXT_WINDOW_WARN_BELOW_TOKENS = 32_000;

/** 上下文窗口来源 */
export type ContextWindowSource = "model" | "modelsConfig" | "agentContextTokens" | "default";

/**
 * 上下文窗口信息
 */
export type ContextWindowInfo = {
  /** token 数量 */
  tokens: number;
  /** 来源 */
  source: ContextWindowSource;
};

/**
 * 规范化正整数
 */
function normalizePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const int = Math.floor(value);
  return int > 0 ? int : null;
}

/**
 * 解析上下文窗口信息
 *
 * 按优先级从以下来源解析：
 * 1. 模型自带的上下文窗口
 * 2. models.providers 配置
 * 3. agents.defaults.contextTokens 配置
 * 4. 默认值
 */
export function resolveContextWindowInfo(params: {
  cfg: MoltbotConfig | undefined;
  provider: string;
  modelId: string;
  modelContextWindow?: number;
  defaultTokens: number;
}): ContextWindowInfo {
  const fromModel = normalizePositiveInt(params.modelContextWindow);
  if (fromModel) return { tokens: fromModel, source: "model" };

  const fromModelsConfig = (() => {
    const providers = params.cfg?.models?.providers as
      | Record<string, { models?: Array<{ id?: string; contextWindow?: number }> }>
      | undefined;
    const providerEntry = providers?.[params.provider];
    const models = Array.isArray(providerEntry?.models) ? providerEntry.models : [];
    const match = models.find((m) => m?.id === params.modelId);
    return normalizePositiveInt(match?.contextWindow);
  })();
  if (fromModelsConfig) return { tokens: fromModelsConfig, source: "modelsConfig" };

  const fromAgentConfig = normalizePositiveInt(params.cfg?.agents?.defaults?.contextTokens);
  if (fromAgentConfig) return { tokens: fromAgentConfig, source: "agentContextTokens" };

  return { tokens: Math.floor(params.defaultTokens), source: "default" };
}

/**
 * 上下文窗口守卫结果
 */
export type ContextWindowGuardResult = ContextWindowInfo & {
  /** 是否应该警告 */
  shouldWarn: boolean;
  /** 是否应该阻止 */
  shouldBlock: boolean;
};

/**
 * 评估上下文窗口守卫
 *
 * 检查上下文窗口大小是否满足最小要求。
 */
export function evaluateContextWindowGuard(params: {
  info: ContextWindowInfo;
  warnBelowTokens?: number;
  hardMinTokens?: number;
}): ContextWindowGuardResult {
  const warnBelow = Math.max(
    1,
    Math.floor(params.warnBelowTokens ?? CONTEXT_WINDOW_WARN_BELOW_TOKENS),
  );
  const hardMin = Math.max(1, Math.floor(params.hardMinTokens ?? CONTEXT_WINDOW_HARD_MIN_TOKENS));
  const tokens = Math.max(0, Math.floor(params.info.tokens));
  return {
    ...params.info,
    tokens,
    shouldWarn: tokens > 0 && tokens < warnBelow,
    shouldBlock: tokens > 0 && tokens < hardMin,
  };
}
