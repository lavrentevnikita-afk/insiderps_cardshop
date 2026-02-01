require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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
