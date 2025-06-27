// api/get-subtitle.js
const YoutubeDlWrap = require("youtube-dl-wrap").YoutubeDlWrap;
const path = require("path");

module.exports = async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: '请提供视频URL' });
    }

    try {
        // 获取一个youtube-dl-wrap的实例
        const youtubeDlWrap = new YoutubeDlWrap();
        
        // Vercel云函数的可写目录是 /tmp
        const data = await youtubeDlWrap.execPromise([
            videoUrl,
            '--write-auto-sub',
            '--sub-lang', 'zh-Hans,en',
            '--skip-download',
            '-o', '-' // 将字幕输出到stdout
        ]);

        res.status(200).json({ subtitle: data });

    } catch (error) {
        console.error('youtube-dl-wrap error:', error);
        res.status(500).json({ error: '无法提取字幕，可能是视频不支持或服务器暂时出现问题。' });
    }
};