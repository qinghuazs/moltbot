/**
 * 日期时间工具模块
 * 提供时区解析、时间格式检测、时间戳规范化等功能
 */
import { execSync } from "node:child_process";

/** 时间格式偏好类型 */
export type TimeFormatPreference = "auto" | "12" | "24";
/** 解析后的时间格式类型 */
export type ResolvedTimeFormat = "12" | "24";

/** 缓存的时间格式 */
let cachedTimeFormat: ResolvedTimeFormat | undefined;

/**
 * 解析用户时区
 * @param configured - 配置的时区
 * @returns 有效的时区字符串
 */
export function resolveUserTimezone(configured?: string): string {
  const trimmed = configured?.trim();
  if (trimmed) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
      return trimmed;
    } catch {
      // ignore invalid timezone
    }
  }
  const host = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return host?.trim() || "UTC";
}

/**
 * 解析用户时间格式偏好
 * @param preference - 时间格式偏好
 * @returns 解析后的时间格式（12 或 24 小时制）
 */
export function resolveUserTimeFormat(preference?: TimeFormatPreference): ResolvedTimeFormat {
  if (preference === "12" || preference === "24") return preference;
  if (cachedTimeFormat) return cachedTimeFormat;
  cachedTimeFormat = detectSystemTimeFormat() ? "24" : "12";
  return cachedTimeFormat;
}

/**
 * 规范化时间戳
 * 支持 Date 对象、数字（秒或毫秒）、字符串格式
 * @param raw - 原始时间戳值
 * @returns 规范化后的时间戳对象，无效返回 undefined
 */
export function normalizeTimestamp(
  raw: unknown,
): { timestampMs: number; timestampUtc: string } | undefined {
  if (raw == null) return undefined;
  let timestampMs: number | undefined;

  if (raw instanceof Date) {
    timestampMs = raw.getTime();
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    timestampMs = raw < 1_000_000_000_000 ? Math.round(raw * 1000) : Math.round(raw);
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        if (trimmed.includes(".")) {
          timestampMs = Math.round(num * 1000);
        } else if (trimmed.length >= 13) {
          timestampMs = Math.round(num);
        } else {
          timestampMs = Math.round(num * 1000);
        }
      }
    } else {
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) timestampMs = parsed;
    }
  }

  if (timestampMs === undefined || !Number.isFinite(timestampMs)) return undefined;
  return { timestampMs, timestampUtc: new Date(timestampMs).toISOString() };
}

/**
 * 为对象添加规范化的时间戳字段
 * @param value - 原始对象
 * @param rawTimestamp - 原始时间戳值
 * @returns 带有时间戳字段的对象
 */
export function withNormalizedTimestamp<T extends Record<string, unknown>>(
  value: T,
  rawTimestamp: unknown,
): T & { timestampMs?: number; timestampUtc?: string } {
  const normalized = normalizeTimestamp(rawTimestamp);
  if (!normalized) return value;
  return {
    ...value,
    timestampMs:
      typeof value.timestampMs === "number" && Number.isFinite(value.timestampMs)
        ? value.timestampMs
        : normalized.timestampMs,
    timestampUtc:
      typeof value.timestampUtc === "string" && value.timestampUtc.trim()
        ? value.timestampUtc
        : normalized.timestampUtc,
  };
}

/**
 * 检测系统时间格式
 * 支持 macOS、Windows 和其他平台
 * @returns true 表示 24 小时制，false 表示 12 小时制
 */
function detectSystemTimeFormat(): boolean {
  // macOS：读取系统偏好设置
  if (process.platform === "darwin") {
    try {
      const result = execSync("defaults read -g AppleICUForce24HourTime 2>/dev/null", {
        encoding: "utf8",
        timeout: 500,
      }).trim();
      if (result === "1") return true;
      if (result === "0") return false;
    } catch {
      // Not set, fall through
    }
  }

  // Windows：通过 PowerShell 读取区域设置
  if (process.platform === "win32") {
    try {
      const result = execSync(
        'powershell -Command "(Get-Culture).DateTimeFormat.ShortTimePattern"',
        { encoding: "utf8", timeout: 1000 },
      ).trim();
      if (result.startsWith("H")) return true;
      if (result.startsWith("h")) return false;
    } catch {
      // Fall through
    }
  }

  try {
    const sample = new Date(2000, 0, 1, 13, 0);
    const formatted = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(sample);
    return formatted.includes("13");
  } catch {
    return false;
  }
}

/**
 * 获取日期的序数后缀（英文）
 * @param day - 日期数字
 * @returns 序数后缀（st, nd, rd, th）
 */
function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * 格式化用户友好的时间字符串
 * @param date - 日期对象
 * @param timeZone - 时区
 * @param format - 时间格式（12 或 24 小时制）
 * @returns 格式化的时间字符串，如 "Monday, January 1st, 2024 — 14:30"
 */
export function formatUserTime(
  date: Date,
  timeZone: string,
  format: ResolvedTimeFormat,
): string | undefined {
  const use24Hour = format === "24";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: use24Hour ? "2-digit" : "numeric",
      minute: "2-digit",
      hourCycle: use24Hour ? "h23" : "h12",
    }).formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") map[part.type] = part.value;
    }
    if (!map.weekday || !map.year || !map.month || !map.day || !map.hour || !map.minute)
      return undefined;
    const dayNum = parseInt(map.day, 10);
    const suffix = ordinalSuffix(dayNum);
    const timePart = use24Hour
      ? `${map.hour}:${map.minute}`
      : `${map.hour}:${map.minute} ${map.dayPeriod ?? ""}`.trim();
    return `${map.weekday}, ${map.month} ${dayNum}${suffix}, ${map.year} — ${timePart}`;
  } catch {
    return undefined;
  }
}
