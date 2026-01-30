---
summary: "计划：统一的插件 SDK 与运行时，覆盖所有消息连接器"
read_when:
  - 定义或重构插件架构
  - 将渠道连接器迁移到插件 SDK 或运行时
---
# 插件 SDK 与运行时重构计划

目标：每个消息连接器都是插件（内置或外部），并使用同一套稳定 API。
插件不得直接从 `src/**` 导入，所有依赖通过 SDK 或运行时提供。

## 为什么现在做
- 现有连接器模式混杂：直接 core 导入、仅 dist 的桥接、以及自定义 helper。
- 这使升级脆弱，并阻碍清晰的外部插件能力面。

## 目标架构（两层）

### 1) 插件 SDK（编译期、稳定、可发布）
范围：类型、helper 与配置工具。无运行时状态、无副作用。

内容示例：
- Types：`ChannelPlugin`、adapters、`ChannelMeta`、`ChannelCapabilities`、`ChannelDirectoryEntry`。
- 配置 helper：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、
  `applyAccountNameToChannelSection`。
- 配对 helper：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。
- 引导 helper：`promptChannelAccessConfig`、`addWildcardAllowFrom`、onboarding types。
- 工具参数 helper：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。
- 文档链接 helper：`formatDocsLink`。

交付方式：
- 发布为 `@clawdbot/plugin-sdk`（或从 core 以 `clawdbot/plugin-sdk` 导出）。
- 使用 semver 并给出明确稳定性保证。

### 2) 插件运行时（执行面、注入）
范围：所有触及核心运行时行为的功能。
通过 `MoltbotPluginApi.runtime` 访问，确保插件不直接导入 `src/**`。

建议的最小但完整接口：
```ts
export type PluginRuntime = {
  channel: {
    text: {
      chunkMarkdownText(text: string, limit: number): string[];
      resolveTextChunkLimit(cfg: MoltbotConfig, channel: string, accountId?: string): number;
      hasControlCommand(text: string, cfg: MoltbotConfig): boolean;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher(params: {
        ctx: unknown;
        cfg: unknown;
        dispatcherOptions: {
          deliver: (payload: { text?: string; mediaUrls?: string[]; mediaUrl?: string }) =>
            void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // adapter for Teams-style flows
    };
    routing: {
      resolveAgentRoute(params: {
        cfg: unknown;
        channel: string;
        accountId: string;
        peer: { kind: "dm" | "group" | "channel"; id: string };
      }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: {
        channel: string;
        id: string;
        meta?: { name?: string };
      }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(
        buffer: Uint8Array,
        contentType: string | undefined,
        direction: "inbound" | "outbound",
        maxBytes: number,
      ): Promise<{ path: string; contentType?: string }>;
    };
    mentions: {
      buildMentionRegexes(cfg: MoltbotConfig, agentId?: string): RegExp[];
      matchesMentionPatterns(text: string, regexes: RegExp[]): boolean;
    };
    groups: {
      resolveGroupPolicy(cfg: MoltbotConfig, channel: string, accountId: string, groupId: string): {
        allowlistEnabled: boolean;
        allowed: boolean;
        groupConfig?: unknown;
        defaultConfig?: unknown;
      };
      resolveRequireMention(
        cfg: MoltbotConfig,
        channel: string,
        accountId: string,
        groupId: string,
        override?: boolean,
      ): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: {
        debounceMs: number;
        buildKey: (v: T) => string | null;
        shouldDebounce: (v: T) => boolean;
        onFlush: (entries: T[]) => Promise<void>;
        onError?: (err: unknown) => void;
      }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: MoltbotConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: {
        useAccessGroups: boolean;
        authorizers: Array<{ configured: boolean; allowed: boolean }>;
      }): boolean;
    };
  };
  logging: {
    shouldLogVerbose(): boolean;
    getChildLogger(name: string): PluginLogger;
  };
  state: {
    resolveStateDir(cfg: MoltbotConfig): string;
  };
};
```

说明：
- 运行时是访问核心行为的唯一途径。
- SDK 有意保持小而稳定。
- 每个运行时方法都映射到现有 core 实现（不重复实现）。

## 迁移计划（分阶段，安全）

### 阶段 0：脚手架
- 引入 `@clawdbot/plugin-sdk`。
- 为 `MoltbotPluginApi` 增加 `api.runtime`，包含上述接口。
- 过渡期保留现有导入（输出弃用警告）。

### 阶段 1：桥接清理（低风险）
- 用 `api.runtime` 替换各扩展的 `core-bridge.ts`。
- 优先迁移 BlueBubbles、Zalo、Zalo Personal（已较接近）。
- 删除重复的桥接代码。

### 阶段 2：轻量直接导入插件
- 迁移 Matrix 到 SDK + runtime。
- 验证 onboarding、目录、群提及逻辑。

### 阶段 3：重度直接导入插件
- 迁移 MS Teams（运行时 helper 最多）。
- 确保回复与输入指示语义与当前一致。

### 阶段 4：iMessage 插件化
- 将 iMessage 移至 `extensions/imessage`。
- 用 `api.runtime` 替换直接 core 调用。
- 保持配置键、CLI 行为与文档不变。

### 阶段 5：强制执行
- 添加 lint 规则或 CI 检查：`extensions/**` 禁止导入 `src/**`。
- 添加插件 SDK 或版本兼容检查（runtime + SDK semver）。

## 兼容与版本
- SDK：semver，发布并记录变更。
- Runtime：随 core 发布版本化，添加 `api.runtime.version`。
- 插件声明所需 runtime 范围（如 `moltbotRuntime: ">=2026.2.0"`）。

## 测试策略
- 适配器级单测（用真实 core 实现调用 runtime 函数）。
- 插件 golden 测试：确保行为无漂移（路由、配对、允许列表、提及 gating）。
- CI 中使用单一端到端插件样例（安装、运行、冒烟）。

## 未决问题
- SDK 类型应放在独立包还是 core 导出？
- 运行时类型分发方式：SDK 中仅类型，还是 core 中提供？
- 对内置与外部插件的文档链接如何暴露？
- 过渡期是否允许仓库内插件有限直导 core？

## 成功标准
- 所有渠道连接器为插件并使用 SDK + runtime。
- `extensions/**` 不再导入 `src/**`。
- 新连接器模板仅依赖 SDK + runtime。
- 外部插件可在无需 core 源码的情况下开发与更新。

相关文档：[Plugins](/plugin)、[Channels](/channels/index)、[Configuration](/gateway/configuration)。
