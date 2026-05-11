const api = require('../../utils/api');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    models: [],
    selectedModel: '',
    customModel: '',
    quantity: '',
    customerName: '',
    notes: '',
    commissionPreview: 0,
    submitting: false
  },

  onShow() {
    // 从同一份存储读取所有型号
    const allModels = wx.getStorageSync('battery_models') || ['A', 'B', 'C'];
    const descMap = { A: '普通型', B: '加强型', C: '豪华型' };
    this.setData({
      models: allModels.map(m => ({ value: m, label: m, desc: descMap[m] || '' }))
    });
  },

  selectModel(e) {
    const val = e.currentTarget.dataset.value;
    this.setData({
      selectedModel: this.data.selectedModel === val ? '' : val,
      customModel: ''
    });
  },

  onCustomModelInput(e) {
    this.setData({
      customModel: e.detail.value,
      selectedModel: ''
    });
  },

  onQuantityInput(e) {
    const qty = parseInt(e.detail.value) || 0;
    const commissionPreview = qty > 0 ? qty * 50 : 0;
    this.setData({ quantity: e.detail.value, commissionPreview });
  },

  onCustomerInput(e) {
    this.setData({ customerName: e.detail.value });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  async submit() {
    const batteryModel = this.data.selectedModel || this.data.customModel.trim();

    if (!batteryModel) {
      return util.showError('请选择或输入电池型号');
    }
    const qty = parseInt(this.data.quantity);
    if (!qty || qty <= 0) {
      return util.showError('请输入有效的数量');
    }

    this.setData({ submitting: true });
    try {
      const user = app.getUser();
      await api.createSale({
        batteryModel,
        quantity: qty,
        customerName: this.data.customerName.trim() || undefined,
        notes: this.data.notes.trim() || undefined,
        _openid: user ? user.openid : undefined,
        _role: user ? user.role : 'salesperson'
      });
      util.showSuccess('记账成功！');
      this.setData({
        selectedModel: '',
        customModel: '',
        quantity: '',
        customerName: '',
        notes: '',
        commissionPreview: 0
      });
    } catch (err) {
      util.showError(err.message || '记账失败');
    } finally {
      this.setData({ submitting: false });
    }
  }
});
