<script setup>
import { ref, onMounted } from 'vue';

// --- 状态变量 ---
const loading = ref(false);
const loadingText = ref('');
const resultText = ref('');
const isResultVisible = ref(false);

const apiKey = import.meta.env.VITE_ZHIPU_API_KEY;

// --- Transformers.js 相关变量 ---
let transcriber = null; // 用于存放语音识别模型的变量

// --- 核心函数 ---

// 1. 初始化AI模型 (页面加载时执行)
onMounted(async () => {
  try {
    // 动态导入 Transformers.js 的 pipeline 功能
    const { pipeline } = await import('@xenova/transformers');
    // 创建一个语音识别管道，使用轻量级的Whisper模型
    // 这个过程只在第一次加载时发生，模型会被浏览器缓存
    loadingText.value = '正在初始化本地AI引擎，首次加载较慢...';
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    loadingText.value = '本地AI引擎准备就绪！';
    setTimeout(() => { loadingText.value = ''; }, 2000);
  } catch (error) {
    console.error("模型加载失败:", error);
    loadingText.value = '本地AI引擎加载失败，请刷新页面重试。';
  }
});

// 2. 处理用户拖拽进来的文件
async function handleFileDrop(event) {
  // 阻止浏览器的默认行为
  event.preventDefault();
  if (loading.value) return;

  const files = event.dataTransfer.files;
  if (files.length === 0) {
    alert('请拖拽一个文件进来。');
    return;
  }
  
  const file = files[0];
  
  // 开始处理流程
  loading.value = true;
  isResultVisible.value = false;
  resultText.value = '';

  try {
    let extractedText = '';
    // 根据文件类型，选择不同的处理方式
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      // --- 处理音视频文件 ---
      loadingText.value = '正在本地解析音视频，这可能需要几分钟...';
      // 将文件转换为AudioBuffer，这是模型需要的格式
      const audioBuffer = await file.arrayBuffer();
      // 使用我们加载好的模型进行语音转文字
      const transcription = await transcriber(new Float32Array(audioBuffer), {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'chinese',
        task: 'transcribe',
      });
      extractedText = transcription.text;

    } else if (file.type === 'text/plain') {
      // --- 处理文本文档 ---
      loadingText.value = '正在读取文本文档...';
      extractedText = await file.text();

    } else {
      throw new Error(`暂不支持此文件类型: ${file.type}`);
    }

    if (!extractedText || extractedText.trim() === '') {
      throw new Error('未能从文件中提取到有效文本内容。');
    }

    // --- 将提取到的文本，发送给大模型进行总结 ---
    await generateSummary(extractedText);

  } catch (error) {
    console.error("文件处理失败:", error);
    alert(`文件处理失败: ${error.message}`);
    loading.value = false;
    loadingText.value = '';
  }
}

// 3. AI总结函数 (现在被handleFileDrop调用)
async function generateSummary(textContent) {
  loadingText.value = '文本提取成功，AI深度阅读中...';
  const prompt = `你是一个世界顶级的学习专家和情报分析师...（我们之前的完美Prompt）...【需要你总结的全文如下】\n『${textContent}』`;

  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "glm-4",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    resultText.value = markdownToHtml(data.choices[0].message.content);
    isResultVisible.value = true;
  } finally {
    loading.value = false;
    loadingText.value = '';
  }
}

// 辅助函数：将Markdown转为HTML用于显示
function markdownToHtml(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\n/g, '<br/>');
  return text;
}
</script>

<template>
  <div class="page-wrapper">
    <div class="background-texture"></div>
    <main class="main-container">
      <header class="card-header">
        <h1 class="main-title">本地AI知识助理</h1>
        <p class="subtitle">拖拽你的视频、音频、文档，让AI为你深度解析</p>
      </header>
      
      <!-- 【核心修改】全新的文件拖拽区 -->
      <section 
        class="drop-zone"
        @dragover.prevent
        @drop.prevent="handleFileDrop"
      >
        <div class="drop-zone-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-3-4-5.4-4-1.6 0-3.1.8-4.1 2.1-1.3-.6-2.9-.2-3.8 1.1-.9 1.2-.8 2.8.3 3.8.3.2.6.4.9.5-2.2.4-3.8 2.2-3.8 4.4 0 2.5 2 4.5 4.5 4.5h10.5c2.5 0 4.5-2 4.5-4.5 0-1-.3-1.9-.8-2.7z"></path><path d="M12 13v9"></path><path d="m9 17 3 3 3-3"></path></svg>
          <p class="drop-zone-title">将文件拖拽到此处</p>
          <p class="drop-zone-subtitle">支持视频 (mp4, mov)、音频 (mp3, wav)、文本 (txt) 文件</p>
        </div>
      </section>
      
      <div v-if="loading" class="loading-indicator">
          <svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
          <p>{{ loadingText }}</p>
      </div>

      <transition name="fade">
        <section v-if="isResultVisible" class="result-section">
          <div class="result-header">
            <h3>AI 课代表总结</h3>
          </div>
          <div class="result-content" v-html="resultText"></div>
        </section>
      </transition>
    </main>
    
    <footer class="page-footer">
      <p>由 <a href="https://github.com/WangTong07" target="_blank">WangTong07</a> 匠心打造 (所有文件均在您的本地浏览器中处理，不会上传)</p>
    </footer>
  </div>
</template>

<style>
/* 这份CSS是全新的，为新界面量身定制 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --bg-color: #0d1117;
  --card-bg-color: #161b22;
  --text-color: #c9d1d9;
  --text-dim-color: #8b949e;
  --border-color: rgba(255, 255, 255, 0.1);
  --primary-color: #58a6ff;
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

.drop-zone {
  width: 100%;
  padding: 4rem 2rem;
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}
.drop-zone:hover {
  border-color: var(--primary-color);
  background-color: rgba(88, 166, 255, 0.1);
}
.drop-zone-content svg {
  color: var(--text-dim-color);
  margin-bottom: 1rem;
}
.drop-zone-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}
.drop-zone-subtitle {
  font-size: 0.875rem;
  color: var(--text-dim-color);
  margin-top: 0.5rem;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background-color: rgba(88, 166, 255, 0.1);
  border-radius: 12px;
}
.loading-indicator p { margin: 0; font-weight: 500; }

.result-section { margin-top: 1rem; background: var(--card-bg-color); border: 1px solid var(--border-color); border-radius: 16px; padding: 2rem; }
.result-header { margin-bottom: 1.5rem; }
.result-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #f0f6fc; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; }
.result-content { line-height: 1.8; font-size: 1rem; }
.result-content strong { color: var(--primary-color); font-weight: 600; }
.page-footer { text-align: center; color: var(--text-dim-color); margin-top: 2rem; }
.page-footer a { color: var(--text-dim-color); font-weight: 500; text-decoration: none; }
.page-footer a:hover { color: var(--primary-color); }
.spinner { animation: rotate 2s linear infinite; width: 24px; height: 24px; }
.path { stroke: var(--primary-color); stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }
@keyframes rotate { 100% { transform: rotate(360deg); } }
@keyframes dash { 0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; } 100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 768px) { .main-container { padding: 1.5rem; } .card-header h1 { font-size: 1.75rem; } }
</style>