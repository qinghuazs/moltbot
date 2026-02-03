---
name: blucli
description: BluOS CLI (blu) for discovery, playback, grouping, and volume.
homepage: https://blucli.sh
metadata: {"moltbot":{"emoji":"🫐","requires":{"bins":["blu"]},"install":[{"id":"go","kind":"go","module":"github.com/steipete/blucli/cmd/blu@latest","bins":["blu"],"label":"Install blucli (go)"}]}}
---

# blucli (blu)

使用 `blu` 控制 Bluesound/NAD 播放器。

快速开始
- `blu devices`（选择目标）
- `blu --device <id> status`
- `blu play|pause|stop`
- `blu volume set 15`

目标选择（按优先级顺序）
- `--device <id|name|alias>`
- `BLU_DEVICE`
- 配置默认值（如果已设置）

常见任务
- 分组：`blu group status|add|remove`
- TuneIn 搜索/播放：`blu tunein search "query"`、`blu tunein play "query"`

脚本中优先使用 `--json`。在更改播放之前确认目标设备。
