---
summary: "Zalo Personal 插件：通过 zca-cli 进行二维码登录与消息（安装 配置 CLI 工具）"
read_when:
  - 你想在 Moltbot 中使用 Zalo 个人账号（非官方）
  - 你在配置或开发 zalouser 插件
---

# Zalo Personal（插件）

通过插件为 Moltbot 提供 Zalo Personal 支持，使用 `zca-cli` 自动化普通 Zalo 个人账号。

> **警告：** 非官方自动化可能导致账号被限制或封禁，风险自担。

## 命名

渠道 id 为 `zalouser`，明确表示这是**个人 Zalo 账号**的非官方自动化。`zalo` 保留给未来可能的官方 Zalo API 集成。

## 运行位置

该插件运行在 **Gateway 进程内**。

如果使用远程 Gateway，请在**运行 Gateway 的机器**上安装与配置，然后重启 Gateway。

## 安装

### 方式 A：从 npm 安装

```bash
moltbot plugins install @moltbot/zalouser
```

随后重启 Gateway。

### 方式 B：从本地目录安装（开发）

```bash
moltbot plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

随后重启 Gateway。

## 前置条件：zca-cli

Gateway 机器必须在 `PATH` 中有 `zca`：

```bash
zca --version
```

## 配置

渠道配置在 `channels.zalouser` 下（不是 `plugins.entries.*`）：

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

## CLI

```bash
moltbot channels login --channel zalouser
moltbot channels logout --channel zalouser
moltbot channels status --probe
moltbot message send --channel zalouser --target <threadId> --message "Hello from Moltbot"
moltbot directory peers list --channel zalouser --query "name"
```

## Agent 工具

工具名：`zalouser`

动作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`
