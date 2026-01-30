---
summary: "`moltbot configure` 的 CLI 参考（交互式配置提示）"
read_when:
  - 想以交互方式调整凭据、设备或代理默认值
---

# `moltbot configure`

通过交互提示设置凭据、设备与代理默认值。

说明：**Model** 区域现在包含 `agents.defaults.models` 允许列表的多选（显示在 `/model` 与模型选择器中）。

提示：不带子命令的 `moltbot config` 会打开相同向导。非交互修改请用
`moltbot config get|set|unset`。

相关：
- Gateway 配置参考：[Configuration](/gateway/configuration)
- Config CLI：[Config](/cli/config)

备注：
- 选择 Gateway 运行位置会始终更新 `gateway.mode`。如果只需要这一项，可直接选择“Continue”。
- 面向渠道的服务（Slack/Discord/Matrix/Microsoft Teams）在设置时会提示渠道或房间允许列表。可以输入名称或 ID，向导会在可能时解析名称为 ID。

## 示例

```bash
moltbot configure
moltbot configure --section models --section channels
```
