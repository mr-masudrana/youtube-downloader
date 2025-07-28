const searchBtn = document.getElementById('searchBtn');
const videoUrlInput = document.getElementById('videoUrl');
const resultDiv = document.getElementById('result');
const videoTitle = document.getElementById('videoTitle');
const thumbnail = document.getElementById('thumbnail');
const formatsDiv = document.getElementById('formats');
const errorMsg = document.getElementById('errorMsg');
const loadingSpinner = document.getElementById('loadingSpinner');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const copyMsg = document.getElementById('copyMsg');

function validateYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return pattern.test(url);
}

searchBtn.addEventListener('click', async () => {
  const url = videoUrlInput.value.trim();
  errorMsg.textContent = '';
  copyMsg.style.display = 'none';
  resultDiv.style.display = 'none';

  if (!url) {
    errorMsg.textContent = 'Please enter a YouTube URL.';
    videoUrlInput.focus();
    return;
  }

  if (!validateYouTubeUrl(url)) {
    errorMsg.textContent = 'Invalid YouTube URL format.';
    videoUrlInput.focus();
    return;
  }

  searchBtn.disabled = true;
  loadingSpinner.style.display = 'block';

  try {
    const response = await fetch('/video-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (data.error) {
      errorMsg.textContent = data.error;
      videoUrlInput.focus();
      return;
    }

    videoTitle.textContent = data.title;
    thumbnail.src = data.thumbnail;

    formatsDiv.innerHTML = '';

    data.formats.forEach(format => {
      let label = '';
      if (format.resolution === 'Audio') {
        label = 'MP3 (Audio)';
      } else if (format.resolution) {
        label = `${format.resolution}p`;
      } else {
        label = format.ext.toUpperCase();
      }

      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = 'format-btn';
      btn.onclick = () => {
        const downloadUrl = `/download?url=${encodeURIComponent(url)}&format_id=${format.format_id}`;
        window.location.href = downloadUrl;
      };
      formatsDiv.appendChild(btn);
    });

    resultDiv.style.display = 'block';
    resultDiv.focus();

  } catch (err) {
    errorMsg.textContent = 'Failed to fetch video info. Please try again.';
  } finally {
    searchBtn.disabled = false;
    loadingSpinner.style.display = 'none';
  }
});

copyLinkBtn.addEventListener('click', () => {
  const url = videoUrlInput.value.trim();
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      copyMsg.style.display = 'block';
      setTimeout(() => (copyMsg.style.display = 'none'), 2000);
    });
  }
});

// Enter key triggers search
videoUrlInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    searchBtn.click();
  }
});
