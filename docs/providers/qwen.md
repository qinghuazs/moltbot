---
summary: "在 Moltbot 中使用 Qwen OAuth（免费额度）"
read_when:
  - 想在 Moltbot 中使用 Qwen
  - 想用免费额度 OAuth 访问 Qwen Coder
---
# Qwen

Qwen 为 Qwen Coder 与 Qwen Vision 提供免费额度的 OAuth 流程
（每天 2,000 次请求，受 Qwen 限流影响）。

## 启用插件

```bash
moltbot plugins enable qwen-portal-auth
```

启用后请重启 Gateway。

## 认证

```bash
moltbot models auth login --provider qwen-portal --set-default
```

该命令运行 Qwen 设备码 OAuth 流程，并在 `models.json` 中写入 provider 条目
（同时添加 `qwen` 别名便于快速切换）。

## 模型 ID

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

切换模型：

```bash
moltbot models set qwen-portal/coder-model
```

## 复用 Qwen Code CLI 登录

若你已用 Qwen Code CLI 登录，Moltbot 会在加载认证存储时从
`~/.qwen/oauth_creds.json` 同步凭据。你仍需一个 `models.providers.qwen-portal`
条目（可通过上面的登录命令创建）。

## 说明

- Token 会自动刷新；若刷新失败或被撤销，请重新登录。
- 默认 base URL：`https://portal.qwen.ai/v1`（如 Qwen 提供不同端点，可用
  `models.providers.qwen-portal.baseUrl` 覆盖）。
- 提供商通用规则见 [Model providers](/concepts/model-providers)。
