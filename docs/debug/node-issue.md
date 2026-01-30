---
summary: Node + tsx "__name is not a function" 崩溃说明与绕过方案
read_when:
  - 排查仅 Node 的开发脚本或 watch 模式失败
  - 调查 Moltbot 中 tsx/esbuild loader 崩溃
---

# Node + tsx "__name is not a function" 崩溃

## 概要
通过 Node + `tsx` 运行 Moltbot 时启动失败，报错：

```
[moltbot] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

该问题出现在开发脚本从 Bun 切换到 `tsx` 之后（提交 `2871657e`，2026-01-06）。同一路径在 Bun 下可运行。

## 环境
- Node：v25.x（在 v25.3.0 观察到）
- tsx：4.21.0
- OS：macOS（其它运行 Node 25 的平台可能也可复现）

## 复现（仅 Node）
```bash
# 在仓库根目录
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 仓库最小复现
```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本验证
- Node 25.3.0：失败
- Node 22.22.0（Homebrew `node@22`）：失败
- Node 24：此处未安装，待验证

## 说明与假设
- `tsx` 使用 esbuild 转换 TS/ESM。esbuild 的 `keepNames` 会注入 `__name` helper，并用 `__name(...)` 包裹函数定义。
- 崩溃显示 `__name` 存在但不是函数，说明该 helper 在 Node 25 loader 路径中缺失或被覆盖。
- 其它 esbuild 使用方也曾在 helper 缺失或被重写时出现类似问题。

## 回归历史
- `2871657e`（2026-01-06）：脚本从 Bun 切到 tsx，使 Bun 可选。
- 之前（Bun 路径）`moltbot status` 与 `gateway:watch` 可正常运行。

## 临时绕过
- 使用 Bun 运行开发脚本（当前临时回退）。
- 使用 Node + tsc watch，再运行编译输出：
  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch moltbot.mjs status
  ```
- 本地验证：`pnpm exec tsc -p tsconfig.json` + `node moltbot.mjs status` 在 Node 25 可用。
- 如果可能，禁用 TS loader 的 esbuild keepNames（可避免注入 `__name` helper）；tsx 目前未暴露该配置。
- 用 Node LTS（22/24）+ `tsx` 测试，确认问题是否仅限 Node 25。

## 参考
- https://opennext.js.org/cloudflare/howtos/keep_names
- https://esbuild.github.io/api/#keep-names
- https://github.com/evanw/esbuild/issues/1031

## 下一步
- 在 Node 22/24 复现，确认是否为 Node 25 回归。
- 测试 `tsx` nightly 或锁定到较早版本，确认是否存在已知回归。
- 若在 Node LTS 也可复现，向上游提交最小复现与 `__name` 堆栈。
