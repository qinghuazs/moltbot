---
summary: "节点位置命令（location.get）、权限模式与后台行为"
read_when:
  - 添加位置节点支持或权限 UI
  - 设计后台定位与推送流程
---

# 位置命令（节点）

## 简要说明
- `location.get` 是节点命令（通过 `node.invoke`）。
- 默认关闭。
- 设置使用选择器：Off / While Using / Always。
- 单独开关：Precise Location。

## 为什么是选择器（而不是开关）

系统权限是多级的。应用可暴露选择器，但最终权限由操作系统决定。
- iOS/macOS：用户可在系统提示/设置里选择 **While Using** 或 **Always**。应用可请求升级，但 OS 可能要求跳转设置。
- Android：后台定位是单独权限；Android 10+ 常需要进入设置流程。
- 精确定位是独立授权（iOS 14+ “Precise”，Android “fine” 与 “coarse”）。

UI 的选择器决定我们请求的模式；实际授权由系统设置决定。

## 设置模型

按节点设备：
- `location.enabledMode`: `off | whileUsing | always`
- `location.preciseEnabled`: bool

UI 行为：
- 选择 `whileUsing` 请求前台权限。
- 选择 `always` 时先确保 `whileUsing`，再请求后台权限（必要时引导到设置）。
- 若 OS 拒绝所需级别，回退到最高已授权级别并显示状态。

## 权限映射（node.permissions）

可选。macOS 节点在权限映射中上报 `location`；iOS/Android 可能省略。

## 命令：`location.get`

通过 `node.invoke` 调用。

参数（建议）：
```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

响应 payload：
```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

错误码（稳定）：
- `LOCATION_DISABLED`：选择器关闭。
- `LOCATION_PERMISSION_REQUIRED`：缺少所需模式权限。
- `LOCATION_BACKGROUND_UNAVAILABLE`：应用在后台但仅允许 While Using。
- `LOCATION_TIMEOUT`：超时未定位。
- `LOCATION_UNAVAILABLE`：系统失败或无定位来源。

## 后台行为（未来）

目标：模型可在节点后台时请求位置，但需满足：
- 用户选择 **Always**。
- OS 授予后台定位。
- 应用允许后台定位（iOS 后台模式 / Android 前台服务或特殊许可）。

推送触发流程（未来）：
1) Gateway 向节点发送推送（静默推送或 FCM data）。
2) 节点短暂唤醒并向设备请求位置。
3) 节点将 payload 转发给 Gateway。

说明：
- iOS：需要 Always 权限 + 后台定位模式。静默推送可能被限流，预期偶发失败。
- Android：后台定位可能需要前台服务，否则容易被拒绝。

## 模型/工具集成
- 工具面：`nodes` 工具提供 `location_get` 动作（需要节点）。
- CLI：`moltbot nodes location get --node <id>`。
- Agent 指南：仅在用户启用定位并理解范围时调用。

## UX 文案（建议）
- Off：“位置共享已关闭。”
- While Using：“仅在 Moltbot 打开时。”
- Always：“允许后台定位。需要系统权限。”
- Precise：“使用精确 GPS 定位。关闭后仅分享粗略位置。”
