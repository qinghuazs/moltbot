---
summary: "Moltbot 插件/扩展：发现、配置与安全"
read_when:
  - 添加或修改插件/扩展
  - 记录插件安装或加载规则
---
# 插件（Extensions）

## 快速开始（第一次用插件？）

插件就是一个 **小型代码模块**，用于扩展 Moltbot 的功能（命令、工具、Gateway RPC）。

多数情况下，你会在需要核心 Moltbot 尚未内置的功能时使用插件（或希望把可选功能从主安装中拆出）。

最快路径：

1) 查看已加载内容：

```bash
moltbot plugins list
```

2) 安装官方插件（示例：Voice Call）：

```bash
moltbot plugins install @moltbot/voice-call
```

3) 重启 Gateway，然后在 `plugins.entries.<id>.config` 下配置。

具体示例见 [Voice Call](/plugins/voice-call)。

## 可用插件（官方）

- Microsoft Teams 在 2026.1.15 起为插件；使用 Teams 请安装 `@moltbot/msteams`。
- Memory（Core）— 内置记忆搜索插件（默认通过 `plugins.slots.memory` 启用）
- Memory（LanceDB）— 内置长期记忆插件（自动回忆/捕获；设 `plugins.slots.memory = "memory-lancedb"`）
- [Voice Call](/plugins/voice-call) — `@moltbot/voice-call`
- [Zalo Personal](/plugins/zalouser) — `@moltbot/zalouser`
- [Matrix](/channels/matrix) — `@moltbot/matrix`
- [Nostr](/channels/nostr) — `@moltbot/nostr`
- [Zalo](/channels/zalo) — `@moltbot/zalo`
- [Microsoft Teams](/channels/msteams) — `@moltbot/msteams`
- Google Antigravity OAuth（provider auth）— 内置 `google-antigravity-auth`（默认禁用）
- Gemini CLI OAuth（provider auth）— 内置 `google-gemini-cli-auth`（默认禁用）
- Qwen OAuth（provider auth）— 内置 `qwen-portal-auth`（默认禁用）
- Copilot Proxy（provider auth）— 本地 VS Code Copilot Proxy 桥接；区别于内置 `github-copilot` 设备登录（内置，默认禁用）

Moltbot 插件是 **TypeScript 模块**，通过 jiti 运行时加载。**配置校验不会执行插件代码**；它只使用插件清单与 JSON Schema。见 [Plugin manifest](/plugins/manifest)。

插件可注册：

- Gateway RPC 方法
- Gateway HTTP 处理器
- Agent 工具
- CLI 命令
- 后台服务
- 可选配置校验
- **Skills**（在插件清单中声明 `skills` 目录）
- **自动回复命令**（无需调用 AI agent）

插件 **与 Gateway 同进程** 运行，请视为可信代码。
工具编写指南见 [Plugin agent tools](/plugins/agent-tools)。

## 运行时助手

插件可通过 `api.runtime` 访问部分核心能力。语音通话 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from Moltbot",
  cfg: api.config,
});
```

说明：
- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 返回 PCM 音频缓冲区 + 采样率；插件需自行重采样/编码。
- telephony 不支持 Edge TTS。

## 发现与优先级

Moltbot 按顺序扫描：

1) 配置路径
- `plugins.load.paths`（文件或目录）

2) 工作区扩展
- `<workspace>/.clawdbot/extensions/*.ts`
- `<workspace>/.clawdbot/extensions/*/index.ts`

3) 全局扩展
- `~/.clawdbot/extensions/*.ts`
- `~/.clawdbot/extensions/*/index.ts`

4) 内置扩展（随 Moltbot 发布，**默认禁用**）
- `<moltbot>/extensions/*`

内置插件必须显式启用：`plugins.entries.<id>.enabled` 或 `moltbot plugins enable <id>`。
安装的插件默认启用，但也可用同样方式禁用。

每个插件根目录必须包含 `moltbot.plugin.json`。如果 `plugins.load.paths` 指向文件，则插件根目录为该文件所在目录，且必须包含清单。

若多个插件解析为同一 id，以以上顺序的第一个为准，低优先级副本会被忽略。

### Package packs

插件目录可包含 `package.json` 的 `moltbot.extensions`：

```json
{
  "name": "my-pack",
  "moltbot": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

每个条目都会成为一个插件。若 pack 列出多个扩展，插件 id 为 `name/<fileBase>`。

若插件依赖 npm 包，请在该目录安装依赖以确保 `node_modules` 可用（`npm install` / `pnpm install`）。

### 通道目录元数据

通道插件可通过 `moltbot.channel` 广播 onboarding 元信息，并通过 `moltbot.install` 提供安装提示。这能让核心目录保持无数据。

示例：

```json
{
  "name": "@moltbot/nextcloud-talk",
  "moltbot": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@moltbot/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

Moltbot 也可合并 **外部通道目录**（例如 MPM registry 导出）。将 JSON 文件放在以下任一位置：
- `~/.clawdbot/mpm/plugins.json`
- `~/.clawdbot/mpm/catalog.json`
- `~/.clawdbot/plugins/catalog.json`

或将 `CLAWDBOT_PLUGIN_CATALOG_PATHS`（或 `CLAWDBOT_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（逗号/分号/`PATH` 分隔）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "moltbot": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 id：

- 包 pack：`package.json` 的 `name`
- 单文件：文件基名（`~/.../voice-call.ts` → `voice-call`）

若插件导出 `id`，Moltbot 会使用它，但当与配置 id 不匹配时会警告。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } }
    }
  }
}
```

字段：
- `enabled`：总开关（默认 true）
- `allow`：允许列表（可选）
- `deny`：拒绝列表（可选；deny 优先）
- `load.paths`：额外插件文件/目录
- `entries.<id>`：按插件开关 + 配置

配置变更 **需要重启 Gateway**。

严格校验规则：
- `entries`、`allow`、`deny` 或 `slots` 中的未知插件 id 均 **报错**。
- `channels.<id>` 未知键 **报错**，除非插件清单声明了该通道 id。
- 插件配置使用 `moltbot.plugin.json` 中的 JSON Schema（`configSchema`）校验。
- 若插件被禁用，其配置仍保留，并发出 **警告**。

## 插件槽位（互斥类别）

部分插件类别 **互斥**（同一时刻只允许一个）。使用 `plugins.slots` 选择哪个插件占用槽位：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core" // 或 "none" 禁用记忆插件
    }
  }
}
```

若多个插件声明 `kind: "memory"`，只有被选中的一个会加载，其他会被禁用并输出诊断。

## Control UI（schema + labels）

Control UI 使用 `config.schema`（JSON Schema + `uiHints`）来渲染更好的表单。

Moltbot 会根据已发现插件在运行时扩展 `uiHints`：

- 为 `plugins.entries.<id>` / `.enabled` / `.config` 添加标签
- 将插件提供的配置字段提示合并到：
  `plugins.entries.<id>.config.<field>`

若希望插件配置字段显示良好的 label/placeholder（并标记敏感字段），
请在插件清单中提供 JSON Schema 与 `uiHints`。

示例：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
moltbot plugins list
moltbot plugins info <id>
moltbot plugins install <path>                 # 复制本地文件/目录到 ~/.clawdbot/extensions/<id>
moltbot plugins install ./extensions/voice-call # 相对路径 OK
moltbot plugins install ./plugin.tgz           # 从本地 tarball 安装
moltbot plugins install ./plugin.zip           # 从本地 zip 安装
moltbot plugins install -l ./extensions/voice-call # link（不拷贝）用于开发
moltbot plugins install @moltbot/voice-call # 从 npm 安装
moltbot plugins update <id>
moltbot plugins update --all
moltbot plugins enable <id>
moltbot plugins disable <id>
moltbot plugins doctor
```

`plugins update` 仅对 `plugins.installs` 跟踪的 npm 安装生效。

插件也可以注册自己的顶层命令（示例：`moltbot voicecall`）。

## 插件 API（概览）

插件导出以下之一：

- 函数：`(api) => { ... }`
- 对象：`{ id, name, configSchema, register(api) { ... } }`

## 插件 hooks

插件可以携带 hooks 并在运行时注册，从而无需单独安装 hook pack。

### 示例

```
import { registerPluginHooksFromDir } from "moltbot/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

说明：
- Hook 目录遵循正常结构（`HOOK.md` + `handler.ts`）。
- Hook 可用性规则仍适用（OS/bins/env/config）。
- 插件管理的 hooks 会在 `moltbot hooks list` 中显示为 `plugin:<id>`。
- 不能通过 `moltbot hooks` 启用/禁用插件 hooks；需启用/禁用插件本身。

## Provider 插件（模型认证）

插件可注册 **模型提供方认证** 流程，使用户可在 Moltbot 内运行 OAuth 或 API key 设置（无需外部脚本）。

通过 `api.registerProvider(...)` 注册 provider。每个 provider 暴露一个或多个认证方式（OAuth、API key、设备码等）。这些会驱动：

- `moltbot models auth login --provider <id> [--method <id>]`

示例：

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
});
```

说明：
- `run` 会收到 `ProviderAuthContext`，包含 `prompter`、`runtime`、
  `openUrl` 与 `oauth.createVpsAwareHandlers` 辅助方法。
- 若需要添加默认模型或 provider 配置，返回 `configPatch`。
- 返回 `defaultModel` 以便 `--set-default` 更新 agent 默认值。

### 注册消息通道

插件可以注册 **通道插件**，其行为与内置通道一致（WhatsApp、Telegram 等）。通道配置在 `channels.<id>` 下，由通道插件代码校验。

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      (cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? { accountId }),
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

说明：
- 配置放在 `channels.<id>`（不要放在 `plugins.entries`）。
- `meta.label` 用于 CLI/UI 列表的标签。
- `meta.aliases` 提供别名用于规范化与 CLI 输入。
- `meta.preferOver` 用于在两者都配置时跳过自动启用的通道 id。
- `meta.detailLabel` 与 `meta.systemImage` 让 UI 展示更丰富的标签/图标。

### 编写新消息通道（分步）

当你需要 **新的聊天面**（消息通道），而不是模型提供方时使用。
模型提供方文档位于 `/providers/*`。

1) 选择 id + 配置形状
- 所有通道配置都在 `channels.<id>` 下。
- 多账号场景优先 `channels.<id>.accounts.<accountId>`。

2) 定义通道元数据
- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 应指向 `/channels/<id>`。
- `meta.preferOver` 可让插件替换另一个通道（自动启用时优先）。
- `meta.detailLabel` 与 `meta.systemImage` 用于 UI 的详情文本/图标。

3) 实现必要适配器
- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天类型、媒体、线程等）
- `outbound.deliveryMode` + `outbound.sendText`（基础发送）

4) 需要时添加可选适配器
- `setup`（向导）、`security`（DM 策略）、`status`（健康/诊断）
- `gateway`（start/stop/login）、`mentions`、`threading`、`streaming`
- `actions`（消息操作）、`commands`（原生命令行为）

5) 在插件中注册通道
- `api.registerChannel({ plugin })`

最小配置示例：

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true }
      }
    }
  }
}
```

最小通道插件（仅 outbound）：

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      (cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? { accountId }),
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

加载插件（extensions 目录或 `plugins.load.paths`），重启网关，然后在配置中设置 `channels.<id>`。

### Agent 工具

见专门指南：[Plugin agent tools](/plugins/agent-tools)。

### 注册 gateway RPC 方法

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### 注册 CLI 命令

```ts
export default function (api) {
  api.registerCli(({ program }) => {
    program.command("mycmd").action(() => {
      console.log("Hello");
    });
  }, { commands: ["mycmd"] });
}
```

### 注册自动回复命令

插件可以注册自定义 slash 命令，**无需调用 AI agent**。适合开关命令、状态检查或不需要 LLM 处理的快捷动作。

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

命令处理上下文：

- `senderId`：发送者 ID（若可用）
- `channel`：命令所在渠道
- `isAuthorizedSender`：发送者是否授权
- `args`：命令后参数（若 `acceptsArgs: true`）
- `commandBody`：完整命令文本
- `config`：当前 Moltbot 配置

命令选项：

- `name`：命令名（不含前导 `/`）
- `description`：帮助文本
- `acceptsArgs`：是否接受参数（默认 false）。若为 false 且提供参数，命令不会匹配并落入其他处理
- `requireAuth`：是否要求授权发送者（默认 true）
- `handler`：返回 `{ text: string }` 的函数（可 async）

带授权与参数示例：

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

说明：
- 插件命令在 **内置命令与 AI agent 之前** 处理
- 命令全局注册，跨渠道生效
- 命令名不区分大小写（`/MyStatus` 也匹配 `/mystatus`）
- 命令名必须以字母开头，仅包含字母、数字、连字符与下划线
- 保留命令名（如 `help`、`status`、`reset` 等）不可被插件覆盖
- 多插件重复注册命令会失败并输出诊断错误

### 注册后台服务

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## 命名规范

- Gateway 方法：`pluginId.action`（示例：`voicecall.status`）
- 工具：`snake_case`（示例：`voice_call`）
- CLI 命令：kebab 或 camel，但避免与核心命令冲突

## Skills

插件可在仓库中携带技能（`skills/<name>/SKILL.md`）。
通过 `plugins.entries.<id>.enabled`（或其他 gating）启用，并确保其在工作区/托管技能路径中可用。

## 发布（npm）

推荐打包方式：

- 主包：`moltbot`（本仓库）
- 插件：单独 npm 包 `@moltbot/*`（例如 `@moltbot/voice-call`）

发布约定：

- 插件 `package.json` 必须包含 `moltbot.extensions`，列出一个或多个入口文件。
- 入口文件可为 `.js` 或 `.ts`（jiti 运行时加载 TS）。
- `moltbot plugins install <npm-spec>` 使用 `npm pack`，解包到 `~/.clawdbot/extensions/<id>/` 并在配置中启用。
- 配置键稳定性：带 scope 的包会被规范化为 **去 scope** 的 id，写入 `plugins.entries.*`。

## 示例插件：Voice Call

本仓库包含 voice-call 插件（Twilio 或 log 兜底）：

- 源码：`extensions/voice-call`
- Skill：`skills/voice-call`
- CLI：`moltbot voicecall start|status`
- Tool：`voice_call`
- RPC：`voicecall.start`、`voicecall.status`
- 配置（twilio）：`provider: "twilio"` + `twilio.accountSid/authToken/from`（可选 `statusCallbackUrl`、`twimlUrl`）
- 配置（dev）：`provider: "log"`（无网络）

见 [Voice Call](/plugins/voice-call) 与 `extensions/voice-call/README.md` 的设置与用法。

## 安全说明

插件与 Gateway 同进程运行。请视为可信代码：

- 仅安装你信任的插件。
- 优先使用 `plugins.allow` allowlist。
- 变更后重启 Gateway。

## 测试插件

插件可以（也应该）自带测试：

- 仓库内插件可在 `src/**` 下放置 Vitest 测试（示例：`src/plugins/voice-call.plugin.test.ts`）。
- 独立发布插件应自建 CI（lint/build/test）并验证 `moltbot.extensions` 指向构建后的入口（`dist/index.js`）。
