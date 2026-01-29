---
summary: "在同一主机上运行多个 Moltbot Gateway（隔离、端口与 profile）"
read_when:
  - 在同一台机器上运行多个 Gateway
  - 需要为每个 Gateway 隔离配置/状态/端口
---
# 多个 Gateway（同一主机）

多数场景应使用一个 Gateway，因为单一 Gateway 可处理多个消息连接与多个 agent。若需要更强隔离或冗余（如救援机器人），请运行分离的 Gateway，并隔离 profile/端口。

## 隔离清单（必需）
- `CLAWDBOT_CONFIG_PATH` — 每实例独立配置文件
- `CLAWDBOT_STATE_DIR` — 每实例独立会话/凭据/缓存
- `agents.defaults.workspace` — 每实例独立工作区根目录
- `gateway.port`（或 `--port`）— 每实例唯一
- 派生端口（browser/canvas）不得重叠

若这些共享，会出现配置竞争与端口冲突。

## 推荐：profile（`--profile`）

profile 会自动作用域 `CLAWDBOT_STATE_DIR` + `CLAWDBOT_CONFIG_PATH` 并为服务名加后缀。

```bash
# main
moltbot --profile main setup
moltbot --profile main gateway --port 18789

# rescue
moltbot --profile rescue setup
moltbot --profile rescue gateway --port 19001
```

按 profile 安装服务：
```bash
moltbot --profile main gateway install
moltbot --profile rescue gateway install
```

## 救援机器人指南

在同一主机上运行第二个 Gateway，并为其设置：
- profile/配置
- 状态目录
- 工作区
- 基础端口（及派生端口）

这样可以把救援机器人与主机器人隔离，便于在主机器人宕机时进行排障或应用配置变更。

端口间隔：基础端口至少相差 20，以避免 browser/canvas/CDP 派生端口碰撞。

### 安装方式（救援机器人）

```bash
# 主机器人（已有或全新，且不带 --profile）
# 运行在 18789 + Chrome CDC/Canvas/... 端口
moltbot onboard
moltbot gateway install

# 救援机器人（隔离 profile + 端口）
moltbot --profile rescue onboard
# 说明：
# - 默认会给 workspace 名追加 -rescue 后缀
# - 端口至少选 18789 + 20，
#   更好是选完全不同的基础端口，如 19789
# - 其余流程与正常 onboarding 相同

# 安装服务（若 onboarding 未自动完成）
moltbot --profile rescue gateway install
```

## 端口映射（派生）

基础端口 = `gateway.port`（或 `CLAWDBOT_GATEWAY_PORT` / `--port`）。

- 浏览器控制服务端口 = 基础 + 2（仅 loopback）
- `canvasHost.port = 基础 + 4`
- 浏览器 profile 的 CDP 端口自动分配自 `browser.controlPort + 9 .. + 108`

若你在配置或环境中覆盖这些端口，必须确保每实例唯一。

## Browser/CDP 注意事项（常见坑）

- **不要** 在多个实例上将 `browser.cdpUrl` 固定到相同值。
- 每个实例都需要独立的浏览器控制端口与 CDP 范围（由 gateway 端口派生）。
- 若需显式 CDP 端口，请在每个实例设置 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：使用 `browser.profiles.<name>.cdpUrl`（按 profile、按实例）。

## 手动 env 示例

```bash
CLAWDBOT_CONFIG_PATH=~/.clawdbot/main.json \
CLAWDBOT_STATE_DIR=~/.clawdbot-main \
moltbot gateway --port 18789

CLAWDBOT_CONFIG_PATH=~/.clawdbot/rescue.json \
CLAWDBOT_STATE_DIR=~/.clawdbot-rescue \
moltbot gateway --port 19001
```

## 快速检查

```bash
moltbot --profile main status
moltbot --profile rescue status
moltbot --profile rescue browser status
```
