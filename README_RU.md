# 🎮 INSIDER PlayStation Shop

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-production-success.svg)
![Node](https://img.shields.io/badge/node-18.x-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**Профессиональный Telegram-бот с веб-приложением для продажи карт пополнения PlayStation Store**

🌐 [insiderplaystation.ru](https://insiderplaystation.ru) | 📱 [@insiderplaystation_bot](https://t.me/insiderplaystation_bot)

---

## 📸 Скриншоты

<div align="center">
  <img src="https://via.placeholder.com/800x400/0d1117/00a7e1?text=INSIDER+PlayStation+Shop" alt="Main" />
</div>

---

## ⭐ Ключевые особенности

### Для пользователей

- 🎨 **Современный интерфейс** — темная/светлая тема, skeleton loaders
- 🛒 **Умная корзина** — localStorage, множественные товары
- ⚡ **Мгновенная доставка** — коды сразу после оплаты
- 📧 **Email уведомления** — чеки и коды на почту
- 📊 **История покупок** — просмотр всех заказов
- 🎯 **Фильтры** — сортировка по цене, скидкам, популярности

### Для администратора

- 📈 **Аналитика** — выручка, топ товаров, статистика
- 📋 **Массовые операции** — изменение цен/скидок для региона
- 📝 **Шаблоны** — быстрое создание карточек
- 🔔 **Уведомления** — push о новых заказах
- 📋 **Логи** — история всех действий
- 🔑 **Управление ключами** — мониторинг наличия

---

## 🚀 Быстрый старт

### Локальный запуск

```bash
# Клонирование
git clone https://github.com/lavrentevnikita-afk/insiderps_cardshop.git
cd insiderps_cardshop

# Установка
npm install

# Настройка .env
cp .env.example .env
nano .env

# Запуск
npm start
```

### Деплой на VPS

Подробная инструкция: [INSTALLATION.md](INSTALLATION.md)

```bash
# На сервере
apt update && apt install -y nodejs git nginx certbot python3-certbot-nginx
npm install -g pm2

# Клонирование и установка
cd /var/www
git clone https://github.com/lavrentevnikita-afk/insiderps_cardshop.git
cd insiderps_cardshop
npm install

# Настройка и запуск
nano .env
pm2 start bot/index.js --name psshop-bot
pm2 start server/index.js --name psshop-server
pm2 startup && pm2 save

# Nginx и SSL
nano /etc/nginx/sites-available/yourdomain.com
systemctl restart nginx
certbot --nginx -d yourdomain.com
```

---

## 📚 Документация

| Документ | Описание |
|----------|----------|
| [README.md](README.md) | Главная документация |
| [ADMIN.md](ADMIN.md) | Руководство администратора |
| [INSTALLATION.md](INSTALLATION.md) | Установка и деплой |
| [SUMMARY.md](SUMMARY.md) | Полная документация проекта |
| [CHANGELOG.md](CHANGELOG.md) | История изменений |
| [ROADMAP.md](ROADMAP.md) | Планы развития |

---

## 🛠 Технологии

**Backend:**
- Node.js 18+
- Express
- node-telegram-bot-api

**Frontend:**
- Vanilla JavaScript
- HTML5 / CSS3
- Telegram Web App API

**Infrastructure:**
- VPS Ubuntu 24.04
- PM2
- Nginx
- Let's Encrypt SSL

---

## 🎯 API

### Endpoints

```
GET  /api/products              # Список товаров
GET  /api/products/:id          # Товар по ID
POST /api/order                 # Создать заказ
GET  /api/orders?email=...      # История по email
GET  /health                    # Health check
```

---

## 🔧 Команды администратора

### Базовые
```bash
/admin                      # Главное меню
/setprice us_10 774        # Изменить цену
/setdiscount us_10 10      # Установить скидку
/addkey us_10              # Добавить ключи
```

### Массовые операции
```bash
/bulkprice USA 1.1         # Цены +10%
/bulkdiscount Turkey 15    # Скидка 15%
/resetdiscounts            # Сбросить скидки
```

---

## 📊 Структура проекта

```
insiderps_cardshop/
├── bot/
│   ├── index.js              # Telegram бот
│   ├── adminHandlers.js      # Админ-панель
│   └── handlers.js           # Обработчики
├── server/
│   ├── index.js              # Express API
│   └── emailService.js       # Email сервис
├── webapp/
│   ├── index.html            # SPA интерфейс
│   ├── app.js                # Frontend логика
│   └── style.css             # Стили
├── data/
│   ├── products.json         # Товары
│   ├── keys.json             # Ключи
│   ├── orders.json           # Заказы
│   └── logs.json             # Логи
└── update.sh                 # Скрипт деплоя
```

---

## 🌍 Поддерживаемые регионы

| Регион | Валюта | Номиналы |
|--------|--------|----------|
| 🇺🇸 США | USD | 5$, 10$, 25$, 50$ |
| 🇮🇳 Индия | INR | 500₹, 1000₹, 2000₹ |
| 🇵🇱 Польша | PLN | 50zł, 100zł, 250zł |
| 🇹🇷 Турция | TRY | 50₺, 100₺, 250₺ |

---

## 🔐 Конфигурация

`.env` файл:

```env
# Telegram
BOT_TOKEN=your_bot_token
PAYMENT_TOKEN=your_payment_token

# Server
PORT=3000
WEBAPP_URL=https://yourdomain.com

# Admin
ADMIN_ID=your_telegram_id

# Optional
GITHUB_TOKEN=your_github_token
```

---

## 🚀 Обновление

На сервере:

```bash
cd /var/www/insiderps_cardshop
./update.sh
```

Или вручную:

```bash
git pull origin main
npm install
pm2 restart all
```

---

## 📈 Статус проекта

- ✅ **Production Ready**
- ✅ 24/7 Uptime (PM2)
- ✅ SSL Certificate
- ✅ Auto-restart
- ✅ Full Documentation

---

## 🤝 Вклад

1. Fork проекта
2. Создайте branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📝 Лицензия

MIT License - см. [LICENSE](LICENSE)

---

## 📞 Контакты

- **Support**: [@insider_mngr](https://t.me/insider_mngr)
- **Channel**: [@insider_playstation](https://t.me/insider_playstation)
- **Website**: [insiderplaystation.ru](https://insiderplaystation.ru)

---

<div align="center">
  
  **Made with ❤️ for PlayStation Community**
  
  [⬆ Наверх](#-insider-playstation-shop)
  
</div>
