/**
 * 配置日志工具模块
 *
 * 提供配置文件路径格式化和配置更新日志输出功能。
 */
import type { RuntimeEnv } from "../runtime.js";
import { displayPath } from "../utils.js";
import { CONFIG_PATH } from "./paths.js";

type LogConfigUpdatedOptions = {
  path?: string;
  suffix?: string;
};

/** 格式化配置文件路径为用户友好的显示格式 */
export function formatConfigPath(path: string = CONFIG_PATH): string {
  return displayPath(path);
}

/** 输出配置更新日志（如 "Updated ~/.clawdbot/config.json5 (suffix)"） */
export function logConfigUpdated(runtime: RuntimeEnv, opts: LogConfigUpdatedOptions = {}): void {
  const path = formatConfigPath(opts.path ?? CONFIG_PATH);
  const suffix = opts.suffix ? ` ${opts.suffix}` : "";
  runtime.log(`Updated ${path}${suffix}`);
}
