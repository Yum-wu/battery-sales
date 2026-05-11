const api = require('../../utils/api');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    loading: true,
    stats: null,
    todayQuantity: 0,
    avgQuantity: 0,
    maxQty: 0,
    modelList: [],
    userRole: 'salesperson',
    roleName: '销售员',
    scopeLabel: '我的数据',
    userNickName: '',
    isBoss: false
  },

  onShow() {
    const user = app.getUser();
    if (user) {
      this.setData({
        userRole: user.role,
        roleName: user.roleName,
        scopeLabel: user.role === 'boss' ? '全部数据' : '我的数据',
        userNickName: user.nickName || '',
        isBoss: user.role === 'boss'
      });
    }
    this.loadStats();
  },

  async loadStats() {
    this.setData({ loading: true });
    try {
      const user = app.getUser();
      const params = {};
      if (user) {
        params._openid = user.openid;
        params._role = user.role;
      }

      const stats = await api.getStats(params);
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

        // 按销量排序显示所有型号
        const modelList = Object.entries(stats.byModel || {})
          .map(([name, data]) => ({
            name,
            qty: data.quantity || 0,
            barClass: ['A', 'B', 'C'].includes(name) ? 'model-bar-' + name : 'model-bar-custom'
          }))
          .sort((a, b) => b.qty - a.qty);

        const maxQty = Math.max(...modelList.map(m => m.qty), 1);

        this.setData({ stats, todayQuantity, avgQuantity, modelList, maxQty, loading: false });
      }
    } catch (err) {
      util.showError('加载统计数据失败');
      this.setData({ loading: false });
    }
  },

  // 修改登记人名字
  async onChangeName() {
    const user = app.getUser();
    const res = await wx.showModal({
      title: '修改登记人名字',
      content: '当前名字：' + (user.nickName || '未设置'),
      editable: true,
      placeholderText: '输入你的姓名...'
    });
    if (res.confirm && res.content && res.content.trim()) {
      const name = res.content.trim();
      user.nickName = name;
      app.globalData.currentUser = user;
      const cached = wx.getStorageSync('user_info') || {};
      cached.nickName = name;
      wx.setStorageSync('user_info', cached);
      this.setData({ userNickName: name });
      wx.showToast({ title: '名字已更新', icon: 'success' });
    }
  },

  // 读取所有型号（含 A/B/C 预设）
  getAllModels() {
    const saved = wx.getStorageSync('battery_models');
    // 首次使用：初始化为 A/B/C
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      const defaults = ['A', 'B', 'C'];
      wx.setStorageSync('battery_models', defaults);
      return defaults;
    }
    return saved;
  },

  // 点击型号行直接编辑（仅老板）
  onModelTap(e) {
    if (!this.data.isBoss) return;
    const name = e.currentTarget.dataset.name;
    const models = this.getAllModels();

    wx.showActionSheet({
      itemList: ['修改名称', '删除此型号'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.editModel(name);
        } else if (res.tapIndex === 1) {
          const list = models.filter(m => m !== name);
          wx.setStorageSync('battery_models', list);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // 电池型号管理
  onManageModels() {
    const isBoss = this.data.isBoss;
    const models = this.getAllModels();

    if (!isBoss) {
      wx.showModal({
        title: '当前电池型号',
        content: models.join('、'),
        showCancel: false
      });
      return;
    }

    wx.showActionSheet({
      itemList: [
        ...models.map(m => m + ' ✕'),
        '＋ 添加新型号'
      ],
      success: (res) => {
        const idx = res.tapIndex;
        if (idx === models.length) {
          this.addModel();
        } else {
          wx.showActionSheet({
            itemList: ['修改名称', '删除此型号'],
            success: (r) => {
              if (r.tapIndex === 0) {
                this.editModel(models[idx]);
              } else if (r.tapIndex === 1) {
                const list = models.filter(m => m !== models[idx]);
                wx.setStorageSync('battery_models', list);
                wx.showToast({ title: '已删除', icon: 'success' });
              }
            }
          });
        }
      }
    });
  },

  async addModel() {
    const res = await wx.showModal({
      title: '添加电池型号',
      content: '输入型号名称',
      editable: true,
      placeholderText: '例如：12V20A'
    });
    if (res.confirm && res.content && res.content.trim()) {
      const name = res.content.trim();
      const models = this.getAllModels();
      if (models.includes(name)) {
        wx.showToast({ title: '该型号已存在', icon: 'none' });
        return;
      }
      models.push(name);
      wx.setStorageSync('battery_models', models);
      wx.showToast({ title: '已添加：' + name, icon: 'success' });
    }
  },

  async editModel(oldName) {
    const res = await wx.showModal({
      title: '修改型号',
      content: '原名称：' + oldName,
      editable: true,
      placeholderText: '输入新名称'
    });
    if (res.confirm && res.content && res.content.trim()) {
      const newName = res.content.trim();
      const models = this.getAllModels();
      const idx = models.indexOf(oldName);
      if (idx === -1) return;
      if (models.includes(newName)) {
        wx.showToast({ title: '该名称已存在', icon: 'none' });
        return;
      }
      models[idx] = newName;
      wx.setStorageSync('battery_models', models);
      wx.showToast({ title: '已修改为：' + newName, icon: 'success' });
    }
  },

  goChat() {
    wx.switchTab({ url: '/pages/chat/chat' });
  }
});
