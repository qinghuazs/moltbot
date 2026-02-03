/**
 * 媒体常量模块
 * 定义媒体文件大小限制和类型判断功能
 */

/** 图片最大字节数：6MB */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
/** 音频最大字节数：16MB */
export const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
/** 视频最大字节数：16MB */
export const MAX_VIDEO_BYTES = 16 * 1024 * 1024;
/** 文档最大字节数：100MB */
export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

/** 媒体类型 */
export type MediaKind = "image" | "audio" | "video" | "document" | "unknown";

/**
 * 根据 MIME 类型判断媒体类型
 * @param mime - MIME 类型
 * @returns 媒体类型
 */
export function mediaKindFromMime(mime?: string | null): MediaKind {
  if (!mime) return "unknown";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";
  if (mime.startsWith("application/")) return "document";
  return "unknown";
}

/**
 * 根据媒体类型获取最大字节数限制
 * @param kind - 媒体类型
 * @returns 最大字节数
 */
export function maxBytesForKind(kind: MediaKind): number {
  switch (kind) {
    case "image":
      return MAX_IMAGE_BYTES;
    case "audio":
      return MAX_AUDIO_BYTES;
    case "video":
      return MAX_VIDEO_BYTES;
    case "document":
      return MAX_DOCUMENT_BYTES;
    default:
      return MAX_DOCUMENT_BYTES;
  }
}
