import asyncio
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, Query
from typing import Optional
from backend.services.database import query, query_one, execute, insert_returning
from backend.services.storage import save_file, delete_file
from backend.services.image import convert_heic_to_jpg, generate_thumbnail, generate_video_thumbnail
from backend.services.notifications import notify_new_upload
from backend.routers.users import get_current_user

router = APIRouter(prefix="/api/media", tags=["media"])

MAX_PHOTO_SIZE = 15 * 1024 * 1024
MAX_VIDEO_SIZE = 50 * 1024 * 1024


@router.post("/upload")
async def upload_media(
    files: list[UploadFile] = File(...),
    tags: str = Form(""),
    caption: str = Form(""),
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    tag_ids = [int(t) for t in tags.split(",") if t.strip()]
    results = []

    for f in files:
        file_bytes = await f.read()
        filename = f.filename or "file"
        content_type = f.content_type or "application/octet-stream"
        lower_name = filename.lower()

        is_video = lower_name.endswith((".mp4", ".mov")) or "video" in content_type
        is_heic = lower_name.endswith((".heic", ".heif"))

        max_size = MAX_VIDEO_SIZE if is_video else MAX_PHOTO_SIZE
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"Файл {filename} слишком большой. Максимум: {max_size // (1024*1024)}MB",
            )

        if is_heic:
            file_bytes = convert_heic_to_jpg(file_bytes)
            filename = filename.rsplit(".", 1)[0] + ".jpg"

        file_url = save_file(file_bytes, filename, user["name"])

        thumb_bytes = None
        if is_video:
            thumb_bytes = generate_video_thumbnail(file_bytes)
        else:
            thumb_bytes = generate_thumbnail(file_bytes)

        thumbnail_url = None
        if thumb_bytes:
            thumb_name = "thumb_" + filename.rsplit(".", 1)[0] + ".jpg"
            thumbnail_url = save_file(thumb_bytes, thumb_name, user["name"])

        file_type = "video" if is_video else "photo"
        row = insert_returning(
            """INSERT INTO media (uploader_id, file_url, thumbnail_url, file_type, file_size, caption)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (user["id"], file_url, thumbnail_url, file_type, len(file_bytes), caption or None),
        )

        media_id = row["id"]

        for tid in tag_ids:
            execute(
                "INSERT INTO media_tags (media_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (media_id, tid),
            )

        results.append({
            "id": str(media_id),
            "file_url": file_url,
            "thumbnail_url": thumbnail_url,
        })

        asyncio.create_task(notify_new_upload(user["id"], file_type, thumbnail_url))

    return results


@router.get("")
async def list_media(
    tagged: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    sort: str = Query("newest"),
    page: int = Query(1),
    limit: int = Query(20),
    album_id: Optional[int] = Query(None),
    x_telegram_user_id: int = Header(0, alias="X-Telegram-User-Id"),
):
    current_user = get_current_user(x_telegram_user_id) if x_telegram_user_id else None

    conditions = []
    params = []

    if album_id:
        conditions.append("m.id IN (SELECT media_id FROM album_media WHERE album_id = %s)")
        params.append(album_id)

    if tagged:
        tag_user = query_one("SELECT id FROM users WHERE name = %s", (tagged,))
        if not tag_user:
            return {"items": [], "total": 0}
        conditions.append("m.id IN (SELECT media_id FROM media_tags WHERE user_id = %s)")
        params.append(tag_user["id"])

    if type and type in ("photo", "video"):
        conditions.append("m.file_type = %s")
        params.append(type)

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    order = "DESC" if sort != "oldest" else "ASC"
    offset = (page - 1) * limit

    count_row = query_one(f"SELECT COUNT(*) as cnt FROM media m {where}", params)
    total = count_row["cnt"] if count_row else 0

    rows = query(
        f"""SELECT m.*, u.display_name as uploader_name
            FROM media m
            LEFT JOIN users u ON u.id = m.uploader_id
            {where}
            ORDER BY m.created_at {order}
            LIMIT %s OFFSET %s""",
        params + [limit, offset],
    )

    items = []
    for m in rows:
        media_id = m["id"]
        like_row = query_one("SELECT COUNT(*) as cnt FROM likes WHERE media_id = %s", (media_id,))
        comment_row = query_one("SELECT COUNT(*) as cnt FROM comments WHERE media_id = %s", (media_id,))
        tags_rows = query(
            "SELECT u.name FROM media_tags mt JOIN users u ON u.id = mt.user_id WHERE mt.media_id = %s",
            (media_id,),
        )

        liked_by_me = False
        if current_user:
            my_like = query_one(
                "SELECT id FROM likes WHERE media_id = %s AND user_id = %s",
                (media_id, current_user["id"]),
            )
            liked_by_me = my_like is not None

        items.append({
            "id": str(m["id"]),
            "uploader_id": m["uploader_id"],
            "uploader_name": m["uploader_name"] or "",
            "file_url": m["file_url"],
            "thumbnail_url": m["thumbnail_url"],
            "file_type": m["file_type"],
            "file_size": m["file_size"],
            "caption": m["caption"],
            "created_at": m["created_at"].isoformat() if m["created_at"] else None,
            "like_count": like_row["cnt"] if like_row else 0,
            "comment_count": comment_row["cnt"] if comment_row else 0,
            "liked_by_me": liked_by_me,
            "tags": [t["name"] for t in tags_rows],
        })

    return {"items": items, "total": total}


@router.get("/{media_id}")
async def get_media(
    media_id: str,
    x_telegram_user_id: int = Header(0, alias="X-Telegram-User-Id"),
):
    current_user = get_current_user(x_telegram_user_id) if x_telegram_user_id else None

    m = query_one(
        """SELECT m.*, u.display_name as uploader_name
           FROM media m LEFT JOIN users u ON u.id = m.uploader_id
           WHERE m.id = %s""",
        (media_id,),
    )
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")

    likes_data = query("SELECT l.*, u.display_name FROM likes l JOIN users u ON u.id = l.user_id WHERE l.media_id = %s", (media_id,))
    comments_data = query(
        """SELECT c.*, u.name as user_name, u.display_name as user_display_name
           FROM comments c JOIN users u ON u.id = c.user_id
           WHERE c.media_id = %s ORDER BY c.created_at""",
        (media_id,),
    )
    tags_data = query(
        "SELECT u.* FROM media_tags mt JOIN users u ON u.id = mt.user_id WHERE mt.media_id = %s",
        (media_id,),
    )

    liked_by_me = False
    if current_user:
        liked_by_me = any(l["user_id"] == current_user["id"] for l in likes_data)

    comments_out = []
    for c in comments_data:
        comments_out.append({
            "id": c["id"],
            "media_id": str(c["media_id"]),
            "user_id": c["user_id"],
            "user_name": c["user_name"],
            "user_display_name": c["user_display_name"],
            "text": c["text"],
            "created_at": c["created_at"].isoformat() if c["created_at"] else None,
        })

    return {
        "id": str(m["id"]),
        "uploader_id": m["uploader_id"],
        "uploader_name": m["uploader_name"] or "",
        "file_url": m["file_url"],
        "thumbnail_url": m["thumbnail_url"],
        "file_type": m["file_type"],
        "file_size": m["file_size"],
        "caption": m["caption"],
        "created_at": m["created_at"].isoformat() if m["created_at"] else None,
        "like_count": len(likes_data),
        "comment_count": len(comments_data),
        "liked_by_me": liked_by_me,
        "tags": [u["name"] for u in tags_data],
        "tagged_users": [dict(u) for u in tags_data],
        "comments": comments_out,
        "likes": [dict(l) for l in likes_data],
    }


@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    m = query_one("SELECT * FROM media WHERE id = %s", (media_id,))
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    if m["uploader_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only uploader can delete")

    if m.get("file_url"):
        delete_file(m["file_url"])
    if m.get("thumbnail_url"):
        delete_file(m["thumbnail_url"])

    execute("DELETE FROM media WHERE id = %s", (media_id,))
    return {"ok": True}


@router.post("/{media_id}/like")
async def toggle_like(
    media_id: str,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    existing = query_one(
        "SELECT id FROM likes WHERE media_id = %s AND user_id = %s",
        (media_id, user["id"]),
    )

    if existing:
        execute("DELETE FROM likes WHERE id = %s", (existing["id"],))
        return {"liked": False}
    else:
        execute(
            "INSERT INTO likes (media_id, user_id) VALUES (%s, %s)",
            (media_id, user["id"]),
        )
        return {"liked": True}
