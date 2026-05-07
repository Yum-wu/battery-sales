const app = getApp();

const API_BASE = () => app.globalData.apiBaseUrl;

function request(method, path, data, extra = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE()}${path}`;
    const config = {
      url,
      method,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data.data);
        } else {
          reject({ code: res.statusCode, message: res.data?.error || '请求失败' });
        }
      },
      fail(err) {
        reject({ code: -1, message: '网络异常，请检查网络连接' });
      }
    };

    if (method === 'GET') {
      config.data = data;
    } else {
      config.data = data;
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

  // 销售记录 CRUD
  createSale(data) {
    return request('POST', '/sales', data);
  },

  getSales(query = {}) {
    return request('GET', '/sales', query);
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

  // AI 对话
  sendMessage(message, history = []) {
    return request('POST', '/chat', { message, history });
  }
};
