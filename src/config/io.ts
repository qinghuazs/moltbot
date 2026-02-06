/**
 * 配置文件 I/O 模块
 *
 * 负责 Moltbot 配置文件的读取、解析、验证和写入。
 * 核心功能：
 * - 从 JSON5 配置文件加载配置（支持 $include 指令和 ${VAR} 环境变量替换）
 * - 配置验证（schema 校验 + 遗留配置检测 + 重复代理目录检测）
 * - 应用各类默认值（模型、代理、会话、日志等）
 * - 配置写入（原子写入 + 自动备份轮转）
 * - 配置缓存（可配置 TTL，避免频繁磁盘读取）
 * - Shell 环境变量回退加载（从用户 shell 配置中提取 API 密钥等）
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import JSON5 from "json5";

import {
  loadShellEnvFallback,
  resolveShellEnvFallbackTimeoutMs,
  shouldDeferShellEnvFallback,
  shouldEnableShellEnvFallback,
} from "../infra/shell-env.js";
import { DuplicateAgentDirError, findDuplicateAgentDirs } from "./agent-dirs.js";
import {
  applyCompactionDefaults,
  applyContextPruningDefaults,
  applyAgentDefaults,
  applyLoggingDefaults,
  applyMessageDefaults,
  applyModelDefaults,
  applySessionDefaults,
  applyTalkApiKey,
} from "./defaults.js";
import { VERSION } from "../version.js";
import { MissingEnvVarError, resolveConfigEnvVars } from "./env-substitution.js";
import { collectConfigEnvVars } from "./env-vars.js";
import { ConfigIncludeError, resolveConfigIncludes } from "./includes.js";
import { findLegacyConfigIssues } from "./legacy.js";
import { normalizeConfigPaths } from "./normalize-paths.js";
import { resolveConfigPath, resolveDefaultConfigCandidates, resolveStateDir } from "./paths.js";
import { applyConfigOverrides } from "./runtime-overrides.js";
import type { MoltbotConfig, ConfigFileSnapshot, LegacyConfigIssue } from "./types.js";
import { validateConfigObjectWithPlugins } from "./validation.js";
import { compareMoltbotVersions } from "./version.js";

// Re-export for backwards compatibility
export { CircularIncludeError, ConfigIncludeError } from "./includes.js";
export { MissingEnvVarError } from "./env-substitution.js";

/** Shell 环境变量回退加载时期望检查的 API 密钥列表 */
const SHELL_ENV_EXPECTED_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_OAUTH_TOKEN",
  "GEMINI_API_KEY",
  "ZAI_API_KEY",
  "OPENROUTER_API_KEY",
  "AI_GATEWAY_API_KEY",
  "MINIMAX_API_KEY",
  "SYNTHETIC_API_KEY",
  "ELEVENLABS_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "DISCORD_BOT_TOKEN",
  "SLACK_BOT_TOKEN",
  "SLACK_APP_TOKEN",
  "CLAWDBOT_GATEWAY_TOKEN",
  "CLAWDBOT_GATEWAY_PASSWORD",
];

/** 配置备份保留数量 */
const CONFIG_BACKUP_COUNT = 5;
const loggedInvalidConfigs = new Set<string>();

export type ParseConfigJson5Result = { ok: true; parsed: unknown } | { ok: false; error: string };

function hashConfigRaw(raw: string | null): string {
  return crypto
    .createHash("sha256")
    .update(raw ?? "")
    .digest("hex");
}

export function resolveConfigSnapshotHash(snapshot: {
  hash?: string;
  raw?: string | null;
}): string | null {
  if (typeof snapshot.hash === "string") {
    const trimmed = snapshot.hash.trim();
    if (trimmed) return trimmed;
  }
  if (typeof snapshot.raw !== "string") return null;
  return hashConfigRaw(snapshot.raw);
}

function coerceConfig(value: unknown): MoltbotConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as MoltbotConfig;
}

async function rotateConfigBackups(configPath: string, ioFs: typeof fs.promises): Promise<void> {
  if (CONFIG_BACKUP_COUNT <= 1) return;
  const backupBase = `${configPath}.bak`;
  const maxIndex = CONFIG_BACKUP_COUNT - 1;
  await ioFs.unlink(`${backupBase}.${maxIndex}`).catch(() => {
    // best-effort
  });
  for (let index = maxIndex - 1; index >= 1; index -= 1) {
    await ioFs.rename(`${backupBase}.${index}`, `${backupBase}.${index + 1}`).catch(() => {
      // best-effort
    });
  }
  await ioFs.rename(backupBase, `${backupBase}.1`).catch(() => {
    // best-effort
  });
}

/** 配置 I/O 依赖注入接口（用于测试和自定义） */
export type ConfigIoDeps = {
  fs?: typeof fs;
  json5?: typeof JSON5;
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
  configPath?: string;
  logger?: Pick<typeof console, "error" | "warn">;
};

function warnOnConfigMiskeys(raw: unknown, logger: Pick<typeof console, "warn">): void {
  if (!raw || typeof raw !== "object") return;
  const gateway = (raw as Record<string, unknown>).gateway;
  if (!gateway || typeof gateway !== "object") return;
  if ("token" in (gateway as Record<string, unknown>)) {
    logger.warn(
      'Config uses "gateway.token". This key is ignored; use "gateway.auth.token" instead.',
    );
  }
}

function stampConfigVersion(cfg: MoltbotConfig): MoltbotConfig {
  const now = new Date().toISOString();
  return {
    ...cfg,
    meta: {
      ...cfg.meta,
      lastTouchedVersion: VERSION,
      lastTouchedAt: now,
    },
  };
}

function warnIfConfigFromFuture(cfg: MoltbotConfig, logger: Pick<typeof console, "warn">): void {
  const touched = cfg.meta?.lastTouchedVersion;
  if (!touched) return;
  const cmp = compareMoltbotVersions(VERSION, touched);
  if (cmp === null) return;
  if (cmp < 0) {
    logger.warn(
      `Config was last written by a newer Moltbot (${touched}); current version is ${VERSION}.`,
    );
  }
}

function applyConfigEnv(cfg: MoltbotConfig, env: NodeJS.ProcessEnv): void {
  const entries = collectConfigEnvVars(cfg);
  for (const [key, value] of Object.entries(entries)) {
    if (env[key]?.trim()) continue;
    env[key] = value;
  }
}

function resolveConfigPathForDeps(deps: Required<ConfigIoDeps>): string {
  if (deps.configPath) return deps.configPath;
  return resolveConfigPath(deps.env, resolveStateDir(deps.env, deps.homedir));
}

function normalizeDeps(overrides: ConfigIoDeps = {}): Required<ConfigIoDeps> {
  return {
    fs: overrides.fs ?? fs,
    json5: overrides.json5 ?? JSON5,
    env: overrides.env ?? process.env,
    homedir: overrides.homedir ?? os.homedir,
    configPath: overrides.configPath ?? "",
    logger: overrides.logger ?? console,
  };
}

/** 解析 JSON5 配置字符串 */
export function parseConfigJson5(
  raw: string,
  json5: { parse: (value: string) => unknown } = JSON5,
): ParseConfigJson5Result {
  try {
    return { ok: true, parsed: json5.parse(raw) as unknown };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * 创建配置 I/O 实例
 *
 * 返回包含 loadConfig、readConfigFileSnapshot、writeConfigFile 方法的对象。
 * 支持依赖注入以便测试。
 *
 * 配置加载流程：
 * 1. 读取 JSON5 文件
 * 2. 解析 $include 指令
 * 3. 注入 config.env 到 process.env
 * 4. 替换 ${VAR} 环境变量引用
 * 5. Schema 验证
 * 6. 应用各类默认值
 * 7. 路径规范化
 * 8. Shell 环境变量回退加载
 */
export function createConfigIO(overrides: ConfigIoDeps = {}) {
  const deps = normalizeDeps(overrides);
  const requestedConfigPath = resolveConfigPathForDeps(deps);
  const candidatePaths = deps.configPath
    ? [requestedConfigPath]
    : resolveDefaultConfigCandidates(deps.env, deps.homedir);
  const configPath =
    candidatePaths.find((candidate) => deps.fs.existsSync(candidate)) ?? requestedConfigPath;

  function loadConfig(): MoltbotConfig {
    try {
      if (!deps.fs.existsSync(configPath)) {
        if (shouldEnableShellEnvFallback(deps.env) && !shouldDeferShellEnvFallback(deps.env)) {
          loadShellEnvFallback({
            enabled: true,
            env: deps.env,
            expectedKeys: SHELL_ENV_EXPECTED_KEYS,
            logger: deps.logger,
            timeoutMs: resolveShellEnvFallbackTimeoutMs(deps.env),
          });
        }
        return {};
      }
      const raw = deps.fs.readFileSync(configPath, "utf-8");
      const parsed = deps.json5.parse(raw);

      // Resolve $include directives before validation
      const resolved = resolveConfigIncludes(parsed, configPath, {
        readFile: (p) => deps.fs.readFileSync(p, "utf-8"),
        parseJson: (raw) => deps.json5.parse(raw),
      });

      // Apply config.env to process.env BEFORE substitution so ${VAR} can reference config-defined vars
      if (resolved && typeof resolved === "object" && "env" in resolved) {
        applyConfigEnv(resolved as MoltbotConfig, deps.env);
      }

      // Substitute ${VAR} env var references
      const substituted = resolveConfigEnvVars(resolved, deps.env);

      const resolvedConfig = substituted;
      warnOnConfigMiskeys(resolvedConfig, deps.logger);
      if (typeof resolvedConfig !== "object" || resolvedConfig === null) return {};
      const preValidationDuplicates = findDuplicateAgentDirs(resolvedConfig as MoltbotConfig, {
        env: deps.env,
        homedir: deps.homedir,
      });
      if (preValidationDuplicates.length > 0) {
        throw new DuplicateAgentDirError(preValidationDuplicates);
      }
      const validated = validateConfigObjectWithPlugins(resolvedConfig);
      if (!validated.ok) {
        const details = validated.issues
          .map((iss) => `- ${iss.path || "<root>"}: ${iss.message}`)
          .join("\n");
        if (!loggedInvalidConfigs.has(configPath)) {
          loggedInvalidConfigs.add(configPath);
          deps.logger.error(`Invalid config at ${configPath}:\\n${details}`);
        }
        const error = new Error("Invalid config");
        (error as { code?: string; details?: string }).code = "INVALID_CONFIG";
        (error as { code?: string; details?: string }).details = details;
        throw error;
      }
      if (validated.warnings.length > 0) {
        const details = validated.warnings
          .map((iss) => `- ${iss.path || "<root>"}: ${iss.message}`)
          .join("\n");
        deps.logger.warn(`Config warnings:\\n${details}`);
      }
      warnIfConfigFromFuture(validated.config, deps.logger);
      const cfg = applyModelDefaults(
        applyCompactionDefaults(
          applyContextPruningDefaults(
            applyAgentDefaults(
              applySessionDefaults(applyLoggingDefaults(applyMessageDefaults(validated.config))),
            ),
          ),
        ),
      );
      normalizeConfigPaths(cfg);

      const duplicates = findDuplicateAgentDirs(cfg, {
        env: deps.env,
        homedir: deps.homedir,
      });
      if (duplicates.length > 0) {
        throw new DuplicateAgentDirError(duplicates);
      }

      applyConfigEnv(cfg, deps.env);

      const enabled = shouldEnableShellEnvFallback(deps.env) || cfg.env?.shellEnv?.enabled === true;
      if (enabled && !shouldDeferShellEnvFallback(deps.env)) {
        loadShellEnvFallback({
          enabled: true,
          env: deps.env,
          expectedKeys: SHELL_ENV_EXPECTED_KEYS,
          logger: deps.logger,
          timeoutMs: cfg.env?.shellEnv?.timeoutMs ?? resolveShellEnvFallbackTimeoutMs(deps.env),
        });
      }

      return applyConfigOverrides(cfg);
    } catch (err) {
      if (err instanceof DuplicateAgentDirError) {
        deps.logger.error(err.message);
        throw err;
      }
      const error = err as { code?: string };
      if (error?.code === "INVALID_CONFIG") {
        return {};
      }
      deps.logger.error(`Failed to read config at ${configPath}`, err);
      return {};
    }
  }

  async function readConfigFileSnapshot(): Promise<ConfigFileSnapshot> {
    const exists = deps.fs.existsSync(configPath);
    if (!exists) {
      const hash = hashConfigRaw(null);
      const config = applyTalkApiKey(
        applyModelDefaults(
          applyCompactionDefaults(
            applyContextPruningDefaults(
              applyAgentDefaults(applySessionDefaults(applyMessageDefaults({}))),
            ),
          ),
        ),
      );
      const legacyIssues: LegacyConfigIssue[] = [];
      return {
        path: configPath,
        exists: false,
        raw: null,
        parsed: {},
        valid: true,
        config,
        hash,
        issues: [],
        warnings: [],
        legacyIssues,
      };
    }

    try {
      const raw = deps.fs.readFileSync(configPath, "utf-8");
      const hash = hashConfigRaw(raw);
      const parsedRes = parseConfigJson5(raw, deps.json5);
      if (!parsedRes.ok) {
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: {},
          valid: false,
          config: {},
          hash,
          issues: [{ path: "", message: `JSON5 parse failed: ${parsedRes.error}` }],
          warnings: [],
          legacyIssues: [],
        };
      }

      // Resolve $include directives
      let resolved: unknown;
      try {
        resolved = resolveConfigIncludes(parsedRes.parsed, configPath, {
          readFile: (p) => deps.fs.readFileSync(p, "utf-8"),
          parseJson: (raw) => deps.json5.parse(raw),
        });
      } catch (err) {
        const message =
          err instanceof ConfigIncludeError
            ? err.message
            : `Include resolution failed: ${String(err)}`;
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          valid: false,
          config: coerceConfig(parsedRes.parsed),
          hash,
          issues: [{ path: "", message }],
          warnings: [],
          legacyIssues: [],
        };
      }

      // Apply config.env to process.env BEFORE substitution so ${VAR} can reference config-defined vars
      if (resolved && typeof resolved === "object" && "env" in resolved) {
        applyConfigEnv(resolved as MoltbotConfig, deps.env);
      }

      // Substitute ${VAR} env var references
      let substituted: unknown;
      try {
        substituted = resolveConfigEnvVars(resolved, deps.env);
      } catch (err) {
        const message =
          err instanceof MissingEnvVarError
            ? err.message
            : `Env var substitution failed: ${String(err)}`;
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          valid: false,
          config: coerceConfig(resolved),
          hash,
          issues: [{ path: "", message }],
          warnings: [],
          legacyIssues: [],
        };
      }

      const resolvedConfigRaw = substituted;
      const legacyIssues = findLegacyConfigIssues(resolvedConfigRaw);

      const validated = validateConfigObjectWithPlugins(resolvedConfigRaw);
      if (!validated.ok) {
        return {
          path: configPath,
          exists: true,
          raw,
          parsed: parsedRes.parsed,
          valid: false,
          config: coerceConfig(resolvedConfigRaw),
          hash,
          issues: validated.issues,
          warnings: validated.warnings,
          legacyIssues,
        };
      }

      warnIfConfigFromFuture(validated.config, deps.logger);
      return {
        path: configPath,
        exists: true,
        raw,
        parsed: parsedRes.parsed,
        valid: true,
        config: normalizeConfigPaths(
          applyTalkApiKey(
            applyModelDefaults(
              applyAgentDefaults(
                applySessionDefaults(applyLoggingDefaults(applyMessageDefaults(validated.config))),
              ),
            ),
          ),
        ),
        hash,
        issues: [],
        warnings: validated.warnings,
        legacyIssues,
      };
    } catch (err) {
      return {
        path: configPath,
        exists: true,
        raw: null,
        parsed: {},
        valid: false,
        config: {},
        hash: hashConfigRaw(null),
        issues: [{ path: "", message: `read failed: ${String(err)}` }],
        warnings: [],
        legacyIssues: [],
      };
    }
  }

  async function writeConfigFile(cfg: MoltbotConfig) {
    clearConfigCache();
    const validated = validateConfigObjectWithPlugins(cfg);
    if (!validated.ok) {
      const issue = validated.issues[0];
      const pathLabel = issue?.path ? issue.path : "<root>";
      throw new Error(`Config validation failed: ${pathLabel}: ${issue?.message ?? "invalid"}`);
    }
    if (validated.warnings.length > 0) {
      const details = validated.warnings
        .map((warning) => `- ${warning.path}: ${warning.message}`)
        .join("\n");
      deps.logger.warn(`Config warnings:\n${details}`);
    }
    const dir = path.dirname(configPath);
    await deps.fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    const json = JSON.stringify(applyModelDefaults(stampConfigVersion(cfg)), null, 2)
      .trimEnd()
      .concat("\n");

    const tmp = path.join(
      dir,
      `${path.basename(configPath)}.${process.pid}.${crypto.randomUUID()}.tmp`,
    );

    await deps.fs.promises.writeFile(tmp, json, {
      encoding: "utf-8",
      mode: 0o600,
    });

    if (deps.fs.existsSync(configPath)) {
      await rotateConfigBackups(configPath, deps.fs.promises);
      await deps.fs.promises.copyFile(configPath, `${configPath}.bak`).catch(() => {
        // best-effort
      });
    }

    try {
      await deps.fs.promises.rename(tmp, configPath);
    } catch (err) {
      const code = (err as { code?: string }).code;
      // Windows doesn't reliably support atomic replace via rename when dest exists.
      if (code === "EPERM" || code === "EEXIST") {
        await deps.fs.promises.copyFile(tmp, configPath);
        await deps.fs.promises.chmod(configPath, 0o600).catch(() => {
          // best-effort
        });
        await deps.fs.promises.unlink(tmp).catch(() => {
          // best-effort
        });
        return;
      }
      await deps.fs.promises.unlink(tmp).catch(() => {
        // best-effort
      });
      throw err;
    }
  }

  return {
    configPath,
    loadConfig,
    readConfigFileSnapshot,
    writeConfigFile,
  };
}

// NOTE: These wrappers intentionally do *not* cache the resolved config path at
// module scope. `CLAWDBOT_CONFIG_PATH` (and friends) are expected to work even
// when set after the module has been imported (tests, one-off scripts, etc.).
const DEFAULT_CONFIG_CACHE_MS = 200;
let configCache: {
  configPath: string;
  expiresAt: number;
  config: MoltbotConfig;
} | null = null;

function resolveConfigCacheMs(env: NodeJS.ProcessEnv): number {
  const raw = env.CLAWDBOT_CONFIG_CACHE_MS?.trim();
  if (raw === "" || raw === "0") return 0;
  if (!raw) return DEFAULT_CONFIG_CACHE_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_CONFIG_CACHE_MS;
  return Math.max(0, parsed);
}

function shouldUseConfigCache(env: NodeJS.ProcessEnv): boolean {
  if (env.CLAWDBOT_DISABLE_CONFIG_CACHE?.trim()) return false;
  return resolveConfigCacheMs(env) > 0;
}

function clearConfigCache(): void {
  configCache = null;
}

/** 加载配置（带缓存，默认 200ms TTL） */
export function loadConfig(): MoltbotConfig {
  const io = createConfigIO();
  const configPath = io.configPath;
  const now = Date.now();
  if (shouldUseConfigCache(process.env)) {
    const cached = configCache;
    if (cached && cached.configPath === configPath && cached.expiresAt > now) {
      return cached.config;
    }
  }
  const config = io.loadConfig();
  if (shouldUseConfigCache(process.env)) {
    const cacheMs = resolveConfigCacheMs(process.env);
    if (cacheMs > 0) {
      configCache = {
        configPath,
        expiresAt: now + cacheMs,
        config,
      };
    }
  }
  return config;
}

/** 读取配置文件快照（包含原始内容、解析结果、验证状态和哈希） */
export async function readConfigFileSnapshot(): Promise<ConfigFileSnapshot> {
  return await createConfigIO().readConfigFileSnapshot();
}

/** 写入配置文件（验证 + 原子写入 + 备份轮转） */
export async function writeConfigFile(cfg: MoltbotConfig): Promise<void> {
  clearConfigCache();
  await createConfigIO().writeConfigFile(cfg);
}
