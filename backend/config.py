import os

BOT_TOKEN = os.environ["BOT_TOKEN"]
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://gallery:gallery@localhost:5432/gallery")
MEDIA_DIR = os.environ.get("MEDIA_DIR", "/app/media_storage")
MEDIA_URL_PREFIX = os.environ.get("MEDIA_URL_PREFIX", "/files")
PORT = int(os.environ.get("PORT", "8000"))
ACCESS_PASSWORD = os.environ.get("ACCESS_PASSWORD", "BravoCharlie228")
