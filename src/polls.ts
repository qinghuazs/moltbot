/**
 * 投票功能模块
 * 提供投票输入的验证和规范化处理
 */

/** 投票输入类型 */
export type PollInput = {
  /** 投票问题 */
  question: string;
  /** 选项列表 */
  options: string[];
  /** 最大可选数量 */
  maxSelections?: number;
  /** 持续时间（小时） */
  durationHours?: number;
};

/** 规范化后的投票输入类型 */
export type NormalizedPollInput = {
  /** 投票问题 */
  question: string;
  /** 选项列表 */
  options: string[];
  /** 最大可选数量（必填） */
  maxSelections: number;
  /** 持续时间（小时） */
  durationHours?: number;
};

/** 规范化投票选项 */
type NormalizePollOptions = {
  /** 最大选项数量限制 */
  maxOptions?: number;
};

/**
 * 规范化投票输入
 * 验证并清理投票数据
 * @param input - 原始投票输入
 * @param options - 规范化选项
 * @returns 规范化后的投票输入
 * @throws 验证失败时抛出错误
 */
export function normalizePollInput(
  input: PollInput,
  options: NormalizePollOptions = {},
): NormalizedPollInput {
  const question = input.question.trim();
  if (!question) {
    throw new Error("Poll question is required");
  }

  // 清理选项列表
  const pollOptions = (input.options ?? []).map((option) => option.trim());
  const cleaned = pollOptions.filter(Boolean);
  if (cleaned.length < 2) {
    throw new Error("Poll requires at least 2 options");
  }
  if (options.maxOptions !== undefined && cleaned.length > options.maxOptions) {
    throw new Error(`Poll supports at most ${options.maxOptions} options`);
  }

  // 处理最大可选数量
  const maxSelectionsRaw = input.maxSelections;
  const maxSelections =
    typeof maxSelectionsRaw === "number" && Number.isFinite(maxSelectionsRaw)
      ? Math.floor(maxSelectionsRaw)
      : 1;
  if (maxSelections < 1) {
    throw new Error("maxSelections must be at least 1");
  }
  if (maxSelections > cleaned.length) {
    throw new Error("maxSelections cannot exceed option count");
  }

  // 处理持续时间
  const durationRaw = input.durationHours;
  const durationHours =
    typeof durationRaw === "number" && Number.isFinite(durationRaw)
      ? Math.floor(durationRaw)
      : undefined;
  if (durationHours !== undefined && durationHours < 1) {
    throw new Error("durationHours must be at least 1");
  }

  return {
    question,
    options: cleaned,
    maxSelections,
    durationHours,
  };
}

/**
 * 规范化投票持续时间
 * @param value - 输入的持续时间
 * @param options - 默认值和最大值配置
 * @returns 规范化后的持续时间（小时）
 */
export function normalizePollDurationHours(
  value: number | undefined,
  options: { defaultHours: number; maxHours: number },
): number {
  const base =
    typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : options.defaultHours;
  return Math.min(Math.max(base, 1), options.maxHours);
}
