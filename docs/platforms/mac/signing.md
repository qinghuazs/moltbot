---
summary: "打包脚本生成的 macOS 调试构建签名步骤"
read_when:
  - 构建或签名 mac 调试构建
---
# mac 签名（调试构建）

应用通常通过 [`scripts/package-mac-app.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/package-mac-app.sh) 构建，该脚本现在会：

- 设置稳定的 debug bundle 标识：`bot.molt.mac.debug`
- 用该 bundle id 写入 Info.plist（可用 `BUNDLE_ID=...` 覆盖）
- 调用 [`scripts/codesign-mac-app.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/codesign-mac-app.sh) 为主二进制与 app bundle 签名，使 macOS 将每次重建视为同一签名 bundle，并保留 TCC 权限（通知、辅助功能、屏幕录制、麦克风、语音）。要保持权限稳定，请使用真实签名身份；ad-hoc 仅可选且脆弱（见 [macOS permissions](/platforms/mac/permissions)）。
- 默认使用 `CODESIGN_TIMESTAMP=auto`，为 Developer ID 签名启用可信时间戳。设置 `CODESIGN_TIMESTAMP=off` 可跳过时间戳（离线调试构建）。
- 将构建元数据注入 Info.plist：`MoltbotBuildTimestamp`（UTC）与 `MoltbotGitCommit`（短 hash），便于 About 页显示构建、git 与 debug/release 渠道。
- **打包需要 Node 22+**：脚本会运行 TS 构建与 Control UI 构建。
- 从环境读取 `SIGN_IDENTITY`。在 shell rc 中加入 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或 Developer ID Application 证书）以始终使用你的证书签名。ad-hoc 签名需显式开启：`ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"`（不推荐用于权限测试）。
- 签名后运行 Team ID 审计，如果 app bundle 内任意 Mach-O 被不同 Team ID 签名则失败。可设置 `SKIP_TEAM_ID_CHECK=1` 跳过。

## 用法

```bash
# 从仓库根目录运行
scripts/package-mac-app.sh               # 自动选择签名身份；未找到则报错
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # 真实证书
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc（权限不会持久化）
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # 显式 ad-hoc（同上注意）
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # 仅开发：Sparkle Team ID 不匹配的临时方案
```

### Ad-hoc 签名说明

当使用 `SIGN_IDENTITY="-"`（ad-hoc）签名时，脚本会自动禁用 **Hardened Runtime**（`--options runtime`）。这是为避免应用加载未共享 Team ID 的内嵌框架（如 Sparkle）时崩溃。ad-hoc 签名也会破坏 TCC 权限持久化；恢复步骤见 [macOS permissions](/platforms/mac/permissions)。

## About 页构建元数据

`package-mac-app.sh` 会在 bundle 中写入：
- `MoltbotBuildTimestamp`：打包时的 ISO8601 UTC 时间
- `MoltbotGitCommit`：短 git hash（不可用时为 `unknown`）

About 页读取这些键以显示版本、构建日期、git commit，以及是否为 debug 构建（通过 `#if DEBUG`）。代码修改后请重新打包以刷新这些值。

## 原因

TCC 权限与 bundle 标识**和**代码签名绑定。此前未签名的 debug 构建使用变化 UUID，导致 macOS 每次重建后遗忘授权。对二进制进行签名（默认 ad-hoc）并保持固定 bundle id/path（`dist/Moltbot.app`）能在构建间保留授权，类似 VibeTunnel 的做法。
