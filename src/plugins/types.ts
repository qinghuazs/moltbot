/**
 * 插件类型定义模块
 *
 * 本模块定义了 Moltbot 插件系统的所有类型，包括：
 * - 插件配置和验证
 * - 插件工具和钩子
 * - 插件命令和服务
 * - 插件生命周期钩子
 * - 提供商插件
 *
 * 插件可以扩展 Moltbot 的功能，包括添加新的工具、命令、渠道和服务。
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Command } from "commander";

import type { AgentMessage } from "@mariozechner/pi-agent-core";

import type { AuthProfileCredential, OAuthCredential } from "../agents/auth-profiles/types.js";
import type { AnyAgentTool } from "../agents/tools/common.js";
import type { ChannelDock } from "../channels/dock.js";
import type { ChannelPlugin } from "../channels/plugins/types.js";
import type { MoltbotConfig } from "../config/config.js";
import type { InternalHookHandler } from "../hooks/internal-hooks.js";
import type { HookEntry } from "../hooks/types.js";
import type { ModelProviderConfig } from "../config/types.js";
import type { RuntimeEnv } from "../runtime.js";
import type { ReplyPayload } from "../auto-reply/types.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import type { createVpsAwareOAuthHandlers } from "../commands/oauth-flow.js";
import type { GatewayRequestHandler } from "../gateway/server-methods/types.js";
import type { PluginRuntime } from "./runtime/types.js";

export type { PluginRuntime } from "./runtime/types.js";

// =============================================================================
// 插件日志和配置
// =============================================================================

/** 插件日志接口 */
export type PluginLogger = {
  /** 调试日志（可选） */
  debug?: (message: string) => void;
  /** 信息日志 */
  info: (message: string) => void;
  /** 警告日志 */
  warn: (message: string) => void;
  /** 错误日志 */
  error: (message: string) => void;
};

/** 插件配置 UI 提示 */
export type PluginConfigUiHint = {
  /** 显示标签 */
  label?: string;
  /** 帮助文本 */
  help?: string;
  /** 是否为高级选项 */
  advanced?: boolean;
  /** 是否为敏感信息 */
  sensitive?: boolean;
  /** 占位符文本 */
  placeholder?: string;
};

/** 插件类型 */
export type PluginKind = "memory";

/** 插件配置验证结果 */
export type PluginConfigValidation =
  | { ok: true; value?: unknown }
  | { ok: false; errors: string[] };

/** Moltbot 插件配置模式 */
export type MoltbotPluginConfigSchema = {
  /** Zod 风格的安全解析 */
  safeParse?: (value: unknown) => {
    success: boolean;
    data?: unknown;
    error?: {
      issues?: Array<{ path: Array<string | number>; message: string }>;
    };
  };
  /** 解析函数 */
  parse?: (value: unknown) => unknown;
  /** 验证函数 */
  validate?: (value: unknown) => PluginConfigValidation;
  /** UI 提示映射 */
  uiHints?: Record<string, PluginConfigUiHint>;
  /** JSON Schema 定义 */
  jsonSchema?: Record<string, unknown>;
};

// =============================================================================
// 插件工具
// =============================================================================

/** 插件工具上下文 */
export type MoltbotPluginToolContext = {
  /** Moltbot 配置 */
  config?: MoltbotConfig;
  /** 工作区目录 */
  workspaceDir?: string;
  /** 代理目录 */
  agentDir?: string;
  /** 代理 ID */
  agentId?: string;
  /** 会话键 */
  sessionKey?: string;
  /** 消息渠道 */
  messageChannel?: string;
  /** 代理账户 ID */
  agentAccountId?: string;
  /** 是否沙箱化 */
  sandboxed?: boolean;
};

/** 插件工具工厂函数 */
export type MoltbotPluginToolFactory = (
  ctx: MoltbotPluginToolContext,
) => AnyAgentTool | AnyAgentTool[] | null | undefined;

/** 插件工具选项 */
export type MoltbotPluginToolOptions = {
  /** 工具名称 */
  name?: string;
  /** 工具名称列表 */
  names?: string[];
  /** 是否可选 */
  optional?: boolean;
};

// =============================================================================
// 插件钩子
// =============================================================================

/** 插件钩子选项 */
export type MoltbotPluginHookOptions = {
  /** 钩子条目 */
  entry?: HookEntry;
  /** 钩子名称 */
  name?: string;
  /** 钩子描述 */
  description?: string;
  /** 是否注册 */
  register?: boolean;
};

// =============================================================================
// 提供商认证
// =============================================================================

/** 提供商认证类型 */
export type ProviderAuthKind = "oauth" | "api_key" | "token" | "device_code" | "custom";

/** 提供商认证结果 */
export type ProviderAuthResult = {
  /** 认证配置文件列表 */
  profiles: Array<{ profileId: string; credential: AuthProfileCredential }>;
  /** 配置补丁 */
  configPatch?: Partial<MoltbotConfig>;
  /** 默认模型 */
  defaultModel?: string;
  /** 备注信息 */
  notes?: string[];
};

/** 提供商认证上下文 */
export type ProviderAuthContext = {
  /** Moltbot 配置 */
  config: MoltbotConfig;
  /** 代理目录 */
  agentDir?: string;
  /** 工作区目录 */
  workspaceDir?: string;
  /** 向导提示器 */
  prompter: WizardPrompter;
  /** 运行时环境 */
  runtime: RuntimeEnv;
  /** 是否为远程 */
  isRemote: boolean;
  /** 打开 URL 的函数 */
  openUrl: (url: string) => Promise<void>;
  /** OAuth 相关工具 */
  oauth: {
    createVpsAwareHandlers: typeof createVpsAwareOAuthHandlers;
  };
};

/** 提供商认证方法 */
export type ProviderAuthMethod = {
  /** 方法 ID */
  id: string;
  /** 显示标签 */
  label: string;
  /** 提示信息 */
  hint?: string;
  /** 认证类型 */
  kind: ProviderAuthKind;
  /** 执行认证 */
  run: (ctx: ProviderAuthContext) => Promise<ProviderAuthResult>;
};

/** 提供商插件定义 */
export type ProviderPlugin = {
  /** 提供商 ID */
  id: string;
  /** 显示标签 */
  label: string;
  /** 文档路径 */
  docsPath?: string;
  /** 别名列表 */
  aliases?: string[];
  /** 环境变量列表 */
  envVars?: string[];
  /** 模型配置 */
  models?: ModelProviderConfig;
  /** 认证方法列表 */
  auth: ProviderAuthMethod[];
  /** 格式化 API 密钥 */
  formatApiKey?: (cred: AuthProfileCredential) => string;
  /** 刷新 OAuth 令牌 */
  refreshOAuth?: (cred: OAuthCredential) => Promise<OAuthCredential>;
};

// =============================================================================
// 网关方法
// =============================================================================

/** 插件网关方法 */
export type MoltbotPluginGatewayMethod = {
  /** 方法名称 */
  method: string;
  /** 处理函数 */
  handler: GatewayRequestHandler;
};

// =============================================================================
// 插件命令
// =============================================================================

/**
 * 传递给插件命令处理器的上下文
 */
export type PluginCommandContext = {
  /** 发送者标识（如 Telegram 用户 ID） */
  senderId?: string;
  /** 渠道/平台（如 "telegram"、"discord"） */
  channel: string;
  /** 发送者是否在允许列表中 */
  isAuthorizedSender: boolean;
  /** 命令名称后的原始参数 */
  args?: string;
  /** 完整的规范化命令体 */
  commandBody: string;
  /** 当前 Moltbot 配置 */
  config: MoltbotConfig;
};

/**
 * 插件命令处理器返回的结果
 */
export type PluginCommandResult = ReplyPayload;

/**
 * 插件命令处理函数
 */
export type PluginCommandHandler = (
  ctx: PluginCommandContext,
) => PluginCommandResult | Promise<PluginCommandResult>;

/**
 * 插件注册命令的定义
 */
export type MoltbotPluginCommandDefinition = {
  /** 命令名称，不含前导斜杠（如 "tts"） */
  name: string;
  /** 在 /help 和命令菜单中显示的描述 */
  description: string;
  /** 此命令是否接受参数 */
  acceptsArgs?: boolean;
  /** 是否仅授权发送者可使用此命令（默认：true） */
  requireAuth?: boolean;
  /** 处理函数 */
  handler: PluginCommandHandler;
};

// =============================================================================
// HTTP 处理器
// =============================================================================

/** 插件 HTTP 处理器（返回是否已处理） */
export type MoltbotPluginHttpHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<boolean> | boolean;

/** 插件 HTTP 路由处理器 */
export type MoltbotPluginHttpRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void;

// =============================================================================
// CLI 和服务
// =============================================================================

/** 插件 CLI 上下文 */
export type MoltbotPluginCliContext = {
  /** Commander 程序实例 */
  program: Command;
  /** Moltbot 配置 */
  config: MoltbotConfig;
  /** 工作区目录 */
  workspaceDir?: string;
  /** 日志记录器 */
  logger: PluginLogger;
};

/** 插件 CLI 注册器 */
export type MoltbotPluginCliRegistrar = (ctx: MoltbotPluginCliContext) => void | Promise<void>;

/** 插件服务上下文 */
export type MoltbotPluginServiceContext = {
  /** Moltbot 配置 */
  config: MoltbotConfig;
  /** 工作区目录 */
  workspaceDir?: string;
  /** 状态目录 */
  stateDir: string;
  /** 日志记录器 */
  logger: PluginLogger;
};

/** 插件服务定义 */
export type MoltbotPluginService = {
  /** 服务 ID */
  id: string;
  /** 启动服务 */
  start: (ctx: MoltbotPluginServiceContext) => void | Promise<void>;
  /** 停止服务 */
  stop?: (ctx: MoltbotPluginServiceContext) => void | Promise<void>;
};

// =============================================================================
// 渠道注册
// =============================================================================

/** 插件渠道注册 */
export type MoltbotPluginChannelRegistration = {
  /** 渠道插件 */
  plugin: ChannelPlugin;
  /** 渠道停靠点 */
  dock?: ChannelDock;
};

// =============================================================================
// 插件定义和 API
// =============================================================================

/** Moltbot 插件定义 */
export type MoltbotPluginDefinition = {
  /** 插件 ID */
  id?: string;
  /** 插件名称 */
  name?: string;
  /** 插件描述 */
  description?: string;
  /** 插件版本 */
  version?: string;
  /** 插件类型 */
  kind?: PluginKind;
  /** 配置模式 */
  configSchema?: MoltbotPluginConfigSchema;
  /** 注册回调（早期阶段） */
  register?: (api: MoltbotPluginApi) => void | Promise<void>;
  /** 激活回调（后期阶段） */
  activate?: (api: MoltbotPluginApi) => void | Promise<void>;
};

/** 插件模块（可以是定义对象或函数） */
export type MoltbotPluginModule =
  | MoltbotPluginDefinition
  | ((api: MoltbotPluginApi) => void | Promise<void>);

/** Moltbot 插件 API */
export type MoltbotPluginApi = {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version?: string;
  /** 插件描述 */
  description?: string;
  /** 插件来源 */
  source: string;
  /** Moltbot 配置 */
  config: MoltbotConfig;
  /** 插件特定配置 */
  pluginConfig?: Record<string, unknown>;
  /** 插件运行时 */
  runtime: PluginRuntime;
  /** 日志记录器 */
  logger: PluginLogger;
  /** 注册工具 */
  registerTool: (
    tool: AnyAgentTool | MoltbotPluginToolFactory,
    opts?: MoltbotPluginToolOptions,
  ) => void;
  /** 注册钩子 */
  registerHook: (
    events: string | string[],
    handler: InternalHookHandler,
    opts?: MoltbotPluginHookOptions,
  ) => void;
  /** 注册 HTTP 处理器 */
  registerHttpHandler: (handler: MoltbotPluginHttpHandler) => void;
  /** 注册 HTTP 路由 */
  registerHttpRoute: (params: { path: string; handler: MoltbotPluginHttpRouteHandler }) => void;
  /** 注册渠道 */
  registerChannel: (registration: MoltbotPluginChannelRegistration | ChannelPlugin) => void;
  /** 注册网关方法 */
  registerGatewayMethod: (method: string, handler: GatewayRequestHandler) => void;
  /** 注册 CLI 命令 */
  registerCli: (registrar: MoltbotPluginCliRegistrar, opts?: { commands?: string[] }) => void;
  /** 注册服务 */
  registerService: (service: MoltbotPluginService) => void;
  /** 注册提供商 */
  registerProvider: (provider: ProviderPlugin) => void;
  /**
   * 注册绕过 LLM 代理的自定义命令
   *
   * 插件命令在内置命令和代理调用之前处理。
   * 用于不需要 AI 推理的简单状态切换或状态命令。
   */
  registerCommand: (command: MoltbotPluginCommandDefinition) => void;
  /** 解析路径 */
  resolvePath: (input: string) => string;
  /** 注册生命周期钩子处理器 */
  on: <K extends PluginHookName>(
    hookName: K,
    handler: PluginHookHandlerMap[K],
    opts?: { priority?: number },
  ) => void;
};

/** 插件来源 */
export type PluginOrigin = "bundled" | "global" | "workspace" | "config";

/** 插件诊断信息 */
export type PluginDiagnostic = {
  /** 级别 */
  level: "warn" | "error";
  /** 消息 */
  message: string;
  /** 插件 ID */
  pluginId?: string;
  /** 来源 */
  source?: string;
};

// ============================================================================
// 插件生命周期钩子
// ============================================================================

/** 插件钩子名称 */
export type PluginHookName =
  | "before_agent_start" // 代理启动前
  | "agent_end" // 代理结束
  | "before_compaction" // 压缩前
  | "after_compaction" // 压缩后
  | "message_received" // 消息接收
  | "message_sending" // 消息发送中
  | "message_sent" // 消息已发送
  | "before_tool_call" // 工具调用前
  | "after_tool_call" // 工具调用后
  | "tool_result_persist" // 工具结果持久化
  | "session_start" // 会话开始
  | "session_end" // 会话结束
  | "gateway_start" // 网关启动
  | "gateway_stop"; // 网关停止

/** 代理钩子共享的上下文 */
export type PluginHookAgentContext = {
  /** 代理 ID */
  agentId?: string;
  /** 会话键 */
  sessionKey?: string;
  /** 工作区目录 */
  workspaceDir?: string;
  /** 消息提供商 */
  messageProvider?: string;
};

// -----------------------------------------------------------------------------
// before_agent_start 钩子
// -----------------------------------------------------------------------------

/** 代理启动前事件 */
export type PluginHookBeforeAgentStartEvent = {
  /** 提示词 */
  prompt: string;
  /** 消息列表 */
  messages?: unknown[];
};

/** 代理启动前结果 */
export type PluginHookBeforeAgentStartResult = {
  /** 系统提示词 */
  systemPrompt?: string;
  /** 前置上下文 */
  prependContext?: string;
};

// -----------------------------------------------------------------------------
// agent_end 钩子
// -----------------------------------------------------------------------------

/** 代理结束事件 */
export type PluginHookAgentEndEvent = {
  /** 消息列表 */
  messages: unknown[];
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 持续时间（毫秒） */
  durationMs?: number;
};

// -----------------------------------------------------------------------------
// 压缩钩子
// -----------------------------------------------------------------------------

/** 压缩前事件 */
export type PluginHookBeforeCompactionEvent = {
  /** 消息数量 */
  messageCount: number;
  /** Token 数量 */
  tokenCount?: number;
};

/** 压缩后事件 */
export type PluginHookAfterCompactionEvent = {
  /** 消息数量 */
  messageCount: number;
  /** Token 数量 */
  tokenCount?: number;
  /** 已压缩数量 */
  compactedCount: number;
};

// -----------------------------------------------------------------------------
// 消息钩子
// -----------------------------------------------------------------------------

/** 消息上下文 */
export type PluginHookMessageContext = {
  /** 渠道 ID */
  channelId: string;
  /** 账户 ID */
  accountId?: string;
  /** 会话 ID */
  conversationId?: string;
};

/** 消息接收事件 */
export type PluginHookMessageReceivedEvent = {
  /** 发送者 */
  from: string;
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
};

/** 消息发送中事件 */
export type PluginHookMessageSendingEvent = {
  /** 接收者 */
  to: string;
  /** 内容 */
  content: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
};

/** 消息发送中结果 */
export type PluginHookMessageSendingResult = {
  /** 修改后的内容 */
  content?: string;
  /** 是否取消发送 */
  cancel?: boolean;
};

/** 消息已发送事件 */
export type PluginHookMessageSentEvent = {
  /** 接收者 */
  to: string;
  /** 内容 */
  content: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
};

// -----------------------------------------------------------------------------
// 工具钩子
// -----------------------------------------------------------------------------

/** 工具上下文 */
export type PluginHookToolContext = {
  /** 代理 ID */
  agentId?: string;
  /** 会话键 */
  sessionKey?: string;
  /** 工具名称 */
  toolName: string;
};

/** 工具调用前事件 */
export type PluginHookBeforeToolCallEvent = {
  /** 工具名称 */
  toolName: string;
  /** 参数 */
  params: Record<string, unknown>;
};

/** 工具调用前结果 */
export type PluginHookBeforeToolCallResult = {
  /** 修改后的参数 */
  params?: Record<string, unknown>;
  /** 是否阻止调用 */
  block?: boolean;
  /** 阻止原因 */
  blockReason?: string;
};

/** 工具调用后事件 */
export type PluginHookAfterToolCallEvent = {
  /** 工具名称 */
  toolName: string;
  /** 参数 */
  params: Record<string, unknown>;
  /** 结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 持续时间（毫秒） */
  durationMs?: number;
};

/** 工具结果持久化上下文 */
export type PluginHookToolResultPersistContext = {
  /** 代理 ID */
  agentId?: string;
  /** 会话键 */
  sessionKey?: string;
  /** 工具名称 */
  toolName?: string;
  /** 工具调用 ID */
  toolCallId?: string;
};

/** 工具结果持久化事件 */
export type PluginHookToolResultPersistEvent = {
  /** 工具名称 */
  toolName?: string;
  /** 工具调用 ID */
  toolCallId?: string;
  /**
   * 即将写入会话记录的工具结果消息
   * 处理器可以返回修改后的消息（如删除非必要字段）
   */
  message: AgentMessage;
  /** 工具结果是否由守卫/修复步骤合成 */
  isSynthetic?: boolean;
};

/** 工具结果持久化结果 */
export type PluginHookToolResultPersistResult = {
  /** 修改后的消息 */
  message?: AgentMessage;
};

// -----------------------------------------------------------------------------
// 会话钩子
// -----------------------------------------------------------------------------

/** 会话上下文 */
export type PluginHookSessionContext = {
  /** 代理 ID */
  agentId?: string;
  /** 会话 ID */
  sessionId: string;
};

/** 会话开始事件 */
export type PluginHookSessionStartEvent = {
  /** 会话 ID */
  sessionId: string;
  /** 从哪个会话恢复 */
  resumedFrom?: string;
};

/** 会话结束事件 */
export type PluginHookSessionEndEvent = {
  /** 会话 ID */
  sessionId: string;
  /** 消息数量 */
  messageCount: number;
  /** 持续时间（毫秒） */
  durationMs?: number;
};

// -----------------------------------------------------------------------------
// 网关钩子
// -----------------------------------------------------------------------------

/** 网关上下文 */
export type PluginHookGatewayContext = {
  /** 端口 */
  port?: number;
};

/** 网关启动事件 */
export type PluginHookGatewayStartEvent = {
  /** 端口 */
  port: number;
};

/** 网关停止事件 */
export type PluginHookGatewayStopEvent = {
  /** 停止原因 */
  reason?: string;
};

// -----------------------------------------------------------------------------
// 钩子处理器映射
// -----------------------------------------------------------------------------

/** 按钩子名称映射的处理器类型 */
export type PluginHookHandlerMap = {
  before_agent_start: (
    event: PluginHookBeforeAgentStartEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<PluginHookBeforeAgentStartResult | void> | PluginHookBeforeAgentStartResult | void;
  agent_end: (event: PluginHookAgentEndEvent, ctx: PluginHookAgentContext) => Promise<void> | void;
  before_compaction: (
    event: PluginHookBeforeCompactionEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  after_compaction: (
    event: PluginHookAfterCompactionEvent,
    ctx: PluginHookAgentContext,
  ) => Promise<void> | void;
  message_received: (
    event: PluginHookMessageReceivedEvent,
    ctx: PluginHookMessageContext,
  ) => Promise<void> | void;
  message_sending: (
    event: PluginHookMessageSendingEvent,
    ctx: PluginHookMessageContext,
  ) => Promise<PluginHookMessageSendingResult | void> | PluginHookMessageSendingResult | void;
  message_sent: (
    event: PluginHookMessageSentEvent,
    ctx: PluginHookMessageContext,
  ) => Promise<void> | void;
  before_tool_call: (
    event: PluginHookBeforeToolCallEvent,
    ctx: PluginHookToolContext,
  ) => Promise<PluginHookBeforeToolCallResult | void> | PluginHookBeforeToolCallResult | void;
  after_tool_call: (
    event: PluginHookAfterToolCallEvent,
    ctx: PluginHookToolContext,
  ) => Promise<void> | void;
  tool_result_persist: (
    event: PluginHookToolResultPersistEvent,
    ctx: PluginHookToolResultPersistContext,
  ) => PluginHookToolResultPersistResult | void;
  session_start: (
    event: PluginHookSessionStartEvent,
    ctx: PluginHookSessionContext,
  ) => Promise<void> | void;
  session_end: (
    event: PluginHookSessionEndEvent,
    ctx: PluginHookSessionContext,
  ) => Promise<void> | void;
  gateway_start: (
    event: PluginHookGatewayStartEvent,
    ctx: PluginHookGatewayContext,
  ) => Promise<void> | void;
  gateway_stop: (
    event: PluginHookGatewayStopEvent,
    ctx: PluginHookGatewayContext,
  ) => Promise<void> | void;
};

/** 插件钩子注册信息 */
export type PluginHookRegistration<K extends PluginHookName = PluginHookName> = {
  /** 插件 ID */
  pluginId: string;
  /** 钩子名称 */
  hookName: K;
  /** 处理函数 */
  handler: PluginHookHandlerMap[K];
  /** 优先级 */
  priority?: number;
  /** 来源 */
  source: string;
};
