/**
 * MIME 类型检测模块
 * 提供文件 MIME 类型检测、扩展名映射等功能
 */
import path from "node:path";

import { fileTypeFromBuffer } from "file-type";
import { type MediaKind, mediaKindFromMime } from "./constants.js";

/** MIME 类型到扩展名的映射 */
const EXT_BY_MIME: Record<string, string> = {
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/x-m4a": ".m4a",
  "audio/mp4": ".m4a",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
  "application/json": ".json",
  "application/zip": ".zip",
  "application/gzip": ".gz",
  "application/x-tar": ".tar",
  "application/x-7z-compressed": ".7z",
  "application/vnd.rar": ".rar",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/csv": ".csv",
  "text/plain": ".txt",
  "text/markdown": ".md",
};

/** 扩展名到 MIME 类型的映射 */
const MIME_BY_EXT: Record<string, string> = {
  ...Object.fromEntries(Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime])),
  // 额外的扩展名别名
  ".jpeg": "image/jpeg",
};

/** 音频文件扩展名集合 */
const AUDIO_FILE_EXTENSIONS = new Set([
  ".aac",
  ".flac",
  ".m4a",
  ".mp3",
  ".oga",
  ".ogg",
  ".opus",
  ".wav",
]);

/**
 * 规范化请求头中的 MIME 类型
 * @param mime - 原始 MIME 类型
 * @returns 规范化后的 MIME 类型
 */
function normalizeHeaderMime(mime?: string | null): string | undefined {
  if (!mime) return undefined;
  const cleaned = mime.split(";")[0]?.trim().toLowerCase();
  return cleaned || undefined;
}

/**
 * 通过文件内容嗅探 MIME 类型
 * @param buffer - 文件内容缓冲区
 * @returns 检测到的 MIME 类型
 */
async function sniffMime(buffer?: Buffer): Promise<string | undefined> {
  if (!buffer) return undefined;
  try {
    const type = await fileTypeFromBuffer(buffer);
    return type?.mime ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * 获取文件扩展名
 * @param filePath - 文件路径或 URL
 * @returns 文件扩展名（小写）
 */
export function getFileExtension(filePath?: string | null): string | undefined {
  if (!filePath) return undefined;
  try {
    if (/^https?:\/\//i.test(filePath)) {
      const url = new URL(filePath);
      return path.extname(url.pathname).toLowerCase() || undefined;
    }
  } catch {
    // fall back to plain path parsing
  }
  const ext = path.extname(filePath).toLowerCase();
  return ext || undefined;
}

/**
 * 检查文件名是否为音频文件
 * @param fileName - 文件名
 * @returns 是否为音频文件
 */
export function isAudioFileName(fileName?: string | null): boolean {
  const ext = getFileExtension(fileName);
  if (!ext) return false;
  return AUDIO_FILE_EXTENSIONS.has(ext);
}

/**
 * 检测文件 MIME 类型
 * 综合使用文件内容嗅探、请求头和文件扩展名
 * @param opts - 检测选项
 * @returns 检测到的 MIME 类型
 */
export function detectMime(opts: {
  buffer?: Buffer;
  headerMime?: string | null;
  filePath?: string;
}): Promise<string | undefined> {
  return detectMimeImpl(opts);
}

/**
 * 检查是否为通用 MIME 类型
 */
function isGenericMime(mime?: string): boolean {
  if (!mime) return true;
  const m = mime.toLowerCase();
  return m === "application/octet-stream" || m === "application/zip";
}

/**
 * MIME 类型检测实现
 * 优先使用嗅探结果，但不让通用容器类型覆盖更具体的扩展名映射
 */
async function detectMimeImpl(opts: {
  buffer?: Buffer;
  headerMime?: string | null;
  filePath?: string;
}): Promise<string | undefined> {
  const ext = getFileExtension(opts.filePath);
  const extMime = ext ? MIME_BY_EXT[ext] : undefined;

  const headerMime = normalizeHeaderMime(opts.headerMime);
  const sniffed = await sniffMime(opts.buffer);

  // 优先使用嗅探结果，但不让通用容器类型覆盖更具体的扩展名映射（如 XLSX vs ZIP）
  if (sniffed && (!isGenericMime(sniffed) || !extMime)) return sniffed;
  if (extMime) return extMime;
  if (headerMime && !isGenericMime(headerMime)) return headerMime;
  if (sniffed) return sniffed;
  if (headerMime) return headerMime;

  return undefined;
}

/**
 * 根据 MIME 类型获取文件扩展名
 * @param mime - MIME 类型
 * @returns 文件扩展名
 */
export function extensionForMime(mime?: string | null): string | undefined {
  if (!mime) return undefined;
  return EXT_BY_MIME[mime.toLowerCase()];
}

/**
 * 检查是否为 GIF 媒体
 * @param opts - 检查选项
 * @returns 是否为 GIF
 */
export function isGifMedia(opts: {
  contentType?: string | null;
  fileName?: string | null;
}): boolean {
  if (opts.contentType?.toLowerCase() === "image/gif") return true;
  const ext = getFileExtension(opts.fileName);
  return ext === ".gif";
}

/**
 * 根据图片格式获取 MIME 类型
 * @param format - 图片格式
 * @returns MIME 类型
 */
export function imageMimeFromFormat(format?: string | null): string | undefined {
  if (!format) return undefined;
  switch (format.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return undefined;
  }
}

/**
 * 根据 MIME 类型获取媒体类型
 * @param mime - MIME 类型
 * @returns 媒体类型
 */
export function kindFromMime(mime?: string | null): MediaKind {
  return mediaKindFromMime(mime);
}
