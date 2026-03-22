from fastapi import APIRouter, Header, HTTPException
from backend.services.database import query, query_one, execute

router = APIRouter(prefix="/api/users", tags=["users"])


def get_current_user(telegram_user_id: int):
    return query_one("SELECT * FROM users WHERE telegram_id = %s", (telegram_user_id,))


@router.get("")
async def list_users():
    users = query("SELECT * FROM users ORDER BY id")
    result = []
    for u in users:
        row = query_one("SELECT COUNT(*) as cnt FROM media WHERE uploader_id = %s", (u["id"],))
        result.append({**u, "media_count": row["cnt"] if row else 0})
    return result


@router.post("/link")
async def link_telegram(
    user_id: int,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    existing = query_one("SELECT * FROM users WHERE telegram_id = %s", (x_telegram_user_id,))
    if existing:
        return existing

    execute(
        "UPDATE users SET telegram_id = %s WHERE id = %s",
        (x_telegram_user_id, user_id),
    )
    return query_one("SELECT * FROM users WHERE id = %s", (user_id,))


@router.get("/me")
async def get_me(x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id")):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="not_linked")
    return user


@router.get("/stats")
async def get_stats():
    users = query("SELECT * FROM users ORDER BY id")
    stats = []
    for u in users:
        photos = query_one(
            "SELECT COUNT(*) as cnt FROM media WHERE uploader_id = %s AND file_type = 'photo'",
            (u["id"],),
        )
        videos = query_one(
            "SELECT COUNT(*) as cnt FROM media WHERE uploader_id = %s AND file_type = 'video'",
            (u["id"],),
        )
        last = query_one(
            "SELECT created_at FROM media WHERE uploader_id = %s ORDER BY created_at DESC LIMIT 1",
            (u["id"],),
        )
        stats.append({
            "user_id": u["id"],
            "name": u["name"],
            "display_name": u["display_name"],
            "photo_count": photos["cnt"] if photos else 0,
            "video_count": videos["cnt"] if videos else 0,
            "last_upload": last["created_at"] if last else None,
        })
    return stats
