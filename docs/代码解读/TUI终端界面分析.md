# TUI 终端界面分析

## 概述

Moltbot 的 TUI（Terminal User Interface）模块是一个基于 `@mariozechner/pi-tui` 库构建的交互式终端聊天界面，采用了**事件驱动架构**和**组件化设计**模式。整个系统通过 WebSocket 与 Gateway 服务器通信，实现实时的 AI 对话交互。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TUI 系统架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        TUI 主入口 (tui.ts)                          │   │
│  │  - 初始化状态管理                                                    │   │
│  │  - 构建 UI 组件树                                                    │   │
│  │  - 绑定事件处理器                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│          ┌─────────────────────────┴─────────────────────────┐             │
│          │                                                   │             │
│          ▼                                                   ▼             │
│  ┌──────────────────┐                             ┌──────────────────┐     │
│  │  GatewayChatClient│                             │   UI 组件系统     │     │
│  │  (gateway-chat.ts)│                             │   (components/)  │     │
│  │  - WebSocket 通信  │                             │  - ChatLog       │     │
│  │  - 事件分发        │                             │  - CustomEditor  │     │
│  │  - 会话管理        │                             │  - ToolExecution │     │
│  └──────────────────┘                             └──────────────────┘     │
│          │                                                   │             │
│          └─────────────────────────┬─────────────────────────┘             │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    事件处理系统                                      │   │
│  │  - tui-event-handlers.ts (聊天和代理事件)                           │   │
│  │  - tui-command-handlers.ts (命令处理)                               │   │
│  │  - tui-stream-assembler.ts (流式响应组装)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 模块文件结构

```
src/tui/
├── tui.ts                          # 主入口，TUI 初始化和生命周期管理
├── gateway-chat.ts                 # WebSocket 客户端封装
├── commands.ts                     # 斜杠命令解析和定义
├── tui-types.ts                    # 类型定义
├── tui-event-handlers.ts           # 聊天和代理事件处理
├── tui-command-handlers.ts         # 命令处理逻辑
├── tui-formatters.ts               # 消息格式化工具
├── tui-stream-assembler.ts         # 流式响应组装器
├── tui-session-actions.ts          # 会话操作（切换、刷新等）
├── tui-overlays.ts                 # 覆盖层管理
├── tui-local-shell.ts              # 本地 Shell 执行
├── tui-waiting.ts                  # 等待状态动画
├── tui-status-summary.ts           # 状态摘要格式化
├── components/                     # UI 组件
│   ├── chat-log.ts                # 聊天日志容器
│   ├── custom-editor.ts           # 自定义输入编辑器
│   ├── assistant-message.ts       # AI 助手消息组件
│   ├── user-message.ts            # 用户消息组件
│   ├── tool-execution.ts          # 工具执行显示组件
│   ├── searchable-select-list.ts  # 可搜索选择列表
│   ├── filterable-select-list.ts  # 可过滤选择列表
│   ├── selectors.ts               # 选择器工厂函数
│   └── fuzzy-filter.ts            # 模糊搜索过滤器
└── theme/                          # 主题配置
    ├── theme.ts                   # 主题定义和调色板
    └── syntax-theme.ts            # 代码语法高亮主题
```

## 核心组件

### 组件层次结构

```
TUI (根容器)
└── Container (root)
    ├── Text (header)                    # 顶部标题栏
    ├── ChatLog (chatLog)                # 聊天日志容器
    │   ├── UserMessageComponent         # 用户消息
    │   ├── AssistantMessageComponent    # AI 助手消息
    │   └── ToolExecutionComponent       # 工具执行显示
    ├── Container (statusContainer)      # 状态容器
    │   ├── Text (statusText)            # 静态状态文本
    │   └── Loader (statusLoader)        # 动态加载器
    ├── Text (footer)                    # 底部状态栏
    └── CustomEditor (editor)            # 输入编辑器
```

### ChatLog 组件

**文件位置**: `src/tui/components/chat-log.ts`

```typescript
export class ChatLog extends Container {
  private toolById = new Map<string, ToolExecutionComponent>();
  private streamingRuns = new Map<string, AssistantMessageComponent>();

  // 添加系统消息
  addSystem(text: string);

  // 添加用户消息
  addUser(text: string);

  // 开始流式助手响应
  startAssistant(text: string, runId?: string);

  // 更新流式助手响应
  updateAssistant(text: string, runId?: string);

  // 完成助手响应
  finalizeAssistant(text: string, runId?: string);

  // 工具执行管理
  startTool(toolCallId: string, toolName: string, args: unknown);
  updateToolResult(toolCallId: string, result: unknown, opts?: { isError?: boolean });
}
```

### CustomEditor 组件

**文件位置**: `src/tui/components/custom-editor.ts`

支持的快捷键：

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+L` | 打开模型选择器 |
| `Ctrl+O` | 展开/折叠工具输出 |
| `Ctrl+P` | 打开会话选择器 |
| `Ctrl+G` | 打开代理选择器 |
| `Ctrl+T` | 切换思考显示 |
| `Escape` | 中止当前运行 |
| `Ctrl+C` | 清空输入或退出 |
| `Ctrl+D` | 退出（输入为空时） |

## WebSocket 通信

### GatewayChatClient

**文件位置**: `src/tui/gateway-chat.ts`

```typescript
export class GatewayChatClient {
  // 事件回调
  onEvent?: (evt: GatewayEvent) => void;
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;

  // 核心方法
  async sendChat(opts: ChatSendOptions): Promise<{ runId: string }>;
  async abortChat(opts: { sessionKey: string; runId: string });
  async loadHistory(opts: { sessionKey: string; limit?: number });
  async listSessions(opts?: SessionsListParams);
  async listAgents();
  async patchSession(opts: SessionsPatchParams);
  async resetSession(key: string);
  async getStatus();
  async listModels(): Promise<GatewayModelChoice[]>;
}
```

## 事件处理系统

### 事件流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     WebSocket 事件流                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  client.onEvent  │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌──────────────┐          ┌──────────────┐
        │  chat event  │          │ agent event  │
        └──────────────┘          └──────────────┘
                │                           │
    ┌───────────┼───────────┐              │
    ▼           ▼           ▼              ▼
┌───────┐  ┌───────┐  ┌────────┐    ┌──────────┐
│ delta │  │ final │  │ aborted│    │   tool   │
└───────┘  └───────┘  └────────┘    └──────────┘
                │
                ▼
        ┌──────────────┐
        │   ChatLog    │
        └──────────────┘
```

### 流式响应组装器

**文件位置**: `src/tui/tui-stream-assembler.ts`

```typescript
export class TuiStreamAssembler {
  // 处理增量更新
  ingestDelta(runId: string, message: unknown, showThinking: boolean): string | null;

  // 完成流式响应
  finalize(runId: string, message: unknown, showThinking: boolean): string;

  // 丢弃运行
  drop(runId: string): void;
}
```

## 命令系统

### 斜杠命令

**文件位置**: `src/tui/commands.ts`

| 命令 | 描述 |
|------|------|
| `/help` | 显示帮助信息 |
| `/status` | 显示网关状态 |
| `/agent` | 切换代理 |
| `/session` | 切换会话 |
| `/model` | 设置模型 |
| `/think` | 设置思考级别 |
| `/reset` | 重置会话 |
| `/clear` | 清空聊天记录 |
| `/quit` | 退出 TUI |

### 命令解析

```typescript
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.replace(/^\//, "").trim();
  if (!trimmed) return { name: "", args: "" };
  const [name, ...rest] = trimmed.split(/\s+/);
  const normalized = name.toLowerCase();
  return {
    name: COMMAND_ALIASES[normalized] ?? normalized,
    args: rest.join(" ").trim(),
  };
}
```

## 状态管理

### 关键状态字段

```typescript
const state: TuiStateAccess = {
  currentAgentId: string;        // 当前选中的 AI 代理
  currentSessionKey: string;     // 当前会话标识
  activeChatRunId: string | null; // 活跃的聊天运行 ID
  historyLoaded: boolean;        // 历史记录是否已加载
  toolsExpanded: boolean;        // 工具输出是否展开
  showThinking: boolean;         // 是否显示思考过程
  connectionStatus: string;      // 连接状态
  activityStatus: string;        // 活动状态
};
```

### 活动状态

| 状态 | 描述 |
|------|------|
| `idle` | 空闲 |
| `sending` | 发送中 |
| `waiting` | 等待响应 |
| `streaming` | 流式接收 |
| `running` | 工具执行中 |
| `aborted` | 已中止 |
| `error` | 错误 |

## 主题系统

### 主题配置

**文件位置**: `src/tui/theme/theme.ts`

```typescript
export const theme = {
  // 消息样式
  userMessage: chalk.cyan,
  assistantMessage: chalk.white,
  systemMessage: chalk.gray,

  // 工具样式
  toolTitle: chalk.bold,
  toolPendingBg: chalk.bgYellow,
  toolSuccessBg: chalk.bgGreen,
  toolErrorBg: chalk.bgRed,
  toolOutput: chalk.dim,

  // 状态样式
  connected: chalk.green,
  disconnected: chalk.red,

  // 其他
  dim: chalk.dim,
  bold: chalk.bold,
};
```

## 核心代码位置

```
src/tui/
├── tui.ts:50-200              # 主入口和初始化
├── gateway-chat.ts:30-150     # WebSocket 客户端
├── tui-event-handlers.ts:20-150  # 事件处理
├── tui-stream-assembler.ts:10-80 # 流式组装
├── components/chat-log.ts:20-120 # 聊天日志组件
├── components/custom-editor.ts:10-80 # 编辑器组件
├── commands.ts:10-60          # 命令解析
```

## 相关文档

- [Gateway 网关模块](./Gateway网关模块分析.md)
- [CLI 入口层分析](./CLI入口层分析.md)
- [会话管理系统](./会话管理系统分析.md)
