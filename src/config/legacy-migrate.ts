/**
 * 旧版配置迁移入口模块
 *
 * 提供一键迁移旧版配置的入口函数，执行流程：
 * 1. 应用所有旧版配置迁移规则
 * 2. 验证迁移后的配置（含插件验证）
 * 3. 返回有效配置或 null
 */
import { applyLegacyMigrations } from "./legacy.js";
import type { MoltbotConfig } from "./types.js";
import { validateConfigObjectWithPlugins } from "./validation.js";

export function migrateLegacyConfig(raw: unknown): {
  config: MoltbotConfig | null;
  changes: string[];
} {
  const { next, changes } = applyLegacyMigrations(raw);
  if (!next) return { config: null, changes: [] };
  const validated = validateConfigObjectWithPlugins(next);
  if (!validated.ok) {
    changes.push("Migration applied, but config still invalid; fix remaining issues manually.");
    return { config: null, changes };
  }
  return { config: validated.config, changes };
}
