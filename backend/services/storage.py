import os
import uuid
from datetime import datetime
from backend.config import MEDIA_DIR, MEDIA_URL_PREFIX


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def save_file(file_bytes: bytes, filename: str, user_name: str) -> str:
    now = datetime.utcnow()
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    rel_path = f"{user_name}/{now.year}/{now.month:02d}"
    full_dir = os.path.join(MEDIA_DIR, rel_path)
    ensure_dir(full_dir)

    full_path = os.path.join(full_dir, unique_name)
    with open(full_path, "wb") as f:
        f.write(file_bytes)

    return f"{MEDIA_URL_PREFIX}/{rel_path}/{unique_name}"


def delete_file(file_url: str) -> None:
    if not file_url or not file_url.startswith(MEDIA_URL_PREFIX):
        return
    rel = file_url[len(MEDIA_URL_PREFIX):]
    full_path = os.path.join(MEDIA_DIR, rel.lstrip("/"))
    try:
        os.unlink(full_path)
    except OSError:
        pass
