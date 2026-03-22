from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from backend.services.database import query, query_one, execute, insert_returning
from backend.routers.users import get_current_user

router = APIRouter(tags=["comments"])


class CommentCreate(BaseModel):
    text: str


@router.get("/api/media/{media_id}/comments")
async def list_comments(media_id: str):
    rows = query(
        """SELECT c.*, u.name as user_name, u.display_name as user_display_name
           FROM comments c JOIN users u ON u.id = c.user_id
           WHERE c.media_id = %s ORDER BY c.created_at""",
        (media_id,),
    )
    result = []
    for c in rows:
        result.append({
            "id": c["id"],
            "media_id": str(c["media_id"]),
            "user_id": c["user_id"],
            "user_name": c["user_name"],
            "user_display_name": c["user_display_name"],
            "text": c["text"],
            "created_at": c["created_at"].isoformat() if c["created_at"] else None,
        })
    return result


@router.post("/api/media/{media_id}/comments")
async def add_comment(
    media_id: str,
    body: CommentCreate,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    row = insert_returning(
        "INSERT INTO comments (media_id, user_id, text) VALUES (%s, %s, %s) RETURNING *",
        (media_id, user["id"], body.text),
    )
    return dict(row)


@router.delete("/api/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    comment = query_one("SELECT * FROM comments WHERE id = %s", (comment_id,))
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only author can delete")

    execute("DELETE FROM comments WHERE id = %s", (comment_id,))
    return {"ok": True}
