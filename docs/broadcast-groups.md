---
summary: "向多个 agents 广播 WhatsApp 消息"
read_when:
  - 配置广播组
  - 排查 WhatsApp 多 agent 回复
status: experimental
---

# 广播组

**状态：** 实验性  
**版本：** 2026.1.9 添加

## 概览

广播组允许多个 agent 同时处理并回复同一条消息。这样你可以在一个 WhatsApp 群或私聊中创建专门化的 agent 团队——仍使用同一个电话号码。

当前范围：**仅 WhatsApp**（web 通道）。

广播组会在通道 allowlist 与群激活规则之后评估。对 WhatsApp 群而言，这表示只有在 Moltbot 正常会回复的情况下（例如按提及规则）才会触发广播。

## 使用场景

### 1. 专项 agent 团队

部署多个职责清晰的 agent：
```
Group: "Development Team"
Agents:
  - CodeReviewer（评审代码片段）
  - DocumentationBot（生成文档）
  - SecurityAuditor（检查漏洞）
  - TestGenerator（建议测试用例）
```

每个 agent 处理同一条消息，并给出其专长视角。

### 2. 多语言支持
```
Group: "International Support"
Agents:
  - Agent_EN（英文回复）
  - Agent_DE（德语回复）
  - Agent_ES（西班牙语回复）
```

### 3. 质量保证流程
```
Group: "Customer Support"
Agents:
  - SupportAgent（给出答案）
  - QAAgent（审查质量，仅在发现问题时回复）
```

### 4. 任务自动化
```
Group: "Project Management"
Agents:
  - TaskTracker（更新任务数据库）
  - TimeLogger（记录耗时）
  - ReportGenerator（生成摘要）
```

## 配置

### 基础设置

在顶层添加 `broadcast`（与 `bindings` 同级）。键为 WhatsApp peer id：
- 群聊：group JID（如 `120363403215116621@g.us`）
- 私聊：E.164 号码（如 `+15551234567`）

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**结果：** 当 Moltbot 本应在该对话中回复时，会运行这三个 agent。

### 处理策略

控制 agent 处理消息的方式：

#### 并行（默认）

所有 agent 同时处理：
```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### 顺序

按顺序处理（后一个等待前一个完成）：
```json
{
  "broadcast": {
    "strategy": "sequential",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

### 完整示例

```json
{
  "agents": {
    "list": [
      {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "Documentation Generator",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    ]
  },
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"],
    "120363424282127706@g.us": ["support-en", "support-de"],
    "+15555550123": ["assistant", "logger"]
  }
}
```

## 工作原理

### 消息流

1. **入站消息** 到达 WhatsApp 群
2. **广播检查**：系统检查 peer ID 是否在 `broadcast`
3. **若在广播列表**：
   - 运行列出的所有 agent
   - 每个 agent 有独立的会话 key 与隔离上下文
   - 默认并行，也可顺序
4. **若不在广播列表**：
   - 走正常路由（第一个匹配的 binding）

注意：广播组不会绕过通道 allowlist 或群激活规则（提及/命令等）。它只改变“当消息可处理时运行哪些 agent”。

### 会话隔离

广播组中的每个 agent 都保持完全独立：

- **会话 key**（`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`）
- **对话历史**（agent 看不到其他 agent 的消息）
- **工作区**（若配置则各自沙箱）
- **工具访问**（不同 allow/deny）
- **记忆/上下文**（独立的 IDENTITY.md、SOUL.md 等）
- **群上下文缓冲**（最近群消息用于上下文）在同一 peer 内共享，因此所有广播 agent 在触发时看到相同上下文

这使每个 agent 可以：
- 拥有不同人格
- 使用不同工具权限（如只读 vs 读写）
- 使用不同模型（如 opus vs sonnet）
- 安装不同技能

### 示例：隔离会话

在群 `120363403215116621@g.us` 中使用 agents `['alfred', 'baerbel']`：

**Alfred 的上下文：**
```
Session: agent:alfred:whatsapp:group:120363403215116621@g.us
History: [user message, alfred's previous responses]
Workspace: /Users/pascal/clawd-alfred/
Tools: read, write, exec
```

**Bärbel 的上下文：**
```
Session: agent:baerbel:whatsapp:group:120363403215116621@g.us  
History: [user message, baerbel's previous responses]
Workspace: /Users/pascal/clawd-baerbel/
Tools: read only
```

## 最佳实践

### 1. 保持 agent 聚焦

为每个 agent 设计单一职责：

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **好：** 每个 agent 只有一个任务  
❌ **差：** 一个通用的“dev-helper”

### 2. 使用描述性名称

让名称清楚表达职责：

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. 配置不同工具权限

只给 agent 必需的工具：

```json
{
  "agents": {
    "reviewer": {
      "tools": { "allow": ["read", "exec"] }  // 只读
    },
    "fixer": {
      "tools": { "allow": ["read", "write", "edit", "exec"] }  // 读写
    }
  }
}
```

### 4. 监控性能

当 agent 很多时：
- 使用默认的 `"strategy": "parallel"` 提升速度
- 将广播组限制在 5–10 个 agent
- 为简单 agent 选择更快模型

### 5. 友好处理失败

agent 独立失败；一个 agent 的错误不会阻塞其他：

```
Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
Result: Agent A and C respond, Agent B logs error
```

## 兼容性

### 提供方

广播组目前支持：
- ✅ WhatsApp（已实现）
- 🚧 Telegram（计划）
- 🚧 Discord（计划）
- 🚧 Slack（计划）

### 路由

广播组可与现有路由并存：

```json
{
  "bindings": [
    { "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } }, "agentId": "alfred" }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A`：仅 alfred 回复（正常路由）
- `GROUP_B`：agent1 与 agent2 同时回复（广播）

**优先级：** `broadcast` 高于 `bindings`。

## 排障

### Agents 未响应

**检查：**
1. `agents.list` 中存在该 agent ID
2. peer ID 格式正确（例如 `120363403215116621@g.us`）
3. agent 未在 deny 列表中

**调试：**
```bash
tail -f ~/.clawdbot/logs/gateway.log | grep broadcast
```

### 仅一个 agent 回复

**原因：** peer ID 可能在 `bindings` 中但不在 `broadcast`。

**修复：** 添加到广播配置或从 bindings 中移除。

### 性能问题

**如果多个 agent 变慢：**
- 减少每组 agent 数量
- 使用更轻模型（sonnet 而非 opus）
- 检查沙箱启动时间

## 示例

### 示例 1：代码审查团队

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": [
      "code-formatter",
      "security-scanner",
      "test-coverage",
      "docs-checker"
    ]
  },
  "agents": {
    "list": [
      { "id": "code-formatter", "workspace": "~/agents/formatter", "tools": { "allow": ["read", "write"] } },
      { "id": "security-scanner", "workspace": "~/agents/security", "tools": { "allow": ["read", "exec"] } },
      { "id": "test-coverage", "workspace": "~/agents/testing", "tools": { "allow": ["read", "exec"] } },
      { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
    ]
  }
}
```

**用户发送：** 代码片段  
**回复：**
- code-formatter: "Fixed indentation and added type hints"
- security-scanner: "⚠️ SQL injection vulnerability in line 12"
- test-coverage: "Coverage is 45%, missing tests for error cases"
- docs-checker: "Missing docstring for function `process_data`"

### 示例 2：多语言支持

```json
{
  "broadcast": {
    "strategy": "sequential",
    "+15555550123": ["detect-language", "translator-en", "translator-de"]
  },
  "agents": {
    "list": [
      { "id": "detect-language", "workspace": "~/agents/lang-detect" },
      { "id": "translator-en", "workspace": "~/agents/translate-en" },
      { "id": "translator-de", "workspace": "~/agents/translate-de" }
    ]
  }
}
```

## API 参考

### 配置 Schema

```typescript
interface MoltbotConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### 字段

- `strategy`（可选）：agent 的处理方式
  - `"parallel"`（默认）：所有 agent 同时处理
  - `"sequential"`：agent 按数组顺序依次处理
  
- `[peerId]`：WhatsApp 群 JID、E.164 号码或其他 peer ID
  - 值：应处理消息的 agent ID 数组

## 限制

1. **最大 agent 数**：无硬限制，但 10+ 可能变慢
2. **共享上下文**：agent 不会看到彼此的回复（设计如此）
3. **消息顺序**：并行回复顺序可能不同
4. **速率限制**：所有 agent 都计入 WhatsApp 速率限制

## 未来增强

计划功能：
- [ ] 共享上下文模式（agent 可见彼此回复）
- [ ] Agent 协作（agent 之间可互相发信号）
- [ ] 动态 agent 选择（根据消息内容选择 agent）
