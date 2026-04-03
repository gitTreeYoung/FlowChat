---
name: flowchat
description: 通过 FlowChat 同时向全球顶尖 AI 渠道发送问题并自动获取回复，无需人工介入
---

你正在使用 **FlowChat AI 同屏聊天** 的编程接口（`window.FlowChatAPI`）。  
这个接口让你可以在自动化链路中，一次性向 Claude、Gemini、ChatGPT、DeepSeek 等多个顶尖 AI 并发提问，并结构化获取全部回复。

---

## 前置条件

1. Chrome 中 FlowChat 扩展页面已打开：
   ```
   chrome-extension://hgboemglnaipajcppcmhbgfncndmgbpk/flowchat.html
   ```
2. 设置 → 编程智能体集成 → **「连接 Claude Code」已开启**（`window.FlowChatAPI._active === true`）

---

## 连接检测

```bash
agent-browser --auto-connect eval "(function(){
  var api = window.FlowChatAPI;
  if (!api?._active) return 'FlowChatAPI 未启用，请在设置中开启「连接 Claude Code」';
  var platforms = api.getPlatforms();
  var status = api.getStatus();
  var connected = platforms.filter(p => status[p.key]?.connected).length;
  return 'FlowChatAPI 就绪，' + connected + '/' + platforms.length + ' 个平台已连接';
})()"
```

---

## 核心 API 用法

### 1. 一键提问并等待所有 AI 回复（推荐）

```bash
agent-browser --auto-connect eval "(async function(){
  var result = await window.FlowChatAPI.ask('在此填入你的问题', {timeout: 120000});
  return JSON.stringify(result.responses, null, 2);
})()"
```

返回格式：
```json
{
  "claude":   { "name": "Claude",   "text": "...", "ts": 1234567890 },
  "gemini":   { "name": "Gemini",   "text": "...", "ts": 1234567890 },
  "chatgpt":  { "name": "ChatGPT",  "text": "...", "ts": 1234567890 },
  "deepseek": { "name": "DeepSeek", "text": "...", "ts": 1234567890 }
}
```

---

### 2. 指定部分平台提问

```bash
agent-browser --auto-connect eval "(async function(){
  var result = await window.FlowChatAPI.ask('你的问题', {
    platforms: ['claude', 'gemini', 'chatgpt'],
    timeout: 90000
  });
  return JSON.stringify(result.responses, null, 2);
})()"
```

---

### 3. 分步控制（发送 + 异步等待）

```bash
# Step 1: 发送
agent-browser --auto-connect eval "(function(){
  window.FlowChatAPI.sendMessage('你的问题');
  return 'sent';
})()"

# Step 2: 等待完成
agent-browser --auto-connect eval "(async function(){
  var r = await window.FlowChatAPI.waitForCompletion({timeout: 120000});
  return JSON.stringify({completed: r.completed, timedOut: r.timedOut, platforms: Object.keys(r.responses)});
})()"

# Step 3: 获取回复
agent-browser --auto-connect eval "(function(){
  return JSON.stringify(window.FlowChatAPI.getResponses(), null, 2);
})()"
```

---

### 4. 查询平台状态

```bash
agent-browser --auto-connect eval "(function(){
  return JSON.stringify(window.FlowChatAPI.getStatus(), null, 2);
})()"
```

字段说明：`connected`（bridge 已连接）、`generating`（正在生成）、`hasResponse`（有回复）、`queued`（队列中消息数）

---

## 标准自动化工作流

当用户需要「汇集多家 AI 观点」时，按以下步骤执行：

1. **检测连接** — 运行连接检测命令，确认 FlowChatAPI 已启用
2. **发送问题** — 调用 `ask(question, {timeout: 120000})`
3. **等待回复** — `ask` 内部自动 waitForCompletion，无需额外操作
4. **处理结果** — 遍历 `result.responses`，过滤掉 `text` 为空的平台
5. **综合分析** — 比较各 AI 回复的差异，提炼共识与分歧，给出综合建议

```javascript
// 完整示例（在 agent-browser eval 中运行）
(async function() {
  const question = "请从三个角度分析..."; // 替换为实际问题
  const result = await window.FlowChatAPI.ask(question, { timeout: 120000 });
  
  const responses = result.responses;
  const summary = Object.entries(responses)
    .filter(([, v]) => v.text?.trim())
    .map(([k, v]) => `【${v.name}】\n${v.text.slice(0, 500)}`)
    .join('\n\n---\n\n');
  
  return summary || '暂无回复';
})()
```

---

## 注意事项

- `agent-browser --auto-connect` 连接的是用户已登录的 Chrome，AI 平台无需重新登录
- 若某平台 `connected: false`，说明该 iframe 尚未加载完成，稍等后重试
- 队列机制：若平台正在生成，消息会自动入队，上一条完成后自动发送
- 超时默认 120 秒；对于复杂推理任务（如 DeepSeek R1），建议设为 180 秒
