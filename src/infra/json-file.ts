/**
 * JSON 文件读写工具模块
 *
 * 提供安全的 JSON 文件读写功能，包括：
 * - 自动创建目录
 * - 设置安全的文件权限（0o600）
 * - 错误处理和容错
 */

import fs from "node:fs";
import path from "node:path";

/**
 * 加载 JSON 文件
 *
 * 读取并解析指定路径的 JSON 文件。
 * 如果文件不存在或解析失败，返回 undefined。
 *
 * @param pathname - 文件路径
 * @returns 解析后的 JSON 数据，或 undefined
 */
export function loadJsonFile(pathname: string): unknown {
  try {
    if (!fs.existsSync(pathname)) return undefined;
    const raw = fs.readFileSync(pathname, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * 保存 JSON 文件
 *
 * 将数据序列化为 JSON 并写入文件。
 * 自动创建父目录（权限 0o700），文件权限设为 0o600。
 *
 * @param pathname - 文件路径
 * @param data - 要保存的数据
 */
export function saveJsonFile(pathname: string, data: unknown) {
  const dir = path.dirname(pathname);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(pathname, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.chmodSync(pathname, 0o600);
}
