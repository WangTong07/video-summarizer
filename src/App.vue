<script setup>
import { ref, computed } from 'vue';

const userInput = ref('');
const loading = ref(false);
const resultText = ref('');
const isResultVisible = ref(false);

const apiKey = import.meta.env.VITE_ZHIPU_API_KEY;

const textareaRows = computed(() => {
  const newlines = (userInput.value.match(/\n/g) || []).length;
  return Math.max(15, newlines + 1); // 提供一个更大的初始输入框
});

async function generateSummary() {
  if (!userInput.value.trim()) {
    alert('请粘贴需要总结的内容！');
    return;
  }
  loading.value = true;
  isResultVisible.value = false;

  // 为“课代表”量身定制的全新Prompt
  const prompt = `你是一个世界顶级的学习专家和情报分析师，你的任务是为我阅读并深度总结以下提供的长篇内容。

  【你的输出必须严格遵循以下格式】
  **1. 核心摘要 (一句话总结):**
  用一句话，精准地概括全文的核心主旨或最终结论。

  **2. 章节要点 (Key Points):**
  以数字列表的形式，分点提炼出文中的5-8个关键论点、核心步骤或重要信息。每一条要点都应该简洁、清晰、易于理解。

  **3. 金句摘录 (Golden Quotes):**
  找出并列出文中1-3句最具有启发性、最震撼、或最值得反复回味的原话。

  【需要你总结的全文如下】
  『${userInput.value}』

  请开始你的分析和总结。`;

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "glm-4", // 建议使用更新、更强大的模型处理长文本
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    resultText.value = data.choices[0].message.content;
    isResultVisible.value = true;
  } catch (error) {
    console.error("请求AI API失败:", error);
    alert(`生成摘要时遇到问题: ${error.message}`);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="page-wrapper">
    <div class="background-texture"></div>
    <main class="main-container">
      <header class="card-header">
        <h1 class="main-title">AI 视频/文章“课代表”</h1>
        <p class="subtitle">一小时内容，三分钟掌握核心</p>
      </header>
      
      <section class="input-section">
        <textarea 
          v-model="userInput" 
          :rows="textareaRows" 
          placeholder="请在此处粘贴完整的视频字幕文稿或长篇文章内容..."
        ></textarea>
      </section>
      
      <button @click="generateSummary" :disabled="loading" class="action-button">
        <span v-if="!loading" class="button-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-9"></path><path d="M3 14h9a2 2 0 0 0 0-4H3z"></path></svg>
          开始划重点
        </span>
        <span v-else class="loading-state">
          <svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
          深度阅读中...
        </span>
      </button>

      <transition name="fade">
        <section v-if="isResultVisible" class="result-section">
          <div class="result-header">
            <h3>AI 课代表总结</h3>
          </div>
          <div class="result-content" v-html="resultText.replace(/\n/g, '<br/>')"></div>
        </section>
      </transition>
    </main>
    
    <footer class="page-footer">
      <p>由 <a href="https://github.com/WangTong07" target="_blank">WangTong07</a> 匠心打造</p>
    </footer>
  </div>
</template>

<style>
/* 这份CSS复用了我们之前暗色科技风的设计，并做了微调 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --bg-color: #0d1117;
  --card-bg-color: #161b22;
  --text-color: #c9d1d9;
  --text-dim-color: #8b949e;
  --border-color: rgba(255, 255, 255, 0.1);
  --primary-color: #58a6ff; /* 换一个冷静的蓝色 */
  --primary-glow-color: rgba(88, 166, 255, 0.3);
}
*, *::before, *::after { box-sizing: border-box; }
body { font-family: var(--font-sans); background-color: var(--bg-color); color: var(--text-color); margin: 0; }
.page-wrapper { width: 100%; min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; }
.background-texture { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(ellipse 80% 80% at 50% -20%,rgba(120,119,198,0.15), hsla(0,0%,100%,0)); opacity: 0.5; z-index: -1; }
.main-container { width: 100%; max-width: 720px; background-color: var(--card-bg-color); border: 1px solid var(--border-color); border-radius: 24px; padding: 2.5rem; box-shadow: 0 0 50px rgba(0,0,0,0.2), inset 0 0 0 1px var(--border-color); display: flex; flex-direction: column; gap: 2rem; }
.card-header { text-align: center; }
.main-title { font-size: 2.5rem; font-weight: 800; margin: 0 0 0.5rem; color: #f0f6fc; letter-spacing: -1px; }
.subtitle { font-size: 1rem; color: var(--text-dim-color); margin: 0; }
textarea {
  width: 100%;
  background: #0d1117;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  color: var(--text-color);
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s ease;
}
textarea:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-glow-color); }
.action-button { width: 100%; padding: 1.125rem; border: none; border-radius: 12px; color: #0d1117; font-size: 1.125rem; font-weight: 700; cursor: pointer; background: var(--primary-color); box-shadow: 0 0 25px var(--primary-glow-color); transition: all 0.2s ease-in-out; }
.action-button:hover:not(:disabled) { transform: translateY(-3px) scale(1.02); box-shadow: 0 0 35px var(--primary-glow-color); }
.action-button:disabled { background: #30363d; box-shadow: none; color: var(--text-dim-color); cursor: not-allowed; }
.button-content, .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
.result-section { margin-top: 1rem; background: var(--card-bg-color); border: 1px solid var(--border-color); border-radius: 16px; padding: 2rem; }
.result-header { margin-bottom: 1.5rem; }
.result-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #f0f6fc; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; }
.result-content { line-height: 1.8; font-size: 1rem; }
.page-footer { text-align: center; color: var(--text-dim-color); margin-top: 2rem; }
.page-footer a { color: var(--text-dim-color); font-weight: 500; text-decoration: none; }
.page-footer a:hover { color: var(--primary-color); }
.spinner { animation: rotate 2s linear infinite; width: 24px; height: 24px; }
.path { stroke: #0d1117; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }
@keyframes rotate { 100% { transform: rotate(360deg); } }
@keyframes dash { 0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; } 100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 768px) { .main-container { padding: 1.5rem; } .card-header h1 { font-size: 1.75rem; } }
</style>