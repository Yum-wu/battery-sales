const tcb = require('@cloudbase/node-sdk');

let appCache = null;

function init() {
  if (appCache) return appCache;

  const app = tcb.init({
    env: process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID || 'your-cloudbase-env-id'
  });

  const db = app.database();
  const ai = app.ai();
  const _ = db.command;

  appCache = { app, db, ai, _ };
  return appCache;
}

module.exports = { init };
