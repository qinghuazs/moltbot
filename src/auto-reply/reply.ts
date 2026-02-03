/**
 * 自动回复模块统一导出
 * 聚合并导出所有自动回复相关的函数和类型
 */

// 指令提取函数
export {
  extractElevatedDirective, // 提取提升模式指令
  extractReasoningDirective, // 提取推理指令
  extractThinkDirective, // 提取思考指令
  extractVerboseDirective, // 提取详细模式指令
} from "./reply/directives.js";

// 回复获取
export { getReplyFromConfig } from "./reply/get-reply.js";

// 执行指令
export { extractExecDirective } from "./reply/exec.js";

// 队列指令
export { extractQueueDirective } from "./reply/queue.js";

// 回复标签
export { extractReplyToTag } from "./reply/reply-tags.js";

// 类型导出
export type { GetReplyOptions, ReplyPayload } from "./types.js";
