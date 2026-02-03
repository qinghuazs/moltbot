---
name: food-order
description: 使用 ordercli 重新订购 Foodora 订单 + 跟踪 ETA/状态。未经用户明确批准绝不确认。触发词：订餐、重新订购、跟踪 ETA。
homepage: https://ordercli.sh
metadata: {"moltbot":{"emoji":"🥡","requires":{"bins":["ordercli"]},"install":[{"id":"go","kind":"go","module":"github.com/steipete/ordercli/cmd/ordercli@latest","bins":["ordercli"],"label":"Install ordercli (go)"}]}}
---

# 订餐（通过 ordercli 使用 Foodora）

目标：安全地重新订购之前的 Foodora 订单（先预览；仅在用户明确说"是/确认/下单"时才确认）。

硬性安全规则
- 除非用户明确确认下单，否则绝不运行 `ordercli foodora reorder ... --confirm`。
- 优先使用仅预览步骤；展示将要发生的事情；请求确认。
- 如果用户不确定：停在预览阶段并提问。

设置（一次性）
- 国家：`ordercli foodora countries` → `ordercli foodora config set --country AT`
- 登录（密码）：`ordercli foodora login --email you@example.com --password-stdin`
- 登录（无密码，推荐）：`ordercli foodora session chrome --url https://www.foodora.at/ --profile "Default"`

查找要重新订购的内容
- 最近列表：`ordercli foodora history --limit 10`
- 详情：`ordercli foodora history show <orderCode>`
- 如需（机器可读）：`ordercli foodora history show <orderCode> --json`

预览重新订购（不更改购物车）
- `ordercli foodora reorder <orderCode>`

下单重新订购（更改购物车；需要明确确认）
- 先确认，然后运行：`ordercli foodora reorder <orderCode> --confirm`
- 多个地址？询问用户正确的 `--address-id`（从他们的 Foodora 账户/之前的订单数据获取）并运行：
  - `ordercli foodora reorder <orderCode> --confirm --address-id <id>`

跟踪订单
- ETA/状态（活动列表）：`ordercli foodora orders`
- 实时更新：`ordercli foodora orders --watch`
- 单个订单详情：`ordercli foodora order <orderCode>`

调试/安全测试
- 使用临时配置：`ordercli --config /tmp/ordercli.json ...`
