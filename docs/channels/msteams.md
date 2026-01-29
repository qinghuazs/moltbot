---
summary: "Microsoft Teams 机器人支持状态、能力与配置"
read_when:
  - 在处理 MS Teams 渠道功能时
---
# Microsoft Teams（插件）

> "Abandon all hope, ye who enter here."


更新：2026-01-21

状态：支持文本与私聊附件；频道/群聊文件发送需要 `sharePointSiteId` + Graph 权限（见 [在群聊中发送文件](#在群聊中发送文件)）。投票使用 Adaptive Cards 发送。

## 需要插件
Microsoft Teams 作为插件提供，不随核心安装包附带。

**破坏性变更（2026.1.15）：** MS Teams 已移出核心。使用者必须安装插件。

原因：核心安装更轻，且 MS Teams 依赖可独立更新。

通过 CLI 安装（npm registry）：
```bash
moltbot plugins install @moltbot/msteams
```

本地检出（从 git 仓库运行时）：
```bash
moltbot plugins install ./extensions/msteams
```

若在配置/引导中选择 Teams 且检测到 git 检出，
Moltbot 会自动提供本地安装路径。

详情：见 [插件](/plugin)

## 快速上手（新手）
1) 安装 Microsoft Teams 插件。
2) 创建 **Azure Bot**（App ID + client secret + tenant ID）。
3) 用这些凭据配置 Moltbot。
4) 通过公网 URL 或隧道暴露 `/api/messages`（默认端口 3978）。
5) 安装 Teams 应用包并启动 gateway。

最小配置：
```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      appPassword: "<APP_PASSWORD>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" }
    }
  }
}
```
注意：群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群回复，设置 `channels.msteams.groupAllowFrom`（或用 `groupPolicy: "open"` 允许任意成员，但仍默认需要提及）。

## 目标
- 通过 Teams 私聊、群聊或频道与 Moltbot 对话。
- 保持确定性路由：回复总是回到消息来源。
- 默认安全的频道行为（除非配置，否则需要提及）。

## 配置写入
默认允许 Microsoft Teams 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方式：
```json5
{
  channels: { msteams: { configWrites: false } }
}
```

## 访问控制（私聊 + 群聊）

**私聊访问**
- 默认：`channels.msteams.dmPolicy = "pairing"`。陌生发送者需批准后才处理。
- `channels.msteams.allowFrom` 接受 AAD object IDs、UPN 或显示名。向导会在具备 Graph 权限时解析名称到 ID。

**群聊访问**
- 默认：`channels.msteams.groupPolicy = "allowlist"`（不添加 `groupAllowFrom` 则阻止）。可用 `channels.defaults.groupPolicy` 覆盖未设置时的默认值。
- `channels.msteams.groupAllowFrom` 控制群聊/频道中允许触发的发送者（回退到 `channels.msteams.allowFrom`）。
- 设 `groupPolicy: "open"` 允许任意成员（仍默认提及门控）。
- 要**禁止所有频道**，设 `channels.msteams.groupPolicy: "disabled"`。

示例：
```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"]
    }
  }
}
```

**Teams + 频道 allowlist**
- 通过 `channels.msteams.teams` 列出 team 与频道范围。
- key 可为 team ID 或名称；频道 key 可为 conversation ID 或名称。
- 当 `groupPolicy="allowlist"` 且存在 teams allowlist 时，仅允许列出的 team/频道（提及门控）。
- 配置向导接受 `Team/Channel` 条目并替你保存。
- 启动时 Moltbot 会将 team/频道与用户 allowlist 的名称解析为 ID（Graph 权限允许时），
  并记录映射；无法解析的条目保留原样。

示例：
```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      teams: {
        "My Team": {
          channels: {
            "General": { requireMention: true }
          }
        }
      }
    }
  }
}
```

## 工作方式
1. 安装 Microsoft Teams 插件。
2. 创建 **Azure Bot**（App ID + secret + tenant ID）。
3. 构建 **Teams 应用包**，引用 bot 并包含下方 RSC 权限。
4. 将 Teams 应用上传/安装到团队（或个人范围用于私聊）。
5. 在 `~/.clawdbot/moltbot.json` 中配置 `msteams`（或用环境变量）并启动 gateway。
6. Gateway 默认在 `/api/messages` 监听 Bot Framework webhook。

## Azure Bot 设置（先决条件）

在配置 Moltbot 前，需要创建 Azure Bot 资源。

### 步骤 1：创建 Azure Bot

1. 进入 [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **Basics**：

   | 字段 | 值 |
   |-------|-------|
   | **Bot handle** | 机器人名称，例如 `moltbot-msteams`（必须唯一） |
   | **Subscription** | 选择你的 Azure 订阅 |
   | **Resource group** | 新建或使用已有 |
   | **Pricing tier** | **Free**（开发/测试） |
   | **Type of App** | **Single Tenant**（推荐，见下方说明） |
   | **Creation type** | **Create new Microsoft App ID** |

> **弃用提示：** 新建多租户 bot 在 2025-07-31 后已弃用。新 bot 使用 **Single Tenant**。

3. 点击 **Review + create** → **Create**（等待约 1-2 分钟）

### 步骤 2：获取凭据

1. 打开 Azure Bot 资源 → **Configuration**
2. 复制 **Microsoft App ID** → 即 `appId`
3. 点击 **Manage Password** → 进入 App Registration
4. 在 **Certificates & secrets** → **New client secret** → 复制 **Value** → 即 `appPassword`
5. 打开 **Overview** → 复制 **Directory (tenant) ID** → 即 `tenantId`

### 步骤 3：配置消息端点

1. 在 Azure Bot → **Configuration**
2. 将 **Messaging endpoint** 设为你的 webhook URL：
   - 生产：`https://your-domain.com/api/messages`
   - 本地开发：使用隧道（见下文 [本地开发](#本地开发隧道)）

### 步骤 4：启用 Teams 渠道

1. 在 Azure Bot → **Channels**
2. 点击 **Microsoft Teams** → Configure → Save
3. 接受服务条款

## 本地开发（隧道）

Teams 无法访问 `localhost`。本地开发请使用隧道：

**方案 A：ngrok**
```bash
ngrok http 3978
# 复制 https URL，例如 https://abc123.ngrok.io
# 将消息端点设为：https://abc123.ngrok.io/api/messages
```

**方案 B：Tailscale Funnel**
```bash
tailscale funnel 3978
# 使用你的 Tailscale funnel URL 作为消息端点
```

## Teams Developer Portal（替代方案）

无需手工创建 manifest ZIP，可用 [Teams Developer Portal](https://dev.teams.microsoft.com/apps)：

1. 点击 **+ New app**
2. 填写基本信息（名称、描述、开发者信息）
3. 进入 **App features** → **Bot**
4. 选择 **Enter a bot ID manually** 并粘贴 Azure Bot App ID
5. 勾选作用域：**Personal**、**Team**、**Group Chat**
6. 点击 **Distribute** → **Download app package**
7. 在 Teams 中：**Apps** → **Manage your apps** → **Upload a custom app** → 选择 ZIP

这通常比手动编辑 JSON manifest 更容易。

## 测试机器人

**方案 A：Azure Web Chat（先验证 webhook）**
1. Azure Portal → 你的 Azure Bot 资源 → **Test in Web Chat**
2. 发送消息，应收到回复
3. 这说明 webhook 端点在 Teams 之前已可用

**方案 B：Teams（安装应用后）**
1. 安装 Teams 应用（侧载或组织目录）
2. 在 Teams 中找到机器人并私聊
3. 查看 gateway 日志确认收到事件

## 设置（最小文本）
1. **安装 Microsoft Teams 插件**
   - npm：`moltbot plugins install @moltbot/msteams`
   - 本地检出：`moltbot plugins install ./extensions/msteams`

2. **Bot 注册**
   - 创建 Azure Bot（见上文），记录：
     - App ID
     - Client secret（App password）
     - Tenant ID（单租户）

3. **Teams 应用 manifest**
   - 包含 `bot` 条目，并设置 `botId = <App ID>`。
   - Scopes：`personal`、`team`、`groupChat`。
   - `supportsFiles: true`（个人范围文件处理必需）。
   - 添加 RSC 权限（见下文）。
   - 创建图标：`outline.png`（32x32）与 `color.png`（192x192）。
   - 将三文件打包成 zip：`manifest.json`、`outline.png`、`color.png`。

4. **配置 Moltbot**
   ```json
   {
     "msteams": {
       "enabled": true,
       "appId": "<APP_ID>",
       "appPassword": "<APP_PASSWORD>",
       "tenantId": "<TENANT_ID>",
       "webhook": { "port": 3978, "path": "/api/messages" }
     }
   }
   ```

   也可以用环境变量：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Bot 端点**
   - 在 Azure Bot 中设置 Messaging Endpoint：
     - `https://<host>:3978/api/messages`（或自定义端口/路径）。

6. **运行 gateway**
   - 插件安装且存在 `msteams` 凭据配置时，Teams 渠道会自动启动。

## 历史上下文
- `channels.msteams.historyLimit` 控制最近多少条频道/群消息注入提示词。
- 回退到 `messages.groupChat.historyLimit`。设 `0` 禁用（默认 50）。
- 私聊历史可用 `channels.msteams.dmHistoryLimit` 限制（用户回合）。按用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前 Teams RSC 权限（Manifest）
以下为我们 Teams 应用 manifest 中**已有的 resourceSpecific 权限**。仅对安装该应用的团队/聊天生效。

**频道（team scope）：**
- `ChannelMessage.Read.Group`（Application）- 无需 @ 提及即可接收所有频道消息
- `ChannelMessage.Send.Group`（Application）
- `Member.Read.Group`（Application）
- `Owner.Read.Group`（Application）
- `ChannelSettings.Read.Group`（Application）
- `TeamMember.Read.Group`（Application）
- `TeamSettings.Read.Group`（Application）

**群聊：**
- `ChatMessage.Read.Chat`（Application）- 无需 @ 提及即可接收所有群聊消息

## Teams Manifest 示例（脱敏）
最小可用示例，包含必填字段。请替换 ID 与 URL。

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  "manifestVersion": "1.23",
  "version": "1.0.0",
  "id": "00000000-0000-0000-0000-000000000000",
  "name": { "short": "Moltbot" },
  "developer": {
    "name": "Your Org",
    "websiteUrl": "https://example.com",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms"
  },
  "description": { "short": "Moltbot in Teams", "full": "Moltbot in Teams" },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#5B6DEF",
  "bots": [
    {
      "botId": "11111111-1111-1111-1111-111111111111",
      "scopes": ["personal", "team", "groupChat"],
      "isNotificationOnly": false,
      "supportsCalling": false,
      "supportsVideo": false,
      "supportsFiles": true
    }
  ],
  "webApplicationInfo": {
    "id": "11111111-1111-1111-1111-111111111111"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "ChannelMessage.Read.Group", "type": "Application" },
        { "name": "ChannelMessage.Send.Group", "type": "Application" },
        { "name": "Member.Read.Group", "type": "Application" },
        { "name": "Owner.Read.Group", "type": "Application" },
        { "name": "ChannelSettings.Read.Group", "type": "Application" },
        { "name": "TeamMember.Read.Group", "type": "Application" },
        { "name": "TeamSettings.Read.Group", "type": "Application" },
        { "name": "ChatMessage.Read.Chat", "type": "Application" }
      ]
    }
  }
}
```

### Manifest 注意事项（必填字段）
- `bots[].botId` **必须**匹配 Azure Bot App ID。
- `webApplicationInfo.id` **必须**匹配 Azure Bot App ID。
- `bots[].scopes` 必须包含你要使用的范围（`personal`、`team`、`groupChat`）。
- `bots[].supportsFiles: true` 为个人范围文件处理必需。
- `authorization.permissions.resourceSpecific` 必须包含频道读/写权限才能接收频道流量。

### 更新已有应用

要更新已安装的 Teams 应用（例如增加 RSC 权限）：

1. 更新 `manifest.json`
2. **递增 `version` 字段**（如 `1.0.0` → `1.1.0`）
3. **重新打包**（`manifest.json`、`outline.png`、`color.png`）
4. 上传新 zip：
   - **方案 A（Teams Admin Center）：** Teams Admin Center → Teams apps → Manage apps → 找到应用 → Upload new version
   - **方案 B（侧载）：** Teams → Apps → Manage your apps → Upload a custom app
5. **频道**：在每个 team 重新安装应用，使新权限生效
6. **彻底退出并重启 Teams**（不是仅关闭窗口），清除缓存的应用元数据

## 能力：仅 RSC vs Graph

### 仅 **Teams RSC**（应用已安装，无 Graph API 权限）
可用：
- 读取频道消息**文本**内容。
- 发送频道消息**文本**内容。
- 接收**私聊**文件附件。

不可用：
- 频道/群聊**图片或文件内容**（payload 只含 HTML stub）。
- 下载存储在 SharePoint/OneDrive 的附件。
- 读取历史消息（仅有实时 webhook）。

### **Teams RSC + Microsoft Graph Application 权限**
增加：
- 下载托管内容（如消息中粘贴的图片）。
- 下载存储在 SharePoint/OneDrive 的文件附件。
- 通过 Graph 读取频道/聊天历史。

### RSC vs Graph API

| 能力 | RSC 权限 | Graph API |
|------------|-----------------|-----------|
| **实时消息** | 是（webhook） | 否（仅轮询） |
| **历史消息** | 否 | 是（可查询历史） |
| **设置复杂度** | 仅应用 manifest | 需要管理员同意 + token 流程 |
| **离线可用** | 否（必须运行） | 是（随时可查询） |

**结论：** RSC 用于实时监听；Graph API 用于历史访问。若需离线补历史消息，需要 Graph API 的 `ChannelMessage.Read.All`（需管理员同意）。

## Graph 支持的媒体与历史（频道必需）
若你需要在**频道**中处理图片/文件或获取**历史消息**，必须启用 Microsoft Graph 权限并获得管理员同意。

1. 在 Entra ID（Azure AD）**App Registration** 中添加 Microsoft Graph **Application 权限**：
   - `ChannelMessage.Read.All`（频道附件 + 历史）
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群聊）
2. **授予管理员同意**。
3. 提升 Teams 应用 **manifest 版本**，重新上传，并**重新安装应用**。
4. **彻底退出并重启 Teams**，清除缓存的应用元数据。

## 已知限制

### Webhook 超时
Teams 通过 HTTP webhook 投递消息。若处理过慢（如 LLM 过慢），你可能看到：
- Gateway 超时
- Teams 重试消息（导致重复）
- 回复丢失

Moltbot 会快速返回并主动发送回复，但极慢响应仍可能导致问题。

### 格式化
Teams 的 Markdown 能力弱于 Slack 或 Discord：
- 基础格式可用：**粗体**、*斜体*、`code`、链接
- 复杂 Markdown（表格、嵌套列表）可能无法正确渲染
- 投票与卡片发送支持 Adaptive Cards（见下文）

## 配置
关键设置（共享渠道模式见 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用渠道。
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`：bot 凭据。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`：私聊 allowlist（AAD object IDs、UPN、显示名）。向导在 Graph 可用时会解析名称到 ID。
- `channels.msteams.textChunkLimit`：出站分块大小。
- `channels.msteams.chunkMode`：`length`（默认）或 `newline`（按空行分段再按长度分块）。
- `channels.msteams.mediaAllowHosts`：入站附件 host allowlist（默认 Microsoft/Teams 域名）。
- `channels.msteams.requireMention`：频道/群聊要求 @ 提及（默认 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（见 [回复风格](#回复风格线程与帖子)）。
- `channels.msteams.teams.<teamId>.replyStyle`：按 team 覆盖。
- `channels.msteams.teams.<teamId>.requireMention`：按 team 覆盖。
- `channels.msteams.teams.<teamId>.tools`：按 team 默认工具策略覆盖（`allow`/`deny`/`alsoAllow`），当频道未覆盖时生效。
- `channels.msteams.teams.<teamId>.toolsBySender`：按 team + 发送者工具策略覆盖（支持 `"*"`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：频道内按发送者工具策略覆盖（支持 `"*"`）。
- `channels.msteams.sharePointSiteId`：群聊/频道文件发送用 SharePoint site ID（见 [在群聊中发送文件](#在群聊中发送文件)）。

## 路由与会话
- 会话键遵循标准 agent 格式（见 [/concepts/session](/concepts/session)）：
  - 私聊共享主会话（`agent:<agentId>:<mainKey>`）。
  - 频道/群聊使用 conversation id：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复风格：线程与帖子

Teams 近期在同一数据模型上提供两种频道 UI 风格：

| 风格 | 描述 | 推荐 `replyStyle` |
|-------|-------------|--------------------------|
| **Posts**（经典） | 消息以卡片形式出现，回复在下方线程 | `thread`（默认） |
| **Threads**（类似 Slack） | 消息线性流动，更像 Slack | `top-level` |

**问题：** Teams API 不暴露频道 UI 风格。如果 `replyStyle` 选错：
- 在 Threads 风格中用 `thread` → 回复嵌套不协调
- 在 Posts 风格中用 `top-level` → 回复变成独立顶层帖子

**解决方案：** 按频道配置 `replyStyle`：

```json
{
  "msteams": {
    "replyStyle": "thread",
    "teams": {
      "19:abc...@thread.tacv2": {
        "channels": {
          "19:xyz...@thread.tacv2": {
            "replyStyle": "top-level"
          }
        }
      }
    }
  }
}
```

## 附件与图片

**当前限制：**
- **私聊：** 图片与文件附件可通过 Teams bot 文件 API。
- **频道/群聊：** 附件存储在 M365（SharePoint/OneDrive）。webhook payload 仅包含 HTML stub，不含文件字节。**需要 Graph API 权限**才能下载频道附件。

若无 Graph 权限，频道中的图片消息将以纯文本接收（无法访问图片内容）。
默认仅从 Microsoft/Teams 域名下载媒体。可用 `channels.msteams.mediaAllowHosts` 覆盖（`["*"]` 允许任意 host）。

## 在群聊中发送文件

机器人可在私聊中通过 FileConsentCard 发送文件（内建）。但**在群聊/频道发送文件**需要额外设置：

| 场景 | 文件发送方式 | 所需设置 |
|---------|-------------------|--------------|
| **私聊** | FileConsentCard → 用户接受 → bot 上传 | 开箱即用 |
| **群聊/频道** | 上传到 SharePoint → 分享链接 | 需要 `sharePointSiteId` + Graph 权限 |
| **图片（任何场景）** | Base64 内联 | 开箱即用 |

### 为什么群聊需要 SharePoint

机器人没有个人 OneDrive（Graph API 的 `/me/drive` 对应用身份无效）。要在群聊/频道发送文件，机器人会上传到 **SharePoint 站点** 并生成共享链接。

### 设置

1. 在 Entra ID（Azure AD）**App Registration** 中添加 Graph API 权限：
   - `Sites.ReadWrite.All`（Application）- 上传文件到 SharePoint
   - `Chat.Read.All`（Application）- 可选，用于按用户共享链接

2. **授予管理员同意**。

3. **获取 SharePoint site ID：**
   ```bash
   # 通过 Graph Explorer 或带 token 的 curl：
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # 示例：site 在 "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # 响应包含："id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **配置 Moltbot：**
   ```json5
   {
     channels: {
       msteams: {
         // ... other config ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2"
       }
     }
   }
   ```

### 分享行为

| 权限 | 分享行为 |
|------------|------------------|
| 仅 `Sites.ReadWrite.All` | 组织内共享链接（组织内任何人可访问） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 按用户共享链接（仅聊天成员可访问） |

按用户共享更安全，仅聊天成员可访问文件。若缺少 `Chat.Read.All`，机器人会退回到组织级共享。

### 退回行为

| 场景 | 结果 |
|----------|--------|
| 群聊 + 文件 + 已配置 `sharePointSiteId` | 上传到 SharePoint，发送共享链接 |
| 群聊 + 文件 + 未配置 `sharePointSiteId` | 尝试 OneDrive 上传（可能失败），仅发文本 |
| 私聊 + 文件 | FileConsentCard 流程（无需 SharePoint） |
| 任何场景 + 图片 | Base64 内联（无需 SharePoint） |

### 文件存储位置

上传的文件保存在所配置 SharePoint 站点默认文档库的 `/MoltbotShared/` 目录。

## 投票（Adaptive Cards）
Moltbot 通过 Adaptive Cards 发送 Teams 投票（没有原生 Teams 投票 API）。

- CLI：`moltbot message poll --channel msteams --target conversation:<id> ...`
- 票数由 gateway 记录在 `~/.clawdbot/msteams-polls.json`。
- gateway 必须保持在线才能记录投票。
- 目前不会自动发布结果摘要（可读取存储文件）。

## Adaptive Cards（任意）
使用 `message` 工具或 CLI 可向 Teams 用户/会话发送任意 Adaptive Card JSON。

`card` 参数接受 Adaptive Card JSON 对象。提供 `card` 时消息文本可选。

**Agent 工具：**
```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:<id>",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{"type": "TextBlock", "text": "Hello!"}]
  }
}
```

**CLI：**
```bash
moltbot message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

卡片 schema 与示例见 [Adaptive Cards 文档](https://adaptivecards.io/)。目标格式细节见下文 [目标格式](#目标格式)。

## 目标格式

MSTeams 目标使用前缀区分用户与会话：

| 目标类型 | 格式 | 示例 |
|-------------|--------|---------|
| 用户（按 ID） | `user:<aad-object-id>` | `user:40a1a0ed-4ff2-4164-a219-55518990c197` |
| 用户（按名称） | `user:<display-name>` | `user:John Smith`（需要 Graph API） |
| 群聊/频道 | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2` |
| 群聊/频道（原样） | `<conversation-id>` | `19:abc123...@thread.tacv2`（含 `@thread` 时） |

**CLI 示例：**
```bash
# 按用户 ID 发送
moltbot message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# 按显示名发送（触发 Graph API 查询）
moltbot message send --channel msteams --target "user:John Smith" --message "Hello"

# 发送到群聊或频道
moltbot message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# 发送 Adaptive Card 到会话
moltbot message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello"}]}'
```

**Agent 工具示例：**
```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:John Smith",
  "message": "Hello!"
}
```

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "conversation:19:abc...@thread.tacv2",
  "card": {"type": "AdaptiveCard", "version": "1.5", "body": [{"type": "TextBlock", "text": "Hello"}]}
}
```

注意：不带 `user:` 前缀时，名称会按 group/team 解析。按显示名给人发消息请务必使用 `user:`。

## 主动消息
- 只有在用户先互动后才可主动发送，因为此时才保存会话引用。
- `dmPolicy` 与 allowlist 的限制见 `/gateway/configuration`。

## Team 与 Channel ID（常见坑）

Teams URL 中的 `groupId` 查询参数**不是**配置所用的 team ID。请从 URL path 中提取 ID：

**Team URL：**
```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID（URL 解码后）
```

**Channel URL：**
```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID（URL 解码后）
```

**用于配置：**
- Team ID = `/team/` 后的 path 片段（URL 解码，如 `19:Bk4j...@thread.tacv2`）
- Channel ID = `/channel/` 后的 path 片段（URL 解码）
- **忽略** `groupId` 查询参数

## 私有频道

机器人在私有频道支持有限：

| 功能 | 标准频道 | 私有频道 |
|---------|-------------------|------------------|
| 机器人安装 | 是 | 有限制 |
| 实时消息（webhook） | 是 | 可能不可用 |
| RSC 权限 | 是 | 可能有差异 |
| @mentions | 是 | 若 bot 可访问 |
| Graph API 历史 | 是 | 是（有权限时） |

**若私有频道不可用的替代方案：**
1. 使用标准频道与机器人交互
2. 使用私聊（用户总是可以直接私聊机器人）
3. 用 Graph API 获取历史（需要 `ChannelMessage.Read.All`）

## 故障排查

### 常见问题

- **频道中图片不显示：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用并彻底退出/重启 Teams。
- **频道无响应：** 默认需要提及；设置 `channels.msteams.requireMention=false` 或按 team/频道配置。
- **版本不一致（Teams 仍显示旧 manifest）：** 移除并重新添加应用，并彻底退出 Teams 刷新。
- **Webhook 返回 401 Unauthorized：** 手工测试无 Azure JWT 时的预期错误，说明端点可达但认证失败。请用 Azure Web Chat 正确测试。

### Manifest 上传错误

- **"Icon file cannot be empty"：** manifest 引用的图标是 0 字节。创建有效 PNG（`outline.png` 32x32、`color.png` 192x192）。
- **"webApplicationInfo.Id already in use"：** 应用仍安装在其他 team/chat 中。先卸载或等待 5-10 分钟传播。
- **"Something went wrong" 上传失败：** 改用 https://admin.teams.microsoft.com 上传，在浏览器 DevTools（F12）→ Network 查看响应体。
- **Sideload 失败：** 尝试“Upload an app to your org's app catalog”，通常可绕过侧载限制。

### RSC 权限不生效

1. 确认 `webApplicationInfo.id` 与 bot 的 App ID 完全一致
2. 重新上传应用并在 team/chat 中重新安装
3. 检查组织管理员是否阻止 RSC 权限
4. 确认 scope 正确：team 用 `ChannelMessage.Read.Group`，群聊用 `ChatMessage.Read.Chat`

## 参考
- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（频道/群聊需 Graph）
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
