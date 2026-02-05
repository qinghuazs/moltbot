/**
 * Telegram 消息格式化模块
 *
 * 本模块提供 Markdown 到 Telegram HTML 格式的转换功能，包括：
 * - Markdown 解析和中间表示（IR）生成
 * - HTML 实体转义
 * - 样式标记转换（粗体、斜体、删除线、代码）
 * - 链接处理
 * - 长文本分块
 *
 * Telegram 使用自定义的 HTML 子集进行消息格式化，
 * 本模块确保 Markdown 内容正确转换为 Telegram 支持的格式。
 *
 * @module telegram/format
 */

import {
  chunkMarkdownIR,
  markdownToIR,
  type MarkdownLinkSpan,
  type MarkdownIR,
} from "../markdown/ir.js";
import { renderMarkdownWithMarkers } from "../markdown/render.js";
import type { MarkdownTableMode } from "../config/types.base.js";

/**
 * Telegram 格式化后的文本块
 */
export type TelegramFormattedChunk = {
  /** HTML 格式的文本 */
  html: string;
  /** 纯文本内容 */
  text: string;
};

/**
 * 转义 HTML 特殊字符
 * 将 &、<、> 转换为对应的 HTML 实体
 *
 * @param text - 原始文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 转义 HTML 属性值中的特殊字符
 * 在 escapeHtml 基础上额外转义双引号
 *
 * @param text - 原始文本
 * @returns 转义后的文本
 */
function escapeHtmlAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

/**
 * 构建 Telegram 链接标记
 * 将 Markdown 链接转换为 HTML <a> 标签
 *
 * @param link - Markdown 链接信息
 * @param _text - 链接文本（未使用）
 * @returns 链接标记对象，如果链接无效则返回 null
 */
function buildTelegramLink(link: MarkdownLinkSpan, _text: string) {
  const href = link.href.trim();
  if (!href) return null;
  if (link.start === link.end) return null;
  const safeHref = escapeHtmlAttr(href);
  return {
    start: link.start,
    end: link.end,
    open: `<a href="${safeHref}">`,
    close: "</a>",
  };
}

/**
 * 将 Markdown IR 渲染为 Telegram HTML
 * 使用 Telegram 支持的 HTML 标签进行样式标记
 *
 * @param ir - Markdown 中间表示
 * @returns Telegram HTML 格式的字符串
 */
function renderTelegramHtml(ir: MarkdownIR): string {
  return renderMarkdownWithMarkers(ir, {
    styleMarkers: {
      bold: { open: "<b>", close: "</b>" },
      italic: { open: "<i>", close: "</i>" },
      strikethrough: { open: "<s>", close: "</s>" },
      code: { open: "<code>", close: "</code>" },
      code_block: { open: "<pre><code>", close: "</code></pre>" },
    },
    escapeText: escapeHtml,
    buildLink: buildTelegramLink,
  });
}

/**
 * 将 Markdown 文本转换为 Telegram HTML 格式
 *
 * @param markdown - Markdown 格式的文本
 * @param options - 转换选项
 * @param options.tableMode - 表格渲染模式
 * @returns Telegram HTML 格式的字符串
 */
export function markdownToTelegramHtml(
  markdown: string,
  options: { tableMode?: MarkdownTableMode } = {},
): string {
  const ir = markdownToIR(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode,
  });
  return renderTelegramHtml(ir);
}

/**
 * 渲染 Telegram HTML 文本
 * 根据文本模式决定是否进行 Markdown 转换
 *
 * @param text - 输入文本
 * @param options - 渲染选项
 * @param options.textMode - 文本模式：markdown 或 html
 * @param options.tableMode - 表格渲染模式
 * @returns 渲染后的 HTML 文本
 */
export function renderTelegramHtmlText(
  text: string,
  options: { textMode?: "markdown" | "html"; tableMode?: MarkdownTableMode } = {},
): string {
  const textMode = options.textMode ?? "markdown";
  if (textMode === "html") return text;
  return markdownToTelegramHtml(text, { tableMode: options.tableMode });
}

/**
 * 将 Markdown 文本转换为 Telegram 格式的文本块数组
 * 用于处理超过 Telegram 消息长度限制的长文本
 *
 * @param markdown - Markdown 格式的文本
 * @param limit - 每个块的最大字符数
 * @param options - 转换选项
 * @param options.tableMode - 表格渲染模式
 * @returns 格式化后的文本块数组
 */
export function markdownToTelegramChunks(
  markdown: string,
  limit: number,
  options: { tableMode?: MarkdownTableMode } = {},
): TelegramFormattedChunk[] {
  const ir = markdownToIR(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode,
  });
  const chunks = chunkMarkdownIR(ir, limit);
  return chunks.map((chunk) => ({
    html: renderTelegramHtml(chunk),
    text: chunk.text,
  }));
}

/**
 * 将 Markdown 文本转换为 Telegram HTML 块数组
 * 简化版本，仅返回 HTML 字符串数组
 *
 * @param markdown - Markdown 格式的文本
 * @param limit - 每个块的最大字符数
 * @returns HTML 字符串数组
 */
export function markdownToTelegramHtmlChunks(markdown: string, limit: number): string[] {
  return markdownToTelegramChunks(markdown, limit).map((chunk) => chunk.html);
}
