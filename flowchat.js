// FlowChat 主控制器 v3.0
// 新增：19 平台支持、多实例、消息队列、屏蔽元素、自动列数分布

// ============================================================
// i18n 国际化
// ============================================================

let _i18nData = {};

/**
 * 检测是否偏好中文：先看 Chrome UI 语言，再看 navigator.languages（包含 OS 语言）。
 * 这样即使 Chrome 装的是英文版，macOS/Windows 系统语言为中文时也能正确识别。
 */
function _prefersChinese() {
  const uiLang = (chrome.i18n.getUILanguage() || '').toLowerCase();
  if (uiLang.startsWith('zh')) return true;
  return (navigator.languages || [navigator.language || '']).some(l => l.toLowerCase().startsWith('zh'));
}

/** 直接 fetch _locales/{locale}/messages.json，绕过 Chrome 浏览器语言限制 */
async function loadI18nMessages() {
  const locale = _prefersChinese() ? 'zh_CN' : 'en';
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const resp = await fetch(url);
    _i18nData = await resp.json();
  } catch (e) {
    _i18nData = {};
    console.warn('[FlowChat] i18n load failed:', e);
  }
}

/** 获取国际化文本，支持替换参数 */
const msg = (key, substitutions) => {
  const entry = _i18nData[key];
  if (entry?.message) {
    let text = entry.message;
    if (substitutions && Array.isArray(substitutions) && entry.placeholders) {
      Object.keys(entry.placeholders).forEach((ph, i) => {
        if (substitutions[i] != null)
          text = text.replace(new RegExp('\\$' + ph + '\\$', 'gi'), substitutions[i]);
      });
    }
    return text;
  }
  // 回退到 chrome.i18n.getMessage（仅在 _i18nData 加载失败时使用）
  return chrome.i18n.getMessage(key, substitutions) || key;
};

const IS_SIDE_PANEL = new URLSearchParams(location.search).get('mode') === 'sidepanel';

/** 将所有 data-i18n* 属性的 DOM 元素替换为本地化文本 */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const text = msg(el.dataset.i18n);
    if (text) el.textContent = text;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const text = msg(el.dataset.i18nPlaceholder);
    if (text) el.placeholder = text;
  });
  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    const text = msg(el.dataset.i18nTooltip);
    if (text) el.dataset.tooltip = text;
  });
}

// ============================================================
// 平台 & 选择器常量
// ============================================================

const ALL_PLATFORMS = {
  claude:     { name: 'Claude',      url: 'https://claude.ai/',                  color: '#d97706', icon: 'C' },
  chatgpt:    { name: 'ChatGPT',     url: 'https://chatgpt.com/',                color: '#10a37f', icon: 'G' },
  gemini:     { name: 'Gemini',      url: 'https://gemini.google.com/app',       color: '#4285f4', icon: 'G' },
  grok:       { name: 'Grok',        url: 'https://grok.com/',                   color: '#111',    icon: 'X' },
  doubao:     { name: '豆包',        url: 'https://www.doubao.com/',             color: '#1677ff', icon: '豆' },
  kimi:       { name: 'Kimi',        url: 'https://www.kimi.com/',               color: '#2d6ef2', icon: 'K' },
  deepseek:   { name: 'DeepSeek',    url: 'https://chat.deepseek.com/',          color: '#4f46e5', icon: 'D' },
  metaso:     { name: '秘塔搜索',    url: 'https://metaso.cn/',                  color: '#f97316', icon: '秘' },
  yuanbao:    { name: '元宝',        url: 'https://yuanbao.tencent.com/',        color: '#059669', icon: '元' },
  zhida:      { name: '知乎直答',    url: 'https://zhida.zhihu.com/',            color: '#0d6efd', icon: '知' },
  chatglm:    { name: '智谱清言',    url: 'https://chatglm.cn/',                 color: '#2563eb', icon: '智' },
  minimax:    { name: 'MiniMax',     url: 'https://agent.minimaxi.com/',         color: '#7c3aed', icon: 'M' },
  poe:        { name: 'Poe',         url: 'https://poe.com/',                    color: '#000',    icon: 'P' },
  copilot:    { name: 'Copilot',     url: 'https://copilot.microsoft.com/',      color: '#0078d4', icon: 'C' },
  zai:        { name: 'Z.ai',        url: 'https://z.ai/',                       color: '#6366f1', icon: 'Z' },
  yiyan:      { name: '文心一言',    url: 'https://yiyan.baidu.com/',            color: '#2563eb', icon: '文' },
};

const PLATFORM_META = {
  claude:   { company: 'Anthropic', group: 'international' },
  chatgpt:  { company: 'OpenAI', group: 'international' },
  gemini:   { company: 'Google', group: 'international' },
  grok:     { company: 'xAI', group: 'international' },
  poe:      { company: 'Quora', group: 'international' },
  copilot:  { company: 'Microsoft', group: 'international' },
  doubao:   { company: '字节跳动', group: 'china' },
  kimi:     { company: '月之暗面', group: 'china' },
  deepseek: { company: '深度求索', group: 'china' },
  metaso:   { company: '秘塔科技', group: 'china' },
  yuanbao:  { company: '腾讯', group: 'china' },
  zhida:    { company: '知乎', group: 'china' },
  chatglm:  { company: '智谱AI', group: 'china' },
  minimax:  { company: 'MiniMax', group: 'china' },
  zai:      { company: '智谱AI', group: 'china' },
  yiyan:    { company: '百度', group: 'china' },
};

const PLATFORM_GROUP_ORDER = ['international', 'china'];

const DEFAULT_ACTIVE_PLATFORMS = ['claude', 'chatgpt', 'gemini', 'kimi', 'deepseek'];

// postMessage origin 白名单（AI 平台域名 + bridge.js/service-worker 额外匹配的域名）
const KNOWN_ORIGINS = new Set([
  ...Object.values(ALL_PLATFORMS).map(p => new URL(p.url).origin),
  'https://kimi.moonshot.cn',
  'https://kimi.com',
  'https://kimi.ai',
  'https://chat.openai.com',
  'https://x.com',
]);

const DEFAULT_SELECTORS = {
  claude: {
    input: ['div[contenteditable="true"].ProseMirror', 'div.ProseMirror[contenteditable]', 'fieldset div[contenteditable="true"]', 'div[contenteditable="true"][translate="no"]'],
    send:  ['button[aria-label="Send Message"]', 'button[aria-label="Send message"]', 'button[aria-label="Send"]', 'fieldset button[type="button"]:not([disabled]):last-of-type', 'fieldset button:last-child']
  },
  chatgpt: {
    input: [
      '#prompt-textarea',
      'div[contenteditable="true"]#prompt-textarea',
      'div[contenteditable="true"][data-lexical-editor]',
      'div[contenteditable="true"][data-testid="chat-input"]',
      'div[contenteditable="true"].ProseMirror',
      'textarea[id="prompt-textarea"]'
    ],
    send: [
      '#composer-submit-button',
      'button[data-testid="send-button"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Send prompt"]',
      '[data-testid="fruitjuice-send-button"]',
      'button[aria-label="Send"]'
    ]
  },
  gemini: {
    input: [
      'rich-textarea div.ql-editor[contenteditable="true"][role="textbox"]',
      '[data-test-id="textarea-wrapper"] .ql-editor[contenteditable="true"]',
      'div[aria-label="为 Gemini 输入提示"][contenteditable="true"]',
      'rich-textarea .ql-editor',
      '.ql-editor[contenteditable="true"]',
      'rich-textarea [contenteditable="true"]',
      'div[contenteditable="true"][class*="ql"]',
      'div[aria-label*="Enter a prompt"][contenteditable]',
      'div[aria-label*="输入提示"][contenteditable]'
    ],
    send:  ['button.send-button', 'button[aria-label="Send message"]', 'button[aria-label*="Send"]', 'button[aria-label*="发送"]', '.trailing-actions button:last-child', 'button:has(mat-icon)']
  },
  grok: {
    input: ['.tiptap.ProseMirror', 'div.ProseMirror[contenteditable]', 'div[contenteditable="true"]', 'textarea[placeholder*="Ask"]', 'textarea'],
    send:  ['button[aria-label="Submit"]', 'button[aria-label="Send"]', 'button[type="submit"]']
  },
  doubao: {
    input: ['textarea[data-testid="chat_input_input"]', 'div[contenteditable="true"][data-placeholder]', 'textarea#mainChatInput', 'div[contenteditable="true"]', 'textarea[placeholder*="发送"]', 'textarea'],
    send:  ['button#flow-end-msg-send', 'button[data-testid="chat_input_send_button"]', 'button[aria-label="发送"]', 'button[aria-label*="发送"]', 'div[role="button"][aria-label*="发送"]', 'button[type="submit"]']
  },
  kimi: {
    input: ['div[contenteditable="true"][data-lexical-editor]', 'div[contenteditable="true"].editor-container', 'div[contenteditable="true"][class*="editor"]', 'div[contenteditable="true"]', 'textarea[placeholder*="Ask"]', 'textarea'],
    send:  ['button[data-testid="send-button"]', 'button[class*="send"]', 'div[class*="send"][role="button"]', 'button[aria-label*="Send"]', 'button[aria-label*="发送"]', 'button[type="submit"]']
  },
  deepseek: {
    input: ['textarea#chat-input', 'textarea[placeholder*="Send"]', 'textarea[placeholder*="输入"]', 'textarea'],
    send:  ['button[aria-label*="send"]', 'button[type="submit"]']
  },
  metaso: {
    input: ['textarea.search-consult-textarea', 'textarea[placeholder*="搜索"]', 'textarea[placeholder*="问"]', 'input[type="text"]', 'textarea', 'div[contenteditable="true"]'],
    send:  ['button.send-arrow-button', 'button[type="submit"]', 'button[aria-label*="搜索"]', 'button[aria-label*="发送"]', 'div[role="button"][aria-label*="搜索"]']
  },
  yuanbao: {
    input: ['div.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]', 'textarea[placeholder*="输入"]', 'textarea'],
    send:  ['#yuanbao-send-btn', 'button[aria-label="发送"]', 'button[aria-label*="发送"]', 'div[role="button"][aria-label*="发送"]', 'button[type="submit"]']
  },
  zhida: {
    input: ['div[contenteditable="true"][class*="DraftEditor-content"]', 'div.public-DraftEditor-content[contenteditable="true"]', 'div[contenteditable="true"]', 'textarea[placeholder*="输入"]', 'textarea'],
    send:  ['body>div:nth-of-type(1)>div>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(2)>div:nth-of-type(3)>div>div>div>div:nth-of-type(1)>div>div>div:nth-of-type(2)>div>div>div:nth-of-type(2)>div:nth-of-type(2)>div', 'button[type="submit"]', 'button[aria-label="发送"]', 'button[aria-label*="发送"]', 'div[role="button"][aria-label*="发送"]']
  },
  chatglm: {
    input: ['textarea.scroll-display-none', 'textarea', 'div[contenteditable="true"]', 'textarea[placeholder*="输入"]'],
    send:  ['img.enter_icon', 'img[class*="enter_icon"]', 'div.enter', 'div.enter-icon-container', 'button[type="submit"]', 'button[aria-label*="发送"]']
  },
  minimax: {
    input: ['div[contenteditable="true"]', 'textarea[placeholder*="输入"]', 'textarea'],
    send:  ['button[type="submit"]', 'button[aria-label*="发送"]', 'button[aria-label*="Send"]']
  },
  poe: {
    input: ['textarea[placeholder*="Talk"]', 'textarea[placeholder*="Message"]', 'div[contenteditable="true"]', 'textarea'],
    send:  ['button[data-button-send="true"]', 'button[aria-label="Send message"]', 'button[aria-label*="发送"]', 'button[type="submit"]']
  },
  copilot: {
    input: ['textarea#userInput', 'textarea[data-testid="composer-input"]', 'div[contenteditable="true"]', 'textarea'],
    send:  ['button[data-testid="submit-button"]', 'button[aria-label="Submit message"]', 'button[aria-label="Submit"]', 'button[type="submit"]']
  },
  zai: {
    input: ['textarea', 'div[contenteditable="true"]'],
    send:  ['button[type="submit"]', 'button[aria-label*="Send"]']
  },
  yiyan: {
    input: ['div[contenteditable="true"]', 'div[class*="editable__"]', 'textarea[placeholder*="输入"]', 'textarea'],
    send:  ['span[class*="sendInner"]', '[class*="sendBtnLottie"]', 'div[class*="send__"]', 'button[type="submit"]', 'button[aria-label*="发送"]']
  },
};

const DEFAULT_STOP_SELECTORS = [
  'button[data-testid="stop-button"]',
  'button[aria-label="Stop Response"]',
  'button[aria-label="Stop generating"]',
  'button[aria-label="Stop"]',
  'button[aria-label="Stop generation"]',
  'button[data-testid="stop-streaming-button"]',
  'button[aria-label="Stop responding"]',
  'button[aria-label*="停止"]',
  'button[title*="停止"]',
  'button[aria-label*="Stop"]',
  'button[title*="Stop"]',
  'button[class*="stop-btn"]',
  'button[class*="stopBtn"]',
  '[class*="stop-generate"]',
  '[class*="stopGenerate"]',
  '[data-testid*="stop"]',
];

const QUEUE_STALE_MS = 60000;
const QUEUE_IDLE_PROBE_MS = 12000;

// ============================================================
// 全局状态
// ============================================================

let activePlatforms = [];
let bridgeStatus    = {};
let pickerState     = {};
let carouselOffset  = 0;
let pendingFiles = []; // 待上传文件列表: { file, dataUrl, preview, isImage }
let pendingGroupUrls = {};   // { [instanceKey]: url } — 恢复会话组时的目标 URL
let pendingGroupHighlights = {}; // { [instanceKey]: highlight[] } — 恢复会话组后等待 iframe 重绘的高亮
const transientPlatforms = new Set(); // 当前页面临时窗口，例如总结生成结果，不写入布局/持久配置

const GROUPS_KEY         = 'flowchat_groups';
const HIGHLIGHTS_KEY     = 'flowchat_highlights';
const SYNTHESIS_KEY      = 'flowchat_synthesis';
const GROUP_AUTO_SAVE_KEY = 'flowchat_group_autosave';
const LAYOUTS_KEY        = 'flowchat_layouts';
const CURRENT_LAYOUT_KEY = 'flowchat_current_layout';
const SIDE_PANEL_SETTINGS_KEY = 'flowchat_side_panel_settings';

let groupAutoSave = true;
let currentLayoutId = null;
let _applyingLayout = false;
let sidePanelSettings = { showBtnLabels: false };

const DEFAULT_PROMPT_ALL =
`请综合以下 {count} 个 AI 的回答，提炼关键共识，去除重复内容，输出一个精练完整的总结。去除 AI 味（"当然""总之""首先…其次…最后"等），风格：专业、简练、直接。

## 原始问题：
{user_question}

## 各 AI 的回答：
{all_replies}`;

const DEFAULT_PROMPT_HL =
`以「采纳」内容为主体框架，「参考」改写后融入，严格排除「拒绝」，充分尊重「批注」，去除 AI 味（"当然""总之""首先…其次…最后"等），输出风格：专业、简练、直接。

## 原始问题：
{user_question}

## 采纳：
{adopt}

## 参考：
{ref}

## 拒绝：
{reject}

## 批注：
{note}`;

let settings = {
  visibleCols:      5,
  displayMode:      'carousel',
  barPosition:      'top',        // 'top' | 'bottom'
  windowOrder:      [],           // 窗口排序（platform key 数组），空则按 activePlatforms 顺序
  synthesisTarget:  null,         // 融合生成目标平台 key
  navBtnEnabled:    true,         // 翻页按钮（默认开）
  swipeEnabled:     false,        // 手势滑动（默认关）
  swipeSnap:        true,         // 磁吸对齐（默认开；关则停在任意位置）
  agentMode:        false,        // 连接编程智能体（默认关）— 开启后暴露 window.FlowChatAPI
  showBtnLabels:    false,        // 操作按钮旁显示文字名称（默认关；保持顶栏和列头克制）
  highlightPanelAutoOpen: true,   // 高亮后自动弹出右侧列表（默认开）
};

function createSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let currentSessionId = createSessionId();
let allHighlights = [];       // 本地保存的全部高亮
let highlights = [];          // 当前高亮面板展示的数据：{ id, label, text, platform, frameId, tabId, ts, url, sessionId, groupId }
let replyStore = {};          // { [instanceKey]: { text, html, ts } } — 最新一轮（供高亮面板等使用）
let lastSentMessage = '';     // 最近一次用户发送的消息（融合生成 Prompt 中的 {user_question}）
let _swipeState    = null;   // pointer 拖拽临时状态
let _wheelAccum    = 0;      // 两指滑动累计 deltaX（像素）
let _wheelTimer    = null;   // 两指滑动停止检测定时器
let _wheelActive   = false;  // 当前是否处于两指滑动手势中
let conversationLog = [];    // [{ id, question, ts, replies:{[instanceKey]:{text,html,ts}} }]
let _platformRoundId = {};   // { [instanceKey]: roundId } — 追踪各平台当前轮次
let hlPanelOpen = false;

let focusedPlatform = null;   // 当前聚焦的平台 key，null 表示未聚焦

const platformGenerating  = {};  // { [platform]: boolean } — AI 是否正在生成
let   queuedMessages      = [];  // [{ id, text, sentTo: Set<platform> }] — 待发送队列
const platformFrames      = {};  // { [platform]: { tabId, frameId } } — frame 定向信息
const _processQueueSentAt = {};  // { [platform]: timestamp } — 防止 AI_RESPONSE 重复触发队列
const _platformGenerationStartedAt = {}; // { [platform]: timestamp } — 当前轮开始发送时间
const _platformLastActivityAt = {};      // { [platform]: timestamp } — 最近流式/回复信号时间
const _pendingForBridge   = {};  // { [platform]: [{text, roundId}] } — bridge 未就绪时暂存的消息
let _lastPickerSelectedKey = '';
let _lastPickerSelectedAt = 0;
let _queueWatchdogRunning = false;
let currentAutoSavedGroupId = null;
let _autoSaveTimer = null;
let _autoSaveRunning = false;
let _autoSaveQueued = false;

function markPlatformGenerating(key, roundId = null) {
  const now = Date.now();
  platformGenerating[key] = true;
  _platformGenerationStartedAt[key] = now;
  _platformLastActivityAt[key] = now;
  if (roundId) _platformRoundId[key] = roundId;
}

function markPlatformIdle(key) {
  platformGenerating[key] = false;
  delete _platformGenerationStartedAt[key];
}

function notePlatformActivity(key) {
  if (!key) return;
  _platformLastActivityAt[key] = Date.now();
}

function generationAge(key) {
  const started = _platformGenerationStartedAt[key] || 0;
  return started ? Date.now() - started : 0;
}

function generationIdleAge(key) {
  const last = _platformLastActivityAt[key] || _platformGenerationStartedAt[key] || 0;
  return last ? Date.now() - last : 0;
}

function getRuntimeInstanceKeys(msg, opts = {}) {
  const { onlyGenerating = false } = opts;
  const exact = activePlatforms.filter(k => {
    const f = platformFrames[k];
    return f &&
      msg.tabId != null &&
      msg.frameId != null &&
      f.tabId === msg.tabId &&
      f.frameId === msg.frameId &&
      (!onlyGenerating || platformGenerating[k]);
  });
  if (exact.length) return exact;

  const byBase = activePlatforms.filter(k =>
    getBasePlatform(k) === msg.platform &&
    (!onlyGenerating || platformGenerating[k])
  );
  if (byBase.length) return byBase;

  return activePlatforms.includes(msg.platform) &&
    (!onlyGenerating || platformGenerating[msg.platform])
      ? [msg.platform]
      : [];
}

// ── 自定义平台 ──────────────────────────────────────────────
const CUSTOM_PLATFORM_KEY = 'flowchat_custom_platforms';
// 等待 bridge 连接后自动启动 Picker 的 key 集合（新建自定义平台时写入）
const _pendingPickerKeys = new Set();
// 自定义平台颜色轮转
const CUSTOM_COLORS = ['#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777'];

// ============================================================
// 工具函数
// ============================================================

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ensureStaticDnrRuleset() {
  try {
    const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
    if (enabled.includes('iframe_rules')) return;
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['iframe_rules'],
      disableRulesetIds: [],
    });
    await sleep(100);
  } catch (e) {
    console.warn('[FlowChat] DNR 规则集检查失败:', e.message);
  }
}

/**
 * 从实例 key 获取基础平台 key。
 * 多实例时 key 格式为 "claude_2"、"claude_3"，基础 key 是 "claude"。
 */
function getBasePlatform(instanceKey) {
  return instanceKey.replace(/_\d+$/, '');
}

async function registerCustomDNRRule(domain, ruleId) {
  const headers = [
    'X-Frame-Options', 'Content-Security-Policy', 'X-Content-Type-Options',
    'Cross-Origin-Opener-Policy', 'Cross-Origin-Embedder-Policy', 'Cross-Origin-Resource-Policy'
  ].map(header => ({ header, operation: 'remove' }));
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: ruleId,
      priority: 1,
      action: { type: 'modifyHeaders', responseHeaders: headers },
      condition: { urlFilter: `||${domain}`, resourceTypes: ['sub_frame'] }
    }],
    removeRuleIds: []
  });
}

async function removeCustomDNRRule(ruleId) {
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [],
    removeRuleIds: [ruleId]
  });
}

async function loadCustomPlatforms() {
  const { [CUSTOM_PLATFORM_KEY]: list = [] } = await chrome.storage.local.get(CUSTOM_PLATFORM_KEY);
  for (const cp of list) {
    ALL_PLATFORMS[cp.key] = { name: cp.name, url: cp.url, color: cp.color, icon: cp.icon, _custom: true };
    // 恢复 DNR 规则（扩展重启后动态规则会丢失，需重新注册）
    if (cp.ruleId) {
      try {
        const domain = new URL(cp.url).hostname;
        await registerCustomDNRRule(domain, cp.ruleId);
      } catch (e) {
        console.warn(`[FlowChat] 恢复自定义平台 DNR 规则失败 (${cp.key}):`, e.message);
      }
    }
    // 将自定义域名加入 KNOWN_ORIGINS
    try { KNOWN_ORIGINS.add(new URL(cp.url).origin); } catch {}
  }
}

let _customRuleIdLock = false;
async function nextCustomRuleId() {
  // 动态规则 ID 从 1000 起，避免与静态 rules.json 的 1-19 冲突
  // 简单自旋锁，防止并发重复生成同一 ruleId
  while (_customRuleIdLock) await new Promise(r => setTimeout(r, 50));
  _customRuleIdLock = true;
  try {
    const { flowchat_custom_rule_counter: n = 999 } = await chrome.storage.local.get('flowchat_custom_rule_counter');
    const next = n + 1;
    await chrome.storage.local.set({ flowchat_custom_rule_counter: next });
    return next;
  } finally {
    _customRuleIdLock = false;
  }
}

async function addCustomPlatform({ name, url }) {
  // 1. 生成唯一 key：custom1, custom2, custom3…
  const { [CUSTOM_PLATFORM_KEY]: list = [] } = await chrome.storage.local.get(CUSTOM_PLATFORM_KEY);
  let n = 1;
  const existingKeys = list.map(p => p.key);
  while (existingKeys.includes(`custom${n}`)) n++;
  const key = `custom${n}`;

  // 2. 分配颜色和图标
  const color = CUSTOM_COLORS[(n - 1) % CUSTOM_COLORS.length];
  const icon  = (name || 'C').trim().charAt(0).toUpperCase();

  // 3. 注册动态 DNR 规则
  const ruleId = await nextCustomRuleId();
  const domain = new URL(url).hostname;
  await registerCustomDNRRule(domain, ruleId);

  // 4. 持久化
  const entry = { key, name: name || key, url, color, icon, ruleId };
  list.push(entry);
  await chrome.storage.local.set({ [CUSTOM_PLATFORM_KEY]: list });

  // 5. 运行时注册到 ALL_PLATFORMS
  ALL_PLATFORMS[key] = { name: entry.name, url, color, icon, _custom: true };
  KNOWN_ORIGINS.add(new URL(url).origin);

  // 6. 加入主动列表 + 标记需要 Picker 引导
  _pendingPickerKeys.add(key);
  addPlatform(key);
}

async function removeCustomPlatform(key) {
  const { [CUSTOM_PLATFORM_KEY]: list = [] } = await chrome.storage.local.get(CUSTOM_PLATFORM_KEY);
  const entry = list.find(p => p.key === key);
  if (!entry) return;

  // 移除 DNR 规则
  if (entry.ruleId) await removeCustomDNRRule(entry.ruleId).catch(() => {});

  // 移除持久化
  const updated = list.filter(p => p.key !== key);
  await chrome.storage.local.set({ [CUSTOM_PLATFORM_KEY]: updated });

  // 移除运行时注册
  delete ALL_PLATFORMS[key];
  try { KNOWN_ORIGINS.delete(new URL(entry.url).origin); } catch {}

  // 移除选择器缓存
  const { flowchat_selectors: sels = {} } = await chrome.storage.local.get('flowchat_selectors');
  delete sels[key];
  await chrome.storage.local.set({ flowchat_selectors: sels });
}

function getPlatformForUrl(url) {
  try {
    const h = new URL(url).hostname;
    if (h.includes('claude.ai'))                                          return 'claude';
    if (h.includes('chatgpt.com')      || h.includes('chat.openai.com')) return 'chatgpt';
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
    // 自定义平台：按域名匹配
    for (const [key, p] of Object.entries(ALL_PLATFORMS)) {
      if (!key.startsWith('custom') || !p._custom) continue;
      try {
        const ph = new URL(p.url).hostname;
        if (h === ph || h.endsWith('.' + ph)) return key;
      } catch {}
    }
  } catch {}
  return null;
}

async function getSelectors(key) {
  const base   = getBasePlatform(key);
  const stored = await chrome.storage.local.get('flowchat_selectors');
  const custom = stored.flowchat_selectors?.[base];
  const def    = DEFAULT_SELECTORS[base] || { input: [], send: [] };
  return {
    inputSels: custom?.input ? [custom.input, ...def.input] : def.input,
    sendSels:  custom?.send  ? [custom.send,  ...def.send]  : def.send,
  };
}

async function getStopSelectors(key) {
  const base   = getBasePlatform(key);
  const stored = await chrome.storage.local.get('flowchat_selectors');
  const custom = stored.flowchat_selectors?.[base];
  return custom?.stop ? [custom.stop, ...DEFAULT_STOP_SELECTORS] : DEFAULT_STOP_SELECTORS;
}

async function saveSelector(key, type, selector) {
  const base   = getBasePlatform(key);
  const stored = await chrome.storage.local.get('flowchat_selectors');
  const all    = stored.flowchat_selectors || {};
  all[base]    = all[base] || {};
  all[base][type] = selector;
  await chrome.storage.local.set({ flowchat_selectors: all });
}

function normalizeHighlightRecord(hl, patch = {}) {
  return {
    id:        hl.id,
    label:     hl.label,
    text:      hl.text,
    platform:  hl.platform,
    frameId:   hl.frameId,
    tabId:     hl.tabId,
    ts:        hl.ts || Date.now(),
    url:       hl.url || '',
    sessionId: hl.sessionId || currentSessionId,
    groupId:   hl.groupId || null,
    ...patch,
  };
}

function publicHighlightRecord(hl) {
  const clean = normalizeHighlightRecord(hl);
  delete clean.frameId;
  delete clean.tabId;
  return clean;
}

async function loadStoredHighlights() {
  const stored = await chrome.storage.local.get(HIGHLIGHTS_KEY);
  allHighlights = Array.isArray(stored[HIGHLIGHTS_KEY])
    ? stored[HIGHLIGHTS_KEY].map(h => normalizeHighlightRecord(h, { frameId: undefined, tabId: undefined }))
    : [];
  highlights = [...allHighlights];
}

async function saveStoredHighlights() {
  const compact = allHighlights.map(publicHighlightRecord);
  await chrome.storage.local.set({ [HIGHLIGHTS_KEY]: compact });
}

async function upsertStoredHighlight(hl) {
  const clean = publicHighlightRecord(hl);
  const idx = allHighlights.findIndex(h => h.id === clean.id);
  if (idx >= 0) allHighlights[idx] = { ...allHighlights[idx], ...clean };
  else allHighlights.unshift(clean);
  await saveStoredHighlights();
}

async function removeStoredHighlight(id) {
  allHighlights = allHighlights.filter(h => h.id !== id);
  await saveStoredHighlights();
}

function getCurrentGroupHighlights() {
  return highlights
    .filter(h => h.sessionId === currentSessionId || h.groupId)
    .map(publicHighlightRecord);
}

function clearCurrentConversationState({ clearHighlights = true } = {}) {
  currentSessionId = createSessionId();
  currentAutoSavedGroupId = null;
  if (_autoSaveTimer) {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = null;
  }
  replyStore       = {};
  conversationLog  = [];
  queuedMessages   = [];
  Object.keys(_platformRoundId).forEach(k => delete _platformRoundId[k]);
  Object.keys(_processQueueSentAt).forEach(k => delete _processQueueSentAt[k]);
  Object.keys(_platformGenerationStartedAt).forEach(k => delete _platformGenerationStartedAt[k]);
  Object.keys(_platformLastActivityAt).forEach(k => delete _platformLastActivityAt[k]);
  Object.keys(_pendingForBridge).forEach(k => delete _pendingForBridge[k]);
  if (clearHighlights) {
    highlights = [];
    renderHighlightPanel();
    if (hlPanelOpen) closeHighlightPanel();
  }
  updateQueueUI();
  updateSynthesisBtn();
}

async function restoreHighlightsForPlatform(key) {
  const items = pendingGroupHighlights[key] || [];
  const frame = platformFrames[key];
  if (!items.length || !frame) return;
  delete pendingGroupHighlights[key];
  const restored = items.map(h => normalizeHighlightRecord(h, {
    platform: key,
    tabId: frame.tabId,
    frameId: frame.frameId,
    sessionId: currentSessionId,
  }));
  highlights = [
    ...highlights.filter(h => h.platform !== key),
    ...restored,
  ];
  for (const hl of restored) await upsertStoredHighlight(hl);
  renderHighlightPanel();
  try {
    await chrome.runtime.sendMessage({
      type: 'SEND_TO_IFRAME',
      tabId: frame.tabId,
      frameId: frame.frameId,
      payload: { type: 'RESTORE_HIGHLIGHTS', highlights: restored.map(publicHighlightRecord) }
    });
  } catch (e) {
    console.warn('[FlowChat] restore highlights failed:', key, e.message);
  }
}

// ============================================================
// 初始化
// ============================================================

async function init() {
  await loadI18nMessages();  // 必须在 applyI18n 前完成，否则 _i18nData 为空
  await loadCustomPlatforms();
  await ensureStaticDnrRuleset();
  document.body.classList.toggle('fc-side-panel', IS_SIDE_PANEL);
  applyI18n();
  if (IS_SIDE_PANEL) {
    const input = document.getElementById('message-input');
    if (input) input.placeholder = msg('input_placeholder_sidepanel');
  }
  const stored = await chrome.storage.sync.get(['activePlatforms', 'settings']);
  activePlatforms = Array.isArray(stored.activePlatforms)
    ? stored.activePlatforms
    : [...DEFAULT_ACTIVE_PLATFORMS];
  if (stored.settings) settings = { ...settings, ...stored.settings };

  await loadStoredHighlights();
  const groupAutoSaveStored = await chrome.storage.local.get(GROUP_AUTO_SAVE_KEY);
  groupAutoSave = groupAutoSaveStored[GROUP_AUTO_SAVE_KEY] !== false; // 默认 true
  await pruneUnsafeBlockedElementRules();
  await ensureLayoutState();
  if (IS_SIDE_PANEL) settings.visibleCols = 1;
  if (IS_SIDE_PANEL) {
    const storedSidePanel = await chrome.storage.local.get(SIDE_PANEL_SETTINGS_KEY);
    sidePanelSettings = { showBtnLabels: false, ...(storedSidePanel[SIDE_PANEL_SETTINGS_KEY] || {}) };
  }

  carouselOffset = 0;

  applyBarPosition(settings.barPosition);
  applyBtnLabels(getEffectiveBtnLabels());
  renderGrid();              // renderGrid 内部会调用 applyWindowOrder
  renderAddPlatformPopover();
  syncSettingsUI();
  bindEvents();
  initCarouselResizeObserver();
  initSwipeGesture();
  initWheelGesture();
  updateHeaderNavBtns();     // 应用初始 navBtnEnabled 状态
  document.body.classList.toggle('swipe-enabled', !!settings.swipeEnabled);

  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  if (IS_SIDE_PANEL) {
    try {
      const port = chrome.runtime.connect({ name: 'FLOWCHAT_SIDE_PANEL' });
      port.onMessage.addListener(handleRuntimeMessage);
    } catch (e) {
      console.warn('[FlowChat] side panel message channel failed:', e.message);
    }
  }

  // 防止 iframe 内容聚焦时浏览器滚动 grid-container（overflow:hidden 仍可被程序性滚动）
  // 使用 overflow:clip 是主要防御；此处作为双重保险立即重置任何 scrollLeft/scrollTop
  const _grid = document.getElementById('grid-container');
  if (_grid) _grid.addEventListener('scroll', () => { _grid.scrollLeft = 0; _grid.scrollTop = 0; }, true);

  // 接收来自 iframe MAIN world 注入的 picker 选择结果（postMessage 通道）
  window.addEventListener('message', (e) => {
    if (!e.data || !e.data.__fc_type) return;
    const sourceKey = activePlatforms.find(k => {
      try { return document.getElementById(`iframe-${k}`)?.contentWindow === e.source; }
      catch { return false; }
    });
    if (!KNOWN_ORIGINS.has(e.origin) && !sourceKey) {
      console.warn('[FlowChat Message] ignored unknown origin', {
        type: e.data.__fc_type,
        origin: e.origin,
        platform: e.data.platform,
      });
      return;
    }
    if (e.data.__fc_type === 'PICKER_SELECTED') {
      const platform = sourceKey || e.data.platform;
      console.log('[FlowChat Picker] message received', {
        platform,
        rawPlatform: e.data.platform,
        step: e.data.step,
        selector: e.data.selector,
        origin: e.origin,
        sourceMatched: !!sourceKey,
      });
      handlePickerSelected({ platform, step: e.data.step, selector: e.data.selector });
    }
    if (e.data.__fc_type === 'SPLIT_READ_EXIT' && window.__fc_sr_restore__) {
      window.__fc_sr_restore__();
    }
  });

  // ── 周期性队列扫描兜底 ──
  // 部分平台的 GENERATION_COMPLETE / AI_RESPONSE 可能永远不触发（stop 按钮 / response 选择器不匹配）
  // 每 15 秒扫描一次：如果某平台标记为"生成中"超过 60 秒，强制重置并重试队列
  setInterval(() => {
    if (!queuedMessages.length) return;
    if (_queueWatchdogRunning) return;
    _queueWatchdogRunning = true;
    scanQueueWatchdog().finally(() => { _queueWatchdogRunning = false; });
  }, 15000);
}

// ============================================================
// 渲染：主网格
// ============================================================

// ── SVG 图标库（内联 SVG，Chrome 扩展不依赖外部 CDN）──
const ICONS = {
  expand:   `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4v4M14 2l-5 5M6 14H2v-4M2 14l5-5"/></svg>`,
  refresh:  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8a6.5 6.5 0 1 0 1.4-4M1.5 2v3.5h3.5"/></svg>`,
  external: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h5v5M14 2l-7 7M7 4H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-4"/></svg>`,
  picker:   `<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 2.5l5 14 2.5-5.5 5.5-2.5-13-6z"/></svg>`,
  block:    `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="5.5"/><path d="M4 4l8 8"/></svg>`,
  remove:   `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>`,
  sidebar:  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="2" width="13" height="12" rx="1.5"/><path d="M5.5 2v12"/></svg>`,
  splitread:`<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="1" y="2" width="6" height="12" rx="1"/><rect x="9" y="2" width="6" height="12" rx="1"/></svg>`,
  download: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9M4 8l4 4 4-4M2 14h12"/></svg>`,
  more:     `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" stroke="none"><circle cx="4" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12" cy="8" r="1.3"/></svg>`,
};

// 需要在菜单栏显示侧边栏 toggle 按钮的平台
const SIDEBAR_TOGGLE_PLATFORMS = new Set(['claude']);
// 支持分列阅读的平台（通用 fallback 可适配任意平台，故全量开启）
const SPLIT_READ_PLATFORMS = new Set(Object.keys(ALL_PLATFORMS));

function renderIframeColHTML(key) {
  const p = ALL_PLATFORMS[getBasePlatform(key)]; if (!p) return '';
  // 多实例显示：claude_2 → Claude #2
  const instanceNum = key.match(/_(\d+)$/)?.[1];
  const displayName = instanceNum ? `${p.name} #${instanceNum}` : p.name;
  const basePlatform = getBasePlatform(key);
  const splitReadMoreItem = SPLIT_READ_PLATFORMS.has(basePlatform)
    ? `<button class="ca-menu-item" data-action="split-read" data-key="${key}">${ICONS.splitread}<span>${msg('col_label_splitread')}</span></button>`
    : '';
  // ··· 折叠菜单：侧边栏（平台专属）
  const sidebarMoreItem = SIDEBAR_TOGGLE_PLATFORMS.has(basePlatform)
    ? `<button class="ca-menu-item" data-action="toggle-sidebar" data-key="${key}">${ICONS.sidebar}<span>${msg('col_more_sidebar')}</span></button>`
    : '';
  return `<div class="iframe-col" id="col-${key}" data-platform="${key}">
    <div class="col-header">
      <span class="col-name">${displayName}</span>
      <div class="col-acts">
        <button class="ca ca-with-label" data-action="focus"     data-key="${key}" data-tooltip="${msg('col_focus')}">${ICONS.expand}<span class="ca-label">${msg('col_label_focus')}</span></button>
        <div class="ca-more-wrap">
          <button class="ca" data-action="col-more" data-key="${key}" data-tooltip="${msg('col_more')}">${ICONS.more}</button>
          <div class="ca-more-menu" id="more-menu-${key}">
            ${splitReadMoreItem}
            <button class="ca-menu-item" data-action="download"      data-key="${key}">${ICONS.download}<span>${msg('col_label_download')}</span></button>
            <button class="ca-menu-item" data-action="refresh"       data-key="${key}">${ICONS.refresh}<span>${msg('col_label_refresh')}</span></button>
            ${sidebarMoreItem}
            <button class="ca-menu-item" data-action="external"     data-key="${key}">${ICONS.external}<span>${msg('col_more_external')}</span></button>
            <button class="ca-menu-item" data-action="picker"       data-key="${key}">${ICONS.picker}<span>${msg('col_more_picker')}</span></button>
            <button class="ca-menu-item" data-action="block-picker" data-key="${key}">${ICONS.block}<span>${msg('col_more_block')}</span></button>
          </div>
        </div>
        <button class="ca" data-action="remove" data-key="${key}" data-tooltip="${msg('col_remove')}">${ICONS.remove}</button>
      </div>
    </div>
    <div class="col-body">
      <iframe id="iframe-${key}" src="about:blank"
              allow="clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"></iframe>
      <div class="col-spinner" id="spinner-${key}"><div class="spin"></div></div>
      <div class="picker-banner hidden" id="pb-${key}">
        <span id="pb-text-${key}"></span>
        <button data-action="cancel-picker" data-key="${key}">${msg('btn_cancel')}</button>
      </div>
    </div>
  </div>`;
}

function renderGrid() {
  const c = document.getElementById('grid-container');
  carouselOffset = Math.max(0, Math.min(carouselOffset, Math.max(0, activePlatforms.length - settings.visibleCols)));
  if (settings.displayMode === 'carousel') {
    renderCarousel(c);
  } else {
    renderGridLayout(c);
  }
  // 渲染后立即恢复 CSS order（排序持久化）
  applyWindowOrder();
}

// Grid 和 Carousel 共用同一个 DOM 结构（carousel-track 始终存在），
// 切换模式时只改 CSS，不移动 iframe DOM 节点（移动会导致 iframe 重载）。
function renderGridLayout(c) {
  const cols = activePlatforms.map(renderIframeColHTML).join('');
  c.innerHTML = `
    <div class="carousel-track" id="carousel-track">${cols}</div>
    <button class="carousel-nav prev" data-action="carousel-prev" title="${msg('carousel_prev_title')}">‹</button>
    <button class="carousel-nav next" data-action="carousel-next" title="${msg('carousel_next_title')}">›</button>
    <div class="carousel-hint-prev" id="carousel-hint-prev"></div>
    <div class="carousel-hint-next" id="carousel-hint-next"></div>
    <div class="carousel-dots" id="carousel-dots"></div>
  `;
  applyDisplayMode();
  // 分组加载：每组 3 个并发，组间延迟 1200ms，避免同时触发大量请求被风控
  activePlatforms.forEach((key, i) => {
    const groupDelay = Math.floor(i / 3) * 1200 + (i % 3) * 200;
    setTimeout(() => loadIframe(key), groupDelay);
  });
}

// renderCarousel 和 renderGridLayout 现在是同一个逻辑
function renderCarousel(c) {
  renderGridLayout(c);
  setTimeout(updateCarouselPosition, 100);
}

/**
 * 纯 CSS 切换显示模式，绝不重建 DOM，绝不改变 display 属性（始终保持 flex）。
 * Carousel 模式：flex nowrap + translateX 翻页，列宽固定像素
 * Grid 模式    ：flex wrap，竖向滚动，每列保持全高，AI 应用不感知 resize
 */
function applyDisplayMode() {
  const c     = document.getElementById('grid-container');
  const track = document.getElementById('carousel-track');
  if (!c || !track) return;

  const isCarousel = settings.displayMode === 'carousel';
  document.body.classList.toggle('carousel-mode', isCarousel);

  carouselOffset = Math.max(0, Math.min(
    carouselOffset, Math.max(0, activePlatforms.length - settings.visibleCols)
  ));

  if (isCarousel) {
    c.className = 'grid-container carousel';
    track.style.flexWrap     = '';
    track.style.alignContent = '';
    track.style.overflowY    = '';
    track.style.transform    = '';
    const defV = Math.min(activePlatforms.length, settings.visibleCols);
    track.querySelectorAll('.iframe-col').forEach(col => {
      col.style.width  = `${100 / defV}%`;
      col.style.height = '';
    });
    c.querySelectorAll('.carousel-nav, .carousel-hint-prev, .carousel-hint-next, .carousel-dots')
      .forEach(el => { el.style.display = ''; });
    requestAnimationFrame(() => setTimeout(updateCarouselPosition, 50));
  } else {
    const actualCols = Math.min(activePlatforms.length, settings.visibleCols);
    c.className = `grid-container grid-mode cols-${actualCols}`;
    track.style.flexWrap     = 'wrap';
    track.style.alignContent = 'flex-start';
    track.style.overflowY    = 'auto';
    track.style.transform    = 'translateX(0)';
    const colW = `${100 / actualCols}%`;
    track.querySelectorAll('.iframe-col').forEach(col => {
      col.style.width  = colW;
      col.style.height = '';
    });
    c.querySelectorAll('.carousel-nav, .carousel-hint-prev, .carousel-hint-next, .carousel-dots')
      .forEach(el => { el.style.display = 'none'; });
  }
  applyWindowOrder();
  updateHeaderNavBtns();
}

function updateCarouselPosition() {
  // 手势进行中不允许外部覆写 transform（防止 ResizeObserver 等触发时跳回原位）
  if (_wheelActive || (_swipeState !== null && _swipeState.active)) return;

  const track = document.getElementById('carousel-track');
  if (!track) return;

  const total   = activePlatforms.length;
  const visible = settings.visibleCols;
  const actualV = Math.min(total, visible);
  carouselOffset = Math.max(0, Math.min(carouselOffset, Math.max(0, total - actualV)));

  // 像素宽度计算（消除 % 基准不确定导致的初始化 bug）
  const container   = track.parentElement;
  const containerW  = container?.offsetWidth || 0;
  const colW        = containerW > 0 ? containerW / actualV : 0;

  if (colW > 0) {
    track.querySelectorAll('.iframe-col').forEach(col => { col.style.width = `${colW}px`; });
    track.style.transform = `translateX(${-carouselOffset * colW}px)`;
  } else {
    // 降级：rAF 再试一次（容器尚未完成 layout）
    requestAnimationFrame(updateCarouselPosition);
    return;
  }

  const canScroll = total > actualV;
  const prev = document.querySelector('.carousel-nav.prev');
  const next = document.querySelector('.carousel-nav.next');
  const hintPrev = document.getElementById('carousel-hint-prev');
  const hintNext = document.getElementById('carousel-hint-next');

  const showInlineNav = canScroll && settings.navBtnEnabled !== false;
  if (prev) {
    prev.disabled      = carouselOffset <= 0;
    prev.style.display = showInlineNav ? '' : 'none';
  }
  if (next) {
    next.disabled      = carouselOffset >= total - actualV;
    next.style.display = showInlineNav ? '' : 'none';
  }

  // 左右滑动提示文案：有隐藏内容时短暂显示，2s 后自动淡出
  if (hintPrev) {
    const hiddenLeft = carouselOffset;
    hintPrev.textContent = hiddenLeft > 0 ? `‹ ${Math.round(hiddenLeft)} 个` : '';
    clearTimeout(hintPrev._fadeTimer);
    hintPrev.classList.toggle('visible', hiddenLeft > 0);
    if (hiddenLeft > 0) {
      hintPrev._fadeTimer = setTimeout(() => hintPrev.classList.remove('visible'), 2200);
    }
  }
  if (hintNext) {
    const hiddenRight = total - actualV - carouselOffset;
    hintNext.textContent = hiddenRight > 0 ? `${Math.round(hiddenRight)} 个 ›` : '';
    clearTimeout(hintNext._fadeTimer);
    hintNext.classList.toggle('visible', hiddenRight > 0);
    if (hiddenRight > 0) {
      hintNext._fadeTimer = setTimeout(() => hintNext.classList.remove('visible'), 2200);
    }
  }

  const dots = document.getElementById('carousel-dots');
  if (dots) {
    if (!canScroll) { dots.innerHTML = ''; return; }
    const pages = Math.ceil(total / actualV);
    const cur   = Math.floor(carouselOffset / actualV);
    dots.innerHTML = Array.from({ length: pages }, (_, i) =>
      `<span class="cdot ${i === cur ? 'active' : ''}" data-page="${i}"></span>`
    ).join('');
    dots.querySelectorAll('.cdot').forEach(d => {
      d.addEventListener('click', () => {
        carouselOffset = parseInt(d.dataset.page) * actualV;
        updateCarouselPosition();
      });
    });
  }
  updateHeaderNavBtns();
}

function updateHeaderNavBtns() {
  const group = document.getElementById('nav-btn-group');
  const prev  = document.getElementById('btn-nav-prev');
  const next  = document.getElementById('btn-nav-next');
  if (!prev || !next) return;

  const showNav = settings.navBtnEnabled !== false;
  if (group) group.style.display = showNav ? 'contents' : 'none';
  if (!showNav) return;

  const total     = activePlatforms.length;
  const actualV   = Math.min(total, settings.visibleCols);
  const canScroll = settings.displayMode === 'carousel' && total > actualV;
  prev.disabled   = !canScroll || carouselOffset <= 0;
  next.disabled   = !canScroll || carouselOffset >= total - actualV;
  prev.style.opacity = canScroll ? '' : '0.3';
  next.style.opacity = canScroll ? '' : '0.3';
}

/** 监听 grid-container 尺寸变化，carousel 模式下重新计算列宽 */
function initCarouselResizeObserver() {
  if (!window.ResizeObserver) return;
  const container = document.getElementById('grid-container');
  if (!container) return;
  const ro = new ResizeObserver(() => {
    if (settings.displayMode === 'carousel') updateCarouselPosition();
  });
  ro.observe(container);
}

// ============================================================
// 手势滑动（Swipe Gesture）
// ============================================================

/**
 * 注册手势滑动事件。
 * 触发区域：.col-header（在主文档中，不在 iframe 内）。
 * 利用 setPointerCapture，拖拽进入 iframe 后仍能接收 move/up 事件。
 */
function initSwipeGesture() {
  const container = document.getElementById('grid-container');
  if (!container) return;
  container.addEventListener('pointerdown',   onSwipeStart);
  container.addEventListener('pointermove',   onSwipeMove);
  container.addEventListener('pointerup',     onSwipeEnd);
  container.addEventListener('pointercancel', onSwipeEnd);
}

/**
 * 监听触控板两指滑动（wheel 事件，deltaX 非零）。
 * iframe 内的 wheel 事件不会冒泡到主文档，因此这里只会接收到
 * col-header / 全局 header 区域的手势，不会拦截 AI 内容区的滚动。
 * 该功能始终可用于 carousel 模式，无需 swipeEnabled 开关。
 */
function initWheelGesture() {
  // grid-container：捕获列头 (col-header) 上方的两指滑动
  const container = document.getElementById('grid-container');
  // header：捕获全局菜单栏区域的两指滑动
  const header    = document.querySelector('.header');
  if (container) container.addEventListener('wheel', onWheelGesture, { passive: false });
  if (header)    header.addEventListener('wheel',    onWheelGesture, { passive: false });
}

function onWheelGesture(e) {
  if (settings.displayMode !== 'carousel') return;

  // ── 激活前做方向过滤；激活后不再过滤（惯性事件可能有竖向分量）──
  if (!_wheelActive) {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.5) return; // 竖向为主，放行
    if (Math.abs(e.deltaX) < 3) return;                         // 过小忽略
  }

  const container = document.getElementById('grid-container');
  const track     = document.getElementById('carousel-track');
  if (!container || !track) return;

  const total   = activePlatforms.length;
  const actualV = Math.min(total, settings.visibleCols);
  if (total <= actualV) return;

  const colW      = container.offsetWidth / actualV;
  const maxOffset = Math.max(0, total - actualV) * colW;
  if (colW === 0) return;

  e.preventDefault();

  // 手势开始：从当前 carouselOffset 的像素位置起始
  if (!_wheelActive) {
    _wheelActive = true;
    _wheelAccum  = Math.max(0, Math.min(maxOffset, carouselOffset * colW));
    track.style.transition = 'none';
  }

  _wheelAccum += e.deltaX;

  // 实时跟手，边界橡皮筋
  let display = _wheelAccum;
  if (display < 0)              display = display * 0.18;
  else if (display > maxOffset) display = maxOffset + (display - maxOffset) * 0.18;
  track.style.transform = `translateX(${-display}px)`;

  // 防抖：手势完全停止 200ms 后结算
  clearTimeout(_wheelTimer);
  _wheelTimer = setTimeout(() => {
    _wheelActive = false;

    // 在 timeout 执行时实时重算，避免闭包快照过期
    const c2     = document.getElementById('grid-container');
    const t2     = document.getElementById('carousel-track');
    if (!c2 || !t2) return;
    const colW2     = c2.offsetWidth / Math.min(activePlatforms.length, settings.visibleCols);
    const maxOff2   = Math.max(0, activePlatforms.length - Math.min(activePlatforms.length, settings.visibleCols)) * colW2;
    const actualV2  = Math.min(activePlatforms.length, settings.visibleCols);

    t2.style.transition = ''; // 恢复 CSS transition

    const clamped = Math.max(0, Math.min(maxOff2, _wheelAccum));

    if (settings.swipeSnap !== false) {
      // 磁吸：吸附到最近整页边界
      const page = Math.round(clamped / (colW2 * actualV2));
      carouselOffset = Math.max(0, Math.min(activePlatforms.length - actualV2, page * actualV2));
    } else {
      // 非磁吸：对齐到最近整列（避免出现半截列）
      carouselOffset = Math.round(colW2 > 0 ? clamped / colW2 : 0);
    }

    requestAnimationFrame(() => updateCarouselPosition());
  }, 200);
}

function onSwipeStart(e) {
  if (settings.displayMode !== 'carousel') return;
  if (!settings.swipeEnabled) return;
  if (e.button !== 0 && e.pointerType === 'mouse') return; // 仅左键/触控
  if (!e.target.closest('.col-header')) return;             // 仅从列头起始

  const container = document.getElementById('grid-container');
  const track     = document.getElementById('carousel-track');
  if (!container || !track) return;

  const total   = activePlatforms.length;
  const actualV = Math.min(total, settings.visibleCols);
  if (total <= actualV) return;  // 无需翻页

  const colW = container.offsetWidth / actualV;
  if (colW === 0) return;

  // 不在 pointerdown 调用 preventDefault —— pointerdown.preventDefault() 会抑制后续 click 事件，
  // 导致 col-header 上所有按钮失效。文字选中防护已由 CSS pointer-events:none on .col-name 覆盖。
  container.setPointerCapture(e.pointerId); // 捕获后续事件，穿越 iframe

  _swipeState = {
    startX:      e.clientX,
    startY:      e.clientY,
    startOffset: carouselOffset * colW, // 起始像素偏移
    colW,
    maxOffset:   Math.max(0, total - actualV) * colW,
    active:      false,  // 是否已过死区
    cancelled:   false,  // 是否因竖向移动取消
  };
  track.style.transition = 'none';
}

function onSwipeMove(e) {
  if (!_swipeState || _swipeState.cancelled) return;
  const s = _swipeState;
  const dx = e.clientX - s.startX;
  const dy = Math.abs(e.clientY - s.startY);

  // 死区：水平 8px 内不响应
  if (!s.active) {
    if (Math.abs(dx) < 8) return;
    // 竖向主导 → 取消
    if (dy > Math.abs(dx) * 1.4) {
      s.cancelled = true;
      const track = document.getElementById('carousel-track');
      if (track) track.style.transition = '';
      requestAnimationFrame(() => updateCarouselPosition());
      return;
    }
    s.active = true;
    e.preventDefault(); // 拖拽正式激活后才 preventDefault，阻止浏览器滚动但不影响 click
  }

  const track = document.getElementById('carousel-track');
  if (!track) return;

  e.preventDefault(); // 拖拽进行中持续阻止滚动
  // 实时跟手，边界加橡皮筋阻力
  let raw = s.startOffset - dx;
  if (raw < 0)              raw = raw * 0.2;
  else if (raw > s.maxOffset) raw = s.maxOffset + (raw - s.maxOffset) * 0.2;
  track.style.transform = `translateX(${-raw}px)`;
}

function onSwipeEnd(e) {
  if (!_swipeState) return;
  const s = _swipeState;
  const track = document.getElementById('carousel-track');

  // 未真正拖拽或取消 → 还原
  if (e.type === 'pointercancel' || s.cancelled || !s.active) {
    if (track) track.style.transition = '';
    _swipeState = null;
    requestAnimationFrame(() => updateCarouselPosition());
    return;
  }

  const dx        = e.clientX - s.startX;
  const threshold = Math.max(60, s.colW * 0.28); // 触发翻页的最小拖拽距离
  const total     = activePlatforms.length;
  const actualV   = Math.min(total, settings.visibleCols);

  if (track) track.style.transition = ''; // 恢复 CSS transition，让 rAF 中的更新有动画

  if (settings.swipeSnap) {
    // 磁吸模式：吸到整页
    const base = Math.round(carouselOffset);
    if (dx < -threshold) {
      carouselOffset = Math.min(total - actualV, base + actualV);
    } else if (dx > threshold) {
      carouselOffset = Math.max(0, base - actualV);
    } else {
      carouselOffset = base; // 回弹到起始整页
    }
  } else {
    // 非磁吸：对齐到最近整列（避免出现半截列）
    const pixel = s.startOffset - dx;
    carouselOffset = Math.round(Math.max(0, Math.min(s.maxOffset, pixel)) / s.colW);
  }

  _swipeState = null;
  requestAnimationFrame(() => updateCarouselPosition());
}

// ============================================================
// 会话组
// ============================================================

async function captureCurrentGroupUrls() {
  const urls = {};
  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    // frameId → url 映射
    const urlMap = {};
    for (const f of (frames || [])) urlMap[f.frameId] = f.url;

    // 已占用的 frameId（多实例场景下避免把同一 frame 分配给多个实例）
    const usedFrameIds = new Set();
    const isSavableFrameUrl = (url, basePlatform) =>
      url &&
      url !== 'about:blank' &&
      !url.startsWith('about:') &&
      !url.startsWith('chrome-') &&
      getPlatformForUrl(url) === basePlatform &&
      !_isUtilityFrame(url);

    for (const key of activePlatforms) {
      const basePlatform = getBasePlatform(key);
      if (!ALL_PLATFORMS[basePlatform]) continue;
      const frame = platformFrames[key];

      // 优先：用 platformFrames 存的 frameId，但必须验证 URL 属于该平台真实对话页。
      if (frame?.frameId !== undefined) {
        const u = urlMap[frame.frameId];
        if (isSavableFrameUrl(u, basePlatform) && !usedFrameIds.has(frame.frameId)) {
          urls[key] = u;
          usedFrameIds.add(frame.frameId);
          continue;
        }
      }

      // 降级：从所有 frames 中找同平台、非工具 iframe、路径最具体（最长）的 URL。
      const candidates = (frames || [])
        .filter(f => isSavableFrameUrl(f.url, basePlatform) && !usedFrameIds.has(f.frameId))
        .sort((a, b) => {
          if (a.parentFrameId === 0 && b.parentFrameId !== 0) return -1;
          if (a.parentFrameId !== 0 && b.parentFrameId === 0) return 1;
          return b.url.length - a.url.length;
        });
      if (candidates.length) {
        urls[key] = candidates[0].url;
        usedFrameIds.add(candidates[0].frameId);
      }
    }
  } catch (e) {
    console.warn('[FlowChat] saveCurrentGroup: 获取 frame URL 失败', e);
  }
  console.log('[FlowChat] saveCurrentGroup urls:', urls);
  return urls;
}

function normalizeUrlForCompare(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString().replace(/\/$/, '');
  } catch {
    return String(url || '').replace(/\/$/, '');
  }
}

function formatSessionTimestamp(ts = Date.now()) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getInitialSessionName(ts = Date.now()) {
  return `新对话 ${formatSessionTimestamp(ts)}`;
}

function cleanConversationTitle(raw) {
  let title = String(raw || '').trim();
  if (!title) return '';

  const platformNames = [
    ...new Set([
      ...Object.values(ALL_PLATFORMS).flatMap(p => [p.name, p.icon]).filter(Boolean),
      'Claude', 'Anthropic', 'ChatGPT', 'OpenAI', 'Gemini', 'Google', 'Grok', 'xAI',
      'Copilot', 'Kimi', 'Kimi AI', 'DeepSeek', 'Doubao', '豆包', '元宝', '秘塔搜索',
      '知乎直答', '智谱清言', 'MiniMax', 'Poe', 'Z.ai', '文心一言'
    ])
  ].map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  // 去掉平台品牌后缀：如 "问候与帮助 - 豆包"、"xxx | Claude"。
  const suffixRe = new RegExp(`\\s*[\\|—\\-–]\\s*(${platformNames.join('|')})(\\s*(AI|官网|助手))?\\s*$`, 'i');
  let prev = '';
  while (title && title !== prev) {
    prev = title;
    title = title.replace(suffixRe, '').trim();
  }

  // 去掉常见页面品牌尾巴和文件名非法字符。
  title = title
    .replace(/\s*-\s*(AI\s*)?智能助手\s*$/i, '')
    .replace(/\s*官网\s*$/i, '')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  if (!title) return '';
  if (platformNames.some(name => new RegExp(`^${name}$`, 'i').test(title))) return '';
  if (/^[A-Za-z0-9.\-]+$/.test(title) && title.length < 10) return '';
  return title;
}

function hasConversationMaterial(group) {
  const hasReplies = Object.keys(replyStore).length > 0 ||
    conversationLog.some(r => Object.keys(r.replies || {}).length > 0);
  const hasHighlights = (group.highlights || []).length > 0;
  const hasConversationUrl = Object.entries(group.urls || {}).some(([key, url]) => {
    const baseUrl = ALL_PLATFORMS[getBasePlatform(key)]?.url;
    return url && baseUrl && normalizeUrlForCompare(url) !== normalizeUrlForCompare(baseUrl);
  });
  return hasReplies || hasHighlights || hasConversationUrl;
}

async function makeCurrentGroupSnapshot(name, opts = {}) {
  const urls = await captureCurrentGroupUrls();
  const cleanName = String(name || '').trim();
  const createdAt = opts.createdAt || Date.now();
  return {
    id:        opts.id || `g_${Date.now()}`,
    name:      cleanName || getInitialSessionName(createdAt),
    createdAt,
    updatedAt: Date.now(),
    sessionId: currentSessionId,
    autoSaved: opts.autoSaved === true,
    platforms: [...activePlatforms],
    settings:  { ...settings },
    urls,
    highlights: getCurrentGroupHighlights(),
  };
}

async function saveCurrentGroup(name) {
  const group = await makeCurrentGroupSnapshot(name, { autoSaved: false });
  const stored = await chrome.storage.local.get(GROUPS_KEY);
  const groups = stored[GROUPS_KEY] || [];
  groups.unshift(group);
  await chrome.storage.local.set({ [GROUPS_KEY]: groups });
  return group;
}

async function upsertAutoSavedCurrentGroup(reason = '', opts = {}) {
  if (!groupAutoSave) return null;
  if (_autoSaveRunning) {
    if (opts.force) {
      for (let i = 0; i < 20 && _autoSaveRunning; i++) await sleep(100);
      if (_autoSaveRunning) return null;
    } else {
      _autoSaveQueued = true;
      return null;
    }
  }

  _autoSaveRunning = true;
  try {
    const titleSlug = await getBestExportTitle().catch(() => null);
    const stored = await chrome.storage.local.get(GROUPS_KEY);
    const groups = Array.isArray(stored[GROUPS_KEY]) ? stored[GROUPS_KEY] : [];
    const idx = groups.findIndex(g =>
      (currentAutoSavedGroupId && g.id === currentAutoSavedGroupId) ||
      (g.autoSaved === true && g.sessionId === currentSessionId)
    );
    const existing = idx >= 0 ? groups[idx] : null;
    const group = await makeCurrentGroupSnapshot(titleSlug || existing?.name || '', {
      id: existing?.id || currentAutoSavedGroupId || undefined,
      createdAt: existing?.createdAt,
      autoSaved: true,
    });
    if (!existing) group.name = getInitialSessionName(group.createdAt);

    if (!opts.force && !hasConversationMaterial(group)) return null;

    if (existing) {
      const nextName = titleSlug && !/^新对话\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(titleSlug)
        ? titleSlug
        : existing.name || group.name;
      groups[idx] = {
        ...existing,
        ...group,
        name: nextName,
        createdAt: existing.createdAt || group.createdAt,
      };
    } else {
      groups.unshift(group);
    }
    currentAutoSavedGroupId = group.id;
    await chrome.storage.local.set({ [GROUPS_KEY]: groups });

    const historyPopover = document.getElementById('popover-history');
    if (historyPopover && historyPopover.style.display !== 'none') {
      await renderGroupsPopover();
    }
    if (opts.toast) showToast(`已自动保存"${group.name}"`);
    console.log('[FlowChat] auto save session', { reason, id: group.id, urls: group.urls });
    return group;
  } catch (e) {
    console.warn('[FlowChat] 自动保存会话失败', e);
    if (opts.toast) showToast('自动保存会话失败，可在会话历史中手动保存');
    return null;
  } finally {
    _autoSaveRunning = false;
    if (_autoSaveQueued) {
      _autoSaveQueued = false;
      scheduleAutoSaveCurrentGroup('queued', 800);
    }
  }
}

function scheduleAutoSaveCurrentGroup(reason = '', delay = 1200) {
  if (!groupAutoSave) return;
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    _autoSaveTimer = null;
    upsertAutoSavedCurrentGroup(reason).catch(e =>
      console.warn('[FlowChat] 自动保存会话失败', e)
    );
  }, delay);
}

async function autoSaveCurrentGroupBeforeNewChat() {
  if (!groupAutoSave) return null;

  try {
    const group = await upsertAutoSavedCurrentGroup('before-new-chat', { force: true, toast: false });
    if (!group) return null;
    showToast(`已自动保存"${group.name}"`);
    return group;
  } catch (e) {
    console.warn('[FlowChat] 自动保存会话失败', e);
    showToast('自动保存会话失败，可在会话历史中手动保存');
    return null;
  }
}

async function restoreGroup(group) {
  if (!confirm(`恢复会话组"${group.name}"？\n当前页面会切换到保存时的平台和链接。`)) return;
  pendingGroupUrls = { ...group.urls };
  pendingGroupHighlights = {};
  for (const hl of (group.highlights || [])) {
    if (!hl.platform) continue;
    if (!pendingGroupHighlights[hl.platform]) pendingGroupHighlights[hl.platform] = [];
    pendingGroupHighlights[hl.platform].push(hl);
  }
  activePlatforms  = [...group.platforms];
  settings         = { ...settings, ...group.settings };
  clearCurrentConversationState({ clearHighlights: false });
  highlights        = (group.highlights || []).map(h => normalizeHighlightRecord(h, {
    sessionId: currentSessionId,
    groupId: group.id,
  }));
  bridgeStatus = {};
  pickerState = {};
  Object.keys(platformFrames).forEach(k => delete platformFrames[k]);
  carouselOffset   = 0;
  await saveConfig();
  renderGrid();
  syncSettingsUI();
  renderHighlightPanel();
  closeGroupsPopover();
  showToast(`已恢复"${group.name}"`);
}

async function deleteGroup(id) {
  const stored = await chrome.storage.local.get(GROUPS_KEY);
  const groups = (stored[GROUPS_KEY] || []).filter(g => g.id !== id);
  await chrome.storage.local.set({ [GROUPS_KEY]: groups });
  renderGroupsPopover();
}

async function renderGroupsPopover() {
  const list = document.getElementById('groups-list');
  if (!list) return;
  const stored = await chrome.storage.local.get(GROUPS_KEY);
  const groups = stored[GROUPS_KEY] || [];
  if (groups.length === 0) {
    list.innerHTML = `<div class="hl-empty"><div>${msg('groups_empty')}</div><div style="font-size:11px;color:var(--txt2);margin-top:4px">${msg('groups_empty_restore')}</div></div>`;
    return;
  }
  list.innerHTML = groups.map(g => {
    const date  = new Date(g.createdAt).toLocaleDateString('zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const names = g.platforms.map(k => ALL_PLATFORMS[getBasePlatform(k)]?.name || k).join(' · ');
    const urlN  = Object.keys(g.urls || {}).length;
    return `<div class="group-item" data-id="${g.id}">
      <div class="group-item-info">
        <div class="group-item-name">${escHtml(g.name)}</div>
        <div class="group-item-meta">${date} · ${g.platforms.length} 个平台${urlN > 0 ? ` · ${urlN} 个链接` : ''}</div>
        <div class="group-item-platforms">${names}</div>
      </div>
      <div class="group-item-acts">
        <button class="group-restore-btn" data-action="restore-group" data-id="${g.id}">${msg('group_restore')}</button>
        <button class="group-del-btn" data-action="delete-group" data-id="${g.id}" data-tooltip="${msg('btn_delete_tooltip')}">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

function openGroupsPopover(anchorBtn = null) {
  renderLayoutsList();
  const popover = document.getElementById('popover-groups');
  const btn     = anchorBtn || document.getElementById('btn-groups');
  positionPopover(popover, btn);
}

function closeGroupsPopover() {
  document.getElementById('popover-groups').style.display = 'none';
}

function openHistoryPopover(anchorBtn = null) {
  renderGroupsPopover();
  const popover = document.getElementById('popover-history');
  const btn     = anchorBtn || document.getElementById('btn-history');
  const cb      = document.getElementById('group-auto-save');
  if (cb) cb.checked = groupAutoSave;
  positionPopover(popover, btn);
}

function closeHistoryPopover() {
  document.getElementById('popover-history').style.display = 'none';
}

function sanitizeLayoutPlatforms(platforms) {
  const list = Array.isArray(platforms) ? platforms : [];
  const valid = list.filter(k => ALL_PLATFORMS[getBasePlatform(k)]);
  return valid.length ? valid : DEFAULT_ACTIVE_PLATFORMS.filter(k => ALL_PLATFORMS[k]);
}

function getPersistentPlatforms(platforms = activePlatforms) {
  return (Array.isArray(platforms) ? platforms : []).filter(k => !transientPlatforms.has(k));
}

function getPersistentSettings(settingsInput = settings, platformsInput = getPersistentPlatforms()) {
  const platforms = Array.isArray(platformsInput) ? platformsInput : [];
  const next = { ...(settingsInput || {}) };
  next.windowOrder = Array.isArray(next.windowOrder)
    ? next.windowOrder.filter(k => platforms.includes(k))
    : [];
  if (next.synthesisTarget && !platforms.includes(next.synthesisTarget)) {
    next.synthesisTarget = null;
  }
  return next;
}

function getDefaultSettings() {
  return {
    visibleCols:      5,
    displayMode:      'carousel',
    barPosition:      'top',
    windowOrder:      [],
    synthesisTarget:  null,
    navBtnEnabled:    true,
    swipeEnabled:     false,
    swipeSnap:        true,
    agentMode:        false,
    showBtnLabels:    false,
  };
}

function normalizeLayoutSettings(layoutSettings, platforms) {
  const next = { ...getDefaultSettings(), ...(layoutSettings || {}) };
  next.visibleCols = Math.max(1, Math.min(5, parseInt(next.visibleCols) || 5));
  next.displayMode = next.displayMode === 'grid' ? 'grid' : 'carousel';
  next.barPosition = next.barPosition === 'bottom' ? 'bottom' : 'top';
  next.windowOrder = Array.isArray(next.windowOrder)
    ? next.windowOrder.filter(k => platforms.includes(k))
    : [];
  if (next.synthesisTarget && !platforms.includes(next.synthesisTarget)) {
    next.synthesisTarget = null;
  }
  return next;
}

function makeLayoutSnapshot(name, id = null, createdAt = Date.now(), platformsInput = activePlatforms, settingsInput = settings) {
  const platforms = sanitizeLayoutPlatforms(getPersistentPlatforms(platformsInput));
  const snapshotSettings = normalizeLayoutSettings(getPersistentSettings(settingsInput, platforms), platforms);
  return {
    id: id || `l_${Date.now()}`,
    name: (name || '').trim() || msg('layout_default_name'),
    createdAt,
    updatedAt: Date.now(),
    platforms,
    settings: snapshotSettings,
  };
}

async function ensureLayoutState() {
  const stored = await chrome.storage.local.get([LAYOUTS_KEY, CURRENT_LAYOUT_KEY]);
  let layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  let currentId = stored[CURRENT_LAYOUT_KEY];

  if (!layouts.length) {
    const first = makeLayoutSnapshot(msg('layout_default_name'));
    layouts = [first];
    currentId = first.id;
    await chrome.storage.local.set({ [LAYOUTS_KEY]: layouts, [CURRENT_LAYOUT_KEY]: currentId });
  }

  const current = layouts.find(l => l.id === currentId) || layouts[0];
  currentLayoutId = current.id;
  activePlatforms = sanitizeLayoutPlatforms(current.platforms);
  settings = normalizeLayoutSettings(current.settings, activePlatforms);

  if (current.id !== currentId) {
    await chrome.storage.local.set({ [CURRENT_LAYOUT_KEY]: current.id });
  }
  await chrome.storage.sync.set({ activePlatforms, settings });
}

async function saveActiveLayoutState() {
  if (_applyingLayout || !currentLayoutId) return;
  const stored = await chrome.storage.local.get(LAYOUTS_KEY);
  const layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  const idx = layouts.findIndex(l => l.id === currentLayoutId);
  if (idx < 0) return;
  layouts[idx] = makeLayoutSnapshot(layouts[idx].name, layouts[idx].id, layouts[idx].createdAt);
  await chrome.storage.local.set({ [LAYOUTS_KEY]: layouts });
}

function resetLayoutRuntimeState() {
  if (focusedPlatform) exitFocus();
  bridgeStatus = {};
  pickerState = {};
  pendingGroupHighlights = {};
  highlights = [...allHighlights];
  replyStore = {};
  conversationLog = [];
  queuedMessages = [];
  Object.keys(platformGenerating).forEach(k => delete platformGenerating[k]);
  Object.keys(platformFrames).forEach(k => delete platformFrames[k]);
  Object.keys(_processQueueSentAt).forEach(k => delete _processQueueSentAt[k]);
  Object.keys(_platformGenerationStartedAt).forEach(k => delete _platformGenerationStartedAt[k]);
  Object.keys(_platformLastActivityAt).forEach(k => delete _platformLastActivityAt[k]);
  Object.keys(_pendingForBridge).forEach(k => delete _pendingForBridge[k]);
  Object.keys(_platformRoundId).forEach(k => delete _platformRoundId[k]);
  transientPlatforms.clear();
  updateQueueUI();
  renderHighlightPanel();
}

async function saveCurrentLayout(name) {
  const stored = await chrome.storage.local.get(LAYOUTS_KEY);
  const layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  const idx = layouts.findIndex(l => l.id === currentLayoutId);
  const typedName = (name || '').trim();
  const oldName = layouts[idx]?.name || msg('layout_default_name');
  const saveAsNew = typedName && typedName !== oldName;
  const snapshot = saveAsNew
    ? makeLayoutSnapshot(typedName, null, Date.now(), activePlatforms, settings)
    : makeLayoutSnapshot(oldName, currentLayoutId || null, layouts[idx]?.createdAt || Date.now(), activePlatforms, settings);
  if (saveAsNew || idx < 0) layouts.unshift(snapshot);
  else layouts[idx] = snapshot;
  currentLayoutId = snapshot.id;
  await chrome.storage.local.set({ [LAYOUTS_KEY]: layouts, [CURRENT_LAYOUT_KEY]: currentLayoutId });
  await saveConfig();
  return snapshot;
}

async function createLayout(name) {
  await saveActiveLayoutState();
  const stored = await chrome.storage.local.get(LAYOUTS_KEY);
  const layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  const layout = makeLayoutSnapshot(name || msg('layout_new_default'), null, Date.now(), activePlatforms, settings);
  layouts.unshift(layout);
  currentLayoutId = layout.id;
  await chrome.storage.local.set({ [LAYOUTS_KEY]: layouts, [CURRENT_LAYOUT_KEY]: currentLayoutId });
  await renderLayoutsList();
  await new Promise(resolve => requestAnimationFrame(resolve));
  await applyLayout(layout, { persist: true });
  return layout;
}

async function switchToLayout(id) {
  if (!id || id === currentLayoutId) return null;
  await saveActiveLayoutState();
  const stored = await chrome.storage.local.get(LAYOUTS_KEY);
  const layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  const layout = layouts.find(l => l.id === id);
  if (!layout) return null;
  await applyLayout(layout, { persist: true });
  return layout;
}

async function applyLayout(layout, opts = {}) {
  if (!layout) return;
  _applyingLayout = true;
  try {
    currentLayoutId = layout.id;
    activePlatforms = sanitizeLayoutPlatforms(layout.platforms);
    settings = normalizeLayoutSettings(layout.settings, activePlatforms);
    carouselOffset = 0;
    pendingGroupUrls = {};
    resetLayoutRuntimeState();
    applyBarPosition(settings.barPosition);
    applyBtnLabels(getEffectiveBtnLabels());
    renderGrid();
    renderAddPlatformPopover();
    syncSettingsUI();
    if (opts.persist !== false) {
      await chrome.storage.local.set({ [CURRENT_LAYOUT_KEY]: currentLayoutId });
      await chrome.storage.sync.set({ activePlatforms, settings });
    }
  } finally {
    _applyingLayout = false;
  }
}

async function deleteLayout(id) {
  const stored = await chrome.storage.local.get(LAYOUTS_KEY);
  let layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  if (layouts.length <= 1) {
    showToast(msg('toast_layout_keep_one'));
    return;
  }
  const target = layouts.find(l => l.id === id);
  if (!target) return;
  if (!confirm(msg('confirm_delete_layout', [target.name]))) return;
  layouts = layouts.filter(l => l.id !== id);
  let nextCurrentId = currentLayoutId;
  if (currentLayoutId === id) {
    nextCurrentId = layouts[0].id;
    await chrome.storage.local.set({ [LAYOUTS_KEY]: layouts, [CURRENT_LAYOUT_KEY]: nextCurrentId });
    await applyLayout(layouts[0], { persist: true });
  } else {
    await chrome.storage.local.set({ [LAYOUTS_KEY]: layouts });
  }
  currentLayoutId = nextCurrentId;
  renderLayoutsList();
}

async function renameLayout(id, name) {
  const nextName = (name || '').trim();
  if (!nextName) return;
  const stored = await chrome.storage.local.get(LAYOUTS_KEY);
  const layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  const layout = layouts.find(l => l.id === id);
  if (!layout) return;
  layout.name = nextName;
  layout.updatedAt = Date.now();
  await chrome.storage.local.set({ [LAYOUTS_KEY]: layouts });
  renderLayoutsList();
}

async function renderLayoutsList() {
  const list = document.getElementById('layouts-list');
  if (!list) return;
  const stored = await chrome.storage.local.get(LAYOUTS_KEY);
  const layouts = Array.isArray(stored[LAYOUTS_KEY]) ? stored[LAYOUTS_KEY] : [];
  if (!layouts.length) {
    list.innerHTML = `<div class="hl-empty"><div>${msg('layouts_empty')}</div></div>`;
    return;
  }
  list.innerHTML = layouts.map(l => {
    const platforms = sanitizeLayoutPlatforms(l.platforms);
    const cols = normalizeLayoutSettings(l.settings, platforms).visibleCols;
    const names = platforms.map(k => ALL_PLATFORMS[getBasePlatform(k)]?.name || k).map(escHtml).join(' · ');
    const active = l.id === currentLayoutId;
    const date = new Date(l.updatedAt || l.createdAt || Date.now()).toLocaleDateString('zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    return `<div class="layout-item${active ? ' active' : ''}" data-id="${escHtml(l.id)}">
      <div class="layout-main" data-action="switch-layout" data-id="${escHtml(l.id)}">
        <div class="layout-name-row">
          <input class="layout-name-edit" data-action="rename-layout" data-id="${escHtml(l.id)}" value="${_escAttr(l.name || msg('layout_default_name'))}" maxlength="40">
          ${active ? `<span class="layout-active-badge">${msg('layout_active')}</span>` : ''}
        </div>
        <div class="layout-meta">${msg('layout_meta', [String(platforms.length), String(cols)])} · ${date}</div>
        <div class="group-item-platforms">${names}</div>
      </div>
      <div class="group-item-acts">
        ${active ? '' : `<button class="group-restore-btn" data-action="switch-layout" data-id="${escHtml(l.id)}">${msg('layout_switch')}</button>`}
        <button class="group-del-btn" data-action="delete-layout" data-id="${escHtml(l.id)}" data-tooltip="${msg('btn_delete_tooltip')}">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// 自定义渠道 Dialog
// ============================================================

function showCustomPlatformForm() {
  // 切换弹窗内部视图：隐藏列表，显示表单
  document.querySelector('#popover-add .add-section-label').style.display = 'none';
  document.getElementById('platform-manage-list').style.display = 'none';
  const form = document.getElementById('cpf-view');
  document.getElementById('cpf-name').value = '';
  document.getElementById('cpf-url').value  = '';
  document.getElementById('cpf-error').textContent = '';
  applyI18n(form);
  form.style.display = 'flex';
  document.getElementById('cpf-url').focus();
}

function hideCustomPlatformForm() {
  document.getElementById('cpf-view').style.display = 'none';
  document.querySelector('#popover-add .add-section-label').style.display = '';
  document.getElementById('platform-manage-list').style.display = '';
}

// ============================================================
// 渲染：添加平台弹窗
// ============================================================

/**
 * 渲染「AI 渠道管理」面板
 * 每个平台只出现一次：
 *   已激活 → 上方，可拖拽排序；有删除(×)和多开(+)按钮
 *   未激活 → 下方，点击添加
 */
function renderAddPlatformPopover() {
  const list = document.getElementById('platform-manage-list');
  if (!list) return;

  const ordered  = getOrderedPlatforms();
  // 按 basePlatform 分组：{ claude: ['claude','claude_2'], chatgpt: ['chatgpt'] }
  const activeByBase = {};
  for (const key of ordered) {
    const base = getBasePlatform(key);
    (activeByBase[base] = activeByBase[base] || []).push(key);
  }

  const inactiveBasePlatforms = Object.keys(ALL_PLATFORMS).filter(k => !activeByBase[k]);
  const groupTitle = group => ({
    active: msg('pm_group_active'),
    international: msg('pm_group_international'),
    china: msg('pm_group_china'),
    custom: msg('pm_group_custom'),
  }[group] || group);

  const renderSection = (group, rows) => {
    if (!rows.length) return '';
    return `<section class="pm-section pm-section--${group}">
      <div class="pm-section-title">${groupTitle(group)}</div>
      <div class="pm-section-grid">${rows.join('')}</div>
    </section>`;
  };

  // 已激活行：每个实例一行，同一平台多实例共享一组
  const activeRows = ordered.map((key, i) => {
    const base  = getBasePlatform(key);
    const p     = ALL_PLATFORMS[base]; if (!p) return '';
    const meta  = PLATFORM_META[base]?.company || '';
    const count = activeByBase[base].length;
    const num   = key.match(/_(\d+)$/)?.[1];
    const label = count > 1 ? `${p.name} #${num || '1'}` : p.name;
    return `<div class="pm-item pm-item--active" data-key="${key}" draggable="true">
      <span class="pm-handle">⠿</span>
      <div class="pm-dot" style="background:${p.color}"></div>
      <span class="pm-name">${escHtml(label)}</span>
      <span class="pm-meta">${escHtml(meta)}</span>
      <span class="pm-idx">${i + 1}</span>
      <button class="pm-remove" data-action="pm-remove" data-key="${key}" data-tooltip="${msg('pm_remove_tooltip')}">
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
      <button class="pm-dupe" data-action="pm-add" data-key="${base}" data-tooltip="${msg('pm_dupe_tooltip')}">
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 1v10M1 6h10"/></svg>
      </button>
    </div>`;
  });

  // 未激活行
  const inactiveRowsByGroup = { international: [], china: [] };
  inactiveBasePlatforms.forEach(key => {
    const p = ALL_PLATFORMS[key];
    const meta = PLATFORM_META[key] || {};
    const group = PLATFORM_GROUP_ORDER.includes(meta.group) ? meta.group : 'international';
    inactiveRowsByGroup[group].push(`<div class="pm-item pm-item--inactive" data-key="${key}">
      <span class="pm-handle-placeholder"></span>
      <div class="pm-dot" style="background:${p.color};opacity:.4"></div>
      <span class="pm-name" style="color:var(--txt2)">${escHtml(p.name)}</span>
      <span class="pm-meta">${escHtml(meta.company || '')}</span>
      <span class="pm-btn-placeholder"></span>
      <button class="pm-add" data-action="pm-add" data-key="${key}" data-tooltip="${msg('pm_add_tooltip')}">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 1v10M1 6h10"/></svg>
      </button>
    </div>`);
  });

  const customRow = `<div class="pm-item pm-item--custom" id="pm-add-custom">
      <span class="pm-handle-placeholder"></span>
      <div class="pm-dot" style="background:#7c3aed;opacity:.7"></div>
      <span class="pm-name" style="color:var(--txt2)">${msg('custom_platform_option')}</span>
      <span class="pm-meta">${msg('pm_custom_meta')}</span>
      <span class="pm-btn-placeholder"></span>
      <button class="pm-add" data-action="pm-custom" data-tooltip="${msg('custom_platform_option')}">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 1v10M1 6h10"/></svg>
      </button>
    </div>`;

  list.innerHTML =
    renderSection('active', activeRows) +
    PLATFORM_GROUP_ORDER.map(group => renderSection(group, inactiveRowsByGroup[group] || [])).join('') +
    renderSection('custom', [customRow]);

  // 拖拽排序（仅已激活行）
  let dragKey = null;
  list.querySelectorAll('.pm-item--active').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragKey = item.dataset.key;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      list.querySelectorAll('.pm-item--active').forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
      const rect = item.getBoundingClientRect();
      item.classList.toggle('drag-over-top',    e.clientY < rect.top + rect.height / 2);
      item.classList.toggle('drag-over-bottom', e.clientY >= rect.top + rect.height / 2);
    });
    item.addEventListener('dragleave', e => {
      if (!item.contains(e.relatedTarget)) item.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over-top', 'drag-over-bottom');
      if (!dragKey || dragKey === item.dataset.key) return;
      const newOrder  = getOrderedPlatforms().filter(k => k !== dragKey);
      const targetIdx = newOrder.indexOf(item.dataset.key);
      const before    = e.clientY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
      newOrder.splice(before ? targetIdx : targetIdx + 1, 0, dragKey);
      settings.windowOrder = newOrder;
      applyWindowOrder();
      saveConfig();
      renderAddPlatformPopover();
    });
  });

  // 按钮事件
  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { action, key } = btn.dataset;
      if (action === 'pm-remove') removePlatform(key);
      if (action === 'pm-add')   { addPlatform(key); renderAddPlatformPopover(); }
      if (action === 'pm-custom') { showCustomPlatformForm(); }
    });
  });
}

// ── 浮窗定位工具 ──
function _clampPopoverLeft(left, width) {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  return Math.max(margin, Math.min(left, maxLeft));
}

function positionPopover(popover, btn) {
  if (!popover || !btn) return;
  popover.style.display = 'flex';
  popover.style.pointerEvents = 'auto';
  const rect     = btn.getBoundingClientRect();
  const pw       = popover.offsetWidth;
  const isBottom = settings.barPosition === 'bottom';
  // 水平：右对齐按钮右边，防超出屏幕左边
  let left = _clampPopoverLeft(rect.right - pw, pw);
  popover.style.left = left + 'px';
  if (isBottom) {
    const bottom = Math.max(8, window.innerHeight - rect.top + 8);
    popover.style.bottom = bottom + 'px';
    popover.style.top    = 'auto';
  } else {
    popover.style.top    = Math.max(8, rect.bottom + 8) + 'px';
    popover.style.bottom = 'auto';
  }
}

function openAddPlatformPopover(anchorBtn = null) {
  renderAddPlatformPopover();
  const popover = document.getElementById('popover-add');
  const btn     = anchorBtn || document.getElementById('btn-add-platform');
  positionPopover(popover, btn);
}

function closeAddPlatformPopover() {
  document.getElementById('popover-add').style.display = 'none';
  // 若自定义渠道表单处于激活状态，关闭弹窗时还原列表视图
  const form = document.getElementById('cpf-view');
  if (form && form.style.display !== 'none') hideCustomPlatformForm();
}

function openSettingsPopover(anchorBtn = null) {
  syncSettingsUI();
  const popover = document.getElementById('popover-settings');
  const btn     = anchorBtn || document.getElementById('btn-settings');
  positionPopover(popover, btn);
  // 初始化滚动提示渐变：每次打开时重新绑定 scroll 监听
  const body = popover.querySelector('.fc-popover-body');
  if (body) {
    const updateHint = () => {
      const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
      popover.classList.toggle('scroll-at-end', atEnd || body.scrollHeight <= body.clientHeight + 4);
    };
    if (body._settingsScrollFn) body.removeEventListener('scroll', body._settingsScrollFn);
    body._settingsScrollFn = updateHint;
    body.addEventListener('scroll', updateHint);
    requestAnimationFrame(updateHint);
  }
}

function closeSettingsPopover() {
  document.getElementById('popover-settings').style.display = 'none';
}

function closeSideHeaderMenu() {
  document.getElementById('side-header-menu')?.classList.remove('open');
}

function toggleSideHeaderMenu() {
  document.getElementById('side-header-menu')?.classList.toggle('open');
}

function handleSideHeaderAction(action) {
  const anchor = document.getElementById('btn-side-header-more');
  closeSideHeaderMenu();
  switch (action) {
    case 'groups':    openGroupsPopover(anchor); break;
    case 'history':   openHistoryPopover(anchor); break;
    case 'newchat':   newChatAll(); break;
    case 'panel':     toggleHighlightPanel(); break;
    case 'synthesis': openSynthesisAllPopup(anchor); break;
    case 'export':    exportAllReplies(); break;
    case 'add':       openAddPlatformPopover(anchor); break;
    case 'settings':  openSettingsPopover(anchor); break;
  }
}

// ============================================================
// 设置面板
// ============================================================

function applyBarPosition(pos) {
  document.body.classList.toggle('bar-bottom', pos === 'bottom');
}

function applyBtnLabels(show) {
  document.body.classList.toggle('fc-show-btn-labels', !!show);
  document.body.classList.toggle('fc-hide-btn-labels', !show);
}

function getEffectiveBtnLabels() {
  return IS_SIDE_PANEL ? sidePanelSettings.showBtnLabels === true : settings.showBtnLabels === true;
}

function syncSettingsUI() {
  document.querySelectorAll('[data-set-cols]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.setCols) === settings.visibleCols);
  });
  document.querySelectorAll('[name="displayMode"]').forEach(r => {
    r.checked = r.value === settings.displayMode;
  });
  document.querySelectorAll('[name="barPosition"]').forEach(r => {
    r.checked = r.value === settings.barPosition;
  });
  // 翻页方式开关
  const navBtnEl = document.getElementById('setting-nav-btn');
  if (navBtnEl) navBtnEl.checked = settings.navBtnEnabled !== false;
  const swipeEl = document.getElementById('setting-swipe');
  if (swipeEl) swipeEl.checked = !!settings.swipeEnabled;
  const snapEl = document.getElementById('setting-swipe-snap');
  if (snapEl) snapEl.checked = settings.swipeSnap !== false;
  const snapRow = document.getElementById('toggle-snap-row');
  if (snapRow) snapRow.style.display = settings.swipeEnabled ? '' : 'none';
  // 连接编程智能体开关
  const agentEl = document.getElementById('setting-agent-mode');
  if (agentEl) agentEl.checked = !!settings.agentMode;
  applyAgentMode(settings.agentMode);
  // 按钮文字标签开关
  const btnLabelsEl = document.getElementById('setting-btn-labels');
  if (btnLabelsEl) btnLabelsEl.checked = getEffectiveBtnLabels();
  applyBtnLabels(getEffectiveBtnLabels());
  const hlAutoOpenEl = document.getElementById('setting-highlight-panel-auto-open');
  if (hlAutoOpenEl) hlAutoOpenEl.checked = settings.highlightPanelAutoOpen !== false;
}

// ============================================================
// iframe 管理
// ============================================================

function loadIframe(key) {
  const p      = ALL_PLATFORMS[getBasePlatform(key)]; if (!p) return;
  const iframe = document.getElementById(`iframe-${key}`);
  const spinner= document.getElementById(`spinner-${key}`);
  if (!iframe) return;

  bridgeStatus[key] = 'loading';
  delete platformFrames[key];
  updateDot(key, 'loading');
  if (spinner) spinner.style.display = 'flex';

  let handled = false;
  let reloadCount = 0;
  const reloadIframe = (reason, delay = 300) => {
    if (reloadCount >= 2) return false;
    reloadCount += 1;
    console.log(`[FlowChat] ${key}: ${reason}，自动重载 iframe`);
    const url = iframe.src && iframe.src !== 'about:blank' ? iframe.src : (pendingGroupUrls[key] || p.url);
    handled = false;
    bridgeStatus[key] = 'loading';
    updateDot(key, 'loading');
    if (spinner) spinner.style.display = 'flex';
    iframe.src = 'about:blank';
    setTimeout(() => { iframe.src = url; }, delay);
    return true;
  };
  iframe.addEventListener('load', async () => {
    if (!iframe.src || iframe.src === 'about:blank') return;
    if (handled) return;
    handled = true;
    setTimeout(() => { if (spinner) spinner.style.display = 'none'; }, 2000);
    await sleep(1800);
    const injected = await injectBridgeToIframe(key);
    if (!injected && bridgeStatus[key] !== 'connected') {
      reloadIframe('未找到可注入的真实平台 frame');
      return;
    }
    setTimeout(() => {
      if (bridgeStatus[key] !== 'connected' && reloadCount < 2) {
        // bridge 12s 未连接（可能加载了错误页面，如 Gemini "Something went wrong"）
        // 自动重载一次，避免用户需要手动强制刷新
        reloadIframe('bridge 12s 未连接');
      } else if (bridgeStatus[key] !== 'connected') {
        bridgeStatus[key] = 'ready'; updateDot(key, 'connected');
      }
    }, 12000);
  });
  const targetUrl = pendingGroupUrls[key] || p.url;
  delete pendingGroupUrls[key];
  iframe.src = targetUrl;
}

async function injectBridgeToIframe(key) {
  try {
    const basePlatform = getBasePlatform(key);
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    // 已分配给其他实例的 frameId，不重复注入
    const assignedFrameIds = new Set(Object.entries(platformFrames)
      .filter(([k]) => k !== key)
      .map(([, f]) => f.frameId));
    const frame  = frames.find(f =>
      f.frameId !== 0 &&
      getPlatformForUrl(f.url) === basePlatform &&
      !assignedFrameIds.has(f.frameId)
    );
    if (!frame) return false;
    // 自定义平台：注入前设置 window.__fc_platform__，bridge.js 靠此识别平台
    if (ALL_PLATFORMS[basePlatform]?._custom) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frame.frameId] },
        world:  'ISOLATED',
        func:   (key) => { window.__fc_platform__ = key; },
        args:   [basePlatform],
      });
    }
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frame.frameId] },
      files: ['bridge.js', 'highlight.js']
    });
    return true;
  } catch (e) {
    console.warn(`[FlowChat] 注入失败 ${key}:`, e.message);
    return false;
  }
}

function updateDot(key, status) {
  const dot = document.getElementById(`dot-${key}`);
  if (dot) dot.className = `col-dot ${status}`;
}

// ============================================================
// 待上传文件状态管理
// ============================================================

function isImageFile(file) {
  return file.type.startsWith('image/');
}

function getFileIconLabel(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLS';
  if (['ppt', 'pptx'].includes(ext)) return 'PPT';
  if (['txt', 'md'].includes(ext)) return 'TXT';
  if (['zip', 'rar', '7z', 'gz'].includes(ext)) return 'ZIP';
  if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb'].includes(ext)) return ext.toUpperCase().slice(0, 3);
  return ext.slice(0, 3).toUpperCase() || 'FILE';
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addPendingFile(file) {
  if (!file) return;
  // 限制单个文件 20MB
  if (file.size > 20 * 1024 * 1024) {
    showToast(msg('toast_file_too_large', [file.name]));
    return;
  }
  const dataUrl = isImageFile(file) ? await readFileAsDataURL(file) : null;
  const entry = {
    file,
    dataUrl,
    preview: dataUrl || getFileIconLabel(file),
    isImage: !!dataUrl,
  };
  pendingFiles.push(entry);
  renderFileThumbs();
}

function renderFileThumbs() {
  const container = document.getElementById('file-thumbs');
  if (!container) return;
  container.innerHTML = pendingFiles.map((entry, idx) => {
    const inner = entry.isImage
      ? `<img src="${entry.dataUrl}" alt="">`
      : `<div class="file-thumb-icon">${getFileIconLabel(entry.file)}</div>`;
    const nameBar = `<div class="file-thumb-name">${escHtml(entry.file.name)}</div>`;
    return `<div class="file-thumb" data-idx="${idx}">
      ${inner}
      ${nameBar}
      <button class="file-thumb-remove" data-remove-idx="${idx}" title="${msg('btn_cancel')}">×</button>
    </div>`;
  }).join('');
  container.querySelectorAll('[data-remove-idx]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeIdx, 10);
      removePendingFile(idx);
    });
  });
}

function removePendingFile(index) {
  if (index < 0 || index >= pendingFiles.length) return;
  pendingFiles.splice(index, 1);
  renderFileThumbs();
}

// ============================================================
// 文件上传链路
// ============================================================

/** 将文件上传到所有活跃平台（并行，单平台失败不抛出） */
async function uploadFilesToAllPlatforms(fileEntries) {
  const tasks = activePlatforms.map(key => uploadFilesToPlatform(key, fileEntries));
  await Promise.allSettled(tasks);
}

/** 向单个平台上传多个文件 */
async function uploadFilesToPlatform(key, fileEntries) {
  const basePlatform = getBasePlatform(key);
  try {
    const ctx = await getFlowChatTabContext(key);
    if (!ctx.tabId) return;
    const frame = ctx.frames.find(f => f.frameId !== 0 && getPlatformForUrl(f.url) === basePlatform);
    if (!frame) return;

    // 将文件转为 base64 传输（跨 world 序列化可靠）
    const attachments = await Promise.all(fileEntries.map(async entry => {
      const base64 = await fileToBase64(entry.file);
      return {
        data: base64,
        name: entry.file.name,
        mime: entry.file.type || 'application/octet-stream',
        isImage: entry.isImage,
      };
    }));

    await chrome.scripting.executeScript({
      target: { tabId: ctx.tabId, frameIds: [frame.frameId] },
      world: 'MAIN',
      func: uploadFilesInPage,
      args: [attachments, basePlatform],
    });
  } catch (e) {
    console.warn(`[FlowChat] 文件上传到 ${key} 失败:`, e.message);
  }
}

/** 文件转 base64（不含 data: 前缀） */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 注入到 iframe MAIN world 执行（自包含，不引用外部作用域）：
 * - DeepSeek：拦截 HTMLInputElement.prototype.click/showPicker，通过 paste 逐个上传，finally 中延迟 2000ms 恢复
 * - 其他平台：优先 input[type=file] 赋值；失败且为图片时降级 paste；仍失败降级 drop
 */
async function uploadFilesInPage(attachments, provider) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function base64ToFile(att) {
    try {
      const binary = atob(att.data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: att.mime || 'application/octet-stream' });
      return new File([blob], att.name || 'file', { type: att.mime || 'application/octet-stream' });
    } catch (e) { return null; }
  }

  function buildDataTransfer(files) {
    const dt = new DataTransfer();
    for (const f of files) { try { dt.items.add(f); } catch {} }
    return dt.files.length ? dt : null;
  }

  function findFileInput(acceptDoc) {
    if (provider === 'yuanbao') {
      const editor = document.querySelector('.ql-editor[contenteditable="true"]') ||
                     document.querySelector('.chat-input-editor .ql-editor') ||
                     document.querySelector('[role="textbox"][contenteditable="true"]');
      const scopes = [];
      if (editor) {
        const searchBar = editor.closest('#search-bar');
        const qlContainer = editor.closest('.ql-container');
        const editorRoot = editor.closest('.chat-input-editor');
        if (searchBar) scopes.push(searchBar);
        if (qlContainer) scopes.push(qlContainer);
        if (editorRoot) scopes.push(editorRoot);
        scopes.push(editor.parentElement || editor);
      }
      scopes.push(document);
      for (const scope of scopes) {
        if (!scope || !scope.querySelectorAll) continue;
        const inputs = scope.querySelectorAll('input[type="file"]');
        for (const el of inputs) {
          if (el.disabled) continue;
          return el;
        }
      }
      return null;
    }
    const inputs = document.querySelectorAll('input[type="file"]');
    // 第一轮：按文件类型精确匹配，避免文档塞进图片专用 input（accept 仅含图片扩展名）
    for (const el of inputs) {
      if (el.disabled) continue;
      const accept = String(el.getAttribute('accept') || '').toLowerCase();
      if (acceptDoc) {
        // 上传文档：仅匹配 accept 为空、*/* 或包含文档扩展名/application 类型的 input
        if (!accept || accept.includes('*/*') || accept.includes('application/') ||
            /\.(pdf|docx?|txt|xlsx?|pptx?|csv|md)/.test(accept)) return el;
      } else {
        // 上传图片：匹配 accept 为空、含 image 或 */* 的 input
        if (!accept || accept.includes('image') || accept.includes('*/*')) return el;
      }
    }
    // 第二轮：宽松兜底。上传文档时排除仅接受图片的 input，避免假成功阻断降级
    for (const el of inputs) {
      if (el.disabled) continue;
      const accept = String(el.getAttribute('accept') || '').toLowerCase();
      if (acceptDoc && accept && !accept.includes('*/*') && !accept.includes('application/') &&
          !/\.(pdf|docx?|txt|xlsx?|pptx?|csv|md)/.test(accept)) continue;
      return el;
    }
    return null;
  }

  function assignInputFiles(input, files) {
    const dt = buildDataTransfer(files);
    if (!dt) return false;
    try { input.files = dt.files; } catch {
      try { Object.defineProperty(input, 'files', { value: dt.files, configurable: true }); } catch { return false; }
    }
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return true;
  }

  function findPasteTarget() {
    const sels = [
      '#prompt-textarea.ProseMirror[contenteditable="true"]',
      'div#prompt-textarea[contenteditable="true"]',
      '.ProseMirror[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]',
      '[contenteditable="true"]',
      'textarea',
    ];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 12) return el;
      }
    }
    return null;
  }

  function dispatchPaste(target, dataTransfer) {
    try {
      const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dataTransfer });
      target.dispatchEvent(ev);
    } catch {
      try {
        const ev2 = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(ev2, 'clipboardData', { value: dataTransfer, enumerable: true, configurable: true });
        target.dispatchEvent(ev2);
      } catch {}
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 构建 File 对象
  const files = attachments.map(base64ToFile).filter(Boolean);
  if (!files.length) return { ok: false, error: 'build_files_failed' };

  const hasDoc = files.some(f => !f.type.startsWith('image/'));

  // DeepSeek：拦截原型 click/showPicker，通过 paste 逐个上传
  if (provider === 'deepseek') {
    const target = document.querySelector('textarea[placeholder*="DeepSeek"], textarea[placeholder*="发送消息"]') || document.querySelector('textarea');
    if (target && target.tagName === 'TEXTAREA') {
      target.focus();
      const origClick = HTMLInputElement.prototype.click;
      const origShowPicker = HTMLInputElement.prototype.showPicker;
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file') return;
        return origClick.apply(this, arguments);
      };
      if (origShowPicker) {
        HTMLInputElement.prototype.showPicker = function () {
          if (this.type === 'file') return;
          return origShowPicker.apply(this, arguments);
        };
      }
      let allPasted = true;
      try {
        for (let i = 0; i < files.length; i++) {
          const dt = new DataTransfer();
          try { dt.items.add(files[i]); } catch { allPasted = false; continue; }
          if (!dt.files.length) { allPasted = false; continue; }
          try {
            const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
            target.dispatchEvent(ev);
            target.dispatchEvent(new Event('input', { bubbles: true }));
          } catch {
            try {
              const ev2 = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
              Object.defineProperty(ev2, 'clipboardData', { value: dt, enumerable: true, configurable: true });
              target.dispatchEvent(ev2);
              target.dispatchEvent(new Event('input', { bubbles: true }));
            } catch { allPasted = false; }
          }
          if (i < files.length - 1) await sleep(250);
        }
      } finally {
        // 延迟恢复：等待 DeepSeek 异步 paste 处理器完成，finally 确保异常时也能恢复
        setTimeout(() => {
          HTMLInputElement.prototype.click = origClick;
          if (origShowPicker) HTMLInputElement.prototype.showPicker = origShowPicker;
        }, 2000);
      }
      console.log(`[FlowChat Upload] ${provider}: 文件已通过 paste 事件上传 (${files.length} 个)`);
      return { ok: allPasted, method: 'paste' };
    }
    console.warn(`[FlowChat Upload] ${provider}: 未找到 textarea`);
    return { ok: false, error: 'no_textarea' };
  }

  // 元宝：优先 input[type=file]，失败后 drop 到 Quill 编辑器
  if (provider === 'yuanbao') {
    let input = findFileInput(hasDoc);
    if (input) {
      if (assignInputFiles(input, files)) {
        console.log(`[FlowChat Upload] ${provider}: 文件已通过 input[type=file] 上传 (${files.length} 个)`);
        return { ok: true, method: 'fileInput' };
      }
    }
    const editor = document.querySelector('.ql-editor[contenteditable="true"]') ||
                   document.querySelector('.chat-input-editor .ql-editor') ||
                   document.querySelector('[role="textbox"][contenteditable="true"]') ||
                   findPasteTarget();
    if (editor) {
      const dt = buildDataTransfer(files);
      if (dt) {
        for (const type of ['dragenter', 'dragover', 'drop']) {
          try {
            const ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
            editor.dispatchEvent(ev);
          } catch {
            const ev2 = new Event(type, { bubbles: true, cancelable: true });
            try { Object.defineProperty(ev2, 'dataTransfer', { value: dt, enumerable: true, configurable: true }); } catch {}
            editor.dispatchEvent(ev2);
          }
        }
        editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        console.log(`[FlowChat Upload] ${provider}: 文件已通过 drop 事件上传 (${files.length} 个)`);
        return { ok: true, method: 'drop' };
      }
    }
    console.warn(`[FlowChat Upload] ${provider}: 未找到文件上传入口`);
    return { ok: false, error: 'no_upload_entry' };
  }

  // 策略1：查找 input[type=file]
  let input = findFileInput(hasDoc);
  if (input) {
    if (assignInputFiles(input, files)) {
      console.log(`[FlowChat Upload] ${provider}: 文件已通过 input[type=file] 上传 (${files.length} 个)`);
      return { ok: true, method: 'fileInput' };
    }
  }

  // 策略2：paste 降级（图片和文档均尝试，部分平台 paste 处理器接受任意文件）
  {
    const target = findPasteTarget();
    if (target) {
      const dt = buildDataTransfer(files);
      if (dt) {
        dispatchPaste(target, dt);
        console.log(`[FlowChat Upload] ${provider}: 文件已通过 paste 事件上传 (${files.length} 个)`);
        return { ok: true, method: 'paste' };
      }
    }
  }

  // 策略3：drop 事件降级
  const dropTarget = findPasteTarget();
  if (dropTarget) {
    const dt = buildDataTransfer(files);
    if (dt) {
      for (const type of ['dragenter', 'dragover', 'drop']) {
        try {
          const ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
          dropTarget.dispatchEvent(ev);
        } catch {
          const ev2 = new Event(type, { bubbles: true, cancelable: true });
          try { Object.defineProperty(ev2, 'dataTransfer', { value: dt, enumerable: true, configurable: true }); } catch {}
          dropTarget.dispatchEvent(ev2);
        }
      }
      console.log(`[FlowChat Upload] ${provider}: 文件已通过 drop 事件上传 (${files.length} 个)`);
      return { ok: true, method: 'drop' };
    }
  }

  console.warn(`[FlowChat Upload] ${provider}: 未找到文件上传入口`);
  return { ok: false, error: 'no_upload_entry' };
}

// ============================================================
// 消息发送（队列版）
// ============================================================

async function sendMessage() {
  const inputEl = document.getElementById('message-input');
  const message = inputEl.value.trim();
  if (!message && !pendingFiles.length) return;

  // 先上传文件到各平台（异步并行），再发送文本
  if (pendingFiles.length) {
    const fileEntries = [...pendingFiles];
    pendingFiles.length = 0;
    renderFileThumbs();
    await uploadFilesToAllPlatforms(fileEntries);
  }

  inputEl.value = '';
  collapseInput();
  inputEl.focus();

  lastSentMessage = message;   // 记录用于融合生成 {user_question}
  await dispatchOrQueue(message);
  // 发送完成后恢复主输入框焦点（typeInPage 会把焦点偷走到 iframe）
  inputEl.focus();
}

/**
 * 对每个平台判断：空闲则立即发送，生成中则入队。
 * 同一条消息对每个平台只发一次。
 * @param {string} text - 消息文本
 * @param {string[]|null} targetKeys - 限定平台 key 列表（null = 全部活跃平台）
 */
async function dispatchOrQueue(text, targetKeys = null) {
  const platforms = targetKeys
    ? activePlatforms.filter(k => targetKeys.includes(k))
    : activePlatforms;

  const toSend    = [];
  const toQueue   = [];
  const toPending = [];  // bridge 未就绪，等 BRIDGE_READY 后补发

  for (const key of platforms) {
    if (platformGenerating[key]) {
      toQueue.push(key);
    } else if (bridgeStatus[key] !== 'connected' && bridgeStatus[key] !== 'ready') {
      // 平台 iframe 还在加载，暂存消息等 bridge 就绪后补发
      toPending.push(key);
    } else {
      toSend.push(key);
    }
  }

  // 为本轮消息创建一条记录（立即发送的平台先登记，排队的在 processQueue 时登记）
  const round = { id: `r-${Date.now()}`, question: text, ts: Date.now(), replies: {} };
  conversationLog.push(round);
  toSend.forEach(k => { _platformRoundId[k] = round.id; });

  // 暂存给未就绪平台（bridge ready 后补发）
  toPending.forEach(k => {
    if (!_pendingForBridge[k]) _pendingForBridge[k] = [];
    _pendingForBridge[k].push({ text, roundId: round.id });
    console.log(`[FlowChat] ${k}: bridge 未就绪，消息暂存等待 BRIDGE_READY`);
  });

  // 批量发送：每批 3 个并发，批间延迟动态调整
  if (toSend.length) {
    // 必须在批次循环开始前就标记全部平台为"生成中"，
    // 否则用户在批次间隙发第二条消息时，尚未发送的平台 platformGenerating=false，
    // 导致第二条消息直接发给它们，与第一条消息产生竞态冲突。
    toSend.forEach(k => markPlatformGenerating(k, round.id));

    // 缓存 tab/frames：每轮只查一次。侧边栏页面没有 current tab，需用 bridge 登记的 tabId。
    const _tabContext   = await getFlowChatTabContext(toSend[0]);
    const _cachedTab    = _tabContext.tabId == null ? null : { id: _tabContext.tabId };
    const _cachedFrames = _tabContext.frames;

    const BATCH = 3;
    // 平台越多，批间延迟越长：3-5个=400ms，6-10个=600ms，11+=800ms
    const DELAY = toSend.length <= 5 ? 400 : toSend.length <= 10 ? 600 : 800;
    for (let i = 0; i < toSend.length; i += BATCH) {
      const batch = toSend.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async k => {
        const ok = await sendToPlatform(k, text, _cachedTab, _cachedFrames);
        if (!ok) markPlatformIdle(k);
      }));
      if (i + BATCH < toSend.length) await sleep(DELAY);
    }
  }

  // 入队
  if (toQueue.length) {
    const item = { id: `q-${Date.now()}-${Math.random()}`, text, sentTo: new Set(toSend), _roundId: round.id };
    item._pending = new Set(toQueue);
    queuedMessages.push(item);
    updateQueueUI();
    if (!_queueWatchdogRunning) {
      _queueWatchdogRunning = true;
      scanQueueWatchdog().finally(() => { _queueWatchdogRunning = false; });
    }
  }
}

/**
 * 某平台 AI 停止生成后，检查队列，把最早一条尚未发给它的消息发出去。
 */
async function processQueue(platform, opts = {}) {
  // 防重入：GENERATION_COMPLETE 和 AI_RESPONSE.complete 都可能调用此函数。
  // 如果 4s 内刚通过本函数发过一条消息且 AI 仍在生成，说明 GENERATION_COMPLETE
  // 已处理完，AI_RESPONSE 的延迟触发不应再重置 platformGenerating，否则会打断正在进行的生成。
  const sentRecently = _processQueueSentAt[platform] &&
                       (Date.now() - _processQueueSentAt[platform] < 4000);
  if (opts.ignoreRecent && sentRecently && platformGenerating[platform]) return;

  markPlatformIdle(platform);

  for (const item of queuedMessages) {
    if (item._pending?.has(platform)) {
      item._pending.delete(platform);
      markPlatformGenerating(platform, item._roundId);
      _processQueueSentAt[platform] = Date.now();
      // 将此平台绑定到该消息对应的轮次（若轮次存在）
      if (item._roundId) _platformRoundId[platform] = item._roundId;
      // AI 刚结束生成，等 UI 完全恢复后再发（部分平台发送按钮需要一段时间才重新启用）
      await sleep(800);
      const ok = await sendToPlatform(platform, item.text);
      if (!ok) {
        // 发送失败 → 把平台加回 pending 等下次 GENERATION_COMPLETE 重试
        item._pending.add(platform);
        markPlatformIdle(platform);
        console.warn(`[FlowChat] ${platform}: 队列发送失败，已重新入队等待重试`);
      }
      // 队列发送完成后恢复主输入框焦点（typeInPage 会把焦点偷走到 iframe）
      document.getElementById('message-input')?.focus();

      // 若该条消息所有平台都已处理完，从队列移除
      if (item._pending.size === 0) {
        queuedMessages = queuedMessages.filter(q => q.id !== item.id);
      }
      updateQueueUI();
      return;  // 每次只取一条（FIFO）
    }
  }
  updateQueueUI();
}

function cancelQueueItem(id) {
  queuedMessages = queuedMessages.filter(q => q.id !== id);
  updateQueueUI();
}

function updateQueueUI() {
  const count  = queuedMessages.length;
  const badge  = document.getElementById('queue-badge');
  const drawer = document.getElementById('queue-drawer');
  const qCount = document.getElementById('queue-count');
  const qList  = document.getElementById('queue-list');

  if (badge) {
    badge.textContent = count || '';
    badge.classList.toggle('visible', count > 0);
  }

  if (!drawer) return;

  if (count === 0) {
    drawer.classList.remove('visible');
    return;
  }

  drawer.classList.add('visible');
  if (qCount) qCount.textContent = msg('queue_count', [count.toString()]);
  if (qList) {
    qList.innerHTML = queuedMessages.map((item, i) => {
      const preview = item.text.length > 60 ? item.text.slice(0, 60) + '…' : item.text;
      const targets = [...(item._pending || [])].map(k => ALL_PLATFORMS[getBasePlatform(k)]?.name || k).join('、');
      return `<div class="queue-item" data-id="${item.id}">
        <span class="queue-num">${i + 1}</span>
        <span class="queue-preview">${escHtml(preview)}</span>
        <span class="queue-for">等待：${targets}</span>
        <button class="queue-del" data-action="queue-cancel" data-id="${item.id}" title="取消">×</button>
      </div>`;
    }).join('');
  }
}

async function isPlatformStillGenerating(key, cachedTab = null, cachedFrames = null) {
  try {
    const basePlatform = getBasePlatform(key);
    const tabIdFromCache = cachedTab?.id ?? cachedTab?.tabId ?? cachedTab;
    let tabId = tabIdFromCache ?? platformFrames[key]?.tabId ?? null;
    let frames = cachedFrames;
    if (tabId == null || !frames) {
      const ctx = await getFlowChatTabContext(key);
      tabId = ctx.tabId;
      frames = ctx.frames;
    }
    if (tabId == null) return null;

    let frame = platformFrames[key] ? frames.find(f => f.frameId === platformFrames[key].frameId) : null;
    if (frame && (frame.parentFrameId !== 0 || getPlatformForUrl(frame.url) !== basePlatform || _isUtilityFrame(frame.url))) frame = null;
    if (!frame) {
      const candidates = frames.filter(f => f.frameId !== 0 && getPlatformForUrl(f.url) === basePlatform);
      frame = candidates.find(f => f.parentFrameId === 0 && !_isUtilityFrame(f.url))
        || candidates.find(f => !_isUtilityFrame(f.url))
        || null;
    }
    if (!frame) return null;

    const stopSels = await getStopSelectors(key);
    const res = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frame.frameId] },
      world: 'MAIN',
      func: function probeStopButton(sels) {
        function isVisible(el) {
          if (!el || el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
          const r = el.getBoundingClientRect();
          return r.width > 1 && r.height > 1;
        }
        return sels.some(sel => {
          try { return [...document.querySelectorAll(sel)].some(isVisible); }
          catch { return false; }
        });
      },
      args: [stopSels]
    });
    return !!res?.[0]?.result;
  } catch (err) {
    console.warn(`[FlowChat] ${key}: 队列状态探测失败:`, err.message);
    return null;
  }
}

async function scanQueueWatchdog() {
  const ctx = await getFlowChatTabContext(activePlatforms.find(k => platformFrames[k]));
  const cachedTab = ctx.tabId == null ? null : { id: ctx.tabId };
  const cachedFrames = ctx.frames;

  for (const key of activePlatforms) {
    if (!platformGenerating[key]) continue;
    if (!queuedMessages.some(q => q._pending?.has(key))) continue;

    const age = generationAge(key);
    const idleAge = generationIdleAge(key);
    const stillGenerating = await isPlatformStillGenerating(key, cachedTab, cachedFrames);
    const noVisibleStopAndQuiet = stillGenerating === false && idleAge > QUEUE_IDLE_PROBE_MS;
    const stale = age > QUEUE_STALE_MS || idleAge > QUEUE_STALE_MS;

    if (noVisibleStopAndQuiet || stale) {
      console.log(`[FlowChat] ${key}: 队列兜底触发`, {
        age,
        idleAge,
        stillGenerating,
        reason: stale ? 'stale' : 'no visible stop'
      });
      processQueue(key);
    }
  }
}

async function sendToPlatform(key, message, cachedTab, cachedFrames, options = {}) {
  const result = await sendToPlatformTrace(key, message, { cachedTab, cachedFrames, ...options });
  if (options.returnTrace) return result;
  return !!result.ok;
}

async function sendToPlatformTrace(key, message, options = {}) {
  const trace = [];
  const addTrace = (step, ok, detail = {}) => {
    trace.push({ step, ok: !!ok, ts: Date.now(), ...detail });
  };

  try {
    const basePlatform = getBasePlatform(key);
    const tabIdFromCache = options.cachedTab?.id ?? options.cachedTab?.tabId ?? options.cachedTab;
    let tabId = tabIdFromCache ?? platformFrames[key]?.tabId ?? null;
    let frames = options.cachedFrames;
    if (tabId == null || !frames) {
      const ctx = await getFlowChatTabContext(key);
      tabId = ctx.tabId;
      frames = ctx.frames;
    }
    if (tabId == null) {
      addTrace('resolve_tab', false, { reason: 'no tab' });
      return { ok: false, key, basePlatform, trace, error: 'no tab' };
    }
    addTrace('resolve_tab', true, { tabId });

    const knownFrame = platformFrames[key];
    let frame = knownFrame ? frames.find(f => f.frameId === knownFrame.frameId) : null;
    if (frame && (frame.parentFrameId !== 0 || getPlatformForUrl(frame.url) !== basePlatform || _isUtilityFrame(frame.url))) frame = null;
    if (!frame) {
      const candidates = frames.filter(f => f.frameId !== 0 && getPlatformForUrl(f.url) === basePlatform);
      frame = candidates.find(f => f.parentFrameId === 0 && !_isUtilityFrame(f.url))
        || candidates.find(f => !_isUtilityFrame(f.url))
        || null;
      addTrace('resolve_frame_candidates', !!frame, {
        count: candidates.length,
        usableCount: candidates.filter(f => !_isUtilityFrame(f.url)).length,
        mainCount: candidates.filter(f => f.parentFrameId === 0 && !_isUtilityFrame(f.url)).length,
      });
    }
    if (!frame) {
      addTrace('resolve_frame', false, { reason: 'no frame' });
      return { ok: false, key, basePlatform, tabId, trace, error: 'no frame' };
    }
    addTrace('resolve_frame', true, { frameId: frame.frameId, parentFrameId: frame.parentFrameId, url: frame.url });

    const { inputSels, sendSels } = await getSelectors(key);
    addTrace('load_selectors', true, { inputCount: inputSels.length, sendCount: sendSels.length });

    async function execWithRetry(opts, retries = 1) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await chrome.scripting.executeScript(opts);
          if (res?.[0]?.result !== undefined) return res;
          if (attempt < retries) await sleep(500);
        } catch (e) {
          if (attempt < retries) await sleep(500); else throw e;
        }
      }
      return null;
    }

    const execRes = await execWithRetry({
      target: { tabId, frameIds: [frame.frameId] },
      world: 'MAIN',
      func: async function runSendTrace(msg, inputSels, sendSels, basePlatform, opts) {
        const trace = [];
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const add = (step, ok, detail = {}) => trace.push({ step, ok: !!ok, ...detail });
        const describe = (el) => {
          if (!el) return {};
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            id: el.id || '',
            className: String(el.className || '').slice(0, 120),
            text: String(el.innerText || el.textContent || '').trim().slice(0, 80),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        };
        function isVisible(el) {
          if (!el) return false;
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
          const r = el.getBoundingClientRect();
          return r.width > 1 && r.height > 1;
        }
        function isDisabled(el) {
          return !!(el?.disabled
            || el?.hasAttribute?.('disabled')
            || el?.getAttribute?.('aria-disabled') === 'true'
            || el?.getAttribute?.('data-disabled') === 'true'
            || /--disabled|is-disabled|btn-disabled|disabled/i.test(el?.className || ''));
        }
        function findAll(sels) {
          const out = [];
          const seen = new Set();
          for (const selector of sels || []) {
            try {
              for (const el of document.querySelectorAll(selector)) {
                if (seen.has(el)) continue;
                seen.add(el);
                out.push({ el, selector });
              }
            } catch (e) {
              add('selector_error', false, { selector, error: e.message });
            }
          }
          return out;
        }
        function findBest(sels) {
          const all = findAll(sels);
          const visible = all.filter(x => isVisible(x.el));
          return { all, visible, picked: visible[0] || all[0] || null };
        }
        function resolveWritableInput(el) {
          if (!el) return null;
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable) {
            return { el, selector: 'self' };
          }
          const selectors = [
            'rich-textarea .ql-editor[contenteditable="true"]',
            '.ql-editor[contenteditable="true"]',
            '[role="textbox"][contenteditable="true"]',
            '[contenteditable="true"]:not(.ql-clipboard)',
            'textarea',
            'input[type="text"]',
          ];
          const matches = [];
          for (const selector of selectors) {
            try {
              el.querySelectorAll(selector).forEach(node => matches.push({ el: node, selector }));
            } catch {}
          }
          const visible = matches.filter(x =>
            isVisible(x.el) &&
            x.el.getAttribute('tabindex') !== '-1' &&
            !x.el.classList.contains('ql-clipboard')
          );
          return visible[0] || matches.find(x => x.el.getAttribute('tabindex') !== '-1') || null;
        }
        function findClickable(el) {
          let cur = el;
          for (let i = 0; i < 6 && cur && cur !== document.body; i++) {
            const tag = cur.tagName;
            const role = cur.getAttribute('role');
            if (tag === 'BUTTON' || tag === 'A' || role === 'button' || role === 'link' || cur.getAttribute('type') === 'submit') return cur;
            cur = cur.parentElement;
          }
          return el;
        }
        function simulateClick(el) {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2, y = r.top + r.height / 2;
          const common = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y };
          el.dispatchEvent(new PointerEvent('pointerover',  { ...common, pointerId: 1, isPrimary: true }));
          el.dispatchEvent(new PointerEvent('pointerenter', { ...common, pointerId: 1, isPrimary: true, bubbles: false }));
          el.dispatchEvent(new MouseEvent('mouseover', common));
          el.dispatchEvent(new MouseEvent('mouseenter', { ...common, bubbles: false }));
          el.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 1, isPrimary: true }));
          el.dispatchEvent(new MouseEvent('mousedown',  { ...common, button: 0, buttons: 1 }));
          el.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 1, isPrimary: true }));
          el.dispatchEvent(new MouseEvent('mouseup', { ...common, button: 0 }));
          el.dispatchEvent(new MouseEvent('click', { ...common, button: 0 }));
        }
        function selectEditorAll(editor) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        async function typeInto(el) {
          el.focus({ preventScroll: true });
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(el, msg); else el.value = msg;
            el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            return { method: 'native-value' };
          }
          if (!el.isContentEditable) return { method: 'unsupported', ok: false };

          const r = el.getBoundingClientRect();
          const ep = { bubbles: true, cancelable: true, composed: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
          el.dispatchEvent(new PointerEvent('pointerdown', { ...ep, pointerId: 1, isPrimary: true }));
          el.dispatchEvent(new MouseEvent('mousedown', { ...ep, button: 0, buttons: 1 }));
          el.dispatchEvent(new PointerEvent('pointerup', { ...ep, pointerId: 1, isPrimary: true }));
          el.dispatchEvent(new MouseEvent('mouseup', { ...ep, button: 0 }));
          el.dispatchEvent(new MouseEvent('click', { ...ep, button: 0 }));
          el.focus({ preventScroll: true });
          await sleep(150);

          const isLexical = basePlatform === 'kimi' || el.hasAttribute('data-lexical-editor') || !!el.closest('[data-lexical-editor]');
          const isQuill = basePlatform === 'gemini' || el.classList.contains('ql-editor') || !!el.closest('rich-textarea, .ql-container');
          const check = msg.slice(0, Math.min(10, msg.length));
          if (isLexical && !isQuill) {
            try {
	              selectEditorAll(el);
	              el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContent', bubbles: true, cancelable: true, composed: true }));
	              el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: msg, bubbles: true, cancelable: true, composed: true }));
	              await sleep(150);
	              if (!check || el.textContent.includes(check)) return { method: 'beforeinput' };
            } catch {}
          }
          try {
            selectEditorAll(el);
            const dt = new DataTransfer();
            dt.setData('text/plain', msg);
            el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true, composed: true }));
            await sleep(300);
            if (!check || el.textContent.includes(check)) return { method: 'paste' };
          } catch {}

          selectEditorAll(el);
          let method = 'execCommand';
          if (!document.execCommand('insertText', false, msg)) {
            method = 'selection';
            const sel = window.getSelection();
            const range = sel.rangeCount ? sel.getRangeAt(0) : document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
            range.deleteContents();
            range.insertNode(document.createTextNode(msg));
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: msg, bubbles: true, composed: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { key: msg.slice(-1) || ' ', bubbles: true, composed: true }));
          return { method };
        }
        function findSendExplicit() {
          const found = findBest(sendSels);
          const candidates = found.visible
            .map(x => ({ ...x, el: findClickable(x.el) }))
            .filter((x, i, arr) => x.el && arr.findIndex(y => y.el === x.el) === i && isVisible(x.el));
          function sendScore(x) {
            const label = ((x.el.getAttribute('aria-label') || '') + ' ' + (x.el.title || '') + ' ' + (x.el.textContent || '')).toLowerCase();
            const icon = [...x.el.querySelectorAll('mat-icon,[fonticon],[data-mat-icon-name],svg')]
              .map(n => ((n.getAttribute('fonticon') || '') + ' ' + (n.getAttribute('data-mat-icon-name') || '') + ' ' + (n.textContent || '')).toLowerCase())
              .join(' ');
            if (/upload|tool|mic|microphone|mode|model|menu|attach|上传|工具|麦克风|模式|模型|菜单|附件/.test(label + ' ' + icon)) return -10;
            if (/send|submit|arrow_up|发送|提交/.test(label + ' ' + icon)) return 20;
            if (/send-button|submit/.test(x.selector || '')) return 12;
            return 0;
          }
          const ranked = candidates
            .map(x => ({ ...x, score: sendScore(x) }))
            .filter(x => x.score >= 0)
            .sort((a, b) => b.score - a.score);
          const ready = ranked.find(x => !isDisabled(x.el));
          return { found, candidates: ranked, picked: ready || ranked[0] || null };
        }
        function findSendNearInput(input) {
          let container = input?.parentElement;
          for (let depth = 0; depth < 7 && container && container !== document.body; depth++) {
            const raw = [...container.querySelectorAll('button, [role="button"], div[class*="enter"], div[class*="send"], span[class*="send"], img[class*="enter"], div[tabindex="0"]:has(svg)')];
            const candidates = raw.map(findClickable).filter((b, i, arr) => b && arr.indexOf(b) === i && isVisible(b) && !isDisabled(b));
            const labeled = candidates.find(b => {
              const t = ((b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + (b.textContent || '')).toLowerCase();
              return t.includes('send') || t.includes('发送') || t.includes('submit') || t.includes('提交');
            });
            if (labeled) return { el: labeled, selector: `near-input-depth-${depth}` };
            const svgBtns = candidates.filter(b => b.querySelector('svg'));
            if (svgBtns.length) return { el: svgBtns[svgBtns.length - 1], selector: `near-input-svg-depth-${depth}` };
            container = container.parentElement;
          }
          return null;
        }

        const preSend = findSendExplicit();
        add('send_before_input', !!preSend.picked, {
          matched: preSend.found.all.length,
          visible: preSend.found.visible.length,
          disabled: preSend.picked ? isDisabled(preSend.picked.el) : null,
          selector: preSend.picked?.selector || '',
          target: describe(preSend.picked?.el),
        });

        let input = findBest(inputSels).picked;
        for (let i = 0; i < 6 && !input; i++) {
          await sleep(500);
          input = findBest(inputSels).picked;
        }
        if (!input) {
          add('input_match', false, { reason: 'no input' });
          return { ok: false, error: 'no input', trace };
        }
        add('input_match', true, { selector: input.selector, visible: isVisible(input.el), target: describe(input.el) });
        const writableInput = resolveWritableInput(input.el);
        if (!writableInput) {
          add('input_resolve_editor', false, { reason: 'no writable descendant', target: describe(input.el) });
          return { ok: false, error: 'no writable input', trace };
        }
        if (writableInput.el !== input.el) {
          add('input_resolve_editor', true, { selector: writableInput.selector, target: describe(writableInput.el) });
        }

        const typeResult = await typeInto(writableInput.el);
        if (typeResult.ok === false) {
          add('input_write', false, typeResult);
          return { ok: false, error: 'input write failed', trace };
        }
        add('input_write', true, typeResult);

        await sleep(opts.afterInputMs || 1200);
        let explicit = findSendExplicit();
        for (let i = 0; i < 3 && explicit.picked && isDisabled(explicit.picked.el); i++) {
          add('send_wait_enabled', false, { attempt: i + 1, selector: explicit.picked.selector, target: describe(explicit.picked.el) });
          await sleep(400);
          explicit = findSendExplicit();
        }
        add('send_after_input', !!explicit.picked, {
          matched: explicit.found.all.length,
          visible: explicit.found.visible.length,
          disabled: explicit.picked ? isDisabled(explicit.picked.el) : null,
          selector: explicit.picked?.selector || '',
          target: describe(explicit.picked?.el),
        });

        let sendTarget = explicit.picked;
        let mode = 'selector';
        if (!sendTarget && !opts.strictSend) {
          const fallback = findSendNearInput(writableInput.el);
          if (fallback) {
            sendTarget = fallback;
            mode = 'near-input-fallback';
            add('send_fallback', true, { selector: fallback.selector, target: describe(fallback.el) });
          } else if (!writableInput.el.isContentEditable && opts.allowEnterFallback !== false) {
            writableInput.el.focus({ preventScroll: true });
            const keyOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true };
            ['keydown', 'keypress', 'keyup'].forEach(t => writableInput.el.dispatchEvent(new KeyboardEvent(t, keyOpts)));
            add('send_enter_fallback', true);
            return { ok: true, mode: 'enter-fallback', trace };
          }
        }
        if (!sendTarget) {
          add('send_click', false, { reason: 'no send target after input' });
          return { ok: false, error: 'no send target after input', trace };
        }
        if (isDisabled(sendTarget.el)) {
          add('send_click', false, { reason: 'send target disabled', selector: sendTarget.selector, target: describe(sendTarget.el) });
          return { ok: false, error: 'send target disabled', trace };
        }
        if (opts.clickSend !== false) {
          simulateClick(sendTarget.el);
          add('send_click', true, { mode, selector: sendTarget.selector, target: describe(sendTarget.el) });
        } else {
          add('send_click_skipped', true, { mode, selector: sendTarget.selector, target: describe(sendTarget.el) });
        }
        return { ok: true, mode, trace };
      },
      args: [message, inputSels, sendSels, basePlatform, {
        strictSend: !!options.strictSend,
        clickSend: options.clickSend !== false,
        allowEnterFallback: options.allowEnterFallback !== false,
        afterInputMs: options.afterInputMs || 1200,
      }]
    });

    const result = execRes?.[0]?.result || { ok: false, error: 'executeScript returned no result', trace: [] };
    const merged = { ok: !!result.ok, key, basePlatform, tabId, frameId: frame.frameId, error: result.error || '', mode: result.mode || '', trace: [...trace, ...(result.trace || [])] };
    console.log(`[FlowChat SendTrace] ${key}`, merged);
    return merged;
  } catch (err) {
    addTrace('exception', false, { error: err.message });
    console.error(`[FlowChat SendTrace] ${key} 异常:`, err);
    return { ok: false, key, error: err.message, trace };
  }
}

// ============================================================
// Runtime 消息处理
// ============================================================

function handleRuntimeMessage(msg) {
  switch (msg.type) {
    case 'BRIDGE_READY': {
      if (!msg.platform) break;
      if (msg.url && _isUtilityFrame(msg.url)) {
        console.log('[FlowChat] ignore utility frame BRIDGE_READY', msg.platform, msg.url);
        break;
      }
      // 支持多实例：找第一个匹配 basePlatform 且尚未分配 frame 的实例 key
      const instanceKey = activePlatforms.find(k =>
        getBasePlatform(k) === msg.platform &&
        !platformFrames[k]
      ) || (activePlatforms.includes(msg.platform) && !platformFrames[msg.platform] ? msg.platform : null);
      if (!instanceKey) break;
      bridgeStatus[instanceKey] = 'connected';
      updateDot(instanceKey, 'connected');
      const sp = document.getElementById(`spinner-${instanceKey}`);
      if (sp) sp.style.display = 'none';
      // 记录 frame 定向信息（用于屏蔽元素 / 消息发送定向）
      if (msg.frameId != null && msg.tabId != null) {
        platformFrames[instanceKey] = { tabId: msg.tabId, frameId: msg.frameId };
      }
      if (pendingGroupHighlights[instanceKey]?.length) {
        setTimeout(() => restoreHighlightsForPlatform(instanceKey), 1000);
      }
      scheduleAutoSaveCurrentGroup('bridge-ready', 2500);
      // 补发在 bridge 就绪前暂存的消息
      if (_pendingForBridge[instanceKey]?.length) {
        const pending = _pendingForBridge[instanceKey].splice(0);
        delete _pendingForBridge[instanceKey];
        console.log(`[FlowChat] ${instanceKey}: bridge ready，补发 ${pending.length} 条暂存消息`);
        setTimeout(async () => {
          for (const { text, roundId } of pending) {
            _platformRoundId[instanceKey] = roundId;
            markPlatformGenerating(instanceKey, roundId);
            const ok = await sendToPlatform(instanceKey, text);
            if (!ok) markPlatformIdle(instanceKey);
          }
          document.getElementById('message-input')?.focus();
        }, 500);
      }
      // 自定义平台首次连接：自动触发 Picker 引导
      if (_pendingPickerKeys.has(instanceKey)) {
        _pendingPickerKeys.delete(instanceKey);
        setTimeout(() => startPicker(instanceKey), 500);
      }
      break;
    }

    case 'GENERATION_COMPLETE':
      // bridge.js 检测到 AI 停止输出，触发对应实例的队列处理
      if (msg.platform) {
        const genKeys = getRuntimeInstanceKeys(msg, { onlyGenerating: true });
        genKeys.forEach(k => {
          if (msg.timestamp && _processQueueSentAt[k] && msg.timestamp < _processQueueSentAt[k]) return;
          notePlatformActivity(k);
          processQueue(k);
        });
      }
      break;

    case 'AI_STREAMING':
      if (msg.platform) {
        getRuntimeInstanceKeys(msg, { onlyGenerating: true }).forEach(notePlatformActivity);
      }
      break;

    case 'AI_RESPONSE':
      // 完整回复：存入 replyStore（用于导出全部回复），并触发队列
      if (msg.platform && msg.complete) {
        // 找对应实例 key 存储（支持多实例）
        const matchedKeys = getRuntimeInstanceKeys(msg, { onlyGenerating: true });
        const rKey = matchedKeys[0] || getRuntimeInstanceKeys(msg)[0] || msg.platform;
        notePlatformActivity(rKey);
        const prevText = replyStore[rKey]?.text || '';
        const sentRecently = _processQueueSentAt[rKey] &&
          (Date.now() - _processQueueSentAt[rKey] < 4000);
        const staleDelayedResponse = (msg.timestamp && _processQueueSentAt[rKey] && msg.timestamp < _processQueueSentAt[rKey]) ||
          (!!prevText && msg.text === prevText && sentRecently);
        replyStore[rKey] = { text: msg.text, html: msg.html, ts: msg.timestamp };
        updateSynthesisBtn();
        // 同时记录到对话日志（多轮导出用）
        const roundId = _platformRoundId[rKey];
        const round   = roundId ? conversationLog.find(r => r.id === roundId) : conversationLog[conversationLog.length - 1];
        if (round) round.replies[rKey] = { text: msg.text, html: msg.html, ts: msg.timestamp };
        scheduleAutoSaveCurrentGroup('ai-response', 1200);
        // processQueue 保底触发（GENERATION_COMPLETE 已处理则幂等）
        matchedKeys.forEach(k => processQueue(k, { ignoreRecent: staleDelayedResponse }));
      }
      break;

    case 'PICKER_SELECTED':
      handlePickerSelected(msg);
      break;

    case 'HIGHLIGHT_ADDED': {
      const hlId = msg.data?.id;
      // 去重：同一个高亮可能因双重注入被发送两次
      if (!hlId || highlights.some(h => h.id === hlId)) break;

      const label = msg.data.label;
      const hlPlatform = activePlatforms.find(k =>
        platformFrames[k]?.frameId === msg.frameId &&
        platformFrames[k]?.tabId === msg.tabId
      ) || msg.data.platform;
      const record = normalizeHighlightRecord({
        id:       hlId,
        label:    label,
        text:     msg.data.text,
        platform: hlPlatform,
        frameId:  msg.frameId,
        tabId:    msg.tabId,
        ts:       Date.now(),
        url:      msg.data.url || '',
        sessionId: currentSessionId,
      });
      highlights.push(record);
      upsertStoredHighlight(record).catch(e => console.warn('[FlowChat] save highlight failed:', e.message));
      renderHighlightPanel();
      scheduleAutoSaveCurrentGroup('highlight-added', 800);
      if (settings.highlightPanelAutoOpen !== false && !hlPanelOpen) openHighlightPanel();
      break;
    }

    case 'HIGHLIGHT_REMOVED':
      highlights = highlights.filter(h => h.id !== msg.data?.id);
      removeStoredHighlight(msg.data?.id).catch(e => console.warn('[FlowChat] remove highlight failed:', e.message));
      renderHighlightPanel();
      scheduleAutoSaveCurrentGroup('highlight-removed', 800);
      if (highlights.length === 0) closeHighlightPanel();
      break;

    case 'BRIDGE_DIAGNOSTIC': {
      // bridge.js 用 { type, ...diag } spread，所以 platform/level 在 msg 顶层
      if (!msg.platform) break;
      const diagKey = activePlatforms.find(k => {
        const base = k.replace(/_\d+$/, '');
        return base === msg.platform && bridgeStatus[k] === 'connected';
      });
      if (!diagKey) break;
      if (msg.level === 'error') {
        updateDot(diagKey, 'error');
      } else if (msg.level === 'warning') {
        updateDot(diagKey, 'warning');
      }
      const level = msg.level === 'error' ? 'error' : msg.level === 'warning' ? 'warning' : 'ok';
      console.log(`[FlowChat Diag] [${level}] ${msg.platform}`, msg);
      break;
    }
    case 'CHANGELOG_UPDATE': {
      // Service Worker 拉到新版日志后广播过来
      if (msg.unread) _setChangelogUnreadDot(true);
      break;
    }
  }
}

// ============================================================
// 高亮面板
// ============================================================

function openHighlightPanel() {
  hlPanelOpen = true;
  document.getElementById('hl-panel').classList.add('open');
  // 聚焦模式下为面板留出右侧空间
  if (focusedPlatform) {
    document.getElementById(`col-${focusedPlatform}`)?.classList.add('with-panel');
  }
}

function closeHighlightPanel(opts = {}) {
  hlPanelOpen = false;
  document.getElementById('hl-panel').classList.remove('open');
  if (focusedPlatform) {
    document.getElementById(`col-${focusedPlatform}`)?.classList.remove('with-panel');
  }
  if (opts.manual) {
    settings.highlightPanelAutoOpen = false;
    const autoOpenEl = document.getElementById('setting-highlight-panel-auto-open');
    if (autoOpenEl) autoOpenEl.checked = false;
    saveConfig();
  }
}

function toggleHighlightPanel() {
  hlPanelOpen ? closeHighlightPanel({ manual: true }) : openHighlightPanel();
}

function renderHighlightPanel() {
  const groups = document.getElementById('hl-groups');
  const empty  = document.getElementById('hl-empty');

  updateSynthesisBtn();

  if (highlights.length === 0) {
    groups.innerHTML = '';
    if (empty) { empty.style.display = 'flex'; groups.appendChild(empty); }
    return;
  }

  if (empty) empty.style.display = 'none';

  // 按 label 顺序分组
  const ORDER  = ['adopt', 'ref', 'reject', 'note'];
  const LABELS = { adopt: '采纳', ref: '参考', reject: '拒绝', note: '批注' };

  let html = '';
  for (const label of ORDER) {
    const items = highlights.filter(h => h.label === label);
    if (!items.length) continue;
    html += `<div class="hl-group">
      <div class="hl-group-label">${LABELS[label]}</div>`;
    for (const hl of items) {
      const pnum   = hl.platform?.match(/_(\d+)$/)?.[1];
      const pbase  = getBasePlatform(hl.platform || '');
      const pname  = (ALL_PLATFORMS[pbase]?.name || hl.platform) + (pnum ? ` #${pnum}` : '');
      const text  = escHtml(hl.text);
      html += `<div class="hl-item ${label}" data-id="${hl.id}">
        <div class="hl-item-body">
          <span class="hl-item-platform">${pname}</span>
          <div class="hl-item-text">${text}</div>
        </div>
        <button class="hl-item-del" data-action="remove-highlight" data-id="${hl.id}" title="删除">×</button>
      </div>`;
    }
    html += `</div>`;
  }
  groups.innerHTML = html;
}

async function removeHighlight(id) {
  const hl = highlights.find(h => h.id === id);
  if (hl?.frameId && hl?.tabId) {
    try {
      await chrome.runtime.sendMessage({
        type:    'SEND_TO_IFRAME',
        tabId:   hl.tabId,
        frameId: hl.frameId,
        payload: { type: 'REMOVE_HIGHLIGHT', highlightId: id }
      });
    } catch {}
  }
  highlights = highlights.filter(h => h.id !== id);
  await removeStoredHighlight(id);
  renderHighlightPanel();
  scheduleAutoSaveCurrentGroup('highlight-removed', 800);
  if (highlights.length === 0) closeHighlightPanel();
}

async function clearAllHighlights() {
  if (!highlights.length) return;
  // 按 (tabId, frameId) 分组，每个 frame 只发一次
  const frames = new Map();
  for (const hl of highlights) {
    if (hl.tabId && hl.frameId) {
      const key = `${hl.tabId}-${hl.frameId}`;
      if (!frames.has(key)) frames.set(key, { tabId: hl.tabId, frameId: hl.frameId });
    }
  }
  for (const { tabId, frameId } of frames.values()) {
    try {
      await chrome.runtime.sendMessage({
        type: 'SEND_TO_IFRAME',
        tabId, frameId,
        payload: { type: 'CLEAR_ALL_HIGHLIGHTS' }
      });
    } catch {}
  }
  highlights = [];
  allHighlights = [];
  await saveStoredHighlights();
  renderHighlightPanel();
  scheduleAutoSaveCurrentGroup('highlights-cleared', 800);
  closeHighlightPanel();
}

// ============================================================
// 聚焦放大（Sprint 2）
// ============================================================

function enterFocus(key) {
  if (!activePlatforms.includes(key)) return;
  focusedPlatform = key;
  document.body.classList.add('fc-focus-mode');
  document.getElementById('btn-focus-exit-top')?.style.setProperty('display', 'flex');

  // 为各列设置 CSS 类（不移动 DOM，不触发 iframe reload）
  activePlatforms.forEach(k => {
    const col = document.getElementById(`col-${k}`);
    if (!col) return;
    if (k === key) {
      col.classList.add('fc-focused');
      col.classList.remove('fc-hidden-by-focus');
      if (hlPanelOpen) col.classList.add('with-panel');
    } else {
      col.classList.remove('fc-focused', 'with-panel');
      col.classList.add('fc-hidden-by-focus');
    }
  });

  // 向 header 注入平台导航条（不在 split-read 模式，避免与 sr-bar 冲突）
  if (!document.body.classList.contains('fc-split-read')) {
    _insertFocusNav(key);
  }
}

function _insertFocusNav(key) {
  if (document.getElementById('fc-focus-nav')) return; // 已存在
  const p = ALL_PLATFORMS[getBasePlatform(key)];
  const name = p?.name || key;
  const ordered = getOrderedPlatforms();
  const idx = ordered.indexOf(key);
  const nav = document.createElement('div');
  nav.id = 'fc-focus-nav';
  nav.className = 'fc-focus-nav';
  nav.innerHTML = `
    <button class="fc-focus-nav-btn" id="fc-focus-prev" data-tooltip="${msg('focus_prev_channel')}" ${idx <= 0 ? 'disabled' : ''}>&#9664;</button>
    <span class="fc-focus-platform" id="fc-focus-platform-name">${name}</span>
    <button class="fc-focus-nav-btn" id="fc-focus-next" data-tooltip="${msg('focus_next_channel')}" ${idx >= ordered.length - 1 ? 'disabled' : ''}>&#9654;</button>
  `;
  nav.querySelector('#fc-focus-prev').addEventListener('click', () => switchFocus('prev'));
  nav.querySelector('#fc-focus-next').addEventListener('click', () => switchFocus('next'));
  document.querySelector('.header')?.appendChild(nav);
  _renderFocusColBtns(key);
}

function _updateFocusNav(key) {
  const p = ALL_PLATFORMS[getBasePlatform(key)];
  const name = p?.name || key;
  const ordered = getOrderedPlatforms();
  const idx = ordered.indexOf(key);
  const nameEl = document.getElementById('fc-focus-platform-name');
  if (nameEl) nameEl.textContent = name;
  const prev = document.getElementById('fc-focus-prev');
  const next = document.getElementById('fc-focus-next');
  if (prev) prev.disabled = idx <= 0;
  if (next) next.disabled = idx >= ordered.length - 1;
  _renderFocusColBtns(key);
}

/** 关闭所有 ··· 下拉菜单 */
function closeAllMoreMenus() {
  document.querySelectorAll('.ca-more-menu.open').forEach(m => m.classList.remove('open'));
}

/** 切换指定 col-more 按钮对应的下拉菜单 */
function toggleMoreMenu(btn) {
  const key = btn.dataset.key;
  // 聚焦模式下菜单 id 带 focus- 前缀
  const menuId = document.getElementById(`more-menu-focus-${key}`) ? `more-menu-focus-${key}` : `more-menu-${key}`;
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const isOpen = menu.classList.contains('open');
  closeAllMoreMenus();
  if (!isOpen) {
    const rect = btn.getBoundingClientRect();
    menu.style.top   = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.classList.add('open');
  }
}

/** 在聚焦模式顶栏（#fc-focus-nav 左侧）渲染当前平台的操作按钮 */
function _renderFocusColBtns(key) {
  document.getElementById('fc-focus-col-btns')?.remove();
  const base = getBasePlatform(key);
  const btns = document.createElement('div');
  btns.id = 'fc-focus-col-btns';
  btns.className = 'fc-focus-col-btns';

  // 常驻按钮（带文字标签）
  const splitReadHtml = SPLIT_READ_PLATFORMS.has(base)
    ? `<button class="ca ca-with-label split-read-btn" data-action="split-read" data-key="${key}" data-tooltip="${msg('col_split_read')}">${ICONS.splitread}<span class="ca-label">${msg('col_label_splitread')}</span></button>`
    : '';
  // ··· 折叠菜单
  const sidebarMoreItem = SIDEBAR_TOGGLE_PLATFORMS.has(base)
    ? `<button class="ca-menu-item" data-action="toggle-sidebar" data-key="${key}">${ICONS.sidebar}<span>${msg('col_more_sidebar')}</span></button>`
    : '';

  btns.innerHTML = `
    ${splitReadHtml}
    <button class="ca ca-with-label" data-action="download"  data-key="${key}" data-tooltip="${msg('col_download')}">${ICONS.download}<span class="ca-label">${msg('col_label_download')}</span></button>
    <button class="ca ca-with-label" data-action="refresh"   data-key="${key}" data-tooltip="${msg('col_refresh')}">${ICONS.refresh}<span class="ca-label">${msg('col_label_refresh')}</span></button>
    <div class="ca-more-wrap">
      <button class="ca" data-action="col-more" data-key="${key}" data-tooltip="${msg('col_more')}">${ICONS.more}</button>
      <div class="ca-more-menu" id="more-menu-focus-${key}">
        ${sidebarMoreItem}
        <button class="ca-menu-item" data-action="external"     data-key="${key}">${ICONS.external}<span>${msg('col_more_external')}</span></button>
        <button class="ca-menu-item" data-action="picker"       data-key="${key}">${ICONS.picker}<span>${msg('col_more_picker')}</span></button>
        <button class="ca-menu-item" data-action="block-picker" data-key="${key}">${ICONS.block}<span>${msg('col_more_block')}</span></button>
      </div>
    </div>`;

  // 独立事件处理（不在 grid-container 内，无法走原有委托）
  btns.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.classList.contains('ca-menu-item')) closeAllMoreMenus();
    const { action, key: k } = btn.dataset;
    switch (action) {
      case 'toggle-sidebar': togglePlatformSidebar(k); break;
      case 'split-read':     startSplitRead(k);        break;
      case 'download':       downloadSingleReply(k);   break;
      case 'refresh':        refreshPlatform(k);       break;
      case 'external':       openExternal(k);          break;
      case 'picker':         openSelPanel(getBasePlatform(k)); break;
      case 'block-picker':   startBlockPicker(k);      break;
      case 'col-more':       toggleMoreMenu(btn);      break;
    }
  });

  // 插入到 #fc-focus-nav 左侧
  const nav = document.getElementById('fc-focus-nav');
  const header = document.querySelector('.header');
  if (nav && header) header.insertBefore(btns, nav);
  else if (header) header.appendChild(btns);
}

function exitFocus() {
  if (!focusedPlatform) return;
  focusedPlatform = null;

  document.body.classList.remove('fc-focus-mode');
  document.getElementById('btn-focus-exit-top')?.style.setProperty('display', 'none');
  document.getElementById('fc-focus-nav')?.remove();
  document.getElementById('fc-focus-col-btns')?.remove();

  // 恢复所有列
  activePlatforms.forEach(k => {
    const col = document.getElementById(`col-${k}`);
    if (col) col.classList.remove('fc-focused', 'fc-hidden-by-focus', 'with-panel');
  });
}

async function switchFocus(dir) {
  if (!focusedPlatform) return;
  const ordered = getOrderedPlatforms();
  const currentKey = focusedPlatform; // 保存：restore 可能调 exitFocus() 清掉 focusedPlatform
  const idx = ordered.indexOf(currentKey);
  const delta = (dir === 'prev' || dir === -1) ? -1 : 1;
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= ordered.length) return;

  const wasSplitRead = document.body.classList.contains('fc-split-read');

  // 如果当前在分列阅读，先退出（restore 内部可能调 exitFocus 清空状态）
  if (wasSplitRead && window.__fc_sr_restore__) {
    window.__fc_sr_restore__();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  const newKey = ordered[newIdx];

  // 确保 fc-focus-mode 存在（restore 可能通过 exitFocus 移除了它）
  if (!document.body.classList.contains('fc-focus-mode')) {
    document.body.classList.add('fc-focus-mode');
  }

  // 重置所有列的聚焦 class，再设新列
  activePlatforms.forEach(k => {
    const col = document.getElementById(`col-${k}`);
    if (!col) return;
    if (k === newKey) {
      col.classList.remove('fc-hidden-by-focus');
      col.classList.add('fc-focused');
      if (hlPanelOpen) col.classList.add('with-panel');
    } else {
      col.classList.remove('fc-focused', 'with-panel');
      col.classList.add('fc-hidden-by-focus');
    }
  });

  focusedPlatform = newKey;

  // 更新或插入导航条（split-read 模式下 sr-bar 会接管 header，不在此处插入）
  if (!wasSplitRead) {
    if (document.getElementById('fc-focus-nav')) {
      _updateFocusNav(newKey);
    } else {
      _insertFocusNav(newKey);
    }
  }

  // 如果之前是分列阅读，自动为新平台启动分列阅读
  if (wasSplitRead) {
    await startSplitRead(focusedPlatform);
  }
}

// ============================================================
// 窗口排序（Sprint 2）
// ============================================================

/** 按用户设定排序返回平台列表，未设定则原序 */
function getOrderedPlatforms() {
  if (!settings.windowOrder || settings.windowOrder.length === 0) return [...activePlatforms];
  const inOrder = settings.windowOrder.filter(k => activePlatforms.includes(k));
  const extra   = activePlatforms.filter(k => !inOrder.includes(k));
  return [...inOrder, ...extra];
}

/** 通过 CSS order 实现视觉排序（不移动 DOM，不触发 iframe reload） */
function applyWindowOrder() {
  const ordered = getOrderedPlatforms();
  ordered.forEach((key, i) => {
    const col = document.getElementById(`col-${key}`);
    if (col) col.style.order = String(i);
  });
}

/** 渲染排序 Popover 的列表并绑定原生 HTML5 拖拽 */
function renderSortPopover() {
  const list = document.getElementById('sort-list');
  if (!list) return;

  const ordered = getOrderedPlatforms();
  list.innerHTML = ordered.map((key, i) => {
    const p = ALL_PLATFORMS[getBasePlatform(key)]; if (!p) return '';
    const num = key.match(/_(\d+)$/)?.[1];
    const name = num ? `${p.name} #${num}` : p.name;
    return `<div class="sort-item" data-key="${key}" draggable="true">
      <span class="sort-handle">⠿</span>
      <div class="sort-item-dot" style="background:${p.color}"></div>
      <span class="sort-item-name">${name}</span>
      <span class="sort-item-idx">${i + 1}</span>
      <button class="sort-item-remove" data-action="remove-sort" data-key="${key}" data-tooltip="移除">
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>`;
  }).join('');

  let dragKey = null;

  list.querySelectorAll('.sort-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragKey = item.dataset.key;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      list.querySelectorAll('.sort-item').forEach(i =>
        i.classList.remove('drag-over-top', 'drag-over-bottom')
      );
      const rect = item.getBoundingClientRect();
      const isBefore = e.clientY < rect.top + rect.height / 2;
      item.classList.toggle('drag-over-top',    isBefore);
      item.classList.toggle('drag-over-bottom', !isBefore);
    });
    item.addEventListener('dragleave', e => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over-top', 'drag-over-bottom');
      if (!dragKey || dragKey === item.dataset.key) return;

      const newOrder  = getOrderedPlatforms().filter(k => k !== dragKey);
      const targetIdx = newOrder.indexOf(item.dataset.key);
      const rect      = item.getBoundingClientRect();
      const before    = e.clientY < rect.top + rect.height / 2;
      newOrder.splice(before ? targetIdx : targetIdx + 1, 0, dragKey);

      settings.windowOrder = newOrder;
      applyWindowOrder();
      saveConfig();
      renderAddPlatformPopover();   // 重新渲染列表
    });
    // 排序区内的删除按钮
    item.querySelector('.sort-item-remove')?.addEventListener('click', e => {
      e.stopPropagation();
      removePlatform(item.dataset.key);
    });
  });
}

// ============================================================
// 导出功能（Sprint 3.5）
// ============================================================

function downloadMd(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/**
 * 按 windowOrder 顺序获取第一个可用的 iframe 标题，用作导出文件名的一部分。
 * 失败时返回 null（调用方降级为时间戳）。
 */
async function getBestExportTitle() {
  const tab = await chrome.tabs.getCurrent().catch(() => null);
  if (!tab) return null;

  for (const key of getOrderedPlatforms()) {
    const frame = platformFrames[key];
    if (!frame?.tabId || !frame?.frameId) continue;
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: frame.tabId, frameIds: [frame.frameId] },
        func: () => document.title,
      });
      const raw = res?.[0]?.result?.trim();
      if (!raw) continue;
      const title = cleanConversationTitle(raw);
      if (!title) continue;
      return title;
    } catch (_) { /* 跨域/未加载等异常，继续下一个 */ }
  }
  return null;
}

async function exportAllReplies() {
  // 优先用多轮日志，兜底用 replyStore
  const hasLog = conversationLog.some(r => Object.keys(r.replies).length > 0);
  if (!hasLog && !Object.keys(replyStore).length) {
    showToast(msg('toast_no_replies'));
    return;
  }

  const exportTs = new Date().toLocaleString('zh-CN');
  let md = `# AI 对话导出\n\n> 导出时间：${exportTs}\n\n`;

  const orderedKeys = getOrderedPlatforms();

  if (hasLog) {
    // 多轮模式：按轮次输出"问题 + 各平台回复"，平台顺序严格按用户排列
    const rounds = conversationLog.filter(r => Object.keys(r.replies).length > 0);
    rounds.forEach((round, i) => {
      md += `---\n\n## 第 ${i + 1} 轮\n\n`;
      if (round.question) md += `> **问题**：${round.question}\n\n`;
      const sortedKeys = [
        ...orderedKeys.filter(k => round.replies[k]),
        ...Object.keys(round.replies).filter(k => !orderedKeys.includes(k)),
      ];
      for (const key of sortedKeys) {
        const r    = round.replies[key];
        const num  = key.match(/_(\d+)$/)?.[1];
        const base = getBasePlatform(key);
        const name = (ALL_PLATFORMS[base]?.name || base) + (num ? ` #${num}` : '');
        md += `# ${name}\n\n${r.text}\n\n`;
      }
    });
  } else {
    // 兜底：单轮模式，顺序同样按 windowOrder
    md += `---\n\n`;
    const sortedKeys = [
      ...orderedKeys.filter(k => replyStore[k]),
      ...Object.keys(replyStore).filter(k => !orderedKeys.includes(k)),
    ];
    for (const key of sortedKeys) {
      const r    = replyStore[key];
      const num  = key.match(/_(\d+)$/)?.[1];
      const base = getBasePlatform(key);
      const name = (ALL_PLATFORMS[base]?.name || base) + (num ? ` #${num}` : '');
      md += `# ${name}\n\n${r.text}\n\n`;
    }
  }

  const titleSlug = await getBestExportTitle();
  const fname = `flowchat-replies-${titleSlug || Date.now()}.md`;
  downloadMd(md, fname);
  const rounds = conversationLog.filter(r => Object.keys(r.replies).length > 0);
  showToast(msg('toast_exported_rounds', [(rounds.length || 1).toString()]));
}

async function exportHighlights() {
  if (!highlights.length) {
    showToast(msg('toast_no_highlights'));
    return;
  }
  const ts = new Date().toLocaleString('zh-CN');
  const ORDER  = ['adopt', 'ref', 'reject', 'note'];
  const LABELS = { adopt: '采纳', ref: '参考', reject: '拒绝', note: '批注' };

  let md = `# 高亮精华\n\n> 导出时间：${ts}\n\n`;
  for (const label of ORDER) {
    const items = highlights.filter(h => h.label === label);
    if (!items.length) continue;
    md += `## ${LABELS[label]}\n\n`;
    for (const hl of items) {
      const pnum2  = hl.platform?.match(/_(\d+)$/)?.[1];
      const pbase2 = getBasePlatform(hl.platform || '');
      const pname  = (ALL_PLATFORMS[pbase2]?.name || hl.platform) + (pnum2 ? ` #${pnum2}` : '');
      md += `- **[${pname}]** ${hl.text}\n`;
    }
    md += '\n';
  }
  const titleSlug = await getBestExportTitle();
  const fname = `flowchat-highlights-${titleSlug || Date.now()}.md`;
  downloadMd(md, fname);
  showToast(msg('toast_exported_highlights', [highlights.length.toString()]));
}

/** 下载单个 AI 平台的回复 */
function downloadSingleReply(key) {
  // 优先从 conversationLog 获取多轮历史，兜底 replyStore
  const base = getBasePlatform(key);
  const p    = ALL_PLATFORMS[base];
  const pnum = key.match(/_(\d+)$/)?.[1];
  const name = (p?.name || key) + (pnum ? ` #${pnum}` : '');

  const rounds = conversationLog.filter(r => r.replies[key]?.text);
  if (rounds.length > 0) {
    const lines = [`# ${name} ${msg('download_reply_title')}\n`];
    rounds.forEach((r, i) => {
      lines.push(`## ${msg('download_round_label', [(i + 1).toString()])}`);
      if (r.question) lines.push(`**Q:** ${r.question}\n`);
      lines.push(r.replies[key].text, '\n---\n');
    });
    downloadMd(lines.join('\n'), `${name}-${Date.now()}.md`);
    showToast(msg('toast_downloaded_single', [name]));
  } else if (replyStore[key]?.text) {
    const md = `# ${name} ${msg('download_reply_title')}\n\n${replyStore[key].text}\n`;
    downloadMd(md, `${name}-${Date.now()}.md`);
    showToast(msg('toast_downloaded_single', [name]));
  } else {
    showToast(msg('toast_no_reply_single', [name]));
  }
}

// ============================================================
// 融合生成
// ============================================================

/** 更新「融合生成」按钮状态：有 AI 回复内容即可点击，并标注当前模式 */
function updateSynthesisBtn() {
  const btn   = document.getElementById('btn-synthesis');
  const label = document.getElementById('synthesis-btn-label');
  if (!btn) return;
  const hasHL = highlights.length > 0;
  btn.disabled = false;   // 始终可点击，无内容时在 doSynthesis 内提示
  if (label) {
    label.textContent = hasHL ? msg('synthesis_hl_mode') : msg('synthesis_all_mode');
  }
}

/** 执行融合生成 */
async function doSynthesis() {
  const sourceReplyEntries = Object.entries(replyStore).filter(([k]) => !transientPlatforms.has(k));
  if (sourceReplyEntries.length === 0 && highlights.length === 0) {
    showToast(msg('toast_no_active_ai'));
    return;
  }
  if (!settings.synthesisTarget || !getPersistentPlatforms(activePlatforms).includes(settings.synthesisTarget)) {
    showToast(msg('toast_no_synthesis_target'));
    openSynthesisPopover();
    return;
  }

  const stored = await chrome.storage.local.get([SYNTHESIS_KEY]);
  const config = stored[SYNTHESIS_KEY] || {};
  const hasHL  = highlights.length > 0;
  let prompt;

  if (hasHL) {
    const tmpl   = config.promptHl || DEFAULT_PROMPT_HL;
    const get    = lbl => highlights.filter(h => h.label === lbl).map(h => h.text).join('\n');
    prompt = tmpl
      .replace('{user_question}', lastSentMessage || '（未记录）')
      .replace('{adopt}',  get('adopt')  || '（无）')
      .replace('{ref}',    get('ref')    || '（无）')
      .replace('{reject}', get('reject') || '（无）')
      .replace('{note}',   get('note')   || '（无）');
  } else {
    const tmpl    = config.promptAll || DEFAULT_PROMPT_ALL;
    const count   = sourceReplyEntries.length;
    const replies = sourceReplyEntries.map(([k, r]) => {
      const base = getBasePlatform(k);
      const pnum = k.match(/_(\d+)$/)?.[1];
      const name = (ALL_PLATFORMS[base]?.name || k) + (pnum ? ` #${pnum}` : '');
      return `### ${name}\n${r.text}`;
    }).join('\n\n---\n\n');
    prompt = tmpl
      .replace('{user_question}', lastSentMessage || '（未记录）')
      .replace('{all_replies}', replies)
      .replace('{count}', String(count));
  }

  const target     = settings.synthesisTarget;
  const basePlatform = getBasePlatform(target);

  // 预先算出即将创建的新实例 key（和 addPlatform 逻辑一致）
  let newKey = basePlatform;
  if (activePlatforms.includes(newKey)) {
    let n = 2;
    while (activePlatforms.includes(`${basePlatform}_${n}`)) n++;
    newKey = `${basePlatform}_${n}`;
  }

  // 新增临时实例（保留用户原有对话，不写入布局记忆）
  newKey = addPlatform(basePlatform, { transient: true }) || newKey;

  // 把新列移到最前面
  const newOrder = [newKey, ...getOrderedPlatforms().filter(k => k !== newKey)];
  settings.windowOrder = newOrder;
  applyWindowOrder();
  saveConfig();

  // 等待新实例 bridge 就绪（最多 20s）
  showToast(msg('synth_new_chat'));
  const deadline = Date.now() + 20000;
  while (bridgeStatus[newKey] !== 'connected') {
    if (Date.now() > deadline) {
      showToast(msg('synth_connect_timeout'));
      return;
    }
    await sleep(300);
  }

  const ok = await sendToPlatform(newKey, prompt);
  if (ok) {
    showToast(msg('toast_synthesis_sent'));
    closeHighlightPanel();
    if (config.autoFocusSplit) {
      enterFocus(newKey);
      await sleep(500);
      startSplitRead(newKey);
    }
  }
}

/** 打开融合设置浮窗 */
async function openSynthesisPopover() {
  const pop = document.getElementById('popover-synthesis');
  const btn = document.getElementById('btn-synthesis-settings');
  renderSynthesisTargetList();
  const stored = await chrome.storage.local.get([SYNTHESIS_KEY]);
  const config = stored[SYNTHESIS_KEY] || {};
  document.getElementById('synthesis-prompt-all').value = config.promptAll || DEFAULT_PROMPT_ALL;
  document.getElementById('synthesis-prompt-hl').value  = config.promptHl  || DEFAULT_PROMPT_HL;
  const autoFocusSplitEl = document.getElementById('setting-synthesis-auto-focus-split');
  if (autoFocusSplitEl) autoFocusSplitEl.checked = !!config.autoFocusSplit;

  // 融合设置按钮始终在面板底部 → 浮窗强制向上弹出，不受 barPosition 影响
  pop.style.display = 'flex';
  pop.style.pointerEvents = 'auto';
  const rect = btn.getBoundingClientRect();
  const pw   = pop.offsetWidth;
  let left   = _clampPopoverLeft(rect.right - pw, pw);
  pop.style.left   = left + 'px';
  pop.style.top    = 'auto';
  pop.style.bottom = Math.max(8, window.innerHeight - rect.top + 8) + 'px';
}

function closeSynthesisPopover() {
  document.getElementById('popover-synthesis').style.display = 'none';
}

/** 渲染目标 AI 单选列表 */
function renderSynthesisTargetList() {
  const list = document.getElementById('synthesis-target-list');
  const targets = getPersistentPlatforms(activePlatforms);
  if (!targets.length) {
    list.innerHTML = `<div class="synthesis-no-platforms">${msg('synthesis_no_platforms')}</div>`;
    return;
  }
  list.innerHTML = targets.map(k => {
    const base  = getBasePlatform(k);
    const p     = ALL_PLATFORMS[base];
    const pnum  = k.match(/_(\d+)$/)?.[1];
    const name  = (p?.name || k) + (pnum ? ` #${pnum}` : '');
    const color = p?.color || '#888';
    const sel   = settings.synthesisTarget === k;
    return `<label class="synthesis-target-item${sel ? ' selected' : ''}">
      <input type="radio" name="synthesisTarget" value="${k}"${sel ? ' checked' : ''}>
      <span class="synthesis-target-dot" style="background:${color}"></span>
      <span class="synthesis-target-name">${name}</span>
    </label>`;
  }).join('');
  list.querySelectorAll('input[name="synthesisTarget"]').forEach(input => {
    input.addEventListener('change', () => {
      settings.synthesisTarget = input.value;
      chrome.storage.sync.set({ settings });
      renderSynthesisTargetList();
    });
  });
}

// ── 顶栏全量融合弹窗 ──

function openSynthesisAllPopup(anchorBtn = null) {
  const pop = document.getElementById('popover-synthesis-all');
  const btn = anchorBtn || document.getElementById('btn-synthesis-all');
  renderSynthesisAllTargetList();
  pop.style.display = 'flex';
  pop.style.pointerEvents = 'auto';
  const rect = btn.getBoundingClientRect();
  const pw   = pop.offsetWidth;
  let left   = _clampPopoverLeft(rect.left + rect.width / 2 - pw / 2, pw);
  pop.style.left = left + 'px';
  pop.style.top  = (rect.bottom + 8) + 'px';
  pop.style.bottom = 'auto';
}

function closeSynthesisAllPopup() {
  document.getElementById('popover-synthesis-all').style.display = 'none';
}

function renderSynthesisAllTargetList() {
  const list = document.getElementById('synthesis-all-target-list');
  const targets = getPersistentPlatforms(activePlatforms);
  if (!targets.length) {
    list.innerHTML = `<div class="synthesis-no-platforms">${msg('synthesis_no_platforms')}</div>`;
    return;
  }
  list.innerHTML = targets.map(k => {
    const base  = getBasePlatform(k);
    const p     = ALL_PLATFORMS[base];
    const pnum  = k.match(/_(\d+)$/)?.[1];
    const name  = (p?.name || k) + (pnum ? ` #${pnum}` : '');
    const color = p?.color || '#888';
    const sel   = settings.synthesisTarget === k;
    return `<label class="synthesis-target-item${sel ? ' selected' : ''}">
      <input type="radio" name="synthesisAllTarget" value="${k}"${sel ? ' checked' : ''}>
      <span class="synthesis-target-dot" style="background:${color}"></span>
      <span class="synthesis-target-name">${name}</span>
    </label>`;
  }).join('');
  list.querySelectorAll('input[name="synthesisAllTarget"]').forEach(input => {
    input.addEventListener('change', () => {
      settings.synthesisTarget = input.value;
      chrome.storage.sync.set({ settings });
      renderSynthesisAllTargetList();
    });
  });
}

/** 全量融合（顶栏按钮）— 始终用全量模式 Prompt，不管有无高亮 */
async function doSynthesisAll() {
  const sourceReplyEntries = Object.entries(replyStore).filter(([k]) => !transientPlatforms.has(k));
  if (sourceReplyEntries.length === 0) {
    showToast(msg('toast_no_replies'));
    return;
  }
  if (!settings.synthesisTarget || !getPersistentPlatforms(activePlatforms).includes(settings.synthesisTarget)) {
    showToast(msg('toast_no_synthesis_target'));
    return;
  }

  closeSynthesisAllPopup();

  const stored = await chrome.storage.local.get([SYNTHESIS_KEY]);
  const config = stored[SYNTHESIS_KEY] || {};
  const tmpl   = config.promptAll || DEFAULT_PROMPT_ALL;
  const count  = sourceReplyEntries.length;
  const replies = sourceReplyEntries.map(([k, r]) => {
    const base = getBasePlatform(k);
    const pnum = k.match(/_(\d+)$/)?.[1];
    const name = (ALL_PLATFORMS[base]?.name || k) + (pnum ? ` #${pnum}` : '');
    return `### ${name}\n${r.text}`;
  }).join('\n\n---\n\n');
  const prompt = tmpl
    .replace('{user_question}', lastSentMessage || '（未记录）')
    .replace('{all_replies}', replies)
    .replace('{count}', String(count));

  const target       = settings.synthesisTarget;
  const basePlatform = getBasePlatform(target);
  let newKey = basePlatform;
  if (activePlatforms.includes(newKey)) {
    let n = 2;
    while (activePlatforms.includes(`${basePlatform}_${n}`)) n++;
    newKey = `${basePlatform}_${n}`;
  }

  newKey = addPlatform(basePlatform, { transient: true }) || newKey;
  const newOrder = [newKey, ...getOrderedPlatforms().filter(k => k !== newKey)];
  settings.windowOrder = newOrder;
  applyWindowOrder();
  saveConfig();

  showToast(msg('synth_new_chat'));
  const deadline = Date.now() + 20000;
  while (bridgeStatus[newKey] !== 'connected') {
    if (Date.now() > deadline) {
      showToast(msg('synth_connect_timeout'));
      return;
    }
    await sleep(300);
  }

  const ok = await sendToPlatform(newKey, prompt);
  if (ok) {
    showToast(msg('toast_synthesis_sent'));
    if (config.autoFocusSplit) {
      enterFocus(newKey);
      await sleep(500);
      startSplitRead(newKey);
    }
  }
}

// ============================================================
// Picker 选择器调试
// ============================================================

async function startPicker(key) {
  pickerState[key] = { step: 'input' };
  // 先展示"检测中"，立刻显示横幅
  _setPickerHTML(key, `<span class="pb-step">${msg('picker_detecting')}</span>`);

  // 获取当前选择器，在 iframe 内高亮已匹配的元素
  const { inputSels, sendSels } = await getSelectors(key);
  const info = await _highlightCurrentMatches(key, inputSels, sendSels);

  const inTxt  = info.inputMatch ? `<span class="pb-ok">OK</span> ${_trunc(info.inputMatch)}` : `<span class="pb-err">未匹配</span>`;
  const sdTxt  = info.sendMatch  ? `<span class="pb-ok">OK</span> ${_trunc(info.sendMatch)}`  : `<span class="pb-err">未匹配</span>`;
  _setPickerHTML(key,
    `<div class="pb-match">输入框：${inTxt} &nbsp;|&nbsp; 发送：${sdTxt}</div>` +
    `<div class="pb-step">第 1 步：点击 AI 页面中的【输入框】来覆盖</div>`
  );
  await activatePickerInFrame(key, 'input');
}

/** 截断过长选择器 */
function _trunc(s) { return s.length > 44 ? s.slice(0, 41) + '…' : s; }

/** 设置 picker 横幅（HTML 安全内容） */
function _setPickerHTML(key, html) {
  document.getElementById(`pb-${key}`)?.classList.remove('hidden');
  const pt = document.getElementById(`pb-text-${key}`);
  if (pt) pt.innerHTML = html;
}

/** 旧版兼容：纯文本设置 */
function setPickerBanner(key, text) {
  document.getElementById(`pb-${key}`)?.classList.remove('hidden');
  const pt = document.getElementById(`pb-text-${key}`);
  if (pt) pt.textContent = text;
}

async function getFlowChatTabContext(preferredKey = null) {
  const preferredFrame = preferredKey ? platformFrames[preferredKey] : null;
  const knownTabId = preferredFrame?.tabId
    || Object.values(platformFrames).find(f => f?.tabId)?.tabId;

  if (knownTabId != null) {
    const frames = await chrome.webNavigation.getAllFrames({ tabId: knownTabId });
    return { tabId: knownTabId, frames: frames || [] };
  }

  const current = await chrome.tabs.getCurrent().catch(() => null);
  if (current?.id != null) {
    const frames = await chrome.webNavigation.getAllFrames({ tabId: current.id });
    return { tabId: current.id, frames: frames || [] };
  }

  const [active] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
  if (active?.id != null) {
    const frames = await chrome.webNavigation.getAllFrames({ tabId: active.id });
    return { tabId: active.id, frames: frames || [] };
  }

  return { tabId: null, frames: [] };
}

/** 在 iframe 内高亮当前匹配的输入框（蓝色）和发送按钮（绿色），并返回匹配的选择器 */
async function _highlightCurrentMatches(key, inputSels, sendSels) {
  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const frame  = _findPickerFrame(key, frames);
    if (!frame) return { inputMatch: null, sendMatch: null };

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frame.frameId] },
      world: 'MAIN',
      func: function findAndHighlight(inputSels, sendSels) {
        // 清理旧高亮
        document.querySelectorAll('.__fc_match_hl__').forEach(el => {
          el.style.removeProperty('outline');
          el.style.removeProperty('outline-offset');
          el.classList.remove('__fc_match_hl__');
        });
        function findEl(sels) {
          for (const s of sels) {
            try { const e = document.querySelector(s); if (e) return { sel: s, el: e }; } catch {}
          }
          return null;
        }
        const inp  = findEl(inputSels);
        const send = findEl(sendSels);
        if (inp?.el)  { inp.el.style.outline  = '3px solid #4285f4'; inp.el.style.outlineOffset  = '2px'; inp.el.classList.add('__fc_match_hl__'); }
        if (send?.el) { send.el.style.outline = '3px solid #34c759'; send.el.style.outlineOffset = '2px'; send.el.classList.add('__fc_match_hl__'); }
        return { inputMatch: inp?.sel || null, sendMatch: send?.sel || null };
      },
      args: [inputSels, sendSels]
    });
    return result?.[0]?.result || { inputMatch: null, sendMatch: null };
  } catch {
    return { inputMatch: null, sendMatch: null };
  }
}

/** 判断 frame URL 是否为嵌套工具 iframe（非主对话页面）*/
function _isUtilityFrame(url) {
  try {
    const p = new URL(url).pathname.toLowerCase();
    return /isolated|segment|embed|widget|frame\.html|extension|sandbox|bscframe|\/_\/bsc/i.test(p);
  } catch { return false; }
}

/** 统一的 Picker frame 查找：优先 platformFrames（bridge 已连接），其次 URL 匹配 */
function _findPickerFrame(key, frames) {
  const basePlatform = getBasePlatform(key);
  const knownFrame   = platformFrames[key];
  if (knownFrame) {
    const f = frames.find(f => f.frameId === knownFrame.frameId);
    // 验证 URL 确实属于此平台且不是工具 iframe（如 isolated-segment.html）
    if (f && f.parentFrameId === 0 && getPlatformForUrl(f.url) === basePlatform && !_isUtilityFrame(f.url)) return f;
  }
  // URL 匹配兜底：优先非工具 iframe
  const candidates = frames.filter(f => f.frameId !== 0 && getPlatformForUrl(f.url) === basePlatform);
  return candidates.find(f => f.parentFrameId === 0 && !_isUtilityFrame(f.url))
    || candidates.find(f => !_isUtilityFrame(f.url))
    || null;
}

function hidePickerBanner(key) {
  document.getElementById(`pb-${key}`)?.classList.add('hidden');
  pickerState[key] = { step: 'idle' };
}

async function cancelPicker(key) {
  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const frame  = _findPickerFrame(key, frames);
    if (frame) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frame.frameId] },
        world: 'MAIN',
        func: () => {
          if (typeof window.__fc_picker_cleanup__ === 'function') {
            try { window.__fc_picker_cleanup__(); } catch {}
            window.__fc_picker_cleanup__ = null;
          }
          window.__fc_picker__ = false;
          document.getElementById('__fc_picker_style__')?.remove();
          document.querySelectorAll('.__fc_hover__, .__fc_match_hl__, .__fc_sel_preview__').forEach(e => {
            e.classList.remove('__fc_hover__', '__fc_match_hl__', '__fc_sel_preview__');
            e.style.removeProperty('outline');
            e.style.removeProperty('outline-offset');
          });
        }
      });
    }
  } catch {}
  hidePickerBanner(key);
  document.querySelectorAll(`.sel-cfg-pick[data-base="${getBasePlatform(key)}"].active`).forEach(b => b.classList.remove('active'));
}

async function activatePickerInFrame(key, step) {
  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const frame  = _findPickerFrame(key, frames);
    if (!frame) { showToast(`找不到 ${ALL_PLATFORMS[getBasePlatform(key)]?.name || key} 的页面，请确认已加载`); hidePickerBanner(key); return; }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frame.frameId] },
      world: 'MAIN',  // MAIN world：比 React 等框架的事件先注册，避免被 stopImmediatePropagation 拦截
      func: function injectPicker(platform, step, extOrigin) {
        if (typeof window.__fc_picker_cleanup__ === 'function') {
          try { window.__fc_picker_cleanup__(); } catch {}
        }
        window.__fc_picker__ = false;
        document.getElementById('__fc_picker_style__')?.remove();
        document.querySelectorAll('.__fc_hover__').forEach(e => e.classList.remove('__fc_hover__'));
        window.__fc_picker__ = true;

        const style = document.createElement('style');
        style.id = '__fc_picker_style__';
        style.textContent = `.__fc_hover__{ outline:3px dashed #6366f1!important; outline-offset:2px!important; cursor:crosshair!important; background:rgba(99,102,241,.1)!important; }`;
        document.head.appendChild(style);

        let hovered = null;

        function pickBlockTarget(el) {
          if (step !== 'block') return el;
          let cur = el;
          for (let i = 0; cur && cur !== document.body && i < 4; i++, cur = cur.parentElement) {
            const tag = cur.tagName?.toLowerCase();
            if (/^(button|a|input|textarea|select)$/.test(tag) || cur.getAttribute('role') === 'button') return cur;
          }
          return el;
        }

        function genSel(el) {
          const escIdent = v => (window.CSS?.escape ? CSS.escape(String(v)) : String(v).replace(/([ #.;?+*~':"!^$[\]()=>|/@])/g, '\\$1'));
          const escAttr = v => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          if (el.id) return '#' + escIdent(el.id);
          const tid = el.getAttribute('data-testid');
          if (tid) return `[data-testid="${escAttr(tid)}"]`;
          const al = el.getAttribute('aria-label');
          if (al) return `${el.tagName.toLowerCase()}[aria-label="${escAttr(al)}"]`;
          const nm = el.getAttribute('name');
          if (nm) return `${el.tagName.toLowerCase()}[name="${escAttr(nm)}"]`;
          const cls = [...el.classList].filter(c => c && c.length < 50 && !/^\d/.test(c) && !c.startsWith('__fc_')).slice(0, 3);
          if (cls.length) {
            const s = el.tagName.toLowerCase() + '.' + cls.map(escIdent).join('.');
            try { if (document.querySelectorAll(s).length === 1) return s; } catch {}
          }
          function path(e) {
            if (!e || e === document.body) return 'body';
            const par  = e.parentElement; if (!par) return e.tagName.toLowerCase();
            const same = [...par.children].filter(c => c.tagName === e.tagName);
            return path(par) + '>' + e.tagName.toLowerCase() + (same.length > 1 ? ':nth-of-type(' + (same.indexOf(e) + 1) + ')' : '');
          }
          return path(el);
        }

        function onOver(e)  {
          if (!window.__fc_picker__) return;
          if (hovered) hovered.classList.remove('__fc_hover__');
          const target = pickBlockTarget(e.target);
          target.classList.add('__fc_hover__');
          hovered = target;
        }
        function onClick(e) {
          if (!window.__fc_picker__) return;
          e.preventDefault(); e.stopImmediatePropagation();
          const targetEl = pickBlockTarget(e.target);
          const sel = genSel(targetEl);
          if (hovered) hovered.classList.remove('__fc_hover__');
          document.getElementById('__fc_picker_style__')?.remove();
          document.removeEventListener('mouseover', onOver, true);
          document.removeEventListener('click', onClick, true);
          window.__fc_picker__ = false;
          // 清理之前的匹配高亮
          document.querySelectorAll('.__fc_match_hl__').forEach(el => {
            el.classList.remove('__fc_match_hl__');
            el.style.removeProperty('outline');
            el.style.removeProperty('outline-offset');
          });
          if (step === 'block') {
            targetEl.style.setProperty('display', 'none', 'important');
            console.log('[FlowChat BlockPicker] selected', {
              platform,
              selector: sel,
              tag: targetEl.tagName,
              className: String(targetEl.className || '').slice(0, 160),
              text: String(targetEl.innerText || targetEl.textContent || '').slice(0, 120),
            });
          }
          // MAIN world 无 chrome.runtime；用 postMessage 传回父窗口（flowchat.html）
          // 注意：Grok 等 frame-bust 平台的 window.parent 已被覆写为 window 自身，
          // 需用 frame-bust 脚本保存的真实 parent 引用
          const target = window.__fc_real_parent__ || window.parent;
          const payload = { __fc_type: 'PICKER_SELECTED', platform, step, selector: sel };
          try {
            target.postMessage(payload, extOrigin || '*');
            console.log('[FlowChat Picker] posted to parent', { platform, step, selector: sel, extOrigin });
          } catch (err) {
            console.warn('[FlowChat Picker] parent postMessage failed', { platform, step, selector: sel, error: err.message });
          }
          try {
            window.postMessage({ ...payload, __fc_local_relay: true }, location.origin);
            console.log('[FlowChat Picker] posted local relay', { platform, step, selector: sel, origin: location.origin });
          } catch (err) {
            console.warn('[FlowChat Picker] local relay failed', { platform, step, selector: sel, error: err.message });
          }
        }
        document.addEventListener('mouseover', onOver, true);
        document.addEventListener('click', onClick, true);
        window.__fc_picker_cleanup__ = () => {
          window.__fc_picker__ = false;
          if (hovered) hovered.classList.remove('__fc_hover__');
          hovered = null;
          document.getElementById('__fc_picker_style__')?.remove();
          document.removeEventListener('mouseover', onOver, true);
          document.removeEventListener('click', onClick, true);
        };
      },
      args: [key, step, location.origin]
    });
  } catch (err) {
    showToast(`激活失败：${err.message}`);
    hidePickerBanner(key);
  }
}

async function handlePickerSelected({ platform: key, step, selector }) {
  const pickerEventKey = `${key}|${step}|${selector}`;
  const now = Date.now();
  if (_lastPickerSelectedKey === pickerEventKey && now - _lastPickerSelectedAt < 1200) {
    console.log('[FlowChat Picker] duplicate ignored', { key, step, selector });
    return;
  }
  _lastPickerSelectedKey = pickerEventKey;
  _lastPickerSelectedAt = now;

  if (step === 'block') {
    console.log('[FlowChat Block] picker selected', { key, base: getBasePlatform(key), selector });
    const saved = await saveBlockedElement(key, selector);
    hidePickerBanner(key);
    if (saved?.ok) {
      showToast(msg('toast_element_blocked', [ALL_PLATFORMS[getBasePlatform(key)]?.name || key]));
    } else {
      showToast('选择范围过大，已取消屏蔽，请选择更具体的元素');
    }
    return;
  }
  // 选择器配置面板模式：直接写入面板 input 并返回
  if (pickerState[key]?._selectorConfigMode) {
    await handleSelectorConfigPick(key, step, selector);
    pickerState[key] = null;
    return;
  }
  await saveSelector(key, step, selector);
  if (step === 'input') {
    _setPickerHTML(key,
      `<div class="pb-match">${msg('picker_input_saved_label')}<span class="pb-ok">${_trunc(selector)}</span></div>` +
      `<div class="pb-step">${msg('picker_input_saved_step2')}</div>`
    );
    await sleep(300);
    await activatePickerInFrame(key, 'send');
  } else {
    hidePickerBanner(key);
    showToast(msg('toast_selector_saved_detail', [ALL_PLATFORMS[getBasePlatform(key)]?.name || key, _trunc(selector)]));
  }
}

// ============================================================
// 分列阅读
// ============================================================

async function startSplitRead(key) {
  console.log('[FlowChat] startSplitRead called:', key);
  const tabCtx = await getFlowChatTabContext(key);
  const tab = tabCtx.tabId == null ? await chrome.tabs.getCurrent() : { id: tabCtx.tabId };
  const framesForKey = tabCtx.frames || [];
  let frame = platformFrames[key];
  const currentFrame = frame ? framesForKey.find(f => f.frameId === frame.frameId) : null;
  if (!currentFrame || currentFrame.parentFrameId !== 0 || getPlatformForUrl(currentFrame.url) !== getBasePlatform(key) || _isUtilityFrame(currentFrame.url)) {
    // Bridge 已连接但 frameId 未记录、失效或指向工具 iframe 时，实时扫描兜底。
    const found = _findPickerFrame(key, framesForKey);
    frame = found ? { tabId: tab.id, frameId: found.frameId } : null;
    if (found) platformFrames[key] = frame;
  }
  if (!frame) { showToast(msg('toast_wait_platform')); console.warn('[FlowChat] no frame for', key); return; }

  // 记录进入前状态
  const wasFocused = !!focusedPlatform;

  // 1. 加载遮罩仅覆盖内容区，不遮挡顶栏
  const mask = document.createElement('div');
  mask.id = 'fc-sr-mask';
  Object.assign(mask.style, {
    position:'fixed', top:'36px', left:'0', right:'0', bottom:'0',
    background:'#fff', zIndex:'99999',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'
  });
  mask.innerHTML = `<span style="color:#bbb;font-size:13px">${msg('sr_loading')}</span>`;
  document.body.appendChild(mask);

  // 2. 立即切换到分列阅读模式（header 瞬间切换，遮罩盖住内容区的过渡）
  document.body.classList.add('fc-split-read');
  if (!wasFocused) enterFocus(key);

  // 等一帧让聚焦布局生效
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ── 在 header 中插入分列阅读控件（隐藏原有子元素） ──
  const header = document.querySelector('.header');
  // 隐藏原有 header 子元素
  [...header.children].forEach(el => { el.dataset.srHidden = el.style.display || ''; el.style.display = 'none'; });

  const srBar = document.createElement('div');
  srBar.id = 'sr-bar';
  srBar.className = 'sr-bar';
  srBar.innerHTML = `
    <div class="sr-left">
      <span class="logo">FlowChat</span>
      <span class="sr-brand-sep">/</span>
      <span class="sr-brand">FlowRead</span>
      <button class="sr-exit-btn" id="sr-exit">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12L6 8l4-4"/></svg>
        ${msg('sr_exit_btn')}
      </button>
    </div>
    <div style="flex:1"></div>
    <div class="sr-ctrl" id="sr-ctrl">
      <button class="sr-ctrl-btn" id="sr-prev" data-tooltip="${msg('sr_prev_tooltip')}">\u2190</button>
      <span class="sr-page-info" id="sr-page-info">1 / 1</span>
      <button class="sr-ctrl-btn" id="sr-next" data-tooltip="${msg('sr_next_tooltip')}">\u2192</button>
      <span class="sr-ctrl-sep"></span>
      <button class="sr-ctrl-btn sr-col-btn" data-sr-cols="2">2</button>
      <button class="sr-ctrl-btn sr-col-btn" data-sr-cols="3">3</button>
      <button class="sr-ctrl-btn sr-col-btn" data-sr-cols="4">4</button>
      <button class="sr-ctrl-btn sr-col-btn" data-sr-cols="5">5</button>
    </div>
  `;
  header.appendChild(srBar);

  // 向 iframe 引擎发命令（postMessage + executeScript 双通道）
  const iframeEl = document.getElementById(`iframe-${key}`);
  function srCmd(cmd, colsVal) {
    const msg = { __fc_type: 'SR_CMD', cmd };
    if (colsVal !== undefined) msg.cols = colsVal;
    // 通道 1: postMessage（跨域安全，不依赖 frameId）
    const _srOrigin = (() => { try { return new URL(ALL_PLATFORMS[getBasePlatform(key)].url).origin; } catch { return '*'; } })();
    try { iframeEl?.contentWindow?.postMessage(msg, _srOrigin); } catch {}
    // 通道 2: executeScript 兜底（部分平台 postMessage 被拦截）
    chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frame.frameId] },
      world: 'MAIN',
      func: (c, v) => {
        if (!window.__fc_sr__) return;
        if (c === 'setCols') window.__fc_sr__.setCols(v);
        else if (window.__fc_sr__[c]) window.__fc_sr__[c]();
      },
      args: [cmd, colsVal ?? null]
    }).catch(() => {});
  }
  // 每次操作后重新聚焦 iframe，确保键盘事件能到达
  function srAction(cmd, colsVal) {
    srCmd(cmd, colsVal);
    setTimeout(() => iframeEl?.focus(), 50);
  }
  document.getElementById('sr-exit')?.addEventListener('click', () => {
    srCmd('destroy'); // 通知 iframe 清理 overlay（若存在）
    // 直接恢复父页面 UI，不等待 SPLIT_READ_EXIT（避免 iframe 未初始化时卡死）
    if (window.__fc_sr_restore__) window.__fc_sr_restore__();
  });
  document.getElementById('sr-prev')?.addEventListener('click', () => srAction('goPrev'));
  document.getElementById('sr-next')?.addEventListener('click', () => srAction('goNext'));
  document.querySelectorAll('.sr-col-btn').forEach(b => {
    b.addEventListener('click', () => srAction('setCols', +b.dataset.srCols));
  });

  // 接收 iframe 状态更新
  function onSRState(e) {
    if (!KNOWN_ORIGINS.has(e.origin)) return;
    if (!e.data || e.data.__fc_type !== 'SR_STATE') return;
    const { page, totalPages, cols } = e.data;
    const info = document.getElementById('sr-page-info');
    if (info) info.textContent = `${page + 1} / ${totalPages}`;
    const prev = document.getElementById('sr-prev');
    const next = document.getElementById('sr-next');
    if (prev) { prev.disabled = page <= 0; prev.style.opacity = page <= 0 ? '0.3' : '1'; }
    if (next) { next.disabled = page >= totalPages - 1; next.style.opacity = page >= totalPages - 1 ? '0.3' : '1'; }
    document.querySelectorAll('.sr-col-btn').forEach(b => {
      b.classList.toggle('active', +b.dataset.srCols === cols);
    });
  }
  window.addEventListener('message', onSRState);

  // 恢复回调
  window.__fc_sr_restore__ = () => {
    const exitMask = document.createElement('div');
    Object.assign(exitMask.style, { position:'fixed', top:'36px', left:'0', right:'0', bottom:'0', background:'#fff', zIndex:'99999' });
    document.body.appendChild(exitMask);
    // 恢复 header：移除 sr-bar，恢复原有子元素
    document.getElementById('sr-bar')?.remove();
    [...header.children].forEach(el => {
      if ('srHidden' in el.dataset) { el.style.display = el.dataset.srHidden; delete el.dataset.srHidden; }
    });
    window.removeEventListener('message', onSRState);
    document.body.classList.remove('fc-split-read');
    if (!wasFocused) exitFocus();
    delete window.__fc_sr_restore__;
    requestAnimationFrame(() => requestAnimationFrame(() => exitMask.remove()));
  };

  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frame.frameId] },
      world: 'MAIN',
      func: function fcSplitRead(extOrigin, texts) {
        // Toggle off
        if (window.__fc_sr__) { window.__fc_sr__.destroy(); return { ok: true, toggled: true }; }

        // 保存原生 addEventListener/removeEventListener 引用，绕过平台框架对事件的劫持
        const _nativeAdd = EventTarget.prototype.addEventListener;
        const _nativeRem = EventTarget.prototype.removeEventListener;
        function _addDocEvt(type, fn, opts) { _nativeAdd.call(document, type, fn, opts); }
        function _remDocEvt(type, fn, opts) { _nativeRem.call(document, type, fn, opts); }

        const host = location.hostname;
        const isClaude  = host.includes('claude.ai');
        const isChatGPT = host.includes('chatgpt.com') || host.includes('chat.openai.com');
        const isGemini  = host.includes('gemini.google.com');
        const isGrok    = host.includes('grok.com') || host.includes('x.com');
        const isDoubao  = host.includes('doubao.com');
        const isKimi    = host.includes('kimi.com') || host.includes('kimi.moonshot.cn');
        const isDeepSeek= host.includes('deepseek.com');
        const isMetaso  = host.includes('metaso.cn');
        const isYuanbao = host.includes('yuanbao.tencent.com');
        const isZhida   = host.includes('zhida.zhihu.com');
        const isChatGLM = host.includes('chatglm.cn');
        const isMiniMax = host.includes('minimaxi.com') || host.includes('minimax.com');
        const isPoe     = host.includes('poe.com');
        const isCopilot = host.includes('copilot.microsoft.com');
        const isZai     = host.includes('z.ai');
        const isYiyan   = host.includes('yiyan.baidu.com');
        const isDark    = window.matchMedia('(prefers-color-scheme:dark)').matches;
        const BG        = isDark ? '#1a1a1a' : '#fff';
        const FG        = isDark ? '#e0e0e0' : '#1a1a1a';
        const SEP       = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        const PAD       = 16;   // 列左右/底部内边距
        const PAD_TOP   = 6;    // 列顶部内边距（紧凑）
        const PAD_BOTTOM_EXTRA = 56; // 额外底部留白（确保最后一行可见）
        const COL_GAP   = 0;

        // ═══════════════════════════════════════════════════
        // 1. 收集对话中所有块级内容元素
        // ═══════════════════════════════════════════════════
        function isVisibleContentNode(el) {
          if (!el || el.nodeType !== 1) return false;
          if (el.closest('#__fc_sr_overlay__, #__fc_sr_hint__')) return false;
          if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
          const rects = el.getClientRects();
          if (!rects.length) return false;
          return [...rects].some(r => r.width > 1 && r.height > 1);
        }

        function textSignature(el) {
          return (el?.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 500);
        }

        function dedupElements(raw) {
          const visible = raw.filter(isVisibleContentNode);
          if (!visible.length) return [];
          const set = new Set(visible);
          const noNested = visible.filter(el => {
            let p = el.parentElement;
            while (p && p !== document.documentElement) {
              if (set.has(p)) return false;
              p = p.parentElement;
            }
            return true;
          });
          const seenText = new Set();
          return noNested.filter(el => {
            const sig = textSignature(el);
            if (!sig) return false;
            if (seenText.has(sig)) return false;
            seenText.add(sig);
            return true;
          });
        }

        function inferMessageRole(el) {
          try {
            const roleNode = el.closest?.('[data-message-author-role]');
            const authorRole = roleNode?.getAttribute('data-message-author-role');
            if (authorRole === 'user') return 'user';
            if (authorRole === 'assistant') return 'assistant';

            const testNode = el.closest?.('[data-testid]');
            const testId = (testNode?.getAttribute('data-testid') || '').toLowerCase();
            if (testId.includes('user') || testId.includes('human')) return 'user';
            if (testId.includes('assistant') || testId.includes('model')) return 'assistant';

            const tag = el.tagName?.toLowerCase();
            if (tag === 'user-query') return 'user';
            if (tag === 'model-response') return 'assistant';

            let p = el;
            for (let i = 0; i < 8 && p; i++, p = p.parentElement) {
              const cls = String(p.className || '').toLowerCase();
              if (/(^|[-_\s])(user|human)([-_\s]|$)|human-turn/.test(cls)) return 'user';
              if (/(^|[-_\s])(assistant|model)([-_\s]|$)|assistantturn|model-response|response-text|prose/.test(cls)) return 'assistant';
            }
          } catch {}
          return '';
        }

        function collectContentContainers() {
          // ── 阶段 1：平台专属高置信度选择器（失败则 fallthrough） ──
          if (isChatGPT) {
            try {
              const r = dedupElements([...document.querySelectorAll('[data-message-author-role]')]
                .map(el => el.querySelector('[class*="markdown"],[class*="prose"]') || el)
                .filter(el => el.textContent.trim().length > 5));
              if (r.length) return r;
            } catch {}
          }
          if (isClaude) {
            const sels = [
              '[data-testid="user-human-turn"],[data-testid="assistant-message"]',
              '.font-claude-message',
              '[class*="human-turn"],[class*="AssistantTurn"],[class*="HumanTurn"]',
              '.prose,[class*="prose"]',
            ];
            for (const sel of sels) {
              try {
                const r = dedupElements([...document.querySelectorAll(sel)].filter(el => el.textContent.trim().length > 5));
                if (r.length) return r;
              } catch {}
            }
          }
          if (isGemini) {
            try {
              const r = dedupElements([...document.querySelectorAll('user-query,model-response,[class*="response-text"],[class*="model-response"]')]
                .filter(el => el.textContent.trim().length > 5));
              if (r.length) return r;
            } catch {}
          }

          // ── 阶段 2：通用核武器 fallback（直接扫描全页块级元素）──
          // 不依赖任何平台特定选择器，找所有实质性文本块
          // 注意：只排除"编辑器类"的 contenteditable（有 placeholder/aria-placeholder 的输入框），
          // 不排除只读展示用的 contenteditable 容器（豆包等平台的回复区也可能有此属性）
          const SKIP_PARENT = [
            'nav','header','footer','aside',
            '[role="navigation"]','[role="banner"]','[role="complementary"]',
            '[role="toolbar"]','[role="search"]','[role="dialog"]',
            'form','textarea',
            // 仅过滤有明确"输入"特征的 contenteditable（非只读展示容器）
            '[contenteditable][data-placeholder]',
            '[contenteditable][aria-placeholder]',
            '.ProseMirror[contenteditable]',
            '.ql-editor[contenteditable]',
            '[role="textbox"]',
          ].join(',');

          // 2a. 语义化块元素（p/h1-h6/ul/ol/pre/blockquote/table）
          try {
            const raw = [...document.querySelectorAll(
              'p, h1, h2, h3, h4, h5, h6, pre, blockquote, table, ul, ol'
            )].filter(el => {
              if (el.textContent.trim().length < 25) return false;
              try { if (el.closest(SKIP_PARENT)) return false; } catch {}
              return true;
            });
            const deduped = dedupElements(raw);
            if (deduped.length) return deduped;
          } catch {}

          // 2b. div 文本叶节点兜底（豆包/元宝等 div-only 布局的平台）
          // 找文本内容 ≥50 字符、且自身没有块级子 div 的 div 元素
          try {
            const BLOCK_TAGS = new Set(['DIV','SECTION','ARTICLE','P','UL','OL','TABLE','PRE','BLOCKQUOTE','H1','H2','H3','H4','H5','H6']);
            const raw = [...document.querySelectorAll('div')].filter(el => {
              const txt = el.textContent.trim();
              if (txt.length < 50) return false;
              try { if (el.closest(SKIP_PARENT)) return false; } catch {}
              // 叶节点判断：没有块级子元素（只有内联/文本内容）
              const hasBlockChild = [...el.children].some(c => BLOCK_TAGS.has(c.tagName));
              return !hasBlockChild;
            });
            const deduped = dedupElements(raw);
            if (deduped.length) return deduped;
          } catch {}

          return [];
        }

        function extractBlocks(containers) {
          // 块级标签集合（用于识别 nuclear-fallback 直接返回的块元素）
          const BLOCK_TAGS = new Set(['P','H1','H2','H3','H4','H5','H6','PRE','BLOCKQUOTE','TABLE','UL','OL','FIGURE','HR']);
          const blockSels  = 'p, h1, h2, h3, h4, h5, h6, pre, blockquote, table, ul, ol, hr, figure';
          const blocks = [];
          for (const container of containers) {
            // 如果 container 本身就是块级元素（来自 nuclear fallback），直接使用
            if (BLOCK_TAGS.has(container.tagName)) {
              if (container.textContent.trim().length > 0 || container.querySelector('img'))
                blocks.push(container);
              continue;
            }
            // 否则（来自平台专属路径，container 是消息包装器），查找内部块元素
            const children = container.querySelectorAll(blockSels);
            if (children.length > 0) {
              // 只取最外层（不被同列表其他元素包含）
              const filtered = [...children].filter(el =>
                ![...children].some(other => other !== el && other.contains(el)));
              for (const el of filtered) {
                if (el.textContent.trim().length > 0 || el.querySelector('img'))
                  blocks.push(el);
              }
            } else if (container.textContent.trim().length > 0) {
              blocks.push(container);
            }
          }
          return dedupElements(blocks);
        }

        const containers = collectContentContainers();
        if (!containers.length) {
          const t = document.createElement('div');
          t.textContent = (texts && texts.noContent) || '未找到对话内容';
          Object.assign(t.style, { position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)',
            background:'#333', color:'#fff', padding:'8px 16px', borderRadius:'8px',
            zIndex:'2147483647', fontSize:'13px', pointerEvents:'none' });
          document.body.appendChild(t);
          setTimeout(() => t.remove(), 2500);
          return { ok: false, reason: 'noContent' };
        }

        const rawBlocks = extractBlocks(containers);
        if (!rawBlocks.length) { return { ok: false, reason: 'noBlocks' }; }
        const splitSession = 'sr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        rawBlocks.forEach((el, idx) => {
          if (!el.getAttribute('data-fc-sr-block')) {
            el.setAttribute('data-fc-sr-block', `${splitSession}_${idx}`);
          }
          const role = inferMessageRole(el);
          if (role) el.setAttribute('data-fc-sr-role', role);
        });

        function roleLabel(role) {
          if (role === 'user') return '你';
          if (role === 'assistant') return 'AI';
          return '';
        }

        function createRoleDivider(role) {
          const label = roleLabel(role);
          if (!label) return null;
          const div = document.createElement('div');
          div.textContent = label;
          Object.assign(div.style, {
            margin:'14px 0 7px',
            padding:'0 0 4px',
            borderBottom:'1px solid ' + SEP,
            color: role === 'user' ? (isDark ? '#9ca3af' : '#6b7280') : (isDark ? '#9ca3af' : '#5f6b7a'),
            fontSize:'11px',
            fontWeight:'650',
            lineHeight:'1.2',
            letterSpacing:'0',
            textTransform:'none'
          });
          return div;
        }

        function styleRoleBlock(el, role) {
          if (!role) return;
          el.style.marginTop = '2px';
          el.style.marginBottom = '8px';
          if (role === 'user') {
            el.style.padding = '7px 10px';
            el.style.borderRadius = '8px';
            el.style.background = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)';
            el.style.borderLeft = isDark ? '2px solid rgba(255,255,255,0.18)' : '2px solid rgba(0,0,0,0.16)';
          }
        }

        // ═══════════════════════════════════════════════════
        // 2. 克隆 + 测量高度 → 分页
        // ═══════════════════════════════════════════════════
        let cols = 3, page = 0;
        let pages = []; // pages[i] = array of { clone, height }

        function buildPages() {
          const colWidth = Math.floor((window.innerWidth - PAD * 2 * cols) / cols);
          // 分页时留出底部 spacer 空间，确保最后一行可见
          const colHeight = window.innerHeight - PAD_TOP - PAD - PAD_BOTTOM_EXTRA;
          // 离屏测量容器
          const measure = document.createElement('div');
          Object.assign(measure.style, {
            position:'absolute', left:'-9999px', top:'-9999px', visibility:'hidden',
            width: colWidth + 'px', lineHeight:'1.75', fontSize:'15px',
            fontFamily:'-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
            wordWrap:'break-word', wordBreak:'break-word'
          });
          document.body.appendChild(measure);

          // 克隆并测量
          const measured = [];
          for (const el of rawBlocks) {
            const clone = el.cloneNode(true);
            // 清理内联样式中可能干扰测量的属性
            clone.style.position = 'static';
            clone.style.transform = 'none';
            clone.style.margin = '4px 0';
            clone.style.maxWidth = '100%';
            clone.style.boxSizing = 'border-box';
            styleRoleBlock(clone, clone.getAttribute('data-fc-sr-role') || '');
            // 图片约束
            clone.querySelectorAll('img').forEach(img => {
              img.style.maxWidth = '100%';
              img.style.maxHeight = Math.max(200, colHeight - 100) + 'px';
              img.style.height = 'auto';
            });
            measure.appendChild(clone);
            let h = clone.offsetHeight;
            if (clone.getAttribute('data-fc-sr-role')) h += 26;
            measure.removeChild(clone);
            // 文字高度兜底（Shadow DOM 组件测量可能为 0）
            if (h === 0) {
              const len = el.textContent.trim().length;
              if (len > 0) {
                const charsPerLine = Math.max(15, Math.floor(colWidth / 9));
                h = Math.max(24, Math.ceil(len / charsPerLine) * 26);
              }
            }
            if (h > 0) measured.push({ clone, height: h, role: clone.getAttribute('data-fc-sr-role') || '' });
          }
          measure.remove();

          // 按列高分页：每列填满后换下一列，每 N 列一页
          const columns = [];
          let curCol = [], curH = 0;
          for (const item of measured) {
            if (curH + item.height > colHeight && curCol.length > 0) {
              columns.push(curCol);
              curCol = []; curH = 0;
            }
            curCol.push(item);
            curH += item.height;
          }
          if (curCol.length) columns.push(curCol);

          // 每 N 列一页
          pages = [];
          for (let i = 0; i < columns.length; i += cols) {
            pages.push(columns.slice(i, i + cols));
          }
          page = Math.min(page, Math.max(0, pages.length - 1));
        }

        // ═══════════════════════════════════════════════════
        // 3. UI：全屏覆盖层 + 左上角退出 + 右上角控制栏
        // ═══════════════════════════════════════════════════
        // 清除 html/body 上可能存在的 transform（会导致 position:fixed 不相对视口）
        document.documentElement.style.setProperty('transform', 'none', 'important');
        document.body.style.setProperty('transform', 'none', 'important');
        const overlay = document.createElement('div');
        overlay.id = '__fc_sr_overlay__';
        Object.assign(overlay.style, { position:'fixed', inset:'0',
          background:BG, display:'flex', gap:'0', padding:'0', boxSizing:'border-box',
          zIndex:'2147483646', overflow:'hidden' });

        // ── 通知父页面状态 ──
        function reportState() {
          try {
            (window.__fc_real_parent__ || window.parent).postMessage({
              __fc_type: 'SR_STATE', page, totalPages: pages.length, cols
            }, extOrigin || '*');
          } catch {}
        }

        // ═══════════════════════════════════════════════════
        // 4. 渲染当前页
        // ═══════════════════════════════════════════════════
        function render() {
          overlay.innerHTML = '';
          if (!pages.length) return;
          const curPage = pages[page] || [];

          for (let ci = 0; ci < cols; ci++) {
            const col = document.createElement('div');
            Object.assign(col.style, {
              flex:'1', height:'100%', overflowX:'hidden', overflowY:'auto',
              padding: PAD_TOP + 'px ' + PAD + 'px ' + PAD + 'px ' + PAD + 'px',
              borderLeft: ci > 0 ? '1px solid ' + SEP : 'none',
              fontSize:'15px', lineHeight:'1.75', color: FG, boxSizing:'border-box',
              scrollbarWidth:'none', display:'flex', flexDirection:'column',
              fontFamily:'-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif'
            });
            // 页码小标
            const pgNum = document.createElement('div');
            pgNum.textContent = '#' + (page * cols + ci + 1);
            Object.assign(pgNum.style, {
              position:'absolute', top:'2px', right:'8px',
              fontSize:'11px', color: isDark ? '#555' : '#bbb', pointerEvents:'none'
            });
            col.style.position = 'relative';
            col.appendChild(pgNum);

            const colData = curPage[ci];
            if (colData) {
              let lastRole = '';
              for (const item of colData) {
                const el = item.clone.cloneNode(true);
                const role = item.role || el.getAttribute('data-fc-sr-role') || '';
                if (role && role !== lastRole) {
                  const divider = createRoleDivider(role);
                  if (divider) col.appendChild(divider);
                  lastRole = role;
                }
                el.style.maxWidth = '100%';
                el.style.background = 'transparent';
                styleRoleBlock(el, role);
                col.appendChild(el);
              }
              // 底部留白，确保最后一行可以滚动到可见区域
              const spacer = document.createElement('div');
              spacer.style.cssText = 'min-height:' + PAD_BOTTOM_EXTRA + 'px;flex-shrink:0';
              col.appendChild(spacer);
            } else {
              const empty = document.createElement('div');
              Object.assign(empty.style, { flex:'1', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc' });
              empty.textContent = '—';
              col.appendChild(empty);
            }
            overlay.appendChild(col);
          }

          reportState();
          try { window.__fc_hl_sync__?.repaintAll?.(); } catch {}
        }

        function goPrev() { if (page > 0)              { page--; render(); } }
        function goNext() { if (page < pages.length - 1) { page++; render(); } }

        // 接收父页面的控制命令
        function onCmd(e) {
          if (extOrigin && e.origin !== extOrigin) return;
          if (!e.data || e.data.__fc_type !== 'SR_CMD') return;
          switch (e.data.cmd) {
            case 'goPrev':
            case 'prev': goPrev(); break;
            case 'goNext':
            case 'next': goNext(); break;
            case 'setCols': if (e.data.cols !== cols) { cols = e.data.cols; buildPages(); render(); } break;
            case 'destroy': destroy(); break;
          }
        }
        window.addEventListener('message', onCmd);

        // 键盘：用 capture 阶段拦截，防止被 AI 平台的 React/Angular 吞掉
        function keyHandler(e) {
          if (!window.__fc_sr__) return;
          if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); destroy(); return; }
          if (e.key === 'ArrowLeft'  || e.key === 'PageUp')
            { e.preventDefault(); e.stopImmediatePropagation(); goPrev(); }
          if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey))
            { e.preventDefault(); e.stopImmediatePropagation(); goNext(); }
          if (e.key === ' ' && e.shiftKey)
            { e.preventDefault(); e.stopImmediatePropagation(); goPrev(); }
        }
        _addDocEvt('keydown', keyHandler, { capture: true, passive: false });

        function destroy() {
          overlay.remove();
          try { window.__fc_hl_sync__?.repaintAll?.(); } catch {}
          document.documentElement.style.removeProperty('transform');
          document.body.style.removeProperty('transform');
          window.removeEventListener('message', onCmd);
          _remDocEvt('keydown', keyHandler, { capture: true });
          delete window.__fc_sr__;
          try { (window.__fc_real_parent__ || window.parent).postMessage({ __fc_type: 'SPLIT_READ_EXIT' }, extOrigin || '*'); } catch {}
        }

        // ═══════════════════════════════════════════════════
        // 5. 启动
        // ═══════════════════════════════════════════════════
        buildPages();
        document.body.appendChild(overlay);
        render();

        // 自动获取焦点，让键盘事件立即生效
        overlay.tabIndex = -1;
        overlay.style.outline = 'none';
        overlay.focus();

        // 首次进入提示
        const hint = document.createElement('div');
        hint.id = '__fc_sr_hint__';
        hint.textContent = (texts && texts.keyHint) || '\u2190 \u2192 键翻页    Esc 退出';
        Object.assign(hint.style, {
          position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          background:'rgba(0,0,0,0.7)', color:'#fff', padding:'14px 28px',
          borderRadius:'10px', fontSize:'15px', letterSpacing:'1px',
          zIndex:'2147483647', pointerEvents:'none', transition:'opacity .5s'
        });
        document.body.appendChild(hint);
        setTimeout(() => { hint.style.opacity = '0'; }, 1800);
        setTimeout(() => { hint.remove(); }, 2400);

        window.__fc_sr__ = {
          destroy,
          goPrev,
          goNext,
          setCols(n) { if (n === cols) return; cols = n; buildPages(); render(); }
        };
        return { ok: true, blocks: rawBlocks.length, pages: pages.length };
      },
      args: [location.origin, { noContent: msg('sr_no_content'), keyHint: msg('sr_key_hint') }]
    });
    const splitResult = res?.[0]?.result;
    if (splitResult?.toggled) {
      document.getElementById('fc-sr-mask')?.remove();
      if (window.__fc_sr_restore__) window.__fc_sr_restore__();
      return;
    }
    if (!splitResult?.ok) {
      console.warn('[FlowChat] split read did not start', key, splitResult);
      document.getElementById('fc-sr-mask')?.remove();
      if (window.__fc_sr_restore__) window.__fc_sr_restore__();
      showToast(msg('toast_split_read_fail', [splitResult?.reason || 'no content']));
      return;
    }
    // 移除加载遮罩
    document.getElementById('fc-sr-mask')?.remove();
    // 聚焦 iframe 使键盘事件能到达注入脚本（延迟确保 overlay 已渲染并获焦）
    setTimeout(() => {
      const ifr = document.getElementById(`iframe-${key}`);
      if (ifr) { ifr.focus(); ifr.contentWindow?.focus(); }
    }, 200);
  } catch (err) {
    document.getElementById('fc-sr-mask')?.remove();
    document.getElementById('sr-bar')?.remove();
    document.body.classList.remove('fc-split-read');
    if (!wasFocused && focusedPlatform) exitFocus();
    // 恢复 header 子元素
    const hdr = document.querySelector('.header');
    if (hdr) [...hdr.children].forEach(el => {
      if ('srHidden' in el.dataset) { el.style.display = el.dataset.srHidden; delete el.dataset.srHidden; }
    });
    console.error('[FlowChat] 分列阅读失败:', err);
    showToast(msg('toast_split_read_fail', [err?.message || String(err)]));
  }
}

// ============================================================
// 屏蔽元素（Block Picker）
// ============================================================

// ============================================================
// 选择器配置面板（手动输入 / 拾取 / 测试验证）
// ============================================================

/**
 * 打开选择器配置面板，并滚动定位到指定平台的卡片
 * @param {string} base - basePlatform key，如 'chatgpt'；不传则只打开面板
 */
async function openSelPanel(base) {
  const panel = document.getElementById('sel-panel');
  await renderSelectorConfigList();
  panel.style.display = 'flex';

  if (!base) return;

  // 等 DOM 渲染完再定位并自动聚焦输入框字段
  requestAnimationFrame(() => {
    const card = document.getElementById(`sel-cfg-${base}`);
    if (!card) return;
    // 确保卡片展开
    if (!card.classList.contains('open')) card.classList.add('open');
    // 滚动到卡片
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // 短暂高亮
    card.classList.add('sel-cfg-card--highlight');
    setTimeout(() => card.classList.remove('sel-cfg-card--highlight'), 1800);
    // 自动聚焦到输入框选择器字段，方便用户直接输入或点击拾取
    const inputField = card.querySelector('input.sel-cfg-input[data-type="input"]');
    if (inputField) inputField.focus();
  });
}

/** 渲染选择器配置面板中的平台列表 */
async function renderSelectorConfigList() {
  const container = document.getElementById('sel-cfg-list');
  if (!container) return;

  const stored = await chrome.storage.local.get('flowchat_selectors');
  const allCustom = stored.flowchat_selectors || {};

  // 收集需展示的平台（已启用 basePlatform 去重 + 有配置但未启用的）
  const seen = new Set();
  const platforms = [];
  for (const key of activePlatforms) {
    const base = getBasePlatform(key);
    if (seen.has(base)) continue;
    seen.add(base); platforms.push(base);
  }
  for (const base of Object.keys(allCustom)) {
    if (!seen.has(base) && ALL_PLATFORMS[base]) { seen.add(base); platforms.push(base); }
  }

  // SVG 图标
  const svgPick    = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 2l5 14 2-5 5-2L2 2z"/></svg>';
  const svgPreview = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M1 8s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z"/></svg>';
	  const svgSave    = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 14h-9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h7l3 3v8a1 1 0 0 1-1 1z"/><path d="M10 2v3H6M5 9h6M5 12h4"/></svg>';
	  const svgHlTest  = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v12M2 8h12"/><circle cx="8" cy="8" r="6"/></svg>';
	  const svgExTest  = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l5 14 2-5 5-2L2 2zM9 9l4 4"/></svg>';
	  const svgInspect = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h10v10H3z"/><path d="M6 7h4M6 10h2"/></svg>';
	  const svgExit    = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
	  const svgToggle  = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';

  container.innerHTML = platforms.map(base => {
    const p = ALL_PLATFORMS[base]; if (!p) return '';
    const custom = allCustom[base] || {};
    const def    = DEFAULT_SELECTORS[base] || { input: [], send: [] };
    const hasInput = !!(custom.input || def.input.length);
    const hasSend  = !!(custom.send  || def.send.length);
    const hasStop  = !!custom.stop;
    const count    = (hasInput ? 1 : 0) + (hasSend ? 1 : 0) + (hasStop ? 1 : 0);
    let statusCls, statusTxt;
    if (custom._verified)     { statusCls = 'ok'; statusTxt = msg('status_verified'); }
    else if (count >= 2)      { statusCls = 'partial'; statusTxt = `${count}/3`; }
    else                      { statusCls = 'none'; statusTxt = msg('status_unconfigured'); }
    const inputVal = custom.input || (def.input[0] || '');
    const sendVal  = custom.send  || (def.send[0]  || '');
    const stopVal    = custom.stop    || '';
    const newchatVal = custom.newchat || '';

    function selectorRow(label, type, val, placeholder) {
      return `<div class="sel-cfg-row">
        <span class="sel-cfg-label">${label}</span>
        <input class="sel-cfg-input" data-base="${base}" data-type="${type}" value="${_escAttr(val)}" placeholder="${placeholder}" spellcheck="false">
        <button class="sel-cfg-preview" data-action="sel-preview" data-base="${base}" data-type="${type}" title="${msg('sel_preview_title')}">${svgPreview}</button>
        <button class="sel-cfg-pick" data-action="sel-pick" data-base="${base}" data-type="${type}" title="${msg('sel_pick_title')}">${svgPick} ${msg('sel_pick_btn_text')}</button>
      </div>`;
    }

    return `<div class="sel-cfg-card open${custom._verified ? ' verified' : ''}" data-base="${base}" id="sel-cfg-${base}">
      <div class="sel-cfg-card-head" data-action="toggle-sel-card" data-base="${base}">
        <span class="sel-cfg-card-status ${statusCls}">${statusTxt}</span>
        <span class="sel-cfg-card-name">${p.name}</span>
        <span class="sel-cfg-card-toggle">${svgToggle}</span>
      </div>
      <div class="sel-cfg-card-body">
        ${selectorRow(msg('sel_input_label'), 'input', inputVal, msg('sel_placeholder_input'))}
        ${selectorRow(msg('sel_send_label'), 'send', sendVal, msg('sel_placeholder_send'))}
        ${selectorRow(msg('sel_stop_label'), 'stop', stopVal, msg('sel_placeholder_stop'))}
        ${selectorRow(msg('sel_newchat_label'), 'newchat', newchatVal, msg('sel_placeholder_newchat'))}
	        <div class="sel-cfg-actions">
	          <button class="sel-cfg-btn save" data-action="sel-save" data-base="${base}">${svgSave} ${msg('sel_save_btn')}</button>
	          <button class="sel-cfg-btn item-test" data-action="sel-item-test" data-base="${base}">${svgInspect} ${msg('sel_item_test_btn')}</button>
	          <button class="sel-cfg-btn hl-verify" data-action="sel-hl-verify" data-base="${base}">${svgHlTest} ${msg('sel_hl_verify_btn')}</button>
	          <button class="sel-cfg-btn exec-verify" data-action="sel-exec-verify" data-base="${base}">${svgExTest} ${msg('sel_exec_verify_btn')}</button>
	          <button class="sel-cfg-btn cancel-pick" data-action="sel-cancel-pick" data-base="${base}">${svgExit} ${msg('sel_cancel_pick_btn')}</button>
	        </div>
        <div class="sel-cfg-result" id="sel-result-${base}"></div>
      </div>
    </div>`;
  }).join('');
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function _escAttr(s) { return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/'/g,'&#39;'); }

/** 初始化面板拖拽 */
function initSelPanelDrag() {
  const panel = document.getElementById('sel-panel');
  const handle = document.getElementById('sel-panel-drag');
  if (!panel || !handle) return;
  let dragging = false, startX, startY, origX, origY;
  handle.addEventListener('mousedown', e => {
    if (e.target.closest('.icon-btn')) return; // 不拦截关闭按钮
    dragging = true;
    const rect = panel.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    origX = rect.left; origY = rect.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    const nx = Math.max(0, Math.min(window.innerWidth - 100, origX + dx));
    const ny = Math.max(0, Math.min(window.innerHeight - 40, origY + dy));
    panel.style.left = nx + 'px'; panel.style.top = ny + 'px';
    panel.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => { dragging = false; });
}

/** 保存选择器配置 */
async function saveSelectorConfig(base, { silent = false } = {}) {
  const card = document.getElementById(`sel-cfg-${base}`);
  if (!card) return;
  const inputVal   = card.querySelector('input[data-type="input"]')?.value.trim();
  const sendVal    = card.querySelector('input[data-type="send"]')?.value.trim();
  const stopVal    = card.querySelector('input[data-type="stop"]')?.value.trim();
  const newchatVal = card.querySelector('input[data-type="newchat"]')?.value.trim();
  const stored = await chrome.storage.local.get('flowchat_selectors');
  const all    = stored.flowchat_selectors || {};
  all[base]    = all[base] || {};
  if (inputVal)   all[base].input   = inputVal;   else delete all[base].input;
  if (sendVal)    all[base].send    = sendVal;    else delete all[base].send;
  if (stopVal)    all[base].stop    = stopVal;    else delete all[base].stop;
  if (newchatVal) all[base].newchat = newchatVal; else delete all[base].newchat;
  await chrome.storage.local.set({ flowchat_selectors: all });
  if (!silent) showToast(msg('toast_selector_saved', [ALL_PLATFORMS[base]?.name || base]));
}

/** 启动 Picker 拾取 */
async function startSelectorPick(base, type) {
  const instanceKey = activePlatforms.find(k => getBasePlatform(k) === base);
  if (!instanceKey) { showToast(msg('toast_platform_not_enabled')); return; }
  // 清除其他正在拾取的按钮状态
  document.querySelectorAll('.sel-cfg-pick.active').forEach(b => b.classList.remove('active'));
  const pickBtn = document.querySelector(`[data-action="sel-pick"][data-base="${base}"][data-type="${type}"]`);
  if (pickBtn) pickBtn.classList.add('active');
  pickerState[instanceKey] = { step: type, _selectorConfigMode: true, _base: base };
  await activatePickerInFrame(instanceKey, type);
}

async function cancelSelectorPickForBase(base) {
  const keys = activePlatforms.filter(k => getBasePlatform(k) === base && pickerState[k]?.step && pickerState[k].step !== 'idle');
  if (!keys.length) {
    document.querySelectorAll(`.sel-cfg-pick[data-base="${base}"].active`).forEach(b => b.classList.remove('active'));
    return;
  }
  await Promise.all(keys.map(k => cancelPicker(k)));
}

async function cancelAllSelectorPicks() {
  const keys = activePlatforms.filter(k => pickerState[k]?.step && pickerState[k].step !== 'idle');
  await Promise.all(keys.map(k => cancelPicker(k)));
  document.querySelectorAll('.sel-cfg-pick.active').forEach(b => b.classList.remove('active'));
}

/** Picker 回调 */
async function handleSelectorConfigPick(key, step, selector) {
  const base = pickerState[key]?._base || getBasePlatform(key);
  await saveSelector(base, step, selector);
  const input = document.querySelector(`.sel-cfg-input[data-base="${base}"][data-type="${step}"]`);
  if (input) { input.value = selector; input.classList.add('matched'); setTimeout(() => input.classList.remove('matched'), 2000); }
  const pickBtn = document.querySelector(`[data-action="sel-pick"][data-base="${base}"][data-type="${step}"]`);
  if (pickBtn) pickBtn.classList.remove('active');
  const labelMap = { input: msg('sel_input_label'), send: msg('sel_send_btn_label'), stop: msg('sel_stop_btn_label'), newchat: msg('sel_newchat_btn_label') };
  showToast(msg('toast_selector_pick_saved', [ALL_PLATFORMS[base]?.name || base, labelMap[step] || step]));
}

/** 构造完整候选选择器列表：面板输入的在最前，DEFAULT_SELECTORS 兜底 */
function _buildSelList(base, type, panelVal) {
  const def = DEFAULT_SELECTORS[base] || {};
  const defList = def[type] || [];
  if (panelVal) return [panelVal, ...defList.filter(s => s !== panelVal)];
  return defList;
}

function getSelectorConfigValues(base) {
  const card = document.getElementById(`sel-cfg-${base}`);
  return {
    input:   card?.querySelector('input[data-type="input"]')?.value.trim() || '',
    send:    card?.querySelector('input[data-type="send"]')?.value.trim() || '',
    stop:    card?.querySelector('input[data-type="stop"]')?.value.trim() || '',
    newchat: card?.querySelector('input[data-type="newchat"]')?.value.trim() || '',
  };
}

function renderSelectorItemTestResult(result) {
  const labelMap = {
    input: msg('sel_input_label'),
    send: msg('sel_send_label'),
    stop: msg('sel_stop_label'),
    newchat: msg('sel_newchat_label'),
  };
  const rows = (result.items || []).map(item => {
    let cls = 'fail';
    let state = msg('sel_item_state_missing');
    if (item.status === 'unconfigured') {
      cls = 'muted'; state = msg('sel_item_state_unconfigured');
    } else if (item.status === 'hidden') {
      cls = 'warn'; state = msg('sel_item_state_hidden');
    } else if (item.status === 'disabled') {
      cls = 'warn'; state = msg('sel_item_state_disabled');
    } else if (item.status === 'ok') {
      cls = 'ok'; state = msg('sel_item_state_ok');
    } else if (item.status === 'error') {
      cls = 'fail'; state = item.error || msg('sel_item_state_error');
    }
    const meta = item.status === 'unconfigured'
      ? ''
      : `${escHtml(item.tag || '-')}${item.count != null ? ` · ${msg('sel_item_count_text', [String(item.count), String(item.visibleCount || 0)])}` : ''}`;
    return `<div class="sel-test-row ${cls}">
      <span class="sel-test-name">${escHtml(labelMap[item.type] || item.type)}</span>
      <span class="sel-test-state">${escHtml(state)}</span>
      <span class="sel-test-meta">${meta}</span>
      ${item.selector ? `<code class="sel-test-selector">${escHtml(item.selector)}</code>` : ''}
    </div>`;
  }).join('');
  return `<div class="sel-test-list">${rows}</div>`;
}

function renderSendTraceResult(result) {
  const rows = (result.trace || []).map(item => {
    const cls = item.ok ? 'ok' : 'fail';
    const detail = { ...item };
    delete detail.ts;
    delete detail.ok;
    delete detail.step;
    const text = Object.entries(detail)
      .filter(([, v]) => v !== '' && v != null && !(typeof v === 'object' && !Object.keys(v).length))
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' | ');
    return `<div class="sel-test-row ${cls}">
      <span class="sel-test-name">${escHtml(item.step)}</span>
      <span class="sel-test-state">${item.ok ? escHtml(msg('sel_trace_ok')) : escHtml(msg('sel_trace_fail'))}</span>
      <span class="sel-test-meta">${escHtml(text)}</span>
    </div>`;
  }).join('');
  const summaryCls = result.ok ? 'ok' : 'fail';
  const summaryText = result.ok ? msg('sel_send_ok_text') : (result.error || msg('sel_send_fail_text'));
  return `<div class="sel-test-list">
    <div class="sel-test-row ${summaryCls}">
      <span class="sel-test-name">${escHtml(msg('sel_trace_summary'))}</span>
      <span class="sel-test-state">${result.ok ? escHtml(msg('sel_trace_ok')) : escHtml(msg('sel_trace_fail'))}</span>
      <span class="sel-test-meta">${escHtml(summaryText)}</span>
    </div>
    ${rows}
  </div>`;
}

async function itemTestSelectors(base) {
  const resultEl = document.getElementById(`sel-result-${base}`);
  if (!resultEl) return;
  const instanceKey = activePlatforms.find(k => getBasePlatform(k) === base);
  if (!instanceKey) { resultEl.className = 'sel-cfg-result fail'; resultEl.textContent = msg('sel_platform_not_enabled'); return; }

  await saveSelectorConfig(base, { silent: true });
  const values = getSelectorConfigValues(base);
  const tests = [
    { type: 'input',   selectors: _buildSelList(base, 'input', values.input),   required: true },
    { type: 'send',    selectors: _buildSelList(base, 'send', values.send),     required: true },
    { type: 'stop',    selectors: values.stop ? [values.stop] : [],             required: false },
    { type: 'newchat', selectors: values.newchat ? [values.newchat] : [],       required: false },
  ];

  resultEl.className = 'sel-cfg-result testing';
  resultEl.textContent = msg('sel_item_testing_text');

  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const frame  = _findPickerFrame(instanceKey, frames);
    if (!frame) { resultEl.className = 'sel-cfg-result fail'; resultEl.textContent = msg('sel_no_frame'); return; }

    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frame.frameId] },
      world: 'MAIN',
      func: function inspectSelectorItems(tests) {
        document.querySelectorAll('.__fc_sel_preview__').forEach(el => {
          el.classList.remove('__fc_sel_preview__');
          el.style.removeProperty('outline');
          el.style.removeProperty('outline-offset');
        });
        const colors = { input: '#4285f4', send: '#34c759', stop: '#ff9500', newchat: '#8b5cf6' };
        function isVisible(el) {
          if (!el) return false;
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
          const r = el.getBoundingClientRect();
          return r.width > 1 && r.height > 1;
        }
        function isDisabled(el) {
          return !!(el.disabled
            || el.hasAttribute('disabled')
            || el.getAttribute('aria-disabled') === 'true'
            || el.getAttribute('data-disabled') === 'true'
            || /--disabled|is-disabled|btn-disabled|disabled/i.test(el.className || ''));
        }
        function findClickable(el) {
          let cur = el;
          for (let i = 0; i < 6 && cur && cur !== document.body; i++) {
            const tag = cur.tagName;
            const role = cur.getAttribute('role');
            if (tag === 'BUTTON' || tag === 'A' || role === 'button' || role === 'link' || cur.getAttribute('type') === 'submit') return cur;
            cur = cur.parentElement;
          }
          return el;
        }
        function inspectOne(test) {
          if (!test.selectors?.length) return { type: test.type, status: 'unconfigured' };
          const all = [];
          let firstErr = '';
          for (const selector of test.selectors) {
            try {
              const matches = [...document.querySelectorAll(selector)];
              matches.forEach(el => all.push({ el, selector }));
            } catch (e) {
              if (!firstErr) firstErr = `${selector}: ${e.message}`;
            }
          }
          if (!all.length) return { type: test.type, status: firstErr ? 'error' : 'missing', error: firstErr };
          const visible = all.filter(x => isVisible(x.el));
          const picked = visible[0] || all[0];
          const target = (test.type === 'send' || test.type === 'stop' || test.type === 'newchat')
            ? findClickable(picked.el)
            : picked.el;
          const disabled = isDisabled(target);
          const status = !visible.length ? 'hidden' : disabled ? 'disabled' : 'ok';
          target.style.outline = `3px solid ${colors[test.type] || '#6366f1'}`;
          target.style.outlineOffset = '2px';
          target.classList.add('__fc_sel_preview__');
          return {
            type: test.type,
            status,
            selector: picked.selector,
            tag: target.tagName,
            count: all.length,
            visibleCount: visible.length,
          };
        }
        return { items: tests.map(inspectOne) };
      },
      args: [tests]
    });

    const result = res?.[0]?.result || { items: [] };
    const hasRequiredFail = result.items.some(item =>
      (item.type === 'input' || item.type === 'send') &&
      !['ok', 'disabled'].includes(item.status)
    );
    const sendTrace = await sendToPlatform(instanceKey, 'FlowChat selector item test', null, null, {
      returnTrace: true,
      strictSend: true,
      allowEnterFallback: false,
      afterInputMs: 1200,
    });
    resultEl.className = `sel-cfg-result ${hasRequiredFail || !sendTrace.ok ? 'fail' : 'hl-on'}`;
    resultEl.innerHTML = `${renderSelectorItemTestResult(result)}${renderSendTraceResult(sendTrace)}`;

    const card = document.getElementById(`sel-cfg-${base}`);
    for (const item of result.items || []) {
      const field = card?.querySelector(`input[data-type="${item.type}"]`);
      if (!field) continue;
      field.classList.toggle('matched', item.status === 'ok' || item.status === 'disabled');
      field.classList.toggle('unmatched', ['missing', 'hidden', 'error'].includes(item.status));
    }
  } catch (err) {
    resultEl.className = 'sel-cfg-result fail';
    resultEl.textContent = msg('sel_test_error_text', [err.message]);
  }
}

/** 高亮预览单个选择器：在 iframe 中高亮匹配的元素（支持多候选） */
async function previewSelector(base, type) {
  const card = document.getElementById(`sel-cfg-${base}`);
  const panelVal = card?.querySelector(`input[data-type="${type}"]`)?.value.trim();
  const selList = _buildSelList(base, type, panelVal);
  if (!selList.length) { showToast(msg('toast_fill_selector')); return; }

  const instanceKey = activePlatforms.find(k => getBasePlatform(k) === base);
  if (!instanceKey) { showToast(msg('toast_platform_not_enabled_short')); return; }

  const previewBtn = document.querySelector(`[data-action="sel-preview"][data-base="${base}"][data-type="${type}"]`);
  const isLit = previewBtn?.classList.contains('lit');

  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const frame  = _findPickerFrame(instanceKey, frames);
    if (!frame) { showToast(msg('toast_no_frame')); return; }

    if (isLit) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frame.frameId] }, world: 'MAIN',
        func: () => { document.querySelectorAll('.__fc_sel_preview__').forEach(el => { el.style.removeProperty('outline'); el.style.removeProperty('outline-offset'); el.classList.remove('__fc_sel_preview__'); }); }
      });
      previewBtn?.classList.remove('lit');
    } else {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frame.frameId] }, world: 'MAIN',
        func: () => { document.querySelectorAll('.__fc_sel_preview__').forEach(el => { el.style.removeProperty('outline'); el.style.removeProperty('outline-offset'); el.classList.remove('__fc_sel_preview__'); }); }
      });
      document.querySelectorAll('.sel-cfg-preview.lit').forEach(b => b.classList.remove('lit'));

      const color = type === 'input' ? '#4285f4' : type === 'send' ? '#34c759' : '#ff9500';
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frame.frameId] }, world: 'MAIN',
        func: function highlight(selList, color) {
          for (const sel of selList) {
            try {
              const el = document.querySelector(sel);
              if (el) {
                el.style.outline = `3px solid ${color}`;
                el.style.outlineOffset = '2px';
                el.classList.add('__fc_sel_preview__');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { found: true, tag: el.tagName, matchedSel: sel };
              }
            } catch {}
          }
          return { found: false };
        },
        args: [selList, color]
      });
      const r = res?.[0]?.result;
      if (r?.found) {
        previewBtn?.classList.add('lit');
        // 如果匹配的不是面板中的值，更新面板
        const inputEl = card?.querySelector(`input[data-type="${type}"]`);
        if (inputEl && r.matchedSel !== panelVal) {
          inputEl.value = r.matchedSel;
        }
        const _lbl = { input: '输入框', send: '发送按钮', stop: '完成按钮', newchat: '新对话按钮' };
        showToast(`已高亮 ${_lbl[type] || type} (${r.tag})`);
      } else {
        showToast(`未找到匹配元素（已尝试 ${selList.length} 个候选）`);
      }
    }
  } catch (err) {
    showToast(msg('sel_preview_fail_text', [err.message]));
  }
}

/** 高亮验证：使用多候选选择器列表，同时高亮所有已配置的元素 */
async function highlightVerify(base) {
  const resultEl = document.getElementById(`sel-result-${base}`);
  if (!resultEl) return;
  const instanceKey = activePlatforms.find(k => getBasePlatform(k) === base);
  if (!instanceKey) { resultEl.className = 'sel-cfg-result fail'; resultEl.textContent = msg('sel_platform_not_enabled'); return; }

  const card = document.getElementById(`sel-cfg-${base}`);
  const inputVal = card?.querySelector('input[data-type="input"]')?.value.trim();
  const sendVal  = card?.querySelector('input[data-type="send"]')?.value.trim();
  const stopVal  = card?.querySelector('input[data-type="stop"]')?.value.trim();
  const inputList = _buildSelList(base, 'input', inputVal);
  const sendList  = _buildSelList(base, 'send', sendVal);
  const stopList  = stopVal ? [stopVal] : [];

  if (!inputList.length && !sendList.length) {
    resultEl.className = 'sel-cfg-result fail'; resultEl.textContent = msg('sel_fill_selector_first');
    return;
  }

  resultEl.className = 'sel-cfg-result testing'; resultEl.textContent = msg('sel_testing_text');

  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const frame  = _findPickerFrame(instanceKey, frames);
    if (!frame) { resultEl.className = 'sel-cfg-result fail'; resultEl.textContent = msg('sel_no_frame'); return; }

    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frame.frameId] }, world: 'MAIN',
      func: function hlVerify(inputList, sendList, stopList) {
        document.querySelectorAll('.__fc_sel_preview__').forEach(el => {
          el.style.removeProperty('outline'); el.style.removeProperty('outline-offset');
          el.classList.remove('__fc_sel_preview__');
        });
        function findFirst(list) {
          for (const s of list) { try { const el = document.querySelector(s); if (el) return { el, sel: s }; } catch {} }
          return null;
        }
        function hl(found, color) {
          if (!found) return;
          found.el.style.outline = `3px solid ${color}`;
          found.el.style.outlineOffset = '2px';
          found.el.classList.add('__fc_sel_preview__');
        }
        const inp = findFirst(inputList);
        const snd = findFirst(sendList);
        const stp = findFirst(stopList);
        hl(inp, '#4285f4'); hl(snd, '#34c759'); hl(stp, '#ff9500');
        return {
          input: !!inp, inputTag: inp?.el.tagName || '', inputSel: inp?.sel || '',
          send:  !!snd, sendTag:  snd?.el.tagName || '', sendSel:  snd?.sel || '',
          stop:  !!stp, stopTag:  stp?.el.tagName || '', stopSel:  stp?.sel || ''
        };
      },
      args: [inputList, sendList, stopList]
    });

    const r = res?.[0]?.result || {};
    const parts = [];
    if (inputList.length) parts.push(r.input ? msg('sel_input_found_text', [r.inputTag]) : msg('sel_input_not_found_text'));
    if (sendList.length)  parts.push(r.send  ? msg('sel_send_found_text', [r.sendTag])  : msg('sel_send_not_found_text'));
    else parts.push(msg('sel_send_unconfigured_text'));
    if (stopList.length)  parts.push(r.stop  ? msg('sel_stop_found_text', [r.stopTag])  : msg('sel_stop_not_found_text'));

    // 如果实际匹配的选择器与面板值不同，自动更新面板
    const inputField = card?.querySelector('input[data-type="input"]');
    const sendField  = card?.querySelector('input[data-type="send"]');
    if (r.input && r.inputSel && inputField && inputField.value !== r.inputSel) inputField.value = r.inputSel;
    if (r.send  && r.sendSel  && sendField  && sendField.value  !== r.sendSel)  sendField.value  = r.sendSel;

    if (inputField) { inputField.classList.toggle('matched', r.input); inputField.classList.toggle('unmatched', inputList.length > 0 && !r.input); }
    if (sendField)  { sendField.classList.toggle('matched', r.send);   sendField.classList.toggle('unmatched', sendList.length > 0 && !r.send); }

    const allOk = (inputList.length === 0 || r.input) && (sendList.length === 0 || r.send);
    resultEl.className = `sel-cfg-result ${allOk ? 'hl-on' : 'fail'}`;
    resultEl.textContent = (allOk ? msg('sel_result_hl_prefix') : '') + parts.join(' | ');

    // 5 秒后自动清除
    setTimeout(async () => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [frame.frameId] }, world: 'MAIN',
          func: () => { document.querySelectorAll('.__fc_sel_preview__').forEach(el => { el.style.removeProperty('outline'); el.style.removeProperty('outline-offset'); el.classList.remove('__fc_sel_preview__'); }); }
        });
      } catch {}
    }, 5000);
  } catch (err) {
    resultEl.className = 'sel-cfg-result fail'; resultEl.textContent = msg('sel_test_error_text', [err.message]);
  }
}

/** 执行验证：实际发送测试消息 "hi 你好" */
async function execVerify(base) {
  const resultEl = document.getElementById(`sel-result-${base}`);
  if (!resultEl) return;
  const instanceKey = activePlatforms.find(k => getBasePlatform(k) === base);
  if (!instanceKey) { resultEl.className = 'sel-cfg-result fail'; resultEl.textContent = msg('sel_platform_not_enabled'); return; }

  // 先保存当前面板中的值
  await saveSelectorConfig(base);

  resultEl.className = 'sel-cfg-result testing'; resultEl.textContent = msg('sel_sending_text');

  try {
    const result = await sendToPlatform(instanceKey, 'FlowChat selector test', null, null, {
      returnTrace: true,
      strictSend: true,
      allowEnterFallback: false,
      afterInputMs: 1200,
    });
    if (result.ok) {
      // 标记已验证
      const stored = await chrome.storage.local.get('flowchat_selectors');
      const all = stored.flowchat_selectors || {};
      all[base] = all[base] || {};
      all[base]._verified = true;
      await chrome.storage.local.set({ flowchat_selectors: all });
      // 更新卡片状态
      const cardEl = document.getElementById(`sel-cfg-${base}`);
      cardEl?.classList.add('verified');
      const statusEl = cardEl?.querySelector('.sel-cfg-card-status');
      if (statusEl) { statusEl.className = 'sel-cfg-card-status ok'; statusEl.textContent = msg('sel_verified_text'); }
      resultEl.className = 'sel-cfg-result pass';
      resultEl.innerHTML = renderSendTraceResult(result);
    } else {
      resultEl.className = 'sel-cfg-result fail';
      resultEl.innerHTML = renderSendTraceResult(result);
    }
  } catch (err) {
    resultEl.className = 'sel-cfg-result fail';
    resultEl.textContent = msg('sel_send_error_text', [err.message]);
  }
}

async function startBlockPicker(key) {
  console.log('[FlowChat Block] start picker', { key, base: getBasePlatform(key), frame: platformFrames[key] || null });
  pickerState[key] = { step: 'block' };
  setPickerBanner(key, msg('block_picker_hint'));
  await activatePickerInFrame(key, 'block');
}

function getUnsafeBlockedSelectorReason(selector) {
  const s = String(selector || '').trim();
  if (!s) return 'empty selector';
  if (/^(html|body|main|#root|#app|#__next)$/i.test(s)) return 'root selector';
  if (/^body\s*>/i.test(s) && (s.match(/nth-of-type/g) || []).length >= 2) return 'fragile body path';
  if (s.length > 220 && /^body\s*>/i.test(s)) return 'overlong body path';
  return '';
}

async function pruneUnsafeBlockedElementRules() {
  try {
    const stored = await chrome.storage.local.get('flowchat_blocked_elements');
    const all = stored.flowchat_blocked_elements || {};
    let changed = false;
    const removed = [];
    const next = {};
    for (const [platform, rules] of Object.entries(all)) {
      next[platform] = (Array.isArray(rules) ? rules : []).filter(rule => {
        const reason = getUnsafeBlockedSelectorReason(rule?.selector);
        if (!reason) return true;
        changed = true;
        removed.push({ platform, selector: rule?.selector, reason });
        return false;
      });
    }
    if (changed) {
      await chrome.storage.local.set({ flowchat_blocked_elements: next });
      console.warn('[FlowChat Block] pruned unsafe blocked selectors', removed);
    }
  } catch (e) {
    console.warn('[FlowChat Block] prune unsafe rules failed', e);
  }
}

async function saveBlockedElement(key, selector) {
  try {
    const basePlatform = getBasePlatform(key);
    const unsafeReason = getUnsafeBlockedSelectorReason(selector);
    if (unsafeReason) {
      console.warn('[FlowChat Block] unsafe selector rejected', { key, basePlatform, selector, reason: unsafeReason });
      return { ok: false, reason: unsafeReason };
    }
    console.log('[FlowChat Block] save rule begin', { key, basePlatform, selector });
    const stored = await chrome.storage.local.get('flowchat_blocked_elements');
    const all    = stored.flowchat_blocked_elements || {};
    all[basePlatform] = all[basePlatform] || [];
    if (!all[basePlatform].some(r => r.selector === selector)) {
      all[basePlatform].push({ selector, ts: Date.now() });
    }
    await chrome.storage.local.set({ flowchat_blocked_elements: all });
    console.log('[FlowChat Block] rule stored', {
      basePlatform,
      selector,
      ruleCount: all[basePlatform].length,
      rules: all[basePlatform],
    });

    // 通知所有匹配该平台的 frame（精确 + URL 匹配兜底）
    const tab = await chrome.tabs.getCurrent();
    const framesToNotify = new Map();
    for (const [k, f] of Object.entries(platformFrames)) {
      if (getBasePlatform(k) === basePlatform && f.tabId && f.frameId)
        framesToNotify.set(f.frameId, f);
    }
    if (tab) {
      try {
        const allFrames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
        for (const f of (allFrames || [])) {
          if (f.frameId !== 0 && getPlatformForUrl(f.url) === basePlatform && !framesToNotify.has(f.frameId))
            framesToNotify.set(f.frameId, { tabId: tab.id, frameId: f.frameId });
        }
      } catch {}
    }
    if (framesToNotify.size > 0) {
      const frames = [...framesToNotify.values()];
      console.log('[FlowChat Block] notify frames', { basePlatform, selector, frames });
      const results = await Promise.allSettled(frames.map(frame =>
        chrome.runtime.sendMessage({
          type: 'SEND_TO_IFRAME', tabId: frame.tabId, frameId: frame.frameId,
          payload: { type: 'APPLY_BLOCKED_ELEMENTS' }
        })
      ));
      console.log('[FlowChat Block] notify results', results.map((r, i) => ({
        frame: frames[i],
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : undefined,
        reason: r.status === 'rejected' ? String(r.reason) : undefined,
      })));
    } else {
      console.warn('[FlowChat Block] no frame to notify', { basePlatform, selector, platformFrames: { ...platformFrames } });
    }
    return { ok: true };
  } catch (e) {
    console.warn('[FlowChat] saveBlockedElement 失败:', e);
    return { ok: false, reason: e.message };
  }
}

// ============================================================
// 平台管理
// ============================================================

/**
 * 向 DOM 增量追加一列（不重建现有 iframe，保留所有会话状态）。
 * 在 addPlatform 中替代 renderGrid()，避免全部 iframe reload。
 */
function addColumnToDOM(instanceKey) {
  // 将 HTML 字符串解析为真实 DOM 节点
  const temp = document.createElement('template');
  temp.innerHTML = renderIframeColHTML(instanceKey);
  const newCol = temp.content.firstElementChild;
  if (!newCol) { renderGrid(); return; }

  const track = document.getElementById('carousel-track');
  if (!track) { renderGrid(); return; }
  track.appendChild(newCol);
  applyDisplayMode();
  loadIframe(instanceKey);
}

/**
 * 从 DOM 移除指定列（不重建其余 iframe）。
 * 在 removePlatform 中替代 renderGrid()。
 */
function removeColumnFromDOM(key) {
  const col = document.getElementById(`col-${key}`);
  if (col) col.remove();
  carouselOffset = Math.max(0, Math.min(carouselOffset,
    Math.max(0, activePlatforms.length - Math.min(activePlatforms.length, settings.visibleCols))));
  applyDisplayMode();
}

function addPlatform(platformKey, opts = {}) {
  if (!ALL_PLATFORMS[platformKey]) return null;
  // 生成唯一实例 key：首次添加用原 key，重复添加用 key_2, key_3...
  let instanceKey = platformKey;
  if (activePlatforms.includes(instanceKey)) {
    let n = 2;
    while (activePlatforms.includes(`${platformKey}_${n}`)) n++;
    instanceKey = `${platformKey}_${n}`;
  }
  activePlatforms.push(instanceKey);
  if (opts.transient) transientPlatforms.add(instanceKey);
  // 如果已有自定义排序，把新平台追加到末尾
  if (settings.windowOrder.length > 0) settings.windowOrder.push(instanceKey);
  saveConfig();
  addColumnToDOM(instanceKey);   // 增量添加，不刷新已有 iframe
  renderAddPlatformPopover();
  return instanceKey;
}

function removePlatform(key) {
  // 若正在聚焦该平台，先退出聚焦
  if (focusedPlatform === key) exitFocus();
  activePlatforms = activePlatforms.filter(k => k !== key);
  settings.windowOrder = settings.windowOrder.filter(k => k !== key);
  delete bridgeStatus[key];
  delete pickerState[key];
  delete platformGenerating[key];
  delete _platformGenerationStartedAt[key];
  delete _platformLastActivityAt[key];
  delete platformFrames[key];
  transientPlatforms.delete(key);
  // 清理队列中属于该平台的 pending 条目
  queuedMessages.forEach(item => item._pending?.delete(key));
  queuedMessages = queuedMessages.filter(item => item._pending?.size > 0);
  updateQueueUI();
  if (getBasePlatform(key).startsWith('custom')) {
    const base = getBasePlatform(key);
    // 只有没有其他存活实例时才清理底层自定义平台配置
    const remainingInstances = activePlatforms.filter(k => getBasePlatform(k) === base);
    if (remainingInstances.length === 0) {
      removeCustomPlatform(base).catch(console.warn);
    }
  }
  saveConfig();
  removeColumnFromDOM(key);      // 增量移除，不刷新其他 iframe
  renderAddPlatformPopover();
}

/**
 * 获取指定实例当前 iframe 真实所在 URL（包含用户已导航到的子页面）。
 * 优先用 platformFrames 中存储的 frameId 查询，再兜底搜索同平台所有 frame。
 * 返回 null 则说明 frame 尚未加载任何内容。
 */
async function getCurrentFrameUrl(key) {
  const basePlatform = getBasePlatform(key);
  try {
    const tab    = await chrome.tabs.getCurrent();
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    if (!frames) return null;

    const isReal = url =>
      url &&
      !url.startsWith('about:') &&
      !url.startsWith('chrome-') &&
      url !== 'chrome://newtab/' &&
      getPlatformForUrl(url) === basePlatform &&
      !_isUtilityFrame(url);

    // 优先：用已存储的 frameId 精确查找（bridge 已连接后最准确）
    const knownFrame = platformFrames[key];
    if (knownFrame) {
      const f = frames.find(f => f.frameId === knownFrame.frameId);
      if (f && isReal(f.url)) return f.url;
    }
    // 兜底：按平台 URL 特征搜索（bridge 未连接或 frameId 过期时）
    const candidates = frames
      .filter(f => f.frameId !== 0 && isReal(f.url))
      .sort((a, b) => {
        if (a.parentFrameId === 0 && b.parentFrameId !== 0) return -1;
        if (a.parentFrameId !== 0 && b.parentFrameId === 0) return 1;
        return b.url.length - a.url.length;
      });
    const f = candidates[0];
    if (f && isReal(f.url)) return f.url;
  } catch {}
  return null;
}

async function refreshPlatform(key) {
  // 获取当前页面的真实 URL，刷新到当前页面而非平台主站
  const currentUrl = await getCurrentFrameUrl(key);
  const target = currentUrl || ALL_PLATFORMS[getBasePlatform(key)]?.url;
  if (!target) return;

  const spinner = document.getElementById(`spinner-${key}`);
  bridgeStatus[key] = 'loading';
  updateDot(key, 'loading');
  if (spinner) spinner.style.display = 'flex';

  const old = document.getElementById(`iframe-${key}`);
  if (!old) return;
  const wrapper = old.parentElement;
  const neo = old.cloneNode(false);
  neo.src = 'about:blank';
  wrapper.replaceChild(neo, old);

  let handled = false;
  neo.addEventListener('load', async () => {
    if (!neo.src || neo.src === 'about:blank') return;
    if (handled) return; handled = true;
    setTimeout(() => { if (spinner) spinner.style.display = 'none'; }, 2000);
    await sleep(1800); injectBridgeToIframe(key);
    setTimeout(() => {
      if (bridgeStatus[key] !== 'connected') { bridgeStatus[key] = 'ready'; updateDot(key, 'connected'); }
    }, 12000);
  });
  neo.src = target;
}

/**
 * 将指定平台导航到其新对话首页（不刷新当前页，而是打开平台初始 URL）。
 * 使用 cloneNode(false) 重建 iframe，清除所有旧 load 监听器。
 */
function newChatPlatform(key) {
  const p = ALL_PLATFORMS[getBasePlatform(key)]; if (!p) return;
  const newUrl = p.url;   // 平台首页 = 新对话入口

  const spinner = document.getElementById(`spinner-${key}`);
  bridgeStatus[key] = 'loading';
  markPlatformIdle(key);
  delete platformFrames[key];   // 旧 frame 将失效，等 BRIDGE_READY 重新注册
  updateDot(key, 'loading');
  if (spinner) spinner.style.display = 'flex';

  // 克隆 iframe（干净节点，无残留 load 监听器）
  const old = document.getElementById(`iframe-${key}`);
  if (!old) return;
  const wrapper = old.parentElement;
  const neo = old.cloneNode(false);
  neo.src = 'about:blank';
  wrapper.replaceChild(neo, old);

  let handled = false;
  neo.addEventListener('load', async () => {
    if (!neo.src || neo.src === 'about:blank') return;
    if (handled) return; handled = true;
    setTimeout(() => { if (spinner) spinner.style.display = 'none'; }, 2000);
    await sleep(1800);
    injectBridgeToIframe(key);
    setTimeout(() => {
      if (bridgeStatus[key] !== 'connected') { bridgeStatus[key] = 'ready'; updateDot(key, 'connected'); }
    }, 12000);
  });
  neo.src = newUrl;
}

/**
 * 为所有活跃平台新建对话：各 iframe 导航到平台首页，清空本轮会话状态。
 */
async function newChatAll() {
  if (!confirm(`为全部 ${activePlatforms.length} 个 AI 新建对话？\n当前对话内容将不可恢复。`)) return;

  await autoSaveCurrentGroupBeforeNewChat();

  // 清空当前会话视图，避免新对话继续继承上一轮回复和高亮。
  clearCurrentConversationState();
  activePlatforms.forEach(k => {
    markPlatformIdle(k);
    if (pickerState[k]) { hidePickerBanner(k); delete pickerState[k]; }
  });

  // 分组导航：每组 3 个，组间 1000ms，避免同时大量请求被风控
  activePlatforms.forEach((key, i) => {
    const groupDelay = Math.floor(i / 3) * 1000 + (i % 3) * 200;
    setTimeout(() => newChatPlatform(key), groupDelay);
  });
  scheduleAutoSaveCurrentGroup('after-new-chat', 8000);
  showToast(`已为全部 ${activePlatforms.length} 个 AI 新建对话`);
}

async function openExternal(key) {
  // 打开 iframe 当前所在的子页面（用户实际浏览的页面，非主站）
  const url = await getCurrentFrameUrl(key);
  window.open(url || ALL_PLATFORMS[getBasePlatform(key)]?.url || '', '_blank');
}

/** 通过 bridge 切换平台的侧边栏（Claude 等嵌入模式下自带 toggle 被隐藏的平台） */
async function togglePlatformSidebar(key) {
  const frame = platformFrames[key];
  if (!frame) { showToast(msg('toast_platform_not_connected')); return; }
  try {
    await chrome.runtime.sendMessage({
      type: 'SEND_TO_IFRAME',
      tabId: frame.tabId,
      frameId: frame.frameId,
      payload: { type: 'TOGGLE_SIDEBAR' }
    });
  } catch (e) {
    console.warn('[FlowChat] togglePlatformSidebar 失败:', e);
    showToast(msg('toast_sidebar_fail'));
  }
}

async function saveConfig() {
  const persistentPlatforms = getPersistentPlatforms(activePlatforms).filter(k => ALL_PLATFORMS[getBasePlatform(k)]);
  const persistentSettings = normalizeLayoutSettings(getPersistentSettings(settings, persistentPlatforms), persistentPlatforms);
  await chrome.storage.sync.set({ activePlatforms: persistentPlatforms, settings: persistentSettings });
  await saveActiveLayoutState();
}

async function exportConfig() {
  await saveConfig();
  const sync = await chrome.storage.sync.get(['activePlatforms', 'settings']);
  const local = await chrome.storage.local.get([
    LAYOUTS_KEY,
    CURRENT_LAYOUT_KEY,
    GROUPS_KEY,
    HIGHLIGHTS_KEY,
    GROUP_AUTO_SAVE_KEY,
    SYNTHESIS_KEY,
    CUSTOM_PLATFORM_KEY,
    'flowchat_selectors',
    'flowchat_blocked_elements',
    'flowchat_custom_rule_counter',
  ]);
  const manifest = chrome.runtime.getManifest();
  const payload = {
    app: 'FlowChat',
    schemaVersion: 1,
    exportedAt: Date.now(),
    extensionVersion: manifest.version,
    data: {
      activePlatforms: sync.activePlatforms || [],
      settings: sync.settings || {},
      layouts: local[LAYOUTS_KEY] || [],
      currentLayoutId: local[CURRENT_LAYOUT_KEY] || null,
      groups: local[GROUPS_KEY] || [],
      highlights: local[HIGHLIGHTS_KEY] || [],
      groupAutoSave: local[GROUP_AUTO_SAVE_KEY] !== false,
      synthesis: local[SYNTHESIS_KEY] || null,
      customPlatforms: local[CUSTOM_PLATFORM_KEY] || [],
      customRuleCounter: local.flowchat_custom_rule_counter || null,
      selectors: local.flowchat_selectors || {},
      blockedElements: local.flowchat_blocked_elements || {},
    },
  };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowchat-config-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(msg('toast_config_exported'));
}

async function importConfigFile(file) {
  if (!file) return;
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (e) {
    showToast(msg('toast_config_invalid'));
    return;
  }
  if (payload?.app !== 'FlowChat' || payload?.schemaVersion !== 1 || !payload.data) {
    showToast(msg('toast_config_invalid'));
    return;
  }
  if (!confirm(msg('confirm_import_config'))) return;

  const data = payload.data;
  const localPatch = {
    [LAYOUTS_KEY]: Array.isArray(data.layouts) ? data.layouts : [],
    [CURRENT_LAYOUT_KEY]: data.currentLayoutId || null,
    [GROUPS_KEY]: Array.isArray(data.groups) ? data.groups : [],
    [HIGHLIGHTS_KEY]: Array.isArray(data.highlights) ? data.highlights : [],
    [GROUP_AUTO_SAVE_KEY]: data.groupAutoSave !== false,
    [SYNTHESIS_KEY]: data.synthesis || {},
    [CUSTOM_PLATFORM_KEY]: Array.isArray(data.customPlatforms) ? data.customPlatforms : [],
    flowchat_selectors: data.selectors || {},
    flowchat_blocked_elements: data.blockedElements || {},
  };
  if (data.customRuleCounter) localPatch.flowchat_custom_rule_counter = data.customRuleCounter;

  await chrome.storage.local.set(localPatch);
  activePlatforms = Array.isArray(data.activePlatforms) && data.activePlatforms.length
    ? data.activePlatforms
    : [...DEFAULT_ACTIVE_PLATFORMS];
  settings = { ...getDefaultSettings(), ...(data.settings || {}) };
  await chrome.storage.sync.set({ activePlatforms, settings });

  await loadCustomPlatforms();
  await loadStoredHighlights();
  await ensureLayoutState();
  carouselOffset = 0;
  pendingGroupUrls = {};
  resetLayoutRuntimeState();
  applyBarPosition(settings.barPosition);
  applyBtnLabels(getEffectiveBtnLabels());
  renderGrid();
  renderAddPlatformPopover();
  syncSettingsUI();
  showToast(msg('toast_config_imported'));
  closeSettingsPopover();
}

// ============================================================
// Toast
// ============================================================

function showToast(msg) {
  let el = document.getElementById('fc-toast');
  if (!el) {
    el = document.createElement('div'); el.id = 'fc-toast';
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#1d1d1f;color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity .25s;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent = msg; el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// ============================================================
// 输入框折叠（模块级，sendMessage 也可调用）
// ============================================================

function collapseInput() {
  const inp = document.getElementById('message-input');
  if (!inp) return;
  inp.classList.remove('expanded');
  inp.style.height   = '36px';
  inp.style.top      = '0';
  inp.style.bottom   = 'auto';
  inp.style.overflow = 'hidden';
}

// ============================================================
// 事件绑定
// ============================================================

function bindEvents() {
  // ── 输入框：overlay 展开逻辑 ──
  const inp = document.getElementById('message-input');
  inp.addEventListener('input', () => {
    inp.style.height   = '36px';
    inp.style.overflow = 'hidden';
    const sh = inp.scrollHeight;
    if (sh > 40) {
      inp.classList.add('expanded');
      const maxH = 280;
      inp.style.height   = Math.min(sh, maxH) + 'px';
      inp.style.overflow = sh > maxH ? 'auto' : 'hidden';
      // 底部模式：向上展开
      if (settings.barPosition === 'bottom') {
        inp.style.top    = 'auto';
        inp.style.bottom = '0';
      } else {
        inp.style.top    = '0';
        inp.style.bottom = 'auto';
      }
    } else {
      collapseInput();
    }
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  // 点击外部收起（仅无内容时）
  document.addEventListener('click', e => {
    if (!e.target.closest('.input-inner') && !inp.value.trim()) collapseInput();
  });

  // 发送
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  // ── 文件上传 ──
  const btnUpload = document.getElementById('btn-upload');
  const fileInput = document.getElementById('file-input');
  if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      for (const f of fileInput.files) {
        await addPendingFile(f);
      }
      fileInput.value = '';
    });
  }
  // 粘贴文件（支持同时粘贴多个文件）
  inp.addEventListener('paste', async e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.kind === 'file') {
        try {
          const f = item.getAsFile();
          if (f) files.push(f);
        } catch {}
      }
    }
    if (!files.length) return;
    e.preventDefault();
    await Promise.all(files.map(f => addPendingFile(f)));
  });
  // 拖拽文件
  inp.addEventListener('dragover', e => { e.preventDefault(); });
  inp.addEventListener('drop', async e => {
    const files = e.dataTransfer?.files;
    if (!files || !files.length) return;
    e.preventDefault();
    for (const f of files) {
      await addPendingFile(f);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      upsertAutoSavedCurrentGroup('visibility-hidden').catch(() => {});
    }
  });
  window.addEventListener('pagehide', () => {
    upsertAutoSavedCurrentGroup('pagehide').catch(() => {});
  });

  // 撰写弹窗（可选，HTML 中存在时生效）
  document.getElementById('modal-compose-close')?.addEventListener('click', () => {
    document.getElementById('modal-compose').style.display = 'none';
  });
  document.getElementById('modal-compose')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.target.style.display = 'none';
  });
  document.getElementById('compose-send')?.addEventListener('click', () => {
    const compose = document.getElementById('compose-input');
    const msg = compose?.value.trim();
    if (!msg) return;
    inp.value = msg;
    document.getElementById('modal-compose').style.display = 'none';
    sendMessage();
  });
  document.getElementById('compose-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); document.getElementById('compose-send').click(); }
  });

  // ── Header 翻页导航 ──
  document.getElementById('btn-nav-prev').addEventListener('click', () => {
    if (focusedPlatform) { switchFocus('prev'); return; }
    carouselOffset = Math.round(carouselOffset);
    const av = Math.min(activePlatforms.length, settings.visibleCols);
    carouselOffset = Math.max(0, carouselOffset - av);
    updateCarouselPosition();
    updateHeaderNavBtns();
  });
  document.getElementById('btn-nav-next').addEventListener('click', () => {
    if (focusedPlatform) { switchFocus('next'); return; }
    carouselOffset = Math.round(carouselOffset);
    const av = Math.min(activePlatforms.length, settings.visibleCols);
    carouselOffset = Math.min(activePlatforms.length - av, carouselOffset + av);
    updateCarouselPosition();
    updateHeaderNavBtns();
  });

  // ── 翻页方式开关 ──
  document.getElementById('setting-nav-btn')?.addEventListener('change', e => {
    settings.navBtnEnabled = e.target.checked;
    updateHeaderNavBtns();
    updateCarouselPosition(); // 同步内联 carousel-nav 按钮
    saveConfig();
  });
  document.getElementById('setting-swipe')?.addEventListener('change', e => {
    settings.swipeEnabled = e.target.checked;
    document.body.classList.toggle('swipe-enabled', e.target.checked);
    const snapRow = document.getElementById('toggle-snap-row');
    if (snapRow) snapRow.style.display = e.target.checked ? '' : 'none';
    saveConfig();
  });
  document.getElementById('setting-swipe-snap')?.addEventListener('change', e => {
    settings.swipeSnap = e.target.checked;
    saveConfig();
  });
  document.getElementById('setting-agent-mode')?.addEventListener('change', e => {
    settings.agentMode = e.target.checked;
    applyAgentMode(settings.agentMode);
    saveConfig();
  });
  document.getElementById('setting-btn-labels')?.addEventListener('change', e => {
    if (IS_SIDE_PANEL) {
      sidePanelSettings.showBtnLabels = e.target.checked;
      applyBtnLabels(sidePanelSettings.showBtnLabels);
      chrome.storage.local.set({ [SIDE_PANEL_SETTINGS_KEY]: sidePanelSettings });
    } else {
      settings.showBtnLabels = e.target.checked;
      applyBtnLabels(settings.showBtnLabels);
      saveConfig();
    }
  });
  document.getElementById('setting-highlight-panel-auto-open')?.addEventListener('change', e => {
    settings.highlightPanelAutoOpen = e.target.checked;
    saveConfig();
  });
  // 点击任意空白处关闭 ··· 下拉菜单
  document.addEventListener('click', e => {
    if (e.target.closest('[data-action="col-more"]')) return;
    if (e.target.closest('.ca-menu-item')) return;
    if (e.target.closest('#btn-side-header-more') || e.target.closest('#side-header-menu')) return;
    closeAllMoreMenus();
    closeSideHeaderMenu();
  });
  document.getElementById('btn-side-header-more')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleSideHeaderMenu();
  });
  document.getElementById('side-header-menu')?.addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.target.closest('[data-side-action]');
    if (!btn) return;
    handleSideHeaderAction(btn.dataset.sideAction);
  });
  document.getElementById('btn-open-dev-panel-settings')?.addEventListener('click', () => {
    closeSettingsPopover();
    const btn = document.getElementById('btn-dev-mode');
    if (btn) btn.click();
  });
  document.getElementById('btn-export-config')?.addEventListener('click', exportConfig);
  document.getElementById('btn-import-config')?.addEventListener('click', () => {
    document.getElementById('config-import-file')?.click();
  });
  document.getElementById('config-import-file')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await importConfigFile(file);
  });

  // 全部新建对话
  document.getElementById('btn-new-chat-all').addEventListener('click', newChatAll);

  // ── 会话组浮窗 ──
  document.getElementById('btn-groups').addEventListener('click', e => {
    e.stopPropagation();
    const pop = document.getElementById('popover-groups');
    if (pop.style.display === 'none' || !pop.style.display) {
      closeAddPlatformPopover(); closeSettingsPopover(); closeHistoryPopover();
      openGroupsPopover();
    } else {
      closeGroupsPopover();
    }
  });
  document.getElementById('btn-history')?.addEventListener('click', e => {
    e.stopPropagation();
    const pop = document.getElementById('popover-history');
    if (pop.style.display === 'none' || !pop.style.display) {
      closeAddPlatformPopover(); closeSettingsPopover(); closeGroupsPopover();
      openHistoryPopover();
    } else {
      closeHistoryPopover();
    }
  });
  document.getElementById('popover-groups-close').addEventListener('click', closeGroupsPopover);
  document.getElementById('popover-history-close')?.addEventListener('click', closeHistoryPopover);
  document.getElementById('btn-save-layout')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('layout-name-input');
    const layout = await saveCurrentLayout(nameInput?.value || '');
    if (nameInput) nameInput.value = '';
    renderLayoutsList();
    showToast(msg('toast_layout_saved', [layout.name]));
  });
  document.getElementById('btn-new-layout')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-new-layout');
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;
    const nameInput = document.getElementById('layout-name-input');
    try {
      const layout = await createLayout(nameInput?.value || '');
      if (nameInput) nameInput.value = '';
      renderLayoutsList();
      showToast(msg('toast_layout_created', [layout.name]));
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  document.getElementById('layout-name-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-new-layout')?.click();
  });
  document.getElementById('layouts-list')?.addEventListener('click', async e => {
    if (e.target.closest('.layout-name-edit')) return;
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'switch-layout') {
      const layout = await switchToLayout(btn.dataset.id);
      if (!layout) return;
      renderLayoutsList();
      showToast(msg('toast_layout_switched', [layout.name]));
    }
    if (btn.dataset.action === 'delete-layout') await deleteLayout(btn.dataset.id);
  });
  document.getElementById('layouts-list')?.addEventListener('change', async e => {
    const input = e.target.closest('.layout-name-edit');
    if (!input) return;
    await renameLayout(input.dataset.id, input.value);
  });
  document.getElementById('btn-save-group').addEventListener('click', async () => {
    const nameInput = document.getElementById('group-name-input');
    const group = await saveCurrentGroup(nameInput.value);
    nameInput.value = '';
    renderGroupsPopover();
    showToast(`已保存"${group.name}"`);
  });
  document.getElementById('group-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-save-group').click();
  });
  document.getElementById('group-auto-save').addEventListener('change', async e => {
    groupAutoSave = e.target.checked;
    await chrome.storage.local.set({ [GROUP_AUTO_SAVE_KEY]: groupAutoSave });
    if (groupAutoSave) scheduleAutoSaveCurrentGroup('autosave-enabled', 800);
  });
  document.getElementById('groups-list').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const stored = await chrome.storage.local.get(GROUPS_KEY);
    const groups = stored[GROUPS_KEY] || [];
    const group  = groups.find(g => g.id === btn.dataset.id);
    if (!group) return;
    if (btn.dataset.action === 'restore-group') await restoreGroup(group);
    if (btn.dataset.action === 'delete-group')  await deleteGroup(btn.dataset.id);
  });

  // 添加 AI 浮窗
  document.getElementById('btn-add-platform').addEventListener('click', e => {
    e.stopPropagation();
    const popover = document.getElementById('popover-add');
    if (popover.style.display === 'none' || !popover.style.display) {
      closeSettingsPopover();
      openAddPlatformPopover();
    } else {
      closeAddPlatformPopover();
    }
  });
  document.getElementById('popover-add-close').addEventListener('click', closeAddPlatformPopover);

  document.getElementById('cpf-back-btn').addEventListener('click', hideCustomPlatformForm);

  document.getElementById('cpf-confirm').addEventListener('click', async () => {
    const nameVal = document.getElementById('cpf-name').value.trim();
    const urlVal  = document.getElementById('cpf-url').value.trim();
    const errEl   = document.getElementById('cpf-error');
    errEl.textContent = '';

    let parsedUrl;
    try {
      parsedUrl = new URL(urlVal);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') throw new Error();
    } catch {
      errEl.textContent = msg('custom_platform_url_invalid');
      return;
    }

    document.getElementById('cpf-confirm').disabled = true;
    try {
      const origin = parsedUrl.origin + '/*';
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) {
        errEl.textContent = msg('custom_platform_permission_denied');
        return;
      }
      await addCustomPlatform({ name: nameVal || parsedUrl.hostname, url: urlVal });
      hideCustomPlatformForm();
      closeAddPlatformPopover();
    } catch (e) {
      errEl.textContent = e.message;
    } finally {
      document.getElementById('cpf-confirm').disabled = false;
    }
  });

  // 设置浮窗
  document.getElementById('btn-settings').addEventListener('click', e => {
    e.stopPropagation();
    const popover = document.getElementById('popover-settings');
    if (popover.style.display === 'none' || !popover.style.display) {
      closeAddPlatformPopover();
      openSettingsPopover();
    } else {
      closeSettingsPopover();
    }
  });
  document.getElementById('popover-settings-close').addEventListener('click', closeSettingsPopover);

  // 更新日志弹窗
  const _changelogPopup = document.getElementById('changelog-popup');
  const _changelogBtn   = document.getElementById('btn-changelog');
  const _changelogDot   = document.getElementById('fc-version-dot');
  const _changelogBody  = document.getElementById('fc-cl-body');

  // 内嵌兜底数据（fetch 失败且 storage 为空时使用）
  const BUNDLED_CHANGELOG = [
    { version:'v1.2', date:'2026-07', badge:'最新', groups:[
      { title:'新功能', items:[
        { type:'feat', text:'布局分组：可保存多套独立 AI 工作台，例如 10 AI 发散、5 AI 常规、2 AI 精准模式' },
        { type:'feat', text:'布局与会话历史拆分为独立入口，布局管理和历史恢复互不干扰' },
        { type:'feat', text:'布局会独立保存平台组合、实例顺序、每屏列数、显示模式和控制栏位置' },
        { type:'feat', text:'选择器配置支持逐项实测，可真实写入测试内容并触发发送' },
        { type:'feat', text:'发送链路新增 trace 日志，覆盖 tab、frame、选择器、输入写入和发送按钮点击' },
      ]},
      { title:'交互优化', items:[
        { type:'ui', text:'新建布局后列表立即反馈，并防止重复点击导致重复创建' },
        { type:'ui', text:'移除当前布局的重复状态按钮，保留单一「当前」标签' },
        { type:'ui', text:'优化顶部布局 / 会话历史按钮的图标与文字对齐' },
      ]},
      { title:'修复', items:[
        { type:'fix', text:'修复布局切换时目标布局被当前布局覆盖，导致 3 AI / 5 AI 互切不生效的问题' },
        { type:'fix', text:'修复 Kimi 新域名 www.kimi.com 缺少访问权限导致无法注入的问题' },
        { type:'fix', text:'修复 Gemini 误选工具 iframe、选中外层容器后无法写入真实编辑器的问题' },
        { type:'fix', text:'修复 Kimi Lexical 编辑器在顶部输入框发送时内容被输入两遍的问题' },
      ]},
    ]},
    { version:'v1.1', date:'2026-04', badge:'', groups:[
      { title:'新功能', items:[
        { type:'feat', text:'全平台开放 FlowRead 分列阅读，长回复可多列排版、翻页阅读' },
        { type:'feat', text:'融合生成入口升级：支持全量回复总结和高亮内容总结' },
        { type:'feat', text:'融合目标可指定任意已启用 AI，并自动新建独立对话承接融合结果' },
        { type:'feat', text:'自定义平台入口：支持用户添加未内置的 AI 网页渠道' },
      ]},
      { title:'优化', items:[
        { type:'perf', text:'AI 流式输出监听增加节流和文本缓存，降低长回复时的页面卡顿' },
        { type:'ui', text:'聚焦模式补齐列操作按钮，聚焦后仍可刷新、外链、Picker、屏蔽元素' },
        { type:'fix', text:'修复分列阅读退出、切换聚焦平台、frameId 丢失等边界问题' },
      ]},
    ]},
    { version:'v1.0', date:'2026-04', badge:'稳定', groups:[
      { title:'发布', items:[
        { type:'feat', text:'正式发布 Chrome / Edge 扩展版本，主界面支持 19 个 AI 平台同屏工作' },
        { type:'feat', text:'国际化支持：中英文界面自动匹配浏览器和系统语言' },
        { type:'feat', text:'导出功能：支持导出全部回复和高亮内容为 Markdown' },
        { type:'feat', text:'会话历史：保存 / 恢复多 AI 窗口组合和实际对话 URL' },
      ]},
      { title:'修复', items:[
        { type:'fix', text:'修复 Gemini、Kimi 等 SPA 平台首次发送时输入框尚未渲染的问题' },
        { type:'fix', text:'修复 React / Lexical / Quill 等受控编辑器的自动输入与发送兼容性' },
      ]},
    ]},
    { version:'v0.9', date:'2026-02', badge:'', groups:[
      { title:'新功能', items:[
        { type:'feat', text:'高亮标注系统：划选 AI 回复，标记采纳 / 参考 / 拒绝 / 批注' },
        { type:'feat', text:'高亮面板：集中查看跨平台标注内容，并作为融合生成输入' },
        { type:'feat', text:'Synthesis 融合引擎：将高亮和全量回复整理成 Prompt 发送给目标 AI' },
        { type:'feat', text:'Picker 选择器：可视化选择输入框、发送按钮、完成按钮和屏蔽元素' },
      ]},
      { title:'修复', items:[
        { type:'fix', text:'修复 contentEditable 输入、发送按钮禁用 class、Quill paste 返回值等兼容问题' },
      ]},
    ]},
    { version:'v0.8', date:'2025-12', badge:'', groups:[
      { title:'新功能', items:[
        { type:'feat', text:'多实例支持：同一 AI 平台可同时打开多个独立实例' },
        { type:'feat', text:'Carousel / Grid 双布局：支持固定列数翻页或全部窗口网格展示' },
        { type:'feat', text:'聚焦模式：单个 AI 窗口全屏放大，并支持左右切换平台' },
        { type:'feat', text:'消息队列：平台生成中自动排队，完成后继续发送下一条' },
      ]},
      { title:'优化', items:[
        { type:'perf', text:'窗口排序改用 CSS order，避免移动 iframe DOM 导致对话重载' },
        { type:'ui', text:'顶部翻页按钮、触控板横向滑动、队列抽屉等核心交互成型' },
      ]},
    ]},
    { version:'v0.7', date:'2025-10', badge:'', groups:[
      { title:'初始发布', items:[
        { type:'feat', text:'多 AI 同屏聊天原型：支持 Claude、ChatGPT、Gemini、Grok、豆包、Kimi、DeepSeek 等平台' },
        { type:'feat', text:'一键同发：在多个 AI 窗口同时发送同一条消息' },
        { type:'feat', text:'Service Worker bridge 注入：监听 AI 回复、生成状态和 iframe 通信' },
        { type:'feat', text:'通过 declarativeNetRequest 移除 X-Frame-Options / CSP 响应头，实现 iframe 嵌入' },
      ]},
    ]},
  ];

  const TYPE_LABEL = { feat:'Feat', fix:'Fix', ui:'UI', perf:'Perf' };
  const TYPE_CLASS = { feat:'chip-feat', fix:'chip-fix', ui:'chip-ui', perf:'chip-perf' };
  const LATEST_CHANGELOG_VERSION = BUNDLED_CHANGELOG[0]?.version || '';

  function _getFreshChangelog(data) {
    const valid = Array.isArray(data) && data.length && data[0]?.version === LATEST_CHANGELOG_VERSION;
    return valid ? data : BUNDLED_CHANGELOG;
  }

  function _renderChangelogBody(data) {
    if (!_changelogBody) return;
    const items = _getFreshChangelog(data);
    _changelogBody.innerHTML = items.map(entry => {
      const badgeHtml = entry.badge
        ? `<div class="fc-cl-version-head"><span class="fc-cl-badge">${escHtml(entry.version)}</span><span class="fc-cl-badge fc-cl-badge-new">${escHtml(entry.badge)}</span><span class="fc-cl-date">${escHtml(entry.date || '')}</span></div>`
        : `<div class="fc-cl-version-head"><span class="fc-cl-badge">${escHtml(entry.version)}</span><span class="fc-cl-date">${escHtml(entry.date || '')}</span></div>`;
      const groupsHtml = (entry.groups || []).map(g => {
        const liHtml = (g.items || []).map(it => {
          const t = it.type || 'feat';
          const chipClass = TYPE_CLASS[t] || 'chip-feat';
          const chipLabel = TYPE_LABEL[t] || t;
          return `<li><span class="chip ${chipClass}">${chipLabel}</span>${escHtml(it.text)}</li>`;
        }).join('');
        return `<ul class="fc-cl-list">${liHtml}</ul>`;
      }).join('');
      return `<div class="fc-cl-item">${badgeHtml}${groupsHtml}</div>`;
    }).join('');
  }

  function _setChangelogUnreadDot(show) {
    if (_changelogDot) _changelogDot.hidden = !show;
  }

  async function _initChangelog() {
    const { changelog_cache, changelog_unread } = await chrome.storage.local.get(
      ['changelog_cache', 'changelog_unread']
    );
    const data = _getFreshChangelog(changelog_cache);
    const refreshed = data === BUNDLED_CHANGELOG && changelog_cache?.[0]?.version !== LATEST_CHANGELOG_VERSION;
    _renderChangelogBody(data);
    if (refreshed) {
      await chrome.storage.local.set({ changelog_cache: BUNDLED_CHANGELOG, changelog_unread: true });
    }
    _setChangelogUnreadDot(refreshed || !!changelog_unread);
  }
  _initChangelog();

  async function openChangelogPopup() {
    // 重新从 storage 渲染最新数据
    const { changelog_cache } = await chrome.storage.local.get('changelog_cache');
    const data = _getFreshChangelog(changelog_cache);
    _renderChangelogBody(data);
    _changelogPopup.hidden = false;
    _changelogBtn.setAttribute('aria-expanded', 'true');
    // 标记已读
    const latest = data[0]?.version || '';
    await chrome.storage.local.set({ changelog_cache: data, changelog_last_seen: latest, changelog_unread: false });
    _setChangelogUnreadDot(false);
  }
  function closeChangelogPopup() {
    _changelogPopup.hidden = true;
    _changelogBtn.removeAttribute('aria-expanded');
  }
  _changelogBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (_changelogPopup.hidden) {
      closeAddPlatformPopover();
      closeSettingsPopover();
      openChangelogPopup();
    } else {
      closeChangelogPopup();
    }
  });

  // 选择器配置面板入口
  document.getElementById('btn-open-selectors').addEventListener('click', async () => {
    closeSettingsPopover();
    await openSelPanel();
  });

  // 选择器配置面板关闭
  document.getElementById('sel-panel-close').addEventListener('click', async () => {
    await cancelAllSelectorPicks();
    document.getElementById('sel-panel').style.display = 'none';
  });

  // 面板拖拽
  initSelPanelDrag();

  // 面板内事件委托
  document.getElementById('sel-cfg-list').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, base, type } = btn.dataset;
    switch (action) {
      case 'toggle-sel-card':
        document.getElementById(`sel-cfg-${base}`)?.classList.toggle('open');
        break;
      case 'sel-pick':
        await startSelectorPick(base, type);
        break;
      case 'sel-preview':
        await previewSelector(base, type);
        break;
      case 'sel-save':
        await saveSelectorConfig(base);
        break;
      case 'sel-item-test':
        await itemTestSelectors(base);
        break;
      case 'sel-hl-verify':
        await highlightVerify(base);
        break;
      case 'sel-exec-verify':
        await execVerify(base);
        break;
      case 'sel-cancel-pick':
        await cancelSelectorPickForBase(base);
        break;
    }
  });

  // 点击浮窗外关闭
  document.addEventListener('click', e => {
    const popovers = [
      { id: 'popover-add',       btnId: 'btn-add-platform',  close: closeAddPlatformPopover },
      { id: 'popover-settings',  btnId: 'btn-settings',       close: closeSettingsPopover },
      { id: 'popover-groups',    btnId: 'btn-groups',              close: closeGroupsPopover },
      { id: 'popover-history',   btnId: 'btn-history',             close: closeHistoryPopover },
      { id: 'popover-synthesis', btnId: 'btn-synthesis-settings', close: closeSynthesisPopover },
      { id: 'popover-synthesis-all', btnId: 'btn-synthesis-all',  close: closeSynthesisAllPopup },
      { id: 'sel-panel',          btnId: null,                      close: () => {} },
      { id: 'changelog-popup',    btnId: 'btn-changelog',           close: closeChangelogPopup },
    ];
    popovers.forEach(({ id, btnId, close }) => {
      const pop = document.getElementById(id);
      if (pop && pop.style.display !== 'none' && !pop.hidden &&
          !pop.contains(e.target) &&
          e.target !== document.getElementById(btnId) &&
          !document.getElementById(btnId)?.contains(e.target)) {
        close();
      }
    });
  });
  document.querySelectorAll('[data-set-cols]').forEach(b => {
    b.addEventListener('click', () => {
      settings.visibleCols = parseInt(b.dataset.setCols);
      document.querySelectorAll('[data-set-cols]').forEach(x => x.classList.toggle('active', x === b));
      carouselOffset = 0; applyDisplayMode(); saveConfig();
    });
  });
  document.querySelectorAll('[name="displayMode"]').forEach(r => {
    r.addEventListener('change', () => {
      settings.displayMode = r.value;
      carouselOffset = 0; applyDisplayMode(); saveConfig();
    });
  });
  document.querySelectorAll('[name="barPosition"]').forEach(r => {
    r.addEventListener('change', () => {
      settings.barPosition = r.value;
      applyBarPosition(r.value);
      saveConfig();
    });
  });

  // ── 聚焦模式 ──
  document.getElementById('btn-focus-exit').addEventListener('click', exitFocus);
  document.getElementById('btn-focus-exit-top')?.addEventListener('click', exitFocus);
  document.getElementById('btn-focus-prev').addEventListener('click', () => switchFocus('prev'));
  document.getElementById('btn-focus-next').addEventListener('click', () => switchFocus('next'));
  // Esc 退出：分列阅读优先，否则退出聚焦
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (document.body.classList.contains('fc-split-read')) {
        // 双通道通知 iframe 退出分列阅读
        const srKey = focusedPlatform;
        const srIframe = srKey && document.getElementById(`iframe-${srKey}`);
        const _destroyOrigin = (() => { try { return new URL(ALL_PLATFORMS[getBasePlatform(srKey)].url).origin; } catch { return '*'; } })();
        try { srIframe?.contentWindow?.postMessage({ __fc_type: 'SR_CMD', cmd: 'destroy' }, _destroyOrigin); } catch {}
        const srFrame = srKey && platformFrames[srKey];
        if (srFrame) {
          chrome.tabs.getCurrent().then(t => {
            chrome.scripting.executeScript({
              target: { tabId: t.id, frameIds: [srFrame.frameId] },
              world: 'MAIN',
              func: () => { window.__fc_sr__?.destroy?.(); }
            }).catch(() => {});
          });
        }
      } else if (focusedPlatform) {
        exitFocus();
      }
    }
  });

  // 重置排序（合并在 popover-add 面板内）
  document.getElementById('btn-reset-order').addEventListener('click', () => {
    settings.windowOrder = [];
    activePlatforms.forEach(k => {
      const col = document.getElementById(`col-${k}`);
      if (col) col.style.order = '';
    });
    saveConfig();
    renderAddPlatformPopover();
  });

  // 高亮面板
  document.getElementById('btn-toggle-panel').addEventListener('click', toggleHighlightPanel);
  document.getElementById('btn-close-panel').addEventListener('click', () => closeHighlightPanel({ manual: true }));
  document.getElementById('btn-clear-highlights').addEventListener('click', () => {
    if (highlights.length && confirm(`清除全部 ${highlights.length} 条高亮？`)) {
      clearAllHighlights();
    }
  });
  // 顶栏全量融合按钮
  document.getElementById('btn-synthesis-all').addEventListener('click', e => {
    e.stopPropagation();
    const pop = document.getElementById('popover-synthesis-all');
    if (pop.style.display !== 'none') { closeSynthesisAllPopup(); return; }
    openSynthesisAllPopup();
  });
  document.getElementById('popover-synthesis-all-close').addEventListener('click', closeSynthesisAllPopup);
  document.getElementById('btn-synthesis-all-go').addEventListener('click', doSynthesisAll);

  document.getElementById('btn-export-all').addEventListener('click', exportAllReplies);
  document.getElementById('btn-export-highlights').addEventListener('click', exportHighlights);
  document.getElementById('btn-synthesis').addEventListener('click', doSynthesis);
  document.getElementById('btn-synthesis-settings').addEventListener('click', e => {
    e.stopPropagation();
    const pop = document.getElementById('popover-synthesis');
    if (pop.style.display !== 'none') { closeSynthesisPopover(); return; }
    openSynthesisPopover();
  });
  document.getElementById('popover-synthesis-close').addEventListener('click', closeSynthesisPopover);
  document.getElementById('btn-synthesis-settings-save').addEventListener('click', async () => {
    const promptAll      = document.getElementById('synthesis-prompt-all').value.trim();
    const promptHl       = document.getElementById('synthesis-prompt-hl').value.trim();
    const autoFocusSplit = !!document.getElementById('setting-synthesis-auto-focus-split')?.checked;
    await chrome.storage.local.set({ [SYNTHESIS_KEY]: { promptAll, promptHl, autoFocusSplit } });
    showToast(msg('toast_synthesis_saved'));
    closeSynthesisPopover();
  });

  // 高亮面板：删除条目（事件委托）
  document.getElementById('hl-groups').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="remove-highlight"]');
    if (btn) removeHighlight(btn.dataset.id);
  });

  // 消息队列：全部取消
  document.getElementById('btn-queue-clear-all')?.addEventListener('click', () => {
    queuedMessages = [];
    updateQueueUI();
  });

  // 消息队列：单条取消（事件委托）
  document.getElementById('queue-list')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="queue-cancel"]');
    if (btn) cancelQueueItem(btn.dataset.id);
  });

  // queue-badge 点击切换抽屉（可选：点 badge 收起/展开抽屉）
  document.getElementById('queue-badge')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('queue-drawer')?.classList.toggle('visible');
  });

  // grid 按钮（事件委托）
  document.getElementById('grid-container').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.classList.contains('ca-menu-item')) closeAllMoreMenus();
    const { action, key } = btn.dataset;
    switch (action) {
      case 'focus':         focusedPlatform ? exitFocus() : enterFocus(key); break;
      case 'picker':        openSelPanel(getBasePlatform(key)); break;
      case 'split-read':   startSplitRead(key);  break;
      case 'block-picker':  startBlockPicker(key); break;
      case 'download':      downloadSingleReply(key); break;
      case 'refresh':       refreshPlatform(key);  break;
      case 'external':      openExternal(key);     break;
      case 'remove':        removePlatform(key);   break;
      case 'toggle-sidebar': togglePlatformSidebar(key); break;
      case 'cancel-picker': cancelPicker(key);     break;
      case 'col-more':      toggleMoreMenu(btn);   break;
      case 'carousel-prev': {
        if (focusedPlatform) { switchFocus('prev'); break; }
        carouselOffset = Math.round(carouselOffset);
        const av = Math.min(activePlatforms.length, settings.visibleCols);
        carouselOffset = Math.max(0, carouselOffset - av);
        updateCarouselPosition(); break;
      }
      case 'carousel-next': {
        if (focusedPlatform) { switchFocus('next'); break; }
        carouselOffset = Math.round(carouselOffset);
        const av2 = Math.min(activePlatforms.length, settings.visibleCols);
        carouselOffset = Math.min(activePlatforms.length - av2, carouselOffset + av2);
        updateCarouselPosition(); break;
      }
    }
  });
}

// ============================================================
// 启动
// ============================================================

document.addEventListener('DOMContentLoaded', init);

// ============================================================
// FlowChat API — AI-Friendly 编程接口
// 通过 Chrome DevTools Protocol 或 MCP chrome-devtools 调用
// 需在设置中开启「连接编程智能体」才可使用
// ============================================================

/** 应用 agentMode 设置：开启时暴露完整 API，关闭时用桩替换防止误调用 */
function applyAgentMode(enabled) {
  // 顶部按钮始终隐藏，开发者面板入口收归设置面板
  if (!enabled && _devPanelOpen) closeDevPanel();
  // 设置面板内联开发者区域
  const inlineEl = document.getElementById('dev-agent-inline');
  if (inlineEl) inlineEl.classList.toggle('visible', enabled);
  if (enabled) {
    const statusEl = document.getElementById('dev-agent-status-text');
    if (statusEl) {
      const connected = activePlatforms.filter(k => bridgeStatus[k] === 'connected').length;
      statusEl.textContent = `${connected} / ${activePlatforms.length} 个平台已连接`;
    }
  }

  if (enabled) {
    // 恢复完整 API（如已替换过则重新赋值）
    if (!window.FlowChatAPI._active) {
      Object.assign(window.FlowChatAPI, _flowChatAPIImpl);
      window.FlowChatAPI._active = true;
    }
  } else {
    // 替换为友好提示桩（不直接删除，防止外部代码 crash）
    const warn = (name) => () => {
      throw new Error(`[FlowChatAPI] "${name}" 不可用：请先在 FlowChat 设置中开启「连接编程智能体」`);
    };
    ['getPlatforms','getStatus','getResponses','getConversationLog','sendMessage','waitForCompletion','ask'].forEach(m => {
      window.FlowChatAPI[m] = warn(m);
    });
    window.FlowChatAPI._active = false;
  }
}

/** FlowChatAPI 完整实现（agentMode 开启时注入） */
const _flowChatAPIImpl = {

  version: '1.0.0',

  /** 获取所有活跃平台列表 */
  getPlatforms() {
    return activePlatforms.map(k => ({
      key: k,
      name: ALL_PLATFORMS[getBasePlatform(k)]?.name || k,
      url:  ALL_PLATFORMS[getBasePlatform(k)]?.url  || '',
    }));
  },

  /** 获取所有平台实时状态 */
  getStatus() {
    const result = {};
    for (const k of activePlatforms) {
      result[k] = {
        name:        ALL_PLATFORMS[getBasePlatform(k)]?.name || k,
        connected:   bridgeStatus[k] === 'connected',
        generating:  !!platformGenerating[k],
        hasResponse: !!replyStore[k],
        queued:      queuedMessages.filter(q => q._pending?.has(k)).length,
      };
    }
    return result;
  },

  /** 获取所有平台的最新回复（仅已完成的平台） */
  getResponses() {
    const result = {};
    for (const k of activePlatforms) {
      if (replyStore[k]) {
        result[k] = {
          name: ALL_PLATFORMS[getBasePlatform(k)]?.name || k,
          text: replyStore[k].text,
          ts:   replyStore[k].ts,
        };
      }
    }
    return result;
  },

  /** 获取完整对话历史 */
  getConversationLog() {
    return conversationLog.map(r => ({
      id:       r.id,
      question: r.question,
      ts:       r.ts,
      replies:  Object.fromEntries(
        Object.entries(r.replies || {}).map(([k, v]) => [k, { text: v.text, ts: v.ts }])
      ),
    }));
  },

  /**
   * 向平台发送消息（不等待回复）
   * @param {string} text
   * @param {{ platforms?: string[] }} opts - platforms: 指定平台 key 列表（省略 = 全部）
   */
  async sendMessage(text, opts = {}) {
    if (!text || typeof text !== 'string') throw new Error('[FlowChatAPI] text is required');
    const { platforms } = opts;
    const targetKeys = platforms
      ? activePlatforms.filter(k => platforms.includes(k) || platforms.includes(getBasePlatform(k)))
      : null;

    lastSentMessage = text;
    await dispatchOrQueue(text, targetKeys);

    const sent = targetKeys || [...activePlatforms];
    return { ok: true, sent, ts: Date.now() };
  },

  /**
   * 等待所有（或指定）平台完成生成
   * @param {{ timeout?: number, platforms?: string[] }} opts
   */
  async waitForCompletion(opts = {}) {
    const { timeout = 120000, platforms } = opts;
    const targets = platforms
      ? activePlatforms.filter(k => platforms.includes(k) || platforms.includes(getBasePlatform(k)))
      : [...activePlatforms];
    const startTs = Date.now();

    return new Promise(resolve => {
      let tid, iid;
      const finish = (timedOut = false) => {
        clearTimeout(tid);
        clearInterval(iid);
        resolve({
          completed:  !timedOut,
          timedOut:   timedOut,
          responses:  window.FlowChatAPI.getResponses(),
          duration:   Date.now() - startTs,
        });
      };

      // 立即检查（生成尚未开始时直接返回）
      if (targets.every(k => !platformGenerating[k])) { finish(); return; }

      iid = setInterval(() => {
        if (targets.every(k => !platformGenerating[k])) finish();
      }, 500);
      tid = setTimeout(() => finish(true), timeout);
    });
  },

  /**
   * 发送消息并等待所有回复（一步完成）
   * @param {string} text
   * @param {{ platforms?: string[], timeout?: number }} opts
   * @returns {{ ok, question, platforms, responses, completed, timedOut, duration }}
   */
  async ask(text, opts = {}) {
    const startTs = Date.now();
    const sendResult = await window.FlowChatAPI.sendMessage(text, opts);
    const waitResult = await window.FlowChatAPI.waitForCompletion({
      timeout:   opts.timeout || 120000,
      platforms: sendResult.sent,
    });
    return {
      ok:        true,
      question:  text,
      platforms: sendResult.sent,
      responses: waitResult.responses,
      completed: waitResult.completed,
      timedOut:  waitResult.timedOut || false,
      duration:  Date.now() - startTs,
    };
  },
};

// 初始化为禁用桩；syncSettingsUI() 中根据 agentMode 设置调用 applyAgentMode()
window.FlowChatAPI = { version: '1.0.0', _active: false };

// ── 开发者面板逻辑 ──

let _devPanelOpen   = false;
let _devRefreshTimer = null;

function toggleDevPanel() {
  _devPanelOpen = !_devPanelOpen;
  const panel = document.getElementById('dev-panel');
  const btn   = document.getElementById('btn-dev-mode');
  panel?.classList.toggle('open', _devPanelOpen);
  btn?.classList.toggle('active', _devPanelOpen);
  if (_devPanelOpen) {
    refreshDevStatus();
    _devRefreshTimer = setInterval(refreshDevStatus, 1000);
  } else {
    clearInterval(_devRefreshTimer);
    _devRefreshTimer = null;
  }
}

function closeDevPanel() {
  _devPanelOpen = false;
  document.getElementById('dev-panel')?.classList.remove('open');
  document.getElementById('btn-dev-mode')?.classList.remove('active');
  clearInterval(_devRefreshTimer);
  _devRefreshTimer = null;
}

function refreshDevStatus() {
  const list = document.getElementById('dev-status-list');
  if (!list) return;
  // 直接读内部状态（不走 FlowChatAPI，避免 agentMode 关闭时报错）
  const status = _flowChatAPIImpl.getStatus();
  list.innerHTML = Object.entries(status).map(([k, s]) => {
    const dot  = s.generating ? 'generating' : s.connected ? 'connected' : 'loading';
    const badge = s.generating
      ? `<span class="dev-badge gen">${msg('status_generating')}</span>`
      : s.connected
        ? `<span class="dev-badge ok">${msg('status_connected')}</span>`
        : `<span class="dev-badge na">${msg('status_disconnected')}</span>`;
    const resp = replyStore[k]
      ? `<div class="dev-resp-preview">${escHtml((replyStore[k].text || '').slice(0, 60))}…</div>`
      : '';
    return `<div class="dev-status-row">
      <span class="col-dot ${dot}" style="flex-shrink:0"></span>
      <div class="dev-status-info">
        <span class="dev-status-name">${s.name}</span>
        <span class="dev-status-key">${k}</span>
        ${resp}
      </div>
      ${badge}
    </div>`;
  }).join('');
}

// dev-panel 标签切换
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dev-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.dev-tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`dev-tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });
  document.getElementById('btn-dev-close')?.addEventListener('click', closeDevPanel);
  document.getElementById('btn-dev-mode')?.addEventListener('click', toggleDevPanel);
});
