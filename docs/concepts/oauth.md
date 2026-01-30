---
summary: "Moltbot 中的 OAuth：令牌交换、存储和多账户模式"
read_when:
  - 您想了解 Moltbot OAuth 端到端流程
  - 您遇到令牌失效/登出问题
  - 您想了解 setup-token 或 OAuth 认证流程
  - 您想了解多账户或配置文件路由
---
# OAuth

Moltbot 通过 OAuth 支持"订阅认证"，适用于提供此功能的提供商（特别是 **OpenAI Codex（ChatGPT OAuth）**）。对于 Anthropic 订阅，请使用 **setup-token** 流程。本页说明：

- OAuth **令牌交换**的工作原理（PKCE）
- 令牌**存储**的位置（及原因）
- 如何处理**多账户**（配置文件 + 每会话覆盖）

Moltbot 还支持**提供商插件**，这些插件提供自己的 OAuth 或 API 密钥流程。通过以下方式运行：

```bash
moltbot models auth login --provider <id>
```

## 令牌汇聚点（存在原因）

OAuth 提供商通常在登录/刷新流程中生成**新的刷新令牌**。某些提供商（或 OAuth 客户端）在为同一用户/应用发出新令牌时可能会使旧的刷新令牌失效。

实际症状：
- 您通过 Moltbot *和* Claude Code / Codex CLI 登录 → 其中一个稍后会随机"登出"

为减少这种情况，Moltbot 将 `auth-profiles.json` 视为**令牌汇聚点**：
- 运行时从**一个位置**读取凭据
- 我们可以保留多个配置文件并确定性地路由它们

## 存储（令牌位置）

密钥按**每个代理**存储：

- 认证配置文件（OAuth + API 密钥）：`~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`
- 运行时缓存（自动管理；请勿编辑）：`~/.clawdbot/agents/<agentId>/agent/auth.json`

仅用于导入的旧文件（仍然支持，但不是主存储）：
- `~/.clawdbot/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）

以上所有内容也遵循 `$CLAWDBOT_STATE_DIR`（状态目录覆盖）。完整参考：[/gateway/configuration](/gateway/configuration#auth-storage-oauth--api-keys)

## Anthropic setup-token（订阅认证）

在任何机器上运行 `claude setup-token`，然后将其粘贴到 Moltbot：

```bash
moltbot models auth setup-token --provider anthropic
```

如果您在其他地方生成了令牌，请手动粘贴：

```bash
moltbot models auth paste-token --provider anthropic
```

验证：

```bash
moltbot models status
```

## OAuth 交换（登录工作原理）

Moltbot 的交互式登录流程在 `@mariozechner/pi-ai` 中实现，并连接到向导/命令。

### Anthropic（Claude Pro/Max）setup-token

流程形式：

1) 运行 `claude setup-token`
2) 将令牌粘贴到 Moltbot
3) 存储为令牌认证配置文件（无刷新）

向导路径是 `moltbot onboard` → 认证选择 `setup-token`（Anthropic）。

### OpenAI Codex（ChatGPT OAuth）

流程形式（PKCE）：

1) 生成 PKCE 验证器/挑战 + 随机 `state`
2) 打开 `https://auth.openai.com/oauth/authorize?...`
3) 尝试在 `http://127.0.0.1:1455/auth/callback` 捕获回调
4) 如果回调无法绑定（或您在远程/无头环境），粘贴重定向 URL/代码
5) 在 `https://auth.openai.com/oauth/token` 交换
6) 从访问令牌中提取 `accountId` 并存储 `{ access, refresh, expires, accountId }`

向导路径是 `moltbot onboard` → 认证选择 `openai-codex`。

## 刷新 + 过期

配置文件存储 `expires` 时间戳。

运行时：
- 如果 `expires` 在未来 → 使用存储的访问令牌
- 如果已过期 → 刷新（在文件锁下）并覆盖存储的凭据

刷新流程是自动的；您通常不需要手动管理令牌。

## 多账户（配置文件）+ 路由

两种模式：

### 1) 推荐：独立代理

如果您希望"个人"和"工作"永不交互，请使用隔离的代理（独立的会话 + 凭据 + 工作区）：

```bash
moltbot agents add work
moltbot agents add personal
```

然后为每个代理配置认证（向导）并将聊天路由到正确的代理。

### 2) 高级：一个代理中的多个配置文件

`auth-profiles.json` 支持同一提供商的多个配置文件 ID。

选择使用哪个配置文件：
- 通过配置排序全局设置（`auth.order`）
- 通过 `/model ...@<profileId>` 按会话设置

示例（会话覆盖）：
- `/model Opus@anthropic:work`

如何查看存在哪些配置文件 ID：
- `moltbot channels list --json`（显示 `auth[]`）

相关文档：
- [/concepts/model-failover](/concepts/model-failover)（轮换 + 冷却规则）
- [/tools/slash-commands](/tools/slash-commands)（命令界面）
