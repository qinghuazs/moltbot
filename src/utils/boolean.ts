/**
 * 布尔值解析模块
 * 提供字符串到布尔值的灵活解析功能
 */

/** 布尔值解析选项 */
export type BooleanParseOptions = {
  /** 真值字符串列表 */
  truthy?: string[];
  /** 假值字符串列表 */
  falsy?: string[];
};

/** 默认真值列表 */
const DEFAULT_TRUTHY = ["true", "1", "yes", "on"] as const;
/** 默认假值列表 */
const DEFAULT_FALSY = ["false", "0", "no", "off"] as const;
/** 默认真值集合（用于快速查找） */
const DEFAULT_TRUTHY_SET = new Set<string>(DEFAULT_TRUTHY);
/** 默认假值集合（用于快速查找） */
const DEFAULT_FALSY_SET = new Set<string>(DEFAULT_FALSY);

/**
 * 解析布尔值
 * 支持字符串和布尔类型输入，可自定义真值/假值列表
 * @param value - 输入值
 * @param options - 解析选项
 * @returns 布尔值，无法解析返回 undefined
 */
export function parseBooleanValue(
  value: unknown,
  options: BooleanParseOptions = {},
): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  const truthy = options.truthy ?? DEFAULT_TRUTHY;
  const falsy = options.falsy ?? DEFAULT_FALSY;
  const truthySet = truthy === DEFAULT_TRUTHY ? DEFAULT_TRUTHY_SET : new Set(truthy);
  const falsySet = falsy === DEFAULT_FALSY ? DEFAULT_FALSY_SET : new Set(falsy);
  if (truthySet.has(normalized)) return true;
  if (falsySet.has(normalized)) return false;
  return undefined;
}
