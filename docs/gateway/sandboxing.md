---
summary: "Moltbot 沙箱的工作方式：模式、范围、工作区访问与镜像"
title: 沙箱化
read_when: "需要完整的沙箱说明或要调整 agents.defaults.sandbox 时"
status: active
---

# 沙箱化

Moltbot 可在 **Docker 容器内运行工具** 以降低风险。这是 **可选项**，由配置控制（`agents.defaults.sandbox` 或 `agents.list[].sandbox`）。关闭时工具在宿主机运行。Gateway 始终运行在宿主机；启用后工具执行在隔离沙箱内。

这不是完美的安全边界，但在模型“犯蠢”时能显著限制文件系统与进程访问。

## 沙箱化的内容
- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙箱浏览器（`agents.defaults.sandbox.browser`）。
  - 默认情况下，沙箱浏览器会在工具需要时自动启动（确保 CDP 可达）。
    通过 `agents.defaults.sandbox.browser.autoStart` 与 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 配置。
  - `agents.defaults.sandbox.browser.allowHostControl` 允许沙箱会话显式连接宿主机浏览器。
  - `target: "custom"` 可用 allowlist 约束：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

不在沙箱内：
- Gateway 进程本身。
- 任何明确允许在宿主机运行的工具（如 `tools.elevated`）。
  - **Elevated exec 在宿主机运行并绕过沙箱。**
  - 若沙箱关闭，`tools.elevated` 不改变执行位置（已在宿主机）。见 [Elevated Mode](/tools/elevated)。

## 模式
`agents.defaults.sandbox.mode` 控制 **何时** 使用沙箱：
- `"off"`：不使用沙箱。
- `"non-main"`：仅 **非 main** 会话走沙箱（若希望普通聊天在宿主机，这是默认思路）。
- `"all"`：所有会话都走沙箱。
注意：`"non-main"` 基于 `session.mainKey`（默认 `"main"`），而非 agent id。
群聊/通道会话有自己的 key，因此属于 non-main，会进入沙箱。

## 范围
`agents.defaults.sandbox.scope` 控制 **容器数量**：
- `"session"`（默认）：每个会话一个容器。
- `"agent"`：每个 agent 一个容器。
- `"shared"`：所有沙箱会话共享一个容器。

## 工作区访问
`agents.defaults.sandbox.workspaceAccess` 控制 **沙箱能看到什么**：
- `"none"`（默认）：工具看到 `~/.clawdbot/sandboxes` 下的沙箱工作区。
- `"ro"`：以只读方式将 agent 工作区挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：以读写方式将 agent 工作区挂载到 `/workspace`。

入站媒体会复制到当前沙箱工作区（`media/inbound/*`）。
技能说明：`read` 工具以沙箱根目录为基准。`workspaceAccess: "none"` 时，Moltbot 会把可读技能镜像到沙箱工作区（`.../skills`）以便读取；`"rw"` 时，工作区技能可从 `/workspace/skills` 读取。

## 自定义 bind 挂载
`agents.defaults.sandbox.docker.binds` 可把宿主机目录挂载进容器。
格式：`host:container:mode`（例如 `"/home/user/source:/source:rw"`）。

全局与每 agent 的 binds 会 **合并**（不替换）。在 `scope: "shared"` 下会忽略 per-agent binds。

示例（只读源码 + docker socket）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: [
            "/home/user/source:/source:ro",
            "/var/run/docker.sock:/var/run/docker.sock"
          ]
        }
      }
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"]
          }
        }
      }
    ]
  }
}
```

安全说明：
- binds 会绕过沙箱文件系统：它们以你设置的模式（`:ro`/`:rw`）暴露宿主机路径。
- 敏感挂载（如 `docker.sock`、机密、SSH keys）除非必须，否则应 `:ro`。
- 若只需读取工作区，配合 `workspaceAccess: "ro"`；bind 模式仍独立生效。
- binds 与工具策略/elevated 的关系见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)。

## 镜像与设置
默认镜像：`moltbot-sandbox:bookworm-slim`

构建一次：
```bash
scripts/sandbox-setup.sh
```

注意：默认镜像 **不包含 Node**。若技能需要 Node（或其他运行时），请使用自定义镜像，或通过
`sandbox.docker.setupCommand` 安装（需要网络出站 + 可写根目录 + root 用户）。

沙箱浏览器镜像：
```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，沙箱容器 **无网络**。
可通过 `agents.defaults.sandbox.docker.network` 覆盖。

Docker 安装与容器化 gateway 说明见：
[Docker](/install/docker)

## setupCommand（一次性容器设置）
`setupCommand` 在沙箱容器创建后 **只运行一次**（不是每次运行）。
它在容器内通过 `sh -lc` 执行。

路径：
- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每 agent：`agents.list[].sandbox.docker.setupCommand`

常见坑：
- 默认 `docker.network` 为 `"none"`（无出站），包安装会失败。
- `readOnlyRoot: true` 禁止写入；设为 `readOnlyRoot: false` 或使用自定义镜像。
- 包安装需 root 用户（省略 `user` 或设 `user: "0:0"`）。
- 沙箱 exec **不会** 继承宿主机 `process.env`。技能 API key 请用
  `agents.defaults.sandbox.docker.env`（或自定义镜像）。

## 工具策略 + 逃生门

工具 allow/deny 策略在沙箱规则之前生效。若工具在全局或按 agent 被拒，沙箱也不会放行。

`tools.elevated` 是明确的逃生门，用于在宿主机运行 `exec`。
`/exec` 指令只对授权发送者生效并按会话持久化；要硬禁用 `exec`，请用工具策略 deny（见 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：
- 使用 `moltbot sandbox explain` 查看实际沙箱模式、工具策略与修复 key。
- 参考 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated) 的“为什么被拦截”模型。
保持锁定。

## 多 agent 覆盖
每个 agent 可覆盖 sandbox + tools：
`agents.list[].sandbox` 与 `agents.list[].tools`（以及 `agents.list[].tools.sandbox.tools` 用于沙箱工具策略）。
优先级见 [Multi-Agent Sandbox & Tools](/multi-agent-sandbox-tools)。

## 最小启用示例
```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none"
      }
    }
  }
}
```

## 相关文档
- [Sandbox Configuration](/gateway/configuration#agentsdefaults-sandbox)
- [Multi-Agent Sandbox & Tools](/multi-agent-sandbox-tools)
- [Security](/gateway/security)
