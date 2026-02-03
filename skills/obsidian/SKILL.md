---
name: obsidian
description: Work with Obsidian vaults (plain Markdown notes) and automate via obsidian-cli.
homepage: https://help.obsidian.md
metadata: {"moltbot":{"emoji":"💎","requires":{"bins":["obsidian-cli"]},"install":[{"id":"brew","kind":"brew","formula":"yakitrak/yakitrak/obsidian-cli","bins":["obsidian-cli"],"label":"Install obsidian-cli (brew)"}]}}
---

# Obsidian

Obsidian 库 = 磁盘上的普通文件夹。

库结构（典型）
- 笔记：`*.md`（纯文本 Markdown；可用任何编辑器编辑）
- 配置：`.obsidian/`（工作区 + 插件设置；通常不要从脚本中触碰）
- 画布：`*.canvas`（JSON）
- 附件：您在 Obsidian 设置中选择的任何文件夹（图像/PDF 等）

## 查找活跃库

Obsidian 桌面在此处跟踪库（真实来源）：
- `~/Library/Application Support/obsidian/obsidian.json`

`obsidian-cli` 从该文件解析库；库名称通常是**文件夹名称**（路径后缀）。

快速"什么库是活跃的/笔记在哪里？"
- 如果您已设置默认值：`obsidian-cli print-default --path-only`
- 否则，读取 `~/Library/Application Support/obsidian/obsidian.json` 并使用具有 `"open": true` 的库条目。

注意
- 多个库很常见（iCloud vs `~/Documents`、工作/个人等）。不要猜测；读取配置。
- 避免将硬编码的库路径写入脚本；优先读取配置或使用 `print-default`。

## obsidian-cli 快速入门

选择默认库（一次）：
- `obsidian-cli set-default "<vault-folder-name>"`
- `obsidian-cli print-default` / `obsidian-cli print-default --path-only`

搜索
- `obsidian-cli search "query"`（笔记名称）
- `obsidian-cli search-content "query"`（笔记内部；显示片段 + 行）

创建
- `obsidian-cli create "Folder/New note" --content "..." --open`
- 需要 Obsidian URI 处理程序（`obsidian://…`）工作（已安装 Obsidian）。
- 避免通过 URI 在"隐藏"点文件夹（例如 `.something/...`）下创建笔记；Obsidian 可能会拒绝。

移动/重命名（安全重构）
- `obsidian-cli move "old/path/note" "new/path/note"`
- 更新库中的 `[[wikilinks]]` 和常见 Markdown 链接（这是相对于 `mv` 的主要优势）。

删除
- `obsidian-cli delete "path/note"`

在适当时优先进行直接编辑：打开 `.md` 文件并更改它；Obsidian 会自动获取。
