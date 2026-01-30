---
summary: "macOS Skills 设置 UI 与 gateway 侧状态"
read_when:
  - 更新 macOS Skills 设置界面
  - 修改技能门控或安装行为
---
# Skills（macOS）

macOS 应用通过 gateway 展示 Moltbot 技能；不会在本地解析技能。

## 数据来源
- `skills.status`（gateway）返回所有技能及其可用性与缺失要求
  （包含对内置技能的 allowlist 阻止）。
- 要求来源于每个 `SKILL.md` 的 `metadata.moltbot.requires`。

## 安装行为
- `metadata.moltbot.install` 定义安装选项（brew/node/go/uv）。
- 应用调用 `skills.install` 在 gateway 主机上运行安装器。
- 当提供多个安装器时，gateway 只暴露一个首选项
  （有 brew 则用 brew，否则使用 `skills.install` 中的 node manager，默认 npm）。

## 环境变量与 API key
- 应用将 key 存在 `~/.clawdbot/moltbot.json` 的 `skills.entries.<skillKey>` 下。
- `skills.update` 会补丁更新 `enabled`、`apiKey` 与 `env`。

## 远程模式
- 安装与配置更新都发生在 gateway 主机上（不是本地 Mac）。
