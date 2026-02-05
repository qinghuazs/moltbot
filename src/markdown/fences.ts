/**
 * Markdown 代码围栏模块
 *
 * 该模块提供 Markdown 代码围栏（fenced code blocks）的解析功能，
 * 用于识别和处理代码块边界。
 *
 * @module markdown/fences
 */

/** 代码围栏范围类型 */
export type FenceSpan = {
  /** 起始位置 */
  start: number;
  /** 结束位置 */
  end: number;
  /** 开始行内容 */
  openLine: string;
  /** 围栏标记（如 ``` 或 ~~~） */
  marker: string;
  /** 缩进 */
  indent: string;
};

/**
 * 解析代码围栏范围
 *
 * @param buffer - 要解析的文本
 * @returns 代码围栏范围数组
 */
export function parseFenceSpans(buffer: string): FenceSpan[] {
  const spans: FenceSpan[] = [];
  let open:
    | {
        start: number;
        markerChar: string;
        markerLen: number;
        openLine: string;
        marker: string;
        indent: string;
      }
    | undefined;

  let offset = 0;
  while (offset <= buffer.length) {
    const nextNewline = buffer.indexOf("\n", offset);
    const lineEnd = nextNewline === -1 ? buffer.length : nextNewline;
    const line = buffer.slice(offset, lineEnd);

    const match = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
    if (match) {
      const indent = match[1];
      const marker = match[2];
      const markerChar = marker[0];
      const markerLen = marker.length;
      if (!open) {
        open = {
          start: offset,
          markerChar,
          markerLen,
          openLine: line,
          marker,
          indent,
        };
      } else if (open.markerChar === markerChar && markerLen >= open.markerLen) {
        const end = lineEnd;
        spans.push({
          start: open.start,
          end,
          openLine: open.openLine,
          marker: open.marker,
          indent: open.indent,
        });
        open = undefined;
      }
    }

    if (nextNewline === -1) break;
    offset = nextNewline + 1;
  }

  if (open) {
    spans.push({
      start: open.start,
      end: buffer.length,
      openLine: open.openLine,
      marker: open.marker,
      indent: open.indent,
    });
  }

  return spans;
}

/**
 * 查找指定位置所在的代码围栏
 *
 * @param spans - 代码围栏范围数组
 * @param index - 位置索引
 * @returns 包含该位置的围栏，未找到返回 undefined
 */
export function findFenceSpanAt(spans: FenceSpan[], index: number): FenceSpan | undefined {
  return spans.find((span) => index > span.start && index < span.end);
}

/**
 * 检查指定位置是否可以安全断开
 * 即该位置不在代码围栏内部
 *
 * @param spans - 代码围栏范围数组
 * @param index - 位置索引
 * @returns 是否可以安全断开
 */
export function isSafeFenceBreak(spans: FenceSpan[], index: number): boolean {
  return !findFenceSpanAt(spans, index);
}
