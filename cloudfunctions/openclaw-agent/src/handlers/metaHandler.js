const { success } = require('../utils/response');

function handleRoot() {
  return success({
    status: 'ok',
    service: 'OpenClaw AI Chat Agent (Cloud Function)',
    description: 'AI Chat Agent using CloudBase AI models with WeChat Developer tokens',
    endpoints: {
      chat: 'POST /chat',
      health: 'GET /health',
      models: 'GET /models',
      sales: 'POST /sales | GET /sales | GET /sales/:id | PUT /sales/:id | DELETE /sales/:id',
      stats: 'GET /stats'
    }
  });
}

function handleHealth() {
  return success({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}

function handleModels() {
  return success({
    available_models: [
      {
        provider: 'hunyuan-exp',
        models: [
          'hunyuan-2.0-instruct-20251111',
          'hunyuan-2.0-thinking-20251109',
          'hunyuan-t1-latest',
          'hunyuan-turbos-latest'
        ],
        recommended: 'hunyuan-2.0-instruct-20251111'
      },
      {
        provider: 'deepseek',
        models: ['deepseek-v3.2', 'deepseek-v3-0324', 'deepseek-r1-0528'],
        recommended: 'deepseek-v3.2'
      }
    ],
    current_config: {
      provider: process.env.AI_MODEL_PROVIDER || 'hunyuan-exp',
      model: process.env.AI_MODEL_NAME || 'hunyuan-2.0-instruct-20251111'
    }
  });
}

module.exports = { handleRoot, handleHealth, handleModels };
