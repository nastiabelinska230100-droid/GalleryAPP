import io
import subprocess
import tempfile
from PIL import Image

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass


def convert_heic_to_jpg(file_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def generate_thumbnail(file_bytes: bytes, size: int = 400) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))
    img = img.convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def generate_video_thumbnail(file_bytes: bytes) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_in:
        tmp_in.write(file_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path + "_thumb.jpg"

    try:
        subprocess.run(
            [
                "ffmpeg", "-i", tmp_in_path,
                "-ss", "00:00:01",
                "-vframes", "1",
                "-vf", "scale=400:400:force_original_aspect_ratio=increase,crop=400:400",
                "-y", tmp_out_path,
            ],
            capture_output=True,
            timeout=30,
        )
        with open(tmp_out_path, "rb") as f:
            return f.read()
    except Exception:
        return b""
    finally:
        import os
        for p in [tmp_in_path, tmp_out_path]:
            try:
                os.unlink(p)
            except OSError:
                pass
