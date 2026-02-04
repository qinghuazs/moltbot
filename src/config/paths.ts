/**
 * 路径配置模块
 *
 * 本模块负责解析和管理 Moltbot 的各种路径配置，包括：
 * - 状态目录（存储会话、日志、缓存等可变数据）
 * - 配置文件路径
 * - OAuth 凭证存储目录
 * - 网关锁目录
 * - 网关端口配置
 *
 * 支持新旧两套命名约定（moltbot/clawdbot），并提供平滑迁移。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { MoltbotConfig } from "./types.js";

/**
 * 检测是否运行在 Nix 模式下
 *
 * 当 CLAWDBOT_NIX_MODE=1 时，网关运行在 Nix 环境中。
 * 在此模式下：
 * - 不应尝试自动安装流程
 * - 缺失依赖应产生 Nix 特定的错误消息
 * - 配置由外部管理（从 Nix 角度看是只读的）
 *
 * @param env - 环境变量对象，默认使用 process.env
 * @returns 是否处于 Nix 模式
 */
export function resolveIsNixMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CLAWDBOT_NIX_MODE === "1";
}

/** 预计算的 Nix 模式标志 */
export const isNixMode = resolveIsNixMode();

/** 旧版状态目录名称 */
const LEGACY_STATE_DIRNAME = ".clawdbot";
/** 新版状态目录名称 */
const NEW_STATE_DIRNAME = ".moltbot";
/** 新版配置文件名 */
const CONFIG_FILENAME = "moltbot.json";
/** 旧版配置文件名 */
const LEGACY_CONFIG_FILENAME = "clawdbot.json";

/**
 * 获取旧版状态目录路径
 * @param homedir - 获取用户主目录的函数
 * @returns 旧版状态目录的完整路径
 */
function legacyStateDir(homedir: () => string = os.homedir): string {
  return path.join(homedir(), LEGACY_STATE_DIRNAME);
}

/**
 * 获取新版状态目录路径
 * @param homedir - 获取用户主目录的函数
 * @returns 新版状态目录的完整路径
 */
function newStateDir(homedir: () => string = os.homedir): string {
  return path.join(homedir(), NEW_STATE_DIRNAME);
}

/**
 * 解析旧版状态目录路径（公开接口）
 * @param homedir - 获取用户主目录的函数
 * @returns 旧版状态目录路径
 */
export function resolveLegacyStateDir(homedir: () => string = os.homedir): string {
  return legacyStateDir(homedir);
}

/**
 * 解析新版状态目录路径（公开接口）
 * @param homedir - 获取用户主目录的函数
 * @returns 新版状态目录路径
 */
export function resolveNewStateDir(homedir: () => string = os.homedir): string {
  return newStateDir(homedir);
}

/**
 * 解析状态目录路径
 *
 * 状态目录用于存储可变数据（会话、日志、缓存等）。
 * 可通过 MOLTBOT_STATE_DIR（首选）或 CLAWDBOT_STATE_DIR（旧版）环境变量覆盖。
 * 默认值：~/.clawdbot（为兼容性保留的旧版默认值）
 * 如果 ~/.moltbot 存在而 ~/.clawdbot 不存在，则优先使用 ~/.moltbot。
 *
 * @param env - 环境变量对象
 * @param homedir - 获取用户主目录的函数
 * @returns 状态目录的完整路径
 */
export function resolveStateDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir,
): string {
  // 检查环境变量覆盖
  const override = env.MOLTBOT_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (override) return resolveUserPath(override);
  // 检查新旧目录是否存在，智能选择
  const legacyDir = legacyStateDir(homedir);
  const newDir = newStateDir(homedir);
  const hasLegacy = fs.existsSync(legacyDir);
  const hasNew = fs.existsSync(newDir);
  if (!hasLegacy && hasNew) return newDir;
  return legacyDir;
}

/**
 * 解析用户路径，支持波浪号展开
 *
 * @param input - 输入路径字符串
 * @returns 解析后的绝对路径
 */
function resolveUserPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // 展开波浪号为用户主目录
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, os.homedir());
    return path.resolve(expanded);
  }
  return path.resolve(trimmed);
}

/** 预计算的状态目录路径 */
export const STATE_DIR = resolveStateDir();

/**
 * 解析规范配置文件路径
 *
 * 配置文件路径（JSON5 格式）。
 * 可通过 MOLTBOT_CONFIG_PATH（首选）或 CLAWDBOT_CONFIG_PATH（旧版）环境变量覆盖。
 * 默认值：~/.clawdbot/moltbot.json（或 $*_STATE_DIR/moltbot.json）
 *
 * @param env - 环境变量对象
 * @param stateDir - 状态目录路径
 * @returns 规范配置文件路径
 */
export function resolveCanonicalConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, os.homedir),
): string {
  const override = env.MOLTBOT_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (override) return resolveUserPath(override);
  return path.join(stateDir, CONFIG_FILENAME);
}

/**
 * 解析活动配置路径候选
 *
 * 优先选择已存在的配置候选文件（新/旧文件名），
 * 然后回退到规范路径。
 *
 * @param env - 环境变量对象
 * @param homedir - 获取用户主目录的函数
 * @returns 活动配置文件路径
 */
export function resolveConfigPathCandidate(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir,
): string {
  const candidates = resolveDefaultConfigCandidates(env, homedir);
  const existing = candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
  if (existing) return existing;
  return resolveCanonicalConfigPath(env, resolveStateDir(env, homedir));
}

/**
 * 解析活动配置路径
 *
 * 优先选择已存在的旧版/新版配置文件。
 *
 * @param env - 环境变量对象
 * @param stateDir - 状态目录路径
 * @param homedir - 获取用户主目录的函数
 * @returns 活动配置文件路径
 */
export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, os.homedir),
  homedir: () => string = os.homedir,
): string {
  const override = env.MOLTBOT_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (override) return resolveUserPath(override);
  const stateOverride = env.MOLTBOT_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  // 在状态目录中查找新旧配置文件
  const candidates = [
    path.join(stateDir, CONFIG_FILENAME),
    path.join(stateDir, LEGACY_CONFIG_FILENAME),
  ];
  const existing = candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
  if (existing) return existing;
  if (stateOverride) return path.join(stateDir, CONFIG_FILENAME);
  const defaultStateDir = resolveStateDir(env, homedir);
  if (path.resolve(stateDir) === path.resolve(defaultStateDir)) {
    return resolveConfigPathCandidate(env, homedir);
  }
  return path.join(stateDir, CONFIG_FILENAME);
}

/** 预计算的配置文件路径 */
export const CONFIG_PATH = resolveConfigPathCandidate();

/**
 * 解析默认配置路径候选列表
 *
 * 按优先级顺序返回配置路径候选：
 * 显式配置路径 → 状态目录派生路径 → 新版默认 → 旧版默认
 *
 * @param env - 环境变量对象
 * @param homedir - 获取用户主目录的函数
 * @returns 配置路径候选数组
 */
export function resolveDefaultConfigCandidates(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir,
): string[] {
  // 显式指定的配置路径优先
  const explicit = env.MOLTBOT_CONFIG_PATH?.trim() || env.CLAWDBOT_CONFIG_PATH?.trim();
  if (explicit) return [resolveUserPath(explicit)];

  const candidates: string[] = [];
  // 新版状态目录覆盖
  const moltbotStateDir = env.MOLTBOT_STATE_DIR?.trim();
  if (moltbotStateDir) {
    candidates.push(path.join(resolveUserPath(moltbotStateDir), CONFIG_FILENAME));
    candidates.push(path.join(resolveUserPath(moltbotStateDir), LEGACY_CONFIG_FILENAME));
  }
  // 旧版状态目录覆盖
  const legacyStateDirOverride = env.CLAWDBOT_STATE_DIR?.trim();
  if (legacyStateDirOverride) {
    candidates.push(path.join(resolveUserPath(legacyStateDirOverride), CONFIG_FILENAME));
    candidates.push(path.join(resolveUserPath(legacyStateDirOverride), LEGACY_CONFIG_FILENAME));
  }

  // 默认位置：新版目录优先，然后是旧版目录
  candidates.push(path.join(newStateDir(homedir), CONFIG_FILENAME));
  candidates.push(path.join(newStateDir(homedir), LEGACY_CONFIG_FILENAME));
  candidates.push(path.join(legacyStateDir(homedir), CONFIG_FILENAME));
  candidates.push(path.join(legacyStateDir(homedir), LEGACY_CONFIG_FILENAME));
  return candidates;
}

/** 默认网关端口 */
export const DEFAULT_GATEWAY_PORT = 18789;

/**
 * 解析网关锁目录路径
 *
 * 网关锁目录（临时目录）。
 * 默认值：os.tmpdir()/moltbot-<uid>（可用时添加 uid 后缀）
 *
 * @param tmpdir - 获取临时目录的函数
 * @returns 网关锁目录路径
 */
export function resolveGatewayLockDir(tmpdir: () => string = os.tmpdir): string {
  const base = tmpdir();
  // 添加用户 ID 后缀以支持多用户环境
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  const suffix = uid != null ? `moltbot-${uid}` : "moltbot";
  return path.join(base, suffix);
}

/** OAuth 凭证文件名 */
const OAUTH_FILENAME = "oauth.json";

/**
 * 解析 OAuth 凭证存储目录
 *
 * 优先级：
 * - `CLAWDBOT_OAUTH_DIR`（显式覆盖）
 * - `$*_STATE_DIR/credentials`（规范服务器/默认）
 * - `~/.clawdbot/credentials`（旧版默认）
 *
 * @param env - 环境变量对象
 * @param stateDir - 状态目录路径
 * @returns OAuth 目录路径
 */
export function resolveOAuthDir(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, os.homedir),
): string {
  const override = env.CLAWDBOT_OAUTH_DIR?.trim();
  if (override) return resolveUserPath(override);
  return path.join(stateDir, "credentials");
}

/**
 * 解析 OAuth 凭证文件路径
 *
 * @param env - 环境变量对象
 * @param stateDir - 状态目录路径
 * @returns OAuth 文件完整路径
 */
export function resolveOAuthPath(
  env: NodeJS.ProcessEnv = process.env,
  stateDir: string = resolveStateDir(env, os.homedir),
): string {
  return path.join(resolveOAuthDir(env, stateDir), OAUTH_FILENAME);
}

/**
 * 解析网关端口
 *
 * 优先级：环境变量 → 配置文件 → 默认值
 *
 * @param cfg - Moltbot 配置对象
 * @param env - 环境变量对象
 * @returns 网关端口号
 */
export function resolveGatewayPort(
  cfg?: MoltbotConfig,
  env: NodeJS.ProcessEnv = process.env,
): number {
  // 环境变量优先
  const envRaw = env.CLAWDBOT_GATEWAY_PORT?.trim();
  if (envRaw) {
    const parsed = Number.parseInt(envRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  // 配置文件次之
  const configPort = cfg?.gateway?.port;
  if (typeof configPort === "number" && Number.isFinite(configPort)) {
    if (configPort > 0) return configPort;
  }
  // 默认端口
  return DEFAULT_GATEWAY_PORT;
}
