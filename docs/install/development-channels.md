---
summary: "stable、beta、dev 渠道：语义、切换与标记"
read_when:
  - 你想在 stable/beta/dev 之间切换
  - 你在标记或发布预发布版本
---

# 开发渠道

最后更新：2026-01-21

Moltbot 提供三个更新渠道：

- **stable**：npm dist-tag `latest`。
- **beta**：npm dist-tag `beta`（测试中的构建）。
- **dev**：`main` 的滚动头（git）。npm dist-tag：`dev`（发布时）。

我们先把构建发布到 **beta**，测试后**将经过验证的构建提升到 `latest`**，
且不改变版本号。npm 安装以 dist-tag 为准。

## 切换渠道

Git 检出：

```bash
moltbot update --channel stable
moltbot update --channel beta
moltbot update --channel dev
```

- `stable`/`beta` 会检出最新匹配的 tag（经常是同一个）。
- `dev` 切到 `main` 并对上游执行 rebase。

npm/pnpm 全局安装：

```bash
moltbot update --channel stable
moltbot update --channel beta
moltbot update --channel dev
```

这会通过对应的 npm dist-tag（`latest`、`beta`、`dev`）更新。

当你**明确**使用 `--channel` 切换渠道时，Moltbot 也会对齐安装方式：

- `dev` 确保是 git 检出（默认 `~/moltbot`，可用 `CLAWDBOT_GIT_DIR` 覆盖），
  更新该检出并从中安装全局 CLI。
- `stable`/`beta` 则从 npm 使用对应 dist-tag 安装。

提示：如果你想并行使用 stable 与 dev，保留两个 clone 并让 gateway 指向 stable 即可。

## 插件与渠道

使用 `moltbot update` 切换渠道时，Moltbot 也会同步插件来源：

- `dev` 优先使用 git 检出中的内置插件。
- `stable` 和 `beta` 则恢复为 npm 安装的插件包。

## 打 tag 的最佳实践

- 给你希望 git 检出落到的版本打 tag（`vYYYY.M.D` 或 `vYYYY.M.D-<patch>`）。
- 保持 tag 不可变：不要移动或复用 tag。
- npm dist-tag 仍是 npm 安装的真相来源：
  - `latest` → stable
  - `beta` → 候选构建
  - `dev` → main 快照（可选）

## macOS 应用可用性

Beta 和 dev 构建可能**不包含** macOS 应用发布。这是可以接受的：

- git tag 和 npm dist-tag 仍可发布。
- 在发布说明或 changelog 中标注“此 beta 无 macOS 构建”。
