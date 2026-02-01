# 🐳 Docker Deployment

## Быстрый старт

### 1. Настройка .env файла
```bash
cp .env.example .env
# Отредактируйте .env и укажите ваши токены
```

### 2. Запуск через Docker Compose
```bash
docker-compose up -d
```

### 3. Просмотр логов
```bash
# Логи бота
docker-compose logs -f bot

# Логи Web App
docker-compose logs -f webapp

# Все логи
docker-compose logs -f
```

### 4. Остановка
```bash
docker-compose down
```

## Управление

### Перезапуск сервисов
```bash
# Перезапустить бота
docker-compose restart bot

# Перезапустить Web App
docker-compose restart webapp
```

### Обновление после изменений
```bash
# Пересобрать и перезапустить
docker-compose up -d --build
```

### Проверка статуса
```bash
docker-compose ps
```

## Production деплой

Для продакшена используйте `Dockerfile.production`:

```bash
docker build -f Dockerfile.production -t psshop:latest .
docker run -d --name psshop-bot --env-file .env psshop:latest
```

## Полезные команды

```bash
# Войти в контейнер
docker-compose exec bot sh

# Просмотреть использование ресурсов
docker stats

# Очистить неиспользуемые образы
docker system prune -a
```

## Переменные окружения

Все переменные берутся из `.env` файла:
- `BOT_TOKEN` - токен Telegram бота
- `PAYMENT_TOKEN` - токен платежной системы
- `WEBAPP_URL` - URL Web App
- `PORT` - порт сервера (по умолчанию 3000)
- `ADMIN_ID` - Telegram ID админа
