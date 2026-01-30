---
summary: "将 Claude Max/Pro 订阅作为 OpenAI 兼容 API 端点使用"
read_when:
  - 想用 Claude Max 订阅配合 OpenAI 兼容工具
  - 想要一个本地 API 服务器来封装 Claude Code CLI
  - 想用订阅替代 API key 节省费用
---
# Claude Max API Proxy

**claude-max-api-proxy** 是一个社区工具，可将你的 Claude Max/Pro 订阅暴露为 OpenAI 兼容 API 端点。这样你就能用支持 OpenAI API 格式的工具来使用订阅。

## 为什么用它

| 方案 | 成本 | 适合 |
|----------|------|----------|
| Anthropic API | 按 token 计费（Opus 约 $15/M 输入，$75/M 输出） | 生产应用、高流量 |
| Claude Max 订阅 | $200/月固定 | 个人使用、开发、无限量 |

如果你有 Claude Max 订阅并希望与 OpenAI 兼容工具配合使用，该代理可节省大量成本。

## 工作原理

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

该代理：
1. 在 `http://localhost:3456/v1/chat/completions` 接收 OpenAI 格式请求
2. 转换为 Claude Code CLI 命令
3. 以 OpenAI 格式返回响应（支持流式）

## 安装

```bash
# 需要 Node.js 20+ 与 Claude Code CLI
npm install -g claude-max-api-proxy

# 确认 Claude CLI 已认证
claude --version
```

## 使用

### 启动服务

```bash
claude-max-api
# 服务运行在 http://localhost:3456
```

### 测试

```bash
# 健康检查
curl http://localhost:3456/health

# 列出模型
curl http://localhost:3456/v1/models

# Chat completion
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 与 Moltbot 配合

你可以把 Moltbot 指向该代理，作为自定义 OpenAI 兼容端点：

```json5
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1"
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" }
    }
  }
}
```

## 可用模型

| 模型 ID | 映射到 |
|----------|---------|
| `claude-opus-4` | Claude Opus 4 |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4` | Claude Haiku 4 |

## macOS 自动启动

创建 LaunchAgent 自动运行代理：

```bash
cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
```

## 链接

- **npm:** https://www.npmjs.com/package/claude-max-api-proxy
- **GitHub:** https://github.com/atalovesyou/claude-max-api-proxy
- **Issues:** https://github.com/atalovesyou/claude-max-api-proxy/issues

## 说明

- 这是**社区工具**，非 Anthropic 或 Moltbot 官方支持
- 需要已认证的 Claude Max/Pro 订阅（Claude Code CLI）
- 代理在本地运行，不会把数据发送到第三方服务器
- 完全支持流式响应

## 另见

- [Anthropic provider](/providers/anthropic) - Moltbot 原生集成，支持 setup-token 或 API key
- [OpenAI provider](/providers/openai) - 适用于 OpenAI/Codex 订阅
