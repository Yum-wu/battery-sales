const { success, error, serverError } = require('../utils/response');
const batteryService = require('../services/batteryService');
const statsService = require('../services/statsService');

const BATTERY_SYSTEM_PROMPT = `你是一个锂电池销售助手，帮助记录和查询电池销售数据。

## 规则
- 提成标准：所有电池固定 50 元/块
- 可用电池型号：A、B、C

## 能力

### 1. 记账
当用户报告销售时，从对话中提取以下信息：
- batteryModel：电池型号（A/B/C）
- quantity：数量（正整数）
- customerName（可选）：客户姓名
- notes（可选）：备注

然后以以下 JSON 格式返回：
{"intent": "bookkeeping", "data": {"batteryModel": "X", "quantity": N}}

### 2. 查询统计
当用户查询销售情况时，返回：
{"intent": "query"}

其他情况正常对话即可，无需返回 JSON。`;

async function handleChat(ctx, body) {
  const { message, messages: history, model, provider, temperature = 0.7, mode } = body;
  const userMessage = message || (history && history.length > 0 ? history[history.length - 1].content : '');

  if (!userMessage) {
    return error('Message is required', 400);
  }

  try {
    const modelProvider = provider || process.env.AI_MODEL_PROVIDER || 'hunyuan-exp';
    const modelName = model || process.env.AI_MODEL_NAME || 'hunyuan-2.0-instruct-20251111';

    const userMessages = history
      ? [...history.slice(0, -1), { role: 'user', content: userMessage }]
      : [{ role: 'user', content: userMessage }];

    const aiModel = ctx.ai.createModel(modelProvider);
    const result = await aiModel.generateText({
      model: modelName,
      messages: [
        { role: 'system', content: BATTERY_SYSTEM_PROMPT },
        ...userMessages
      ],
      temperature
    });

    const text = result.text || '';

    // Try to parse structured response
    const jsonMatch = text.match(/\{[\s\S]*"intent"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.intent === 'bookkeeping' && parsed.data) {
          const doc = await batteryService.createSale(ctx.db, ctx._, {
            batteryModel: parsed.data.batteryModel,
            quantity: parsed.data.quantity,
            customerName: parsed.data.customerName,
            notes: parsed.data.notes,
            source: 'wechat'
          });

          return success({
            text: `✅ 已记账：${doc.batteryModel}型号电池 ${doc.quantity}块，提成 ${doc.totalCommission}元（${doc.commissionPer}元/块 × ${doc.quantity}）`,
            type: 'bookkeeping',
            data: doc
          });
        }

        if (parsed.intent === 'query') {
          const stats = await statsService.getStats(ctx.db, ctx._);
          const reply = [
            `📊 销售统计`,
            `━━━━━━━━━━━━━━━`,
            `总销量：${stats.totalQuantity}块`,
            `总提成：${stats.totalCommission}元`,
            `总单数：${stats.totalRecords}单`,
            ...Object.entries(stats.byModel).map(
              ([model, data]) => `${model}型号：${data.quantity}块，提成 ${data.commission}元`
            )
          ].join('\n');

          return success({ text: reply, type: 'query', data: stats });
        }
      } catch (parseErr) {
        // JSON found but not valid - fall through to text response
        console.error('JSON parse error:', parseErr.message);
      }
    }

    return success({ text, type: 'general' });
  } catch (e) {
    console.error('Chat error:', e);
    return serverError(e.message);
  }
}

module.exports = { handleChat };
