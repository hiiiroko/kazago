// Injected into library page: simply refresh when asked
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'REFRESH') location.reload();
});