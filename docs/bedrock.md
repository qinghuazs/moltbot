---
summary: "在 Moltbot 中使用 Amazon Bedrock（Converse API）模型"
read_when:
  - 想在 Moltbot 中使用 Amazon Bedrock 模型
  - 需要 AWS 凭据/区域配置以调用模型
---
# Amazon Bedrock

Moltbot 可通过 pi‑ai 的 **Bedrock Converse** 流式 provider 使用 **Amazon Bedrock** 模型。Bedrock 认证使用 **AWS SDK 默认凭据链**，而不是 API key。

## pi‑ai 支持情况

- Provider：`amazon-bedrock`
- API：`bedrock-converse-stream`
- 认证：AWS 凭据（环境变量、共享配置或实例角色）
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认 `us-east-1`）

## 自动模型发现

如果检测到 AWS 凭据，Moltbot 可自动发现支持 **流式** 和 **文本输出** 的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels` 并缓存（默认 1 小时）。

配置项在 `models.bedrockDiscovery`：

```json5
{
  models: {
    bedrockDiscovery: {
      enabled: true,
      region: "us-east-1",
      providerFilter: ["anthropic", "amazon"],
      refreshInterval: 3600,
      defaultContextWindow: 32000,
      defaultMaxTokens: 4096
    }
  }
}
```

说明：
- `enabled` 在检测到 AWS 凭据时默认为 `true`。
- `region` 默认取 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，否则 `us-east-1`。
- `providerFilter` 匹配 Bedrock provider 名称（如 `anthropic`）。
- `refreshInterval` 单位秒；设为 `0` 可禁用缓存。
- `defaultContextWindow`（默认 `32000`）与 `defaultMaxTokens`（默认 `4096`）用于发现模型（如有已知限制可覆盖）。

## 手动设置

1) 确保 **网关主机** 具备 AWS 凭据：

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
# 可选：
export AWS_SESSION_TOKEN="..."
export AWS_PROFILE="your-profile"
# 可选（Bedrock API key/bearer token）：
export AWS_BEARER_TOKEN_BEDROCK="..."
```

2) 在配置中添加 Bedrock provider 与模型（无需 `apiKey`）：

```json5
{
  models: {
    providers: {
      "amazon-bedrock": {
        baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
        api: "bedrock-converse-stream",
        auth: "aws-sdk",
        models: [
          {
            id: "anthropic.claude-opus-4-5-20251101-v1:0",
            name: "Claude Opus 4.5（Bedrock）",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192
          }
        ]
      }
    }
  },
  agents: {
    defaults: {
      model: { primary: "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0" }
    }
  }
}
```

## EC2 实例角色

当 Moltbot 运行在带 IAM 角色的 EC2 实例上时，AWS SDK 会自动使用实例元数据服务（IMDS）认证。
但 Moltbot 的凭据检测目前只检查环境变量，不检查 IMDS 凭据。

**变通：** 设置 `AWS_PROFILE=default` 以提示凭据可用。实际认证仍通过 IMDS 的实例角色完成。

```bash
# 加到 ~/.bashrc 或 shell profile
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

**EC2 实例角色需要的权限：**
- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels`（自动发现）

或直接附加托管策略 `AmazonBedrockFullAccess`。

**快速设置：**

```bash
# 1. 创建 IAM 角色与实例配置文件
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. 绑定到 EC2 实例
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. 在 EC2 上启用发现
moltbot config set models.bedrockDiscovery.enabled true
moltbot config set models.bedrockDiscovery.region us-east-1

# 4. 设置变通环境变量
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. 验证模型是否被发现
moltbot models list
```

## 说明

- Bedrock 需要在你的 AWS 账号/区域中 **开启模型访问**。
- 自动发现需要 `bedrock:ListFoundationModels` 权限。
- 若使用 profiles，请在网关主机上设置 `AWS_PROFILE`。
- Moltbot 按以下顺序显示凭据来源：`AWS_BEARER_TOKEN_BEDROCK`，然后 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，再 `AWS_PROFILE`，最后默认 AWS SDK 链。
- Reasoning 支持依赖具体模型；以 Bedrock 模型卡为准。
- 若偏好托管 key 流程，可在 Bedrock 前放置 OpenAI 兼容代理，然后把它配置为 OpenAI provider。
