---
summary: "通过 zca-cli（扫码登录）支持 Zalo 个人账号：能力与配置"
read_when:
  - 为 Moltbot 设置 Zalo 个人号
  - 排查 Zalo 个人号登录或消息流程
---
# Zalo Personal（非官方）

状态：实验性。此集成通过 `zca-cli` 自动化**个人 Zalo 账号**。

> **警告：** 此为非官方集成，可能导致账号被限制/封禁。风险自担。

## 需要插件
Zalo Personal 作为插件提供，不随核心安装包附带。
- 通过 CLI 安装：`moltbot plugins install @moltbot/zalouser`
- 或从源码检出安装：`moltbot plugins install ./extensions/zalouser`
- 详情：见 [插件](/plugin)

## 前置条件：zca-cli
Gateway 主机必须在 `PATH` 中可用 `zca`。

- 验证：`zca --version`
- 若缺失，请安装 zca-cli（见 `extensions/zalouser/README.md` 或上游文档）。

## 快速上手（新手）
1) 安装插件（见上）。
2) 登录（扫码，在 Gateway 主机上）：
   - `moltbot channels login --channel zalouser`
   - 用 Zalo 手机端扫描终端二维码。
3) 启用渠道：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing"
    }
  }
}
```

4) 重启 gateway（或完成引导）。
5) 私聊默认配对；首次联系时批准配对码。

## 这是什么
- 使用 `zca listen` 接收入站消息。
- 使用 `zca msg ...` 发送回复（文本/媒体/链接）。
- 适用于无法使用 Zalo Bot API 的“个人账号”场景。

## 命名
渠道 id 为 `zalouser`，明确它自动化**个人 Zalo 用户账号**（非官方）。`zalo` 保留给未来可能的官方 Zalo API 集成。

## 查找 ID（目录）
使用目录 CLI 发现联系人/群组及其 ID：

```bash
moltbot directory self --channel zalouser
moltbot directory peers list --channel zalouser --query "name"
moltbot directory groups list --channel zalouser --query "work"
```

## 限制
- 出站文本按约 2000 字符分块（Zalo 客户端限制）。
- 流式默认被阻止。

## 访问控制（私聊）
`channels.zalouser.dmPolicy` 支持：`pairing | allowlist | open | disabled`（默认：`pairing`）。
`channels.zalouser.allowFrom` 接受用户 ID 或名称。向导在可用时通过 `zca friend find` 解析名称为 ID。

批准方式：
- `moltbot pairing list zalouser`
- `moltbot pairing approve zalouser <code>`

## 群聊访问（可选）
- 默认：`channels.zalouser.groupPolicy = "open"`（允许群聊）。可用 `channels.defaults.groupPolicy` 覆盖未设置时的默认值。
- 用 allowlist 限制：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（key 为群 ID 或名称）
- 禁用所有群聊：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可提示群 allowlist。
- 启动时 Moltbot 会将 allowlist 中的群/用户名称解析为 ID 并记录映射；无法解析的条目保留原样。

示例：
```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "123456789": { allow: true },
        "Work Chat": { allow: true }
      }
    }
  }
}
```

## 多账号
账号映射到 zca profiles。示例：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        work: { enabled: true, profile: "work" }
      }
    }
  }
}
```

## 故障排查

**找不到 `zca`：**
- 安装 zca-cli 并确保 Gateway 进程的 `PATH` 中可用。

**登录不生效：**
- `moltbot channels status --probe`
- 重新登录：`moltbot channels logout --channel zalouser && moltbot channels login --channel zalouser`
