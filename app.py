from flask import Flask, request, render_template, jsonify, send_file
import os
import re
from yt_dlp import YoutubeDL

app = Flask(__name__)

def sanitize_filename(name):
    """ফাইলনেম থেকে অবৈধ চিহ্ন মুছে ফেলা"""
    return re.sub(r'[\\/*?:"<>|]', "_", name)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video-info', methods=['POST'])
def video_info():
    data = request.json
    video_url = data.get('url')

    if not video_url:
        return jsonify({"error": "No URL provided"}), 400

    ydl_opts = {
        'quiet': True,
        'skip_download': True,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)

        formats = []
        for f in info.get('formats', []):
            if f.get('ext') in ['mp4', 'm4a', 'webm', 'mp3']:
                if f.get('vcodec') != 'none':
                    formats.append({
                        "format_id": f['format_id'],
                        "ext": f['ext'],
                        "resolution": f.get('height'),
                        "filesize": f.get('filesize') or 0
                    })
                elif f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                    formats.append({
                        "format_id": f['format_id'],
                        "ext": f['ext'],
                        "resolution": "Audio",
                        "filesize": f.get('filesize') or 0
                    })

        unique_formats = {}
        for f in formats:
            key = f['resolution']
            if key not in unique_formats:
                unique_formats[key] = f

        sorted_formats = sorted(
            unique_formats.values(),
            key=lambda x: (x['resolution'] if isinstance(x['resolution'], int) else 0),
            reverse=True
        )

        return jsonify({
            "title": info.get('title'),
            "thumbnail": info.get('thumbnail'),
            "formats": sorted_formats
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/download', methods=['GET'])
def download():
    video_url = request.args.get('url')
    format_id = request.args.get('format_id')

    if not video_url or not format_id:
        return "Missing URL or format", 400

    # ভিডিওর ইনফো নেওয়া
    with YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(video_url, download=False)

    title = sanitize_filename(info.get('title', 'video'))
    file_ext = "mp4"
    resolution = ''

    # নির্দিষ্ট format_id এর resolution বের করা
    for f in info.get('formats', []):
        if f['format_id'] == format_id:
            if f.get('vcodec') == 'none':  # শুধু অডিও হলে
                file_ext = f['ext']
                resolution = "audio"
            else:
                resolution = f.get('height', '')
            break

    resolution_text = f"{resolution}p" if isinstance(resolution, int) else resolution
    output_filename = f"{title}-{resolution_text}.{file_ext}"

    ydl_opts = {
        'quiet': True,
        'outtmpl': output_filename,
        'merge_output_format': file_ext
    }

    # অডিও + ভিডিও একসাথে বা শুধু অডিও
    if file_ext == "mp4":
        ydl_opts['format'] = f"{format_id}+bestaudio/best"
    else:
        ydl_opts['format'] = format_id

    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        return send_file(output_filename, as_attachment=True)
    except Exception as e:
        return str(e), 500
    finally:
        if os.path.exists(output_filename):
            os.remove(output_filename)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), debug=False)
