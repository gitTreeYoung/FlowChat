// Apply i18n on load — 直接 fetch messages.json，支持 OS 中文 + Chrome 英文的场景
(async function applyPopupI18n() {
  function prefersChinese() {
    const uiLang = (chrome.i18n.getUILanguage() || '').toLowerCase();
    if (uiLang.startsWith('zh')) return true;
    return (navigator.languages || [navigator.language || '']).some(l => l.toLowerCase().startsWith('zh'));
  }
  let messages = {};
  try {
    const locale = prefersChinese() ? 'zh_CN' : 'en';
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    messages = await (await fetch(url)).json();
  } catch (e) { /* 保留 HTML fallback 文本 */ }

  const m = key => messages[key]?.message || chrome.i18n.getMessage(key) || '';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const text = m(el.dataset.i18n);
    if (text) el.textContent = text;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const text = m(el.dataset.i18nPlaceholder);
    if (text) el.placeholder = text;
  });
})();

document.getElementById('btn-open').addEventListener('click', async () => {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('flowchat.html') });
    window.close();
  } catch (err) {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_FLOWCHAT' });
      window.close();
    } catch (e) {
      window.open(chrome.runtime.getURL('flowchat.html'));
      window.close();
    }
  }
});
