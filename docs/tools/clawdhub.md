---
summary: "ClawdHub 指南：公共技能注册表与 CLI 工作流"
read_when:
  - 向新用户介绍 ClawdHub
  - 安装 搜索 或发布技能
  - 解释 ClawdHub CLI 参数与同步行为
---

# ClawdHub

ClawdHub 是 **Moltbot 的公共技能注册表**。它是免费的：所有技能公开、开放、对所有人可见，方便共享与复用。一个技能就是一个包含 `SKILL.md` 文件（以及支持性文本文件）的文件夹。你可以在网页中浏览技能，也可以使用 CLI 搜索、安装、更新和发布技能。

站点：[clawdhub.com](https://clawdhub.com)

## 适用人群（新手友好）

如果你想为 Moltbot agent 增加新能力，ClawdHub 是最简单的技能发现与安装方式。你不需要了解后端如何工作。你可以：

- 用自然语言搜索技能。
- 把技能安装到你的工作区。
- 之后用一条命令更新技能。
- 通过发布技能备份你的作品。

## 快速开始（非技术向）

1) 安装 CLI（见下一节）。
2) 搜索你需要的内容：
   - `clawdhub search "calendar"`
3) 安装技能：
   - `clawdhub install <skill-slug>`
4) 开启一个新的 Moltbot 会话，让它加载新技能。

## 安装 CLI

任选一种：

```bash
npm i -g clawdhub
```

```bash
pnpm add -g clawdhub
```

## 与 Moltbot 的关系

默认情况下，CLI 会把技能安装到当前工作目录下的 `./skills`。如果配置了 Moltbot 工作区，`clawdhub` 会优先使用该工作区，除非你显式传入 `--workdir`（或 `CLAWDHUB_WORKDIR`）。Moltbot 从 `<workspace>/skills` 加载工作区技能，并在**下一次**会话中生效。如果你已经使用 `~/.clawdbot/skills` 或内置技能，工作区技能优先级更高。

关于技能如何加载、共享与门控的详细说明，见 [Skills](/tools/skills)。

## 服务提供的能力（特性）

- **公开浏览**技能及其 `SKILL.md` 内容。
- **搜索**使用向量嵌入（不仅是关键词）。
- **版本管理**支持 semver、changelog 与 tag（包括 `latest`）。
- **下载**每个版本提供 zip 包。
- **星标与评论**用于社区反馈。
- **审核钩子**用于审批与审计。
- **CLI 友好 API**便于自动化与脚本化。

## CLI 命令与参数

全局选项（适用于所有命令）：

- `--workdir <dir>`：工作目录（默认：当前目录；若可用则回退到 Moltbot 工作区）。
- `--dir <dir>`：技能目录，相对于 workdir（默认：`skills`）。
- `--site <url>`：站点基础 URL（浏览器登录）。
- `--registry <url>`：注册表 API 基础 URL。
- `--no-input`：禁用交互提示（非交互）。
- `-V, --cli-version`：打印 CLI 版本。

认证：

- `clawdhub login`（浏览器流程）或 `clawdhub login --token <token>`
- `clawdhub logout`
- `clawdhub whoami`

选项：

- `--token <token>`：粘贴 API token。
- `--label <label>`：为浏览器登录 token 记录标签（默认：`CLI token`）。
- `--no-browser`：不打开浏览器（需要 `--token`）。

搜索：

- `clawdhub search "query"`
- `--limit <n>`：最大结果数。

安装：

- `clawdhub install <slug>`
- `--version <version>`：安装指定版本。
- `--force`：若目录已存在则覆盖。

更新：

- `clawdhub update <slug>`
- `clawdhub update --all`
- `--version <version>`：更新到指定版本（仅适用于单个 slug）。
- `--force`：当本地文件与任何已发布版本不匹配时覆盖。

列表：

- `clawdhub list`（读取 `.clawdhub/lock.json`）

发布：

- `clawdhub publish <path>`
- `--slug <slug>`：技能 slug。
- `--name <name>`：显示名称。
- `--version <version>`：semver 版本。
- `--changelog <text>`：changelog 文本（可为空）。
- `--tags <tags>`：逗号分隔的标签（默认：`latest`）。

删除 取消删除（仅 owner/admin）：

- `clawdhub delete <slug> --yes`
- `clawdhub undelete <slug> --yes`

同步（扫描本地技能并发布新增/更新）：

- `clawdhub sync`
- `--root <dir...>`：额外扫描根目录。
- `--all`：不提示，上传所有内容。
- `--dry-run`：展示将要上传的内容。
- `--bump <type>`：更新时的版本升级类型（`patch|minor|major`，默认：`patch`）。
- `--changelog <text>`：非交互更新的 changelog。
- `--tags <tags>`：逗号分隔标签（默认：`latest`）。
- `--concurrency <n>`：注册表检查并发（默认：4）。

## Agent 常见工作流

### 搜索技能

```bash
clawdhub search "postgres backups"
```

### 下载新技能

```bash
clawdhub install my-skill-pack
```

### 更新已安装技能

```bash
clawdhub update --all
```

### 备份你的技能（发布或同步）

发布单个技能文件夹：

```bash
clawdhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

一次性扫描并备份多个技能：

```bash
clawdhub sync --all
```

## 高级细节（技术向）

### 版本与标签

- 每次发布都会创建新的 **semver** `SkillVersion`。
- 标签（如 `latest`）指向某个版本；移动标签即可回滚。
- changelog 会挂在每个版本上，同步或发布更新时可以为空。

### 本地改动与注册表版本

更新时会使用内容哈希把本地技能与注册表版本进行对比。如果本地文件不匹配任何已发布版本，CLI 会询问是否覆盖（非交互场景需 `--force`）。

### 同步扫描与回退根目录

`clawdhub sync` 会先扫描当前 workdir。如果没有找到技能，会回退到已知的旧路径（例如 `~/moltbot/skills` 与 `~/.clawdbot/skills`）。这样可以在不加额外参数的情况下找到旧技能安装。

### 存储与 lockfile

- 已安装技能记录在 workdir 的 `.clawdhub/lock.json` 中。
- 认证 token 存在 ClawdHub CLI 配置文件里（可用 `CLAWDHUB_CONFIG_PATH` 覆盖）。

### 遥测（安装计数）

当你登录后运行 `clawdhub sync`，CLI 会发送最小化快照用于统计安装量。你可以完全禁用：

```bash
export CLAWDHUB_DISABLE_TELEMETRY=1
```

## 环境变量

- `CLAWDHUB_SITE`：覆盖站点 URL。
- `CLAWDHUB_REGISTRY`：覆盖注册表 API URL。
- `CLAWDHUB_CONFIG_PATH`：覆盖 CLI token 与配置存储路径。
- `CLAWDHUB_WORKDIR`：覆盖默认 workdir。
