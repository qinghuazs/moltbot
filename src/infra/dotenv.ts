/**
 * 环境变量加载模块
 * 从 .env 文件加载环境变量，支持本地和全局配置
 */
import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { resolveConfigDir } from "../utils.js";

/**
 * 加载 .env 环境变量文件
 * 首先从当前工作目录加载，然后从全局配置目录加载（不覆盖已存在的变量）
 * @param opts - 选项
 * @param opts.quiet - 是否静默模式（默认 true）
 */
export function loadDotEnv(opts?: { quiet?: boolean }) {
  const quiet = opts?.quiet ?? true;

  // 首先从进程当前工作目录加载（dotenv 默认行为）
  dotenv.config({ quiet });

  // 然后加载全局回退：~/.clawdbot/.env（或 CLAWDBOT_STATE_DIR/.env），
  // 不覆盖任何已存在的环境变量
  const globalEnvPath = path.join(resolveConfigDir(process.env), ".env");
  if (!fs.existsSync(globalEnvPath)) return;

  dotenv.config({ quiet, path: globalEnvPath, override: false });
}
