const express = require('express');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Set ffmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle download
app.post('/download', async (req, res) => {
  const videoURL = req.body.url;
  const format = req.body.format || 'mp4'; // 'mp4' or 'mp3'
  const quality = req.body.quality || 'highest'; // 'highest' or 'lowest'

  if (!ytdl.validateURL(videoURL)) {
    return res.status(400).send('Invalid YouTube URL');
  }

  try {
    const info = await ytdl.getInfo(videoURL);

    if (format === 'mp4') {
      res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
      ytdl(videoURL, { quality: quality === 'highest' ? 'highestvideo' : 'lowestvideo' }).pipe(res);
    } else if (format === 'mp3') {
      res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
      res.header('Content-Type', 'audio/mpeg');

      const stream = ytdl(videoURL, { quality: 'highestaudio' });

      ffmpeg(stream)
        .audioBitrate(128)
        .format('mp3')
        .on('error', err => {
          console.error(err);
          res.status(500).send('Error processing audio');
        })
        .pipe(res, { end: true });
    } else {
      res.status(400).send('Invalid format requested');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to download video/audio');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
