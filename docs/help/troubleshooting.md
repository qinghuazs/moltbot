---
summary: "故障排查中心：症状 → 检查 → 修复"
read_when:
  - 看到错误并想快速定位修复路径
  - 安装器显示成功但 CLI 无法工作
---

# 故障排查

## 前 60 秒

按顺序运行：

```bash
moltbot status
moltbot status --all
moltbot gateway probe
moltbot logs --follow
moltbot doctor
```

如果 gateway 可达，运行深度探测：

```bash
moltbot status --deep
```

## 常见“崩了”场景

### `moltbot: command not found`

几乎总是 Node/npm PATH 问题。从这里开始：

- [Install（Node/npm PATH 自检）](/install#nodejs--npm-path-sanity)

### 安装器失败（或需要完整日志）

用 verbose 模式重跑安装器，查看完整追踪与 npm 输出：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --verbose
```

beta 安装：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --beta --verbose
```

也可以设置 `CLAWDBOT_VERBOSE=1` 替代标志。

### Gateway 显示“unauthorized”、无法连接或反复重连

- [Gateway troubleshooting](/gateway/troubleshooting)
- [Gateway authentication](/gateway/authentication)

### Control UI 通过 HTTP 失败（需要设备身份）

- [Gateway troubleshooting](/gateway/troubleshooting)
- [Control UI](/web/control-ui#insecure-http)

### `docs.molt.bot` 出现 SSL 错误（Comcast/Xfinity）

部分 Comcast/Xfinity 连接会通过 Xfinity Advanced Security 阻止 `docs.molt.bot`。
请关闭 Advanced Security 或将 `docs.molt.bot` 加入允许列表后重试。

- Xfinity Advanced Security 帮助： https://www.xfinity.com/support/articles/using-xfinity-xfi-advanced-security
- 快速自检：尝试手机热点或 VPN，以确认是否为 ISP 层级过滤

### 服务显示运行但 RPC 探测失败

- [Gateway troubleshooting](/gateway/troubleshooting)
- [Background process / service](/gateway/background-process)

### 模型或认证失败（限流、计费、“all models failed”）

- [Models](/cli/models)
- [OAuth / auth concepts](/concepts/oauth)

### `/model` 提示 `model not allowed`

通常表示 `agents.defaults.models` 被配置为允许列表。非空时只能选择其中的 provider/model。

- 查看允许列表：`moltbot config get agents.defaults.models`
- 添加所需模型（或清空允许列表）后重试 `/model`
- 使用 `/models` 浏览允许的 provider/model

### 提交问题时

粘贴安全报告：

```bash
moltbot status --all
```

如能提供，请附上 `moltbot logs --follow` 的相关日志尾部。
