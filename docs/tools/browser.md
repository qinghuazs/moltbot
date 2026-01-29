---
summary: "集成浏览器控制服务 + 动作命令"
read_when:
  - 添加 agent 控制的浏览器自动化
  - 排查 clawd 干扰你自己的 Chrome 的原因
  - 在 macOS app 中实现浏览器设置与生命周期
---

# 浏览器（clawd 管理）

Moltbot 可运行一个**专用的 Chrome/Brave/Edge/Chromium 配置文件**供 agent 控制。
它与个人浏览器隔离，通过 Gateway 内部的本地控制服务管理（仅 loopback）。

新手视角：
- 把它当作**独立的 agent 浏览器**。
- `clawd` profile **不会**触碰你的个人浏览器数据。
- agent 可在安全通道中**打开标签页、读取页面、点击与输入**。
- 默认 `chrome` profile 使用**系统默认 Chromium 浏览器**通过扩展中继；切换到 `clawd` 使用隔离的托管浏览器。

## 你会得到什么

- 独立浏览器 profile：**clawd**（默认橙色主题）。
- 可预测的标签页控制（列表/打开/聚焦/关闭）。
- agent 动作（点击/输入/拖拽/选择）、快照、截图、PDF。
- 可选多 profile 支持（`clawd`、`work`、`remote` 等）。

这个浏览器**不是**你的日常浏览器。它是面向 agent 自动化与验证的隔离界面。

## 快速开始

```bash
moltbot browser --browser-profile clawd status
moltbot browser --browser-profile clawd start
moltbot browser --browser-profile clawd open https://example.com
moltbot browser --browser-profile clawd snapshot
```

若提示 “Browser disabled”，请在配置中启用（见下）并重启 Gateway。

## Profiles：`clawd` vs `chrome`

- `clawd`：托管、隔离浏览器（无需扩展）。
- `chrome`：扩展中继到**系统浏览器**（需要 Moltbot 扩展绑定标签页）。

若希望默认使用托管模式，设置 `browser.defaultProfile: "clawd"`。

## 配置

浏览器设置位于 `~/.clawdbot/moltbot.json`。

```json5
{
  browser: {
    enabled: true,                    // default: true
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    remoteCdpTimeoutMs: 1500,         // 远程 CDP HTTP 超时（ms）
    remoteCdpHandshakeTimeoutMs: 3000, // 远程 CDP WebSocket 握手超时（ms）
    defaultProfile: "chrome",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      clawd: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" }
    }
  }
}
```

说明：
- 浏览器控制服务绑定在 loopback，端口来自 `gateway.port`（默认 `18791`，即 gateway + 2）。中继使用下一个端口（`18792`）。
- 若修改 Gateway 端口（`gateway.port` 或 `CLAWDBOT_GATEWAY_PORT`），浏览器端口会按同“家族”联动变更。
- 未设置 `cdpUrl` 时默认使用中继端口。
- `remoteCdpTimeoutMs` 作用于远程（非 loopback）CDP 可达性检查。
- `remoteCdpHandshakeTimeoutMs` 作用于远程 CDP WebSocket 可达性检查。
- `attachOnly: true` 表示“不要启动本地浏览器；仅在已运行时附加”。
- `color` 与每个 profile 的 `color` 会给浏览器 UI 着色，便于识别当前 profile。
- 默认 profile 为 `chrome`（扩展中继）；设置 `defaultProfile: "clawd"` 可使用托管浏览器。
- 自动检测顺序：若系统默认浏览器为 Chromium 系列则优先，否则依次为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本地 `clawd` profile 会自动分配 `cdpPort`/`cdpUrl` — 仅在远程 CDP 时设置这些。

## 使用 Brave（或其他 Chromium 浏览器）

若系统默认浏览器是 Chromium 系列（Chrome/Brave/Edge 等），Moltbot 会自动使用。
设置 `browser.executablePath` 可覆盖自动检测：

CLI 示例：

```bash
moltbot config set browser.executablePath "/usr/bin/google-chrome"
```

```json5
// macOS
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}

// Windows
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## 本地 vs 远程控制

- **本地控制（默认）：** Gateway 启动本地 loopback 控制服务并可启动浏览器。
- **远程控制（节点主机）：** 在有浏览器的机器上运行 node host；Gateway 代理浏览器动作。
- **远程 CDP：** 设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以连接远程 Chromium 浏览器；此时 Moltbot 不会启动本地浏览器。

远程 CDP URL 可包含认证：
- Query token（如 `https://provider.example?token=<token>`）
- HTTP Basic（如 `https://user:pass@provider.example`）

Moltbot 在调用 `/json/*` 与连接 CDP WebSocket 时保留认证信息。
请使用环境变量或 secrets manager 保存 token，避免写入配置文件。

## Node 浏览器代理（零配置默认）

若你在**拥有浏览器的机器**上运行 node host，Moltbot 可自动将浏览器工具调用路由到该节点，无需额外配置。这是远程 Gateway 的默认路径。

说明：
- node host 通过**代理命令**暴露本地浏览器控制服务。
- profile 来自节点自身的 `browser.profiles` 配置（与本地一致）。
- 若不需要此功能，可禁用：
  - 在 node：`nodeHost.browserProxy.enabled=false`
  - 在 gateway：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是托管 Chromium 服务，提供 HTTPS CDP 端点。
可将 Moltbot 浏览器 profile 指向 Browserless 区域端点，并使用 API key 认证。

示例：
```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "https://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00"
      }
    }
  }
}
```

说明：
- 将 `<BROWSERLESS_API_KEY>` 替换为你的真实 token。
- 选择与账号匹配的区域端点（见其文档）。

## 安全

关键点：
- 浏览器控制仅 loopback；访问经过 Gateway 鉴权或节点配对。
- 保持 Gateway 与 node host 在私网（如 Tailscale），避免公网暴露。
- 将远程 CDP URL/token 视为机密；建议用环境变量或 secrets manager。

远程 CDP 建议：
- 尽量使用 HTTPS 与短期 token。
- 避免将长期 token 写入配置文件。

## Profiles（多浏览器）

Moltbot 支持多个命名 profile（路由配置）。Profile 可以是：
- **clawd 托管**：专用 Chromium 实例，独立用户数据目录 + CDP 端口
- **remote**：显式 CDP URL（远程 Chromium 浏览器）
- **扩展中继**：通过本地中继 + Chrome 扩展控制现有 Chrome 标签页

默认：
- 缺失时自动创建 `clawd` profile。
- 内置 `chrome` profile 用于扩展中继（默认指向 `http://127.0.0.1:18792`）。
- 本地 CDP 端口默认从 **18800–18899** 分配。
- 删除 profile 会将其本地数据目录移到回收站。

所有控制端点支持 `?profile=<name>`；CLI 使用 `--browser-profile`。

## Chrome 扩展中继（使用现有 Chrome）

Moltbot 可通过本地 CDP 中继 + Chrome 扩展控制**现有 Chrome 标签页**（不需要独立的 “clawd” 实例）。

完整指南：见 [Chrome 扩展](/tools/chrome-extension)

流程：
- Gateway 在本机运行（或在浏览器机上运行 node host）。
- 本地**中继服务**在 loopback `cdpUrl` 监听（默认 `http://127.0.0.1:18792`）。
- 你在标签页上点击 **Moltbot Browser Relay** 扩展图标进行附加（不会自动附加）。
- agent 通过 `browser` 工具选择对应 profile 来控制该标签页。

若 Gateway 运行在别处，请在浏览器机上运行 node host，让 Gateway 代理浏览器动作。

### 沙箱会话

若 agent 会话处于沙箱，`browser` 工具可能默认 `target="sandbox"`（沙箱浏览器）。
扩展中继需要宿主浏览器控制，因此：
- 运行非沙箱会话，或
- 设置 `agents.defaults.sandbox.browser.allowHostControl: true` 并在调用工具时用 `target="host"`。

### 设置

1) 加载扩展（dev/unpacked）：

```bash
moltbot browser extension install
```

- Chrome → `chrome://extensions` → 启用“Developer mode”
- “Load unpacked” → 选择 `moltbot browser extension path` 打印的目录
- 固定扩展，然后在要控制的标签页点击扩展图标（徽标显示 `ON`）

2) 使用：
- CLI：`moltbot browser --browser-profile chrome tabs`
- Agent 工具：`browser`，`profile="chrome"`

可选：若你想使用不同名称或中继端口，可创建自定义 profile：

```bash
moltbot browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

说明：
- 此模式依赖 Playwright-on-CDP 完成多数操作（截图/快照/动作）。
- 再次点击扩展图标可解除附加。

## 隔离保证

- **独立用户数据目录**：不会触碰个人浏览器数据。
- **独立端口**：避免 `9222` 与开发流程冲突。
- **确定性标签页控制**：通过 `targetId` 定位标签页，而非“最后一个标签”。

## 浏览器选择

本地启动时，Moltbot 按以下优先级选择：
1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

可用 `browser.executablePath` 覆盖。

平台规则：
- macOS：检查 `/Applications` 与 `~/Applications`。
- Linux：查找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows：检查常见安装路径。

## 控制 API（可选）

仅用于本地集成，Gateway 提供小型 loopback HTTP API：

- 状态/启动/停止：`GET /`、`POST /start`、`POST /stop`
- 标签页：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/截图：`GET /snapshot`、`POST /screenshot`
- 动作：`POST /navigate`、`POST /act`
- Hooks：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下载：`POST /download`、`POST /wait/download`
- 调试：`GET /console`、`POST /pdf`
- 调试：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 状态：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 设置：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端点支持 `?profile=<name>`。

### Playwright 依赖

部分特性（navigate/act/AI snapshot/role snapshot、元素截图、PDF）需要 Playwright。
若未安装 Playwright，这些端点会返回明确的 501 错误。
clawd 托管 Chrome 的 ARIA 快照与基础截图仍可用。
Chrome 扩展中继驱动下，ARIA 快照与截图同样需要 Playwright。

若看到 `Playwright is not available in this gateway build`，请安装完整 Playwright 包（非 `playwright-core`）并重启 gateway，或重新安装带浏览器支持的 Moltbot。

## 工作方式（内部）

高层流程：
- 一个小型**控制服务**接受 HTTP 请求。
- 通过 **CDP** 连接 Chromium 浏览器（Chrome/Brave/Edge/Chromium）。
- 高级动作（点击/输入/快照/PDF）在 CDP 之上使用 **Playwright**。
- 若缺失 Playwright，仅支持非 Playwright 操作。

该设计让 agent 使用稳定、可预测的接口，同时允许你更换本地/远程浏览器与 profile。

## CLI 快速参考

所有命令均支持 `--browser-profile <name>` 指定 profile。
所有命令也支持 `--json` 输出机器可读结果（稳定 payload）。

基础：
- `moltbot browser status`
- `moltbot browser start`
- `moltbot browser stop`
- `moltbot browser tabs`
- `moltbot browser tab`
- `moltbot browser tab new`
- `moltbot browser tab select 2`
- `moltbot browser tab close 2`
- `moltbot browser open https://example.com`
- `moltbot browser focus abcd1234`
- `moltbot browser close abcd1234`

检查：
- `moltbot browser screenshot`
- `moltbot browser screenshot --full-page`
- `moltbot browser screenshot --ref 12`
- `moltbot browser screenshot --ref e12`
- `moltbot browser snapshot`
- `moltbot browser snapshot --format aria --limit 200`
- `moltbot browser snapshot --interactive --compact --depth 6`
- `moltbot browser snapshot --efficient`
- `moltbot browser snapshot --labels`
- `moltbot browser snapshot --selector "#main" --interactive`
- `moltbot browser snapshot --frame "iframe#main" --interactive`
- `moltbot browser console --level error`
- `moltbot browser errors --clear`
- `moltbot browser requests --filter api --clear`
- `moltbot browser pdf`
- `moltbot browser responsebody "**/api" --max-chars 5000`

动作：
- `moltbot browser navigate https://example.com`
- `moltbot browser resize 1280 720`
- `moltbot browser click 12 --double`
- `moltbot browser click e12 --double`
- `moltbot browser type 23 "hello" --submit`
- `moltbot browser press Enter`
- `moltbot browser hover 44`
- `moltbot browser scrollintoview e12`
- `moltbot browser drag 10 11`
- `moltbot browser select 9 OptionA OptionB`
- `moltbot browser download e12 /tmp/report.pdf`
- `moltbot browser waitfordownload /tmp/report.pdf`
- `moltbot browser upload /tmp/file.pdf`
- `moltbot browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `moltbot browser dialog --accept`
- `moltbot browser wait --text "Done"`
- `moltbot browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `moltbot browser evaluate --fn '(el) => el.textContent' --ref 7`
- `moltbot browser highlight e12`
- `moltbot browser trace start`
- `moltbot browser trace stop`

状态：
- `moltbot browser cookies`
- `moltbot browser cookies set session abc123 --url "https://example.com"`
- `moltbot browser cookies clear`
- `moltbot browser storage local get`
- `moltbot browser storage local set theme dark`
- `moltbot browser storage session clear`
- `moltbot browser set offline on`
- `moltbot browser set headers --json '{"X-Debug":"1"}'`
- `moltbot browser set credentials user pass`
- `moltbot browser set credentials --clear`
- `moltbot browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `moltbot browser set geo --clear`
- `moltbot browser set media dark`
- `moltbot browser set timezone America/New_York`
- `moltbot browser set locale en-US`
- `moltbot browser set device "iPhone 14"`

说明：
- `upload` 与 `dialog` 是**arming** 调用；在触发选择器/对话框的点击/按键之前先调用。
- `upload` 也可通过 `--input-ref` 或 `--element` 直接设置 file input。
- `snapshot`：
  - `--format ai`（默认，Playwright 安装时）：返回带数字 ref 的 AI 快照（`aria-ref="<n>"`）。
  - `--format aria`：返回无障碍树（无 ref，仅用于检查）。
  - `--efficient`（或 `--mode efficient`）：紧凑的 role snapshot 预设（interactive + compact + depth + 更低 maxChars）。
  - 配置默认值（仅 tool/CLI）：设置 `browser.snapshotDefaults.mode: "efficient"`，当调用方未传 mode 时使用高效快照（见 [Gateway 配置](/gateway/configuration#browser-clawd-managed-browser)）。
  - Role snapshot 选项（`--interactive`、`--compact`、`--depth`、`--selector`）会强制 role-based 快照，返回如 `ref=e12`。
  - `--frame "<iframe selector>"` 将 role 快照限定在 iframe 内（与 `e12` 等 ref 搭配）。
  - `--interactive` 输出可交互元素列表（最适合驱动动作）。
  - `--labels` 附带视口截图并叠加 ref 标签（输出 `MEDIA:<path>`）。
- `click`/`type` 等需要 `snapshot` 的 `ref`（数字 `12` 或 role ref `e12`）。
  CSS 选择器刻意不支持用于动作。

## 快照与 ref

Moltbot 支持两种快照样式：

- **AI 快照（数字 ref）**：`moltbot browser snapshot`（默认；`--format ai`）
  - 输出：包含数字 ref 的文本快照。
  - 动作：`moltbot browser click 12`、`moltbot browser type 23 "hello"`。
  - 内部通过 Playwright 的 `aria-ref` 解析 ref。

- **Role 快照（`e12` 等）**：`moltbot browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：基于 role 的列表/树，包含 `[ref=e12]`（可选 `[nth=1]`）。
  - 动作：`moltbot browser click e12`、`moltbot browser highlight e12`。
  - 内部通过 `getByRole(...)` 解析（重复项使用 `nth()`）。
  - 使用 `--labels` 可附带带 `e12` 标签的视口截图。

Ref 行为：
- ref **不会跨导航稳定**；若失败请重新 `snapshot` 获取新 ref。
- 若 role 快照使用 `--frame`，role ref 会限定在该 iframe，直到下一次 role 快照。

## Wait 增强

不仅可等待时间/文本，还支持：

- 等待 URL（Playwright glob）：
  - `moltbot browser wait --url "**/dash"`
- 等待加载状态：
  - `moltbot browser wait --load networkidle`
- 等待 JS 条件：
  - `moltbot browser wait --fn "window.ready===true"`
- 等待选择器可见：
  - `moltbot browser wait "#main"`

可组合使用：

```bash
moltbot browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## 调试流程

当动作失败（如 “not visible”、“strict mode violation”、“covered”）：

1. `moltbot browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（优先使用 interactive 的 role ref）
3. 仍失败：`moltbot browser highlight <ref>` 看 Playwright 命中的元素
4. 页面异常时：
   - `moltbot browser errors --clear`
   - `moltbot browser requests --filter api --clear`
5. 深度排查可录制 trace：
   - `moltbot browser trace start`
   - 复现问题
   - `moltbot browser trace stop`（输出 `TRACE:<path>`）

## JSON 输出

`--json` 用于脚本和结构化工具。

示例：

```bash
moltbot browser status --json
moltbot browser snapshot --interactive --json
moltbot browser requests --filter api --json
moltbot browser cookies --json
```

JSON 的 role 快照包含 `refs` 与 `stats`（lines/chars/refs/interactive），便于评估 payload 大小与密度。

## 状态与环境设置

这些设置适用于“让网站表现为某种环境”的场景：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- Storage：`storage local|session get|set|clear`
- Offline：`set offline on|off`
- Headers：`set headers --json '{"X-Debug":"1"}'`（或 `--clear`）
- HTTP Basic Auth：`set credentials user pass`（或 `--clear`）
- Geolocation：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- Media：`set media dark|light|no-preference|none`
- Timezone / locale：`set timezone ...`、`set locale ...`
- Device / viewport：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- clawd 浏览器 profile 可能包含已登录会话；请视为敏感。
- `browser act kind=evaluate` / `moltbot browser evaluate` 与 `wait --fn`
  会在页面上下文执行任意 JS。提示注入可能影响此行为。
  若不需要可设置 `browser.evaluateEnabled=false` 关闭。
- 登录与反爬注意事项（X/Twitter 等）见 [Browser login + X/Twitter posting](/tools/browser-login)。
- 保持 Gateway/node host 私有（仅 loopback 或 tailnet）。
- 远程 CDP 端点权限很高；请通过隧道并加固。

## 故障排查

Linux 特定问题（尤其 snap Chromium）见
[Browser troubleshooting](/tools/browser-linux-troubleshooting)。

## Agent 工具与控制方式

agent 只有**一个浏览器工具**：
- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射方式：
- `browser snapshot` 返回稳定 UI 树（AI 或 ARIA）。
- `browser act` 使用 `snapshot` 的 `ref` 进行点击/输入/拖拽/选择。
- `browser screenshot` 捕获像素（全页或元素）。
- `browser` 支持：
  - `profile` 选择命名浏览器 profile（clawd、chrome、或远程 CDP）。
  - `target`（`sandbox` | `host` | `node`）选择浏览器所在位置。
  - 沙箱会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 若省略 `target`：沙箱会话默认 `sandbox`，非沙箱会话默认 `host`。
  - 若连接了可用的浏览器节点，工具可能自动路由，除非固定 `target="host"` 或 `target="node"`。

这使 agent 保持确定性并避免脆弱的选择器。
