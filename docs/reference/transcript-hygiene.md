---
summary: "参考：按提供商的转录净化与修复规则"
read_when:
  - 排查因转录结构导致的 provider 请求拒绝
  - 修改转录净化或工具调用修复逻辑
  - 调查不同 provider 间的工具调用 ID 不匹配
---
# 转录卫生（Provider 修复）

本文描述在一次运行前（构建模型上下文时）对转录应用的**按提供商修复**。这些都是**内存中**调整，用来满足严格的 provider 要求。它们**不会**重写磁盘上的 JSONL 转录。

范围包括：
- 工具调用 ID 净化
- 工具结果配对修复
- 回合验证与排序
- 思考签名清理
- 图像载荷净化

如需转录存储细节，见：
- [/reference/session-management-compaction](/reference/session-management-compaction)

---

## 执行位置

所有转录卫生逻辑集中在嵌入式运行器中：
- 策略选择：`src/agents/transcript-policy.ts`
- 净化或修复：`sanitizeSessionHistory`（`src/agents/pi-embedded-runner/google.ts`）

策略使用 `provider`、`modelApi`、`modelId` 来决定应用哪些规则。

---

## 全局规则：图像净化

图像载荷始终会被净化，以避免因体积限制被 provider 拒绝（对过大的 base64 图片降采样或重新压缩）。

实现：
- `sanitizeSessionMessagesImages`（`src/agents/pi-embedded-helpers/images.ts`）
- `sanitizeContentBlocksImages`（`src/agents/tool-images.ts`）

---

## Provider 矩阵（当前行为）

**OpenAI / OpenAI Codex**
- 仅图像净化。
- 切换到 OpenAI Responses 或 Codex 时，删除孤立的推理签名（没有后续内容块的独立推理项）。
- 不做工具调用 ID 净化。
- 不做工具结果配对修复。
- 不做回合验证或重排。
- 不生成合成工具结果。
- 不剥离思考签名。

**Google（Generative AI / Gemini CLI / Antigravity）**
- 工具调用 ID 净化：严格字母数字。
- 工具结果配对修复与合成工具结果。
- 回合验证（Gemini 风格交替）。
- Google 回合排序修复（当历史以 assistant 开头时，前置一个极小 user bootstrap）。
- Antigravity Claude：规范化思考签名，丢弃未签名的思考块。

**Anthropic / Minimax（Anthropic 兼容）**
- 工具结果配对修复与合成工具结果。
- 回合验证（合并连续 user 回合以满足严格交替）。

**Mistral（含基于 model-id 检测）**
- 工具调用 ID 净化：strict9（长度 9 的字母数字）。

**OpenRouter Gemini**
- 思考签名清理：移除非 base64 的 `thought_signature`（保留 base64）。

**其它提供商**
- 仅图像净化。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 之前，Moltbot 对转录应用了多层卫生处理：

- 一个 **transcript-sanitize 扩展** 在每次构建上下文时运行，可：
  - 修复工具使用与结果配对。
  - 净化工具调用 ID（包括保留 `_`/`-` 的非严格模式）。
- 运行器也进行了 provider 专用净化，造成重复。
- 额外的变更发生在策略之外，例如：
  - 在持久化前从 assistant 文本中剥离 `<final>` 标签。
  - 丢弃空的 assistant 错误回合。
  - 在工具调用后裁剪 assistant 内容。

这种复杂性导致跨 provider 回归（尤其是 `openai-responses` 的 `call_id|fc_id` 配对）。
2026.1.22 清理移除了扩展，将逻辑集中到运行器中，并让 OpenAI 除图像净化外保持**无触碰**。
