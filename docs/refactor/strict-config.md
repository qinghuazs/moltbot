---
summary: "严格配置校验 + 仅由 doctor 执行迁移"
read_when:
  - 设计或实现配置校验行为
  - 处理配置迁移或 doctor 工作流
  - 处理插件配置 schema 或插件加载门控
---
# 严格配置校验（仅 doctor 迁移）

## 目标
- **拒绝所有未知配置键**（根与嵌套）。
- **拒绝无 schema 的插件配置**，且不加载该插件。
- **移除加载时自动迁移**，迁移仅通过 doctor 执行。
- **启动时自动运行 doctor（dry-run）**，若无效则阻止非诊断命令。

## 非目标
- 加载时保持向后兼容（旧键不自动迁移）。
- 默默丢弃未知键。

## 严格校验规则
- 配置在每一层级都必须严格匹配 schema。
- 未知键为校验错误（根与嵌套均无 passthrough）。
- `plugins.entries.<id>.config` 必须通过插件 schema 校验。
  - 如果插件缺少 schema，**拒绝加载插件**并给出清晰错误。
- 未知 `channels.<id>` 键为错误，除非插件清单声明了该 channel id。
- 所有插件必须包含插件清单（`moltbot.plugin.json`）。

## 插件 schema 强制
- 每个插件在清单中提供严格 JSON Schema。
- 插件加载流程：
  1) 解析插件清单与 schema（`moltbot.plugin.json`）。
  2) 使用 schema 校验配置。
  3) 缺少 schema 或配置无效：阻止插件加载并记录错误。
- 错误信息包含：
  - 插件 id
  - 原因（缺少 schema 或配置无效）
  - 失败校验的路径
- 禁用插件保留其配置，但 Doctor 与日志会给出警告。

## Doctor 流程
- 每次加载配置都运行 Doctor（默认 dry-run）。
- 配置无效时：
  - 输出摘要与可操作的错误。
  - 指引运行：`moltbot doctor --fix`。
- `moltbot doctor --fix`：
  - 应用迁移。
  - 移除未知键。
  - 写回更新后的配置。

## 命令门控（配置无效时）
允许的诊断命令：
- `moltbot doctor`
- `moltbot logs`
- `moltbot health`
- `moltbot help`
- `moltbot status`
- `moltbot gateway status`

其它命令必须硬失败并提示：“Config invalid. Run `moltbot doctor --fix`。”

## 错误 UX 格式
- 单个摘要标题。
- 分组输出：
  - 未知键（完整路径）
  - 旧键或需要迁移
  - 插件加载失败（插件 id + 原因 + 路径）

## 实现触点
- `src/config/zod-schema.ts`：移除 root passthrough；所有对象严格校验。
- `src/config/zod-schema.providers.ts`：确保渠道 schema 严格。
- `src/config/validation.ts`：未知键即失败；不应用旧迁移。
- `src/config/io.ts`：移除加载时自动迁移；始终运行 doctor dry-run。
- `src/config/legacy*.ts`：迁移仅在 doctor 中使用。
- `src/plugins/*`：添加 schema 注册与加载门控。
- CLI 命令门控在 `src/cli`。

## 测试
- 未知键拒绝（根 + 嵌套）。
- 插件缺失 schema -> 插件加载被阻止并给出清晰错误。
- 配置无效 -> gateway 启动被阻止，仅允许诊断命令。
- Doctor dry-run 自动执行；`doctor --fix` 写回纠正后的配置。
