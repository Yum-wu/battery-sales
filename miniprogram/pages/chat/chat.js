const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    messages: [{
      role: 'assistant',
      text: '你好！我是电池销售助手小电🔋\n\n你可以这样说：\n• "卖了3块A电池给张三"\n• "今天卖了多少钱"\n• "看看这个月的报表"\n• "查一下上周的"',
      time: '',
      table: null
    }],
    input: '',
    sending: false,
    recording: false
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  async send() {
    const content = this.data.input.trim();
    if (!content || this.data.sending) return;

    // 添加用户消息
    const userMsg = {
      role: 'user',
      text: content,
      time: util.formatTime(new Date()),
      table: null
    };
    this.setData({
      messages: [...this.data.messages, userMsg],
      input: '',
      sending: true
    });
    this.scrollToBottom();

    try {
      const result = await api.sendMessage(content);

      if (result && result.reply) {
        const reply = {
          role: 'assistant',
          text: result.reply,
          time: util.formatTime(new Date()),
          table: result.table || null
        };
        this.setData({
          messages: [...this.data.messages, reply],
          sending: false
        });
      } else {
        // 尝试兼容旧格式
        const fallbackText = result && result.text ? result.text : '抱歉，我没有理解您的意思，请再试一次。';
        this.setData({
          messages: [...this.data.messages, {
            role: 'assistant',
            text: fallbackText,
            time: util.formatTime(new Date()),
            table: null
          }],
          sending: false
        });
      }
    } catch (err) {
      this.setData({
        messages: [...this.data.messages, {
          role: 'assistant',
          text: '请求失败，请检查网络连接。',
          time: util.formatTime(new Date()),
          table: null
        }],
        sending: false
      });
    }

    this.scrollToBottom();
  },

  // 语音输入 — 使用微信键盘自带的语音输入
  // 用户在 input 里点话筒说话，微信自动转文字
  // 这里添加点击发送按钮的快捷键
  onConfirm() {
    this.send();
  },

  scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('#msg-end')
        .scrollIntoView();
    }, 150);
  }
});
