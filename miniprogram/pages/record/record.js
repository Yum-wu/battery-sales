const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    models: util.MODEL_OPTIONS,
    selectedModel: '',
    quantity: '',
    customerName: '',
    notes: '',
    commissionPreview: 0,
    submitting: false
  },

  selectModel(e) {
    this.setData({ selectedModel: e.currentTarget.dataset.value });
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
    const { selectedModel, quantity, customerName, notes } = this.data;

    if (!selectedModel) {
      return util.showError('请选择电池型号');
    }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      return util.showError('请输入有效的数量');
    }

    this.setData({ submitting: true });
    try {
      await api.createSale({
        batteryModel: selectedModel,
        quantity: qty,
        customerName: customerName.trim() || undefined,
        notes: notes.trim() || undefined
      });
      util.showSuccess('记账成功！');
      // 重置表单
      this.setData({
        selectedModel: '',
        quantity: '',
        customerName: '',
        notes: ''
      });
    } catch (err) {
      util.showError(err.message || '记账失败');
    } finally {
      this.setData({ submitting: false });
    }
  }
});
