---
summary: "在沙箱化 macOS 虚拟机中运行 Moltbot（本地或托管）以获得隔离或 iMessage"
read_when:
  - 你想将 Moltbot 与主 macOS 环境隔离
  - 你想在沙箱中使用 iMessage 集成（BlueBubbles）
  - 你需要可重置 可克隆的 macOS 环境
  - 你想比较本地与托管 macOS VM 方案
---

# 在 macOS 虚拟机上运行 Moltbot（沙箱）

## 推荐默认方案（多数用户）

- **小型 Linux VPS** 作为常驻 Gateway，成本低。见 [VPS hosting](/vps)。
- **专用硬件**（Mac mini 或 Linux 机器）用于完全控制并获得**住宅 IP** 进行浏览器自动化。许多网站会屏蔽数据中心 IP，本地浏览通常更稳定。
- **混合方案：** Gateway 放在便宜 VPS 上，需要浏览器或 UI 自动化时把 Mac 作为**节点**连接。见 [Nodes](/nodes) 与 [Gateway remote](/gateway/remote)。

当你确实需要 macOS 专有能力（iMessage/BlueBubbles），或希望与日常 Mac 严格隔离时，使用 macOS VM。

## macOS VM 选项

### 在 Apple Silicon Mac 上本地 VM（Lume）

使用 [Lume](https://cua.ai/docs/lume) 在现有 Apple Silicon Mac 上运行沙箱化 macOS VM。

你将获得：
- 完整且隔离的 macOS 环境（宿主机保持干净）
- 通过 BlueBubbles 支持 iMessage（Linux/Windows 无法实现）
- 通过克隆 VM 实现快速重置
- 无需额外硬件或云成本

### 托管 Mac 提供商（云端）

如果你希望在云端运行 macOS，可使用托管 Mac 服务：
- [MacStadium](https://www.macstadium.com/)（托管 Mac）
- 其他托管 Mac 提供商同样适用；按其 VM + SSH 文档操作

获得 macOS VM 的 SSH 访问后，从下面第 6 步继续。

---

## 快速路径（Lume，熟练用户）

1. 安装 Lume
2. `lume create moltbot --os macos --ipsw latest`
3. 完成 Setup Assistant，启用 Remote Login（SSH）
4. `lume run moltbot --no-display`
5. SSH 进入，安装 Moltbot，配置渠道
6. 完成

---

## 你需要什么（Lume）

- Apple Silicon Mac（M1/M2/M3/M4）
- 宿主机 macOS Sequoia 或更高
- 每个 VM 约 60 GB 可用磁盘空间
- 约 20 分钟

---

## 1) 安装 Lume

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh)"
```

如果 `~/.local/bin` 不在 PATH 中：

```bash
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc
```

验证：

```bash
lume --version
```

文档：[Lume Installation](https://cua.ai/docs/lume/guide/getting-started/installation)

---

## 2) 创建 macOS VM

```bash
lume create moltbot --os macos --ipsw latest
```

这会下载 macOS 并创建 VM。VNC 窗口会自动打开。

说明：下载时间取决于你的网络。

---

## 3) 完成 Setup Assistant

在 VNC 窗口中：
1. 选择语言和地区
2. 跳过 Apple ID（如需 iMessage 可登录）
3. 创建用户账号（记住用户名和密码）
4. 跳过所有可选功能

完成后启用 SSH：
1. 打开 System Settings → General → Sharing
2. 启用 “Remote Login”

---

## 4) 获取 VM 的 IP 地址

```bash
lume get moltbot
```

查看 IP（通常为 `192.168.64.x`）。

---

## 5) SSH 进入 VM

```bash
ssh youruser@192.168.64.X
```

将 `youruser` 替换为你创建的用户，IP 替换为 VM 的 IP。

---

## 6) 安装 Moltbot

在 VM 内：

```bash
npm install -g moltbot@latest
moltbot onboard --install-daemon
```

按引导提示配置模型提供方（Anthropic、OpenAI 等）。

---

## 7) 配置渠道

编辑配置文件：

```bash
nano ~/.clawdbot/moltbot.json
```

添加渠道：

```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "allowFrom": ["+15551234567"]
    },
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN"
    }
  }
}
```

然后登录 WhatsApp（扫码）：

```bash
moltbot channels login
```

---

## 8) 无界面运行 VM

停止 VM 并以无界面方式重启：

```bash
lume stop moltbot
lume run moltbot --no-display
```

VM 会在后台运行。Moltbot 的 daemon 会保持 gateway 运行。

检查状态：

```bash
ssh youruser@192.168.64.X "moltbot status"
```

---

## 加分项：iMessage 集成

这是在 macOS 上运行的杀手级特性。使用 [BlueBubbles](https://bluebubbles.app) 将 iMessage 接入 Moltbot。

在 VM 内：

1. 从 bluebubbles.app 下载 BlueBubbles
2. 使用 Apple ID 登录
3. 启用 Web API 并设置密码
4. 将 BlueBubbles webhooks 指向你的 gateway（示例：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）

在 Moltbot 配置中添加：

```json
{
  "channels": {
    "bluebubbles": {
      "serverUrl": "http://localhost:1234",
      "password": "your-api-password",
      "webhookPath": "/bluebubbles-webhook"
    }
  }
}
```

重启 gateway。现在你的 agent 可以收发 iMessage。

完整设置详情：[BlueBubbles channel](/channels/bluebubbles)

---

## 保存黄金镜像

在继续定制前，先快照干净状态：

```bash
lume stop moltbot
lume clone moltbot moltbot-golden
```

随时重置：

```bash
lume stop moltbot && lume delete moltbot
lume clone moltbot-golden moltbot
lume run moltbot --no-display
```

---

## 7x24 小时运行

保持 VM 运行：
- 保持 Mac 通电
- 在 System Settings → Energy Saver 中关闭睡眠
- 必要时使用 `caffeinate`

真正常驻的方案，请考虑专用 Mac mini 或小型 VPS。见 [VPS hosting](/vps)。

---

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| 无法 SSH 进入 VM | 检查 VM 的 System Settings 中是否启用 “Remote Login” |
| VM IP 不显示 | 等 VM 完全启动后再运行 `lume get moltbot` |
| Lume 命令不存在 | 把 `~/.local/bin` 加入 PATH |
| WhatsApp 二维码无法扫描 | 确保你在 VM 内运行 `moltbot channels login`（不是宿主机） |

---

## 相关文档

- [VPS hosting](/vps)
- [Nodes](/nodes)
- [Gateway remote](/gateway/remote)
- [BlueBubbles channel](/channels/bluebubbles)
- [Lume Quickstart](https://cua.ai/docs/lume/guide/getting-started/quickstart)
- [Lume CLI Reference](https://cua.ai/docs/lume/reference/cli-reference)
- [Unattended VM Setup](https://cua.ai/docs/lume/guide/fundamentals/unattended-setup)（advanced）
- [Docker Sandboxing](/install/docker)（替代隔离方案）
