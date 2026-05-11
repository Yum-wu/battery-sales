# 电池销售助手

微信小程序 + CloudBase 云函数，帮助电池销售人员通过自然语言或表单快速记录销售数据，自动统计提成。

## 项目结构

```
battery-sales/
├── miniprogram/               # 微信小程序前端
│   ├── app.js                 # 入口（启动时自动登录）
│   ├── app.json               # 页面路由 + TabBar 配置
│   ├── utils/
│   │   ├── api.js             # API 请求封装（自动附加用户身份）
│   │   ├── user.js            # 用户登录和角色管理
│   │   └── util.js            # 工具函数
│   └── pages/
│       ├── index/             # 首页（数据看板）
│       ├── chat/              # AI 记账对话页
│       ├── sales/             # 销售记录列表
│       ├── record/            # 表单录入页
│       └── detail/            # 记录详情页
├── cloudfunctions/
│   └── openclaw-agent/        # CloudBase 云函数 + Docker 部署
│       ├── .env.example       # 环境变量模板
│       ├── Dockerfile         # 容器部署
│       └── client-example.js  # API 调用示例
└── 试用方案.md                 # 客户试用上线指南
```

## 角色权限

| 操作 | 老板 (boss) | 销售员 (salesperson) |
|------|------------|---------------------|
| 查看记录列表 | 全部记录 | 仅自己的记录 |
| 查看统计 | 全部数据 | 仅自己的数据 |
| 查看详情 | 可见编辑/删除按钮 | 只读 |
| 编辑/删除 | 可以 | ❌ |
| 新增记录 | 可以 | 可以 |

**配置老板**：编辑 `miniprogram/utils/user.js` 中的 `BOSS_OPENIDS` 数组，添加老板的微信 openid。

**获取老板 openid 的方法**：
1. 确保云函数已配置 `WECHAT_APPID` 和 `WECHAT_SECRET` 环境变量
2. 让老板打开小程序（真机扫码）
3. 在开发者工具控制台执行 `wx.getStorageSync('user_info')`
4. 把返回的 `openid` 复制到 `BOSS_OPENIDS` 数组中
5. 重新编译，老板再次打开即可识别为老板角色

## 部署前必改

1. `miniprogram/app.js` — 替换 `apiBaseUrl` 为真实 CloudBase 环境域名
2. `miniprogram/project.config.example.json` — 复制为 `project.config.json`，填入真实微信 AppID，并设 `urlCheck: false`（开发时）
   > `project.config.json` 已加入 `.gitignore`，不会提交到仓库，避免 AppID 泄露
3. `cloudfunctions/openclaw-agent/.env.example` — 按说明配置环境变量

## 后端

- CloudBase 云函数（`openclaw-agent`），调用混元模型（1亿 token 免费额度）
- 默认模型：`hunyuan-2.0-instruct-20251111`
- API 端点：`/health`, `/sales` (CRUD), `/stats`, `/chat`, `/auth/login`

## HTTP 服务路由

云函数通过 CloudBase HTTP 访问服务（云接入）对外暴露：

```bash
# 配置路由：所有路径转发到 openclaw-agent
tcb service:create -p / -f openclaw-agent -e <envId>
```

访问地址：`https://<envId>.service.tcloudbase.com/<path>`

## 部署流程

```bash
# 1. 进入函数目录
cd cloudfunctions/openclaw-agent

# 2. 临时隐藏 cloudbaserc.json（避免子目录路径冲突）
ren cloudbaserc.json cloudbaserc.json.bak

# 3. 部署
tcb fn deploy openclaw-agent -e <envId>

# 4. 恢复配置文件
ren cloudbaserc.json.bak cloudbaserc.json
```

**环境变量**（在 CloudBase 控制台或 cloudbaserc.json 中设置）：

| 变量 | 说明 |
|------|------|
| `WECHAT_APPID` | 小程序 AppID（用于 jscode2session 登录）|
| `WECHAT_SECRET` | 小程序 AppSecret |
| `AI_MODEL_PROVIDER` | 模型提供商，默认 `hunyuan-exp` |
| `AI_MODEL_NAME` | 模型名，默认 `hunyuan-2.0-instruct-20251111` |

## 数据模型

```
销售记录 (Sale):
  - batteryModel:  A | B | C
  - quantity:      Number（块数）
  - customerName:  String（选填）
  - notes:         String（选填）
  - totalCommission: Number（提成 = quantity × 50）
  - _openid:       String（归属用户的微信 openid）
  - _nickName:     String（登记人的名字）
  - reportTime:    Date
```
