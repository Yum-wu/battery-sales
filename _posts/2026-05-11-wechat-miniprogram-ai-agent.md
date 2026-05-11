---
title: "微信小程序 + AI Agent 实战：电池销售助手的踩坑记录"
date: 2026-05-11
categories: [技术]
tags: [微信小程序, AI, CloudBase, 混元模型]
---

## 背景

最近做了一个微信小程序「电池销售助手」，帮助电池销售人员通过自然语言快速记账、自动算提成。技术栈是微信小程序 + 腾讯云开发 CloudBase + 混元大模型。

在开发过程中遇到了不少坑，记录下来希望对大家有帮助。

## 坑一：微信开发者工具基础库 3.15.2 的 timeout 问题

**现象**：每次启动小程序控制台都报错：
```
Error: timeout
at Function.<anonymous> (WAServiceMainContext.js?t=wechat&v=3.15.2:1)
```

**排查过程**：
- 一开始以为是 `wx.login()` 超时，因为 appid 是占位符
- 换了真实 appid 仍然报错
- 用真机调试也一样报错
- 搜索发现这是 3.15.x 基础库的已知 bug

**解决**：在开发者工具「详情 → 本地设置 → 调试基础库」降到 `3.14.3` 就消失了。和代码无关。

## 坑二：WXML 中 wx:key 的正确写法

**现象**：`setData` 更新了数据，但页面不渲染。控制台确认 `messages.length = 2`，视图还是空的。

**原因**：微信 WXML 中 `wx:key="index"` 的写法是错误的。这个写法会去查找 `item.index` 属性，而我们的消息对象没有这个属性，导致虚拟 DOM diff 失败，`setData` 后的增量更新不生效。

**正确写法**：
{% raw %}
```html
<!-- ❌ 错误 -->
<view wx:for="{{list}}" wx:key="index">

<!-- ✅ 正确 -->
<view wx:for="{{list}}" wx:for-index="idx" wx:key="idx">
```
{% endraw %}

## 坑三：微信小程序的模块级 getApp()

**现象**：API 请求有时拿不到正确的 baseUrl。

**原因**：`utils/api.js` 中 `const app = getApp()` 写在模块顶层。虽然微信官方说这是推荐写法，但在某些加载时序下，`app.globalData.apiBaseUrl` 尚未初始化。

**解决**：用箭头函数延迟取值 `const API_BASE = () => app.globalData.apiBaseUrl`，确保每次请求时才读取。

## 坑四：CloudBase HTTP 服务路由配置

**现象**：云函数部署后访问 `/stats` 返回 404，但 `/` 和 `/health` 正常工作。

**原因**：CloudBase 的 HTTP 访问服务需要手动配置路由，把路径转发到云函数。

**解决**：
```bash
tcb service:create -p / -f openclaw-agent -e <envId>
```

另外注意 `cloudbaserc.json` 的配置格式——它要求函数代码在 `<functionRoot>/<函数名>/` 子目录下。如果直接放根目录，部署时需要临时把 `cloudbaserc.json` 改名。

## 坑五：云函数返回格式与前端解析不匹配

**现象**：销售记录列表一直是空的。

**排查**：
- 后端返回 `{ data: [...], pagination: {...} }`
- `api.js` 的通用 `request` 函数自动提取了 `res.data.data`，只拿到数组
- `sales.js` 又去取 `result?.data`，数组没有 `.data` 属性，永远为空

**解决**：为 `getSales` 单独写一个请求函数，返回完整结构 `{ data, pagination }`。

## 坑六：混元模型意图识别的 Prompt 工程

**现象**：AI 不理解用户说的"删掉"、"改成"等指令。

**原因**：系统提示词（System Prompt）中只定义了记账和查询动作，没有定义删除和修改。

**解决**：在提示词中补充：
- 告诉模型当前用户的角色（老板/销售员）
- 老板可见的 action 增加 `deleteSale` 和 `updateSale`
- 销售员提示"无权限"

另外型号也从固定 A/B/C 改成任意字符串，AI 可以理解"12V20A"、"电动车专用"等任意型号名。

## 坑七：setStorageSync 在开发者工具中返回 undefined

**现象**：`wx.setStorageSync('user_info', data)` 后立即 `wx.getStorageSync('user_info')` 返回 `undefined`。

**原因**：部分版本的微信开发者工具有 bug，同步读取可能不生效。改用回调或直接打印日志获取 openid 绕过。

## 总结

| 坑 | 根因 | 难度 |
|----|------|------|
| 基础库 timeout | 3.15.x bug | ⭐ |
| wx:key 写法 | API 误用 | ⭐⭐ |
| getApp() 时序 | 模块加载顺序 | ⭐⭐ |
| HTTP 路由 | 配置遗漏 | ⭐ |
| 返回格式不匹配 | 前后端约定不一致 | ⭐⭐ |
| Prompt 工程 | 动作定义不完整 | ⭐⭐⭐ |
| Storage bug | 工具 bug | ⭐ |

整个项目下来最大的体会：**微信小程序开发中，框架本身的坑比业务逻辑的坑多得多**。很多问题不是代码写错了，而是框架版本、工具版本、配置方式的排列组合问题。

项目已开源：https://github.com/Yum-wu/battery-sales
