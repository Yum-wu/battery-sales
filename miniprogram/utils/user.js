/**
 * 用户身份和角色管理模块
 *
 * 角色说明：
 *   boss      — 老板：查看全部数据，编辑/删除任意记录
 *   salesperson — 销售员：只看自己的记录，只能新增不能编辑/删除
 *
 * 配置方式：
 *   在 BOSS_OPENIDS 数组中添加老板的微信 openid
 *   获取 openid 的方法：部署后让老板扫码登录，在控制台看日志输出
 */

const BOSS_OPENIDS = [
  // 在这里添加老板的 openid，例如：
  // 'o9cq805qbs2Cn4VaWQpGCl-Zrq6k',
  'dev_0a1EHu10',
];

// 缓存，防止重复登录
let loginPromise = null;

/**
 * 判断是否为老板角色
 */
function isBoss(openid) {
  return BOSS_OPENIDS.includes(openid);
}

/**
 * 获取角色中文名
 */
function getRoleName(role) {
  return role === 'boss' ? '老板' : '销售员';
}

/**
 * 微信登录，获取 openid
 * 返回 { openid, role, roleName }
 */
function login() {
  if (loginPromise) return loginPromise;

  loginPromise = new Promise((resolve) => {
    // 先尝试从缓存读取
    const cached = wx.getStorageSync('user_info');
    if (cached && cached.openid) {
      const role = isBoss(cached.openid) ? 'boss' : 'salesperson';
      const userInfo = { ...cached, role, roleName: getRoleName(role) };
      wx.setStorageSync('user_info', userInfo);
      return resolve(userInfo);
    }

    // 保存登录结果到缓存并返回
    function saveAndResolve(userInfo) {
      const role = isBoss(userInfo.openid) ? 'boss' : 'salesperson';
      const result = { ...userInfo, role, roleName: getRoleName(role) };
      wx.setStorageSync('user_info', result);
      resolve(result);
    }

    // wx.login 加超时兜底（开发工具 appid 无效时会一直超时）
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      console.warn('wx.login 超时，使用降级模式');
      saveAndResolve({ openid: 'dev_timedout', nickName: '开发用户' });
    }, 5000);

    wx.login({
      success(res) {
        if (timedOut) return;
        clearTimeout(timer);
        if (res.code) {
          exchangeCode(res.code).then(userInfo => {
            saveAndResolve(userInfo);
          }).catch(err => {
            console.error('登录失败', err);
            saveAndResolve({ openid: 'dev_fallback', nickName: '开发用户' });
          });
        } else {
          saveAndResolve({ openid: 'dev_fallback', nickName: '开发用户' });
        }
      },
      fail(err) {
        if (timedOut) return;
        clearTimeout(timer);
        console.warn('wx.login 失败，使用降级模式', err);
        saveAndResolve({ openid: 'dev_fallback', nickName: '开发用户' });
      }
    });
  });

  return loginPromise;
}

/**
 * 用 code 换取 openid
 * 优先调云函数接口，失败则用模拟模式（开发调试用）
 */
async function exchangeCode(code) {
  // 尝试调云函数
  const app = getApp();
  const url = `${app.globalData.apiBaseUrl}/auth/login`;

  try {
    const resp = await new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'POST',
        data: { code },
        header: { 'Content-Type': 'application/json' },
        success: res => {
          if (res.statusCode === 200 && res.data?.data?.openid) {
            resolve(res.data.data);
          } else {
            reject(new Error('接口返回格式异常'));
          }
        },
        fail: () => reject(new Error('网络请求失败'))
      });
    });
    return resp;
  } catch (err) {
    // 云函数接口不可用时降级：用 code 本身作为模拟 openid
    // ⚠️ 这是开发调试用，生产环境必须部署 /auth/login 接口
    console.warn('云函数登录接口不可用，使用降级模式（仅开发调试）');
    return {
      openid: `dev_${code.substring(0, 8)}`,
      nickName: '开发用户'
    };
  }
}

/**
 * 退出登录（清除缓存）
 */
function logout() {
  loginPromise = null;
  wx.removeStorageSync('user_info');
}

module.exports = {
  login,
  logout,
  isBoss,
  getRoleName
};
