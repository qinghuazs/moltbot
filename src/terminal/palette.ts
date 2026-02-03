/**
 * Lobster 调色板模块
 * 定义 CLI/UI 主题的颜色令牌
 * "lobster seam" == 使用此调色板
 * 保持与 docs/cli/index.md（CLI 调色板部分）同步
 */
export const LOBSTER_PALETTE = {
  /** 强调色 */
  accent: "#FF5A2D",
  /** 亮强调色 */
  accentBright: "#FF7A3D",
  /** 暗强调色 */
  accentDim: "#D14A22",
  /** 信息色 */
  info: "#FF8A5B",
  /** 成功色 */
  success: "#2FBF71",
  /** 警告色 */
  warn: "#FFB020",
  /** 错误色 */
  error: "#E23D2D",
  /** 静音色 */
  muted: "#8B7F77",
} as const;
