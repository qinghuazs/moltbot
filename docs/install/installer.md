---
summary: "安装器脚本如何工作（install.sh + install-cli.sh）、参数与自动化"
read_when:
  - 你想了解 `molt.bot/install.sh`
  - 你想自动化安装（CI 或无头环境）
  - 你想从 GitHub 检出目录安装
---

# 安装器内部机制

Moltbot 提供两个安装脚本（由 `molt.bot` 提供）：

- `https://molt.bot/install.sh` — “推荐”安装器（默认全局 npm 安装；也可从 GitHub 检出目录安装）
- `https://molt.bot/install-cli.sh` — 适合无 root 的 CLI 安装器（安装到自定义前缀并自带 Node）
- `https://molt.bot/install.ps1` — Windows PowerShell 安装器（默认 npm，可选 git 安装）

要查看当前参数和行为，请运行：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --help
```

Windows（PowerShell）帮助：

```powershell
& ([scriptblock]::Create((iwr -useb https://molt.bot/install.ps1))) -?
```

如果安装完成但在新终端中找不到 `moltbot`，通常是 Node/npm 的 PATH 问题。参见：[Install](/install#nodejs--npm-path-sanity)。

## install.sh（推荐）

它做了什么（高层概览）：

- 检测系统（macOS / Linux / WSL）。
- 确保 Node.js **22+**（macOS 通过 Homebrew；Linux 通过 NodeSource）。
- 选择安装方式：
  - `npm`（默认）：`npm install -g moltbot@latest`
  - `git`：克隆并构建源码检出，安装包装脚本
- 在 Linux 上：当需要时，把 npm 的 prefix 切到 `~/.npm-global`，避免全局权限错误。
- 如果是升级已有安装：运行 `moltbot doctor --non-interactive`（尽力执行）。
- 对 git 安装：安装或更新后运行 `moltbot doctor --non-interactive`（尽力执行）。
- 通过默认 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 缓解 `sharp` 原生安装问题（避免使用系统 libvips 构建）。

如果你**希望** `sharp` 链接到全局安装的 libvips（或在调试），设置：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL https://molt.bot/install.sh | bash
```

### 可发现性和“git 安装”提示

如果你在**已经处于 Moltbot 源码检出目录**中运行安装器（通过 `package.json` + `pnpm-workspace.yaml` 检测），它会提示：

- 更新并使用当前检出目录（`git`）
- 或迁移到全局 npm 安装（`npm`）

在非交互环境（无 TTY / `--no-prompt`）中，必须传 `--install-method git|npm`（或设置 `CLAWDBOT_INSTALL_METHOD`），否则脚本会以 `2` 退出。

### 为什么需要 Git

`--install-method git` 路径需要 Git（克隆或拉取）。

对于 `npm` 安装，通常不需要 Git，但在某些环境中仍可能需要（例如某个包或依赖通过 git URL 获取）。安装器目前会确保 Git 存在，以避免新发行版上出现 `spawn git ENOENT` 的意外。

### 为什么新 Linux 上 npm 会报 `EACCES`

在一些 Linux 环境（尤其是通过系统包管理器或 NodeSource 安装 Node 时），npm 的全局 prefix 指向 root 所有的目录。此时 `npm install -g ...` 会因 `EACCES` / `mkdir` 权限错误失败。

`install.sh` 会把 prefix 切换到：

- `~/.npm-global`（并在存在时把它加入 `~/.bashrc` / `~/.zshrc` 的 `PATH`）

## install-cli.sh（非 root 的 CLI 安装器）

该脚本把 `moltbot` 安装到一个前缀目录（默认：`~/.clawdbot`），同时在该前缀下安装专用的 Node 运行时，因此适用于你不想修改系统 Node/npm 的机器。

帮助：

```bash
curl -fsSL https://molt.bot/install-cli.sh | bash -s -- --help
```

## install.ps1（Windows PowerShell）

它做了什么（高层概览）：

- 确保 Node.js **22+**（winget/Chocolatey/Scoop 或手动）。
- 选择安装方式：
  - `npm`（默认）：`npm install -g moltbot@latest`
  - `git`：克隆并构建源码检出，安装包装脚本
- 在升级或 git 安装时运行 `moltbot doctor --non-interactive`（尽力执行）。

示例：

```powershell
iwr -useb https://molt.bot/install.ps1 | iex
```

```powershell
iwr -useb https://molt.bot/install.ps1 | iex -InstallMethod git
```

```powershell
iwr -useb https://molt.bot/install.ps1 | iex -InstallMethod git -GitDir "C:\\moltbot"
```

环境变量：

- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`

Git 要求：

如果选择 `-InstallMethod git` 且缺少 Git，安装器会打印
Git for Windows 链接（`https://git-scm.com/download/win`）并退出。

常见 Windows 问题：

- **npm error spawn git / ENOENT**：安装 Git for Windows，重开 PowerShell，再次运行安装器。
- **"moltbot" is not recognized**：你的 npm 全局 bin 目录不在 PATH 中。多数系统使用
  `%AppData%\\npm`。你也可以运行 `npm config get prefix` 并把 `\\bin` 加到 PATH，然后重开 PowerShell。
