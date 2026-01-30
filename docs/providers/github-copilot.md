---
summary: "在 Moltbot 中通过设备登录使用 GitHub Copilot"
read_when:
  - 想将 GitHub Copilot 作为模型提供商
  - 需要 `moltbot models auth login-github-copilot` 流程
---
# GitHub Copilot

## 什么是 GitHub Copilot

GitHub Copilot 是 GitHub 的 AI 编程助手。它为你的 GitHub 账号与订阅提供 Copilot 模型访问。Moltbot 可以通过两种方式使用 Copilot。

## 在 Moltbot 中使用 Copilot 的两种方式

### 1) 内置 GitHub Copilot 提供商（`github-copilot`）

使用原生设备登录流程获取 GitHub token，并在 Moltbot 运行时换取 Copilot API token。这是**默认**且最简单的路径，不需要 VS Code。

### 2) Copilot Proxy 插件（`copilot-proxy`）

使用 **Copilot Proxy** VS Code 扩展作为本地桥接。Moltbot 连接代理的 `/v1` 端点，并使用你在代理中配置的模型列表。当你已在 VS Code 中运行 Copilot Proxy 或需要通过它转发时选择此方式。你必须启用插件并保持 VS Code 扩展运行。

使用 GitHub Copilot 作为模型提供商（`github-copilot`）。该登录命令会运行 GitHub 设备登录流程，保存认证配置，并更新配置以使用该配置。

## CLI 设置

```bash
moltbot models auth login-github-copilot
```

系统会提示你访问 URL 并输入一次性代码。请保持终端打开直到完成。

### 可选标志

```bash
moltbot models auth login-github-copilot --profile-id github-copilot:work
moltbot models auth login-github-copilot --yes
```

## 设置默认模型

```bash
moltbot models set github-copilot/gpt-4o
```

### 配置片段

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } }
}
```

## 说明

- 需要交互式 TTY；请在终端中直接运行。
- Copilot 可用模型取决于订阅；若模型被拒，尝试其它 ID（如 `github-copilot/gpt-4.1`）。
- 登录会在认证配置中保存 GitHub token，并在 Moltbot 运行时换取 Copilot API token。
