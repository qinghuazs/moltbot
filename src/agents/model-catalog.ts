/**
 * 模型目录模块
 *
 * 负责加载和管理可用的 AI 模型目录，包括：
 * - 从 Pi SDK 发现已配置的模型
 * - 缓存模型目录以提高性能
 * - 提供模型查询和能力检测功能
 */

import { type MoltbotConfig, loadConfig } from "../config/config.js";
import { resolveMoltbotAgentDir } from "./agent-paths.js";
import { ensureMoltbotModelsJson } from "./models-config.js";

/**
 * 模型目录条目
 * 描述单个可用模型的元数据
 */
export type ModelCatalogEntry = {
  /** 模型唯一标识符 */
  id: string;
  /** 模型显示名称 */
  name: string;
  /** 模型提供商（如 anthropic、openai 等） */
  provider: string;
  /** 上下文窗口大小（token 数量） */
  contextWindow?: number;
  /** 是否支持推理/思考模式 */
  reasoning?: boolean;
  /** 支持的输入类型 */
  input?: Array<"text" | "image">;
};

/**
 * 发现的模型（内部类型）
 * 从 Pi SDK 返回的原始模型数据
 */
type DiscoveredModel = {
  id: string;
  name?: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
  input?: Array<"text" | "image">;
};

type PiSdkModule = typeof import("@mariozechner/pi-coding-agent");

/** 模型目录缓存 Promise */
let modelCatalogPromise: Promise<ModelCatalogEntry[]> | null = null;
/** 是否已记录过模型目录加载错误 */
let hasLoggedModelCatalogError = false;
/** 默认的 Pi SDK 导入函数 */
const defaultImportPiSdk = () => import("@mariozechner/pi-coding-agent");
/** 当前使用的 Pi SDK 导入函数（可被测试替换） */
let importPiSdk = defaultImportPiSdk;

/**
 * 重置模型目录缓存（仅用于测试）
 */
export function resetModelCatalogCacheForTest() {
  modelCatalogPromise = null;
  hasLoggedModelCatalogError = false;
  importPiSdk = defaultImportPiSdk;
}

/**
 * 设置模型目录导入函数（仅用于测试）
 * 允许模拟动态导入以测试瞬态失败场景
 */
export function __setModelCatalogImportForTest(loader?: () => Promise<PiSdkModule>) {
  importPiSdk = loader ?? defaultImportPiSdk;
}

/**
 * 加载模型目录
 *
 * 从 Pi SDK 发现所有已配置的模型，并返回排序后的目录列表。
 * 支持缓存以避免重复加载，但在加载失败时不会缓存错误结果。
 *
 * @param params.config - 可选的配置对象
 * @param params.useCache - 是否使用缓存（默认 true）
 * @returns 模型目录条目数组
 */
export async function loadModelCatalog(params?: {
  config?: MoltbotConfig;
  useCache?: boolean;
}): Promise<ModelCatalogEntry[]> {
  if (params?.useCache === false) {
    modelCatalogPromise = null;
  }
  if (modelCatalogPromise) return modelCatalogPromise;

  modelCatalogPromise = (async () => {
    const models: ModelCatalogEntry[] = [];
    const sortModels = (entries: ModelCatalogEntry[]) =>
      entries.sort((a, b) => {
        const p = a.provider.localeCompare(b.provider);
        if (p !== 0) return p;
        return a.name.localeCompare(b.name);
      });
    try {
      const cfg = params?.config ?? loadConfig();
      await ensureMoltbotModelsJson(cfg);
      // IMPORTANT: keep the dynamic import *inside* the try/catch.
      // If this fails once (e.g. during a pnpm install that temporarily swaps node_modules),
      // we must not poison the cache with a rejected promise (otherwise all channel handlers
      // will keep failing until restart).
      const piSdk = await importPiSdk();
      const agentDir = resolveMoltbotAgentDir();
      const authStorage = piSdk.discoverAuthStorage(agentDir);
      const registry = piSdk.discoverModels(authStorage, agentDir) as
        | {
            getAll: () => Array<DiscoveredModel>;
          }
        | Array<DiscoveredModel>;
      const entries = Array.isArray(registry) ? registry : registry.getAll();
      for (const entry of entries) {
        const id = String(entry?.id ?? "").trim();
        if (!id) continue;
        const provider = String(entry?.provider ?? "").trim();
        if (!provider) continue;
        const name = String(entry?.name ?? id).trim() || id;
        const contextWindow =
          typeof entry?.contextWindow === "number" && entry.contextWindow > 0
            ? entry.contextWindow
            : undefined;
        const reasoning = typeof entry?.reasoning === "boolean" ? entry.reasoning : undefined;
        const input = Array.isArray(entry?.input)
          ? (entry.input as Array<"text" | "image">)
          : undefined;
        models.push({ id, name, provider, contextWindow, reasoning, input });
      }

      if (models.length === 0) {
        // If we found nothing, don't cache this result so we can try again.
        modelCatalogPromise = null;
      }

      return sortModels(models);
    } catch (error) {
      if (!hasLoggedModelCatalogError) {
        hasLoggedModelCatalogError = true;
        console.warn(`[model-catalog] Failed to load model catalog: ${String(error)}`);
      }
      // Don't poison the cache on transient dependency/filesystem issues.
      modelCatalogPromise = null;
      if (models.length > 0) {
        return sortModels(models);
      }
      return [];
    }
  })();

  return modelCatalogPromise;
}

/**
 * Check if a model supports image input based on its catalog entry.
 */
export function modelSupportsVision(entry: ModelCatalogEntry | undefined): boolean {
  return entry?.input?.includes("image") ?? false;
}

/**
 * Find a model in the catalog by provider and model ID.
 */
export function findModelInCatalog(
  catalog: ModelCatalogEntry[],
  provider: string,
  modelId: string,
): ModelCatalogEntry | undefined {
  const normalizedProvider = provider.toLowerCase().trim();
  const normalizedModelId = modelId.toLowerCase().trim();
  return catalog.find(
    (entry) =>
      entry.provider.toLowerCase() === normalizedProvider &&
      entry.id.toLowerCase() === normalizedModelId,
  );
}
