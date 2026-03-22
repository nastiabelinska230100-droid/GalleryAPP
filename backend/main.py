import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

from backend.config import BOT_TOKEN, WEBHOOK_URL, MEDIA_DIR
from backend.routers import media, comments, albums, users

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    webapp_url = WEBHOOK_URL
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📸 Открыть галерею",
            web_app=WebAppInfo(url=webapp_url),
        )]
    ])
    await message.answer(
        "Привет! 👋\n\nАрхів компромата 🤫\n"
        "Нажми кнопку ниже, чтобы открыть галерею:",
        reply_markup=kb,
    )


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
