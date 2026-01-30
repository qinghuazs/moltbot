---
summary: "用量追踪界面和凭证要求"
read_when:
  - 你正在接入提供商用量/配额界面
  - 你需要解释用量追踪行为或认证要求
---
# 用量追踪

## 功能说明
- 直接从提供商的用量端点拉取用量/配额数据。
- 不提供估算成本；仅显示提供商报告的时间窗口。

## 显示位置
- 聊天中的 `/status`：带表情符号的状态卡片，显示会话 token 数 + 估算成本（仅 API 密钥）。当可用时，显示**当前模型提供商**的用量。
- 聊天中的 `/usage off|tokens|full`：每次响应的用量页脚（OAuth 仅显示 token 数）。
- 聊天中的 `/usage cost`：从 Moltbot 会话日志汇总的本地成本摘要。
- CLI：`moltbot status --usage` 打印完整的按提供商分类的明细。
- CLI：`moltbot channels list` 在提供商配置旁打印相同的用量快照（使用 `--no-usage` 跳过）。
- macOS 菜单栏：上下文下的"用量"部分（仅在可用时显示）。

## 提供商 + 凭证
- **Anthropic (Claude)**：认证配置文件中的 OAuth 令牌。
- **GitHub Copilot**：认证配置文件中的 OAuth 令牌。
- **Gemini CLI**：认证配置文件中的 OAuth 令牌。
- **Antigravity**：认证配置文件中的 OAuth 令牌。
- **OpenAI Codex**：认证配置文件中的 OAuth 令牌（存在时使用 accountId）。
- **MiniMax**：API 密钥（编程计划密钥；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小时编程计划窗口。
- **z.ai**：通过环境变量/配置/认证存储的 API 密钥。

如果没有匹配的 OAuth/API 凭证，用量将被隐藏。
