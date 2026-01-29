---
summary: "Hooks：面向命令与生命周期事件的事件驱动自动化"
read_when:
  - 需要对 /new、/reset、/stop 与 agent 生命周期事件做自动化
  - 想构建、安装或调试 hooks
---
# Hooks

Hooks 提供一个可扩展的事件驱动系统，用于在 agent 命令与事件发生时自动执行动作。Hooks 会从目录自动发现，并可通过 CLI 管理，类似 Moltbot 的 skills。

## 快速了解

Hooks 是在事件发生时运行的小脚本。有两类：

- **Hooks**（本页）：在 Gateway 内运行，响应 /new、/reset、/stop 或生命周期事件等。
- **Webhooks**：外部 HTTP webhook，用于让其他系统触发 Moltbot。见 [Webhook Hooks](/automation/webhook) 或使用 `moltbot webhooks` 的 Gmail 辅助命令。
  
Hooks 也可被打包在插件中；见 [Plugins](/plugin#plugin-hooks)。

常见用途：
- 会话重置时保存记忆快照
- 为排障或合规记录命令审计日志
- 会话开始/结束时触发自动化
- 在事件触发时写入工作区文件或调用外部 API

只要能写一个小的 TypeScript 函数，就能写 hook。Hooks 会被自动发现，你可通过 CLI 启用或禁用。

## 概览

Hooks 系统允许你：
- `/new` 时把会话上下文存入记忆
- 记录所有命令便于审计
- 在 agent 生命周期事件上触发自定义自动化
- 不改核心代码即可扩展 Moltbot 行为

## 入门

### 内置 Hooks

Moltbot 内置四个 hooks，会自动发现：

- **💾 session-memory**：在你发出 `/new` 时将会话上下文保存到 agent 工作区（默认 `~/clawd/memory/`）
- **📝 command-logger**：将所有命令事件记录到 `~/.clawdbot/logs/commands.log`
- **🚀 boot-md**：Gateway 启动时运行 `BOOT.md`（需要开启 internal hooks）
- **😈 soul-evil**：在清洗窗口或随机情况下，将注入的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`

列出可用 hooks：

```bash
moltbot hooks list
```

启用 hook：

```bash
moltbot hooks enable session-memory
```

查看 hook 状态：

```bash
moltbot hooks check
```

查看详细信息：

```bash
moltbot hooks info session-memory
```

### Onboarding

在 onboarding（`moltbot onboard`）期间，会提示启用推荐 hooks。向导会自动发现可用 hooks 并供选择。

## Hook 发现

Hooks 会自动从三个目录发现（按优先级）：

1. **工作区 hooks**：`<workspace>/hooks/`（每 agent，最高优先级）
2. **托管 hooks**：`~/.clawdbot/hooks/`（用户安装，跨工作区共享）
3. **内置 hooks**：`<moltbot>/dist/hooks/bundled/`（随 Moltbot 发布）

托管目录既可为 **单个 hook**，也可为 **hook pack**（包目录）。

每个 hook 是一个目录，包含：

```
my-hook/
├── HOOK.md          # 元数据 + 文档
└── handler.ts       # 处理逻辑
```

## Hook Packs（npm/归档）

Hook pack 是标准 npm 包，通过 `package.json` 中的 `moltbot.hooks` 导出多个 hooks。使用以下命令安装：

```bash
moltbot hooks install <path-or-spec>
```

示例 `package.json`：

```json
{
  "name": "@acme/my-hooks",
  "version": "0.1.0",
  "moltbot": {
    "hooks": ["./hooks/my-hook", "./hooks/other-hook"]
  }
}
```

每个条目指向包含 `HOOK.md` 与 `handler.ts`（或 `index.ts`）的 hook 目录。
Hook pack 可携带依赖；安装在 `~/.clawdbot/hooks/<id>`。

## Hook 结构

### HOOK.md 格式

`HOOK.md` 包含 YAML frontmatter 元数据与 Markdown 文档：

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.molt.bot/hooks#my-hook
metadata: {"moltbot":{"emoji":"🔗","events":["command:new"],"requires":{"bins":["node"]}}}
---

# My Hook

Detailed documentation goes here...

## What It Does

- Listens for `/new` commands
- Performs some action
- Logs the result

## Requirements

- Node.js must be installed

## Configuration

No configuration needed.
```

### 元数据字段

`metadata.moltbot` 支持：

- **`emoji`**：CLI 展示用 emoji（如 `"💾"`）
- **`events`**：监听的事件数组（如 `['command:new', 'command:reset']`）
- **`export`**：使用的命名导出（默认 `"default"`）
- **`homepage`**：文档 URL
- **`requires`**：可选要求
  - **`bins`**：PATH 中需要的二进制（如 `['git', 'node']`）
  - **`anyBins`**：至少满足其中一个二进制
  - **`env`**：所需环境变量
  - **`config`**：所需配置路径（如 `['workspace.dir']`）
  - **`os`**：所需平台（如 `['darwin', 'linux']`）
- **`always`**：跳过可用性检查（布尔）
- **`install`**：安装方式（内置 hooks：`[{"id":"bundled","kind":"bundled"}]`）

### Handler 实现

`handler.ts` 导出 `HookHandler` 函数：

```typescript
import type { HookHandler } from '../../src/hooks/hooks.js';

const myHandler: HookHandler = async (event) => {
  // Only trigger on 'new' command
  if (event.type !== 'command' || event.action !== 'new') {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  console.log(`  Session: ${event.sessionKey}`);
  console.log(`  Timestamp: ${event.timestamp.toISOString()}`);

  // Your custom logic here

  // Optionally send message to user
  event.messages.push('✨ My hook executed!');
};

export default myHandler;
```

#### 事件上下文

每个事件包含：

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway',
  action: string,              // e.g., 'new', 'reset', 'stop'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    sessionEntry?: SessionEntry,
    sessionId?: string,
    sessionFile?: string,
    commandSource?: string,    // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    bootstrapFiles?: WorkspaceBootstrapFile[],
    cfg?: MoltbotConfig
  }
}
```

## 事件类型

### 命令事件

当 agent 命令触发时：

- **`command`**：所有命令事件（通用监听）
- **`command:new`**：发出 `/new`
- **`command:reset`**：发出 `/reset`
- **`command:stop`**：发出 `/stop`

### Agent 事件

- **`agent:bootstrap`**：工作区 bootstrap 文件注入前（hooks 可修改 `context.bootstrapFiles`）

### Gateway 事件

Gateway 启动后触发：

- **`gateway:startup`**：通道启动且 hooks 加载后

### 工具结果 Hooks（插件 API）

这些 hooks 不是事件流监听器，而是让插件在 Moltbot 持久化前同步调整工具结果。

- **`tool_result_persist`**：在写入会话转录前转换工具结果。必须同步；返回更新后的结果或 `undefined` 保持不变。见 [Agent Loop](/concepts/agent-loop)。

### 未来事件

计划事件类型：

- **`session:start`**：新会话开始
- **`session:end`**：会话结束
- **`agent:error`**：agent 出错
- **`message:sent`**：消息发送
- **`message:received`**：消息接收

## 创建自定义 Hooks

### 1. 选择位置

- **工作区 hooks**（`<workspace>/hooks/`）：每 agent，优先级最高
- **托管 hooks**（`~/.clawdbot/hooks/`）：跨工作区共享

### 2. 创建目录结构

```bash
mkdir -p ~/.clawdbot/hooks/my-hook
cd ~/.clawdbot/hooks/my-hook
```

### 3. 创建 HOOK.md

```markdown
---
name: my-hook
description: "Does something useful"
metadata: {"moltbot":{"emoji":"🎯","events":["command:new"]}}
---

# My Custom Hook

This hook does something useful when you issue `/new`.
```

### 4. 创建 handler.ts

```typescript
import type { HookHandler } from '../../src/hooks/hooks.js';

const handler: HookHandler = async (event) => {
  if (event.type !== 'command' || event.action !== 'new') {
    return;
  }

  console.log('[my-hook] Running!');
  // Your logic here
};

export default handler;
```

### 5. 启用并测试

```bash
# Verify hook is discovered
moltbot hooks list

# Enable it
moltbot hooks enable my-hook

# Restart your gateway process (menu bar app restart on macOS, or restart your dev process)

# Trigger the event
# Send /new via your messaging channel
```

## 配置

### 新配置格式（推荐）

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

### 按 Hook 配置

Hooks 可携带自定义配置：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": {
            "MY_CUSTOM_VAR": "value"
          }
        }
      }
    }
  }
}
```

### 额外目录

从额外目录加载 hooks：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

### 旧配置格式（仍支持）

旧配置仍可用于兼容：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts",
          "export": "default"
        }
      ]
    }
  }
}
```

**迁移**：新 hooks 推荐使用基于发现的系统。旧 handler 会在基于目录的 hooks 之后加载。

## CLI 命令

### 列出 Hooks

```bash
# List all hooks
moltbot hooks list

# Show only eligible hooks
moltbot hooks list --eligible

# Verbose output (show missing requirements)
moltbot hooks list --verbose

# JSON output
moltbot hooks list --json
```

### Hook 信息

```bash
# Show detailed info about a hook
moltbot hooks info session-memory

# JSON output
moltbot hooks info session-memory --json
```

### 检查可用性

```bash
# Show eligibility summary
moltbot hooks check

# JSON output
moltbot hooks check --json
```

### 启用/禁用

```bash
# Enable a hook
moltbot hooks enable session-memory

# Disable a hook
moltbot hooks disable command-logger
```

## 内置 Hooks

### session-memory

当你发出 `/new` 时保存会话上下文到记忆。

**事件**：`command:new`

**要求**：必须配置 `workspace.dir`

**输出**：`<workspace>/memory/YYYY-MM-DD-slug.md`（默认 `~/clawd`）

**行为**：
1. 使用重置前的会话条目定位正确转录
2. 提取最近 15 行对话
3. 用 LLM 生成描述性文件名 slug
4. 将会话元信息保存到带日期的记忆文件

**输出示例**：

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**文件名示例**：
- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md`（slug 失败时回退为时间戳）

**启用：**

```bash
moltbot hooks enable session-memory
```

### command-logger

将所有命令事件记录到集中审计文件。

**事件**：`command`

**要求**：无

**输出**：`~/.clawdbot/logs/commands.log`

**行为**：
1. 捕获事件细节（命令动作、时间戳、会话 key、sender ID、source）
2. 以 JSONL 格式追加到日志文件
3. 在后台静默运行

**日志示例**：

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**查看日志：**

```bash
# View recent commands
tail -n 20 ~/.clawdbot/logs/commands.log

# Pretty-print with jq
cat ~/.clawdbot/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.clawdbot/logs/commands.log | jq .
```

**启用：**

```bash
moltbot hooks enable command-logger
```

### soul-evil

在清洗窗口或随机情况下，将注入的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`。

**事件**：`agent:bootstrap`

**文档**：[SOUL Evil Hook](/hooks/soul-evil)

**输出**：不写文件，仅内存替换。

**启用：**

```bash
moltbot hooks enable soul-evil
```

**配置：**

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

### boot-md

Gateway 启动后运行 `BOOT.md`（通道启动后）。
需要启用 internal hooks。

**事件**：`gateway:startup`

**要求**：必须配置 `workspace.dir`

**行为**：
1. 从工作区读取 `BOOT.md`
2. 使用 agent runner 执行指令
3. 通过 message 工具发送请求的外发消息

**启用：**

```bash
moltbot hooks enable boot-md
```

## 最佳实践

### 保持处理器轻量

Hooks 在命令处理过程中运行，保持轻量：

```typescript
// ✓ 好 - 异步工作，立即返回
const handler: HookHandler = async (event) => {
  void processInBackground(event); // Fire and forget
};

// ✗ 差 - 阻塞命令处理
const handler: HookHandler = async (event) => {
  await slowDatabaseQuery(event);
  await evenSlowerAPICall(event);
};
```

### 优雅处理错误

风险操作要包裹：

```typescript
const handler: HookHandler = async (event) => {
  try {
    await riskyOperation(event);
  } catch (err) {
    console.error('[my-handler] Failed:', err instanceof Error ? err.message : String(err));
    // Don't throw - let other handlers run
  }
};
```

### 早过滤事件

不相关事件直接返回：

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== 'command' || event.action !== 'new') {
    return;
  }

  // Your logic here
};
```

### 使用具体事件键

尽量在元数据里使用精确事件：

```yaml
metadata: {"moltbot":{"events":["command:new"]}}  # Specific
```

而不是：

```yaml
metadata: {"moltbot":{"events":["command"]}}      # General - more overhead
```

## 调试

### 启用 Hook 日志

Gateway 启动时会记录 hook 加载：

```
Registered hook: session-memory -> command:new
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### 检查发现

列出所有已发现 hooks：

```bash
moltbot hooks list --verbose
```

### 检查注册

在 handler 中打印调用日志：

```typescript
const handler: HookHandler = async (event) => {
  console.log('[my-handler] Triggered:', event.type, event.action);
  // Your logic
};
```

### 验证可用性

查看 hook 为何不可用：

```bash
moltbot hooks info my-hook
```

查看输出中的缺失项。

## 测试

### Gateway 日志

监控 gateway 日志以查看 hook 执行：

```bash
# macOS
./scripts/clawlog.sh -f

# 其他平台
tail -f ~/.clawdbot/gateway.log
```

### 直接测试 Hooks

在隔离环境测试 handler：

```typescript
import { test } from 'vitest';
import { createHookEvent } from './src/hooks/hooks.js';
import myHandler from './hooks/my-hook/handler.js';

test('my handler works', async () => {
  const event = createHookEvent('command', 'new', 'test-session', {
    foo: 'bar'
  });

  await myHandler(event);

  // Assert side effects
});
```

## 架构

### 核心组件

- **`src/hooks/types.ts`**：类型定义
- **`src/hooks/workspace.ts`**：目录扫描与加载
- **`src/hooks/frontmatter.ts`**：HOOK.md 元数据解析
- **`src/hooks/config.ts`**：可用性检查
- **`src/hooks/hooks-status.ts`**：状态上报
- **`src/hooks/loader.ts`**：动态模块加载
- **`src/cli/hooks-cli.ts`**：CLI 命令
- **`src/gateway/server-startup.ts`**：网关启动加载 hooks
- **`src/auto-reply/reply/commands-core.ts`**：触发命令事件

### 发现流程

```
Gateway startup
    ↓
Scan directories (workspace → managed → bundled)
    ↓
Parse HOOK.md files
    ↓
Check eligibility (bins, env, config, os)
    ↓
Load handlers from eligible hooks
    ↓
Register handlers for events
```

### 事件流程

```
User sends /new
    ↓
Command validation
    ↓
Create hook event
    ↓
Trigger hook (all registered handlers)
    ↓
Command processing continues
    ↓
Session reset
```

## 故障排查

### Hook 未被发现

1. 检查目录结构：
   ```bash
   ls -la ~/.clawdbot/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. 检查 HOOK.md 格式：
   ```bash
   cat ~/.clawdbot/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. 列出所有已发现 hooks：
   ```bash
   moltbot hooks list
   ```

### Hook 不可用

检查 requirements：

```bash
moltbot hooks info my-hook
```

查看缺失项：
- 二进制（检查 PATH）
- 环境变量
- 配置值
- OS 兼容性

### Hook 未执行

1. 确认 hook 已启用：
   ```bash
   moltbot hooks list
   # Should show ✓ next to enabled hooks
   ```

2. 重启 gateway 进程以重新加载 hooks。

3. 检查 gateway 日志错误：
   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### Handler 错误

检查 TypeScript/import 错误：

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## 迁移指南

### 从旧配置迁移到发现机制

**Before**：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts"
        }
      ]
    }
  }
}
```

**After**：

1. 创建 hook 目录：
   ```bash
   mkdir -p ~/.clawdbot/hooks/my-hook
   mv ./hooks/handlers/my-handler.ts ~/.clawdbot/hooks/my-hook/handler.ts
   ```

2. 创建 HOOK.md：
   ```markdown
   ---
   name: my-hook
   description: "My custom hook"
   metadata: {"moltbot":{"emoji":"🎯","events":["command:new"]}}
   ---

   # My Hook

   Does something useful.
   ```

3. 更新配置：
   ```json
   {
     "hooks": {
       "internal": {
         "enabled": true,
         "entries": {
           "my-hook": { "enabled": true }
         }
       }
     }
   }
   ```

4. 验证并重启 gateway：
   ```bash
   moltbot hooks list
   # Should show: 🎯 my-hook ✓
   ```

**迁移收益**：
- 自动发现
- CLI 管理
- 可用性检查
- 更好的文档
- 统一结构

## 另见

- [CLI Reference: hooks](/cli/hooks)
- [Bundled Hooks README](https://github.com/moltbot/moltbot/tree/main/src/hooks/bundled)
- [Webhook Hooks](/automation/webhook)
- [Configuration](/gateway/configuration#hooks)
