---
name: peekaboo
description: Capture and automate macOS UI with the Peekaboo CLI.
homepage: https://peekaboo.boo
metadata: {"moltbot":{"emoji":"👀","os":["darwin"],"requires":{"bins":["peekaboo"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/peekaboo","bins":["peekaboo"],"label":"Install Peekaboo (brew)"}]}}
---

# Peekaboo

Peekaboo 是一个完整的 macOS UI 自动化 CLI:捕获/检查屏幕、定位 UI 元素、驱动输入以及管理应用/窗口/菜单。命令共享快照缓存并支持 `--json`/`-j` 用于脚本编写。运行 `peekaboo` 或 `peekaboo <cmd> --help` 查看标志;`peekaboo --version` 打印构建元数据。提示:通过 `polter peekaboo` 运行以确保使用最新构建。

## 功能(所有 CLI 功能,不包括 agent/MCP)

核心
- `bridge`: 检查 Peekaboo Bridge 主机连接
- `capture`: 实时捕获或视频摄取 + 帧提取
- `clean`: 清理快照缓存和临时文件
- `config`: 初始化/显示/编辑/验证、提供商、模型、凭据
- `image`: 捕获屏幕截图(屏幕/窗口/菜单栏区域)
- `learn`: 打印完整的代理指南 + 工具目录
- `list`: 应用、窗口、屏幕、菜单栏、权限
- `permissions`: 检查屏幕录制/辅助功能状态
- `run`: 执行 `.peekaboo.json` 脚本
- `sleep`: 暂停执行一段时间
- `tools`: 列出可用工具,支持过滤/显示选项

交互
- `click`: 通过 ID/查询/坐标定位,带智能等待
- `drag`: 跨元素/坐标/Dock 拖放
- `hotkey`: 修饰键组合,如 `cmd,shift,t`
- `move`: 光标定位,可选平滑移动
- `paste`: 设置剪贴板 -> 粘贴 -> 恢复
- `press`: 特殊键序列,支持重复
- `scroll`: 方向滚动(定向 + 平滑)
- `swipe`: 目标之间的手势式拖动
- `type`: 文本 + 控制键(`--clear`、延迟)

系统
- `app`: 启动/退出/重启/隐藏/取消隐藏/切换/列出应用
- `clipboard`: 读取/写入剪贴板(文本/图片/文件)
- `dialog`: 点击/输入/文件/关闭/列出系统对话框
- `dock`: 启动/右键/隐藏/显示/列出 Dock 项目
- `menu`: 点击/列出应用菜单 + 菜单额外项
- `menubar`: 列出/点击状态栏项目
- `open`: 增强的 `open`,支持应用定位 + JSON 负载
- `space`: 列出/切换/移动窗口(Spaces)
- `visualizer`: 练习 Peekaboo 视觉反馈动画
- `window`: 关闭/最小化/最大化/移动/调整大小/聚焦/列出

视觉
- `see`: 带注释的 UI 地图、快照 ID、可选分析

全局运行时标志
- `--json`/`-j`、`--verbose`/`-v`、`--log-level <level>`
- `--no-remote`、`--bridge-socket <path>`

## 快速开始(正常流程)
```bash
peekaboo permissions
peekaboo list apps --json
peekaboo see --annotate --path /tmp/peekaboo-see.png
peekaboo click --on B1
peekaboo type "Hello" --return
```

## 常用定位参数(大多数交互命令)
- 应用/窗口: `--app`、`--pid`、`--window-title`、`--window-id`、`--window-index`
- 快照定位: `--snapshot` (来自 `see` 的 ID;默认为最新)
- 元素/坐标: `--on`/`--id` (元素 ID)、`--coords x,y`
- 焦点控制: `--no-auto-focus`、`--space-switch`、`--bring-to-current-space`、
  `--focus-timeout-seconds`、`--focus-retry-count`

## 常用捕获参数
- 输出: `--path`、`--format png|jpg`、`--retina`
- 定位: `--mode screen|window|frontmost`、`--screen-index`、
  `--window-title`、`--window-id`
- 分析: `--analyze "prompt"`、`--annotate`
- 捕获引擎: `--capture-engine auto|classic|cg|modern|sckit`

## 常用动作/输入参数
- 时间: `--duration` (拖动/滑动)、`--steps`、`--delay` (输入/滚动/按键)
- 类人移动: `--profile human|linear`、`--wpm` (输入)
- 滚动: `--direction up|down|left|right`、`--amount <ticks>`、`--smooth`

## 示例
### See -> click -> type (最可靠的流程)
```bash
peekaboo see --app Safari --window-title "Login" --annotate --path /tmp/see.png
peekaboo click --on B3 --app Safari
peekaboo type "user@example.com" --app Safari
peekaboo press tab --count 1 --app Safari
peekaboo type "supersecret" --app Safari --return
```

### 通过窗口 ID 定位
```bash
peekaboo list windows --app "Visual Studio Code" --json
peekaboo click --window-id 12345 --coords 120,160
peekaboo type "Hello from Peekaboo" --window-id 12345
```

### 捕获屏幕截图 + 分析
```bash
peekaboo image --mode screen --screen-index 0 --retina --path /tmp/screen.png
peekaboo image --app Safari --window-title "Dashboard" --analyze "Summarize KPIs"
peekaboo see --mode screen --screen-index 0 --analyze "Summarize the dashboard"
```

### 实时捕获(动作感知)
```bash
peekaboo capture live --mode region --region 100,100,800,600 --duration 30 \
  --active-fps 8 --idle-fps 2 --highlight-changes --path /tmp/capture
```

### 应用 + 窗口管理
```bash
peekaboo app launch "Safari" --open https://example.com
peekaboo window focus --app Safari --window-title "Example"
peekaboo window set-bounds --app Safari --x 50 --y 50 --width 1200 --height 800
peekaboo app quit --app Safari
```

### 菜单、菜单栏、dock
```bash
peekaboo menu click --app Safari --item "New Window"
peekaboo menu click --app TextEdit --path "Format > Font > Show Fonts"
peekaboo menu click-extra --title "WiFi"
peekaboo dock launch Safari
peekaboo menubar list --json
```

### 鼠标 + 手势输入
```bash
peekaboo move 500,300 --smooth
peekaboo drag --from B1 --to T2
peekaboo swipe --from-coords 100,500 --to-coords 100,200 --duration 800
peekaboo scroll --direction down --amount 6 --smooth
```

### 键盘输入
```bash
peekaboo hotkey --keys "cmd,shift,t"
peekaboo press escape
peekaboo type "Line 1\nLine 2" --delay 10
```

注意事项
- 需要屏幕录制 + 辅助功能权限。
- 在点击之前使用 `peekaboo see --annotate` 识别目标。
