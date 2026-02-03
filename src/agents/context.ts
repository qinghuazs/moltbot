/**
 * Agent 上下文模块
 * 延迟加载 pi-coding-agent 模型元数据，用于推断上下文窗口大小
 * 包括自定义 models.json 条目
 */

import { loadConfig } from "../config/config.js";
import { resolveMoltbotAgentDir } from "./agent-paths.js";
import { ensureMoltbotModelsJson } from "./models-config.js";

/** 模型条目类型 */
type ModelEntry = { id: string; contextWindow?: number };

/** 模型缓存：模型 ID -> 上下文窗口大小 */
const MODEL_CACHE = new Map<string, number>();

/** 异步加载模型元数据 */
const loadPromise = (async () => {
  try {
    const { discoverAuthStorage, discoverModels } = await import("@mariozechner/pi-coding-agent");
    const cfg = loadConfig();
    await ensureMoltbotModelsJson(cfg);
    const agentDir = resolveMoltbotAgentDir();
    const authStorage = discoverAuthStorage(agentDir);
    const modelRegistry = discoverModels(authStorage, agentDir);
    const models = modelRegistry.getAll() as ModelEntry[];
    // 遍历所有模型，缓存上下文窗口大小
    for (const m of models) {
      if (!m?.id) continue;
      if (typeof m.contextWindow === "number" && m.contextWindow > 0) {
        MODEL_CACHE.set(m.id, m.contextWindow);
      }
    }
  } catch {
    // 如果 pi-ai 不可用，保持缓存为空；查找时会回退
  }
})();

/**
 * 查找模型的上下文窗口大小
 * @param modelId - 模型 ID
 * @returns 上下文窗口大小（tokens），未找到返回 undefined
 */
export function lookupContextTokens(modelId?: string): number | undefined {
  if (!modelId) return undefined;
  // 尽力而为：启动加载，但不阻塞
  void loadPromise;
  return MODEL_CACHE.get(modelId);
}
