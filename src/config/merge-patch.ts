/**
 * JSON Merge Patch (RFC 7396) 实现模块
 *
 * 提供 JSON Merge Patch 语义的深度合并函数，支持：
 * - 对象的递归合并
 * - null 值表示删除字段
 * - 非对象补丁直接替换
 */
type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function applyMergePatch(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(patch)) {
    return patch;
  }

  const result: PlainObject = isPlainObject(base) ? { ...base } : {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
      continue;
    }
    if (isPlainObject(value)) {
      const baseValue = result[key];
      result[key] = applyMergePatch(isPlainObject(baseValue) ? baseValue : {}, value);
      continue;
    }
    result[key] = value;
  }

  return result;
}
