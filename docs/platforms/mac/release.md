---
summary: "Moltbot macOS 发布清单（Sparkle feed、打包、签名）"
read_when:
  - 发布或验证 Moltbot macOS 版本
  - 更新 Sparkle appcast 或 feed 资产
---

# Moltbot macOS 发布（Sparkle）

应用现在使用 Sparkle 自动更新。发布构建必须使用 Developer ID 签名、打包为 zip，并发布带签名 appcast 条目。

## 先决条件
- 已安装 Developer ID Application 证书（例如：`Developer ID Application: <Developer Name> (<TEAMID>)`）。
- 环境变量 `SPARKLE_PRIVATE_KEY_FILE` 指向 Sparkle ed25519 私钥路径（公钥已写入 Info.plist）。若缺失请检查 `~/.profile`。
- 如果希望分发通过 Gatekeeper 的 DMG/zip，需要为 `xcrun notarytool` 配置公证凭据（钥匙串 profile 或 API key）。
  - 我们使用 Keychain profile：`moltbot-notary`，来自 shell profile 中的 App Store Connect API key 环境变量：
    - `APP_STORE_CONNECT_API_KEY_P8`、`APP_STORE_CONNECT_KEY_ID`、`APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/moltbot-notary.p8`
    - `xcrun notarytool store-credentials "moltbot-notary" --key /tmp/moltbot-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- 已安装 `pnpm` 依赖（`pnpm install --config.node-linker=hoisted`）。
- Sparkle 工具通过 SwiftPM 自动获取，路径：`apps/macos/.build/artifacts/sparkle/Sparkle/bin/`（`sign_update`、`generate_appcast` 等）。

## 构建与打包

说明：
- `APP_BUILD` 映射到 `CFBundleVersion`/`sparkle:version`；必须是数字且单调递增（不要 `-beta`），否则 Sparkle 比较会相等。
- 默认使用当前架构（`$(uname -m)`）。如需发布/通用构建，设置 `BUILD_ARCHS="arm64 x86_64"`（或 `BUILD_ARCHS=all`）。
- 发布产物使用 `scripts/package-mac-dist.sh`（zip + DMG + notarize）。本地/开发打包使用 `scripts/package-mac-app.sh`。

```bash
# 在仓库根目录；设置发布 ID 以启用 Sparkle feed。
# APP_BUILD 必须是数字且单调递增。
BUNDLE_ID=bot.molt.mac \
APP_VERSION=2026.1.27-beta.1 \
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-app.sh

# 分发用 zip（包含资源 fork，支持 Sparkle 增量更新）
ditto -c -k --sequesterRsrc --keepParent dist/Moltbot.app dist/Moltbot-2026.1.27-beta.1.zip

# 可选：构建带样式的 DMG（拖拽到 /Applications）
scripts/create-dmg.sh dist/Moltbot.app dist/Moltbot-2026.1.27-beta.1.dmg

# 推荐：构建 + 公证 + stapling zip + DMG
# 首次需要创建 keychain profile：
#   xcrun notarytool store-credentials "moltbot-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<app-specific-password>"
NOTARIZE=1 NOTARYTOOL_PROFILE=moltbot-notary \
BUNDLE_ID=bot.molt.mac \
APP_VERSION=2026.1.27-beta.1 \
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# 可选：同时发布 dSYM
ditto -c -k --keepParent apps/macos/.build/release/Moltbot.app.dSYM dist/Moltbot-2026.1.27-beta.1.dSYM.zip
```

## Appcast 条目

使用发布说明生成器让 Sparkle 渲染格式化 HTML：
```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/Moltbot-2026.1.27-beta.1.zip https://raw.githubusercontent.com/moltbot/moltbot/main/appcast.xml
```
该脚本会从 `CHANGELOG.md` 生成 HTML 发布说明（通过 [`scripts/changelog-to-html.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/changelog-to-html.sh)）并嵌入 appcast 条目。
发布时请将更新后的 `appcast.xml` 与发布资产（zip + dSYM）一起提交。

## 发布与验证
- 将 `Moltbot-2026.1.27-beta.1.zip`（以及 `Moltbot-2026.1.27-beta.1.dSYM.zip`）上传到 GitHub tag `v2026.1.27-beta.1` 的 release。
- 确认 raw appcast URL 与内置 feed 匹配：`https://raw.githubusercontent.com/moltbot/moltbot/main/appcast.xml`。
- 健康检查：
  - `curl -I https://raw.githubusercontent.com/moltbot/moltbot/main/appcast.xml` 返回 200。
  - 上传资产后，`curl -I <enclosure url>` 返回 200。
  - 在旧版公开构建中，从 About 标签运行 “Check for Updates...” 并验证 Sparkle 能干净升级。

完成标准：签名应用 + appcast 已发布，旧版本能更新，release 资产已附加到 GitHub release。
