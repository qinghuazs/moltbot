# Gateway 网关模块深度分析

## 1. 网关核心架构和入口文件

### 1.1 主入口文件

**核心文件：** `src/gateway/server.impl.ts`

这是网关的主要实现文件，包含 `startGatewayServer` 函数，是整个网关系统的启动入口。

**关键架构组件：**

1. **配置管理**
   - 读取配置快照并验证
   - 处理遗留配置迁移
   - 自动启用插件

2. **依赖注入系统**
   - 创建默认依赖 `createDefaultDeps()`
   - 初始化子代理注册表
   - 加载网关插件和通道插件
   - 解析运行时配置

3. **运行时状态初始化**
   - 通过 `createGatewayRuntimeState` 创建核心运行时状态
   - 包括 HTTP 服务器、WebSocket 服务器、客户端集合、广播系统等

### 1.2 启动流程文件

**文件：** `src/gateway/server-startup.ts`

负责启动网关的辅助服务：

- 浏览器控制服务器
- Gmail 监视器
- 内部钩子加载
- 通道启动
- 插件服务

### 1.3 引导系统

**文件：** `src/gateway/boot.ts`

实现网关启动时的自动化任务执行：
- 读取 `BOOT.md` 文件
- 构建引导提示
- 通过 `agentCommand` 执行引导任务

## 2. 网关的消息路由机制

### 2.1 WebSocket 连接处理

**文件：** `src/gateway/server/ws-connection.ts`

WebSocket 连接的生命周期管理：

1. **连接建立**
   - 生成连接 ID
   - 提取客户端信息（IP、User-Agent、Origin 等）
   - 发送连接挑战 `connect.challenge`
   - 设置握手超时定时器

2. **连接关闭处理**
   - 更新系统存在状态
   - 注销节点（如果是节点角色）
   - 取消所有订阅
   - 记录关闭原因和元数据

### 2.2 请求路由和方法分发

**文件：** `src/gateway/server-methods.ts`

核心请求处理器：

1. **权限验证**
   - 基于角色的访问控制（RBAC）
   - 作用域检查（admin、read、write、approvals、pairing）
   - 方法级别的权限验证

2. **方法分发**
   ```typescript
   export async function handleGatewayRequest(opts) {
     const authError = authorizeGatewayMethod(req.method, client);
     if (authError) {
       respond(false, undefined, authError);
       return;
     }
     const handler = opts.extraHandlers?.[req.method] ?? coreGatewayHandlers[req.method];
     if (!handler) {
       respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `unknown method`));
       return;
     }
     await handler({ req, params, client, isWebchatConnect, respond, context });
   }
   ```

3. **核心处理器集合**
   - 连接处理器 `connectHandlers`
   - 日志处理器 `logsHandlers`
   - 通道处理器 `channelsHandlers`
   - 聊天处理器 `chatHandlers`
   - 节点处理器 `nodeHandlers`

### 2.3 协议定义

**文件：** `src/gateway/protocol/index.ts`

定义了完整的网关协议：

- **帧类型**：RequestFrame、ResponseFrame、EventFrame
- **参数验证器**：使用 AJV 进行 JSON Schema 验证
- **错误代码**：ErrorCodes 枚举
- **协议版本**：PROTOCOL_VERSION

## 3. 网关与各通道的集成方式

### 3.1 通道管理器

**文件：** `src/gateway/server-channels.ts`

实现了统一的通道生命周期管理：

**核心数据结构：**
```typescript
type ChannelRuntimeStore = {
  aborts: Map<string, AbortController>;
  tasks: Map<string, Promise<unknown>>;
  runtimes: Map<string, ChannelAccountSnapshot>;
};
```

**关键功能：**

1. **启动通道**
   ```typescript
   const startChannel = async (channelId: ChannelId, accountId?: string) => {
     const plugin = getChannelPlugin(channelId);
     const startAccount = plugin?.gateway?.startAccount;
     if (!startAccount) return;

     // 检查账户是否启用和配置
     const enabled = plugin.config.isEnabled ?
       plugin.config.isEnabled(account, cfg) :
       isAccountEnabled(account);

     // 创建 AbortController 用于取消
     const abort = new AbortController();

     // 启动账户并跟踪任务
     const task = startAccount({
       cfg, accountId, account, runtime, abortSignal: abort.signal,
       log, getStatus, setStatus
     });
   }
   ```

2. **停止通道**
   - 中止所有运行中的任务
   - 调用插件的 `stopAccount` 钩子
   - 清理运行时状态

3. **运行时快照**
   - 收集所有通道的状态
   - 包括连接状态、错误信息、账户信息

### 3.2 通道插件架构

通道通过插件系统集成：

```typescript
const channelMethods = listChannelPlugins().flatMap(
  (plugin) => plugin.gatewayMethods ?? []
);
const gatewayMethods = Array.from(new Set([...baseGatewayMethods, ...channelMethods]));
```

每个通道插件可以提供：
- `gateway.startAccount`: 启动账户的异步函数
- `gateway.stopAccount`: 停止账户的异步函数
- `gatewayMethods`: 通道特定的网关方法
- `reload.configPrefixes`: 热重载配置前缀
- `reload.noopPrefixes`: 无操作配置前缀

## 4. 网关的事件系统

### 4.1 广播系统

**文件：** `src/gateway/server-broadcast.ts`

实现了高效的事件广播机制：

**核心特性：**

1. **序列号管理**
   - 每个事件都有递增的序列号
   - 客户端可以检测丢失的事件

2. **作用域过滤**
   ```typescript
   function hasEventScope(client: GatewayWsClient, event: string): boolean {
     const required = EVENT_SCOPE_GUARDS[event];
     if (!required) return true;
     const scopes = Array.isArray(client.connect.scopes) ? client.connect.scopes : [];
     if (scopes.includes(ADMIN_SCOPE)) return true;
     return required.some((scope) => scopes.includes(scope));
   }
   ```

3. **慢消费者处理**
   - 检查 `socket.bufferedAmount`
   - 如果 `dropIfSlow` 为 true，跳过慢客户端
   - 否则关闭慢客户端连接

### 4.2 代理事件处理

**文件：** `src/gateway/server-chat.ts`

处理代理运行时事件并转换为聊天事件：

1. **增量消息发送**
   - 节流：150ms
   - 缓冲区管理
   - 广播到 WebChat 和节点

2. **最终消息发送**
   - 处理成功和错误状态
   - 清理缓冲区和定时器

3. **工具事件过滤**
   - 根据会话的 `verboseLevel` 决定是否发送工具事件

### 4.3 节点事件处理

**文件：** `src/gateway/server-node-events.ts`

处理来自节点的事件：

**支持的事件类型：**

1. **语音转录** (`voice.transcript`)
2. **代理请求** (`agent.request`)
3. **聊天订阅** (`chat.subscribe`/`chat.unsubscribe`)
4. **执行事件** (`exec.started`/`exec.finished`/`exec.denied`)

### 4.4 节点注册表

**文件：** `src/gateway/node-registry.ts`

管理连接的节点和远程调用：

1. **节点注册**
   - 提取节点元数据（平台、版本、能力等）
   - 维护节点 ID 到连接 ID 的映射

2. **远程调用**
   ```typescript
   async invoke(params: {
     nodeId: string;
     command: string;
     params?: unknown;
     timeoutMs?: number;
   }): Promise<NodeInvokeResult>
   ```

## 5. 网关的配置和启动流程

### 5.1 配置解析

**文件：** `src/gateway/server-runtime-config.ts`

解析网关运行时配置：

- 绑定主机解析（loopback、LAN、tailnet、auto）
- 认证配置合并
- Tailscale 配置
- 控制 UI 配置
- OpenAI 和 OpenResponses 端点配置
- Hooks 配置

### 5.2 运行时状态创建

**文件：** `src/gateway/server-runtime-state.ts`

创建网关的核心运行时状态：

1. **Canvas Host** - 可选的画布托管服务
2. **HTTP 服务器** - 支持多个绑定主机和 TLS
3. **WebSocket 服务器** - 无服务器模式
4. **广播系统** - 客户端集合管理
5. **聊天运行状态** - 运行注册表和缓冲区管理

### 5.3 配置热重载

**文件：** `src/gateway/config-reload.ts`

实现配置文件的热重载机制：

**重载模式：**
- `off`: 禁用重载
- `restart`: 总是重启网关
- `hot`: 仅热重载
- `hybrid`: 混合模式（默认）

**重载规则：**
```typescript
const BASE_RELOAD_RULES: ReloadRule[] = [
  { prefix: "gateway.remote", kind: "none" },
  { prefix: "hooks.gmail", kind: "hot", actions: ["restart-gmail-watcher"] },
  { prefix: "hooks", kind: "hot", actions: ["reload-hooks"] },
  { prefix: "cron", kind: "hot", actions: ["restart-cron"] },
  { prefix: "browser", kind: "hot", actions: ["restart-browser-control"] },
  { prefix: "plugins", kind: "restart" },
  { prefix: "gateway", kind: "restart" },
];
```

### 5.4 HTTP 请求路由

**文件：** `src/gateway/server-http.ts`

HTTP 请求的路由和处理顺序：

1. Hooks 请求
2. 工具调用 HTTP 请求
3. Slack HTTP 请求
4. 插件 HTTP 请求
5. OpenResponses HTTP 请求
6. OpenAI HTTP 请求
7. Canvas Host 请求
8. 控制 UI 请求
9. 404 Not Found

## 6. 关键文件索引

| 文件 | 说明 |
|------|------|
| `server.impl.ts` | 网关主入口 |
| `server-startup.ts` | 启动辅助服务 |
| `server-methods.ts` | 请求路由和方法分发 |
| `server-channels.ts` | 通道生命周期管理 |
| `server-broadcast.ts` | 事件广播系统 |
| `server-chat.ts` | 聊天事件处理 |
| `server-node-events.ts` | 节点事件处理 |
| `node-registry.ts` | 节点注册和 RPC |
| `config-reload.ts` | 配置热重载 |
| `server-runtime-state.ts` | 运行时状态 |
| `server-runtime-config.ts` | 配置解析 |
| `server-http.ts` | HTTP 请求路由 |
| `protocol/index.ts` | 协议定义 |
| `server/ws-connection.ts` | WebSocket 连接管理 |

## 7. 架构特点总结

1. **插件化架构**：通道、插件和扩展通过统一的接口集成
2. **事件驱动**：基于广播的事件系统，支持实时通信
3. **灵活的路由**：支持 WebSocket、HTTP、Hooks 等多种协议
4. **热重载**：配置变更可以在不重启的情况下应用
5. **权限控制**：基于角色和作用域的细粒度访问控制
6. **节点管理**：支持远程节点连接和 RPC 调用
7. **多通道支持**：统一管理多个消息通道
