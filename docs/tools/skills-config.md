---
summary: "技能配置 schema 与示例"
read_when:
  - 添加或修改技能配置
  - 调整内置 allowlist 或安装行为
---
# 技能配置

所有技能相关的配置都在 `~/.clawdbot/moltbot.json` 的 `skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: [
        "~/Projects/agent-scripts/skills",
        "~/Projects/oss/some-skill-pack/skills"
      ],
      watch: true,
      watchDebounceMs: 250
    },
    install: {
      preferBrew: true,
      nodeManager: "npm" // npm | pnpm | yarn | bun (Gateway 运行时仍为 Node；不推荐 bun)
    },
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE"
        }
      },
      peekaboo: { enabled: true },
      sag: { enabled: false }
    }
  }
}
```

## 字段

- `allowBundled`：仅对**内置**技能生效的可选 allowlist。设置后仅列表内的内置技能可用（不影响 managed/workspace 技能）。
- `load.extraDirs`：额外的技能目录（最低优先级）。
- `load.watch`：监听技能目录并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：监听事件去抖毫秒数（默认：250）。
- `install.preferBrew`：优先使用 brew 安装器（默认：true）。
- `install.nodeManager`：Node 安装器偏好（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这只影响**技能安装**；Gateway 运行时仍应使用 Node（WhatsApp/Telegram 不推荐 Bun）。
- `entries.<skillKey>`：按技能的覆盖配置。

按技能字段：
- `enabled`：设为 `false` 可禁用技能，即使它是内置或已安装。
- `env`：为 agent 运行注入环境变量（仅在未设置时注入）。
- `apiKey`：给声明主 env 变量的技能提供的便捷字段。

## 说明

- `entries` 下的键默认对应技能名。如果技能定义了 `metadata.moltbot.skillKey`，请使用该 key。
- 启用 watcher 时，技能变更会在下一次 agent 轮次中生效。

### 沙箱技能与环境变量

当会话处于**沙箱**时，技能进程运行在 Docker 中。沙箱**不会**继承宿主机的 `process.env`。

可用方式：
- `agents.defaults.sandbox.docker.env`（或按 agent 的 `agents.list[].sandbox.docker.env`）
- 将 env 直接写入自定义沙箱镜像

全局 `env` 与 `skills.entries.<skill>.env/apiKey` 仅对**宿主机**运行生效。
