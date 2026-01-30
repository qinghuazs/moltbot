---
summary: "OpenProse：Moltbot 中的 .prose 工作流、斜杠命令与状态"
read_when:
  - 想运行或编写 .prose 工作流
  - 想启用 OpenProse 插件
  - 需要了解状态存储
---
# OpenProse

OpenProse 是一种可移植、Markdown 优先的工作流格式，用于编排 AI 会话。在 Moltbot 中它以插件形式提供，安装 OpenProse 技能包并注册 `/prose` 斜杠命令。程序存放在 `.prose` 文件中，可通过显式控制流生成多个子代理。

官网：https://www.prose.md

## 能做什么

- 多代理研究与综合，支持显式并行。
- 可重复、审批安全的工作流（代码评审、事件分诊、内容流水线）。
- 可复用的 `.prose` 程序，可在支持的代理运行时中运行。

## 安装与启用

内置插件默认关闭。启用 OpenProse：

```bash
moltbot plugins enable open-prose
```

启用后请重启 Gateway。

开发或本地检出：`moltbot plugins install ./extensions/open-prose`

相关文档：[Plugins](/plugin)、[Plugin manifest](/plugins/manifest)、[Skills](/tools/skills)。

## 斜杠命令

OpenProse 注册 `/prose` 作为可调用技能命令。它会路由到 OpenProse VM 指令，并在底层使用 Moltbot 工具。

常用命令：

```
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

## 示例：一个简单的 `.prose` 文件

```prose
# Research + synthesis with two agents running in parallel.

input topic: "What should we research?"

agent researcher:
  model: sonnet
  prompt: "You research thoroughly and cite sources."

agent writer:
  model: opus
  prompt: "You write a concise summary."

parallel:
  findings = session: researcher
    prompt: "Research {topic}."
  draft = session: writer
    prompt: "Summarize {topic}."

session "Merge the findings + draft into a final answer."
context: { findings, draft }
```

## 文件位置

OpenProse 在工作区内的 `.prose/` 下保存状态：

```
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

用户级持久代理位于：

```
~/.prose/agents/
```

## 状态模式

OpenProse 支持多种状态后端：

- **filesystem**（默认）：`.prose/runs/...`
- **in-context**：临时状态，适合小型程序
- **sqlite**（实验）：需要 `sqlite3` 二进制
- **postgres**（实验）：需要 `psql` 与连接串

说明：
- sqlite/postgres 需手动启用，且为实验功能。
- postgres 凭据会进入子代理日志；请使用专用且最小权限的数据库。

## 远程程序

`/prose run <handle/slug>` 会解析为 `https://p.prose.md/<handle>/<slug>`。
直接 URL 会原样抓取。此处使用 `web_fetch` 工具（或通过 `exec` 进行 POST）。

## Moltbot 运行时映射

OpenProse 程序映射到 Moltbot 原语：

| OpenProse 概念 | Moltbot 工具 |
| --- | --- |
| 生成会话或 Task 工具 | `sessions_spawn` |
| 文件读写 | `read` / `write` |
| Web 抓取 | `web_fetch` |

如果工具允许列表阻止这些工具，OpenProse 程序会失败。见 [Skills config](/tools/skills-config)。

## 安全与审批

将 `.prose` 文件视为代码。运行前请审查。使用 Moltbot 工具允许列表与审批门控来控制副作用。

若需确定性、审批门控的工作流，可对比 [Lobster](/tools/lobster)。
