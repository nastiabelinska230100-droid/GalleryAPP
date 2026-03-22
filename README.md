# Gallery App — Telegram Mini App

Общий фотоархив для 4 человек: Саша, Вика, Настя, Макс.
Хостинг на Webdock VPS (Noble LEMP 8.3).

- **Сервер:** galleryapp.vps.webdock.cloud (193.180.208.80)
- **БД:** PostgreSQL (Docker)
- **Файлы:** на диске сервера

---

## Пошаговая установка

### 1. Подключиться к серверу

```bash
ssh root@193.180.208.80
```

### 2. Установить Docker

```bash
curl -fsSL https://get.docker.com | sh
docker --version
```

### 3. Создать Telegram бота

1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` → придумай имя и username
3. Скопируй `BOT_TOKEN`

### 4. Загрузить проект на сервер

С локальной машины:
```bash
scp -r ./GalleryAPP root@193.180.208.80:/opt/gallery
```

### 5. Настроить переменные окружения

```bash
cd /opt/gallery
cp .env.example .env
nano .env
```

Заполнить:
```
BOT_TOKEN=123456:ABC-DEF...
WEBHOOK_URL=https://galleryapp.vps.webdock.cloud
```

### 6. Запустить приложение

```bash
cd /opt/gallery
docker compose up -d --build
```

Подождать ~2-3 минуты пока соберётся. Проверить:
```bash
docker compose ps
```

Оба контейнера должны быть `running`.

### 7. Проверить SSL

Webdock обычно уже настраивает SSL для своего поддомена. Проверь:
```bash
ls /etc/letsencrypt/live/
```

Если папки `galleryapp.vps.webdock.cloud` нет — получи сертификат:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d galleryapp.vps.webdock.cloud
```

### 8. Настроить nginx

```bash
# Скопировать конфиг
cp /opt/gallery/nginx.conf /etc/nginx/sites-available/gallery

# Включить, убрать дефолтный
ln -sf /etc/nginx/sites-available/gallery /etc/nginx/sites-enabled/gallery
rm -f /etc/nginx/sites-enabled/default

# Проверить и перезапустить
nginx -t
systemctl restart nginx
```

### 9. Проверить что работает

Открой в браузере: https://galleryapp.vps.webdock.cloud

Должна загрузиться страница выбора пользователя.

### 10. Настроить Menu Button бота

1. Открой [@BotFather](https://t.me/BotFather)
2. `/mybots` → выбери бота → Bot Settings → Menu Button
3. URL: `https://galleryapp.vps.webdock.cloud`

---

## Готово!

1. Открой бота в Telegram → `/start`
2. Нажми «📸 Открыть галерею»
3. Выбери кто ты (Саша / Вика / Настя / Макс)
4. Загружай фото и видео!

---

## Полезные команды

```bash
# Логи приложения
docker compose logs -f app

# Перезапустить
docker compose restart

# Обновить код
cd /opt/gallery && docker compose up -d --build

# Зайти в БД
docker compose exec db psql -U gallery -d gallery

# Сколько места занимают медиа
du -sh /var/lib/docker/volumes/gallery_media_storage/

# Бэкап БД
docker compose exec db pg_dump -U gallery gallery > backup.sql

# Статус контейнеров
docker compose ps
```

---

## Если что-то не работает

```bash
# Контейнеры запущены?
docker compose ps

# nginx работает?
nginx -t && systemctl status nginx

# Логи nginx
tail -f /var/log/nginx/error.log

# Порт 8000 слушается?
ss -tlnp | grep 8000

# Перестроить с нуля
docker compose down && docker compose up -d --build
```

---

## Локальная разработка

```bash
# Поднять только БД
docker compose up -d db

# Бэкенд
pip install fastapi uvicorn aiogram pillow pillow-heif ffmpeg-python python-multipart psycopg2-binary
DATABASE_URL=postgresql://gallery:gallery@localhost:5432/gallery BOT_TOKEN=xxx uvicorn backend.main:app --reload

# Фронтенд
cd frontend
npm install
npm run dev
```
