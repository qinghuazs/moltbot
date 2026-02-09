/**
 * 配置文件包含指令模块
 *
 * 支持在配置文件中使用 `$include` 指令引入其他配置文件，实现模块化配置管理。
 * - 支持单文件引入和多文件合并
 * - 递归解析嵌套的 $include 指令
 * - 循环引用检测（防止无限递归）
 * - 最大嵌套深度限制（默认 10 层）
 * - 深度合并策略：数组拼接、对象递归合并、原始值覆盖
 *
 * @example
 * ```json5
 * {
 *   "$include": "./base.json5",           // 引入单个文件
 *   "$include": ["./a.json5", "./b.json5"] // 合并多个文件
 * }
 * ```
 */

import fs from "node:fs";
import path from "node:path";

import JSON5 from "json5";

/** $include 指令的键名 */
export const INCLUDE_KEY = "$include";
/** 最大包含嵌套深度 */
export const MAX_INCLUDE_DEPTH = 10;

// ============================================================================
// Types
// ============================================================================

/** 包含文件解析器接口 */
export type IncludeResolver = {
  readFile: (path: string) => string;
  parseJson: (raw: string) => unknown;
};

// ============================================================================
// Errors
// ============================================================================

/** 配置包含错误（文件读取失败、解析失败等） */
export class ConfigIncludeError extends Error {
  constructor(
    message: string,
    public readonly includePath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ConfigIncludeError";
  }
}

/** 循环引用错误（A -> B -> A） */
export class CircularIncludeError extends ConfigIncludeError {
  constructor(public readonly chain: string[]) {
    super(`Circular include detected: ${chain.join(" -> ")}`, chain[chain.length - 1]);
    this.name = "CircularIncludeError";
  }
}

// ============================================================================
// Utilities
// ============================================================================

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/** 深度合并：数组拼接、对象递归合并、原始值以 source 为准 */
export function deepMerge(target: unknown, source: unknown): unknown {
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source];
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, unknown> = { ...target };
    for (const key of Object.keys(source)) {
      result[key] = key in result ? deepMerge(result[key], source[key]) : source[key];
    }
    return result;
  }
  return source;
}

// ============================================================================
// Include Resolver Class
// ============================================================================

class IncludeProcessor {
  private visited = new Set<string>();
  private depth = 0;

  constructor(
    private basePath: string,
    private resolver: IncludeResolver,
  ) {
    this.visited.add(path.normalize(basePath));
  }

  process(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.process(item));
    }

    if (!isPlainObject(obj)) {
      return obj;
    }

    if (!(INCLUDE_KEY in obj)) {
      return this.processObject(obj);
    }

    return this.processInclude(obj);
  }

  private processObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.process(value);
    }
    return result;
  }

  private processInclude(obj: Record<string, unknown>): unknown {
    const includeValue = obj[INCLUDE_KEY];
    const otherKeys = Object.keys(obj).filter((k) => k !== INCLUDE_KEY);
    const included = this.resolveInclude(includeValue);

    if (otherKeys.length === 0) {
      return included;
    }

    if (!isPlainObject(included)) {
      throw new ConfigIncludeError(
        "Sibling keys require included content to be an object",
        typeof includeValue === "string" ? includeValue : INCLUDE_KEY,
      );
    }

    // Merge included content with sibling keys
    const rest: Record<string, unknown> = {};
    for (const key of otherKeys) {
      rest[key] = this.process(obj[key]);
    }
    return deepMerge(included, rest);
  }

  private resolveInclude(value: unknown): unknown {
    if (typeof value === "string") {
      return this.loadFile(value);
    }

    if (Array.isArray(value)) {
      return value.reduce<unknown>((merged, item) => {
        if (typeof item !== "string") {
          throw new ConfigIncludeError(
            `Invalid $include array item: expected string, got ${typeof item}`,
            String(item),
          );
        }
        return deepMerge(merged, this.loadFile(item));
      }, {});
    }

    throw new ConfigIncludeError(
      `Invalid $include value: expected string or array of strings, got ${typeof value}`,
      String(value),
    );
  }

  private loadFile(includePath: string): unknown {
    const resolvedPath = this.resolvePath(includePath);

    this.checkCircular(resolvedPath);
    this.checkDepth(includePath);

    const raw = this.readFile(includePath, resolvedPath);
    const parsed = this.parseFile(includePath, resolvedPath, raw);

    return this.processNested(resolvedPath, parsed);
  }

  private resolvePath(includePath: string): string {
    const resolved = path.isAbsolute(includePath)
      ? includePath
      : path.resolve(path.dirname(this.basePath), includePath);
    return path.normalize(resolved);
  }

  private checkCircular(resolvedPath: string): void {
    if (this.visited.has(resolvedPath)) {
      throw new CircularIncludeError([...this.visited, resolvedPath]);
    }
  }

  private checkDepth(includePath: string): void {
    if (this.depth >= MAX_INCLUDE_DEPTH) {
      throw new ConfigIncludeError(
        `Maximum include depth (${MAX_INCLUDE_DEPTH}) exceeded at: ${includePath}`,
        includePath,
      );
    }
  }

  private readFile(includePath: string, resolvedPath: string): string {
    try {
      return this.resolver.readFile(resolvedPath);
    } catch (err) {
      throw new ConfigIncludeError(
        `Failed to read include file: ${includePath} (resolved: ${resolvedPath})`,
        includePath,
        err instanceof Error ? err : undefined,
      );
    }
  }

  private parseFile(includePath: string, resolvedPath: string, raw: string): unknown {
    try {
      return this.resolver.parseJson(raw);
    } catch (err) {
      throw new ConfigIncludeError(
        `Failed to parse include file: ${includePath} (resolved: ${resolvedPath})`,
        includePath,
        err instanceof Error ? err : undefined,
      );
    }
  }

  private processNested(resolvedPath: string, parsed: unknown): unknown {
    const nested = new IncludeProcessor(resolvedPath, this.resolver);
    nested.visited = new Set([...this.visited, resolvedPath]);
    nested.depth = this.depth + 1;
    return nested.process(parsed);
  }
}

// ============================================================================
// Public API
// ============================================================================

const defaultResolver: IncludeResolver = {
  readFile: (p) => fs.readFileSync(p, "utf-8"),
  parseJson: (raw) => JSON5.parse(raw),
};

/**
 * 解析配置对象中的所有 $include 指令
 *
 * @param obj - 已解析的配置对象
 * @param configPath - 配置文件路径（用于解析相对路径）
 * @param resolver - 文件读取和解析器
 * @returns 解析后的配置对象（所有 $include 已展开）
 */
export function resolveConfigIncludes(
  obj: unknown,
  configPath: string,
  resolver: IncludeResolver = defaultResolver,
): unknown {
  return new IncludeProcessor(configPath, resolver).process(obj);
}
