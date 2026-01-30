---
summary: "在 Moltbot 中使用 OpenCode Zen（精选模型）"
read_when:
  - 想用 OpenCode Zen 获取模型
  - 需要一份面向编码的精选模型列表
---
# OpenCode Zen

OpenCode Zen 是 OpenCode 团队为编码代理推荐的**精选模型列表**。它是一个可选的托管模型访问路径，使用 API key 与 `opencode` provider。Zen 当前为 beta。

## CLI 设置

```bash
moltbot onboard --auth-choice opencode-zen
# 或非交互
moltbot onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-5" } } }
}
```

## 说明

- 也支持 `OPENCODE_ZEN_API_KEY`。
- 登录 Zen 后添加计费信息并复制 API key。
- OpenCode Zen 按请求计费，详情请查看 OpenCode 仪表盘。
