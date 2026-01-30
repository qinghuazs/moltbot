---
summary: "npm 与 macOS 应用的发布清单（逐步）"
read_when:
  - 切一个新的 npm 版本
  - 切一个新的 macOS 应用版本
  - 发布前验证元数据
---

# 发布清单（npm 与 macOS）

在仓库根目录使用 `pnpm`（Node 22+）。打 tag 或发布前保持工作树干净。

## 操作员触发
当操作员说“release”时，立即执行以下预检（除非被阻断，不要额外提问）：
- 阅读本文档与 `docs/platforms/mac/release.md`。
- 从 `~/.profile` 加载环境变量并确认 `SPARKLE_PRIVATE_KEY_FILE` 与 App Store Connect 变量已设置（`SPARKLE_PRIVATE_KEY_FILE` 应位于 `~/.profile`）。
- 如需使用 Sparkle key，从 `~/Library/CloudStorage/Dropbox/Backup/Sparkle` 获取。

1) **版本与元数据**
- [ ] 提升 `package.json` 版本（例如 `2026.1.27-beta.1`）。
- [ ] 运行 `pnpm plugins:sync` 同步扩展包版本与变更日志。
- [ ] 更新 CLI 与版本字符串：[`src/cli/program.ts`](https://github.com/moltbot/moltbot/blob/main/src/cli/program.ts) 以及 [`src/provider-web.ts`](https://github.com/moltbot/moltbot/blob/main/src/provider-web.ts) 中的 Baileys 用户代理。
- [ ] 确认包元数据（name、description、repository、keywords、license）以及 `bin` 指向 [`moltbot.mjs`](https://github.com/moltbot/moltbot/blob/main/moltbot.mjs)。
- [ ] 若依赖变更，运行 `pnpm install` 更新 `pnpm-lock.yaml`。

2) **构建与产物**
- [ ] 若 A2UI 输入变更，运行 `pnpm canvas:a2ui:bundle` 并提交更新的 [`src/canvas-host/a2ui/a2ui.bundle.js`](https://github.com/moltbot/moltbot/blob/main/src/canvas-host/a2ui/a2ui.bundle.js)。
- [ ] `pnpm run build`（生成 `dist/`）。
- [ ] 验证 npm 包的 `files` 覆盖必要 `dist/*` 目录（尤其 `dist/node-host/**` 与 `dist/acp/**` 用于无界面节点与 ACP CLI）。
- [ ] 确认 `dist/build-info.json` 存在且包含预期 `commit` hash（npm 安装时 CLI banner 使用）。
- [ ] 可选：构建后运行 `npm pack --pack-destination /tmp` 并检查 tarball 内容，可用于 GitHub release（**不要**提交）。

3) **变更日志与文档**
- [ ] 更新 `CHANGELOG.md` 的用户可见要点（若缺失则创建）；条目按版本严格降序。
- [ ] 确保 README 示例或标志与当前 CLI 行为一致（尤其新命令或选项）。

4) **验证**
- [ ] `pnpm lint`
- [ ] `pnpm test`（或需要覆盖率时 `pnpm test:coverage`）
- [ ] `pnpm run build`（测试后最后一次 sanity check）
- [ ] `pnpm release:check`（验证 npm pack 内容）
- [ ] `CLAWDBOT_INSTALL_SMOKE_SKIP_NONROOT=1 pnpm test:install:smoke`（Docker 安装冒烟测试，快速路径；发布前必做）
  - 若上一版本 npm 已知损坏，可设 `CLAWDBOT_INSTALL_SMOKE_PREVIOUS=<last-good-version>` 或 `CLAWDBOT_INSTALL_SMOKE_SKIP_PREVIOUS=1` 用于预安装步骤。
- [ ]（可选）完整安装冒烟（包含非 root + CLI 覆盖）：`pnpm test:install:smoke`
- [ ]（可选）安装 E2E（Docker，运行 `curl -fsSL https://molt.bot/install.sh | bash`，完成 onboarding，再运行真实工具调用）：
  - `pnpm test:install:e2e:openai`（需要 `OPENAI_API_KEY`）
  - `pnpm test:install:e2e:anthropic`（需要 `ANTHROPIC_API_KEY`）
  - `pnpm test:install:e2e`（需要两者，运行两个 provider）
- [ ]（可选）若变更影响发送或接收，抽查 web gateway。

5) **macOS 应用（Sparkle）**
- [ ] 构建并签名 macOS 应用，然后打 zip 发布。
- [ ] 生成 Sparkle appcast（HTML notes 通过 [`scripts/make_appcast.sh`](https://github.com/moltbot/moltbot/blob/main/scripts/make_appcast.sh)）并更新 `appcast.xml`。
- [ ] 准备好 app zip（以及可选 dSYM zip）以附加到 GitHub release。
- [ ] 按 [macOS release](/platforms/mac/release) 的命令与环境变量执行。
  - `APP_BUILD` 必须是数值且单调递增（不要 `-beta`），以便 Sparkle 正确比较版本。
  - 若做公证，使用由 App Store Connect API 环境变量创建的 `moltbot-notary` keychain profile（见 [macOS release](/platforms/mac/release)）。

6) **发布（npm）**
- [ ] 确认 git 状态干净；按需提交与推送。
- [ ] 如需，执行 `npm login`（确认 2FA）。
- [ ] `npm publish --access public`（预发布使用 `--tag beta`）。
- [ ] 校验 registry：`npm view moltbot version`、`npm view moltbot dist-tags`、以及 `npx -y moltbot@X.Y.Z --version`（或 `--help`）。

### 排查（2.0.0-beta2 发布记录）
- **npm pack 或 publish 卡住或生成巨大 tarball**：`dist/Moltbot.app`（以及发布 zip）被打包进 npm。通过 `package.json` 的 `files` 白名单修复（包含 dist 子目录、docs、skills；排除 app bundle）。使用 `npm pack --dry-run` 确认 `dist/Moltbot.app` 不在列表中。
- **npm dist-tag 的认证网页循环**：使用 legacy 认证获取 OTP 提示：
  - `NPM_CONFIG_AUTH_TYPE=legacy npm dist-tag add moltbot@X.Y.Z latest`
- **`npx` 验证失败，提示 `ECOMPROMISED: Lock compromised`**：用新缓存重试：
  - `NPM_CONFIG_CACHE=/tmp/npm-cache-$(date +%s) npx -y moltbot@X.Y.Z --version`
- **后续修复需要重新指向 tag**：强制更新并推送 tag，然后确保 GitHub release 资产一致：
  - `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`

7) **GitHub release 与 appcast**
- [ ] 打 tag 并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`（或 `git push --tags`）。
- [ ] 创建或更新 `vX.Y.Z` 的 GitHub release，**标题使用 `moltbot X.Y.Z`**（不仅是 tag）；正文包含该版本**完整**变更日志（Highlights + Changes + Fixes），内联呈现（不要只放链接），且**正文不得重复标题**。
- [ ] 附加产物：`npm pack` tarball（可选）、`Moltbot-X.Y.Z.zip`、`Moltbot-X.Y.Z.dSYM.zip`（如生成）。
- [ ] 提交更新后的 `appcast.xml` 并推送（Sparkle 从 main 获取）。
- [ ] 在干净的临时目录（无 `package.json`）运行 `npx -y moltbot@X.Y.Z send --help` 以确认安装与 CLI 入口正常。
- [ ] 宣布或分享发布说明。

## 插件发布范围（npm）

我们只发布 `@moltbot/*` 范围内**已有的 npm 插件**。未发布到 npm 的内置插件保持**仅磁盘树**（仍位于 `extensions/**`）。

获取列表的流程：
1) `npm search @moltbot --json` 并记录包名。
2) 与 `extensions/*/package.json` 名称对比。
3) 仅发布交集（已在 npm 上的）。

当前 npm 插件列表（按需更新）：
- @moltbot/bluebubbles
- @moltbot/diagnostics-otel
- @moltbot/discord
- @moltbot/lobster
- @moltbot/matrix
- @moltbot/msteams
- @moltbot/nextcloud-talk
- @moltbot/nostr
- @moltbot/voice-call
- @moltbot/zalo
- @moltbot/zalouser

发布说明还必须提及**新增的可选内置插件**且**默认不启用**（例如 `tlon`）。
