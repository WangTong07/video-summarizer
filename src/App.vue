<script setup>
import { ref, onMounted } from 'vue';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// 设置PDF.js的worker路径，这是必须的
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

// --- 状态变量 ---
const loading = ref(false);
const loadingText = ref('');
const resultText = ref('');
const isResultVisible = ref(false);

const apiKey = import.meta.env.VITE_ZHIPU_API_KEY;

// --- AI模型相关变量 ---
let transcriber = null; // Whisper模型
let ocrWorker = null;   // Tesseract OCR模型

// --- 核心函数 ---

// 1. 初始化所有本地AI模型
onMounted(async () => {
  try {
    loadingText.value = '正在初始化本地AI引擎，首次加载较慢...';
    // 动态导入 Transformers.js
    const { pipeline } = await import('@xenova/transformers');
    // 并行加载多个模型，提升速度
    [transcriber, ocrWorker] = await Promise.all([
      pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny'),
      createWorker('chi_sim') // 加载中文识别模型
    ]);
    loadingText.value = '本地AI引擎准备就绪！';
    setTimeout(() => { loadingText.value = ''; }, 2000);
  } catch (error) {
    console.error("模型加载失败:", error);
    loadingText.value = '本地AI引擎加载失败，请刷新页面重试。';
  }
});

// 2. 处理文件的主函数
async function handleFile(file) {
  if (!file || loading.value) return;

  loading.value = true;
  isResultVisible.value = false;
  resultText.value = '';

  try {
    let extractedText = '';
    
    // --- 根据文件类型，进行智能分发 ---
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      loadingText.value = '正在本地解析音视频，这可能需要几分钟...';
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = decoded.getChannelData(0);
      const transcription = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'chinese',
        task: 'transcribe',
      });
      extractedText = transcription.text;
    } 
    else if (file.type === 'application/pdf') {
      loadingText.value = '正在本地解析PDF文件...';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let textContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map(item => item.str).join(' ');
      }
      extractedText = textContent;
    }
    else if (file.type.startsWith('image/')) {
      loadingText.value = '正在本地进行图片文字识别(OCR)...';
      const { data: { text } } = await ocrWorker.recognize(file);
      extractedText = text;
    }
    else if (file.type === 'text/plain') {
      loadingText.value = '正在读取文本文档...';
      extractedText = await file.text();
    } 
    else {
      throw new Error(`暂不支持此文件类型: ${file.type}`);
    }

    if (!extractedText || extractedText.trim() === '') {
      throw new Error('未能从文件中提取到有效文本内容。');
    }
    await generateSummary(extractedText);

  } catch (error) {
    console.error("文件处理失败:", error);
    alert(`文件处理失败: ${error.message}`);
    loading.value = false;
    loadingText.value = '';
  }
}

// 3. AI总结函数
async function generateSummary(textContent) {
  loadingText.value = '文本提取成功，AI深度阅读中...';
  const prompt = `你是一个世界顶级的学习专家和情报分析师，你的任务是为我阅读并深度总结以下提供的长篇内容。\n\n【你的输出必须严格遵循以下格式，并使用Markdown语法】\n**1. 核心摘要 (一句话总结):**\n用一句话，精准地概括全文的核心主旨或最终结论。\n\n**2. 章节要点 (Key Points):**\n以数字列表的形式，分点提炼出文中的5-8个关键论点、核心步骤或重要信息。\n\n**3. 金句摘录 (Golden Quotes):**\n找出并列出文中1-3句最具有启发性、最震撼、或最值得反复回味的原话。\n\n【需要你总结的全文如下】\n『${textContent}』`;

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

function markdownToHtml(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\n/g, '<br/>');
  return text;
}

function handleDrop(event) {
  event.preventDefault();
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}
function handleFileSelect(event) {
  const files = event.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
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
      
      <section 
        class="drop-zone"
        @dragover.prevent @dragenter.prevent @drop.prevent="handleDrop"
        @click="() => $refs.fileInput.click()"
      >
        <div class="drop-zone-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-3-4-5.4-4-1.6 0-3.1.8-4.1 2.1-1.3-.6-2.9-.2-3.8 1.1-.9 1.2-.8 2.8.3 3.8.3.2.6.4.9.5-2.2.4-3.8 2.2-3.8 4.4 0 2.5 2 4.5 4.5 4.5h10.5c2.5 0 4.5-2 4.5-4.5 0-1-.3-1.9-.8-2.7z"></path><path d="M12 13v9"></path><path d="m9 17 3 3 3-3"></path></svg>
          <p class="drop-zone-title">将文件拖拽到此处，或点击上传</p>
          <p class="drop-zone-subtitle">支持视频、音频、PDF、图片、文本文档</p>
        </div>
        <input type="file" ref="fileInput" @change="handleFileSelect" style="display: none;" accept="video/*,audio/*,text/plain,application/pdf,image/*" />
      </section>
      
      <div v-if="loading || loadingText" class="loading-indicator">
          <svg v-if="loading" class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
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
      <p>所有文件均在您的本地浏览器中处理，不会上传，保障您的隐私安全。</p>
    </footer>
  </div>
</template>

<style>
/* 样式与之前版本完全相同，无需修改 */
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
.drop-zone { width: 100%; padding: 4rem 2rem; border: 2px dashed var(--border-color); border-radius: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; cursor: pointer; transition: all 0.3s ease; }
.drop-zone:hover { border-color: var(--primary-color); background-color: rgba(88, 166, 255, 0.1); }
.drop-zone-content svg { color: var(--text-dim-color); margin-bottom: 1rem; }
.drop-zone-title { font-size: 1.25rem; font-weight: 600; color: var(--text-color); margin: 0; }
.drop-zone-subtitle { font-size: 0.875rem; color: var(--text-dim-color); margin-top: 0.5rem; }
.loading-indicator { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; background-color: rgba(88, 166, 255, 0.1); border-radius: 12px; }
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