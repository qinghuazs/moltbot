---
summary: "浏览器自动化的手动登录 + X/Twitter 发帖"
read_when:
  - 需要为浏览器自动化登录站点
  - 想在 X/Twitter 发布更新
---

# 浏览器登录 + X/Twitter 发帖

## 手动登录（推荐）

当站点需要登录时，请在**宿主**浏览器 profile（clawd 浏览器）中**手动登录**。

不要把账号密码交给模型。自动化登录常触发反爬并可能锁号。

返回主浏览器文档：[Browser](/tools/browser)。

## 使用哪个 Chrome profile？

Moltbot 控制一个**专用 Chrome profile**（名为 `clawd`，UI 带橙色）。它与日常浏览器 profile 隔离。

两种简单进入方式：

1) **让 agent 打开浏览器**，然后你手动登录。
2) **用 CLI 打开**：

```bash
moltbot browser start
moltbot browser open https://x.com
```

若有多个 profile，传入 `--browser-profile <name>`（默认 `clawd`）。

## X/Twitter：推荐流程

- **阅读/搜索/线程**：用 **bird** CLI skill（无需浏览器，稳定）。
  - Repo：<https://github.com/steipete/bird>
- **发布更新**：使用**宿主**浏览器（手动登录）。

## 沙箱与宿主浏览器访问

沙箱浏览器会**更容易**触发反爬检测。X/Twitter 等严格站点建议使用**宿主**浏览器。

若 agent 在沙箱中，browser 工具默认指向沙箱。要允许宿主控制：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true
        }
      }
    }
  }
}
```

然后将浏览器指向宿主：

```bash
moltbot browser open https://x.com --browser-profile clawd --target host
```

或对发布更新的 agent 直接关闭沙箱。
