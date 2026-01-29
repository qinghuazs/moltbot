# 创建自定义技能

Moltbot 设计为易于扩展。“技能”是为你的助手添加新能力的主要方式。

## 什么是技能

技能是一个目录，包含一个 `SKILL.md` 文件（为 LLM 提供说明与工具定义），并可选包含脚本或资源文件。

## 步骤：你的第一个技能

### 1. 创建目录

技能位于你的工作区，通常是 `~/clawd/skills/`。为技能新建一个文件夹：

```bash
mkdir -p ~/clawd/skills/hello-world
```

### 2. 定义 `SKILL.md`

在该目录中创建 `SKILL.md`。该文件使用 YAML frontmatter 写元数据，Markdown 写说明。

```markdown
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill
When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".
```

### 3. 添加工具（可选）

你可以在 frontmatter 中定义自定义工具，或指示 agent 使用现有系统工具（如 `bash` 或 `browser`）。

### 4. 刷新 Moltbot

让 agent 执行“refresh skills”，或重启 gateway。Moltbot 会发现新目录并索引 `SKILL.md`。

## 最佳实践

- **保持简洁**：告诉模型要做什么，而不是如何扮演 AI。
- **安全优先**：如果你的技能使用 `bash`，确保提示词不会让不可信输入引发任意命令注入。
- **本地测试**：使用 `moltbot agent --message "use my new skill"` 测试。

## 共享技能

你也可以在 [ClawdHub](https://clawdhub.com) 浏览并贡献技能。
