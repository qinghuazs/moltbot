---
name: coding-agent
description: 通过后台进程运行 Codex CLI、Claude Code、OpenCode 或 Pi Coding Agent 以进行程序化控制。
metadata: {"moltbot":{"emoji":"🧩","requires":{"anyBins":["claude","codex","opencode","pi"]}}}
---

# Coding Agent（bash 优先）

使用 **bash**（可选后台模式）完成所有编码代理工作。简单有效。

## ⚠️ 需要 PTY 模式！

编码代理（Codex、Claude Code、Pi）是**交互式终端应用程序**，需要伪终端（PTY）才能正常工作。没有 PTY，你会得到损坏的输出、缺失的颜色，或者代理可能会挂起。

**运行编码代理时始终使用 `pty:true`**：

```bash
# ✅ 正确 - 使用 PTY
bash pty:true command:"codex exec 'Your prompt'"

# ❌ 错误 - 没有 PTY，代理可能会崩溃
bash command:"codex exec 'Your prompt'"
```

### Bash 工具参数

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `command` | string | 要运行的 shell 命令 |
| `pty` | boolean | **用于编码代理！**为交互式 CLI 分配伪终端 |
| `workdir` | string | 工作目录（代理只能看到此文件夹的上下文） |
| `background` | boolean | 在后台运行，返回 sessionId 用于监控 |
| `timeout` | number | 超时秒数（到期时终止进程） |
| `elevated` | boolean | 在主机而非沙箱中运行（如果允许） |

### Process 工具操作（用于后台会话）

| 操作 | 描述 |
|--------|-------------|
| `list` | 列出所有运行中/最近的会话 |
| `poll` | 检查会话是否仍在运行 |
| `log` | 获取会话输出（可选 offset/limit） |
| `write` | 向 stdin 发送原始数据 |
| `submit` | 发送数据 + 换行（如同输入并按 Enter） |
| `send-keys` | 发送按键 token 或十六进制字节 |
| `paste` | 粘贴文本（可选括号模式） |
| `kill` | 终止会话 |

---

## 快速开始：一次性任务

对于快速提示/聊天，创建临时 git 仓库并运行：

```bash
# 快速聊天（Codex 需要 git 仓库！）
SCRATCH=$(mktemp -d) && cd $SCRATCH && git init && codex exec "Your prompt here"

# 或在真实项目中 - 使用 PTY！
bash pty:true workdir:~/Projects/myproject command:"codex exec 'Add error handling to the API calls'"
```

**为什么需要 git init？**Codex 拒绝在受信任的 git 目录之外运行。创建临时仓库可解决临时工作的问题。

---

## 模式：workdir + background + pty

对于较长的任务，使用带 PTY 的后台模式：

```bash
# 在目标目录中启动代理（使用 PTY！）
bash pty:true workdir:~/project background:true command:"codex exec --full-auto 'Build a snake game'"
# 返回 sessionId 用于跟踪

# 监控进度
process action:log sessionId:XXX

# 检查是否完成
process action:poll sessionId:XXX

# 发送输入（如果代理提问）
process action:write sessionId:XXX data:"y"

# 提交并按 Enter（如同输入 "yes" 并按 Enter）
process action:submit sessionId:XXX data:"yes"

# 如需终止
process action:kill sessionId:XXX
```

**为什么 workdir 很重要：**代理在聚焦的目录中启动，不会跑去读取无关文件（比如你的 soul.md 😅）。

---

## Codex CLI

**模型：**`gpt-5.2-codex` 是默认值（在 ~/.codex/config.toml 中设置）

### 标志

| 标志 | 效果 |
|------|--------|
| `exec "prompt"` | 一次性执行，完成后退出 |
| `--full-auto` | 沙箱化但在工作区内自动批准 |
| `--yolo` | 无沙箱，无批准（最快，最危险） |

### 构建/创建
```bash
# 快速一次性（自动批准）- 记得用 PTY！
bash pty:true workdir:~/project command:"codex exec --full-auto 'Build a dark mode toggle'"

# 后台用于较长工作
bash pty:true workdir:~/project background:true command:"codex --yolo 'Refactor the auth module'"
```

### 审查 PR

**⚠️ 关键：永远不要在 Moltbot 自己的项目文件夹中审查 PR！**
克隆到临时文件夹或使用 git worktree。

```bash
# 克隆到临时目录以安全审查
REVIEW_DIR=$(mktemp -d)
git clone https://github.com/user/repo.git $REVIEW_DIR
cd $REVIEW_DIR && gh pr checkout 130
bash pty:true workdir:$REVIEW_DIR command:"codex review --base origin/main"
# 完成后清理：trash $REVIEW_DIR

# 或使用 git worktree（保持 main 不变）
git worktree add /tmp/pr-130-review pr-130-branch
bash pty:true workdir:/tmp/pr-130-review command:"codex review --base main"
```

### 批量 PR 审查（并行军团！）
```bash
# 首先获取所有 PR refs
git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'

# 部署军团 - 每个 PR 一个 Codex（都用 PTY！）
bash pty:true workdir:~/project background:true command:"codex exec 'Review PR #86. git diff origin/main...origin/pr/86'"
bash pty:true workdir:~/project background:true command:"codex exec 'Review PR #87. git diff origin/main...origin/pr/87'"

# 监控所有
process action:list

# 将结果发布到 GitHub
gh pr comment <PR#> --body "<review content>"
```

---

## Claude Code

```bash
# 使用 PTY 以获得正确的终端输出
bash pty:true workdir:~/project command:"claude 'Your task'"

# 后台
bash pty:true workdir:~/project background:true command:"claude 'Your task'"
```

---

## OpenCode

```bash
bash pty:true workdir:~/project command:"opencode run 'Your task'"
```

---

## Pi Coding Agent

```bash
# 安装：npm install -g @mariozechner/pi-coding-agent
bash pty:true workdir:~/project command:"pi 'Your task'"

# 非交互模式（仍建议使用 PTY）
bash pty:true command:"pi -p 'Summarize src/'"

# 不同的提供商/模型
bash pty:true command:"pi --provider openai --model gpt-4o-mini -p 'Your task'"
```

**注意：**Pi 现已启用 Anthropic 提示缓存（PR #584，2026 年 1 月合并）！

---

## 使用 git worktrees 并行修复问题

要并行修复多个问题，使用 git worktrees：

```bash
# 1. 为每个问题创建 worktree
git worktree add -b fix/issue-78 /tmp/issue-78 main
git worktree add -b fix/issue-99 /tmp/issue-99 main

# 2. 在每个中启动 Codex（后台 + PTY！）
bash pty:true workdir:/tmp/issue-78 background:true command:"pnpm install && codex --yolo 'Fix issue #78: <description>. Commit and push.'"
bash pty:true workdir:/tmp/issue-99 background:true command:"pnpm install && codex --yolo 'Fix issue #99: <description>. Commit and push.'"

# 3. 监控进度
process action:list
process action:log sessionId:XXX

# 4. 修复后创建 PR
cd /tmp/issue-78 && git push -u origin fix/issue-78
gh pr create --repo user/repo --head fix/issue-78 --title "fix: ..." --body "..."

# 5. 清理
git worktree remove /tmp/issue-78
git worktree remove /tmp/issue-99
```

---

## ⚠️ 规则

1. **始终使用 pty:true** - 编码代理需要终端！
2. **尊重工具选择** - 如果用户要求 Codex，就用 Codex。
   - 编排模式：不要自己手写补丁。
   - 如果代理失败/挂起，重新启动它或询问用户方向，但不要悄悄接管。
3. **要有耐心** - 不要因为会话"慢"就终止它们
4. **用 process:log 监控** - 在不干扰的情况下检查进度
5. **构建时用 --full-auto** - 自动批准更改
6. **审查时用原版** - 不需要特殊标志
7. **并行是可以的** - 批量工作时同时运行多个 Codex 进程
8. **永远不要在 ~/clawd/ 中启动 Codex** - 它会读取你的 soul 文档并对组织架构产生奇怪的想法！
9. **永远不要在 ~/Projects/moltbot/ 中切换分支** - 那是正在运行的 Moltbot 实例！

---

## 进度更新（关键）

当你在后台启动编码代理时，让用户保持知情。

- 启动时发送 1 条简短消息（正在运行什么 + 在哪里）。
- 然后只在有变化时再更新：
  - 里程碑完成（构建完成、测试通过）
  - 代理提问 / 需要输入
  - 遇到错误或需要用户操作
  - 代理完成（包括更改了什么 + 在哪里）
- 如果你终止了会话，立即说明你终止了它以及原因。

这可以防止用户只看到"Agent failed before reply"而不知道发生了什么。

---

## 完成时自动通知

对于长时间运行的后台任务，在提示中附加唤醒触发器，这样 Moltbot 会在代理完成时立即收到通知（而不是等待下一次心跳）：

```
... 你的任务在这里。

完全完成后，运行此命令通知我：
moltbot gateway wake --text "Done: [简要总结构建了什么]" --mode now
```

**示例：**
```bash
bash pty:true workdir:~/project background:true command:"codex --yolo exec 'Build a REST API for todos.

When completely finished, run: moltbot gateway wake --text \"Done: Built todos REST API with CRUD endpoints\" --mode now'"
```

这会触发即时唤醒事件——Skippy 会在几秒内收到通知，而不是 10 分钟。

---

## 经验总结（2026 年 1 月）

- **PTY 是必需的：**编码代理是交互式终端应用。没有 `pty:true`，输出会损坏或代理会挂起。
- **需要 Git 仓库：**Codex 不会在 git 目录之外运行。临时工作使用 `mktemp -d && git init`。
- **exec 是你的朋友：**`codex exec "prompt"` 运行并干净退出——非常适合一次性任务。
- **submit vs write：**使用 `submit` 发送输入 + Enter，`write` 发送不带换行的原始数据。
- **调皮有用：**Codex 对有趣的提示反应良好。让它写一首关于给太空龙虾当二把手的俳句，得到了：*"Second chair, I code / Space lobster sets the tempo / Keys glow, I follow"* 🦞
