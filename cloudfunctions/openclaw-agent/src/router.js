const { error, corsPreflight } = require('./utils/response');
const { handleRoot, handleHealth, handleModels } = require('./handlers/metaHandler');
const {
  handleCreateSale,
  handleQuerySales,
  handleGetSale,
  handleUpdateSale,
  handleDeleteSale,
  handleStats
} = require('./handlers/salesHandler');
const { handleChat } = require('./handlers/chatHandler');

function parseBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

function extractId(path) {
  const parts = path.split('/').filter(Boolean);
  return parts.length >= 2 && parts[0] === 'sales' ? parts[1] : null;
}

async function routeRequest(ctx, event) {
  const method = event.httpMethod || 'GET';
  const path = event.path || '/';
  const body = parseBody(event);
  const query = event.queryStringParameters || {};

  if (method === 'OPTIONS') {
    return corsPreflight();
  }

  // GET / or GET /
  if (method === 'GET' && path === '/') return handleRoot();

  // GET /health
  if (method === 'GET' && path === '/health') return handleHealth();

  // GET /models
  if (method === 'GET' && path === '/models') return handleModels();

  // POST /chat
  if (method === 'POST' && path === '/chat') return handleChat(ctx, body);

  // POST /sales
  if (method === 'POST' && path === '/sales') return handleCreateSale(ctx, body);

  // GET /stats
  if (method === 'GET' && path === '/stats') return handleStats(ctx, query);

  // GET /sales (list)
  if (method === 'GET' && path === '/sales') return handleQuerySales(ctx, query);

  // GET /sales/:id, PUT /sales/:id, DELETE /sales/:id
  const id = extractId(path);
  if (id) {
    if (method === 'GET') return handleGetSale(ctx, id);
    if (method === 'PUT') return handleUpdateSale(ctx, id, body);
    if (method === 'DELETE') return handleDeleteSale(ctx, id);
  }

  return error('Endpoint not found', 404);
}

module.exports = { routeRequest };
