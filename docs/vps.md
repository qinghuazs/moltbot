---
summary: "Moltbot 的 VPS 托管总览（Oracle/Fly/Hetzner/GCP/exe.dev）"
read_when:
  - 你想在云端运行 Gateway
  - 你需要一张 VPS/托管指南的快速地图
---
# VPS 托管

这个总览页会链接到支持的 VPS/托管指南，并在高层说明云端
部署的工作方式。

## 选择提供商

- **Railway**（一键部署 + 浏览器配置）：[Railway](/railway)
- **Northflank**（一键部署 + 浏览器配置）：[Northflank](/northflank)
- **Oracle Cloud（Always Free）**：[Oracle](/platforms/oracle) — $0/月（Always Free，ARM；容量/注册可能比较挑剔）
- **Fly.io**：[Fly.io](/platforms/fly)
- **Hetzner（Docker）**：[Hetzner](/platforms/hetzner)
- **GCP（Compute Engine）**：[GCP](/platforms/gcp)
- **exe.dev**（VM + HTTPS 代理）：[exe.dev](/platforms/exe-dev)
- **AWS（EC2/Lightsail/免费额度）**：同样很好用。视频指南：
  https://x.com/techfrenAJ/status/2014934471095812547

## 云端部署如何工作

- **Gateway 运行在 VPS 上**，并持有状态与工作区。
- 你通过 **Control UI** 或 **Tailscale/SSH** 从笔记本/手机连接。
- 把 VPS 当作事实来源，并 **备份** 状态与工作区。
- 安全默认：让 Gateway 只监听 loopback，并通过 SSH 隧道或 Tailscale Serve 访问。
  如果绑定到 `lan`/`tailnet`，要求配置 `gateway.auth.token` 或 `gateway.auth.password`。

远程访问：[Gateway remote](/gateway/remote)  
平台总览：[Platforms](/platforms)

## 在 VPS 上使用节点

你可以把 Gateway 放在云端，并在本地设备上配对 **节点**
（Mac/iOS/Android/headless）。节点提供本地屏幕/摄像头/画布以及 `system.run`
能力，同时 Gateway 仍留在云端。

文档：[Nodes](/nodes), [Nodes CLI](/cli/nodes)
