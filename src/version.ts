/**
 * 版本信息模块
 * 提供 Moltbot 当前版本号的单一真实来源
 */
import { createRequire } from "node:module";

/** 编译时注入的版本号（用于打包构建） */
declare const __CLAWDBOT_VERSION__: string | undefined;

/**
 * 从 package.json 读取版本号
 * @returns 版本号字符串，读取失败返回 null
 */
function readVersionFromPackageJson(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

/**
 * 当前 Moltbot 版本号的单一真实来源
 * 优先级：
 * - 嵌入式/打包构建：注入的 define 或环境变量
 * - 开发/npm 构建：package.json
 */
export const VERSION =
  (typeof __CLAWDBOT_VERSION__ === "string" && __CLAWDBOT_VERSION__) ||
  process.env.CLAWDBOT_BUNDLED_VERSION ||
  readVersionFromPackageJson() ||
  "0.0.0";
