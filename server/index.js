require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { sendKeysEmail } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../webapp')));

// Пути к данным
const productsPath = path.join(__dirname, '../data/products.json');
const ordersPath = path.join(__dirname, '../data/orders.json');

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
  // В продакшене добавьте аутентификацию!
  try {
    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    res.json(orders);
  } catch (error) {
    console.error('Ошибка чтения заказов:', error);
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// API для создания заказа
app.post('/api/order', async (req, res) => {
  try {
    const orderData = req.body;
    const isTelegram = !!req.headers['x-telegram-init-data'];
    
    console.log('📦 Новый заказ:', {
      email: orderData.email,
      total: orderData.total,
      source: isTelegram ? 'Telegram' : 'Web'
    });
    
    // Получаем ключи для товаров
    const keysPath = path.join(__dirname, '../data/keys.json');
    const keys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
    
    const orderKeys = [];
    const itemsWithKeys = [];
    
    // Выдаем ключи для каждого товара
    for (const item of orderData.items) {
      for (let i = 0; i < item.quantity; i++) {
        if (keys[item.id] && keys[item.id].length > 0) {
          const key = keys[item.id].shift(); // Берем первый доступный ключ
          orderKeys.push({
            product: item.name,
            key: key
          });
          itemsWithKeys.push({
            ...item,
            key: key
          });
        } else {
          console.error(`❌ Нет доступных ключей для товара: ${item.id}`);
          return res.status(400).json({
            success: false,
            error: `Товар "${item.name}" временно недоступен`
          });
        }
      }
    }
    
    // Сохраняем обновленные ключи
    fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));
    
    // Сохраняем заказ
    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    const order = {
      id: `order_${Date.now()}`,
      ...orderData,
      keys: orderKeys,
      status: 'completed',
      created_at: new Date().toISOString()
    };
    orders.push(order);
    fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
    
    if (isTelegram && orderData.telegram_user) {
      // Отправляем ключи в Telegram бот
      const TelegramBot = require('node-telegram-bot-api');
      const bot = new TelegramBot(process.env.BOT_TOKEN);
      
      const chatId = orderData.telegram_user.id;
      let message = `✅ *Заказ успешно оформлен!*\n\n`;
      message += `📦 *Ваши товары:*\n`;
      
      orderKeys.forEach((item, index) => {
        message += `\n${index + 1}. ${item.product}\n`;
        message += `🔑 Код: \`${item.key}\`\n`;
      });
      
      message += `\n💰 *Итого:* ${orderData.total}₽\n`;
      message += `📧 Чек отправлен на: ${orderData.email}\n\n`;
      message += `✨ Спасибо за покупку!\n`;
      message += `💬 Поддержка: @insider_mngr`;
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
      console.log(`✅ Ключи отправлены в Telegram: ${chatId}`);
    } else {
      // Отправляем ключи на email
      console.log(`📧 Отправка ключей на email: ${orderData.email}`);
      
      await sendKeysEmail(orderData.email, orderKeys, orderData.total);
      
      console.log(`✅ Ключи отправлены на email: ${orderData.email}`);
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
