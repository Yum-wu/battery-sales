const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    record: null,
    loading: true,
    editing: false,
    editQuantity: '',
    editCustomer: '',
    editNotes: ''
  },

  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id);
    }
  },

  async loadDetail(id) {
    this.setData({ loading: true });
    try {
      const record = await api.getSale(id);
      record._modelLabel = util.getModelLabel(record.batteryModel);
      record._reportTime = util.formatTime(record.reportTime);
      record._createdAt = util.formatTime(record.createdAt);
      this.setData({ record, loading: false });
    } catch (err) {
      util.showError('加载失败');
      this.setData({ loading: false });
    }
  },

  // 切换编辑模式
  toggleEdit() {
    const { record, editing } = this.data;
    if (!editing) {
      this.setData({
        editing: true,
        editQuantity: String(record.quantity),
        editCustomer: record.customerName || '',
        editNotes: record.notes || ''
      });
    } else {
      this.setData({ editing: false });
    }
  },

  onQtyInput(e) {
    this.setData({ editQuantity: e.detail.value });
  },

  onCustomerInput(e) {
    this.setData({ editCustomer: e.detail.value });
  },

  onNotesInput(e) {
    this.setData({ editNotes: e.detail.value });
  },

  async saveEdit() {
    const { record, editQuantity, editCustomer, editNotes } = this.data;
    const qty = parseInt(editQuantity);
    if (!qty || qty <= 0) {
      return util.showError('请输入有效数量');
    }

    try {
      await api.updateSale(record._id, {
        quantity: qty,
        customerName: editCustomer.trim() || '',
        notes: editNotes.trim() || ''
      });
      util.showSuccess('更新成功');
      this.setData({ editing: false });
      this.loadDetail(record._id);
    } catch (err) {
      util.showError(err.message || '更新失败');
    }
  },

  async deleteRecord() {
    const { record } = this.data;
    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除 #${record.serialNumber} 这条记录吗？`,
      confirmText: '删除',
      confirmColor: '#e53e3e'
    });

    if (res.confirm) {
      try {
        await api.deleteSale(record._id);
        util.showSuccess('已删除');
        wx.navigateBack();
      } catch (err) {
        util.showError('删除失败');
      }
    }
  }
});
