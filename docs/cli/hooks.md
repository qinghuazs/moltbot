---
summary: "`moltbot hooks` CLI 参考（代理钩子）"
read_when:
  - 您想管理代理钩子
  - 您想安装或更新钩子
---

# `moltbot hooks`

管理代理钩子（用于 `/new`、`/reset` 等命令和网关启动的事件驱动自动化）。

相关：
- 钩子：[钩子](/hooks)
- 插件钩子：[插件](/plugin#plugin-hooks)

## 列出所有钩子

```bash
moltbot hooks list
```

列出从工作区、托管和捆绑目录发现的所有钩子。

**选项：**
- `--eligible`：仅显示符合条件的钩子（满足要求）
- `--json`：输出为 JSON
- `-v, --verbose`：显示详细信息，包括缺失的要求

**示例输出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - 在网关启动时运行 BOOT.md
  📝 command-logger ✓ - 将所有命令事件记录到集中审计文件
  💾 session-memory ✓ - 在发出 /new 命令时将会话上下文保存到内存
  😈 soul-evil ✓ - 在清除窗口期间或随机机会下交换注入的 SOUL 内容
```

**示例（详细）：**

```bash
moltbot hooks list --verbose
```

显示不符合条件的钩子缺失的要求。

**示例（JSON）：**

```bash
moltbot hooks list --json
```

返回结构化 JSON 供程序化使用。

## 获取钩子信息

```bash
moltbot hooks info <name>
```

显示特定钩子的详细信息。

**参数：**
- `<name>`：钩子名称（例如 `session-memory`）

**选项：**
- `--json`：输出为 JSON

**示例：**

```bash
moltbot hooks info session-memory
```

**输出：**

```
💾 session-memory ✓ Ready

在发出 /new 命令时将会话上下文保存到内存

Details:
  Source: moltbot-bundled
  Path: /path/to/moltbot/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/moltbot/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.molt.bot/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir
```

## 检查钩子资格

```bash
moltbot hooks check
```

显示钩子资格状态摘要（多少已就绪 vs. 未就绪）。

**选项：**
- `--json`：输出为 JSON

**示例输出：**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## 启用钩子

```bash
moltbot hooks enable <name>
```

通过将钩子添加到配置（`~/.clawdbot/config.json`）来启用特定钩子。

**注意：** 由插件管理的钩子在 `moltbot hooks list` 中显示 `plugin:<id>`，不能在此处启用/禁用。请改为启用/禁用插件。

**参数：**
- `<name>`：钩子名称（例如 `session-memory`）

**示例：**

```bash
moltbot hooks enable session-memory
```

**输出：**

```
✓ Enabled hook: 💾 session-memory
```

**它做什么：**
- 检查钩子是否存在且符合条件
- 在配置中更新 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存到磁盘

**启用后：**
- 重启网关以重新加载钩子（macOS 上重启菜单栏应用，或在开发中重启网关进程）。

## 禁用钩子

```bash
moltbot hooks disable <name>
```

通过更新配置来禁用特定钩子。

**参数：**
- `<name>`：钩子名称（例如 `command-logger`）

**示例：**

```bash
moltbot hooks disable command-logger
```

**输出：**

```
⏸ Disabled hook: 📝 command-logger
```

**禁用后：**
- 重启网关以重新加载钩子

## 安装钩子

```bash
moltbot hooks install <path-or-spec>
```

从本地文件夹/归档或 npm 安装钩子包。

**它做什么：**
- 将钩子包复制到 `~/.clawdbot/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的钩子
- 在 `hooks.internal.installs` 下记录安装

**选项：**
- `-l, --link`：链接本地目录而不是复制（添加到 `hooks.internal.load.extraDirs`）

**支持的归档格式：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**示例：**

```bash
# 本地目录
moltbot hooks install ./my-hook-pack

# 本地归档
moltbot hooks install ./my-hook-pack.zip

# NPM 包
moltbot hooks install @moltbot/my-hook-pack

# 链接本地目录而不复制
moltbot hooks install -l ./my-hook-pack
```

## 更新钩子

```bash
moltbot hooks update <id>
moltbot hooks update --all
```

更新已安装的钩子包（仅限 npm 安装）。

**选项：**
- `--all`：更新所有跟踪的钩子包
- `--dry-run`：显示将要更改的内容而不写入

## 捆绑钩子

### session-memory

在您发出 `/new` 时将会话上下文保存到内存。

**启用：**

```bash
moltbot hooks enable session-memory
```

**输出：** `~/clawd/memory/YYYY-MM-DD-slug.md`

**参见：** [session-memory 文档](/hooks#session-memory)

### command-logger

将所有命令事件记录到集中审计文件。

**启用：**

```bash
moltbot hooks enable command-logger
```

**输出：** `~/.clawdbot/logs/commands.log`

**查看日志：**

```bash
# 最近的命令
tail -n 20 ~/.clawdbot/logs/commands.log

# 美化打印
cat ~/.clawdbot/logs/commands.log | jq .

# 按操作过滤
grep '"action":"new"' ~/.clawdbot/logs/commands.log | jq .
```

**参见：** [command-logger 文档](/hooks#command-logger)

### soul-evil

在清除窗口期间或随机机会下将注入的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`。

**启用：**

```bash
moltbot hooks enable soul-evil
```

**参见：** [SOUL Evil 钩子](/hooks/soul-evil)

### boot-md

在网关启动时（频道启动后）运行 `BOOT.md`。

**事件**：`gateway:startup`

**启用**：

```bash
moltbot hooks enable boot-md
```

**参见：** [boot-md 文档](/hooks#boot-md)
