---
name: things-mac
description: 通过 macOS 上的 `things` CLI 管理 Things 3（通过 URL scheme 添加/更新项目+待办事项；从本地 Things 数据库读取/搜索/列出）。当用户要求 Moltbot 向 Things 添加任务、列出收件箱/今天/即将到来的任务、搜索任务或检查项目/区域/标签时使用。
homepage: https://github.com/ossianhempel/things3-cli
metadata: {"moltbot":{"emoji":"✅","os":["darwin"],"requires":{"bins":["things"]},"install":[{"id":"go","kind":"go","module":"github.com/ossianhempel/things3-cli/cmd/things@latest","bins":["things"],"label":"Install things3-cli (go)"}]}}
---

# Things 3 CLI

使用 `things` 读取本地 Things 数据库（收件箱/今天/搜索/项目/区域/标签）并通过 Things URL scheme 添加/更新待办事项。

设置
- 安装（推荐，Apple Silicon）：`GOBIN=/opt/homebrew/bin go install github.com/ossianhempel/things3-cli/cmd/things@latest`
- 如果数据库读取失败：授予调用应用**完全磁盘访问权限**（手动运行时为终端；网关运行时为 `Moltbot.app`）。
- 可选：设置 `THINGSDB`（或传递 `--db`）指向你的 `ThingsData-*` 文件夹。
- 可选：设置 `THINGS_AUTH_TOKEN` 以避免在更新操作时传递 `--auth-token`。

只读（数据库）
- `things inbox --limit 50`
- `things today`
- `things upcoming`
- `things search "query"`
- `things projects` / `things areas` / `things tags`

写入（URL scheme）
- 优先安全预览：`things --dry-run add "Title"`
- 添加：`things add "Title" --notes "..." --when today --deadline 2026-01-02`
- 将 Things 置于前台：`things --foreground add "Title"`

示例：添加待办事项
- 基本：`things add "Buy milk"`
- 带备注：`things add "Buy milk" --notes "2% + bananas"`
- 到项目/区域：`things add "Book flights" --list "Travel"`
- 到项目标题：`things add "Pack charger" --list "Travel" --heading "Before"`
- 带标签：`things add "Call dentist" --tags "health,phone"`
- 清单：`things add "Trip prep" --checklist-item "Passport" --checklist-item "Tickets"`
- 从 STDIN（多行 => 标题 + 备注）：
  - `cat <<'EOF' | things add -`
  - `Title line`
  - `Notes line 1`
  - `Notes line 2`
  - `EOF`

示例：修改待办事项（需要认证令牌）
- 首先：获取 ID（UUID 列）：`things search "milk" --limit 5`
- 认证：设置 `THINGS_AUTH_TOKEN` 或传递 `--auth-token <TOKEN>`
- 标题：`things update --id <UUID> --auth-token <TOKEN> "New title"`
- 替换备注：`things update --id <UUID> --auth-token <TOKEN> --notes "New notes"`
- 追加/前置备注：`things update --id <UUID> --auth-token <TOKEN> --append-notes "..."` / `--prepend-notes "..."`
- 移动列表：`things update --id <UUID> --auth-token <TOKEN> --list "Travel" --heading "Before"`
- 替换/添加标签：`things update --id <UUID> --auth-token <TOKEN> --tags "a,b"` / `things update --id <UUID> --auth-token <TOKEN> --add-tags "a,b"`
- 完成/取消（软删除）：`things update --id <UUID> --auth-token <TOKEN> --completed` / `--canceled`
- 安全预览：`things --dry-run update --id <UUID> --auth-token <TOKEN> --completed`

删除待办事项？
- `things3-cli` 目前不支持（没有"删除/移到废纸篓"写入命令；`things trash` 是只读列表）。
- 选项：使用 Things UI 删除/废纸篓，或通过 `things update` 标记为 `--completed` / `--canceled`。

注意
- 仅限 macOS。
- `--dry-run` 打印 URL 但不打开 Things。
