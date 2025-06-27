// api/get-subtitle.js

const { exec } = require('child_process');
const path = require('path');

// Vercel的云函数环境，我们需要处理请求和响应
module.exports = (req, res) => {
  // 从前端请求中获取视频URL，例如 ?url=https://www.youtube.com/...
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: '请提供视频URL' });
  }

  // 构建 youtube-dlp 命令
  // --write-auto-sub: 写入自动生成的字幕
  // --sub-lang 'zh-Hans,en': 优先选择简体中文或英文字幕
  // --skip-download: 只下载字幕，不下载视频
  // -o -: 将字幕内容直接输出到标准输出，而不是文件
  const command = `youtube-dlp --write-auto-sub --sub-lang 'zh-Hans,en' --skip-download -o - "${videoUrl}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`执行错误: ${error}`);
      return res.status(500).json({ error: `无法提取字幕: ${stderr}` });
    }
    
    // 成功！将提取到的字幕文本返回给前端
    res.status(200).json({ subtitle: stdout });
  });
};