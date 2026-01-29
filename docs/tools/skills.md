---
summary: "Skills：托管与工作区技能、门控规则与配置/环境接入"
read_when:
  - 添加或修改 skills
  - 修改 skill 门控或加载规则
---
# Skills（Moltbot）

Moltbot 使用 **[AgentSkills](https://agentskills.io) 兼容**的技能目录来教 agent 如何使用工具。每个技能是一个目录，包含带 YAML frontmatter 与说明的 `SKILL.md`。Moltbot 会加载**内置技能**和可选本地覆盖，并在加载时依据环境、配置与二进制存在性进行过滤。

## 位置与优先级

Skills 从**三个**位置加载：

1) **内置技能**：随安装包提供（npm 或 Moltbot.app）
2) **托管/本地技能**：`~/.clawdbot/skills`
3) **工作区技能**：`<workspace>/skills`

同名技能冲突时优先级：

`<workspace>/skills`（最高）→ `~/.clawdbot/skills` → 内置技能（最低）

此外，可通过 `~/.clawdbot/moltbot.json` 中的 `skills.load.extraDirs`
配置额外技能目录（最低优先级）。

## 按 agent vs 共享技能

在**多 agent**设置中，每个 agent 有自己的 workspace，因此：

- **按 agent 技能** 仅存在于该 agent 的 `<workspace>/skills`。
- **共享技能** 存在于 `~/.clawdbot/skills`（托管/本地），对同机所有 agent 可见。
- **共享目录** 也可通过 `skills.load.extraDirs`（最低优先级）添加，作为多 agent 共用的技能包。

同名技能存在时仍遵循优先级：workspace 优先，其次托管/本地，最后内置。

## 插件 + Skills

插件可在 `moltbot.plugin.json` 中列出 `skills` 目录（相对插件根）。插件启用时加载其技能，并参与正常优先级规则。可通过插件配置项的 `metadata.moltbot.requires.config` 进行门控。插件发现/配置见 [Plugins](/plugin)，技能所教授的工具面见 [Tools](/tools)。部分插件会同时提供技能与工具（如 voice-call 插件）。

## ClawdHub（安装 + 同步）

ClawdHub 是 Moltbot 的公共技能注册表：<https://clawdhub.com>。用于发现、安装、更新和备份技能。完整指南见 [ClawdHub](/tools/clawdhub)。

常见流程：

- 将技能安装到工作区：
  - `clawdhub install <skill-slug>`
- 更新所有已安装技能：
  - `clawdhub update --all`
- 同步（扫描 + 发布更新）：
  - `clawdhub sync --all`

默认情况下，`clawdhub` 安装到当前工作目录下的 `./skills`
（或回退到配置的 Moltbot workspace）。Moltbot 会在下个会话中将其作为 `<workspace>/skills` 加载。

## 安全说明

- 将第三方技能视为**可信代码**。启用前请先阅读。
- 对不可信输入和高风险工具优先使用沙箱。见 [Sandboxing](/gateway/sandboxing)。
- `skills.entries.*.env` 与 `skills.entries.*.apiKey` 会把密钥注入**宿主**进程（非沙箱）。避免在提示或日志中泄露密钥。
- 更完整威胁模型与清单见 [Security](/gateway/security)。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 至少包含：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
---
```

说明：
- 遵循 AgentSkills 规范的布局/意图。
- 嵌入式 agent 解析器仅支持**单行** frontmatter 键。
- `metadata` 必须是**单行 JSON 对象**。
- 说明中使用 `{baseDir}` 引用技能目录路径。
- 可选 frontmatter 字段：
  - `homepage` — URL，会在 macOS Skills UI 中显示为 “Website”（也可用 `metadata.moltbot.homepage`）。
  - `user-invocable` — `true|false`（默认 `true`）。为 `true` 时暴露用户斜杠命令。
  - `disable-model-invocation` — `true|false`（默认 `false`）。为 `true` 时该技能不注入模型提示（仍可用户调用）。
  - `command-dispatch` — `tool`（可选）。设置后，斜杠命令绕过模型并直接派发到工具。
  - `command-tool` — 当 `command-dispatch: tool` 时调用的工具名。
  - `command-arg-mode` — `raw`（默认）。工具派发时直接转发原始参数（不做核心解析）。

    调用工具时参数为：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 门控（加载时过滤）

Moltbot 在加载时使用 `metadata`（单行 JSON）过滤技能：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
metadata: {"moltbot":{"requires":{"bins":["uv"],"env":["GEMINI_API_KEY"],"config":["browser.enabled"]},"primaryEnv":"GEMINI_API_KEY"}}
---
```

`metadata.moltbot` 字段：
- `always: true` — 总是包含（跳过其他门控）。
- `emoji` — 可选 emoji（macOS Skills UI 使用）。
- `homepage` — 可选 URL（macOS Skills UI 显示为 “Website”）。
- `os` — 可选平台列表（`darwin`、`linux`、`win32`）。设置后仅在这些 OS 上可用。
- `requires.bins` — 列表；每项必须在 `PATH` 中存在。
- `requires.anyBins` — 列表；至少一个存在于 `PATH`。
- `requires.env` — 列表；环境变量必须存在**或**在配置中提供。
- `requires.config` — 列表；`moltbot.json` 路径必须为真。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的 env 变量名。
- `install` — macOS Skills UI 使用的安装器规格数组（brew/node/go/uv/download）。

关于沙箱：
- `requires.bins` 在技能加载时在**宿主**检查。
- 若 agent 被沙箱化，该二进制也必须存在于**容器内**。
  通过 `agents.defaults.sandbox.docker.setupCommand` 安装（或使用自定义镜像）。
  `setupCommand` 在容器创建后仅运行一次。
  包安装还需要网络出站、可写根文件系统与 root 用户。
  示例：`summarize` 技能（`skills/summarize/SKILL.md`）在沙箱中需要 `summarize` CLI。

安装器示例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: {"moltbot":{"emoji":"♊️","requires":{"bins":["gemini"]},"install":[{"id":"brew","kind":"brew","formula":"gemini-cli","bins":["gemini"],"label":"Install Gemini CLI (brew)"}]}}
---
```

说明：
- 若列出多个安装器，gateway 会选择一个**首选**（brew 优先，其次 node）。
- 若全部为 `download`，Moltbot 会列出每个条目，以便查看可用产物。
- 安装器规格可包含 `os: ["darwin"|"linux"|"win32"]` 按平台过滤。
- Node 安装遵循 `moltbot.json` 的 `skills.install.nodeManager`（默认 npm；可选 npm/pnpm/yarn/bun）。
  这仅影响**技能安装**；Gateway 运行时仍应使用 Node
  （Bun 不推荐用于 WhatsApp/Telegram）。
- Go 安装：若 `go` 缺失且 `brew` 可用，gateway 会先通过 Homebrew 安装 Go，并尽量将 `GOBIN` 设为 Homebrew 的 `bin`。
 - Download 安装：`url`（必填）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认自动识别归档）、`stripComponents`、`targetDir`（默认 `~/.clawdbot/tools/<skillKey>`）。

如果没有 `metadata.moltbot`，技能总是可用（除非在配置中禁用，或被 `skills.allowBundled` 对内置技能的限制阻止）。

## 配置覆盖（`~/.clawdbot/moltbot.json`）

内置/托管技能可被开关并注入 env 值：

```json5
{
  skills: {
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE"
        },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro"
        }
      },
      peekaboo: { enabled: true },
      sag: { enabled: false }
    }
  }
}
```

注意：若技能名包含连字符，请给 key 加引号（JSON5 允许）。

配置 key 默认匹配**技能名**。若技能定义了 `metadata.moltbot.skillKey`，请使用该 key 放在 `skills.entries` 下。

规则：
- `enabled: false` 会禁用该技能（即使是内置/已安装）。
- `env`：仅在进程环境未设置该变量时注入。
- `apiKey`：对声明了 `metadata.moltbot.primaryEnv` 的技能提供便捷设置。
- `config`：可选的每技能配置包；自定义字段需放在此处。
- `allowBundled`：仅作用于**内置**技能的 allowlist。设置后，仅列表中的内置技能可用（托管/工作区技能不受影响）。

## 环境注入（每次 agent 运行）

当 agent 运行开始时，Moltbot：
1) 读取技能元数据。
2) 将 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 注入到 `process.env`。
3) 构建包含**可用**技能的系统提示。
4) 运行结束后恢复原环境。

这**仅作用于该次 agent 运行**，不会变成全局 shell 环境。

## 会话快照（性能）

Moltbot 在会话开始时**快照**可用技能列表，并在该会话后续回合复用。技能或配置更改会在下一个新会话生效。

当启用 skills watcher 或出现新的可用远程节点时，技能也可在会话中途刷新（见下）。这相当于**热重载**：刷新列表会在下一次 agent 回合生效。

## 远程 macOS 节点（Linux Gateway）

若 Gateway 运行在 Linux，但连接了**macOS 节点**且**允许 `system.run`**（Exec approvals security 不为 `deny`），Moltbot 可在该节点存在所需二进制时，将 macOS-only 技能视为可用。agent 应通过 `nodes` 工具（通常 `nodes.run`）执行这些技能。

此能力依赖节点报告其命令支持，并通过 `system.run` 探测二进制。若 macOS 节点之后离线，技能仍会显示；调用会失败直到节点重新连接。

## Skills watcher（自动刷新）

默认情况下，Moltbot 监控技能目录，在 `SKILL.md` 变更时更新技能快照。在 `skills.load` 下配置：

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250
    }
  }
}
```

## Token 影响（技能列表）

当技能可用时，Moltbot 会向系统提示注入一段紧凑的 XML 技能列表（`pi-coding-agent` 的 `formatSkillsForPrompt`）。成本可预测：

- **基础开销（仅当 ≥1 个技能）：** 195 字符。
- **每个技能：** 97 字符 + XML 转义后的 `<name>`、`<description>`、`<location>` 长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

说明：
- XML 转义会把 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），长度变长。
- token 数量因模型分词器而异。粗略估算 OpenAI 风格约 4 字符/token，因此**每个技能约 24 tokens + 字段长度**。

## 托管技能生命周期

Moltbot 随安装包提供一组**内置技能**（npm 或 Moltbot.app）。`~/.clawdbot/skills` 用于本地覆盖（例如在不修改内置副本的情况下钉住/打补丁）。工作区技能由用户维护，且在同名冲突时覆盖其他来源。

## 配置参考

完整配置 schema 见 [Skills config](/tools/skills-config)。

## 想找更多技能？

浏览 <https://clawdhub.com>。

---
