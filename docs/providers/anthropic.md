---
summary: "在 Moltbot 中通过 API key 或 setup-token 使用 Anthropic Claude"
read_when:
  - 想在 Moltbot 中使用 Anthropic 模型
  - 想使用 setup-token 而不是 API key
---
# Anthropic（Claude）

Anthropic 构建 **Claude** 模型家族，并通过 API 提供访问。
在 Moltbot 中可用 API key 或 **setup-token** 认证。

## 选项 A：Anthropic API key

**适合：**标准 API 访问与按量计费。
在 Anthropic Console 创建 API key。

### CLI 设置

```bash
moltbot onboard
# 选择：Anthropic API key

# 或非交互
moltbot onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### 配置片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 提示缓存（Anthropic API）

Moltbot **不会**覆盖 Anthropic 默认缓存 TTL，除非你显式设置。
这是 **仅 API** 行为；订阅认证不支持 TTL 设置。

按模型设置 TTL，使用模型 `params` 中的 `cacheControlTtl`：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": {
          params: { cacheControlTtl: "5m" } // 或 "1h"
        }
      }
    }
  }
}
```

Moltbot 在 Anthropic API 请求中包含 `extended-cache-ttl-2025-04-11` beta 标志；如果你覆盖 provider headers，请保留它（见 [/gateway/configuration](/gateway/configuration)）。

## 选项 B：Claude setup-token

**适合：**使用 Claude 订阅。

### 获取 setup-token

setup-token 由 **Claude Code CLI** 创建，不在 Anthropic Console。你可以在**任意机器**上运行：

```bash
claude setup-token
```

将 token 粘贴到 Moltbot（向导中选择 **Anthropic token（粘贴 setup-token）**），或者在 gateway 主机上运行：

```bash
moltbot models auth setup-token --provider anthropic
```

如果 token 是在其它机器生成的，请粘贴：

```bash
moltbot models auth paste-token --provider anthropic
```

### CLI 设置

```bash
# 在 onboarding 中粘贴 setup-token
moltbot onboard --auth-choice setup-token
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 说明

- 使用 `claude setup-token` 生成并粘贴，或在 gateway 主机上运行 `moltbot models auth setup-token`。
- 若 Claude 订阅出现 “OAuth token refresh failed …”，请用 setup-token 重新认证。见 [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription)。
- 认证细节与复用规则见 [/concepts/oauth](/concepts/oauth)。

## 故障排查

**401 错误或 token 突然失效**
- Claude 订阅认证可能过期或被撤销。重新运行 `claude setup-token`
  并在 **gateway 主机**粘贴。
- 若 Claude CLI 登录在另一台机器上，请在 gateway 主机运行
  `moltbot models auth paste-token --provider anthropic`。

**未找到 provider "anthropic" 的 API key**
- 认证是**按代理**的。新代理不会继承主代理的 key。
- 为该代理重新 onboarding，或在 gateway 主机粘贴 setup-token 或 API key，然后用 `moltbot models status` 验证。

**未找到配置 `anthropic:default` 的凭据**
- 运行 `moltbot models status` 查看当前生效的认证配置。
- 重新 onboarding，或为该配置粘贴 setup-token 或 API key。

**无可用认证配置（全部冷却或不可用）**
- 使用 `moltbot models status --json` 查看 `auth.unusableProfiles`。
- 添加另一个 Anthropic 配置或等待冷却结束。

更多：[/gateway/troubleshooting](/gateway/troubleshooting) 与 [/help/faq](/help/faq)。
