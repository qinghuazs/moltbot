/**
 * 配置路径操作模块
 *
 * 提供配置对象中点分隔路径（如 "foo.bar.baz"）的解析、读取、设置和删除操作。
 * 用于 CLI 的 `moltbot config set/get/unset` 命令。
 * 内置原型链污染防护（阻止 __proto__、prototype、constructor 等危险键）。
 */

/** 路径节点类型 */
type PathNode = Record<string, unknown>;

/** 被阻止的危险键名集合（防止原型链污染） */
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * 解析点分隔的配置路径字符串
 *
 * @param raw - 原始路径字符串（如 "gateway.auth.token"）
 * @returns 解析结果，包含路径数组或错误信息
 */
export function parseConfigPath(raw: string): {
  ok: boolean;
  path?: string[];
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Invalid path. Use dot notation (e.g. foo.bar).",
    };
  }
  const parts = trimmed.split(".").map((part) => part.trim());
  if (parts.some((part) => !part)) {
    return {
      ok: false,
      error: "Invalid path. Use dot notation (e.g. foo.bar).",
    };
  }
  if (parts.some((part) => BLOCKED_KEYS.has(part))) {
    return { ok: false, error: "Invalid path segment." };
  }
  return { ok: true, path: parts };
}

/**
 * 在配置对象中按路径设置值
 *
 * 沿路径逐层创建中间对象（如不存在），最终在叶节点设置目标值。
 *
 * @param root - 配置根对象
 * @param path - 路径数组（如 ["gateway", "auth", "token"]）
 * @param value - 要设置的值
 */
export function setConfigValueAtPath(root: PathNode, path: string[], value: unknown): void {
  let cursor: PathNode = root;
  for (let idx = 0; idx < path.length - 1; idx += 1) {
    const key = path[idx];
    const next = cursor[key];
    if (!isPlainObject(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as PathNode;
  }
  cursor[path[path.length - 1]] = value;
}

/**
 * 在配置对象中按路径删除值
 *
 * 删除叶节点后，自动清理空的父级对象（从叶向根回溯）。
 *
 * @param root - 配置根对象
 * @param path - 路径数组
 * @returns 是否成功删除（路径不存在时返回 false）
 */
export function unsetConfigValueAtPath(root: PathNode, path: string[]): boolean {
  const stack: Array<{ node: PathNode; key: string }> = [];
  let cursor: PathNode = root;
  for (let idx = 0; idx < path.length - 1; idx += 1) {
    const key = path[idx];
    const next = cursor[key];
    if (!isPlainObject(next)) return false;
    stack.push({ node: cursor, key });
    cursor = next;
  }
  const leafKey = path[path.length - 1];
  if (!(leafKey in cursor)) return false;
  delete cursor[leafKey];
  for (let idx = stack.length - 1; idx >= 0; idx -= 1) {
    const { node, key } = stack[idx];
    const child = node[key];
    if (isPlainObject(child) && Object.keys(child).length === 0) {
      delete node[key];
    } else {
      break;
    }
  }
  return true;
}

/**
 * 在配置对象中按路径读取值
 *
 * @param root - 配置根对象
 * @param path - 路径数组
 * @returns 路径对应的值，路径不存在时返回 undefined
 */
export function getConfigValueAtPath(root: PathNode, path: string[]): unknown {
  let cursor: unknown = root;
  for (const key of path) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}
