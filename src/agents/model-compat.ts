/**
 * 模型兼容性模块
 *
 * 该模块处理不同模型提供商之间的兼容性问题，
 * 确保模型配置符合各提供商的 API 要求。
 *
 * @module agents/model-compat
 */

import type { Api, Model } from "@mariozechner/pi-ai";

/**
 * 检查是否为 OpenAI Completions 模型
 */
function isOpenAiCompletionsModel(model: Model<Api>): model is Model<"openai-completions"> {
  return model.api === "openai-completions";
}

/**
 * 标准化模型兼容性配置
 *
 * 针对特定提供商（如 Z.AI）调整模型配置，
 * 确保 API 调用符合提供商的要求。
 *
 * @param model - 模型对象
 * @returns 调整后的模型对象
 */
export function normalizeModelCompat(model: Model<Api>): Model<Api> {
  const baseUrl = model.baseUrl ?? "";
  const isZai = model.provider === "zai" || baseUrl.includes("api.z.ai");
  if (!isZai || !isOpenAiCompletionsModel(model)) return model;

  const openaiModel = model as Model<"openai-completions">;
  const compat = openaiModel.compat ?? undefined;
  if (compat?.supportsDeveloperRole === false) return model;

  openaiModel.compat = compat
    ? { ...compat, supportsDeveloperRole: false }
    : { supportsDeveloperRole: false };
  return openaiModel;
}
