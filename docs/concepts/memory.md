---
summary: "Moltbot 记忆的工作原理（工作区文件 + 自动记忆刷新）"
read_when:
  - 您想了解记忆文件布局和工作流程
  - 您想调整自动压缩前记忆刷新
---
# 记忆

Moltbot 记忆是**代理工作区中的纯 Markdown**。文件是真实来源；模型只"记住"写入磁盘的内容。

记忆搜索工具由活动记忆插件提供（默认：`memory-core`）。使用 `plugins.slots.memory = "none"` 禁用记忆插件。

## 记忆文件（Markdown）

默认工作区布局使用两个记忆层：

- `memory/YYYY-MM-DD.md`
  - 每日日志（仅追加）。
  - 会话开始时读取今天 + 昨天。
- `MEMORY.md`（可选）
  - 精选的长期记忆。
  - **仅在主私人会话中加载**（永不在群组上下文中）。

这些文件位于工作区下（`agents.defaults.workspace`，默认 `~/clawd`）。参见 [代理工作区](/concepts/agent-workspace) 获取完整布局。

## 何时写入记忆

- 决策、偏好和持久事实写入 `MEMORY.md`。
- 日常笔记和运行上下文写入 `memory/YYYY-MM-DD.md`。
- 如果有人说"记住这个"，就写下来（不要保存在 RAM 中）。
- 这个领域仍在发展中。提醒模型存储记忆会有帮助；它会知道该怎么做。
- 如果您想让某些内容持久化，**请让机器人将其写入**记忆。

## 自动记忆刷新（压缩前 ping）

当会话**接近自动压缩**时，Moltbot 触发一个**静默代理轮次**，提醒模型在上下文被压缩**之前**写入持久记忆。默认提示明确说明模型*可以回复*，但通常 `NO_REPLY` 是正确的响应，因此用户永远不会看到这个轮次。

这由 `agents.defaults.compaction.memoryFlush` 控制：

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

详情：
- **软阈值**：当会话令牌估计超过 `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- **默认静默**：提示包含 `NO_REPLY`，因此不会发送任何内容。
- **两个提示**：用户提示加上系统提示附加提醒。
- **每压缩周期一次刷新**（在 `sessions.json` 中跟踪）。
- **工作区必须可写**：如果会话以 `workspaceAccess: "ro"` 或 `"none"` 沙箱运行，则跳过刷新。

有关完整压缩生命周期，请参见 [会话管理 + 压缩](/reference/session-management-compaction)。

## 向量记忆搜索

Moltbot 可以在 `MEMORY.md` 和 `memory/*.md`（以及您选择加入的任何额外目录或文件）上构建小型向量索引，以便语义查询可以找到相关笔记，即使措辞不同。

默认值：
- 默认启用。
- 监视记忆文件的更改（防抖）。
- 默认使用远程嵌入。如果未设置 `memorySearch.provider`，Moltbot 自动选择：
  1. 如果配置了 `memorySearch.local.modelPath` 且文件存在，则使用 `local`。
  2. 如果可以解析 OpenAI 密钥，则使用 `openai`。
  3. 如果可以解析 Gemini 密钥，则使用 `gemini`。
  4. 否则记忆搜索保持禁用直到配置。
- 本地模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（可用时）加速 SQLite 内的向量搜索。

远程嵌入**需要**嵌入提供商的 API 密钥。Moltbot 从认证配置文件、`models.providers.*.apiKey` 或环境变量解析密钥。Codex OAuth 仅涵盖聊天/完成，**不**满足记忆搜索的嵌入需求。对于 Gemini，使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。使用自定义 OpenAI 兼容端点时，设置 `memorySearch.remote.apiKey`（和可选的 `memorySearch.remote.headers`）。

### 额外记忆路径

如果您想索引默认工作区布局之外的 Markdown 文件，请添加显式路径：

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

注意：
- 路径可以是绝对路径或工作区相对路径。
- 目录递归扫描 `.md` 文件。
- 仅索引 Markdown 文件。
- 忽略符号链接（文件或目录）。

### Gemini 嵌入（原生）

将提供商设置为 `gemini` 以直接使用 Gemini 嵌入 API：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

注意：
- `remote.baseUrl` 是可选的（默认为 Gemini API 基础 URL）。
- `remote.headers` 允许您在需要时添加额外标头。
- 默认模型：`gemini-embedding-001`。

如果您想使用**自定义 OpenAI 兼容端点**（OpenRouter、vLLM 或代理），可以使用 OpenAI 提供商的 `remote` 配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_OPENAI_COMPAT_API_KEY",
        headers: { "X-Custom-Header": "value" }
      }
    }
  }
}
```

如果您不想设置 API 密钥，请使用 `memorySearch.provider = "local"` 或设置 `memorySearch.fallback = "none"`。

回退：
- `memorySearch.fallback` 可以是 `openai`、`gemini`、`local` 或 `none`。
- 回退提供商仅在主嵌入提供商失败时使用。

批量索引（OpenAI + Gemini）：
- OpenAI 和 Gemini 嵌入默认启用。设置 `agents.defaults.memorySearch.remote.batch.enabled = false` 禁用。
- 默认行为等待批处理完成；如需调整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 控制我们并行提交多少批处理作业（默认：2）。
- 当 `memorySearch.provider = "openai"` 或 `"gemini"` 时应用批处理模式，并使用相应的 API 密钥。
- Gemini 批处理作业使用异步嵌入批处理端点，需要 Gemini Batch API 可用性。

为什么 OpenAI 批处理快速且便宜：
- 对于大型回填，OpenAI 通常是我们支持的最快选项，因为我们可以在单个批处理作业中提交许多嵌入请求，让 OpenAI 异步处理它们。
- OpenAI 为 Batch API 工作负载提供折扣定价，因此大型索引运行通常比同步发送相同请求更便宜。
- 参见 OpenAI Batch API 文档和定价了解详情：
  - https://platform.openai.com/docs/api-reference/batch
  - https://platform.openai.com/pricing

配置示例：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

工具：
- `memory_search` — 返回带有文件 + 行范围的片段。
- `memory_get` — 按路径读取记忆文件内容。

本地模式：
- 设置 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 可选：设置 `agents.defaults.memorySearch.fallback = "none"` 避免远程回退。

### 记忆工具的工作原理

- `memory_search` 语义搜索来自 `MEMORY.md` + `memory/**/*.md` 的 Markdown 块（约 400 令牌目标，80 令牌重叠）。它返回片段文本（上限约 700 字符）、文件路径、行范围、分数、提供商/模型，以及我们是否从本地回退到远程嵌入。不返回完整文件负载。
- `memory_get` 读取特定记忆 Markdown 文件（工作区相对），可选从起始行开始读取 N 行。仅当在 `memorySearch.extraPaths` 中明确列出时，才允许 `MEMORY.md` / `memory/` 之外的路径。
- 仅当代理的 `memorySearch.enabled` 解析为 true 时，两个工具才启用。

### 索引内容（及时机）

- 文件类型：仅 Markdown（`MEMORY.md`、`memory/**/*.md`，以及 `memorySearch.extraPaths` 下的任何 `.md` 文件）。
- 索引存储：每代理 SQLite 位于 `~/.clawdbot/memory/<agentId>.sqlite`（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` 令牌）。
- 新鲜度：监视器在 `MEMORY.md`、`memory/` 和 `memorySearch.extraPaths` 上标记索引为脏（防抖 1.5 秒）。同步在会话开始时、搜索时或按间隔调度并异步运行。会话记录使用增量阈值触发后台同步。
- 重新索引触发器：索引存储嵌入**提供商/模型 + 端点指纹 + 分块参数**。如果其中任何一个更改，Moltbot 自动重置并重新索引整个存储。

### 混合搜索（BM25 + 向量）

启用时，Moltbot 结合：
- **向量相似度**（语义匹配，措辞可以不同）
- **BM25 关键词相关性**（精确令牌如 ID、环境变量、代码符号）

如果您的平台上全文搜索不可用，Moltbot 回退到仅向量搜索。

#### 为什么使用混合？

向量搜索擅长"这意味着同一件事"：
- "Mac Studio 网关主机" vs "运行网关的机器"
- "防抖文件更新" vs "避免每次写入时索引"

但它在精确、高信号令牌上可能较弱：
- ID（`a828e60`、`b3b9895a…`）
- 代码符号（`memorySearch.query.hybrid`）
- 错误字符串（"sqlite-vec unavailable"）

BM25（全文）相反：擅长精确令牌，较弱于释义。
混合搜索是务实的中间地带：**使用两种检索信号**，这样您可以获得"自然语言"查询和"大海捞针"查询的良好结果。

#### 我们如何合并结果（当前设计）

实现草图：

1) 从两侧检索候选池：
- **向量**：按余弦相似度取前 `maxResults * candidateMultiplier`。
- **BM25**：按 FTS5 BM25 排名取前 `maxResults * candidateMultiplier`（越低越好）。

2) 将 BM25 排名转换为 0..1 分数：
- `textScore = 1 / (1 + max(0, bm25Rank))`

3) 按块 id 合并候选并计算加权分数：
- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

注意：
- `vectorWeight` + `textWeight` 在配置解析中规范化为 1.0，因此权重表现为百分比。
- 如果嵌入不可用（或提供商返回零向量），我们仍运行 BM25 并返回关键词匹配。
- 如果无法创建 FTS5，我们保持仅向量搜索（无硬失败）。

这不是"IR 理论完美"，但它简单、快速，并且倾向于提高真实笔记的召回率/精确度。
如果我们以后想更花哨，常见的下一步是倒数排名融合（RRF）或分数规范化（最小/最大或 z 分数）然后混合。

配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4
        }
      }
    }
  }
}
```

### 嵌入缓存

Moltbot 可以在 SQLite 中缓存**块嵌入**，这样重新索引和频繁更新（特别是会话记录）不会重新嵌入未更改的文本。

配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### 会话记忆搜索（实验性）

您可以选择索引**会话记录**并通过 `memory_search` 显示它们。
这在实验性标志后面。

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

注意：
- 会话索引是**选择加入**的（默认关闭）。
- 会话更新被防抖并在超过增量阈值后**异步索引**（尽力而为）。
- `memory_search` 永不阻塞索引；结果可能略微过时，直到后台同步完成。
- 结果仍仅包含片段；`memory_get` 仍限于记忆文件。
- 会话索引按代理隔离（仅索引该代理的会话日志）。
- 会话日志存储在磁盘上（`~/.clawdbot/agents/<agentId>/sessions/*.jsonl`）。任何具有文件系统访问权限的进程/用户都可以读取它们，因此将磁盘访问视为信任边界。对于更严格的隔离，在单独的 OS 用户或主机下运行代理。

增量阈值（显示默认值）：

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // ~100 KB
          deltaMessages: 50     // JSONL 行
        }
      }
    }
  }
}
```

### SQLite 向量加速（sqlite-vec）

当 sqlite-vec 扩展可用时，Moltbot 将嵌入存储在 SQLite 虚拟表（`vec0`）中，并在数据库中执行向量距离查询。这使搜索保持快速，而无需将每个嵌入加载到 JS 中。

配置（可选）：

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/path/to/sqlite-vec"
        }
      }
    }
  }
}
```

注意：
- `enabled` 默认为 true；禁用时，搜索回退到存储嵌入上的进程内余弦相似度。
- 如果 sqlite-vec 扩展缺失或加载失败，Moltbot 记录错误并继续使用 JS 回退（无向量表）。
- `extensionPath` 覆盖捆绑的 sqlite-vec 路径（对自定义构建或非标准安装位置有用）。

### 本地嵌入自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 解析 `modelPath`；如果 GGUF 缺失，它会**自动下载**到缓存（或 `local.modelCacheDir` 如果设置），然后加载它。下载在重试时恢复。
- 原生构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，然后 `pnpm rebuild node-llama-cpp`。
- 回退：如果本地设置失败且 `memorySearch.fallback = "openai"`，我们自动切换到远程嵌入（`openai/text-embedding-3-small` 除非覆盖）并记录原因。

### 自定义 OpenAI 兼容端点示例

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_REMOTE_API_KEY",
        headers: {
          "X-Organization": "org-id",
          "X-Project": "project-id"
        }
      }
    }
  }
}
```

注意：
- `remote.*` 优先于 `models.providers.openai.*`。
- `remote.headers` 与 OpenAI 标头合并；键冲突时 remote 获胜。省略 `remote.headers` 使用 OpenAI 默认值。
