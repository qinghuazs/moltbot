---
name: video-frames
description: 使用 ffmpeg 从视频中提取帧或短片段。
homepage: https://ffmpeg.org
metadata: {"moltbot":{"emoji":"🎞️","requires":{"bins":["ffmpeg"]},"install":[{"id":"brew","kind":"brew","formula":"ffmpeg","bins":["ffmpeg"],"label":"Install ffmpeg (brew)"}]}}
---

# 视频帧（ffmpeg）

从视频中提取单帧，或创建快速缩略图以供检查。

## 快速开始

第一帧：

```bash
{baseDir}/scripts/frame.sh /path/to/video.mp4 --out /tmp/frame.jpg
```

在指定时间戳：

```bash
{baseDir}/scripts/frame.sh /path/to/video.mp4 --time 00:00:10 --out /tmp/frame-10s.jpg
```

## 注意

- 对于"这里发生了什么？"优先使用 `--time`。
- 使用 `.jpg` 快速分享；使用 `.png` 获得清晰的 UI 帧。
