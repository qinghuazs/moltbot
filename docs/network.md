---
summary: "网络枢纽：网关接口、配对、发现与安全"
read_when:
  - 需要网络架构与安全概览
  - 排查本地 vs tailnet 访问或配对问题
  - 获取网络相关文档的权威列表
---
# 网络枢纽

本枢纽链接 Moltbot 在 localhost、LAN 与 tailnet 上连接、配对与安全的核心文档。

## 核心模型

- [Gateway architecture](/concepts/architecture)
- [Gateway protocol](/gateway/protocol)
- [Gateway runbook](/gateway)
- [Web surfaces + bind modes](/web)

## 配对与身份

- [Pairing overview（DM + 节点）](/start/pairing)
- [Gateway-owned node pairing](/gateway/pairing)
- [Devices CLI（配对 + token 轮换）](/cli/devices)
- [Pairing CLI（DM 审批）](/cli/pairing)

本地信任：
- 本地连接（loopback 或网关主机自身 tailnet 地址）可自动批准配对，保证同机体验流畅。
- 非本地 tailnet/LAN 客户端仍需要显式配对审批。

## 发现与传输

- [Discovery & transports](/gateway/discovery)
- [Bonjour / mDNS](/gateway/bonjour)
- [Remote access（SSH）](/gateway/remote)
- [Tailscale](/gateway/tailscale)

## 节点与传输

- [Nodes overview](/nodes)
- [Bridge protocol（遗留节点）](/gateway/bridge-protocol)
- [Node runbook: iOS](/platforms/ios)
- [Node runbook: Android](/platforms/android)

## 安全

- [Security overview](/gateway/security)
- [Gateway config reference](/gateway/configuration)
- [Troubleshooting](/gateway/troubleshooting)
- [Doctor](/gateway/doctor)
