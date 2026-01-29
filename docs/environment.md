---
summary: "Moltbot 加载环境变量的位置与优先级"
read_when:
  - 需要知道哪些环境变量会被加载以及顺序
  - 排查 Gateway 中缺失 API key
  - 编写 provider 认证或部署环境文档
---
# 环境变量

Moltbot 会从多个来源读取环境变量。规则是 **绝不覆盖已有值**。

## 优先级（高 → 低）

1) **进程环境**（Gateway 进程从父级 shell/守护进程继承的环境）。
2) **当前工作目录的 `.env`**（dotenv 默认行为；不覆盖已有）。
3) **全局 `.env`**：`~/.clawdbot/.env`（即 `$CLAWDBOT_STATE_DIR/.env`；不覆盖）。
4) **配置文件 `env` 块**：`~/.clawdbot/moltbot.json`（仅在缺失时应用）。
5) **可选登录 shell 导入**（`env.shellEnv.enabled` 或 `CLAWDBOT_LOAD_SHELL_ENV=1`），仅在缺失预期键时导入。

如果配置文件不存在，则跳过第 4 步；若启用 shell 导入，第 5 步仍会执行。

## 配置 `env` 块

两种等价的内联方式（都不覆盖已有值）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-..."
    }
  }
}
```

## Shell env 导入

`env.shellEnv` 会运行登录 shell，并仅导入 **缺失** 的预期键：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  }
}
```

等价环境变量：
- `CLAWDBOT_LOAD_SHELL_ENV=1`
- `CLAWDBOT_SHELL_ENV_TIMEOUT_MS=15000`

## 配置中的环境变量替换

你可以在配置字符串中用 `${VAR_NAME}` 引用环境变量：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}"
      }
    }
  }
}
```

完整细节见 [Configuration: Env var substitution](/gateway/configuration#env-var-substitution-in-config)。

## 相关

- [Gateway configuration](/gateway/configuration)
- [FAQ: env vars and .env loading](/help/faq#env-vars-and-env-loading)
- [Models overview](/concepts/models)
