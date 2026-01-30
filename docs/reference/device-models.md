---
summary: "macOS 应用中 Apple 设备型号标识的友好名称映射"
read_when:
  - 更新设备型号映射或 NOTICE/许可证文件
  - 修改 Instances UI 的设备名称显示
---

# 设备型号数据库（友好名称）

macOS 配套应用会在 **Instances** UI 中展示友好的 Apple 设备型号名称，通过将 Apple 设备型号标识（例如 `iPad16,6`、`Mac16,6`）映射到人类可读名称实现。

映射以 JSON 形式内置于：

- `apps/macos/Sources/Moltbot/Resources/DeviceModels/`

## 数据来源

目前我们从 MIT 许可的仓库内置映射：

- `kyle-seongwoo-jun/apple-device-identifiers`

为确保构建可复现，JSON 文件固定到特定上游提交（记录在 `apps/macos/Sources/Moltbot/Resources/DeviceModels/NOTICE.md`）。

## 更新数据库

1. 选择要固定的上游提交（iOS 一个，macOS 一个）。
2. 更新 `apps/macos/Sources/Moltbot/Resources/DeviceModels/NOTICE.md` 中的提交哈希。
3. 重新下载 JSON 文件并固定到这些提交：

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/Moltbot/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/Moltbot/Resources/DeviceModels/mac-device-identifiers.json
```

4. 确保 `apps/macos/Sources/Moltbot/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` 仍与上游一致（如上游许可证有变更请替换）。
5. 验证 macOS 应用可正常构建（无警告）：

```bash
swift build --package-path apps/macos
```
