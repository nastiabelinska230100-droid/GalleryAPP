import asyncio
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.services.database import query, query_one, execute, insert_returning
from backend.services.notifications import notify_new_comment
from backend.routers.users import get_current_user

router = APIRouter(tags=["comments"])


class CommentCreate(BaseModel):
    text: str
    reply_to_id: Optional[int] = None


class ReactionToggle(BaseModel):
    emoji: str


def get_reactions_for_comments(comment_ids):
    if not comment_ids:
        return {}
    placeholders = ",".join(["%s"] * len(comment_ids))
    rows = query(
        f"""SELECT cr.comment_id, cr.emoji, cr.user_id, u.display_name as user_display_name
            FROM comment_reactions cr JOIN users u ON u.id = cr.user_id
            WHERE cr.comment_id IN ({placeholders})""",
        comment_ids,
    )
    result = {}
    for r in rows:
        cid = r["comment_id"]
        if cid not in result:
            result[cid] = []
        result[cid].append({
            "emoji": r["emoji"],
            "user_id": r["user_id"],
            "user_display_name": r["user_display_name"],
        })
    return result


def format_comment(c, reactions_map=None):
    cid = c["id"]
    reactions_raw = (reactions_map or {}).get(cid, [])
    # Group reactions by emoji
    emoji_groups = {}
    for r in reactions_raw:
        e = r["emoji"]
        if e not in emoji_groups:
            emoji_groups[e] = {"emoji": e, "count": 0, "users": []}
        emoji_groups[e]["count"] += 1
        emoji_groups[e]["users"].append({"user_id": r["user_id"], "display_name": r["user_display_name"]})

    return {
        "id": cid,
        "media_id": str(c["media_id"]),
        "user_id": c["user_id"],
        "user_name": c.get("user_name"),
        "user_display_name": c.get("user_display_name"),
        "user_avatar_url": c.get("user_avatar_url"),
        "text": c["text"],
        "reply_to_id": c.get("reply_to_id"),
        "reply_to_user": c.get("reply_to_user"),
        "reply_to_text": c.get("reply_to_text"),
        "created_at": c["created_at"].isoformat() if c["created_at"] else None,
        "reactions": list(emoji_groups.values()),
    }


@router.get("/api/media/{media_id}/comments")
async def list_comments(media_id: str):
    rows = query(
        """SELECT c.*, u.name as user_name, u.display_name as user_display_name, u.avatar_url as user_avatar_url,
                  r.display_name as reply_to_user, rc.text as reply_to_text
           FROM comments c
           JOIN users u ON u.id = c.user_id
           LEFT JOIN comments rc ON rc.id = c.reply_to_id
           LEFT JOIN users r ON r.id = rc.user_id
           WHERE c.media_id = %s ORDER BY c.created_at""",
        (media_id,),
    )
    comment_ids = [c["id"] for c in rows]
    reactions_map = get_reactions_for_comments(comment_ids)
    return [format_comment(c, reactions_map) for c in rows]


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
        "INSERT INTO comments (media_id, user_id, text, reply_to_id) VALUES (%s, %s, %s, %s) RETURNING *",
        (media_id, user["id"], body.text, body.reply_to_id),
    )
    result = dict(row)
    result["user_name"] = user["name"]
    result["user_display_name"] = user["display_name"]
    result["user_avatar_url"] = user.get("avatar_url")
    result["reactions"] = []

    # Get reply info
    result["reply_to_user"] = None
    result["reply_to_text"] = None
    if body.reply_to_id:
        reply_comment = query_one(
            "SELECT c.text, u.display_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = %s",
            (body.reply_to_id,),
        )
        if reply_comment:
            result["reply_to_user"] = reply_comment["display_name"]
            result["reply_to_text"] = reply_comment["text"]

    asyncio.create_task(notify_new_comment(user["id"], media_id, body.text))

    return result


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


@router.post("/api/comments/{comment_id}/react")
async def toggle_reaction(
    comment_id: int,
    body: ReactionToggle,
    x_telegram_user_id: int = Header(..., alias="X-Telegram-User-Id"),
):
    user = get_current_user(x_telegram_user_id)
    if not user:
        raise HTTPException(status_code=403, detail="not_linked")

    existing = query_one(
        "SELECT id FROM comment_reactions WHERE comment_id = %s AND user_id = %s AND emoji = %s",
        (comment_id, user["id"], body.emoji),
    )
    if existing:
        execute("DELETE FROM comment_reactions WHERE id = %s", (existing["id"],))
        return {"added": False, "emoji": body.emoji}
    else:
        execute(
            "INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES (%s, %s, %s)",
            (comment_id, user["id"], body.emoji),
        )
        return {"added": True, "emoji": body.emoji}
