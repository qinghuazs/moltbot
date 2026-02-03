---
name: model-usage
description: 使用 CodexBar CLI 本地成本用量来汇总 Codex 或 Claude 的每模型用量，包括当前（最近）模型或完整模型分解。当被要求从 codexbar 获取模型级用量/成本数据，或需要从 codexbar 成本 JSON 获取可脚本化的每模型摘要时触发。
metadata: {"moltbot":{"emoji":"📊","os":["darwin"],"requires":{"bins":["codexbar"]},"install":[{"id":"brew-cask","kind":"brew","cask":"steipete/tap/codexbar","bins":["codexbar"],"label":"Install CodexBar (brew cask)"}]}}
---

# 模型用量

## 概述
从 CodexBar 的本地成本日志获取每模型用量成本。支持 Codex 或 Claude 的"当前模型"（最近的每日条目）或"所有模型"摘要。

TODO：一旦 CodexBar CLI 的 Linux 安装路径有文档，添加 Linux CLI 支持指南。

## 快速开始
1) 通过 CodexBar CLI 获取成本 JSON 或传入 JSON 文件。
2) 使用捆绑脚本按模型汇总。

```bash
python {baseDir}/scripts/model_usage.py --provider codex --mode current
python {baseDir}/scripts/model_usage.py --provider codex --mode all
python {baseDir}/scripts/model_usage.py --provider claude --mode all --format json --pretty
```

## 当前模型逻辑
- 使用带有 `modelBreakdowns` 的最近每日行。
- 选择该行中成本最高的模型。
- 当分解缺失时回退到 `modelsUsed` 中的最后一个条目。
- 需要特定模型时使用 `--model <name>` 覆盖。

## 输入
- 默认：运行 `codexbar cost --format json --provider <codex|claude>`。
- 文件或 stdin：

```bash
codexbar cost --provider codex --format json > /tmp/cost.json
python {baseDir}/scripts/model_usage.py --input /tmp/cost.json --mode all
cat /tmp/cost.json | python {baseDir}/scripts/model_usage.py --input - --mode current
```

## 输出
- 文本（默认）或 JSON（`--format json --pretty`）。
- 值仅为每模型成本；CodexBar 输出中 token 不按模型拆分。

## 参考
- 阅读 `references/codexbar-cli.md` 了解 CLI 标志和成本 JSON 字段。
