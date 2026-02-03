---
name: nano-pdf
description: Edit PDFs with natural-language instructions using the nano-pdf CLI.
homepage: https://pypi.org/project/nano-pdf/
metadata: {"moltbot":{"emoji":"📄","requires":{"bins":["nano-pdf"]},"install":[{"id":"uv","kind":"uv","package":"nano-pdf","bins":["nano-pdf"],"label":"Install nano-pdf (uv)"}]}}
---

# nano-pdf

使用 `nano-pdf` 通过自然语言指令对 PDF 的特定页面进行编辑。

## 快速开始

```bash
nano-pdf edit deck.pdf 1 "Change the title to 'Q3 Results' and fix the typo in the subtitle"
```

注意事项:
- 页码可能是从 0 开始或从 1 开始,具体取决于工具的版本/配置;如果结果看起来差了一页,请尝试另一种方式。
- 在发送之前,务必检查输出的 PDF 文件。
