# OpenClaw AI Chat Agent

基于腾讯云开发（CloudBase）的 AI 聊天 Agent 云函数，使用微信开发者赠送的 1 亿 token 额度调用 AI 模型。

## 说明

这是 **battery-sales 项目** 的后端 AI 服务云函数，部署在 CloudBase 环境 `hermes-d7gvpvoah15874de5` 上，提供 RESTful API 接入 Hunyuan、DeepSeek 等大模型。

## 支持的模型

### Hunyuan（推荐）
- `hunyuan-2.0-instruct-20251111`（默认）
- `hunyuan-2.0-thinking-20251109`
- `hunyuan-t1-latest`
- `hunyuan-turbos-latest`

### DeepSeek
- `deepseek-v3.2`（推荐）
- `deepseek-v3-0324`
- `deepseek-r1-0528`

## 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/` | 服务信息 |
| `GET` | `/health` | 健康检查 |
| `GET` | `/models` | 模型列表 |
| `POST` | `/chat` | AI 对话 |
| `OPTIONS` | `*` | CORS 预检 |

## POST /chat

请求体：

```json
{
  "message": "你好，介绍一下李白",
  "model": "hunyuan-2.0-instruct-20251111",
  "provider": "hunyuan-exp",
  "temperature": 0.7
}
```

参数说明：
- `message`（必填）— 对话内容
- `model`（可选）— 模型名称，默认 `hunyuan-2.0-instruct-20251111`
- `provider`（可选）— 模型供应商，默认 `hunyuan-exp`
- `temperature`（可选）— 温度系数，默认 `0.7`

响应：

```json
{
  "text": "李白（701年－762年），字太白，号青莲居士...",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 200,
    "total_tokens": 215
  },
  "model": "hunyuan-2.0-instruct-20251111",
  "provider": "hunyuan-exp",
  "timestamp": "2026-05-07T10:00:00.000Z"
}
```

通过 `provider` 切换模型供应商，发送请求时指定 `"provider": "deepseek"` 即可使用 DeepSeek 模型。

## 部署

使用 CloudBase MCP 工具或 CLI 部署：

```bash
# 部署云函数
tcb functions deploy openclaw-agent

# 或部署为 CloudRun 服务
tcb cloudrun deploy openclaw-agent
```

修改 `cloudbaserc.json` 中的 `envVariables` 配置环境变量，或在 CloudBase 控制台设置。

## 项目结构

```
cloudfunctions/openclaw-agent/
├── index.js              # CommonJS 入口（exports.main）
├── cloudfunction.js      # ES Module 入口（export const main，实际部署用）
├── test.js               # 本地测试脚本
├── client-example.js     # 客户端调用示例
├── package.json          # 依赖 @cloudbase/node-sdk
├── .env.example          # 环境变量模板
├── Dockerfile            # CloudRun 容器配置
├── cloudbaserc.json      # 部署配置文件
└── README.md             # 本文件
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TCB_ENV_ID` / `CLOUDBASE_ENV_ID` | 云开发环境 ID | `hermes-d7gvpvoah15874de5` |
| `AI_MODEL_PROVIDER` | AI 供应商 | `hunyuan-exp` |
| `AI_MODEL_NAME` | 模型名称 | `hunyuan-2.0-instruct-20251111` |

`TCB_ENV_ID` 由云函数运行环境自动注入，通常无需手动设置。
