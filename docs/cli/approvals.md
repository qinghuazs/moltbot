---
summary: "`moltbot approvals` 的 CLI 参考（gateway 或节点主机的 exec 审批）"
read_when:
  - 想通过 CLI 编辑 exec 审批
  - 需要管理 gateway 或节点主机上的允许列表
---

# `moltbot approvals`

管理 **本地主机**、**gateway 主机** 或 **节点主机** 的 exec 审批。
默认情况下命令会指向本地磁盘上的审批文件。使用 `--gateway` 指向 gateway，或用 `--node` 指向特定节点。

相关：
- Exec 审批：[Exec approvals](/tools/exec-approvals)
- 节点：[Nodes](/nodes)

## 常用命令

```bash
moltbot approvals get
moltbot approvals get --node <id|name|ip>
moltbot approvals get --gateway
```

## 从文件替换审批

```bash
moltbot approvals set --file ./exec-approvals.json
moltbot approvals set --node <id|name|ip> --file ./exec-approvals.json
moltbot approvals set --gateway --file ./exec-approvals.json
```

## 允许列表辅助

```bash
moltbot approvals allowlist add "~/Projects/**/bin/rg"
moltbot approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
moltbot approvals allowlist add --agent "*" "/usr/bin/uname"

moltbot approvals allowlist remove "~/Projects/**/bin/rg"
```

## 说明

- `--node` 使用与 `moltbot nodes` 相同的解析器（id、name、ip 或 id 前缀）。
- `--agent` 默认是 `"*"`，表示对所有代理生效。
- 节点主机必须提供 `system.execApprovals.get/set`（macOS app 或无界面节点主机）。
- 审批文件按主机存储于 `~/.clawdbot/exec-approvals.json`。
