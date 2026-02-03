/**
 * 配置模块统一导出
 * 聚合并导出所有配置相关的函数、类型和常量
 */

// 配置 I/O 操作
export {
  createConfigIO, // 创建配置 I/O 实例
  loadConfig, // 加载配置
  parseConfigJson5, // 解析 JSON5 配置
  readConfigFileSnapshot, // 读取配置文件快照
  resolveConfigSnapshotHash, // 解析配置快照哈希
  writeConfigFile, // 写入配置文件
} from "./io.js";

// 旧版配置迁移
export { migrateLegacyConfig } from "./legacy-migrate.js";

// 路径相关
export * from "./paths.js";

// 运行时覆盖
export * from "./runtime-overrides.js";

// 类型定义
export * from "./types.js";

// 配置验证
export { validateConfigObject, validateConfigObjectWithPlugins } from "./validation.js";

// Zod 配置模式
export { MoltbotSchema } from "./zod-schema.js";
