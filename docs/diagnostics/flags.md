---
summary: "用于定向调试日志的诊断标志"
read_when:
  - 需要定向调试日志但不想全局提高日志级别
  - 需要为支持收集特定子系统日志
---
# 诊断标志

诊断标志允许你开启定向调试日志，而无需在所有地方启用 verbose 日志。标志是可选的，只有子系统显式检查时才会生效。

## 工作方式

- 标志是字符串（不区分大小写）。
- 可通过配置或环境变量覆盖启用。
- 支持通配符：
  - `telegram.*` 匹配 `telegram.http`
  - `*` 启用所有标志

## 通过配置启用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多个标志：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

修改后请重启 gateway。

## 环境变量覆盖（一次性）

```bash
CLAWDBOT_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用所有标志：

```bash
CLAWDBOT_DIAGNOSTICS=0
```

## 日志位置

标志会将日志写入标准诊断日志文件。默认路径：

```
/tmp/moltbot/moltbot-YYYY-MM-DD.log
```

如果设置了 `logging.file`，则使用该路径。日志为 JSONL（每行一个 JSON 对象）。脱敏仍受 `logging.redactSensitive` 控制。

## 提取日志

选择最新日志文件：

```bash
ls -t /tmp/moltbot/moltbot-*.log | head -n 1
```

过滤 Telegram HTTP 诊断：

```bash
rg "telegram http error" /tmp/moltbot/moltbot-*.log
```

或在复现时跟随：

```bash
tail -f /tmp/moltbot/moltbot-$(date +%F).log | rg "telegram http error"
```

对于远程 gateway，也可使用 `moltbot logs --follow`（见 [/cli/logs](/cli/logs)）。

## 说明

- 若 `logging.level` 高于 `warn`，这些日志可能被抑制。默认 `info` 没问题。
- 标志可以长期开启；只影响特定子系统的日志量。
- 通过 [/logging](/logging) 调整日志目的地、级别与脱敏。
