<script setup>
import { ref } from 'vue';

const videoUrl = ref(''); // 输入框现在绑定的是视频URL
const loading = ref(false);
const loadingText = ref(''); // 用于显示加载状态的文本
const resultText = ref('');
const isResultVisible = ref(false);

const apiKey = import.meta.env.VITE_ZHIPU_API_KEY;

async function generateSummary() {
  if (!videoUrl.value.trim()) {
    alert('请粘贴视频链接！');
    return;
  }
  
  loading.value = true;
  isResultVisible.value = false;
  resultText.value = '';

  try {
    // --- 第一阶段：调用我们的云函数，获取字幕 ---
    loadingText.value = '正在解析视频，提取字幕中...';
    // 注意这里的API路径，Vercel会自动映射
    const subtitleResponse = await fetch(`/api/get-subtitle?url=${encodeURIComponent(videoUrl.value)}`);
    
    if (!subtitleResponse.ok) {
      const errorData = await subtitleResponse.json();
      throw new Error(`字幕提取失败: ${errorData.error}`);
    }
    
    const subtitleData = await subtitleResponse.json();
    const subtitleText = subtitleData.subtitle;

    if (!subtitleText || subtitleText.trim() === '') {
      throw new Error('未能提取到有效字幕，请检查视频是否提供字幕。');
    }

    // --- 第二阶段：将获取到的字幕，发送给AI进行总结 ---
    loadingText.value = '字幕提取成功，正在深度阅读并总结...';
    const prompt = `你是一个世界顶级的学习专家...（我们之前的完美Prompt）...【需要你总结的全文如下】\n『${subtitleText}』`;
    
    const aiResponse = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "glm-4",
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!aiResponse.ok) {
        const errorBody = await aiResponse.json();
        throw new Error(errorBody.error?.message || `HTTP error! status: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    resultText.value = aiData.choices[0].message.content;
    isResultVisible.value = true;

  } catch (error) {
    console.error("处理失败:", error);
    alert(`处理失败: ${error.message}`);
  } finally {
    loading.value = false;
    loadingText.value = '';
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
        <!-- 输入框现在是单行的，用于粘贴URL -->
        <input 
          type="url"
          v-model="videoUrl" 
          placeholder="请在此处粘贴B站或YouTube视频链接..."
          class="url-input"
        />
      </section>
      
      <button @click="generateSummary" :disabled="loading" class="action-button">
        <span v-if="!loading" class="button-content">
          <svg>...</svg>
          开始划重点
        </span>
        <span v-else class="loading-state">
          <svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
          {{ loadingText }}
        </span>
      </button>

      <!-- ... 结果展示区和页脚部分保持不变 ... -->
    </main>
  </div>
</template>

<style>
  /* 我们需要为新的URL输入框增加样式 */
  .url-input {
    width: 100%;
    background: #0d1117;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    color: var(--text-color);
    font-size: 1rem;
    transition: all 0.2s ease;
  }
  .url-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-glow-color);
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