---
summary: "会话修剪：裁剪工具结果以减少上下文膨胀"
read_when:
  - 你想减少工具输出导致的 LLM 上下文增长
  - 你正在调整 agents.defaults.contextPruning
---
# 会话修剪

会话修剪在每次 LLM 调用之前从内存上下文中裁剪**旧的工具结果**。它**不会**重写磁盘上的会话历史（`*.jsonl`）。

## 运行时机
- 当启用 `mode: "cache-ttl"` 且该会话的最后一次 Anthropic 调用早于 `ttl` 时。
- 仅影响该请求发送给模型的消息。
 - 仅对 Anthropic API 调用（和 OpenRouter Anthropic 模型）有效。
 - 为获得最佳效果，将 `ttl` 与你的模型 `cacheControlTtl` 匹配。
 - 修剪后，TTL 窗口重置，因此后续请求保持缓存直到 `ttl` 再次过期。

## 智能默认值（Anthropic）
- **OAuth 或 setup-token** 配置文件：启用 `cache-ttl` 修剪并将心跳设置为 `1h`。
- **API 密钥**配置文件：启用 `cache-ttl` 修剪，将心跳设置为 `30m`，并在 Anthropic 模型上默认 `cacheControlTtl` 为 `1h`。
- 如果你显式设置了这些值中的任何一个，Moltbot **不会**覆盖它们。

## 改进内容（成本 + 缓存行为）
- **为什么要修剪：** Anthropic 提示词缓存仅在 TTL 内适用。如果会话空闲超过 TTL，下一个请求会重新缓存完整提示词，除非你先裁剪它。
- **什么变得更便宜：** 修剪减少了 TTL 过期后第一个请求的 **cacheWrite** 大小。
- **为什么 TTL 重置很重要：** 一旦修剪运行，缓存窗口重置，因此后续请求可以重用新缓存的提示词，而不是再次重新缓存完整历史。
- **它不做什么：** 修剪不会增加 token 或"加倍"成本；它只改变 TTL 后第一个请求缓存的内容。

## 可修剪的内容
- 仅 `toolResult` 消息。
- 用户 + 助手消息**永远不会**被修改。
- 最后 `keepLastAssistants` 条助手消息受保护；该截止点之后的工具结果不会被修剪。
- 如果没有足够的助手消息来建立截止点，则跳过修剪。
- 包含**图像块**的工具结果会被跳过（永远不会被裁剪/清除）。

## 上下文窗口估算
修剪使用估算的上下文窗口（字符 ≈ token × 4）。窗口大小按以下顺序解析：
1) 模型定义的 `contextWindow`（来自模型注册表）。
2) `models.providers.*.models[].contextWindow` 覆盖。
3) `agents.defaults.contextTokens`。
4) 默认 `200000` token。

## 模式
### cache-ttl
- 仅当最后一次 Anthropic 调用早于 `ttl`（默认 `5m`）时才运行修剪。
- 运行时：与之前相同的软裁剪 + 硬清除行为。

## 软修剪 vs 硬修剪
- **软裁剪**：仅用于超大工具结果。
  - 保留头部 + 尾部，插入 `...`，并附加带有原始大小的注释。
  - 跳过带有图像块的结果。
- **硬清除**：用 `hardClear.placeholder` 替换整个工具结果。

## 工具选择
- `tools.allow` / `tools.deny` 支持 `*` 通配符。
- 拒绝优先。
- 匹配不区分大小写。
- 空的允许列表 => 允许所有工具。

## 与其他限制的交互
- 内置工具已经截断自己的输出；会话修剪是一个额外的层，防止长时间运行的聊天在模型上下文中累积过多的工具输出。
- 压缩是独立的：压缩会总结并持久化，修剪是每个请求的临时操作。参见 [/concepts/compaction](/concepts/compaction)。

## 默认值（启用时）
- `ttl`: `"5m"`
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`
- `hardClearRatio`: `0.5`
- `minPrunableToolChars`: `50000`
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear`: `{ enabled: true, placeholder: "[旧工具结果内容已清除]" }`

## 示例
默认（关闭）：
```json5
{
  agent: {
    contextPruning: { mode: "off" }
  }
}
```

启用 TTL 感知修剪：
```json5
{
  agent: {
    contextPruning: { mode: "cache-ttl", ttl: "5m" }
  }
}
```

限制修剪到特定工具：
```json5
{
  agent: {
    contextPruning: {
      mode: "cache-ttl",
      tools: { allow: ["exec", "read"], deny: ["*image*"] }
    }
  }
}
```

参见配置参考：[网关配置](/gateway/configuration)
