# 电池销售助手（腾讯云开发版）

基于腾讯云开发（CloudBase）云函数的锂电池销售记账与查询系统，支持 REST API 和 AI 自然语言交互。

## 架构

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  客户端          │ ←→  │  openclaw-agent      │ ←→  │  CloudBase   │
│  curl / 小程序 / │     │  Cloud Function      │     │  NoSQL       │
│  Web 应用 / 其他 │     │  (AI + REST)         │     │  battery_    │
│                  │     │                      │     │  sales 集合  │
└──────────────────┘     └──────────────────────┘     └──────────────┘
```

- **云函数**: `openclaw-agent`（Node.js 18.15，Event 型）部署在腾讯云开发
- **数据库**: CloudBase NoSQL 文档数据库，`battery_sales` 集合
- **AI 模型**: 腾讯混元 / DeepSeek（通过 `@cloudbase/node-sdk` 调用）
- **网关**: 腾讯云 API 网关，公网 HTTPS 访问

## 项目结构

```
battery-sales/
├── README.md
├── cloudfunctions/openclaw-agent/
│   ├── index.js                # 云函数入口（主版本，CommonJS）
│   ├── cloudfunction.js        # 云函数入口（ES Module 版本）
│   ├── cloudbaserc.json        # 部署配置
│   ├── test.js                 # 本地测试脚本
│   ├── package.json            # 依赖配置
│   ├── Dockerfile              # 容器镜像构建
│   ├── client-example.js       # 客户端调用示例（参考用）
│   ├── src/                    # 模块化重构（开发中，尚未接入）
│   │   ├── init.js             # CloudBase SDK 初始化（单例）
│   │   ├── router.js           # 路由分发
│   │   ├── handlers/           # 请求处理函数
│   │   ├── services/           # 数据库服务层
│   │   ├── ai/                 # AI 提示词与解析
│   │   └── utils/              # 工具函数
│   └── node_modules/
├── miniprogram/                # 微信小程序前端
│   ├── pages/
│   │   ├── index/              # 首页
│   │   ├── chat/               # AI 对话页
│   │   ├── sales/              # 销售列表页
│   │   ├── record/             # 记账页
│   │   └── detail/             # 详情页
│   └── utils/
│       └── api.js              # API 调用封装
└── data/                       # 本地运行时数据（不纳入版本控制）
```

> **注意**：`index.js` 是实际部署的云函数入口（~820 行单体文件）。`src/` 目录包含一次模块化重构的代码，但当前未接入主入口。`cloudfunction.js` 是 `index.js` 的 ES Module 版本，内容相同但使用 `import`/`export` 语法。

## 快速上手

### 云函数公网地址

```
https://your-env-id.service.tcloudbase.com/openclaw-agent
```

### 验证服务是否正常

```bash
# 查看服务信息
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/

# 健康检查
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/health

# 查看可用 AI 模型
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/models
```

### AI 自然语言记账（推荐）

通过 `/chat` 接口，直接用日常对话记账：

```bash
# 记账：卖电池
curl -X POST https://your-env-id.service.tcloudbase.com/openclaw-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"卖了5块A电池给张三，备注月底结款"}'

# 记账：简写也可以
curl -X POST https://your-env-id.service.tcloudbase.com/openclaw-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"今天卖了3块C电池给王五"}'

# 查询：查看销售统计
curl -X POST https://your-env-id.service.tcloudbase.com/openclaw-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"查一下销售统计"}'
```

返回示例（记账成功）：
```json
{
  "success": true,
  "data": {
    "reply": "好嘞！已记上张三的5块A型，提成 250 元💰",
    "table": null
  }
}
```

返回示例（报表查询）：
```json
{
  "success": true,
  "data": {
    "reply": "📊 5月7日（周四）销售报表\n共 3 笔，15块，提成 750 元",
    "table": {
      "type": "daily",
      "title": "5月7日 销售报表",
      "headers": ["型号", "数量", "提成", "占比"],
      "rows": [
        ["A型", "5块", "250元", "33%"],
        ["B型", "10块", "500元", "67%"]
      ],
      "footer": ["合计", "15块", "750元", "100%"]
    }
  }
}
```

### 直接 API 调用

适合需要编程集成的场景：

```bash
# 记账
curl -X POST https://your-env-id.service.tcloudbase.com/openclaw-agent/sales \
  -H "Content-Type: application/json" \
  -d '{"batteryModel":"C","quantity":3,"customerName":"王五","notes":"老客户"}'

# 查销售列表
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/sales

# 查统计
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/stats
```

## 完整 API 参考

### 通用说明

- **Base URL**: `https://your-env-id.service.tcloudbase.com/openclaw-agent`
- **请求格式**: `Content-Type: application/json`
- **响应格式**: 实体数据包裹在 `{ data: ... }` 中（200/201），错误包裹在 `{ error: ... }` 中（4xx/5xx）
- **CORS**: 允许所有来源，支持 GET/POST/PUT/DELETE/OPTIONS

### GET / — 服务信息

返回服务基本信息。

```bash
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/
```

**响应**：
```json
{
  "service": "电池销售助手 OpenClaw Agent",
  "version": "1.0.0",
  "endpoints": ["/health", "/models", "/chat", "/sales", "/stats"],
  "docs": "..."
}
```

### GET /health — 健康检查

```bash
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/health
```

**响应**：
```json
{ "status": "healthy", "timestamp": "2026-05-07T12:00:00.000Z" }
```

### GET /models — 可用模型列表

```bash
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/models
```

**响应**：返回可用模型列表和当前配置。

### POST /chat — AI 智能对话

支持自然语言的记账和查询，AI 自动识别意图。支持通过 `messages` 参数传入对话历史实现多轮对话。

**请求体**：

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `message` | 是 | string | 用户消息（自然语言） |
| `history` | 否 | array | 对话历史（备用，当前未使用） |

**支持的 AI 模型**：

通过 `GET /models` 获取最新列表。通过环境变量 `AI_MODEL_PROVIDER` / `AI_MODEL_NAME` 配置使用的模型，默认 `hunyuan-2.0-instruct-20251111`。

当前可用：

| 提供商 | 模型 | 说明 |
|--------|------|------|
| `hunyuan-exp` | `hunyuan-2.0-instruct-20251111` | 推荐混元模型 |
| `hunyuan-exp` | `hunyuan-2.0-thinking-20251109` | 推理增强 |
| `hunyuan-exp` | `hunyuan-t1-latest` | 最新版 |
| `deepseek` | `deepseek-v3.2` | 推荐 DeepSeek |
| `deepseek` | `deepseek-v3-0324` | DeepSeek V3 |
| `deepseek` | `deepseek-r1-0528` | DeepSeek R1 |

**切换模型**：在云函数环境变量中设置 `AI_MODEL_PROVIDER` 和 `AI_MODEL_NAME`。请求级别选择模型可通过 `GET /models` 获取最新支持的模型列表后，修改环境变量生效。

### POST /sales — 创建销售记录

**请求体**：

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `batteryModel` | 是 | string | 型号 A/B/C |
| `quantity` | 是 | number | 数量（正整数） |
| `customerName` | 否 | string | 客户姓名 |
| `notes` | 否 | string | 备注 |

**请求示例**：
```bash
curl -X POST .../sales \
  -H "Content-Type: application/json" \
  -d '{"batteryModel":"B","quantity":15,"customerName":"李四","notes":"批发价"}'
```

**成功响应**（HTTP 201）：
```json
{
  "data": {
    "_id": "67f8a1b2c3d4e5f6a7b8c9d0",
    "serialNumber": 5,
    "reportTime": "2026-05-07T12:00:00.000Z",
    "batteryModel": "B",
    "quantity": 15,
    "commissionPer": 50,
    "totalCommission": 750,
    "customerName": "李四",
    "notes": "批发价",
    "source": "api",
    "createdAt": "2026-05-07T12:00:00.000Z",
    "updatedAt": "2026-05-07T12:00:00.000Z"
  }
}
```

### GET /sales — 查询销售列表

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码，默认 1 |
| `limit` | number | 每页条数，默认 20 |
| `model` | string | 按型号筛选（A/B/C） |
| `startDate` | string | 开始日期（YYYY-MM-DD） |
| `endDate` | string | 结束日期（YYYY-MM-DD） |

**请求示例**：
```bash
# 分页查询
curl ".../sales?page=1&limit=10"

# 按型号筛选
curl ".../sales?model=C"

# 按日期范围
curl ".../sales?startDate=2026-05-01&endDate=2026-05-07"

# 组合查询
curl ".../sales?model=A&startDate=2026-05-01&page=1&limit=20"
```

**响应**：
```json
{
  "data": [
    {
      "_id": "...",
      "serialNumber": 1,
      "batteryModel": "C",
      "quantity": 3,
      "totalCommission": 150,
      "customerName": "王五",
      "reportTime": "2026-05-07T10:30:00.000Z",
      "source": "api"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

### GET /sales/:id — 查询单条记录

```bash
curl .../sales/67f8a1b2c3d4e5f6a7b8c9d0
```

### PUT /sales/:id — 更新记录

```bash
curl -X PUT .../sales/67f8a1b2c3d4e5f6a7b8c9d0 \
  -H "Content-Type: application/json" \
  -d '{"quantity":20,"notes":"已更正数量"}'
```

### DELETE /sales/:id — 删除记录

```bash
curl -X DELETE .../sales/67f8a1b2c3d4e5f6a7b8c9d0
```

### GET /stats — 销售统计

返回全量统计概览（按型号、按日期汇总）。

```bash
curl https://your-env-id.service.tcloudbase.com/openclaw-agent/stats
```

**响应**：
```json
{
  "data": {
    "totalQuantity": 128,
    "totalCommission": 6400,
    "totalRecords": 15,
    "byModel": {
      "A": { "quantity": 30, "commission": 1500, "records": 5 },
      "B": { "quantity": 50, "commission": 2500, "records": 4 },
      "C": { "quantity": 48, "commission": 2400, "records": 6 }
    },
    "byDay": [
      { "date": "2026-05-01", "quantity": 20, "commission": 1000 },
      { "date": "2026-05-02", "quantity": 35, "commission": 1750 }
    ]
  }
}
```

### POST /sales — 错误示例

```bash
# 型号不合法
curl -X POST .../sales -d '{"batteryModel":"X","quantity":1}'
# 返回: {"error":"型号必须是 A、B、C 之一"}

# 缺少数量
curl -X POST .../sales -d '{"batteryModel":"A"}'
# 返回: {"error":"请输入有效数量"}

# 不存在的端点
curl .../nonexistent
# 返回: {"error":"Not found"}
```

## 数据模型

集合名称：`battery_sales`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 自动 | 文档 ID |
| `serialNumber` | number | 自动 | 序号（自增，降序排列） |
| `reportTime` | string | 自动 | 上报时间 |
| `batteryModel` | string | 是 | 型号：A/B/C |
| `quantity` | number | 是 | 销售数量 |
| `commissionPer` | number | 自动 | 提成单价（50 元/块） |
| `totalCommission` | number | 自动 | 总提成（quantity × 50） |
| `customerName` | string | 否 | 客户姓名 |
| `notes` | string | 否 | 备注 |
| `source` | string | 自动 | 来源：`api` 或 `wechat` |
| `createdAt` | string | 自动 | 创建时间 |
| `updatedAt` | string | 自动 | 更新时间 |

**索引**：
- `serialNumber` 唯一索引（降序）
- `reportTime` 索引（降序）
- `batteryModel` 索引（升序）

## 提成规则

所有电池型号统一 50 元/块，在 `index.js` 顶部配置：
```js
const COMMISSION_PER = 50;
```

## 从代码调用示例

### JavaScript（fetch）

```js
const BASE = 'https://your-env-id.service.tcloudbase.com/openclaw-agent';

// AI 记账
async function bookSale(message) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  return res.json();
}

// 查统计
async function getStats() {
  const res = await fetch(`${BASE}/stats`);
  return res.json();
}

// 使用
await bookSale('卖了3块C电池给王五');
```

### Python

```python
import requests

BASE = 'https://your-env-id.service.tcloudbase.com/openclaw-agent'

# AI 记账
def book_sale(message):
    resp = requests.post(f'{BASE}/chat', json={'message': message})
    return resp.json()

# 查列表
def list_sales(model=None):
    params = {'model': model} if model else {}
    resp = requests.get(f'{BASE}/sales', params=params)
    return resp.json()

print(book_sale('卖了5块A电池'))
```

## 部署指南

### 方式一：通过 CloudBase CLI

```bash
# 安装 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
cd cloudfunctions/openclaw-agent
tcb functions deploy openclaw-agent

# 查看部署状态
tcb functions list
```

### 方式二：通过腾讯云控制台

1. 打开 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb/env/index)
2. 选择环境 `hermes-d7gvpvoah15874de5`
3. 进入「云函数」菜单
4. 找到 `openclaw-agent` 函数
5. 可在线编辑代码、查看日志、配置触发器

### 部署配置说明

`cloudbaserc.json` 关键配置：

```json
{
  "envId": "hermes-d7gvpvoah15874de5",
  "functions": [{
    "name": "openclaw-agent",
    "timeout": 900,
    "runtime": "Nodejs18.15",
    "handler": "index.main",
    "installDependency": true
  }]
}
```

注意 `handler` 为 `index.main`，表示 `index.js` 导出的 `main` 函数。

### API 网关配置

云函数已通过 API 网关 `/openclaw-agent` 路径对外暴露，可在腾讯云控制台「API 网关」中管理：
- 查看访问日志
- 配置自定义域名
- 设置 IP 限流
- 开启鉴权

## 本地测试

```bash
cd cloudfunctions/openclaw-agent
npm install
node test.js
```

测试脚本依次执行：元信息端点 → 销售 CRUD → 统计查询 → 无效数据校验，输出每个用例的通过/失败状态。

> **注意**：本地测试运行时，以下端点可不依赖 CloudBase 数据库正常运行：
> - `GET /`、`GET /health`、`GET /models`（元信息端点）
> - 参数校验相关测试（`POST /sales` 无效参数、"POST /chat" 空消息）
>
> 涉及数据库和 AI 的操作（创建记录、查询列表、AI 对话）需要 `secretId`/`secretKey` 凭证，本地直接运行会报 `missing secretId or secretKey` 错误。部署到 CloudBase 后自动注入凭证，无需本地配置。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TCB_ENV_ID` | `hermes-d7gvpvoah15874de5` | CloudBase 环境 ID（优先级最高） |
| `CLOUDBASE_ENV_ID` | `hermes-d7gvpvoah15874de5` | CloudBase 环境 ID（备选） |
| `AI_MODEL_PROVIDER` | `hunyuan-exp` | AI 模型提供商 |
| `AI_MODEL_NAME` | `hunyuan-2.0-instruct-20251111` | AI 模型名称 |

> `TCB_ENV_ID` 优先于 `CLOUDBASE_ENV_ID`。CloudBase 部署时自动注入 `TCB_ENV_ID`，无需手动设置。可在腾讯云控制台「云函数 → openclaw-agent → 函数配置 → 环境变量」中修改 AI 模型相关变量。

## 腾讯云控制台常用操作

| 操作 | 路径 |
|------|------|
| 查看云函数日志 | 云开发控制台 → 云函数 → openclaw-agent → 日志 |
| 修改环境变量 | 云开发控制台 → 云函数 → openclaw-agent → 函数配置 |
| 查看数据库 | 云开发控制台 → 数据库 → battery_sales 集合 |
| API 网关管理 | 云开发控制台 → 访问服务 |
| 监控告警 | 云开发控制台 → 云函数 → openclaw-agent → 监控 |
