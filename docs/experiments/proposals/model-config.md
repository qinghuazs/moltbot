---
summary: "探索：模型配置、认证配置与回退行为"
read_when:
  - 探索未来的模型选择与认证配置方案
---
# Model Config（探索）

本文记录未来模型配置的**想法**，不是已发布规范。当前行为请见：
- [Models](/concepts/models)
- [Model failover](/concepts/model-failover)
- [OAuth + profiles](/concepts/oauth)

## 动机

运营者希望：
- 每个 provider 支持多个认证配置（个人与工作）。
- 简洁的 `/model` 选择与可预测的回退。
- 清晰区分文本模型与支持图像的模型。

## 可能方向（高层）

- 保持模型选择简单：`provider/model`，可选别名。
- 允许 provider 拥有多个认证配置，并显式排序。
- 使用全局回退列表，确保所有会话一致回退。
- 仅在明确配置时才覆盖图像路由。

## 未决问题

- 配置轮换是按 provider 还是按 model？
- UI 应如何呈现会话的认证配置选择？
- 从旧配置键迁移的最安全路径是什么？
