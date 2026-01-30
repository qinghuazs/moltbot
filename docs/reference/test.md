---
summary: "本地测试运行方式（vitest）以及何时使用 force 或 coverage"
read_when:
  - 运行或修复测试
---
# Tests

- 完整测试套件（测试集、live、Docker）：[Testing](/testing)

- `pnpm test:force`：杀掉占用默认控制端口的残留 gateway 进程，然后以隔离端口运行完整 Vitest 套件，避免服务测试与运行中的实例冲突。当前一次 gateway 占用了 18789 时使用。
- `pnpm test:coverage`：运行 Vitest + V8 覆盖率。全局阈值为 lines/branches/functions/statements 70%。覆盖率排除集成重、不可单测的入口（CLI wiring、gateway/telegram bridge、webchat 静态服务），保证目标聚焦于单测逻辑。
- `pnpm test:e2e`：运行 gateway 端到端冒烟测试（多实例 WS/HTTP/node 配对）。
- `pnpm test:live`：运行 provider live 测试（minimax/zai）。需要 API key 且设置 `LIVE=1`（或 provider 专用 `*_LIVE_TEST=1`）。

## 模型延迟基准（本地 key）

脚本：[`scripts/bench-model.ts`](https://github.com/moltbot/moltbot/blob/main/scripts/bench-model.ts)

用法：
- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可选环境变量：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 默认提示词：“Reply with a single word: ok. No punctuation or extra text.”

上次运行（2025-12-31，20 次）：
- minimax 中位数 1279ms（最小 1114，最大 2431）
- opus 中位数 2454ms（最小 1224，最大 3170）

## 引导 E2E（Docker）

Docker 可选；仅用于容器化引导冒烟测试。

在干净 Linux 容器中执行完整冷启动流程：

```bash
scripts/e2e/onboard-docker.sh
```

该脚本通过伪 TTY 驱动交互向导，校验配置、工作区与会话文件，然后启动 gateway 并运行 `moltbot health`。

## QR 导入冒烟（Docker）

确保 `qrcode-terminal` 在 Docker 中可在 Node 22+ 加载：

```bash
pnpm test:docker:qr
```
