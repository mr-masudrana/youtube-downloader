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

function setLoadingState(isLoading) {
  if (isLoading) {
    searchBtn.disabled = true;
    searchBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Loading...`;
  } else {
    searchBtn.disabled = false;
    searchBtn.innerHTML = `<i class="fas fa-search"></i> Search`;
  }
}

function setDownloadLoading(button, isLoading, label) {
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Downloading...`;
  } else {
    button.disabled = false;
    button.innerHTML = label;
  }
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

  setLoadingState(true);

  try {
    const response = await fetch('/video-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();

    if (data.error) {
      errorMsg.textContent = data.error;
      videoUrlInput.focus();
      return;
    }

    videoTitle.textContent = data.title || 'Untitled Video';
    thumbnail.src = data.thumbnail || '';
    formatsDiv.innerHTML = '';

    if (!data.formats || data.formats.length === 0) {
      formatsDiv.innerHTML = `<p class="text-warning fw-bold">No downloadable formats available.</p>`;
    } else {
      data.formats.forEach(format => {
        let label, icon, download;

        if (format.resolution === 'Audio') {
          label = 'Audio';
          icon = '<i class="fas fa-music"></i>';
          download = '<i class="fas fa-download"></i>';
        } else if (format.resolution) {
          label = `${format.resolution}p`;
          icon = '<i class="fas fa-video"></i>';
          download = '<i class="fas fa-download"></i>';
        } else {
          label = format.ext.toUpperCase();
          icon = '<i class="fas fa-file-video"></i>';
          download = '<i class="fas fa-download"></i>';
        }

        const btn = document.createElement('button');
        btn.innerHTML = `${icon} ${label} ${download}`;
        btn.className = 'btn btn-outline-info rounded-pill fw-semibold d-flex justify-content-around align-items-center w-75';
        btn.onclick = () => {
          setDownloadLoading(btn, true, `${icon} ${label} ${download}`);
          const downloadUrl = `/download?url=${encodeURIComponent(url)}&format_id=${format.format_id}`;
          // Start download
          window.location.href = downloadUrl;

          // Restore button after short delay
          setTimeout(() => {
            setDownloadLoading(btn, false, `${icon} ${label} ${download}`);
          }, 5000); // Adjust timing as needed
        };
        formatsDiv.appendChild(btn);
      });
    }

    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    errorMsg.textContent = 'Failed to fetch video info. Please check your connection and try again.';
  } finally {
    setLoadingState(false);
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

videoUrlInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    searchBtn.click();
  }
});
