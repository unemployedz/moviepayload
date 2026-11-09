const fetch = require('node-fetch');
const archiver = require('archiver');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const text = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const urls = [];
    
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        urls.push(urlMatch[0]);
      }
    }

    if (urls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="movies.zip"');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filename = `video_${i + 1}.mp4`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch ${url}: ${response.status}`);
          continue;
        }
        
        const buffer = await response.buffer();
        archive.append(buffer, { name: filename });
      } catch (e) {
        console.error(`Error processing ${url}:`, e.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
