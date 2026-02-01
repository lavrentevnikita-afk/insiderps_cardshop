const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Путь к файлам данных
const keysPath = path.join(__dirname, '../data/keys.json');
const ordersPath = path.join(__dirname, '../data/orders.json');

// Получить ключ для товара
function getKeyForProduct(productId) {
  const keysData = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
  
  if (!keysData[productId] || keysData[productId].length === 0) {
    return null;
  }
  
  // Берем первый доступный ключ
  const key = keysData[productId].shift();
  
  // Сохраняем обновленные данные
  fs.writeFileSync(keysPath, JSON.stringify(keysData, null, 2));
  
  return key;
}

// Сохранить заказ
function saveOrder(order) {
  let orders = [];
  
  if (fs.existsSync(ordersPath)) {
    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
  }
  
  orders.push(order);
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
}

// Обработка pre-checkout запроса
function handlePreCheckoutQuery(bot, query) {
  console.log('💳 Pre-checkout запрос:', query);
  
  // Здесь можно добавить дополнительные проверки
  // Например, проверить наличие ключей
  
  bot.answerPreCheckoutQuery(query.id, true).catch(error => {
    console.error('❌ Ошибка pre-checkout:', error);
  });
}

// Обработка успешной оплаты
function handleSuccessfulPayment(bot, msg) {
  const chatId = msg.chat.id;
  const payment = msg.successful_payment;
  
  console.log('✅ Успешная оплата:', payment);
  
  // Извлекаем ID товара из invoice_payload
  const productId = payment.invoice_payload;
  
  // Получаем ключ
  const key = getKeyForProduct(productId);
  
  if (!key) {
    bot.sendMessage(
      chatId,
      '❌ Произошла ошибка при выдаче ключа. Пожалуйста, свяжитесь с поддержкой.'
    );
    
    // Уведомление админа
    if (process.env.ADMIN_ID) {
      bot.sendMessage(
        process.env.ADMIN_ID,
        `⚠️ Нет ключей для товара: ${productId}\nПользователь: ${msg.from.id}`
      );
    }
    return;
  }
  
  // Сохраняем заказ
  const order = {
    id: uuidv4(),
    userId: msg.from.id,
    userName: msg.from.username || msg.from.first_name,
    productId: productId,
    amount: payment.total_amount / 100, // В рублях
    currency: payment.currency,
    key: key,
    timestamp: new Date().toISOString(),
    telegramPaymentChargeId: payment.telegram_payment_charge_id
  };
  
  saveOrder(order);
  
  // Отправляем ключ пользователю
  const successMessage = `
✅ *Оплата прошла успешно!*

🎁 Ваш ключ активации:

\`${key}\`

_Нажмите на ключ, чтобы скопировать_

Спасибо за покупку! 🎉
  `.trim();
  
  bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
  
  // Уведомление админа о продаже
  if (process.env.ADMIN_ID) {
    bot.sendMessage(
      process.env.ADMIN_ID,
      `💰 Новая продажа!\nТовар: ${productId}\nСумма: ${order.amount} ${order.currency}\nПользователь: @${order.userName || 'unknown'}`
    );
  }
}

module.exports = {
  handlePreCheckoutQuery,
  handleSuccessfulPayment,
  getKeyForProduct
};
