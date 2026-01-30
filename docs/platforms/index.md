---
summary: "平台支持概览（Gateway 与伴侣应用）"
read_when:
  - 查找操作系统支持或安装路径
  - 决定在哪运行 Gateway
---
# 平台

Moltbot 核心用 TypeScript 编写。**推荐的运行时是 Node**。
Gateway 不推荐使用 Bun（WhatsApp/Telegram 有已知问题）。

伴侣应用目前支持 macOS（菜单栏应用）和移动节点（iOS/Android）。
Windows 与 Linux 伴侣应用计划中，但 Gateway 已完全支持。
Windows 原生伴侣应用也在计划中；Gateway 推荐通过 WSL2 运行。

## 选择你的系统

- macOS：[macOS](/platforms/macos)
- iOS：[iOS](/platforms/ios)
- Android：[Android](/platforms/android)
- Windows：[Windows](/platforms/windows)
- Linux：[Linux](/platforms/linux)

## VPS 与托管

- VPS 汇总：[VPS hosting](/vps)
- Fly.io：[Fly.io](/platforms/fly)
- Hetzner（Docker）：[Hetzner](/platforms/hetzner)
- GCP（Compute Engine）：[GCP](/platforms/gcp)
- exe.dev（VM + HTTPS 代理）：[exe.dev](/platforms/exe-dev)

## 常用链接

- 安装指南：[Getting Started](/start/getting-started)
- Gateway 运行手册：[Gateway](/gateway)
- Gateway 配置：[Configuration](/gateway/configuration)
- 服务状态：`moltbot gateway status`

## Gateway 服务安装（CLI）

任选一种（均支持）：

- 向导（推荐）：`moltbot onboard --install-daemon`
- 直接安装：`moltbot gateway install`
- 配置流程：`moltbot configure` → 选择 **Gateway service**
- 修复/迁移：`moltbot doctor`（会提示安装或修复服务）

服务目标与系统相关：
- macOS：LaunchAgent（`bot.molt.gateway` 或 `bot.molt.<profile>`；旧版 `com.clawdbot.*`）
- Linux/WSL2：systemd 用户服务（`moltbot-gateway[-<profile>].service`）
