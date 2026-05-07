import tcb from '@cloudbase/node-sdk';

// ============================================================
// 电池销售助手 — OpenClaw Intelligent Agent
// 功能：自然语言记账、查询统计、日报/周报/月报、CRUD
// ============================================================

const CLOUDBASE_ENV =
  process.env.TCB_ENV_ID ||
  process.env.CLOUDBASE_ENV_ID ||
  'your-cloudbase-env-id'; // ← 部署前替换为你的 envId

const app = tcb.init({ env: CLOUDBASE_ENV });
const db = app.database();
const ai = app.ai();
const _ = db.command;

const COLLECTION = 'battery_sales';
const COMMISSION_PER = 50;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// ============================================================
// AI 系统提示词
// ============================================================

function buildSystemPrompt() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dayOfWeek = weekdays[today.getDay()];

  return `你叫"小电"，是一个电池销售助手。当前日期：${dateStr}（周${dayOfWeek}）。

用户是农村电池销售人员，文化程度不高，喜欢用语音说话。你回答要用大白话，简短亲切，不要用专业术语。

--- 电池型号 ---
三种型号，每块提成都是 ${COMMISSION_PER} 元：
- A型 — 普通型电池
- B型 — 加强型电池
- C型 — 豪华型电池

--- 你的任务 ---
理解用户想做什么，返回严格 JSON 格式。不要输出任何其他文字，只输出 JSON。

响应格式：
{
  "reply": "你对用户说的话，简短亲切的大白话",
  "action": { "type": "...", "data": { ... } }
}

如果用户只是打招呼、闲聊，action 设为 null。

--- 可用操作 ---

1. createSale — 卖电池了！要记账
   data: { "batteryModel": "A或B或C", "quantity": 数字, "customerName": "客户名(可选)", "notes": "备注(可选)" }
   例：用户说"卖了3块A电池给张三" → { "type": "createSale", "data": { "batteryModel": "A", "quantity": 3, "customerName": "张三" } }

2. queryDailyReport — 查看某天的报表
   data: { "date": "2024-01-15" }
   date 可以省略，默认今天。用户说"今天报表"、"今天卖了啥" → 用今天日期。

3. queryWeeklyReport — 查看某周的报表
   data: { "weekStart": "2024-01-15" }
   weekStart 是周一的日期。用户说"这周"、"本周" → 算出本周一的日期。
   用户说"上周" → 算出上周一的日期。

4. queryMonthlyReport — 查看某月的报表
   data: { "month": "2024-01" }
   month 可以省略，默认本月。用户说"这个月"、"本月" → 用当前年月。

5. queryCustomer — 查某客户的记录
   data: { "customerName": "客户名" }

6. queryStats — 查总统计概览
   data: {}

--- 注意事项 ---
- 用户说"查账"、"看看报表"、"多少钱"、"算算工资" → 优先用 queryStats
- 用户说"今天"、"昨天"、"前天"、"明天" → 计算出具体日期用于 queryDailyReport
- 用户说"周报"、"这周"、"上周" → 计算出具体周一起始日期
- 用户说"月报"、"这个月" → 计算出具体年月
- 数量一定要是正整数
- 型号一定要是 A、B、C 之一
- 如果用户说的内容不清楚，reply 里引导用户说清楚`;
}

// ============================================================
// 意图识别（调用 AI）
// ============================================================

async function recognizeIntent(message, history = []) {
  const modelProvider = process.env.AI_MODEL_PROVIDER || 'hunyuan-exp';
  const modelName = process.env.AI_MODEL_NAME || 'hunyuan-2.0-instruct-20251111';
  const aiModel = ai.createModel(modelProvider);

  const systemPrompt = buildSystemPrompt();
  const fullPrompt = `${systemPrompt}\n\n用户说：${message}`;

  const result = await aiModel.generateText({
    model: modelName,
    messages: [{ role: 'user', content: fullPrompt }],
    temperature: 0.1,
    maxTokens: 1024
  });

  const text = result.text || result.response || '';
  return parseIntentResponse(text);
}

function parseIntentResponse(text) {
  // 尝试提取 JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        reply: parsed.reply || '好的，已处理！',
        action: parsed.action || null
      };
    } catch (e) {
      console.error('JSON parse error:', e.message);
    }
  }

  // 如果 AI 没输出 JSON，当作纯聊天
  return {
    reply: text || '您好！我是电池销售助手小电，有什么可以帮您的？',
    action: null
  };
}

// ============================================================
// 动作执行
// ============================================================

async function executeAction(action) {
  if (!action || !action.type || action.type === 'none') return null;

  switch (action.type) {
    case 'createSale':
      return executeCreateSale(action.data);
    case 'queryDailyReport':
      return executeDailyReport(action.data);
    case 'queryWeeklyReport':
      return executeWeeklyReport(action.data);
    case 'queryMonthlyReport':
      return executeMonthlyReport(action.data);
    case 'queryCustomer':
      return executeQueryCustomer(action.data);
    case 'queryStats':
      return executeQueryStats();
    default:
      return null;
  }
}

// --- 记账 ---

async function executeCreateSale(data) {
  const { batteryModel, quantity, customerName, notes } = data;

  if (!batteryModel || !['A', 'B', 'C'].includes(batteryModel)) {
    return { reply: '型号不对哦，请问是 A型、B型 还是 C型 呢？', table: null };
  }
  const qty = parseInt(quantity);
  if (!qty || qty <= 0) {
    return { reply: '数量不对哦，请问卖了多少块呢？', table: null };
  }

  const serialNumber = await getNextSerialNumber();
  const now = new Date();
  const totalCommission = qty * COMMISSION_PER;

  const record = {
    serialNumber,
    batteryModel,
    quantity: qty,
    commissionPer: COMMISSION_PER,
    totalCommission,
    customerName: customerName || '',
    notes: notes || '',
    source: 'wechat',
    reportTime: now,
    createdAt: now,
    updatedAt: now
  };

  await db.collection(COLLECTION).add(record);

  const modelLabel = { A: 'A型', B: 'B型', C: 'C型' }[batteryModel];
  const customerText = customerName ? `，${customerName}的` : '';

  return {
    reply: `好嘞！已记上${customerText}${qty}块${modelLabel}，提成 ${totalCommission} 元💰`,
    table: null
  };
}

// --- 日报 ---

async function executeDailyReport(data) {
  const today = new Date();
  let dateStr = data && data.date ? data.date : formatDateStr(today);

  // 如果用户传了相对日期
  if (dateStr === 'today') dateStr = formatDateStr(today);
  if (dateStr === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    dateStr = formatDateStr(d);
  }

  const startDate = new Date(`${dateStr}T00:00:00+08:00`);
  const endDate = new Date(`${dateStr}T23:59:59+08:00`);

  const result = await db.collection(COLLECTION)
    .where({
      reportTime: _.gte(startDate).and(_.lte(endDate))
    })
    .get();

  const records = result.data || [];

  // 按型号统计
  const byModel = { A: 0, B: 0, C: 0 };
  let totalQty = 0;
  let totalComm = 0;

  for (const r of records) {
    const model = r.batteryModel;
    if (byModel[model] !== undefined) {
      byModel[model] += r.quantity || 0;
    }
    totalQty += r.quantity || 0;
    totalComm += r.totalCommission || 0;
  }

  if (totalQty === 0) {
    return { reply: `${dateStr} 还没有卖出电池呢📭`, table: null };
  }

  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(dateStr + 'T12:00:00+08:00');
  const weekday = days[d.getDay()];
  const dateDisplay = `${d.getMonth() + 1}月${d.getDate()}日`;

  const rows = [];
  for (const model of ['A', 'B', 'C']) {
    if (byModel[model] > 0) {
      const pct = Math.round((byModel[model] / totalQty) * 100);
      rows.push([`${model}型`, `${byModel[model]}块`, `${byModel[model] * COMMISSION_PER}元`, `${pct}%`]);
    }
  }

  return {
    reply: `📊 ${dateDisplay}（周${weekday}）销售报表\n共 ${records.length} 笔，${totalQty}块，提成 ${totalComm} 元`,
    table: {
      type: 'daily',
      title: `${dateDisplay} 销售报表`,
      headers: ['型号', '数量', '提成', '占比'],
      rows,
      footer: ['合计', `${totalQty}块`, `${totalComm}元`, '100%']
    }
  };
}

// --- 周报 ---

async function executeWeeklyReport(data) {
  const today = new Date();
  let weekStartStr = data && data.weekStart ? data.weekStart : null;

  if (!weekStartStr || weekStartStr === 'this_week') {
    // 本周一
    const d = new Date(today);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    weekStartStr = formatDateStr(d);
  }

  const weekStart = new Date(`${weekStartStr}T00:00:00+08:00`);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const result = await db.collection(COLLECTION)
    .where({
      reportTime: _.gte(weekStart).and(_.lte(weekEnd))
    })
    .get();

  const records = result.data || [];

  if (records.length === 0) {
    return { reply: `这一周（${weekStartStr} 起）还没有销售记录`, table: null };
  }

  // 按日统计
  const byDay = {};
  let totalQty = 0;
  let totalComm = 0;

  for (const r of records) {
    const rt = new Date(r.reportTime);
    const dayStr = formatDateStr(rt);
    if (!byDay[dayStr]) byDay[dayStr] = { qty: 0, comm: 0, count: 0 };
    byDay[dayStr].qty += r.quantity || 0;
    byDay[dayStr].comm += r.totalCommission || 0;
    byDay[dayStr].count += 1;
    totalQty += r.quantity || 0;
    totalComm += r.totalCommission || 0;
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dayStr = formatDateStr(d);
    const dayData = byDay[dayStr];
    const label = `周${weekDays[d.getDay()]}`;
    if (dayData) {
      rows.push([label, `${dayData.qty}块`, `${dayData.comm}元`]);
    } else {
      rows.push([label, '—', '—']);
    }
  }

  const ws = new Date(weekStart);
  const we = new Date(weekEnd);
  const title = `${ws.getMonth() + 1}月${ws.getDate()}日-${we.getMonth() + 1}月${we.getDate()}日 周报表`;

  return {
    reply: `📊 ${title}\n共 ${records.length} 笔，${totalQty}块，提成 ${totalComm} 元`,
    table: {
      type: 'weekly',
      title,
      headers: ['日期', '销量', '提成'],
      rows,
      footer: ['合计', `${totalQty}块`, `${totalComm}元`]
    }
  };
}

// --- 月报 ---

async function executeMonthlyReport(data) {
  const today = new Date();
  let monthStr = data && data.month ? data.month : null;

  if (!monthStr || monthStr === 'this_month') {
    monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const result = await db.collection(COLLECTION)
    .where({
      reportTime: _.gte(monthStart).and(_.lte(monthEnd))
    })
    .get();

  const records = result.data || [];

  if (records.length === 0) {
    return { reply: `${year}年${month}月还没有销售记录`, table: null };
  }

  // 按日统计
  const byDay = {};
  let totalQty = 0;
  let totalComm = 0;

  for (const r of records) {
    const rt = new Date(r.reportTime);
    const dayStr = formatDateStr(rt);
    if (!byDay[dayStr]) byDay[dayStr] = { qty: 0, comm: 0, count: 0 };
    byDay[dayStr].qty += r.quantity || 0;
    byDay[dayStr].comm += r.totalCommission || 0;
    byDay[dayStr].count += 1;
    totalQty += r.quantity || 0;
    totalComm += r.totalCommission || 0;
  }

  const sortedDays = Object.keys(byDay).sort();
  const rows = sortedDays.map(dayStr => {
    const d = new Date(dayStr + 'T12:00:00+08:00');
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    return [label, `${byDay[dayStr].qty}块`, `${byDay[dayStr].comm}元`];
  });

  const title = `${year}年${month}月销售报表`;

  return {
    reply: `📊 ${title}\n共 ${records.length} 笔，${totalQty}块，提成 ${totalComm} 元💰`,
    table: {
      type: 'monthly',
      title,
      headers: ['日期', '销量', '提成'],
      rows,
      footer: ['合计', `${totalQty}块`, `${totalComm}元`]
    }
  };
}

// --- 查客户 ---

async function executeQueryCustomer(data) {
  const name = data && data.customerName;
  if (!name) {
    return { reply: '请问要查哪个客户呢？', table: null };
  }

  const result = await db.collection(COLLECTION)
    .where({ customerName: db.command.eq(name) })
    .orderBy('reportTime', 'desc')
    .get();

  const records = result.data || [];

  if (records.length === 0) {
    return { reply: `没有找到"${name}"的购买记录`, table: null };
  }

  let totalQty = 0;
  let totalComm = 0;
  const rows = records.slice(0, 20).map(r => {
    const d = new Date(r.reportTime);
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
    const modelLabel = { A: 'A型', B: 'B型', C: 'C型' }[r.batteryModel] || r.batteryModel;
    totalQty += r.quantity || 0;
    totalComm += r.totalCommission || 0;
    return [dateLabel, modelLabel, `${r.quantity}块`, `${r.totalCommission || 0}元`];
  });

  return {
    reply: `📋 ${name} 共 ${records.length} 笔，${totalQty}块，提成 ${totalComm} 元`,
    table: {
      type: 'customer',
      title: `${name} — 销售记录`,
      headers: ['日期', '型号', '数量', '提成'],
      rows,
      footer: records.length > 20 ? ['仅显示最近20条', '', '', ''] : ['合计', '', `${totalQty}块`, `${totalComm}元`]
    }
  };
}

// --- 统计概览 ---

async function executeQueryStats() {
  const result = await db.collection(COLLECTION).get();

  const records = result.data || [];
  let totalQty = 0;
  let totalComm = 0;
  const byModel = { A: 0, B: 0, C: 0 };

  for (const r of records) {
    totalQty += r.quantity || 0;
    totalComm += r.totalCommission || 0;
    if (byModel[r.batteryModel] !== undefined) {
      byModel[r.batteryModel] += r.quantity || 0;
    }
  }

  if (totalQty === 0) {
    return { reply: '还没有销售记录呢，卖电池了记得找我记账哦！', table: null };
  }

  return {
    reply: `📊 总销售概览\n共 ${records.length} 笔，${totalQty}块电池，总提成 ${totalComm} 元`,
    table: {
      type: 'summary',
      title: '总销售概览',
      headers: ['项目', '数值'],
      rows: [
        ['总销量', `${totalQty}块`],
        ['总提成', `${totalComm}元`],
        ['总笔数', `${records.length}笔`],
        ['平均每笔', `${Math.round(totalQty / records.length)}块`],
        ['A型销量', `${byModel.A}块`],
        ['B型销量', `${byModel.B}块`],
        ['C型销量', `${byModel.C}块`]
      ]
    }
  };
}

// ============================================================
// 响应构建
// ============================================================

async function buildChatResponse(intent, actionResult) {
  let reply = intent.reply || '好的，已处理！';
  let table = null;

  if (actionResult) {
    if (actionResult.reply) reply = actionResult.reply;
    if (actionResult.table) table = actionResult.table;
  }

  return { reply, table };
}

// ============================================================
// 数据库辅助
// ============================================================

async function getNextSerialNumber() {
  const result = await db.collection(COLLECTION)
    .orderBy('serialNumber', 'desc')
    .limit(1)
    .get();

  const records = result.data || [];
  return records.length > 0 ? (records[0].serialNumber || 0) + 1 : 1;
}

function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ============================================================
// CRUD 处理函数（供现有页面调用）
// ============================================================

async function crudCreateSale(body) {
  const { batteryModel, quantity, customerName, notes } = body;
  if (!batteryModel || !['A', 'B', 'C'].includes(batteryModel)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: '型号必须是 A、B、C 之一' }) };
  }
  const qty = parseInt(quantity);
  if (!qty || qty <= 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: '请输入有效数量' }) };
  }

  const serialNumber = await getNextSerialNumber();
  const now = new Date();
  const record = {
    serialNumber,
    batteryModel,
    quantity: qty,
    commissionPer: COMMISSION_PER,
    totalCommission: qty * COMMISSION_PER,
    customerName: customerName || '',
    notes: notes || '',
    source: 'api',
    reportTime: now,
    createdAt: now,
    updatedAt: now
  };

  const addResult = await db.collection(COLLECTION).add(record);
  record._id = addResult.id;

  return {
    statusCode: 201,
    headers: CORS,
    body: JSON.stringify({ data: record })
  };
}

async function crudListSales(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  let conditions = {};
  if (query.model) {
    conditions.batteryModel = query.model;
  }
  if (query.startDate) {
    const start = new Date(`${query.startDate}T00:00:00+08:00`);
    const end = query.endDate
      ? new Date(`${query.endDate}T23:59:59+08:00`)
      : new Date(`${query.startDate}T23:59:59+08:00`);
    conditions.reportTime = _.gte(start).and(_.lte(end));
  }

  const countResult = await db.collection(COLLECTION).where(conditions).count();
  const total = countResult.total || 0;

  const result = await db.collection(COLLECTION)
    .where(conditions)
    .orderBy('reportTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      data: result.data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  };
}

async function crudGetSale(id) {
  const result = await db.collection(COLLECTION).doc(id).get();
  const record = result.data && result.data.length > 0 ? result.data[0] : null;
  if (!record) {
    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: '记录不存在' }) };
  }
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ data: record }) };
}

async function crudUpdateSale(id, body) {
  const { quantity, customerName, notes } = body;
  if (!id) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: '缺少记录 ID' }) };
  }

  const updateData = { updatedAt: new Date() };
  if (quantity !== undefined) {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: '请输入有效数量' }) };
    }
    updateData.quantity = qty;
    updateData.totalCommission = qty * COMMISSION_PER;
  }
  if (customerName !== undefined) updateData.customerName = customerName;
  if (notes !== undefined) updateData.notes = notes;

  await db.collection(COLLECTION).doc(id).update(updateData);

  const result = await db.collection(COLLECTION).doc(id).get();
  const record = result.data && result.data.length > 0 ? result.data[0] : null;

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ data: record }) };
}

async function crudDeleteSale(id) {
  if (!id) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: '缺少记录 ID' }) };
  }
  await db.collection(COLLECTION).doc(id).remove();
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ data: { deleted: true } }) };
}

async function crudStats() {
  const result = await db.collection(COLLECTION).get();
  const records = result.data || [];

  let totalQuantity = 0;
  let totalCommission = 0;
  const byModel = {};
  const byDay = {};

  for (const r of records) {
    const qty = r.quantity || 0;
    totalQuantity += qty;
    totalCommission += r.totalCommission || 0;

    const model = r.batteryModel;
    if (!byModel[model]) byModel[model] = { quantity: 0, commission: 0, records: 0 };
    byModel[model].quantity += qty;
    byModel[model].commission += r.totalCommission || 0;
    byModel[model].records += 1;

    const d = new Date(r.reportTime);
    const dayStr = formatDateStr(d);
    if (!byDay[dayStr]) byDay[dayStr] = { date: dayStr, quantity: 0, commission: 0 };
    byDay[dayStr].quantity += qty;
    byDay[dayStr].commission += r.totalCommission || 0;
  }

  const stats = {
    totalQuantity,
    totalCommission,
    totalRecords: records.length,
    byModel,
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
  };

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ data: stats }) };
}

// ============================================================
// 路由
// ============================================================

function parsePath(path) {
  // /sales/abc123 -> { base: '/sales', id: 'abc123' }
  if (!path) return { base: '', id: null };
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { base: '/' + parts[0], id: parts[1] };
  }
  return { base: path, id: null };
}

function ok(body, statusCode = 200) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

function notFound() {
  return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Not found' }) };
}

function serverError(err) {
  console.error('Server error:', err);
  return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message || '服务器内部错误' }) };
}

// ============================================================
// 入口
// ============================================================

export const main = async (event, context) => {
  try {
    const httpMethod = event.httpMethod || 'GET';
    const path = event.path || '/';
    const body = event.body
      ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body)
      : {};
    const query = event.queryStringParameters || {};

    // CORS 预检
    if (httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: CORS, body: '' };
    }

    // === 信息端点 ===
    if (httpMethod === 'GET' && (path === '/' || path === '')) {
      return ok({
        service: '电池销售助手 OpenClaw Agent',
        version: '1.0.0',
        endpoints: ['/health', '/models', '/chat', '/sales', '/stats'],
        docs: 'https://github.com/user/battery-sales'
      });
    }

    if (httpMethod === 'GET' && path === '/health') {
      return ok({ status: 'healthy', timestamp: new Date().toISOString() });
    }

    if (httpMethod === 'GET' && path === '/models') {
      return ok({
        available_models: [
          { provider: 'hunyuan-exp', models: ['hunyuan-2.0-instruct-20251111', 'hunyuan-2.0-thinking-20251109', 'hunyuan-t1-latest'], recommended: 'hunyuan-2.0-instruct-20251111' },
          { provider: 'deepseek', models: ['deepseek-v3.2', 'deepseek-v3-0324', 'deepseek-r1-0528'], recommended: 'deepseek-v3.2' }
        ],
        current_config: {
          provider: process.env.AI_MODEL_PROVIDER || 'hunyuan-exp',
          model: process.env.AI_MODEL_NAME || 'hunyuan-2.0-instruct-20251111'
        }
      });
    }

    // === AI 智能助手 ===
    if (httpMethod === 'POST' && path === '/chat') {
      if (!body.message) {
        return ok({ success: false, error: '请输入消息' }, 400);
      }

      // 第一步：AI 识别意图
      const intent = await recognizeIntent(body.message, body.history || []);
      // 第二步：执行动作
      const actionResult = intent.action && intent.action.type !== 'none'
        ? await executeAction(intent.action)
        : null;
      // 第三步：构建响应
      const response = await buildChatResponse(intent, actionResult);

      return ok({ success: true, data: response });
    }

    // === CRUD: 销售记录 ===
    if (httpMethod === 'POST' && path === '/sales') {
      return await crudCreateSale(body);
    }

    if (httpMethod === 'GET' && path === '/sales') {
      return await crudListSales(query);
    }

    // /sales/:id
    const { base, id } = parsePath(path);
    if (base === '/sales' && id) {
      if (httpMethod === 'GET') return await crudGetSale(id);
      if (httpMethod === 'PUT') return await crudUpdateSale(id, body);
      if (httpMethod === 'DELETE') return await crudDeleteSale(id);
    }

    // === 统计 ===
    if (httpMethod === 'GET' && path === '/stats') {
      return await crudStats();
    }

    return notFound();

  } catch (err) {
    return serverError(err);
  }
};
