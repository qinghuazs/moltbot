/**
 * 代理身份文件模块
 *
 * 该模块负责解析和加载代理的身份配置文件，
 * 支持从 Markdown 格式的身份文件中提取代理的个性化信息。
 *
 * @module agents/identity-file
 */

import fs from "node:fs";
import path from "node:path";

import { DEFAULT_IDENTITY_FILENAME } from "./workspace.js";

/** 代理身份文件类型 */
export type AgentIdentityFile = {
  /** 代理名称 */
  name?: string;
  /** 代理表情符号 */
  emoji?: string;
  /** 主题风格 */
  theme?: string;
  /** 代理形象（如机器人、幽灵等） */
  creature?: string;
  /** 代理氛围（如温暖、冷静等） */
  vibe?: string;
  /** 头像路径或 URL */
  avatar?: string;
};

/** 身份文件中的占位符值集合 */
const IDENTITY_PLACEHOLDER_VALUES = new Set([
  "pick something you like",
  "ai? robot? familiar? ghost in the machine? something weirder?",
  "how do you come across? sharp? warm? chaotic? calm?",
  "your signature - pick one that feels right",
  "workspace-relative path, http(s) url, or data uri",
]);

/**
 * 标准化身份值
 * 去除格式标记和多余空白
 */
function normalizeIdentityValue(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(/^[*_]+|[*_]+$/g, "").trim();
  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    normalized = normalized.slice(1, -1).trim();
  }
  normalized = normalized.replace(/[\u2013\u2014]/g, "-");
  normalized = normalized.replace(/\s+/g, " ").toLowerCase();
  return normalized;
}

/**
 * 检查值是否为占位符
 */
function isIdentityPlaceholder(value: string): boolean {
  const normalized = normalizeIdentityValue(value);
  return IDENTITY_PLACEHOLDER_VALUES.has(normalized);
}

/**
 * 解析 Markdown 格式的身份文件
 *
 * @param content - Markdown 内容
 * @returns 解析后的身份信息
 */
export function parseIdentityMarkdown(content: string): AgentIdentityFile {
  const identity: AgentIdentityFile = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.trim().replace(/^\s*-\s*/, "");
    const colonIndex = cleaned.indexOf(":");
    if (colonIndex === -1) continue;
    const label = cleaned.slice(0, colonIndex).replace(/[*_]/g, "").trim().toLowerCase();
    const value = cleaned
      .slice(colonIndex + 1)
      .replace(/^[*_]+|[*_]+$/g, "")
      .trim();
    if (!value) continue;
    if (isIdentityPlaceholder(value)) continue;
    if (label === "name") identity.name = value;
    if (label === "emoji") identity.emoji = value;
    if (label === "creature") identity.creature = value;
    if (label === "vibe") identity.vibe = value;
    if (label === "theme") identity.theme = value;
    if (label === "avatar") identity.avatar = value;
  }
  return identity;
}

/**
 * 检查身份对象是否包含有效值
 *
 * @param identity - 身份对象
 * @returns 是否包含有效值
 */
export function identityHasValues(identity: AgentIdentityFile): boolean {
  return Boolean(
    identity.name ||
    identity.emoji ||
    identity.theme ||
    identity.creature ||
    identity.vibe ||
    identity.avatar,
  );
}

/**
 * 从文件加载身份信息
 *
 * @param identityPath - 身份文件路径
 * @returns 身份信息，加载失败返回 null
 */
export function loadIdentityFromFile(identityPath: string): AgentIdentityFile | null {
  try {
    const content = fs.readFileSync(identityPath, "utf-8");
    const parsed = parseIdentityMarkdown(content);
    if (!identityHasValues(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 从工作区加载代理身份信息
 *
 * @param workspace - 工作区路径
 * @returns 身份信息，加载失败返回 null
 */
export function loadAgentIdentityFromWorkspace(workspace: string): AgentIdentityFile | null {
  const identityPath = path.join(workspace, DEFAULT_IDENTITY_FILENAME);
  return loadIdentityFromFile(identityPath);
}
