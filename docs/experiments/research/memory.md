---
summary: "研究笔记：Clawd 工作区的离线记忆系统（Markdown 为真值 + 派生索引）"
read_when:
  - 设计超越每日 Markdown 日志的工作区记忆（~/clawd）
  - 决定：独立 CLI 还是深度 Moltbot 集成
  - 添加离线回忆与反思（retain/recall/reflect）
---

# Workspace Memory v2（离线）：研究笔记

目标：Clawd 风格工作区（`agents.defaults.workspace`，默认 `~/clawd`），其中“记忆”以每日一个 Markdown 文件（`memory/YYYY-MM-DD.md`）加上少量稳定文件（如 `memory.md`、`SOUL.md`）保存。

本文提出一种**离线优先**的记忆架构：Markdown 仍是可审核的真值来源，但通过派生索引提供**结构化回忆**（搜索、实体摘要、置信度更新）。

## 为什么要改

当前方案（每日一个文件）擅长：
- “只追加”式记录
- 人类编辑
- git 备份的持久性与可审计性
- 低摩擦采集（“就写下来”）

弱点：
- 高召回检索（“我们对 X 的结论是什么？”“上次做 Y 是什么时候？”）
- 实体为中心的回答（“说说 Alice / The Castle / warelay”）而不必读很多文件
- 观点与偏好的稳定性（以及变化证据）
- 时间约束（“2025 年 11 月期间什么为真？”）与冲突处理

## 设计目标

- **离线：**无网络也可运行；可在 laptop/Castle 上使用；无云依赖。
- **可解释：**检索项可追溯（文件与位置），并可与推断区分。
- **低仪式感：**每日记录仍是 Markdown，不引入重 schema 负担。
- **可增量：**v1 仅用 FTS 即可有用；语义向量与图谱可选升级。
- **代理友好：**便于在 token 预算内“回忆”（返回小批事实）。

## 北极星模型（Hindsight × Letta）

融合两部分：

1) **Letta/MemGPT 风格控制循环**
- 保持一个小型“核心”常驻上下文（人设 + 关键用户事实）
- 其它内容都在上下文之外，通过工具检索
- 记忆写入是显式工具调用（append/replace/insert），持久化后再注入下一轮

2) **Hindsight 风格记忆底座**
- 区分观察到的、相信的、摘要的内容
- 支持 retain/recall/reflect
- 带置信度的观点可随证据演化
- 实体感知检索与时间查询（即便没有完整知识图谱）

## 方案架构（Markdown 真值 + 派生索引）

### 规范存储（git 友好）

`~/clawd` 作为人类可读记忆的真值。

建议的工作区布局：

```
~/clawd/
  memory.md                    # 小而稳定：持久事实 + 偏好（核心倾向）
  memory/
    YYYY-MM-DD.md              # 日志（追加；叙述）
  bank/                        # “类型化”记忆页面（稳定，可审阅）
    world.md                   # 世界客观事实
    experience.md              # 代理经历（第一人称）
    opinions.md                # 主观偏好或判断 + 置信度 + 证据指针
    entities/
      Peter.md
      The-Castle.md
      warelay.md
      ...
```

说明：
- **每日日志就是每日日志**，无需变成 JSON。
- `bank/` 文件是**反思作业**生成的“精选”页，仍可手工编辑。
- `memory.md` 保持“小而核心”：你希望 Clawd 每次会话都看到的内容。

### 派生存储（机器回忆）

在工作区下加入派生索引（不一定纳入 git）：

```
~/clawd/.memory/index.sqlite
```

索引包含：
- SQLite schema 记录事实、实体链接、观点元数据
- SQLite **FTS5** 进行词法回忆（快速、轻量、离线）
- 可选的嵌入表用于语义回忆（仍离线）

索引始终**可由 Markdown 重建**。

## Retain / Recall / Reflect（操作循环）

### Retain：将每日日志规范化为“事实”

Hindsight 的关键洞见：存储**叙事型、可自洽的事实**，而不是碎片化片段。

对 `memory/YYYY-MM-DD.md` 的实用规则：
- 每天结束（或期间）添加 `## Retain`，包含 2 到 5 条：
  - 叙事型（保留跨轮上下文）
  - 自洽（单独阅读也能理解）
  - 带类型与实体标注

示例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (<1500 chars) on WhatsApp; long content goes into files.
```

最小解析：
- 类型前缀：`W`（world）、`B`（experience/biographical）、`O`（opinion）、`S`（observation/summary，通常生成）
- 实体：`@Peter`、`@warelay` 等（slug 映射到 `bank/entities/*.md`）
- 观点置信度：`O(c=0.0..1.0)` 可选

如果不希望作者思考这些：反思作业可从日志内容中推断这些条目，但显式 `## Retain` 是最容易提升质量的杠杆。

### Recall：对派生索引查询

回忆应支持：
- **词法**：精确术语、名称、命令（FTS5）
- **实体**：“告诉我关于 X”（实体页 + 关联事实）
- **时间**：“11 月 27 日附近发生了什么”或“自上周以来”
- **观点**：“Peter 喜欢什么”（带置信度与证据）

返回格式应对代理友好且可追溯：
- `kind`（`world|experience|opinion|observation`）
- `timestamp`（来源日期，或解析出的时间范围）
- `entities`（`["Peter","warelay"]`）
- `content`（叙事事实）
- `source`（`memory/2025-11-27.md#L12` 等）

### Reflect：生成稳定页面并更新信念

反思是定时作业（每日或心跳 `ultrathink`），用于：
- 从近期事实更新 `bank/entities/*.md`（实体摘要）
- 基于强化或矛盾更新 `bank/opinions.md` 的置信度
- 可选地建议编辑 `memory.md`（“核心”持久事实）

观点演化（简单且可解释）：
- 每条观点包含：
  - 陈述
  - 置信度 `c ∈ [0,1]`
  - last_updated
  - 证据链接（支持与反驳的事实 ID）
- 当新事实到来：
  - 通过实体重叠与相似度找候选观点（先 FTS，后嵌入）
  - 小幅更新置信度；大幅跃迁需要强矛盾与重复证据

## CLI 集成：独立 vs 深度集成

建议：**深度集成 Moltbot**，但保留可分离的核心库。

### 为什么集成到 Moltbot
- Moltbot 已知道：
  - 工作区路径（`agents.defaults.workspace`）
  - 会话模型与心跳
  - 日志与排障模式
- 希望代理直接调用工具：
  - `moltbot memory recall "…" --k 25 --since 30d`
  - `moltbot memory reflect --since 7d`

### 为什么仍拆分库
- 让记忆逻辑可在无 gateway 或运行时下测试
- 复用于其它场景（本地脚本、未来桌面应用等）

形态：
记忆工具计划是一个小型 CLI + 库层，但目前仅为探索。

## “S-Collide” 或 SuCo：何时使用（研究）

若 “S-Collide” 指 **SuCo（Subspace Collision）**：这是一种 ANN 检索方法，通过子空间碰撞获得较好的召回与延迟权衡（论文：arXiv 2411.14754, 2024）。

对 `~/clawd` 的务实结论：
- **不要一开始就用** SuCo。
- 先用 SQLite FTS +（可选）简单嵌入，即可获得大部分体验收益。
- 只有在以下条件满足时再考虑 SuCo/HNSW/ScaNN 类方案：
  - 语料足够大（数万到数十万 chunk）
  - 纯嵌入检索变慢
  - 词法检索成为明显瓶颈

离线友好替代（复杂度从低到高）：
- SQLite FTS5 + 元数据过滤（零 ML）
- 嵌入 + 暴力搜索（在低 chunk 数量时非常可用）
- HNSW 索引（常见、稳健，需要库绑定）
- SuCo（研究级；仅在有稳定实现可嵌入时考虑）

开放问题：
- 在你的机器（laptop + desktop）上用于“个人助理记忆”的**最佳**离线嵌入模型是什么？
  - 如果已使用 Ollama：使用本地模型做嵌入；否则在工具链中带一个小型嵌入模型。

## 最小可用试点

如果你想要一个最小但仍有用的版本：

- 添加 `bank/` 实体页面与每日日志的 `## Retain` 部分。
- 使用 SQLite FTS 做回忆并带引用（路径 + 行号）。
- 仅在回忆质量或规模要求时再加嵌入。

## 参考

- Letta / MemGPT 概念：“core memory blocks” + “archival memory” + tool-driven self-editing memory。
- Hindsight 技术报告：“retain / recall / reflect”、四网络记忆、叙事事实抽取、观点置信度演化。
- SuCo：arXiv 2411.14754（2024）：Subspace Collision 近似近邻检索。
