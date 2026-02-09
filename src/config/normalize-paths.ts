/**
 * 配置路径规范化模块
 *
 * 将配置中路径类字段的 `~` 前缀展开为用户主目录的绝对路径。
 * 仅处理键名匹配路径模式的字段（如 dir、path、file、root、workspace 等），
 * 保持其他字段不变。
 */
import { resolveUserPath } from "../utils.js";
import type { MoltbotConfig } from "./types.js";

const PATH_VALUE_RE = /^~(?=$|[\\/])/;

const PATH_KEY_RE = /(dir|path|paths|file|root|workspace)$/i;
const PATH_LIST_KEYS = new Set(["paths", "pathPrepend"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringValue(key: string | undefined, value: string): string {
  if (!PATH_VALUE_RE.test(value.trim())) return value;
  if (!key) return value;
  if (PATH_KEY_RE.test(key) || PATH_LIST_KEYS.has(key)) {
    return resolveUserPath(value);
  }
  return value;
}

function normalizeAny(key: string | undefined, value: unknown): unknown {
  if (typeof value === "string") return normalizeStringValue(key, value);

  if (Array.isArray(value)) {
    const normalizeChildren = Boolean(key && PATH_LIST_KEYS.has(key));
    return value.map((entry) => {
      if (typeof entry === "string") {
        return normalizeChildren ? normalizeStringValue(key, entry) : entry;
      }
      if (Array.isArray(entry)) return normalizeAny(undefined, entry);
      if (isPlainObject(entry)) return normalizeAny(undefined, entry);
      return entry;
    });
  }

  if (!isPlainObject(value)) return value;

  for (const [childKey, childValue] of Object.entries(value)) {
    const next = normalizeAny(childKey, childValue);
    if (next !== childValue) value[childKey] = next;
  }

  return value;
}

/**
 * 规范化配置中的 "~" 路径
 *
 * 递归遍历配置对象，将路径类字段中的 `~/...` 展开为绝对路径。
 * 直接修改传入的配置对象（就地修改）。
 */
export function normalizeConfigPaths(cfg: MoltbotConfig): MoltbotConfig {
  if (!cfg || typeof cfg !== "object") return cfg;
  normalizeAny(undefined, cfg);
  return cfg;
}
