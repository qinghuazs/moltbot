# 使用 MML (MIME Meta Language) 撰写邮件

Himalaya 使用 MML 来撰写邮件。MML 是一种简单的基于 XML 的语法,可以编译为 MIME 消息。

## 基本消息结构

电子邮件消息是一个**标题**列表,后跟一个**正文**,中间用空行分隔:

```
From: sender@example.com
To: recipient@example.com
Subject: Hello World

This is the message body.
```

## 标题

常用标题:
- `From`: 发件人地址
- `To`: 主要收件人
- `Cc`: 抄送收件人
- `Bcc`: 密送收件人
- `Subject`: 邮件主题
- `Reply-To`: 回复地址(如果与 From 不同)
- `In-Reply-To`: 正在回复的消息 ID

### 地址格式

```
To: user@example.com
To: John Doe <john@example.com>
To: "John Doe" <john@example.com>
To: user1@example.com, user2@example.com, "Jane" <jane@example.com>
```

## 纯文本正文

简单的纯文本邮件:
```
From: alice@localhost
To: bob@localhost
Subject: Plain Text Example

Hello, this is a plain text email.
No special formatting needed.

Best,
Alice
```

## 富文本邮件的 MML

### 多部分消息

文本/HTML 替代部分:
```
From: alice@localhost
To: bob@localhost
Subject: Multipart Example

<#multipart type=alternative>
This is the plain text version.
<#part type=text/html>
<html><body><h1>This is the HTML version</h1></body></html>
<#/multipart>
```

### 附件

附加文件:
```
From: alice@localhost
To: bob@localhost
Subject: With Attachment

Here is the document you requested.

<#part filename=/path/to/document.pdf><#/part>
```

使用自定义名称的附件:
```
<#part filename=/path/to/file.pdf name=report.pdf><#/part>
```

多个附件:
```
<#part filename=/path/to/doc1.pdf><#/part>
<#part filename=/path/to/doc2.pdf><#/part>
```

### 内嵌图片

内嵌图片:
```
From: alice@localhost
To: bob@localhost
Subject: Inline Image

<#multipart type=related>
<#part type=text/html>
<html><body>
<p>Check out this image:</p>
<img src="cid:image1">
</body></html>
<#part disposition=inline id=image1 filename=/path/to/image.png><#/part>
<#/multipart>
```

### 混合内容(文本 + 附件)

```
From: alice@localhost
To: bob@localhost
Subject: Mixed Content

<#multipart type=mixed>
<#part type=text/plain>
Please find the attached files.

Best,
Alice
<#part filename=/path/to/file1.pdf><#/part>
<#part filename=/path/to/file2.zip><#/part>
<#/multipart>
```

## MML 标签参考

### `<#multipart>`
将多个部分组合在一起。
- `type=alternative`: 相同内容的不同表示形式
- `type=mixed`: 独立的部分(文本 + 附件)
- `type=related`: 相互引用的部分(HTML + 图片)

### `<#part>`
定义消息部分。
- `type=<mime-type>`: 内容类型(例如 `text/html`、`application/pdf`)
- `filename=<path>`: 要附加的文件
- `name=<name>`: 附件的显示名称
- `disposition=inline`: 内嵌显示而不是作为附件
- `id=<cid>`: 在 HTML 中引用的内容 ID

## 从 CLI 撰写

### 交互式撰写
打开你的 `$EDITOR`:
```bash
himalaya message write
```

### 回复(打开编辑器并引用消息)
```bash
himalaya message reply 42
himalaya message reply 42 --all  # 全部回复
```

### 转发
```bash
himalaya message forward 42
```

### 从标准输入发送
```bash
cat message.txt | himalaya template send
```

### 从 CLI 预填充标题
```bash
himalaya message write \
  -H "To:recipient@example.com" \
  -H "Subject:Quick Message" \
  "Message body here"
```

## 提示

- 编辑器会打开一个模板;填写标题和正文。
- 保存并退出编辑器以发送;不保存退出则取消。
- 发送时 MML 部分会被编译为正确的 MIME。
- 使用 `himalaya message export --full` 检查接收邮件的原始 MIME 结构。
