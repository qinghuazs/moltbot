---
summary: "`moltbot update` 的 CLI 参考（相对安全的源码更新与 gateway 自动重启）"
read_when:
  - 想安全更新源码检出
  - 想了解 `--update` 快捷行为
---

# `moltbot update`

安全更新 Moltbot，并在 stable、beta、dev 渠道之间切换。

如果你通过 **npm/pnpm** 安装（全局安装且无 git 元数据），更新会走 [Updating](/install/updating) 中的包管理流程。

## 用法

```bash
moltbot update
moltbot update status
moltbot update wizard
moltbot update --channel beta
moltbot update --channel dev
moltbot update --tag beta
moltbot update --no-restart
moltbot update --json
moltbot --update
```

## 选项

- `--no-restart`：更新成功后跳过重启 Gateway 服务。
- `--channel <stable|beta|dev>`：设置更新渠道（git + npm；写入配置）。
- `--tag <dist-tag|version>`：仅本次更新覆盖 npm dist-tag 或版本。
- `--json`：输出机器可读 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每一步的超时（默认 1200s）。

说明：降级需要确认，因为旧版本可能破坏配置。

## `update status`

显示活动更新渠道与 git tag/分支/SHA（仅源码检出），并显示更新可用性。

```bash
moltbot update status
moltbot update status --json
moltbot update status --timeout 10
```

选项：
- `--json`：输出机器可读状态 JSON。
- `--timeout <seconds>`：检查超时（默认 3s）。

## `update wizard`

交互式流程用于选择更新渠道，并确认是否在更新后重启 Gateway（默认重启）。
如果在无 git 检出的情况下选择 `dev`，会提示创建检出。

## 做了什么

当你显式切换渠道（`--channel ...`）时，Moltbot 会保持安装方式一致：

- `dev` → 确保有 git 检出（默认：`~/moltbot`，可用 `CLAWDBOT_GIT_DIR` 覆盖），更新它，并从该检出安装全局 CLI。
- `stable`/`beta` → 从 npm 安装匹配的 dist-tag。

## Git 检出流程

渠道：

- `stable`：检出最新非 beta 标签，然后 build + doctor。
- `beta`：检出最新 `-beta` 标签，然后 build + doctor。
- `dev`：检出 `main`，然后 fetch + rebase。

高层流程：

1. 需要干净工作区（无未提交变更）。
2. 切换到选定渠道（tag 或分支）。
3. 获取上游（仅 dev）。
4. 仅 dev：在临时 worktree 中运行 lint 与 TypeScript build 预检；若最新提交失败，最多回退 10 个提交寻找最新可构建版本。
5. 仅 dev：rebase 到选定提交。
6. 安装依赖（优先 pnpm；npm 作为回退）。
7. 构建并构建 Control UI。
8. 运行 `moltbot doctor` 作为最终“安全更新”检查。
9. 将插件同步到活动渠道（dev 使用内置扩展；stable/beta 使用 npm）并更新 npm 安装的插件。

## `--update` 快捷

`moltbot --update` 会改写为 `moltbot update`（便于 shell 和启动脚本）。

## 另见

- `moltbot doctor`（在 git 检出中会提示先运行 update）
- [Development channels](/install/development-channels)
- [Updating](/install/updating)
- [CLI reference](/cli)
