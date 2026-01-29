---
summary: "Google Chat 应用支持状态、能力与配置"
read_when:
  - 在处理 Google Chat 渠道功能时
---
# Google Chat（Chat API）

状态：通过 Google Chat API webhook（仅 HTTP）支持私聊与空间。

## 快速上手（新手）
1) 创建 Google Cloud 项目并启用 **Google Chat API**。
   - 进入：[Google Chat API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 若未启用则先启用 API。
2) 创建 **Service Account**：
   - 点击 **Create Credentials** > **Service Account**。
   - 名称随意（如 `moltbot-chat`）。
   - 权限留空（点击 **Continue**）。
   - 访问主体留空（点击 **Done**）。
3) 创建并下载 **JSON Key**：
   - 在 service accounts 列表中点击刚创建的账号。
   - 打开 **Keys** 选项卡。
   - 点击 **Add Key** > **Create new key**。
   - 选择 **JSON** 并点击 **Create**。
4) 将下载的 JSON 放到 gateway 主机（例如 `~/.clawdbot/googlechat-service-account.json`）。
5) 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 创建 Google Chat 应用：
   - 填写 **Application info**：
     - **App name**：例如 `Moltbot`
     - **Avatar URL**：例如 `https://molt.bot/logo.png`
     - **Description**：例如 `Personal AI Assistant`
   - 启用 **Interactive features**。
   - 在 **Functionality** 下勾选 **Join spaces and group conversations**。
   - 在 **Connection settings** 中选择 **HTTP endpoint URL**。
   - 在 **Triggers** 中选择 **Use a common HTTP endpoint URL for all triggers**，并设置为你的 gateway 公网 URL + `/googlechat`。
     - *提示：运行 `moltbot status` 可查看 gateway 公网 URL。*
   - 在 **Visibility** 中勾选 **Make this Chat app available to specific people and groups in <Your Domain>**。
   - 在文本框中输入你的邮箱（如 `user@example.com`）。
   - 点击底部 **Save**。
6) **启用 App 状态**：
   - 保存后**刷新页面**。
   - 找到 **App status**（通常在顶部或底部）。
   - 将状态改为 **Live - available to users**。
   - 再次点击 **Save**。
7) 使用 service account 路径 + webhook audience 配置 Moltbot：
   - 环境变量：`GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或配置：`channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8) 设置 webhook audience 类型与值（与 Chat 应用配置一致）。
9) 启动 gateway。Google Chat 会 POST 到你的 webhook 路径。

## 添加到 Google Chat
当 gateway 已运行且你的邮箱已加入可见性列表：
1) 打开 [Google Chat](https://chat.google.com/)。
2) 点击 **Direct Messages** 旁的 **+**（加号）。
3) 在搜索栏输入你在 Google Cloud Console 中配置的 **App name**。
   - **注意**：该 bot 不会出现在 Marketplace 浏览列表中，因为它是私有应用。必须按名称搜索。
4) 选择你的 bot。
5) 点击 **Add** 或 **Chat** 开始 1:1 对话。
6) 发送 “Hello” 触发助手！

## 公网 URL（仅 webhook）
Google Chat webhook 需要公网 HTTPS 端点。为安全起见，**只暴露 `/googlechat` 路径**。保持 Moltbot dashboard 和其他敏感端点在私网。

### 方案 A：Tailscale Funnel（推荐）
使用 Tailscale Serve 提供私有 dashboard，用 Funnel 仅公开 webhook 路径。这样 `/` 仍是私有，仅暴露 `/googlechat`。

1. **查看 gateway 绑定的地址：**
   ```bash
   ss -tlnp | grep 18789
   ```
   记录 IP（如 `127.0.0.1`、`0.0.0.0` 或 Tailscale IP `100.x.x.x`）。

2. **只对 tailnet 暴露 dashboard（8443 端口）：**
   ```bash
   # 若绑定在 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # 若仅绑定到 Tailscale IP（如 100.106.161.80）：
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **仅公开 webhook 路径：**
   ```bash
   # 若绑定在 localhost（127.0.0.1 或 0.0.0.0）：
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # 若仅绑定到 Tailscale IP（如 100.106.161.80）：
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **授权该节点使用 Funnel：**
   若提示，打开输出中的授权 URL，在 tailnet policy 中启用该节点的 Funnel。

5. **验证配置：**
   ```bash
   tailscale serve status
   tailscale funnel status
   ```

你的公网 webhook URL：
`https://<node-name>.<tailnet>.ts.net/googlechat`

你的私有 dashboard 仍仅 tailnet 可见：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 应用配置中使用公网 URL（不含 `:8443`）。

> 注意：该配置会跨重启持久化。若要移除，运行 `tailscale funnel reset` 与 `tailscale serve reset`。

### 方案 B：反向代理（Caddy）
若使用 Caddy 等反代，只代理特定路径：
```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```
这样，`your-domain.com/` 会被忽略或返回 404，而 `your-domain.com/googlechat` 被安全地转发到 Moltbot。

### 方案 C：Cloudflare Tunnel
在 tunnel ingress 规则中只路由 webhook 路径：
- **Path**：`/googlechat` -> `http://localhost:18789/googlechat`
- **Default Rule**：HTTP 404（Not Found）

## 工作方式

1. Google Chat 向 gateway 发送 webhook POST。每个请求都带有 `Authorization: Bearer <token>` 头。
2. Moltbot 会用配置的 `audienceType` + `audience` 校验 token：
   - `audienceType: "app-url"` → audience 为你的 HTTPS webhook URL。
   - `audienceType: "project-number"` → audience 为 Cloud 项目编号。
3. 消息按 space 路由：
   - 私聊使用会话键 `agent:<agentId>:googlechat:dm:<spaceId>`。
   - 空间使用会话键 `agent:<agentId>:googlechat:group:<spaceId>`。
4. 私聊默认配对。陌生发送者收到配对码；批准命令：
   - `moltbot pairing approve googlechat <code>`
5. 群空间默认需要 @ 提及。若提及识别需要应用用户名，设置 `botUser`。

## 目标
用于投递与 allowlist 的标识：
- 私聊：`users/<userId>` 或 `users/<email>`（接受邮箱地址）。
- 空间：`spaces/<spaceId>`。

## 配置要点
```json5
{
  channels: {
    "googlechat": {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // 可选；帮助识别提及
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890", "name@example.com"]
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          allow: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "Short answers only."
        }
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20
    }
  }
}
```

说明：
- service account 凭据也可通过 `serviceAccount` 以内联 JSON 字符串提供。
- 若未设置 `webhookPath`，默认路径为 `/googlechat`。
- 当 `actions.reactions` 启用时，可通过 `reactions` 工具与 `channels action` 使用反应。
- `typingIndicator` 支持 `none`、`message`（默认）、`reaction`（reaction 需用户 OAuth）。
- 附件通过 Chat API 下载并存入媒体流水线（大小受 `mediaMaxMb` 限制）。

## 故障排查

### 405 Method Not Allowed
若 Google Cloud Logs Explorer 出现：
```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

说明 webhook 处理器未注册。常见原因：
1. **未配置渠道**：配置中缺少 `channels.googlechat`。可用以下命令确认：
   ```bash
   moltbot config get channels.googlechat
   ```
   若返回 "Config path not found"，请添加配置（见 [配置要点](#配置要点)）。

2. **插件未启用**：检查插件状态：
   ```bash
   moltbot plugins list | grep googlechat
   ```
   若显示 "disabled"，在配置中添加 `plugins.entries.googlechat.enabled: true`。

3. **未重启 gateway**：添加配置后重启：
   ```bash
   moltbot gateway restart
   ```

验证渠道运行：
```bash
moltbot channels status
# Should show: Google Chat default: enabled, configured, ...
```

### 其他问题
- 使用 `moltbot channels status --probe` 检查认证错误或缺失的 audience 配置。
- 若没有消息到达，确认 Chat 应用的 webhook URL + 事件订阅。
- 若提及门控阻止回复，设置 `botUser` 为应用的用户资源名并检查 `requireMention`。
- 发送测试消息时使用 `moltbot logs --follow` 查看请求是否到达 gateway。

相关文档：
- [Gateway 配置](/gateway/configuration)
- [安全](/gateway/security)
- [反应](/tools/reactions)
