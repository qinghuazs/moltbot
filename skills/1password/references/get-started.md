# 1Password CLI 入门（总结）

- 适用于 macOS、Windows 和 Linux。
  - macOS/Linux shells：bash、zsh、sh、fish。
  - Windows shell：PowerShell。
- 需要 1Password 订阅和桌面应用才能使用应用集成。
- macOS 要求：Big Sur 11.0.0 或更高版本。
- Linux 应用集成需要 PolKit + 身份验证代理。
- 根据您的操作系统的官方文档安装 CLI。
- 在 1Password 应用中启用桌面应用集成：
  - 打开并解锁应用，然后选择您的账户/集合。
  - macOS：设置 > 开发者 > 与 1Password CLI 集成（Touch ID 可选）。
  - Windows：打开 Windows Hello，然后设置 > 开发者 > 集成。
  - Linux：设置 > 安全 > 使用系统身份验证解锁，然后设置 > 开发者 > 集成。
- 集成后，运行任何命令来登录（文档中的示例：`op vault list`）。
- 如果有多个账户：使用 `op signin` 选择一个，或 `--account` / `OP_ACCOUNT`。
- 对于非集成身份验证，使用 `op account add`。
