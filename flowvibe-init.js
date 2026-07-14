/**
 * FlowVibe SDK 接入 — FlowChat 业务链路 trace 采集
 *
 * 接入点（Spike 3 已评估）：
 *  stage: input_message / dispatch_start / send_to_platform / store_response / synthesis_gen
 *  branch: queue_process
 *
 * 使用方式：在 flowchat.html 中，先加载 flowvibe-sdk.js，再加载 flowchat.js，
 * 最后加载本文件（需要访问 flowchat.js 中已声明的函数）。
 */
(function () {
  const enabled = new URLSearchParams(location.search).get('flowvibe') === '1' ||
    localStorage.getItem('flowvibe') === '1';
  if (!enabled) return;

  if (window.__flowvibe_instrumented__) return;
  window.__flowvibe_instrumented__ = true;

  if (typeof FlowVibe === 'undefined') {
    console.error('[FlowVibe] SDK not loaded. Make sure flowvibe-sdk.js is loaded before flowvibe-init.js');
    return;
  }

  // 初始化：把 trace 发到本地 Console API
  FlowVibe.init({
    projectId: 'flowchat',
    version: '1.1.0',
    endpoint: 'http://localhost:8000',
    debug: true,
  });

  console.log('[FlowVibe] Initialized. Instrumenting FlowChat stages...');

  // ── Stage 1: 消息输入 ────────────────────────────────────────────────────────
  const _origSendMessage = sendMessage;
  sendMessage = FlowVibe.stage(
    {
      id: 'input_message',
      name: '消息输入',
      businessMeaning: '用户提交消息，清空输入框并启动多平台分发',
    },
    _origSendMessage
  );

  // ── Stage 2: 消息分发 ────────────────────────────────────────────────────────
  const _origDispatchOrQueue = dispatchOrQueue;
  dispatchOrQueue = FlowVibe.stage(
    {
      id: 'dispatch_start',
      name: '消息分发',
      businessMeaning: '对每个平台判断：立即发送 / 入队 / 等待 bridge 就绪',
    },
    _origDispatchOrQueue
  );

  // ── Stage 3: 平台投递 ────────────────────────────────────────────────────────
  const _origSendToPlatform = sendToPlatform;
  sendToPlatform = FlowVibe.stage(
    {
      id: 'send_to_platform',
      name: '平台投递',
      businessMeaning: '查找 iframe frame，匹配输入框选择器，executeScript 注入消息到 AI 平台',
    },
    _origSendToPlatform
  );

  // ── Branch: 队列处理决策 ─────────────────────────────────────────────────────
  // processQueue 决定是否从队列中取出待发消息：有待发 → triggered
  const _origProcessQueue = processQueue;
  processQueue = FlowVibe.stage(
    {
      id: 'queue_process',
      name: '队列处理',
      businessMeaning: '平台完成生成后检查是否有待发消息，FIFO 出队发送',
    },
    _origProcessQueue
  );

  // ── Stage: 融合生成 ──────────────────────────────────────────────────────────
  const _origDoSynthesis = doSynthesis;
  doSynthesis = FlowVibe.stage(
    {
      id: 'synthesis_gen',
      name: '融合生成',
      businessMeaning: '收集高亮或全量回复，构建 prompt，新建实例发给目标 AI',
    },
    _origDoSynthesis
  );

  console.log('[FlowVibe] FlowChat instrumentation complete. 5 stages wrapped.');
})();
