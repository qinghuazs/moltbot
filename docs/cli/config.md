---
summary: "`moltbot config` 的 CLI 参考（读取和设置配置值）"
read_when:
  - 想以非交互方式读取或修改配置
---

# `moltbot config`

配置辅助：按路径 get/set/unset。未带子命令时会打开配置向导
（同 `moltbot configure`）。

## 示例

```bash
moltbot config get browser.executablePath
moltbot config set browser.executablePath "/usr/bin/google-chrome"
moltbot config set agents.defaults.heartbeat.every "2h"
moltbot config set agents.list[0].tools.exec.node "node-id-or-name"
moltbot config unset tools.web.search.apiKey
```

## 路径

路径支持点与括号写法：

```bash
moltbot config get agents.defaults.workspace
moltbot config get agents.list[0].id
```

使用代理列表索引定位特定代理：

```bash
moltbot config get agents.list
moltbot config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 值

尽可能按 JSON5 解析；否则视为字符串。使用 `--json` 强制 JSON5 解析。

```bash
moltbot config set agents.defaults.heartbeat.every "0m"
moltbot config set gateway.port 19001 --json
moltbot config set channels.whatsapp.groups '["*"]' --json
```

修改后请重启 gateway。
