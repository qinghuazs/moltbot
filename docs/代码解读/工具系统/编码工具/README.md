# 编码工具

## 概述

编码工具是基于 `@mariozechner/pi-coding-agent` 的文件操作和命令执行工具，为 AI Agent 提供代码编辑和系统交互能力。

## 工具列表

| 工具名称 | 功能描述 | 文档链接 |
|---------|---------|---------|
| `read` | 读取文件内容 | [文件操作工具](#文件操作工具) |
| `write` | 写入文件内容 | [文件操作工具](#文件操作工具) |
| `edit` | 编辑文件内容 | [文件操作工具](#文件操作工具) |
| `apply_patch` | 应用补丁 (OpenAI 专用) | [文件操作工具](#文件操作工具) |
| `exec` | 执行 Shell 命令 | [执行工具](./执行工具.md) |
| `process` | 进程管理 | [执行工具](./执行工具.md) |

## 工具创建流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        编码工具创建流程                                    │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    createMoltbotCodingTools()                    │
     │                    src/agents/pi-tools.ts                        │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    1. 解析工具策略                                 │
     │  resolveEffectiveToolPolicy()                                    │
     │  resolveGroupToolPolicy()                                        │
     │  resolveSubagentToolPolicy()                                     │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    2. 创建基础编码工具                             │
     │  - 从 pi-coding-agent 获取 codingTools                          │
     │  - 替换 read 工具 (沙箱/标准)                                     │
     │  - 替换 write 工具 (沙箱/标准)                                    │
     │  - 替换 edit 工具 (沙箱/标准)                                     │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    3. 创建执行工具                                 │
     │  createExecTool()   → exec                                       │
     │  createProcessTool() → process                                   │
     │  createApplyPatchTool() → apply_patch (可选)                     │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    4. 添加渠道工具                                 │
     │  listChannelAgentTools()                                         │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    5. 添加 Moltbot 核心工具                        │
     │  createMoltbotTools()                                            │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    6. 应用策略过滤                                 │
     │  filterToolsByPolicy() (多层)                                    │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    7. 规范化和包装                                 │
     │  normalizeToolParameters()                                       │
     │  wrapToolWithAbortSignal()                                       │
     └─────────────────────────────────────────────────────────────────┘
```

## 文件操作工具

### read 工具

读取文件内容，支持沙箱模式。

```typescript
// 标准模式
createReadTool(workspaceRoot);

// 沙箱模式
createSandboxedReadTool(sandboxRoot);

// Moltbot 增强版
createMoltbotReadTool(freshReadTool);
```

**参数:**
- `path`: 文件路径
- `from`: 起始行号 (可选)
- `to`: 结束行号 (可选)

### write 工具

写入文件内容，支持沙箱模式。

```typescript
// 标准模式
createWriteTool(workspaceRoot);

// 沙箱模式
createSandboxedWriteTool(sandboxRoot);
```

**参数:**
- `path`: 文件路径
- `content`: 文件内容

### edit 工具

编辑文件内容，支持沙箱模式。

```typescript
// 标准模式
createEditTool(workspaceRoot);

// 沙箱模式
createSandboxedEditTool(sandboxRoot);
```

**参数:**
- `path`: 文件路径
- `old_string`: 要替换的内容
- `new_string`: 新内容

### apply_patch 工具

应用补丁文件，仅在 OpenAI 提供商下可用。

```typescript
createApplyPatchTool({
  cwd: sandboxRoot ?? workspaceRoot,
  sandboxRoot: sandboxRoot && allowWorkspaceWrites ? sandboxRoot : undefined,
});
```

**启用条件:**
- `tools.exec.applyPatch.enabled` 为 true
- 模型提供商为 OpenAI
- 模型在 `allowModels` 列表中

## 沙箱模式

沙箱模式下，文件操作被限制在沙箱目录内：

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           沙箱文件操作                                    │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────┐
     │                    沙箱配置                                       │
     │  sandbox: {                                                      │
     │    enabled: true,                                                │
     │    workspaceDir: "/sandbox/workspace",                           │
     │    containerName: "moltbot-sandbox",                             │
     │    containerWorkdir: "/workspace",                               │
     │    workspaceAccess: "rw" | "ro",                                 │
     │  }                                                               │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    文件路径映射                                    │
     │  主机路径: /sandbox/workspace/src/index.ts                       │
     │  容器路径: /workspace/src/index.ts                               │
     └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                    访问控制                                       │
     │  - workspaceAccess: "rw" → 允许读写                              │
     │  - workspaceAccess: "ro" → 仅允许读取                            │
     └─────────────────────────────────────────────────────────────────┘
```

## 核心代码位置

```
src/agents/
├── pi-tools.ts              # 编码工具集创建入口
├── pi-tools.read.ts         # 文件读取工具增强
├── pi-tools.schema.ts       # 工具 Schema 处理
├── pi-tools.policy.ts       # 工具策略解析
├── pi-tools.abort.ts        # 中止信号处理
├── apply-patch.ts           # apply_patch 工具实现
├── bash-tools.ts            # Bash 工具入口
├── bash-tools.exec.ts       # exec 工具实现
├── bash-tools.process.ts    # process 工具实现
└── bash-tools.shared.ts     # Bash 工具共享函数
```

## 工具配置选项

```typescript
createMoltbotCodingTools({
  // 执行工具配置
  exec?: ExecToolDefaults & ProcessToolDefaults;

  // 消息提供商
  messageProvider?: string;

  // Agent 账户 ID
  agentAccountId?: string;

  // 消息目标
  messageTo?: string;

  // 消息线程 ID
  messageThreadId?: string | number;

  // 沙箱配置
  sandbox?: SandboxContext | null;

  // 会话密钥
  sessionKey?: string;

  // Agent 目录
  agentDir?: string;

  // 工作区目录
  workspaceDir?: string;

  // 配置
  config?: MoltbotConfig;

  // 中止信号
  abortSignal?: AbortSignal;

  // 模型提供商
  modelProvider?: string;

  // 模型 ID
  modelId?: string;

  // 模型认证模式
  modelAuthMode?: ModelAuthMode;

  // 群组 ID
  groupId?: string | null;

  // 模型是否有视觉能力
  modelHasVision?: boolean;
});
```

## 工具组归属

编码工具属于以下工具组：

| 工具组 | 包含工具 |
|-------|---------|
| `group:fs` | read, write, edit, apply_patch |
| `group:runtime` | exec, process |

## 参数规范化

编码工具支持参数规范化，以兼容不同的参数命名风格：

```typescript
// src/agents/pi-tools.read.ts

export const CLAUDE_PARAM_GROUPS = {
  write: {
    file_path: ["path", "filePath", "file"],
    content: ["text", "data"],
  },
  edit: {
    file_path: ["path", "filePath", "file"],
    old_string: ["old", "search", "find"],
    new_string: ["new", "replace", "replacement"],
  },
};
```

## 相关文档

- [工具系统架构](../README.md)
- [工具策略系统](../工具策略系统.md)
- [执行工具](./执行工具.md)
- [核心工具](../核心工具/README.md)
