/**
 * 认证配置存储模块
 *
 * 该模块负责管理认证配置的持久化存储，包括：
 * - 加载和保存认证配置存储文件
 * - 处理旧版认证格式的迁移
 * - 合并 OAuth 凭证文件
 * - 同步外部 CLI 工具的凭证
 * - 支持文件锁定以确保并发安全
 *
 * @module agents/auth-profiles/store
 */

import fs from "node:fs";
import type { OAuthCredentials } from "@mariozechner/pi-ai";
import lockfile from "proper-lockfile";
import { resolveOAuthPath } from "../../config/paths.js";
import { loadJsonFile, saveJsonFile } from "../../infra/json-file.js";
import { AUTH_STORE_LOCK_OPTIONS, AUTH_STORE_VERSION, log } from "./constants.js";
import { syncExternalCliCredentials } from "./external-cli-sync.js";
import { ensureAuthStoreFile, resolveAuthStorePath, resolveLegacyAuthStorePath } from "./paths.js";
import type { AuthProfileCredential, AuthProfileStore, ProfileUsageStats } from "./types.js";

/** 旧版认证存储格式类型 */
type LegacyAuthStore = Record<string, AuthProfileCredential>;

/**
 * 同步认证配置存储的内部字段
 * @param target - 目标存储对象
 * @param source - 源存储对象
 */
function _syncAuthProfileStore(target: AuthProfileStore, source: AuthProfileStore): void {
  target.version = source.version;
  target.profiles = source.profiles;
  target.order = source.order;
  target.lastGood = source.lastGood;
  target.usageStats = source.usageStats;
}

/**
 * 使用文件锁更新认证配置存储
 * 确保并发安全的存储更新操作
 *
 * @param params.agentDir - 代理目录路径（可选）
 * @param params.updater - 更新函数，返回 true 表示需要保存
 * @returns 更新后的存储对象，失败时返回 null
 */
export async function updateAuthProfileStoreWithLock(params: {
  agentDir?: string;
  updater: (store: AuthProfileStore) => boolean;
}): Promise<AuthProfileStore | null> {
  const authPath = resolveAuthStorePath(params.agentDir);
  ensureAuthStoreFile(authPath);

  let release: (() => Promise<void>) | undefined;
  try {
    release = await lockfile.lock(authPath, AUTH_STORE_LOCK_OPTIONS);
    const store = ensureAuthProfileStore(params.agentDir);
    const shouldSave = params.updater(store);
    if (shouldSave) {
      saveAuthProfileStore(store, params.agentDir);
    }
    return store;
  } catch {
    return null;
  } finally {
    if (release) {
      try {
        await release();
      } catch {
        // ignore unlock errors
      }
    }
  }
}

/**
 * 尝试将原始数据转换为旧版认证存储格式
 * @param raw - 原始 JSON 数据
 * @returns 旧版存储对象，无效时返回 null
 */
function coerceLegacyStore(raw: unknown): LegacyAuthStore | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if ("profiles" in record) return null;
  const entries: LegacyAuthStore = {};
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object") continue;
    const typed = value as Partial<AuthProfileCredential>;
    if (typed.type !== "api_key" && typed.type !== "oauth" && typed.type !== "token") {
      continue;
    }
    entries[key] = {
      ...typed,
      provider: String(typed.provider ?? key),
    } as AuthProfileCredential;
  }
  return Object.keys(entries).length > 0 ? entries : null;
}

/**
 * 尝试将原始数据转换为认证配置存储格式
 * @param raw - 原始 JSON 数据
 * @returns 存储对象，无效时返回 null
 */
function coerceAuthStore(raw: unknown): AuthProfileStore | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!record.profiles || typeof record.profiles !== "object") return null;
  const profiles = record.profiles as Record<string, unknown>;
  const normalized: Record<string, AuthProfileCredential> = {};
  for (const [key, value] of Object.entries(profiles)) {
    if (!value || typeof value !== "object") continue;
    const typed = value as Partial<AuthProfileCredential>;
    if (typed.type !== "api_key" && typed.type !== "oauth" && typed.type !== "token") {
      continue;
    }
    if (!typed.provider) continue;
    normalized[key] = typed as AuthProfileCredential;
  }
  const order =
    record.order && typeof record.order === "object"
      ? Object.entries(record.order as Record<string, unknown>).reduce(
          (acc, [provider, value]) => {
            if (!Array.isArray(value)) return acc;
            const list = value
              .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
              .filter(Boolean);
            if (list.length === 0) return acc;
            acc[provider] = list;
            return acc;
          },
          {} as Record<string, string[]>,
        )
      : undefined;
  return {
    version: Number(record.version ?? AUTH_STORE_VERSION),
    profiles: normalized,
    order,
    lastGood:
      record.lastGood && typeof record.lastGood === "object"
        ? (record.lastGood as Record<string, string>)
        : undefined,
    usageStats:
      record.usageStats && typeof record.usageStats === "object"
        ? (record.usageStats as Record<string, ProfileUsageStats>)
        : undefined,
  };
}

/**
 * 合并两个记录对象
 * @param base - 基础记录
 * @param override - 覆盖记录
 * @returns 合并后的记录，两者都为空时返回 undefined
 */
function mergeRecord<T>(
  base?: Record<string, T>,
  override?: Record<string, T>,
): Record<string, T> | undefined {
  if (!base && !override) return undefined;
  if (!base) return { ...override };
  if (!override) return { ...base };
  return { ...base, ...override };
}

/**
 * 合并两个认证配置存储
 * @param base - 基础存储
 * @param override - 覆盖存储
 * @returns 合并后的存储对象
 */
function mergeAuthProfileStores(
  base: AuthProfileStore,
  override: AuthProfileStore,
): AuthProfileStore {
  if (
    Object.keys(override.profiles).length === 0 &&
    !override.order &&
    !override.lastGood &&
    !override.usageStats
  ) {
    return base;
  }
  return {
    version: Math.max(base.version, override.version ?? base.version),
    profiles: { ...base.profiles, ...override.profiles },
    order: mergeRecord(base.order, override.order),
    lastGood: mergeRecord(base.lastGood, override.lastGood),
    usageStats: mergeRecord(base.usageStats, override.usageStats),
  };
}

/**
 * 将 OAuth 文件中的凭证合并到存储中
 * @param store - 目标存储对象
 * @returns 是否有新凭证被添加
 */
function mergeOAuthFileIntoStore(store: AuthProfileStore): boolean {
  const oauthPath = resolveOAuthPath();
  const oauthRaw = loadJsonFile(oauthPath);
  if (!oauthRaw || typeof oauthRaw !== "object") return false;
  const oauthEntries = oauthRaw as Record<string, OAuthCredentials>;
  let mutated = false;
  for (const [provider, creds] of Object.entries(oauthEntries)) {
    if (!creds || typeof creds !== "object") continue;
    const profileId = `${provider}:default`;
    if (store.profiles[profileId]) continue;
    store.profiles[profileId] = {
      type: "oauth",
      provider,
      ...creds,
    };
    mutated = true;
  }
  return mutated;
}

/**
 * 加载认证配置存储
 * 处理旧版格式迁移和外部 CLI 凭证同步
 *
 * @returns 认证配置存储对象
 */
export function loadAuthProfileStore(): AuthProfileStore {
  const authPath = resolveAuthStorePath();
  const raw = loadJsonFile(authPath);
  const asStore = coerceAuthStore(raw);
  if (asStore) {
    // Sync from external CLI tools on every load
    const synced = syncExternalCliCredentials(asStore);
    if (synced) {
      saveJsonFile(authPath, asStore);
    }
    return asStore;
  }

  const legacyRaw = loadJsonFile(resolveLegacyAuthStorePath());
  const legacy = coerceLegacyStore(legacyRaw);
  if (legacy) {
    const store: AuthProfileStore = {
      version: AUTH_STORE_VERSION,
      profiles: {},
    };
    for (const [provider, cred] of Object.entries(legacy)) {
      const profileId = `${provider}:default`;
      if (cred.type === "api_key") {
        store.profiles[profileId] = {
          type: "api_key",
          provider: String(cred.provider ?? provider),
          key: cred.key,
          ...(cred.email ? { email: cred.email } : {}),
        };
      } else if (cred.type === "token") {
        store.profiles[profileId] = {
          type: "token",
          provider: String(cred.provider ?? provider),
          token: cred.token,
          ...(typeof cred.expires === "number" ? { expires: cred.expires } : {}),
          ...(cred.email ? { email: cred.email } : {}),
        };
      } else {
        store.profiles[profileId] = {
          type: "oauth",
          provider: String(cred.provider ?? provider),
          access: cred.access,
          refresh: cred.refresh,
          expires: cred.expires,
          ...(cred.enterpriseUrl ? { enterpriseUrl: cred.enterpriseUrl } : {}),
          ...(cred.projectId ? { projectId: cred.projectId } : {}),
          ...(cred.accountId ? { accountId: cred.accountId } : {}),
          ...(cred.email ? { email: cred.email } : {}),
        };
      }
    }
    syncExternalCliCredentials(store);
    return store;
  }

  const store: AuthProfileStore = { version: AUTH_STORE_VERSION, profiles: {} };
  syncExternalCliCredentials(store);
  return store;
}

/**
 * 为特定代理加载认证配置存储
 * 支持从主代理继承认证配置
 *
 * @param agentDir - 代理目录路径（可选）
 * @param _options - 选项（如是否允许钥匙串提示）
 * @returns 认证配置存储对象
 */
function loadAuthProfileStoreForAgent(
  agentDir?: string,
  _options?: { allowKeychainPrompt?: boolean },
): AuthProfileStore {
  const authPath = resolveAuthStorePath(agentDir);
  const raw = loadJsonFile(authPath);
  const asStore = coerceAuthStore(raw);
  if (asStore) {
    // Sync from external CLI tools on every load
    const synced = syncExternalCliCredentials(asStore);
    if (synced) {
      saveJsonFile(authPath, asStore);
    }
    return asStore;
  }

  // Fallback: inherit auth-profiles from main agent if subagent has none
  if (agentDir) {
    const mainAuthPath = resolveAuthStorePath(); // without agentDir = main
    const mainRaw = loadJsonFile(mainAuthPath);
    const mainStore = coerceAuthStore(mainRaw);
    if (mainStore && Object.keys(mainStore.profiles).length > 0) {
      // Clone main store to subagent directory for auth inheritance
      saveJsonFile(authPath, mainStore);
      log.info("inherited auth-profiles from main agent", { agentDir });
      return mainStore;
    }
  }

  const legacyRaw = loadJsonFile(resolveLegacyAuthStorePath(agentDir));
  const legacy = coerceLegacyStore(legacyRaw);
  const store: AuthProfileStore = {
    version: AUTH_STORE_VERSION,
    profiles: {},
  };
  if (legacy) {
    for (const [provider, cred] of Object.entries(legacy)) {
      const profileId = `${provider}:default`;
      if (cred.type === "api_key") {
        store.profiles[profileId] = {
          type: "api_key",
          provider: String(cred.provider ?? provider),
          key: cred.key,
          ...(cred.email ? { email: cred.email } : {}),
        };
      } else if (cred.type === "token") {
        store.profiles[profileId] = {
          type: "token",
          provider: String(cred.provider ?? provider),
          token: cred.token,
          ...(typeof cred.expires === "number" ? { expires: cred.expires } : {}),
          ...(cred.email ? { email: cred.email } : {}),
        };
      } else {
        store.profiles[profileId] = {
          type: "oauth",
          provider: String(cred.provider ?? provider),
          access: cred.access,
          refresh: cred.refresh,
          expires: cred.expires,
          ...(cred.enterpriseUrl ? { enterpriseUrl: cred.enterpriseUrl } : {}),
          ...(cred.projectId ? { projectId: cred.projectId } : {}),
          ...(cred.accountId ? { accountId: cred.accountId } : {}),
          ...(cred.email ? { email: cred.email } : {}),
        };
      }
    }
  }

  const mergedOAuth = mergeOAuthFileIntoStore(store);
  const syncedCli = syncExternalCliCredentials(store);
  const shouldWrite = legacy !== null || mergedOAuth || syncedCli;
  if (shouldWrite) {
    saveJsonFile(authPath, store);
  }

  // PR #368: legacy auth.json could get re-migrated from other agent dirs,
  // overwriting fresh OAuth creds with stale tokens (fixes #363). Delete only
  // after we've successfully written auth-profiles.json.
  if (shouldWrite && legacy !== null) {
    const legacyPath = resolveLegacyAuthStorePath(agentDir);
    try {
      fs.unlinkSync(legacyPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
        log.warn("failed to delete legacy auth.json after migration", {
          err,
          legacyPath,
        });
      }
    }
  }

  return store;
}

/**
 * 确保认证配置存储存在并已加载
 * 对于子代理，会合并主代理的认证配置
 *
 * @param agentDir - 代理目录路径（可选）
 * @param options - 选项（如是否允许钥匙串提示）
 * @returns 认证配置存储对象
 */
export function ensureAuthProfileStore(
  agentDir?: string,
  options?: { allowKeychainPrompt?: boolean },
): AuthProfileStore {
  const store = loadAuthProfileStoreForAgent(agentDir, options);
  const authPath = resolveAuthStorePath(agentDir);
  const mainAuthPath = resolveAuthStorePath();
  if (!agentDir || authPath === mainAuthPath) {
    return store;
  }

  const mainStore = loadAuthProfileStoreForAgent(undefined, options);
  const merged = mergeAuthProfileStores(mainStore, store);

  return merged;
}

/**
 * 保存认证配置存储到文件
 *
 * @param store - 要保存的存储对象
 * @param agentDir - 代理目录路径（可选）
 */
export function saveAuthProfileStore(store: AuthProfileStore, agentDir?: string): void {
  const authPath = resolveAuthStorePath(agentDir);
  const payload = {
    version: AUTH_STORE_VERSION,
    profiles: store.profiles,
    order: store.order ?? undefined,
    lastGood: store.lastGood ?? undefined,
    usageStats: store.usageStats ?? undefined,
  } satisfies AuthProfileStore;
  saveJsonFile(authPath, payload);
}
