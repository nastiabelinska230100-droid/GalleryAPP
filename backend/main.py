import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

from backend.config import BOT_TOKEN, WEBHOOK_URL, MEDIA_DIR, ACCESS_PASSWORD
from backend.services.database import query_one
from backend.routers import media, comments, albums, users

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Хранилище telegram_id пользователей, ожидающих ввод пароля
_pending_password = set()


def is_user_linked(telegram_id: int) -> bool:
    user = query_one("SELECT id FROM users WHERE telegram_id = %s", (telegram_id,))
    return user is not None


def get_gallery_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📸 Открыть галерею",
            web_app=WebAppInfo(url=WEBHOOK_URL),
        )]
    ])


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    tg_id = message.from_user.id

    if is_user_linked(tg_id):
        await message.answer(
            "Привет! 👋\n\nАрхів компромата 🤫\n"
            "Нажми кнопку ниже, чтобы открыть галерею:",
            reply_markup=get_gallery_keyboard(),
        )
    else:
        _pending_password.add(tg_id)
        await message.answer(
            "Привет! 👋\n\n"
            "Для доступа к архіву компромата введи пароль:"
        )


@dp.message()
async def handle_message(message: types.Message):
    tg_id = message.from_user.id

    if tg_id not in _pending_password:
        return

    if message.text and message.text.strip() == ACCESS_PASSWORD:
        _pending_password.discard(tg_id)
        await message.answer(
            "Пароль верный! ✅\n\n"
            "Архів компромата 🤫\n"
            "Нажми кнопку ниже, чтобы открыть галерею:",
            reply_markup=get_gallery_keyboard(),
        )
    else:
        await message.answer("Неверный пароль ❌\nПопробуй ещё раз:")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(MEDIA_DIR, exist_ok=True)
    webhook_url = f"{WEBHOOK_URL}/webhook"
    await bot.set_webhook(webhook_url)
    yield
    await bot.delete_webhook()
    await bot.session.close()


app = FastAPI(lifespan=lifespan)

app.include_router(media.router)
app.include_router(comments.router)
app.include_router(albums.router)
app.include_router(users.router)


@app.post("/webhook")
async def telegram_webhook(request: Request):
    data = await request.json()
    update = types.Update(**data)
    await dp.feed_update(bot, update)
    return {"ok": True}


# Раздача загруженных файлов
if not os.path.isdir(MEDIA_DIR):
    os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=MEDIA_DIR), name="media_files")


# Раздача фронтенда
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
