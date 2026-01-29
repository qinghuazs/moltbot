---
summary: "在 Linux 上排查 Chrome/Brave/Edge/Chromium CDP 启动问题（Moltbot 浏览器控制）"
read_when: "Linux 上浏览器控制失败，尤其是 snap Chromium"
---

# 浏览器故障排查（Linux）

## 问题：“Failed to start Chrome CDP on port 18800”

Moltbot 浏览器控制服务启动 Chrome/Brave/Edge/Chromium 时失败，报错：
```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"clawd\"."}
```

### 根因

在 Ubuntu（及许多 Linux 发行版）上，默认 Chromium 安装是 **snap 包**。snap 的 AppArmor 限制会干扰 Moltbot 启动与监控浏览器进程。

`apt install chromium` 实际安装的是一个指向 snap 的占位包：
```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

这不是完整浏览器，只是包装器。

### 方案 1：安装 Google Chrome（推荐）

安装官方 Google Chrome `.deb` 包（非 snap 沙箱）：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # 若有依赖错误
```

然后更新 Moltbot 配置（`~/.clawdbot/moltbot.json`）：

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### 方案 2：使用 Snap Chromium + 仅附加模式

若必须使用 snap Chromium，可配置 Moltbot 附加到手动启动的浏览器：

1. 更新配置：
```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

2. 手动启动 Chromium：
```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.clawdbot/browser/clawd/user-data \
  about:blank &
```

3. 可选：创建 systemd 用户服务自动启动 Chrome：
```ini
# ~/.config/systemd/user/clawd-browser.service
[Unit]
Description=Clawd Browser (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.clawdbot/browser/clawd/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

启用：`systemctl --user enable --now clawd-browser.service`

### 验证浏览器是否可用

检查状态：
```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

测试浏览：
```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### 配置参考

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `browser.enabled` | 启用浏览器控制 | `true` |
| `browser.executablePath` | Chromium 内核浏览器二进制路径（Chrome/Brave/Edge/Chromium） | 自动检测（优先系统默认 Chromium） |
| `browser.headless` | 无 GUI 运行 | `false` |
| `browser.noSandbox` | 添加 `--no-sandbox`（部分 Linux 必需） | `false` |
| `browser.attachOnly` | 不启动浏览器，仅附加已运行实例 | `false` |
| `browser.cdpPort` | Chrome DevTools Protocol 端口 | `18800` |

### 问题：“Chrome extension relay 已运行，但没有连接的标签页”

你正在使用 `chrome` profile（扩展中继）。它要求 Moltbot 浏览器扩展附加到某个标签页。

修复方式：
1. **使用托管浏览器：** `moltbot browser start --browser-profile clawd`
   （或设置 `browser.defaultProfile: "clawd"`）。
2. **使用扩展中继：** 安装扩展、打开标签页并点击 Moltbot 扩展图标进行附加。

说明：
- `chrome` profile 尽可能使用**系统默认 Chromium 浏览器**。
- 本地 `clawd` profile 会自动分配 `cdpPort`/`cdpUrl`；仅在远程 CDP 时手动设置。
