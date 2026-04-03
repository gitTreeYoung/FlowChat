<div align="center">

<img src="https://raw.githubusercontent.com/gitTreeYoung/FlowChat/main/icons/icon128.png" width="80" alt="FlowChat Logo">

# FlowChat

**同时与 19 个顶尖 AI 对话，高亮筛选，一键融合输出**

[中文](#中文) · [English](#english)

[![GitHub Stars](https://img.shields.io/github/stars/gitTreeYoung/FlowChat?style=flat-square)](https://github.com/gitTreeYoung/FlowChat/stargazers)
[![Issues](https://img.shields.io/github/issues/gitTreeYoung/FlowChat?style=flat-square)](https://github.com/gitTreeYoung/FlowChat/issues)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 中文

FlowChat 解决的核心问题：不同 AI 对同一问题的回答质量差异极大，但用户只能逐个打开标签页对比。FlowChat 把多个 AI 并排嵌入一个页面，用户输入一次，所有 AI 同时回复；再通过高亮标注筛选最优内容，最终融合成一份高质量答案。

### 功能全览

**多 AI 同屏对话**  
在同一界面嵌入多个 AI 平台的完整对话窗口，无需切换标签页。用户已登录的账号状态自动继承，零额外配置。一次输入，同步发送给所有 AI。

支持 19 个平台：Claude、ChatGPT、Gemini、Grok、豆包、Kimi、DeepSeek、秘塔AI搜索、千问、元宝、知乎直答、智谱清言、MiniMax、Poe、Copilot、Z.ai、Qwen Chat、文心一言、Perplexity

**多实例支持**  
同一平台可同时打开多个独立窗口，实例间会话互不干扰。适合对比同平台不同会话、不同 System Prompt 下的表现。

**消息队列**  
AI 生成中时新消息自动排队，生成完毕立即发出。顶栏角标实时显示待发数量，可展开管理。

**布局模式**  
轮播模式：固定可见列数（1-5），超出部分左右翻页。网格模式：所有平台平铺显示。

**聚焦模式**  
将某个 AI 窗口全屏展示，专注阅读。其他列隐藏但 DOM 保留，会话完整。顶部工具栏保留操作按钮，`◀ ▶` 可在各平台间切换，全程不退出聚焦模式。

**分列阅读**  
将 AI 回复重排为多栏并排的报刊版式，减少上下滚动，适合阅读长篇内容。支持 1-4 栏自由切换，可与聚焦模式配合使用。当前支持 Claude、ChatGPT、Gemini。

**窗口排序**  
拖拽调整 AI 窗口排列顺序，通过 CSS `order` 实现，不移动 DOM，iframe 不重新加载。

**高亮标注**  
划词弹出浮动工具条，按用途打标：绿色「采纳」、橙色「参考」、红色「拒绝」、蓝色「批注」。所有标注汇总在高亮面板，支持筛选、删除、清除。

**融合生成**  
完成标注后，一键将多家 AI 的精华融合为一份输出。按标注类型自动组织 Prompt，发送到目标 AI 窗口，去除 AI 套话，输出专业简练。

**元素屏蔽**  
可视化选取并永久屏蔽 AI 界面中的广告、导航栏等干扰元素，刷新后自动重新注入。

**自定义选择器（Picker）**  
当内置选择器无法识别某平台的输入框或发送按钮时，点选界面元素手动校准，配置持久保存。

**Claude 友好 / 编程接口**  
开启「连接 Claude Code」后，`window.FlowChatAPI` 自动挂载，支持在 Claude Code 中向所有 AI 并发提问、等待全部回复、读取结构化结果，全程自动化。

### Claude Code Skill 安装

```bash
curl -fsSL https://raw.githubusercontent.com/gitTreeYoung/FlowChat/main/flowchat.md \
  -o ~/.claude/skills/flowchat.md
```

安装后在 Claude Code 中使用 `/flowchat` 调用，或直接执行：

```bash
agent-browser --auto-connect eval "(async function(){
  const r = await window.FlowChatAPI.ask('你的问题', { timeout: 120000 });
  return JSON.stringify(r.responses, null, 2);
})()"
```

完整 Skill 文档：[flowchat.md](./flowchat.md)

### 安装扩展

> 正在准备上架 Chrome Web Store，敬请期待。

---

## English

FlowChat solves a core problem: different AIs give wildly different answers to the same question, but users are stuck switching between tabs to compare. FlowChat embeds multiple AIs side-by-side in one page — type once, all AIs reply simultaneously. Then highlight the best parts and merge them into one high-quality answer.

### Features

**Multi-AI Side-by-Side**  
Embed full AI chat windows in one interface. Your existing login sessions are inherited automatically — no extra setup. One input, sent to all AIs at once.

Supports 19 platforms: Claude, ChatGPT, Gemini, Grok, Doubao, Kimi, DeepSeek, Metaso, Qwen, Yuanbao, Zhida, ChatGLM, MiniMax, Poe, Copilot, Z.ai, Qwen Chat, Yiyan, Perplexity

**Multi-Instance**  
Open multiple independent windows for the same platform to compare responses across different sessions or system prompts.

**Message Queue**  
If an AI is still generating, new messages are queued and sent automatically once it finishes. A badge shows pending count; expand to manage the queue.

**Layout Modes**  
Carousel: fixed visible columns (1–5), scroll through the rest. Grid: all platforms visible at once.

**Focus Mode**  
Expand one AI window to full screen for focused reading. Other columns hide but their DOM (and sessions) stay intact. Use `◀ ▶` to switch platforms without leaving focus mode.

**Split Reading**  
Reflow AI responses into a multi-column newspaper layout, reducing scrolling for long replies. Supports 1–4 columns, works with focus mode. Currently available for Claude, ChatGPT, and Gemini.

**Window Ordering**  
Drag to reorder AI windows. Implemented via CSS `order` — no DOM moves, no iframe reloads.

**Highlight & Annotate**  
Select text in any AI reply to get a floating toolbar. Tag as: green Accept, orange Reference, red Reject, blue Annotate. All highlights aggregate in the highlight panel.

**Synthesis**  
After annotating, merge highlights from multiple AIs into one polished output. FlowChat builds a structured prompt from your tags and sends it to your chosen AI window.

**Element Blocker**  
Visually select and permanently hide distracting UI elements (ads, navbars, etc.) from any AI platform. Rules persist and re-inject on reload.

**Custom Selector (Picker)**  
When built-in selectors fail to find a platform's input or send button (common after AI site redesigns), click to manually calibrate. Settings are saved per platform.

**Claude-Friendly API**  
Enable "Connect Claude Code" to expose `window.FlowChatAPI`. Use it in Claude Code to query all AIs in parallel, wait for all responses, and get structured results — fully automated.

### Claude Code Skill Install

```bash
curl -fsSL https://raw.githubusercontent.com/gitTreeYoung/FlowChat/main/flowchat.md \
  -o ~/.claude/skills/flowchat.md
```

Then use `/flowchat` in Claude Code, or run directly:

```bash
agent-browser --auto-connect eval "(async function(){
  const r = await window.FlowChatAPI.ask('your question', { timeout: 120000 });
  return JSON.stringify(r.responses, null, 2);
})()"
```

Full Skill docs: [flowchat.md](./flowchat.md)

### Install Extension

> Chrome Web Store listing coming soon.

---

## Feedback

[Open an Issue](https://github.com/gitTreeYoung/FlowChat/issues) for bugs, feature requests, or general feedback.

---

## Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=gitTreeYoung/FlowChat&type=Date)](https://star-history.com/#gitTreeYoung/FlowChat&Date)

</div>
