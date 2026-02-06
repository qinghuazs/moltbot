/**
 * 配置合并模块
 *
 * 提供配置段的浅合并工具，支持 undefined 值的删除语义。
 * 用于将部分配置补丁合并到现有配置中。
 */
import type { MoltbotConfig } from "./config.js";
import type { WhatsAppConfig } from "./types.js";

/** 合并选项 */
export type MergeSectionOptions<T> = {
  /** 当补丁值为 undefined 时需要删除的键列表 */
  unsetOnUndefined?: Array<keyof T>;
};

/**
 * 浅合并配置段
 *
 * 将补丁对象的非 undefined 值合并到基础对象中。
 * 对于 unsetOnUndefined 中指定的键，undefined 值会删除该键。
 *
 * @param base - 基础配置段
 * @param patch - 补丁对象
 * @param options - 合并选项
 * @returns 合并后的配置段
 */
export function mergeConfigSection<T extends Record<string, unknown>>(
  base: T | undefined,
  patch: Partial<T>,
  options: MergeSectionOptions<T> = {},
): T {
  const next: Record<string, unknown> = { ...(base ?? undefined) };
  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (value === undefined) {
      if (options.unsetOnUndefined?.includes(key)) {
        delete next[key as string];
      }
      continue;
    }
    next[key as string] = value as unknown;
  }
  return next as T;
}

/**
 * 合并 WhatsApp 渠道配置
 *
 * 将 WhatsApp 配置补丁合并到主配置的 channels.whatsapp 段中。
 */
export function mergeWhatsAppConfig(
  cfg: MoltbotConfig,
  patch: Partial<WhatsAppConfig>,
  options?: MergeSectionOptions<WhatsAppConfig>,
): MoltbotConfig {
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      whatsapp: mergeConfigSection(cfg.channels?.whatsapp, patch, options),
    },
  };
}
