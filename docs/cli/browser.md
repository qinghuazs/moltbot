---
summary: "`moltbot browser` 的 CLI 参考（profiles、tabs、动作、扩展中继）"
read_when:
  - 使用 `moltbot browser` 并需要常见任务示例
  - 想通过节点主机控制另一台机器上的浏览器
  - 想使用 Chrome 扩展中继（通过工具栏按钮 attach/detach）
---

# `moltbot browser`

管理 Moltbot 的浏览器控制服务并执行浏览器动作（标签页、快照、截图、导航、点击、输入）。

相关：
- 浏览器工具与 API：[Browser tool](/tools/browser)
- Chrome 扩展中继：[Chrome extension](/tools/chrome-extension)

## 常用标志

- `--url <gatewayWsUrl>`：Gateway WebSocket URL（默认来自配置）。
- `--token <token>`：Gateway token（如需要）。
- `--timeout <ms>`：请求超时（毫秒）。
- `--browser-profile <name>`：选择浏览器 profile（默认来自配置）。
- `--json`：机器可读输出（支持时）。

## 快速开始（本地）

```bash
moltbot browser --browser-profile chrome tabs
moltbot browser --browser-profile clawd start
moltbot browser --browser-profile clawd open https://example.com
moltbot browser --browser-profile clawd snapshot
```

## Profiles

Profiles 是命名的浏览器路由配置。实际中：
- `clawd`：启动或附加到 Moltbot 管理的专用 Chrome 实例（独立 user data 目录）。
- `chrome`：通过 Chrome 扩展中继控制你现有的 Chrome 标签页。

```bash
moltbot browser profiles
moltbot browser create-profile --name work --color "#FF5A36"
moltbot browser delete-profile --name work
```

使用指定 profile：

```bash
moltbot browser --browser-profile work tabs
```

## Tabs

```bash
moltbot browser tabs
moltbot browser open https://docs.molt.bot
moltbot browser focus <targetId>
moltbot browser close <targetId>
```

## Snapshot / screenshot / actions

快照：

```bash
moltbot browser snapshot
```

截图：

```bash
moltbot browser screenshot
```

导航/点击/输入（基于 ref 的 UI 自动化）：

```bash
moltbot browser navigate https://example.com
moltbot browser click <ref>
moltbot browser type <ref> "hello"
```

## Chrome 扩展中继（通过工具栏按钮 attach）

该模式允许代理控制你手动附加的现有 Chrome 标签页（不会自动附加）。

将未打包扩展安装到稳定路径：

```bash
moltbot browser extension install
moltbot browser extension path
```

然后 Chrome → `chrome://extensions` → 启用“开发者模式” → “加载已解压” → 选择打印的文件夹。

完整指南：[Chrome extension](/tools/chrome-extension)

## 远程浏览器控制（节点主机代理）

如果 Gateway 与浏览器不在同一台机器上，请在有 Chrome/Brave/Edge/Chromium 的机器上运行 **节点主机**。Gateway 会将浏览器动作代理到该节点（无需单独的浏览器控制服务）。

使用 `gateway.nodes.browser.mode` 控制自动路由，若连接了多个节点，可用 `gateway.nodes.browser.node` 固定到某个节点。

安全与远程设置：[Browser tool](/tools/browser)、[Remote access](/gateway/remote)、[Tailscale](/gateway/tailscale)、[Security](/gateway/security)
