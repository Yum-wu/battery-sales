const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    records: [],
    loading: true,
    pagination: { page: 1, totalPages: 1 },
    filterModel: '',
    filterDate: ''
  },

  onShow() {
    if (this.data.records.length === 0) {
      this.loadSales(1);
    }
  },

  onPullDownRefresh() {
    this.loadSales(1, () => wx.stopPullDownRefresh());
  },

  async loadSales(page, callback) {
    if (page === 1) this.setData({ loading: true });
    const { filterModel, filterDate } = this.data;

    const query = { page, limit: 20 };
    if (filterModel) query.model = filterModel;
    if (filterDate) {
      query.startDate = filterDate;
      query.endDate = filterDate;
    }

    try {
      const result = await api.getSales(query);
      let records = result?.data || [];
      const pagination = result?.pagination || { page: 1, totalPages: 1 };

      records = records.map(r => ({
        ...r,
        _time: util.formatTime(r.reportTime),
        _modelLabel: util.getModelLabel(r.batteryModel)
      }));

      if (page === 1) {
        this.setData({ records, pagination, loading: false });
      } else {
        this.setData({ records: [...this.data.records, ...records], pagination, loading: false });
      }
    } catch (err) {
      util.showError('加载失败');
      this.setData({ loading: false });
    }
    callback && callback();
  },

  onReachBottom() {
    const { pagination } = this.data;
    if (pagination.page < pagination.totalPages) {
      this.loadSales(pagination.page + 1);
    }
  },

  onFilterModel(e) {
    const val = e.currentTarget.dataset.value;
    this.setData({ filterModel: this.data.filterModel === val ? '' : val });
    this.loadSales(1);
  },

  onFilterDate(e) {
    this.setData({ filterDate: e.detail.value });
    this.loadSales(1);
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});
