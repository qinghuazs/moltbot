---
summary: "Bun 工作流（实验性）：安装与相对 pnpm 的注意事项"
read_when:
  - 你想要最快的本地开发循环（bun + watch）
  - 你遇到 Bun 安装、补丁或生命周期脚本问题
---

# Bun（实验性）

目标：用 **Bun** 运行此仓库（可选，不推荐用于 WhatsApp/Telegram），
同时不偏离 pnpm 的工作流。

⚠️ **不推荐用于 Gateway 运行时**（WhatsApp/Telegram 存在 bug）。生产环境使用 Node。

## 状态

- Bun 可作为本地可选运行时，直接运行 TypeScript（`bun run …`、`bun --watch …`）。
- `pnpm` 是构建默认方案，仍然完全受支持（部分文档工具也依赖它）。
- Bun 不能使用 `pnpm-lock.yaml`，会忽略它。

## 安装

默认：

```sh
bun install
```

注意：`bun.lock`/`bun.lockb` 已被 gitignore，因此不会污染仓库。如果你希望**不写 lockfile**：

```sh
bun install --no-save
```

## 构建与测试（Bun）

```sh
bun run build
bun run vitest run
```

## Bun 生命周期脚本（默认阻止）

Bun 可能会阻止依赖的生命周期脚本，除非显式信任（`bun pm untrusted` / `bun pm trust`）。
在这个仓库里，常见被阻止的脚本并不必需：

- `@whiskeysockets/baileys` `preinstall`：检查 Node 主版本 >= 20（我们使用 Node 22+）。
- `protobufjs` `postinstall`：发出版本方案不兼容的警告（不影响构建产物）。

如果你遇到确实需要这些脚本的运行时问题，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

- 有些脚本仍硬编码 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。这些暂时用 pnpm 运行。
