const api = require('../../utils/api');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    messages: [],
    input: '',
    sending: false,
    canSend: false,
    scrollToId: '',
    userRole: 'salesperson',
    roleName: '销售员',
    suggestions: [
      { text: '卖了3块A电池', icon: '📝' },
      { text: '今天卖了多少钱', icon: '📊' },
      { text: '这个月报表', icon: '📅' }
    ]
  },

  onLoad() {
    // 进入页面时加一条欢迎语
    this.setData({
      messages: [{
        role: 'assistant',
        text: '你好！我是电池销售助手小电🔋\n\n你可以这样说：\n• "卖了3块A电池给张三"\n• "今天卖了多少钱"\n• "看看这个月的报表"',
        time: util.formatTime(new Date()),
        table: null
      }]
    });
  },

  onShow() {
    const user = app.getUser();
    if (user) {
      this.setData({
        userRole: user.role,
        roleName: user.roleName
      });
    }
  },

  onInput(e) {
    const val = e.detail.value;
    this.setData({
      input: val,
      canSend: val.trim().length > 0
    });
  },

  handleSend() {
    const that = this;
    const content = that.data.input.trim();
    if (!content || that.data.sending) return;

    console.log('handleSend: 发送消息', content);

    // 先显示用户消息
    const userMsg = {
      role: 'user',
      text: content,
      time: util.formatTime(new Date()),
      table: null
    };
    const newMsgs = [...that.data.messages, userMsg];
    that.setData({
      messages: newMsgs,
      input: '',
      canSend: false,
      sending: true
    }, () => {
      console.log('handleSend: 用户消息已更新, messages长度=', that.data.messages.length);
    });

    // 滚动到底部
    that.scrollToBottom();

    // 调 API
    api.sendMessage(content).then(function(res) {
      const reply = {
        role: 'assistant',
        text: (res && res.reply) ? res.reply : (res && res.text ? res.text : '抱歉，我没有理解您的意思，请再试一次。'),
        time: util.formatTime(new Date()),
        table: (res && res.table) || null
      };
      that.setData({
        messages: [...that.data.messages, reply],
        sending: false
      });
      that.scrollToBottom();
    }).catch(function(err) {
      console.error('handleSend: API失败', err);
      that.setData({
        messages: [...that.data.messages, {
          role: 'assistant',
          text: '请求失败：' + (err.message || '网络错误'),
          time: util.formatTime(new Date()),
          table: null
        }],
        sending: false
      });
      that.scrollToBottom();
    });
  },

  onSuggestion(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({
      input: text,
      canSend: true
    });
  },

  onConfirm() {
    this.handleSend();
  },

  scrollToBottom() {
    this.setData({ scrollToId: 'msg-end' });
    setTimeout(() => {
      this.setData({ scrollToId: 'msg-end' });
    }, 100);
  }
});
