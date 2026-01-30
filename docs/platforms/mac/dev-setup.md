---
summary: "开发者在 Moltbot macOS 应用上工作的环境搭建指南"
read_when:
  - 搭建 macOS 开发环境
---
# macOS 开发者设置

本指南覆盖从源码构建与运行 Moltbot macOS 应用的必要步骤。

## 先决条件

在构建应用前，请确保已安装：

1. **Xcode 26.2+**：Swift 开发必需。
2. **Node.js 22+ 与 pnpm**：Gateway、CLI 与打包脚本必需。

## 1. 安装依赖

安装项目级依赖：

```bash
pnpm install
```

## 2. 构建并打包应用

构建 macOS 应用并打包到 `dist/Moltbot.app`：

```bash
./scripts/package-mac-app.sh
```

如果你没有 Apple Developer ID 证书，脚本会自动使用 **ad-hoc 签名**（`-`）。

开发运行模式、签名参数与 Team ID 排障见 macOS 应用 README：
https://github.com/moltbot/moltbot/blob/main/apps/macos/README.md

> **提示**：ad-hoc 签名的应用可能触发安全提示。如果应用启动即崩溃并显示 “Abort trap 6”，请看 [Troubleshooting](#troubleshooting)。

## 3. 安装 CLI

macOS 应用需要全局 `moltbot` CLI 来管理后台任务。

**推荐安装方式：**
1. 打开 Moltbot 应用。
2. 进入 **General** 设置页。
3. 点击 **"Install CLI"**。

也可手动安装：
```bash
npm install -g moltbot@<version>
```

## 故障排查

### 构建失败：工具链或 SDK 不匹配

macOS 应用构建要求最新 macOS SDK 与 Swift 6.2 工具链。

**系统依赖（必需）：**
- **Software Update 可用的最新 macOS**（Xcode 26.2 SDK 要求）
- **Xcode 26.2**（Swift 6.2 工具链）

**检查：**
```bash
xcodebuild -version
xcrun swift --version
```

如果版本不匹配，更新 macOS/Xcode 后重新构建。

### 授权时应用崩溃

如果在授权 **Speech Recognition** 或 **Microphone** 时崩溃，可能是 TCC 缓存损坏或签名不匹配。

**修复：**
1. 重置 TCC 权限：
   ```bash
   tccutil reset All bot.molt.mac.debug
   ```
2. 若无效，临时修改 [`scripts/package-mac-app.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/package-mac-app.sh) 中的 `BUNDLE_ID`，强制 macOS 视为“全新应用”。

### Gateway 一直显示 “Starting...”

如果 gateway 状态卡在 “Starting...”，检查是否有僵尸进程占用端口：

```bash
moltbot gateway status
moltbot gateway stop

# 如果未使用 LaunchAgent（开发模式/手动运行），找监听端口：
lsof -nP -iTCP:18789 -sTCP:LISTEN
```
若是手动运行占用端口，请停止进程（Ctrl+C）。必要时可杀掉上面查到的 PID。
