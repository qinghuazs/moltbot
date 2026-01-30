---
summary: "SOUL Evil hook（用 SOUL_EVIL.md 替换注入的 SOUL.md）"
read_when:
  - 想启用或调整 SOUL Evil hook
  - 想设置清洗窗口或随机切换人格
---

# SOUL Evil Hook

SOUL Evil hook 会在清洗窗口或随机概率下，把**注入**的 `SOUL.md` 内容替换为 `SOUL_EVIL.md`。它**不会**修改磁盘上的文件。

## 工作方式

当 `agent:bootstrap` 运行时，该 hook 可以在系统提示词组装前替换内存中的 `SOUL.md` 内容。如果 `SOUL_EVIL.md` 缺失或为空，Moltbot 会记录警告并继续使用正常 `SOUL.md`。

子代理运行不会在 bootstrap 中包含 `SOUL.md`，因此该 hook 对子代理无效。

## 启用

```bash
moltbot hooks enable soul-evil
```

然后设置配置：

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

在代理工作区根目录创建 `SOUL_EVIL.md`（与 `SOUL.md` 同级）。

## 选项

- `file`（string）：替代 SOUL 文件名（默认：`SOUL_EVIL.md`）
- `chance`（number 0–1）：每次运行随机使用 `SOUL_EVIL.md` 的概率
- `purge.at`（HH:mm）：每日清洗开始时间（24 小时制）
- `purge.duration`（duration）：清洗窗口时长（如 `30s`、`10m`、`1h`）

**优先级：**清洗窗口优先于随机概率。

**时区：**优先使用 `agents.defaults.userTimezone`，否则使用宿主机时区。

## 说明

- 不会在磁盘上写入或修改任何文件。
- 若 `SOUL.md` 不在 bootstrap 列表中，hook 不生效。

## 另见

- [Hooks](/hooks)
