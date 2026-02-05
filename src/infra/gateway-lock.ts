/**
 * 网关进程锁模块
 *
 * 提供网关进程的互斥锁机制，确保同一配置只有一个网关实例运行。
 * 支持：
 * - 基于文件的进程锁
 * - 进程存活检测
 * - 过期锁自动清理
 * - Linux 平台的进程启动时间验证
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

import { resolveConfigPath, resolveGatewayLockDir, resolveStateDir } from "../config/paths.js";

/** 默认锁获取超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 5000;
/** 默认轮询间隔（毫秒） */
const DEFAULT_POLL_INTERVAL_MS = 100;
/** 默认过期时间（毫秒） */
const DEFAULT_STALE_MS = 30_000;

/**
 * 锁文件内容
 */
type LockPayload = {
  /** 持有锁的进程 ID */
  pid: number;
  /** 锁创建时间 */
  createdAt: string;
  /** 配置文件路径 */
  configPath: string;
  /** 进程启动时间（Linux 平台） */
  startTime?: number;
};

/**
 * 网关锁句柄
 */
export type GatewayLockHandle = {
  /** 锁文件路径 */
  lockPath: string;
  /** 配置文件路径 */
  configPath: string;
  /** 释放锁 */
  release: () => Promise<void>;
};

/**
 * 网关锁选项
 */
export type GatewayLockOptions = {
  /** 环境变量 */
  env?: NodeJS.ProcessEnv;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
  /** 轮询间隔（毫秒） */
  pollIntervalMs?: number;
  /** 过期时间（毫秒） */
  staleMs?: number;
  /** 是否在测试中允许锁 */
  allowInTests?: boolean;
  /** 平台 */
  platform?: NodeJS.Platform;
};

/**
 * 网关锁错误
 */
export class GatewayLockError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GatewayLockError";
  }
}

/** 锁持有者状态 */
type LockOwnerStatus = "alive" | "dead" | "unknown";

/**
 * 检查进程是否存活
 */
function isAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function normalizeProcArg(arg: string): string {
  return arg.replaceAll("\\", "/").toLowerCase();
}

function parseProcCmdline(raw: string): string[] {
  return raw
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isGatewayArgv(args: string[]): boolean {
  const normalized = args.map(normalizeProcArg);
  if (!normalized.includes("gateway")) return false;

  const entryCandidates = [
    "dist/index.js",
    "dist/index.mjs",
    "dist/entry.js",
    "moltbot.mjs",
    "dist/entry.mjs",
    "scripts/run-node.mjs",
    "src/index.ts",
  ];
  if (normalized.some((arg) => entryCandidates.some((entry) => arg.endsWith(entry)))) {
    return true;
  }

  const exe = normalized[0] ?? "";
  return exe.endsWith("/moltbot") || exe === "moltbot";
}

function readLinuxCmdline(pid: number): string[] | null {
  try {
    const raw = fsSync.readFileSync(`/proc/${pid}/cmdline`, "utf8");
    return parseProcCmdline(raw);
  } catch {
    return null;
  }
}

function readLinuxStartTime(pid: number): number | null {
  try {
    const raw = fsSync.readFileSync(`/proc/${pid}/stat`, "utf8").trim();
    const closeParen = raw.lastIndexOf(")");
    if (closeParen < 0) return null;
    const rest = raw.slice(closeParen + 1).trim();
    const fields = rest.split(/\s+/);
    const startTime = Number.parseInt(fields[19] ?? "", 10);
    return Number.isFinite(startTime) ? startTime : null;
  } catch {
    return null;
  }
}

function resolveGatewayOwnerStatus(
  pid: number,
  payload: LockPayload | null,
  platform: NodeJS.Platform,
): LockOwnerStatus {
  if (!isAlive(pid)) return "dead";
  if (platform !== "linux") return "alive";

  const payloadStartTime = payload?.startTime;
  if (Number.isFinite(payloadStartTime)) {
    const currentStartTime = readLinuxStartTime(pid);
    if (currentStartTime == null) return "unknown";
    return currentStartTime === payloadStartTime ? "alive" : "dead";
  }

  const args = readLinuxCmdline(pid);
  if (!args) return "unknown";
  return isGatewayArgv(args) ? "alive" : "dead";
}

async function readLockPayload(lockPath: string): Promise<LockPayload | null> {
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockPayload>;
    if (typeof parsed.pid !== "number") return null;
    if (typeof parsed.createdAt !== "string") return null;
    if (typeof parsed.configPath !== "string") return null;
    const startTime = typeof parsed.startTime === "number" ? parsed.startTime : undefined;
    return {
      pid: parsed.pid,
      createdAt: parsed.createdAt,
      configPath: parsed.configPath,
      startTime,
    };
  } catch {
    return null;
  }
}

function resolveGatewayLockPath(env: NodeJS.ProcessEnv) {
  const stateDir = resolveStateDir(env);
  const configPath = resolveConfigPath(env, stateDir);
  const hash = createHash("sha1").update(configPath).digest("hex").slice(0, 8);
  const lockDir = resolveGatewayLockDir();
  const lockPath = path.join(lockDir, `gateway.${hash}.lock`);
  return { lockPath, configPath };
}

/**
 * 获取网关进程锁
 *
 * 尝试获取网关进程锁，确保同一配置只有一个网关实例运行。
 * 如果锁已被占用，会等待直到超时或锁被释放。
 *
 * @param opts - 锁选项
 * @returns 锁句柄，或 null（在测试环境或禁用锁时）
 * @throws GatewayLockError 如果获取锁超时
 */
export async function acquireGatewayLock(
  opts: GatewayLockOptions = {},
): Promise<GatewayLockHandle | null> {
  const env = opts.env ?? process.env;
  const allowInTests = opts.allowInTests === true;
  if (
    env.CLAWDBOT_ALLOW_MULTI_GATEWAY === "1" ||
    (!allowInTests && (env.VITEST || env.NODE_ENV === "test"))
  ) {
    return null;
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const platform = opts.platform ?? process.platform;
  const { lockPath, configPath } = resolveGatewayLockPath(env);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  const startedAt = Date.now();
  let lastPayload: LockPayload | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const handle = await fs.open(lockPath, "wx");
      const startTime = platform === "linux" ? readLinuxStartTime(process.pid) : null;
      const payload: LockPayload = {
        pid: process.pid,
        createdAt: new Date().toISOString(),
        configPath,
      };
      if (typeof startTime === "number" && Number.isFinite(startTime)) {
        payload.startTime = startTime;
      }
      await handle.writeFile(JSON.stringify(payload), "utf8");
      return {
        lockPath,
        configPath,
        release: async () => {
          await handle.close().catch(() => undefined);
          await fs.rm(lockPath, { force: true });
        },
      };
    } catch (err) {
      const code = (err as { code?: unknown }).code;
      if (code !== "EEXIST") {
        throw new GatewayLockError(`failed to acquire gateway lock at ${lockPath}`, err);
      }

      lastPayload = await readLockPayload(lockPath);
      const ownerPid = lastPayload?.pid;
      const ownerStatus = ownerPid
        ? resolveGatewayOwnerStatus(ownerPid, lastPayload, platform)
        : "unknown";
      if (ownerStatus === "dead" && ownerPid) {
        await fs.rm(lockPath, { force: true });
        continue;
      }
      if (ownerStatus !== "alive") {
        let stale = false;
        if (lastPayload?.createdAt) {
          const createdAt = Date.parse(lastPayload.createdAt);
          stale = Number.isFinite(createdAt) ? Date.now() - createdAt > staleMs : false;
        }
        if (!stale) {
          try {
            const st = await fs.stat(lockPath);
            stale = Date.now() - st.mtimeMs > staleMs;
          } catch {
            stale = true;
          }
        }
        if (stale) {
          await fs.rm(lockPath, { force: true });
          continue;
        }
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  const owner = lastPayload?.pid ? ` (pid ${lastPayload.pid})` : "";
  throw new GatewayLockError(`gateway already running${owner}; lock timeout after ${timeoutMs}ms`);
}
