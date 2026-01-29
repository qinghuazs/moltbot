---
title: "Node.js + npm（PATH 自检）"
summary: "Node.js + npm 安装自检：版本、PATH 与全局安装"
read_when:
  - "你安装了 Moltbot，但 `moltbot` 显示 command not found"
  - "你在新机器上设置 Node.js/npm"
  - "npm install -g ... 因权限或 PATH 失败"
---

# Node.js + npm（PATH 自检）

Moltbot 的运行基线是 **Node 22+**。

如果你能运行 `npm install -g moltbot@latest`，但随后看到 `moltbot: command not found`，几乎总是 **PATH** 问题：npm 放全局二进制的目录不在 shell 的 PATH 中。

## 快速诊断

运行：

```bash
node -v
npm -v
npm prefix -g
echo "$PATH"
```

如果 `$(npm prefix -g)/bin`（macOS/Linux）或 `$(npm prefix -g)`（Windows）**不在** `echo "$PATH"` 中，你的 shell 找不到全局 npm 二进制（包括 `moltbot`）。

## 修复：把 npm 全局 bin 目录加入 PATH

1) 找到你的全局 npm prefix：

```bash
npm prefix -g
```

2) 将全局 npm bin 目录加入 shell 启动文件：

- zsh：`~/.zshrc`
- bash：`~/.bashrc`

示例（将路径替换为 `npm prefix -g` 的输出）：

```bash
# macOS / Linux
export PATH="/path/from/npm/prefix/bin:$PATH"
```

然后打开**新的终端**（或在 zsh 中执行 `rehash`，在 bash 中执行 `hash -r`）。

Windows 上，把 `npm prefix -g` 的输出加入 PATH。

## 修复：避免 `sudo npm install -g` 和权限错误（Linux）

如果 `npm install -g ...` 因 `EACCES` 失败，把 npm 全局 prefix 切到用户可写目录：

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
```

把 `export PATH=...` 写入你的 shell 启动文件以持久生效。

## 推荐的 Node 安装方式

如果 Node/npm 以以下方式安装，坑会最少：

- 保持 Node 更新（22+）
- 全局 npm bin 目录稳定并且在新 shell 的 PATH 中

常见选择：

- macOS：Homebrew（`brew install node`）或版本管理器
- Linux：你偏好的版本管理器，或系统发行版提供 Node 22+ 的安装方式
- Windows：官方 Node 安装器、`winget`，或 Windows 的 Node 版本管理器

如果你使用版本管理器（nvm/fnm/asdf 等），确保它在你日常使用的 shell（zsh 或 bash）中完成初始化，这样它设置的 PATH 在运行安装器时也可用。
