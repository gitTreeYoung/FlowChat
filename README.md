# FlowChat

**同时与 19 个顶尖 AI 对话，高亮筛选，一键融合输出的 Chrome/Edge 浏览器扩展。**

FlowChat 解决的核心问题：不同 AI 对同一问题的回答质量差异极大，但用户只能逐个打开标签页对比。FlowChat 把多个 AI 并排嵌入一个页面，用户输入一次，所有 AI 同时回复；再通过高亮标注筛选最优内容，最终融合成一份高质量答案。

---

## 功能全览

### 一、多 AI 同屏对话

在同一个界面嵌入多个 AI 平台的完整对话窗口，无需切换标签页。用户已登录的账号状态自动继承，零额外配置。

- 顶栏输入框一次输入，同步发送给所有已加载的 AI 平台
- 支持 `Cmd/Ctrl + Enter` 发送，`Enter` 换行
- 支持 19 个平台：Claude、ChatGPT、Gemini、Grok、豆包、Kimi、DeepSeek、秘塔AI搜索、千问、元宝、知乎直答、智谱清言、MiniMax、Poe、Copilot、Z.ai、Qwen Chat、文心一言、Perplexity

### 二、多实例支持

同一平台可同时打开多个独立窗口（例如：同一问题在两个不同 Claude 会话下的表现对比），实例间会话互不干扰。

### 三、消息队列

若某个 AI 正在生成回复，新消息自动进入该平台的等待队列，生成完毕后自动发出，无需手动等待。顶栏角标实时显示待发数量，可展开查看详情或取消单条。

### 四、布局模式

**轮播模式**：固定可见列数（1-5），超出部分左右翻页浏览，侧边显示隐藏平台数量提示。  
**网格模式**：所有平台平铺显示，适合平台数量少的场景。

### 五、聚焦模式

点击列顶部的 `⤢` 按钮，将某个 AI 窗口全屏展示，专注阅读长回复。其他列隐藏但 DOM 保留，切回时会话完整。顶部工具栏保留刷新、外链、分列阅读等操作按钮，并可通过 `◀ ▶` 在各平台间滑动切换，全程不退出聚焦模式。

### 六、分列阅读

将 AI 的回复内容重排为多栏并排的报刊版式，减少上下滚动，适合阅读长篇回复。

- 当前支持 Claude、ChatGPT、Gemini
- 支持 1-4 栏自由切换，底部显示当前页码 / 总页数
- 可配合聚焦模式使用，全屏沉浸式阅读
- 左右方向键或 `◀ ▶` 按钮翻页，退出后 iframe 会话状态不受影响

### 七、窗口排序

拖拽调整 AI 窗口的排列顺序，通过 CSS `order` 属性实现，不移动 DOM 节点，iframe 不会重新加载。

### 八、高亮标注

在任意 AI 回复中划词，弹出浮动工具条，按用途打标：

| 颜色 | 类型 | 在融合中的作用 |
|------|------|--------------|
| 绿色 | 采纳 | 作为主体框架 |
| 橙色 | 参考 | 改写后融入 |
| 红色 | 拒绝 | 严格排除 |
| 蓝色 | 批注 | 充分尊重 |

所有标注汇总在顶栏「高亮面板」，支持按来源平台筛选、单条删除、全部清除。

### 九、融合生成

完成标注后，一键将多家 AI 的精华内容融合为一份输出。FlowChat 按标注类型自动组织 Prompt，发送到用户指定的目标 AI 窗口，去除 AI 常见套话，输出专业、简练、直接。

### 十、元素屏蔽

可视化选取并永久屏蔽 AI 平台界面中的广告、导航栏、推荐内容等干扰元素。屏蔽规则持久保存，刷新后自动重新注入。

### 十一、自定义选择器（Picker）

当内置选择器无法识别某平台的输入框或发送按钮时（AI 平台改版后常见），可点选界面元素手动校准，配置持久保存。

### 十二、Claude 友好 / 编程接口

开启「连接 Claude Code」后，`window.FlowChatAPI` 自动挂载，支持在 Claude Code 或 DevTools 中：

- 向所有 AI 并发提问并等待全部回复
- 指定部分平台发送
- 读取结构化回复结果
- 全程自动化，无需人工介入

---

## Claude Code Skill 安装

在 Claude Code 中安装 FlowChat Skill，一行命令即可向所有 AI 并发提问：

```bash
curl -fsSL https://raw.githubusercontent.com/gitTreeYoung/FlowChat/main/flowchat.md \
  -o ~/.claude/skills/flowchat.md
```

安装后在 Claude Code 中使用 `/flowchat` 即可调用，或直接执行：

```bash
agent-browser --auto-connect eval "(async function(){
  const r = await window.FlowChatAPI.ask('你的问题', { timeout: 120000 });
  return JSON.stringify(r.responses, null, 2);
})()"
```

查看完整 Skill 文档：[flowchat.md](./flowchat.md)

---

## 安装扩展

> 正在准备上架 Chrome Web Store，敬请期待。

---

## 反馈与建议

欢迎在 [Issues](https://github.com/gitTreeYoung/FlowChat/issues) 提交问题、功能建议或使用反馈。
