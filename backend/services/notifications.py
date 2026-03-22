from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from backend.config import BOT_TOKEN, WEBHOOK_URL
from backend.services.database import query, query_one

_bot: Bot | None = None


def get_bot() -> Bot:
    global _bot
    if _bot is None:
        _bot = Bot(token=BOT_TOKEN)
    return _bot


async def notify_new_upload(uploader_id: int, file_type: str, thumbnail_url: str | None = None):
    uploader = query_one("SELECT * FROM users WHERE id = %s", (uploader_id,))
    if not uploader:
        return

    all_users = query("SELECT * FROM users WHERE telegram_id IS NOT NULL")

    uploader_name = uploader["display_name"]
    type_label = "фото" if file_type == "photo" else "видео"
    text = f"📸 {uploader_name} добавил(а) новое {type_label}!"

    bot = get_bot()
    for user in all_users:
        if user["id"] == uploader_id:
            continue
        tg_id = user.get("telegram_id")
        if not tg_id:
            continue
        try:
            await bot.send_message(tg_id, text)
        except Exception:
            pass


async def notify_new_comment(commenter_id: int, media_id: str, comment_text: str):
    commenter = query_one("SELECT * FROM users WHERE id = %s", (commenter_id,))
    if not commenter:
        return

    media = query_one("SELECT * FROM media WHERE id = %s", (media_id,))
    if not media:
        return

    all_users = query("SELECT * FROM users WHERE telegram_id IS NOT NULL")
    name = commenter["display_name"]
    preview = comment_text[:100]
    text = f"💬 {name} оставил(а) комментарий:\n«{preview}»"

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="Открыть фото",
            web_app=WebAppInfo(url=f"{WEBHOOK_URL}/media/{media_id}"),
        )]
    ])

    bot = get_bot()
    for user in all_users:
        if user["id"] == commenter_id:
            continue
        tg_id = user.get("telegram_id")
        if not tg_id:
            continue
        try:
            await bot.send_message(tg_id, text, reply_markup=kb)
        except Exception:
            pass


async def notify_new_user(new_user: dict):
    if not new_user:
        return

    all_users = query("SELECT * FROM users WHERE telegram_id IS NOT NULL")
    name = new_user["display_name"]
    text = f"🎉 {name} присоединился(ась) к архіву компромата!"

    bot = get_bot()
    for user in all_users:
        if user["id"] == new_user["id"]:
            continue
        tg_id = user.get("telegram_id")
        if not tg_id:
            continue
        try:
            await bot.send_message(tg_id, text)
        except Exception:
            pass
