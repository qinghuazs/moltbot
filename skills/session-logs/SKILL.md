---
name: session-logs
description: 使用 jq 搜索和分析你自己的会话日志（旧的/父级对话）。
metadata: {"moltbot":{"emoji":"📜","requires":{"bins":["jq","rg"]}}}
---

# session-logs

搜索存储在会话 JSONL 文件中的完整对话历史。当用户引用旧的/父级对话或询问之前说过什么时使用。

## 触发

当用户询问之前的聊天、父级对话或记忆文件中没有的历史上下文时使用此技能。

## 位置

会话日志位于：`~/.clawdbot/agents/<agentId>/sessions/`（使用系统提示 Runtime 行中的 `agent=<id>` 值）。

- **`sessions.json`** - 将会话键映射到会话 ID 的索引
- **`<session-id>.jsonl`** - 每个会话的完整对话记录

## 结构

每个 `.jsonl` 文件包含消息：
- `type`："session"（元数据）或 "message"
- `timestamp`：ISO 时间戳
- `message.role`："user"、"assistant" 或 "toolResult"
- `message.content[]`：文本、思考或工具调用（过滤 `type=="text"` 获取人类可读内容）
- `message.usage.cost.total`：每次响应的成本

## 常用查询

### 按日期和大小列出所有会话
```bash
for f in ~/.clawdbot/agents/<agentId>/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  size=$(ls -lh "$f" | awk '{print $5}')
  echo "$date $size $(basename $f)"
done | sort -r
```

### 查找特定日期的会话
```bash
for f in ~/.clawdbot/agents/<agentId>/sessions/*.jsonl; do
  head -1 "$f" | jq -r '.timestamp' | grep -q "2026-01-06" && echo "$f"
done
```

### 从会话中提取用户消息
```bash
jq -r 'select(.message.role == "user") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl
```

### 在助手响应中搜索关键词
```bash
jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl | rg -i "keyword"
```

### 获取会话的总成本
```bash
jq -s '[.[] | .message.usage.cost.total // 0] | add' <session>.jsonl
```

### 每日成本摘要
```bash
for f in ~/.clawdbot/agents/<agentId>/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  cost=$(jq -s '[.[] | .message.usage.cost.total // 0] | add' "$f")
  echo "$date $cost"
done | awk '{a[$1]+=$2} END {for(d in a) print d, "$"a[d]}' | sort -r
```

### 统计会话中的消息和 token
```bash
jq -s '{
  messages: length,
  user: [.[] | select(.message.role == "user")] | length,
  assistant: [.[] | select(.message.role == "assistant")] | length,
  first: .[0].timestamp,
  last: .[-1].timestamp
}' <session>.jsonl
```

### 工具使用分解
```bash
jq -r '.message.content[]? | select(.type == "toolCall") | .name' <session>.jsonl | sort | uniq -c | sort -rn
```

### 在所有会话中搜索短语
```bash
rg -l "phrase" ~/.clawdbot/agents/<agentId>/sessions/*.jsonl
```

## 提示

- 会话是仅追加的 JSONL（每行一个 JSON 对象）
- 大型会话可能有几 MB - 使用 `head`/`tail` 进行采样
- `sessions.json` 索引将聊天提供商（discord、whatsapp 等）映射到会话 ID
- 已删除的会话有 `.deleted.<timestamp>` 后缀

## 快速纯文本提示（低噪音）

```bash
jq -r 'select(.type=="message") | .message.content[]? | select(.type=="text") | .text' ~/.clawdbot/agents/<agentId>/sessions/<id>.jsonl | rg 'keyword'
```
