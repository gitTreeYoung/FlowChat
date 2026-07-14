// FlowChat Service Worker
// 负责：iframe 导航监听、bridge + highlight 注入、消息路由

const AI_DOMAINS = [
  'claude.ai',
  'chatgpt.com', 'chat.openai.com',
  'gemini.google.com',
  'grok.com',
  'doubao.com',
  'kimi.moonshot.cn', 'kimi.ai', 'kimi.com',
  'chat.deepseek.com',
  'metaso.cn',
  'yuanbao.tencent.com',
  'zhida.zhihu.com',
  'chatglm.cn',
  'agent.minimaxi.com',
  'poe.com',
  'copilot.microsoft.com',
  'z.ai',
  'yiyan.baidu.com',
];

function getAIPlatform(url) {
  try {
    const h = new URL(url).hostname;
    if (h.includes('claude.ai'))                                          return 'claude';
    if (h.includes('chatgpt.com') || h.includes('chat.openai.com'))      return 'chatgpt';
    if (h.includes('gemini.google.com'))                                  return 'gemini';
    if (h.includes('grok.com'))                                           return 'grok';
    if (h.includes('doubao.com'))                                         return 'doubao';
    if (h.includes('kimi.moonshot.cn') || h.includes('kimi.ai') || h.includes('kimi.com')) return 'kimi';
    if (h.includes('deepseek.com'))                                       return 'deepseek';
    if (h.includes('metaso.cn'))                                          return 'metaso';
    if (h.includes('yuanbao.tencent.com'))                                return 'yuanbao';
    if (h.includes('zhida.zhihu.com'))                                    return 'zhida';
    if (h.includes('chatglm.cn'))                                         return 'chatglm';
    if (h.includes('agent.minimaxi.com'))                                 return 'minimax';
    if (h.includes('poe.com'))                                            return 'poe';
    if (h.includes('copilot.microsoft.com'))                              return 'copilot';
    if (h === 'z.ai' || h.endsWith('.z.ai'))                              return 'zai';
    if (h.includes('yiyan.baidu.com'))                                    return 'yiyan';
  } catch {}
  return null;
}

const injectedFrames    = new Set();
const framebustedFrames = new Set();  // 已注入 frame-bust 覆盖的 frame
const CTX_OPEN_SIDE_PANEL = 'flowchat-open-side-panel';
const flowChatPorts = new Set();

async function setupActionContextMenus() {
  if (!chrome.contextMenus) return;
  await new Promise(resolve => chrome.contextMenus.removeAll(resolve));
  await new Promise(resolve => {
    chrome.contextMenus.create({
      id: CTX_OPEN_SIDE_PANEL,
      title: chrome.i18n.getMessage('ctx_open_side_panel') || '在侧边栏打开 FlowChat',
      contexts: ['action'],
    }, () => resolve());
  });
}

async function openFlowChatSidePanel(tabId) {
  if (!chrome.sidePanel) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('flowchat.html?mode=sidepanel') });
    return;
  }

  try {
    if (tabId) await chrome.sidePanel.open({ tabId });
    else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.sidePanel.open(tab?.windowId != null ? { windowId: tab.windowId } : {});
    }
  } catch (err) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.windowId != null) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      return;
    }
    throw err;
  }
}

setupActionContextMenus().catch(err => console.warn('[FlowChat] 右键菜单初始化失败:', err.message));

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CTX_OPEN_SIDE_PANEL) return;
  openFlowChatSidePanel(tab?.id).catch(err => console.warn('[FlowChat] 打开侧边栏失败:', err.message));
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'FLOWCHAT_SIDE_PANEL') return;
  flowChatPorts.add(port);
  port.onDisconnect.addListener(() => flowChatPorts.delete(port));
});

// 对已知使用 JS frame-busting 的平台，在 document_start 注入覆盖脚本
// 目前针对 grok.com — 其页面在加载时检测 window.top !== window.self 并跳转
const FRAMEBUST_DOMAINS = ['grok.com', 'x.com'];

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId === 0) return;
  try {
    const host = new URL(details.url).hostname;
    if (!FRAMEBUST_DOMAINS.some(d => host.includes(d))) return;
  } catch { return; }

  const frameKey = `fb-${details.tabId}-${details.frameId}`;
  if (framebustedFrames.has(frameKey)) return;
  framebustedFrames.add(frameKey);

  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId, frameIds: [details.frameId] },
      world:  'MAIN',
      injectImmediately: true,
      func: () => {
        // 覆盖 frame-busting 检测属性，让页面认为自己是顶层文档
        try {
          // 先保存真实 parent 引用，供 FlowChat picker postMessage 使用
          // （覆盖后 window.parent 会返回 window 自身，导致 picker 消息发给自己）
          window.__fc_real_parent__ = window.parent;
          Object.defineProperty(window, 'top',         { get: () => window, configurable: true });
          Object.defineProperty(window, 'parent',      { get: () => window, configurable: true });
          Object.defineProperty(window, 'frameElement',{ get: () => null,   configurable: true });
        } catch {}
        // 尝试覆盖 ancestorOrigins（部分平台用此检测 iframe 上下文）
        try {
          Object.defineProperty(Location.prototype, 'ancestorOrigins', {
            get() {
              // 如果已被 frame-bust，返回空列表
              if (window.__fc_real_parent__) {
                return Object.assign(Object.create(DOMStringList.prototype), { length: 0, item: () => null, contains: () => false });
              }
              return Object.getOwnPropertyDescriptor(Location.prototype, 'ancestorOrigins')?.get?.call(this);
            },
            configurable: true
          });
        } catch {}
      }
    });
  } catch (err) {
    console.warn('[FlowChat] frame-bust 覆盖注入失败:', err.message);
  }
});

// 监听 iframe 内页面加载，注入 bridge.js + highlight.js
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) return;

  const platform = getAIPlatform(details.url);
  if (!platform) return;

  const frameKey = `${details.tabId}-${details.frameId}`;
  if (injectedFrames.has(frameKey)) return;

  try {
    // 同时注入 bridge（消息/输入）和 highlight（高亮引擎）
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId, frameIds: [details.frameId] },
      files: ['bridge.js', 'highlight.js']
    });
    injectedFrames.add(frameKey);
    console.log(`[FlowChat] bridge + highlight 已注入: ${platform} (frame ${details.frameId})`);
  } catch (err) {
    console.warn(`[FlowChat] 注入失败: ${platform}`, err.message);
  }
});

// 清理已关闭标签页的记录
chrome.tabs.onRemoved.addListener((tabId) => {
  for (const key of injectedFrames)    { if (key.startsWith(`${tabId}-`))    injectedFrames.delete(key); }
  for (const key of framebustedFrames) { if (key.startsWith(`fb-${tabId}-`)) framebustedFrames.delete(key); }
});

// 消息路由
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'OPEN_FLOWCHAT':
      chrome.tabs.create({ url: chrome.runtime.getURL('flowchat.html') });
      sendResponse({ success: true });
      break;

    case 'SEND_TO_IFRAME':
      // 向指定 frame 发消息（REMOVE_HIGHLIGHT / CLEAR_ALL_HIGHLIGHTS 走此路径）
      forwardToIframe(message.tabId, message.frameId, message.payload)
        .then(result => sendResponse({ success: true, result }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'BRIDGE_READY':
      // 补充 sender 信息（frameId、tabId），供 flowchat.js 记录 frame 用于定向消息
      broadcastToFlowChat({
        ...message,
        frameId: sender.frameId,
        tabId:   sender.tab?.id
      });
      sendResponse({ success: true });
      break;

    case 'GENERATION_COMPLETE':
      // AI 停止输出，转发给 flowchat.js 触发消息队列处理
      broadcastToFlowChat({
        ...message,
        frameId: sender.frameId,
        tabId:   sender.tab?.id
      });
      sendResponse({ success: true });
      break;

    case 'AI_RESPONSE':
    case 'AI_STREAMING':
      broadcastToFlowChat({
        ...message,
        frameId: sender.frameId,
        tabId:   sender.tab?.id
      });
      sendResponse({ success: true });
      break;

    case 'PICKER_SELECTED':
      broadcastToFlowChat(message);
      sendResponse({ success: true });
      break;

    case 'HIGHLIGHT_ADDED':
      // 补充 sender 信息（frameId、tabId），flowchat.js 存储后用于反向删除
      broadcastToFlowChat({
        ...message,
        frameId: sender.frameId,
        tabId:   sender.tab?.id
      });
      sendResponse({ success: true });
      break;

    case 'HIGHLIGHT_REMOVED':
      broadcastToFlowChat(message);
      sendResponse({ success: true });
      break;

    case 'BRIDGE_DIAGNOSTIC':
      broadcastToFlowChat(message);
      sendResponse({ success: true });
      break;

    case 'GET_IFRAME_INFO':
      getIframeInfo(message.tabId)
        .then(info => sendResponse({ success: true, info }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'GET_FRAME_URLS':
      // 获取当前标签页所有 frame 的 URL，用于保存会话组
      chrome.webNavigation.getAllFrames({ tabId: sender.tab?.id })
        .then(frames => {
          const urlMap = {};
          for (const f of (frames || [])) urlMap[f.frameId] = f.url;
          sendResponse({ success: true, urlMap });
        })
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'unknown message type' });
  }
});

async function forwardToIframe(tabId, frameId, payload) {
  return await chrome.tabs.sendMessage(tabId, payload, { frameId });
}

async function broadcastToFlowChat(message) {
  for (const port of [...flowChatPorts]) {
    try { port.postMessage(message); }
    catch { flowChatPorts.delete(port); }
  }

  const tabs = await chrome.tabs.query({});
  const flowchatUrl = chrome.runtime.getURL('flowchat.html');
  for (const tab of tabs) {
    if (tab.url && tab.url.startsWith(flowchatUrl)) {
      try { await chrome.tabs.sendMessage(tab.id, message); } catch {}
    }
  }
}

async function getIframeInfo(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  return frames
    .filter(f => f.frameId !== 0 && getAIPlatform(f.url))
    .map(f => ({
      frameId:  f.frameId,
      url:      f.url,
      platform: getAIPlatform(f.url)
    }));
}

// 点击扩展图标时，始终打开新 FlowChat 标签页（支持多个独立对话窗口）
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('flowchat.html');
  await chrome.tabs.create({ url });
});

console.log('[FlowChat] Service Worker 已启动');

// ─────────────────────────────────────────────
// 更新日志热更新
// ─────────────────────────────────────────────
const CHANGELOG_URL =
  'https://raw.githubusercontent.com/gitTreeYoung/flowchat-extension/main/docs/changelog.json';

async function fetchChangelog() {
  try {
    const res  = await fetch(CHANGELOG_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return;

    const { changelog_last_seen = '' } = await chrome.storage.local.get('changelog_last_seen');
    const latestVersion = data[0].version || '';

    await chrome.storage.local.set({ changelog_cache: data });

    // 新版本且用户还没看过
    if (latestVersion && latestVersion !== changelog_last_seen) {
      await chrome.storage.local.set({ changelog_unread: true });
      broadcastToFlowChat({ type: 'CHANGELOG_UPDATE', unread: true });
    }
  } catch (e) {
    console.warn('[FlowChat] changelog fetch failed', e);
  }
}

// 扩展安装 / 更新时立即拉取
chrome.runtime.onInstalled.addListener(() => fetchChangelog());
// 浏览器重启时（SW 重新激活）也拉取
chrome.runtime.onStartup.addListener(() => fetchChangelog());
