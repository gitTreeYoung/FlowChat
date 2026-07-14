// FlowChat Bridge
// 注入到 AI 平台页面（iframe 内），负责：
// 1. 通知主页面 bridge 已就绪
// 2. 接收消息并输入到 AI 平台
// 3. 监听 AI 响应并回传

(function () {
  'use strict';

  if (window.__flowchat_bridge__) return;
  window.__flowchat_bridge__ = true;

  // ============ 平台检测 ============
  const url = location.href;
  let platform = null;

  if      (url.includes('claude.ai'))                                           platform = 'claude';
  else if (url.includes('chatgpt.com') || url.includes('chat.openai.com'))     platform = 'chatgpt';
  else if (url.includes('gemini.google.com'))                                   platform = 'gemini';
  else if (url.includes('grok.com'))                                            platform = 'grok';
  else if (url.includes('doubao.com'))                                          platform = 'doubao';
  else if (url.includes('kimi.moonshot.cn') || url.includes('kimi.ai') || url.includes('kimi.com')) platform = 'kimi';
  else if (url.includes('deepseek.com'))                                        platform = 'deepseek';
  else if (url.includes('metaso.cn'))                                           platform = 'metaso';
  else if (url.includes('yuanbao.tencent.com'))                                 platform = 'yuanbao';
  else if (url.includes('zhida.zhihu.com'))                                     platform = 'zhida';
  else if (url.includes('chatglm.cn'))                                          platform = 'chatglm';
  else if (url.includes('agent.minimaxi.com'))                                  platform = 'minimax';
  else if (url.includes('poe.com'))                                             platform = 'poe';
  else if (url.includes('copilot.microsoft.com'))                               platform = 'copilot';
  else if (url.includes('z.ai'))                                                platform = 'zai';
  else if (url.includes('yiyan.baidu.com'))                                     platform = 'yiyan';

  if (!platform) platform = window.__fc_platform__ || null;
  if (!platform) return;

  console.log(`[FlowChat Bridge] 激活: ${platform}`);

  // ============ 平台选择器配置 ============
  // 每个平台的输入框、发送按钮、响应区域选择器
  // 使用多个候选选择器以应对 UI 更新
  const SELECTORS = {
    chatgpt: {
      input: [
        '#prompt-textarea',
        'div[contenteditable="true"]#prompt-textarea',
        'div[contenteditable="true"][data-lexical-editor]',
        'div[contenteditable="true"][data-testid="chat-input"]',
        'div[contenteditable="true"].ProseMirror',
        'textarea[data-id="root"]',
        'div[contenteditable="true"][id="prompt-textarea"]'
      ],
      send: [
        '#composer-submit-button',
        'button[data-testid="send-button"]',
        'button[aria-label="Send message"]',
        'button[aria-label="Send prompt"]',
        'button[data-testid="fruitjuice-send-button"]',
        'button[aria-label="Send"]'
      ],
      response: [
        '[data-message-author-role="assistant"]',
        '.agent-turn .markdown'
      ]
    },
    claude: {
      input: [
        'div[contenteditable="true"].ProseMirror',
        'div.ProseMirror[contenteditable]',
        'fieldset div[contenteditable="true"]',
        'div[contenteditable="true"][translate="no"]'
      ],
      send: [
        'button[aria-label="Send Message"]',
        'button[aria-label="Send message"]',
        'button[aria-label="Send"]',
        'fieldset button[type="button"]:not([disabled]):last-of-type',
        'fieldset button:last-child'
      ],
      response: [
        '[data-is-streaming]',
        '.font-claude-message',
        '.grid-cols-1 .grid .prose'
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
      send: [
        'button.send-button',
        'button[aria-label="Send message"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        '.trailing-actions button:last-child',
        'button:has(mat-icon)'
      ],
      response: [
        '.model-response-text',
        '.response-container-content',
        'message-content .markdown'
      ]
    },
    deepseek: {
      input: [
        'textarea#chat-input',
        'textarea[placeholder*="Send"]',
        'textarea[placeholder*="输入"]'
      ],
      send: [
        'button[aria-label*="send"]',
        'button[type="submit"]'
      ],
      response: [
        '.markdown-body',
        '.ds-markdown--block'
      ]
    },
    grok: {
      input: ['textarea[placeholder*="Ask"]', 'textarea'],
      send:  ['button[aria-label="Send"]', 'button[type="submit"]'],
      response: ['.message-bubble', '[class*="response"]']
    },
    doubao: {
      input: ['textarea[data-testid="chat_input_input"]', 'div[contenteditable="true"][data-placeholder]', 'textarea'],
      send:  ['button#flow-end-msg-send', 'button[data-testid="chat_input_send_button"]', 'button[aria-label*="发送"]'],
      response: ['[class*="ReplyContent"]', '[class*="agentReply"]', '[class*="reply-content"]',
                 '[class*="message"][class*="content"]', '[class*="chat"][class*="answer"]', '.markdown']
    },
    kimi: {
      input: ['div[contenteditable="true"][data-lexical-editor]', 'div[contenteditable="true"].editor-container', 'div[contenteditable="true"][class*="editor"]', 'div[contenteditable="true"]', 'textarea[placeholder*="Ask"]', 'textarea'],
      send:  ['button[data-testid="send-button"]', 'button[class*="send"]', 'div[class*="send"][role="button"]', 'button[aria-label*="Send"]', 'button[aria-label*="发送"]', 'button[type="submit"]'],
      response: ['[class*="segment-content"]', '[class*="chat-message-content"]',
                 '[class*="message-text"]', '[class*="answer"]', '.markdown']
    },
    metaso: {
      input: ['textarea[placeholder*="搜索"]', 'textarea[placeholder*="问"]', 'textarea'],
      send:  ['button[type="submit"]', 'button[aria-label*="搜索"]'],
      response: ['[class*="answer-content"]', '[class*="ai-answer"]', '[class*="result"]', '.markdown', 'article']
    },
    yuanbao: {
      input: ['div.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]', 'textarea'],
      send:  ['#yuanbao-send-btn', 'button[aria-label*="发送"]'],
      response: ['[class*="reply-content"]', '[class*="answer-content"]',
                 '[class*="chat"][class*="content"]', '.markdown']
    },
    zhida: {
      input: ['div[contenteditable="true"]', 'textarea[placeholder*="输入"]', 'textarea'],
      send:  ['button[type="submit"]', 'button[aria-label*="发送"]'],
      response: ['[class*="answer"]', '[class*="reply"]', '[class*="ai-message"]', '.markdown', 'article']
    },
    chatglm: {
      input: ['textarea', 'div[contenteditable="true"]'],
      send:  ['div.enter', 'div.enter-icon-container', 'button[type="submit"]'],
      response: ['[class*="chat-message"]', '[class*="message-content"]',
                 '[class*="conversation"][class*="content"]', '.markdown']
    },
    minimax: {
      input: ['div[contenteditable="true"]', 'textarea'],
      send:  ['button[type="submit"]', 'button[aria-label*="Send"]', 'button[aria-label*="发送"]'],
      response: ['[class*="message-content"]', '[class*="chat-content"]',
                 '[class*="bot"][class*="message"]', '.markdown']
    },
    poe: {
      input: ['textarea[placeholder*="Talk"]', 'textarea[placeholder*="Message"]', 'div[contenteditable="true"]', 'textarea'],
      send:  ['button[data-button-send="true"]', 'button[aria-label="Send message"]'],
      response: ['[class*="Markdown_markdownContainer"]', '[class*="Message_botMessageBubble"]',
                 '[class*="ChatMessage"]', '.markdown']
    },
    copilot: {
      input: ['textarea[id="userInput"]', 'div[contenteditable="true"]', 'textarea'],
      send:  ['button[aria-label="Submit"]', 'button[type="submit"]'],
      response: ['[class*="prose"]', '[data-content="ai-message"]',
                 '[class*="response"]', '[class*="answer"]', '.markdown']
    },
    zai: {
      input: ['textarea', 'div[contenteditable="true"]'],
      send:  ['button[type="submit"]', 'button[aria-label*="Send"]'],
      response: ['[class*="assistant"][class*="message"]', '[class*="ai-message"]',
                 '[class*="message"][class*="content"]', '.markdown', 'article']
    },
    yiyan: {
      input: ['div[contenteditable="true"]', 'div[class*="editable"]', 'textarea'],
      send:  ['button[type="submit"]', 'span[class*="sendInner"]', '[class*="sendBtnLottie"]'],
      response: ['[class*="content-inner"]', '[class*="message-text"]',
                 '[class*="answer-content"]', '[class*="chat"][class*="content"]', '.markdown']
    }
  };

  const selectors = SELECTORS[platform];

  // ============ 工具函数 ============

  // 按候选列表查找元素，返回第一个匹配
  function findElement(selectorList) {
    for (const sel of selectorList) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {}
    }
    return null;
  }

  // 等待元素出现
  function waitForElement(selectorList, timeout = 10000) {
    return new Promise((resolve) => {
      const el = findElement(selectorList);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = findElement(selectorList);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // ============ 消息输入 ============

  async function inputMessage(message) {
    if (!selectors) {
      console.warn(`[FlowChat Bridge] ${platform}: 无选择器配置，无法通过 bridge 输入`);
      return false;
    }
    const input = findElement(selectors.input);
    if (!input) {
      console.error('[FlowChat Bridge] 找不到输入框');
      return false;
    }

    // contentEditable 元素（Claude, Gemini, Kimi 等）
    if (input.contentEditable === 'true') {
      input.focus();
      // selectAll + insertText 保留 Lexical/Quill/ProseMirror 的内部状态
      document.execCommand('selectAll', false, null);
      if (!document.execCommand('insertText', false, message)) {
        // execCommand 不可用：用 Selection API 替换内容
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        sel.removeAllRanges();
        sel.addRange(range);
        range.deleteContents();
        range.insertNode(document.createTextNode(message));
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: message, bubbles: true }));
      }
    }
    // textarea 元素（ChatGPT 新版也可能是 contentEditable）
    else if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      input.focus();

      // 使用 native setter 绕过 React 的受控组件
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(input, message);
      } else {
        input.value = message;
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 等待 UI 更新后点击发送
    await new Promise(r => setTimeout(r, 500));

    const sendBtn = findElement(selectors.send);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      console.log(`[FlowChat Bridge] ${platform}: 消息已发送`);
      return true;
    } else {
      // 有些平台需要 Enter 键发送
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
      console.log(`[FlowChat Bridge] ${platform}: 通过 Enter 发送`);
      return true;
    }
  }

  // ============ 响应监听 ============

  let lastResponseText = '';
  let lastResponseHTML = '';
  let streamingTimer = null;

  function startResponseObserver() {
    let _obsTimer = null;
    const observer = new MutationObserver(() => {
      if (_obsTimer) return;
      _obsTimer = setTimeout(() => { _obsTimer = null; checkForResponse(); }, 250);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
  }

  // 提取元素文本前，先剔除 ChatGPT 的内联引用气泡（如 "Claude +4"）
  // 注意：克隆后的节点不在 DOM 中，innerText 无法获取 CSS list-style，需手动转换列表结构
  function getCleanText(el) {
    const clone = el.cloneNode(true);
    // 移除 ChatGPT source citation pills（含 "+数字" 的 <a> 标签）
    clone.querySelectorAll('a').forEach(a => {
      if (/\+\d+/.test(a.textContent)) a.remove();
    });
    // 移除屏幕阅读器辅助节点
    clone.querySelectorAll('[class*="sr-only"],[class*="visually-hidden"],[aria-hidden="true"]').forEach(e => e.remove());
    // 递归转换 HTML 结构为纯文本（保留列表、标题等格式）
    return htmlToPlainText(clone).replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * 递归将 HTML 节点转换为带格式的纯文本。
   * 解决 innerText 在离屏节点中无法渲染 CSS list-style 的问题。
   */
  function htmlToPlainText(node) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      return node.textContent.replace(/\n/g, ' ');
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) return '';

    const tag = node.tagName.toLowerCase();
    const kids = () => [...node.childNodes].map(htmlToPlainText).join('');

    const BLOCK = new Set(['div','p','article','section','blockquote','header','footer','main','aside','figure','figcaption','details','summary','address']);

    if (tag === 'br')  return '\n';
    if (tag === 'hr')  return '\n---\n';
    if (tag === 'pre') return '\n```\n' + (node.textContent || '') + '\n```\n';

    if (tag === 'code' && node.closest?.('pre')) return node.textContent || '';
    if (tag === 'code') return '`' + kids() + '`';

    if (tag === 'strong' || tag === 'b')  return '**' + kids() + '**';
    if (tag === 'em'     || tag === 'i')  return '_'  + kids() + '_';

    if (tag === 'h1') return '\n# '   + kids().trim() + '\n';
    if (tag === 'h2') return '\n## '  + kids().trim() + '\n';
    if (tag === 'h3') return '\n### ' + kids().trim() + '\n';
    if (/^h[4-6]$/.test(tag)) return '\n#### ' + kids().trim() + '\n';

    if (tag === 'li') {
      const parent = node.parentElement;
      let prefix = '- ';
      if (parent?.tagName === 'OL') {
        const idx = [...(parent.children || [])].indexOf(node) + 1;
        prefix = (idx > 0 ? idx : 1) + '. ';
      }
      const depth = (function countDepth(n) {
        let d = 0, cur = n.parentElement;
        while (cur) { if (cur.tagName === 'UL' || cur.tagName === 'OL') d++; cur = cur.parentElement; }
        return Math.max(0, d - 1);
      })(node);
      const indent = '  '.repeat(depth);
      return '\n' + indent + prefix + kids().trim();
    }

    if (tag === 'ul' || tag === 'ol') return kids() + '\n';

    if (BLOCK.has(tag)) {
      const inner = kids().trim();
      return inner ? '\n' + inner + '\n' : '';
    }

    return kids();
  }

  // 通用兜底：当平台 response 选择器无法匹配时，扫描页面中最长的变化文本块
  // 仅在 selectors.response 无匹配结果时生效
  const GENERIC_RESPONSE_SELS = [
    '[data-role="assistant"]', '[data-sender="assistant"]', '[data-author="assistant"]',
    '[class*="assistant"][class*="message"]', '[class*="ai-message"]',
    '[class*="bot-message"]', '[class*="model-message"]',
    '[class*="response-content"]', '[class*="answer-content"]',
    'article', '.markdown', '.prose',
  ];

  function checkForResponse() {
    let responses = [];

    if (selectors?.response) {
      for (const sel of selectors.response) {
        try { document.querySelectorAll(sel).forEach(el => responses.push(el)); } catch {}
      }
    }

    // 兜底：若平台 response 选择器没有匹配到内容，尝试通用选择器
    if (responses.length === 0) {
      for (const sel of GENERIC_RESPONSE_SELS) {
        try { document.querySelectorAll(sel).forEach(el => responses.push(el)); } catch {}
      }
    }

    if (responses.length === 0) return;

    // 本轮调用缓存 getCleanText 结果，避免同一元素重复 cloneNode
    const _textCache = new Map();
    const cachedText = el => { if (!_textCache.has(el)) _textCache.set(el, getCleanText(el)); return _textCache.get(el); };

    // 过滤：只保留有实质内容的元素（排除 "Claude +3" 等导航标签）
    const MIN_LEN = 40;
    const substantial = responses.filter(el => cachedText(el).length >= MIN_LEN);

    // 如果过滤后无结果，退回到所有候选中文本最长的那个
    const candidates = substantial.length > 0 ? substantial : responses;
    const lastEl = candidates.reduce((best, el) => {
      return cachedText(el).length > (best ? cachedText(best).length : 0) ? el : best;
    }, null);
    if (!lastEl) return;

    const text = cachedText(lastEl);
    const html = lastEl.innerHTML || '';

    // 检测是否有新内容
    if (text && text !== lastResponseText && text.length > 0) {
      // 流式更新：文本在增长
      if (text.length > lastResponseText.length || text !== lastResponseText) {
        lastResponseText = text;
        lastResponseHTML = html;

        // 发送流式更新
        chrome.runtime.sendMessage({
          type: 'AI_STREAMING',
          platform: platform,
          text: text,
          html: html,
          timestamp: Date.now()
        }).catch(() => {});

        // 重置防抖计时器 — 停止增长 2s 后视为完成
        clearTimeout(streamingTimer);
        streamingTimer = setTimeout(() => {
          chrome.runtime.sendMessage({
            type: 'AI_RESPONSE',
            platform: platform,
            text: lastResponseText,
            html: lastResponseHTML,
            timestamp: Date.now(),
            complete: true
          }).catch(() => {});
        }, 2000);
      }
    }
  }

  // ============ 生成状态检测（消息队列）============
  // 监听「停止生成」按钮的出现/消失，判断 AI 是否在输出
  // 当 AI 停止输出时，通知 flowchat.js 从队列中取下一条消息

  async function initGenWatcher() {
    // 内置的停止按钮选择器
    const BUILTIN_STOP = [
      // ── 已知精确选择器 ──
      'button[data-testid="stop-button"]',          // ChatGPT
      'button[aria-label="Stop Response"]',          // Claude
      'button[aria-label="Stop generating"]',        // Gemini
      'button[aria-label="Stop"]',                   // Grok / 部分平台
      'button[aria-label="Stop generation"]',        // DeepSeek
      'button[data-testid="stop-streaming-button"]', // 部分平台
      'button[aria-label="Stop responding"]',        // Copilot
      // ── 中文平台通配（豆包 / 元宝 / 知乎 / 智谱 / 文心 等）──
      'button[aria-label*="停止"]',
      'button[title*="停止"]',
      // ── 英文平台通配 ──
      'button[aria-label*="Stop"]',
      'button[title*="Stop"]',
      // ── 类名通配（Kimi / MiniMax / Poe / Z.ai 等用 class 标识）──
      'button[class*="stop-btn"]',
      'button[class*="stopBtn"]',
      '[class*="stop-generate"]',
      '[class*="stopGenerate"]',
      '[data-testid*="stop"]',
    ];

    // 从 storage 读取用户配置的 stop 选择器，优先使用
    let STOP = [...BUILTIN_STOP];
    try {
      const stored = await chrome.storage.local.get('flowchat_selectors');
      const customStop = stored.flowchat_selectors?.[platform]?.stop;
      if (customStop) STOP = [customStop, ...BUILTIN_STOP];
    } catch {}

    let prevGen = null;

    const _stopInterval = setInterval(() => {
      const gen = STOP.some(s => {
        try { return !!document.querySelector(s); } catch { return false; }
      });
      if (prevGen === null) { prevGen = gen; return; }
      if (prevGen && !gen) {
        chrome.runtime.sendMessage({ type: 'GENERATION_COMPLETE', platform, timestamp: Date.now() }).catch(() => {});
      }
      prevGen = gen;
    }, 600);

    window.addEventListener('beforeunload', () => clearInterval(_stopInterval), { once: true });
  }

  // ============ 屏蔽元素（持久化）============
  // 从 chrome.storage.local 读取规则并注入 CSS 屏蔽指定元素

  function isUnsafeBlockedSelector(selector) {
    const s = String(selector || '').trim();
    if (!s) return 'empty selector';
    if (/^(html|body|main|#root|#app|#__next)$/i.test(s)) return 'root selector';
    if (/^body\s*>/i.test(s) && (s.match(/nth-of-type/g) || []).length >= 2) return 'fragile body path';
    if (s.length > 220 && /^body\s*>/i.test(s)) return 'overlong body path';
    return '';
  }

  async function applyBlockedElements() {
    try {
      const stored = await chrome.storage.local.get('flowchat_blocked_elements');
      const rules  = stored.flowchat_blocked_elements?.[platform] || [];
      console.log('[FlowChat Bridge Block] apply begin', { platform, ruleCount: rules.length, rules });

      let style = document.getElementById('__fc_blocked_style__');
      if (!style) {
        style = document.createElement('style');
        style.id = '__fc_blocked_style__';
        document.head.appendChild(style);
      }
      if (!rules.length) {
        style.textContent = '';
        return { ok: true, platform, ruleCount: 0, matched: [] };
      }

      const matched = [];
      const cssRules = [];
      for (const r of rules) {
        const selector = String(r.selector || '').replace(/[{}]/g, '').trim();
        if (!selector) continue;
        const unsafeReason = isUnsafeBlockedSelector(selector);
        if (unsafeReason) {
          matched.push({ selector, count: 0, skipped: true, reason: unsafeReason });
          console.warn('[FlowChat Bridge Block] skipped unsafe selector', { platform, selector, reason: unsafeReason });
          continue;
        }
        try {
          const count = document.querySelectorAll(selector).length;
          matched.push({ selector, count });
          cssRules.push(`${selector}{display:none!important;visibility:hidden!important;}`);
        } catch (e) {
          matched.push({ selector, count: 0, error: e.message });
          console.warn('[FlowChat Bridge Block] invalid selector', { platform, selector, error: e.message });
        }
      }
      style.textContent = cssRules.join('\n');
      console.log('[FlowChat Bridge Block] apply done', { platform, ruleCount: rules.length, cssRuleCount: cssRules.length, matched });
      return { ok: true, platform, ruleCount: rules.length, cssRuleCount: cssRules.length, matched };
    } catch (e) {
      console.warn('[FlowChat Bridge Block] apply failed', { platform, error: e.message });
      return { ok: false, platform, error: e.message };
    }
  }

  // ============ 消息监听 ============

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.__fc_type !== 'PICKER_SELECTED' || !data.__fc_local_relay) return;
    console.log('[FlowChat Bridge Picker] relay picker selected', {
      platform: data.platform,
      step: data.step,
      selector: data.selector,
    });
    chrome.runtime.sendMessage({
      type: 'PICKER_SELECTED',
      platform: data.platform,
      step: data.step,
      selector: data.selector,
    }).catch(err => {
      console.warn('[FlowChat Bridge Picker] relay failed', err?.message || err);
    });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FLOWCHAT_SEND') {
      inputMessage(message.message)
        .then(ok => sendResponse({ success: ok }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }
    // 主页面添加新屏蔽规则后，重新应用所有规则
    if (message.type === 'APPLY_BLOCKED_ELEMENTS') {
      applyBlockedElements()
        .then(result => sendResponse({ success: !!result?.ok, result }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }
    // FlowChat 菜单栏触发侧边栏切换
    if (message.type === 'TOGGLE_SIDEBAR') {
      toggleSidebarFromMenu();
      sendResponse({ success: true });
      return;
    }
  });

  // ============ 侧边栏管理 ============
  // 基于实际 DOM 结构的精确检测（经 Playwright + agent-browser 验证）
  //
  // metaso:  容器 div.left-menu (开=229px, 关=0px)
  //          toggle 在 .LeftMenu_sidebar-action__* 内（CSS Module hash 会变）
  //          关闭时按钮 accessible name = "展开侧边栏"
  //
  // chatglm: 容器 aside.el-aside (折叠时有 collapse-aside class, 宽=40px)
  //          toggle: div.operation-btn.el-tooltip__trigger (不含 .history-collapse)
  //          .history-collapse 是展开时的收起按钮（折叠后 0x0 不可见）
  //
  // claude:  sidebar: nav[aria-label="Sidebar"]
  //          toggle: [data-testid="pin-sidebar-toggle"]
  //          嵌入模式下 Claude 会隐藏侧边栏或卸载 toggle，需先恢复再点击

  // 完整鼠标事件序列模拟点击
  function simulateFullClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function findClickable(el, maxDepth = 6) {
    let cur = el;
    for (let i = 0; cur && i <= maxDepth; i++, cur = cur.parentElement) {
      if (cur.matches?.('button, [role="button"], [type="button"], [type="submit"], a[href]')) return cur;
    }
    return el;
  }

  // chatglm 用两个不同的按钮控制侧边栏：
  //   折叠态 → button 0 (operation-btn, 可见) 点击展开
  //   展开态 → history-collapse (operation-btn.history-collapse, 可见) 点击折叠
  //            此时 button 0 变成搜索按钮！不能点！
  function findChatglmToggle(wantCollapse) {
    if (wantCollapse) {
      // 展开态要折叠 → 点 history-collapse
      const btn = document.querySelector('div.operation-btn.history-collapse');
      return (btn && btn.getBoundingClientRect().width > 0) ? btn : null;
    }
    // 折叠态要展开 → 点第一个可见的 operation-btn（非 history-collapse）
    const btns = document.querySelectorAll('div.operation-btn.el-tooltip__trigger:not(.history-collapse)');
    for (const btn of btns) {
      if (btn.getBoundingClientRect().width > 0) return btn;
    }
    return null;
  }

  function isChatglmCollapsed() {
    const aside = document.querySelector('aside.el-aside, aside[class*="aside-container"]');
    if (!aside) return null; // 未找到
    return aside.classList.contains('collapse-aside') || aside.getBoundingClientRect().width <= 50;
  }

  function findClaudeSidebar() {
    return document.querySelector('nav[aria-label="Sidebar"], aside[aria-label="Sidebar"], [data-testid="sidebar"]');
  }

  function findClaudeSidebarToggle() {
    const selectors = [
      '[data-testid="pin-sidebar-toggle"]',
      'button[aria-label*="sidebar" i]',
      'button[aria-label*="side bar" i]',
      'button[aria-label*="menu" i]',
      'button[aria-label*="pin" i]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return findClickable(el);
    }
    return null;
  }

  function forceShowEl(el, display = 'flex') {
    if (!el) return;
    el.hidden = false;
    el.removeAttribute('hidden');
    el.removeAttribute('aria-hidden');
    el.style.setProperty('display', display || 'block', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('pointer-events', 'auto', 'important');
  }

  function forceShowClaudeSidebar() {
    const sidebar = findClaudeSidebar();
    if (sidebar) {
      forceShowEl(sidebar, 'flex');
      sidebar.style.setProperty('position', 'fixed', 'important');
      sidebar.style.setProperty('left', '0', 'important');
      sidebar.style.setProperty('top', '0', 'important');
      sidebar.style.setProperty('bottom', '0', 'important');
      sidebar.style.setProperty('width', '18rem', 'important');
      sidebar.style.setProperty('min-width', '18rem', 'important');
      sidebar.style.setProperty('max-width', '18rem', 'important');
      sidebar.style.setProperty('transform', 'none', 'important');
      sidebar.style.setProperty('z-index', '2147483000', 'important');
    }

    const btn = findClaudeSidebarToggle();
    if (btn) {
      forceShowEl(btn, 'inline-flex');
      btn.style.setProperty('width', '32px', 'important');
      btn.style.setProperty('height', '32px', 'important');
      let parent = btn.parentElement;
      for (let i = 0; parent && i < 5; i++, parent = parent.parentElement) {
        forceShowEl(parent, i === 0 ? 'flex' : 'block');
      }
    }

    return { sidebar, btn };
  }

  function installClaudeSidebarFix() {
    let style = document.getElementById('__fc_sidebar_fix__');
    if (!style) {
      style = document.createElement('style');
      style.id = '__fc_sidebar_fix__';
      document.head.appendChild(style);
    }
    style.textContent = `
      nav[aria-label="Sidebar"],
      aside[aria-label="Sidebar"],
      [data-testid="sidebar"] {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: none !important;
      }
      nav[aria-label="Sidebar"],
      aside[aria-label="Sidebar"] {
        left: 0 !important;
        width: 18rem !important;
        min-width: 18rem !important;
        max-width: 18rem !important;
      }
      [data-testid="pin-sidebar-toggle"] {
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        width: 32px !important;
        height: 32px !important;
      }
    `;

    forceShowClaudeSidebar();

    if (window.__fc_claude_sidebar_observer__) return;
    window.__fc_claude_sidebar_observer__ = new MutationObserver(() => {
      clearTimeout(window.__fc_claude_sidebar_timer__);
      window.__fc_claude_sidebar_timer__ = setTimeout(forceShowClaudeSidebar, 80);
    });
    window.__fc_claude_sidebar_observer__.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden', 'aria-hidden']
    });
  }

  async function manageSidebar() {
    // ---- metaso: 检测 div.left-menu 宽度，打开时点击收起 ----
    if (platform === 'metaso') {
      await new Promise(r => setTimeout(r, 3000));
      const tryClose = (attempts = 0) => {
        if (attempts > 10) return;
        const sidebar = document.querySelector('div.left-menu, [class*="LeftMenu_menu-container"]');
        if (!sidebar) {
          // 可能还没进搜索结果页（首页无侧边栏）
          setTimeout(() => tryClose(attempts + 1), 2000);
          return;
        }
        const sidebarWidth = sidebar.getBoundingClientRect().width;
        if (sidebarWidth < 50) {
          console.log(`[FlowChat Bridge] metaso: 侧边栏已关闭 (width=${sidebarWidth})`);
          return;
        }
        // 侧边栏打开，找收起按钮
        // 优先找 LeftMenu_sidebar-action 内的 button
        const collapseBtn = sidebar.querySelector('[class*="sidebar-action"] button')
          || sidebar.querySelector('button:first-of-type');
        if (collapseBtn) {
          simulateFullClick(collapseBtn);
          console.log(`[FlowChat Bridge] metaso: 已点击收起侧边栏 (width 原=${sidebarWidth})`);
        } else {
          console.warn(`[FlowChat Bridge] metaso: 侧边栏打开但未找到收起按钮`);
        }
      };
      tryClose();
    }

    // ---- chatglm: 检测 aside 的 collapse-aside class ----
    if (platform === 'chatglm') {
      await new Promise(r => setTimeout(r, 3000));
      const tryClose = (attempts = 0) => {
        if (attempts > 10) return;
        const collapsed = isChatglmCollapsed();
        if (collapsed === null) {
          setTimeout(() => tryClose(attempts + 1), 2000);
          return;
        }
        if (collapsed) {
          console.log(`[FlowChat Bridge] chatglm: 侧边栏已折叠，无需操作`);
          return;
        }
        // 侧边栏展开 → 点 history-collapse 按钮折叠
        const collapseBtn = findChatglmToggle(true);
        if (collapseBtn) {
          simulateFullClick(collapseBtn);
          console.log(`[FlowChat Bridge] chatglm: 已点击 history-collapse 折叠侧边栏`);
        } else {
          console.warn(`[FlowChat Bridge] chatglm: 侧边栏展开但 history-collapse 按钮不可见`);
        }
      };
      tryClose();
    }

    // ---- claude: 强制恢复侧边栏和原生 toggle ----
    if (platform === 'claude') {
      await new Promise(r => setTimeout(r, 3000));
      installClaudeSidebarFix();
      console.log(`[FlowChat Bridge] claude: 已启用侧边栏恢复逻辑`);
    }
  }

  // 从 FlowChat 菜单栏触发的侧边栏切换（平台通用）
  function toggleSidebarFromMenu() {
    let btn = null;

    if (platform === 'claude') {
      installClaudeSidebarFix();
      const recovered = forceShowClaudeSidebar();
      btn = recovered.btn;
    } else if (platform === 'chatglm') {
      // chatglm 展开/折叠用不同按钮，根据当前状态选
      const collapsed = isChatglmCollapsed();
      btn = findChatglmToggle(collapsed === false); // 展开态→要折叠，折叠态→要展开
    } else if (platform === 'metaso') {
      btn = document.querySelector('[class*="sidebar-action"] button');
    }

    if (!btn) {
      console.warn(`[FlowChat Bridge] ${platform}: 未找到侧边栏 toggle 按钮`);
      return;
    }

    simulateFullClick(findClickable(btn));
    console.log(`[FlowChat Bridge] ${platform}: 菜单栏触发侧边栏切换`);
  }

  // ============ 诊断 ============
  // 检查输入框、发送按钮、停止按钮、侧边栏，发送 BRIDGE_DIAGNOSTIC 回 flowchat.js

  // 各平台输入/发送选择器（与 flowchat.js DEFAULT_SELECTORS 保持同步）
  const DIAG_SELECTORS = {
    claude:     { input: ['div[contenteditable="true"].ProseMirror','div.ProseMirror[contenteditable]','fieldset div[contenteditable="true"]','div[contenteditable="true"][translate="no"]'],
                  send:  ['button[aria-label="Send Message"]','button[aria-label="Send message"]','button[aria-label="Send"]','fieldset button[type="button"]:not([disabled]):last-of-type','fieldset button:last-child'] },
    chatgpt:    { input: ['#prompt-textarea','div[contenteditable="true"]#prompt-textarea'],
                  send:  ['button[data-testid="send-button"]','button[aria-label="Send prompt"]','[data-testid="fruitjuice-send-button"]'] },
    gemini:     { input: ['.ql-editor[contenteditable="true"]','rich-textarea .ql-editor','.input-area .ql-editor','rich-textarea [contenteditable="true"]','div[contenteditable="true"][class*="ql"]','[contenteditable="true"]'],
                  send:  ['button.send-button','button[aria-label*="Send"]','.trailing-actions button:last-child','button[class*="send"]'] },
    grok:       { input: ['textarea[placeholder*="Ask"]','textarea[placeholder*="Grok"]','textarea'],
                  send:  ['button[aria-label="Send"]','button[type="submit"]'] },
    doubao:     { input: ['div[contenteditable="true"][data-placeholder]','textarea#mainChatInput','div[contenteditable="true"]','textarea[placeholder*="发送"]','textarea'],
                  send:  ['button[aria-label="发送"]','button[aria-label*="发送"]','div[role="button"][aria-label*="发送"]','button[data-testid="send-button"]','button[type="submit"]'] },
    kimi:       { input: ['div[contenteditable="true"][data-lexical-editor]','div[contenteditable="true"].editor-container','div[contenteditable="true"][class*="editor"]','div[contenteditable="true"]','textarea'],
                  send:  ['button[data-testid="send-button"]','button[aria-label*="Send"]','button[type="submit"]'] },
    deepseek:   { input: ['textarea#chat-input','textarea[placeholder*="Send"]','textarea[placeholder*="输入"]','textarea'],
                  send:  ['button[aria-label*="send"]','button[type="submit"]'] },
    metaso:     { input: ['textarea[placeholder*="搜索"]','textarea[placeholder*="问"]','input[type="text"]','textarea','div[contenteditable="true"]'],
                  send:  ['button[type="submit"]','button[aria-label*="搜索"]','button[aria-label*="发送"]'] },
    yuanbao:    { input: ['div.ql-editor[contenteditable="true"]','div[contenteditable="true"]','textarea[placeholder*="输入"]','textarea'],
                  send:  ['#yuanbao-send-btn','button[aria-label="发送"]','button[aria-label*="发送"]','div[role="button"][aria-label*="发送"]','button[type="submit"]'] },
    zhida:      { input: ['div[contenteditable="true"]','textarea[placeholder*="输入"]','textarea'],
                  send:  ['button[type="submit"]','button[aria-label="发送"]','button[aria-label*="发送"]','div[role="button"][aria-label*="发送"]'] },
    chatglm:    { input: ['textarea','div[contenteditable="true"]','textarea[placeholder*="输入"]'],
                  send:  ['div.enter','div.enter-icon-container','button[type="submit"]','button[aria-label*="发送"]'] },
    minimax:    { input: ['div[contenteditable="true"]','textarea[placeholder*="输入"]','textarea'],
                  send:  ['button[type="submit"]','button[aria-label*="发送"]','button[aria-label*="Send"]'] },
    poe:        { input: ['textarea[placeholder*="Talk"]','textarea[placeholder*="Message"]','div[contenteditable="true"]','textarea'],
                  send:  ['button[data-button-send="true"]','button[aria-label="Send message"]','button[aria-label*="发送"]','button[type="submit"]'] },
    copilot:    { input: ['textarea[id="userInput"]','div[contenteditable="true"]','textarea'],
                  send:  ['button[aria-label="Submit"]','button[type="submit"]'] },
    zai:        { input: ['textarea','div[contenteditable="true"]'],
                  send:  ['button[type="submit"]','button[aria-label*="Send"]'] },
    yiyan:      { input: ['div[contenteditable="true"]','div[class*="editable__"]','textarea[placeholder*="输入"]','textarea'],
                  send:  ['span[class*="sendInner"]','[class*="sendBtnLottie"]','div[class*="send__"]','button[type="submit"]','button[aria-label*="发送"]'] },
  };

  const DIAG_STOP = [
    'button[data-testid="stop-button"]',
    'button[aria-label="Stop Response"]',
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop"]',
    'button[aria-label="Stop generation"]',
    'button[data-testid="stop-streaming-button"]',
  ];

  function checkSel(sels) {
    for (const s of sels) {
      try {
        const el = document.querySelector(s);
        if (el) {
          const r = el.getBoundingClientRect();
          return { ok: true, sel: s, visible: r.width > 0 && r.height > 0, disabled: !!el.disabled };
        }
      } catch {}
    }
    return { ok: false };
  }

  function detectSidebarDiag() {
    // 通用左侧面板检测
    const candidates = [
      'aside', 'nav',
      '[class*="sidebar"]', '[class*="Sidebar"]',
      '[class*="sider"]',   '[class*="left-menu"]',
      '[class*="LeftMenu"]','[class*="side-nav"]',
      '[class*="left_bar"]','[class*="leftbar"]',
    ];
    const found = [];
    for (const s of candidates) {
      try {
        for (const el of document.querySelectorAll(s)) {
          const r = el.getBoundingClientRect();
          if (r.height > 100 && r.width > 20 && r.left < 60) {
            found.push({ sel: s, cls: el.className?.substring?.(0, 60) || '', w: Math.round(r.width), collapsed: el.classList?.contains('collapse-aside') || el.classList?.contains('collapsed') || r.width < 60 });
          }
        }
      } catch {}
    }
    return found;
  }

  function runDiagnostic() {
    const d = DIAG_SELECTORS[platform] || {};
    const inputCheck = checkSel(d.input || (selectors?.input ?? []));
    const sendCheck  = checkSel(d.send  || (selectors?.send  ?? []));
    const stopCheck  = checkSel(DIAG_STOP);
    const sidebar    = detectSidebarDiag();

    // 健康等级：ok=全部找到 warning=stop缺失/sidebar需关注 error=input或send缺失
    const level = (!inputCheck.ok || !sendCheck.ok) ? 'error'
                : (!stopCheck.ok)                   ? 'warning'
                : 'ok';

    const result = { platform, level, input: inputCheck, send: sendCheck, stop: stopCheck, sidebar };
    const icon = level === 'ok' ? '✅' : level === 'warning' ? '⚠️' : '❌';
    console.log(`[FlowChat Diag] ${icon} ${platform} | input:${inputCheck.ok?inputCheck.sel:'❌MISS'} | send:${sendCheck.ok?sendCheck.sel:'❌MISS'} | stop:${stopCheck.ok?stopCheck.sel:'—none—'} | sidebar:${JSON.stringify(sidebar)}`);
    return result;
  }

  // ============ 初始化 ============

  async function initialize() {
    // 无论是否有选择器配置，都必须：初始化生成监听、应用屏蔽规则、发送 BRIDGE_READY
    // （platformFrames 依赖 BRIDGE_READY；元素屏蔽依赖 platformFrames）
    await initGenWatcher();
    await applyBlockedElements();
    manageSidebar(); // 异步执行，不阻塞初始化流程
    chrome.runtime.sendMessage({
      type: 'BRIDGE_READY',
      platform: platform,
      url: location.href
    }).catch(() => {});

    // 仅有选择器配置的平台才等待输入框、启动响应监听
    if (!selectors) {
      console.log(`[FlowChat Bridge] ${platform}: 无选择器配置，已发送 BRIDGE_READY`);
      // 等待 8s 让页面充分加载后再运行诊断（避免因页面未加载完导致误报 ❌）
      setTimeout(() => {
        const diag = runDiagnostic();
        chrome.runtime.sendMessage({ type: 'BRIDGE_DIAGNOSTIC', ...diag }).catch(() => {});
      }, 8000);
      return;
    }

    const input = await waitForElement(selectors.input, 25000);
    if (input) {
      console.log(`[FlowChat Bridge] ${platform}: 输入框已就绪`);
      startResponseObserver();
    } else {
      console.warn(`[FlowChat Bridge] ${platform}: 超时未找到输入框`);
    }

    // 诊断：在 waitForElement 结束后运行，确保 DOM 已稳定
    setTimeout(() => {
      const diag = runDiagnostic();
      chrome.runtime.sendMessage({ type: 'BRIDGE_DIAGNOSTIC', ...diag }).catch(() => {});
    }, 1000);
  }

  // 等待页面稳定后初始化
  if (document.readyState === 'complete') {
    setTimeout(initialize, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(initialize, 1500));
  }
})();
