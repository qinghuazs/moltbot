---
summary: "`moltbot cron` CLI 参考（调度和运行后台任务）"
read_when:
  - 您想要调度任务和唤醒
  - 您正在调试 cron 执行和日志
---

# `moltbot cron`

管理网关调度器的 cron 任务。

相关：
- Cron 任务：[Cron 任务](/automation/cron-jobs)

提示：运行 `moltbot cron --help` 查看完整的命令界面。

## 常用编辑

更新投递设置而不更改消息：

```bash
moltbot cron edit <job-id> --deliver --channel telegram --to "123456789"
```

为单独的任务禁用投递：

```bash
moltbot cron edit <job-id> --no-deliver
```
