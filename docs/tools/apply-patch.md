---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - 需要跨多个文件的结构化编辑
  - 希望记录或排查补丁式编辑
---

# apply_patch 工具

使用结构化补丁格式应用文件更改。适用于多文件或多 hunk 编辑，避免单次 `edit` 调用脆弱。

工具接受单个 `input` 字符串，其中包含一个或多个文件操作：

```
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
*** Update File: src/app.ts
@@
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## 参数

- `input`（必填）：完整补丁内容，包含 `*** Begin Patch` 与 `*** End Patch`。

## 说明

- 路径相对工作区根目录解析。
- 在 `*** Update File:` hunk 中可用 `*** Move to:` 重命名文件。
- 必要时 `*** End of File` 表示仅插入 EOF。
- 实验性，默认禁用。通过 `tools.exec.applyPatch.enabled` 启用。
- 仅支持 OpenAI（含 OpenAI Codex）。可用 `tools.exec.applyPatch.allowModels` 按模型门控。
- 配置仅在 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```
