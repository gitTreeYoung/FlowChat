# FlowChat

**多 AI 同屏聊天** — 让你在同一个界面同时与 Claude、Gemini、ChatGPT、DeepSeek 等 19 个顶尖 AI 对话，一键同发，对比回复，融合智慧。

---

## 产品特性

- **同屏多模型** — 最多同时展示 19 个 AI 渠道，无需切换标签页
- **一键同发** — 输入一条消息，同时发送给所有 AI，并发获取回复
- **消息队列** — 自动排队，上一条完成后立即发送下一条
- **高亮标注** — 在 AI 回复中划词高亮，积累关键信息
- **Synthesis 融合** — 将多家 AI 的精华融合成一份输出
- **Claude 友好** — 开启开发者模式后，Claude Code 可通过 `window.FlowChatAPI` 自动化调用所有 AI 渠道

---

## 安装

> 扩展正在准备上架 Chrome Web Store，敬请期待。

---

## Claude Code Skill

在 Claude Code 中使用 FlowChat Skill，可自动向所有 AI 并发提问并汇总回复：

```bash
# 在 Claude Code 的 CLAUDE.md 或 Settings 中引用
# https://github.com/gitTreeYoung/FlowChat/blob/main/flowchat.md
```

查看完整 Skill 文档：[flowchat.md](./flowchat.md)

### 快速上手

```bash
# 1. 确认 FlowChat 已打开且开启「连接 Claude Code」
agent-browser --auto-connect eval "(function(){
  return window.FlowChatAPI?._active ? 'Ready' : 'Please enable in FlowChat settings';
})()"

# 2. 向所有 AI 提问，自动等待全部回复
agent-browser --auto-connect eval "(async function(){
  const r = await window.FlowChatAPI.ask('你的问题', { timeout: 120000 });
  return JSON.stringify(r.responses, null, 2);
})()"
```

---

## 反馈与建议

欢迎在 [Issues](https://github.com/gitTreeYoung/FlowChat/issues) 提交问题、功能建议或使用反馈。

---

*扩展代码为私有仓库，本仓库用于产品介绍、Skill 分发和社区交流。*
