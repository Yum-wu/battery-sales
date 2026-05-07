const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function wrap(body, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

function success(data) {
  return wrap({ success: true, data });
}

function created(data) {
  return wrap({ success: true, data }, 201);
}

function error(message, statusCode = 400, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return wrap(body, statusCode);
}

function notFound(message = 'Resource not found') {
  return error(message, 404);
}

function serverError(details) {
  return error('Internal server error', 500, details);
}

function corsPreflight() {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
}

module.exports = { success, created, error, notFound, serverError, corsPreflight };
