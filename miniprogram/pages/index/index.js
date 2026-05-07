const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    loading: true,
    stats: null,
    todayQuantity: 0,
    avgQuantity: 0,
    maxQty: 0,
    modelData: { A: 0, B: 0, C: 0 }
  },

  onShow() {
    this.loadStats();
  },

  async loadStats() {
    this.setData({ loading: true });
    try {
      const stats = await api.getStats();
      if (stats) {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' +
          String(today.getMonth() + 1).padStart(2, '0') + '-' +
          String(today.getDate()).padStart(2, '0');

        const todayEntry = (stats.byDay || []).find(d => d.date === todayStr);
        const todayQuantity = todayEntry ? todayEntry.quantity : 0;
        const avgQuantity = stats.totalRecords > 0
          ? Math.round(stats.totalQuantity / stats.totalRecords)
          : 0;

        const modelData = {
          A: stats.byModel?.A?.quantity || 0,
          B: stats.byModel?.B?.quantity || 0,
          C: stats.byModel?.C?.quantity || 0
        };
        const maxQty = Math.max(modelData.A, modelData.B, modelData.C, 1);

        this.setData({ stats, todayQuantity, avgQuantity, modelData, maxQty, loading: false });
      }
    } catch (err) {
      util.showError('加载统计数据失败');
      this.setData({ loading: false });
    }
  },

  goChat() {
    wx.switchTab({ url: '/pages/chat/chat' });
  }
});
