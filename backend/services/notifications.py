from aiogram import Bot
from backend.config import BOT_TOKEN
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
