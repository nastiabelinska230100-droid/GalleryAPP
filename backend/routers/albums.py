from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from backend.services.database import query, query_one, execute, insert_returning
from backend.routers.users import get_current_user

router = APIRouter(prefix="/api/albums", tags=["albums"])


class AlbumCreate(BaseModel):
    title: str


class AlbumAddMedia(BaseModel):
    media_ids: list[str]


@router.get("")
async def list_albums():
    albums = query(
        """SELECT a.*, u.display_name as creator_name
           FROM albums a LEFT JOIN users u ON u.id = a.created_by
           ORDER BY a.created_at DESC"""
    )

    result = []
    for a in albums:
        count_row = query_one(
            "SELECT COUNT(*) as cnt FROM album_media WHERE album_id = %s", (a["id"],)
        )
        cover = query_one(
            """SELECT m.thumbnail_url FROM album_media am
               JOIN media m ON m.id = am.media_id
               WHERE am.album_id = %s LIMIT 1""",
            (a["id"],),
        )
        result.append({
            "id": a["id"],
            "title": a["title"],
            "created_by": a["created_by"],
            "creator_name": a["creator_name"] or "",
            "created_at": a["created_at"].isoformat() if a["created_at"] else None,
            "cover_url": cover["thumbnail_url"] if cover else None,
            "media_count": count_row["cnt"] if count_row else 0,
        })
    return result


@router.post("")
async def create_album(
    body: AlbumCreate,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    row = insert_returning(
        "INSERT INTO albums (title, created_by) VALUES (%s, %s) RETURNING *",
        (body.title, user["id"]),
    )
    return dict(row)


@router.post("/{album_id}/media")
async def add_media_to_album(
    album_id: int,
    body: AlbumAddMedia,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    for mid in body.media_ids:
        execute(
            "INSERT INTO album_media (album_id, media_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (album_id, mid),
        )
    return {"ok": True}


@router.get("/{album_id}")
async def get_album(album_id: int):
    album = query_one("SELECT * FROM albums WHERE id = %s", (album_id,))
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    media_items = query(
        """SELECT m.* FROM album_media am
           JOIN media m ON m.id = am.media_id
           WHERE am.album_id = %s
           ORDER BY m.created_at DESC""",
        (album_id,),
    )

    return {
        **dict(album),
        "media": [dict(m) for m in media_items],
    }
