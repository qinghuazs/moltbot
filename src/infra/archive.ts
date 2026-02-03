/**
 * 归档文件处理模块
 * 提供 tar 和 zip 格式归档文件的解压功能
 */
import fs from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";
import JSZip from "jszip";

/** 归档类型 */
export type ArchiveKind = "tar" | "zip";

/** 归档日志器接口 */
export type ArchiveLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

/** tar 文件后缀列表 */
const TAR_SUFFIXES = [".tgz", ".tar.gz", ".tar"];

/**
 * 根据文件路径解析归档类型
 * @param filePath - 文件路径
 * @returns 归档类型，无法识别返回 null
 */
export function resolveArchiveKind(filePath: string): ArchiveKind | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".zip")) return "zip";
  if (TAR_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return "tar";
  return null;
}

/**
 * 解析打包的根目录
 * 处理 npm 包的 package/ 目录结构
 * @param extractDir - 解压目录
 * @returns 根目录路径
 */
export async function resolvePackedRootDir(extractDir: string): Promise<string> {
  // 首先检查标准的 package 目录
  const direct = path.join(extractDir, "package");
  try {
    const stat = await fs.stat(direct);
    if (stat.isDirectory()) return direct;
  } catch {
    // 忽略
  }

  // 如果只有一个目录，使用它作为根目录
  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  if (dirs.length !== 1) {
    throw new Error(`unexpected archive layout (dirs: ${dirs.join(", ")})`);
  }
  const onlyDir = dirs[0];
  if (!onlyDir) {
    throw new Error("unexpected archive layout (no package dir found)");
  }
  return path.join(extractDir, onlyDir);
}

/**
 * 带超时的 Promise 包装器
 * @param promise - 原始 Promise
 * @param timeoutMs - 超时毫秒数
 * @param label - 操作标签（用于错误消息）
 * @returns Promise 结果
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * 解压 zip 文件
 * @param params - 参数对象
 * @param params.archivePath - 归档文件路径
 * @param params.destDir - 目标目录
 */
async function extractZip(params: { archivePath: string; destDir: string }): Promise<void> {
  const buffer = await fs.readFile(params.archivePath);
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files);

  for (const entry of entries) {
    const entryPath = entry.name.replaceAll("\\", "/");
    if (!entryPath || entryPath.endsWith("/")) {
      const dirPath = path.resolve(params.destDir, entryPath);
      // 安全检查：防止路径遍历攻击
      if (!dirPath.startsWith(params.destDir)) {
        throw new Error(`zip entry escapes destination: ${entry.name}`);
      }
      await fs.mkdir(dirPath, { recursive: true });
      continue;
    }

    const outPath = path.resolve(params.destDir, entryPath);
    if (!outPath.startsWith(params.destDir)) {
      throw new Error(`zip entry escapes destination: ${entry.name}`);
    }
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const data = await entry.async("nodebuffer");
    await fs.writeFile(outPath, data);
  }
}

export async function extractArchive(params: {
  archivePath: string;
  destDir: string;
  timeoutMs: number;
  logger?: ArchiveLogger;
}): Promise<void> {
  const kind = resolveArchiveKind(params.archivePath);
  if (!kind) {
    throw new Error(`unsupported archive: ${params.archivePath}`);
  }

  const label = kind === "zip" ? "extract zip" : "extract tar";
  if (kind === "tar") {
    await withTimeout(
      tar.x({ file: params.archivePath, cwd: params.destDir }),
      params.timeoutMs,
      label,
    );
    return;
  }

  await withTimeout(extractZip(params), params.timeoutMs, label);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
