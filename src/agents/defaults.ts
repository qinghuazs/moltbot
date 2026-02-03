/**
 * Agent 默认值模块
 * 定义 Agent 元数据的默认值（当上游未提供时使用）
 */

/** 默认提供商（使用 pi-ai 内置的 Anthropic 目录） */
export const DEFAULT_PROVIDER = "anthropic";
/** 默认模型 */
export const DEFAULT_MODEL = "claude-opus-4-5";
/** 默认上下文窗口大小：Opus 4.5 支持约 200k tokens */
export const DEFAULT_CONTEXT_TOKENS = 200_000;
