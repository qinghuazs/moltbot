---
summary: "`moltbot memory` 的 CLI 参考（status/index/search）"
read_when:
  - 想索引或搜索语义记忆
  - 正在排查记忆可用性或索引问题
---

# `moltbot memory`

管理语义记忆索引与搜索。
由当前启用的记忆插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 可禁用）。

相关：
- 记忆概念：[Memory](/concepts/memory)
- 插件：[Plugins](/plugins)

## 示例

```bash
moltbot memory status
moltbot memory status --deep
moltbot memory status --deep --index
moltbot memory status --deep --index --verbose
moltbot memory index
moltbot memory index --verbose
moltbot memory search "release checklist"
moltbot memory status --agent main
moltbot memory index --agent main --verbose
```

## 选项

通用：

- `--agent <id>`：限定到单个代理（默认：所有已配置代理）。
- `--verbose`：在探测与索引期间输出详细日志。

说明：
- `memory status --deep` 探测向量库与嵌入可用性。
- `memory status --deep --index` 在存储脏时执行重新索引。
- `memory index --verbose` 打印每个阶段的细节（提供商、模型、来源、批处理）。
- `memory status` 包含通过 `memorySearch.extraPaths` 配置的额外路径。
