---
summary: "`moltbot plugins` CLI 参考（list、install、enable/disable、doctor）"
read_when:
  - 您想安装或管理进程内网关插件
  - 您想调试插件加载失败
---

# `moltbot plugins`

管理网关插件/扩展（进程内加载）。

相关：
- 插件系统：[插件](/plugin)
- 插件清单 + 模式：[插件清单](/plugins/manifest)
- 安全加固：[安全](/gateway/security)

## 命令

```bash
moltbot plugins list
moltbot plugins info <id>
moltbot plugins enable <id>
moltbot plugins disable <id>
moltbot plugins doctor
moltbot plugins update <id>
moltbot plugins update --all
```

捆绑插件随 Moltbot 一起发布，但默认禁用。使用 `plugins enable` 激活它们。

所有插件必须提供带有内联 JSON Schema 的 `moltbot.plugin.json` 文件（`configSchema`，即使为空）。缺失/无效的清单或模式会阻止插件加载并导致配置验证失败。

### 安装

```bash
moltbot plugins install <path-or-spec>
```

安全说明：将插件安装视为运行代码。优先使用固定版本。

支持的归档格式：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

使用 `--link` 避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
moltbot plugins install -l ./my-plugin
```

### 更新

```bash
moltbot plugins update <id>
moltbot plugins update --all
moltbot plugins update <id> --dry-run
```

更新仅适用于从 npm 安装的插件（在 `plugins.installs` 中跟踪）。
