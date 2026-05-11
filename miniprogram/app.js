const user = require('./utils/user');

App({
  globalData: {
    apiBaseUrl: 'https://hermes-d7gvpvoah15874de5.service.tcloudbase.com',
    currentUser: null
  },

  onLaunch() {
    // 小程序启动时自动登录
    this.login();
  },

  async login() {
    try {
      const userInfo = await user.login();
      this.globalData.currentUser = userInfo;
      console.log('登录成功：', userInfo);

      // 如果没用真实微信昵称，弹窗让用户自己输入名字
      if (!userInfo.nickName || userInfo.nickName === '开发用户') {
        this.setNickName();
      }
    } catch (err) {
      console.error('登录失败', err);
    }
  },

  // 弹出窗口让用户设置自己的名字
  async setNickName() {
    // 用 wx.showModal 的 editable 模式（基础库 2.16.0+ 支持）
    const res = await wx.showModal({
      title: '设置你的名字',
      content: '请填写你的姓名，销售记录会显示登记人',
      editable: true,
      placeholderText: '输入姓名...'
    });

    if (res.confirm && res.content && res.content.trim()) {
      const name = res.content.trim();
      // 更新内存
      this.globalData.currentUser.nickName = name;
      // 更新缓存
      const cached = wx.getStorageSync('user_info') || {};
      cached.nickName = name;
      wx.setStorageSync('user_info', cached);
      console.log('名字已设置：', name);
    }
  },

  getUser() {
    return this.globalData.currentUser;
  }
});
