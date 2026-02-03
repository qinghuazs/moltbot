/**
 * 通用工具函数模块
 * 提供文件系统、数值处理、WhatsApp JID 转换、路径处理等常用工具函数
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveOAuthDir } from "./config/paths.js";
import { logVerbose, shouldLogVerbose } from "./globals.js";

/**
 * 确保目录存在，如不存在则递归创建
 * @param dir - 目录路径
 */
export async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

/**
 * 将数值限制在指定范围内
 * @param value - 输入值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 限制后的数值
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 将数值取整后限制在指定范围内
 * @param value - 输入值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 限制后的整数
 */
export function clampInt(value: number, min: number, max: number): number {
  return clampNumber(Math.floor(value), min, max);
}

/** Web 渠道类型 */
export type WebChannel = "web";

/**
 * 断言输入为 Web 渠道类型
 * @param input - 输入字符串
 * @throws 如果不是 'web' 则抛出错误
 */
export function assertWebChannel(input: string): asserts input is WebChannel {
  if (input !== "web") {
    throw new Error("Web channel must be 'web'");
  }
}

/**
 * 规范化路径，确保以 / 开头
 * @param p - 输入路径
 * @returns 规范化后的路径
 */
export function normalizePath(p: string): string {
  if (!p.startsWith("/")) return `/${p}`;
  return p;
}

/**
 * 为号码添加 WhatsApp 前缀
 * @param number - 电话号码
 * @returns 带 whatsapp: 前缀的号码
 */
export function withWhatsAppPrefix(number: string): string {
  return number.startsWith("whatsapp:") ? number : `whatsapp:${number}`;
}

/**
 * 将电话号码规范化为 E.164 格式（+国家码号码）
 * @param number - 输入号码
 * @returns E.164 格式的号码
 */
export function normalizeE164(number: string): string {
  const withoutPrefix = number.replace(/^whatsapp:/, "").trim();
  const digits = withoutPrefix.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `+${digits.slice(1)}`;
  return `+${digits}`;
}

/**
 * "自聊模式"启发式检测（单手机场景）
 * 当网关以用户自己的 WhatsApp 账号登录，且 allowFrom 包含该号码时返回 true
 * 用于避免在"机器人"和用户是同一 WhatsApp 身份时执行无意义的副作用
 * （如自动已读回执、@提及 JID 触发等）
 * @param selfE164 - 当前登录的 E.164 格式号码
 * @param allowFrom - 允许的来源号码列表
 * @returns 是否为自聊模式
 */
export function isSelfChatMode(
  selfE164: string | null | undefined,
  allowFrom?: Array<string | number> | null,
): boolean {
  if (!selfE164) return false;
  if (!Array.isArray(allowFrom) || allowFrom.length === 0) return false;
  const normalizedSelf = normalizeE164(selfE164);
  return allowFrom.some((n) => {
    if (n === "*") return false;
    try {
      return normalizeE164(String(n)) === normalizedSelf;
    } catch {
      return false;
    }
  });
}

/**
 * 将电话号码转换为 WhatsApp JID 格式
 * @param number - 电话号码
 * @returns WhatsApp JID（如 1234567890@s.whatsapp.net）
 */
export function toWhatsappJid(number: string): string {
  const withoutPrefix = number.replace(/^whatsapp:/, "").trim();
  if (withoutPrefix.includes("@")) return withoutPrefix;
  const e164 = normalizeE164(withoutPrefix);
  const digits = e164.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

/** JID 转 E.164 的选项 */
export type JidToE164Options = {
  /** 认证目录 */
  authDir?: string;
  /** LID 映射目录列表 */
  lidMappingDirs?: string[];
  /** 是否记录缺失的映射 */
  logMissing?: boolean;
};

/** LID 查找接口 */
type LidLookup = {
  /** 根据 LID 获取电话号码 */
  getPNForLID?: (jid: string) => Promise<string | null>;
};

/**
 * 解析 LID 映射目录列表
 * @param opts - 选项
 * @returns 目录路径数组
 */
function resolveLidMappingDirs(opts?: JidToE164Options): string[] {
  const dirs = new Set<string>();
  const addDir = (dir?: string | null) => {
    if (!dir) return;
    dirs.add(resolveUserPath(dir));
  };
  addDir(opts?.authDir);
  for (const dir of opts?.lidMappingDirs ?? []) addDir(dir);
  addDir(resolveOAuthDir());
  addDir(path.join(CONFIG_DIR, "credentials"));
  return [...dirs];
}

/**
 * 从反向映射文件读取 LID 对应的电话号码
 * @param lid - WhatsApp Linked ID
 * @param opts - 选项
 * @returns E.164 格式的电话号码，未找到返回 null
 */
function readLidReverseMapping(lid: string, opts?: JidToE164Options): string | null {
  const mappingFilename = `lid-mapping-${lid}_reverse.json`;
  const mappingDirs = resolveLidMappingDirs(opts);
  for (const dir of mappingDirs) {
    const mappingPath = path.join(dir, mappingFilename);
    try {
      const data = fs.readFileSync(mappingPath, "utf8");
      const phone = JSON.parse(data) as string | number | null;
      if (phone === null || phone === undefined) continue;
      return normalizeE164(String(phone));
    } catch {
      // Try the next location.
    }
  }
  return null;
}

/**
 * 将 WhatsApp JID 转换为 E.164 格式电话号码（同步版本）
 * 支持标准 JID 格式和 LID（Linked ID）格式
 * @param jid - WhatsApp JID（如 1234:1@s.whatsapp.net 或 xxx@lid）
 * @param opts - 选项
 * @returns E.164 格式号码（如 +1234），无法转换返回 null
 */
export function jidToE164(jid: string, opts?: JidToE164Options): string | null {
  // 将 WhatsApp JID（可能带设备后缀，如 1234:1@s.whatsapp.net）转换回 +1234
  const match = jid.match(/^(\d+)(?::\d+)?@(s\.whatsapp\.net|hosted)$/);
  if (match) {
    const digits = match[1];
    return `+${digits}`;
  }

  // 支持 @lid 格式（WhatsApp Linked ID）- 查找反向映射
  const lidMatch = jid.match(/^(\d+)(?::\d+)?@(lid|hosted\.lid)$/);
  if (lidMatch) {
    const lid = lidMatch[1];
    const phone = readLidReverseMapping(lid, opts);
    if (phone) return phone;
    const shouldLog = opts?.logMissing ?? shouldLogVerbose();
    if (shouldLog) {
      logVerbose(`LID mapping not found for ${lid}; skipping inbound message`);
    }
  }

  return null;
}

/**
 * 将 WhatsApp JID 转换为 E.164 格式电话号码（异步版本）
 * 支持通过 LID 查找接口动态解析
 * @param jid - WhatsApp JID
 * @param opts - 选项，可包含 LID 查找接口
 * @returns E.164 格式号码，无法转换返回 null
 */
export async function resolveJidToE164(
  jid: string | null | undefined,
  opts?: JidToE164Options & { lidLookup?: LidLookup },
): Promise<string | null> {
  if (!jid) return null;
  const direct = jidToE164(jid, opts);
  if (direct) return direct;
  if (!/(@lid|@hosted\.lid)$/.test(jid)) return null;
  if (!opts?.lidLookup?.getPNForLID) return null;
  try {
    const pnJid = await opts.lidLookup.getPNForLID(jid);
    if (!pnJid) return null;
    return jidToE164(pnJid, opts);
  } catch (err) {
    if (shouldLogVerbose()) {
      logVerbose(`LID mapping lookup failed for ${jid}: ${String(err)}`);
    }
    return null;
  }
}

/**
 * 异步延迟指定毫秒数
 * @param ms - 延迟毫秒数
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 检查是否为 UTF-16 高代理项
 * @param codeUnit - 字符码点
 */
function isHighSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff;
}

/**
 * 检查是否为 UTF-16 低代理项
 * @param codeUnit - 字符码点
 */
function isLowSurrogate(codeUnit: number): boolean {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff;
}

/**
 * UTF-16 安全的字符串切片
 * 避免在代理对中间切割导致乱码
 * @param input - 输入字符串
 * @param start - 起始位置
 * @param end - 结束位置（可选）
 * @returns 切片后的字符串
 */
export function sliceUtf16Safe(input: string, start: number, end?: number): string {
  const len = input.length;

  let from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
  let to = end === undefined ? len : end < 0 ? Math.max(len + end, 0) : Math.min(end, len);

  if (to < from) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  if (from > 0 && from < len) {
    const codeUnit = input.charCodeAt(from);
    if (isLowSurrogate(codeUnit) && isHighSurrogate(input.charCodeAt(from - 1))) {
      from += 1;
    }
  }

  if (to > 0 && to < len) {
    const codeUnit = input.charCodeAt(to - 1);
    if (isHighSurrogate(codeUnit) && isLowSurrogate(input.charCodeAt(to))) {
      to -= 1;
    }
  }

  return input.slice(from, to);
}

/**
 * UTF-16 安全的字符串截断
 * @param input - 输入字符串
 * @param maxLen - 最大长度
 * @returns 截断后的字符串
 */
export function truncateUtf16Safe(input: string, maxLen: number): string {
  const limit = Math.max(0, Math.floor(maxLen));
  if (input.length <= limit) return input;
  return sliceUtf16Safe(input, 0, limit);
}

/**
 * 解析用户路径，支持 ~ 展开为用户主目录
 * @param input - 输入路径
 * @returns 解析后的绝对路径
 */
export function resolveUserPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, os.homedir());
    return path.resolve(expanded);
  }
  return path.resolve(trimmed);
}

/**
 * 解析配置目录路径
 * 优先使用环境变量 MOLTBOT_STATE_DIR 或 CLAWDBOT_STATE_DIR
 * 否则使用 ~/.clawdbot 或 ~/.moltbot
 * @param env - 环境变量对象
 * @param homedir - 获取主目录的函数
 * @returns 配置目录路径
 */
export function resolveConfigDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir,
): string {
  const override = env.MOLTBOT_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  if (override) return resolveUserPath(override);
  const legacyDir = path.join(homedir(), ".clawdbot");
  const newDir = path.join(homedir(), ".moltbot");
  try {
    const hasLegacy = fs.existsSync(legacyDir);
    const hasNew = fs.existsSync(newDir);
    if (!hasLegacy && hasNew) return newDir;
  } catch {
    // best-effort
  }
  return legacyDir;
}

/**
 * 解析用户主目录
 * 依次尝试 HOME、USERPROFILE 环境变量和 os.homedir()
 * @returns 主目录路径，无法获取返回 undefined
 */
export function resolveHomeDir(): string | undefined {
  const envHome = process.env.HOME?.trim();
  if (envHome) return envHome;
  const envProfile = process.env.USERPROFILE?.trim();
  if (envProfile) return envProfile;
  try {
    const home = os.homedir();
    return home?.trim() ? home : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 将路径中的主目录替换为 ~
 * @param input - 输入路径
 * @returns 缩短后的路径
 */
export function shortenHomePath(input: string): string {
  if (!input) return input;
  const home = resolveHomeDir();
  if (!home) return input;
  if (input === home) return "~";
  if (input.startsWith(`${home}/`)) return `~${input.slice(home.length)}`;
  return input;
}

/**
 * 将字符串中所有主目录路径替换为 ~
 * @param input - 输入字符串
 * @returns 替换后的字符串
 */
export function shortenHomeInString(input: string): string {
  if (!input) return input;
  const home = resolveHomeDir();
  if (!home) return input;
  return input.split(home).join("~");
}

/**
 * 格式化路径用于显示（缩短主目录）
 * @param input - 输入路径
 * @returns 显示用路径
 */
export function displayPath(input: string): string {
  return shortenHomePath(input);
}

/**
 * 格式化字符串用于显示（缩短主目录）
 * @param input - 输入字符串
 * @returns 显示用字符串
 */
export function displayString(input: string): string {
  return shortenHomeInString(input);
}

/**
 * 格式化终端可点击链接
 * 使用 OSC 8 转义序列创建可点击的超链接
 * @param label - 显示文本
 * @param url - 链接地址
 * @param opts - 选项（fallback: 非 TTY 时的回退文本，force: 强制启用/禁用）
 * @returns 格式化后的链接字符串
 */
export function formatTerminalLink(
  label: string,
  url: string,
  opts?: { fallback?: string; force?: boolean },
): string {
  const esc = "\u001b";
  const safeLabel = label.replaceAll(esc, "");
  const safeUrl = url.replaceAll(esc, "");
  const allow =
    opts?.force === true ? true : opts?.force === false ? false : Boolean(process.stdout.isTTY);
  if (!allow) {
    return opts?.fallback ?? `${safeLabel} (${safeUrl})`;
  }
  return `\u001b]8;;${safeUrl}\u0007${safeLabel}\u001b]8;;\u0007`;
}

// 配置根目录；可通过 CLAWDBOT_STATE_DIR 环境变量覆盖
export const CONFIG_DIR = resolveConfigDir();
