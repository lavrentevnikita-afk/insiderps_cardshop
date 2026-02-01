require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const compression = require('compression');
const { sendKeysEmail } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (nginx, cloudflare, etc.)
app.set('trust proxy', 1);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false
});

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 10, // максимум 10 заказов в час
  message: 'Превышен лимит заказов, попробуйте через час',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // отключаем для локальной разработки
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, '../webapp')));

// Пути к данным
const productsPath = path.join(__dirname, '../data/products.json');
const ordersPath = path.join(__dirname, '../data/orders.json');
const bannersPath = path.join(__dirname, '../data/banners.json');
const keysPath = path.join(__dirname, '../data/keys.json');

// Валидация данных заказа
const orderSchema = Joi.object({
  email: Joi.string().email().required(),
  cart: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      quantity: Joi.number().integer().min(1).max(100).required()
    })
  ).min(1).required(),
  totalAmount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('telegram', 'card', 'sbp').required()
});

// Функция проверки наличия ключей
function checkKeysAvailability(productId, quantity) {
  try {
    if (!fs.existsSync(keysPath)) {
      return { available: false, count: 0 };
    }
    const keys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
    const productKeys = keys[productId] || [];
    return {
      available: productKeys.length >= quantity,
      count: productKeys.length
    };
  } catch (error) {
    console.error('Ошибка проверки ключей:', error);
    return { available: false, count: 0 };
  }
}

// Функция получения ключей
function getKeys(productId, quantity) {
  try {
    const keys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
    const productKeys = keys[productId] || [];
    
    if (productKeys.length < quantity) {
      throw new Error(`Недостаточно ключей для товара ${productId}`);
    }
    
    const assignedKeys = productKeys.splice(0, quantity);
    keys[productId] = productKeys;
    fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));
    
    return assignedKeys;
  } catch (error) {
    console.error('Ошибка получения ключей:', error);
    throw error;
  }
}

// API для получения баннеров
app.get('/api/banners', (req, res) => {
  try {
    if (!fs.existsSync(bannersPath)) {
      return res.json([]);
    }
    const banners = JSON.parse(fs.readFileSync(bannersPath, 'utf-8'));
    // Возвращаем только активные баннеры, отсортированные по order
    const activeBanners = banners
      .filter(b => b.enabled)
      .sort((a, b) => a.order - b.order);
    res.json(activeBanners);
  } catch (error) {
    console.error('Ошибка чтения баннеров:', error);
    res.status(500).json({ error: 'Ошибка загрузки баннеров' });
  }
});

// API для получения товаров
app.get('/api/products', (req, res) => {
  try {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    res.json(products);
  } catch (error) {
    console.error('Ошибка чтения товаров:', error);
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
});

// API для получения конкретного товара
app.get('/api/products/:id', (req, res) => {
  try {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Ошибка чтения товара:', error);
    res.status(500).json({ error: 'Ошибка загрузки товара' });
  }
});

// API для получения истории заказов (только для админа)
app.get('/api/orders', (req, res) => {
  try {
    const email = req.query.email;
    
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }
    
    // Читаем все заказы
    let orders = [];
    try {
      orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    } catch (error) {
      // Файл не существует или пуст
      console.log('Файл заказов пуст или не существует');
    }
    
    // Фильтруем заказы по email
    const userOrders = orders.filter(order => 
      order.email && order.email.toLowerCase() === email.toLowerCase()
    );
    
    res.json({ orders: userOrders });
  } catch (error) {
    console.error('Ошибка чтения заказов:', error);
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// API для создания заказа (с валидацией и rate limiting)
app.post('/api/order', orderLimiter, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Валидация данных заказа
    const { error, value } = orderSchema.validate(orderData);
    if (error) {
      console.error('❌ Ошибка валидации заказа:', error.details);
      return res.status(400).json({
        success: false,
        error: 'Некорректные данные заказа: ' + error.details[0].message
      });
    }
    
    const isTelegram = !!req.headers['x-telegram-init-data'];
    
    console.log('📦 Новый заказ:', {
      email: value.email,
      total: value.totalAmount,
      items: value.cart.length,
      source: isTelegram ? 'Telegram' : 'Web'
    });
    
    // Проверяем наличие ключей для всех товаров ПЕРЕД началом выдачи
    for (const item of value.cart) {
      const availability = checkKeysAvailability(item.id, item.quantity);
      if (!availability.available) {
        console.error(`❌ Недостаточно ключей для товара: ${item.id}. Доступно: ${availability.count}, требуется: ${item.quantity}`);
        return res.status(400).json({
          success: false,
          error: `Товар временно недоступен. В наличии: ${availability.count} шт.`
        });
      }
    }
    
    // Импортируем функцию уведомления
    const { notifyAdminNewOrder } = require('../bot/adminHandlers');
    
    const orderKeys = [];
    const itemsWithKeys = [];
    
    // Выдаем ключи для каждого товара
    for (const item of value.cart) {
      try {
        const assignedKeys = getKeys(item.id, item.quantity);
        
        for (let i = 0; i < item.quantity; i++) {
          orderKeys.push({
            product: item.name || item.id,
            key: assignedKeys[i]
          });
          itemsWithKeys.push({
            ...item,
            key: assignedKeys[i]
          });
        }
      } catch (error) {
        console.error(`❌ Ошибка выдачи ключей для ${item.id}:`, error);
        return res.status(500).json({
          success: false,
          error: 'Ошибка при выдаче ключей. Попробуйте позже или свяжитесь с поддержкой.'
        });
      }
    }
    
    // Сохраняем заказ
    let orders = [];
    try {
      orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    } catch (error) {
      // Файл не существует, создаем пустой массив
      console.log('Создаем новый файл заказов');
    }
    
    const order = {
      id: `order_${Date.now()}`,
      email: value.email,
      cart: value.cart,
      totalAmount: value.totalAmount,
      paymentMethod: value.paymentMethod,
      keys: orderKeys,
      status: 'completed',
      timestamp: new Date().toISOString(),
      telegram_user: orderData.telegram_user || null
    };
    orders.push(order);
    fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
    
    console.log(`✅ Заказ ${order.id} создан. Выдано ключей: ${orderKeys.length}`);
    
    // Уведомляем админа о новом заказе
    try {
      const TelegramBot = require('node-telegram-bot-api');
      const bot = new TelegramBot(process.env.BOT_TOKEN);
      await notifyAdminNewOrder(bot, order);
    } catch (error) {
      console.error('Ошибка отправки уведомления админу:', error);
    }
    
    if (isTelegram && order.telegram_user) {
      // Отправляем ключи в Telegram бот
      const TelegramBot = require('node-telegram-bot-api');
      const bot = new TelegramBot(process.env.BOT_TOKEN);
      
      const chatId = order.telegram_user.id;
      let message = `✅ *Заказ успешно оформлен!*\n\n`;
      message += `📦 *Ваши товары:*\n`;
      
      orderKeys.forEach((item, index) => {
        message += `\n${index + 1}. ${item.product}\n`;
        message += `🔑 Код: \`${item.key}\`\n`;
      });
      
      message += `\n💰 *Итого:* ${order.totalAmount}₽\n`;
      message += `📧 Чек отправлен на: ${order.email}\n\n`;
      message += `✨ Спасибо за покупку!\n`;
      message += `💬 Поддержка: @insider_mngr`;
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
      console.log(`✅ Ключи отправлены в Telegram: ${chatId}`);
    } else {
      // Отправляем ключи на email
      console.log(`📧 Отправка ключей на email: ${order.email}`);
      
      await sendKeysEmail(order.email, orderKeys, order.totalAmount);
      
      console.log(`✅ Ключи отправлены на email: ${order.email}`);
    }
    
    res.json({
      success: true,
      order_id: order.id,
      keys: orderKeys
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания заказа:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обработки заказа'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 Web App доступен на http://localhost:${PORT}`);
  console.log(`🔗 API доступен на http://localhost:${PORT}/api`);
});

module.exports = app;
