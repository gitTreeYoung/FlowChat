// FlowChat Highlight Engine v1.0
// 注入到 AI 平台 iframe 内，提供原生页面高亮标注能力
// 像 Liner / Hypothesis 插件一样，直接在 AI 网站原生界面操作

(function () {
  'use strict';
  if (window.__fc_highlight__) return;
  window.__fc_highlight__ = true;

  // ── 平台检测 ──
  const h = location.hostname;
  let platform = null;
  if      (h.includes('chatgpt.com') || h.includes('chat.openai.com')) platform = 'chatgpt';
  else if (h.includes('claude.ai'))        platform = 'claude';
  else if (h.includes('gemini.google.com')) platform = 'gemini';
  else if (h.includes('perplexity.ai'))    platform = 'perplexity';
  else if (h.includes('deepseek.com'))     platform = 'deepseek';
  else if (h.includes('grok.com'))         platform = 'grok';
  if (!platform) return;

  // ── 标签定义（不使用 emoji，用 CSS 颜色圆点区分）──
  const LABELS = [
    { key: 'adopt',  color: '#34c759', name: '采纳', shortcut: '1' },
    { key: 'ref',    color: '#ff9f0a', name: '参考', shortcut: '2' },
    { key: 'reject', color: '#ff3b30', name: '拒绝', shortcut: '3' },
    { key: 'note',   color: '#0071e3', name: '批注', shortcut: '4' },
  ];

  // ── CSS Custom Highlight API 检测（非破坏性高亮，React 友好）──
  const USE_CSS_HL = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

  // ── 注入样式 ──
  const styleEl = document.createElement('style');
  styleEl.id = '__fc_hl_style__';
  let cssText = `
    #__fc_toolbar__ {
      position: fixed; z-index: 2147483646;
      display: none; flex-direction: row; gap: 2px; align-items: center;
      padding: 5px 7px;
      background: rgba(29,29,31,0.93);
      backdrop-filter: blur(14px) saturate(180%);
      -webkit-backdrop-filter: blur(14px) saturate(180%);
      border-radius: 12px;
      box-shadow: 0 6px 24px rgba(0,0,0,.30), 0 0 0 .5px rgba(255,255,255,.10);
      pointer-events: all; user-select: none; -webkit-user-select: none;
    }
    #__fc_toolbar__ button {
      background: transparent; border: none; color: #fff;
      font-size: 12px; padding: 3px 10px; border-radius: 7px;
      cursor: pointer; white-space: nowrap; line-height: 1.5;
      display: flex; align-items: center; gap: 3px;
      transition: background .12s;
    }
    #__fc_toolbar__ button:hover { background: rgba(255,255,255,.18); }
    #__fc_toolbar__ button.fc-active { background: rgba(255,255,255,.22); }
    #__fc_toolbar__ .fc-continuous {
      border-right: 1px solid rgba(255,255,255,.16);
      border-radius: 7px 0 0 7px;
      margin-right: 3px;
      padding-right: 11px;
      color: rgba(255,255,255,.72);
    }
    #__fc_toolbar__ .fc-continuous.fc-active {
      color: #fff;
      background: rgba(255,255,255,.18);
    }
    #__fc_toolbar__ .fc-shortcut {
      font-size: 10px; color: rgba(255,255,255,.4);
      background: rgba(255,255,255,.1);
      padding: 1px 4px; border-radius: 4px; margin-left: 1px;
    }
    /* <mark> 降级方案样式 */
    mark.fc-hl-mark { background: none; border-radius: 2px; cursor: pointer; transition: filter .12s; }
    mark.fc-hl-mark:hover { filter: brightness(0.88); }
    mark.fc-hl-mark[data-label="adopt"]  { background: rgba(52,199,89,0.32);   border-bottom: 2px solid #34c759; }
    mark.fc-hl-mark[data-label="ref"]    { background: rgba(255,159,10,0.28);  border-bottom: 2px solid #ff9f0a; }
    mark.fc-hl-mark[data-label="reject"] { background: rgba(255,59,48,0.22);   border-bottom: 2px solid #ff3b30; }
    mark.fc-hl-mark[data-label="note"]   { background: rgba(0,113,227,0.2);    border-bottom: 2px solid #0071e3; }
  `;

  if (USE_CSS_HL) {
    cssText += `
      ::highlight(fc-adopt)  { background-color: rgba(52,199,89,0.32);  color: inherit; }
      ::highlight(fc-ref)    { background-color: rgba(255,159,10,0.28); color: inherit; }
      ::highlight(fc-reject) { background-color: rgba(255,59,48,0.22);  color: inherit; }
      ::highlight(fc-note)   { background-color: rgba(0,113,227,0.2);   color: inherit; }
    `;
    ['adopt', 'ref', 'reject', 'note'].forEach(k => {
      if (!CSS.highlights.has(`fc-${k}`)) CSS.highlights.set(`fc-${k}`, new Highlight());
    });
  }
  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);

  // ── 状态 ──
  const cssHlRanges = new Map();  // id → { ranges, label }（CSS Highlight API）
  const highlightRecords = new Map(); // id → { label, text, sourceRange, blockId }
  let toolbar     = null;
  let pendingRange = null;
  let continuousMode = false;
  let lastLabelKey = 'adopt';
  let toolbarHideTimer = null;
  let lastAutoHighlightId = null;

  const PREF_KEY = 'flowchat_highlight_prefs';
  const prefPromise = chrome.storage?.local?.get?.(PREF_KEY);
  prefPromise?.then(stored => {
    const prefs = stored?.[PREF_KEY] || {};
    continuousMode = !!prefs.continuousMode;
    if (LABELS.some(l => l.key === prefs.lastLabelKey)) lastLabelKey = prefs.lastLabelKey;
    updateToolbarState();
  }).catch(() => {});

  function savePrefs() {
    chrome.storage?.local?.set({ [PREF_KEY]: { continuousMode, lastLabelKey } }).catch(() => {});
  }

  function updateToolbarState() {
    if (!toolbar) return;
    toolbar.querySelector('.fc-continuous')?.classList.toggle('fc-active', continuousMode);
    toolbar.querySelectorAll('[data-fc-label]').forEach(btn => {
      btn.classList.toggle('fc-active', btn.dataset.fcLabel === lastLabelKey);
    });
  }

  // ── 工具条 ──
  function getToolbar() {
    if (toolbar) return toolbar;
    toolbar = document.createElement('div');
    toolbar.id = '__fc_toolbar__';
    const continuousBtn = document.createElement('button');
    continuousBtn.className = 'fc-continuous';
    continuousBtn.textContent = '连续';
    continuousBtn.title = '连续高亮：开启后自动使用上一次颜色';
    continuousBtn.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      continuousMode = !continuousMode;
      savePrefs();
      updateToolbarState();
      if (!continuousMode) scheduleToolbarHide(900);
    });
    toolbar.appendChild(continuousBtn);
    LABELS.forEach(l => {
      const btn = document.createElement('button');
      btn.dataset.fcLabel = l.key;
      btn.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${l.color};flex-shrink:0;margin-right:2px"></span>${l.name}<span class="fc-shortcut">${l.shortcut}</span>`;
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (lastAutoHighlightId && pendingRange) {
          removeHighlightById(lastAutoHighlightId);
          lastAutoHighlightId = null;
        }
        applyHighlight(l.key, { keepToolbar: continuousMode, keepPending: continuousMode });
      });
      toolbar.appendChild(btn);
    });
    toolbar.addEventListener('mouseenter', () => {
      if (toolbarHideTimer) clearTimeout(toolbarHideTimer);
      toolbarHideTimer = null;
    });
    toolbar.addEventListener('mouseleave', () => {
      if (continuousMode) scheduleToolbarHide(900);
    });
    document.documentElement.appendChild(toolbar);
    updateToolbarState();
    return toolbar;
  }

  function showToolbar(rect) {
    const tb = getToolbar();
    tb.style.display = 'flex';
    tb.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      const tw = tb.offsetWidth || 300;
      const th = tb.offsetHeight || 38;
      let left = rect.left + rect.width / 2 - tw / 2;
      let top  = rect.top - th - 10;
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
      if (top < 8) top = rect.bottom + 8;
      tb.style.left = left + 'px';
      tb.style.top  = top  + 'px';
      tb.style.visibility = 'visible';
    });
    updateToolbarState();
  }

  function hideToolbar() {
    if (toolbarHideTimer) clearTimeout(toolbarHideTimer);
    toolbarHideTimer = null;
    if (toolbar) toolbar.style.display = 'none';
    pendingRange = null;
    lastAutoHighlightId = null;
  }

  function scheduleToolbarHide(delay = 1400) {
    if (toolbarHideTimer) clearTimeout(toolbarHideTimer);
    toolbarHideTimer = setTimeout(() => hideToolbar(), delay);
  }

  function closestElement(node) {
    if (!node) return null;
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  }

  function getSplitBlockId(range) {
    const el = closestElement(range?.commonAncestorContainer);
    return el?.closest?.('[data-fc-sr-block]')?.getAttribute('data-fc-sr-block') || '';
  }

  function isIgnoredNode(node) {
    const el = closestElement(node);
    if (!el) return true;
    if (el.closest('#__fc_toolbar__')) return true;
    if (el.closest('script,style,noscript,textarea,input,[contenteditable][data-placeholder],[contenteditable][aria-placeholder],[role="textbox"]')) return true;
    return false;
  }

  function textNodesIn(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (isIgnoredNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function rangeFromTextOffsets(nodes, start, end) {
    let pos = 0;
    let startNode = null, endNode = null, startOffset = 0, endOffset = 0;
    for (const node of nodes) {
      const next = pos + node.nodeValue.length;
      if (!startNode && start >= pos && start <= next) {
        startNode = node;
        startOffset = start - pos;
      }
      if (startNode && end >= pos && end <= next) {
        endNode = node;
        endOffset = end - pos;
        break;
      }
      pos = next;
    }
    if (!startNode || !endNode) return null;
    const r = document.createRange();
    r.setStart(startNode, startOffset);
    r.setEnd(endNode, endOffset);
    return r;
  }

  function findTextRanges(root, text, limit = 20) {
    const needle = String(text || '').trim();
    if (!root || !needle) return [];
    const nodes = textNodesIn(root);
    if (!nodes.length) return [];
    const full = nodes.map(n => n.nodeValue).join('');
    const ranges = [];
    let from = 0;
    while (ranges.length < limit) {
      const idx = full.indexOf(needle, from);
      if (idx < 0) break;
      const r = rangeFromTextOffsets(nodes, idx, idx + needle.length);
      if (r) ranges.push(r);
      from = idx + Math.max(1, needle.length);
    }
    return ranges;
  }

  function syncedRangesFor(record) {
    let blockId = record.blockId || getSplitBlockId(record.sourceRange);
    if (blockId) record.blockId = blockId;
    if (!blockId) return [record.sourceRange].filter(Boolean);

    const roots = [...document.querySelectorAll(`[data-fc-sr-block="${CSS.escape(blockId)}"]`)];
    const ranges = [];
    for (const root of roots) ranges.push(...findTextRanges(root, record.text, 5));
    return ranges.length ? ranges : [record.sourceRange].filter(Boolean);
  }

  function clearCssHighlight(id) {
    if (!cssHlRanges.has(id)) return;
    const { ranges, label } = cssHlRanges.get(id);
    const hl = CSS.highlights.get(`fc-${label}`);
    ranges.forEach(r => hl?.delete(r));
    cssHlRanges.delete(id);
  }

  function paintCssHighlight(id, record) {
    if (!USE_CSS_HL) return false;
    try {
      clearCssHighlight(id);
      const ranges = syncedRangesFor(record);
      const hl = CSS.highlights.get(`fc-${record.label}`);
      ranges.forEach(r => hl?.add(r));
      cssHlRanges.set(id, { ranges, label: record.label });
      return ranges.length > 0;
    } catch {
      return false;
    }
  }

  function repaintAllHighlights() {
    if (!USE_CSS_HL) return;
    for (const [id, record] of highlightRecords.entries()) {
      paintCssHighlight(id, record);
    }
  }

  window.__fc_hl_sync__ = {
    repaintAll: repaintAllHighlights
  };

  // ── 选区监听 ──
  document.addEventListener('mouseup', e => {
    if (toolbar && e.target.closest('#__fc_toolbar__')) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        hideToolbar();
        return;
      }
      const range = sel.getRangeAt(0).cloneRange();
      pendingRange = range;
      const rect  = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { hideToolbar(); return; }
      if (continuousMode) {
        lastAutoHighlightId = applyHighlight(lastLabelKey, { auto: true, keepToolbar: true, keepPending: true });
        showToolbar(rect);
        scheduleToolbarHide(1400);
        return;
      }
      showToolbar(rect);
    }, 20);
  });

  document.addEventListener('mousedown', e => {
    if (toolbar && !e.target.closest('#__fc_toolbar__')) hideToolbar();
  });

  // ── 键盘快捷键（1/2/3/4 标记，Esc 取消）──
  document.addEventListener('keydown', e => {
    if (!pendingRange) return;
    // 不在输入框中触发
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    const map = { '1': 'adopt', '2': 'ref', '3': 'reject', '4': 'note' };
    if (map[e.key]) { e.preventDefault(); applyHighlight(map[e.key], { keepToolbar: continuousMode, keepPending: continuousMode }); }
    if (e.key === 'Escape') hideToolbar();
  });

  // ── 应用高亮 ──
  function applyHighlight(labelKey, opts = {}) {
    if (!pendingRange) return null;
    const range = pendingRange;
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    lastLabelKey = labelKey;
    savePrefs();
    updateToolbarState();

    const id   = 'hl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const text = range.toString().trim().slice(0, 300);
    const record = {
      label: labelKey,
      text,
      sourceRange: range.cloneRange(),
      blockId: getSplitBlockId(range)
    };
    highlightRecords.set(id, record);

    let ok = false;
    if (USE_CSS_HL) {
      ok = paintCssHighlight(id, record);
    }
    if (!ok) ok = applyMark(range, labelKey, id);

    if (ok) {
      chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_ADDED',
        data: { id, label: labelKey, text, platform, url: location.href }
      }).catch(() => {});
    }
    if (!ok) highlightRecords.delete(id);
    if (ok && opts.keepPending) pendingRange = range.cloneRange();
    if (opts.keepToolbar) scheduleToolbarHide(opts.auto ? 1400 : 900);
    else hideToolbar();
    return ok ? id : null;
  }

  function applyMark(range, labelKey, id) {
    try {
      const mark = document.createElement('mark');
      mark.className = 'fc-hl-mark';
      mark.setAttribute('data-label', labelKey);
      mark.setAttribute('data-fc-id', id);
      try {
        range.surroundContents(mark);
      } catch {
        // 跨元素边界的选区：extractContents + insertNode
        const frag = range.extractContents();
        mark.appendChild(frag);
        range.insertNode(mark);
      }
      mark.addEventListener('click', e => {
        e.stopPropagation();
        removeHighlightById(id);
      });
      return true;
    } catch (err) {
      console.warn('[FC Highlight] mark 失败:', err);
      return false;
    }
  }

  // ── 删除高亮 ──
  function removeHighlightById(id) {
    // CSS Highlight API 清除
    if (USE_CSS_HL) clearCssHighlight(id);
    highlightRecords.delete(id);
    // mark 元素清除
    document.querySelectorAll(`mark.fc-hl-mark[data-fc-id="${id}"]`).forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });
    chrome.runtime.sendMessage({
      type: 'HIGHLIGHT_REMOVED',
      data: { id, platform }
    }).catch(() => {});
  }

  // ── 清除所有高亮 ──
  function clearAllHighlights() {
    if (USE_CSS_HL) {
      ['adopt', 'ref', 'reject', 'note'].forEach(k => CSS.highlights.get(`fc-${k}`)?.clear());
    }
    cssHlRanges.clear();
    highlightRecords.clear();
    document.querySelectorAll('mark.fc-hl-mark').forEach(m => {
      const p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    });
  }

  function restoreHighlight(data) {
    const id = data?.id;
    const label = data?.label;
    const text = String(data?.text || '').trim();
    if (!id || !label || !text || highlightRecords.has(id)) return false;
    if (!LABELS.some(l => l.key === label)) return false;

    const range = findTextRanges(document.body, text, 1)[0];
    if (!range) return false;
    const record = { label, text, sourceRange: range.cloneRange(), blockId: data.blockId || '' };
    highlightRecords.set(id, record);
    let ok = false;
    if (USE_CSS_HL) ok = paintCssHighlight(id, record);
    if (!ok) ok = applyMark(range, label, id);
    if (!ok) highlightRecords.delete(id);
    return ok;
  }

  function restoreHighlights(items, attempt = 0) {
    const list = Array.isArray(items) ? items : [];
    const pending = [];
    for (const item of list) {
      if (!restoreHighlight(item)) pending.push(item);
    }
    if (pending.length && attempt < 8) {
      setTimeout(() => restoreHighlights(pending, attempt + 1), 700);
    }
  }

  // ── 接收来自 flowchat.js 的指令（通过 SEND_TO_IFRAME 路由过来）──
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'REMOVE_HIGHLIGHT')    removeHighlightById(msg.highlightId);
    if (msg.type === 'CLEAR_ALL_HIGHLIGHTS') clearAllHighlights();
    if (msg.type === 'RESTORE_HIGHLIGHTS')   restoreHighlights(msg.highlights);
  });

  console.log(`[FC Highlight] 已注入 ${platform}${USE_CSS_HL ? ' (CSS Highlights API)' : ' (mark 降级)'}`);
})();
