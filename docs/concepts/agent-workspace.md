---
summary: "代理工作区：位置、结构与备份策略"
read_when:
  - 需要解释代理工作区及其文件布局
  - 想备份或迁移代理工作区
---
# 代理工作区

工作区是代理的家。它是文件工具与工作区上下文的唯一工作目录。
请保持私密，并把它当作记忆。

这与 `~/.clawdbot/` 不同，后者存储配置、凭据与会话。

**重要：**工作区是**默认 cwd**，不是硬性沙箱。工具会以工作区为相对路径解析，
但若未启用沙箱，绝对路径仍可访问主机其它位置。如需隔离，请使用
[`agents.defaults.sandbox`](/gateway/sandboxing)（以及或单独代理的沙箱配置）。
启用沙箱且 `workspaceAccess` 不是 `"rw"` 时，工具会在 `~/.clawdbot/sandboxes`
下的沙箱工作区中运行，而不是你的主机工作区。

## 默认位置

- 默认：`~/clawd`
- 如果设置了 `CLAWDBOT_PROFILE` 且不是 `"default"`，默认变为
  `~/clawd-<profile>`。
- 在 `~/.clawdbot/moltbot.json` 中覆盖：

```json5
{
  agent: {
    workspace: "~/clawd"
  }
}
```

`moltbot onboard`、`moltbot configure` 或 `moltbot setup` 会创建工作区并在缺失时写入 bootstrap 文件。

如果你自行管理工作区文件，可禁用 bootstrap 文件创建：

```json5
{ agent: { skipBootstrap: true } }
```

## 额外的工作区目录

旧安装可能创建过 `~/moltbot`。保留多个工作区目录会造成认证或状态漂移，因为同一时间只有一个工作区是活跃的。

**建议：**仅保留一个活跃工作区。若不再使用额外目录，请归档或移入废纸篓（例如 `trash ~/moltbot`）。
如果你有意保留多个工作区，确保 `agents.defaults.workspace` 指向活跃的那个。

`moltbot doctor` 会在检测到多余工作区目录时给出警告。

## 工作区文件地图（每个文件的含义）

以下是 Moltbot 在工作区内期望的标准文件：

- `AGENTS.md`
  - 代理的操作指令，以及如何使用记忆。
  - 每次会话开始时加载。
  - 适合放规则、优先级与行为细节。

- `SOUL.md`
  - 角色设定、语气与边界。
  - 每次会话加载。

- `USER.md`
  - 用户是谁以及如何称呼。
  - 每次会话加载。

- `IDENTITY.md`
  - 代理名称、风格与 emoji。
  - 在 bootstrap 过程中创建或更新。

- `TOOLS.md`
  - 本地工具与约定说明。
  - 不控制工具可用性，仅提供指导。

- `HEARTBEAT.md`
  - 心跳运行的可选小清单。
  - 保持精简以避免消耗过多 token。

- `BOOT.md`
  - 在启用内部 hooks 时，gateway 重启时执行的可选启动清单。
  - 保持精简；外发消息请用 message 工具。

- `BOOTSTRAP.md`
  - 一次性首次运行仪式。
  - 仅在全新工作区创建。
  - 完成后删除。

- `memory/YYYY-MM-DD.md`
  - 日记忆日志（每日一个文件）。
  - 建议在会话开始时读取今天与昨天。

- `MEMORY.md`（可选）
  - 精选的长期记忆。
  - 仅在主私有会话中加载（非共享或群聊）。

记忆流程与自动刷写见 [Memory](/concepts/memory)。

- `skills/`（可选）
  - 工作区专属技能。
  - 与已管理或内置技能重名时会覆盖。

- `canvas/`（可选）
  - 节点显示用的 Canvas UI 文件（例如 `canvas/index.html`）。

如果任一 bootstrap 文件缺失，Moltbot 会在会话中注入“missing file”标记并继续。
大型 bootstrap 文件在注入时会被截断；可用 `agents.defaults.bootstrapMaxChars`
（默认：20000）调整限制。
`moltbot setup` 可在不覆盖已有文件的情况下重建缺失的默认文件。

## 工作区中不包含的内容

以下内容位于 `~/.clawdbot/`，**不应**提交到工作区仓库：

- `~/.clawdbot/moltbot.json`（配置）
- `~/.clawdbot/credentials/`（OAuth token、API key）
- `~/.clawdbot/agents/<agentId>/sessions/`（会话记录与元数据）
- `~/.clawdbot/skills/`（管理的技能）

如果需要迁移会话或配置，请单独复制，并避免纳入版本控制。

## Git 备份（推荐，私有）

将工作区视为私密记忆。放到**私有** git 仓库以便备份与恢复。

请在 Gateway 运行的机器上执行以下步骤（工作区所在机器）。

### 1) 初始化仓库

若已安装 git，新建工作区会自动初始化。若该工作区尚未是仓库，请执行：

```bash
cd ~/clawd
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 添加私有远程（新手友好选项）

选项 A：GitHub 网页 UI

1. 在 GitHub 创建新的**私有**仓库。
2. 不要初始化 README（避免合并冲突）。
3. 复制 HTTPS 远程 URL。
4. 添加远程并推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

选项 B：GitHub CLI（`gh`）

```bash
gh auth login
gh repo create clawd-workspace --private --source . --remote origin --push
```

选项 C：GitLab 网页 UI

1. 在 GitLab 创建新的**私有**仓库。
2. 不要初始化 README（避免合并冲突）。
3. 复制 HTTPS 远程 URL。
4. 添加远程并推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

### 3) 持续更新

```bash
git status
git add .
git commit -m "Update memory"
git push
```

## 不要提交机密

即便是私有仓库，也应避免将机密存到工作区：

- API key、OAuth token、密码或私人凭据。
- `~/.clawdbot/` 目录中的任何内容。
- 原始聊天导出或敏感附件。

如必须存放敏感引用，请使用占位符，并将真实密钥放在其它位置（密码管理器、环境变量或 `~/.clawdbot/`）。

建议的 `.gitignore` 起始配置：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将工作区迁移到新机器

1. 将仓库克隆到目标路径（默认 `~/clawd`）。
2. 在 `~/.clawdbot/moltbot.json` 中设置 `agents.defaults.workspace` 为该路径。
3. 运行 `moltbot setup --workspace <path>` 以补齐缺失文件。
4. 若需要会话，单独复制旧机器上的 `~/.clawdbot/agents/<agentId>/sessions/`。

## 高级说明

- 多代理路由可为不同代理使用不同工作区。路由配置见
  [Channel routing](/concepts/channel-routing)。
- 若启用 `agents.defaults.sandbox`，非主会话可使用
  `agents.defaults.sandbox.workspaceRoot` 下的每会话沙箱工作区。
