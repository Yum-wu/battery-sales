function formatTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function showSuccess(msg) {
  wx.showToast({ title: msg, icon: 'success', duration: 2000 });
}

function showError(msg) {
  wx.showToast({ title: msg, icon: 'none', duration: 3000 });
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

const MODEL_OPTIONS = [
  { value: 'A', label: 'A型号', desc: '单价高，提成50元/块' },
  { value: 'B', label: 'B型号', desc: '单价中，提成50元/块' },
  { value: 'C', label: 'C型号', desc: '单价低，提成50元/块' }
];

function getModelLabel(value) {
  // 预设型号映射
  const map = { A: 'A型', B: 'B型', C: 'C型' };
  return map[value] || value;
}

module.exports = {
  formatTime,
  formatDate,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  MODEL_OPTIONS,
  getModelLabel
};
