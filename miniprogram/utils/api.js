const app = getApp();

const API_BASE = () => app.globalData.apiBaseUrl;

/**
 * 获取当前用户身份，附加到请求参数中
 */
function getUserContext() {
  const user = app.globalData.currentUser;
  if (user) {
    return { _openid: user.openid, _role: user.role, _nickName: user.nickName || '' };
  }
  return {};
}

function request(method, path, data, extra = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE()}${path}`;

    // 自动附加用户身份
    const userCtx = getUserContext();
    const requestData = data ? { ...data, ...userCtx } : { ...userCtx };

    const config = {
      url,
      method,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data.data);
        } else if (res.statusCode === 403) {
          // 权限不足
          reject({ code: 403, message: res.data?.error || '权限不足' });
        } else {
          reject({ code: res.statusCode, message: res.data?.error || '请求失败' });
        }
      },
      fail(err) {
        reject({ code: -1, message: '网络异常，请检查网络连接' });
      }
    };

    if (method === 'GET') {
      config.data = requestData;
    } else {
      config.data = requestData;
    }

    // Merge extra options (e.g. timeout)
    Object.assign(config, extra);

    wx.request(config);
  });
}

module.exports = {
  // 服务信息
  getHealth() {
    return request('GET', '/health');
  },

  // 用户登录（用 code 换 openid）
  login(code) {
    return request('POST', '/auth/login', { code });
  },

  // 销售记录 CRUD
  createSale(data) {
    return request('POST', '/sales', data);
  },

  getSales(query = {}) {
    // 返回完整响应结构（含 data 和 pagination）
    const userCtx = getUserContext();
    const requestData = { ...query, ...userCtx };
    return new Promise((resolve, reject) => {
      wx.request({
        url: API_BASE() + '/sales',
        data: requestData,
        header: { 'Content-Type': 'application/json' },
        success(res) {
          if (res.statusCode === 200) {
            const body = res.data;
            resolve({
              data: body.data || [],
              pagination: body.pagination || { page: 1, totalPages: 1 }
            });
          } else {
            reject({ message: res.data?.error || '请求失败' });
          }
        },
        fail() {
          reject({ message: '网络异常' });
        }
      });
    });
  },

  getSale(id) {
    return request('GET', `/sales/${id}`);
  },

  updateSale(id, data) {
    return request('PUT', `/sales/${id}`, data);
  },

  deleteSale(id) {
    return request('DELETE', `/sales/${id}`);
  },

  // 统计数据
  getStats(query = {}) {
    return request('GET', '/stats', query);
  },

  // 常用功能：发送消息时带超时
  sendMessage(message, history = []) {
    return request('POST', '/chat', { message, history }, { timeout: 30000 });
  }
};
