---
summary: "相机采集（iOS 节点 + macOS 应用）：照片（jpg）与短视频片段（mp4）"
read_when:
  - 添加或修改 iOS 节点或 macOS 的相机采集
  - 扩展 agent 可访问的 MEDIA 临时文件工作流
---

# 相机采集（agent）

Moltbot 支持 **相机采集** 用于 agent 工作流：

- **iOS 节点**（通过 Gateway 配对）：通过 `node.invoke` 捕获**照片**（`jpg`）或**短视频片段**（`mp4`，可选音频）。
- **Android 节点**（通过 Gateway 配对）：通过 `node.invoke` 捕获**照片**（`jpg`）或**短视频片段**（`mp4`，可选音频）。
- **macOS 应用**（通过 Gateway 作为节点）：通过 `node.invoke` 捕获**照片**（`jpg`）或**短视频片段**（`mp4`，可选音频）。

所有相机访问都受**用户设置**控制。

## iOS 节点

### 用户设置（默认开启）

- iOS 设置页 → **Camera** → **Allow Camera**（`camera.enabled`）
  - 默认：**开**（缺省键视为启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 返回 payload：
    - `devices`：`{ id, name, position, deviceType }` 数组

- `camera.snap`
  - 参数：
    - `facing`：`front|back`（默认 `front`）
    - `maxWidth`：number（可选；iOS 节点默认 `1600`）
    - `quality`：`0..1`（可选；默认 `0.9`）
    - `format`：目前为 `jpg`
    - `delayMs`：number（可选；默认 `0`）
    - `deviceId`：string（可选；来自 `camera.list`）
  - 返回 payload：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`、`height`
  - 载荷保护：照片会被重新压缩，以保证 base64 载荷低于 5 MB。

- `camera.clip`
  - 参数：
    - `facing`：`front|back`（默认 `front`）
    - `durationMs`：number（默认 `3000`，上限 `60000`）
    - `includeAudio`：boolean（默认 `true`）
    - `format`：目前为 `mp4`
    - `deviceId`：string（可选；来自 `camera.list`）
  - 返回 payload：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 一样，iOS 节点只允许在**前台**执行 `camera.*`。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI helper（临时文件 + MEDIA）

最简单的附件方式是 CLI helper，它会把解码媒体写入临时文件并打印 `MEDIA:<path>`。

示例：

```bash
moltbot nodes camera snap --node <id>               # 默认：前后摄各一张（2 条 MEDIA）
moltbot nodes camera snap --node <id> --facing front
moltbot nodes camera clip --node <id> --duration 3000
moltbot nodes camera clip --node <id> --no-audio
```

说明：
- `nodes camera snap` 默认使用**前后双摄**，给 agent 两个视角。
- 输出文件是临时文件（系统临时目录），除非你自行封装。

## Android 节点

### 用户设置（默认开启）

- Android 设置页 → **Camera** → **Allow Camera**（`camera.enabled`）
  - 默认：**开**（缺省键视为启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - `CAMERA` 用于 `camera.snap` 与 `camera.clip`。
  - `RECORD_AUDIO` 用于 `camera.clip` 且 `includeAudio=true`。

如果权限缺失，应用会在可能时提示；若被拒绝，`camera.*` 请求会以 `*_PERMISSION_REQUIRED` 失败。

### 前台要求

与 `canvas.*` 一样，Android 节点只允许在**前台**执行 `camera.*`。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### 载荷保护

照片会被重新压缩，以保证 base64 载荷低于 5 MB。

## macOS 应用

### 用户设置（默认关闭）

macOS 伴侣应用提供一个复选框：

- **Settings → General → Allow Camera**（`moltbot.cameraEnabled`）
  - 默认：**关**
  - 关闭时：相机请求返回 “Camera disabled by user”。

### CLI helper（node invoke）

使用主 `moltbot` CLI 调用 macOS 节点的相机命令。

示例：

```bash
moltbot nodes camera list --node <id>            # 列出相机 id
moltbot nodes camera snap --node <id>            # 打印 MEDIA:<path>
moltbot nodes camera snap --node <id> --max-width 1280
moltbot nodes camera snap --node <id> --delay-ms 2000
moltbot nodes camera snap --node <id> --device-id <id>
moltbot nodes camera clip --node <id> --duration 10s          # 打印 MEDIA:<path>
moltbot nodes camera clip --node <id> --duration-ms 3000      # 打印 MEDIA:<path>（旧参数）
moltbot nodes camera clip --node <id> --device-id <id>
moltbot nodes camera clip --node <id> --no-audio
```

说明：
- `moltbot nodes camera snap` 默认 `maxWidth=1600`，除非覆盖。
- 在 macOS 上，`camera.snap` 会在曝光预热后等待 `delayMs`（默认 2000ms）再拍摄。
- 照片载荷会重新压缩，以保证 base64 低于 5 MB。

## 安全与实际限制

- 相机与麦克风访问会触发系统权限提示（并需要 Info.plist 中的使用说明）。
- 视频片段长度受限（当前 `<= 60s`），避免节点载荷过大（base64 开销 + 消息限制）。

## macOS 屏幕视频（系统级）

对于*屏幕*视频（非相机），使用 macOS 伴侣：

```bash
moltbot nodes screen record --node <id> --duration 10s --fps 15   # 打印 MEDIA:<path>
```

说明：
- 需要 macOS **屏幕录制**权限（TCC）。
