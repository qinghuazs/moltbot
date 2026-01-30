---
summary: "macOS 权限持久化（TCC）与签名要求"
read_when:
  - 调试缺失或卡住的 macOS 权限提示
  - 打包或签名 macOS 应用
  - 修改 bundle ID 或应用安装路径
---
# macOS 权限（TCC）

macOS 权限授权很脆弱。TCC 会把授权与应用的代码签名、bundle 标识和磁盘路径绑定。任何一项变化，macOS 会把应用视为新应用，可能丢失授权或隐藏提示。

## 稳定权限的要求
- 固定路径：从固定位置运行应用（Moltbot 为 `dist/Moltbot.app`）。
- 固定 bundle ID：修改 bundle ID 会创建新的权限身份。
- 已签名应用：未签名或 ad-hoc 签名不会持久化权限。
- 稳定签名：使用真实的 Apple Development 或 Developer ID 证书，保证重建签名一致。

ad-hoc 签名每次构建都会生成新身份。macOS 会忘记旧授权，且提示可能彻底消失，直到清理旧条目。

## 提示消失时的恢复清单
1. 退出应用。
2. 在 System Settings → Privacy & Security 删除应用条目。
3. 从同一路径重新打开并重新授权。
4. 若仍无提示，使用 `tccutil` 重置 TCC 条目后再试。
5. 部分权限仅在重启 macOS 后重新出现。

重置示例（根据需要替换 bundle ID）：

```bash
sudo tccutil reset Accessibility bot.molt.mac
sudo tccutil reset ScreenCapture bot.molt.mac
sudo tccutil reset AppleEvents
```

如果你在测试权限，请始终使用真实证书签名。ad-hoc 构建仅适用于快速本地运行且不关心权限的场景。
