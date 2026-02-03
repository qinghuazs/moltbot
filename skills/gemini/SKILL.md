---
name: gemini
description: Gemini CLI，用于一次性问答、摘要和生成。
homepage: https://ai.google.dev/
metadata: {"moltbot":{"emoji":"♊️","requires":{"bins":["gemini"]},"install":[{"id":"brew","kind":"brew","formula":"gemini-cli","bins":["gemini"],"label":"Install Gemini CLI (brew)"}]}}
---

# Gemini CLI

使用 Gemini 的一次性模式和位置参数提示（避免交互模式）。

快速开始
- `gemini "Answer this question..."`
- `gemini --model <name> "Prompt..."`
- `gemini --output-format json "Return JSON"`

扩展
- 列表：`gemini --list-extensions`
- 管理：`gemini extensions <command>`

注意
- 如果需要认证，先交互式运行一次 `gemini` 并按照登录流程操作。
- 为安全起见避免使用 `--yolo`。
