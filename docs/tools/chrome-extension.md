---
summary: "Chrome 扩展：让 Moltbot 驱动你现有的 Chrome 标签页"
read_when:
  - 你想让 agent 驱动现有的 Chrome 标签页（工具栏按钮）
  - 你需要远程 Gateway + 本地浏览器自动化（Tailscale）
  - 你想了解浏览器接管的安全影响
---

# Chrome 扩展（浏览器转发）

Moltbot 的 Chrome 扩展允许 agent 控制你的**现有 Chrome 标签页**（你平常的 Chrome 窗口），而不是启动一个单独的 clawd 管理的 Chrome profile。

通过**一个 Chrome 工具栏按钮**进行附加与解除。

## 这是什么（概念）

包含三部分：
- **浏览器控制服务**（Gateway 或 node）：agent 或工具调用的 API（通过 Gateway）。
- **本地 relay 服务**（loopback CDP）：在控制服务与扩展之间桥接（默认 `http://127.0.0.1:18792`）。
- **Chrome MV3 扩展**：使用 `chrome.debugger` 附加到活动标签页，并把 CDP 消息转发到 relay。

随后 Moltbot 通过常规 `browser` 工具接口控制该标签页（选择正确的 profile）。

## 安装 载入（未打包）

1) 将扩展安装到稳定的本地路径：

```bash
moltbot browser extension install
```

2) 打印已安装扩展的目录路径：

```bash
moltbot browser extension path
```

3) Chrome → `chrome://extensions`
- 启用“Developer mode”
- “Load unpacked” → 选择上一步打印的目录

4) 将扩展固定到工具栏。

## 更新（无需构建）

扩展作为 Moltbot 发行版（npm 包）中的静态文件发布，无需单独构建。

升级 Moltbot 后：
- 重新运行 `moltbot browser extension install`，刷新 Moltbot 状态目录下的安装文件。
- Chrome → `chrome://extensions` → 点击扩展的 “Reload”。

## 使用方式（无需额外配置）

Moltbot 内置了名为 `chrome` 的浏览器 profile，默认指向扩展 relay 端口。

用法：
- CLI：`moltbot browser --browser-profile chrome tabs`
- Agent 工具：`browser` 且 `profile="chrome"`

如果你想用不同名字或端口，创建自己的 profile：

```bash
moltbot browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

## 附加 解除（工具栏按钮）

- 打开你想让 Moltbot 控制的标签页。
- 点击扩展图标。
  - 徽标显示 `ON` 表示已附加。
- 再次点击即可解除。

## 它控制哪一个标签页

- 它**不会**自动控制“你正在看的那个标签页”。
- 它**只**控制你通过工具栏按钮明确附加的标签页。
- 切换方式：打开另一个标签页并点击扩展图标。

## 徽标与常见错误

- `ON`：已附加；Moltbot 可驱动该标签页。
- `…`：正在连接本地 relay。
- `!`：relay 不可达（最常见原因：此机器上的浏览器 relay 服务未运行）。

如果看到 `!`：
- 确认 Gateway 在本机运行（默认设置），或在该机器上运行 node host（如果 Gateway 在别处）。
- 打开扩展的 Options 页面，可查看 relay 是否可达。

## 远程 Gateway（使用 node host）

### 本地 Gateway（与 Chrome 同机）通常无需额外步骤

如果 Gateway 与 Chrome 在同一台机器上，它会在 loopback 启动浏览器控制服务并自动启动 relay。扩展连接本地 relay；CLI 或工具调用走 Gateway。

### 远程 Gateway（Gateway 在别处）需要运行 node host

如果 Gateway 在另一台机器上，请在运行 Chrome 的机器上启动 node host。Gateway 会把浏览器动作代理到该 node；扩展与 relay 保持本地。

如果连接了多个 node，可通过 `gateway.nodes.browser.node` 固定一个，或设置 `gateway.nodes.browser.mode`。

## 沙箱（工具容器）

如果你的 agent 会话启用了沙箱（`agents.defaults.sandbox.mode != "off"`），`browser` 工具可能受限：

- 默认情况下，沙箱会话常常指向**沙箱浏览器**（`target="sandbox"`），而不是宿主机 Chrome。
- Chrome 扩展接管需要控制**宿主机**浏览器控制服务。

可选方案：
- 最简单：在**非沙箱**会话或 agent 中使用扩展。
- 或允许沙箱会话控制宿主机浏览器：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: {
          allowHostControl: true
        }
      }
    }
  }
}
```

然后确保工具策略未阻止该工具，并在需要时使用 `browser` 且 `target="host"`。

排障：`moltbot sandbox explain`

## 远程访问建议

- 让 Gateway 与 node host 处于同一 tailnet；避免把 relay 端口暴露到 LAN 或公网。
- 有意绑定 node；如不希望远程控制，可禁用浏览器代理路由（`gateway.nodes.browser.mode="off"`）。

## “extension path” 的工作方式

`moltbot browser extension path` 会打印**已安装**的磁盘目录，里面包含扩展文件。

CLI **不会**打印 `node_modules` 路径。请先运行 `moltbot browser extension install` 把扩展复制到 Moltbot 状态目录下的稳定位置。

如果你移动或删除该安装目录，Chrome 会标记扩展损坏，直到你从有效路径重新加载。

## 安全影响（请阅读）

这很强大也有风险。把它当成“让模型直接操作你的浏览器”。

- 扩展使用 Chrome 的 debugger API（`chrome.debugger`）。附加后模型可以：
  - 点击 输入 导航该标签页
  - 读取页面内容
  - 访问该标签页已登录会话可访问的内容
- **这不是隔离的**，不同于专用的 clawd 管理 profile。
  - 如果你附加到日常使用的 profile 或标签页，你等于授权访问该账号状态。

建议：
- 使用一个独立的 Chrome profile（与个人浏览分离）进行扩展 relay。
- 保持 Gateway 与任何 node host 仅在 tailnet 内，依赖 Gateway 认证与 node 配对。
- 避免将 relay 端口暴露到 LAN（`0.0.0.0`），避免 Funnel（公网）。

相关：
- 浏览器工具概览：[Browser](/tools/browser)
- 安全审计：[Security](/gateway/security)
- Tailscale 设置：[Tailscale](/gateway/tailscale)
