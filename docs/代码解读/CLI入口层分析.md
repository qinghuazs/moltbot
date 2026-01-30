# CLI 入口层分析

本文档详细分析 Moltbot CLI 的入口层实现，包括启动流程、命令注册和路由机制。

## 1. 启动流程概览

```
用户执行 moltbot <command>
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  moltbot.mjs                                                │
│  - 启用 Node.js 编译缓存                                     │
│  - 动态导入 dist/entry.js                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  src/entry.ts                                               │
│  - 设置进程标题为 "moltbot"                                  │
│  - 安装警告过滤器                                            │
│  - 处理 --no-color 参数                                      │
│  - 抑制实验性警告（可能重新 spawn 进程）                      │
│  - 规范化 Windows argv                                       │
│  - 解析 CLI profile                                          │
│  - 动态导入 run-main.js                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  src/cli/run-main.ts - runCli()                             │
│  - 加载 .env 文件                                            │
│  - 规范化环境变量                                            │
│  - 确保 moltbot 在 PATH 中                                   │
│  - 检查运行时版本                                            │
│  - 尝试快速路由 (tryRouteCli)                                │
│  - 构建 Commander 程序                                       │
│  - 懒加载子命令                                              │
│  - 注册插件命令                                              │
│  - 解析并执行命令                                            │
└─────────────────────────────────────────────────────────────┘
```

## 2. 入口文件详解

### 2.1 moltbot.mjs

```javascript
#!/usr/bin/env node

import module from "node:module";

// 启用 Node.js 编译缓存以加速启动
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // 忽略错误
  }
}

await import("./dist/entry.js");
```

**作用：**
- 作为 npm bin 入口点
- 启用 Node.js 模块编译缓存（提升冷启动性能）
- 动态导入编译后的入口文件

### 2.2 src/entry.ts

这是进程初始化的核心文件，主要职责：

#### 2.2.1 进程初始化

```typescript
process.title = "moltbot";           // 设置进程名称
installProcessWarningFilter();        // 安装警告过滤器

// 处理 --no-color 参数
if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
}
```

#### 2.2.2 实验性警告抑制

```typescript
function ensureExperimentalWarningSuppressed(): boolean {
  // 检查是否已经抑制了实验性警告
  // 如果没有，则重新 spawn 一个带有 --disable-warning=ExperimentalWarning 的子进程
  // 返回 true 表示父进程应该退出，让子进程继续
}
```

**为什么需要重新 spawn？**
- Node.js 的 `--disable-warning` 必须在进程启动时设置
- 如果用户没有设置，CLI 会自动重新启动并添加该参数
- 避免控制台输出大量实验性 API 警告

#### 2.2.3 Windows argv 规范化

```typescript
function normalizeWindowsArgv(argv: string[]): string[] {
  // Windows 下 argv 可能包含额外的 node.exe 路径
  // 需要清理这些多余的参数
}
```

#### 2.2.4 CLI Profile 处理

```typescript
const parsed = parseCliProfileArgs(process.argv);
if (parsed.profile) {
  applyCliProfileEnv({ profile: parsed.profile });
  process.argv = parsed.argv;
}
```

**Profile 功能：** 允许用户使用不同的配置文件运行 CLI。

#### 2.2.5 启动 CLI

```typescript
import("./cli/run-main.js")
  .then(({ runCli }) => runCli(process.argv))
  .catch((error) => {
    console.error("[moltbot] Failed to start CLI:", ...);
    process.exitCode = 1;
  });
```

### 2.3 src/cli/run-main.ts

CLI 的主运行逻辑：

```typescript
export async function runCli(argv: string[] = process.argv) {
  const normalizedArgv = stripWindowsNodeExec(argv);

  // 1. 环境准备
  loadDotEnv({ quiet: true });        // 加载 .env 文件
  normalizeEnv();                      // 规范化环境变量
  ensureMoltbotCliOnPath();           // 确保 CLI 在 PATH 中
  assertSupportedRuntime();           // 检查 Node.js 版本

  // 2. 快速路由（跳过 Commander 解析）
  if (await tryRouteCli(normalizedArgv)) return;

  // 3. 启用控制台日志捕获
  enableConsoleCapture();

  // 4. 构建 Commander 程序
  const { buildProgram } = await import("./program.js");
  const program = buildProgram();

  // 5. 安装全局错误处理器
  installUnhandledRejectionHandler();
  process.on("uncaughtException", ...);

  // 6. 懒加载主命令
  const parseArgv = rewriteUpdateFlagArgv(normalizedArgv);
  const primary = getPrimaryCommand(parseArgv);
  if (primary) {
    const { registerSubCliByName } = await import("./program/register.subclis.js");
    await registerSubCliByName(program, primary);
  }

  // 7. 注册插件命令
  if (!shouldSkipPluginRegistration) {
    const { registerPluginCliCommands } = await import("../plugins/cli.js");
    const { loadConfig } = await import("../config/config.js");
    registerPluginCliCommands(program, loadConfig());
  }

  // 8. 解析并执行命令
  await program.parseAsync(parseArgv);
}
```

## 3. 命令路由机制

### 3.1 快速路由 (Route First)

位于 `src/cli/route.ts`，用于跳过 Commander 解析直接执行常用命令：

```typescript
export async function tryRouteCli(argv: string[]): Promise<boolean> {
  // 禁用快速路由的情况
  if (isTruthyEnvValue(process.env.CLAWDBOT_DISABLE_ROUTE_FIRST)) return false;
  if (hasHelpOrVersion(argv)) return false;

  // 获取命令路径，如 ["status"] 或 ["memory", "status"]
  const path = getCommandPath(argv, 2);
  if (!path[0]) return false;

  // 查找匹配的路由
  const route = findRoutedCommand(path);
  if (!route) return false;

  // 准备并执行路由命令
  await prepareRoutedCommand({ argv, commandPath: path, loadPlugins: route.loadPlugins });
  return route.run(argv);
}
```

**快速路由的优势：**
- 跳过 Commander 的完整解析流程
- 减少启动时间
- 适用于高频命令如 `status`、`health`、`sessions`

### 3.2 路由规范定义

在 `src/cli/program/command-registry.ts` 中定义：

```typescript
type RouteSpec = {
  match: (path: string[]) => boolean;  // 匹配函数
  loadPlugins?: boolean;                // 是否加载插件
  run: (argv: string[]) => Promise<boolean>;  // 执行函数
};

// 示例：status 命令的快速路由
const routeStatus: RouteSpec = {
  match: (path) => path[0] === "status",
  loadPlugins: true,
  run: async (argv) => {
    const json = hasFlag(argv, "--json");
    const deep = hasFlag(argv, "--deep");
    // ... 解析其他参数
    await statusCommand({ json, deep, ... }, defaultRuntime);
    return true;
  },
};
```

**已注册的快速路由：**

| 命令 | 路由 | 说明 |
|------|------|------|
| `health` | `routeHealth` | 健康检查 |
| `status` | `routeStatus` | 状态查询 |
| `sessions` | `routeSessions` | 会话列表 |
| `agents list` | `routeAgentsList` | Agent 列表 |
| `memory status` | `routeMemoryStatus` | 记忆状态 |

## 4. 命令注册机制

### 4.1 Commander 程序构建

位于 `src/cli/program/build-program.ts`：

```typescript
export function buildProgram() {
  const program = new Command();
  const ctx = createProgramContext();
  const argv = process.argv;

  configureProgramHelp(program, ctx);           // 配置帮助信息
  registerPreActionHooks(program, ctx.programVersion);  // 注册前置钩子
  registerProgramCommands(program, ctx, argv);  // 注册所有命令

  return program;
}
```

### 4.2 命令注册表

位于 `src/cli/program/command-registry.ts`：

```typescript
export const commandRegistry: CommandRegistration[] = [
  {
    id: "setup",
    register: ({ program }) => registerSetupCommand(program),
  },
  {
    id: "onboard",
    register: ({ program }) => registerOnboardCommand(program),
  },
  {
    id: "configure",
    register: ({ program }) => registerConfigureCommand(program),
  },
  {
    id: "config",
    register: ({ program }) => registerConfigCli(program),
  },
  {
    id: "maintenance",
    register: ({ program }) => registerMaintenanceCommands(program),
  },
  {
    id: "message",
    register: ({ program, ctx }) => registerMessageCommands(program, ctx),
  },
  {
    id: "memory",
    register: ({ program }) => registerMemoryCli(program),
    routes: [routeMemoryStatus],
  },
  {
    id: "agent",
    register: ({ program, ctx }) => registerAgentCommands(program, { ... }),
    routes: [routeAgentsList],
  },
  {
    id: "subclis",
    register: ({ program, argv }) => registerSubCliCommands(program, argv),
  },
  {
    id: "status-health-sessions",
    register: ({ program }) => registerStatusHealthSessionsCommands(program),
    routes: [routeHealth, routeStatus, routeSessions],
  },
  {
    id: "browser",
    register: ({ program }) => registerBrowserCli(program),
  },
];

export function registerProgramCommands(program, ctx, argv) {
  for (const entry of commandRegistry) {
    entry.register({ program, ctx, argv });
  }
}
```

### 4.3 子命令懒加载

位于 `src/cli/program/register.subclis.ts`：

```typescript
const entries: SubCliEntry[] = [
  {
    name: "gateway",
    description: "Gateway control",
    register: async (program) => {
      const mod = await import("../gateway-cli.js");
      mod.registerGatewayCli(program);
    },
  },
  {
    name: "daemon",
    description: "Gateway service (legacy alias)",
    register: async (program) => {
      const mod = await import("../daemon-cli.js");
      mod.registerDaemonCli(program);
    },
  },
  // ... 更多子命令
];
```

**懒加载机制：**

```typescript
function registerLazyCommand(program: Command, entry: SubCliEntry) {
  // 创建占位命令
  const placeholder = program.command(entry.name).description(entry.description);
  placeholder.allowUnknownOption(true);
  placeholder.allowExcessArguments(true);

  // 当命令被调用时，才真正加载
  placeholder.action(async (...actionArgs) => {
    // 移除占位命令
    removeCommand(program, placeholder);
    // 注册真正的命令
    await entry.register(program);
    // 重新解析参数
    await program.parseAsync(parseArgv);
  });
}
```

**懒加载的优势：**
- 减少启动时间（不需要加载所有子命令模块）
- 按需加载（只加载用户实际使用的命令）
- 内存优化（未使用的命令不占用内存）

### 4.4 已注册的子命令

| 命令 | 模块 | 说明 |
|------|------|------|
| `acp` | `acp-cli.js` | Agent Control Protocol 工具 |
| `gateway` | `gateway-cli.js` | 网关控制 |
| `daemon` | `daemon-cli.js` | 守护进程管理（旧别名） |
| `logs` | `logs-cli.js` | 网关日志 |
| `system` | `system-cli.js` | 系统事件、心跳、存在状态 |
| `models` | `models-cli.js` | 模型配置 |
| `approvals` | `exec-approvals-cli.js` | 执行审批 |
| `nodes` | `nodes-cli.js` | 节点命令 |
| `devices` | `devices-cli.js` | 设备配对和令牌管理 |
| `node` | `node-cli.js` | 节点控制 |
| `sandbox` | `sandbox-cli.js` | 沙箱工具 |
| `tui` | `tui-cli.js` | 终端 UI |
| `cron` | `cron-cli.js` | 定时任务调度 |
| `dns` | `dns-cli.js` | DNS 辅助工具 |
| `docs` | `docs-cli.js` | 文档辅助工具 |
| `hooks` | `hooks-cli.js` | 钩子工具 |
| `webhooks` | `webhooks-cli.js` | Webhook 辅助工具 |
| `pairing` | `pairing-cli.js` | 配对辅助工具 |
| `plugins` | `plugins-cli.js` | 插件管理 |
| `channels` | `channels-cli.js` | 通道管理 |
| `directory` | `directory-cli.js` | 目录命令 |
| `security` | `security-cli.js` | 安全辅助工具 |
| `skills` | `skills-cli.js` | 技能管理 |
| `update` | `update-cli.js` | CLI 更新辅助工具 |

## 5. 参数解析工具

位于 `src/cli/argv.ts`：

```typescript
// 检查是否有帮助或版本参数
export function hasHelpOrVersion(argv: string[]): boolean {
  return argv.some((arg) => HELP_FLAGS.has(arg) || VERSION_FLAGS.has(arg));
}

// 检查是否有指定的 flag
export function hasFlag(argv: string[], name: string): boolean { ... }

// 获取 flag 的值
export function getFlagValue(argv: string[], name: string): string | null | undefined { ... }

// 获取命令路径，如 ["memory", "status"]
export function getCommandPath(argv: string[], depth = 2): string[] { ... }

// 获取主命令，如 "gateway"
export function getPrimaryCommand(argv: string[]): string | null { ... }
```

## 6. 命令执行流程图

```
用户输入: moltbot gateway run --port 8080
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 入口初始化 (entry.ts)                                    │
│     - 设置进程标题                                           │
│     - 抑制实验性警告                                         │
│     - 规范化 argv                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CLI 运行 (run-main.ts)                                   │
│     - 加载环境变量                                           │
│     - 检查运行时版本                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 快速路由检查 (route.ts)                                  │
│     - 检查是否有匹配的快速路由                               │
│     - "gateway" 没有快速路由，继续                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 构建 Commander 程序 (build-program.ts)                   │
│     - 创建 Commander 实例                                    │
│     - 注册帮助和前置钩子                                     │
│     - 注册命令（包括懒加载占位符）                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 懒加载主命令 (register.subclis.ts)                       │
│     - 识别主命令为 "gateway"                                 │
│     - 动态导入 gateway-cli.js                                │
│     - 注册 gateway 子命令                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  6. 解析并执行 (Commander)                                   │
│     - 解析 argv: ["gateway", "run", "--port", "8080"]       │
│     - 匹配 gateway run 命令                                  │
│     - 执行命令处理函数                                       │
└─────────────────────────────────────────────────────────────┘
```

## 7. 关键设计决策

### 7.1 双层路由设计

1. **快速路由层**：跳过 Commander，直接执行高频命令
2. **Commander 层**：完整的命令解析和帮助系统

### 7.2 懒加载策略

- 只在需要时加载子命令模块
- 减少冷启动时间
- 可通过 `CLAWDBOT_DISABLE_LAZY_SUBCOMMANDS=1` 禁用

### 7.3 进程重启机制

- 自动添加 `--disable-warning=ExperimentalWarning`
- 避免用户看到大量实验性 API 警告
- 可通过 `CLAWDBOT_NO_RESPAWN=1` 禁用

### 7.4 插件系统集成

- 插件命令在主命令注册后加载
- 支持通过配置文件启用/禁用插件
- 插件可以注册自己的 CLI 命令

## 8. 相关文件索引

| 文件 | 说明 |
|------|------|
| `moltbot.mjs` | npm bin 入口 |
| `src/entry.ts` | 进程初始化 |
| `src/cli/run-main.ts` | CLI 主运行逻辑 |
| `src/cli/route.ts` | 快速路由 |
| `src/cli/argv.ts` | 参数解析工具 |
| `src/cli/program.ts` | 程序导出 |
| `src/cli/program/build-program.ts` | 构建 Commander 程序 |
| `src/cli/program/command-registry.ts` | 命令注册表 |
| `src/cli/program/register.subclis.ts` | 子命令懒加载 |
| `src/cli/program/context.ts` | 程序上下文 |
| `src/cli/program/help.ts` | 帮助配置 |
| `src/cli/program/preaction.ts` | 前置钩子 |
