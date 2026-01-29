---
summary: "符合 schema 的常见 Moltbot 配置示例"
read_when:
  - 学习如何配置 Moltbot
  - 查找配置示例
  - 第一次设置 Moltbot
---
# 配置示例

以下示例与当前配置 schema 对齐。完整参考与字段说明见 [Configuration](/gateway/configuration)。

## 快速开始

### 绝对最小配置
```json5
{
  agent: { workspace: "~/clawd" },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

保存到 `~/.clawdbot/moltbot.json`，然后你可以从该号码私聊机器人。

### 推荐起步配置
```json5
{
  identity: {
    name: "Clawd",
    theme: "helpful assistant",
    emoji: "🦞"
  },
  agent: {
    workspace: "~/clawd",
    model: { primary: "anthropic/claude-sonnet-4-5" }
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## 扩展示例（主要选项）

> JSON5 支持注释与尾逗号，普通 JSON 也可。

```json5
{
  // 环境与 shell
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-..."
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  },

  // 认证配置元数据（密钥在 auth-profiles.json 中）
  auth: {
    profiles: {
      "anthropic:me@example.com": { provider: "anthropic", mode: "oauth", email: "me@example.com" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:default": { provider: "openai", mode: "api_key" },
      "openai-codex:default": { provider: "openai-codex", mode: "oauth" }
    },
    order: {
      anthropic: ["anthropic:me@example.com", "anthropic:work"],
      openai: ["openai:default"],
      "openai-codex": ["openai-codex:default"]
    }
  },

  // 身份
  identity: {
    name: "Samantha",
    theme: "helpful sloth",
    emoji: "🦥"
  },

  // 日志
  logging: {
    level: "info",
    file: "/tmp/moltbot/moltbot.log",
    consoleLevel: "info",
    consoleStyle: "pretty",
    redactSensitive: "tools"
  },

  // 消息格式
  messages: {
    messagePrefix: "[moltbot]",
    responsePrefix: ">",
    ackReaction: "👀",
    ackReactionScope: "group-mentions"
  },

  // 路由与队列
  routing: {
    groupChat: {
      mentionPatterns: ["@clawd", "moltbot"],
      historyLimit: 50
    },
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
        discord: "collect",
        slack: "collect",
        signal: "collect",
        imessage: "collect",
        webchat: "collect"
      }
    }
  },

  // 工具
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          // 可选 CLI 兜底（Whisper 二进制）：
          // { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] }
        ],
        timeoutSeconds: 120
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }]
      }
    }
  },

  // 会话行为
  session: {
    scope: "per-sender",
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 60
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 }
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.clawdbot/agents/default/sessions/sessions.json",
    typingIntervalSeconds: 5,
    sendPolicy: {
      default: "allow",
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } }
      ]
    }
  },

  // 渠道
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15555550123"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    },

    telegram: {
      enabled: true,
      botToken: "YOUR_TELEGRAM_BOT_TOKEN",
      allowFrom: ["123456789"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["123456789"],
      groups: { "*": { requireMention: true } }
    },

    discord: {
      enabled: true,
      token: "YOUR_DISCORD_BOT_TOKEN",
      dm: { enabled: true, allowFrom: ["user"] },
      guilds: {
        "123456789012345678": {
          slug: "friends-of-clawd",
          requireMention: false,
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true }
          }
        }
      }
    },

    slack: {
      enabled: true,
      botToken: "xoxb-REPLACE_ME",
      appToken: "xapp-REPLACE_ME",
      channels: {
        "#general": { allow: true, requireMention: true }
      },
      dm: { enabled: true, allowFrom: ["U123"] },
      slashCommand: {
        enabled: true,
        name: "clawd",
        sessionPrefix: "slack:slash",
        ephemeral: true
      }
    }
  },

  // Agent 运行时
  agents: {
    defaults: {
      workspace: "~/clawd",
      userTimezone: "America/Chicago",
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["anthropic/claude-opus-4-5", "openai/gpt-5.2"]
      },
      imageModel: {
        primary: "openrouter/anthropic/claude-sonnet-4-5"
      },
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "openai/gpt-5.2": { alias: "gpt" }
      },
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      blockStreamingDefault: "off",
      blockStreamingBreak: "text_end",
      blockStreamingChunk: {
        minChars: 800,
        maxChars: 1200,
        breakPreference: "paragraph"
      },
      blockStreamingCoalesce: {
        idleMs: 1000
      },
      humanDelay: {
        mode: "natural"
      },
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      typingIntervalSeconds: 5,
      maxConcurrent: 3,
      heartbeat: {
        every: "30m",
        model: "anthropic/claude-sonnet-4-5",
        target: "last",
        to: "+15555550123",
        prompt: "HEARTBEAT",
        ackMaxChars: 300
      },
      memorySearch: {
        provider: "gemini",
        model: "gemini-embedding-001",
        remote: {
          apiKey: "${GEMINI_API_KEY}"
        },
        extraPaths: ["../team-docs", "/srv/shared-notes"]
      },
      sandbox: {
        mode: "non-main",
        perSession: true,
        workspaceRoot: "~/.clawdbot/sandboxes",
        docker: {
          image: "moltbot-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000"
        },
        browser: {
          enabled: false
        }
      }
    }
  },

  tools: {
    allow: ["exec", "process", "read", "write", "edit", "apply_patch"],
    deny: ["browser", "canvas"],
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000
    },
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        telegram: ["123456789"],
        discord: ["user"],
        slack: ["U123"],
        signal: ["+15555550123"],
        imessage: ["user@example.com"],
        webchat: ["session:demo"]
      }
    }
  },

  // 自定义模型提供方
  models: {
    mode: "merge",
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-responses",
        authHeader: true,
        headers: { "X-Proxy-Region": "us-west" },
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            api: "openai-responses",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000
          }
        ]
      }
    }
  },

  // 定时任务
  cron: {
    enabled: true,
    store: "~/.clawdbot/cron/cron.json",
    maxConcurrentRuns: 2
  },

  // Webhooks
  hooks: {
    enabled: true,
    path: "/hooks",
    token: "shared-secret",
    presets: ["gmail"],
    transformsDir: "~/.clawdbot/hooks",
    mappings: [
      {
        id: "gmail-hook",
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}",
        textTemplate: "{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        to: "+15555550123",
        thinking: "low",
        timeoutSeconds: 300,
        transform: { module: "./transforms/gmail.js", export: "transformGmail" }
      }
    ],
    gmail: {
      account: "moltbot@gmail.com",
      label: "INBOX",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" }
    }
  },

  // 网关与网络
  gateway: {
    mode: "local",
    port: 18789,
    bind: "loopback",
    controlUi: { enabled: true, basePath: "/moltbot" },
    auth: {
      mode: "token",
      token: "gateway-token",
      allowTailscale: true
    },
    tailscale: { mode: "serve", resetOnExit: false },
    remote: { url: "ws://gateway.tailnet:18789", token: "remote-token" },
    reload: { mode: "hybrid", debounceMs: 300 }
  },

  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"]
    },
    install: {
      preferBrew: true,
      nodeManager: "npm"
    },
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" }
      },
      peekaboo: { enabled: true }
    }
  }
}
```

## 常见模式

### 多平台配置
```json5
{
  agent: { workspace: "~/clawd" },
  channels: {
    whatsapp: { allowFrom: ["+15555550123"] },
    telegram: {
      enabled: true,
      botToken: "YOUR_TOKEN",
      allowFrom: ["123456789"]
    },
    discord: {
      enabled: true,
      token: "YOUR_TOKEN",
      dm: { allowFrom: ["yourname"] }
    }
  }
}
```

### OAuth + API 密钥故障切换
```json5
{
  auth: {
    profiles: {
      "anthropic:subscription": {
        provider: "anthropic",
        mode: "oauth",
        email: "me@example.com"
      },
      "anthropic:api": {
        provider: "anthropic",
        mode: "api_key"
      }
    },
    order: {
      anthropic: ["anthropic:subscription", "anthropic:api"]
    }
  },
  agent: {
    workspace: "~/clawd",
    model: {
      primary: "anthropic/claude-sonnet-4-5",
      fallbacks: ["anthropic/claude-opus-4-5"]
    }
  }
}
```

### Anthropic 订阅 + API 密钥，MiniMax 兜底
```json5
{
  auth: {
    profiles: {
      "anthropic:subscription": {
        provider: "anthropic",
        mode: "oauth",
        email: "user@example.com"
      },
      "anthropic:api": {
        provider: "anthropic",
        mode: "api_key"
      }
    },
    order: {
      anthropic: ["anthropic:subscription", "anthropic:api"]
    }
  },
  models: {
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        api: "anthropic-messages",
        apiKey: "${MINIMAX_API_KEY}"
      }
    }
  },
  agent: {
    workspace: "~/clawd",
    model: {
      primary: "anthropic/claude-opus-4-5",
      fallbacks: ["minimax/MiniMax-M2.1"]
    }
  }
}
```

### 工作机器人（受限访问）
```json5
{
  identity: {
    name: "WorkBot",
    theme: "professional assistant"
  },
  agent: {
    workspace: "~/work-clawd",
    elevated: { enabled: false }
  },
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      channels: {
        "#engineering": { allow: true, requireMention: true },
        "#general": { allow: true, requireMention: true }
      }
    }
  }
}
```

### 仅本地模型
```json5
{
  agent: {
    workspace: "~/clawd",
    model: { primary: "lmstudio/minimax-m2.1-gs32" }
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

## 提示

- 如果你设置 `dmPolicy: "open"`，对应的 `allowFrom` 必须包含 `"*"`。
- Provider ID 格式不同（手机号、用户 ID、频道 ID）。请参考对应提供方文档确认格式。
- 后续可选添加的部分：`web`、`browser`、`ui`、`discovery`、`canvasHost`、`talk`、`signal`、`imessage`。
- 更深入的配置说明见 [Providers](/channels/whatsapp) 与 [Troubleshooting](/gateway/troubleshooting)。
