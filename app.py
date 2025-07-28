from flask import Flask, request, render_template, jsonify, send_file
import subprocess
import os
import uuid
from yt_dlp import YoutubeDL

app = Flask(__name__)

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
            # শুধু mp4 ভিডিও ফরম্যাট বা mp3 অডিও ফরম্যাট নিয়ে আসা
            if f.get('ext') in ['mp4', 'm4a', 'webm', 'mp3']:
                # রেজোলিউশন ও অডিও আলাদা আলাদা করা
                if f.get('vcodec') != 'none':
                    # ভিডিও ফরম্যাট
                    formats.append({
                        "format_id": f['format_id'],
                        "ext": f['ext'],
                        "resolution": f.get('height'),
                        "filesize": f.get('filesize') or 0
                    })
                elif f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                    # অডিও ফরম্যাট (mp3 বা m4a)
                    formats.append({
                        "format_id": f['format_id'],
                        "ext": f['ext'],
                        "resolution": "Audio",
                        "filesize": f.get('filesize') or 0
                    })

        # ফরম্যাট গুলো থেকে রেজোলিউশন অনুযায়ী সাজানো
        # শুধু ইউনিক রেজোলিউশন দেখানোর জন্য dictionary তে কন্ট্রোল দিতে পারেন

        unique_formats = {}
        for f in formats:
            key = f['resolution']
            if key not in unique_formats:
                unique_formats[key] = f

        sorted_formats = sorted(unique_formats.values(), key=lambda x: (x['resolution'] if isinstance(x['resolution'], int) else 0), reverse=True)

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

    filename = f"{uuid.uuid4()}.%(ext)s"

    ydl_opts = {
        'quiet': True,
        'outtmpl': filename,
        'format': format_id
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(video_url, download=True)
            downloaded_filename = ydl.prepare_filename(info_dict)
        return send_file(downloaded_filename, as_attachment=True)
    except Exception as e:
        return str(e), 500
    finally:
        # ডাউনলোড হয়ে গেলে ফাইল ডিলিট করুন
        if os.path.exists(downloaded_filename):
            os.remove(downloaded_filename)


if __name__ == '__main__':
    app.run(debug=True)
