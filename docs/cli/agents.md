---
summary: "`moltbot agents` 的 CLI 参考（列出、添加、删除、设置身份）"
read_when:
  - 想使用多个隔离代理（工作区 + 路由 + 认证）
---

# `moltbot agents`

管理隔离代理（工作区 + 认证 + 路由）。

相关：
- 多代理路由：[Multi-Agent Routing](/concepts/multi-agent)
- 代理工作区：[Agent workspace](/concepts/agent-workspace)

## 示例

```bash
moltbot agents list
moltbot agents add work --workspace ~/clawd-work
moltbot agents set-identity --workspace ~/clawd --from-identity
moltbot agents set-identity --agent main --avatar avatars/clawd.png
moltbot agents delete work
```

## 身份文件

每个代理工作区根目录可以包含一个 `IDENTITY.md`：
- 示例路径：`~/clawd/IDENTITY.md`
- `set-identity --from-identity` 会从工作区根目录读取（或显式指定 `--identity-file`）

头像路径相对于工作区根目录解析。

## 设置身份

`set-identity` 会写入 `agents.list[].identity`：
- `name`
- `theme`
- `emoji`
- `avatar`（工作区相对路径、http(s) URL 或 data URI）

从 `IDENTITY.md` 加载：

```bash
moltbot agents set-identity --workspace ~/clawd --from-identity
```

显式覆盖字段：

```bash
moltbot agents set-identity --agent main --name "Clawd" --emoji "🦞" --avatar avatars/clawd.png
```

配置示例：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Clawd",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/clawd.png"
        }
      }
    ]
  }
}
```
