---
summary: "仓库脚本：用途、范围与安全说明"
read_when:
  - 从仓库运行脚本
  - 在 ./scripts 下新增或修改脚本
---
# Scripts

`scripts/` 目录包含本地流程与运维任务的辅助脚本。
任务明确对应脚本时使用它们，否则优先使用 CLI。

## 约定

- 脚本**非必需**，除非在文档或发布清单中被引用。
- 若已有 CLI 入口，请优先使用（例如认证监控用 `moltbot models status --check`）。
- 假设脚本与主机相关；在新机器上运行前先阅读脚本内容。

## Git hooks

- `scripts/setup-git-hooks.js`：在 git 仓库中尽力设置 `core.hooksPath`。
- `scripts/format-staged.js`：对暂存的 `src/` 与 `test/` 文件进行 pre-commit 格式化。

## 认证监控脚本

认证监控脚本文档：
[/automation/auth-monitoring](/automation/auth-monitoring)

## 添加脚本时

- 脚本保持聚焦并写文档。
- 在相关文档中加入简短条目（若缺失则创建）。
