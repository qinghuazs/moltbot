---
name: songsee
description: 使用 songsee CLI 从音频生成频谱图和特征面板可视化。
homepage: https://github.com/steipete/songsee
metadata: {"moltbot":{"emoji":"🌊","requires":{"bins":["songsee"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/songsee","bins":["songsee"],"label":"Install songsee (brew)"}]}}
---

# songsee

从音频生成频谱图 + 特征面板。

快速开始
- 频谱图：`songsee track.mp3`
- 多面板：`songsee track.mp3 --viz spectrogram,mel,chroma,hpss,selfsim,loudness,tempogram,mfcc,flux`
- 时间切片：`songsee track.mp3 --start 12.5 --duration 8 -o slice.jpg`
- Stdin：`cat track.mp3 | songsee - --format png -o out.png`

常用标志
- `--viz` 列表（可重复或逗号分隔）
- `--style` 调色板（classic、magma、inferno、viridis、gray）
- `--width` / `--height` 输出尺寸
- `--window` / `--hop` FFT 设置
- `--min-freq` / `--max-freq` 频率范围
- `--start` / `--duration` 时间切片
- `--format` jpg|png

注意
- WAV/MP3 原生解码；其他格式使用 ffmpeg（如果可用）。
- 多个 `--viz` 渲染为网格。
