<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const userInput = ref('');
const loading = ref(false);
const reportResult = ref('');
const isResultVisible = ref(false);
const reportType = ref('weekly');
const reporterName = ref('');
const isCopied = ref(false);

onMounted(() => {
  const savedName = localStorage.getItem('reporterName');
  if (savedName) {
    reporterName.value = savedName;
  }
});

watch(reporterName, (newName) => {
  localStorage.setItem('reporterName', newName);
});

const apiKey = import.meta.env.VITE_ZHIPU_API_KEY;

const textareaRows = computed(() => {
  const newlines = (userInput.value.match(/\n/g) || []).length;
  return Math.max(8, newlines + 1);
});

// 【最新升级】使用计算属性，实现placeholder的动态切换
const placeholderText = computed(() => {
  if (reportType.value === 'daily') {
    return `想到什么，就写什么... 今天的碎片都丢进来。

例如：
- 上午开会，定了V2.1需求
- 下午修了3个bug
- 晚上写了文档`;
  } else {
    return `回顾一周，想到什么写什么... 把脑海里的片段拼起来。

例如：
- 周一，和产品开会对了下季度目标
- 周二周三，集中开发新功能
- 周四，解决了两个线上问题
- 周五，项目复盘，写总结`;
  }
});

async function generateReport() {
  if (!userInput.value.trim()) {
    alert('请输入你的工作内容！');
    return;
  }
  if (!reporterName.value.trim()) {
    alert('请输入你的名字，方便AI生成报告！');
    return;
  }
  
  loading.value = true;
  isResultVisible.value = false;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const formattedDate = `${year}年${month}月${day}日`;

  const baseInstruction = `你是一位顶级的公文写作专家和排版大师。请将以下工作记录，整理成一份专业、正式、结构清晰的报告。\n\n【极其重要的排版规则】\n1. 绝对禁止使用任何Markdown语法（如'*'、'#'、'**'等）。\n2. 所有输出都必须是纯文本，以便用户能直接复制粘贴到微信或钉钉。\n3. 标题：使用【标题内容】的格式，并且标题前后必须有一个空行。\n4. 列表：使用数字列表（如“1.”、“2.”），每一项占一行。\n5. 段落：段落之间必须用一个完整的空行隔开。\n`;

  let prompt = '';
  if (reportType.value === 'daily') {
    prompt = `${baseInstruction}\n【报告内容要求】\n请严格按照以下信息填充报告头：\n报告类型：工作日报\n报告日期：${formattedDate}\n汇 报 人：${reporterName.value}\n\n报告正文需要包含以下三个部分：【今日完成事项】、【遇到的问题与风险】、【明日工作计划】。\n\n我的工作记录是：『${userInput.value}』`;
  } else {
    prompt = `${baseInstruction}\n【报告内容要求】\n请严格按照以下信息填充报告头：\n报告类型：工作周报\n报告日期：${formattedDate} (请根据此日期推算出本周的起止日期范围)\n汇 报 人：${reporterName.value}\n\n报告正文需要包含以下几个部分：【本周核心工作概览】、【主要成果与数据支撑】、【遇到的挑战与解决方案】、【个人成长与反思】、【下周重点计划】。\n\n我的工作记录是：『${userInput.value}』`;
  }

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "glm-3-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    reportResult.value = data.choices[0].message.content;
    isResultVisible.value = true;

  } catch (error) {
    console.error("请求AI API失败:", error);
    alert(`生成报告时遇到问题: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

async function copyResult() {
  if (!reportResult.value) return;
  try {
    await navigator.clipboard.writeText(reportResult.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
    alert('复制失败，您的浏览器可能不支持此功能。');
  }
}
</script>

<template>
  <div class="page-wrapper">
    <div class="aurora-background">
      <div class="aurora-shape shape-1"></div>
      <div class="aurora-shape shape-2"></div>
      <div class="aurora-shape shape-3"></div>
    </div>

    <main class="content-area">
      <div class="glass-card">
          <header class="card-header">
            <div class="logo">AI</div>
            <h1>AI 智能报告神器</h1>
            <p>输入你的流水账，收获一份惊艳上级的专业报告</p>
          </header>
          
          <div class="report-type-selector">
            <button :class="{ active: reportType === 'daily' }" @click="reportType = 'daily'">日报</button>
            <button :class="{ active: reportType === 'weekly' }" @click="reportType = 'weekly'">周报</button>
          </div>
          
          <section class="reporter-input-section">
            <label for="reporterName">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              汇报人
            </label>
            <input 
              type="text" 
              id="reporterName" 
              v-model="reporterName" 
              placeholder="请输入你的名字"
            />
          </section>
          
          <section class="input-container">
            <textarea v-model="userInput" :rows="textareaRows" :placeholder="placeholderText"></textarea>
          </section>
          
          <button @click="generateReport" :disabled="loading" class="action-button">
            <span v-if="!loading">生成我的专属报告</span>
            <span v-else class="loading-state">
              <svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle></svg>
              正在为您创作...
            </span>
          </button>
      </div>
    </main>
    
    <footer class="page-footer">
      <p>由 <a href="https://gitee.com/wangtong07" target="_blank">WangTong07</a> 基于大语言模型匠心打造</p>
    </footer>
    
    <transition name="slide-fade">
      <div v-if="isResultVisible" class="result-overlay">
        <div class="result-card">
              <div class="result-header">
                  <h3>生成结果</h3>
                  <button @click="copyResult" class="copy-btn" :class="{ 'copied': isCopied }">
                    <span v-if="!isCopied">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      一键复制
                    </span>
                    <span v-else>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      已复制！
                    </span>
                  </button>
                  <button @click="isResultVisible=false" class="close-btn">×</button>
              </div>
              <div class="result-content">
                  <pre>{{ reportResult }}</pre>
              </div>
          </div>
      </div>
    </transition>
  </div>
</template>

<style>
/* 包含了所有模块的最终样式 */
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --color-text: #e2e8f0;
  --color-text-dim: #94a3b8;
  --color-bg: #0f172a;
  --color-glass-bg: rgba(30, 41, 59, 0.75);
  --color-border: rgba(148, 163, 184, 0.2);
  --color-primary: #818cf8;
  --color-success: #22c55e;
  --color-aurora-1: #7c3aed;
  --color-aurora-2: #4f46e5;
  --color-aurora-3: #db2777;
}
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: var(--font-sans); background-color: var(--color-bg); color: var(--color-text); }
.page-wrapper { position: relative; width: 100%; min-height: 100%; display: grid; place-items: center; padding: 2rem 1rem; overflow-x: hidden; }
.aurora-background { position: fixed; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; z-index: -1; }
.content-area { width: 100%; max-width: 680px; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 10; }
.glass-card { width: 100%; background: var(--color-glass-bg); border: 1px solid var(--color-border); border-radius: 24px; padding: 2.5rem; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); display: flex; flex-direction: column; gap: 1.75rem; }
.page-footer { margin-top: 1.5rem; width: 100%; text-align: center; color: var(--color-text-dim); font-size: 0.875rem; }
.aurora-shape { position: absolute; filter: blur(120px); opacity: 0.3; border-radius: 50%; animation: move 20s infinite alternate; }
.shape-1 { width: 500px; height: 500px; background-color: var(--color-aurora-1); top: -20%; left: -20%; }
.shape-2 { width: 400px; height: 400px; background-color: var(--color-aurora-2); top: 30%; right: -10%; animation-delay: 5s; }
.shape-3 { width: 450px; height: 450px; background-color: var(--color-aurora-3); bottom: -25%; left: 10%; animation-delay: 10s; }
@keyframes move { from { transform: translate(0, 0) rotate(0deg); } to { transform: translate(100px, 50px) rotate(60deg); } }
.result-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 100; }
.result-card { width: 90%; max-width: 800px; height: 80vh; background: var(--color-glass-bg); border: 1px solid var(--color-border); border-radius: 24px; padding: 2rem; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); display: flex; flex-direction: column; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-shrink: 0; gap: 1rem; }
.result-header h3 { flex-grow: 1; margin: 0; font-size: 1.5rem; }
.copy-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: 1px solid var(--color-border); background-color: rgba(148, 163, 184, 0.1); color: var(--color-text-dim); font-size: 0.875rem; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; }
.copy-btn:hover { background-color: rgba(148, 163, 184, 0.2); color: var(--color-text); }
.copy-btn.copied { background-color: var(--color-success); color: white; border-color: var(--color-success); }
.close-btn { background: none; border: none; font-size: 2.5rem; color: var(--color-text-dim); cursor: pointer; transition: color 0.3s ease; line-height: 1; padding: 0; }
.close-btn:hover { color: var(--color-text); }
.result-content { flex-grow: 1; overflow-y: auto; background: rgba(15, 23, 42, 0.7); border-radius: 8px; padding: 1.5rem; }
.result-content pre { white-space: pre-wrap; word-wrap: break-word; font-family: var(--font-sans); font-size: 1rem; line-height: 1.8; margin: 0; color: #cbd5e1; }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: scale(0.95) translateY(20px); }
.card-header { text-align: center; }
.logo { display: inline-block; background: linear-gradient(135deg, var(--color-aurora-1), var(--color-aurora-2)); color: white; width: 48px; height: 48px; border-radius: 12px; font-weight: 700; font-size: 1.5rem; line-height: 48px; margin-bottom: 1rem; }
.card-header h1 { font-size: 2rem; margin: 0; }
.card-header p { color: var(--color-text-dim); margin: 0.5rem 0 0; }
.report-type-selector { display: flex; justify-content: center; background-color: rgba(15, 23, 42, 0.5); padding: 0.375rem; border-radius: 12px; }
.report-type-selector button { flex: 1; padding: 0.75rem 1rem; border: none; background-color: transparent; color: var(--color-text-dim); font-size: 1rem; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; }
.report-type-selector button.active { background-color: var(--color-primary); color: white; box-shadow: 0 2px 10px rgba(129, 140, 248, 0.2); }
.reporter-input-section { display: flex; align-items: center; gap: 1rem; background-color: rgba(15, 23, 42, 0.5); padding: 0.75rem 1.25rem; border-radius: 16px; }
.reporter-input-section label { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; color: var(--color-text-dim); white-space: nowrap; }
.reporter-input-section input { width: 100%; background-color: transparent; border: none; color: var(--color-text); font-size: 1rem; padding: 0.25rem; }
.reporter-input-section input:focus { outline: none; }
.input-container textarea { width: 100%; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--color-border); border-radius: 12px; padding: 1rem; color: var(--color-text); font-size: 1rem; line-height: 1.6; resize: none; transition: all 0.3s ease; }
.input-container textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.3); }
.action-button { width: 100%; padding: 1rem; border: none; border-radius: 12px; background: linear-gradient(90deg, var(--color-primary), var(--color-aurora-2)); color: white; font-size: 1.125rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(129, 140, 248, 0.2); }
.action-button:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 7px 20px rgba(129, 140, 248, 0.3); }
.action-button:disabled { background: #334155; cursor: not-allowed; box-shadow: none; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
.page-footer a { color: var(--color-primary); text-decoration: none; font-weight: 500; transition: color 0.3s ease; }
.page-footer a:hover { color: white; }
.spinner { animation: rotate 2s linear infinite; width: 20px; height: 20px; }
.path { stroke: white; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }
@keyframes rotate { 100% { transform: rotate(360deg); } }
@keyframes dash { 0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; } 100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; } }
@media (max-width: 768px) { .content-container { padding: 1rem; } .glass-card { padding: 1.5rem; } .card-header h1 { font-size: 1.75rem; } .result-card { width: calc(100% - 2rem); height: 85vh; border-radius: 16px; padding: 1.5rem;} }
</style>