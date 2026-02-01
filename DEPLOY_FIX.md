# 🚀 Быстрое решение проблемы деплоя

## Проблема
```
error: Your local changes to the following files would be overwritten by merge:
        package-lock.json
        package.json
```

## Решение (выполни на сервере):

### Вариант 1: Сохранить изменения и обновить
```bash
cd /var/www/insiderps_cardshop

# Сохранить локальные изменения
git stash

# Подтянуть обновления
git pull origin main

# Установить новые зависимости
npm install

# Перезапустить сервер
pm2 restart psshop-server

# Проверить логи
pm2 logs psshop-server --lines 50
```

### Вариант 2: Отменить локальные изменения (если они не важны)
```bash
cd /var/www/insiderps_cardshop

# Отменить изменения в package файлах
git checkout package.json package-lock.json

# Подтянуть обновления
git pull origin main

# Установить новые зависимости
npm install

# Перезапустить сервер
pm2 restart psshop-server

# Проверить логи
pm2 logs psshop-server --lines 50
```

### Вариант 3: Полный сброс (самый надежный)
```bash
cd /var/www/insiderps_cardshop

# Сохранить важные файлы (если нужно)
cp data/keys.json /tmp/keys_backup.json
cp data/orders.json /tmp/orders_backup.json
cp .env /tmp/env_backup

# Полный сброс к последнему коммиту
git reset --hard origin/main

# Восстановить важные файлы
cp /tmp/keys_backup.json data/keys.json
cp /tmp/orders_backup.json data/orders.json
cp /tmp/env_backup .env

# Установить зависимости
npm install

# Перезапустить
pm2 restart psshop-server

# Проверить
pm2 logs psshop-server --lines 50
```

## Что изменилось в новой версии:
- ✅ Rate limiting (защита от спама)
- ✅ Валидация данных (Joi)
- ✅ Helmet.js (безопасность)
- ✅ Проверка ключей перед выдачей
- ✅ Compression (сжатие)

## Проверка работы:
```bash
# Статус PM2
pm2 status

# Логи сервера
pm2 logs psshop-server --lines 100

# Проверка API
curl http://localhost:3000/health

# Проверка товаров
curl http://localhost:3000/api/products
```

## Если есть ошибки:
```bash
# Посмотреть подробные логи
pm2 logs psshop-server --err --lines 200

# Перезапустить с флешем логов
pm2 flush
pm2 restart psshop-server

# Если не помогает - полный рестарт PM2
pm2 kill
pm2 start server/index.js --name psshop-server
```
