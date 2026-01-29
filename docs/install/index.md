---
summary: "安装 Moltbot（推荐安装器、全局安装或源码安装）"
read_when:
  - 安装 Moltbot
  - 你想从 GitHub 安装
---

# 安装

除非有特殊原因，否则请使用安装器。它会设置 CLI 并运行引导流程。

## 快速安装（推荐）

```bash
curl -fsSL https://molt.bot/install.sh | bash
```

Windows（PowerShell）：

```powershell
iwr -useb https://molt.bot/install.ps1 | iex
```

下一步（如果你跳过了引导流程）：

```bash
moltbot onboard --install-daemon
```

## 系统要求

- **Node >=22**
- macOS、Linux，或通过 WSL2 的 Windows
- 仅在源码构建时需要 `pnpm`

## 选择安装路径

### 1) 安装脚本（推荐）

通过 npm 全局安装 `moltbot` 并运行引导流程。

```bash
curl -fsSL https://molt.bot/install.sh | bash
```

安装器参数：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --help
```

详情：[安装器内部机制](/install/installer)。

非交互模式（跳过引导流程）：

```bash
curl -fsSL https://molt.bot/install.sh | bash -s -- --no-onboard
```

### 2) 全局安装（手动）

如果你已经安装了 Node：

```bash
npm install -g moltbot@latest
```

如果你已全局安装了 libvips（macOS 上通过 Homebrew 很常见）且 `sharp` 安装失败，强制使用预编译二进制：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g moltbot@latest
```

如果看到 `sharp: Please add node-gyp to your dependencies`，要么安装构建工具（macOS：Xcode CLT + `npm install -g node-gyp`），要么使用上面的 `SHARP_IGNORE_GLOBAL_LIBVIPS=1` 变通方案跳过原生编译。

或者：

```bash
pnpm add -g moltbot@latest
```

然后：

```bash
moltbot onboard --install-daemon
```

### 3) 从源码安装（贡献者和开发者）

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
moltbot onboard --install-daemon
```

提示：如果你尚未全局安装，可使用 `pnpm moltbot ...` 运行仓库内命令。

### 4) 其他安装方式

- Docker：[Docker](/install/docker)
- Nix：[Nix](/install/nix)
- Ansible：[Ansible](/install/ansible)
- Bun（仅 CLI）：[Bun](/install/bun)

## 安装后

- 运行引导：`moltbot onboard --install-daemon`
- 快速检查：`moltbot doctor`
- 检查 gateway 健康：`moltbot status` + `moltbot health`
- 打开仪表盘：`moltbot dashboard`

## 安装方式：npm 与 git（安装器）

安装器支持两种方式：

- `npm`（默认）：`npm install -g moltbot@latest`
- `git`：从 GitHub 克隆并构建，在源码检出目录中运行

### CLI 参数

```bash
# 显式 npm
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method npm

# 从 GitHub 安装（源码检出）
curl -fsSL https://molt.bot/install.sh | bash -s -- --install-method git
```

常用参数：

- `--install-method npm|git`
- `--git-dir <path>`（默认：`~/moltbot`）
- `--no-git-update`（使用已有检出目录时跳过 `git pull`）
- `--no-prompt`（禁用提示，CI 或自动化时必需）
- `--dry-run`（只打印将要执行的动作，不做更改）
- `--no-onboard`（跳过引导流程）

### 环境变量

等价的环境变量（便于自动化）：

- `CLAWDBOT_INSTALL_METHOD=git|npm`
- `CLAWDBOT_GIT_DIR=...`
- `CLAWDBOT_GIT_UPDATE=0|1`
- `CLAWDBOT_NO_PROMPT=1`
- `CLAWDBOT_DRY_RUN=1`
- `CLAWDBOT_NO_ONBOARD=1`
- `SHARP_IGNORE_GLOBAL_LIBVIPS=0|1`（默认：`1`；避免 `sharp` 针对系统 libvips 构建）

## 故障排查：找不到 `moltbot`（PATH）

快速诊断：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不在** `echo "$PATH"` 中，你的 shell 无法找到全局 npm 二进制（包括 `moltbot`）。

修复：把它加入 shell 启动文件（zsh：`~/.zshrc`，bash：`~/.bashrc`）：

```bash
# macOS / Linux
export PATH="$(npm prefix -g)/bin:$PATH"
```

Windows 上，将 `npm prefix -g` 的输出加入 PATH。

然后打开新的终端（或在 zsh 中执行 `rehash`，在 bash 中执行 `hash -r`）。

## 更新与卸载

- 更新：[Updating](/install/updating)
- 迁移到新机器：[Migrating](/install/migrating)
- 卸载：[Uninstall](/install/uninstall)
