---
summary: "Moltbot 日志：滚动诊断文件日志 + 统一日志隐私标记"
read_when:
  - 收集 macOS 日志或调查隐私数据日志
  - 调试语音唤醒 会话生命周期问题
---
# 日志（macOS）

## 滚动诊断文件日志（Debug 面板）
Moltbot 通过 swift-log 记录 macOS 应用日志（默认统一日志），并可在需要持久化捕获时写入本地滚动文件日志。

- 详细度：**Debug 面板 → Logs → App logging → Verbosity**
- 启用：**Debug 面板 → Logs → App logging → “Write rolling diagnostics log (JSONL)”**
- 路径：`~/Library/Logs/Moltbot/diagnostics.jsonl`（自动轮转；旧文件后缀 `.1`、`.2` 等）
- 清空：**Debug 面板 → Logs → App logging → “Clear”**

说明：
- 默认**关闭**。仅在主动调试时开启。
- 文件包含敏感信息；分享前请审查。

## macOS 统一日志的私密数据

统一日志默认会对大多数 payload 进行脱敏，除非子系统显式开启 `privacy -off`。根据 Peter 关于 macOS [logging privacy shenanigans](https://steipete.me/posts/2025/logging-privacy-shenanigans)（2025）的说明，该行为由 `/Library/Preferences/Logging/Subsystems/` 下的 plist 控制，按子系统名生效。仅新日志会读取该标记，因此请在复现问题前开启。

## 为 Moltbot（`bot.molt`）启用
- 先写入临时 plist，再以 root 原子安装：

```bash
cat <<'EOF' >/tmp/bot.molt.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/bot.molt.plist /Library/Preferences/Logging/Subsystems/bot.molt.plist
```

- 无需重启；logd 会很快识别该文件，但只有新日志行会包含私密 payload。
- 使用现有工具查看更丰富输出，例如 `./scripts/clawlog.sh --category WebChat --last 5m`。

## 调试后关闭
- 删除覆盖：`sudo rm /Library/Preferences/Logging/Subsystems/bot.molt.plist`。
- 可选：运行 `sudo log config --reload` 让 logd 立即移除覆盖。
- 该输出可能包含手机号和消息内容；仅在确实需要时保留该 plist。
