---
name: himalaya
description: "CLI to manage emails via IMAP/SMTP. Use `himalaya` to list, read, write, reply, forward, search, and organize emails from the terminal. Supports multiple accounts and message composition with MML (MIME Meta Language)."
homepage: https://github.com/pimalaya/himalaya
metadata: {"moltbot":{"emoji":"📧","requires":{"bins":["himalaya"]},"install":[{"id":"brew","kind":"brew","formula":"himalaya","bins":["himalaya"],"label":"Install Himalaya (brew)"}]}}
---

# Himalaya 邮件 CLI

Himalaya 是一个 CLI 邮件客户端,可以使用 IMAP、SMTP、Notmuch 或 Sendmail 后端从终端管理邮件。

## 参考文档

- `references/configuration.md` (配置文件设置 + IMAP/SMTP 认证)
- `references/message-composition.md` (编写邮件的 MML 语法)

## 前置条件

1. 已安装 Himalaya CLI (运行 `himalaya --version` 验证)
2. 配置文件位于 `~/.config/himalaya/config.toml`
3. 已配置 IMAP/SMTP 凭据(密码安全存储)

## 配置设置

运行交互式向导来设置账户:
```bash
himalaya account configure
```

Or create `~/.config/himalaya/config.toml` manually:
```toml
[accounts.personal]
email = "you@example.com"
display-name = "Your Name"
default = true

backend.type = "imap"
backend.host = "imap.example.com"
backend.port = 993
backend.encryption.type = "tls"
backend.login = "you@example.com"
backend.auth.type = "password"
backend.auth.cmd = "pass show email/imap"  # or use keyring

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.example.com"
message.send.backend.port = 587
message.send.backend.encryption.type = "start-tls"
message.send.backend.login = "you@example.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.cmd = "pass show email/smtp"
```

## 常用操作

### 列出文件夹

```bash
himalaya folder list
```

### 列出邮件

列出收件箱中的邮件(默认):
```bash
himalaya envelope list
```

列出特定文件夹中的邮件:
```bash
himalaya envelope list --folder "Sent"
```

分页列出:
```bash
himalaya envelope list --page 1 --page-size 20
```

### 搜索邮件

```bash
himalaya envelope list from john@example.com subject meeting
```

### 阅读邮件

通过 ID 阅读邮件(显示纯文本):
```bash
himalaya message read 42
```

导出原始 MIME:
```bash
himalaya message export 42 --full
```

### 回复邮件

交互式回复(打开 $EDITOR):
```bash
himalaya message reply 42
```

全部回复:
```bash
himalaya message reply 42 --all
```

### 转发邮件

```bash
himalaya message forward 42
```

### 撰写新邮件

交互式撰写(打开 $EDITOR):
```bash
himalaya message write
```

Send directly using template:
```bash
cat << 'EOF' | himalaya template send
From: you@example.com
To: recipient@example.com
Subject: Test Message

Hello from Himalaya!
EOF
```

Or with headers flag:
```bash
himalaya message write -H "To:recipient@example.com" -H "Subject:Test" "Message body here"
```

### 移动/复制邮件

移动到文件夹:
```bash
himalaya message move 42 "Archive"
```

复制到文件夹:
```bash
himalaya message copy 42 "Important"
```

### 删除邮件

```bash
himalaya message delete 42
```

### 管理标记

添加标记:
```bash
himalaya flag add 42 --flag seen
```

移除标记:
```bash
himalaya flag remove 42 --flag seen
```

## 多账户

列出账户:
```bash
himalaya account list
```

使用特定账户:
```bash
himalaya --account work envelope list
```

## 附件

从邮件中保存附件:
```bash
himalaya attachment download 42
```

保存到特定目录:
```bash
himalaya attachment download 42 --dir ~/Downloads
```

## 输出格式

大多数命令支持 `--output` 来输出结构化数据:
```bash
himalaya envelope list --output json
himalaya envelope list --output plain
```

## 调试

启用调试日志:
```bash
RUST_LOG=debug himalaya envelope list
```

完整跟踪和回溯:
```bash
RUST_LOG=trace RUST_BACKTRACE=1 himalaya envelope list
```

## 提示

- 使用 `himalaya --help` 或 `himalaya <command> --help` 查看详细用法。
- 消息 ID 相对于当前文件夹;更改文件夹后需要重新列出。
- 要撰写带附件的富文本邮件,请使用 MML 语法(参见 `references/message-composition.md`)。
- 使用 `pass`、系统钥匙串或输出密码的命令来安全存储密码。
