// Service worker: keep cookie cache & open login page if needed
const COOKIE_NAME = 'ASP.NET_SessionId';
const DOMAIN = 'kjyy.ccnu.edu.cn';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_SID') {
    chrome.cookies.get({ url: `http://${DOMAIN}`, name: COOKIE_NAME })
      .then(cookie => sendResponse({ sid: cookie?.value || '' }))
      .catch(() => sendResponse({ sid: '' }));
    return true; // keep channel open for async
  }
  if (msg.type === 'OPEN_LOGIN') {
    chrome.tabs.create({ url: `http://${DOMAIN}/clientweb/xcus/ic2/Default.aspx` });
  }
});