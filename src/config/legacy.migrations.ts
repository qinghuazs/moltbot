/**
 * 旧版配置迁移汇总模块
 *
 * 聚合所有分片（part-1/2/3）的迁移规则列表，按顺序导出完整的迁移数组。
 */
import { LEGACY_CONFIG_MIGRATIONS_PART_1 } from "./legacy.migrations.part-1.js";
import { LEGACY_CONFIG_MIGRATIONS_PART_2 } from "./legacy.migrations.part-2.js";
import { LEGACY_CONFIG_MIGRATIONS_PART_3 } from "./legacy.migrations.part-3.js";

export const LEGACY_CONFIG_MIGRATIONS = [
  ...LEGACY_CONFIG_MIGRATIONS_PART_1,
  ...LEGACY_CONFIG_MIGRATIONS_PART_2,
  ...LEGACY_CONFIG_MIGRATIONS_PART_3,
];
